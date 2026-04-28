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
    const meta = (entry.metadata ?? {}) as Record<string, unknown>;
    // Pending invoice entries (DUE expenses awaiting invoice payment) do NOT affect
    // the running balance — they only become real when the invoice is paid.
    const isPendingInvoice = meta.pendingInvoice === true;
    // Payment allocation entries track how a payment was split across shipments.
    // The overall balance impact is already captured by the main CREDIT payment entry,
    // so these per-shipment entries must be excluded to prevent double-counting.
    const isPaymentAllocation = meta.isPaymentAllocation === true;

    if (!isPendingInvoice && !isPaymentAllocation) {
      runningBalance = applyLedgerDelta(runningBalance, entry.type, entry.amount);
    }
    // Pending entries store the same balance as the previous non-pending entry
    // so that latestEntry.balance always reflects the effective balance.
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
    await Promise.all(updates);
  }

  return runningBalance;
}
