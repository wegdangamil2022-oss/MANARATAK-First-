# Section 05 — Universal Import Foundation — source remediation log

**Source branch:** `codex/section-01-iam-rbac`
**Reference:** `MANARATAK_ADMIN_REVIEW_CODEX(20261009-172440).md`, Section 05.
**Status:** `IN PROGRESS — SOURCE FIXES REQUIRED`. This report documents initial fixes, **not** closure of Section 05 or a production release.

## Batch 2 — replay-uncertainty safety and bounded source lookups (2026-10-09)

- **IMP-P0-005 interim safety boundary:** The durable worker now records `_phase6HandoffState: DISPATCH_IN_FLIGHT` on the import record *before* invoking an owner handoff consumer. Once an owner call has begun, a worker crash, cancellation during the call, failed ImportRecord acknowledgment or expired lease leaves the marker intact. Later attempts **do not automatically call the owner again**. Instead they retain the original handoff envelope, mark the record `NEEDS_REVIEW`, and persist `MANUAL_RECONCILIATION_REQUIRED`. An unavailable consumer cannot downgrade an uncertain receipt into `AWAITING_DOMAIN_INTEGRATION` or cause a later accidental replay.
- **Trust boundary:** Incoming normalized data cannot inject private `_phase6*`, `_domainHandoff`, `_sourceRowNumber` or `_payloadFingerprint` keys; requests fail before a batch is created. The worker mints its own initial `PENDING_HANDOFF` state and durable envelope.
- **Verified semantics of currently registered owners:** University, Scholarship and International Test handoff adapters only screen/prepare draft candidates; they do **not** autonomously write or publish canonical domain records. This protects current paths, but it is **not a durable owning-domain inbox**. A future mutating consumer must implement its own transactional idempotency/receipt before automatic replay can be enabled.
- **Safety/availability tradeoff:** The conservative write-ahead marker provides a fail-closed, at-most-once **automatic invocation** policy for uncertain outcomes, but it may require manual reconciliation even if no actual owner call completed (crash after marker). This is intentional until owner receipt infrastructure exists; it is not claimed to be atomic exactly-once delivery.
- **IMP-P1 lookup efficiency:** For a bounded 500-row staging chunk, optional source identity batch lookup `findExistingSourceDedupKeys` replaces N individual `findBySourceDedupKey` database reads. The existing transaction-scoped source lock/insertion still supplies the final cross-batch dedup correctness; the batch read is only an early skip. When a repository does not provide a batch lookup, legacy per-row lookup remains available.
- **Focused regression additions:** lost-ack/crash replay does not double-dispatch; cancellation retains uncertainty marker; a missing owner consumer cannot reset an uncertain receipt; forged reserved markers rejected before creating a batch; a chunk invokes one batch dedup lookup and skips persisted rows.
- **Outstanding P0:** owner-transactional inbox/receipt, safe operator reconciliation/release flow and canonical mutation idempotency for any future side-effectful consumers remain unimplemented. **Do not close Section 05** or claim production readiness from this batch. Live DB race/lease/provider/E2E tests remain POST-28, per the streamlined plan.

---

## Batch 1 — identifiers, worker fencing, accounting and atomic source dedup (2026-10-09)

### Implemented source fixes

- **IMP-P0-001 (IDs):** new `ImportBatch` and `ImportRecord` identities now use the full UUID v4 (including staged and bulk-created records); all historical IDs remain unchanged/readable, with no backfill.
- **IMP-P0-003/004 (partially addressed):** `processClaimedBatch` now renews/verifies the database lease before each record-side effect, after potentially long domain handoff, before page stats and before final checkpoint. When pause/cancel revokes the lease, the former worker fails closed and cannot proceed to a second handoff or acknowledge the first under an invalid claim. Unit-level cancellation/pause regressions are added. **Important limit:** an already-inflight owner call may finish after cancellation, so a durable owner inbox/idempotency contract is still required. The queue's cancellation state itself is not yet fully converted to cooperative `CANCELLING`.
- **IMP-P0-002 (atomic dedup):** `PrismaImportRepository.bulkCreateRecords` now acquires deterministic, sorted PostgreSQL **transaction-scoped advisory locks** on source identities, reads existing imported records while holding the same locks, and inserts only accepted records before committing. Keys are compared fully after locking (hash collisions merely serialize). A keyed single-record write delegates to the same guarded bulk path rather than bypassing it. The in-memory repository implements bounded single-process dedup only for development. Source tests exercise two colliding batches under an emulated serialized transaction. **Actual Postgres contention remains POST-28**; direct bypass writes by other integrations require separate source review.
- **IMP-P0/P1 progress:** staged/persisted rows determine the batch total for worker progress; incoming total, staged count and skipped duplicate count are reported separately. Post-lock accepted record IDs are returned to the use case so concurrent rejected rows are not reported as successful or counted as worker work. Structurally valid records awaiting owner integration remain structurally accepted, not misreported as validation failures.
- The new `.github/workflows/import-section-05-source.yml` runs TypeScript/source quality, focused import identity, dedup, lease and SSRF regressions, plus preexisting audit coverage. It does not contact real PostgreSQL or an external source.

### Boundaries and unresolved work

1. **IMP-P0-005** owner-consumer durable handoff receipt/inbox/idempotency before canonical side effects: still open. A crash after owner acceptance but before import ack may replay the same envelope. P6 must never directly publish or perform a semantic merge.
2. **IMP-P0-003** full cooperative pause/cancel state acknowledgement remains open; lease fencing above narrows the window but cannot undo already-inflight work.
3. **IMP-P1** large import and streaming integration, atomic error/DLQ evidence, compact checkpoints, N+1 lookup, retention, source-control-plane permissions, source classification/compliance, API contract/capabilities and Admin UX remain for later source-fix batches under the Section 05 plan.
4. **Post-28 runtime verification:** genuine PostgreSQL lock contention/cross-process races, lease expiry under slow real owner dispatch, checkpoint recovery, provider/network integrations, database preflight/migrations where required, load, E2E, staging/Google Studio and production readiness. NO production GO is implied.

### Verification ledger

- First focused source CI run: [37971218068](https://github.com/wegdangamil2022-oss/MANARATAK-First-/actions/runs/37971218068) **SUCCESS**, 65 focused tests over 9 files, TypeScript, source quality and existing audit coverage PASS.
- Subsequent intermediate CI failures revealed a direct-record TypeScript nullability mismatch and an incorrect test assumption that a structurally valid record awaiting owner integration should count as failed. Both were corrected in later source commits. Only a **final green source CI at the final code commit** can be cited for the new atomic dedup and counters. Until that verification is observed the section remains IN PROGRESS.
- No deployment, merge, database mutation, migration application or production runtime test has been performed.
