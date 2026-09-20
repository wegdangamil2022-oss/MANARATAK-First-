# MANARATAK 2.0
# P0-4 Transactional Outbox Strategy
# Phase 3 — Enterprise Transactional Outbox Specification

## 1. Executive Summary
The Enterprise Transactional Outbox Specification is the authoritative architectural reference for reliable, asynchronous event publishing across MANARATAK 2.0. Building upon the approved Phase 2 Blueprint, this specification formally defines the contracts, state machine, delivery guarantees, and operational characteristics of the Transactional Outbox. It strictly enforces the elimination of the Dual-Write Problem by mandating database-transaction-bound event persistence, asynchronous "At-Least-Once" dispatching, and compulsory downstream consumer idempotency.

## 2. Enterprise Outbox Specification
The Transactional Outbox serves as an enterprise-wide capability to ensure ultimate consistency between distributed systems without distributed transactions (2PC). 
- **Transactional Consistency:** Event metadata and payloads are serialized and persisted in the same ACID transaction as the business state mutation.
- **Dual-Write Elimination:** Applications must never publish directly to a message broker during a database transaction or HTTP request lifecycle.
- **Infrastructure & Broker Independence:** The Outbox pattern abstracts the specific message broker (Kafka, Azure Service Bus, RabbitMQ). Domain logic yields generic `IEnterpriseDomainEvent` instances; infrastructure adapts them.
- **Domain Isolation:** Domains remain entirely ignorant of the Outbox mechanism, ensuring strict DDD boundaries.

## 3. Component Catalog

### 3.1 Outbox Message
- **Responsibilities:** Durable representation of an `IEnterpriseDomainEvent`. Encapsulates Payload, AggregateId, MessageType, and State.
- **Public Contracts:** `IOutboxMessage`.
- **Ownership:** Integration Architecture.
- **Canonical Location:** `Enterprise.Shared.Contracts`.
- **Dependencies:** None.

### 3.2 Outbox Dispatcher
- **Responsibilities:** Asynchronously reads Pending messages and forwards them to the Enterprise Message Broker.
- **Public Contracts:** None (Background Worker).
- **Ownership:** Core Infrastructure.
- **Canonical Location:** `Enterprise.Core.Infrastructure`.
- **Dependencies:** `IOutboxMessage`, Message Broker SDKs.
- **Forbidden Dependencies:** Domain models or specific business logic.

### 3.3 Domain Event Interceptor
- **Responsibilities:** Intercepts DbContext `SaveChanges`, extracts domain events, and serializes them to `OutboxMessage` entities within the current transaction.
- **Ownership:** Data Architecture.
- **Canonical Location:** `Enterprise.Core.Infrastructure`.

### 3.4 Retry Policy & Dead Letter Handling
- **Responsibilities:** Manages exponential backoff for transient broker failures and routes poison messages to a Dead Letter Queue (DLQ).
- **Ownership:** Core Infrastructure.

### 3.5 Cleanup Service
- **Responsibilities:** Periodically archives or purges `Published` or `Dead Letter` messages to prevent table bloat.
- **Ownership:** Core Infrastructure.

## 4. State Machine Specification
The Outbox message lifecycle follows a strict state machine.

### 4.1 Success Path
* **PENDING**
  * **Purpose:** Initial state upon transaction commit.
  * **Entry:** Created by Domain Event Interceptor.
  * **Exit:** Picked up by Dispatcher.
  * **Allowed Transitions:** -> PROCESSING.
* **PROCESSING**
  * **Purpose:** Indicates the message is actively being dispatched.
  * **Entry:** Dispatcher locks the row/message.
  * **Exit:** Broker ACK or NACK.
  * **Allowed Transitions:** -> PUBLISHED, -> RETRYING, -> FAILED.
* **PUBLISHED**
  * **Purpose:** Terminal success state.
  * **Entry:** Successful ACK from the broker.
  * **Exit:** Swept by Cleanup Service.
  * **Allowed Transitions:** -> ARCHIVED.
* **ARCHIVED**
  * **Purpose:** Long-term storage or purged state.
  * **Entry:** Moved by Cleanup Service.

