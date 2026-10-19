# ABSHEER Durable Background Worker Runtime

**Authority:** ADR-029 / ABSH-AUD-0007 / ABSH-AUD-0068

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

## B09 host authority and inventory — 2026-10-15

Source-verified host: the persistent Node process started by `apps/api/src/server.ts`
(`npm run start --workspace @absheer/api` after the existing build). The same process
owns HTTP and worker shutdown. `RegisterRecurringJobs.ts` is the sole definition
registration entry; `PollingWorkerRuntime.ts` is the sole interval scheduler. Flags
remain opt-in. No request handler starts workers. The unused older bootstrapper was
removed after checking all callers and preserving every delivery route.

This is a supported **source topology**, not evidence of an active deployment.
No persistent worker host or authenticated external cron deployment was provisioned
or observed here. A serverless HTTP deployment must keep request handling separate
from worker startup; enabling flags alone does not establish a scheduler. Before
using serverless HTTP with a separate persistent worker, provide a deployment entry,
resource lifecycle, shared database/Redis environment and matching revision/origin
namespace, then verify them in isolation. Do not add per-request `setInterval` calls
or expose an unauthenticated cron endpoint.

| Route / owner | Cadence (default) | Lease / retry / terminal handling |
|---|---|---|
| Certificate completion, expiry, artifact delivery/recovery | `CERTIFICATE_COMPLETION_WORKER_INTERVAL_MS` (5s) | Completion/artifact outbox: 30s claim, renewal at claim/3, 8 attempts, 1s→60s exponential backoff, exhausted outbox parking. Expiry/recovery use owner methods, not a new generic queue. |
| Student identity → role → catchup → learning → certificates → replay → reminders → tracker owners | `STUDENT_WORKSPACE_OUTBOX_WORKER_INTERVAL_MS` (2s), same order | Dispatch paths: 60s claim, renewal at claim/3, 8 attempts, 1s→120s exponential backoff and parking. Replay/tracker reconciliation retain owner-specific recovery, not independent leases/DLQ. |
| Settings → career → services delivery | `OWNER_DOMAIN_OUTBOX_WORKER_INTERVAL_MS` (2s) | Domain-filtered outbox, 60s claim, renewal at claim/3, 8 attempts, 1s→120s exponential backoff and parking. |
| Durable jobs below | `BACKGROUND_WORKER_INTERVAL_MS` (2s), batch 10 | Claim 60s, heartbeat 15s by default; stable job reference, fenced completion/failure, 5 attempts per recurring definition, exponential retry, `BackgroundJobDeadLetterRecord`. |

Production values must be explicit according to the existing config validator.
Do not treat defaults here as deployment configuration or assume every owner
maintenance operation has an independent distributed lock. Delivery remains
at-least-once; external effects require owner/provider idempotency.

All recurring definitions retain their stable references and existing enable flags:

| Stable reference (`system.` prefix) | UTC cron default / source |
|---|---|
| `assets.lifecycle-recovery` | `*/5 * * * *`, lifecycle flag |
| `audit.alerts` | `* * * * *`, audit flag |
| `assets.activation-recovery` | explicit `ASSET_ACTIVATION_RECOVERY_CRON`, activation flag |
| `retention.sweep` | `BACKGROUND_RETENTION_CRON` / `15 2 * * *` |
| `cms.scheduled-publishing` | `BACKGROUND_CMS_CRON` / `* * * * *` |
| `import.queue-sweep` | `BACKGROUND_IMPORT_CRON` / `* * * * *` |
| `ai.async-sweep` | `BACKGROUND_AI_CRON` / `* * * * *` |
| `finance.reconciliation` | `BACKGROUND_FINANCE_RECONCILIATION_CRON` / `*/5 * * * *` |
| `careers.maintenance` | `*/5 * * * *`, careers flag |
| `services.maintenance` | `*/5 * * * *`, services flag |
| `notification.delivery` | `BACKGROUND_NOTIFICATION_CRON` / `* * * * *` |

Registration uses the existing `ensureRecurringJob` stable-reference upsert; it does
not deliver notifications or perform the business action. All definitions are
registered only with durable workers enabled. Existing rows are not automatically
cancelled by turning a definition flag off; use the governed job cancellation
operation when that is intended, and inspect queue state before restart.

## B09 operations and rollback

The deployment operator owns the persistent Node process and termination grace.
For SIGTERM/SIGINT the existing server budget is 15 seconds: stop intervals and new
claims, await current iterations (including pending claim requests), then flush
telemetry and close resources. If the budget expires, the existing forced cleanup
and nonzero exit apply. Handlers must honor abort and provider idempotency; a timer
or promise alone cannot cancel an external side effect. Set the host termination
grace above the application budget and verify long-running jobs reclaim safely.

Monitor `worker.iterations`, `worker.iterations.completed`, `worker.iterations.failed`,
`worker.iteration.duration_ms` tagged by route, plus durable queue in-flight,
completed/failed/lease-lost totals, oldest-due age and DLQ size. Investigate a
sustained oldest-due increase, missing fresh observation, repeated lease loss or
any new DLQ record; do not silently replay failed provider actions.

HTTP liveness alone never proves worker health. Polling/background health requires
fresh Redis observations from worker activity and shared deployment namespace;
health reads do not write evidence. Absent, stale or unavailable observations keep
worker capability `RUNTIME_PENDING` even if HTTP is responding. Node-local STOPPED
can coexist with a healthy remote worker only when fresh cluster evidence exists.

Rollback: stop the replacement host and wait for drain/lease expiry before starting
the previous version with the same durable queue. Never run old and replacement
versions as an uncontrolled rollout or clear tokens/DLQ to make health green.
No historical migrations or queue data were changed by B09. Target-host shutdown,
Redis observation propagation, disposable-DB claim contention and provider effects
remain runtime acceptance tasks; local adapter substitutes do not certify them.
