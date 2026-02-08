import { NextRequest, NextResponse } from 'next/server';
import { ShipmentSimpleStatus, NotificationType } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createNotifications } from '@/lib/notifications';

// POST: Bulk operations on shipments
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (session.user?.role !== 'admin') {
      return NextResponse.json(
        { message: 'Forbidden: Only admins can perform bulk operations' },
        { status: 403 }
      );
    }

    const { action, shipmentIds, data } = await request.json();

    if (!action || !shipmentIds || !Array.isArray(shipmentIds)) {
      return NextResponse.json(
        { message: 'Action and shipmentIds array are required' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'updateStatus':
        if (!data?.status) {
          return NextResponse.json(
            { message: 'Status is required for updateStatus action' },
            { status: 400 }
          );
        }
        // Validate status is either ON_HAND or IN_TRANSIT
        if (data.status !== 'ON_HAND' && data.status !== 'IN_TRANSIT') {
          return NextResponse.json(
            { message: 'Status must be ON_HAND or IN_TRANSIT' },
            { status: 400 }
          );
        }
        result = await prisma.shipment.updateMany({
          where: { id: { in: shipmentIds } },
          data: { status: data.status as ShipmentSimpleStatus },
        });

        try {
          const shipments = await prisma.shipment.findMany({
            where: { id: { in: shipmentIds } },
            select: {
              id: true,
              userId: true,
              vehicleType: true,
              vehicleMake: true,
              vehicleModel: true,
              vehicleYear: true,
            },
          });

          const formattedStatus = data.status
            .replace(/_/g, ' ')
            .toLowerCase()
            .replace(/\b\w/g, (char: string) => char.toUpperCase());

          await createNotifications(
            shipments.map((shipment) => {
              const vehicleLabel =
                [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel]
                  .filter(Boolean)
                  .join(' ') || shipment.vehicleType;
              return {
                userId: shipment.userId,
                title: 'Shipment status updated',
                description: `Your shipment ${vehicleLabel} is now ${formattedStatus}.`,
                type: NotificationType.INFO,
                link: `/dashboard/shipments/${shipment.id}`,
              };
            })
          );
        } catch (notificationError) {
          console.error('Failed to create bulk shipment notifications:', notificationError);
        }
        break;

      case 'assignContainer':
        if (!data?.containerId) {
          return NextResponse.json(
            { message: 'Container ID is required for assignContainer action' },
            { status: 400 }
          );
        }
        result = await prisma.shipment.updateMany({
          where: { id: { in: shipmentIds } },
          data: { 
            containerId: data.containerId,
            status: 'IN_TRANSIT' as ShipmentSimpleStatus,
          },
        });

        try {
          const shipments = await prisma.shipment.findMany({
            where: { id: { in: shipmentIds } },
            select: {
              id: true,
              userId: true,
              vehicleType: true,
              vehicleMake: true,
              vehicleModel: true,
              vehicleYear: true,
            },
          });

          await createNotifications(
            shipments.map((shipment) => {
              const vehicleLabel =
                [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel]
                  .filter(Boolean)
                  .join(' ') || shipment.vehicleType;
              return {
                userId: shipment.userId,
                title: 'Shipment assigned to container',
                description: `Your shipment ${vehicleLabel} is now In Transit.`,
                type: NotificationType.INFO,
                link: `/dashboard/shipments/${shipment.id}`,
              };
            })
          );
        } catch (notificationError) {
          console.error('Failed to create container assignment notifications:', notificationError);
        }
        break;

      case 'assignUser':
        if (!data?.userId) {
          return NextResponse.json(
            { message: 'User ID is required for assignUser action' },
            { status: 400 }
          );
        }
        result = await prisma.shipment.updateMany({
          where: { id: { in: shipmentIds } },
          data: { userId: data.userId },
        });
        break;

      case 'updatePaymentStatus':
        if (!data?.paymentStatus) {
          return NextResponse.json(
            { message: 'Payment status is required for updatePaymentStatus action' },
            { status: 400 }
          );
        }
        result = await prisma.shipment.updateMany({
          where: { id: { in: shipmentIds } },
          data: { paymentStatus: data.paymentStatus as 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'CANCELLED' },
        });
        break;

      case 'delete':
        result = await prisma.shipment.deleteMany({
          where: { id: { in: shipmentIds } },
        });
        break;

      case 'export':
        // Fetch shipments for export
        const shipments = await prisma.shipment.findMany({
          where: { id: { in: shipmentIds } },
          include: {
            user: {
              select: {
                name: true,
                email: true,
                phone: true,
              },
            },
            container: {
              select: {
                containerNumber: true,
                vesselName: true,
                status: true,
              },
            },
          },
        });

        return NextResponse.json({
          message: 'Shipments exported successfully',
          data: shipments,
          count: shipments.length,
        });

      default:
        return NextResponse.json(
          { message: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      message: `Bulk ${action} completed successfully`,
      count: result?.count || 0,
    });
  } catch (error) {
    console.error('Error performing bulk operation:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

