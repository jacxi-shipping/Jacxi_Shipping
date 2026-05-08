import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { buildCustomerTrackingView } from '@/lib/customer-tracking';
import { routeDeps } from '@/lib/route-deps';
import {
  canAssignShipmentsToPartnerPortals,
  canManagePartnerPortals,
  canReadPartnerPortalShipments,
  getPartnerPortalMembership,
  getPartnerPortalOrThrow,
} from '@/lib/partner-portals';

const updateAssignedShipmentSchema = z.object({
  partnerCustomerId: z.string().trim().min(1).nullable(),
  notes: z.string().trim().max(1000).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ portalId: string; shipmentId: string }> },
) {
  try {
    const session = await routeDeps.auth();
    const { portalId, shipmentId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const portal = await getPartnerPortalOrThrow(portalId);

    if (!portal) {
      return NextResponse.json({ error: 'Partner portal not found' }, { status: 404 });
    }

    const membership = await getPartnerPortalMembership(portalId, session.user.id);
    const hasInternalAccess = canManagePartnerPortals(session.user.role) || canReadPartnerPortalShipments(session.user.role);

    if (!membership && !hasInternalAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const assignment = await routeDeps.prisma.partnerShipmentAssignment.findFirst({
      where: { portalId, shipmentId },
      include: {
        partnerCustomer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            city: true,
            country: true,
          },
        },
        shipment: {
          select: {
            id: true,
            serviceType: true,
            vehicleType: true,
            vehicleMake: true,
            vehicleModel: true,
            vehicleYear: true,
            vehicleVIN: true,
            vehicleColor: true,
            lotNumber: true,
            auctionName: true,
            hasKey: true,
            hasTitle: true,
            status: true,
            paymentStatus: true,
            createdAt: true,
            updatedAt: true,
            vehiclePhotos: true,
            arrivalPhotos: true,
            dispatchId: true,
            transitId: true,
            documents: {
              where: { isPublic: true },
              select: {
                id: true,
                name: true,
                description: true,
                fileUrl: true,
                fileType: true,
                fileSize: true,
                category: true,
                createdAt: true,
              },
              orderBy: { createdAt: 'desc' },
            },
            dispatch: {
              select: {
                referenceNumber: true,
                origin: true,
                destination: true,
                status: true,
                dispatchDate: true,
                events: {
                  select: {
                    id: true,
                    status: true,
                    location: true,
                    description: true,
                    eventDate: true,
                  },
                  orderBy: { eventDate: 'desc' },
                  take: 10,
                },
              },
            },
            transit: {
              select: {
                referenceNumber: true,
                origin: true,
                destination: true,
                status: true,
                dispatchDate: true,
                estimatedDelivery: true,
                actualDelivery: true,
                events: {
                  select: {
                    id: true,
                    origin: true,
                    destination: true,
                    status: true,
                    location: true,
                    description: true,
                    eventDate: true,
                  },
                  orderBy: [{ eventDate: 'desc' }, { createdAt: 'desc' }],
                  take: 10,
                },
              },
            },
            container: {
              select: {
                containerNumber: true,
                trackingNumber: true,
                vesselName: true,
                voyageNumber: true,
                loadingPort: true,
                destinationPort: true,
                estimatedArrival: true,
                actualArrival: true,
                status: true,
                currentLocation: true,
                progress: true,
                loadingDate: true,
                departureDate: true,
                trackingEvents: {
                  select: {
                    id: true,
                    status: true,
                    location: true,
                    description: true,
                    eventDate: true,
                    completed: true,
                  },
                  orderBy: { eventDate: 'desc' },
                  take: 20,
                },
              },
            },
          },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assigned shipment not found in this portal' }, { status: 404 });
    }

    const trackingEvents = (assignment.shipment.container?.trackingEvents || []).map((event) => ({
      id: event.id,
      status: event.status,
      location: event.location || undefined,
      description: event.description || undefined,
      timestamp: event.eventDate.toISOString(),
      actual: event.completed,
    }));

    const customerTracking = buildCustomerTrackingView({
      shipmentStatus: assignment.shipment.status,
      originDate: assignment.shipment.dispatch?.dispatchDate?.toISOString(),
      polDate: assignment.shipment.container?.loadingDate?.toISOString() || assignment.shipment.container?.departureDate?.toISOString(),
      podDate: assignment.shipment.container?.estimatedArrival?.toISOString(),
      estimatedArrival: assignment.shipment.container?.estimatedArrival?.toISOString(),
      events: trackingEvents,
      internal: {
        shipmentStatuses: [assignment.shipment.status],
        hasDispatch: Boolean(assignment.shipment.dispatchId),
        hasTransit: Boolean(assignment.shipment.transitId),
        containerStatus: assignment.shipment.container?.status || null,
        dispatchDate: assignment.shipment.dispatch?.dispatchDate?.toISOString(),
        loadingDate: assignment.shipment.container?.loadingDate?.toISOString(),
        departureDate: assignment.shipment.container?.departureDate?.toISOString(),
        actualArrival: assignment.shipment.container?.actualArrival?.toISOString(),
        transitDispatchDate: assignment.shipment.transit?.dispatchDate?.toISOString(),
        actualDelivery: assignment.shipment.transit?.actualDelivery?.toISOString(),
      },
    });

    const history = [
      ...(assignment.shipment.dispatch?.events || []).map((event) => ({
        id: `dispatch-${event.id}`,
        source: 'DISPATCH',
        title: event.status,
        location: event.location,
        description: event.description,
        occurredAt: event.eventDate.toISOString(),
      })),
      ...(assignment.shipment.container?.trackingEvents || []).map((event) => ({
        id: `container-${event.id}`,
        source: 'SHIPPING',
        title: event.status,
        location: event.location,
        description: event.description,
        occurredAt: event.eventDate.toISOString(),
      })),
      ...(assignment.shipment.transit?.events || []).map((event) => ({
        id: `transit-${event.id}`,
        source: 'TRANSIT',
        title: event.status,
        location: event.location,
        description: event.description,
        occurredAt: event.eventDate.toISOString(),
      })),
    ].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));

    return NextResponse.json({ portal, assignment, customerTracking, history });
  } catch (error) {
    routeDeps.logger.error('Failed to fetch portal shipment detail', error);
    return NextResponse.json({ error: 'Failed to fetch portal shipment detail' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ portalId: string; shipmentId: string }> },
) {
  try {
    const session = await routeDeps.auth();
    const { portalId, shipmentId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const portal = await getPartnerPortalOrThrow(portalId);

    if (!portal) {
      return NextResponse.json({ error: 'Partner portal not found' }, { status: 404 });
    }

    const membership = await getPartnerPortalMembership(portalId, session.user.id);
    const hasInternalAccess = canManagePartnerPortals(session.user.role) || canReadPartnerPortalShipments(session.user.role);

    if (!membership && !hasInternalAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const assignment = await routeDeps.prisma.partnerShipmentAssignment.findFirst({
      where: {
        portalId,
        shipmentId,
      },
      select: {
        id: true,
        portalId: true,
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assigned shipment not found in this portal' }, { status: 404 });
    }

    const payload = updateAssignedShipmentSchema.parse(await request.json());

    if (payload.partnerCustomerId) {
      const partnerCustomer = await routeDeps.prisma.partnerCustomer.findFirst({
        where: {
          id: payload.partnerCustomerId,
          portalId,
        },
        select: { id: true },
      });

      if (!partnerCustomer) {
        return NextResponse.json({ error: 'Partner customer not found in this portal' }, { status: 404 });
      }
    }

    const updatedAssignment = await routeDeps.prisma.partnerShipmentAssignment.update({
      where: { id: assignment.id },
      data: {
        partnerCustomerId: payload.partnerCustomerId,
        linkedBy: session.user.id,
        linkedAt: payload.partnerCustomerId ? new Date() : null,
        ...(payload.notes !== undefined ? { notes: payload.notes } : {}),
      },
      include: {
        partnerCustomer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        shipment: {
          select: {
            id: true,
            serviceType: true,
            vehicleType: true,
            vehicleMake: true,
            vehicleModel: true,
            vehicleYear: true,
            vehicleVIN: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json({ assignment: updatedAssignment });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.issues }, { status: 400 });
    }

    routeDeps.logger.error('Failed to link assigned shipment to portal customer', error);
    return NextResponse.json({ error: 'Failed to update assigned shipment' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ portalId: string; shipmentId: string }> },
) {
  try {
    const session = await routeDeps.auth();
    const { portalId, shipmentId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canAssignShipmentsToPartnerPortals(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const assignment = await routeDeps.prisma.partnerShipmentAssignment.findFirst({
      where: { portalId, shipmentId },
      select: { id: true },
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assigned shipment not found in this portal' }, { status: 404 });
    }

    await routeDeps.prisma.partnerShipmentAssignment.delete({ where: { id: assignment.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    routeDeps.logger.error('Failed to unassign shipment from portal', error);
    return NextResponse.json({ error: 'Failed to unassign shipment from portal' }, { status: 500 });
  }
}