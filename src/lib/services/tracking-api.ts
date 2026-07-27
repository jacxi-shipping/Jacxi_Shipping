/**
 * PGL tracking integration service.
 * Fetches container tracking history from the public PGL endpoint.
 */

import { logger } from '@/lib/logger';

const PGL_TRACKING_ENDPOINT = 'https://api.pglsystem.com/api/public/tracking';
const TIMETOCARGO_ENDPOINT = 'https://tracking.timetocargo.com/webapi/track';
const TIMETOCARGO_HEADERS = {
	Accept: 'application/json, text/plain, */*',
	'Content-Type': 'application/json',
	Origin: 'https://timetocargo.com',
	Referer: 'https://timetocargo.com/',
	'User-Agent':
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
};

interface ExternalTrackingEvent {
	status: string;
	location: string;
	timestamp: string;
	description?: string;
	vesselName?: string;
	voyageNumber?: string;
	latitude?: number;
	longitude?: number;
	completed?: boolean;
}

export interface ContainerTrackingSnapshot {
	containerNumber: string;
	trackingNumber: string;
	bookingNumber?: string;
	vesselName?: string;
	voyageNumber?: string;
	shippingLine?: string;
	loadingPort?: string;
	destinationPort?: string;
	loadingDate?: string;
	departureDate?: string;
	estimatedArrival?: string;
	containerType?: string;
	status?: string;
	trackingEvents: Array<{
		status: string;
		location?: string;
		vesselName?: string;
		description?: string;
		eventDate: string;
		completed: boolean;
		source: 'API';
	}>;
	progress: number;
	currentLocation?: string;
}

interface PGLTrackingResponse {
	result?: boolean;
	type?: string;
	data?: PGLTrackingEntry[];
}

interface TimeToCargoResponse {
	success?: boolean;
	status?: string;
	status_description?: string;
	data?: TimeToCargoEntry[];
}

interface TimeToCargoEntry {
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
}

interface LegacyTrackingSupplement {
	containerNumber: string;
	trackingNumber: string;
	vesselName?: string;
	voyageNumber?: string;
	shippingLine?: string;
	loadingPort?: string;
	destinationPort?: string;
	loadingDate?: string;
	departureDate?: string;
	estimatedArrival?: string;
	containerType?: string;
	status?: string;
	trackingEvents: ExternalTrackingEvent[];
	progress: number;
	currentLocation?: string;
}

interface PGLTrackingEntry {
	status?: string | null;
	container_id?: number;
	created_at?: string | null;
	containers?: {
		company_id?: number;
		container_number?: string | null;
		cover_photo?: string | null;
		photo_link?: string | null;
		vehicles?: Array<{
			pol_locations?: {
				name?: string | null;
			} | null;
		}>;
		bookings?: {
			booking_number?: string | null;
			eta?: string | null;
			destinations?: {
				name?: string | null;
			} | null;
			vessels?: {
				etd?: string | null;
				name?: string | null;
				vessel?: string | null;
				voyage?: string | null;
				voyage_number?: string | null;
			} | null;
		} | null;
	};
}

export class TrackingAPIService {
	/**
	 * Fetch tracking data as normalized tracking events.
	 */
	async fetchTrackingData(
		trackingNumber: string,
		_shippingLine?: string
	): Promise<ExternalTrackingEvent[]> {
		try {
			const entries = await this.fetchPGLEntries(trackingNumber);
			if (entries.length === 0) {
				const legacyFallback = await this.fetchLegacyTrackingSupplement(trackingNumber);
				return legacyFallback?.trackingEvents ?? [];
			}

			const events = this.transformEntriesToEvents(entries);
			if (events.length > 0) {
				return events;
			}

			const legacyFallback = await this.fetchLegacyTrackingSupplement(trackingNumber);
			return legacyFallback?.trackingEvents ?? [];
		} catch (error) {
			logger.error('Error fetching tracking data:', error);
			return [];
		}
	}

