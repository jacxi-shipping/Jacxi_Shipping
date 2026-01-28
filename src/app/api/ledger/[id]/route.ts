import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

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

    // Non-admin users can only view their own entries
    if (session.user.role !== 'admin' && entry.userId !== session.user.id) {
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

    // Only admins can update ledger entries
    if (session.user.role !== 'admin') {
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

    // Only admins can delete ledger entries
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const entry = await prisma.ledgerEntry.findUnique({
      where: { id: params.id },
    });

    if (!entry) {
      return NextResponse.json({ error: 'Ledger entry not found' }, { status: 404 });
    }

    // Delete the entry
    await prisma.ledgerEntry.delete({
      where: { id: params.id },
    });

    // Recalculate balances for all subsequent entries
    const subsequentEntries = await prisma.ledgerEntry.findMany({
      where: {
        userId: entry.userId,
        transactionDate: {
          gte: entry.transactionDate,
        },
      },
      orderBy: {
        transactionDate: 'asc',
      },
    });

    // Get the balance before the deleted entry
    const previousEntry = await prisma.ledgerEntry.findFirst({
      where: {
        userId: entry.userId,
        transactionDate: {
          lt: entry.transactionDate,
        },
      },
      orderBy: {
        transactionDate: 'desc',
      },
    });

    let runningBalance = previousEntry?.balance || 0;

    // Update balances for all subsequent entries
    for (const subsequentEntry of subsequentEntries) {
      if (subsequentEntry.type === 'DEBIT') {
        runningBalance += subsequentEntry.amount;
      } else {
        runningBalance -= subsequentEntry.amount;
      }

      await prisma.ledgerEntry.update({
        where: { id: subsequentEntry.id },
        data: { balance: runningBalance },
      });
    }

    return NextResponse.json({ message: 'Ledger entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting ledger entry:', error);
    return NextResponse.json(
      { error: 'Failed to delete ledger entry' },
      { status: 500 }
    );
  }
}
