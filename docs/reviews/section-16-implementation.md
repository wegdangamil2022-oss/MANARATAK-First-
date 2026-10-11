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
