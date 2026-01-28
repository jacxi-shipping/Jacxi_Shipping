import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Schema for recording a payment
const recordPaymentSchema = z.object({
  userId: z.string(),
  shipmentIds: z.array(z.string()).min(1),
  amount: z.number().positive(),
  notes: z.string().optional(),
});

// POST - Record a payment from a user
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can record payments
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = recordPaymentSchema.parse(body);

    // Validate that shipments exist and belong to the user
    const shipments = await prisma.shipment.findMany({
      where: {
        id: { in: validatedData.shipmentIds },
        userId: validatedData.userId,
      },
      select: {
        id: true,
        price: true,
        vehicleMake: true,
        vehicleModel: true,
        paymentStatus: true,
      },
    });

    if (shipments.length !== validatedData.shipmentIds.length) {
      return NextResponse.json(
        { error: 'Some shipments not found or do not belong to this user' },
        { status: 400 }
      );
    }

    // Get current balance for the user
    const latestEntry = await prisma.ledgerEntry.findFirst({
      where: { userId: validatedData.userId },
      orderBy: { transactionDate: 'desc' },
      select: { balance: true },
    });

    const currentBalance = latestEntry?.balance || 0;
    const newBalance = currentBalance - validatedData.amount;

    // Create a credit ledger entry
    const shipmentInfo = shipments.map(s => `${s.id || ""} (${s.vehicleMake} ${s.vehicleModel})`).join(', ');
    const description = `Payment received for shipment(s): ${shipmentInfo}`;

    const entry = await prisma.ledgerEntry.create({
      data: {
        userId: validatedData.userId,
        description,
        type: 'CREDIT',
        amount: validatedData.amount,
        balance: newBalance,
        createdBy: session.user.id as string,
        notes: validatedData.notes,
        metadata: {
          shipmentIds: validatedData.shipmentIds,
          paymentType: 'received',
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
      },
    });

    // Distribute the payment across shipments
    let remainingAmount = validatedData.amount;
    const updatedShipments = [];

    for (const shipment of shipments) {
      if (remainingAmount <= 0) break;

      // Get total debits and credits for this shipment
      const shipmentLedger = await prisma.ledgerEntry.groupBy({
        by: ['type'],
        where: { 
          shipmentId: shipment.id,
        },
        _sum: {
          amount: true,
        },
      });

      const totalDebit = shipmentLedger.find(e => e.type === 'DEBIT')?._sum.amount || 0;
      const totalCredit = shipmentLedger.find(e => e.type === 'CREDIT')?._sum.amount || 0;
      const shipmentDue = totalDebit - totalCredit;

      if (shipmentDue > 0) {
        const paymentForShipment = Math.min(remainingAmount, shipmentDue);
        remainingAmount -= paymentForShipment;

        // Create a ledger entry specifically for this shipment
        await prisma.ledgerEntry.create({
          data: {
            userId: validatedData.userId,
            shipmentId: shipment.id,
            description: `Payment applied to shipment ${shipment.id || ""}`,
            type: 'CREDIT',
            amount: paymentForShipment,
            balance: newBalance, // Same balance as the main entry
            createdBy: session.user.id as string,
            notes: `Auto-applied from payment entry ${entry.id}`,
            metadata: {
              parentEntryId: entry.id,
              paymentType: 'applied',
            },
          },
        });

        // Check if shipment is now fully paid
        const newTotalCredit = totalCredit + paymentForShipment;
        const isPaid = newTotalCredit >= totalDebit;

        // Update shipment payment status
        const updatedShipment = await prisma.shipment.update({
          where: { id: shipment.id },
          data: { 
            paymentStatus: isPaid ? 'COMPLETED' : 'PENDING',
          },
          select: {
            id: true,
            paymentStatus: true,
          },
        });

        updatedShipments.push({
          ...updatedShipment,
          amountPaid: paymentForShipment,
          remainingDue: Math.max(0, totalDebit - newTotalCredit),
        });
      }
    }

    return NextResponse.json({
      entry,
      updatedShipments,
      remainingAmount,
      message: remainingAmount > 0 
        ? 'Payment recorded. Some amount remains unapplied.'
        : 'Payment recorded and fully applied to shipments.',
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error recording payment:', error);
    return NextResponse.json(
      { error: 'Failed to record payment' },
      { status: 500 }
    );
  }
}
