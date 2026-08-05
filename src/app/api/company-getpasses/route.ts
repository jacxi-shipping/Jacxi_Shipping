import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/rbac';
import { calculateCompanyPaymentStatus } from '@/lib/company-payment-status';

function asRecord(value: Prisma.JsonValue | null): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (
      !hasPermission(session.user.role, 'workflow:move') ||
      !hasPermission(session.user.role, 'shipments:manage')
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const shipments = await prisma.shipment.findMany({
      where: { companyGetpassStartedAt: { not: null } },
      select: {
        id: true,
        vehicleType: true,
        vehicleMake: true,
        vehicleModel: true,
        vehicleYear: true,
        vehicleVIN: true,
        status: true,
        companyGetpassStartedAt: true,
        shippingCompany: {
          select: {
            id: true,
            name: true,
          },
        },
        container: {
          select: {
            id: true,
            containerNumber: true,
            company: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        ledgerEntries: {
          select: {
            type: true,
            amount: true,
            metadata: true,
          },
        },
      },
      orderBy: { companyGetpassStartedAt: 'desc' },
    });

    const companyLedgerEntries = await prisma.companyLedgerEntry.findMany({
      where: {
        OR: shipments.flatMap((shipment) => [
          { metadata: { path: ['shipmentId'], equals: shipment.id } },
          ...(shipment.container?.id ? [{ metadata: { path: ['containerId'], equals: shipment.container.id } }] : []),
        ]),
      },
      select: { type: true, amount: true, metadata: true },
    });

    const shipmentsWithExpenses = shipments.map(({ ledgerEntries, ...shipment }) => {
      let shippingExpenses = 0;
      let dispatchExpenses = 0;

      for (const entry of ledgerEntries) {
        if (entry.type !== 'DEBIT') {
          continue;
        }

        const metadata = asRecord(entry.metadata);
        const isExpense = metadata.isExpense === true || metadata.isExpense === 'true';
        const expenseSource = typeof metadata.expenseSource === 'string' ? metadata.expenseSource.toUpperCase() : null;

        if (!isExpense && expenseSource !== 'SHIPMENT' && expenseSource !== 'DISPATCH') {
          continue;
        }

        if (expenseSource === 'DISPATCH' || typeof metadata.dispatchId === 'string') {
          dispatchExpenses += entry.amount;
        } else if (expenseSource === 'SHIPMENT' || typeof metadata.containerId === 'string') {
          shippingExpenses += entry.amount;
        }
      }

      return {
        ...shipment,
        shippingCompany: shipment.shippingCompany || shipment.container?.company || null,
        companyPayment: calculateCompanyPaymentStatus(
          companyLedgerEntries.filter((entry) => {
            const metadata = asRecord(entry.metadata);
            return metadata.shipmentId === shipment.id ||
              Boolean(shipment.container?.id && metadata.containerId === shipment.container.id);
          })
        ),
        expenses: {
          shipping: shippingExpenses,
          dispatch: dispatchExpenses,
          total: shippingExpenses + dispatchExpenses,
        },
      };
    });

    return NextResponse.json({ shipments: shipmentsWithExpenses });
  } catch (error) {
    console.error('Error fetching Company Getpasses:', error);
    return NextResponse.json({ error: 'Failed to fetch Company Getpasses' }, { status: 500 });
  }
}