# MANARATAK Durable Background Worker Runtime

**Authority:** ADR-029 / MNT-AUD-0007 / MNT-AUD-0068

## Production contract

The worker is enabled only when `BACKGROUND_WORKER_ENABLED=true`. Production/staging configuration also requires an explicit polling interval, batch size, lease duration, heartbeat interval and retention cron. The heartbeat interval must be shorter than the lease.

The server starts no business transition timer. Its interval only invokes `DurableBackgroundWorker.runOnce()`, which claims durable rows from PostgreSQL. Job `start`, `complete` and `fail` transitions are worker-owned; operator HTTP routes are limited to enqueue/status/cancel.

## Lease and concurrency

Each claim writes `leasedBy`, a fresh `leaseToken`, `leaseUntil` and an execution-evidence row. Claims use `FOR UPDATE SKIP LOCKED`. Heartbeats and terminal mutations use ownership-aware compare-and-set conditions. Expired claims may be reclaimed. The old lease token cannot mutate the reclaimed row.

The transactional outbox follows the same fencing model: fresh claim token, lease renewal, expired `PROCESSING` recovery and owner-aware terminal writes.

## Retry, timeout and DLQ

Failures are sanitized before persistence. Retry scheduling uses bounded backoff. Exhausted jobs are parked in `BackgroundJobDeadLetterRecord`. A handler timeout aborts the execution context and flows through retry/DLQ policy. Because delivery is at-least-once, handlers that perform external side effects must use the supplied stable idempotency key or a durable provider/inbox mechanism.

## Cron

Cron expressions use five UTC fields. Recurring jobs are registered using stable job references to prevent duplicate schedules across restarts. A successful recurring run resets the attempt budget for the next cron cycle while retaining append-only execution history.

## Shutdown and readiness

Shutdown stops new polling, enters drain mode, awaits in-flight worker execution within the global shutdown budget, then closes registered runtime resources. Health/readiness checks require production-capable durable background persistence, enabled worker configuration, successful queue snapshot query and a non-stopped worker runtime state.

## Runtime closure

The source includes disposable PostgreSQL integration specifications for concurrent claim, lease expiry/reclaim and stale-worker rejection. They must be run only with the existing destructive-database safety gates against an explicitly disposable local PostgreSQL database. In environments without PostgreSQL/Docker, report `DB_RUNTIME_PENDING`; never infer runtime success from source tests.

## W3 handler and poller matrix — 2026-09-07

The PostgreSQL durable worker now owns recurring execution for these W3 sweeps: retention, CMS scheduled publishing, Phase 06 import retry/reclaim, Phase 17 AI asynchronous execution, Phase 19 finance/provider reconciliation, and notification delivery. Every durable job uses a stable recurring reference, lease fencing, bounded retries and dead-letter behavior from ADR-029.

Identity/Settings/Career/Services owner-domain outbox projection and the P13→P15 Student Workspace projection remain lightweight pollers over the same durable outbox lease/fencing contract. Their runtime state is recorded through `PollingWorkerRuntimeRegistry`; Health/Readiness exposes `state`, last start/success/failure and success lag. Certificate-completion delivery uses the same runtime-state registry and explicit production configuration.

Production/staging must explicitly enable and configure all required workers. Source verification does not certify PostgreSQL/provider behavior; disposable-DB concurrency/reclaim tests and real provider delivery remain `DB_RUNTIME_PENDING` / `PROVIDER_RUNTIME_PENDING` until executed in the target environment.
