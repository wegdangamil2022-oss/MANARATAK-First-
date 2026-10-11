# Section 16 — source closure and post-28 runtime gates

**Source verdict: CODE_CLOSED — RUNTIME_DEFERRED.** The 9 October 2026 source closure policy permits closing implemented controls after runnable source checks; live integration checks remain after section 28. This replaces the earlier unresolved/source-not-executed gate list.

Verified source: `b91ea7603697b3af58f99caae7608f3bd32b570c`. See [implementation task map](section-16-implementation.md), [machine-readable validation](section-16-validation.json) and [raw evidence](evidence/section-16).

## Completed source gates

| Gate | Evidence | Result |
| --- | --- | --- |
| Granular authorization and reader access | CMS API negative cases, shared admission and admin SSR | PASS |
| Effective editor/fingerprint and immutable published data | Root fingerprint, slug continuation, maker-checker and site snapshot tests/review | PASS |
| Version conflicts and restore safety | Repository/API CAS and full-graph fail-closed checks; bounded revision paging | PASS |
| EAP, domain and navigation owner authority | Application/domain publication checks, typed owner tests, live target freshness/orphans | PASS |
| Schema/block governance and UI | Approval contracts, nested schema editor SSR, archive CAS test | PASS |
| Scheduler retry, lease and audit | Source recovery/race controls, handler durable context test | PASS |
| HTTP owner HTML, redirects, archive and SEO | Public API/projection tests, web build entry, nginx localhost fixture 7/7 | PASS |
| CMS usability and AR/EN | Reader/editor controls, localized SSR, panel refresh/stale guards, page-local scope | PASS |
| Search/index plan | Bounded source searches and prepared pg_trgm migration; no EXPLAIN executed | PASS (source) |
| Compile/build/quality | Full tsc, 118 tests, three builds, lint, schema validation, source verifiers | PASS |

No real database, IAM, EAP provider, worker delivery, browser E2E or CDN behavior is inferred from these PASS results. CMS-ADM-030 remains RUNTIME_DEFERRED.

## Prepared migrations — none applied

In addition to prior base CMS migrations, this branch prepares:

1. `20261011051500_cms_review_snapshot_hash` — approval binds the effective editorial graph. Historic approvals without hashes must be re-reviewed; never fabricate approved fingerprints.
2. `20261011052500_cms_public_site_snapshots` — immutable published navigation/announcement snapshots. Rehearse existing published-row transition; source has a bounded legacy published read fallback.
3. `20261011053500_cms_redirect_version` — redirect optimistic version and last editor.
4. `20261011065000_cms_block_schema_approval` — schema approval/version lifecycle.
5. `20261011075500_cms_root_last_editor` — effective root editor backfill from editorial ledger, author fallback only without recorded edits. Sample historic identity/order before applying.
6. `20261011114500_cms_bounded_search_indexes` — scoped compound order index and pg_trgm GIN search indexes. Extension privileges, disk capacity, write cost and DDL duration require DBA rollout review. Use production-shaped EXPLAIN before choosing final index deployment strategy.

No migrate/db push/seed/reset/backfill statement was executed. Prisma validation/generation used a dummy local URL and did not open a database connection.

## Post-28 runtime matrix

| Area | Controlled runtime evidence still required |
| --- | --- |
| PostgreSQL migrations and rollback | Backup/restore rehearsal, schema diff, historic snapshots/approval/editor samples, extension permissions, compatibility and rollback |
| Real IAM principals | Distinct viewer, author, reviewer, publisher and ops; actual IAM assignments, self-approval and wrong-scope denies |
| Publication/restore/CAS | Concurrent SQL transactions, serializable conflict/rollback, full graph restore and immutable last-known-good snapshots |
| EAP | Real asset owner/public grant, revocation/private/missing handles at edit, publication, schema blocks and scheduled publish |
| Canonical domain owners | Published/archived/inactive entity transitions for each supported owner type, scoped locale/site, no stale nav or cross-owner facts |
| Workers | Real claim/crash/reclaim/expired lease, poison jobs, retry/DLQ/operator recovery, idempotency and job/run audit correlation |
| Redis/CDN/ingress | Real deployment route and HTTP statuses, no cached archived HTML, invalidation failures and current XML sitemap propagation |
| SEO and web | Browser/crawler canonical and actual translated slugs, structured data, robots, 301/308/404, progressive app entry and interactive favorites |
| Search performance | Real data volume, bounded SQL plans, pg_trgm/compound index benefit, write overhead and latency |
| UI E2E | Multi-role Arabic/English workflows, nested asset editor, revisions paging/restore conflicts, independent panel outages and calendar scope |

Record environment, deployed source/schema SHA, fixture identities, steps, response/status, audit/outbox/job IDs, observed timing and rollback result for each runtime case. Closure is not production GO.

## Rollout contract

The live CMS routes require the checked-in nginx rules or an equivalent ingress implementation, an HTTPS public web origin, same-origin API connectivity, the generated `/cms-app-entry.js` artifact and the compatible migrated schema. Static-only hosting cannot guarantee canonical-owner HTTP redirects/archive statuses. Missing owner/configuration fails closed instead of serving stale prerender HTML.

Apply the schema and IAM grants before enabling source paths that depend on them; keep incompatible CMS write/worker traffic disabled through rollout. If deployment is later requested, use a separately scoped staging/runtime run and compatible rollback artifacts. This section review performed no deployment or database mutation, and did not merge the branch.
