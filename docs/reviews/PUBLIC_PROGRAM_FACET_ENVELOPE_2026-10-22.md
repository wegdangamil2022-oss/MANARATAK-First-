# Public program facet response envelope

The real browser/database diagnostic exposed retry controls for degree, major and study-language filters even when `GET /api/v1/public/academic-program-explorer?facet=...` returned 200. `AcademicProgramExplorerRouter` returns `{ data: result }`. The Web API client returned the entire envelope as if it were the facet page, so `PublicCatalogChoices` passed undefined items/total into its bounded-catalog validator.

The client now unwraps `data`, matching the existing server contract. Pagination cursors, query/locale, cancellation, publication boundaries and unavailable states are preserved. No reference fallback, schema change, database mutation or relaxation of validation is introduced. Empty published catalogs remain empty even when reference data is installed.

Five focused tests cover all three facets, pagination/filter/cancellation propagation, an empty published-owner page and owner unavailability. Four response-shape cases failed before the fix; all five passed after it. Targeted ESLint found zero errors; existing warnings in the large client file remain. A Web build and a focused browser confirmation are recorded separately when executed; this source test result alone does not establish browser or production readiness.

The fix is prepared in an isolated checkout descending from `631a18a4acd8dc7a2f4b8defc196b52a5d415a1d`. The database import checkout remains pinned to that reviewed revision so its active authorization, snapshots and checkpoints remain valid.
