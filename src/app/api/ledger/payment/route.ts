import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { hasPermission } from '@/lib/rbac';
import { recalculateUserLedgerBalances } from '@/lib/user-ledger';
import { TransactionInfoType } from '@prisma/client';
import { sendLedgerTransactionEmail } from '@/lib/email';

type PaymentCategory = 'PURCHASE_PRICE' | 'EXPENSES';

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function resolveTransactionInfoType(paymentCategory: PaymentCategory): TransactionInfoType {
  return paymentCategory === 'PURCHASE_PRICE' ? 'CAR_PAYMENT' : 'SHIPPING_PAYMENT';
}

function matchesPaymentCategory(
  entry: {
    type: 'DEBIT' | 'CREDIT';
    transactionInfoType: 'CAR_PAYMENT' | 'SHIPPING_PAYMENT' | 'STORAGE_PAYMENT' | null;
    metadata: unknown;
  },
  paymentCategory: PaymentCategory,
) {
  const metadata = asRecord(entry.metadata);
  const isPaymentAllocation = metadata.isPaymentAllocation === true;

  if (paymentCategory === 'PURCHASE_PRICE') {
    if (isPaymentAllocation) {
      return metadata.paymentCategory === 'PURCHASE_PRICE' || entry.transactionInfoType === 'CAR_PAYMENT';
    }

    return metadata.isShipmentPurchasePrice === true || entry.transactionInfoType === 'CAR_PAYMENT';
  }

  if (isPaymentAllocation) {
    return metadata.paymentCategory === 'EXPENSES' || entry.transactionInfoType === 'SHIPPING_PAYMENT' || entry.transactionInfoType === 'STORAGE_PAYMENT';
  }

  return (
    metadata.isExpense === true ||
    metadata.pendingInvoice === true ||
    typeof metadata.expenseType === 'string'
  );
}

// Schema for recording a payment
const recordPaymentSchema = z.object({
  userId: z.string(),
  shipmentIds: z.array(z.string()).min(1),
  amount: z.number().positive(),
  paymentCategory: z.enum(['PURCHASE_PRICE', 'EXPENSES']).default('PURCHASE_PRICE'),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'CHECK', 'CREDIT_CARD', 'WIRE']).optional().default('CASH'),
  notes: z.string().optional(),
});

const paymentCategoryLabels: Record<PaymentCategory, string> = {
  PURCHASE_PRICE: 'Car Purchase Price',
  EXPENSES: 'Expenses',
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
    const transactionInfoType = resolveTransactionInfoType(validatedData.paymentCategory);

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
        transactionInfoType: true,
        metadata: true,
      },
    });

    const shipmentDueMap = new Map<string, number>();
    const shipmentOverallDueMap = new Map<string, number>();

    // ⚡ Bolt: Reduced O(N * M) nested loops to O(N + M) by aggregating ledger entries in a single pass
    // and storing them in dictionaries for O(1) lookups during shipment iteration.
    const totalsMap = new Map<string, { debit: number; credit: number }>();
    const categoryTotalsMap = new Map<string, { debit: number; credit: number }>();

    for (const entry of shipmentLedgerEntries) {
      if (!entry.shipmentId) continue;

      const shipmentId = entry.shipmentId;

      let totals = totalsMap.get(shipmentId);
      if (!totals) {
        totals = { debit: 0, credit: 0 };
        totalsMap.set(shipmentId, totals);
      }
      if (entry.type === 'DEBIT') totals.debit += entry.amount;
      else if (entry.type === 'CREDIT') totals.credit += entry.amount;

      if (matchesPaymentCategory(entry, validatedData.paymentCategory)) {
        let categoryTotals = categoryTotalsMap.get(shipmentId);
        if (!categoryTotals) {
          categoryTotals = { debit: 0, credit: 0 };
          categoryTotalsMap.set(shipmentId, categoryTotals);
        }
        if (entry.type === 'DEBIT') categoryTotals.debit += entry.amount;
        else if (entry.type === 'CREDIT') categoryTotals.credit += entry.amount;
      }
    }

    for (const shipment of shipments) {
      const totals = totalsMap.get(shipment.id) || { debit: 0, credit: 0 };
      const categoryTotals = categoryTotalsMap.get(shipment.id) || { debit: 0, credit: 0 };

      shipmentDueMap.set(shipment.id, Math.max(0, categoryTotals.debit - categoryTotals.credit));
      shipmentOverallDueMap.set(shipment.id, Math.max(0, totals.debit - totals.credit));
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
    const paymentCategoryLabel = paymentCategoryLabels[validatedData.paymentCategory];
    const description = `${paymentCategoryLabel} payment received for shipment(s): ${shipmentInfo}`;

    const result = await prisma.$transaction(async (tx) => {
      const entry = await tx.ledgerEntry.create({
        data: {
          userId: validatedData.userId,
          description,
          type: 'CREDIT',
          transactionInfoType,
          amount: validatedData.amount,
          balance: newBalance,
          createdBy: session.user.id as string,
          notes: validatedData.notes,
          metadata: {
            shipmentIds: validatedData.shipmentIds,
            paymentType: 'payment_received',
            paymentCategory: validatedData.paymentCategory,
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
      const settledExpenseShipmentIds: string[] = [];
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
            transactionInfoType,
            amount: paymentForShipment,
            balance: newBalance,
            createdBy: session.user.id as string,
            notes: `Auto-applied from payment entry ${entry.id}`,
            metadata: {
              parentEntryId: entry.id,
              paymentType: 'applied',
              paymentCategory: validatedData.paymentCategory,
              isPaymentAllocation: true,
            },
          });

          const remainingAfterCategoryPayment = Math.max(0, shipmentDue - paymentForShipment);
          const overallRemainingAfterPayment = Math.max(
            0,
            (shipmentOverallDueMap.get(shipment.id) || 0) - paymentForShipment,
          );

          if (validatedData.paymentCategory === 'EXPENSES' && remainingAfterCategoryPayment <= 0.001) {
            settledExpenseShipmentIds.push(shipment.id);
          }

          if (overallRemainingAfterPayment <= 0.001) {
            completedShipmentIds.push(shipment.id);
          } else {
            pendingShipmentIds.push(shipment.id);
          }

          updatedShipments.push({
            id: shipment.id,
            paymentStatus: overallRemainingAfterPayment <= 0.001 ? 'COMPLETED' : 'PENDING',
            amountPaid: paymentForShipment,
            remainingDue: overallRemainingAfterPayment,
          });
        }
      }

      if (ledgerEntryCreations.length > 0) {
        await tx.ledgerEntry.createMany({
          data: ledgerEntryCreations,
        });
      }

      if (settledExpenseShipmentIds.length > 0) {
        await tx.shipmentCharge.updateMany({
          where: {
            shipmentId: { in: settledExpenseShipmentIds },
            category: {
              not: 'PURCHASE',
            },
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
            shipmentId: { in: settledExpenseShipmentIds },
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
          const metadata = asRecord(pendingExpenseEntry.metadata);
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

    if (result.entry.user?.email) {
      void sendLedgerTransactionEmail({
        to: result.entry.user.email,
        customerName: result.entry.user.name,
        direction: result.entry.type,
        amount: result.entry.amount,
        description: result.entry.description,
        balance: result.entry.balance,
        transactionDate: result.entry.transactionDate,
        notes: validatedData.notes,
      });
    }

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
