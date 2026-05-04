import { NextRequest, NextResponse } from 'next/server';
import { ShipmentChargeStatus } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { syncShipmentChargeFromLedgerEntry } from '@/lib/billing/shipment-charges';
import { hasAnyPermission, hasPermission } from '@/lib/rbac';

const mutableStatuses = new Set<ShipmentChargeStatus>(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'DISPUTED']);

async function assertShipmentAccess(shipmentId: string, sessionUserId: string, role: string | undefined) {
  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    select: {
      id: true,
      userId: true,
    },
  });

  if (!shipment) {
    return { error: NextResponse.json({ error: 'Shipment not found' }, { status: 404 }) };
  }

  const canReadAllShipments = hasPermission(role, 'shipments:read_all');
  if (!canReadAllShipments && shipment.userId !== sessionUserId) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { shipment };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const access = await assertShipmentAccess(id, session.user.id, session.user.role);
    if ('error' in access) {
      return access.error;
    }

    const fallbackActorId = session.user.id as string;

    await prisma.$transaction(async (tx) => {
      const ledgerEntries = await tx.ledgerEntry.findMany({
        where: {
          shipmentId: id,
          type: 'DEBIT',
        },
        select: {
          id: true,
          userId: true,
          shipmentId: true,
          description: true,
          type: true,
          amount: true,
          transactionDate: true,
          transactionInfoType: true,
          notes: true,
          metadata: true,
          createdBy: true,
        },
      });

      for (const entry of ledgerEntries) {
        await syncShipmentChargeFromLedgerEntry(tx, {
          entryId: entry.id,
          userId: entry.userId,
          shipmentId: entry.shipmentId,
          description: entry.description,
          type: entry.type,
          amount: entry.amount,
          transactionDate: entry.transactionDate,
          transactionInfoType: entry.transactionInfoType,
          notes: entry.notes,
          metadata: entry.metadata,
          actorId: entry.createdBy || fallbackActorId,
        });
      }
    });

    const charges = await prisma.shipmentCharge.findMany({
      where: {
        shipmentId: id,
      },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
          },
        },
        auditLogs: {
          select: {
            id: true,
            action: true,
            description: true,
            performedBy: true,
            oldValue: true,
            newValue: true,
            metadata: true,
            timestamp: true,
          },
          orderBy: {
            timestamp: 'desc',
          },
        },
      },
      orderBy: [
        { billableAt: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    const actorIds = Array.from(
      new Set(
        charges.flatMap((charge) => charge.auditLogs.map((log) => log.performedBy)).filter(Boolean),
      ),
    );

    const actors = actorIds.length
      ? await prisma.user.findMany({
          where: {
            id: {
              in: actorIds,
            },
          },
          select: {
            id: true,
            name: true,
            email: true,
          },
        })
      : [];

    const actorMap = new Map(
      actors.map((actor) => [actor.id, actor.name?.trim() || actor.email || actor.id]),
    );

    const chargesWithActors = charges.map((charge) => ({
      ...charge,
      auditLogs: charge.auditLogs.map((log) => ({
        ...log,
        actorLabel: actorMap.get(log.performedBy) || log.performedBy,
      })),
    }));

    const summary = chargesWithActors.reduce(
      (accumulator, charge) => {
        accumulator.total += charge.totalAmount;

        if (charge.status === 'PAID') {
          accumulator.paid += charge.totalAmount;
        } else if (charge.status === 'INVOICED') {
          accumulator.invoiced += charge.totalAmount;
        } else if (charge.status === 'APPROVED') {
          accumulator.open += charge.totalAmount;
        }

        accumulator.counts[charge.status] = (accumulator.counts[charge.status] || 0) + 1;
        return accumulator;
      },
      {
        total: 0,
        invoiced: 0,
        paid: 0,
        open: 0,
        counts: {} as Record<string, number>,
      },
    );

    return NextResponse.json({
      charges: chargesWithActors,
      summary,
    });
  } catch (error) {
    console.error('Error fetching shipment charges:', error);
    return NextResponse.json({ error: 'Failed to fetch shipment charges' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasAnyPermission(session.user.role, ['shipments:manage', 'invoices:manage', 'finance:manage'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const access = await assertShipmentAccess(id, session.user.id, session.user.role);
    if ('error' in access) {
      return access.error;
    }

    const body = (await request.json().catch(() => ({}))) as {
      chargeIds?: string[];
      status?: 'APPROVED' | 'DISPUTED';
      note?: string;
    };

    if (!Array.isArray(body.chargeIds) || body.chargeIds.length === 0) {
      return NextResponse.json({ error: 'At least one charge ID is required' }, { status: 400 });
    }

    if (body.status !== 'APPROVED' && body.status !== 'DISPUTED') {
      return NextResponse.json({ error: 'Invalid bulk charge status update' }, { status: 400 });
    }

    const trimmedNote = body.note?.trim();
    const uniqueChargeIds = Array.from(new Set(body.chargeIds));
    const charges = await prisma.shipmentCharge.findMany({
      where: {
        id: { in: uniqueChargeIds },
        shipmentId: id,
      },
      select: {
        id: true,
        status: true,
        description: true,
        invoiceId: true,
      },
    });

    if (charges.length !== uniqueChargeIds.length) {
      return NextResponse.json({ error: 'One or more shipment charges were not found' }, { status: 404 });
    }

    const blockedCharge = charges.find((charge) => charge.invoiceId || !mutableStatuses.has(charge.status));
    if (blockedCharge) {
      return NextResponse.json(
        {
          error: blockedCharge.invoiceId
            ? 'One or more charges are already linked to an invoice.'
            : `Charge cannot be updated while it is ${blockedCharge.status.toLowerCase()}.`,
        },
        { status: 400 },
      );
    }

    const actorId = session.user.id;
    await prisma.$transaction(async (tx) => {
      for (const charge of charges) {
        await tx.shipmentCharge.update({
          where: { id: charge.id },
          data: {
            status: body.status,
            approvedAt: body.status === 'APPROVED' ? new Date() : null,
            approvedBy: body.status === 'APPROVED' ? actorId : null,
            notes: trimmedNote,
          },
        });

        await tx.shipmentChargeAuditLog.create({
          data: {
            chargeId: charge.id,
            action: body.status === 'APPROVED' ? 'BULK_APPROVAL' : 'BULK_DISPUTE',
            description:
              body.status === 'APPROVED'
                ? `Shipment charge approved in bulk: ${charge.description}`
                : `Shipment charge disputed in bulk: ${charge.description}`,
            performedBy: actorId,
            oldValue: charge.status,
            newValue: body.status,
            metadata: {
              mode: 'bulk',
              chargeIds: uniqueChargeIds,
              ...(trimmedNote ? { note: trimmedNote } : {}),
            },
          },
        });
      }
    });

    return NextResponse.json({ success: true, updated: uniqueChargeIds.length });
  } catch (error) {
    console.error('Error bulk updating shipment charges:', error);
    return NextResponse.json({ error: 'Failed to bulk update shipment charges' }, { status: 500 });
  }
}