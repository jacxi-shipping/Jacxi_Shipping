import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 1. Get total debits, credits, and counts grouped by user and type
    // This is efficient as it uses database aggregation
    const groupedSummaries = await prisma.ledgerEntry.groupBy({
      by: ['userId', 'type'],
      _sum: {
        amount: true,
      },
      _count: {
        _all: true,
      },
    });

    // 2. Get the latest balance and transaction date for each user
    // Using Prisma's distinct feature for type-safe query to get the latest entry per user
    const latestEntries = await prisma.ledgerEntry.findMany({
      distinct: ['userId'],
      orderBy: [
        { userId: 'asc' },
        { transactionDate: 'desc' },
      ],
      select: {
        userId: true,
        balance: true,
        transactionDate: true,
      },
    });

    // 3. Combine the data into a map for O(1) lookup
    const summaryMap: Record<string, {
      totalDebit: number;
      totalCredit: number;
      transactionCount: number;
      currentBalance: number;
      lastTransaction: string | null;
    }> = {};

    // Initialize with latest entries to capture balance and last transaction date
    latestEntries.forEach((entry) => {
      summaryMap[entry.userId] = {
        totalDebit: 0,
        totalCredit: 0,
        transactionCount: 0,
        currentBalance: entry.balance,
        lastTransaction: entry.transactionDate.toISOString(),
      };
    });

    // Add grouped data (totals and counts)
    groupedSummaries.forEach((group) => {
      // If for some reason a user is in grouped data but not in latestEntries (shouldn't happen), initialize them
      if (!summaryMap[group.userId]) {
        summaryMap[group.userId] = {
          totalDebit: 0,
          totalCredit: 0,
          transactionCount: 0,
          currentBalance: 0,
          lastTransaction: null,
        };
      }

      const summary = summaryMap[group.userId];

      if (group.type === 'DEBIT') {
        summary.totalDebit = group._sum.amount || 0;
      } else if (group.type === 'CREDIT') {
        summary.totalCredit = group._sum.amount || 0;
      }

      summary.transactionCount += group._count._all;
    });

    return NextResponse.json({ summaries: summaryMap });
  } catch (error) {
    console.error('Error fetching ledger summaries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ledger summaries' },
      { status: 500 }
    );
  }
}
