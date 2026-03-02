## 2025-06-12 - Prisma counts and queries
**Learning:** For database performance, when an endpoint needs to execute both a list fetch (`findMany`) and multiple counts (`count` or `aggregate`), these queries can block the event loop and add latency if executed sequentially.
**Action:** Use `Promise.all` to parallelize independent database queries in Prisma.

## 2025-02-28 - [React List Mount Animation Performance]
**Learning:** Using JS-driven state (like `useState` combined with a `setTimeout` inside `useEffect`) paired with a heavy wrapper like MUI's `<Slide>` to handle staggered row entry animations causes a critical performance bottleneck in React list rendering. Every row mounts, sets a timeout, and triggers an entirely new render cycle to flip its `isVisible` state, leading to O(N) double-renders which lag heavily on large dashboards.
**Action:** When implementing entry animations for lists, strictly use pure CSS solutions. Apply standard utility classes (like `.animate-fade-in-up`) combined with inline style `animationDelay` mapping to the index. This shifts the animation completely to the browser's compositor thread and prevents all unnecessary React re-renders.
