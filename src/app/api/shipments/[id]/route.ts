import { NextRequest, NextResponse } from 'next/server';
import { Prisma, TitleStatus, NotificationType } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createNotification } from '@/lib/notifications';
import { hasPermission } from '@/lib/rbac';

type UpdateShipmentPayload = {
  userId?: string;
  vehicleType?: string;
  vehicleMake?: string | null;
  vehicleModel?: string | null;
  vehicleYear?: number | string | null;
  vehicleVIN?: string | null;
  vehicleColor?: string | null;
  lotNumber?: string | null;
  auctionName?: string | null;
  status?: 'ON_HAND' | 'IN_TRANSIT' | 'IN_TRANSIT_TO_DESTINATION';
  containerId?: string | null;
  arrivalPhotos?: string[] | null;
  vehiclePhotos?: string[] | null;
  replacePhotos?: boolean;
  weight?: number | string | null;
  dimensions?: string | null;
  specialInstructions?: string | null;
  internalNotes?: string | null;
  hasKey?: boolean | null;
  hasTitle?: boolean | null;
  titleStatus?: string | null;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const canReadAllShipments = hasPermission(session.user?.role, 'shipments:read_all');

    const shipment = await prisma.shipment.findUnique({
      where: { id },
      select: {
        id: true,
        vehicleType: true,
        vehicleMake: true,
        vehicleModel: true,
        vehicleYear: true,
        vehicleVIN: true,
        vehicleColor: true,
        lotNumber: true,
        auctionName: true,
        hasKey: true,
        hasTitle: true,
        titleStatus: true,
        vehicleAge: true,
        weight: true,
        dimensions: true,
        arrivalPhotos: true,
        vehiclePhotos: true,
        status: true,
        containerId: true,
        userId: true,
        internalNotes: true,
        paymentStatus: true,
        paymentMode: true,
        releaseToken: true,
        releaseTokenCreatedAt: true,
        createdAt: true,
        updatedAt: true,
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
          include: {
            trackingEvents: {
              orderBy: {
                eventDate: 'desc',
              },
              take: 10,
            },
          },
        },
        transit: {
          include: {
            company: { select: { id: true, name: true } },
          },
        },
        documents: true,
        ledgerEntries: {
          orderBy: {
            transactionDate: 'desc',
          },
        },
      },
    });

    if (!shipment) {
      return NextResponse.json(
        { message: 'Shipment not found' },
        { status: 404 }
      );
    }

    // Regular users can only see their own shipments
    if (!canReadAllShipments && shipment.userId !== session.user?.id) {
      return NextResponse.json(
        { message: 'Forbidden' },
        { status: 403 }
      );
    }

    return NextResponse.json({ shipment }, { status: 200 });
  } catch (error) {
    console.error('Error fetching shipment:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!hasPermission(session.user?.role, 'shipments:manage')) {
      return NextResponse.json(
        { message: 'Forbidden: Only admins can update shipments' },
        { status: 403 }
      );
    }

    const existingShipment = await prisma.shipment.findUnique({
      where: { id },
      include: { container: true },
    });

    if (!existingShipment) {
      return NextResponse.json(
        { message: 'Shipment not found' },
        { status: 404 }
      );
    }

    const data = (await request.json()) as UpdateShipmentPayload;
    const updateData: Prisma.ShipmentUpdateInput = {};

    // Basic vehicle info
    if (data.userId !== undefined) updateData.user = { connect: { id: data.userId } };
    if (data.vehicleType !== undefined) updateData.vehicleType = data.vehicleType;
    if (data.vehicleMake !== undefined) updateData.vehicleMake = data.vehicleMake;
    if (data.vehicleModel !== undefined) updateData.vehicleModel = data.vehicleModel;
    if (data.vehicleColor !== undefined) updateData.vehicleColor = data.vehicleColor;
    if (data.vehicleVIN !== undefined) updateData.vehicleVIN = data.vehicleVIN;
    if (data.lotNumber !== undefined) updateData.lotNumber = data.lotNumber;
    if (data.auctionName !== undefined) updateData.auctionName = data.auctionName;

    // Parse year and calculate age
    if (data.vehicleYear !== undefined) {
      const parsedYear =
        typeof data.vehicleYear === 'number'
          ? data.vehicleYear
          : typeof data.vehicleYear === 'string'
          ? parseInt(data.vehicleYear, 10)
          : null;
      updateData.vehicleYear = parsedYear;
      if (parsedYear) {
        updateData.vehicleAge = new Date().getFullYear() - parsedYear;
      }
    }

    // Container and status
    if (data.status !== undefined) {
      updateData.status = data.status;
      
      // If changing to IN_TRANSIT, container is required
      if (data.status === 'IN_TRANSIT' && !data.containerId && !existingShipment.containerId) {
        return NextResponse.json(
          { message: 'Container ID is required for IN_TRANSIT status' },
          { status: 400 }
        );
      }
      
      // If changing to ON_HAND, remove container
      if (data.status === 'ON_HAND') {
        updateData.container = { disconnect: true };
      }
    }

    if (data.containerId !== undefined) {
      if (data.containerId) {
        // Verify container exists
        const container = await prisma.container.findUnique({
          where: { id: data.containerId },
          include: { shipments: true },
        });

        if (!container) {
          return NextResponse.json(
            { message: 'Container not found' },
            { status: 404 }
          );
        }

        // Check capacity
        const currentShipments = container.shipments.filter(s => s.id !== id);
        if (currentShipments.length >= container.maxCapacity) {
          return NextResponse.json(
            { message: `Container is at full capacity (${container.maxCapacity} vehicles)` },
            { status: 400 }
          );
        }

        updateData.container = { connect: { id: data.containerId } };
        updateData.status = 'IN_TRANSIT'; // Auto-set to IN_TRANSIT when assigning container
      } else {
        updateData.container = { disconnect: true };
        updateData.status = 'ON_HAND'; // Auto-set to ON_HAND when removing container
      }
    }

    // Photos
    if (data.vehiclePhotos !== undefined) {
      if (data.replacePhotos) {
        updateData.vehiclePhotos = { set: data.vehiclePhotos || [] };
      } else {
        const currentPhotos = (existingShipment.vehiclePhotos as string[]) || [];
        updateData.vehiclePhotos = { set: [...currentPhotos, ...(data.vehiclePhotos || [])] };
      }
    }

    if (data.arrivalPhotos !== undefined) {
      if (data.replacePhotos) {
        updateData.arrivalPhotos = { set: data.arrivalPhotos || [] };
      } else {
        const currentPhotos = (existingShipment.arrivalPhotos as string[]) || [];
        updateData.arrivalPhotos = { set: [...currentPhotos, ...(data.arrivalPhotos || [])] };
      }
    }

    // Numeric fields
    if (data.weight !== undefined) {
      updateData.weight =
        typeof data.weight === 'number'
          ? data.weight
          : typeof data.weight === 'string'
          ? parseFloat(data.weight)
          : null;
    }

    // Other fields
    if (data.dimensions !== undefined) updateData.dimensions = data.dimensions;
    if (data.internalNotes !== undefined) updateData.internalNotes = data.internalNotes;
    if (data.hasKey !== undefined) updateData.hasKey = data.hasKey;
    if (data.hasTitle !== undefined) updateData.hasTitle = data.hasTitle;
    
    // Title status
    if (data.titleStatus !== undefined) {
      updateData.titleStatus = (data.hasTitle === true && data.titleStatus) ? data.titleStatus as TitleStatus : null;
    }

    const updatedShipment = await prisma.$transaction(async (tx) => {
      const shipment = await tx.shipment.update({
        where: { id },
        data: updateData,
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          container: true,
        },
      });

      return shipment;
    });

    if (updatedShipment.status !== existingShipment.status) {
      const vehicleLabel =
        [updatedShipment.vehicleYear, updatedShipment.vehicleMake, updatedShipment.vehicleModel]
          .filter(Boolean)
          .join(' ') || updatedShipment.vehicleType;
      const formattedStatus = updatedShipment.status
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase());

      try {
        await createNotification({
          userId: updatedShipment.userId,
          title: 'Shipment status updated',
          description: `Your shipment ${vehicleLabel} is now ${formattedStatus}.`,
          type: NotificationType.INFO,
          link: `/dashboard/shipments/${updatedShipment.id}`,
        });
      } catch (notificationError) {
        console.error('Failed to create shipment notification:', notificationError);
      }
    }

    // Update container counts if container assignment changed
    if (data.containerId !== undefined && data.containerId !== existingShipment.containerId) {
      const countUpdates = [];

      // 1. Decrement old container count if it existed
      if (existingShipment.containerId) {
        countUpdates.push(
          prisma.container.update({
            where: { id: existingShipment.containerId },
            data: { currentCount: { decrement: 1 } }
          })
        );
      }

      // 2. Increment new container count if it exists (and is not null)
      if (data.containerId) {
        countUpdates.push(
          prisma.container.update({
            where: { id: data.containerId },
            data: { currentCount: { increment: 1 } }
          })
        );
      }

      // Execute independent container count updates in parallel for performance, avoiding O(N) count queries
      if (countUpdates.length > 0) {
        await Promise.all(countUpdates);
      }
    }

    return NextResponse.json(
      {
        message: 'Shipment updated successfully',
        shipment: updatedShipment,
      },
      { status: 200 }
    );
  } catch (error) {
    // ... (error handling)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!hasPermission(session.user?.role, 'shipments:manage')) {
      return NextResponse.json(
        { message: 'Forbidden: Only admins can delete shipments' },
        { status: 403 }
      );
    }

    const shipment = await prisma.shipment.findUnique({
      where: { id },
      include: {
        ledgerEntries: true,
      },
    });

    if (!shipment) {
      return NextResponse.json(
        { message: 'Shipment not found' },
        { status: 404 }
      );
    }

    // Check if shipment has ledger entries
    if (shipment.ledgerEntries.length > 0) {
      return NextResponse.json(
        { 
          message: 'Cannot delete shipment with financial records. Please delete ledger entries first or contact support.' 
        },
        { status: 400 }
      );
    }

    await prisma.shipment.delete({
      where: { id },
    });

    // Update container count if shipment was in a container
    if (shipment.containerId) {
      // Optimize performance by using atomic decrement instead of an O(N) count query
      await prisma.container.update({
        where: { id: shipment.containerId },
        data: { currentCount: { decrement: 1 } }
      });
    }

    return NextResponse.json(
      { message: 'Shipment deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    // ... (error handling)
  }
}
