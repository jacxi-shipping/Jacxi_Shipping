import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Schema for updating container
const updateContainerSchema = z.object({
  trackingNumber: z.string().optional(),
  vesselName: z.string().optional(),
  voyageNumber: z.string().optional(),
  shippingLine: z.string().optional(),
  bookingNumber: z.string().optional(),
  loadingPort: z.string().optional(),
  destinationPort: z.string().optional(),
  transshipmentPorts: z.array(z.string()).optional(),
  loadingDate: z.string().optional(),
  departureDate: z.string().optional(),
  estimatedArrival: z.string().optional(),
  actualArrival: z.string().optional(),
  status: z.enum([
    'CREATED',
    'WAITING_FOR_LOADING',
    'LOADED',
    'IN_TRANSIT',
    'ARRIVED_PORT',
    'CUSTOMS_CLEARANCE',
    'RELEASED',
    'CLOSED',
  ]).optional(),
  currentLocation: z.string().optional(),
  progress: z.number().int().min(0).max(100).optional(),
  notes: z.string().optional(),
  autoTrackingEnabled: z.boolean().optional(),
});

// GET - Fetch single container with full details
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const container = await prisma.container.findUnique({
      where: { id: params.id },
      include: {
        shipments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        expenses: {
          orderBy: { date: 'desc' },
        },
        invoices: {
          orderBy: { date: 'desc' },
        },
        documents: {
          orderBy: { uploadedAt: 'desc' },
        },
        trackingEvents: {
          orderBy: { eventDate: 'desc' },
          take: 20,
        },
        auditLogs: {
          orderBy: { timestamp: 'desc' },
          take: 50,
        },
      },
    });

    if (!container) {
      return NextResponse.json({ error: 'Container not found' }, { status: 404 });
    }

    // Role-based access control
    const isAdmin = session.user.role === 'admin';
    
    if (!isAdmin) {
      // Check if user has any shipments in this container
      const userShipments = container.shipments.filter(s => s.userId === session.user.id);
      
      if (userShipments.length === 0) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // Filter sensitive data for non-admins
      container.expenses = [];
      container.invoices = [];
      container.auditLogs = [];
      container.shipments = userShipments;
      // Filter documents if needed (e.g. only public ones), but keeping all for now as container docs are usually shared
    }

    // Auto-sync tracking if enabled and has tracking number
    if (isAdmin && container.autoTrackingEnabled && container.trackingNumber) {
      try {
        const { trackingSync } = await import('@/lib/services/tracking-sync');
        const syncResult = await trackingSync.syncContainerTracking(params.id);
        
        if (syncResult.newEvents > 0) {
          console.log(`Synced ${syncResult.newEvents} new tracking events for container ${params.id}`);
          
          // Re-fetch container with updated tracking events
          const updatedContainer = await prisma.container.findUnique({
            where: { id: params.id },
            include: {
              shipments: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                },
              },
              expenses: {
                orderBy: { date: 'desc' },
              },
              invoices: {
                orderBy: { date: 'desc' },
              },
              documents: {
                orderBy: { uploadedAt: 'desc' },
              },
              trackingEvents: {
                orderBy: { eventDate: 'desc' },
                take: 20,
              },
              auditLogs: {
                orderBy: { timestamp: 'desc' },
                take: 50,
              },
            },
          });
          
          if (updatedContainer) {
            Object.assign(container, updatedContainer);
          }
        }
      } catch (syncError) {
        console.error('Error auto-syncing tracking:', syncError);
        // Continue even if sync fails
      }
    }

    // Calculate totals
    const totalExpenses = isAdmin ? container.expenses.reduce((sum, exp) => sum + exp.amount, 0) : 0;
    const totalInvoices = isAdmin ? container.invoices.reduce((sum, inv) => sum + inv.amount, 0) : 0;
    const currentCount = container.shipments.length; // This will reflect the filtered count for users? No, container.currentCount is from DB property usually, or I should use shipments.length.
    // Wait, `container.currentCount` property exists on the model (synced).
    // If I use `container.shipments.length`, it will be 1 for user, but the container physically has 4.
    // The user should probably see the physical fullness (e.g. 4/4), so using the model's `currentCount` (if available) or the original unfiltered length would be better.
    // However, I've already mutated `container.shipments`.
    
    // Let's use the DB property `currentCount` if it exists (it does in schema), otherwise use the count.
    // The `container` object from `findUnique` has `currentCount`. I haven't mutated that scalar field, only the relations.
    // So `container.currentCount` is safe.

    return NextResponse.json({
      container: {
        ...container,
        // currentCount is already in ...container
        totals: {
          expenses: totalExpenses,
          invoices: totalInvoices,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching container:', error);
    return NextResponse.json(
      { error: 'Failed to fetch container' },
      { status: 500 }
    );
  }
}

// PATCH - Update container
export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can update containers
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const container = await prisma.container.findUnique({
      where: { id: params.id },
    });

    if (!container) {
      return NextResponse.json({ error: 'Container not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = updateContainerSchema.parse(body);

    // Parse dates if provided
    const updateData: Record<string, unknown> = { ...validatedData };
    if (validatedData.loadingDate) {
      updateData.loadingDate = new Date(validatedData.loadingDate);
    }
    if (validatedData.departureDate) {
      updateData.departureDate = new Date(validatedData.departureDate);
    }
    if (validatedData.estimatedArrival) {
      updateData.estimatedArrival = new Date(validatedData.estimatedArrival);
    }
    if (validatedData.actualArrival) {
      updateData.actualArrival = new Date(validatedData.actualArrival);
    }

    // Update container
    const updatedContainer = await prisma.container.update({
      where: { id: params.id },
      data: updateData,
      include: {
        shipments: true,
        _count: {
          select: {
            shipments: true,
            expenses: true,
            invoices: true,
            documents: true,
          },
        },
      },
    });

    // Auto-generate invoice if status changed to RELEASED or CLOSED
    if (
      validatedData.status &&
      (validatedData.status === 'RELEASED' || validatedData.status === 'CLOSED') &&
      container.status !== validatedData.status
    ) {
      try {
        const { autoInvoice } = await import('@/lib/services/auto-invoice');
        const invoiceResult = await autoInvoice.generateInvoiceForContainer(params.id);
        
        if (invoiceResult.success) {
          console.log(`✅ Auto-generated invoice for container ${params.id}:`, invoiceResult.message);
        } else {
          console.log(`ℹ️ Invoice not generated for container ${params.id}:`, invoiceResult.message);
        }
      } catch (error) {
        console.error('Error auto-generating invoice:', error);
        // Don't fail the status update if invoice generation fails
      }
    }

    // Create audit logs for significant changes
    const auditLogs = [];

    if (validatedData.status && validatedData.status !== container.status) {
      auditLogs.push({
        containerId: container.id,
        action: 'STATUS_CHANGE',
        description: `Status changed from ${container.status} to ${validatedData.status}`,
        performedBy: session.user.id as string,
        oldValue: container.status,
        newValue: validatedData.status,
      });

      // Cascade status to shipments
      if (validatedData.status === 'LOADED' || validatedData.status === 'IN_TRANSIT') {
        await prisma.shipment.updateMany({
          where: { containerId: container.id },
          data: { status: 'IN_TRANSIT' },
        });
      } else if (validatedData.status === 'ARRIVED_PORT' || validatedData.status === 'RELEASED') {
        // When container arrives or is released, shipments are effectively "on hand" at the destination
        // or potentially ready for pickup/delivery. 
        // We'll set them to ON_HAND (at destination) or keep them IN_TRANSIT depending on business rule.
        // Assuming ON_HAND means "at a facility we control", arrival at port fits.
        await prisma.shipment.updateMany({
            where: { containerId: container.id },
            data: { status: 'ON_HAND' }, // Reset to ON_HAND as they are physically at the port/warehouse
        });
      } else if (validatedData.status === 'CLOSED') {
          // If container is closed/completed, shipments might be considered delivered or simply done with this leg
          // This depends on whether "CLOSED" means delivered to customer.
          // For now, we won't auto-close shipments to avoid accidental 'DELIVERED' status if there's final mile.
      }
    }

    if (validatedData.estimatedArrival && validatedData.estimatedArrival !== container.estimatedArrival?.toISOString()) {
      auditLogs.push({
        containerId: container.id,
        action: 'ETA_UPDATED',
        description: `ETA updated to ${validatedData.estimatedArrival}`,
        performedBy: session.user.id as string,
        oldValue: container.estimatedArrival?.toISOString() || null,
        newValue: validatedData.estimatedArrival,
      });
    }

    // Bulk create audit logs
    if (auditLogs.length > 0) {
      await prisma.containerAuditLog.createMany({
        data: auditLogs,
      });
    }

    return NextResponse.json({
      container: updatedContainer,
      message: 'Container updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error updating container:', error);
    return NextResponse.json(
      { error: 'Failed to update container' },
      { status: 500 }
    );
  }
}

// DELETE - Delete container
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can delete containers
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const container = await prisma.container.findUnique({
      where: { id: params.id },
      include: {
        shipments: true,
      },
    });

    if (!container) {
      return NextResponse.json({ error: 'Container not found' }, { status: 404 });
    }

    // Check if container has shipments
    if (container.shipments.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete container with assigned shipments. Remove shipments first.' },
        { status: 400 }
      );
    }

    // Delete container (cascade will delete related records)
    await prisma.container.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      message: 'Container deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting container:', error);
    return NextResponse.json(
      { error: 'Failed to delete container' },
      { status: 500 }
    );
  }
}
