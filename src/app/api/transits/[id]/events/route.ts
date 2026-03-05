import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

const createEventSchema = z.object({
  status: z.string().min(1),
  location: z.string().optional(),
  description: z.string().optional(),
  eventDate: z.string().optional(),
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

    const transit = await prisma.transit.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!transit) {
      return NextResponse.json({ error: 'Transit not found' }, { status: 404 });
    }

    const events = await prisma.transitEvent.findMany({
      where: { transitId: params.id },
      orderBy: { eventDate: 'desc' },
    });

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Error fetching transit events:', error);
    return NextResponse.json({ error: 'Failed to fetch transit events' }, { status: 500 });
  }
}

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

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const transit = await prisma.transit.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!transit) {
      return NextResponse.json({ error: 'Transit not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = createEventSchema.parse(body);

    const event = await prisma.transitEvent.create({
      data: {
        transitId: params.id,
        status: validatedData.status,
        location: validatedData.location ?? null,
        description: validatedData.description ?? null,
        eventDate: validatedData.eventDate ? new Date(validatedData.eventDate) : new Date(),
        createdBy: session.user!.id as string,
      },
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 });
    }
    console.error('Error creating transit event:', error);
    return NextResponse.json({ error: 'Failed to create transit event' }, { status: 500 });
  }
}
