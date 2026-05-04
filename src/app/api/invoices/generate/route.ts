import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { allocateExpenses } from '@/lib/expense-allocation';
import { sendInvoiceEmail } from '@/lib/email';
import { NotificationType, Prisma } from '@prisma/client';
import { createNotification } from '@/lib/notifications';
import { createInvoiceAuditLogs } from '@/lib/entity-audit-history';
import { hasPermission } from '@/lib/rbac';
import { materializeContainerShipmentCharges } from '@/lib/billing/container-shipment-charge-materialization';
import {
  buildInvoiceLineItemFromCharge,
  markInvoiceShipmentChargesInvoiced,
  releaseInvoiceShipmentCharges,
} from '@/lib/billing/shipment-charges';

// Schema for generating invoices
const generateInvoicesSchema = z.object({
  containerId: z.string(),
  dueDate: z.string().optional(),
  sendEmail: z.boolean().default(true), // Changed default to true
  discountPercent: z.number().min(0).max(100).default(0),
});


/**
 * POST /api/invoices/generate
 * 
 * Generate official UserInvoices for all customers with shipments in a container.
 * 
 * This is the PRIMARY method for creating customer invoices. It:
 * 1. Groups all shipments in the container by customer
 * 2. Creates ONE invoice per customer (consolidating all their shipments)
 * 3. Allocates container expenses across shipments based on allocation method
 * 4. Saves invoices to database with tracking and status
 * 5. Sends email notifications with PDF links
 * 6. Creates in-app notifications
 * 
 * Important: This is different from the quick PDF export on shipment pages.
 * Those PDFs are for reference only and are NOT saved to the database.
 * 
 * @requires Admin role
 * @param containerId - ID of the container
 * @param dueDate - Optional due date for payment
 * @param sendEmail - Whether to send email notifications (default: true)
 * @param discountPercent - Percentage discount to apply (0-100)
 * 
 * @returns Array of generated invoice objects with user details
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const actorId = session.user?.id;
    if (!actorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can generate invoices
    if (!hasPermission(session.user?.role, 'invoices:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { containerId, dueDate, sendEmail, discountPercent } = generateInvoicesSchema.parse(body);

    // Get container with all shipments and expenses
    const container = await prisma.container.findUnique({
      where: { id: containerId },
      include: {
        shipments: {
          include: {
            user: true,
          },
        },
        expenses: true,
      },
    });

    if (!container) {
      return NextResponse.json({ error: 'Container not found' }, { status: 404 });
    }

    if (container.shipments.length === 0) {
      return NextResponse.json({ error: 'No shipments in container' }, { status: 400 });
    }

    // Calculate expense allocation based on container's allocation method
    const allocationMethod = container.expenseAllocationMethod || 'EQUAL';
    const expenseAllocations = allocateExpenses(
      container.shipments,
      container.expenses,
      allocationMethod
    );

    const shipmentIds = container.shipments.map((shipment) => shipment.id);
    const shipmentLedgerEntries = shipmentIds.length
      ? await prisma.ledgerEntry.findMany({
          where: {
            shipmentId: { in: shipmentIds },
            type: 'DEBIT',
          },
          select: {
            id: true,
            userId: true,
            shipmentId: true,
            description: true,
            type: true,
            amount: true,
            transactionDate: true,
            transactionInfoType: true,
            notes: true,
            metadata: true,
          },
        })
      : [];

    const shipmentDamageRecords = shipmentIds.length
      ? await prisma.containerDamage.findMany({
          where: {
            shipmentId: { in: shipmentIds },
            damageType: 'WE_PAY',
          },
          select: {
            shipmentId: true,
            amount: true,
          },
        })
      : [];

    await prisma.$transaction(async (tx) => {
      await materializeContainerShipmentCharges(tx, {
        actorId,
        allocationMethod,
        containerId,
        expenseAllocations,
        shipmentDamageRecords,
        shipmentLedgerEntries: shipmentLedgerEntries.map((entry) => ({
          ...entry,
          type: entry.type as 'DEBIT' | 'CREDIT',
          transactionInfoType: entry.transactionInfoType as 'CAR_PAYMENT' | 'SHIPPING_PAYMENT' | 'STORAGE_PAYMENT' | null,
          metadata: (entry.metadata ?? {}) as Prisma.JsonValue,
        })),
        shipments: container.shipments.map((shipment) => ({
          id: shipment.id,
          userId: shipment.userId,
          serviceType: shipment.serviceType,
          purchasePrice: shipment.purchasePrice,
          price: shipment.price,
          insuranceValue: shipment.insuranceValue,
          damageCredit: shipment.damageCredit,
          vehicleYear: shipment.vehicleYear,
          vehicleMake: shipment.vehicleMake,
          vehicleModel: shipment.vehicleModel,
          vehicleVIN: shipment.vehicleVIN,
        })),
      });
    });

    // Group shipments by user
    const shipmentsByUser = container.shipments.reduce((acc, shipment) => {
      const userId = shipment.userId;
      if (!acc[userId]) {
        acc[userId] = {
          user: shipment.user,
          shipments: [],
        };
      }
      acc[userId].shipments.push(shipment);
      return acc;
    }, {} as Record<string, { user: any; shipments: any[] }>);

    // Generate invoices for each user
    const generatedInvoices = [];
    const invoiceAuditLogs: Array<{
      invoiceId: string;
      action: string;
      description: string;
      performedBy: string;
      oldValue?: string | null;
      newValue?: string | null;
      metadata?: Prisma.InputJsonValue;
    }> = [];

    // ⚡ Bolt: Removed N+1 query inside loop by pre-fetching the count once and incrementing.
    let invoiceCount = await prisma.userInvoice.count();

    for (const [userId, { user, shipments }] of Object.entries(shipmentsByUser)) {
      // Check if invoice already exists for this user and container
      const existingInvoice = await prisma.userInvoice.findFirst({
        where: {
          userId,
          containerId,
          status: {
            not: 'CANCELLED',
          },
        },
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
        },
      });

      if (existingInvoice?.status === 'PAID') {
        generatedInvoices.push({ 
          userId, 
          userName: user.name, 
          invoiceId: existingInvoice.id,
          invoiceNumber: existingInvoice.invoiceNumber,
          status: 'existing_paid' 
        });
        continue;
      }

      // Set due date (30 days from now if not provided)
      const invoiceDueDate = dueDate 
        ? new Date(dueDate) 
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const invoice = await prisma.$transaction(async (tx) => {
        if (existingInvoice) {
          await releaseInvoiceShipmentCharges(tx, existingInvoice.id);
        }

        const invoiceCharges = await tx.shipmentCharge.findMany({
          where: {
            userId,
            shipmentId: {
              in: shipments.map((shipment) => shipment.id),
            },
            status: 'APPROVED',
            invoiceId: null,
          },
          orderBy: [{ billableAt: 'asc' }, { createdAt: 'asc' }],
          select: {
            id: true,
            chargeCode: true,
            category: true,
            description: true,
            quantity: true,
            unitAmount: true,
            totalAmount: true,
            shipmentId: true,
          },
        });

        if (!invoiceCharges.length) {
          return null;
        }

        const subtotal = invoiceCharges.reduce((sum, charge) => sum + charge.totalAmount, 0);
        const discountAmount = subtotal > 0 ? (subtotal * discountPercent) / 100 : 0;
        const total = subtotal - discountAmount;
        const lineItems = invoiceCharges.map((charge) => buildInvoiceLineItemFromCharge(charge));

        let nextInvoice: { id: string; invoiceNumber: string; total: number };

        if (existingInvoice) {
          nextInvoice = await tx.userInvoice.update({
            where: { id: existingInvoice.id },
            data: {
              dueDate: invoiceDueDate,
              subtotal,
              discount: discountAmount,
              total,
              lineItems: {
                deleteMany: {},
                create: lineItems,
              },
            },
            select: {
              id: true,
              invoiceNumber: true,
              total: true,
            },
          });
        } else {
          invoiceCount += 1;
          const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoiceCount).padStart(4, '0')}`;
          nextInvoice = await tx.userInvoice.create({
            data: {
              invoiceNumber,
              userId,
              containerId,
              status: 'DRAFT',
              issueDate: new Date(),
              dueDate: invoiceDueDate,
              subtotal,
              discount: discountAmount,
              total,
              lineItems: {
                create: lineItems,
              },
            },
            select: {
              id: true,
              invoiceNumber: true,
              total: true,
            },
          });
        }

        await markInvoiceShipmentChargesInvoiced(
          tx,
          nextInvoice.id,
          invoiceCharges.map((charge) => charge.id),
        );

        return nextInvoice;
      });

      if (!invoice) {
        continue;
      }

      invoiceAuditLogs.push({
        invoiceId: invoice.id,
        action: existingInvoice ? 'INVOICE_REFRESHED' : 'INVOICE_CREATED',
        description: existingInvoice
          ? `Invoice ${invoice.invoiceNumber} refreshed from approved shipment charges`
          : `Invoice ${invoice.invoiceNumber} created from approved shipment charges`,
        performedBy: actorId,
        metadata: {
          containerId,
          userId,
          shipmentIds: shipments.map((shipment) => shipment.id),
        },
      });

      generatedInvoices.push({
        userId,
        userName: user.name,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        total: invoice.total,
        status: existingInvoice ? 'updated' : 'created',
      });

      try {
        await createNotification({
          userId,
          senderId: actorId,
          title: 'Invoice created',
          description: `Invoice ${invoice.invoiceNumber} is ready for review.`,
          type: NotificationType.INFO,
          link: `/dashboard/invoices/${invoice.id}`,
        });
      } catch (notificationError) {
        console.error('Failed to create invoice notification:', notificationError);
      }

      // Send email notification if sendEmail is true and user has email
      if (sendEmail && user.email) {
        try {
          const pdfUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/invoices/${invoice.id}/pdf`;
          
          await sendInvoiceEmail({
            to: user.email,
            invoiceNumber: invoice.invoiceNumber,
            amount: invoice.total,
            dueDate: invoiceDueDate.toLocaleDateString(),
            pdfUrl,
          });
          
          // Update invoice status to SENT after successful email
          await prisma.userInvoice.update({
            where: { id: invoice.id },
            data: { status: 'SENT' },
          });
        } catch (emailError) {
          console.error(`Failed to send email for invoice ${invoice.invoiceNumber}:`, emailError);
          // Don't fail the whole operation if email fails
        }
      }
    }

    await createInvoiceAuditLogs(invoiceAuditLogs);

    return NextResponse.json({
      success: true,
      message: `Processed ${generatedInvoices.length} invoice(s)`,
      invoices: generatedInvoices,
      summary: {
        totalInvoices: generatedInvoices.length,
        newInvoices: generatedInvoices.filter(i => i.status === 'created').length,
        updatedInvoices: generatedInvoices.filter(i => i.status === 'updated').length,
        existingPaidInvoices: generatedInvoices.filter(i => i.status === 'existing_paid').length,
      },
    });

  } catch (error) {
    console.error('Error generating invoices:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate invoices' },
      { status: 500 }
    );
  }
}
