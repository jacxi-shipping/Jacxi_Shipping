import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { routeDeps } from '@/lib/route-deps';
import {
  canAssignShipmentsToPartnerPortals,
  canManagePartnerPortals,
  canReadPartnerPortalShipments,
  getPartnerPortalMembership,
  getPartnerPortalOrThrow,
} from '@/lib/partner-portals';

const assignShipmentSchema = z.object({
  shipmentId: z.string().trim().min(1),
  partnerCustomerId: z.string().trim().min(1).nullable().optional(),
  notes: z.string().trim().max(1000).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ portalId: string }> },
) {
  try {
    const session = await routeDeps.auth();
    const { portalId } = await params;

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

    const assignments = await routeDeps.prisma.partnerShipmentAssignment.findMany({
      where: { portalId },
      orderBy: { assignedAt: 'desc' },
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
            vehicleColor: true,
            lotNumber: true,
            auctionName: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    return NextResponse.json({ portal, assignments });
  } catch (error) {
    routeDeps.logger.error('Failed to fetch portal shipment assignments', error);
    return NextResponse.json({ error: 'Failed to fetch portal shipment assignments' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ portalId: string }> },
) {
  try {
    const session = await routeDeps.auth();
    const { portalId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canAssignShipmentsToPartnerPortals(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const portal = await getPartnerPortalOrThrow(portalId);

    if (!portal) {
      return NextResponse.json({ error: 'Partner portal not found' }, { status: 404 });
    }

    const payload = assignShipmentSchema.parse(await request.json());

    const shipment = await routeDeps.prisma.shipment.findUnique({
      where: { id: payload.shipmentId },
      select: { id: true },
    });

    if (!shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }

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

    const existing = await routeDeps.prisma.partnerShipmentAssignment.findUnique({
      where: { shipmentId: payload.shipmentId },
      select: { id: true, portalId: true },
    });

    if (existing) {
      return NextResponse.json({ error: 'Shipment is already assigned to a partner portal' }, { status: 409 });
    }

    const assignment = await routeDeps.prisma.partnerShipmentAssignment.create({
      data: {
        portalId,
        shipmentId: payload.shipmentId,
        ...(payload.partnerCustomerId ? { partnerCustomerId: payload.partnerCustomerId } : {}),
        assignedBy: session.user.id,
        ...(payload.partnerCustomerId ? { linkedBy: session.user.id, linkedAt: new Date() } : {}),
        ...(payload.notes ? { notes: payload.notes } : {}),
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

    return NextResponse.json({ assignment }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.issues }, { status: 400 });
    }

    routeDeps.logger.error('Failed to assign shipment to partner portal', error);
    return NextResponse.json({ error: 'Failed to assign shipment to partner portal' }, { status: 500 });
  }
}