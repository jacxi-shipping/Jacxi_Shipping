import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

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
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Check permissions: users can only view their own invoices
    if (session.user.role !== 'admin' && invoice.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(invoice);

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

    // Only admins can update invoices
    if (session.user.role !== 'admin') {
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
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if invoice exists and is not paid
    const invoice = await prisma.userInvoice.findUnique({
      where: { id: params.id },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (invoice.status === 'PAID') {
      return NextResponse.json(
        { error: 'Cannot delete paid invoices. Cancel instead.' },
        { status: 400 }
      );
    }

    // Delete invoice (cascade will delete line items)
    await prisma.userInvoice.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: 'Invoice deleted successfully' });

  } catch (error) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json(
      { error: 'Failed to delete invoice' },
      { status: 500 }
    );
  }
}
