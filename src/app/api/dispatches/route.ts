import { NextRequest, NextResponse } from 'next/server';
import { DispatchStatus } from '@prisma/client';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/rbac';

const createDispatchSchema = z.object({
  companyId: z.string().min(1),
  origin: z.string().min(1).default('USA Yard'),
  destination: z.string().min(1).default('Port of Loading'),
  dispatchDate: z.string().optional(),
  estimatedArrival: z.string().optional(),
  cost: z.number().positive().optional(),
  notes: z.string().optional(),
  shipmentIds: z.array(z.string()).optional(),
});

function generateReferenceNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `DSP-${year}-${random}`;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user?.role, 'dispatches:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const companyId = searchParams.get('companyId');
    const search = searchParams.get('search') || '';

    const where: {
      status?: DispatchStatus;
      companyId?: string;
      OR?: Array<{ referenceNumber?: { contains: string; mode: 'insensitive' }; notes?: { contains: string; mode: 'insensitive' } }>;
    } = {};

    if (status && Object.values(DispatchStatus).includes(status as DispatchStatus)) {
      where.status = status as DispatchStatus;
    }

    if (companyId) {
      where.companyId = companyId;
    }

    if (search) {
      where.OR = [
        { referenceNumber: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    const dispatches = await prisma.dispatch.findMany({
      where,
      include: {
        company: { select: { id: true, name: true, code: true } },
        _count: { select: { shipments: true, events: true, expenses: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ dispatches });
  } catch (error) {
    console.error('Error fetching dispatches:', error);
    return NextResponse.json({ error: 'Failed to fetch dispatches' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user?.role, 'dispatches:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createDispatchSchema.parse(body);

    const company = await prisma.company.findUnique({
      where: { id: validatedData.companyId },
      select: { id: true, isActive: true, companyType: true },
    });

    if (!company || !company.isActive || company.companyType !== 'DISPATCH') {
      return NextResponse.json({ error: 'Dispatch company not found' }, { status: 404 });
    }

    if (validatedData.shipmentIds?.length) {
      const shipments = await prisma.shipment.findMany({
        where: { id: { in: validatedData.shipmentIds } },
        select: { id: true, status: true, dispatchId: true, containerId: true, transitId: true },
      });

      if (shipments.length !== validatedData.shipmentIds.length) {
        return NextResponse.json({ error: 'One or more shipments not found' }, { status: 404 });
      }

      const invalidShipment = shipments.find(
        (shipment) =>
          shipment.status !== 'ON_HAND' ||
          shipment.dispatchId ||
          shipment.containerId ||
          shipment.transitId,
      );

      if (invalidShipment) {
        return NextResponse.json(
          { error: 'Only unassigned ON_HAND shipments can be assigned to dispatch' },
          { status: 400 },
        );
      }
    }

    let referenceNumber = generateReferenceNumber();
    let attempts = 0;
    while (attempts < 5) {
      const existing = await prisma.dispatch.findUnique({ where: { referenceNumber } });
      if (!existing) break;
      referenceNumber = generateReferenceNumber();
      attempts++;
    }

    if (attempts >= 5) {
      return NextResponse.json({ error: 'Could not generate a unique dispatch reference number' }, { status: 500 });
    }

    const dispatch = await prisma.$transaction(async (tx) => {
      const created = await tx.dispatch.create({
        data: {
          referenceNumber,
          companyId: validatedData.companyId,
          origin: validatedData.origin,
          destination: validatedData.destination,
          dispatchDate: validatedData.dispatchDate ? new Date(validatedData.dispatchDate) : null,
          estimatedArrival: validatedData.estimatedArrival ? new Date(validatedData.estimatedArrival) : null,
          cost: validatedData.cost ?? null,
          notes: validatedData.notes ?? null,
          createdBy: session.user.id as string,
        },
        include: {
          company: { select: { id: true, name: true, code: true } },
        },
      });

      if (validatedData.shipmentIds?.length) {
        await tx.shipment.updateMany({
          where: { id: { in: validatedData.shipmentIds } },
          data: { dispatchId: created.id, status: 'DISPATCHING' },
        });
      }

      return created;
    });

    return NextResponse.json({ dispatch }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 });
    }

    console.error('Error creating dispatch:', error);
    return NextResponse.json({ error: 'Failed to create dispatch' }, { status: 500 });
  }
}