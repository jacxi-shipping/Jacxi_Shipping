import { NextRequest, NextResponse } from 'next/server';
import { routeDeps } from '@/lib/route-deps';
import { z } from 'zod';
import { addExpenseLineItemToShipmentInvoice, mapExpenseTypeToLineItemType } from '@/lib/shipment-invoice';

// Schema for adding an expense
const addExpenseSchema = z.object({
  shipmentId: z.string(),
  description: z.string().min(1),
  amount: z.number().positive(),
  companyAmount: z.number().positive().optional(),
  expenseType: z.enum(['SHIPPING_FEE', 'FUEL', 'PORT_CHARGES', 'TOWING', 'CUSTOMS', 'STORAGE_FEE', 'HANDLING_FEE', 'INSURANCE', 'OTHER']),
  paymentMode: z.enum(['DUE']).default('DUE'),
  notes: z.string().optional(),
  contextType: z.enum(['TRANSIT', 'CONTAINER', 'DISPATCH']).optional(),
  contextId: z.string().optional(),
});

// POST - Add an expense to a shipment
export async function POST(request: NextRequest) {
  try {
    const session = await routeDeps.auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!routeDeps.hasAnyPermission(session.user?.role, ['finance:manage', 'shipments:manage'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = addExpenseSchema.parse(body);

    // Verify shipment exists
    const shipment = await routeDeps.prisma.shipment.findUnique({
      where: { id: validatedData.shipmentId },
      select: {
        id: true,
        userId: true,
        vehicleMake: true,
        vehicleModel: true,
        vehicleVIN: true,
        dispatchId: true,
        containerId: true,
        transitId: true,
        dispatch: {
          select: {
            companyId: true,
            referenceNumber: true,
          },
        },
        container: {
          select: {
            companyId: true,
            containerNumber: true,
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

    // Determine which company to credit based on explicit context or fallback logic
    let resolvedCompanyId: string | null | undefined;
    let expenseSource: 'DISPATCH' | 'TRANSIT' | 'SHIPMENT';
    let contextLabel = '';

    if (validatedData.contextType === 'DISPATCH') {
      resolvedCompanyId = shipment.dispatch?.companyId;
      expenseSource = 'DISPATCH';
      contextLabel = `(Dispatch ${shipment.dispatch?.referenceNumber || 'N/A'})`;
    } else if (validatedData.contextType === 'TRANSIT') {
      resolvedCompanyId = shipment.transit?.companyId;
      expenseSource = 'TRANSIT';
      contextLabel = `(Transit ${shipment.transit?.referenceNumber || 'N/A'})`;
    } else if (validatedData.contextType === 'CONTAINER') {
      resolvedCompanyId = shipment.container?.companyId;
      expenseSource = 'SHIPMENT';
      contextLabel = shipment.container?.containerNumber ? `(Container ${shipment.container.containerNumber})` : '';
    } else {
      resolvedCompanyId = shipment.container?.companyId || shipment.transit?.companyId || shipment.dispatch?.companyId;

      if (shipment.container?.companyId) {
        expenseSource = 'SHIPMENT';
        contextLabel = shipment.container.containerNumber ? `(Container ${shipment.container.containerNumber})` : '';
      } else if (shipment.transit?.companyId) {
        expenseSource = 'TRANSIT';
        contextLabel = `(Transit ${shipment.transit.referenceNumber || 'N/A'})`;
      } else {
        expenseSource = 'DISPATCH';
        contextLabel = `(Dispatch ${shipment.dispatch?.referenceNumber || 'N/A'})`;
      }
    }

    if (!resolvedCompanyId) {
      return NextResponse.json(
        { error: 'Shipment must be linked to a dispatch, container, or transit with a company before adding expenses' },
        { status: 400 }
      );
    }

    // The user (debit) amount is always `amount`. Company (debit/payable) amount defaults to `amount` unless overridden.
    const userAmount = validatedData.amount;
    const companyAmount = validatedData.companyAmount ?? validatedData.amount;

    // Create expense description
    const expenseTypeLabel = validatedData.expenseType.replace(/_/g, ' ').toLowerCase();
    const vehicleInfo = `${shipment.vehicleMake || ''} ${shipment.vehicleModel || ''}`.trim() || 'Vehicle';
    const shipmentRef = shipment.vehicleVIN
      ? `VIN ${shipment.vehicleVIN}`
      : `Shipment ${shipment.id}`;
    const contextInfo = contextLabel;
    const description = `${validatedData.description} - ${expenseTypeLabel} for ${vehicleInfo} (${shipmentRef}) ${contextInfo}`.trim();

    const companyCategory =
      expenseSource === 'DISPATCH'
        ? 'Dispatch Expense Recovery'
        : expenseSource === 'TRANSIT'
        ? 'Transit Expense Recovery'
        : 'Shipment Expense Recovery';

    const entries = await routeDeps.prisma.$transaction(async (tx) => {
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
            paymentMode: 'DUE',
            isExpense: true,
            // Shipment expenses are always staged for invoice payment — they must NOT
            // affect the customer's credit balance until the invoice is actually paid.
            pendingInvoice: true,
            linkedCompanyId: resolvedCompanyId,
            expenseSource,
            ...(expenseSource === 'DISPATCH' && { dispatchId: shipment.dispatchId }),
            ...(expenseSource === 'TRANSIT' && { transitId: shipment.transitId }),
            ...(expenseSource === 'SHIPMENT' && { containerId: shipment.containerId }),
          },
        },
      });

      const reference = `shipment-expense:${debitEntry.id}`;

      const companyDebitEntry = await tx.companyLedgerEntry.create({
        data: {
          companyId: resolvedCompanyId,
          description: `Expense recovery - ${description}`,
          type: 'DEBIT',
          amount: companyAmount,
          balance: 0,
          category: companyCategory,
          reference,
          notes: validatedData.notes,
          createdBy: session.user!.id as string,
          metadata: {
            isExpenseRecovery: true,
            expenseSource,
            linkedUserExpenseEntryId: debitEntry.id,
            shipmentId: shipment.id,
            userId: shipment.userId,
            expenseType: validatedData.expenseType,
            paymentMode: 'DUE',
            ...(expenseSource === 'DISPATCH' && { dispatchId: shipment.dispatchId }),
            ...(expenseSource === 'TRANSIT' && { transitId: shipment.transitId }),
            ...(expenseSource === 'SHIPMENT' && { containerId: shipment.containerId }),
          },
        },
      });

      // Add this expense as a line item on the shipment's pending invoice
      await addExpenseLineItemToShipmentInvoice(
        validatedData.shipmentId,
        {
          description,
          type: mapExpenseTypeToLineItemType(validatedData.expenseType),
          amount: userAmount,
        },
        tx
      );

      const createdEntries = [debitEntry];

      await routeDeps.recalculateUserLedgerBalances(tx, shipment.userId);
      await routeDeps.recalculateCompanyLedgerBalances(tx, resolvedCompanyId);

      return {
        userEntries: createdEntries,
        companyEntry: companyDebitEntry,
      };
    });

    return NextResponse.json({
      entries: entries.userEntries,
      entry: entries.userEntries[0],
      companyEntry: entries.companyEntry,
      message: 'Expense added and staged for invoice payment successfully',
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
    const session = await routeDeps.auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const shipmentId = searchParams.get('shipmentId');

    if (!shipmentId) {
      return NextResponse.json({ error: 'Shipment ID required' }, { status: 400 });
    }

    // Verify user has access to this shipment
    const shipment = await routeDeps.prisma.shipment.findUnique({
      where: { id: shipmentId },
      select: { userId: true },
    });

    if (!shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }

    const canReadAllFinance = routeDeps.hasAnyPermission(session.user?.role, ['finance:view', 'shipments:read_all']);
    if (!canReadAllFinance && shipment.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all expenses for this shipment
    const expenses = await routeDeps.prisma.ledgerEntry.findMany({
      where: {
        shipmentId,
        metadata: {
          path: ['isExpense'],
          equals: true,
        },
      },
      orderBy: { transactionDate: 'desc' },
    });

    // ⚡ Bolt: Replaced chained .filter().reduce() operations with a single pass O(N) loop
    // Calculate total expenses (sum of DEBIT entries only)
    let debitCents = 0;
    for (const expense of expenses) {
      if (expense.type === 'DEBIT') {
        debitCents += Math.round(expense.amount * 100);
      }
    }
    const totalExpenses = debitCents / 100;

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
