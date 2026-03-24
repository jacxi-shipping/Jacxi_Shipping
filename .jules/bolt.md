## 2024-05-24 - N+1 Issue in Aggregation Loops
**Learning:** Found an N+1 query issue in `src/app/api/ledger/payment/route.ts` where the code iterated over shipments and repeatedly used `await prisma.ledgerEntry.groupBy()` to calculate shipment debt within the loop. This can exponentially slow down processing for bulk payments.
**Action:** When aggregating database relations inside a loop, always extract the aggregation to a single `groupBy` query *before* the loop using an `in` filter (e.g., `where: { id: { in: ids } }`), map the results into a lookup dictionary, and use O(1) loop checks.

## 2024-05-18 - Consolidating Prisma Aggregations
**Learning:** In the `/api/finance` and `/api/ledger` routes, calculating debit and credit totals simultaneously was being done using two distinct `prisma.*.aggregate()` calls running in parallel via `Promise.all`. Since they query the same table, filtering by the exact same base conditions but with a different `type`, this results in two independent database full/index scans instead of one.
**Action:** Replace multiple `.aggregate()` calls on the same dataset with a single `.groupBy()` call, filtering by an array of values (`{ in: ['DEBIT', 'CREDIT'] }`). This safely handles missing categories if they don't exist by conditionally checking the array output (e.g. `ledgerAgg.find(g => g.type === 'DEBIT')?._sum?.amount || 0`).
