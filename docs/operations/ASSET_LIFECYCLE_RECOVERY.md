# EAP lifecycle recovery and event contract

This document implements the clarification required by remediation section 03/P1-13, P1-14 and P1-10. It records current owner behavior; it does not authorize production rollout or declare provider acceptance.

## Activation intent

`AssetRecord.activationOperation` is a typed, versioned EAP-owned operational intent, persisted in the existing `malwareScanStatus` JSON envelope beside upload/scan evidence. It is not a canonical relation, external event ledger, client metadata, or general queue. Asset identity remains the existing relational record ID; storage coordinates stay private to EAP. No schema migration/backfill is required.

Before moving bytes, the application validates all recorded scan/sanitization/upload evidence, independently re-observes the quarantine object, and CAS-persists PREPARED with operation ID, source locator and SHA-256. Failed intent persistence performs no provider move. The application rehydrates the saved intent before proceeding.

The provider promotion must be digest-fenced and durably idempotent by source locator + digest. A retry of a PREPARED operation may find that the original source no longer exists; it repeats the same promotion operation and expects the provider's original verified CLEAN result. It must not allocate a new object or accept a different digest. HTTP adapters retain the same semantic provider idempotency key. Existing CLEAN local-development bytes are rehashed before retry acceptance; sanitized path keys now move to a separate clean path.

ACTIVE and COMPLETED are written together by the existing revision/state CAS. If a competing retry committed the same operation, a losing writer only accepts the already-persisted matching ACTIVE object. It never deletes or archives another successful retry's object. A genuine DB failure leaves persisted PREPARED and delivery denied. The management activation command is the bounded/manual recovery entry point. Soft deletion, mutation of scan evidence and sanitizer completion are blocked while the intent is pending; stale pre-intent commands also lose the revision CAS.

This is a durable activation intent and retry path, **not** an automatic scheduled reconciler or an atomic provider/DB transaction. Provider idempotency expiry, immutable version fencing, stalled operations, operational monitoring, sandbox fault injection and cross-process durability still need runtime evidence. Local adapter is development-only and is not a claim of atomic object-store security.

Deployment must drain older EAP mutator replicas before enabling this journal behavior: earlier versions do not retain/enforce the new operational envelope. No mixed-version rolling-deployment safety is asserted. Historical pre-journal split-brain records still need operator/provider investigation; this change does not infer or backfill a lost promotion result.

## Retention restoration

Archive/soft-delete preserve the original PERMANENT/TEMPORARY category and explicit expiry in a typed `retentionBeforeLifecycle` snapshot within the existing EAP-owned metadata envelope. Restore keeps that category and expiry, rather than replacing TEMPORARY with PERMANENT. An expired/invalid policy, TEMPORARY without expiry, or a historical deleted record with no trustworthy original policy fails closed before storage restoration. No dates or durations are inferred and no historical data is backfilled.

A legacy asset whose policy is unknown needs an owner-reviewed retention decision before restoration can be enabled. This document does not authorize rewriting historical policies or automatic retention sweeps. The archive retry and purge tombstone/worker paths continue to use their existing contracts; the generic terminal-SKIPPED governance issue remains separate.

## Current event contract

The AssetRecord event classes are **local, non-dispatched transition artifacts**, not published integration contracts. Source search found definitions/exports/aggregate generation and tests, but no EAP application/infrastructure consumer or dispatch/outbox call for these classes. `getUncommittedEvents()` does not publish anything. HTTP business audit is a separate mechanism and is not an outbox substitute.

Consumers must not rely on these events for notifications, publication, billing, processing jobs, or usage-registry consistency. No dispatch or notification was added in this change. If a consumer requires lifecycle integration events, the EAP owner must define versioned envelopes and persist them transactionally with the state transition through the platform outbox, with consumer idempotency and acceptance tests. That is a separate implementation gate; the existing local artifacts must never be advertised as delivered production events.

## Persisted version-history compatibility

The EAP repository now reconstructs the existing serialized domain `{versions:[...]}` shape, preserving original version numbers, dates, locators and checksums through subsequent lifecycle saves. The previous rehydration path discarded history and could write null on the next mutation. Empty/null history stays empty; malformed, duplicate-number, unsupported or invalid-date history rejects rehydration with a safe service-unavailable error before external side effects. No historical shapes or dates are guessed and no backfill is performed.

