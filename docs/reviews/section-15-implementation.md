# Section 15 — Student Support & Workspace (P15)

**Status: CODE_CLOSED — RUNTIME_DEFERRED**
**Independent closeout date:** 2026-10-11
**Repository:** `wegdangamil2022-oss/MANARATAK-First-`
**Branch:** `codex/section-15-student-support`
**Source validated:** `573573525fa6cd3e25bf3efe675270890862312b`
**Reviewed starting point:** `f52747cd76f13f4317a7e43ab7a09b30da168628`
**Main / fork baseline:** `9944568a92016b61e3137ba776b3e08a9466afcb`

This report supersedes the earlier partial/source-only summaries on this branch. The
9 October amendment in `MANARATAK_ADMIN_REVIEW_CODEX.md` governs closure: fix
source defects, run relevant lightweight regression/security checks, record the
commit, and defer live database/provider/browser/worker proofs until after Section
28. Source closure permits moving to the next section; it is not production approval.

## Review findings and completed repairs

The prior branch had 78 commits, 19 implemented items, eight partial items, and one
runtime item deferred. Its tests had never run. Independent execution found two
admin TypeScript errors, a malformed reminder test, two HTTP tests serializing
circular request objects, and a synchronous validation test expecting a Promise.
All were corrected; the assertions still check the actual sensitive boundary.

Source defects found and repaired during closeout:

- Course/certificate projection ordering, terminal archive/revocation/reissue
  protection, renewal predecessor state, and original course completion dates.
- Per-workspace transaction row locking for owner ingestion, recovery, and personal
  writes; initializing accounts reject support reset. Temporary re-suspension does
  not quarantine an otherwise valid parked event. Archived accounts retire parked
  payloads and retain only idempotent inbox receipts, without replaying personal data.
- One normalized, versioned internal owner-event policy: owner/type allowlists,
  reference/recipient matching, valid dates/progress/statuses, bounded metadata,
  and safe notification paths. No HTTP endpoint exposes integration ingestion.
  New role events carry a version; legacy atomic role events require the real
  aggregate/assignment and a current matching student-role assignment.
- Bounded, scoped owner-tab pagination and truthful unknown totals. Read provenance
  records `LIVE_OWNER`, query time, coverage, and an explicitly unknown
  `lastSyncedAt`; it does not fabricate an owner revision or synchronization proof.
- A read-only exact-identity lookup usable even when the workspace is missing from
  the support list. Student-role and provisioning diagnostics reveal no identity PII.
- Current tracker version/status/recipient/deadline and active identity/student role
  are checked immediately before notification delivery. Stale or unversioned legacy
  reminders are suppressed; owner outages retry rather than sending. No code claims
  to recall a notification already accepted by an external provider.
- Remaining admin copy, dates, directions, default stages and timeline labels use
  Arabic/English copy. Owner views are hidden when their UI grant is absent; server
  authorization remains the authority. Mutation permission outages fail closed.

## Task disposition

`CLOSED_SOURCE` means implemented and covered by the lightweight checks below.
Every row retains applicable operational proofs in the deferred checklist.

