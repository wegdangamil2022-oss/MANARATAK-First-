# Import workspace review

Baseline: main `19cb5ff0c3888238da8e3950e0ccdab174256cde`. The owner authorized a functional audit and visual refinement, preserving the current overall order. Work is isolated on `feat/import-workspace-audit-20261027`; no main merge or original database changes are authorized by this implementation.

## Scope and acceptance

- Keep overview, source registry, domain centers, queues, staged records, activity, mappings, governance, comparisons and approved-file ingestion. Reuse all canonical API commands, concurrency checks and owner decisions.
- Correct execution-history rendering: its response is a timeline, not a counter response. Render real events, time bounds and partial-history warnings separately. Missing numeric evidence must remain unavailable, never become zero.
- Fix review links to canonical owner workspaces and expose server pagination for review assignments.
- Recover independently when batch reads or record reads fail. Do not erase the successful area's data because another request fails.
- Improve records navigation, accessible dialogs and control labels, retry actions and in-page navigation without hiding the core workflow.
- Apply scoped Cairo typography: page 22px, regions 15–16px, body 13px, controls 12–13px, supporting text at least 11px. Use the existing indigo/petrol/cyan/gold identity and Lucide icons. Keep dense, readable tables scrollable within their own containers on phones.
- No new import engine, migrations, fake statistics, direct publication, external acquisition, production writes or dependencies.

## Verification strategy

Vitest regressions for timeline versus counters, unknown values, stale results, read failures, review pagination and owner routes; existing import API/domain/application suites; full TypeScript graph; administration build; source quality and scoped lint. Browser evidence must be real and separately qualified if automation remains unavailable. The existing disposable PostgreSQL environment is the only runtime test target.

## Files and commands

Entry: `apps/admin/src/pages/ImportAdminPage.tsx`. Focused additions: `apps/admin/src/features/imports/`, `apps/admin/tests/imports/`. Existing API: `apps/api/src/presentation/api/router/ImportAdminRouter.ts`.

Use `node node_modules/vitest/vitest.mjs run --config config/testing/import-admin.vitest.config.ts`, `node node_modules/typescript/bin/tsc -b --pretty false`, and `node node_modules/vite/bin/vite.js build --config apps/admin/vite.config.ts` with a private output directory. Changes follow existing React/TypeScript and bilingual-copy conventions; owner/assignment/version identifiers remain canonical.

## Results

Implemented on the independent import branch. Existing order, canonical commands and owner approval boundaries are preserved. No API/database schema, migrations, worker configuration or original runtime changes were made.

### Functional corrections

- Separated execution history from counter results. The real timeline now renders persisted checkpoint/worker-failure events, timestamps, history truncation and incomplete-history limits. Missing historical counters remain unavailable; genuine zero remains zero. A failed evidence read retains other successful evidence and offers retry.
- Batch-list and staged-record requests fail independently. A failed batch read no longer removes valid records; a failed record read no longer removes valid batches. Unavailable record totals show a dash. Added retry access and in-page navigation while retaining the existing section order.
- Corrected owner-workspace links and implemented the existing server review pagination (50 per page). Assignment/claim/release still use canonical versions and reasons. Existing fallback choices are populated from the observed source, preventing an accidental removal caused by an empty control. Revision checks and saved-command/failed-refresh messages remain explicit.
- Fixed confirmed template contract mismatches: university `universityName`, course `courseName` plus `accessType`, and accepted international-test identity fields. Removed typed optional fields from these string-only CSV headers; JSON/mapping remains available for typed fields. Clarified that format/deduplication preflight is not semantic approval.
- Replaced native command prompts with scoped confirmations for staging, pause, cancellation, replay and source-state changes. Added accessible names, focus trapping, Escape handling, focus/scroll restoration, unsaved-input navigation protection and previous/next record navigation within the loaded page. Existing browser discard confirmation remains in the shared draft guard.

### Presentation

Scoped Cairo typography and the existing indigo/petrol/cyan/gold identity apply throughout the import page, advanced tools and dialogs. Added meaningful Lucide icons, compact header, readable supporting text, consistent controls, horizontal tool groups and responsive wrapping. Wide technical tables retain local horizontal scrolling. Removed a redundant implementation-oriented governance notice; all underlying operations remain available.

### Measured verification

| Check | Result |
| --- | --- |
| Import UI/domain/application/infrastructure/API suite | **53 files / 458 tests passed** |
| UI-focused subset | **5 files / 19 tests passed** |
| Full TypeScript project graph | Passed |
| Administration production build | Passed; existing chunk-size/runtime-font-path warnings remain |
| Scoped ESLint | No errors or warnings |
| Source quality | Passed: zero package/file cycles and zero accessibility findings |

The unit suite includes actual owner schemas for template headers, independent loading failure, execution-history/counter separation, stale evidence rejection, review server pagination, optimistic versions, fallback revisions, saved-command/failed-refresh behavior, reason validation, duplicate confirmation and dialog keyboard behavior. React test-renderer emits its existing deprecation warning.

### Real disposable PostgreSQL proof

[runtime-proof.json](evidence/imports-20261027/runtime-proof.json) records ten passing observations through the canonical API, authenticated with MFA and CSRF on the previously attested disposable local PostgreSQL 16 DB-T. Verified real preflight, staging without publication, record page/total, timeline and partial-history bounds, independent counters, duplicate detection, review paging and unauthenticated denial. Original database writes: **0**. External acquisition/publication and background workers were not enabled.

The first real staging attempt exposed the template defect: the structurally accepted `name` header failed university handoff with `UNIVERSITY_HANDOFF_PAYLOAD_INVALID`, leaving an explicit failed synthetic batch. Correcting the headers produced the successful proof; the failed test batch remains in disposable DB-T for traceability.

### Limits and remaining checks

The browser automation transport repeatedly failed with `Transport closed`, including its reset endpoint. Consequently final desktop/mobile screenshots, actual visual acceptance and zoom checks are **not completed**; unit keyboard/layout checks are not substitutes for those. No fabricated browser evidence is included.

This is a refinement/audit of the current importer, not a new import engine. Canonical reviewer identity IDs and advanced mapping fields still require administrative input. Existing owner capability flags remain authoritative; a staging-only domain is not labeled as delivered or published. No claim is made that every external connector or every owner-specific import workflow has been exercised live. The original database/runtime is unchanged and this branch is not merged into main.

Changed files: `apps/admin/src/pages/ImportAdminPage.tsx`, focused modules/styles in `apps/admin/src/features/imports/`, tests in `apps/admin/tests/imports/`, `config/testing/import-admin.vitest.config.ts`, and this report/evidence.
