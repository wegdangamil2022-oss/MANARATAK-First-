# ADR-029: PostgreSQL Durable Background Worker Foundation

## 1. ADR Metadata

- **ADR ID:** ADR-029
- **Title:** PostgreSQL Durable Background Worker Foundation
- **Status:** Accepted
- **Date:** 2026-09-06
- **Decision Owner:** MANARATAK Architecture / Platform Workers
- **Remediation Authority:** MNT-AUD-0007, MNT-AUD-0068
- **Related persistence authority:** ADR-028

## 2. Decision

MANARATAK adopts a PostgreSQL-backed durable background-job queue as the canonical cross-cutting worker foundation for the modular monolith. This decision **supersedes only the BullMQ-specific task-queue line in ADR-025**. Redis remains part of the approved stack for capabilities that explicitly require it; BullMQ may be introduced later only through a new ADR for a demonstrated workload that benefits from a separate Redis queue authority.

The canonical worker foundation owns job execution lifecycle. HTTP/operator control planes may enqueue, schedule, inspect and cancel jobs, but they may not directly mark a job started, completed or failed.

## 3. Required Semantics

The durable queue must provide all of the following:

- PostgreSQL persistence for job state, execution evidence and dead-letter evidence.
- Atomic multi-worker claiming using `FOR UPDATE SKIP LOCKED`.
- A fresh opaque lease token on every claim in addition to worker identity.
- Compare-and-set terminal transitions requiring job reference, worker ID, lease token and an unexpired lease.
- Heartbeat/lease renewal during execution; a stale worker has no authority to complete or fail a reclaimed job.
- Reclaim of abandoned `STARTED` jobs after lease expiry.
- Bounded retry policy with backoff and durable DLQ parking after exhaustion.
- Execution timeout with `AbortSignal`; handlers must cooperate with cancellation when possible.
- Handler registry keyed by governed job type. Unknown handlers fail through the normal retry/DLQ path.
- Stable per-job idempotency key supplied to handlers. Side-effecting handlers remain responsible for durable effect idempotency because worker delivery is at-least-once.
- UTC cron calculation for scheduled recurring work. A successful recurring cycle resets its retry attempt budget before the next cycle.
- Graceful drain on server shutdown and readiness/health evidence for durable persistence, worker enablement, queue queryability and runtime state.

## 4. First Production Handler

`platform.retention.sweep` is the first canonical handler. It invokes the W2 retention policy engine and owner-specific Import/Audit/Asset retention gateways. It is registered idempotently at server startup using a stable job reference and a configured cron expression.

## 5. Transactional Outbox Alignment

The transactional outbox uses the same fencing rule. Outbox claims receive an opaque claim token, leases are renewed during delivery, expired `PROCESSING` rows are reclaimable, and terminal state updates are ownership-aware compare-and-set operations. Consumer inbox/idempotency remains mandatory where business effects require exactly-once-effect semantics.

## 6. Consequences

### Positive

- One durable relational authority for job scheduling, lease state, execution evidence and DLQ evidence.
- No second queue datastore is required merely to satisfy a historical technology label.
- Worker claims can share the same PostgreSQL operational model and backup/recovery governance already selected by ADR-028.
- Horizontal workers are protected from stale-owner terminal state corruption.

### Trade-offs

- PostgreSQL is now used for queue contention; queue indexes, batch size and polling cadence must be monitored under production load.
- Delivery remains at-least-once. Timeout or process death can occur after an external side effect and before durable completion, so handlers that call external systems require provider idempotency keys or durable inbox/effect ledgers.
- High-volume workloads may justify a specialized broker later, but that is an explicit future architecture decision rather than an implicit dependency.

## 7. Runtime Evidence Boundary

Source closure proves contracts, migrations, composition, source tests and fail-closed runtime configuration. PostgreSQL concurrency, migration replay, crash/reclaim behavior and multi-process lease evidence must be executed against an approved disposable PostgreSQL target before runtime closure. Until that evidence exists, the relevant status is `DB_RUNTIME_PENDING`, not production-closed.
