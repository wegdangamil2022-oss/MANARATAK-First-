# Section 16 — Enterprise CMS & Site Experience — Implementation report

**Branch:** `codex/section-16-cms`  
**Base:** `main@ea221887d6348493bd34d728971754d14fdb973a`  
**Reviewed worktree HEAD before this report:** `bf7d139bd02f1cb4ec42e278fd0ba3e36bfced95`  
**Source assessment:** **PARTIAL — FIXES_REQUIRED**  
**Canonical plan:** MANARATAK_ADMIN_REVIEW_CODEX (2026-10-09 edition), §16 and §16.FG; source-close policy 9 October 2026.

## What was actually changed

- Domain/application: independent CMS permissions, review fingerprint and maker-checker, bounded workflow versions, strict locale delivery, revision snapshots/recovery, EAP rechecks on publication and restore, nested block EAP guards.
- Prisma repository: serializable mutations and root optimistic CAS, published slug+SEO repair, last-known-good navigation/announcement snapshots, published block projections, scheduled claim/version and retry guards, audited redirect changes, hard block on unverified canonical foreign-domain references, bounded cross-tenant related queries.
- API: route-specific viewer/author/reviewer/publisher/redirect/schema/navigation/operator authorization, derived actor identity, strict workflow preconditions, controlled scheduler clock, redirect correction and block publication endpoints; minimized public redirect.
- Admin/public: separate navigation, announcement and block publication buttons; redirect correction/disable UI; AR/EN readiness comparison; independently refreshed site panels.
- Prisma schema/migration files are **prepared only**. Zero real migrations, db push, seed, backfills, worker runs, CDN purges, or deployments were executed.

## Changed source files

`apps/admin/src/features/cms/CmsOperationsPanels.tsx`; `apps/admin/src/pages/CmsAdminPage.tsx`; `apps/api/src/app.ts`; `apps/api/src/infrastructure/di/container.ts`; `apps/api/src/presentation/api/router/CmsAdminRouter.ts`; `apps/api/src/presentation/api/router/CmsPublicRouter.ts`; `apps/api/tests/presentation/api/router/CmsAdminRouter.spec.ts`; `packages/application/src/cms/use-cases/CmsUseCases.ts`; `packages/application/tests/cms/CmsUseCases.spec.ts`; `packages/domain/src/cms/contracts/ICmsRepository.ts`; `packages/domain/src/cms/entities/CmsContent.ts`; `packages/domain/src/cms/services/CmsPublishingPolicy.ts`; `packages/domain/tests/cms/CmsPublishingPolicy.spec.ts`; `packages/infrastructure/src/cms/PrismaCmsRepository.ts`; `packages/infrastructure/prisma/schema.prisma`; `packages/shared/src/authorization/adminPermissionCatalog.ts`.

**New source migrations (never applied):**

- `packages/infrastructure/prisma/migrations/20261011051500_cms_review_snapshot_hash/migration.sql`
- `packages/infrastructure/prisma/migrations/20261011052500_cms_public_site_snapshots/migration.sql`
- `packages/infrastructure/prisma/migrations/20261011053500_cms_redirect_version/migration.sql`

## Task-by-task status (not a claim of passing runtime tests)

