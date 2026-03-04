## 2024-05-19 - Avoid Array.filter().reduce() chaining on database relations
**Learning:** Using chained `.filter().reduce()` operations on relations like `shipment.ledgerEntries` creates unnecessary intermediate arrays and iterates over the data multiple times, which causes excessive memory allocation and CPU cycles when dealing with lists of entities in financial reports.
**Action:** Replace `array.filter(condition).reduce(sum)` chains with a single `for...of` loop that evaluates conditions and computes totals simultaneously to achieve O(N) iteration instead of O(xN).