	/**
	 * Fetch full tracking data for the container form route.
	 */
	async fetchContainerTrackingData(
		containerNumber: string
	): Promise<ContainerTrackingSnapshot | null> {
		try {
			const normalizedContainerNumber = containerNumber.trim().toUpperCase();
			const entries = await this.fetchPGLEntries(normalizedContainerNumber);
			const primarySnapshot = entries.length > 0
				? this.buildSnapshotFromPGLEntries(normalizedContainerNumber, entries)
				: null;

			if (primarySnapshot && !this.needsLegacyFallback(primarySnapshot)) {
				return primarySnapshot;
			}

			const legacyFallback = await this.fetchLegacyTrackingSupplement(normalizedContainerNumber);
			if (!primarySnapshot) {
				return legacyFallback ? this.convertLegacySupplementToSnapshot(legacyFallback) : null;
			}

			if (!legacyFallback) {
				return primarySnapshot;
			}

			return this.mergeSnapshotWithLegacyFallback(primarySnapshot, legacyFallback);
		} catch (error) {
			logger.error('Error fetching container tracking data:', error);
			return null;
		}
	}

	/**
	 * Transform PGL tracking history to our normalized event format.
	 */
	private transformEntriesToEvents(entries: PGLTrackingEntry[]): ExternalTrackingEvent[] {
		try {
				return entries
					.map((entry) => {
						const rawStatus = entry.status || undefined;
						const status = this.normalizeStatus(rawStatus);
						const location = this.getEventLocation(entry, rawStatus);
						const vesselName = this.getVesselName(entry);
						const voyageNumber = this.getVoyageNumber(entry);
						const bookingNumber = entry.containers?.bookings?.booking_number;
						const descriptionParts = [
							bookingNumber ? `Booking: ${bookingNumber}` : null,
							voyageNumber ? `Voyage: ${voyageNumber}` : null,
							rawStatus ? `Source status: ${rawStatus}` : null,
						].filter(Boolean);

						return {
							status,
							location: location || 'Unknown',
							timestamp: this.toIsoString(entry.created_at) || new Date().toISOString(),
							description: descriptionParts.length > 0 ? descriptionParts.join(' • ') : undefined,
							vesselName: vesselName || undefined,
							voyageNumber: voyageNumber || undefined,
							latitude: undefined,
							longitude: undefined,
							completed: true,
						};
					})
					.filter((event) => event.status !== 'Status Update');
		} catch (error) {
			logger.error('Error transforming PGL response:', error);
			return [];
		}
	}

	/**
	 * Get estimated arrival from the latest booking data.
	 */
	async getEstimatedArrival(
		trackingNumber: string
	): Promise<Date | null> {
		try {
			const entries = await this.fetchPGLEntries(trackingNumber);
			if (entries.length > 0) {
				const eta = entries[0].containers?.bookings?.eta;
				if (eta) {
					const date = new Date(eta);
					if (!Number.isNaN(date.getTime())) {
						return date;
					}
				}
			}

			const legacyFallback = await this.fetchLegacyTrackingSupplement(trackingNumber);
			if (!legacyFallback?.estimatedArrival) {
				return null;
			}

			const date = new Date(legacyFallback.estimatedArrival);
			return Number.isNaN(date.getTime()) ? null : date;
		} catch (error) {
			logger.error('Error fetching ETA:', error);
			return null;
		}
	}

	private buildSnapshotFromPGLEntries(
		normalizedContainerNumber: string,
		entries: PGLTrackingEntry[]
	): ContainerTrackingSnapshot {
		const trackingEvents = this.transformEntriesToEvents(entries).map((event) => ({
			status: event.status,
			location: event.location || undefined,
			vesselName: event.vesselName || undefined,
			description: event.description || undefined,
			eventDate: event.timestamp,
			completed: Boolean(event.completed),
			source: 'API' as const,
		}));

		const latestEntry = entries[0];
		const metadata = latestEntry.containers;
		const booking = metadata?.bookings;
		const loadingPort = this.getLoadingPort(latestEntry);
		const destinationPort = this.getDestinationPort(latestEntry);
		const latestEvent = trackingEvents[0];
		const latestStatus = latestEvent?.status;

		return {
			containerNumber: metadata?.container_number || normalizedContainerNumber,
			trackingNumber: metadata?.container_number || normalizedContainerNumber,
			bookingNumber: booking?.booking_number || undefined,
			vesselName: this.getVesselName(latestEntry),
			voyageNumber: this.getVoyageNumber(latestEntry),
			shippingLine: undefined,
			loadingPort: loadingPort || undefined,
			destinationPort: destinationPort || undefined,
			loadingDate: this.findEventTimestamp(entries, ['at_loading', 'loaded']) || undefined,
			departureDate:
				this.toIsoString(booking?.vessels?.etd) ||
				this.findEventTimestamp(entries, ['depart', 'on_board', 'in_transit']) ||
				undefined,
			estimatedArrival: this.toIsoString(booking?.eta) || undefined,
			containerType: undefined,
			status: latestStatus,
			trackingEvents,
			progress: this.calculateProgressFromStatus(latestStatus),
			currentLocation: latestEvent?.location || loadingPort || undefined,
		};
	}

