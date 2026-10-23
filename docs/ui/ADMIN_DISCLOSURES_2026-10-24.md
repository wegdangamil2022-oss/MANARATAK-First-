# Unified dashboard and review disclosures — 2026-10-24

The seven supporting panels used unrelated summary sizes and inconsistent inner text. Closed panels did not clearly indicate hidden content.

## Changes

- Shared native summary with a Cairo 17px heading, distinct icon, short explanation and left gold chevron. The curved gold rail extends along the physical left edge of each panel; the chevron rotates when opened.
- Consistent 94px minimum header height and spacing. Long mobile titles wrap without reducing their font size.
- Cairo 15px text inside the panels, including explanations, source details, tables, labels and actions. Counts remain distinct at 22px. Supporting header descriptions use 13px.
- Inner metric and review grids reserve enough card width for readable text. Coverage entries use separate outlined rows. Source coverage uses a keyboard-focusable scroll region capped at 440px with sticky table headings.
- Native details/summary activation, permission checks, lazy group reads, source evidence, unknown values, review filters, ten-row pagination and owner workspace actions are preserved. No API, schema or migration changes.

## Verification

- Admin TypeScript check passed.
- DashboardPermission: 3 cases passed; ReviewQueueSession: 7 cases passed. These check directly affected permission/session, lazy read and evidence behavior. Unaffected backend suites were not rerun.
- ESLint: zero errors; seven existing hook dependency/ref warnings in the two page components.
- Browser with explicitly synthetic API responses: all seven panels have Cairo 17px headings, a 3px gold left rail and left chevron at viewport widths 1360, 1000, 820 and 390. Desktop panel headings share the same height.
- Open/close via Enter and Space, readable inner text, mobile overflow and the bounded coverage table checked in the browser. Synthetic evidence is for UI behavior and does not establish live database readiness.

## Local delivery

The built frontend is installed without restarting the API, retaining previous hashed assets for open tabs and matching the served HTML to the reviewed bundle. Build/install evidence records the frontend source SHA separately from the API runtime SHA.

Previously documented live API/authentication latency remains outside this presentation change. This delivery does not claim to resolve that latency or to complete production acceptance.
[Compiled browser and local install evidence](evidence/ADMIN_DISCLOSURES_2026-10-24.json) records the exact source and runtime separately. All seven expanded panels were checked on mobile without page overflow.
