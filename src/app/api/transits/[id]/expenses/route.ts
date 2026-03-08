import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { recalculateCompanyLedgerBalances } from '@/lib/company-ledger';
import { recalculateUserLedgerBalances } from '@/lib/user-ledger';
import { hasAnyPermission } from '@/lib/rbac';

function allocateTransitExpense(
  shipments: Array<{ id: string; insuranceValue: number | null; weight: number | null }>,
  totalAmount: number
) {
  if (shipments.length === 0) {
    return [] as Array<{ shipmentId: string; amount: number }>;
  }

  // Equal split across all shipments in the transit
  const base = Math.floor((totalAmount / shipments.length) * 100) / 100;
  const allocations = shipments.map((shipment) => ({ shipmentId: shipment.id, amount: base }));
  const assigned = allocations.reduce((sum, item) => sum + item.amount, 0);
  const remainder = Number((totalAmount - assigned).toFixed(2));
  allocations[0].amount = Number((allocations[0].amount + remainder).toFixed(2));
  return allocations;
}

const expenseSchema = z.object({
  type: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().default('USD'),
  date: z.string().optional(),
  vendor: z.string().optional(),
  invoiceNumber: z.string().optional(),
  notes: z.string().optional(),
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

    if (!hasAnyPermission(session.user?.role, ['finance:view', 'transits:manage'])) {
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

    if (!hasAnyPermission(session.user?.role, ['finance:manage', 'transits:manage'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch transit with company and all shipments for allocation
    const transit = await prisma.transit.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        companyId: true,
        referenceNumber: true,
        shipments: {
          select: {
            id: true,
            userId: true,
            insuranceValue: true,
            weight: true,
            vehicleYear: true,
            vehicleMake: true,
            vehicleModel: true,
            vehicleVIN: true,
          },
        },
      },
    });

    if (!transit) {
      return NextResponse.json({ error: 'Transit not found' }, { status: 404 });
    }

    if (!transit.companyId) {
      return NextResponse.json(
        { error: 'Assign a company to this transit before adding expenses' },
        { status: 400 }
      );
    }

    if (transit.shipments.length === 0) {
      return NextResponse.json(
        { error: 'Add at least one shipment to the transit before posting expenses' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = expenseSchema.parse(body);

    const allocations = allocateTransitExpense(
      transit.shipments.map((s) => ({
        id: s.id,
        insuranceValue: s.insuranceValue,
        weight: s.weight,
      })),
      validatedData.amount
    );

    const expenseDate = validatedData.date ? new Date(validatedData.date) : new Date();

    const expense = await prisma.$transaction(async (tx) => {
      // 1. Create transit expense record
      const createdExpense = await tx.transitExpense.create({
        data: {
          transitId: params.id,
          type: validatedData.type,
          description: `Transit expense - ${validatedData.type}`,
          amount: validatedData.amount,
          currency: validatedData.currency,
          date: expenseDate,
          vendor: validatedData.vendor ?? null,
          invoiceNumber: validatedData.invoiceNumber ?? null,
          category: validatedData.type,
          notes: validatedData.notes ?? null,
          createdBy: session.user!.id as string,
        },
      });

      const reference = `transit-expense:${createdExpense.id}`;

      // 2. CREDIT transit company ledger (company is owed this money)
      await tx.companyLedgerEntry.create({
        data: {
          companyId: transit.companyId as string,
          description: `Transit expense recovery - ${validatedData.type} (${transit.referenceNumber})`,
          type: 'CREDIT',
          amount: validatedData.amount,
          balance: 0,
          transactionDate: expenseDate,
          category: 'Transit Expense Recovery',
          reference,
          notes: validatedData.notes ?? null,
          createdBy: session.user!.id as string,
          metadata: {
            isTransitExpense: true,
            transitExpenseId: createdExpense.id,
            transitId: params.id,
            transitRef: transit.referenceNumber,
          },
        },
      });

      // 3. DEBIT each user ledger for their allocated share
      for (const allocation of allocations) {
        if (allocation.amount <= 0) {
          continue;
        }

        const shipment = transit.shipments.find((s) => s.id === allocation.shipmentId);
        if (!shipment) {
          continue;
        }

        const vehicleLabel = [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel]
          .filter(Boolean)
          .join(' ');
        const vinSuffix = shipment.vehicleVIN ? ` (VIN: ${shipment.vehicleVIN})` : '';

        await tx.ledgerEntry.create({
          data: {
            userId: shipment.userId,
            shipmentId: shipment.id,
            description: `Transit expense allocation - ${validatedData.type} for ${vehicleLabel || 'shipment'}${vinSuffix}`,
            type: 'DEBIT',
            amount: allocation.amount,
            balance: 0,
            createdBy: session.user!.id as string,
            notes: validatedData.notes ?? null,
            metadata: {
              isExpense: true,
              isTransitExpense: true,
              transitExpenseId: createdExpense.id,
              transitId: params.id,
              transitRef: transit.referenceNumber,
              expenseType: validatedData.type,
              linkedCompanyId: transit.companyId,
            },
          },
        });
      }

      // 4. Recalculate all affected user balances and company balance
      const affectedUserIds = Array.from(new Set(transit.shipments.map((s) => s.userId)));
      for (const userId of affectedUserIds) {
        await recalculateUserLedgerBalances(tx, userId);
      }
      await recalculateCompanyLedgerBalances(tx, transit.companyId as string);

      return createdExpense;
    });

    return NextResponse.json({ expense, message: 'Expense added successfully' }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 });
    }
    console.error('Error creating transit expense:', error);
    return NextResponse.json({ error: 'Failed to create transit expense' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;

  try {
    const session = await auth();

    if (!session?.user || !hasAnyPermission(session.user?.role, ['finance:manage', 'transits:manage'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const expenseId = searchParams.get('expenseId');

    if (!expenseId) {
      return NextResponse.json({ error: 'Expense ID required' }, { status: 400 });
    }

    const expense = await prisma.transitExpense.findUnique({
      where: { id: expenseId },
      include: {
        transit: { select: { id: true, companyId: true } },
      },
    });

    if (!expense || expense.transitId !== params.id) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // Find and delete linked user ledger entries
      const linkedUserEntries = await tx.ledgerEntry.findMany({
        where: {
          metadata: {
            path: ['transitExpenseId'],
            equals: expenseId,
          },
        },
        select: { id: true, userId: true },
      });

      // Find and delete linked company ledger entries
      const linkedCompanyEntries = await tx.companyLedgerEntry.findMany({
        where: {
          metadata: {
            path: ['transitExpenseId'],
            equals: expenseId,
          },
        },
        select: { id: true, companyId: true },
      });

      if (linkedUserEntries.length > 0) {
        await tx.ledgerEntry.deleteMany({
          where: { id: { in: linkedUserEntries.map((e) => e.id) } },
        });
      }

      if (linkedCompanyEntries.length > 0) {
        await tx.companyLedgerEntry.deleteMany({
          where: { id: { in: linkedCompanyEntries.map((e) => e.id) } },
        });
      }

      await tx.transitExpense.delete({ where: { id: expenseId } });

      // Recalculate balances
      const userIds = Array.from(new Set(linkedUserEntries.map((e) => e.userId)));
      for (const userId of userIds) {
        await recalculateUserLedgerBalances(tx, userId);
      }

      const companyIds = new Set(linkedCompanyEntries.map((e) => e.companyId));
      if (expense.transit.companyId) {
        companyIds.add(expense.transit.companyId);
      }
      for (const companyId of companyIds) {
        await recalculateCompanyLedgerBalances(tx, companyId);
      }
    });

    return NextResponse.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting transit expense:', error);
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}
