import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/rbac';

function asMetadataRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function isPurchaseLedgerEntry(entry: {
  transactionInfoType: 'CAR_PAYMENT' | 'SHIPPING_PAYMENT' | 'STORAGE_PAYMENT' | null;
  metadata: unknown;
}) {
  const metadata = asMetadataRecord(entry.metadata);
  const isPaymentAllocation = metadata.isPaymentAllocation === true;

  if (isPaymentAllocation) {
    return metadata.paymentCategory === 'PURCHASE_PRICE' || entry.transactionInfoType === 'CAR_PAYMENT';
  }

  return (
    metadata.isShipmentPurchasePrice === true ||
    metadata.paymentCategory === 'PURCHASE_PRICE' ||
    entry.transactionInfoType === 'CAR_PAYMENT'
  );
}

/**
 * GET /api/invoices
 * Get all invoices (admin) or user's invoices (regular user)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');
    const containerId = searchParams.get('containerId');
    const shipmentId = searchParams.get('shipmentId');
    const search = (searchParams.get('search') || '').trim();
    
    // Parse pagination parameters
    const limit = Math.min(parseInt(searchParams.get('limit') || '25'), 1000); // Max 1000
    const offset = parseInt(searchParams.get('offset') || '0');

    // Check if user is admin
    const canReadAllInvoices = hasPermission(session.user?.role, 'invoices:manage');

    // Build base where clause used for the overall invoice count.
    const baseWhere: any = {
      AND: [
        {
          OR: [
            { shipmentId: { not: null } },
            { containerId: { not: null } },
          ],
        },
      ],
    };

    if (!canReadAllInvoices) {
      baseWhere.AND.push({ userId: session.user.id });
    } else if (userId) {
      baseWhere.AND.push({ userId });
    }

    // Build where clause
    const where: any = {
      AND: [...baseWhere.AND],
    };

    if (status) {
      where.AND.push({ status });
    }

    if (containerId) {
      where.AND.push({ containerId });
    }

    if (shipmentId) {
      where.AND.push({ shipmentId });
    }

    if (search) {
      where.AND.push({
        OR: [
          { invoiceNumber: { contains: search, mode: 'insensitive' } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
          { user: { name: { contains: search, mode: 'insensitive' } } },
          { container: { containerNumber: { contains: search, mode: 'insensitive' } } },
          { shipment: { vehicleVIN: { contains: search, mode: 'insensitive' } } },
          { shipment: { vehicleMake: { contains: search, mode: 'insensitive' } } },
          { shipment: { vehicleModel: { contains: search, mode: 'insensitive' } } },
        ],
      });
    }

    // Get invoices
    const [invoices, total, totalAll] = await Promise.all([
      prisma.userInvoice.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          container: {
            select: {
              id: true,
              containerNumber: true,
              status: true,
            },
          },
          shipment: {
            select: {
              id: true,
              vehicleYear: true,
              vehicleMake: true,
              vehicleModel: true,
              vehicleVIN: true,
              vehicleColor: true,
              vehicleType: true,
              paymentStatus: true,
            },
          },
          lineItems: {
            include: {
              shipment: {
                select: {
                  id: true,
                  vehicleMake: true,
                  vehicleModel: true,
                  vehicleYear: true,
                  vehicleVIN: true,
                },
              },
            },
          },
          _count: {
            select: {
              lineItems: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      prisma.userInvoice.count({ where }),
      prisma.userInvoice.count({ where: baseWhere }),
    ]);

    const allInvoiceShipmentIds = Array.from(
      new Set(
        invoices
          .flatMap((invoice) => invoice.lineItems.map((lineItem) => lineItem.shipmentId))
          .filter((shipmentId): shipmentId is string => Boolean(shipmentId))
      )
    );
    const allInvoiceUserIds = Array.from(new Set(invoices.map((invoice) => invoice.userId)));

    const purchaseLedgerEntries = allInvoiceShipmentIds.length
      ? await prisma.ledgerEntry.findMany({
          where: {
            shipmentId: { in: allInvoiceShipmentIds },
            userId: { in: allInvoiceUserIds },
          },
          select: {
            userId: true,
            shipmentId: true,
            type: true,
            amount: true,
            transactionInfoType: true,
            metadata: true,
          },
        })
      : [];

    const purchaseLedgerByUserShipment = new Map<string, typeof purchaseLedgerEntries>();
    for (const entry of purchaseLedgerEntries) {
      if (!entry.shipmentId) continue;
      const key = `${entry.userId}::${entry.shipmentId}`;
      const existingEntries = purchaseLedgerByUserShipment.get(key) || [];
      existingEntries.push(entry);
      purchaseLedgerByUserShipment.set(key, existingEntries);
    }

    const invoicesWithPurchasePaidStatus = invoices.map((invoice) => {
      const purchaseLineItemTotal = invoice.lineItems
        .filter((lineItem) => lineItem.type === 'PURCHASE_PRICE' || lineItem.type === 'VEHICLE_PRICE')
        .reduce((sum, lineItem) => sum + lineItem.amount, 0);

      const shipmentIds = Array.from(
        new Set(
          invoice.lineItems
            .map((lineItem) => lineItem.shipmentId)
            .filter((shipmentId): shipmentId is string => Boolean(shipmentId))
        )
      );

      const purchaseLedgerTotals = shipmentIds.reduce(
        (totals, shipmentId) => {
          const key = `${invoice.userId}::${shipmentId}`;
          const entries = purchaseLedgerByUserShipment.get(key) || [];

          for (const entry of entries) {
            if (!isPurchaseLedgerEntry(entry)) {
              continue;
            }

            if (entry.type === 'DEBIT') {
              totals.debit += entry.amount;
            }

            if (entry.type === 'CREDIT') {
              totals.credit += entry.amount;
            }
          }

          return totals;
        },
        { debit: 0, credit: 0 }
      );

      const purchasePaymentEpsilon = 0.001;
      const isPurchasePriceFullyPaid =
        purchaseLineItemTotal > 0 &&
        (
          purchaseLedgerTotals.credit >= purchaseLineItemTotal - purchasePaymentEpsilon ||
          (purchaseLedgerTotals.debit > 0 &&
            Math.abs(purchaseLedgerTotals.debit - purchaseLedgerTotals.credit) <= purchasePaymentEpsilon)
        );

      const hasRecordedPayment =
        purchaseLineItemTotal > 0 &&
        (invoice.status === 'PAID' || invoice.shipment?.paymentStatus === 'COMPLETED');
      const purchasePricePaidAmount =
        isPurchasePriceFullyPaid || hasRecordedPayment ? purchaseLineItemTotal : 0;

      return {
        ...invoice,
        purchasePricePaidAmount,
      };
    });

    return NextResponse.json({
      invoices: invoicesWithPurchasePaidStatus,
      pagination: {
        total,
        totalAll,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });

  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}
