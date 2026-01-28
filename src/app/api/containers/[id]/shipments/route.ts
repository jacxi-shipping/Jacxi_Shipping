import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const assignShipmentsSchema = z.object({
  shipmentIds: z.array(z.string()),
});

// GET - Fetch shipments assigned to container
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const shipments = await prisma.shipment.findMany({
      where: { containerId: params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      shipments,
      count: shipments.length,
    });
  } catch (error) {
    console.error('Error fetching container shipments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shipments' },
      { status: 500 }
    );
  }
}

// POST - Assign shipments to container
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

    // Only admins can assign shipments
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify container exists
    const container = await prisma.container.findUnique({
      where: { id: params.id },
      include: {
        shipments: true,
      },
    });

    if (!container) {
      return NextResponse.json({ error: 'Container not found' }, { status: 404 });
    }

    const body = await request.json();
    const { shipmentIds } = assignShipmentsSchema.parse(body);

    // Check capacity
    const currentCount = container.shipments.length;
    const newCount = currentCount + shipmentIds.length;
    
    if (newCount > container.maxCapacity) {
      return NextResponse.json(
        { 
          error: `Container capacity exceeded. Current: ${currentCount}, Max: ${container.maxCapacity}, Attempting to add: ${shipmentIds.length}` 
        },
        { status: 400 }
      );
    }

    // Verify all shipments exist and are ON_HAND
    const shipments = await prisma.shipment.findMany({
      where: {
        id: { in: shipmentIds },
      },
    });

    if (shipments.length !== shipmentIds.length) {
      return NextResponse.json(
        { error: 'Some shipments not found' },
        { status: 404 }
      );
    }

    const invalidShipments = shipments.filter(s => s.status !== 'ON_HAND');
    if (invalidShipments.length > 0) {
      return NextResponse.json(
        { error: 'Can only assign shipments with status ON_HAND' },
        { status: 400 }
      );
    }

    // Assign shipments to container
    await prisma.shipment.updateMany({
      where: { id: { in: shipmentIds } },
      data: {
        containerId: params.id,
        status: 'IN_TRANSIT',
      },
    });

    // Update container count
    await prisma.container.update({
      where: { id: params.id },
      data: {
        currentCount: newCount,
      },
    });

    // Create audit log
    await prisma.containerAuditLog.create({
      data: {
        containerId: params.id,
        action: 'SHIPMENTS_ASSIGNED',
        description: `${shipmentIds.length} shipments assigned to container`,
        performedBy: session.user.id as string,
        metadata: { shipmentIds },
      },
    });

    return NextResponse.json({
      message: 'Shipments assigned successfully',
      count: shipmentIds.length,
      newTotal: newCount,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error assigning shipments:', error);
    return NextResponse.json(
      { error: 'Failed to assign shipments' },
      { status: 500 }
    );
  }
}

// DELETE - Remove shipment from container
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const shipmentId = searchParams.get('shipmentId');

    if (!shipmentId) {
      return NextResponse.json({ error: 'Shipment ID required' }, { status: 400 });
    }

    // Remove shipment from container
    await prisma.shipment.update({
      where: { id: shipmentId },
      data: {
        containerId: null,
        status: 'ON_HAND',
      },
    });

    // Update container count
    const container = await prisma.container.findUnique({
      where: { id: params.id },
      include: { shipments: true },
    });

    if (container) {
      await prisma.container.update({
        where: { id: params.id },
        data: {
          currentCount: container.shipments.length,
        },
      });
    }

    return NextResponse.json({ message: 'Shipment removed from container' });
  } catch (error) {
    console.error('Error removing shipment:', error);
    return NextResponse.json(
      { error: 'Failed to remove shipment' },
      { status: 500 }
    );
  }
}
