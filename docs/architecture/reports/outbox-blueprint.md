# MANARATAK 2.0
# P0-4 Transactional Outbox Strategy
# Phase 2 — Enterprise Transactional Outbox Blueprint

## 1. Executive Summary
The Enterprise Transactional Outbox Blueprint establishes the canonical architecture for guaranteed, consistent event publishing across MANARATAK 2.0. By decoupling database state mutations from message broker dispatching, this blueprint systematically eliminates the "Dual-Write Problem" identified during Phase 1. The Transactional Outbox is designed as a foundational Enterprise Capability—owned by no single domain—ensuring strict Domain-Driven Design (DDD) isolation while providing at-least-once delivery, retry resilience, and asynchronous dispatching for all enterprise events.

## 2. Enterprise Outbox Blueprint
The Outbox architecture introduces a reliable intermediary between domain state changes and enterprise event broadcasting. 
- **Decoupled Dispatch**: Business transactions and event publications are no longer synchronously bound.
- **ACID Guarantees**: Domain events are serialized and written to an `OutboxMessages` table within the exact same database transaction as the business entity mutation.
- **Asynchronous Relay**: A dedicated, independent background dispatcher (the Outbox Relay) polls or tails the outbox table to publish messages to the external Message Broker (e.g., Kafka, RabbitMQ, or Azure Service Bus).
- **At-Least-Once Delivery**: The relay continuously attempts to publish until a successful acknowledgment is received from the broker.
- **Idempotency Mandate**: Because the relay guarantees *at-least-once* delivery, all downstream consumers must implement idempotent processing to handle potential duplicate messages safely.
- **Ordering Strategy**: Messages are published chronologically based on their sequence or timestamp within the context of a specific Aggregate Root.

## 3. Component Catalog
- **OutboxMessage Entity**: The durable database representation of an event. Contains `MessageId`, `AggregateId`, `MessageType`, `Payload` (JSON), `OccurredAtUtc`, `ProcessedAtUtc`, and `Error`.
- **Domain Event Interceptor**: An infrastructure component (e.g., EF Core Interceptor) that intercepts `SaveChanges`, extracts `IEnterpriseDomainEvent` instances from Aggregate Roots, and converts them into `OutboxMessage` records before commit.
- **Outbox Dispatcher (Relay)**: A background service (e.g., hosted service or Quartz.NET job) responsible for sweeping unprocessed messages and publishing them.
- **Retry & Resilience Policy**: Configuration detailing backoff intervals and retry limits for transient broker failures.
- **Poison Message Handler**: A component within the Dispatcher that detects messages exceeding max retry counts and moves them to a Dead Letter Queue (DLQ) or marks them as failed to prevent queue blocking.
- **Outbox Cleanup Service**: A scheduled background job that periodically purges or archives successfully processed messages to prevent table bloat.

## 4. Message Lifecycle
The canonical lifecycle of an enterprise event under the new blueprint is strictly sequenced:
1. **Business Action**: A user or system triggers a command (e.g., `PublishCourseCommand`).
2. **Domain Event Creation**: The Domain Aggregate mutates state and creates a domain event (e.g., `CoursePublished`).
3. **Database Transaction**: The Application Layer initiates a database transaction.
4. **Outbox Persistence**: The infrastructure layer intercepts the transaction, serializing the event into the `OutboxMessages` table.
5. **Commit**: The database transaction commits. Business state and the Outbox Message are saved atomically.
6. **Dispatcher Pickup**: The asynchronous Outbox Dispatcher reads the unprocessed message from the database.
7. **Event Publication**: The Dispatcher forwards the payload to the Enterprise Message Broker.
8. **Acknowledgement**: The Message Broker acknowledges receipt. The Dispatcher marks the `OutboxMessage` as `ProcessedAtUtc`.
9. **Completion**: The message reaches its final state and is eligible for eventual cleanup.

## 5. Integration Blueprint
The Transactional Outbox acts as the reliable circulatory system for the enterprise, integrating seamlessly with:
- **Search Indexing**: Guarantees that catalog state changes eventually reflect in the elastic search indexes without race conditions.
- **Workflow & Background Workers**: Reliably triggers multi-step sagas (e.g., Course Approval workflows).
- **Notification Framework**: Ensures student/instructor notifications are never dropped due to SMTP or broker timeouts during the initial request.
- **Import & Translation Frameworks**: Safely broadcasts ingestion completion events to trigger downstream localization without blocking the ingestion pipeline.
- **Analytics & AI**: Provides a consistent, ordered stream of state changes for data lakes and AI vector embedding updates.
- **Audit Logging**: Ensures immutable audit trails are reliably delivered to the central logging sink.
- **Scheduler**: Integrates with distributed schedulers to handle time-delayed outbox dispatching or cleanup sweeps.

## 6. Governance Rules
- **Ownership**: Integration Architecture (design and contracts) & Core Infrastructure (dispatcher implementation).
- **Canonical Location**: Interfaces and message envelopes reside in `Enterprise.Shared.Contracts`. Dispatcher and interceptor implementations reside in `Enterprise.Core.Infrastructure`.
- **Dependencies**: The Outbox infrastructure must depend on `Enterprise.Shared.Contracts`. Domains MUST NOT depend on the Outbox infrastructure; they only yield standard domain events.
- **Extension Rules**: Domains may define custom event payloads extending `IEnterpriseDomainEvent`, but the wrapper `OutboxMessage` schema is immutable.
- **Compatibility Rules**: Event payloads must remain backward-compatible (JSON serializable) to support delayed dispatching during zero-downtime deployments.
- **Migration Principles**: Existing in-memory publishers will be seamlessly replaced via dependency injection overriding at the Application Layer; core domain code remains completely untouched.

## 7. Risk Analysis
- **Table Bloat**: High volume events can rapidly expand the outbox table affecting database performance. *Mitigation*: Aggressive, scheduled cleanup of processed records.
- **Polling Latency**: Database polling can introduce latency between business action and event publication. *Mitigation*: Use transaction log tailing (Change Data Capture - CDC) or tuned polling intervals based on load.
- **Poison Messages**: A malformed message failing repeatedly could block the dispatcher. *Mitigation*: Implement strict retry limits and automated routing to a Dead Letter Queue (DLQ).
- **Idempotency Failures**: Downstream systems failing to handle duplicate events. *Mitigation*: Enforce idempotency keys (using `MessageId`) on all consumer handlers.

## 8. Recommendations
- Implement the Outbox Dispatcher as an independent, horizontally scalable worker process, physically separated from the main API nodes to prevent resource contention.
- Mandate the use of standard JSON serialization for all event payloads to ensure cross-service compatibility.
- Expose Prometheus/Grafana metrics from the Dispatcher to monitor "Outbox Lag" (time between event creation and broker ACK).

GO to Phase 2 Architecture Review Board Validation
