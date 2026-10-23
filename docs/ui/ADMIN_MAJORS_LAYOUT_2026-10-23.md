# Major administration layout — 2026-10-23

Owner requested the same organized filters and appearance as scholarships and universities. The uploaded project's MajorAdminPage already contains the intended cards and the MajorDetailPage contains its existing content/taxonomy/relations/version tabs. Those cards, profile-aware detail URLs, review controls and detail implementation are preserved.

- The hero contains an explicit create-major action, revealing one existing private-draft form. Source requirements, taxonomy permissions and creation semantics are unchanged.
- One filter card contains degree, publication/review status, completeness, canonical classification, academic field, discipline and college text. Exact taxonomy IDs are sent to the existing API. Canonical options use bounded continuation inside their dropdowns, avoiding first-page-only classification choices.
- Controls share the approved 48px Cairo styling and gold/indigo/turquoise icons. No per-field search icons or previous/next buttons were added.
- All three list modes remain: persisted majors, source catalogs and new candidates/import review. Switching mode resets list pagination.
- Source catalogs have a different read contract: Phase10CatalogRepository does not apply academicFieldId, disciplineId or collegeOrFaculty, and taxonomyNodeId changes the service path. Therefore all four canonical/college controls are disabled in source-catalog mode and omitted from that request. A visible note explains that they operate in the persisted-major list. No field names are remapped to unrelated labels or silently ignored filters.
- Missing counters render an em dash until data exists. Complete/review/published counts explicitly distinguish API totals from the current page fallback. Missing update timestamps do not imply approval.
- API, database, migrations, publishing and security contracts are unchanged.

Verification: admin TypeScript and Vite build passed. Changed-page lint has zero errors and one pre-existing `any` warning. The browser uses the built artifact with synthetic API responses and no database contact or writes: all seven query bindings, reset, single create form, all/catalog mode boundary, profile-aware detail links, Cairo/48px controls and three icon colors at 1360/820/390px. No page overflow or JavaScript errors were observed. Follow-up builds/checks were limited to actual source changes; general test suites were not repeated.

Private evidence: `private/admin-major-layout-20261023/BROWSER_CHECK.json`, screenshots, staged bundle and local artifact receipt. This is UI/client verification and does not certify live import/publication acceptance.
