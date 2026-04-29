import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { createAuditLog } from '@/lib/audit';
import { hasPermission } from '@/lib/rbac';
import { recalculateUserLedgerBalances } from '@/lib/user-ledger';

const transactionInfoTypeSchema = z.enum(['CAR_PAYMENT', 'SHIPPING_PAYMENT', 'STORAGE_PAYMENT']);
const transactionInfoTypes = ['CAR_PAYMENT', 'SHIPPING_PAYMENT', 'STORAGE_PAYMENT'] as const;

function isPaymentAllocationEntry(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object') return false;
  return (metadata as Record<string, unknown>).isPaymentAllocation === true;
}

function isPendingInvoiceEntry(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object') return false;
  return (metadata as Record<string, unknown>).pendingInvoice === true;
}

// Schema for creating a ledger entry
const createLedgerEntrySchema = z.object({
  userId: z.string(),
  shipmentId: z.string().optional(),
  description: z.string().min(1),
  type: z.enum(['DEBIT', 'CREDIT']),
  transactionInfoType: transactionInfoTypeSchema.optional(),
  amount: z.number().positive(),
  notes: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// GET - Fetch ledger entries with filters
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const shipmentId = searchParams.get('shipmentId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const type = searchParams.get('type');
    const transactionInfoType = searchParams.get('transactionInfoType');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search');

    // Users without finance:manage can only view their own ledger
    const isAdmin = hasPermission(session.user.role, 'finance:manage');
    const targetUserId = isAdmin && userId ? userId : session.user.id;

    if (targetUserId) {
      await recalculateUserLedgerBalances(prisma, targetUserId);
    }

    // Build where clause
    const where: Record<string, unknown> = {
      userId: targetUserId,
    };

    if (shipmentId) {
      where.shipmentId = shipmentId;
    }

    if (type && (type === 'DEBIT' || type === 'CREDIT')) {
      where.type = type;
    }

    if (transactionInfoType && transactionInfoTypeSchema.safeParse(transactionInfoType).success) {
      where.transactionInfoType = transactionInfoType;
    }

    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) {
        (where.transactionDate as Record<string, unknown>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.transactionDate as Record<string, unknown>).lte = new Date(endDate);
      }
    }

    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [allEntries, latestEntry] = await Promise.all([
      prisma.ledgerEntry.findMany({
        where,
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
              vehicleVIN: true,
              vehicleMake: true,
              vehicleModel: true,
              price: true,
              paymentStatus: true,
            },
          },
        },
        orderBy: {
          transactionDate: 'desc',
        },
      }),

      prisma.ledgerEntry.findFirst({
        where: { userId: targetUserId },
        orderBy: { transactionDate: 'desc' },
        select: { balance: true },
      }),
    ]);

    // Prisma JSON path filtering is unreliable for this dataset when metadata is null/missing.
    // Filter flags in application code to keep ledger visibility deterministic.
    const visibleEntries = allEntries.filter((entry) => {
      const isPaymentAllocation = isPaymentAllocationEntry(entry.metadata);
      if (isPaymentAllocation) return false;

      return true;
    });

    const totalCount = visibleEntries.length;
    const pagedEntries = visibleEntries.slice((page - 1) * limit, page * limit);

    // Summary follows the same balance semantics as the running ledger: shipment expenses
    // affect balances immediately, while payment allocation helper rows stay hidden.
    const summaryEntries = visibleEntries;

    const summary = summaryEntries.reduce(
      (accumulator, entry) => {
        if (entry.type === 'DEBIT') {
          accumulator.totalDebit += entry.amount;
        } else if (entry.type === 'CREDIT') {
          accumulator.totalCredit += entry.amount;
        }

        if (
          entry.transactionInfoType &&
          (entry.transactionInfoType === 'CAR_PAYMENT' ||
            entry.transactionInfoType === 'SHIPPING_PAYMENT' ||
            entry.transactionInfoType === 'STORAGE_PAYMENT')
        ) {
          const breakdown = accumulator.transactionInfoBreakdown[entry.transactionInfoType];
          if (entry.type === 'DEBIT') {
            breakdown.totalDebit += entry.amount;
          } else if (entry.type === 'CREDIT') {
            breakdown.totalCredit += entry.amount;
          }
          breakdown.balance = breakdown.totalDebit - breakdown.totalCredit;
        }

        return accumulator;
      },
      {
        totalDebit: 0,
        totalCredit: 0,
        transactionInfoBreakdown: transactionInfoTypes.reduce<Record<string, { totalDebit: number; totalCredit: number; balance: number }>>((accumulator, currentType) => {
          accumulator[currentType] = {
            totalDebit: 0,
            totalCredit: 0,
            balance: 0,
          };
          return accumulator;
        }, {}),
      }
    );

    return NextResponse.json({
      entries: pagedEntries,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      summary: {
        totalDebit: summary.totalDebit,
        totalCredit: summary.totalCredit,
        currentBalance: latestEntry?.balance || 0,
        transactionInfoBreakdown: summary.transactionInfoBreakdown,
      },
    });
  } catch (error) {
    console.error('Error fetching ledger entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ledger entries' },
      { status: 500 }
    );
  }
}

