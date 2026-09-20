# WP1-F Transactional Outbox Source Design

> **Operational supersession notice (2026-09-06):** Any instruction in this historical remediation artifact that requires an “Original Development Database”, a Google Studio recovery gate, or `WP1_RECOVERY_GATE` is superseded by [`docs/operations/GREENFIELD_DATABASE_PROVISIONING.md`](../../operations/GREENFIELD_DATABASE_PROVISIONING.md). This file remains historical/evidence context and is not current database-operation authority.

> Current implementation note (2026-08-13): this document's design-only baseline is retained as historical evidence. Current source includes the additive Prisma model and reviewed forward/rollback migration, transaction-only Prisma store, atomic unit of work, durable dispatcher state/retry behavior, and active adoption by Reference Data, International Tests, Majors, Universities, Scholarships, Role creation, and Role assignment. Current status is `SOURCE_IMPLEMENTED / DATABASE_RECOVERY_AND_RUNTIME_PROOF_PENDING`.

## Current-State Audit

Status: `TRANSACTIONAL OUTBOX DESIGNED — IMPLEMENTATION BLOCKED BY EXTERNAL DATABASE RECOVERY GATE`

The active Event Foundation uses `InMemoryEnterpriseEventRepository` and `InMemoryEventPublishingGateway`. `ManageEnterpriseEventsUseCase.publish` changes the event state, publishes synchronously, and then saves the event. There is no outbox model in the current Prisma schema, no durable outbox repository, no dispatcher, and no shared persistence transaction. The current path is development-only and does not provide transactional delivery.

No production-ready Outbox capability is registered. Runtime capability is `NOT_IMPLEMENTED / DB_CLOSURE_REQUIRED`.

## Canonical Contract

The source contract is exported from `packages/domain/src/event-foundation/outbox/TransactionalOutbox.ts`. An entry has a caller-supplied stable ID, event type, domain, optional aggregate identity, payload, metadata, optional correlation and causation IDs, creation and availability timestamps, processing state, attempts, optional processed time, and a sanitized failure.

Allowed states are `PENDING`, `PROCESSING`, `PROCESSED`, and `FAILED`. Producers must create entries as `PENDING` with zero attempts. Secret values, credential URLs, tokens, headers, cookies, and raw stack traces must never be stored in payload metadata or `lastError`.

## Mandatory Atomicity Rule

A business mutation and its outbox insert must commit in the same database transaction. A use case must not publish directly before or after a separate repository save and must not clear its domain events until both writes commit. Failure of either write must roll back both writes. The opaque `AtomicPersistenceContext` exists to preserve this requirement without coupling Domain to Prisma.

This rule is not implemented or runtime-verified in the current baseline.

## Dispatcher Contract

The dispatcher processes a bounded batch. A future database store must claim rows safely so concurrent workers cannot deliver the same claim simultaneously, release or expire abandoned claims, increment attempts, and persist `PROCESSED` or a sanitized failure. Delivery uses the stable entry ID as its idempotency key. Retry delay must use bounded backoff and stop at the configured maximum attempts.

Replay tooling, a dead-letter queue, broker selection, operational dashboards, and retention policy are deferred. The contract does not claim exactly-once delivery; consumers must be idempotent under at-least-once delivery.

## Representative Adoption Targets

| Target | Current evidence | Required future boundary | Adopted now |
|---|---|---|---|
| Identity/security state changes | Identity aggregate records status and contact events | Persist Identity and Outbox entry in one transaction | NO |
| Role assignment creation/revocation | Authorization domain exposes role assignment events | Persist assignment and Outbox entry in one transaction | NO |
| International Test publication | Publication readiness is enforced at the application boundary | Persist publication and publication event atomically | NO |
| Major publication | Publication readiness guards canonical references | Persist publication and publication event atomically | NO |
| Import commit/promotion | A committed import may become an integration event source | Persist committed result and Outbox entries atomically | NO |

These are adoption candidates, not claims that every listed operation currently emits a durable integration event. Event names and payload ownership remain with each domain.

## Audit Atomicity Closure Plan

Critical mutation audit records currently use a separate persistence call and therefore are not proven atomic with the business mutation. During database closure, each critical audited use case must identify one unit-of-work boundary, write business state, mandatory audit record, and any Outbox entry within it, and prove rollback behavior. Request-level best-effort audit remains telemetry and must not be represented as a transactional guarantee.

## Temporary Deviation

Status: `TRANSACTIONAL OUTBOX DESIGNED — IMPLEMENTATION BLOCKED BY EXTERNAL DATABASE RECOVERY GATE`

Reason: the original development database is available only in the external Google Studio runtime, while local database access and mutations remain prohibited.

Risk: direct/in-memory event delivery can be lost on process failure and cannot prove atomicity with persisted business state.

Owner: Foundation/Event Platform with the owning domain and Database Operations for each adoption.

Closure condition: capture the required database recovery evidence first, approve the schema change and rollback, implement the model and migration, persist business state plus Outbox in one transaction, wire a real dispatcher, and pass database-backed concurrency, retry, idempotency, and rollback tests.

No database work may begin before the backup and recovery gate is closed. This document records a design contract only and does not classify Outbox as implemented.
