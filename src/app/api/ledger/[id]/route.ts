import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { recalculateCompanyLedgerBalances } from '@/lib/company-ledger';
import { recalculateUserLedgerBalances } from '@/lib/user-ledger';
import { z } from 'zod';
import { hasPermission } from '@/lib/rbac';

// Schema for updating a ledger entry
const updateLedgerEntrySchema = z.object({
  description: z.string().min(1).optional(),
  notes: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// GET - Fetch a single ledger entry
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

    const entry = await prisma.ledgerEntry.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        shipment: {
          select: {
            id: true,
            vehicleMake: true,
            vehicleModel: true,
            price: true,
            paymentStatus: true,
          },
        },
      },
    });

    if (!entry) {
      return NextResponse.json({ error: 'Ledger entry not found' }, { status: 404 });
    }

    // Users without finance permissions can only view their own entries
    if (!hasPermission(session.user.role, 'finance:manage') && entry.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ entry });
  } catch (error) {
    console.error('Error fetching ledger entry:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ledger entry' },
      { status: 500 }
    );
  }
}

// PATCH - Update a ledger entry (only description, notes, metadata)
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

    // Only users with finance:manage can update ledger entries
    if (!hasPermission(session.user.role, 'finance:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const entry = await prisma.ledgerEntry.findUnique({
      where: { id: params.id },
    });

    if (!entry) {
      return NextResponse.json({ error: 'Ledger entry not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = updateLedgerEntrySchema.parse(body);

    // Update only non-financial fields
    const updatedEntry = await prisma.ledgerEntry.update({
      where: { id: params.id },
      data: {
        description: validatedData.description,
        notes: validatedData.notes,
        metadata: validatedData.metadata as never,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        shipment: {
          select: {
            id: true,
            vehicleMake: true,
            vehicleModel: true,
          },
        },
      },
    });

    return NextResponse.json({ entry: updatedEntry });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error updating ledger entry:', error);
    return NextResponse.json(
      { error: 'Failed to update ledger entry' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a ledger entry (admin only, with balance recalculation)
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

    // Only users with finance:manage can delete ledger entries
    if (!hasPermission(session.user.role, 'finance:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const entry = await prisma.ledgerEntry.findUnique({
      where: { id: params.id },
    });

    if (!entry) {
      return NextResponse.json({ error: 'Ledger entry not found' }, { status: 404 });
    }

    const entryMetadata =
      entry.metadata && typeof entry.metadata === 'object' && !Array.isArray(entry.metadata)
        ? (entry.metadata as Record<string, unknown>)
        : null;

    const metadataShipmentIds = Array.isArray(entryMetadata?.shipmentIds)
      ? entryMetadata.shipmentIds.filter((shipmentId): shipmentId is string => typeof shipmentId === 'string')
      : [];

    // Use transaction to ensure payment-related user/company ledger entries are deleted atomically
    await prisma.$transaction(async (tx) => {
      const affectedShipmentIds = new Set<string>([
        ...(entry.shipmentId ? [entry.shipmentId] : []),
        ...metadataShipmentIds,
      ]);

      const childPaymentEntries = await tx.ledgerEntry.findMany({
        where: {
          metadata: {
            path: ['parentEntryId'],
            equals: params.id,
          },
        },
        select: {
          id: true,
          shipmentId: true,
        },
      });

      for (const childEntry of childPaymentEntries) {
        if (childEntry.shipmentId) {
          affectedShipmentIds.add(childEntry.shipmentId);
        }
      }

      // Find and delete the corresponding company ledger entry (if it exists)
      // Company ledger entries created from expenses have reference: "shipment-expense:{ledgerEntryId}"
      const companyLedgerReference = `shipment-expense:${params.id}`;
      const companyLedgerEntry = await tx.companyLedgerEntry.findFirst({
        where: { reference: companyLedgerReference },
      });

      if (companyLedgerEntry) {
        await tx.companyLedgerEntry.delete({
          where: { id: companyLedgerEntry.id },
        });

        // Recalculate company ledger balances
        await recalculateCompanyLedgerBalances(tx, companyLedgerEntry.companyId);
      }

      if (childPaymentEntries.length > 0) {
        await tx.ledgerEntry.deleteMany({
          where: {
            id: {
              in: childPaymentEntries.map((childEntry) => childEntry.id),
            },
          },
        });
      }

      // Delete the target user ledger entry
      await tx.ledgerEntry.delete({
        where: { id: params.id },
      });

      await recalculateUserLedgerBalances(tx, entry.userId);

      if (affectedShipmentIds.size > 0) {
        const shipmentLedgerSums = await tx.ledgerEntry.groupBy({
          by: ['shipmentId', 'type'],
          where: {
            shipmentId: {
              in: Array.from(affectedShipmentIds),
            },
          },
          _sum: {
            amount: true,
          },
        });

        const shipmentBalanceMap: Record<string, { totalDebit: number; totalCredit: number }> = {};

        for (const ledgerSum of shipmentLedgerSums) {
          if (!ledgerSum.shipmentId) {
            continue;
          }

          if (!shipmentBalanceMap[ledgerSum.shipmentId]) {
            shipmentBalanceMap[ledgerSum.shipmentId] = { totalDebit: 0, totalCredit: 0 };
          }

          if (ledgerSum.type === 'DEBIT') {
            shipmentBalanceMap[ledgerSum.shipmentId].totalDebit += ledgerSum._sum.amount || 0;
          } else if (ledgerSum.type === 'CREDIT') {
            shipmentBalanceMap[ledgerSum.shipmentId].totalCredit += ledgerSum._sum.amount || 0;
          }
        }

        const completedShipmentIds: string[] = [];
        const pendingShipmentIds: string[] = [];

        for (const shipmentId of affectedShipmentIds) {
          const shipmentTotals = shipmentBalanceMap[shipmentId] || { totalDebit: 0, totalCredit: 0 };
          const amountDue = Math.max(0, shipmentTotals.totalDebit - shipmentTotals.totalCredit);

          if (shipmentTotals.totalDebit > 0 && amountDue === 0) {
            completedShipmentIds.push(shipmentId);
          } else {
            pendingShipmentIds.push(shipmentId);
          }
        }

        if (completedShipmentIds.length > 0) {
          await tx.shipment.updateMany({
            where: { id: { in: completedShipmentIds } },
            data: { paymentStatus: 'COMPLETED' },
          });
        }

        if (pendingShipmentIds.length > 0) {
          await tx.shipment.updateMany({
            where: { id: { in: pendingShipmentIds } },
            data: { paymentStatus: 'PENDING' },
          });
        }
      }
    });

    return NextResponse.json({ message: 'Ledger entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting ledger entry:', error);
    return NextResponse.json(
      { error: 'Failed to delete ledger entry' },
      { status: 500 }
    );
  }
}
