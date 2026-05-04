import { NextRequest, NextResponse } from 'next/server';
import { ShipmentChargeStatus } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasAnyPermission, hasPermission } from '@/lib/rbac';

const mutableStatuses = new Set<ShipmentChargeStatus>(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'DISPUTED']);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; chargeId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const actorId = session.user.id;

    if (!hasAnyPermission(session.user.role, ['shipments:manage', 'invoices:manage', 'finance:manage'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id, chargeId } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      status?: 'APPROVED' | 'DISPUTED';
      note?: string;
    };

    if (body.status !== 'APPROVED' && body.status !== 'DISPUTED') {
      return NextResponse.json({ error: 'Invalid charge status update' }, { status: 400 });
    }

    const charge = await prisma.shipmentCharge.findFirst({
      where: {
        id: chargeId,
        shipmentId: id,
      },
      select: {
        id: true,
        shipmentId: true,
        status: true,
        description: true,
        invoiceId: true,
      },
    });

    if (!charge) {
      return NextResponse.json({ error: 'Shipment charge not found' }, { status: 404 });
    }

    const canReadAllShipments = hasPermission(session.user.role, 'shipments:read_all');
    if (!canReadAllShipments) {
      const shipment = await prisma.shipment.findUnique({
        where: { id },
        select: { userId: true },
      });

      if (shipment?.userId === session.user.id && !hasPermission(session.user.role, 'shipments:manage')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    if (!mutableStatuses.has(charge.status)) {
      return NextResponse.json(
        { error: `Charge cannot be updated while it is ${charge.status.toLowerCase()}.` },
        { status: 400 },
      );
    }

    if (charge.invoiceId) {
      return NextResponse.json({ error: 'Charge is already linked to an invoice.' }, { status: 400 });
    }

    const updatedCharge = await prisma.$transaction(async (tx) => {
      const nextCharge = await tx.shipmentCharge.update({
        where: { id: charge.id },
        data: {
          status: body.status,
          approvedAt: body.status === 'APPROVED' ? new Date() : null,
          approvedBy: body.status === 'APPROVED' ? session.user.id : null,
          notes: body.note ? body.note.trim() : undefined,
        },
      });

      await tx.shipmentChargeAuditLog.create({
        data: {
          chargeId: charge.id,
          action: body.status === 'APPROVED' ? 'MANUAL_APPROVAL' : 'MANUAL_DISPUTE',
          description:
            body.status === 'APPROVED'
              ? `Shipment charge approved: ${charge.description}`
              : `Shipment charge disputed: ${charge.description}`,
          performedBy: actorId,
          oldValue: charge.status,
          newValue: body.status,
          metadata: body.note ? { note: body.note.trim() } : undefined,
        },
      });

      return nextCharge;
    });

    return NextResponse.json({ charge: updatedCharge });
  } catch (error) {
    console.error('Error updating shipment charge status:', error);
    return NextResponse.json({ error: 'Failed to update shipment charge' }, { status: 500 });
  }
}