// POST - Create a new ledger entry
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only users with finance:manage can create ledger entries
    if (!hasPermission(session.user.role, 'finance:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createLedgerEntrySchema.parse(body);

    // Get the current balance for the user
    const latestEntry = await prisma.ledgerEntry.findFirst({
      where: { userId: validatedData.userId },
      orderBy: { transactionDate: 'desc' },
      select: { balance: true },
    });

    const currentBalance = latestEntry?.balance || 0;

    // Balance check: for manual DEBIT transactions (no transactionInfoType = system-generated),
    // the customer must have enough credit in their account.
    if (validatedData.type === 'DEBIT' && !validatedData.transactionInfoType) {
      const availableCredit = currentBalance < 0 ? -currentBalance : 0;
      if (validatedData.amount > availableCredit) {
        return NextResponse.json(
          { error: `Insufficient balance. Customer has $${availableCredit.toFixed(2)} available. Ask the customer to deposit more credit first.` },
          { status: 400 }
        );
      }
    }

    // Calculate new balance
    let newBalance = currentBalance;
    if (validatedData.type === 'DEBIT') {
      newBalance += validatedData.amount;
    } else {
      newBalance -= validatedData.amount;
    }

    // Create ledger entry
    const entry = await prisma.ledgerEntry.create({
      data: {
        userId: validatedData.userId,
        shipmentId: validatedData.shipmentId,
        description: validatedData.description,
        type: validatedData.type,
        transactionInfoType: validatedData.transactionInfoType,
        amount: validatedData.amount,
        balance: newBalance,
        createdBy: session.user.id as string,
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
            vehicleVIN: true,
            vehicleMake: true,
            vehicleModel: true,
          },
        },
      },
    });

    // Create audit log
    await createAuditLog(
      'LedgerEntry',
      entry.id,
      'CREATE',
      session.user.id as string,
      { entry },
      request
    );

    // If this is a credit entry linked to a shipment, check if it's fully paid
    if (validatedData.shipmentId && validatedData.type === 'CREDIT') {
      const shipment = await prisma.shipment.findUnique({
        where: { id: validatedData.shipmentId },
        select: { id: true, price: true },
      });

      if (shipment && shipment.price) {
        // Get total debits and credits for this shipment
        const shipmentLedger = await prisma.ledgerEntry.groupBy({
          by: ['type'],
          where: { shipmentId: validatedData.shipmentId },
          _sum: {
            amount: true,
          },
        });

        const totalDebit = shipmentLedger.find(e => e.type === 'DEBIT')?._sum.amount || 0;
        const totalCredit = shipmentLedger.find(e => e.type === 'CREDIT')?._sum.amount || 0;

        // Update shipment payment status
        if (totalCredit >= totalDebit) {
          await prisma.shipment.update({
            where: { id: validatedData.shipmentId },
            data: { paymentStatus: 'COMPLETED' },
          });
        }
      }
    }

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error creating ledger entry:', error);
    return NextResponse.json(
      { error: 'Failed to create ledger entry' },
      { status: 500 }
    );
  }
}
