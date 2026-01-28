import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

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

const formatLocation = (entry: TimetoCargoEntry, id?: number | null) => {
  if (id === undefined || id === null) return undefined;
  const location = entry.locations?.find((loc) => loc.id === id);
  if (!location) return undefined;
  const parts = [location.name, location.state, location.country].filter(Boolean);
  return parts.length ? parts.join(', ') : undefined;
};

const toIsoString = (value?: string | null) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admins can fetch tracking data
    if (session.user?.role !== 'admin') {
      return NextResponse.json(
        { message: 'Forbidden: Only admins can fetch tracking data' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const containerNumber = searchParams.get('containerNumber');

    if (!containerNumber) {
      return NextResponse.json(
        { message: 'Container number is required' },
        { status: 400 }
      );
    }

    try {
      const trackingData = await fetchFromTimeToCargoAPI(containerNumber);
      
      if (!trackingData) {
        return NextResponse.json(
          { 
            message: 'Container not found in tracking system. Please enter details manually.',
            trackingData: null
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        message: 'Container data fetched successfully',
        trackingData,
      });
    } catch (error) {
      console.error('Error fetching from tracking API:', error);
      return NextResponse.json(
        { 
          message: 'Unable to fetch container data from tracking system. Please enter details manually.',
          trackingData: null
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in tracking route:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Fetch container tracking data from TimeToargo API
 * This uses the same tracking service as the dashboard tracking page
 */
async function fetchFromTimeToCargoAPI(containerNumber: string) {
  try {
    const payload = {
      track_number: {
        value: containerNumber.trim(),
        type: 'container',
      },
      company: 'AUTO',
      need_route: true, // We need route info for tracking events
      lang: 'en',
    };

    const response = await fetch(TIMETOCARGO_ENDPOINT, {
      method: 'POST',
      headers: DEFAULT_HEADERS,
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('TimeToargo API error:', response.status);
      return null;
    }

    const data = (await response.json()) as TimetoCargoResponse;

    if (!data?.success || !Array.isArray(data.data) || data.data.length === 0) {
      console.log('No tracking data found for container:', containerNumber);
      return null;
    }

    const entry = data.data[0];
    
    // Extract the most recent vessel and voyage from events
    const latestVesselEvent = entry.container?.events?.find(e => e.vessel);
    
    // Format ports
    const loadingPort = formatLocation(entry, entry.summary?.pol?.location) || 
                        formatLocation(entry, entry.summary?.origin?.location);
    const destinationPort = formatLocation(entry, entry.summary?.pod?.location) || 
                           formatLocation(entry, entry.summary?.destination?.location);
    
    // Get shipping line from company info
    const shippingLine = entry.summary?.company?.full_name;
    
    // Extract dates
    const loadingDate = toIsoString(entry.summary?.origin?.date);
    const departureDate = toIsoString(entry.summary?.pol?.date);
    const estimatedArrival = toIsoString(entry.summary?.pod?.date || entry.summary?.destination?.date);
    
    // Extract tracking events
    const trackingEvents = (entry.container?.events || []).map((event, index) => {
      const location = formatLocation(entry, event.location);
      const terminal = entry.terminals?.find((term) => term.id === event.terminal);
      
      // Build description
      const descParts = [
        event.vessel ? `Vessel: ${event.vessel}` : null,
        event.voyage ? `Voyage: ${event.voyage}` : null,
        terminal?.name ? `Terminal: ${terminal.name}` : null,
      ].filter(Boolean);
      
      // Determine if this is a completed event (actual vs estimated)
      const isCompleted = Boolean(event.actual);
      
      return {
        status: event.status || 'Status Update',
        location: location || undefined,
        vesselName: event.vessel || undefined,
        description: descParts.length ? descParts.join(' • ') : undefined,
        eventDate: toIsoString(event.date) || new Date().toISOString(),
        completed: isCompleted,
        source: 'API',
      };
    }).filter(event => event.status !== 'Status Update');
    
    // Calculate progress based on completed events
    const completedEvents = trackingEvents.filter(e => e.completed).length;
    const totalEvents = trackingEvents.length;
    const progress = totalEvents > 0 ? Math.round((completedEvents / totalEvents) * 100) : 0;
    
    // Get current location from the most recent completed event
    const latestCompletedEvent = trackingEvents.find(e => e.completed);
    const currentLocation = latestCompletedEvent?.location || loadingPort;
    
    // Construct tracking data in the format expected by the form
    return {
      containerNumber: entry.container?.number || containerNumber,
      trackingNumber: containerNumber, // Use container number as tracking number
      vesselName: latestVesselEvent?.vessel || undefined,
      voyageNumber: latestVesselEvent?.voyage || undefined,
      shippingLine: shippingLine || undefined,
      loadingPort: loadingPort || undefined,
      destinationPort: destinationPort || undefined,
      loadingDate: loadingDate || undefined,
      departureDate: departureDate || undefined,
      estimatedArrival: estimatedArrival || undefined,
      containerType: entry.container?.type || undefined,
      status: entry.shipment_status || undefined,
      trackingEvents: trackingEvents,
      progress: progress,
      currentLocation: currentLocation,
    };
  } catch (error) {
    console.error('Error calling TimeToargo API:', error);
    return null;
  }
}
