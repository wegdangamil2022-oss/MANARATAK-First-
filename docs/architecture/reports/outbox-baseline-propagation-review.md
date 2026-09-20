# MANARATAK 2.0
# Enterprise Baseline Propagation Review
# Transactional Outbox Baseline Adoption
# Architecture Consistency Assessment

## 1. Executive Summary
Following the official adoption of the Enterprise Transactional Outbox Program (P0-4) into the MANARATAK 2.0 Enterprise Architecture Baseline, the Architecture Review Board (ARB) has conducted a comprehensive consistency assessment. This review aims to identify all legacy references to direct, synchronous event publishing across Phase 07 through Phase 13 documentation. The findings indicate widespread legacy documentation that explicitly directs developers to use `IPublisher` and inline dispatching within database transactions, violating the newly adopted Outbox specification.

## 2. Overall Consistency Score
- **Phase 07:** Non-compliant.
- **Phase 08:** Non-compliant.
- **Phase 09:** Non-compliant.
- **Phase 10:** Non-compliant.
- **Phase 11:** Non-compliant.
- **Phase 12:** Partially Compliant (Implements outbox but references a local implementation rather than the enterprise baseline).
- **Phase 13:** Non-compliant.

## 3. Document-by-Document Review & Impact Analysis

### 3.1 Phase 07
- **Document:** `docs/phases/phase-07-enterprise-reference-data/phase-07-03-implementation-guide.md`
- **Section:** 7.C.6 Caching Invalidation
- **Current Behavior:** Mandates dispatching an `IReferenceEvent` to an `IEventSubscriber` which synchronously calls `ICacheInvalidator.InvalidateForEntityAsync`.
- **Required Behavior:** Must persist an `OutboxMessage` wrapping the `IReferenceEvent` within the transaction, relying on the asynchronous Relay to trigger cache invalidation.
- **Reason for Change:** Prevents dual-write problem and potential cache inconsistencies if the database commit fails.
- **Risk if Left Unchanged:** Cache desynchronization and latency coupling.
- **Priority:** Critical

### 3.2 Phase 08
- **Document:** `docs/phases/phase-08-academic-taxonomy/phase-08-03-implementation-guide.md`
- **Section:** 8.C.7 Event Integration
- **Current Behavior:** "Event publishing is orchestrated by the application layer after successful transaction commit." and "The implementation MUST consume the Core Event Bus."
- **Required Behavior:** Application layer must NOT orchestrate publishing. Domain events must be captured by interceptors and written to the Outbox within the same transaction.
- **Reason for Change:** Post-commit application-layer publishing causes permanent event loss if the application crashes before dispatch.
- **Risk if Left Unchanged:** Permanent data loss for taxonomy updates in downstream systems.
- **Priority:** Critical

### 3.3 Phase 09
- **Document:** `docs/phases/phase-09-tests-platform/phase-09-03-implementation-guide.md`
- **Section:** Implementation specifics (TestsDbContext)
- **Current Behavior:** Explicitly injects `IPublisher` into `TestsDbContext` and awaits `_publisher.Publish()` inside `SaveChangesAsync`.
- **Required Behavior:** Remove `IPublisher` injection. Utilize `OutboxDomainEventInterceptor` to convert events to `OutboxMessage` entities.
- **Reason for Change:** Direct broker dispatch inside the DB transaction locks DB connections and violates 2PC principles.
- **Risk if Left Unchanged:** Database connection exhaustion during message broker degradation.
- **Priority:** Critical

### 3.4 Phase 10
- **Document:** `docs/phases/phase-10-major-platform/phase-10-01-enterprise-architecture-specification.md` & `phase-10-03-implementation-guide.md`
- **Section:** Implementation Details (MajorsDbContext)
- **Current Behavior:** Mandates `IPublisher` usage inside `SaveChanges`.
- **Required Behavior:** Adopt Enterprise Transactional Outbox pattern.
- **Reason for Change:** Dual-write anti-pattern.
- **Risk if Left Unchanged:** Search catalog inconsistency for Majors.
- **Priority:** Critical

