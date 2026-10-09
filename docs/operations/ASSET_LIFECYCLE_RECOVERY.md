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
