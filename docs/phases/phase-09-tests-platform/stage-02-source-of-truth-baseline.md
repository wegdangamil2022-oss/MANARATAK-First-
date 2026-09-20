# Phase 9 Remediation - Problem 2: Source Of Truth Baseline

## Status

Resolved as a baseline source-of-truth step.

The demo seed now creates 49 canonical International Test records in the database instead of only 4. This aligns the backend inventory with the 49-test frontend preview inventory discovered in Problem 1.

## Scope

This stage creates a database-backed baseline for all 49 tests. It does not yet implement the full import/versioning workflow, normalized test sections, score models, source diffs, or editable admin detail screens.

## Root Cause

Before this remediation, the project had two conflicting sources of truth:

- Frontend admin preview: 49 hardcoded test records and 49 Markdown content modules.
- Backend demo seed/API: only 4 InternationalTest database records: IELTS, TOEFL iBT, ACT, and CPA.

This meant the admin UI could show a large catalog while the API and database only knew a small subset of it.

## Remediation Applied

- Updated `scripts/seed-demo.ts` summary from 4 to 49 international tests.
- Added a 49-test baseline seed in `seedInternationalTests()`.
- Each seeded test now receives:
  - `publicId`
  - `slug`
  - `canonicalName`
  - `canonicalDedupKey`
  - `displayName`
  - Arabic and English localized names
  - provider name
  - Phase 9 category
  - `PUBLISHED` status
  - `NEEDS_REVIEW` completeness status
  - source-tracking metadata in `optionalFields`
- Updated the admin preview request page size from 20 to 100 so the current 49-test inventory can be loaded and counted together.

## Why Completeness Is NEEDS_REVIEW

The tests are intentionally seeded as published baseline records but with `completenessStatus = NEEDS_REVIEW`.

Reason: the records are now present in the database, but their deep structures are not yet normalized into versions, sections, score scales, fee policies, source files, import records, or review diffs. Marking them complete would overstate the implementation state.

## Verification Performed

Automated source inspection confirmed:

- `seedTestIds = 49`
- `uniqueSeedTestIds = 49`
- `hasSat = true`
- `hasGre = true`
- seed summary contains `internationalTests: 49`

## Remaining Work For Later Problems

- Problem 3 must replace the minimal baseline with the missing normalized data model and relations.
- Problem 4 must connect the source Markdown files to real import records and versions.
- Problem 5 must introduce diff/review/approval behavior.
- Problem 8 and 9 must rebuild the admin list/detail UI around the database-backed model.

## Files Changed

- `scripts/seed-demo.ts`
- `apps/web/src/features/admin-preview/AdminInternationalTestsPreviewPage.tsx`

