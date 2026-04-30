import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { hasPermission } from '@/lib/rbac';
import { recalculateUserLedgerBalances } from '@/lib/user-ledger';

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
        purchasePrice: true,
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

    // Calculate already-paid amount per shipment for this payment type.
    // This keeps partial/second/third payments accurate even with legacy ledger data.
    const existingCredits = await prisma.ledgerEntry.groupBy({
      by: ['shipmentId'],
      where: {
        shipmentId: { in: validatedData.shipmentIds },
        type: 'CREDIT',
        transactionInfoType: validatedData.transactionInfoType,
      },
      _sum: {
        amount: true,
      },
    });

    const paidByShipmentId = new Map<string, number>();
    for (const credit of existingCredits) {
      if (credit.shipmentId) {
        paidByShipmentId.set(credit.shipmentId, credit._sum.amount || 0);
      }
    }

    const shipmentDueMap = new Map<string, number>();
    let totalRemainingDue = 0;
    for (const shipment of shipments) {
      const totalPurchaseDue = Math.max(0, shipment.purchasePrice ?? shipment.price ?? 0);
      const alreadyPaid = paidByShipmentId.get(shipment.id) || 0;
      const shipmentDue = Math.max(0, totalPurchaseDue - alreadyPaid);
      shipmentDueMap.set(shipment.id, shipmentDue);
      totalRemainingDue += shipmentDue;
    }

    // Get current balance for the user
    const latestEntry = await prisma.ledgerEntry.findFirst({
      where: { userId: validatedData.userId },
      orderBy: { transactionDate: 'desc' },
      select: { balance: true },
    });

    const currentBalance = latestEntry?.balance || 0;

    // Balance sign convention: positive balance = customer owes money (more DEBIT than CREDIT),
    // negative balance = customer has pre-deposited credit (more CREDIT than DEBIT).
    // Shipment purchase payment is a DEBIT — customer is being charged for the car purchase.
    const newBalance = currentBalance + validatedData.amount;

    // Create a DEBIT ledger entry — recording the shipment purchase charge on the customer
    const shipmentInfo = shipments
      .map((s) => s.vehicleVIN || `${s.vehicleMake || ''} ${s.vehicleModel || ''}`.trim() || s.id)
      .join(', ');
    const transactionInfoLabel = transactionInfoTypeLabels[validatedData.transactionInfoType];
    const description = `${transactionInfoLabel} charged for shipment(s): ${shipmentInfo}`;

    const entry = await prisma.ledgerEntry.create({
      data: {
        userId: validatedData.userId,
        description,
        type: 'DEBIT',
        transactionInfoType: validatedData.transactionInfoType,
        amount: validatedData.amount,
        balance: newBalance,
        createdBy: session.user.id as string,
        notes: validatedData.notes,
        metadata: {
          shipmentIds: validatedData.shipmentIds,
          paymentType: 'payment_received',
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

    // ⚡ Bolt: Collect all database mutations and run them in a single transaction
    // This reduces O(2N) sequential database roundtrips to 1 bulk operation.
    const ledgerEntryCreations = [];
    const completedShipmentIds: string[] = [];
    const pendingShipmentIds: string[] = [];

    for (const shipment of shipments) {
      if (remainingAmount <= 0) break;

      const shipmentDue = shipmentDueMap.get(shipment.id) || 0;

      if (shipmentDue > 0) {
        const paymentForShipment = Math.min(remainingAmount, shipmentDue);
        remainingAmount -= paymentForShipment;

        // Create a ledger entry specifically for this shipment to track payment allocation.
        // isPaymentAllocation: true marks these entries so they are excluded from the
        // user's running balance (the main CREDIT entry already handles the balance).
        // They are still included in the per-shipment amountDue calculation.
        ledgerEntryCreations.push({
          userId: validatedData.userId,
          shipmentId: shipment.id,
          description: `Purchase charge applied to ${shipment.vehicleVIN ? `VIN ${shipment.vehicleVIN}` : `shipment ${shipment.id || ''}`}`,
          type: 'DEBIT' as const,
          transactionInfoType: validatedData.transactionInfoType,
          amount: paymentForShipment,
          balance: newBalance,
          createdBy: session.user.id as string,
          notes: `Auto-applied from payment entry ${entry.id}`,
          metadata: {
            parentEntryId: entry.id,
            paymentType: 'applied',
            isPaymentAllocation: true,
          },
        });

        // Check if shipment is now fully paid
        const remainingAfterPayment = Math.max(0, shipmentDue - paymentForShipment);
        // When recording a purchase charge (DEBIT), mark the shipment as PENDING
        // (awaiting payment). It will become COMPLETED when credits offset the debit.
        pendingShipmentIds.push(shipment.id);

        updatedShipments.push({
          id: shipment.id,
          paymentStatus: 'PENDING',
          amountPaid: paymentForShipment,
          remainingDue: remainingAfterPayment,
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

    // Recalculate running balances so every entry reflects the correct balance.
    await recalculateUserLedgerBalances(prisma, validatedData.userId);

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
