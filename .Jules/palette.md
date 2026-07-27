## 2025-06-05 - Missing ARIA label in GlobalSearch close button
**Learning:** Found an icon-only `<button>` in `src/components/dashboard/GlobalSearch.tsx` that triggers closing the modal but had no `aria-label` or accessible text. Screen readers would just announce "button", which provides no context on what action will be performed.
**Action:** Added `aria-label="Close search"` to the `<button>` element to ensure it's fully accessible to screen reader users, while keeping its visual appearance consistent. Icon-only buttons should always be checked for accessible labels.
