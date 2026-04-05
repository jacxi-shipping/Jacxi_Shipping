import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { NotificationType, Prisma } from '@prisma/client';
import { createNotification } from '@/lib/notifications';
import { createInvoiceAuditLogs } from '@/lib/entity-audit-history';
import { z } from 'zod';
import { hasPermission } from '@/lib/rbac';
import { buildLinkedCompanyLedgerEntryMap } from '@/lib/company-ledger-links';

function normalizeShipmentRefInDescription(
  description: string,
  shipment?: { id: string; vehicleVIN: string | null }
) {
  if (!shipment?.id || !shipment.vehicleVIN) return description;
  return description
    .replace(new RegExp(`\\(Shipment\\s+${shipment.id}\\)`, 'gi'), `(VIN ${shipment.vehicleVIN})`)
    .replace(new RegExp(`Shipment\\s+${shipment.id}`, 'gi'), `VIN ${shipment.vehicleVIN}`)
    .replace(new RegExp(`shipment\\s+${shipment.id}`, 'g'), `VIN ${shipment.vehicleVIN}`);
}

function buildExpenseLineItemKey(shipmentId: string, description: string, amount: number) {
  return `${shipmentId}::${description.trim().toLowerCase()}::${amount.toFixed(2)}`;
}

/**
 * GET /api/invoices/[id]
 * Get a specific invoice
 */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const actorId = session.user?.id;
    if (!actorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canReadAllInvoices = hasPermission(session.user?.role, 'invoices:manage');

    const invoice = await prisma.userInvoice.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            country: true,
          },
        },
        container: {
          select: {
            id: true,
            containerNumber: true,
            trackingNumber: true,
            status: true,
            vesselName: true,
            loadingPort: true,
            destinationPort: true,
            estimatedArrival: true,
          },
        },
        lineItems: {
          include: {
            shipment: {
              select: {
                id: true,
                vehicleType: true,
                vehicleMake: true,
                vehicleModel: true,
                vehicleYear: true,
                vehicleVIN: true,
                vehicleColor: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        auditLogs: canReadAllInvoices
          ? {
              select: {
                id: true,
                action: true,
                description: true,
                performedBy: true,
                oldValue: true,
                newValue: true,
                timestamp: true,
                metadata: true,
              },
              orderBy: {
                timestamp: 'desc',
              },
              take: 50,
            }
          : false,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Check permissions: users can only view their own invoices
    if (!canReadAllInvoices && invoice.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const actorIds = canReadAllInvoices
      ? Array.from(
          new Set((invoice.auditLogs || []).map((log) => log.performedBy).filter(Boolean))
        )
      : [];

    const actors = actorIds.length
      ? await prisma.user.findMany({
          where: {
            id: {
              in: actorIds,
            },
          },
          select: {
            id: true,
            name: true,
            email: true,
          },
        })
      : [];

    const actorMap = new Map(
      actors.map((actor) => [actor.id, actor.name?.trim() || actor.email || actor.id])
    );

    const containerIds = canReadAllInvoices
      ? Array.from(
          new Set(
            (invoice.auditLogs || [])
              .flatMap((log) => {
                const metadata =
                  log.metadata && typeof log.metadata === 'object' && !Array.isArray(log.metadata)
                    ? (log.metadata as Record<string, unknown>)
                    : null;

                return [
                  typeof metadata?.oldContainerId === 'string' ? metadata.oldContainerId : null,
                  typeof metadata?.newContainerId === 'string' ? metadata.newContainerId : null,
                  typeof metadata?.containerId === 'string' ? metadata.containerId : null,
                ].filter((value): value is string => Boolean(value));
              })
          )
        )
      : [];

    const containers = containerIds.length
      ? await prisma.container.findMany({
          where: {
            id: {
              in: containerIds,
            },
          },
          select: {
            id: true,
            containerNumber: true,
          },
        })
      : [];

    const containerMap = new Map(
      containers.map((container) => [container.id, container.containerNumber])
    );

    const auditLogs = canReadAllInvoices
      ? (invoice.auditLogs || []).map((log) => {
          const metadata =
            log.metadata && typeof log.metadata === 'object' && !Array.isArray(log.metadata)
              ? { ...(log.metadata as Record<string, unknown>) }
              : log.metadata;

          if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
            const oldContainerId = typeof metadata.oldContainerId === 'string' ? metadata.oldContainerId : null;
            const newContainerId = typeof metadata.newContainerId === 'string' ? metadata.newContainerId : null;
            const containerId = typeof metadata.containerId === 'string' ? metadata.containerId : null;

            if (oldContainerId && containerMap.has(oldContainerId)) {
              metadata.oldContainerNumber = containerMap.get(oldContainerId);
            }

            if (newContainerId && containerMap.has(newContainerId)) {
              metadata.newContainerNumber = containerMap.get(newContainerId);
            }

            if (containerId && containerMap.has(containerId)) {
              metadata.containerNumber = containerMap.get(containerId);
            }
          }

          return {
            id: log.id,
            action: log.action,
            description: log.description,
            performedBy: actorMap.get(log.performedBy) || log.performedBy,
            oldValue: log.oldValue,
            newValue: log.newValue,
            timestamp: log.timestamp,
            metadata,
          };
        })
      : [];

    const shipmentIds = Array.from(
      new Set(invoice.lineItems.map((lineItem) => lineItem.shipmentId).filter((value): value is string => Boolean(value)))
    );

    const shipmentExpenseEntries = shipmentIds.length
      ? await prisma.ledgerEntry.findMany({
          where: {
            shipmentId: { in: shipmentIds },
            type: 'DEBIT',
          },
          select: {
            id: true,
            shipmentId: true,
            description: true,
            amount: true,
            transactionDate: true,
            metadata: true,
          },
          orderBy: [{ transactionDate: 'asc' }, { createdAt: 'asc' }],
        })
      : [];

    const expenseEntryIds = shipmentExpenseEntries.map((entry) => entry.id);
    const companyLedgerEntries = expenseEntryIds.length
      ? await prisma.companyLedgerEntry.findMany({
          where: {
            reference: {
              in: expenseEntryIds.map((entryId) => `shipment-expense:${entryId}`),
            },
          },
          select: {
            id: true,
            companyId: true,
            description: true,
            reference: true,
            notes: true,
            metadata: true,
            company: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        })
      : [];

    const linkedCompanyEntriesByUserExpenseId = buildLinkedCompanyLedgerEntryMap(companyLedgerEntries);
    const shipmentById = new Map(
      invoice.lineItems
        .filter((lineItem) => lineItem.shipment)
        .map((lineItem) => [lineItem.shipment!.id, lineItem.shipment!])
    );
    const queuedExpenseEntriesByKey = new Map<string, typeof shipmentExpenseEntries>();

    for (const entry of shipmentExpenseEntries) {
      if (!entry.shipmentId) continue;

      const shipment = shipmentById.get(entry.shipmentId);
      const normalizedDescription = normalizeShipmentRefInDescription(entry.description || '', shipment);
      const key = buildExpenseLineItemKey(entry.shipmentId, normalizedDescription, entry.amount);
      const queuedEntries = queuedExpenseEntriesByKey.get(key) || [];
      queuedEntries.push(entry);
      queuedExpenseEntriesByKey.set(key, queuedEntries);
    }

    const lineItems = invoice.lineItems.map((lineItem) => {
      if (!lineItem.shipmentId) {
        return lineItem;
      }

      const key = buildExpenseLineItemKey(lineItem.shipmentId, lineItem.description, lineItem.amount);
      const queuedEntries = queuedExpenseEntriesByKey.get(key);
      const matchedUserExpenseEntry = queuedEntries?.shift();

      return {
        ...lineItem,
        linkedCompanyLedgerEntry: matchedUserExpenseEntry
          ? linkedCompanyEntriesByUserExpenseId.get(matchedUserExpenseEntry.id) || null
          : null,
      };
    });

    return NextResponse.json({
      ...invoice,
      lineItems,
      auditLogs,
    });

  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/invoices/[id]
 * Update an invoice (admin only)
 */
export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const actorId = session.user?.id;
    if (!actorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can update invoices
    if (!hasPermission(session.user?.role, 'invoices:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();

    const updateSchema = z.object({
      status: z.enum(['DRAFT', 'PENDING', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
      dueDate: z.string().optional(),
      paidDate: z.string().optional(),
      paymentMethod: z.string().optional(),
      paymentReference: z.string().optional(),
      notes: z.string().optional(),
      internalNotes: z.string().optional(),
      discount: z.number().optional(),
      tax: z.number().optional(),
    });

    const validatedData = updateSchema.parse(body);

    // Get current invoice to recalculate total if discount or tax changes
    const currentInvoice = await prisma.userInvoice.findUnique({
      where: { id: params.id },
      include: {
        lineItems: true,
      },
    });

    if (!currentInvoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Recalculate total if discount or tax is updated
    let total = currentInvoice.total;
    if (validatedData.discount !== undefined || validatedData.tax !== undefined) {
      const subtotal = currentInvoice.subtotal;
      const discount = validatedData.discount ?? currentInvoice.discount;
      const tax = validatedData.tax ?? currentInvoice.tax;
      total = subtotal - discount + tax;
    }

    const previousStatus = currentInvoice.status;

    // Update invoice
    const invoice = await prisma.userInvoice.update({
      where: { id: params.id },
      data: {
        ...validatedData,
        total,
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : undefined,
        paidDate: validatedData.paidDate ? new Date(validatedData.paidDate) : undefined,
      },
      include: {
        user: true,
        container: true,
        lineItems: {
          include: {
            shipment: true,
          },
        },
      },
    });

    const invoiceAuditLogs: Array<{
      invoiceId: string;
      action: string;
      description: string;
      performedBy: string;
      oldValue?: string | null;
      newValue?: string | null;
      metadata?: Prisma.InputJsonValue;
    }> = [];

    if (validatedData.status && validatedData.status !== previousStatus) {
      invoiceAuditLogs.push({
        invoiceId: invoice.id,
        action: 'STATUS_CHANGE',
        description: `Invoice status changed from ${previousStatus} to ${validatedData.status}`,
        performedBy: actorId,
        oldValue: previousStatus,
        newValue: validatedData.status,
      });
    }

    const updatedFieldNames = Object.keys(validatedData).filter((fieldName) => {
      if (fieldName === 'status') {
        return false;
      }

      return validatedData[fieldName as keyof typeof validatedData] !== undefined;
    });

    if (updatedFieldNames.length > 0) {
      invoiceAuditLogs.push({
        invoiceId: invoice.id,
        action: 'INVOICE_UPDATED',
        description: `Invoice fields updated: ${updatedFieldNames.join(', ')}`,
        performedBy: actorId,
        metadata: {
          updatedFields: updatedFieldNames,
        },
      });
    }

    await createInvoiceAuditLogs(invoiceAuditLogs);

    if (validatedData.status && validatedData.status !== previousStatus) {
      const formattedStatus = validatedData.status
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase());

      try {
        await createNotification({
          userId: invoice.userId,
          senderId: actorId,
          title: 'Invoice status updated',
          description: `Invoice ${invoice.invoiceNumber} is now ${formattedStatus}.`,
          type: NotificationType.INFO,
          link: `/dashboard/invoices/${invoice.id}`,
        });
      } catch (notificationError) {
        console.error('Failed to create invoice status notification:', notificationError);
      }
    }

    return NextResponse.json(invoice);

  } catch (error) {
    console.error('Error updating invoice:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update invoice' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/invoices/[id]
 * Delete an invoice (admin only)
 */
export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can delete invoices
    if (!hasPermission(session.user?.role, 'invoices:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if invoice exists
    const invoice = await prisma.userInvoice.findUnique({
      where: { id: params.id },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const userLedgerLinks = await tx.ledgerEntry.findMany({
        where: {
          OR: [
            {
              metadata: {
                path: ['invoiceId'],
                equals: invoice.id,
              },
            },
            {
              metadata: {
                path: ['invoiceNumber'],
                equals: invoice.invoiceNumber,
              },
            },
            ...(invoice.paymentReference
              ? [
                  {
                    id: invoice.paymentReference,
                  },
                ]
              : []),
          ],
        },
        select: { id: true },
      });

      const companyLedgerLinks = await tx.companyLedgerEntry.findMany({
        where: {
          OR: [
            {
              metadata: {
                path: ['invoiceId'],
                equals: invoice.id,
              },
            },
            {
              metadata: {
                path: ['invoiceNumber'],
                equals: invoice.invoiceNumber,
              },
            },
            {
              reference: invoice.invoiceNumber,
            },
          ],
        },
        select: { id: true },
      });

      const userLedgerEntryIds = userLedgerLinks.map((entry) => entry.id);
      const companyLedgerEntryIds = companyLedgerLinks.map((entry) => entry.id);

      if (userLedgerEntryIds.length > 0) {
        await tx.ledgerEntry.deleteMany({
          where: {
            id: { in: userLedgerEntryIds },
          },
        });
      }

      if (companyLedgerEntryIds.length > 0) {
        await tx.companyLedgerEntry.deleteMany({
          where: {
            id: { in: companyLedgerEntryIds },
          },
        });
      }

      // Delete invoice (cascade will delete line items)
      await tx.userInvoice.delete({
        where: { id: params.id },
      });

      return {
        removedUserLedgerEntries: userLedgerEntryIds.length,
        removedCompanyLedgerEntries: companyLedgerEntryIds.length,
      };
    });

    return NextResponse.json({
      success: true,
      message: 'Invoice and linked ledger transactions deleted successfully',
      ...result,
    });

  } catch (error) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json(
      { error: 'Failed to delete invoice' },
      { status: 500 }
    );
  }
}
