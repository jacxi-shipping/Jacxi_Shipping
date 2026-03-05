import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

const createCompanySchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  country: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const active = searchParams.get('active');

    const where: {
      OR?: Array<{ name?: { contains: string; mode: 'insensitive' }; code?: { contains: string; mode: 'insensitive' }; email?: { contains: string; mode: 'insensitive' } }>;
      isActive?: boolean;
    } = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (active === 'true' || active === 'false') {
      where.isActive = active === 'true';
    }

    // Parallelize independent queries: fetching companies and calculating aggregate ledgers
    const [companies, grouped] = await Promise.all([
      prisma.company.findMany({
        where,
        include: {
          _count: {
            select: {
              ledgerEntries: true,
            },
          },
          ledgerEntries: {
            take: 1,
            orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
            select: {
              balance: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.companyLedgerEntry.groupBy({
        by: ['companyId', 'type'],
        _sum: {
          amount: true,
        },
      }),
    ]);

    const summaryMap: Record<string, { totalDebit: number; totalCredit: number }> = {};

    for (const row of grouped) {
      if (!summaryMap[row.companyId]) {
        summaryMap[row.companyId] = { totalDebit: 0, totalCredit: 0 };
      }

      if (row.type === 'DEBIT') {
        summaryMap[row.companyId].totalDebit = row._sum.amount || 0;
      } else {
        summaryMap[row.companyId].totalCredit = row._sum.amount || 0;
      }
    }

    const payload = companies.map((company) => {
      const summary = summaryMap[company.id] || { totalDebit: 0, totalCredit: 0 };

      return {
        ...company,
        currentBalance: company.ledgerEntries[0]?.balance || 0,
        totalDebit: summary.totalDebit,
        totalCredit: summary.totalCredit,
      };
    });

    return NextResponse.json({ companies: payload });
  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createCompanySchema.parse(body);

    const company = await prisma.company.create({
      data: {
        name: validatedData.name,
        code: validatedData.code || null,
        email: validatedData.email || null,
        phone: validatedData.phone || null,
        address: validatedData.address || null,
        country: validatedData.country || null,
        notes: validatedData.notes || null,
        isActive: validatedData.isActive,
        createdBy: session.user.id as string,
      },
    });

    return NextResponse.json({ company }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 });
    }

    console.error('Error creating company:', error);
    return NextResponse.json({ error: 'Failed to create company' }, { status: 500 });
  }
}
