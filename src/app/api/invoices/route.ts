import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * GET /api/invoices
 * Get all invoices (admin) or user's invoices (regular user)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');
    const containerId = searchParams.get('containerId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause
    const where: any = {};

    // If not admin, only show user's own invoices
    if (session.user.role !== 'admin') {
      where.userId = session.user.id;
    } else if (userId) {
      // Admin can filter by userId
      where.userId = userId;
    }

    if (status) {
      where.status = status;
    }

    if (containerId) {
      where.containerId = containerId;
    }

    // Get invoices
    const [invoices, total] = await Promise.all([
      prisma.userInvoice.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          container: {
            select: {
              id: true,
              containerNumber: true,
              status: true,
            },
          },
          lineItems: {
            include: {
              shipment: {
                select: {
                  id: true,
                  vehicleMake: true,
                  vehicleModel: true,
                  vehicleYear: true,
                  vehicleVIN: true,
                },
              },
            },
          },
          _count: {
            select: {
              lineItems: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      prisma.userInvoice.count({ where }),
    ]);

    return NextResponse.json({
      invoices,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });

  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}
