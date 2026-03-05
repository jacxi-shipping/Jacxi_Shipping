import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/rbac';

const addShipmentSchema = z.object({
  shipmentId: z.string().min(1),
  releaseToken: z.string().min(1),
});

// POST - Assign a shipment to this transit
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user?.role, 'transits:manage') || !hasPermission(session.user?.role, 'shipments:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const transit = await prisma.transit.findUnique({ where: { id: params.id } });
    if (!transit) {
      return NextResponse.json({ error: 'Transit not found' }, { status: 404 });
    }

    if (transit.status === 'DELIVERED' || transit.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Cannot add shipments to a delivered or cancelled transit' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { shipmentId, releaseToken } = addShipmentSchema.parse(body);

    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      select: {
        id: true,
        status: true,
        transitId: true,
        releaseToken: true,
        container: {
          select: {
            status: true,
          },
        },
      },
    });
    if (!shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }

    const isReleased = String(shipment.status) === 'RELEASED' || shipment.container?.status === 'RELEASED';

    if (!isReleased) {
      return NextResponse.json(
        { error: 'Shipment can be assigned to transit only after release' },
        { status: 400 }
      );
    }

    if (!shipment.releaseToken) {
      return NextResponse.json(
        { error: 'Shipment has no release token. Generate a release token first.' },
        { status: 400 }
      );
    }

    if (shipment.releaseToken !== releaseToken.trim()) {
      return NextResponse.json(
        { error: 'Invalid release token for this shipment' },
        { status: 400 }
      );
    }

    if (shipment.transitId && shipment.transitId !== params.id) {
      return NextResponse.json(
        { error: 'Shipment is already assigned to another transit' },
        { status: 400 }
      );
    }

    const updatedShipment = await prisma.shipment.update({
      where: { id: shipmentId },
      data: { transitId: params.id, status: 'IN_TRANSIT_TO_DESTINATION' },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json({ shipment: updatedShipment });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 });
    }
    console.error('Error adding shipment to transit:', error);
    return NextResponse.json({ error: 'Failed to add shipment to transit' }, { status: 500 });
  }
}

// DELETE - Remove a shipment from this transit
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user?.role, 'transits:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const shipmentId = searchParams.get('shipmentId');

    if (!shipmentId) {
      return NextResponse.json({ error: 'shipmentId query parameter is required' }, { status: 400 });
    }

    const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId } });
    if (!shipment || shipment.transitId !== params.id) {
      return NextResponse.json({ error: 'Shipment not found in this transit' }, { status: 404 });
    }

    await prisma.shipment.update({
      where: { id: shipmentId },
      data: { transitId: null, status: 'IN_TRANSIT' },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing shipment from transit:', error);
    return NextResponse.json({ error: 'Failed to remove shipment from transit' }, { status: 500 });
  }
}
