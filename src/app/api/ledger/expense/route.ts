import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { recalculateCompanyLedgerBalances } from '@/lib/company-ledger';
import { recalculateUserLedgerBalances } from '@/lib/user-ledger';
import { hasAnyPermission } from '@/lib/rbac';
import { z } from 'zod';

// Schema for adding an expense
const addExpenseSchema = z.object({
  shipmentId: z.string(),
  description: z.string().min(1),
  amount: z.number().positive(),
  companyAmount: z.number().positive().optional(),
  expenseType: z.enum(['SHIPPING_FEE', 'FUEL', 'PORT_CHARGES', 'TOWING', 'CUSTOMS', 'STORAGE_FEE', 'HANDLING_FEE', 'INSURANCE', 'OTHER']),
  paymentMode: z.enum(['CASH', 'DUE']).default('DUE'),
  notes: z.string().optional(),
});

// POST - Add an expense to a shipment
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasAnyPermission(session.user?.role, ['finance:manage', 'shipments:manage'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = addExpenseSchema.parse(body);

    // Verify shipment exists
    const shipment = await prisma.shipment.findUnique({
      where: { id: validatedData.shipmentId },
      select: {
        id: true,
        userId: true,
        vehicleMake: true,
        vehicleModel: true,
        vehicleVIN: true,
        transitId: true,
        container: {
          select: {
            companyId: true,
          },
        },
        transit: {
          select: {
            companyId: true,
            referenceNumber: true,
          },
        },
      },
    });

    if (!shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }

    // Priority: Transit company > Container company
    const resolvedCompanyId = shipment.transit?.companyId || shipment.container?.companyId;
    const isTransitExpense = Boolean(shipment.transitId && shipment.transit?.companyId);

    if (!resolvedCompanyId) {
      return NextResponse.json(
        { error: 'Shipment must be linked to a container or transit with a company before adding expenses' },
        { status: 400 }
      );
    }

    // The user (debit) amount is always `amount`. Company (credit) amount defaults to `amount` unless overridden.
    const userAmount = validatedData.amount;
    const companyAmount = validatedData.companyAmount ?? validatedData.amount;

    // Create expense description
    const expenseTypeLabel = validatedData.expenseType.replace(/_/g, ' ').toLowerCase();
    const vehicleInfo = `${shipment.vehicleMake || ''} ${shipment.vehicleModel || ''}`.trim() || 'Vehicle';
    const shipmentRef = shipment.vehicleVIN
      ? `VIN ${shipment.vehicleVIN}`
      : `Shipment ${shipment.id}`;
    const contextInfo = isTransitExpense 
      ? `(Transit ${shipment.transit?.referenceNumber || 'N/A'})`
      : '';
    const description = `${validatedData.description} - ${expenseTypeLabel} for ${vehicleInfo} (${shipmentRef}) ${contextInfo}`.trim();

    const entries = await prisma.$transaction(async (tx) => {
      const debitEntry = await tx.ledgerEntry.create({
        data: {
          userId: shipment.userId,
          shipmentId: validatedData.shipmentId,
          description,
          type: 'DEBIT',
          amount: userAmount,
          balance: 0,
          createdBy: session.user!.id as string,
          notes: validatedData.notes,
          metadata: {
            expenseType: validatedData.expenseType,
            paymentMode: validatedData.paymentMode,
            isExpense: true,
            linkedCompanyId: resolvedCompanyId,
            expenseSource: isTransitExpense ? 'TRANSIT' : 'SHIPMENT',
            ...(isTransitExpense && { transitId: shipment.transitId }),
          },
        },
      });

      const reference = `shipment-expense:${debitEntry.id}`;

      const companyCreditEntry = await tx.companyLedgerEntry.create({
        data: {
          companyId: resolvedCompanyId,
          description: `Expense recovery - ${description}`,
          type: 'CREDIT',
          amount: companyAmount,
          balance: 0,
          category: isTransitExpense ? 'Transit Expense Recovery' : 'Shipment Expense Recovery',
          reference,
          notes: validatedData.notes,
          createdBy: session.user!.id as string,
          metadata: {
            isExpenseRecovery: true,
            expenseSource: isTransitExpense ? 'TRANSIT' : 'SHIPMENT',
            linkedUserExpenseEntryId: debitEntry.id,
            shipmentId: shipment.id,
            userId: shipment.userId,
            expenseType: validatedData.expenseType,
            paymentMode: validatedData.paymentMode,
            ...(isTransitExpense && { transitId: shipment.transitId }),
          },
        },
      });

      const createdEntries = [debitEntry];

      // For CASH payments: also create a CREDIT entry (cash received)
      if (validatedData.paymentMode === 'CASH') {
        const creditEntry = await tx.ledgerEntry.create({
          data: {
            userId: shipment.userId,
            shipmentId: validatedData.shipmentId,
            description: `Cash payment received - ${validatedData.description}`,
            type: 'CREDIT',
            amount: userAmount,
            balance: 0,
            createdBy: session.user!.id as string,
            notes: validatedData.notes,
            metadata: {
              expenseType: validatedData.expenseType,
              paymentMode: validatedData.paymentMode,
              isExpense: true,
              isCashPayment: true,
              parentExpenseEntryId: debitEntry.id,
              linkedCompanyId: resolvedCompanyId,
              expenseSource: isTransitExpense ? 'TRANSIT' : 'SHIPMENT',
              ...(isTransitExpense && { transitId: shipment.transitId }),
            },
          },
        });
        createdEntries.push(creditEntry);
      }

      await recalculateUserLedgerBalances(tx, shipment.userId);
      await recalculateCompanyLedgerBalances(tx, resolvedCompanyId);

      return {
        userEntries: createdEntries,
        companyEntry: companyCreditEntry,
      };
    });

    return NextResponse.json({
      entries: entries.userEntries,
      entry: entries.userEntries[0],
      companyEntry: entries.companyEntry,
      message: validatedData.paymentMode === 'CASH'
        ? 'Expense added and cash payment recorded successfully'
        : 'Expense added successfully',
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

// GET - Get expenses for a shipment
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const shipmentId = searchParams.get('shipmentId');

    if (!shipmentId) {
      return NextResponse.json({ error: 'Shipment ID required' }, { status: 400 });
    }

    // Verify user has access to this shipment
    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      select: { userId: true },
    });

    if (!shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }

    const canReadAllFinance = hasAnyPermission(session.user?.role, ['finance:view', 'shipments:read_all']);
    if (!canReadAllFinance && shipment.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all expenses for this shipment
    const expenses = await prisma.ledgerEntry.findMany({
      where: {
        shipmentId,
        metadata: {
          path: ['isExpense'],
          equals: true,
        },
      },
      orderBy: { transactionDate: 'desc' },
    });

    // Calculate total expenses (sum of DEBIT entries only)
    const totalExpenses = expenses
      .filter(e => e.type === 'DEBIT')
      .reduce((sum, expense) => sum + expense.amount, 0);

    return NextResponse.json({
      expenses,
      totalExpenses,
      count: expenses.length,
    });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expenses' },
      { status: 500 }
    );
  }
}