### 3.5 Phase 11
- **Document:** `docs/phases/phase-11-universities-institutions/phase-11-01-enterprise-architecture-specification.md` & `phase-11-03-implementation-guide.md`
- **Section:** Implementation Details (UniversityDbContext)
- **Current Behavior:** Mandates `IPublisher` usage inside `SaveChanges`.
- **Required Behavior:** Adopt Enterprise Transactional Outbox pattern.
- **Reason for Change:** Dual-write anti-pattern.
- **Risk if Left Unchanged:** Search catalog inconsistency for Universities.
- **Priority:** Critical

### 3.6 Phase 12
- **Document:** `docs/phases/phase-12-scholarships/phase-12-03-implementation-guide.md`
- **Section:** 12.C.6 Domain Events
- **Current Behavior:** Mentions native Outbox implementation in EF Core, but implies a domain-owned outbox implementation.
- **Required Behavior:** Must explicitly reference the *Enterprise Transactional Outbox Baseline* (`Enterprise.Core.Infrastructure.OutboxDomainEventInterceptor`) instead of a localized implementation.
- **Reason for Change:** Ensure adherence to the Enterprise Capability mandate (no domain owns the outbox).
- **Risk if Left Unchanged:** Fragmentation of outbox infrastructure and duplicate polling relays.
- **Priority:** High

### 3.7 Phase 13
- **Document:** `docs/phases/phase-13-learning-platform/phase-13-01-architecture-specification.md` & `phase-13-03-implementation-guide.md`
- **Section:** Core Architectural Decisions
- **Current Behavior:** Application Services orchestrate event publishing, and documentation calls for "synchronously" updating external search indexes upon publication.
- **Required Behavior:** Must mandate strictly *asynchronous* search index updates driven by the Outbox Relay. Application services must stop publishing events directly.
- **Reason for Change:** Synchronous external system updates during critical learning resource publishing paths create massive availability risks.
- **Risk if Left Unchanged:** Total publishing failure if the Search service experiences downtime.
- **Priority:** Critical

## 4. Architecture Inconsistencies
- **Direct Publish vs Outbox Persist:** Legacy documents mandate calling `Publish()`, whereas the Baseline requires persisting to `OutboxMessages`.
- **IPublisher vs Outbox Interceptor:** Legacy documents inject `IPublisher` into the `DbContext`. The Baseline explicitly prohibits this.
- **Synchronous vs Asynchronous Expectations:** Legacy docs often expect immediate cross-domain effects (e.g., Cache, Search). The Baseline mandates eventual consistency via asynchronous outbox dispatching.

## 5. Required Documentation Updates
- Update all `DbContext` code blocks in Implementation Guides to remove `IPublisher`.
- Update architectural guidelines in Specifications to explicitly refer to the `Enterprise Transactional Outbox` for all cross-boundary communications.
- Revise all sequence and event flow descriptions to insert the "Outbox Persist" and "Dispatcher Pickup" steps between Domain Commit and Consumer Processing.

## 6. Impact Assessment
The impact of these inconsistencies is severe. If developers follow the existing Phase 07-13 documentation, they will actively construct systems that violate the newly approved P0-4 Enterprise Transactional Outbox strategy, reintroducing the dual-write problem across the entire application ecosystem.

## 7. Risk Assessment
- **Implementation Divergence Risk (Critical):** Teams will build synchronous event dispatchers, causing cascading failures during network partitions.
- **Data Loss Risk (Critical):** Committing transactions and relying on application-layer publish orchestration guarantees eventual data loss.
- **Governance Risk (High):** An approved enterprise baseline is effectively ignored if domain-specific documentation contradicts it.

## 8. Recommended Update Plan
The ARB recommends an immediate documentation rewrite phase (Enterprise Baseline Propagation) targeting Phase 07 through Phase 13.
1. Systematically remove all references to `IPublisher` inside `DbContext` files.
2. Explicitly map all cross-domain event dependencies to the Enterprise Transactional Outbox.
3. Validate that no domain documentation orchestrates direct message broker communication.

GO to Enterprise Baseline Propagation