| Task | State | Actual evidence / remaining work |
| --- | --- | --- |
| CMS-ADM-001 | SOURCE_FIXED | Separate route capabilities and permission catalog; runtime grants not tested |
| CMS-ADM-002 | SOURCE_FIXED | Root freezes under review/publication and approved fingerprint includes effective payload |
| CMS-ADM-003 | SOURCE_FIXED | Canonical URL and slug updated atomically at republish; old redirect dormant until publish |
| CMS-ADM-004 | SOURCE_PLAN_READY | Published navigation/announcement snapshots and migration staged; runtime not activated |
| CMS-ADM-005 | SOURCE_FIXED | Reviewer must differ from author/requestor/last editor; hash-bound approval |
| CMS-ADM-006 | PARTIAL | Root CAS + serializable write path; PostgreSQL collision tests not executed |
| CMS-ADM-007 | PARTIAL | Full localized relations captured and restored; legacy snapshots fail closed, preflight EAP |
| CMS-ADM-008 | SOURCE_FIXED | EAP revalidated at application and infrastructure publication/scheduler boundary |
| CMS-ADM-009 | BLOCKED_SOURCE | Unverified new domain links rejected; canonical owner gateway still missing |
| CMS-ADM-010 | SOURCE_FIXED | Strict matching site/locale/slug; no hidden cross-locale fallback |
| CMS-ADM-011 | PARTIAL | Owner cache invalidation added; real edge/CDN propagation unverified |
| CMS-ADM-012 | PARTIAL | Bounded transient retry; governed DLQ/manual replay UI still missing |
| CMS-ADM-013 | PARTIAL | Lease owner/version rechecked inside serializable publish; runtime crash tests deferred |
| CMS-ADM-014 | SOURCE_FIXED | PENDING and PROCESSING invalidated on cancel/restore/change slug |
| CMS-ADM-015 | BLOCKED_SOURCE | CMS live target resolution added; DOMAIN_REFERENCE fails closed pending canonical owner resolver |
| CMS-ADM-016 | PARTIAL | Maker-checker block publish, public projection, schema role added; schema governance incomplete |
| CMS-ADM-017 | SOURCE_FIXED | Nested schema asset handles and public EAP status checked on save/publish |
| CMS-ADM-018 | SOURCE_FIXED | Root owner/site mutation excluded from general PATCH and update allowlist |
| CMS-ADM-019 | SOURCE_FIXED | PUBLIC-only notice audience and non-expired publish checks |
| CMS-ADM-020 | SOURCE_FIXED | Public redirect exposes only destinationPath and statusCode |
| CMS-ADM-021 | SOURCE_FIXED | Owner-related links prefilter published and tenant/locale before taking results |
| CMS-ADM-022 | SOURCE_FIXED | Admin nav/banner/block publish and archive actions connected to APIs |
| CMS-ADM-023 | BLOCKED_SOURCE | Vite browser router lacks deployable HTTP 301/308 + sitemap/CDN integration |
| CMS-ADM-024 | PARTIAL | Bound q and page size/page index; index plans and benchmark deferred |
| CMS-ADM-025 | PARTIAL | Panels scoped to current page; P24 review authority not wired |
| CMS-ADM-026 | PARTIAL | Revision reads bounded and individual restore read; cursor/lazy history UI missing |
| CMS-ADM-027 | PARTIAL | allSettled prevents all-or-nothing fetch; separate per-panel retry/status incomplete |
| CMS-ADM-028 | PARTIAL | AR/EN content and comparison retained; full English admin controls not completed |
| CMS-ADM-029 | PARTIAL | SYSTEM audit classification for worker; job/run correlation requires more source work |
| CMS-ADM-030 | RUNTIME_DEFERRED | Migration, CDN, EAP, scheduler and permission runtime gates explicitly pending |
| FGA-16-001 | PARTIAL | Redirect patch/disable/trace + admin UI; paginated searchable owner API pending |
| FGA-16-002 | SOURCE_FIXED | Read-only side-by-side AR/EN completeness and locale editor navigation |

## Source validation performed

- **30/30 static source-contract inspections passed** against GitHub branch file contents. These check that critical authorization gates, review hash checks, public projection isolation, lease guards, safe redirect projections, block/EAP policy hooks and negative-test source assertions exist.
- This was **string/contract inspection only**, **not** TypeScript compile, Vitest execution, runtime integration or a database test.
- New/revised Vitest cases were committed for CMS RBAC deny, spoofed fields, unsafe redirect, block maker-checker permission, nested asset path XSS/URL, and historical asset/attachment restore failure; their execution remains **NOT RUN**.
- **Not run:** targeted Vitest, TypeScript checking, Prisma validate, database/migration dry-run, live browser/E2E, worker/queue runs, real EAP/CDN, external providers. GitHub workflow list for this branch returned no recent runs at verification time; the current environment has GitHub connector access but no locally mounted repository/dependency tree and could not clone GitHub over the container network.
- These unexecuted checks cannot be reported as PASS. No known failure was suppressed.

