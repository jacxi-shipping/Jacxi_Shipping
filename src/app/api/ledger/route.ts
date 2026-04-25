import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { createAuditLog } from '@/lib/audit';
import { hasPermission } from '@/lib/rbac';

const transactionInfoTypeSchema = z.enum(['CAR_PAYMENT', 'SHIPPING_PAYMENT', 'STORAGE_PAYMENT']);
const transactionInfoTypes = ['CAR_PAYMENT', 'SHIPPING_PAYMENT', 'STORAGE_PAYMENT'] as const;

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

    // Non-admin customers never see pending invoice entries — those only appear once the
    // invoice is paid and the entries are activated (pendingInvoice flag removed/set to false).
    // Admins see all entries so they know what is staged for invoicing.
    const pendingFilter = !isAdmin
      ? {
          NOT: {
            metadata: {
              path: ['pendingInvoice'],
              equals: true,
            },
          },
        }
      : {};

    // Build where clause
    const where: Record<string, unknown> = {
      userId: targetUserId,
      ...pendingFilter,
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

    // ⚡ Bolt: Consolidated separate debit and credit aggregate queries into a single groupBy query
    // Execute database queries in parallel for performance
    // Summary queries exclude pendingInvoice entries — those only affect balance when invoice is paid.
    const pendingExcludeFilter = {
      NOT: {
        metadata: {
          path: ['pendingInvoice'],
          equals: true,
        },
      },
    } as const;

    const summaryWhere = { ...where, ...pendingExcludeFilter };

    const [totalCount, entries, groupedSums, transactionInfoGroupedSums, latestEntry] = await Promise.all([
      // Get total count
      prisma.ledgerEntry.count({ where }),

      // Fetch ledger entries (show ALL including pending — they appear with a badge in the UI)
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
        skip: (page - 1) * limit,
        take: limit,
      }),

      // Calculate debit and credit summaries — exclude pending entries
      prisma.ledgerEntry.groupBy({
        by: ['type'],
        where: { ...summaryWhere, type: { in: ['DEBIT', 'CREDIT'] } },
        _sum: {
          amount: true,
        },
      }),

      prisma.ledgerEntry.groupBy({
        by: ['transactionInfoType', 'type'],
        where: {
          ...summaryWhere,
          transactionInfoType: { in: [...transactionInfoTypes] },
          type: { in: ['DEBIT', 'CREDIT'] },
        },
        _sum: {
          amount: true,
        },
      }),

      // Get current balance (latest entry's balance — recalculate skips pending entries
      // so this reflects the true effective balance even if the latest entry is pending)
      prisma.ledgerEntry.findFirst({
        where: { userId: targetUserId },
        orderBy: { transactionDate: 'desc' },
        select: { balance: true },
      }),
    ]);

    return NextResponse.json({
      entries,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      summary: {
        totalDebit: groupedSums.find(g => g.type === 'DEBIT')?._sum.amount || 0,
        totalCredit: groupedSums.find(g => g.type === 'CREDIT')?._sum.amount || 0,
        currentBalance: latestEntry?.balance || 0,
        transactionInfoBreakdown: transactionInfoTypes.reduce<Record<string, { totalDebit: number; totalCredit: number; balance: number }>>((accumulator, currentType) => {
          const typeRows = transactionInfoGroupedSums.filter((row) => row.transactionInfoType === currentType);
          const totalDebit = typeRows.find((row) => row.type === 'DEBIT')?._sum.amount || 0;
          const totalCredit = typeRows.find((row) => row.type === 'CREDIT')?._sum.amount || 0;

          accumulator[currentType] = {
            totalDebit,
            totalCredit,
            balance: totalDebit - totalCredit,
          };

          return accumulator;
        }, {}),
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
