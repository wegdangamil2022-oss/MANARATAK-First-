## Verified batch 5 CI — 2026-10-09

Source `42efcf290d83fdd81221605f7247353b42fcce88`: [CI 37959986025](https://github.com/wegdangamil2022-oss/MANARATAK-First-/actions/runs/37959986025) SUCCESS: **115 tests across 16 files**, plus one separate ORM/SQL source-plan consistency test; schema validation, TypeScript/source quality, three authority/permission guards and unchanged audit coverage PASS. Evidence: `ownership-ci.json` / `ownership-ci-summary.txt`. Observed CI supersedes pending notes below; local and CI counts overlap. Action pins PASS (39 references). Global architecture recheck still reports exactly the four pre-existing findings (`ownership-architecture.txt`), no waiver. Patch H design is SOURCE_PLAN_READY / RUNTIME_PENDING; no DB mutation/constraint application or runtime commit/concurrency proof. Section 04 remains IN PROGRESS.

Batch 5: `ownership-*` records Prisma/source-only diff consistency, validation, client generation and regression evidence; `current-version-preflight.sql` is unexecuted read-only design. The composite ownership FK source plan is deferred and NOT VALID. No DB mutation/application/runtime constraint proof. Matching CI pending; Section 04 remains open.

## Verified batch 4 CI — 2026-10-09

Source `5059c90ed19f54acfee9e4663345a5fbd670c127`: [CI 37958283325](https://github.com/wegdangamil2022-oss/MANARATAK-First-/actions/runs/37958283325) SUCCESS: **115 tests across 16 files**, TypeScript/source quality, three authority/permission guards and unchanged audit coverage PASS. Evidence: `pages-ci.json` / `pages-ci-summary.txt`. Matching CI supersedes the pending notes below; local/CI counts overlap. Bounded list/search/exact-editor read-path source checks pass. Section 04 remains IN PROGRESS with the original dependencies below; no actual target database/provider/runtime acceptance or global architecture closure is inferred.

Batch 4: `pages-*` records bounded list/search/context tests and browser reproductions. Local 115 tests/16 files PASS; overlapping final API assertions, TS/quality/permission/audit PASS. Focused lint 0 errors/11 warnings. The initial browser pagination race is recorded then corrected; final Chromium and clear/history/deprecation regression PASS, intercepted API only. Matching CI pending; Section 04 remains open.

## Verified batch 3 CI — 2026-10-09

Source `5a9eae3a0b0f201439cab2a4c7880cd027dc4a9e`: [CI 37956260401](https://github.com/wegdangamil2022-oss/MANARATAK-First-/actions/runs/37956260401) SUCCESS: **102 tests across 14 files**, TypeScript/source quality, three authority/permission guards and unchanged audit coverage PASS. Evidence: `read-projections-ci.json` / `read-projections-ci-summary.txt`. This observed result supersedes the pending notes below. Local and CI counts overlap. No actual target DB, provider, runtime delivery or complete section acceptance is inferred. Section 04 remains IN PROGRESS; bounded row-list/search and other original dependencies are explicitly open.

Batch 3: `read-projections-*` records summary/lazy-history tests, browser reproduction, and verifier limits. Local 102 tests/14 files PASS with overlapping final 10-test projection delta; TS/quality/three permission guards/audit PASS. Focused lint 0 errors/9 warnings. Browser intercepted API only. Source CI pending; entire Section 04 remains open.

Batch 2 source `233c0ac`: [CI 37954207122](https://github.com/wegdangamil2022-oss/MANARATAK-First-/actions/runs/37954207122) SUCCESS, 86 tests/12 files, TS/quality/authority/audit PASS. Matching evidence `governance-ci.*` supersedes pending statements below. No actual database/provider acceptance.

# Section 04 Settings evidence

Batch 2: `governance-*` captures definition/clear/rollback/reasons/correlation checks. Local 85 tests +13 overlapping API delta tests, TypeScript/quality/12 Node guards/audit PASS; isolated Chromium PASS. No actual target migration, DB concurrency or live API/provider acceptance. Matching CI pending.

Source `83a335e`: [CI 37951460806](https://github.com/wegdangamil2022-oss/MANARATAK-First-/actions/runs/37951460806) SUCCESS, 67 tests/11 files, TypeScript/quality/2 authority guards/audit PASS. `first-ci.json` and `first-ci-summary.txt` record matching CI; supersedes the pending statement below. Section IN PROGRESS, no actual DB/runtime proof or global architecture waiver.

First batch: local 67 tests PASS, TypeScript/quality/authority/audit guards PASS, lint 0 errors/11 warnings. Browser scope is intercepted API only, test CSP bypass/dev HMR disabled; `first-browser.cjs` expects local Admin on 127.0.0.1:3094. No actual DB/provider mutations or runtime consumer proof. Initial failures/stale fixtures preserved in `first-baseline-tests.txt`. Combined legacy verifier is 78/79 due to the pre-existing global architecture guard; no global closure inferred. Matching CI pending.
