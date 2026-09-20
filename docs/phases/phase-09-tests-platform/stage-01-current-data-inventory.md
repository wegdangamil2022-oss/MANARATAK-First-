# Phase 9 Remediation - Problem 1: Current International Tests Inventory

## Status

Resolved for the visible inventory mismatch.

The project contains 49 frontend international-test preview records and 49 matching Markdown content modules. The admin list previously showed fewer records because the UI explicitly filtered out SAT and GRE records. That artificial exclusion has been removed.

## Scope

This stage only solves the first Phase 9 problem: inventory clarity and the 48/49 count mismatch. It does not yet migrate the tests into normalized database versions, does not replace the import workflow, and does not rebuild the admin detail UX.

## Files Inspected

- `apps/web/src/features/admin-preview/AdminInternationalTestsPreviewPage.tsx`
- `apps/web/src/features/admin-preview/AdminDomainImportCenterPage.tsx`
- `apps/web/src/features/admin-preview/*-markdown-content.ts`
- `apps/web/src/features/admin-preview/*.md`
- `scripts/seed-demo.ts`
- `packages/infrastructure/prisma/schema.prisma`
- `packages/infrastructure/src/international-tests/PrismaInternationalTestRepository.ts`

## Inventory Counts

| Area | Count | Finding |
| --- | ---: | --- |
| Frontend fallback test records | 49 | `AdminInternationalTestsPreviewPage.tsx` contains 49 `test-*` records. |
| Markdown content modules | 49 | `apps/web/src/features/admin-preview/*-markdown-content.ts` contains one module per preview test. |
| Raw Markdown files | 23 | Some tests use `.md?raw` wrapper files instead of embedding the Markdown directly in the TypeScript module. |
| Import Center default cards | 10 | Only the first 10 tests have hardcoded import cards in `AdminDomainImportCenterPage.tsx`. |
| Demo seed database tests | 4 | `scripts/seed-demo.ts` seeds only IELTS, TOEFL iBT, ACT, and CPA. |

## Root Cause Of The 48/49 Mismatch

The 49 records existed, but two hardcoded client-side exclusions were hiding valid tests:

- `AdminInternationalTestsPreviewPage.tsx` filtered out `SAT` and `GRE` from the loaded list.
- `AdminInternationalTestsPreviewPage.tsx` also blocked SAT/GRE cards from being merged from saved import cards.
- `AdminDomainImportCenterPage.tsx` skipped saved SAT/GRE import cards when reading `localStorage`.

This made the admin count dependent on browser cache and previous import-card state. A clean fallback list could show fewer than the true 49 records, while a browser with saved localStorage cards could show a different number such as 48.

## Remediation Applied

The artificial SAT/GRE exclusions were removed from:

- `apps/web/src/features/admin-preview/AdminInternationalTestsPreviewPage.tsx`
- `apps/web/src/features/admin-preview/AdminDomainImportCenterPage.tsx`

SAT and GRE are now treated like the other canonical international tests during inventory display and saved-card loading.

## Confirmed Canonical Preview IDs

The current frontend inventory contains these 49 IDs:

`test-abitur-de`, `test-act-us`, `test-alevel-uk`, `test-ap-us`, `test-bmat`, `test-cambridge-uk`, `test-celpebras-br`, `test-cils-it`, `test-clt-us`, `test-cpa-us`, `test-csat-kr`, `test-csca-cn`, `test-cuet-in`, `test-dat-us`, `test-dele-es`, `test-delf-dalf-fr`, `test-duolingo-det`, `test-eju-japanese`, `test-gamsat-uk-au`, `test-gmat-focus`, `test-gre-shorter`, `test-hsk-chinese`, `test-ielts-academic`, `test-imat-italy`, `test-itep-academic`, `test-jlpt-exam`, `test-languagecert-academic`, `test-linguaskill-cambridge`, `test-matura-europe`, `test-mcat-aamc`, `test-met-michigan`, `test-oxford-ote`, `test-plab`, `test-pmp`, `test-polish-state`, `test-pte`, `test-sat`, `test-staatsexamen-nt2`, `test-testdaf`, `test-toefl-ibt`, `test-toeic`, `test-tomer`, `test-topik`, `test-torfl`, `test-ucat`, `test-ukbi`, `test-usmle`, `test-yks`, `test-yos`.

## Remaining Findings For Later Phase 9 Problems

- The 49 records are still frontend preview records, not durable canonical database records.
- Only 4 tests are currently present in `scripts/seed-demo.ts`.
- Only 10 tests have hardcoded Import Center cards.
- Raw source provenance is not represented by real `ImportBatch`, `ImportRecord`, source file hash, version number, diff, or approver metadata yet.
- The Markdown source files are not consistently stored in one format: 26 modules embed content directly, while 23 modules wrap `.md?raw` files.

## Next Problem Boundary

Problem 1 is now fixed at the inventory/count level. The next Phase 9 problem should address source-of-truth alignment: choosing one canonical backend/API path for all 49 tests instead of relying on frontend fallback arrays and localStorage.
