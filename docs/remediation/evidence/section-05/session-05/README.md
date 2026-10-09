# Section 05 — implementation closeout, acceptance deferred

Branch: `codex/section-01-iam-rbac`; starts at `b08ac5a`.

**Status: IMPLEMENTATION_COMPLETE — VERIFICATION / RUNTIME ACCEPTANCE PENDING.** This closes the implementation work for the supported generic import paths and existing Scholarship/Course owner transfers. It does not claim passing checks for this commit, final acceptance of every aspirational capability, or production GO.

The user's latest working rule overrides the earlier verification budget: never repeat checks; fix an observed error without rerunning its check. **No test, TypeScript build, lint, quality, audit, secrets, persistence or whitespace check was run in this session.** Existing 320-test results belong only to the previous commit. New regression sources are unexecuted. The commit uses `[skip ci]` to avoid automatically repeating those suites on push. This instruction does not delete tests or disable the workflow for subsequent authorized use.

## Final implementation changes

- Both Scholarship review/transfer and Course transfer must invoke a mandatory transaction-bound owner command guard. It locks the shared reviewer assignment before locking the ImportRecord. Course additionally locks its analysis. The owner mutation, promotion link, existing owner receipt, audit and outbox remain in the same transaction. Concurrent retries inspect the committed receipt before any canonical write. A missing/corrupt Course receipt is refused; a verified retry preserves the actual recorded transfer timestamp.
- The existing screening receipt remains IMPORT-owned and never purports to prove a canonical mutation. Generic mutating consumers remain forbidden. Future mutating consumers cannot be enabled by this closeout; they must first implement their owner-controlled transactional receipt contract. Existing owner transfer receipt equivalents are now serialized; no cross-database transaction was introduced.
- JSON artifacts and registered-source runs use a real streaming UTF-8 parser, registered in production and selected in Admin. It accepts an object or array of objects, with 64 MiB artifact, 1 MiB row, 100,000 row and 64-level nesting ceilings. Syntax, invalid UTF-8, trailing input and non-object rows fail before queue visibility. CSV/NDJSON remain supported; XML/XLSX remain explicitly unsupported, as permitted by IMP-P1-012. No new dependency or pretend format capability was added.
- Canonical Import API v2 uses the platform ResponseFormatter for all successful and error JSON responses, bounded correlation IDs and stable error codes/retryability. Admin consumes v2 and unwraps one envelope only. Explicit request header `X-Import-Envelope-Version: 1` preserves legacy automation; legacy API tests deliberately select that version. Success data remains the underlying endpoint-specific DTO. The default contract is v2.
- Central review queue now loads actual server-paginated ImportReviewAssignment rows (50/page), assignee, due date and claim state, and links to the authoritative import review controls. It reports missing permission/unavailability honestly and cancels stale/unmounted requests. This does not grant owner decision permissions.
- Worker failure evidence gets deterministic one-year retention. Batch execution history returns at most 50 checkpoint/failure projections, current state and known intake timestamps, with truncation and incomplete historical timing explicit. No raw payload/checkpoint, invented prior stage timestamp or fabricated historical counter is returned. Admin exposes this alongside counters. Failure projections include a recommended operator action.

## Original finding disposition for supported execution paths

| Finding | Final disposition |
| --- | --- |
| IMP-P0-001 / 002 | Full UUID and atomic sorted source dedup safeguards retained. |
| IMP-P0-003 / 004 | Exact worker/staging leases, cooperative stop and receipt-backed audited uncertainty repair. Missing proof remains blocked. |
| IMP-P0-005 | Durable screening receipts; mandatory locked owner transfer/receipt equivalents; generic mutating registrations remain denied until owner inbox implementation. |
| IMP-P0-006 / IMP-P1-007 | Durable intake counters and actual work outcomes; partial completion; unknown historical inputs explicitly unknown. |
| IMP-P1-008 | Atomic redacted failure evidence, structured report, recommended action, deterministic failure expiry; DEVELOPMENT_ONLY capabilities do not pretend to provide production durability. |
| IMP-P1-009 / 010 | Bounded checkpoint/dedup/chunks, staging CAS/recovery and atomic queue visibility. |
| IMP-P1-011 | Verified EAP private stream/spool with limits and bounded orphan cleanup; deployment controls fleet filesystem capacity. |
| IMP-P1-012 / 013 | Real CSV/NDJSON/JSON artifact/source parser matrix, honest unsupported formats, preflight and queued 202 with Location. |
| IMP-P1-014 | Generic source authoring/detail/configuration test/run/status with revision, actor/audit and owner boundaries. |
| IMP-P0-015 / IMP-P1-016 | Trusted signed source approvals, server credentials, actual robots check and pinned DNS/scope. Missing real approval is denied; positive crawl-delay remains explicitly unsupported. |
| IMP-P1-017 / 018 | Retry/backoff, verified conditional snapshot reuse, atomic distributed fleet/origin/source budgets. |
| IMP-P1-019 / 020 | Persisted drift review/decision and explicit governed revision-pinned fallback. |
| IMP-P1-021 | Controlled manual/registered artifact and source revision provenance; source labels grant no authority. |
| IMP-P1-022 | Default canonical v2 success/error contract and correlation, explicit v1 compatibility. |
| IMP-P1-023 | Deterministic raw/failure expiry, audited historical expiry assignment, legal hold/uncertainty fencing. |
| IMP-P1-024 / 025 | Historical runtime reports superseded; actual runtime capabilities with no fabricated support/readiness. |
| Patch I | Source/artifact workflows, batch counters/history, actionable errors and owner-proof reconciliation; historical complete stage durations are unavailable, never invented. |
| FGA-05-001 | Immutable mapping/version/hash, aliases/types/required fields, preview/diff and pinned staging. |
| FGA-05-002 | Bounded deterministic read-only batch comparison and explicit absent/different mapping evidence; missing rows imply no deletion. |
| FGA-05-003 | Durable delegated IAM assignment/CAS/lease; central live queue linkage; actual Scholarship/Course mutation paths enforce the lease. Other generic consumers screen only. |

This disposition distinguishes delivered behavior from unavailable future capabilities. It supersedes the previous open implementation register for these supported paths, not historical evidence, owner-domain release gates, or requirements for future formats/consumers. Complete historical stage reconstruction and unrecorded input counts cannot be recovered from nonexistent evidence. Broader owner workflows and extra acquisition capabilities require their own approved implementation and must continue to report unavailable.

## Acceptance / activation remains pending

- New code and regression sources are **UNVERIFIED** under the no-repeat rule. Previous PASS logs must not be attached to this commit as current results.
- Migration `20261009070000_import_governance_receipts` remains **UNAPPLIED**. No migration/deployment/merge or live DB/provider/browser request occurred.
- POST-28: PostgreSQL lock ordering/contention/rollback, source migration/recovery, cross-process budgets/spools, real provider/robots/credential configuration, browser Arabic/English/RBAC and load.
- Actual restricted-source signed approvals/credentials must be provisioned by the trusted deployment authority. No secrets or signing private key were created in the repository.
- Inherited W2 and historical migration metadata blockers remain unchanged; no repository-wide PASS or production readiness is asserted.