## Open source blockers

1. **CMS-ADM-009/015:** cross-domain canonical owner read gateway not yet wired; rejects writes/publish in the meantime. This is safe denial, **not feature completion**.
2. **CMS-ADM-023:** apps/web is a client-side browser router; a JSON redirect resolver is not server-side HTTP 301/308, and sitemap/CDN integration must be designed and implemented.
3. **CMS-ADM-012/016:** retry recovery/DLQ and versioned schema governance not complete.
4. **CMS-ADM-006/007/017:** lightweight executable security/contract regressions and compile/Prisma validation not executed.
5. **FGA-16-001:** redirect correction is live in source; paginated owner lookup, status filters and conflict-friendly UI need completion.

Follow the closure gates in `docs/reviews/section-16-closure-gates.md`. **Do not use `CODE_CLOSED — RUNTIME_DEFERRED` for this commit.** Do not start section 17, merge to main, or publish.

## Continuation — redirect registry and published-related selection

The additional CMS source work on this branch includes:

- FGA-16-001: server-side `searchRedirects` in the CMS owner, application and admin router; bounded `page/pageSize`, strict site/locale, status and source/destination text filters; AR/EN admin search, state filter and pagination. The existing correction/disable command still uses `expectedVersion` and a recorded reason.
- CMS-ADM-021: replaced the early `take: 200` related-link cutoff with a parameterized published-content join that first filters published site and locale, groups link owners, then applies the bounded final result limit. Added focused repository regression source.
- Added API negative regressions for cross-site access, invalid active/locale input, excessive page sizes and missing viewer permission, and an application contract regression for paged owner reads.
- Fixed the public redirect route spec fixture by supplying the `resolveRedirect` mock invoked by the existing HTTP redirect tests.

**Actual verification for this continuation:** 18/18 source-string contract assertions executed against retrieved branch files (9 RBAC/API/UI + 9 approval/projection/EAP/published-join checks); all passed. These are structural/static checks, **not** unit-test, type-check, SQL, browser, or integration PASS. The GitHub Actions branch query returned **0 workflow runs**. Targeted Vitest and TypeScript remain **NOT RUN** because the working container cannot resolve GitHub for cloning and does not have this repository's installed dependency tree.

**New or changed paths:** `packages/domain/src/cms/contracts/ICmsRepository.ts`, `packages/infrastructure/src/cms/PrismaCmsRepository.ts`, `packages/application/src/cms/use-cases/CmsUseCases.ts`, `apps/api/src/presentation/api/router/CmsAdminRouter.ts`, `apps/admin/src/features/cms/CmsOperationsPanels.tsx`, `apps/api/tests/presentation/api/router/CmsAdminRouter.spec.ts`, `apps/api/tests/presentation/api/router/CmsPublicRouter.spec.ts`, `packages/application/tests/cms/CmsUseCases.spec.ts`, and `packages/infrastructure/tests/cms/CmsRelatedPublishedSelection.spec.ts`.

**Status remains PARTIAL — FIXES_REQUIRED** because open source/verification gates documented below and in the closure matrix are not resolved. No database migration, seed, worker job, cache purge, merge, or deployment was performed.

## Continuation — governed failed-schedule recovery (source-only)

- Added `listFailedSchedules` owner-query scoped by `siteIdentifier` and optional AR/EN locale, using parameterized SQL with a hard limit of 100.
- Added `retryFailedSchedule(jobId, expectedAttemptCount, actorId, reason)`. It accepts only a FAILED PUBLISH job, validates a current due SCHEDULED localization and its most recent approved editorial fingerprint, performs conditional FAILED→PENDING update in a serializable transaction, and records the reason and previous failure through editorial ledger, audit and outbox. It does **not** publish content directly or bypass maker-checker.
- Added an independent `admin:cms:operations:run` GET/POST route guard with bounded request schemas, and an opt-in operator panel listing failed jobs and asking for explicit confirmation/reason before retry.
- Added API deny/negative contract regressions and owner mock tests for outdated hash, attempt-counter conflict, and the approved repair case. These are committed test sources, not executed test results.
- **Actual verification:** 9/9 additional structural source-contract checks passed (operator-only routes, validated attempt counter, conditional write, stale-approval gate, scoped query, audit hook, no user-clock injection and admin action wiring). Combined with the earlier continuation's 18 checks: **27/27 structural inspections passed**; **Vitest, TypeScript, Prisma validation and database tests remain NOT RUN**. This does not establish source closure.

