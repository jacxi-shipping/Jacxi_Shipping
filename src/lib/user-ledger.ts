import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

type DbClient = Prisma.TransactionClient | typeof prisma;

function applyLedgerDelta(currentBalance: number, type: 'DEBIT' | 'CREDIT', amount: number) {
  return type === 'DEBIT' ? currentBalance + amount : currentBalance - amount;
}

export async function recalculateUserLedgerBalances(db: DbClient, userId: string) {
  const entries = await db.ledgerEntry.findMany({
    where: { userId },
    orderBy: [{ transactionDate: 'asc' }, { createdAt: 'asc' }],
  });

  let runningBalance = 0;

  const updates = [];

  for (const entry of entries) {
    runningBalance = applyLedgerDelta(runningBalance, entry.type, entry.amount);

    if (entry.balance !== runningBalance) {
      updates.push(
        db.ledgerEntry.update({
          where: { id: entry.id },
          data: { balance: runningBalance },
        })
      );
    }
  }

  if (updates.length > 0) {
    // ⚡ Bolt: Replaced sequential O(N) database updates with a single Promise.all
    // to execute all ledger balance corrections concurrently, significantly reducing network latency roundtrips.
    await Promise.all(updates);
  }

  return runningBalance;
}
