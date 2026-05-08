import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { routeDeps } from '@/lib/route-deps';
import { canManagePartnerPortals } from '@/lib/partner-portals';

const createPortalSchema = z.object({
  name: z.string().trim().min(1),
  code: z.string().trim().min(2).max(50).optional(),
  notes: z.string().trim().max(1000).optional(),
  ownerUserId: z.string().trim().min(1),
});

export async function GET() {
  try {
    const session = await routeDeps.auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const portals = canManagePartnerPortals(session.user.role)
      ? await routeDeps.prisma.partnerPortal.findMany({
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: {
                memberships: true,
                customers: true,
                shipmentAssignments: true,
              },
            },
          },
        })
      : await routeDeps.prisma.partnerPortal.findMany({
          where: {
            memberships: {
              some: {
                userId: session.user.id,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          include: {
            memberships: {
              where: { userId: session.user.id },
              select: { role: true },
              take: 1,
            },
            _count: {
              select: {
                customers: true,
                shipmentAssignments: true,
              },
            },
          },
        });

    return NextResponse.json({ portals });
  } catch (error) {
    routeDeps.logger.error('Failed to fetch partner portals', error);
    return NextResponse.json({ error: 'Failed to fetch partner portals' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await routeDeps.auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canManagePartnerPortals(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const payload = createPortalSchema.parse(await request.json());

    const owner = await routeDeps.prisma.user.findUnique({
      where: { id: payload.ownerUserId },
      select: { id: true },
    });

    if (!owner) {
      return NextResponse.json({ error: 'Owner user not found' }, { status: 404 });
    }

    const portal = await routeDeps.prisma.partnerPortal.create({
      data: {
        name: payload.name,
        ...(payload.code ? { code: payload.code } : {}),
        ...(payload.notes ? { notes: payload.notes } : {}),
        createdBy: session.user.id,
        memberships: {
          create: {
            userId: payload.ownerUserId,
            role: 'ADMIN',
            createdBy: session.user.id,
          },
        },
      },
      include: {
        memberships: {
          select: {
            id: true,
            userId: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({ portal }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.issues }, { status: 400 });
    }

    routeDeps.logger.error('Failed to create partner portal', error);
    return NextResponse.json({ error: 'Failed to create partner portal' }, { status: 500 });
  }
}