Updated task evidence: `CMS-ADM-012` now has a bounded retry and governed operator inspection/requeue path in source, but runtime scheduling/crash recovery and actual executable lightweight regressions still require validation. `FGA-16-001` now has server-side paginated redirect search/status filters and admin paging in addition to audited correction/disable. `CMS-ADM-021` now applies the final limit only after filtering published owner identities for the matching site/locale.

**Remaining source blockers must not be renamed runtime-only:** external canonical owner resolution for `CMS-ADM-009/015`, schema lifecycle governance for `CMS-ADM-016`, complete public sitemap/canonical/hreflang integration for `CMS-ADM-023`, and source-level test execution/compile verification. Maintain **PARTIAL — FIXES_REQUIRED**.

## Continuation — canonical owner gateway, reviewed navigation and CMS prerender (11 October 2026)

### New source changes
- **CMS-ADM-009:** added transaction-bound `PrismaCmsDomainOwnerReadGateway` against P7/P9/P10/P12/P13 canonical tables, with publication/lifecycle guards for university, mapped academic program, major, verified published scholarship, published international-test snapshot, eligible published course and active reference country. No CMS-owned copy of their publication status is created. `replaceDomainLinks` now requires a positive `expectedVersion` from the admin request through use case to repository, enforces an atomic root compare-and-swap version increment, rejects missing/private/unpublished owners, refuses changes while any locale is in review/ready/scheduled/published or has a prior published/approved record, and audits the prior/new relationship identities in the same serializable transaction. The final `publish` transaction revalidates all referenced owners.
- **CMS-ADM-015:** CMS_CONTENT navigation nodes are resolved to the published same-site/same-locale canonical path. DOMAIN_REFERENCE authoring tokens use `TARGET_TYPE:UUID`, are checked against the canonical owner, and supported university, major, scholarship, international-test and course targets become locale-prefixed published paths in the **public navigation snapshot**. Authoring data is not rewritten. Academic program and country navigation remain **denied** until owner-approved public route contracts exist; invalid/private/archived targets fail closed.
- **CMS-ADM-023:** the existing production prerender entrypoint now fetches strictly published CMS detail pages with bounded `page/pageSize`, verifies exact server-derived canonical paths, excludes `seoMetadata.noIndex`, renders localized detail HTML with title/description/JSON-LD, and regenerates a sitemap from the produced manifest. CMS hreflang grouping follows `contentId` so Arabic and English may use different slugs. Absent locale copies are not given invented alternates. The web Nginx redirect miss path now prefers `$uri/index.html` before SPA fallback. This is a **build-time** integration; automatic invalidation/rebuild after new publications and live Nginx/CDN validation remain unproven.
- New targeted test source: `CmsDomainOwnerReadGateway.spec.ts`, `CmsDomainLinkMutation.spec.ts`, `CmsNavigationOwnerResolution.spec.ts`, `cms-seo-prerender.spec.ts` (local mock API; no real provider) and a versioned domain-link API regression in `CmsAdminRouter.spec.ts`.

### Evidence boundaries and unfinished aspects

- **Actually executed:** 48/48 additional **static source-token/structural checks** on the current GitHub branch (22 owner, CAS, navigation and route checks plus 26 SEO, Nginx and regression-source checks). These do **not** test semantic correctness or execute TypeScript, Vitest, Nginx, Prisma SQL or Node prerender.
- **NOT RUN:** all new and existing targeted Vitest tests, TypeScript build/check, Node SEO CLI smoke, Prisma validation, Nginx configuration validation, live DB/worker/CDN and browser checks. The container has no authenticated clone or installed dependencies. Do not report a test PASS.
- **Remaining source work/gates:** broader reviewed cross-domain relationship editing after an already-published article needs a new governance flow (currently strictly denied); P15 country/academic-program public navigation path resolution needs explicit owner route contracts; CMS-ADM-016 executable/schema review evidence and published block UI integration need verification; CMS-ADM-023 needs publication-triggered SEO regeneration/CDN invalidation and reproducible build evidence; scheduler transient backoff and run-time exactly-once evidence remain open. Runtime migrations, staging and user grant validation remain prohibited in this section.
- No changes were made to `main`; no merge, database operation, migration apply, worker job, provider calls, cache purge or production deployment.

