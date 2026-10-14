# Section 22 / P21 — current Career code completion

Date: 2026-10-14. Base: `9d419e1ba090aae4becde6d36a74fe4af6fbd3ad`.
Verdict: **CODE_CLOSED — RUNTIME_DEFERRED**, within the supported Career owner contracts. Scope: CAR-ADM-001–028 and CAR-FG-029–031.

The prior [implementation report](section-22-implementation.md) maps the prepared code to the plan but deliberately did not verify it. This follow-up reviews the current source, completes the following additional boundaries and supplies current lightweight verification. Historical source-preparation evidence remains preserved.

## Additional corrections

| Plan items | Current code behavior |
| --- | --- |
| CAR-ADM-001, 003; CAR-FG-031 | Employer description, logo and industry edits now invalidate independent verification, alongside existing identity/geography/site fields. The employer retains its canonical ID and emits the existing transactional owner event; edited presentation cannot continue inheriting verification of the old representation. |
| CAR-ADM-009, 013 | CV review checks the student's current active status, application-bound owner consent and valid past consent timestamp before EAP custody access. Withdrawn applications, empty asset references and missing/foreign/future consent cannot produce delivery grants. Existing scoped review+PII permission intersection, owner-bound PDF trust checks and 120-second grants are preserved. Legacy application rows lacking consent fail closed. |
| CAR-ADM-014 | HTTPS hostnames normalize a terminal DNS dot before rejecting local/internal hosts, preventing localhost./host.internal. destination bypasses. Credential-bearing, IP, unsupported-port/protocol destinations remain denied. |
| CAR-ADM-019, 024; CAR-FG-029–030 | Admin job/employer page and total queries use the same RepeatableRead transaction and predicates. Failed list reads clear obsolete rows. Job editor reads fence late responses, report read errors and use the fresh record/version. Private application details have an independent generation guard so late data from an earlier case or scope is discarded. Opening details no longer changes the job filter. |
| CAR-ADM-025, 027, 028 | Missing CV consent uses a finite safe HTTP error. Current targeted API/privacy/transaction/UI tests and TypeScript compilation pass, replacing the earlier unverified-source disposition with a current code review disposition. |

## Current verification

- Baseline: **2 files / 12 tests passed**.
- Final isolated Career suite under Node 22, one worker: **6 files / 38 tests passed**, including 26 new cases. These cover unsafe destinations, owner/CV consent and active-state denial, independent verification invalidation, page snapshot predicates, scoped CV permission intersections, safe grant duration and late/failed UI reads.
- `tsc -b packages/infrastructure apps/api apps/admin apps/web --pretty false`: passed.
- ESLint on nine changed source/test files: **0 errors / 35 warnings**. The corrected API test fixture also passed its final targeted lint check; its warnings overlap the preceding total.
- `git diff --check`: passed.

Logs and hashes: [verification.json](evidence/section-22-completion-20261014/verification.json).

## Code and operational scope

The implemented surface remains the governed job/employer catalog, private student profile and internal applications, scoped staff decisions and CV grants, consented alumni directories, bounded canonical search and disabled-by-default expiry maintenance described in the prior task mapping. This does not claim an advanced ATS, a new P6 import owner, employer interview calendars or ranked search.

No real database, migration, backfill, provider, financial charge, CV delivery service, maintenance worker, heavy suite/build, browser E2E or deployment was run. Legacy verification/dedup/consent remediation, actual transaction contention/outbox delivery, IAM provisioning, lifecycle retention and browser acceptance remain in the post-section-28 operational scope. Existing maintenance remains disabled by default. No production activation is implied.
