# MANARATAK 2.0: Phase 5.6 Notification Architecture Baseline

## 1. Document Information

**Document Type:** Architecture Design Document
**Phase:** 5.6
**Platform:** Enterprise Notification Foundation
**Status:** APPROVED
**Revision:** 5.6.0
**Architecture Baseline:** FROZEN
**Date:** 2026-07-16

## 2. Vision

To provide a universal, provider-neutral, and highly scalable enterprise notification engine that manages the definition, intent, and lifecycle of notifications across the MANARATAK 2.0 ecosystem without being coupled to specific delivery mechanisms or business domains.

## 3. Purpose

The Enterprise Notification Foundation acts as the definitive source of truth for "What is a notification?" and "How is it defined and tracked?" It orchestrates notification templates, delivery intents, abstract channels, and delivery states, decoupling the generation of messages from their physical transmission.

## 4. Scope

This architecture encompasses the domain modeling of notification definitions, templates, delivery intents, generic recipient abstractions, scheduling metadata, and retry metadata. It strictly adheres to Clean Architecture and Provider Neutrality, ensuring no leakage of third-party messaging SDKs, communication protocols, or external business domain concepts.

## 5. Responsibilities

The Notification Platform is responsible ONLY for:

- Notification Identity and Definition
- Notification Lifecycle and State Management
- Notification Templates and Template Variables
- Notification Priority and Category classification
- Notification Recipient Abstraction
- Notification Channel Abstraction
- Delivery Intent modeling
- Retry, Scheduling, and Expiration Metadata
- Localization References
- Notification Preferences (opt-in/opt-out modeling at an abstract level)

## 6. Non-Responsibilities

This platform MUST NOT contain:

- Actual physical message delivery
- Specific provider implementations
- Marketing Campaigns or Bulk Marketing orchestration
- Workflow Engines or Business Rules evaluation
- Analytics or AI capabilities
- Physical translation or localization services
- Message rendering engines (HTML parsers, PDF generators, provider-specific formatting)
- Provider Credentials management

## 7. Bounded Context

**Context Name:** Enterprise Notification Context
**Domain:** Enterprise Infrastructure Subdomain
**Classification:** Core / Generic Subdomain
**Language:** NotificationIntent, NotificationTemplate, NotificationId, NotificationReference, NotificationChannel, NotificationRecipientReference, Priority, SchedulingMetadata, TemplateVariable, LocalizationReference.

## 8. Core Concepts

- **Notification Intent vs. Notification Delivery:** The Domain owns ONLY Notification Identity, Definition, Lifecycle, Metadata, and Delivery Intent. Actual message delivery belongs exclusively to Infrastructure.
- **Notification Template:** A provider-neutral blueprint defining the structure and variable placeholders for a message. Rendering engines, formatting, and provider-specific rendering remain outside the Domain.
- **Notification Channel:** An abstract classification of the communication medium without specifying any concrete channel technology.
- **Notification Recipient Reference:** An opaque external identifier representing the recipient of the notification, ensuring zero coupling to User or Student domains. The Notification Platform must never own Users, Students, Organizations, Courses, or Scholarships.
- **Delivery Intent:** The planned lifecycle of a notification, up until it is handed off for abstract dispatch.

## 9. Aggregates

The domain is structured around two distinct Aggregate Roots.

### 9.1 NotificationTemplate (Aggregate Root)

- **Description:** Represents a reusable, provider-neutral blueprint for generating messages.
- **Rules:**
  - Must define an immutable identity (`TemplateId`).
  - Defines only message structure and required `TemplateVariable` placeholders.
  - Contains `LocalizationReference`s.
  - Maintains abstract `NotificationChannel` compatibility.
- **Transactional Boundary:** Template creation, variable schema definition, and localization mapping.

### 9.2 NotificationIntent (Aggregate Root)

- **Description:** Represents a specific instance of a planned notification delivery intent.
- **Rules:**
  - `NotificationId` is absolutely immutable.
  - Must reference a `TemplateId` or contain raw provider-neutral content.
  - Must maintain an abstract `NotificationRecipientReference`.
  - Encapsulates `SchedulingMetadata`, `ExpirationMetadata`, and `RetryMetadata`.
- **Transactional Boundary:** Intent creation, lifecycle transitions (e.g., Scheduled to Cancelled), and metadata updates.

## 10. Entities

Given the focused boundaries, the Aggregates directly manage their state. No complex subordinate entities are required beyond Value Objects.

## 11. Value Objects

- **NotificationId:** An immutable, globally unique identifier for a notification intent.
- **NotificationReference:** A dedicated Value Object serving as the official cross-context reference. Business domains must reference notifications exclusively through `NotificationReference` instead of exposing `NotificationId` directly.
- **TemplateId:** An immutable, globally unique identifier for a notification template.
- **NotificationRecipientReference:** A generic string identifier representing the external entity receiving the notification.
- **NotificationChannel:** An abstract Value Object generic categorization of the delivery medium. Concrete channels must remain unspecified.
- **TemplateVariable:** A key-value definition representing dynamic content placeholders.
- **Priority:** Represents the urgency of the notification (e.g., Low, Normal, High, Critical).
- **SchedulingMetadata:** Timestamps dictating when the notification intent is planned for dispatch.
- **ExpirationMetadata:** Timestamps dictating when the notification intent is no longer relevant.
- **RetryMetadata:** Defines abstract backoff and retry policy limits.
- **LocalizationReference:** A key identifying the language or regional format required.

## 12. Domain Services

