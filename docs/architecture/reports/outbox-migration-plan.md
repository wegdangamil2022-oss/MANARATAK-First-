# MANARATAK 2.0
# P0-4 Transactional Outbox Strategy
# Phase 4 — Migration & Integration Plan

## 1. Executive Summary
The Enterprise Transactional Outbox Migration & Integration Plan defines the architectural strategy for transitioning MANARATAK 2.0 from synchronous, in-process event dispatching to a resilient, asynchronous outbox model. Formulated by the Architecture Review Board (ARB), this plan prioritizes runtime stability, zero business logic disruption, and safe rollback mechanisms. By decoupling domain logic from message broker availability, the migration ensures at-least-once delivery for critical enterprise systems—including Search, Analytics, Notifications, and Workflows—while preserving strict Domain-Driven Design (DDD) autonomy.

## 2. Migration Strategy
The migration is structured into sequential, non-destructive phases:
- **Phase 1: Infrastructure Provisioning**: Deploy the new `OutboxMessages` schema to all domain databases. Deploy the Outbox Dispatcher (Relay), Cleanup Service, and DLQ infrastructure in a dormant state.
- **Phase 2: Idempotency Enforcement**: Downstream consumers (Search, Notifications, Workflows) are updated to enforce idempotency using `MessageId` or `CorrelationId` before they begin receiving outbox-relayed events.
- **Phase 3: Interceptor Cut-Over**: The Application Layer Dependency Injection container is updated to replace the legacy synchronous event dispatcher with the new `OutboxDomainEventInterceptor`. This is guarded by a feature flag for instant rollback.
- **Phase 4: Background Dispatch Activation**: The Outbox Dispatcher is activated to poll/tail the outbox tables and publish to the Enterprise Message Broker.
- **Phase 5: Legacy Deprecation**: Once telemetry confirms 100% successful outbox relay and consumer idempotency, legacy in-process dispatching logic is permanently removed.

## 3. Capability Migration Matrix

| Capability | Current Architecture | Target Architecture | Migration Priority | Dependencies | Verification Method | Rollback Method |
| --- | --- | --- | --- | --- | --- | --- |
| Domain Event Publishing | Synchronous `IPublisher` inside `SaveChanges` | `OutboxMessage` persistence via Interceptor | Critical | Shared Contracts | DB Transaction Tests | Toggle Feature Flag to legacy `IPublisher` |
| Search Indexing | In-process event handler | Asynchronous consumer via Message Broker | High | Consumer Idempotency | End-to-End Indexing Latency | Revert to direct dispatch |
| Notification Framework | Triggered via direct API/Handler | Triggered by Broker integration event | High | Consumer Idempotency | Email Delivery Metrics | Revert to direct dispatch |
| Workflow Engine | Synchronous Saga initialization | Asynchronous Saga triggering via Outbox | High | Consumer Idempotency | Saga State Consistency | Revert to direct dispatch |
| Audit Logging | Inline logging during HTTP request | Async audit sink via Broker | Medium | Broker setup | Log Completeness Audits | Revert to direct dispatch |
| Analytics & AI | Batch polling or inline sync | Streaming ingestion via Outbox Relay | Low | Consumer Idempotency | Vector DB Synchronization | Revert to direct dispatch |

## 4. Operational Rollout Plan
- **Dispatcher Rollout**: Deployed as an independent, horizontally scalable background worker suite. Initially configured with conservative polling intervals (e.g., 2 seconds) to monitor DB load.
- **Polling to CDC Migration**: High-throughput domains (e.g., Phase 13) will be evaluated post-migration for Change Data Capture (CDC) tailing (e.g., Debezium) to reduce DB polling overhead.
- **Replay Procedures**: Operations teams provided with runbooks and admin APIs to reset the status of `FAILED` or `DEAD LETTER` messages back to `PENDING` for targeted replays.
- **DLQ Operational Procedures**: Poison messages routed to DLQ will trigger P1 alerts. Runbooks define procedures for payload patching and requeuing.
- **Monitoring & Alerting Rollout**: Grafana/Prometheus dashboards established tracking: *Outbox Table Size*, *Dispatcher Lag (Creation to Publish)*, *Retry Rates*, and *DLQ Count*.

## 5. Compatibility Strategy
- **Interface Compatibility**: Core domain logic remains completely untouched. Domains continue yielding `IEnterpriseDomainEvent`. The infrastructure layer translates this to the compatible outbox payload.
- **Serialization Compatibility**: `OutboxMessage` payloads strictly enforce JSON serialization backward compatibility.
- **Dual-Read Compatibility**: During the transition, consumers must be capable of handling events originating from both the legacy direct-dispatch (if rolled back) and the new Outbox Relay interchangeably.

## 6. Governance Plan
- **Ownership Verification**: Integration Architecture ensures all domains adopt the `OutboxDomainEventInterceptor`.
- **ARB Approval Gates**: Progression between Phase 3 (Cut-Over) and Phase 5 (Legacy Deprecation) requires explicit ARB review of production telemetry.
- **Architecture Registry Updates**: The Enterprise Foundation Registry is updated to mark the Transactional Outbox capability as `Stable`.
- **Documentation Updates**: Domain playbooks updated to reflect asynchronous latency expectations for side-effects.

## 7. Risk Register
- **Risk**: Database Contention. High frequency polling may cause DB lock contention. **Mitigation**: Optimize indexes on `Pending` state; utilize SKIP LOCKED if supported; evaluate CDC.
- **Risk**: Idempotency Misses. A consumer failing to implement idempotency executes an action (e.g., sending an email) twice during a broker retry. **Mitigation**: Strict code reviews and integration tests simulating duplicate deliveries.
- **Risk**: Dispatcher Bottleneck. Single dispatcher instance fails to keep up with peak load. **Mitigation**: Horizontal scaling of dispatcher workers using partitioned locking based on `AggregateId`.

## 8. Rollback Strategy
- **Instant Rollback**: The Application Layer uses a configuration-driven feature flag to route domain events. If the Outbox mechanism fails catastrophically, the flag is flipped, immediately reverting to synchronous, in-memory dispatching.
- **Message Recovery**: Any messages trapped in the `OutboxMessages` table during a rollback will be processed by an out-of-band recovery script to ensure no events generated during the outbox window are lost.

## 9. Validation Checklist
- [ ] Infrastructure schemas mapped and approved.
- [ ] Dispatcher horizontal scaling policy verified.
- [ ] Consumer idempotency validated across all downstream systems.
- [ ] Feature flags configured for Domain Event Interceptors.
- [ ] Operational runbooks (DLQ, Replay) drafted and approved.
- [ ] Monitoring dashboards and alerts provisioned.

## 10. Readiness Assessment
The architectural migration strategy successfully bridges the gap between the legacy synchronous model and the target outbox model with zero domain logic disruption. The rollback strategies and idempotency requirements provide the necessary safety nets for enterprise deployment. The Outbox Strategy is ready for final adoption.

GO to Final Architecture Review Board Validation
