# MANARATAK 2.0: Phase 5.11 EventFoundation Architecture Baseline

## Architecture Design Specification

**Status:** APPROVED  
**Revision:** 5.11.0  
**Architecture Baseline:** FROZEN  
**Phase:** 5.11  
**Layer:** Domain / Enterprise Architecture

---

## 1. Vision & Purpose

The Enterprise Event Foundation is the definitive Single Source of Truth for modeling logical enterprise events across the MANARATAK 2.0 ecosystem. Its core purpose is to completely decouple the logical definition, identity, correlation, and lifecycle of an event from the physical mechanisms used to publish, transport, or deliver it.

## 2. Scope & Bounded Context

This architecture describes the **Event Foundation Bounded Context**. It serves as a generic, cross-cutting layer that other bounded contexts use to define and reference events purely through provider-neutral constructs.

### 2.1 Responsibilities

The Domain owns ONLY:

- Enterprise Event
- Event Definition
- Event Metadata
- Event Payload Metadata
- Event Version
- Event Correlation
- Event Causation
- Event Lifecycle
- Publication Intent

Actual publishing, transport, routing, and delivery belong exclusively to Infrastructure.

### 2.2 Non-Responsibilities

The Event Platform must **NEVER** handle:

- Event Publishing mechanisms.
- Event Delivery or Event Routing.
- Message Transport.
- External messaging infrastructure or transport primitives.
- Subscriptions or Listeners.
- Retry Engines or Dead Letter tracking.
- Physical Serialization mechanisms.
- Infrastructure integrations.

## 3. Provider Neutrality & Business Ignorance

The Event Foundation is strictly agnostic of both business domains and infrastructure.

- **No Business Knowledge:** It knows absolutely nothing of students, users, scholarships, universities, courses, organizations, CRM, CMS, AI workflows, or specific business rules.
- **No Infrastructure Knowledge:** It knows absolutely nothing of specific external messaging infrastructure, delivery mechanisms, or infrastructure systems.

---

## 4. Domain Model

### 4.1 Aggregate Root

- **`EnterpriseEvent`**: The central Aggregate Root representing the logical intent and definition of a significant domain occurrence. It represents ONLY its `EventReference`, `EventOwnerReference`, `EventDefinition`, `EventPayloadMetadata`, `EventVersion`, `EventMetadata`, `EventCorrelationReference`, and `EventCausationReference`. It must never contain business entities, message payload implementations, transport-specific metadata, or infrastructure delivery state.

### 4.2 Value Objects

All Value Objects are strictly immutable.

- **`EnterpriseEventId`**: The internal immutable identifier. `EnterpriseEventId` remains strictly internal and is never exposed outside the domain.
- **`EventReference`**: The official cross-context Value Object. Business domains must reference enterprise events exclusively through `EventReference`.
- **`EventOwnerReference`**: A generic abstraction referencing the logical owner. The Event Platform must never own business entities. Every `EnterpriseEvent` references its logical owner only through this value object, and the platform must never understand the business meaning of the owner.
- **`EventDefinition`**: The immutable definition encompassing the logical type and category of the event.
- **`EventPayloadMetadata`**: The immutable structural metadata describing the event's data payload.
- **`EventVersion`**: The immutable version metadata indicating the schema or format version of the event.
- **`EventMetadata`**: General logical metadata describing event context.
- **`EventCorrelationReference`**: A provider-neutral abstraction linking the event to a broader transactional or systemic correlation chain.
- **`EventCausationReference`**: A provider-neutral abstraction linking the event to its direct causal precursor.

---

## 5. Repository Contracts

Repositories must standardize all repository contracts using the Specification Pattern. Avoid repository-specific lookup methods. No custom lookup methods are permitted.

- **`IEnterpriseEventRepository`**:
  - `save(event: EnterpriseEvent): Promise<void>`
  - `findBy(specification: ISpecification<EnterpriseEvent>): Promise<EnterpriseEvent[]>`

---

## 6. Business Rules & Lifecycle

### 6.1 Lifecycle States

The `EnterpriseEvent` progresses through a strictly logical lifecycle:

1. **Created**: The event is logically instantiated in memory.
2. **Registered**: The event definition and intent are formally registered in the foundation.
3. **Published**: The logical intent indicates the event has been handed off for physical transport.
4. **Archived**: The event record has reached the end of its active logical lifecycle.

### 6.2 Core Business Rules

- **Rule 1:** An `EnterpriseEvent` must possess a valid `EventDefinition`, `EventVersion`, and `EventReference` upon creation.
- **Rule 2:** `EventDefinition`, `EventPayloadMetadata`, and `EventVersion` are permanently immutable. Any structural modification implies a fundamentally different logical event.
- **Rule 3:** Business domains must reference events via `EventReference` exclusively. `EnterpriseEventId` must not be leaked.
- **Rule 4:** The Domain only records publishing lifecycle intents; it never initiates physical transport connections or message transport.

---

## 7. Domain Events

Domain events are strictly limited to business-significant lifecycle transitions only. They must not reflect operational details, and all operational events related to external transport, publishers, subscribers, retry engines, dead letter tracking, or infrastructure must be strictly removed.

- **`EnterpriseEventCreatedEvent`**: Emitted when a new event is logically defined.
- **`EnterpriseEventRegisteredEvent`**: Emitted when the event is formally registered in the foundation repository.
- **`EnterpriseEventPublishedEvent`**: Emitted when the logical state reflects that the event was handed off for publishing.
- **`EnterpriseEventArchivedEvent`**: Emitted when the event reaches its end of life logically.

---

## 8. Cross-Context Relationships

- **Upstream:** Business contexts interact with the Event Foundation to formally register logical occurrences, passing provider-neutral metadata via `EventReference` alongside correlation and causation contexts.
- **Downstream:** The Application layer coordinates with Infrastructure adapters that translate `EnterpriseEvent` intents into physical payloads, routing them to infrastructure transport mechanisms.

---

## 9. Architectural Constraints

- **Dependency Rule:** Domain depends on nothing. Application depends on Domain. Infrastructure depends on Application and Domain. API depends on Application.
- **Purity Constraint:** The Domain must not import or reference any external transport libraries, transport SDKs, or serialization libraries.
- **No Reverse Coupling:** The Event Foundation domain must not import specific business domain models or payloads.

---

## 10. Risks & Recommendations

- **Risk:** Developers might attempt to couple physical transport metadata (e.g., transport keys, partition routing) directly into the `EnterpriseEvent` model.
  - **Recommendation:** Strictly enforce that `EnterpriseEvent` is only a _logical record_. Physical routing and partition logic belong in isolated infrastructure adapters mapping from the `EventDefinition`.
- **Risk:** Business domains directly publishing physical messages instead of utilizing the Event Foundation's logical flow.
  - **Recommendation:** Ensure application use cases intercept business domain events, wrap them in the Event Foundation's definitions, and hand off purely logical intent to the infrastructure layer.

---

## 11. Architecture Decision Records (ADRs)

### ADR-1: Provider Neutrality

- **Context:** The system requires a robust event-driven architecture without locking into specific messaging backends.
- **Decision:** The Event Foundation will be entirely provider-neutral. It will not reference any specific transport technology, transport provider, or vendor.
- **Consequences:** Ensures long-term flexibility, protects the domain from technology churn, and prevents infrastructure vendor lock-in.

### ADR-2: Event Ownership

- **Context:** Determining the governance of enterprise events.
- **Decision:** The Event Platform acts as the sole owner of all event metadata, definitions, references, and lifecycles. It never owns the business entities encapsulated within the events.
- **Consequences:** Centralizes event governance, ensuring clear boundary separation between standard event wrappers and business specifics.

### ADR-3: Event Definition Immutability

- **Context:** Managing schema evolution and backwards compatibility.
- **Decision:** `EventDefinition`, `EventPayloadMetadata`, and `EventVersion` are permanently immutable. Any modification requires the creation of a completely new `EnterpriseEvent`.
- **Consequences:** Eliminates mid-flight schema mutation. Consumers can rely completely on the consistency of the `EventVersion` and metadata definition.

### ADR-4: Event Lifecycle Ownership

