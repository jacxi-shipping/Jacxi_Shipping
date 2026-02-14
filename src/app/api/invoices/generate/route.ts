import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { allocateExpenses } from '@/lib/expense-allocation';
import { sendInvoiceEmail } from '@/lib/email';
import { NotificationType } from '@prisma/client';
import { createNotification } from '@/lib/notifications';

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

    // Only admins can generate invoices
    if (session.user.role !== 'admin') {
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
      });

      if (existingInvoice) {
        generatedInvoices.push({ 
          userId, 
          userName: user.name, 
          invoiceId: existingInvoice.id,
          invoiceNumber: existingInvoice.invoiceNumber,
          status: 'existing' 
        });
        continue;
      }

      // Generate invoice number
      const invoiceCount = await prisma.userInvoice.count();
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(4, '0')}`;

      // Calculate line items for this user
      const lineItems = [];
      let subtotal = 0;

      for (const shipment of shipments) {
        // Vehicle price
        if (shipment.price) {
          lineItems.push({
            description: `${shipment.vehicleYear || ''} ${shipment.vehicleMake || ''} ${shipment.vehicleModel || ''} - Vehicle Price`.trim(),
            shipmentId: shipment.id,
            type: 'VEHICLE_PRICE' as const,
            quantity: 1,
            unitPrice: shipment.price,
            amount: shipment.price,
          });
          subtotal += shipment.price;
        }

        // Insurance
        if (shipment.insuranceValue) {
          lineItems.push({
            description: `${shipment.vehicleYear || ''} ${shipment.vehicleMake || ''} ${shipment.vehicleModel || ''} - Insurance`.trim(),
            shipmentId: shipment.id,
            type: 'INSURANCE' as const,
            quantity: 1,
            unitPrice: shipment.insuranceValue,
            amount: shipment.insuranceValue,
          });
          subtotal += shipment.insuranceValue;
        }

        // Allocated container expenses for this shipment
        const allocatedExpense = expenseAllocations[shipment.id] || 0;
        
        if (allocatedExpense > 0) {
          const expenseDescription = allocationMethod === 'EQUAL' 
            ? `Shared Container Expenses (Equal Split)`
            : allocationMethod === 'BY_VALUE'
            ? `Shared Container Expenses (By Value)`
            : allocationMethod === 'BY_WEIGHT'
            ? `Shared Container Expenses (By Weight)`
            : `Shared Container Expenses`;
            
          lineItems.push({
            description: `${shipment.vehicleYear || ''} ${shipment.vehicleMake || ''} ${shipment.vehicleModel || ''} - ${expenseDescription}`.trim(),
            shipmentId: shipment.id,
            type: 'SHIPPING_FEE' as const,
            quantity: 1,
            unitPrice: allocatedExpense,
            amount: allocatedExpense,
          });
          subtotal += allocatedExpense;
        }
      }

      // Apply discount if any
      const discountAmount = (subtotal * discountPercent) / 100;
      const total = subtotal - discountAmount;

      // Set due date (30 days from now if not provided)
      const invoiceDueDate = dueDate 
        ? new Date(dueDate) 
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      // Create invoice
      const invoice = await prisma.userInvoice.create({
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
        include: {
          lineItems: {
            include: {
              shipment: true,
            },
          },
          user: true,
          container: true,
        },
      });

      generatedInvoices.push({
        userId,
        userName: user.name,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        total: invoice.total,
        status: 'created',
      });

      try {
        await createNotification({
          userId,
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

    return NextResponse.json({
      success: true,
      message: `Generated ${generatedInvoices.filter(i => i.status === 'created').length} invoice(s)`,
      invoices: generatedInvoices,
      summary: {
        totalInvoices: generatedInvoices.length,
        newInvoices: generatedInvoices.filter(i => i.status === 'created').length,
        existingInvoices: generatedInvoices.filter(i => i.status === 'existing').length,
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

// Helper function to map expense types to line item types
function mapExpenseTypeToLineItemType(expenseType: string): string {
  const typeMap: Record<string, string> = {
    'SHIPPING_FEE': 'SHIPPING_FEE',
    'PORT_CHARGES': 'CUSTOMS_FEE',
    'CUSTOMS_DUTY': 'CUSTOMS_FEE',
    'CUSTOMS': 'CUSTOMS_FEE',
    'STORAGE_FEE': 'STORAGE_FEE',
    'HANDLING_FEE': 'HANDLING_FEE',
    'INSURANCE': 'INSURANCE',
    'INLAND_TRANSPORT': 'SHIPPING_FEE',
    'DOCUMENTATION': 'OTHER_FEE',
    'INSPECTION': 'OTHER_FEE',
    'OTHER': 'OTHER_FEE',
    // Legacy/Title Case mappings just in case
    'Shipping': 'SHIPPING_FEE',
    'Customs': 'CUSTOMS_FEE',
    'Storage': 'STORAGE_FEE',
    'Handling': 'HANDLING_FEE',
  };

  return typeMap[expenseType] || 'OTHER_FEE';
}
