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

    if (totalRemainingDue <= 0) {
      return NextResponse.json(
        { error: 'Selected shipment(s) are already fully paid.' },
        { status: 400 }
      );
    }

    if (validatedData.amount > totalRemainingDue) {
      return NextResponse.json(
        { error: `Amount exceeds remaining due. Maximum allowed is $${totalRemainingDue.toFixed(2)}.` },
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

    // A service payment is a DEBIT — it consumes the customer's available credit.
    // Credit (depositing money) builds up the balance. Debit (paying for services) uses it.
    const availableCredit = currentBalance < 0 ? -currentBalance : 0;
    if (validatedData.amount > availableCredit) {
      return NextResponse.json(
        { error: `Insufficient credit. Customer has $${availableCredit.toFixed(2)} available. Please deposit more credit first.` },
        { status: 400 }
      );
    }

    // DEBIT adds to the balance (moves it toward 0 / positive), consuming the customer's credit.
    const newBalance = currentBalance + validatedData.amount;

    // Create a DEBIT ledger entry — customer is spending their account credit on a service
    const shipmentInfo = shipments
      .map((s) => s.vehicleVIN || `${s.vehicleMake || ''} ${s.vehicleModel || ''}`.trim() || s.id)
      .join(', ');
    const transactionInfoLabel = transactionInfoTypeLabels[validatedData.transactionInfoType];
    const description = `${transactionInfoLabel} payment applied to shipment(s): ${shipmentInfo}`;

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
          paymentType: 'service_payment',
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
        const remainingAfterPayment = Math.max(0, shipmentDue - paymentForShipment);
        const isPaid = remainingAfterPayment <= 0;

        if (isPaid) {
          completedShipmentIds.push(shipment.id);
        } else {
          pendingShipmentIds.push(shipment.id);
        }

        updatedShipments.push({
          id: shipment.id,
          paymentStatus: isPaid ? 'COMPLETED' : 'PENDING',
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