### 4.2 Failure Path
* **RETRYING**
  * **Purpose:** Temporary state for transient broker failures.
  * **Entry:** Broker NACK or timeout, retry count < max.
  * **Exit:** Next polling cycle.
  * **Allowed Transitions:** -> PROCESSING.
* **FAILED**
  * **Purpose:** Identifies messages that have exhausted retry limits.
  * **Entry:** Retry count exceeds maximum threshold.
  * **Exit:** Administrator intervention or automatic DLQ routing.
  * **Allowed Transitions:** -> DEAD LETTER, -> PENDING (Manual Requeue).
* **DEAD LETTER**
  * **Purpose:** Terminal failure state; segregated for manual analysis.
  * **Entry:** Routed from FAILED.

## 5. Delivery Guarantees
- **At-Least-Once Delivery:** The Outbox guarantees that every committed message will be handed to the broker at least once.
- **Exactly-Once is NOT Guaranteed:** Due to network partitions, broker retries, or dispatcher restarts, the same message may be published multiple times.
- **Idempotency Requirements:** ALL downstream consumers MUST be idempotent. Consumers should use the `MessageId` or `CorrelationId` to deduplicate incoming events.
- **Ordering Guarantees:** Messages are guaranteed to be published in chronological order *per Aggregate Root* (partitioned by `AggregateId`). Global total ordering is neither guaranteed nor required.

## 6. Operational Specification
- **Dispatcher Concurrency:** The dispatcher must support concurrent execution (e.g., via competing consumers or partition locking) without dispatching the same message twice simultaneously.
- **Partitioning:** Messages are partitioned logically by `AggregateId` to ensure ordered processing of entity state changes.
- **Polling Strategy vs CDC:** Polling should be the default implementation (using indexed queries on the `Pending` state). Change Data Capture (CDC) via transaction log tailing is an approved optimization if polling latency exceeds SLAs.
- **Cleanup Policy:** `Published` messages must be archived or purged after a configurable retention period (e.g., 7 days) to maintain database indexing performance.

## 7. Integration Specification
- **Search:** Events (e.g., `CoursePublished`) trigger asynchronous indexing.
- **Analytics & AI:** Provides a durable stream of state changes for vector ingestion and telemetry.
- **Audit:** Ensures all compliance-related state changes are securely forwarded to immutable audit logs.
- **Workflow Engine & Schedulers:** Initiates sagas (e.g., Course Approval, Student Graduation) without risking broken state if the workflow engine is temporarily unavailable.
- **Notification & Translation Frameworks:** Triggers emails and localization processes asynchronously, shielding the primary user request from latency.

## 8. Governance Rules
- **Architectural Owner:** Integration Architecture (Contracts), Core Infrastructure (Implementation).
- **Canonical Location:** `Enterprise.Shared.Contracts` (Interfaces), `Enterprise.Core.Infrastructure` (Implementations).
- **Compatibility Rules:** Outbox Message structures must remain strictly backward compatible for JSON serialization.
- **Extension Rules:** Custom retry policies or serialization formats can be injected via configuration, but the core State Machine is immutable.
- **Migration Rules:** Legacy in-process dispatchers must be deprecated and routed to the outbox via Dependency Injection container updates.

## 9. Risk Analysis
- **Polling Latency:** High volume systems may experience latency between commit and dispatch. *Mitigation: Implement CDC or tuned background workers.*
- **Database Bloat:** Without aggressive cleanup, the Outbox table will degrade DB performance. *Mitigation: Automated archiving/purging routines.*
- **Idempotency Failures:** Consumers failing to deduplicate events will process transactions multiple times. *Mitigation: Strict ARB governance requiring idempotency keys on all consumer handlers.*

## 10. Recommendations
- **Idempotency Libraries:** Provide an enterprise-standard consumer idempotency library (e.g., relying on Redis or a local consumer DB table) to simplify adoption for downstream teams.
- **CDC Evaluation:** For high-throughput domains (e.g., Phase 13: Learning Platform), evaluate CDC tools (like Debezium) as a drop-in replacement for polling dispatchers.
- **Alerting:** Configure severe alerting for messages residing in the `DEAD LETTER` state or `PENDING` state beyond acceptable SLA thresholds.

GO to Phase 3 Architecture Review Board Validation
