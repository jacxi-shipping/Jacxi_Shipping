import { NextRequest, NextResponse } from 'next/server';
import { Prisma, ShipmentSimpleStatus } from '@prisma/client';
import { routeDeps } from '@/lib/route-deps';

const COMPANY_RELEASED_AUDIT_ACTION = 'COMPANY_RELEASED';

function getStringMetadataValue(metadata: Prisma.JsonValue | null | undefined, key: string) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }

  const value = (metadata as Prisma.JsonObject)[key];
  return typeof value === 'string' ? value : null;
}

function getLedgerMetadata(metadata: Prisma.JsonValue | null | undefined) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }

  return metadata as Prisma.JsonObject;
}

function isShipmentCompanyLedgerExpense(entry: {
  category: string | null;
  reference: string | null;
  metadata: Prisma.JsonValue | null;
}) {
  const category = (entry.category || '').toLowerCase();
  const reference = (entry.reference || '').toLowerCase();
  const metadata = getLedgerMetadata(entry.metadata);

  if (!metadata) {
    return false;
  }

  if (
    metadata.isContainerExpense === true ||
    metadata.isDispatchExpense === true ||
    metadata.isTransitExpense === true
  ) {
    return false;
  }

  const explicitSource =
    typeof metadata.expenseSource === 'string' ? metadata.expenseSource.toUpperCase() : null;

  if (explicitSource && explicitSource !== 'SHIPMENT') {
    return false;
  }

  return (
    category.includes('shipping fare') ||
    metadata.isExpenseRecovery === true ||
    metadata.isShipmentShippingFare === true ||
    reference.startsWith('shipment-expense:') ||
    reference.startsWith('shipment-shipping-fare:') ||
    explicitSource === 'SHIPMENT'
  );
}

function isDispatchCompanyLedgerExpense(entry: {
  category: string | null;
  reference: string | null;
  metadata: Prisma.JsonValue | null;
}) {
  const category = (entry.category || '').toLowerCase();
  const reference = (entry.reference || '').toLowerCase();
  const metadata = getLedgerMetadata(entry.metadata);

  if (!metadata) {
    return false;
  }

  const explicitSource =
    typeof metadata.expenseSource === 'string' ? metadata.expenseSource.toUpperCase() : null;

  if (metadata.isDispatchExpense === true) {
    return true;
  }

  if (explicitSource === 'DISPATCH') {
    return true;
  }

  return category.includes('dispatch expense') || reference.startsWith('dispatch-expense:');
}

