import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/rbac';

const updateCompanySchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  companyType: z.enum(['SHIPPING', 'TRANSIT']).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user?.role, 'finance:view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const company = await prisma.company.findUnique({
      where: { id: params.id },
      include: {
        containers: {
          select: {
            id: true,
            containerNumber: true,
            status: true,
            currentCount: true,
            maxCapacity: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
        shipments: {
          where: {
            OR: [
              { containerId: { not: null } },
              { transitId: { not: null } },
            ],
          },
          select: {
            id: true,
            vehicleVIN: true,
            vehicleMake: true,
            vehicleModel: true,
            status: true,
            createdAt: true,
            transitId: true,
            containerId: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 200,
        },
        transits: {
          select: {
            id: true,
            referenceNumber: true,
            status: true,
            origin: true,
            destination: true,
            createdAt: true,
            _count: {
              select: {
                shipments: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
        _count: {
          select: {
            ledgerEntries: true,
            containers: true,
            shipments: true,
            transits: true,
          },
        },
      },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const transitShipments = company.companyType === 'TRANSIT'
      ? await prisma.shipment.findMany({
          where: { transit: { companyId: company.id } },
          select: {
            id: true,
            vehicleVIN: true,
            vehicleMake: true,
            vehicleModel: true,
            status: true,
            createdAt: true,
            transitId: true,
            containerId: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 200,
        })
      : [];

    const [aggregateGroups, latestEntry] = await Promise.all([
      // ⚡ Bolt: Consolidated multiple prisma.aggregate queries into a single prisma.groupBy query to reduce database roundtrips.
      prisma.companyLedgerEntry.groupBy({
        by: ['type'],
        where: { companyId: company.id, type: { in: ['DEBIT', 'CREDIT'] } },
        _sum: { amount: true },
      }),
      prisma.companyLedgerEntry.findFirst({
        where: { companyId: company.id },
        orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
        select: { balance: true },
      }),
    ]);

    const totalDebit = aggregateGroups.find(g => g.type === 'DEBIT')?._sum.amount || 0;
    const totalCredit = aggregateGroups.find(g => g.type === 'CREDIT')?._sum.amount || 0;

    const responseCompany = company.companyType === 'TRANSIT'
      ? {
          ...company,
          shipments: transitShipments,
          _count: {
            ...company._count,
            shipments: transitShipments.length,
          },
        }
      : company;

    return NextResponse.json({
      company: responseCompany,
      summary: {
        totalDebit,
        totalCredit,
        currentBalance: latestEntry?.balance || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching company:', error);
    return NextResponse.json({ error: 'Failed to fetch company' }, { status: 500 });
  }
}

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

    if (!hasPermission(session.user?.role, 'finance:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateCompanySchema.parse(body);

    const existing = await prisma.company.findUnique({ where: { id: params.id } });

    if (!existing) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const company = await prisma.company.update({
      where: { id: params.id },
      data: {
        ...validatedData,
      },
    });

    return NextResponse.json({ company });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 });
    }

    console.error('Error updating company:', error);
    return NextResponse.json({ error: 'Failed to update company' }, { status: 500 });
  }
}

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

    if (!hasPermission(session.user?.role, 'finance:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const forceDelete = searchParams.get('force') === 'true';

    const company = await prisma.company.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            ledgerEntries: true,
          },
        },
      },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    if (company._count.ledgerEntries > 0 && !forceDelete) {
      return NextResponse.json(
        { error: 'Company has ledger transactions. Use force=true to delete all records.' },
        { status: 400 }
      );
    }

    await prisma.company.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting company:', error);
    return NextResponse.json({ error: 'Failed to delete company' }, { status: 500 });
  }
}
