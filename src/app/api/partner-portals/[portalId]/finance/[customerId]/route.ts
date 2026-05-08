import { NextRequest, NextResponse } from 'next/server';
import { routeDeps } from '@/lib/route-deps';
import {
  canManagePartnerPortals,
  canReadPartnerPortalCustomers,
  canReadPartnerPortalShipments,
  getPartnerPortalMembership,
  getPartnerPortalOrThrow,
} from '@/lib/partner-portals';

const outstandingInvoiceStatuses = new Set(['PENDING', 'SENT', 'OVERDUE']);

function formatShipmentReference(shipment: {
  vehicleYear: number | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleVIN: string | null;
}) {
  const label = [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel].filter(Boolean).join(' ').trim();

  if (shipment.vehicleVIN && label) {
    return `${label} (${shipment.vehicleVIN})`;
  }

  return shipment.vehicleVIN || label || 'Shipment';
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ portalId: string; customerId: string }> },
) {
  try {
    const session = await routeDeps.auth();
    const { portalId, customerId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const portal = await getPartnerPortalOrThrow(portalId);

    if (!portal) {
      return NextResponse.json({ error: 'Partner portal not found' }, { status: 404 });
    }

    const membership = await getPartnerPortalMembership(portalId, session.user.id);
    const hasInternalAccess = canManagePartnerPortals(session.user.role)
      || canReadPartnerPortalCustomers(session.user.role)
      || canReadPartnerPortalShipments(session.user.role);

    if (!membership && !hasInternalAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const customer = await routeDeps.prisma.partnerCustomer.findFirst({
      where: {
        id: customerId,
        portalId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        city: true,
        country: true,
        notes: true,
        createdAt: true,
      },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Portal customer not found' }, { status: 404 });
    }

    const assignments = await routeDeps.prisma.partnerShipmentAssignment.findMany({
      where: {
        portalId,
        partnerCustomerId: customerId,
      },
      orderBy: { assignedAt: 'desc' },
      select: {
        id: true,
        assignedAt: true,
        notes: true,
        shipment: {
          select: {
            id: true,
            paymentStatus: true,
            vehicleYear: true,
            vehicleMake: true,
            vehicleModel: true,
            vehicleVIN: true,
            invoices: {
              where: { status: { not: 'CANCELLED' } },
              orderBy: [{ issueDate: 'desc' }, { createdAt: 'desc' }],
              select: {
                id: true,
                invoiceNumber: true,
                status: true,
                issueDate: true,
                dueDate: true,
                paidDate: true,
                total: true,
                paymentMethod: true,
                paymentReference: true,
                lineItems: {
                  select: {
                    id: true,
                    description: true,
                    amount: true,
                    shipmentId: true,
                  },
                },
              },
            },
            charges: {
              where: {
                invoiceId: null,
                status: {
                  in: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED'],
                },
              },
              orderBy: [{ billableAt: 'asc' }, { createdAt: 'asc' }],
              select: {
                id: true,
                chargeCode: true,
                category: true,
                description: true,
                billingMilestone: true,
                status: true,
                totalAmount: true,
                billableAt: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    const today = new Date();
    const aging = {
      current: { count: 0, amount: 0 },
      days1to30: { count: 0, amount: 0 },
      days31to60: { count: 0, amount: 0 },
      days61to90: { count: 0, amount: 0 },
      days90plus: { count: 0, amount: 0 },
    };

    const invoices = assignments.flatMap((assignment) => {
      const shipmentReference = formatShipmentReference(assignment.shipment);
      return assignment.shipment.invoices.map((invoice) => {
        const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;
        const rawDaysOverdue = dueDate
          ? Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
          : null;
        const daysOverdue = rawDaysOverdue !== null ? Math.max(0, rawDaysOverdue) : null;
        const isOutstanding = outstandingInvoiceStatuses.has(invoice.status);

        if (isOutstanding) {
          if (rawDaysOverdue === null || rawDaysOverdue < 0) {
            aging.current.count += 1;
            aging.current.amount += invoice.total;
          } else if (rawDaysOverdue <= 30) {
            aging.days1to30.count += 1;
            aging.days1to30.amount += invoice.total;
          } else if (rawDaysOverdue <= 60) {
            aging.days31to60.count += 1;
            aging.days31to60.amount += invoice.total;
          } else if (rawDaysOverdue <= 90) {
            aging.days61to90.count += 1;
            aging.days61to90.amount += invoice.total;
          } else {
            aging.days90plus.count += 1;
            aging.days90plus.amount += invoice.total;
          }
        }

        return {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
          total: invoice.total,
          issueDate: invoice.issueDate.toISOString(),
          dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : null,
          paidDate: invoice.paidDate ? invoice.paidDate.toISOString() : null,
          daysOverdue,
          paymentMethod: invoice.paymentMethod || null,
          paymentReference: invoice.paymentReference || null,
          shipmentId: assignment.shipment.id,
          shipmentReference,
          lineItemCount: invoice.lineItems.filter((lineItem) => !lineItem.shipmentId || lineItem.shipmentId === assignment.shipment.id).length,
        };
      });
    }).sort((left, right) => right.issueDate.localeCompare(left.issueDate));

    const unbilledCharges = assignments.flatMap((assignment) => {
      const shipmentReference = formatShipmentReference(assignment.shipment);
      return assignment.shipment.charges.map((charge) => ({
        id: charge.id,
        shipmentId: assignment.shipment.id,
        shipmentReference,
        chargeCode: charge.chargeCode,
        category: charge.category,
        description: charge.description,
        billingMilestone: charge.billingMilestone,
        status: charge.status,
        totalAmount: charge.totalAmount,
        billableAt: charge.billableAt ? charge.billableAt.toISOString() : null,
        createdAt: charge.createdAt.toISOString(),
      }));
    });

    const summary = {
      linkedShipmentCount: assignments.length,
      invoiceCount: invoices.length,
      openInvoiceCount: invoices.filter((invoice) => outstandingInvoiceStatuses.has(invoice.status)).length,
      overdueInvoiceCount: invoices.filter((invoice) => outstandingInvoiceStatuses.has(invoice.status) && (invoice.daysOverdue ?? 0) > 0).length,
      outstandingAmount: invoices.filter((invoice) => outstandingInvoiceStatuses.has(invoice.status)).reduce((sum, invoice) => sum + invoice.total, 0),
      overdueAmount: invoices.filter((invoice) => outstandingInvoiceStatuses.has(invoice.status) && (invoice.daysOverdue ?? 0) > 0).reduce((sum, invoice) => sum + invoice.total, 0),
      paidAmount: invoices.filter((invoice) => invoice.status === 'PAID').reduce((sum, invoice) => sum + invoice.total, 0),
      unbilledAmount: unbilledCharges.reduce((sum, charge) => sum + charge.totalAmount, 0),
      unbilledChargeCount: unbilledCharges.length,
    };

    return NextResponse.json({
      portal,
      customer,
      summary,
      aging,
      invoices,
      unbilledCharges,
      shipments: assignments.map((assignment) => ({
        id: assignment.shipment.id,
        reference: formatShipmentReference(assignment.shipment),
        paymentStatus: assignment.shipment.paymentStatus,
        assignedAt: assignment.assignedAt.toISOString(),
        notes: assignment.notes,
      })),
    });
  } catch (error) {
    routeDeps.logger.error('Failed to fetch partner portal customer finance detail', error);
    return NextResponse.json({ error: 'Failed to fetch partner portal customer finance detail' }, { status: 500 });
  }
}