- **INotificationPreferenceGateway (Port):** An abstract interface to evaluate if a `NotificationRecipientReference` has opted out of a specific `NotificationChannel` or Category before confirming an intent.

## 13. Repository Contracts

Repositories expose generic Specification-based querying. All repositories are standardized using the Specification Pattern to avoid repository-specific lookup proliferation.

- **INotificationIntentRepository:**
  - `save(intent: NotificationIntent): Promise<void>`
  - `findBy(specification: ISpecification<NotificationIntent>): Promise<NotificationIntent[]>`

- **INotificationTemplateRepository:**
  - `save(template: NotificationTemplate): Promise<void>`
  - `findBy(specification: ISpecification<NotificationTemplate>): Promise<NotificationTemplate[]>`

## 14. Business Rules

- **Immutable Identity:** `NotificationId`, `NotificationReference`, and `TemplateId` cannot be changed.
- **Abstract Channels:** The domain must never specify concrete communication media. It uses `NotificationChannel`.
- **Infrastructure Execution:** The Domain models the intent to deliver; actual transmission and rendering belong to Infrastructure.
- **Audience Ignorance:** The platform cannot query User profiles for routing addresses. The orchestrating application or the infrastructure provider resolves the `NotificationRecipientReference` to physical routing coordinates.
- **Expiration Enforcement:** Intents exceeding their `ExpirationMetadata` must transition to an Expired state.

## 15. Lifecycle

**NotificationIntent Lifecycle:**

1. **Created:** Intent is constructed but not yet ready for evaluation.
2. **Scheduled:** Intent is ready and waiting for `SchedulingMetadata` criteria.
3. **Cancelled:** Intent was aborted before processing.
4. **Expired:** Intent passed its expiration window before dispatch.
5. **Archived:** Final terminal state after intent processing is finalized.

## 16. Domain Events

Domain Events represent only business-significant lifecycle events. Operational events such as provider delivery feedback, connection status, or retry execution belong outside the Domain.

- `NotificationCreatedEvent`
- `NotificationScheduledEvent`
- `NotificationCancelledEvent`
- `NotificationExpiredEvent`
- `NotificationArchivedEvent`

## 17. Cross-Context Relationships

- **Business Domains (CRM, CMS, etc.):** Any other bounded context references or triggers notifications exclusively via `NotificationReference` and `NotificationRecipientReference`.
- **Identity/Profile:** The Notification Platform uses `NotificationRecipientReference` and `INotificationPreferenceGateway` to consult user preferences without knowing user details.

## 18. Architectural Constraints

- **Absolute Provider Neutrality:** No concrete communication providers, protocols, or cloud vendors.
- **No Implementation Artifacts:** The architecture enforces a strict separation from REST, GraphQL, databases, or ORMs.
- **Layer Isolation:** Domain has zero external dependencies.

## 19. Architecture Decision Records (ADR)

**Title:** Management of Template Versioning
**Status:** Accepted
**Decision:** We will **NOT** implement Template Versioning within the Enterprise Notification Foundation.
**Rationale:** A template definition should be treated as immutable. If a business needs a fundamentally different message structure, it should create a new `NotificationTemplate` with a new `TemplateId`.

**Title:** Scheduling Execution Ownership
**Status:** Accepted
**Decision:** Scheduling metadata belongs to the Domain, while scheduling execution belongs exclusively to Infrastructure.
**Rationale:** The Domain maintains the rules and timestamps defining when an intent becomes valid. The physical act of polling or cron execution to trigger that intent is an Infrastructure and background processing concern.

**Title:** Retry Policy vs. Execution
**Status:** Accepted
**Decision:** Retry policy is modeled as metadata only within the Notification Platform. Retry execution is performed by Background Jobs (Phase 5.10), not by the Notification Platform itself.
**Rationale:** Managing backoff execution loops, queues, and transient failure recovery introduces temporal coupling and infrastructure complexity. The Domain simply provides the boundaries (retry limits) for the generic Background Job processor.

## 20. Official ARB Decision

**Status:** APPROVED
**Notes:** Proposed architecture provides a completely decoupled, intent-based notification engine ensuring zero business or infrastructure leakage. Refinements applied successfully.

## 21. Final Architecture Baseline Freeze

The Enterprise Notification Foundation Architecture is officially **APPROVED** (Revision: 5.6.0) and frozen as the permanent architecture baseline.

**From this point forward:**

- NotificationReference is the official cross-context notification reference.
- NotificationRecipientReference is the only mechanism for referencing external recipients.
- Notification intent is completely separated from notification delivery.
- Notification channels remain fully abstract and provider-neutral.
- Notification templates define structure only and never rendering implementations.
- Scheduling responsibilities are correctly divided between Domain metadata and Infrastructure execution.
- Retry behavior is modeled exclusively as metadata while execution belongs to the Background Jobs Platform.
- Repository contracts follow the Specification Pattern.
- Domain Events contain only business-significant lifecycle transitions.
- The platform contains no infrastructure assumptions.
- The platform contains no vendor-specific terminology.
- The Notification Platform owns only notification lifecycle and notification definitions.
- No further architectural modifications, redesigns, structural changes, feature additions, or scope expansions are permitted unless initiated through a formal Architecture Review Board (ARB) Change Request approved by the Project Owner.

---

### Navigation

- **Previous**: [Phase 5.5 Enterprise Asset Platform (EAP) Implementation Baseline](../AssetPlatform/phase-05-05-assetplatform-implementation-baseline.md)
- **Next**: [Phase 5.6 Notification Implementation Baseline](phase-05-06-notification-implementation-baseline.md)