export async function GET(request: NextRequest) {
  try {
    const session = await routeDeps.auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canReadAllShipments = routeDeps.hasPermission(session.user?.role, 'shipments:read_all');
    const canManageShipments = routeDeps.hasPermission(session.user?.role, 'shipments:manage');
    const canManageTransits = routeDeps.hasPermission(session.user?.role, 'transits:manage');

    if (!canReadAllShipments && !canManageShipments && !canManageTransits) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query')?.trim() || '';
    const companyId = searchParams.get('companyId')?.trim() || '';
    const status = searchParams.get('status')?.trim() || '';
    const dateFrom = searchParams.get('dateFrom')?.trim() || '';
    const dateTo = searchParams.get('dateTo')?.trim() || '';
    const page = Number.parseInt(searchParams.get('page') || '1', 10);
    const limit = Number.parseInt(searchParams.get('limit') || '20', 10);
    const safePage = Number.isFinite(page) && page > 0 ? page : 1;
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 20;
    const skip = (safePage - 1) * safeLimit;

    const where: Prisma.ShipmentWhereInput = {
      shippingCompanyId: { not: null },
      auditLogs: {
        some: {
          action: COMPANY_RELEASED_AUDIT_ACTION,
        },
      },
    };

    const andFilters: Prisma.ShipmentWhereInput[] = [];

    if (query) {
      andFilters.push({
        OR: [
          { vehicleType: { contains: query, mode: 'insensitive' } },
          { vehicleMake: { contains: query, mode: 'insensitive' } },
          { vehicleModel: { contains: query, mode: 'insensitive' } },
          { vehicleVIN: { contains: query, mode: 'insensitive' } },
          { lotNumber: { contains: query, mode: 'insensitive' } },
          { auctionName: { contains: query, mode: 'insensitive' } },
          { user: { is: { name: { contains: query, mode: 'insensitive' } } } },
          { user: { is: { email: { contains: query, mode: 'insensitive' } } } },
          { shippingCompany: { is: { name: { contains: query, mode: 'insensitive' } } } },
          { transit: { is: { referenceNumber: { contains: query, mode: 'insensitive' } } } },
          {
            auditLogs: {
              some: {
                action: COMPANY_RELEASED_AUDIT_ACTION,
                description: { contains: query, mode: 'insensitive' },
              },
            },
          },
        ],
      });
    }

    if (companyId) {
      andFilters.push({ shippingCompanyId: companyId });
    }

    if (status && Object.values(ShipmentSimpleStatus).includes(status as ShipmentSimpleStatus)) {
      andFilters.push({ status: status as ShipmentSimpleStatus });
    }

    if (dateFrom || dateTo) {
      andFilters.push({
        auditLogs: {
          some: {
            action: COMPANY_RELEASED_AUDIT_ACTION,
            timestamp: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59.999Z`) } : {}),
            },
          },
        },
      });
    }

    if (andFilters.length > 0) {
      where.AND = andFilters;
    }

    const [shipments, total, groupedStatuses] = await Promise.all([
      routeDeps.prisma.shipment.findMany({
        where,
        select: {
          id: true,
          shippingCompanyId: true,
          vehicleType: true,
          vehicleMake: true,
          vehicleModel: true,
          vehicleYear: true,
          vehicleVIN: true,
          vehicleColor: true,
          lotNumber: true,
          auctionName: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          price: true,
          purchasePrice: true,
          paymentStatus: true,
          serviceType: true,
          internalNotes: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          container: {
            select: {
              id: true,
              containerNumber: true,
              trackingNumber: true,
              loadingPort: true,
              destinationPort: true,
              status: true,
            },
          },
          transit: {
            select: {
              id: true,
              referenceNumber: true,
              status: true,
              origin: true,
              destination: true,
              dispatchDate: true,
              estimatedDelivery: true,
              actualDelivery: true,
            },
          },
          shippingCompany: {
            select: {
              id: true,
              name: true,
            },
          },
          dispatch: {
            select: {
              companyId: true,
            },
          },
          auditLogs: {
            where: {
              action: COMPANY_RELEASED_AUDIT_ACTION,
            },
            orderBy: [{ timestamp: 'desc' }],
            take: 1,
            select: {
              description: true,
              timestamp: true,
              metadata: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
        skip,
        take: safeLimit,
      }),
      routeDeps.prisma.shipment.count({ where }),
      routeDeps.prisma.shipment.groupBy({
        by: ['status'],
        where,
        _count: {
          status: true,
        },
      }),
    ]);

    const shipmentIds = shipments.map((shipment) => shipment.id);

    const companyLedgerEntries = shipmentIds.length
      ? await routeDeps.prisma.companyLedgerEntry.findMany({
          where: {
            OR: shipmentIds.map((shipmentId) => ({
              metadata: {
                path: ['shipmentId'],
                equals: shipmentId,
              },
            })),
          },
          select: {
            companyId: true,
            type: true,
            amount: true,
            category: true,
            reference: true,
            metadata: true,
          },
        })
      : [];

    const shipmentCompanyLedgerNetByKey = new Map<string, number>();

    for (const entry of companyLedgerEntries) {
      if (!isShipmentCompanyLedgerExpense(entry)) {
        continue;
      }

      const metadata = getLedgerMetadata(entry.metadata);
      const shipmentId = typeof metadata?.shipmentId === 'string' ? metadata.shipmentId : null;

      if (!shipmentId) {
        continue;
      }

      const mapKey = `${shipmentId}:${entry.companyId}`;
      const signedAmount = entry.type === 'DEBIT' ? entry.amount : -entry.amount;
      shipmentCompanyLedgerNetByKey.set(mapKey, (shipmentCompanyLedgerNetByKey.get(mapKey) ?? 0) + signedAmount);
    }

    const summary = groupedStatuses.reduce<Record<string, number>>((accumulator, item) => {
      accumulator[item.status] = item._count.status;
      return accumulator;
    }, {});

    const rows = shipments.map((shipment) => {
      const releaseLog = shipment.auditLogs[0] ?? null;
      const releasedAt =
        releaseLog?.timestamp?.toISOString() ?? shipment.transit?.dispatchDate?.toISOString() ?? null;
      const shippingCompanyLedgerExpense = shipment.shippingCompanyId
        ? Math.abs(shipmentCompanyLedgerNetByKey.get(`${shipment.id}:${shipment.shippingCompanyId}`) ?? 0)
        : 0;
      const shouldIncludeDispatchExpense =
        shipment.shippingCompanyId !== null && shipment.dispatch?.companyId === shipment.shippingCompanyId;
      const dispatchCompanyLedgerExpense = shouldIncludeDispatchExpense && shipment.shippingCompanyId
        ? Math.abs(
            companyLedgerEntries
              .filter((entry) => {
                if (entry.companyId !== shipment.shippingCompanyId) {
                  return false;
                }

                const metadata = getLedgerMetadata(entry.metadata);
                return metadata?.shipmentId === shipment.id && isDispatchCompanyLedgerExpense(entry);
              })
              .reduce((sum, entry) => sum + (entry.type === 'DEBIT' ? entry.amount : -entry.amount), 0),
          )
        : 0;
      const companyLedgerShippingExpense = shippingCompanyLedgerExpense + dispatchCompanyLedgerExpense;

      return {
        ...shipment,
        companyLedgerShippingExpense,
        releaseEvent: releaseLog
          ? {
              releasedAt,
              origin:
                getStringMetadataValue(releaseLog.metadata, 'origin') ?? shipment.transit?.origin ?? '',
              destination:
                getStringMetadataValue(releaseLog.metadata, 'destination') ??
                shipment.transit?.destination ??
                '',
              description: releaseLog.description,
            }
          : null,
        auditLogs: undefined,
      };
    });

    return NextResponse.json({
      shipments: rows,
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.max(1, Math.ceil(total / safeLimit)),
      },
      summary: {
        total,
        inTransitToDestination: summary.IN_TRANSIT_TO_DESTINATION ?? 0,
        delivered: summary.DELIVERED ?? 0,
        released: summary.RELEASED ?? 0,
      },
    });
  } catch (error) {
    console.error('Error fetching company released shipments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch company released shipments' },
      { status: 500 },
    );
  }
}
