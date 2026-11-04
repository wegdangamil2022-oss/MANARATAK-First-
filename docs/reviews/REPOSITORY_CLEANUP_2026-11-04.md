# Repository cleanup — 2026-11-04

## Scope and method

Reviewed the tracked repository (9,896 files at starting commit `4d36b20c`), npm workspaces, application entry points, routes, static assets, relative imports, test profiles, operational scripts and branch ancestry. Source import traversal was used to identify removal candidates; each candidate's references, tests and operational consumers were checked before removal. This is a repository/source review, not a claim that every user workflow has been exercised in production.

`main` already contained the latest scholarship work. Every other local feature branch was merged or patch-equivalent: `git cherry main feat/cms-imports-preview-20261027` identifies its sole commit as already applied (`-`). The import changes are also represented by `fd5c15ef`; reintroducing the older branch would not add a feature.

## Retained application boundaries

- `apps/admin` is the sole Admin application. Web's historical Admin URLs redirect to it.
- `apps/web` is the active public/student application, including the canonical student workspace and live API adapters. Its `public-template` directory is the active UI, despite the historical name.
- `apps/api` is the API/composition root. `apps/frontend-security` shares frontend security configuration; it is not another application.
- Shared package exports, authorization/MFA contracts, canonical relationships, import source datasets, database migrations and source-specific historical evidence are retained.

There were no byte-identical TypeScript/TSX/CSS implementation files of at least 150 bytes across application/package source. Similar names alone were not treated as duplicates.

## Changes

- Moved 39 section/review Vitest profiles from hidden root files to `config/testing/review`. Updated relative profile imports, workflow triggers, runner arguments and documentation commands. Root unit/database/health profiles remain explicit.
- Removed the unused root `b10` TypeScript override and obsolete `vitest.workspace.ts` (the repository uses the explicit Vitest 4 root configuration).
- Removed root Google Studio export `metadata.json`, retired Studio link stubs and three obsolete Studio UI/export repair reports. Active documentation points to local development and the environment inventory. Historical SQL/evidence with older provider names is retained byte-for-byte.
- Removed the unused `@google/genai` dependency. The npm-generated lockfile removes 34 entries and adds/updates no package versions. The active Gemini adapter uses its existing HTTP provider implementation and remains intact.
- Removed 34 abandoned one-off patch/extraction/diagnostic scripts and their output metadata from `scripts/archive/remediation-root`. Preserved its one operationally referenced diagnostic as `scripts/testing/check-session-databases.ts`, updating its workflow/security-audit consumers.
- Removed unused legacy Admin region editing, section directory, certificate verification panel, disclosure header and old dashboard/review presentation components. The current executive dashboard, server-backed review workspace, canonical reference workspace and certificate workspace remain active. Removed five tests that solely rendered retired presentation components; current workspace and domain/security regression tests remain.
- Removed unused public Favorites/progress demo views, the obsolete majors wrapper/phone container, an unreferenced static scholarship FAQ fixture, a redundant localized API helper and an unused student barrel. Favorites and journey still use the canonical student workspace through live routes. Updated the TypeScript-context verifier to use the active API client.
- Removed 30 duplicate Cairo binaries (15 per app), redirecting CSS to the three existing identical character-subset files. Admin now declares the three variable faces once, with weights 200–1000. App-specific copies remain because Web and Admin are separately built and deployed. Certificate render/preview fonts and brand assets remain in their required deployment units.
- Tightened the repository organization guard to reject retired root export/config files. Local ignored `private` artifacts are excluded from source traversal and explicitly ignored by Git. Added font integrity/reference regression checks.
- Refreshed README runtime ownership and startup instructions, removing stale handoff/incomplete-Git and historical import-count claims from the current status.
- Made the W1 source inline-style inventory independent of Bash/`wc`, preserving the same line-level check through native Node traversal. Fixed a localized Save-button test selector, a Windows absolute-path test fixture, and explicit Windows PowerShell security-module loading for private-file ACL checks (including a regression test). ACL requirements remain enforced.

## Database and runtime impact

No database connection was needed for this cleanup. No migrations, resets, seeds, account changes, role changes or provider activation were performed. Migration SQL and import source data have no changes. Existing original-database runtime artifacts are outside the checkout and are not deleted by repository cleanup.

## Validation

- Full npm-workspace build: passed (API, Admin, Web and shared packages).
- Full workspace TypeScript: passed again after cleanup. Final ESLint: zero errors, 5,061 existing warnings (5,067 before cleanup); warnings are not claimed as resolved.
- Final full Vitest run with two workers: **843 files passed, 3 files skipped; 6,272 tests passed, 8 skipped; zero failures**. The skips are existing classifications, not exclusions added by cleanup.
- Cleanup-specific organization/font contracts: **9 passed**.
- All **67** test profiles under `config/testing` import successfully after relocation (the database profile was given its required suite selector; no database suite was executed).
- Windows ACL/Playwright fixture regression checks after repair: **24 passed**.
- `ci:source:contracts`: passed, including architecture, authorization audit inventory, remediation and source plan closures.
- `ci:preflight`: passed; 459/459 DI registrations reachable, zero unresolved registrations, source environment inventory current.
- Repository organization: passed; no unexpected root files/directories, temporary source artifacts, broken relative imports, changed archived-harness evidence or broken important documentation links.
- Production dependency audit (`npm audit --omit=dev`): **zero advisories** at review time. This is not a claim about future advisories or every development dependency.
- Tracked-source secret signature scan: passed.

The final Node reference run used clean code checkpoint `62ec36f8` and the installed Git GNU tar: **1,124 passed / 7 failed, zero skipped**. All seven failures occur while creating symbolic-link fixtures (`EPERM`) before their assertions; this Windows account lacks that permission. They are the synthetic-curl fixture in `post28-neon-preflight.test.mjs`, four packaging/static-runtime fixtures in `post28-r07-static-runtime.test.mjs`, and two asset/artifact fixtures in `section28.test.mjs`. These tests still require a suitable CI/Linux or authorized Windows environment; the complete Node gate is not claimed as passing. No tests were disabled and no OS privileges or symlink rejection policies were weakened.

The earlier Node run's clean-source and tar prerequisites now pass, as do the repaired native ACL and absolute-path fixtures. Detailed logs are retained outside the repository under the owner's private `repository-cleanup-20261104` directory.
