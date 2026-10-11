# Section 16 — CMS source closure gates and post-28 runtime matrix

**Verdict:** **PARTIAL — FIXES_REQUIRED**. This document applies the 9 October 2026 accelerated closure policy without reclassifying unimplemented source controls as runtime deferrals.

## Source gates

| Gate | Status | Required evidence |
| --- | --- | --- |
| P0 distinct auth capabilities | Source present; execution pending | Principal-level 403 for author-only approval/publish/operator; successful separately authorized workflow |
| P0 immutable effective reviewer snapshot | Source present; execution pending | Edit after approval must reject or re-review; tester differs from last editor and requestor |
| P0 canonical slug/SEO correctness | Source present; execution pending | Old→new slug republish same locale/site, 301 graph/collision rollback and snapshot continuity |
| P0 last-known-good site experience | Migration source only | Nav/announcement draft editing never blanks public view; runtime requires snapshot table |
| P0 reviewer self-approval | Source present; execution pending | Alice edits, Bob requests, Alice cannot approve; approved fingerprint is stable |
| P1 EAP/public grant | Source present; execution pending | Revoked/private/unknown/unsafe public asset fails at publish and scheduled worker boundary |
| P1 domain ownership + nav target owner checks | **OPEN SOURCE** | Real owner-read gateway to P7/P9/P10/P11/P12/P13, lifecycle/site/locale check; no parallel CMS facts |
| P1 scheduler retry, exactly-once, operator recovery | **OPEN SOURCE** | Retry/DLQ/manual recovery, lease/version/audit and failure race evidence |
| P1 block/schema lifecycle | **OPEN SOURCE** | Full schema authority, immutable schema revision approval, nested EAP + block publish |
| P1 redirect browser+SEO contract | **OPEN SOURCE** | Real HTTP 301/308 route and sitemap/hreflang/canonical propagation without open redirects |
| FGA-16-001 admin redirect lifecycle | Partial | Owner-side paginated search/status+CAS, UI stale conflict/refresh, audit provenance |
| FGA-16-002 AR/EN readiness | Source present | Fresh owner readiness each locale, no parallel translation store |
| Compile/contract checks | **NOT RUN** | Targeted `tsc`, `vitest` security regressions, `prisma validate` in an available repo workspace |
| Runtime integrations | Post-28 | Separate controlled staging verification; never classified as source PASS |

## Prepared migration sequence — no database operations executed

1. Take and verify PostgreSQL backup and restoration artifacts in a **separate authorized maintenance window**.
2. Run schema validation and migration diff (read-only) before any apply; stage digest column, public site snapshots table, and redirect version field in dependency order.
3. Approvals predating `reviewSnapshotHash` are deliberately unusable: re-submit/re-approve them instead of guessing hashes. Migrate or sample-check historic published nav/announcements and choose rollback-compatible staged hydration. Existing source read path has legacy published-row fallback.
4. Stage new CMS independent roles/grants using IAM ownership and least privilege. Broad `admin:cms:manage` is not an automatic grant for publish/review.
5. Deploy source only **after** schema and IAM grants exist. Block worker/admin write traffic until migration compatibility confirmed.
6. In staging: verify Arabic/English published content identity and draft isolation, EAP PUBLIC asset validity, scheduler lease race/retries, role denies, redirect 301/308 and CDN invalidation, scoped blocks/nav/announcements, audit/outbox.
7. Roll back application to compatible pre-migration build and restore backup if necessary. Do not drop the schema fields or published snapshots while a new binary depends on them; migration reversal requires approved change control.

## Post-28 runtime deferrals (not permission to defer source security bugs)

- PostgreSQL serializable conflict tests, migration rehearsal/backfill/backup-and-restore, EAP ownership and revoked grants, independent real-role authorization, Redis/CDN invalidation, SEO spider/sitemap/canonical/hreflang, worker crash/reclaim/lease expiry/poison jobs, load/index EXPLAIN and latency, live browser/full E2E and deployment smoke tests.
- Collect environment, fixture identities, user-visible results, audit/outbox IDs, metrics, rollback step and independent reviewer sign-off for each.
- **Until migrations are applied and actual role grants verified, new CMS sources are NOT_RUNTIME_SAFE.** No claim of Google Studio or production runtime readiness.

## What was verified vs not verified

- Actually executed: 30/30 **static source-contract inspection assertions** on fetched GitHub code.
- Not executed: TypeScript, Vitest, Prisma CLI, live database/browser/CDN, worker or provider, or deployment.
- Tests in source are **not proof of PASS**. A red targeted test must be fixed without weakening its assertions before changing section status.

**Closure decision:** do not mark `CODE_CLOSED — RUNTIME_DEFERRED` until all P0/P1 source blockers are fixed and targeted runnable security/source checks pass. Section 17 stays out of scope. No merge or deployment.
