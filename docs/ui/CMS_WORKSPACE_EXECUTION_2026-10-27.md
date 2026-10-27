# CMS workspace reorganization — 2026-10-27

Baseline: `main` at `19cb5ff0c3888238da8e3950e0ccdab174256cde`. Scope is CMS, explicitly confirmed by the owner. Implementation branch: `feat/cms-workspace-reorganization-20261027`.

## Audit and decisions

The supplied section-10 plan described an older main revision. Current code still combines library, creation, taxonomy, locale authoring, review, revisions and five site capabilities in two long components. Existing backend contracts already support these operations; their ownership, permission checks, maker-checker and publication snapshots remain authoritative.

| Existing capability | New home |
| --- | --- |
| Server-paged content search and filters | Editorial library, default `/cms` and `/cms/content` |
| Draft creation | `/cms/content/new`, opened explicitly |
| Locale authoring, assets, SEO, relationships, readiness and history | `/cms/content/:id`, six areas |
| Category and tag list/create | `/cms/taxonomy` |
| Navigation, blocks/schemas, announcements, redirects, failed jobs | `/cms/site`, five URL-addressable spaces |

Keep the editorial table as the primary desktop view, with equivalent mobile records. Omit redundant page-only KPI cards, a second review queue, fabricated analytics, a visual page builder and unsupported taxonomy deletion. Preserve the public English readiness restriction. No schema migrations or original-database mutations are part of this work.

Identified defects: domain-link writes omit required root `expectedVersion`; content listing ignores its accepted locale filter; site operations eagerly fetch unrelated resources. These require functional corrections, not styling alone.

## Verification

### Implemented behavior

- The default library uses canonical server search, type/category/status filters, totals and pagination. Details and return links retain the search/page context, including navigation from the existing Review Queue. Deep links do not fetch the library or unrelated site resources.
- Creation is a separate, permission-controlled route. A material has six areas: content, media/classification, platform relationships, SEO, preview/readiness and revision history. Arabic and English drafts remain separate; saved media, tags, OpenGraph values and metadata are retained.
- Classification and canonical relationships save independently using root `expectedVersion`. Saving one area retains unsaved edits in the others. Version conflicts retain the draft and show a recoverable error. Pending changes use the existing administration navigation guard.
- Review, rejection, publication, scheduling/cancellation, withdrawal and slug changes call the existing governed contracts. Typed dialogs replace unstructured prompts for these actions. Existing maker-checker, MFA, permissions and approved public snapshots remain authoritative.
- Known CMS command denials (maker-checker or MFA) no longer trigger an unrelated permission refresh that unmounted the editor and lost its draft. The requests still fail; MFA prompts remain active; actual permission denials still refresh authorization.
- Site operations have five separately loaded spaces: navigation, blocks/schemas, announcements, redirects and publishing. Navigation editing preserves node identities, tree metadata and concurrency versions, with add/reorder/remove/parent/target editing. Announcements and redirects have explicit creation/edit forms. Publishing uses a server-paged locale/state query, rather than counting a loaded sample.
- Locale-aware repository filtering now uses the requested locale's lifecycle for both rows and totals. No database models, migrations, owner records or publication policies were added or changed.
- Styling is scoped to CMS: Cairo, compact headings, indigo/petrol identity, gold section accents, Lucide icons, RTL/LTR layouts, desktop tables and equivalent mobile records. Existing administration pages retain their styling.

### Automated results

| Check | Measured result |
| --- | --- |
| Section-16 Vitest suite | **34 files, 194 tests passed** |
| Full TypeScript project graph | `tsc -b --pretty false`: passed |
| Administration production build | Vite build: passed; large-chunk and runtime absolute-font-path warnings remain |
| CMS source verification | 20 checks passed |
| Source quality verifier | Passed: no package cycles, file cycles or new accessibility findings |
| Changed CMS source ESLint | Passed without errors or warnings |
| Release journey source | Syntax check passed; selectors adapted to the new routes/dialogs |

The suite includes permission boundaries, actual API-client 403 behavior, hidden-field preservation, stale responses, conflict recovery, independent-area saves, URL navigation and locale-specific query/count scope. React test-renderer emits its existing deprecation warning. This is not a claim that the entire monorepo production build or full Linux release browser journey ran.

### Actual isolated runtime evidence

The canonical API was run against the existing attested, disposable local PostgreSQL 16 DB-T, with two synthetic identities using real MFA and CSRF. All **15 observations** in [runtime-proof.json](evidence/cms-20261027/runtime-proof.json) passed, including:

- Root classification CAS, bilingual draft saves, readiness and preservation of metadata/other locale.
- An unauthenticated write rejected with 401, stale saves rejected with 409, and author self-approval rejected with 403.
- Independent review followed by publication; an approved Arabic snapshot served publicly; draft editing retained that snapshot; archive withdrew it.
- Locale-specific SQL rows and count agreed, menu identity/version preservation worked, and an announcement saved as a draft without publication.

Browser interaction additionally created and saved an Arabic material, retained unsaved content while moving to SEO, and rendered the canonical preview. Classification was verified through the real API; its final browser retry and the subsequent CMS denial fix were not rechecked in the browser.

### Visual evidence and remaining acceptance work

[Desktop library capture](evidence/cms-20261027/desktop-library.png) is an actual capture from the isolated runtime with synthetic records. **It is partial evidence, not visual acceptance:** text is clipped in the captured output and needs a fresh browser/DOM diagnosis. A DOM measurement reported no document overflow at 1440px and a 22px Cairo heading; that does not resolve the captured clipping. The browser automation transport then repeatedly disconnected. No phone screenshot, 200% text-size check or complete keyboard/visual acceptance was completed. These checks remain open; no fabricated screenshots were substituted.

Operational boundaries and remaining limitations:

1. Academic-program/reference owner links retain an explicit advanced canonical-ID input where an independent lookup contract has not been integrated. Common owners have permission-aware, server-paged pickers. Navigation domain-reference targets also retain their existing advanced contract input.
2. Public English delivery stays disabled by the existing readiness policy. No external publication channel or analytics system was fabricated.
3. Original/production database writes: **0**. Schema migrations applied: **0**. Only synthetic disposable DB-T data was mutated.
4. The original administration runtime was not activated for this CMS branch. This branch has not been merged into `main`; activation and final visual acceptance are separate remaining steps.
5. The complete Linux release journey with three identities has not run locally; the real isolated API proof used two independent identities (the reviewer also had publish authority).

### Changed files

- Entry route/shell: `apps/admin/src/App.tsx`, `apps/admin/src/pages/CmsAdminPage.tsx`.
- Editorial/site components, hook, models, copy and styles: `apps/admin/src/features/cms/` (new workspace modules plus the retained operations panel).
- Scoped draft-preserving denial handling: `apps/admin/src/api/client.ts`, `CmsAuthorizationFailure.ts`.
- Locale query correction: `packages/infrastructure/src/cms/PrismaCmsRepository.ts`.
- Tests: `apps/admin/tests/cms/`, `packages/infrastructure/tests/cms/CmsEditorialListingScope.spec.ts`.
- Verification/release selectors: `scripts/verify-cms-source.mjs`, `scripts/release/lib/R14AdminCmsRuntime.mjs`.
- This execution report and the explicitly qualified evidence directory.