	private async fetchPGLEntries(containerNumber: string): Promise<PGLTrackingEntry[]> {
		const normalizedContainerNumber = containerNumber.trim().toUpperCase();
		const url = `${PGL_TRACKING_ENDPOINT}?tracking_value=${encodeURIComponent(normalizedContainerNumber)}`;

		const response = await fetch(url, {
			cache: 'no-store',
			headers: {
				Accept: 'application/json',
			},
		});

		if (!response.ok) {
			logger.error('PGL tracking API error:', response.status);
			return [];
		}

		const payload = (await response.json()) as PGLTrackingResponse;
		if (!payload?.result || !Array.isArray(payload.data) || payload.data.length === 0) {
			logger.info(`No tracking data found for container: ${normalizedContainerNumber}`);
			return [];
		}

		return payload.data
			.slice()
			.sort((left, right) => this.getTimestamp(right.created_at) - this.getTimestamp(left.created_at));
	}

	private async fetchLegacyTrackingSupplement(
		containerNumber: string
	): Promise<LegacyTrackingSupplement | null> {
		const normalizedContainerNumber = containerNumber.trim().toUpperCase();

		try {
			const payload = {
				track_number: {
					value: normalizedContainerNumber,
					type: 'container',
				},
				company: 'AUTO',
				need_route: true,
				lang: 'en',
			};

			const response = await fetch(TIMETOCARGO_ENDPOINT, {
				method: 'POST',
				headers: TIMETOCARGO_HEADERS,
				body: JSON.stringify(payload),
				cache: 'no-store',
			});

			if (!response.ok) {
				logger.warn(`Legacy tracking provider unavailable for ${normalizedContainerNumber}: ${response.status}`);
				return null;
			}

			const payloadData = (await response.json()) as TimeToCargoResponse;
			if (!payloadData?.success || !Array.isArray(payloadData.data) || payloadData.data.length === 0) {
				return null;
			}

			return this.normalizeLegacyTrackingSupplement(payloadData.data[0], normalizedContainerNumber);
		} catch (error) {
			logger.warn('Error fetching legacy tracking fallback:', error);
			return null;
		}
	}

	private normalizeLegacyTrackingSupplement(
		entry: TimeToCargoEntry,
		requestedContainerNumber: string
	): LegacyTrackingSupplement | null {
		const containerNumber = entry.container?.number || requestedContainerNumber;
		if (!containerNumber) {
			return null;
		}

		const loadingPort =
			this.formatLegacyLocation(entry, entry.summary?.pol?.location) ||
			this.formatLegacyLocation(entry, entry.summary?.origin?.location);
		const destinationPort =
			this.formatLegacyLocation(entry, entry.summary?.pod?.location) ||
			this.formatLegacyLocation(entry, entry.summary?.destination?.location);

		const trackingEvents = (entry.container?.events || [])
			.map((event) => {
				const location = this.formatLegacyLocation(entry, event.location);
				const terminal = this.formatLegacyTerminal(entry, event.terminal);
				const descriptionParts = [
					event.vessel ? `Vessel: ${event.vessel}` : null,
					event.voyage ? `Voyage: ${event.voyage}` : null,
					terminal ? `Terminal: ${terminal}` : null,
				].filter(Boolean);

				return {
					status: event.status || 'Status Update',
					location: location || 'Unknown',
					timestamp: this.toIsoString(event.date) || new Date().toISOString(),
					description: descriptionParts.length > 0 ? descriptionParts.join(' • ') : undefined,
					vesselName: event.vessel || undefined,
					voyageNumber: event.voyage || undefined,
					completed: Boolean(event.actual),
				};
			})
			.filter((event) => event.status !== 'Status Update')
			.sort((left, right) => right.timestamp.localeCompare(left.timestamp));

		const latestEventWithVessel = trackingEvents.find(
			(event) => event.vesselName || event.voyageNumber
		);
		const latestCompletedEvent = trackingEvents.find((event) => event.completed);
		const completedEvents = trackingEvents.filter((event) => event.completed).length;
		const progress = trackingEvents.length > 0 ? Math.round((completedEvents / trackingEvents.length) * 100) : 0;

		return {
			containerNumber,
			trackingNumber: containerNumber,
			vesselName: latestEventWithVessel?.vesselName || undefined,
			voyageNumber: latestEventWithVessel?.voyageNumber || undefined,
			shippingLine: entry.summary?.company?.full_name || undefined,
			loadingPort: loadingPort || undefined,
			destinationPort: destinationPort || undefined,
			loadingDate: this.toIsoString(entry.summary?.origin?.date) || undefined,
			departureDate: this.toIsoString(entry.summary?.pol?.date) || undefined,
			estimatedArrival:
				this.toIsoString(entry.summary?.pod?.date || entry.summary?.destination?.date) || undefined,
			containerType: entry.container?.type || undefined,
			status: entry.shipment_status || trackingEvents[0]?.status,
			trackingEvents,
			progress,
			currentLocation: latestCompletedEvent?.location || loadingPort || undefined,
		};
	}

