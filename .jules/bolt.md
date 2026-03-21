## 2024-05-24 - N+1 Issue in Aggregation Loops
**Learning:** Found an N+1 query issue in `src/app/api/ledger/payment/route.ts` where the code iterated over shipments and repeatedly used `await prisma.ledgerEntry.groupBy()` to calculate shipment debt within the loop. This can exponentially slow down processing for bulk payments.
**Action:** When aggregating database relations inside a loop, always extract the aggregation to a single `groupBy` query *before* the loop using an `in` filter (e.g., `where: { id: { in: ids } }`), map the results into a lookup dictionary, and use O(1) loop checks.

## 2025-02-19 - N+1 Issue in Parallel Aggregations
**Learning:** Found a performance bottleneck where calculating separate DEBIT and CREDIT summaries for ledger entries required launching multiple independent `prisma.aggregate` database queries. Even when run in parallel using `Promise.all`, these still execute as distinct queries on the database.
**Action:** Consolidate multiple separate category summations (like DEBIT and CREDIT) from the same table into a single `prisma.groupBy` query, grouping by the category type. Use `.find(g => g.type === '<CATEGORY>')?._sum.amount || 0` to safely extract values from the results.
