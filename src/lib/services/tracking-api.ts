/**
 * TimeToСargo API Integration Service
 * Fetches real-time tracking data from TimeToСargo aggregator
 * https://tracking.timetocargo.com
 */

const TIMETOCARGO_ENDPOINT = 'https://tracking.timetocargo.com/webapi/track';
const DEFAULT_HEADERS = {
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
	latitude?: number;
	longitude?: number;
}

interface TimetoCargoResponse {
	success?: boolean;
	status?: string;
	status_description?: string;
	data?: TimetoCargoEntry[];
}

interface TimetoCargoEntry {
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

export class TrackingAPIService {
	/**
	 * Fetch tracking data from TimeToСargo API
	 */
	async fetchTrackingData(
		trackingNumber: string,
		shippingLine?: string
	): Promise<ExternalTrackingEvent[]> {
		try {
            // Normalize shipping line
            let company = 'AUTO';
            if (shippingLine) {
                const sl = shippingLine.toUpperCase();
                if (sl.includes('MSC') || sl.includes('MEDITERRANEAN')) company = 'MSC';
                else if (sl.includes('MAERSK')) company = 'MAERSK';
                else if (sl.includes('CMA') || sl.includes('CGM')) company = 'CMAD';
                else if (sl.includes('COSCO')) company = 'COSCO';
                else if (sl.includes('HAPAG')) company = 'HLCU';
                else if (sl.includes('ONE') || sl.includes('OCEAN NETWORK')) company = 'ONEY';
                else if (sl.includes('EVERGREEN')) company = 'COSU';
                else if (sl.includes('YANG MING')) company = 'YMLU';
                else if (sl.length < 10) company = sl; // Assume it's already a code
            }

			const payload = {
				track_number: {
					value: trackingNumber,
					type: 'container',
				},
				company: company,
				need_route: true,
				lang: 'en',
			};

			const response = await fetch(TIMETOCARGO_ENDPOINT, {
				method: 'POST',
				headers: DEFAULT_HEADERS,
				body: JSON.stringify(payload),
				cache: 'no-store',
			});

			if (!response.ok) {
				console.error('TimeToСargo API error:', response.status);
				return [];
			}

			const data = (await response.json()) as TimetoCargoResponse;

			if (!data?.success || !Array.isArray(data.data) || data.data.length === 0) {
				console.log('No tracking data found for:', trackingNumber);
				return [];
			}

			// Transform TimeToСargo response to our format
			return this.transformAPIResponse(data.data[0]);
		} catch (error) {
			console.error('Error fetching tracking data:', error);
			return [];
		}
	}

	/**
	 * Transform TimeToСargo API response to our format
	 */
	private transformAPIResponse(entry: TimetoCargoEntry): ExternalTrackingEvent[] {
		try {
			const events = entry.container?.events || [];

			return events
				.map((event) => {
					// Format location
					const location = this.formatLocation(entry, event.location);
					const terminal = this.formatTerminal(entry, event.terminal);
					
					// Get coordinates
					const locationData = entry.locations?.find((loc) => loc.id === event.location);
					const lat = locationData?.lat;
					const lng = locationData?.lng;

					// Build description
					const descParts = [
						event.vessel ? `Vessel: ${event.vessel}` : null,
						event.voyage ? `Voyage: ${event.voyage}` : null,
						terminal ? `Terminal: ${terminal}` : null,
					].filter(Boolean);

					return {
						status: event.status || 'Status Update',
						location: location || 'Unknown',
						timestamp: event.date ? new Date(event.date).toISOString() : new Date().toISOString(),
						description: descParts.length ? descParts.join(' • ') : undefined,
						vesselName: event.vessel || undefined,
						latitude: lat || undefined,
						longitude: lng || undefined,
					};
				})
				.filter((event) => event.status !== 'Status Update'); // Filter out events with no status
		} catch (error) {
			console.error('Error transforming TimeToСargo response:', error);
			return [];
		}
	}

	/**
	 * Format location from TimeToСargo data
	 */
	private formatLocation(entry: TimetoCargoEntry, id?: number | null): string | undefined {
		if (id === undefined || id === null) return undefined;
		const location = entry.locations?.find((loc) => loc.id === id);
		if (!location) return undefined;
		const parts = [location.name, location.state, location.country].filter(Boolean);
		return parts.length ? parts.join(', ') : undefined;
	}

	/**
	 * Format terminal from TimeToСargo data
	 */
	private formatTerminal(entry: TimetoCargoEntry, id?: number | null): string | undefined {
		if (id === undefined || id === null) return undefined;
		const terminal = entry.terminals?.find((term) => term.id === id);
		return terminal?.name || undefined;
	}

	/**
	 * Get estimated arrival time from TimeToСargo
	 */
	async getEstimatedArrival(
		trackingNumber: string
	): Promise<Date | null> {
		try {
			const payload = {
				track_number: {
					value: trackingNumber,
					type: 'container',
				},
				company: 'AUTO',
				need_route: true,
				lang: 'en',
			};

			const response = await fetch(TIMETOCARGO_ENDPOINT, {
				method: 'POST',
				headers: DEFAULT_HEADERS,
				body: JSON.stringify(payload),
				cache: 'no-store',
			});

			if (!response.ok) return null;

			const data = (await response.json()) as TimetoCargoResponse;

			if (!data?.success || !Array.isArray(data.data) || data.data.length === 0) {
				return null;
			}

			const entry = data.data[0];
			
			// Try to find arrival event
			const arrivalEvent = entry.container?.events?.find(
				(event) => 
					event.status_code === 'VAD' || 
					event.status?.toLowerCase().includes('arrival') ||
					event.status?.toLowerCase().includes('delivered')
			);

			if (arrivalEvent?.date) {
				return new Date(arrivalEvent.date);
			}

			// Fallback to destination date
			if (entry.summary?.destination?.date) {
				return new Date(entry.summary.destination.date);
			}

			// Fallback to POD date
			if (entry.summary?.pod?.date) {
				return new Date(entry.summary.pod.date);
			}

			return null;
		} catch (error) {
			console.error('Error fetching ETA:', error);
			return null;
		}
	}
}

// Singleton instance
export const trackingAPI = new TrackingAPIService();