Admin receives only version numbers, dates and checksums. Historical locators and changelog data are not delivery grants and are not exposed by the view. Provider-native version creation, downloads or restore-to-old-version are not implemented by this read-only fix. Drain old mutator replicas when rolling out: earlier repository code can still discard history. Existing retention/legal-hold policy and owner authorization are unchanged. New transition timestamps populate existing columns only on observed future transitions, not historical rows.

## Restore compensation ownership check

Restore requires a repository-owned, live lease before provider restoration. If an attempted restore later fails, the application rechecks the exact token, DELETED state and unexpired deadline before compensating with provider archive. A lost lease, competing ACTIVE commit, or unavailable DB means no compensation/archive and no lease release from this stale attempt; the safe HTTP response is ASSET_RESTORE_RECOVERY_REQUIRED. This protects known lost-ownership/competing-commit cases instead of blindly archiving another restore's object.

The check is not atomic with the external archive call: provider object-version fencing and lease heartbeat/renewal are still required to eliminate expiry during an in-flight provider operation. It is not a durable compensation journal or automatic reconciliation worker. Operators must investigate unknown outcomes in the approved sandbox; no provider action or policy backfill is authorized here.

## Opt-in durable activation recovery job

`assets.activation.recovery` is now registered in the existing BackgroundJobHandlerRegistry and durable worker, with a bounded EAP repository discovery read. It selects SANITIZING records whose existing activation intent is PREPARED and whose updatedAt is older than the cutoff. It returns only asset/operation identities, rehydrates each candidate, and skips completed/deleted/changed intents. It delegates to the existing digest-bound activation retry rather than constructing a new operation or bypassing any lifecycle/security gates.

The feature is disabled by default. Optional configuration keys are `ASSET_ACTIVATION_RECOVERY_ENABLED` and `ASSET_ACTIVATION_RECOVERY_CRON`. Enabling requires `BACKGROUND_WORKER_ENABLED=true` and an explicit UTC cron schedule. Bootstrap then uses the existing ensureRecurringJob path with stable reference `system.assets.activation-recovery`, owner `assets:activation-recovery`, payload `{limit:25, minimumAgeSeconds:300}`, 300-second timeout, five attempts and exponential backoff. This is an operational retry delay, not an invented retention/deletion policy. No runtime environment variables or secrets were edited and no bootstrap/job execution against a real DB/provider was performed here.

The handler also checks enablement during execution, so a previously persisted job cannot continue recovery after the feature is disabled. It fails with a safe disabled error; existing worker retry/DLQ behavior applies. Disabling does not silently delete an existing recurring job. Runtime operators must pause/remove the schedule through existing job controls as appropriate; this source change performs no such write.

Payload allows only limit (1–100) and minimumAgeSeconds (60–86400). Cancellation is checked before discovery and each operation; it cannot revoke an already in-flight provider request. Existing durable worker provides job claims, heartbeats, backoff, completion fencing and operational counters. It does not provide object-version fencing or an asset-operation lease. Provider durable idempotency/immutable object acceptance must be verified before enablement.

Each recovery attempt records a system-owned Audit INTENT before the lifecycle call and a SUCCESS/FAILURE outcome afterward via the existing audited-record factory/retention resolver. No retention duration is guessed; no provider error, locator or student metadata is recorded. Intent-audit failure stops before provider work. Outcome-audit failure after committed ACTIVE fails the job; automatic audit-receipt reconciliation is not implemented, and state+audit are not atomic. Raw DB/audit errors are converted to a safe job code. Partial operation failures fail the durable job for its existing retry/DLQ policy; poison candidates can require operator investigation and do not imply complete fleet recovery.

This is wired source functionality, not runtime activation or proof of production readiness. Retention/purge, restoration-compensation reconciliation, consumer-insertion serialization and provider-sandbox gates remain separate.


## Canonical reference serialization rollout

Migration `20261009010000_eap_asset_reference_serialization` enforces linking versus lifecycle at existing canonical owner tables. It creates functions/triggers only; it does not migrate data, create an alternative registry or infer retention/security policy. Linked assets cannot leave ACTIVE, change identity or be physically deleted. Newly added references require an existing ACTIVE asset and hold FOR SHARE until owner commit. Ordered reference locks reduce multi-asset deadlocks; a detected DB deadlock aborts the transaction and never authorizes a provider side effect. Application owner authorization and full Domain proof checks still apply.

