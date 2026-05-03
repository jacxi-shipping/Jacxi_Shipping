import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { buildCustomerTrackingView, type CustomerTrackingView } from '@/lib/customer-tracking';
import { trackingAPI, type ContainerTrackingSnapshot } from '@/lib/services/tracking-api';

const TIMETOCARGO_ENDPOINT = 'https://tracking.timetocargo.com/webapi/track';
const DEFAULT_HEADERS = {
	Accept: 'application/json, text/plain, */*',
	'Content-Type': 'application/json',
	Origin: 'https://timetocargo.com',
	Referer: 'https://timetocargo.com/',
	'User-Agent':
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
};

type TimetoCargoResponse = {
	success?: boolean;
	status?: string;
	status_description?: string;
	data?: TimetoCargoEntry[];
};

type TimetoCargoEntry = {
	summary?: {
		origin?: { location?: number | null; terminal?: number | null; date?: string | null };
		pol?: { location?: number | null; terminal?: number | null; date?: string | null };
		pod?: { location?: number | null; terminal?: number | null; date?: string | null };
		destination?: { location?: number | null; terminal?: number | null; date?: string | null };
		company?: { full_name?: string | null; url?: string | null; scacs?: string[] };
	};
	locations?: Array<{
		id?: number;
		name?: string | null;
		state?: string | null;
		terminal?: string | null;
		country?: string | null;
		lat?: number | null;
		lng?: number | null;
		locode?: string | null;
		country_iso_code?: string | null;
	}>;
	terminals?: Array<{
		id?: number;
		name?: string | null;
	}>;
	container?: {
		number?: string | null;
		type?: string | null;
		events?: Array<{
			location?: number | null;
			terminal?: number | null;
			status?: string | null;
			status_code?: string | null;
			date?: string | null;
			actual?: boolean | null;
			vessel?: string | null;
			voyage?: string | null;
		}>;
	};
	route_info?: {
		route?: unknown;
		current_position?: [number, number];
		last_updated?: string | null;
		course?: unknown;
	};
	shipment_status?: string | null;
};

type NormalizedTrackingEvent = {
	id: string;
	status: string;
	statusCode?: string;
	location?: string;
	terminal?: string;
	timestamp?: string;
	actual: boolean;
	vessel?: string;
	voyage?: string;
	description?: string;
};

type NormalizedTracking = {
	containerNumber: string;
	containerType?: string;
	shipmentStatus?: string;
	origin?: string;
	originDate?: string;
	pol?: string;
	polDate?: string;
	destination?: string;
	destinationDate?: string;
	pod?: string;
	podDate?: string;
	estimatedDeparture?: string;
	estimatedArrival?: string;
	company?: { name?: string; url?: string | null; scacs?: string[] };
	currentLocation?: string;
	lastUpdated?: string;
	progress?: number | null;
	customerTracking?: CustomerTrackingView;
	events: NormalizedTrackingEvent[];
};

const formatLocation = (entry: TimetoCargoEntry, id?: number | null) => {
	if (id === undefined || id === null) return undefined;
	const location = entry.locations?.find((loc) => loc.id === id);
	if (!location) return undefined;
	const parts = [location.name, location.state, location.country].filter(Boolean);
	return parts.length ? parts.join(', ') : undefined;
};

const formatTerminal = (entry: TimetoCargoEntry, id?: number | null) => {
	if (id === undefined || id === null) return undefined;
	const terminal = entry.terminals?.find((term) => term.id === id);
	return terminal?.name || undefined;
};

