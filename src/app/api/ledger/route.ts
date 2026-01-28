import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { createAuditLog } from '@/lib/audit';

// Schema for creating a ledger entry
const createLedgerEntrySchema = z.object({
  userId: z.string(),
  shipmentId: z.string().optional(),
  description: z.string().min(1),
  type: z.enum(['DEBIT', 'CREDIT']),
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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search');

    // Non-admin users can only view their own ledger
    const isAdmin = session.user.role === 'admin';
    const targetUserId = isAdmin && userId ? userId : session.user.id;

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

    // Get total count
    const totalCount = await prisma.ledgerEntry.count({ where });

    // Fetch ledger entries
    const entries = await prisma.ledgerEntry.findMany({
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
    });

    // Calculate summary
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const summary = await prisma.ledgerEntry.aggregate({
      where,
      _sum: {
        amount: true,
      },
    });

    const debitSum = await prisma.ledgerEntry.aggregate({
      where: { ...where, type: 'DEBIT' },
      _sum: {
        amount: true,
      },
    });

    const creditSum = await prisma.ledgerEntry.aggregate({
      where: { ...where, type: 'CREDIT' },
      _sum: {
        amount: true,
      },
    });

    // Get current balance (latest entry's balance)
    const latestEntry = await prisma.ledgerEntry.findFirst({
      where: { userId: targetUserId },
      orderBy: { transactionDate: 'desc' },
      select: { balance: true },
    });

    return NextResponse.json({
      entries,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      summary: {
        totalDebit: debitSum._sum.amount || 0,
        totalCredit: creditSum._sum.amount || 0,
        currentBalance: latestEntry?.balance || 0,
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

    // Only admins can create ledger entries
    if (session.user.role !== 'admin') {
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
