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

    const shipmentLedgerEntries = await prisma.ledgerEntry.findMany({
      where: {
        shipmentId: { in: validatedData.shipmentIds },
      },
      select: {
        shipmentId: true,
        type: true,
        amount: true,
      },
    });

    const shipmentDueMap = new Map<string, number>();
    for (const shipment of shipments) {
      const totals = shipmentLedgerEntries.reduce(
        (accumulator, entry) => {
          if (entry.shipmentId !== shipment.id) {
            return accumulator;
          }

          if (entry.type === 'DEBIT') {
            accumulator.debit += entry.amount;
          } else if (entry.type === 'CREDIT') {
            accumulator.credit += entry.amount;
          }

          return accumulator;
        },
        { debit: 0, credit: 0 },
      );

      const shipmentDue = Math.max(0, totals.debit - totals.credit);
      shipmentDueMap.set(shipment.id, shipmentDue);
    }

    const totalRemainingDue = Array.from(shipmentDueMap.values()).reduce((sum, value) => sum + value, 0);
    if (totalRemainingDue <= 0.001) {
      return NextResponse.json(
        { error: 'Selected shipment does not have any outstanding balance to pay' },
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

    // Balance sign convention: positive balance = customer owes money (more DEBIT than CREDIT),
    // negative balance = customer has pre-deposited credit (more CREDIT than DEBIT).
    // A received payment must reduce what the customer owes, so it posts as CREDIT.
    const newBalance = currentBalance - validatedData.amount;

    // Create a CREDIT ledger entry — recording the payment received from the customer.
    const shipmentInfo = shipments
      .map((s) => s.vehicleVIN || `${s.vehicleMake || ''} ${s.vehicleModel || ''}`.trim() || s.id)
      .join(', ');
    const transactionInfoLabel = transactionInfoTypeLabels[validatedData.transactionInfoType];
    const description = `${transactionInfoLabel} received for shipment(s): ${shipmentInfo}`;

    const result = await prisma.$transaction(async (tx) => {
      const entry = await tx.ledgerEntry.create({
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

      let remainingAmount = validatedData.amount;
      const updatedShipments = [];
      const ledgerEntryCreations = [];
      const completedShipmentIds: string[] = [];
      const pendingShipmentIds: string[] = [];

      for (const shipment of shipments) {
        if (remainingAmount <= 0) break;

        const shipmentDue = shipmentDueMap.get(shipment.id) || 0;

        if (shipmentDue > 0) {
          const paymentForShipment = Math.min(remainingAmount, shipmentDue);
          remainingAmount -= paymentForShipment;

          ledgerEntryCreations.push({
            userId: validatedData.userId,
            shipmentId: shipment.id,
            description: `Payment applied to ${shipment.vehicleVIN ? `VIN ${shipment.vehicleVIN}` : `shipment ${shipment.id || ''}`}`,
            type: 'CREDIT' as const,
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

          const remainingAfterPayment = Math.max(0, shipmentDue - paymentForShipment);
          if (remainingAfterPayment <= 0.001) {
            completedShipmentIds.push(shipment.id);
          } else {
            pendingShipmentIds.push(shipment.id);
          }

          updatedShipments.push({
            id: shipment.id,
            paymentStatus: remainingAfterPayment <= 0.001 ? 'COMPLETED' : 'PENDING',
            amountPaid: paymentForShipment,
            remainingDue: remainingAfterPayment,
          });
        }
      }

      if (ledgerEntryCreations.length > 0) {
        await tx.ledgerEntry.createMany({
          data: ledgerEntryCreations,
        });
      }

      if (completedShipmentIds.length > 0) {
        await tx.shipment.updateMany({
          where: { id: { in: completedShipmentIds } },
          data: { paymentStatus: 'COMPLETED' },
        });

        await tx.shipmentCharge.updateMany({
          where: {
            shipmentId: { in: completedShipmentIds },
            status: {
              not: 'VOID',
            },
          },
          data: {
            status: 'PAID',
            paidAt: new Date(),
          },
        });

        const pendingExpenseEntries = await tx.ledgerEntry.findMany({
          where: {
            userId: validatedData.userId,
            shipmentId: { in: completedShipmentIds },
            type: 'DEBIT',
            metadata: {
              path: ['pendingInvoice'],
              equals: true,
            },
          },
          select: {
            id: true,
            metadata: true,
          },
        });

        for (const pendingExpenseEntry of pendingExpenseEntries) {
          const metadata = (pendingExpenseEntry.metadata ?? {}) as Record<string, unknown>;
          await tx.ledgerEntry.update({
            where: { id: pendingExpenseEntry.id },
            data: {
              metadata: {
                ...metadata,
                pendingInvoice: false,
                paymentMethod: validatedData.paymentMethod,
                paymentReference: entry.id,
              },
            },
          });
        }

        await tx.userInvoice.updateMany({
          where: {
            shipmentId: { in: completedShipmentIds },
            status: {
              in: ['DRAFT', 'PENDING', 'SENT', 'OVERDUE'],
            },
          },
          data: {
            status: 'PAID',
            paidDate: new Date(),
            paymentMethod: validatedData.paymentMethod,
            paymentReference: entry.id,
          },
        });
      }

      if (pendingShipmentIds.length > 0) {
        await tx.shipment.updateMany({
          where: { id: { in: pendingShipmentIds } },
          data: { paymentStatus: 'PENDING' },
        });
      }

      await recalculateUserLedgerBalances(tx, validatedData.userId);

      return {
        entry,
        updatedShipments,
        remainingAmount,
      };
    });

    return NextResponse.json({
      entry: result.entry,
      updatedShipments: result.updatedShipments,
      remainingAmount: result.remainingAmount,
      message: result.remainingAmount > 0 
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
