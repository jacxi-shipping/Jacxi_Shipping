## 2024-05-19 - Avoid Array.filter().reduce() chaining on database relations
**Learning:** Using chained `.filter().reduce()` operations on relations like `shipment.ledgerEntries` creates unnecessary intermediate arrays and iterates over the data multiple times, which causes excessive memory allocation and CPU cycles when dealing with lists of entities in financial reports.
**Action:** Replace `array.filter(condition).reduce(sum)` chains with a single `for...of` loop that evaluates conditions and computes totals simultaneously to achieve O(N) iteration instead of O(xN).
## 2025-06-12 - Prisma counts and queries
**Learning:** For database performance, when an endpoint needs to execute both a list fetch (`findMany`) and multiple counts (`count` or `aggregate`), these queries can block the event loop and add latency if executed sequentially.
**Action:** Use `Promise.all` to parallelize independent database queries in Prisma.

## 2024-05-18 - Atomic Updates for Performance and Race Condition Prevention
**Learning:** Using sequential `count()` followed by `update()` queries in Prisma to maintain counter fields (like `currentCount` on a `Container` model) is an O(N) operation and susceptible to race conditions if multiple relations are modified simultaneously.
**Action:** Replace sequential read-then-write counting operations with Prisma's atomic `increment: 1` and `decrement: 1` operators to achieve O(1) performance and natively prevent race conditions. Group independent atomic updates into a `Promise.all` array to parallelize database round-trips when transferring items between parent records.