- **Context:** Determining the boundary for event lifecycle transitions.
- **Decision:** The Domain owns only the logical lifecycle of enterprise events. Physical publishing, routing, delivery, retries, subscriptions and archival execution belong exclusively to Infrastructure.
- **Consequences:** Keeps business intent separate from the mechanics of physical network transport.

### ADR-5: Publishing Boundary

- **Context:** Delineating intent to publish from physical publishing.
- **Decision:** The Domain defines the publishing intent. Infrastructure performs the physical publishing to transport mechanisms.
- **Consequences:** Keeps the domain pure and testable while allowing infrastructure to use native publisher clients.

### ADR-6: Delivery Boundary

- **Context:** Handling the actual delivery of events to subscribers.
- **Decision:** The Domain defines the logical delivery intent and correlation. Infrastructure manages physical delivery, subscriptions, routing, and message acknowledgements.
- **Consequences:** Ensures delivery mechanics remain a physical concern independent of the logical event definition.

### ADR-7: Correlation & Causation Boundaries

- **Context:** Tracking flows across distributed bounded contexts.
- **Decision:** The Domain defines generic, provider-neutral `EventCorrelationReference` and `EventCausationReference` models. Infrastructure is responsible for mapping these to physical transport headers (e.g., OpenTelemetry, W3C Trace Context) during transport.
- **Consequences:** Maintains domain purity while fully supporting enterprise-grade distributed tracing.

---

## 12. Official Architecture Review Board (ARB) Decision & Certification

```text
========================================================================
                 FINAL ARCHITECTURE CERTIFICATION
========================================================================
```

The Architecture Review Board (ARB) has completed the final review of the Enterprise Event Foundation architecture. The architecture has been verified against the Official Roadmap Baseline v4.0, Clean Architecture, Domain-Driven Design (DDD), SOLID Principles, Enterprise Architecture, Dependency Rule, and Provider Neutrality.

**The ARB certifies that:**

- `EventReference` is the official cross-context Enterprise Event reference.
- `EnterpriseEventId` remains strictly internal to the Event Platform.
- `EventOwnerReference` is the exclusive abstraction for referencing external ownership.
- `EnterpriseEvent` contains only provider-neutral metadata, immutable event definitions, immutable payload metadata, immutable event version information, correlation metadata and causation metadata.
- `EventDefinition` is permanently immutable.
- `EventPayloadMetadata` is permanently immutable.
- `EventVersion` is permanently immutable.
- Any modification to an event definition, payload metadata or version requires creation of a completely new `EnterpriseEvent`.
- Event Definition is completely separated from Event Publication.
- The Domain owns only the logical lifecycle of enterprise events.
- Physical publishing, routing, transport, delivery, subscriptions, retries and archival execution remain exclusively Infrastructure responsibilities.
- Repository contracts follow the Specification Pattern.
- Domain Events are restricted to business-significant lifecycle transitions only.
- The platform contains no infrastructure assumptions.
- The platform contains no vendor-specific terminology.

```text
========================================================================
                          ARCHITECTURE FREEZE
========================================================================
```

The Enterprise Event Foundation Architecture is hereby declared the permanent **Architecture Baseline** for Phase 5.11.

No further architectural modifications, redesigns, structural changes, feature additions, or scope expansions are permitted unless initiated through a formal Architecture Review Board (ARB) Change Request approved by the Project Owner.

---

## 13. Phase 06 Import Foundation Integration Note

- **Import Event Definitions:** Event Foundation models cross-context logical event definitions and correlation structures for import lifecycle events (`ImportJobStarted`, `ImportJobCompleted`, `ImportJobFailed`, and `DomainHandoffRequested`).
- **Ownership Boundary:** Event Foundation provides generic event abstractions and definition governance. Phase 06 Import Foundation dispatches these events during import execution without Event Foundation owning import orchestration or downstream domain merge logic.

---

### Navigation

- **Previous**: [Phase 5.10 Background Jobs Implementation Baseline](../BackgroundJobs/phase-05-10-backgroundjobs-implementation-baseline.md)
- **Next**: [Phase 5.11 Event Foundation Implementation Baseline](phase-05-11-eventfoundation-implementation-baseline.md)
