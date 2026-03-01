## 2025-06-12 - Prisma counts and queries
**Learning:** For database performance, when an endpoint needs to execute both a list fetch (`findMany`) and multiple counts (`count` or `aggregate`), these queries can block the event loop and add latency if executed sequentially.
**Action:** Use `Promise.all` to parallelize independent database queries in Prisma.
