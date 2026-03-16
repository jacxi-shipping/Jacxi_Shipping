## 2024-05-19 - Avoid Array.filter().reduce() chaining on database relations
**Learning:** Using chained `.filter().reduce()` operations on relations like `shipment.ledgerEntries` creates unnecessary intermediate arrays and iterates over the data multiple times, which causes excessive memory allocation and CPU cycles when dealing with lists of entities in financial reports.
**Action:** Replace `array.filter(condition).reduce(sum)` chains with a single `for...of` loop that evaluates conditions and computes totals simultaneously to achieve O(N) iteration instead of O(xN).

## 2025-06-12 - Prisma counts and queries
**Learning:** For database performance, when an endpoint needs to execute both a list fetch (`findMany`) and multiple counts (`count` or `aggregate`), these queries can block the event loop and add latency if executed sequentially.
**Action:** Use `Promise.all` to parallelize independent database queries in Prisma.

## 2025-02-28 - [React List Mount Animation Performance]
**Learning:** Using JS-driven state (like `useState` combined with a `setTimeout` inside `useEffect`) paired with a heavy wrapper like MUI's `<Slide>` to handle staggered row entry animations causes a critical performance bottleneck in React list rendering. Every row mounts, sets a timeout, and triggers an entirely new render cycle to flip its `isVisible` state, leading to O(N) double-renders which lag heavily on large dashboards.
**Action:** When implementing entry animations for lists, strictly use pure CSS solutions. Apply standard utility classes (like `.animate-fade-in-up`) combined with inline style `animationDelay` mapping to the index. This shifts the animation completely to the browser's compositor thread and prevents all unnecessary React re-renders.

## 2024-05-18 - Atomic Updates for Performance and Race Condition Prevention
**Learning:** Using sequential `count()` followed by `update()` queries in Prisma to maintain counter fields (like `currentCount` on a `Container` model) is an O(N) operation and susceptible to race conditions if multiple relations are modified simultaneously.
**Action:** Replace sequential read-then-write counting operations with Prisma's atomic `increment: 1` and `decrement: 1` operators to achieve O(1) performance and natively prevent race conditions. Group independent atomic updates into a `Promise.all` array to parallelize database round-trips when transferring items between parent records.
## 2026-03-06 - Prevent N+1 query in invoice generation
**Learning:** Sequential string or number generation inside a loop (like invoice numbers) should pre-fetch the base count outside the loop and increment in-memory, avoiding an O(N) database count query.
**Action:** Always extract `count()` queries from loops when used purely for generating sequential identifiers.

## 2026-03-16 - Consolidating DB aggregates
**Learning:** Multiple Prisma database queries like `aggregate` for distinct categories (e.g., DEBIT and CREDIT) can and should be grouped together into a single `groupBy` query over the category field. This fundamentally changes querying from O(K) table scans into a single table scan (where K is the number of aggregations required).
**Action:** When seeing parallel `prisma.aggregate` operations grouping by a certain attribute, refactor to `prisma.groupBy` and map the values to save DB roundtrips.
