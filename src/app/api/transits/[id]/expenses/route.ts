import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { recalculateCompanyLedgerBalances } from '@/lib/company-ledger';

const createExpenseSchema = z.object({
  description: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().default('USD'),
  date: z.string().optional(),
  category: z.string().optional(),
  notes: z.string().optional(),
  shipmentId: z.string().optional(),
  // Ledger integration options
  postToCompanyLedger: z.boolean().default(true),
  postToUserLedger: z.boolean().default(false),
  userId: z.string().optional(), // Required if postToUserLedger is true
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

    const expenses = await prisma.transitExpense.findMany({
      where: { transitId: params.id },
      include: {
        shipment: { select: { id: true, vehicleMake: true, vehicleModel: true, vehicleVIN: true } },
      },
      orderBy: { date: 'desc' },
    });

    const total = expenses.reduce((sum, e) => sum + e.amount, 0);

    return NextResponse.json({ expenses, total });
  } catch (error) {
    console.error('Error fetching transit expenses:', error);
    return NextResponse.json({ error: 'Failed to fetch transit expenses' }, { status: 500 });
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

    const transit = await prisma.transit.findUnique({
      where: { id: params.id },
      include: { company: { select: { id: true, name: true } } },
    });

    if (!transit) {
      return NextResponse.json({ error: 'Transit not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = createExpenseSchema.parse(body);

    if (validatedData.postToUserLedger && !validatedData.userId) {
      return NextResponse.json(
        { error: 'userId is required when postToUserLedger is true' },
        { status: 400 }
      );
    }

    // Verify shipment belongs to this transit if provided
    if (validatedData.shipmentId) {
      const shipment = await prisma.shipment.findUnique({ where: { id: validatedData.shipmentId } });
      if (!shipment || shipment.transitId !== params.id) {
        return NextResponse.json({ error: 'Shipment not found in this transit' }, { status: 404 });
      }
    }

    const expenseDate = validatedData.date ? new Date(validatedData.date) : new Date();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create transit expense record
      const expense = await tx.transitExpense.create({
        data: {
          transitId: params.id,
          shipmentId: validatedData.shipmentId ?? null,
          description: validatedData.description,
          amount: validatedData.amount,
          currency: validatedData.currency,
          date: expenseDate,
          category: validatedData.category ?? null,
          notes: validatedData.notes ?? null,
          createdBy: session.user!.id as string,
        },
      });

      // 2. Post DEBIT to company ledger (transit company is owed money)
      if (validatedData.postToCompanyLedger) {
        const companyEntryData: Prisma.CompanyLedgerEntryCreateInput = {
          company: { connect: { id: transit.companyId } },
          description: `Transit expense: ${validatedData.description} (Ref: ${transit.referenceNumber})`,
          type: 'DEBIT',
          amount: validatedData.amount,
          balance: 0, // Will be recalculated
          transactionDate: expenseDate,
          category: validatedData.category ?? 'Transit',
          reference: transit.referenceNumber,
          notes: validatedData.notes ?? null,
          createdBy: session.user!.id as string,
        };
        await tx.companyLedgerEntry.create({ data: companyEntryData });
        await recalculateCompanyLedgerBalances(tx, transit.companyId);
      }

      // 3. Post DEBIT to user ledger (charge the customer)
      if (validatedData.postToUserLedger && validatedData.userId) {
        // Get current user balance
        const latestEntry = await tx.ledgerEntry.findFirst({
          where: { userId: validatedData.userId },
          orderBy: { transactionDate: 'desc' },
          select: { balance: true },
        });
        const currentBalance = latestEntry?.balance ?? 0;
        const newBalance = currentBalance + validatedData.amount;

        await tx.ledgerEntry.create({
          data: {
            userId: validatedData.userId,
            shipmentId: validatedData.shipmentId ?? null,
            description: `Transit charge: ${validatedData.description} (${transit.referenceNumber})`,
            type: 'DEBIT',
            amount: validatedData.amount,
            balance: newBalance,
            createdBy: session.user!.id as string,
            notes: validatedData.notes ?? null,
            metadata: {
              transitId: params.id,
              transitRef: transit.referenceNumber,
              expenseId: expense.id,
            } as Prisma.InputJsonValue,
          },
        });
      }

      return expense;
    });

    return NextResponse.json({ expense: result }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 });
    }
    console.error('Error creating transit expense:', error);
    return NextResponse.json({ error: 'Failed to create transit expense' }, { status: 500 });
  }
}
