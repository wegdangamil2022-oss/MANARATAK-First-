# Section 05 — three-session source remediation plan

User direction (2026-10-09): finish Section 05 source fixes in three sessions. Prioritize repairs; defer slow tests. This plan starts at branch `codex/section-01-iam-rbac`, baseline `63b600e` (verified through Batch 15). It does not change production release gates.

## Session allocation

| Session | Scope | Status |
| --- | --- | --- |
| 1 | Atomic structured worker failure evidence; stable work-item pagination; bounded staging dedup memory; retry backoff/Retry-After; concurrent local upstream limiter; retry policy validation | Implemented; targeted source verification recorded in the implementation log |
| 2 | EAP-backed artifact streaming, truthful capabilities, Admin artifact flow and atomic generic source create/detail/edit | Implemented and locally verified; owner receipt/resolution and full source execution workflows remain open |
| 3 | Staging lease/recovery and atomic queue visibility; source control test/run/status and UI; byte provenance/resource bounds; bounded diff; retention hold/replay safety; complete original-finding disposition | Repairs implemented and locally verified; original source gaps remain, so the section is not closed |

The second and third sessions must inspect the actual source against every original finding. Do not treat a deny-default guard or an interface alone as a completed functional feature. Do not call the section closed merely because three sessions elapsed.

## Remaining source register after Session 1

| Finding | Remaining obligation |
| --- | --- |
| IMP-P0-003/004 | Preserve existing cooperative stop/lease fencing; provide safe owner-evidence-backed resolution for stranded stops. No timeout-only terminal acknowledgement. |
| IMP-P0-005 | Actual owner-controlled receipt/inbox and atomic idempotency for any mutating consumer; audited, permissioned reconciliation. Current consumers are screening only and generic canonical mutation remains forbidden. |
| IMP-P0-006 / IMP-P1-007 | Reconcile counters and review outcomes across inline, worker, recovery and replay; retain the existing partial-completion protection. |
| IMP-P1-008 | Session 1 adds atomic per-attempt failure events and code/stage/outcome. Complete owner/record/correlation context when independently available, in-memory parity and retention assignment. Never invent missing correlation. |
| IMP-P1-009/010 | Compact worker checkpoint already exists; Session 1 removes batch-wide staging dedup key accumulation. Verify bounded streaming chunks and authoritative accepted IDs in Session 2. |
| IMP-P1-011/012/013 | Wire generic EAP artifact acquisition, parser registry and queued 202 flow; enforce actual format support and resource limits. |
| IMP-P1-014 | Source creation/edit/detail/test/run workflows with permission, conflict checks and atomic audit/outbox; preserve existing status CAS. |
| IMP-P0-015 / IMP-P1-016 | Preserve classification fail-closed guards; wire real owner-authorized robots/credential/agreement proof. No metadata-based approval bypass. |
| IMP-P1-017 | Session 1 honors Retry-After and bounded backoff. Conditional ETag/Last-Modified and safe 304 artifact reuse still pending. |
| IMP-P1-018 | Session 1 corrects the process-local limiter race and shared-origin budget. Shared production limiter, target-URL scope and governed cross-source policy remain pending. |
| IMP-P1-019/020 | Wire drift decisions and authorized fallback lifecycle. No silent browser or source substitution. |
| IMP-P1-021 | Separate manual upload provenance from verified official acquisition; typed immutable evidence rather than free-form authority claims. |
| IMP-P1-022/023 | Unified API/error envelopes and systematic governed retention assignment for source rows, checkpoints and worker failure evidence; preserve legal holds. |
| IMP-P1-024/025 | Reconcile historical verification claims and expose accurate domain/format/consumer capabilities. |
| Patch I | Batch/source detail, timeline, actionable errors, server filters, safe replay controls and entry points; preserve Arabic/English operations. |
| FGA-05-001 | Versioned provider/domain mapping profiles and pinned preview/staging, no canonical auto-promotion. |
| FGA-05-002 | Bounded deterministic read-only batch diff; missing rows never imply deletion. |
| FGA-05-003 | Reviewer assignment/CAS and central review-queue linkage without duplicating owner promotion authority. |

IMP-P0-001 full IDs and IMP-P0-002 atomic source dedup were implemented before this session; preserve their safeguards. This register complements the supplied review, not a replacement for its detailed requirements.

## Verification budget and deferred evidence

Run focused source/contract/security tests and incremental TypeScript checks. Individual source suite command budget: 60 seconds; if it exceeds this, terminate and record `DEFERRED`, including the exact command, reason and risk. A failing test is not a slow test: fix the failure or explicitly retain its source blocker.

Defer live PostgreSQL isolation/contention/rollback, migrations/restore, provider integrations, live browser E2E, staging/deployment, performance/load and multi-process crash recovery to the post-28 appendix. No skipped or deferred test is a PASS. No source closure is production GO.

Final Session 3 output must give a source-backed disposition for every row, commits, light checks and a separate runtime ledger. Any still-open source requirement prevents unconditional `CODE_CLOSED — RUNTIME_DEFERRED`.

## Inherited repository gates to track separately

Session 1 reproduced the baseline W2 asset purge/migration-authority failures and 18 migration metadata violations in six already committed Section 03/04 migrations. Preserve historical SQL/checksums. These are separately recorded repository-wide blockers; no production readiness or blanket full-repository PASS is implied by Section 05's focused tests. See `evidence/section-05/session-01/README.md` for baseline/current evidence.

## Session 2 disposition

Implemented artifact acquisition/staging and generic source authoring are documented in Batch 17 and [Session 2 evidence](evidence/section-05/session-02/README.md). Original findings are not blanket closed: IMP-P0-005 owner receipts/resolution and IMP-P1-014 test/run/control UI remain source work for Session 3. New staging crash recovery, safe dedup reservation cleanup, finalization/enqueue repair, temporary spool orphan retention/concurrent disk budget and CSV byte offsets also need explicit disposition. Session 3 must reconcile these with every row above before any source closure claim. Current section status remains IN PROGRESS.

## Session 3 closure reconciliation

See [Session 3 ledger and every original finding](evidence/section-05/session-03/README.md). The three-session allocation did not exhaust the original source scope. The original open register remains binding; completed safeguards and partial UI/API features must not be substituted for owner receipts, access proof integration, mapping profiles or reviewer assignment. Tests deferred to POST-28 are listed separately from unimplemented source work. Current Section 05 status is IN PROGRESS — SOURCE FIXES REQUIRED.

## Additional session after the three-session allocation

The user subsequently authorized implementing the remaining operational areas in one further session. Batch 19 adds actual source, persistence, API and Admin paths; its [disposition/evidence](evidence/section-05/session-04/README.md) supersedes the earlier "not implemented" descriptions for those delivered paths while retaining explicit owner/runtime/history limitations. This is an additional implementation session, not a retroactive assertion that the three-session target succeeded.

## Final user working rule and implementation closeout

The user subsequently required no repeated checks, including after fixing an observed failure. The [final ledger](evidence/section-05/session-05/README.md) records implementation closeout for supported paths and existing owner transfers, without running any verification command. This supersedes earlier current-source statuses for those paths; it does not turn deferred checks into PASS or claim production acceptance. CI is skipped for this closeout commit to honor that rule.