	private convertLegacySupplementToSnapshot(
		legacy: LegacyTrackingSupplement
	): ContainerTrackingSnapshot {
		return {
			containerNumber: legacy.containerNumber,
			trackingNumber: legacy.trackingNumber,
			bookingNumber: undefined,
			vesselName: legacy.vesselName,
			voyageNumber: legacy.voyageNumber,
			shippingLine: legacy.shippingLine,
			loadingPort: legacy.loadingPort,
			destinationPort: legacy.destinationPort,
			loadingDate: legacy.loadingDate,
			departureDate: legacy.departureDate,
			estimatedArrival: legacy.estimatedArrival,
			containerType: legacy.containerType,
			status: legacy.status,
			trackingEvents: this.mapExternalEventsToSnapshotEvents(legacy.trackingEvents),
			progress: legacy.progress,
			currentLocation: legacy.currentLocation,
		};
	}

	private mergeSnapshotWithLegacyFallback(
		primary: ContainerTrackingSnapshot,
		legacy: LegacyTrackingSupplement
	): ContainerTrackingSnapshot {
		const legacyEvents = this.mapExternalEventsToSnapshotEvents(legacy.trackingEvents);
		const useLegacyEvents = legacyEvents.length > primary.trackingEvents.length;

		return {
			...primary,
			vesselName: primary.vesselName || legacy.vesselName,
			voyageNumber: primary.voyageNumber || legacy.voyageNumber,
			shippingLine: primary.shippingLine || legacy.shippingLine,
			loadingPort: primary.loadingPort || legacy.loadingPort,
			destinationPort: primary.destinationPort || legacy.destinationPort,
			loadingDate: primary.loadingDate || legacy.loadingDate,
			departureDate: primary.departureDate || legacy.departureDate,
			estimatedArrival: primary.estimatedArrival || legacy.estimatedArrival,
			containerType: primary.containerType || legacy.containerType,
			status: primary.status || legacy.status,
			trackingEvents: useLegacyEvents ? legacyEvents : primary.trackingEvents,
			progress: useLegacyEvents || primary.trackingEvents.length === 0 ? legacy.progress : primary.progress,
			currentLocation: primary.currentLocation || legacy.currentLocation,
		};
	}

	private needsLegacyFallback(snapshot: ContainerTrackingSnapshot): boolean {
		return (
			!snapshot.vesselName ||
			!snapshot.voyageNumber ||
			!snapshot.shippingLine ||
			!snapshot.containerType ||
			snapshot.trackingEvents.length === 0
		);
	}

	private mapExternalEventsToSnapshotEvents(
		events: ExternalTrackingEvent[]
	): ContainerTrackingSnapshot['trackingEvents'] {
		return events.map((event) => ({
			status: event.status,
			location: event.location || undefined,
			vesselName: event.vesselName || undefined,
			description: event.description || undefined,
			eventDate: event.timestamp,
			completed: Boolean(event.completed),
			source: 'API' as const,
		}));
	}