**Decision unchanged: PARTIAL — FIXES_REQUIRED.** Do not claim `CODE_CLOSED — RUNTIME_DEFERRED` merely from newly committed source or 48 structural inspections.

## Continuation — atomic scheduled publication, root-editor identity, public scoping and SEO correctness (11 October 2026)

New branch-only implementation since the preceding continuation:

1. **CMS-ADM-013:** `publish` marks the scheduling job COMPLETED with conditional `id/jobType/claimedBy/leaseExpiresAt/idempotencyKey` guards **inside the same serializable transaction** that writes published snapshots, localized status, revision and audit/outbox. The scheduling loop no longer tries a separate publish-job completion after success. The exception recovery path only reports a previous publish success when the exact scheduled job is already COMPLETED; a matching public state alone is not enough. Source regression in `CmsScheduleAtomicPublish.spec.ts` covers atomic completion, lost lease, and revoked cross-domain owner.
2. **CMS-ADM-005:** tracked `CmsContentNode.lastModifiedBy` separately from immutable original author; creation seeds it from authenticated creator, root edit and domain-link CAS assign the actor, and final review/publish reject the effective root editor. New source-only migration `20261011075500_cms_root_last_editor` adds the non-null column and backfills historical values from `authorId` (**not applied**). Contract field is compatible/optional until the migration is authorized. Source tests in `CmsRootMakerChecker.spec.ts`.
3. **CMS-ADM-010/018/public scoping:** every CMS public router site identifier is now restricted to `manaratak`, not a caller-chosen tenant string. Source regression added to `CmsPublicRouter.spec.ts`.
4. **CMS-ADM-009/021:** public related-content listing rechecks the referenced canonical domain owner's live published/active status before returning content. An archived/private referenced owner produces an empty result, not old related links. Targeted existing published-selection regressions updated.
5. **CMS-ADM-023:** `availableLocales` now skips published `seoMetadata.noIndex` locales in public hreflang discovery; prerender omits OpenGraph alternate locale where there is no published alternate. The mocked local prerender fixture now includes an Arabic-only article and checks it has no English alternate.
6. **FGA-16-001/redirect delivery:** public URL resolution now uses a single indexed scoped Prisma `findUnique` on `(siteIdentifier, locale, sourcePath)` and returns only ACTIVE records, rather than fetching the full redirect registry on every browser request. Existing caller compatibility is preserved when the optional owner method is not implemented. Regression added in `CmsRedirectIndexedResolution.spec.ts`.

**Verified:** 36/36 additional explicit static source-presence checks on GitHub branch sources and new test files. **Not executed:** TypeScript, Vitest, Node prerender, Prisma schema validate, Nginx syntax, database, worker, provider, E2E or deployment. Static checks are not executable test PASS. Continue with targeted runnable tests once the dependency workspace is available.

**Remaining source/runtime boundaries:** A registered but not actually consumed CMS outbox event is not automatic SEO rebuild; publication/slug/archive-driven site sitemap + CDN regeneration and its associated lightweight test remain unproven. Cross-domain relation revision after an already-published article remains intentionally denied pending a reviewable amendment workflow. Alternate public navigation routes for academic programs and reference countries remain unsupported. Mandatory source-only migration must be validated/applied in a separately authorized stage before running this schema-dependent implementation. No direct runtime operations or migrations were performed.

**Status: PARTIAL — FIXES_REQUIRED.** Do not claim `CODE_CLOSED — RUNTIME_DEFERRED` until the outstanding source requirements and executable lightweight gates are satisfied.
