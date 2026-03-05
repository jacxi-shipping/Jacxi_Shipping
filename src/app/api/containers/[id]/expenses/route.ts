import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { recalculateCompanyLedgerBalances } from '@/lib/company-ledger';
import { recalculateUserLedgerBalances } from '@/lib/user-ledger';
import { z } from 'zod';

function allocateContainerExpense(
  shipments: Array<{ id: string; insuranceValue: number | null; weight: number | null }>,
  totalAmount: number,
  method: 'EQUAL' | 'BY_VALUE' | 'BY_WEIGHT' | 'CUSTOM'
) {
  if (shipments.length === 0) {
    return [] as Array<{ shipmentId: string; amount: number }>;
  }

  const safeEqualSplit = () => {
    const base = Math.floor((totalAmount / shipments.length) * 100) / 100;
    const allocations = shipments.map((shipment) => ({ shipmentId: shipment.id, amount: base }));
    const assigned = allocations.reduce((sum, item) => sum + item.amount, 0);
    const remainder = Number((totalAmount - assigned).toFixed(2));
    allocations[0].amount = Number((allocations[0].amount + remainder).toFixed(2));
    return allocations;
  };

  if (method === 'EQUAL' || method === 'CUSTOM') {
    return safeEqualSplit();
  }

  const metricTotal = shipments.reduce((sum, shipment) => {
    if (method === 'BY_VALUE') {
      return sum + (shipment.insuranceValue || 0);
    }
    return sum + (shipment.weight || 0);
  }, 0);

  if (metricTotal <= 0) {
    return safeEqualSplit();
  }

  const allocations = shipments.map((shipment) => {
    const metric = method === 'BY_VALUE' ? shipment.insuranceValue || 0 : shipment.weight || 0;
    const raw = (totalAmount * metric) / metricTotal;
    return {
      shipmentId: shipment.id,
      amount: Math.floor(raw * 100) / 100,
    };
  });

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

// GET - Fetch expenses for a container
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

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const expenses = await prisma.containerExpense.findMany({
      where: { containerId: params.id },
      orderBy: { date: 'desc' },
    });

    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    return NextResponse.json({
      expenses,
      total,
      count: expenses.length,
    });
  } catch (error) {
    console.error('Error fetching container expenses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expenses' },
      { status: 500 }
    );
  }
}