	private normalizeStatus(status?: string | null): string {
		const rawStatus = status?.trim().toLowerCase();
		if (!rawStatus) {
			return 'Status Update';
		}

		const statusMap: Record<string, string> = {
			pending: 'Container Booked',
			at_loading: 'Loaded at Origin',
			loaded: 'Loaded at Origin',
			at_the_dock: 'At Origin Dock',
			on_board: 'In Transit - Ocean',
			in_transit: 'In Transit - Ocean',
			at_sea: 'In Transit - Ocean',
			transshipment: 'Transshipment',
			arrived_destination: 'Arrived at Destination Port',
			arrived_at_destination: 'Arrived at Destination Port',
			customs_clearance: 'Customs Clearance',
			released_from_customs: 'Released from Customs',
			out_for_delivery: 'Out for Delivery',
			delivered: 'Delivered',
		};

		if (statusMap[rawStatus]) {
			return statusMap[rawStatus];
		}

		return rawStatus
			.split('_')
			.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
			.join(' ');
	}

	private getLoadingPort(entry: PGLTrackingEntry): string | undefined {
		return entry.containers?.vehicles?.find((vehicle) => vehicle.pol_locations?.name)?.pol_locations?.name || undefined;
	}

	private getDestinationPort(entry: PGLTrackingEntry): string | undefined {
		return entry.containers?.bookings?.destinations?.name || undefined;
	}

	private getVesselName(entry: PGLTrackingEntry): string | undefined {
		return entry.containers?.bookings?.vessels?.name || entry.containers?.bookings?.vessels?.vessel || undefined;
	}

	private getVoyageNumber(entry: PGLTrackingEntry): string | undefined {
		return entry.containers?.bookings?.vessels?.voyage_number || entry.containers?.bookings?.vessels?.voyage || undefined;
	}

	private getEventLocation(entry: PGLTrackingEntry, rawStatus?: string | null): string | undefined {
		const status = rawStatus?.toLowerCase() || '';
		const loadingPort = this.getLoadingPort(entry);
		const destinationPort = this.getDestinationPort(entry);

		if (
			status.includes('destination') ||
			status.includes('deliver') ||
			status.includes('customs') ||
			status.includes('release')
		) {
			return destinationPort || loadingPort;
		}

		return loadingPort || destinationPort;
	}

	private findEventTimestamp(entries: PGLTrackingEntry[], patterns: string[]): string | undefined {
		const match = entries
			.slice()
			.reverse()
			.find((entry) => {
				const status = entry.status?.toLowerCase() || '';
				return patterns.some((pattern) => status.includes(pattern));
			});

		return this.toIsoString(match?.created_at);
	}

	private calculateProgressFromStatus(status?: string): number {
		const normalizedStatus = status?.toLowerCase() || '';

		if (normalizedStatus.includes('booked')) return 10;
		if (normalizedStatus.includes('loading')) return 25;
		if (normalizedStatus.includes('loaded')) return 30;
		if (normalizedStatus.includes('dock')) return 35;
		if (normalizedStatus.includes('depart')) return 40;
		if (normalizedStatus.includes('transit') || normalizedStatus.includes('ocean')) return 60;
		if (normalizedStatus.includes('arrived')) return 75;
		if (normalizedStatus.includes('customs')) return 85;
		if (normalizedStatus.includes('released') || normalizedStatus.includes('cleared')) return 90;
		if (normalizedStatus.includes('delivery')) return 95;
		if (normalizedStatus.includes('delivered')) return 100;

		return 50;
	}

	private toIsoString(value?: string | null): string | undefined {
		if (!value) {
			return undefined;
		}

		const date = new Date(value);
		return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
	}

	private getTimestamp(value?: string | null): number {
		if (!value) {
			return 0;
		}

		const date = new Date(value);
		return Number.isNaN(date.getTime()) ? 0 : date.getTime();
	}

	private formatLegacyLocation(entry: TimeToCargoEntry, id?: number | null): string | undefined {
		if (id === undefined || id === null) return undefined;
		const location = entry.locations?.find((loc) => loc.id === id);
		if (!location) return undefined;
		const parts = [location.name, location.state, location.country].filter(Boolean);
		return parts.length ? parts.join(', ') : undefined;
	}

	private formatLegacyTerminal(entry: TimeToCargoEntry, id?: number | null): string | undefined {
		if (id === undefined || id === null) return undefined;
		const terminal = entry.terminals?.find((term) => term.id === id);
		return terminal?.name || undefined;
	}
}

// Singleton instance
export const trackingAPI = new TrackingAPIService();
