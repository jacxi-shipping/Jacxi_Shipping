## 2024-05-24 - N+1 Issue in Aggregation Loops
**Learning:** Found an N+1 query issue in `src/app/api/ledger/payment/route.ts` where the code iterated over shipments and repeatedly used `await prisma.ledgerEntry.groupBy()` to calculate shipment debt within the loop. This can exponentially slow down processing for bulk payments.
**Action:** When aggregating database relations inside a loop, always extract the aggregation to a single `groupBy` query *before* the loop using an `in` filter (e.g., `where: { id: { in: ids } }`), map the results into a lookup dictionary, and use O(1) loop checks.

## 2024-05-25 - Replace parallel aggregate queries with single groupBy
**Learning:** Found multiple backend routes (`ledger` and `finance/companies/*`) calculating `DEBIT` and `CREDIT` sums via separate `Promise.all([prisma.*.aggregate({where: {type: 'DEBIT'}}), prisma.*.aggregate({where: {type: 'CREDIT'}})])` queries.
**Action:** When calculating sums for multiple static category types within the same table, consolidate the multiple `aggregate` queries into a single `groupBy` query filtering on `{ type: { in: ['DEBIT', 'CREDIT'] } }` to halve the database roundtrips. Handle empty categories gracefully with `.find(g => g.type === '<CATEGORY>')?._sum?.amount || 0`.
