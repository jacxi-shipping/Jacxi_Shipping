import { prisma } from '@/lib/db';
import { buildCustomerTrackingView, type CustomerTrackingView } from '@/lib/customer-tracking';
import { trackingAPI, type ContainerTrackingSnapshot } from '@/lib/services/tracking-api';

export type NormalizedTrackingEvent = {
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

export type NormalizedTracking = {
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
  requestedNumber: string;
  events: NormalizedTrackingEvent[];
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
    shipmentStatuses: container.shipments.map((shipment) => shipment.status),
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

function normalizeTrackingFromSnapshot(snapshot: ContainerTrackingSnapshot): Omit<NormalizedTracking, 'customerTracking' | 'requestedNumber'> {
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

export async function buildTrackingResponse(trackNumber: string): Promise<NormalizedTracking | null> {
  const requestedNumber = trackNumber.trim();
  if (!requestedNumber) {
    return null;
  }

  const snapshot = await trackingAPI.fetchContainerTrackingData(requestedNumber);
  if (!snapshot) {
    return null;
  }

  const normalized = normalizeTrackingFromSnapshot(snapshot);
  const internalSnapshot = await getInternalTrackingSnapshot(requestedNumber);
  const customerTracking = buildCustomerTrackingView({
    shipmentStatus: normalized.shipmentStatus,
    originDate: normalized.originDate,
    polDate: normalized.polDate,
    podDate: normalized.podDate,
    estimatedArrival: normalized.estimatedArrival,
    events: normalized.events,
    internal: internalSnapshot,
  });

  return {
    ...normalized,
    customerTracking,
    requestedNumber,
  };
}