// POST - Add expense to container
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

    // Only admins can add expenses
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify container exists
    const container = await prisma.container.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        companyId: true,
        expenseAllocationMethod: true,
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

    if (!container) {
      return NextResponse.json({ error: 'Container not found' }, { status: 404 });
    }

    if (!container.companyId) {
      return NextResponse.json(
        { error: 'Assign a company to this container before adding expenses' },
        { status: 400 }
      );
    }

    if (container.shipments.length === 0) {
      return NextResponse.json(
        { error: 'Add at least one shipment to the container before posting expenses' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = expenseSchema.parse(body);

    const allocations = allocateContainerExpense(
      container.shipments.map((shipment) => ({
        id: shipment.id,
        insuranceValue: shipment.insuranceValue,
        weight: shipment.weight,
      })),
      validatedData.amount,
      container.expenseAllocationMethod
    );

    const expense = await prisma.$transaction(async (tx) => {
      const createdExpense = await tx.containerExpense.create({
        data: {
          containerId: params.id,
          type: validatedData.type,
          amount: validatedData.amount,
          currency: validatedData.currency,
          date: validatedData.date ? new Date(validatedData.date) : new Date(),
          vendor: validatedData.vendor,
          invoiceNumber: validatedData.invoiceNumber,
          notes: validatedData.notes,
        },
      });

      const reference = `container-expense:${createdExpense.id}`;

      await tx.companyLedgerEntry.create({
        data: {
          companyId: container.companyId as string,
          description: `Container expense recovery - ${validatedData.type}`,
          type: 'CREDIT',
          amount: validatedData.amount,
          balance: 0,
          category: 'Container Expense Recovery',
          reference,
          notes: validatedData.notes,
          createdBy: session.user!.id as string,
          metadata: {
            isContainerExpense: true,
            containerExpenseId: createdExpense.id,
            containerId: params.id,
            allocationMethod: container.expenseAllocationMethod,
          },
        },
      });

      for (const allocation of allocations) {
        if (allocation.amount <= 0) {
          continue;
        }

        const shipment = container.shipments.find((item) => item.id === allocation.shipmentId);
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
            description: `Container expense allocation - ${validatedData.type} for ${vehicleLabel || 'shipment'}${vinSuffix}`,
            type: 'DEBIT',
            amount: allocation.amount,
            balance: 0,
            createdBy: session.user!.id as string,
            notes: validatedData.notes,
            metadata: {
              isExpense: true,
              isContainerExpense: true,
              containerExpenseId: createdExpense.id,
              containerId: params.id,
              expenseType: validatedData.type,
              linkedCompanyId: container.companyId,
            },
          },
        });
      }

      const affectedUserIds = Array.from(new Set(container.shipments.map((shipment) => shipment.userId)));
      for (const userId of affectedUserIds) {
        await recalculateUserLedgerBalances(tx, userId);
      }
      await recalculateCompanyLedgerBalances(tx, container.companyId as string);

      return createdExpense;
    });

    // Create audit log
    await prisma.containerAuditLog.create({
      data: {
        containerId: params.id,
        action: 'EXPENSE_ADDED',
        description: `Expense added: ${validatedData.type} - $${validatedData.amount}`,
        performedBy: session.user.id as string,
        newValue: JSON.stringify({ type: validatedData.type, amount: validatedData.amount }),
      },
    });

    return NextResponse.json({
      expense,
      message: 'Expense added successfully',
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error adding expense:', error);
    return NextResponse.json(
      { error: 'Failed to add expense' },
      { status: 500 }
    );
  }
}

// DELETE - Remove expense
export async function DELETE(
  request: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const expenseId = searchParams.get('expenseId');

    if (!expenseId) {
      return NextResponse.json({ error: 'Expense ID required' }, { status: 400 });
    }

    const expense = await prisma.containerExpense.findUnique({
      where: { id: expenseId },
      include: {
        container: {
          select: {
            id: true,
            companyId: true,
          },
        },
      },
    });

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      const linkedUserEntries = await tx.ledgerEntry.findMany({
        where: {
          metadata: {
            path: ['containerExpenseId'],
            equals: expenseId,
          },
        },
        select: { id: true, userId: true },
      });

      const linkedCompanyEntries = await tx.companyLedgerEntry.findMany({
        where: {
          metadata: {
            path: ['containerExpenseId'],
            equals: expenseId,
          },
        },
        select: { id: true, companyId: true },
      });

      if (linkedUserEntries.length > 0) {
        await tx.ledgerEntry.deleteMany({
          where: {
            id: { in: linkedUserEntries.map((entry) => entry.id) },
          },
        });
      }

      if (linkedCompanyEntries.length > 0) {
        await tx.companyLedgerEntry.deleteMany({
          where: {
            id: { in: linkedCompanyEntries.map((entry) => entry.id) },
          },
        });
      }

      await tx.containerExpense.delete({ where: { id: expenseId } });

      const userIds = Array.from(new Set(linkedUserEntries.map((entry) => entry.userId)));
      for (const userId of userIds) {
        await recalculateUserLedgerBalances(tx, userId);
      }

      const companyIds = new Set(linkedCompanyEntries.map((entry) => entry.companyId));
      if (expense.container.companyId) {
        companyIds.add(expense.container.companyId);
      }

      for (const companyId of companyIds) {
        await recalculateCompanyLedgerBalances(tx, companyId);
      }
    });

    return NextResponse.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json(
      { error: 'Failed to delete expense' },
      { status: 500 }
    );
  }
}
