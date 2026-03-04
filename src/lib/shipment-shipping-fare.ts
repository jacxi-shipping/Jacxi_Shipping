import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { recalculateCompanyLedgerBalances } from '@/lib/company-ledger';
import { recalculateUserLedgerBalances } from '@/lib/user-ledger';

type DbClient = Prisma.TransactionClient | typeof prisma;

const SHIPPING_FARE_REFERENCE_PREFIX = 'shipment-shipping-fare:';

export type SyncShipmentShippingFareInput = {
  shipmentId: string;
  userId: string;
  shippingCompanyId: string | null;
  amount: number | null;
  vehicleLabel: string;
  vehicleVIN?: string | null;
  actorUserId: string;
  shouldPost: boolean;
};

export async function syncShipmentShippingFareEntries(
  db: DbClient,
  input: SyncShipmentShippingFareInput
) {
  const fareReference = `${SHIPPING_FARE_REFERENCE_PREFIX}${input.shipmentId}`;

  const existingCompanyFareEntries = await db.companyLedgerEntry.findMany({
    where: {
      reference: fareReference,
      metadata: {
        path: ['isShipmentShippingFare'],
        equals: true,
      },
    },
    select: { id: true, companyId: true },
  });

  const hasExistingUserFareEntries = await db.ledgerEntry.findFirst({
    where: {
      shipmentId: input.shipmentId,
      metadata: {
        path: ['isShipmentShippingFare'],
        equals: true,
      },
    },
    select: { id: true },
  });

  if (hasExistingUserFareEntries) {
    await db.ledgerEntry.deleteMany({
      where: {
        shipmentId: input.shipmentId,
        metadata: {
          path: ['isShipmentShippingFare'],
          equals: true,
        },
      },
    });
  }

  if (existingCompanyFareEntries.length > 0) {
    await db.companyLedgerEntry.deleteMany({
      where: {
        id: {
          in: existingCompanyFareEntries.map((entry) => entry.id),
        },
      },
    });
  }

  if (input.shouldPost && input.shippingCompanyId && input.amount && input.amount > 0) {
    const vinSuffix = input.vehicleVIN ? ` (VIN: ${input.vehicleVIN})` : '';

    await db.ledgerEntry.create({
      data: {
        userId: input.userId,
        shipmentId: input.shipmentId,
        description: `Shipping fare for ${input.vehicleLabel}${vinSuffix}`,
        type: 'DEBIT',
        amount: input.amount,
        balance: 0,
        createdBy: input.actorUserId,
        notes: 'Auto-posted when shipment assigned to container',
        metadata: {
          isShipmentShippingFare: true,
          shipmentId: input.shipmentId,
          shippingCompanyId: input.shippingCompanyId,
        } as Prisma.InputJsonValue,
      },
    });

    await db.companyLedgerEntry.create({
      data: {
        companyId: input.shippingCompanyId,
        description: `Shipping fare income for ${input.vehicleLabel}${vinSuffix}`,
        type: 'CREDIT',
        amount: input.amount,
        balance: 0,
        category: 'Shipping Fare',
        reference: fareReference,
        notes: 'Auto-posted when shipment assigned to container',
        createdBy: input.actorUserId,
        metadata: {
          isShipmentShippingFare: true,
          shipmentId: input.shipmentId,
          userId: input.userId,
        } as Prisma.InputJsonValue,
      },
    });
  }

  await recalculateUserLedgerBalances(db, input.userId);

  const companyIdsToRecalculate = new Set(existingCompanyFareEntries.map((entry) => entry.companyId));
  if (input.shouldPost && input.shippingCompanyId) {
    companyIdsToRecalculate.add(input.shippingCompanyId);
  }

  for (const companyId of companyIdsToRecalculate) {
    await recalculateCompanyLedgerBalances(db, companyId);
  }
}
