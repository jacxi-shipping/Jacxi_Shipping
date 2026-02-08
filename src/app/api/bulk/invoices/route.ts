import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { NotificationType } from '@prisma/client';
import { createNotifications } from '@/lib/notifications';

const allowedStatuses = ['DRAFT', 'PENDING', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'];

// POST: Bulk operations on invoices
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

    const { action, invoiceIds, data } = await request.json();

    if (!action || !invoiceIds || !Array.isArray(invoiceIds)) {
      return NextResponse.json(
        { message: 'Action and invoiceIds array are required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'updateStatus': {
        const status = data?.status;
        if (!status || !allowedStatuses.includes(status)) {
          return NextResponse.json(
            { message: 'Invalid status for updateStatus action' },
            { status: 400 }
          );
        }

        const result = await prisma.userInvoice.updateMany({
          where: { id: { in: invoiceIds } },
          data: { status },
        });

        try {
          const invoices = await prisma.userInvoice.findMany({
            where: { id: { in: invoiceIds } },
            select: {
              id: true,
              userId: true,
              invoiceNumber: true,
            },
          });

          const formattedStatus = status
            .replace(/_/g, ' ')
            .toLowerCase()
            .replace(/\b\w/g, (char: string) => char.toUpperCase());

          await createNotifications(
            invoices.map((invoice) => ({
              userId: invoice.userId,
              title: 'Invoice status updated',
              description: `Invoice ${invoice.invoiceNumber} is now ${formattedStatus}.`,
              type: NotificationType.INFO,
              link: `/dashboard/invoices/${invoice.id}`,
            }))
          );
        } catch (notificationError) {
          console.error('Failed to create bulk invoice notifications:', notificationError);
        }

        return NextResponse.json({
          message: 'Bulk status update completed successfully',
          count: result.count,
        });
      }

      case 'delete': {
        const result = await prisma.userInvoice.deleteMany({
          where: { id: { in: invoiceIds } },
        });

        return NextResponse.json({
          message: 'Bulk delete completed successfully',
          count: result.count,
        });
      }

      case 'export': {
        const invoices = await prisma.userInvoice.findMany({
          where: { id: { in: invoiceIds } },
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
            container: {
              select: {
                containerNumber: true,
              },
            },
          },
        });

        return NextResponse.json({
          message: 'Invoices exported successfully',
          data: invoices,
          count: invoices.length,
        });
      }

      default:
        return NextResponse.json(
          { message: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error performing bulk operation:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
