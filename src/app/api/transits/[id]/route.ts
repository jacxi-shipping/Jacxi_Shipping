import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

const updateTransitSchema = z.object({
  companyId: z.string().optional(),
  origin: z.string().optional(),
  destination: z.string().optional(),
  status: z.enum(['PENDING', 'DISPATCHED', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED', 'CANCELLED']).optional(),
  dispatchDate: z.string().nullable().optional(),
  estimatedDelivery: z.string().nullable().optional(),
  actualDelivery: z.string().nullable().optional(),
  cost: z.number().positive().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const transit = await prisma.transit.findUnique({
      where: { id: params.id },
      include: {
        company: { select: { id: true, name: true, code: true, phone: true, email: true } },
        shipments: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
        events: { orderBy: { eventDate: 'desc' } },
        expenses: { orderBy: { date: 'desc' } },
        _count: { select: { shipments: true, events: true, expenses: true } },
      },
    });

    if (!transit) {
      return NextResponse.json({ error: 'Transit not found' }, { status: 404 });
    }

    const totalExpenses = transit.expenses.reduce((sum, e) => sum + e.amount, 0);

    return NextResponse.json({ transit, totalExpenses });
  } catch (error) {
    console.error('Error fetching transit:', error);
    return NextResponse.json({ error: 'Failed to fetch transit' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await prisma.transit.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: 'Transit not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = updateTransitSchema.parse(body);

    const transit = await prisma.$transaction(async (tx) => {
      const updated = await tx.transit.update({
        where: { id: params.id },
        data: {
          ...(validatedData.companyId !== undefined ? { companyId: validatedData.companyId } : {}),
          ...(validatedData.origin !== undefined ? { origin: validatedData.origin } : {}),
          ...(validatedData.destination !== undefined ? { destination: validatedData.destination } : {}),
          ...(validatedData.status !== undefined ? { status: validatedData.status } : {}),
          ...(validatedData.dispatchDate !== undefined ? { dispatchDate: validatedData.dispatchDate ? new Date(validatedData.dispatchDate) : null } : {}),
          ...(validatedData.estimatedDelivery !== undefined ? { estimatedDelivery: validatedData.estimatedDelivery ? new Date(validatedData.estimatedDelivery) : null } : {}),
          ...(validatedData.actualDelivery !== undefined ? { actualDelivery: validatedData.actualDelivery ? new Date(validatedData.actualDelivery) : null } : {}),
          ...(validatedData.cost !== undefined ? { cost: validatedData.cost } : {}),
          ...(validatedData.notes !== undefined ? { notes: validatedData.notes } : {}),
        },
        include: {
          company: { select: { id: true, name: true, code: true } },
        },
      });

      // If transit is DELIVERED, update all assigned shipments to DELIVERED
      if (validatedData.status === 'DELIVERED') {
        await tx.shipment.updateMany({
          where: { transitId: params.id },
          data: { status: 'DELIVERED' },
        });
      }

      // If transit is CANCELLED, revert shipment statuses
      if (validatedData.status === 'CANCELLED') {
        await tx.shipment.updateMany({
          where: { transitId: params.id },
          data: { status: 'IN_TRANSIT', transitId: null },
        });
      }

      return updated;
    });

    return NextResponse.json({ transit });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 });
    }
    console.error('Error updating transit:', error);
    return NextResponse.json({ error: 'Failed to update transit' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await prisma.transit.findUnique({
      where: { id: params.id },
      include: { _count: { select: { shipments: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Transit not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // Detach shipments before deleting transit
      await tx.shipment.updateMany({
        where: { transitId: params.id },
        data: { transitId: null, status: 'IN_TRANSIT' },
      });

      await tx.transit.delete({ where: { id: params.id } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting transit:', error);
    return NextResponse.json({ error: 'Failed to delete transit' }, { status: 500 });
  }
}
