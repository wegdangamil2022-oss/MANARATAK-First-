# MANARATAK 2.0
# P0-4 Transactional Outbox Strategy
# Phase 1 — Discovery & Architecture Assessment

## 1. Executive Summary
The Enterprise Architecture Review Board (ARB) has conducted a comprehensive discovery phase to evaluate the reliability and consistency of event publishing across MANARATAK 2.0. The assessment reveals that while the platform heavily relies on Event-Driven Architecture (EDA) to synchronize Search, Caching, Analytics, and downstream systems, the current implementation relies on direct in-process dispatching (e.g., MediatR `IPublisher`) coupled with database transactions (`SaveChangesAsync`). This approach suffers from the classic "Dual-Write Problem," introducing critical risks of phantom events, data loss, and distributed inconsistency. A standardized Transactional Outbox pattern is urgently required to guarantee at-least-once delivery and eventual consistency across the enterprise.

## 2. Current Architecture Assessment
- **Current Event Publishing:** Domain entities accumulate events internally (e.g., `_domainEvents`). During `SaveChangesAsync`, an Entity Framework interceptor or the Repository base class reads these events and publishes them via an in-process memory bus (like `IPublisher`).
- **Event Creation Lifecycle:** Events are instantiated inside the Domain layer (e.g., `TestUpdatedEvent`), attached to the Aggregate Root, and extracted right before or after the persistence commit.
- **Event Persistence Strategy:** Currently, **none exists**. Events are transient objects in memory. They are not persisted to durable storage alongside the business state.
- **Event Dispatch Strategy:** Immediate, in-line dispatching. The current process attempts to persist state to the database and publish to a message broker (or invoke cross-domain handlers) within the same logical execution flow.
- **Failure Recovery Strategy:** Non-existent for message dispatching. If the application crashes immediately after the database commit but before the message reaches the external broker, the event is permanently lost.
- **Idempotency & Ordering:** No system-wide enforcement. Handlers may be invoked multiple times in retries, but without a persistent log or sequencing mechanism, ordering guarantees are weak.

## 3. Event Lifecycle & Interactions Analysis
The reliance on in-memory dispatching directly threatens multiple enterprise systems:
- **Search Indexing:** If `CoursePublished` is lost, the Search Catalog remains permanently desynchronized from the Learning Platform.
- **Cache Invalidation:** If an update event is lost, caches will serve stale data indefinitely.
- **Analytics & AI:** Downstream analytics pipelines and AI vector embeddings will drift from the source of truth if ingestion events are dropped.
- **Audit Logging:** Audit trails become unreliable if the domain event fails to dispatch to the audit sink.
- **Workflow & Notifications:** Critical student lifecycle events (e.g., `CertificateIssued`) might fail to trigger student notification emails.

## 4. Gap Analysis
- **Missing Guarantees:** No guarantee of "At-Least-Once" delivery to the external message broker.
- **Missing Infrastructure:** No Outbox table in the database schemas. No dedicated background dispatcher (Relay) to sweep the outbox and forward messages.
- **Missing Contracts:** No standardized `OutboxMessage` entity to wrap `IEnterpriseDomainEvent` payloads.
- **Potential Data Loss Scenarios:** 
  - Application crash after DB commit but before broker ACK.
  - External Message Broker (e.g., Kafka/RabbitMQ) unavailability during the HTTP request.
- **Race Conditions:** If events are dispatched *before* the DB transaction commits, a consumer might query the database for the new state and receive old data (Read-Before-Write).
- **Duplicate Implementations:** Domains handling their own retries using localized `try/catch` blocks.

## 5. Root Cause Analysis
- **The Dual-Write Problem:** The fundamental root cause is the attempt to write to two distinct distributed systems (a relational database and a message broker) without distributed transactions (2PC). 
- **Misapplied In-Process Dispatching:** Developers confused in-process domain event dispatching (useful for updating the same aggregate/database in the same transaction) with Integration Event dispatching (publishing to external systems).
- **Missing Infrastructure Abstraction:** The Enterprise Shared Contracts lack an `IOutboxService` or similar abstraction, forcing developers to publish directly to the broker or `IPublisher` during the web request thread.

## 6. Risk Assessment
- **Distributed Data Inconsistency (Critical):** The highest risk is silent failures where the primary database reflects a state change (e.g., Enrollment Approved), but the rest of the enterprise (Search, Notifications, Billing) does not.
- **Availability Degradation (High):** Synchronously publishing to an external broker during `SaveChangesAsync` tightly couples the availability and latency of the database to the availability and latency of the message broker. If the broker is slow, HTTP requests will timeout.
- **Recovery Complexity (High):** Manual data reconciliation scripts are currently the only way to recover from dropped events, which is unscalable in an enterprise environment.

## 7. Recommendations
1. **Adopt the Transactional Outbox Pattern:** Persist events to an `OutboxMessages` table within the same ACID transaction as the business entity mutation.
2. **Implement an Outbox Relay/Dispatcher:** Introduce a background worker (e.g., Quartz.NET, Hangfire, or a custom BackgroundService) to poll the outbox and reliably publish to the message broker.
3. **Decouple Domain from Integration:** Differentiate between internal `DomainEvents` (handled in-memory within the same transaction) and `IntegrationEvents` (persisted to the Outbox for cross-domain broadcasting).
4. **Enforce Idempotency:** Ensure all downstream consumers are idempotent to handle the "At-Least-Once" delivery semantic inherent to the Outbox pattern.

GO to Phase 2 — Transactional Outbox Blueprint