Lifecycle dependency reads must use READ COMMITTED after the conflicting tuple lock. Other isolation levels reject destructive state/identity changes; never downgrade an existing owner transaction or retry a failed external effect blindly. A retry of the whole owner request must obey that owner's idempotency contract. Existing references are not repaired or removed. Unrelated owner edits/removal remain allowed.

Prepare reviewed schema SQL and roll out while all old API/workers are drained. Apply through the normal migration process in the target database only with separate deployment authorization; none is applied by this work or by startup. Bootstrap checks guard catalog metadata and fails closed if absent/disabled/misbound; readiness checks again. Application DB roles must not disable triggers, change session_replication_role or bypass the constraints. This catalog check does not cryptographically verify function bodies; migration integrity and DB privilege separation remain operational obligations.

Only `scripts/ci/install-eap-reference-guards.mjs` applies the exact checked-in SQL to the guarded disposable GitHub Actions service. `db push` alone does not install these guards. The installer is not a production/bootstrap utility. Provider runtime verification is deferred by the user, not passed. Provider fencing/heartbeat and durable restoration compensation remain separately tracked.


## Durable restore barrier and uncertain outcomes

Apply reviewed schema `20261009020000_eap_restore_operation_barrier` only through the authorized target migration rollout. Source startup checks its trigger as well as canonical reference guards; `db push` alone remains insufficient. No target migration was performed here. Drain API/workers and establish provider quiescence for legacy already in-flight operations before rollout.

A PREPARED intent plus owned lease precedes a persisted RESTORING boundary and the first provider call. Restore verifies bytes, renews its exact durable ownership and commits ACTIVE/COMPLETED with lease removal. Lease expiry alone cannot transfer ownership while a restore intent remains pending. A pre-provider intent can become CANCELLED; a started/uncertain operation cannot cancel, purge or automatically compensate. Timeout, digest mismatch and failed state commit preserve a recovery hold, including when failure-journal update itself fails. The earlier automatic-compensation descriptions above are historical and superseded for this path.

The Admin recovery queue shows safe phase/timestamps and blocks lifecycle actions; actual owner/API/DB checks remain authoritative. Retention omits pending restore intents and database constraints reject bypassed claim replacement. Do not remove the operation JSON/claim, disable triggers or send an archive/restore retry merely because the lease time has elapsed. A pending provider request may still be executing. Recovery must first obtain an authoritative completion/quiescence proof or immutable operation/version fencing from the provider and then use a separately reviewed conditional repair. No such repair endpoint or automatic reconciliation is implemented by this batch.

This barrier protects new restore operations from their own lease/compensation race and preserves inaccessible state after uncertain outcomes. It does not retroactively fence legacy archive/provider operations already in flight, deliver integration events or prove actual provider guarantees. Provider verification remains DEFERRED_BY_USER; whole-section release gates remain open.


## Durable archive barrier and restore ordering

Schema `20261009030000_eap_archive_operation_barrier` guards pending archive intents in the existing operational JSON. Source archive commits ARCHIVED/RUNNING before calling storage; one origin context performs that call and conditionally acknowledges COMPLETED. Other archive/delete/restore attempts are blocked meanwhile, including retention takeover after expiry and raw lifecycle writes. Archive/restore journals are preserved across each other's writes. A completed archive response can repeat without another provider effect.

An uncertain archive result is not proof that no provider request remains running. It becomes a recovery hold and cannot automatically retry, delete or restore. Legacy ARCHIVED records without an operation also cannot request another provider archive blindly. Verified/quiescent provider reconciliation plus reviewed conditional repair is required; no UI acknowledgement or elapsed time alone clears the hold. The existing archive-retry descriptions above are historical and superseded for the EAP archive path. The isolated retention adapter retry test covers orchestration only.

Target rollout requires all three reviewed EAP migrations and startup catalog checks, plus draining old processes and establishing quiescence for already in-flight legacy provider operations. Source guards cannot retroactively stop a provider request issued by an older deployment. Real provider acceptance remains deferred by the user. No real migration/provider execution, automatic cleanup, policy backfill or production GO is claimed.
