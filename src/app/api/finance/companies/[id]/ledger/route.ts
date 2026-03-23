import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { recalculateCompanyLedgerBalances } from '@/lib/company-ledger';
import { hasPermission } from '@/lib/rbac';

const createEntrySchema = z.object({
  description: z.string().min(1),
  type: z.enum(['DEBIT', 'CREDIT']),
  amount: z.number().positive(),
  transactionDate: z.string().optional(),
  category: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

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

    if (!hasPermission(session.user?.role, 'finance:view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const company = await prisma.company.findUnique({
      where: { id: params.id },
      select: { id: true },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || '';

    const where: {
      companyId: string;
      type?: 'DEBIT' | 'CREDIT';
      OR?: Array<{
        description?: { contains: string; mode: 'insensitive' };
        category?: { contains: string; mode: 'insensitive' };
        notes?: { contains: string; mode: 'insensitive' };
        reference?: { contains: string; mode: 'insensitive' };
      }>;
    } = { companyId: params.id };

    if (type === 'DEBIT' || type === 'CREDIT') {
      where.type = type;
    }

    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } },
      ];
    }

    // ⚡ Bolt: Consolidated multiple aggregate queries into a single groupBy query to reduce database roundtrips
    const [entries, ledgerAgg, latestEntry] = await Promise.all([
      prisma.companyLedgerEntry.findMany({
        where,
        orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.companyLedgerEntry.groupBy({
        by: ['type'],
        where: { companyId: params.id },
        _sum: { amount: true },
      }),
      prisma.companyLedgerEntry.findFirst({
        where: { companyId: params.id },
        orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
        select: { balance: true },
      }),
    ]);

    const totalDebit = ledgerAgg.find((g: any) => g.type === 'DEBIT')?._sum?.amount || 0;
    const totalCredit = ledgerAgg.find((g: any) => g.type === 'CREDIT')?._sum?.amount || 0;

    return NextResponse.json({
      entries,
      summary: {
        totalDebit,
        totalCredit,
        currentBalance: latestEntry?.balance || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching company ledger entries:', error);
    return NextResponse.json({ error: 'Failed to fetch ledger entries' }, { status: 500 });
  }
}

export async function POST(
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

    const company = await prisma.company.findUnique({
      where: { id: params.id },
      select: { id: true },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = createEntrySchema.parse(body);

    const entry = await prisma.$transaction(async (tx) => {
      const created = await tx.companyLedgerEntry.create({
        data: {
          companyId: params.id,
          description: validatedData.description,
          type: validatedData.type,
          amount: validatedData.amount,
          balance: 0,
          transactionDate: validatedData.transactionDate
            ? new Date(validatedData.transactionDate)
            : new Date(),
          category: validatedData.category || null,
          reference: validatedData.reference || null,
          notes: validatedData.notes || null,
          metadata: validatedData.metadata !== undefined
            ? (validatedData.metadata as Prisma.InputJsonValue)
            : undefined,
          createdBy: session.user!.id as string,
        },
      });

      await recalculateCompanyLedgerBalances(tx, params.id);

      return created;
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 });
    }

    console.error('Error creating company ledger entry:', error);
    return NextResponse.json({ error: 'Failed to create ledger entry' }, { status: 500 });
  }
}