| Task | Disposition | Source evidence / behavior |
|---|---|---|
| STU-ADM-001 | CLOSED_SOURCE | Consent history remains canonical; before/after values excluded from audit/outbox. |
| STU-ADM-002 | CLOSED_SOURCE | P13/P14/P20 server grants independent of support grant; restricted lists/counts omitted or null. |
| STU-ADM-003 | CLOSED_SOURCE | Support actor/reason and tracker audit/timeline/reminder facts persist inside their owner transaction. |
| STU-ADM-004 | CLOSED_SOURCE | Version/status CAS and active-only reset; conflicts emit no extra mutation audit/outbox. |
| STU-ADM-005 | CLOSED_SOURCE | Consent CAS precedes canonical decision and atomic audit/outbox. |
| STU-ADM-006 | CLOSED_SOURCE | Profile expectedVersion required at HTTP/application/persistence boundaries. |
| STU-ADM-007 | CLOSED_SOURCE | P14 lifecycle fanout, deterministic inbox, ordered/terminal projections, renewal predecessor handling. |
| STU-ADM-008 | CLOSED_SOURCE | Up to four 50-record owner pages per item; durable deterministic continuation preserves the tail. |
| STU-ADM-009 | CLOSED_SOURCE | Active-only replay in batches of 25; poison quarantine, retryable re-suspension, archived payload retirement. |
| STU-ADM-010 | CLOSED_SOURCE | Internal v1 envelope, producer-version/aggregate checks, owner/reference/date/status/size allowlists. |
| STU-ADM-011 | CLOSED_SOURCE | Canonical dashboard reads; optional Redis failures cannot reverse committed results or serve stale snapshots. |
| STU-ADM-012 | CLOSED_SOURCE | Mandatory privacy-minimal audit before disclosure, explicit scope/purpose, independent owner grants. |
| STU-ADM-013 | CLOSED_SOURCE | Bounded owner pages (maximum 12 for support) and continuation; incomplete totals remain unknown. |
| STU-ADM-014 | CLOSED_SOURCE | Live-owner provenance, query time/coverage, unknown source-sync time, independent degraded/restricted state. |
| STU-ADM-015 | CLOSED_SOURCE | Transactional reminder facts, version-scoped reconciliation, and current owner eligibility before delivery. |
| STU-ADM-016 | CLOSED_SOURCE | Tracker/checklist version+student+status CAS. |
| STU-ADM-017 | CLOSED_SOURCE | Archived tracker edits denied; archive/delete reconcile reminders. |
| STU-ADM-018 | CLOSED_SOURCE | Exact-identity diagnostic outside existing workspace details; no read-time provisioning. |
| STU-ADM-019 | CLOSED_SOURCE | Safe failure taxonomy; raw internal exceptions/payloads are not displayed. |
| STU-ADM-020 | CLOSED_SOURCE | HMAC cursor scope binding, expiry, canonical parser and constant-time signature comparison. |
| STU-ADM-021 | CLOSED_SOURCE | Reset conflict refreshes state and requires renewed confirmation, preserving the reason. |
| STU-ADM-022 | CLOSED_SOURCE | Filter/search changes clear selection; stale requests cannot replace the current student. |
| STU-ADM-023 | CLOSED_SOURCE | AR/EN copy/date/direction/default labels; simulated SSR locale regression. |
| STU-ADM-024 | CLOSED_SOURCE | Executed HTTP authorization/error/audit tests and isolated application/repository/owner-contract regressions. |
| STU-ADM-025 | CLOSED_SOURCE | Base detail reads P15 only; independent authorized owner-tab requests and continuations. |
| STU-ADM-026 | DEFERRED_AFTER_28 | Deployment-specific DB/worker/provider/browser/readiness evidence, with checklist preserved. |
| FGA-15-001 | CLOSED_SOURCE | Purpose-audited, signed/scoped tracker/history pages and deleted-record lookup; no notes/documents exposed. |
| FGA-15-002 | CLOSED_SOURCE | P15 incident triage and P20-owned payment triage; distinct owner count, separate service grant and mandatory audit. |

**Source access policy for STU-ADM-012:** Support reads require the current support
permission. Cross-domain views additionally require the owner's grant. Audit is
mandatory, without sampling, before response disclosure. Fixed route purpose/scope
or the approved tracker purpose enum is retained; contact details, searches, notes,
documents and cursor tokens are excluded. Records use the canonical audit owner and
its access/retention controls. This section does not invent a case-ticket system or
claim that an external ticket or production retention configuration was verified.

## Validation actually executed

Node `v22.23.3`; fresh lockfile installation and Prisma client generation only.
No connection to a real database was used by the tests.

| Check | Result |
|---|---|
| `npm run typecheck` | PASS; full monorepo project references |
| `tsc -b packages/domain packages/application packages/infrastructure apps/api apps/admin` and final affected-project checks | PASS |
| `npx vitest run --config .section15-vitest.config.ts` | PASS — **22 files / 156 tests**, zero failures |
| `npm run build -w @manaratak/admin` | PASS |
| `node scripts/verify-phase15-source.mjs` | PASS — 14/14 source smoke checks |
| `node scripts/verify-w4-student-support.mjs` | PASS — 9/9 source smoke checks |
| `node scripts/quality/verify-source-quality.mjs` | PASS — zero package/file cycles and zero new accessibility findings |
| Targeted ESLint for support, student source and notification delivery handler | PASS exit status; 0 errors, 100 warnings (documented, not hidden) |
| `git diff --check` | PASS |

The focused config imports current source rather than relying on stale package
builds. It covers P15 domain/application/repository/HTTP tests, AR/EN simulated
rendering, P13/P14 owner adapters/read models, certificate persistence, P20 triage,
service use cases, role assignment, and notification delivery eligibility.
Repository tests use isolated mocks; transaction placement/CAS/fault paths are
verified, not claimed as PostgreSQL concurrency or rollback runtime proof.

Lint warnings include existing `any`-typed persistence/router seams and hook dependency
warnings. Build warnings include the existing large admin bundle and font paths
resolved at runtime. These are recorded; no source-quality baseline was weakened.
See `section-15-validation.json` and `evidence/section-15/` for receipts.

## Deferred runtime boundary

See `section-15-closure-gates.md`. No database mutations, migrations, seed,
backfill, worker sweep, provider delivery, deployment or main merge occurred.
Only existing schema/contracts were consumed; no migration was added or applied.
Section 16 was not started. Source closure does not mean `RUNTIME_VALIDATED`,
`PRODUCTION_GO`, or that the current deployed database/workers are safe/configured.
