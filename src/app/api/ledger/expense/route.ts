import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Schema for adding an expense
const addExpenseSchema = z.object({
  shipmentId: z.string(),
  description: z.string().min(1),
  amount: z.number().positive(),
  expenseType: z.enum(['SHIPPING_FEE', 'FUEL', 'PORT_CHARGES', 'TOWING', 'CUSTOMS', 'OTHER']),
  notes: z.string().optional(),
});

// POST - Add an expense to a shipment
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can add expenses
    if (session.user.role !== 'admin') {
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
      },
    });

    if (!shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }

    // Get current balance for the user
    const latestEntry = await prisma.ledgerEntry.findFirst({
      where: { userId: shipment.userId },
      orderBy: { transactionDate: 'desc' },
      select: { balance: true },
    });

    const currentBalance = latestEntry?.balance || 0;
    const newBalance = currentBalance + validatedData.amount;

    // Create expense description
    const expenseTypeLabel = validatedData.expenseType.replace(/_/g, ' ').toLowerCase();
    const vehicleInfo = `${shipment.vehicleMake || ''} ${shipment.vehicleModel || ''}`.trim() || 'Vehicle';
    const description = `${validatedData.description} - ${expenseTypeLabel} for ${vehicleInfo} (Shipment ${shipment.id})`;

    // Create ledger entry for expense
    const entry = await prisma.ledgerEntry.create({
      data: {
        userId: shipment.userId,
        shipmentId: validatedData.shipmentId,
        description,
        type: 'DEBIT',
        amount: validatedData.amount,
        balance: newBalance,
        createdBy: session.user.id as string,
        notes: validatedData.notes,
        metadata: {
          expenseType: validatedData.expenseType,
          isExpense: true,
        },
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

    return NextResponse.json({
      entry,
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

    // Non-admin users can only view their own shipment expenses
    if (session.user.role !== 'admin' && shipment.userId !== session.user.id) {
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

    // Calculate total expenses
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

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
