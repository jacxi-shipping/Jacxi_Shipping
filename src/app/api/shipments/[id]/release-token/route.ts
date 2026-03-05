import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/rbac';

function buildReleaseToken() {
  return `REL-${randomBytes(4).toString('hex').toUpperCase()}-${randomBytes(4).toString('hex').toUpperCase()}`;
}

export async function POST(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user?.role, 'shipments:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const shipment = await prisma.shipment.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        status: true,
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
        { error: 'Release token can be generated only for released shipments' },
        { status: 400 }
      );
    }

    let token = buildReleaseToken();

    for (let i = 0; i < 5; i++) {
      const existingRows = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
        'SELECT COUNT(*)::int AS count FROM "Shipment" WHERE "releaseToken" = $1',
        token
      );

      if ((existingRows?.[0]?.count ?? 0) === 0) {
        break;
      }

      token = buildReleaseToken();
    }

    await prisma.$executeRawUnsafe(
      'UPDATE "Shipment" SET "releaseToken" = $1, "releaseTokenCreatedAt" = $2, "updatedAt" = $3 WHERE "id" = $4',
      token,
      new Date(),
      new Date(),
      shipment.id
    );

    const rows = await prisma.$queryRawUnsafe<
      Array<{ id: string; releaseToken: string | null; releaseTokenCreatedAt: Date | null }>
    >(
      'SELECT "id", "releaseToken", "releaseTokenCreatedAt" FROM "Shipment" WHERE "id" = $1',
      shipment.id
    );

    const updatedShipment = rows[0];

    return NextResponse.json({ shipment: updatedShipment });
  } catch (error) {
    console.error('Error generating release token:', error);
    return NextResponse.json({ error: 'Failed to generate release token' }, { status: 500 });
  }
}