const toIsoString = (value?: string | null) => {
	if (!value) return undefined;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const buildEventDescription = (event: NormalizedTrackingEvent) => {
	const parts = [
		event.vessel ? `Vessel: ${event.vessel}` : null,
		event.voyage ? `Voyage: ${event.voyage}` : null,
		event.terminal ? `Terminal: ${event.terminal}` : null,
	].filter(Boolean);
	return parts.length ? parts.join(' • ') : undefined;
};

const normalizeTracking = (entry: TimetoCargoEntry): NormalizedTracking | null => {
	const containerNumber = entry.container?.number;
	if (!containerNumber) return null;

	const originLocation = formatLocation(entry, entry.summary?.origin?.location);
	const destinationLocation = formatLocation(entry, entry.summary?.destination?.location);
	const polLocation = formatLocation(entry, entry.summary?.pol?.location);
	const podLocation = formatLocation(entry, entry.summary?.pod?.location);

	const events = (entry.container?.events || []).map((event, index) => {
		const normalized: NormalizedTrackingEvent = {
			id: `${containerNumber}-${index}`,
			status: event.status || 'Status update',
			statusCode: event.status_code || undefined,
			location: formatLocation(entry, event.location),
			terminal: formatTerminal(entry, event.terminal),
			timestamp: toIsoString(event.date),
			actual: Boolean(event.actual),
			vessel: event.vessel || undefined,
			voyage: event.voyage || undefined,
		};
		return {
			...normalized,
			description: buildEventDescription(normalized),
		};
	});

	let completedCount = 0;
	let latestActualLocation: string | undefined;
	let latestActualTimestamp: string | undefined;

	events.forEach((event) => {
		if (event.actual) {
			completedCount += 1;
			if (!latestActualTimestamp || (event.timestamp && event.timestamp > latestActualTimestamp)) {
				latestActualTimestamp = event.timestamp;
				latestActualLocation = event.location;
			}
		}
	});

	const progress = events.length ? Math.round((completedCount / events.length) * 100) : null;

	const estimatedArrivalEvent = events.find(
		(event) => event.statusCode === 'VAD' || event.status?.toLowerCase().includes('arrival')
	);

	const estimatedDepartureEvent = events.find(
		(event) => event.statusCode === 'UNK' || event.status?.toLowerCase().includes('departure')
	);

	return {
		containerNumber,
		containerType: entry.container?.type || undefined,
		shipmentStatus: entry.shipment_status || undefined,
		origin: originLocation,
		originDate: toIsoString(entry.summary?.origin?.date),
		pol: polLocation,
		polDate: toIsoString(entry.summary?.pol?.date),
		destination: destinationLocation,
		destinationDate: toIsoString(entry.summary?.destination?.date),
		pod: podLocation,
		podDate: toIsoString(entry.summary?.pod?.date),
		estimatedDeparture: toIsoString(estimatedDepartureEvent?.timestamp || entry.summary?.pol?.date),
		estimatedArrival: toIsoString(estimatedArrivalEvent?.timestamp || entry.summary?.pod?.date),
		company: entry.summary?.company?.full_name
			? {
				name: entry.summary.company.full_name,
				url: entry.summary.company.url || null,
				scacs: entry.summary.company.scacs,
			}
			: undefined,
		currentLocation: latestActualLocation || originLocation,
		lastUpdated: toIsoString(entry.route_info?.last_updated),
		progress,
		events,
	};
};

async function getInternalTrackingSnapshot(trackNumber: string) {
	const container = await prisma.container.findFirst({
		where: {
			OR: [{ containerNumber: trackNumber }, { trackingNumber: trackNumber }],
		},
		select: {
			status: true,
			loadingDate: true,
			departureDate: true,
			actualArrival: true,
			shipments: {
				select: {
					status: true,
					dispatchId: true,
					transitId: true,
					dispatch: { select: { dispatchDate: true } },
					transit: { select: { dispatchDate: true, actualDelivery: true } },
				},
			},
		},
	});

	if (!container) {
		return null;
	}

	const shipmentStatuses = container.shipments.map((shipment) => shipment.status);
	const dispatchDates = sortIsoStrings(
		container.shipments.map((shipment) => (shipment.dispatch?.dispatchDate ? shipment.dispatch.dispatchDate.toISOString() : undefined)),
	);
	const transitDispatchDates = sortIsoStrings(
		container.shipments.map((shipment) => (shipment.transit?.dispatchDate ? shipment.transit.dispatchDate.toISOString() : undefined)),
	);
	const deliveryDates = sortIsoStrings(
		container.shipments.map((shipment) => (shipment.transit?.actualDelivery ? shipment.transit.actualDelivery.toISOString() : undefined)),
	);

	return {
		shipmentStatuses,
		hasDispatch: container.shipments.some((shipment) => Boolean(shipment.dispatchId)),
		hasTransit: container.shipments.some((shipment) => Boolean(shipment.transitId)),
		containerStatus: container.status,
		dispatchDate: dispatchDates[0],
		loadingDate: container.loadingDate?.toISOString(),
		departureDate: container.departureDate?.toISOString(),
		actualArrival: container.actualArrival?.toISOString(),
		transitDispatchDate: transitDispatchDates[0],
		actualDelivery: deliveryDates[deliveryDates.length - 1],
	};
}

function sortIsoStrings(values: Array<string | undefined>) {
	return values.filter((value): value is string => Boolean(value)).sort((left, right) => left.localeCompare(right));
}

function normalizeTrackingFromSnapshot(snapshot: ContainerTrackingSnapshot): NormalizedTracking {
	const events = snapshot.trackingEvents.map((event, index) => ({
		id: `${snapshot.containerNumber}-${index}`,
		status: event.status,
		statusCode: undefined,
		location: event.location,
		terminal: undefined,
		timestamp: event.eventDate,
		actual: event.completed,
		vessel: event.vesselName,
		voyage: snapshot.voyageNumber,
		description: event.description,
	}));

	return {
		containerNumber: snapshot.containerNumber,
		containerType: snapshot.containerType,
		shipmentStatus: snapshot.status,
		origin: snapshot.loadingPort,
		originDate: snapshot.loadingDate,
		pol: snapshot.loadingPort,
		polDate: snapshot.departureDate || snapshot.loadingDate,
		destination: snapshot.destinationPort,
		destinationDate: snapshot.estimatedArrival,
		pod: snapshot.destinationPort,
		podDate: snapshot.estimatedArrival,
		estimatedDeparture: snapshot.departureDate,
		estimatedArrival: snapshot.estimatedArrival,
		company: snapshot.shippingLine
			? {
				name: snapshot.shippingLine,
				url: null,
				scacs: undefined,
			}
			: undefined,
		currentLocation: snapshot.currentLocation || snapshot.loadingPort,
		lastUpdated: events[0]?.timestamp,
		progress: snapshot.progress,
		events,
	};
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const trackNumber = (body.trackNumber || body.trackingNumber || '').trim();

		if (!trackNumber) {
			return NextResponse.json(
				{ message: 'Track number is required.' },
				{ status: 400 }
			);
		}

		const snapshot = await trackingAPI.fetchContainerTrackingData(trackNumber);
		if (!snapshot) {
			return NextResponse.json(
				{ message: 'No tracking information found for this number.' },
				{ status: 404 }
			);
		}

		const normalized = normalizeTrackingFromSnapshot(snapshot);

		const internalSnapshot = await getInternalTrackingSnapshot(trackNumber);
		const customerTracking = buildCustomerTrackingView({
			shipmentStatus: normalized.shipmentStatus,
			originDate: normalized.originDate,
			polDate: normalized.polDate,
			podDate: normalized.podDate,
			estimatedArrival: normalized.estimatedArrival,
			events: normalized.events,
			internal: internalSnapshot,
		});

		return NextResponse.json(
			{
				tracking: {
					...normalized,
					customerTracking,
					requestedNumber: trackNumber,
				},
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error('Error fetching tracking information:', error);
		return NextResponse.json(
			{ message: 'Failed to fetch tracking information.' },
			{ status: 500 }
		);
	}
}
