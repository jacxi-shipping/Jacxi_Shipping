import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { hasPermission } from '@/lib/rbac';

// Schema for recording a payment
const recordPaymentSchema = z.object({
  userId: z.string(),
  shipmentIds: z.array(z.string()).min(1),
  amount: z.number().positive(),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'CHECK', 'CREDIT_CARD', 'WIRE']).optional().default('CASH'),
  transactionInfoType: z.enum(['CAR_PAYMENT', 'SHIPPING_PAYMENT', 'STORAGE_PAYMENT']).optional().default('SHIPPING_PAYMENT'),
  notes: z.string().optional(),
});

const transactionInfoTypeLabels = {
  CAR_PAYMENT: 'Car Payment',
  SHIPPING_PAYMENT: 'Shipping Payment',
  STORAGE_PAYMENT: 'Storage Payment',
} as const;

// POST - Record a payment from a user
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only users with finance:manage can record payments
    if (!hasPermission(session.user.role, 'finance:manage')) {
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
        vehicleVIN: true,
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

    // Create a credit ledger entry (payment received)
    const shipmentInfo = shipments
      .map((s) => s.vehicleVIN || `${s.vehicleMake || ''} ${s.vehicleModel || ''}`.trim() || s.id)
      .join(', ');
    const transactionInfoLabel = transactionInfoTypeLabels[validatedData.transactionInfoType];
    const description = `${transactionInfoLabel} received for shipment(s): ${shipmentInfo}`;

    const entry = await prisma.ledgerEntry.create({
      data: {
        userId: validatedData.userId,
        description,
        type: 'CREDIT',
        transactionInfoType: validatedData.transactionInfoType,
        amount: validatedData.amount,
        balance: newBalance,
        createdBy: session.user.id as string,
        notes: validatedData.notes,
        metadata: {
          shipmentIds: validatedData.shipmentIds,
          paymentType: 'received',
          paymentMethod: validatedData.paymentMethod,
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

    // ⚡ Bolt: Fetch ledger entries for all shipments in one go to fix N+1 query problem
    const allShipmentLedgers = await prisma.ledgerEntry.groupBy({
      by: ['shipmentId', 'type'],
      where: {
        shipmentId: { in: validatedData.shipmentIds },
      },
      _sum: {
        amount: true,
      },
    });

    // ⚡ Bolt: Create O(1) lookup map for shipment ledgers
    const ledgerMap: Record<string, { totalDebit: number; totalCredit: number }> = {};
    for (const entry of allShipmentLedgers) {
      if (!entry.shipmentId) continue;

      if (!ledgerMap[entry.shipmentId]) {
        ledgerMap[entry.shipmentId] = { totalDebit: 0, totalCredit: 0 };
      }

      if (entry.type === 'DEBIT') {
        ledgerMap[entry.shipmentId].totalDebit += entry._sum.amount || 0;
      } else if (entry.type === 'CREDIT') {
        ledgerMap[entry.shipmentId].totalCredit += entry._sum.amount || 0;
      }
    }

    // ⚡ Bolt: Collect all database mutations and run them in a single transaction
    // This reduces O(2N) sequential database roundtrips to 1 bulk operation.
    const ledgerEntryCreations = [];
    const completedShipmentIds: string[] = [];
    const pendingShipmentIds: string[] = [];

    for (const shipment of shipments) {
      if (remainingAmount <= 0) break;

      // ⚡ Bolt: Use O(1) lookup instead of awaiting DB query inside the loop
      const ledgerInfo = ledgerMap[shipment.id] || { totalDebit: 0, totalCredit: 0 };
      const totalDebit = ledgerInfo.totalDebit;
      const totalCredit = ledgerInfo.totalCredit;
      const shipmentDue = totalDebit - totalCredit;

      if (shipmentDue > 0) {
        const paymentForShipment = Math.min(remainingAmount, shipmentDue);
        remainingAmount -= paymentForShipment;

        // Create a ledger entry specifically for this shipment
        ledgerEntryCreations.push({
          userId: validatedData.userId,
          shipmentId: shipment.id,
          description: `Payment applied to ${shipment.vehicleVIN ? `VIN ${shipment.vehicleVIN}` : `shipment ${shipment.id || ''}`}`,
          type: 'CREDIT' as const,
          transactionInfoType: validatedData.transactionInfoType,
          amount: paymentForShipment,
          balance: newBalance, // Same balance as the main entry
          createdBy: session.user.id as string,
          notes: `Auto-applied from payment entry ${entry.id}`,
          metadata: {
            parentEntryId: entry.id,
            paymentType: 'applied',
          },
        });

        // Check if shipment is now fully paid
        const newTotalCredit = totalCredit + paymentForShipment;
        const isPaid = newTotalCredit >= totalDebit;

        if (isPaid) {
          completedShipmentIds.push(shipment.id);
        } else {
          pendingShipmentIds.push(shipment.id);
        }

        updatedShipments.push({
          id: shipment.id,
          paymentStatus: isPaid ? 'COMPLETED' : 'PENDING',
          amountPaid: paymentForShipment,
          remainingDue: Math.max(0, totalDebit - newTotalCredit),
        });
      }
    }

    const transactionOperations = [];

    if (ledgerEntryCreations.length > 0) {
      transactionOperations.push(
        prisma.ledgerEntry.createMany({
          data: ledgerEntryCreations,
        })
      );
    }

    if (completedShipmentIds.length > 0) {
      transactionOperations.push(
        prisma.shipment.updateMany({
          where: { id: { in: completedShipmentIds } },
          data: { paymentStatus: 'COMPLETED' },
        })
      );
    }

    if (pendingShipmentIds.length > 0) {
      transactionOperations.push(
        prisma.shipment.updateMany({
          where: { id: { in: pendingShipmentIds } },
          data: { paymentStatus: 'PENDING' },
        })
      );
    }

    if (transactionOperations.length > 0) {
      await prisma.$transaction(transactionOperations);
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
