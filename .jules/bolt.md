## 2024-05-24 - N+1 Issue in Aggregation Loops
**Learning:** Found an N+1 query issue in `src/app/api/ledger/payment/route.ts` where the code iterated over shipments and repeatedly used `await prisma.ledgerEntry.groupBy()` to calculate shipment debt within the loop. This can exponentially slow down processing for bulk payments.
**Action:** When aggregating database relations inside a loop, always extract the aggregation to a single `groupBy` query *before* the loop using an `in` filter (e.g., `where: { id: { in: ids } }`), map the results into a lookup dictionary, and use O(1) loop checks.

## 2024-05-25 - Redundant Aggregations on the Same Table
**Learning:** Found multiple instances where the codebase performed separate `prisma.aggregate` queries to calculate sums for different categories (e.g., DEBIT vs CREDIT totals) on the same table within a `Promise.all`. While parallelized, this still requires multiple database roundtrips for operations that can be combined.
**Action:** Consolidate separate `prisma.aggregate` queries that group by a specific field into a single `prisma.groupBy` query with an `in` filter (e.g., `where: { type: { in: ['DEBIT', 'CREDIT'] } }`) to calculate all totals in a single database roundtrip.
