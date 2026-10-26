# Destinations and reference administration — execution, 2026-10-26

Scope: approved v1.16 sections 08 and 09 only. Branch: `feat/destinations-reference-admin-20261026`, based on completed courses branch `feat/courses-admin-workspaces-20261025` (`61cbde24`). Latest main inspected: `10179ab97eddba9b236238714dea1d68859f469e`; relevant owner files matched that baseline. No merge into main.

## Implemented

### Section 08 — study destinations

- Retained the country catalog and its 24-record server pages; list URL/filter/return context and page-scoped metrics remain explicit.
- Country detail has four navigation groups and ten sections, stable `section` URLs and legacy relation/location compatibility. Readiness actions target a semantic card and content language.
- Read-first content cards with one editor at a time, save/cancel/reason, dirty-navigation protection, conflict retention, owner reread, and a warning before changes that may invalidate a published profile.
- Arabic and English display are separate. English editing is disabled under the existing translation policy at both UI and application command boundaries. Arabic saves omit protected English content. Unchanged English API round trips preserve original whitespace and structured values.
- Costs, source evidence and official links use structured rows; literal pipes are retained. Existing date, authority approval, independent reviewer, fingerprint, asset eligibility and publication gates remain in the original owner commands.
- Separate bounded university and scholarship owner lists, country/city/status/funding/search filters; program explorer supports server name/university filters and existing major/degree/test/language matching. Supporting cities, tests, services, jobs, provider-headquarters courses and editorial links remain available with source status and bounded navigation. Provider headquarters are not presented as study locations.
- Authenticated/no-store/noindex saved-content preview. Public draft endpoints remain protected by the original publication policy. Published profiles retain the actual public-page link.
- Source audit date and independent review timestamp are distinct. Missing content, references, images and approvals remain explicit.

### Section 09 — reference data

- Six-entry home and navigation: countries, currencies, languages, administrative regions, cities and quality/governance. Both `/reference-data` and the existing `/settings/reference-data` route work; legacy `p7Tab` links remain valid.
- Five owner lists: server search/filters and 50-record paging, table default/cards optional, per-section saved context, lifecycle filters, canonical country→region selection and additional provider/update filters.
- Exact-ID owner detail endpoint replaces name-based detail resolution, including historical records. Four detail areas: basic fields, relationships, sources/aliases and governance/history. Field-group edit/save/cancel, immutable identities, expected versions and explicit error states.
- Canonical country/region identity cannot be silently rewritten. Missing coordinates remain null; IANA suggestions are clearly distinguished from an approved standards snapshot. Language references do not enable translations. No exchange-rate behavior introduced.
- Reused existing aliases, provider reconciliation, source metadata, paged history, replacement relationships, dependency impact, lifecycle decisions and P6→P7 approvals. Region replacements now use regions in the same country instead of the city picker.
- Quality covers all nine existing issue kinds. Country, entity type and Arabic/English/ID search apply before facet counts and server paging. Repair links contain the exact owner type/ID. Unknown source/alias/official coverage is not converted into a successful zero.
- Existing standards decisions and source workbook/derived-reference previews retained. File previews are bounded and do not promote records.

## Changes by layer

- UI pages: `StudyDestinationsAdminPage`, `StudyDestinationDetailPage`, `ReferenceDataAdminPage`, reference route alias in `App`.
- New scoped destination/reference feature components, navigation/form models, styles and common draft/history guard.
- Existing `AcademicProgramExplorerPanel`, `ReferenceQualityWorkspace`, `ReferenceGovernancePanel` and reference API client extended without replacing their owner operations.
- API: destination preview; exact reference record read; validated quality/program query additions.
- Application/domain/infrastructure: translation write guard and exact-English preservation; bounded reference reads; additive quality query/result fields and parameterized SQL scope.
- No Prisma schema or migration changes. No production migration, seed, import, source approval, publication or main merge performed.

## Verification actually executed

- **292 tests passed in 44 files** using `config/testing/destinations-reference-admin.vitest.config.ts`. Includes existing destination publication/source/asset/revision and reference lifecycle/alias/reconciliation/owner contracts plus the new navigation, translation, exact record and program-query tests.
- API, admin and public web TypeScript project build: passed. Admin Vite production build: passed. API esbuild bundle: passed.
- ESLint: **0 errors**, 44 warnings (existing/explicit-any and inherited patterns; not represented as zero warnings).
- Actual PostgreSQL 16 acceptance was confined to the attested local DB-T lab on port 60157. Browser/API harness only accepts the isolated fixture receipt and origin `127.0.0.2:3157`. No acceptance fixtures were written to the original Neon database.
- **16 main acceptance groups + 4 additional groups passed** through canonical password/MFA sessions and real API/CSRF/idempotency paths: save/readback, exact English preservation and literal pipes, stale versions, forbidden English writes, publication rejection, duplicate city names by ID, city identity/null coordinates, actual Arabic quality SQL search, preview/anonymous/denied-role authorization, one-card save/cancel, ten-section navigation, read-first dialog/group cancel, unsaved Escape refusal, sources/history loading, exact repair links, English/LTR, Cairo and 360/320px document overflow checks.
- Browser page error list was empty. This is functional acceptance, not a database latency/load benchmark.
- Screenshots in `evidence/destinations-reference-20261026/` are real isolated-fixture renders, not original data: desktop home, destination detail, city dialog, quality, sources, English and phone views. See `acceptance.json` and `additional-acceptance.json` for exact checks.
- Re-runnable scripts: `scripts/testing/destinations-reference-browser-acceptance.mjs` and `destinations-reference-additional-acceptance.mjs`. They require the attested private DB-T server and fixture receipt; they must never be redirected to a production/original database.

## Operational boundaries and unproven cases

- This delivery does not activate translation authoring, approve a standards/source snapshot, populate absent country content, or manufacture independent publication evidence. Those remain owner decisions under current policy.
- The protected preview renders saved editorial content. Image reuse/preview remains in the existing permission-controlled EAP picker; no live production asset-delivery test was performed for this scope.
- Source workbook promotion and standards approvals were preserved and covered by owner contract tests; no new real source file or approval was applied. Old advanced governance/import tools retain some bilingual/Arabic terminology when the shell is English.
- Real production publication, long-running load/latency benchmarks and exhaustive 200% text-zoom audits were not performed. No claim of production deployment or complete source coverage is made.

Screenshots and acceptance records are suitable for review; the reference database and the editorial destination profile remain separate owners.

## Delivery and original runtime status

- Commit `8a0395dd4b7b9e5361c47459cdf573307b5e5ceb` was pushed and independently verified with `git ls-remote`.
- Draft PR: https://github.com/wegdangamil2022-oss/MANARATAK-First-/pull/46 (base: completed courses branch; no main merge).
- Secret scan passed across 9,596 tracked files; final TypeScript and admin production build passed. Additional screenshots were refreshed against the final admin build.
- The proposed code-only local original-database runtime did **not** activate. Its existing approval guard rejected a source-baseline mismatch before API/database startup. Automatic approval review then rejected an attempted guard update with `blocked by policy`; the rejected update was not executed. No alternative bypass was attempted.
- The existing original Neon development runtime remains on source `61cbde241a99e1b52ac96e960b47d6e0b822a5ef`; port 3000 was not stopped or replaced. Consequently, this PR must not be described as already visible on the original-database runtime. The tested new code remains available in the isolated preview and on the pushed branch.
