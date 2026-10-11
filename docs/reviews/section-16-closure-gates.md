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

## Source continuation gate update

| Gate | Current assessment | Evidence and missing validation |
| --- | --- | --- |
| FGA-16-001 redirect authoring | SOURCE_IMPLEMENTED / TEST_NOT_RUN | Scoped server-side source/destination search, active status filter, bounded paging, versioned correction/disable, AR/EN admin table; negative tests committed. Needs Vitest/TypeScript execution. |
| CMS-ADM-021 related published lookup | SOURCE_IMPLEMENTED / TEST_NOT_RUN | Parameterized distinct published-owner join orders and limits **after** site+locale filtering; owner mock regression committed; no live PostgreSQL query performed. |
| CMS-ADM-012 failed schedule recovery | SOURCE_IMPLEMENTED / TEST_NOT_RUN | Operator-only failed queue, reasoned conditional requeue, current approval digest check, audit/outbox; cannot claim worker delivery, failover or actual test PASS. |
| CMS-ADM-009 / 015 canonical owner resolution | OPEN SOURCE | All new unverifiable cross-domain references remain denied; real owner-resolver and lifecycle enforcement still necessary. |
| CMS-ADM-016 / 023 | OPEN SOURCE | Complete schema governance and web SEO/sitemap integration must be verified/finished before code closure. |
| Lightweight compile/regression | NOT RUN | Re-run target Vitest specs under `apps/api/tests/presentation/api/router/CmsAdminRouter.spec.ts`, `CmsPublicRouter.spec.ts`, `packages/application/tests/cms/CmsUseCases.spec.ts`, `packages/infrastructure/tests/cms/CmsRelatedPublishedSelection.spec.ts`, `CmsScheduledRepair.spec.ts`, and affected TypeScript checks when dependency workspace is available. |

**Verification scope:** 27/27 structural/static string-contract assertions executed in the continuation. These cannot replace executable tests. No real database, worker, migration, cache purge, live browser or provider run. The 9 October 2026 source-closure policy still prohibits `CODE_CLOSED — RUNTIME_DEFERRED` until essential source blockers and lightweight checks are resolved.

## Continuation gate matrix — canonical owners and build-time CMS SEO (11 October 2026)

| Gate | Assessment | Committed evidence | Still needed |
| --- | --- | --- | --- |
| CMS-ADM-009 cross-domain owner validity | **SOURCE IMPROVED / TEST NOT RUN** | Transaction-bound P7/P9/P10/P12/P13 canonical reads; all seven current domain target types validated at link insertion and final publish; root expectedVersion CAS and old/new audit; future edits of published/reviewed links fail closed | Run targeted owner and CAS regressions; design reviewed update after first publication (no silent mutation) |
| CMS-ADM-015 navigation target existence/canonical route | **SOURCE IMPROVED / TEST NOT RUN** | CMS_CONTENT checked against published locale/site; DOMAIN_REFERENCE must be typed UUID, resolves five canonical owner types to validated localized slug in immutable published snapshot | Academic-program and country nav routes still unsupported; owner-driven slug change invalidation and rendering test |
| CMS-ADM-023 browser SEO and sitemap | **SOURCE IMPROVED / TEST NOT RUN** | Build-time CMS published page discovery, exact canonical validation, noIndex suppression, cross-slug AR/EN hreflang grouping in generated sitemap, actual Nginx prerendered-file fallback | Run mock-API prerender test, verify Nginx and actual build, trigger on publish/archive/slug events and CDN purge, verify no stale sitemap/alternate after a new publish |
| CMS-ADM-016 schemas and blocks | **OPEN TEST/INTEGRATION GATE** | Existing ACTIVE reviewed schema with version, maker-checker, bounded JSON/schema validation, immutable snapshot block publish | Execute schema and nested EAP regressions, trace public block UI usage |
| Lightweight executable regression and compile | **NOT RUN** | Committed tests `CmsDomainOwnerReadGateway.spec.ts`, `CmsDomainLinkMutation.spec.ts`, `CmsNavigationOwnerResolution.spec.ts`, `cms-seo-prerender.spec.ts`, and CMS admin router link-version case | Run Vitest, TypeScript, Prisma validate, Nginx config/syntax in an authorized dependency workspace |
| Runtime staging | **DEFERRED / NOT PERFORMED** | Source-only changes | User-authorized migration stage, review grants, CDN, real DB, worker, browser verification in post-28 gate |

**Observed verification:** 48/48 newly evaluated **static source-presence checks** succeeded. **Zero executable test results are asserted.** Any earlier counts in this report refer to previous static batches, not Vitest. The fact that a source includes a test does not imply it passed.

**Closure remains `PARTIAL — FIXES_REQUIRED`.** Branch-only commits; do not merge, deploy, or start section 17.
