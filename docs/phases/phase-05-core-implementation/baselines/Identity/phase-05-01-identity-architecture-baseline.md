# MANARATAK 2.0: Phase 5.1 Identity Management

## 1. Document Information

- **Title:** Enterprise Identity Management Architecture Design
- **System:** MANARATAK 2.0 Enterprise Platform
- **Layer:** Common Core Platform / Shared Services
- **Status:** APPROVED & REFINED (Ready for ARB Final Seal)
- **Revision:** 5.1.0
- **Authors:** Chief Enterprise Solution Architect & Architecture Review Board (ARB)

---

## 2. Vision

The **Identity Management Platform** serves as the immutable, high-performance, and type-neutral Single Source of Truth (SSoT) for every actor, agent, or system operating within the MANARATAK 2.0 ecosystem. It provides the core ontology and lifecycle governance for defining _who_ exists inside the platform, strictly decoupled from the mechanisms of _how_ they authenticate, _what_ they are authorized to do, or the specific business domains (e.g., scholarships, universities) in which they participate.

---

## 3. Purpose

The primary purpose of this architecture is to establish a unified, secure, and infinitely extensible core directory model. By isolating identity definition from downstream operational concerns (like security credentials and organizational structures), this architecture guarantees that MANARATAK 2.0 can scale to support diverse interaction models—such as human users, external integrations, background systems, and autonomous AI agents—without introducing architectural degradation or domain contamination.

---

## 4. Scope

The scope of this design is strictly limited to foundational identity ontology, lifecycle states, structural attributes, and internal relation models:

- **In-Scope:**
  - The definition of the root `Identity` aggregate and its taxonomy.
  - The conceptual separation of human entities (`User`) and operational states (`Account`).
  - Architectural contracts for type classification, technical metadata, and contact registries.
  - Domain invariants, life-cycle transitions, and relationship models between identities.
  - Repository contracts enabling high-performance, provider-neutral lookups.
- **Out-of-Scope (Strictly Forbidden in this Bounded Context):**
  - **Authentication:** Credentials, password hashing, MFA, JWT generation, session management, and login flows.
  - **Authorization:** Roles, permissions, RBAC, ABAC, and policy evaluations.
  - **Organizations:** Tenants, departments, company structures, and business unit memberships.
  - **Business Domains:** Students, applications, scholarships, universities, courses, and portal-specific operations.

---

## 5. Responsibilities

The Identity Management Platform has exclusive authority over the following domain concerns:

1. **Actor Verification & Existence:** Ensuring that every entity executing an action or owning a resource in the system possesses a verified, valid, and trace-compliant root Identity.
2. **Taxonomy Enforcement:** Determining and validating the structural type of each identity via explicit structural types.
3. **Lifecycle Integrity:** Controlling the legal states and transitions of an identity (e.g., from Provisioned to Active to Archived) and publishing corresponding Domain Events.
4. **Core Contact Governance:** Maintaining unique, validated system-wide primary contact coordinates (e.g., system emails) for human actors.
5. **Operational Account Bridging:** Linking the abstract identity to its system-level operational boundary (`Account`) which tracks rate limit profiles, resource quotas, and access state.

---

## 6. Non-Responsibilities

To preserve strict layer isolation, the Identity Management Platform explicitly rejects the following responsibilities:

- It **does not** validate user passwords or interact with authentication tokens.
- It **does not** decide if a user is permitted to view a specific screen, run a query, or modify a record.
- It **does not** manage organization-specific hierarchies or business workflows.
- It **does not** store business-related domain documents or metadata.

---

## 7. Bounded Context

The **Identity Bounded Context** is isolated from other core platform contexts using strict boundaries and clean interfaces. Below is the relationship and boundary layout:

```
+-----------------------------------------------------------------------------------+
|                           IDENTITY BOUNDED CONTEXT                                |
|                                                                                   |
|  +--------------------+                                                           |
|  |  Identity (Root)   | <======== (1:1) ========> +----------------------------+  |
|  |  [IdentityType]    |                           |          Account           |  |
|  +--------------------+                           | (Quota, Limit, State)      |  |
|           ||                                      +----------------------------+  |
|           || (1:1/Inheritance Conceptual)                                         |
|           \/                                                                      |
|  +--------------------+                                                           |
|  |    User (Human)    | -------- (1:1) --------> +-----------------------------+  |
|  |  [Profile (VO)]    |                          |    ContactRegistry (Entity) |  |
|  +--------------------+                          +-----------------------------+  |
+-----------------------------------------------------------------------------------+
                                    ||
                                    || (Downstream via Domain Events & Read-Models)
                                    \/
+-----------------------+ +-------------------------+ +-----------------------------+
|  AUTHENTICATION BC   | |     AUTHORIZATION BC    | |      ORGANIZATIONS BC       |
|  (Passes, JWT, Auth)  | |  (Roles, Permissions)   | |  (Tenants, Memberships)   |
+-----------------------+ +-------------------------+ +-----------------------------+
```

### Context Boundary Guarantees:

- **Upstream / Downstream Relationships:** Downstream contexts (such as _Authentication_ or _Authorization_) consume read-only identity projections or subscribe to `IdentityCreated` or `IdentityStatusChanged` domain events to initialize their own domain-specific tables.
- **Reference Integrity:** Downstream contexts reference the Identity via its immutable, globally unique UUID (`IdentityId`). They never write back to the Identity directory.

---

## 8. Core Concepts & Taxonomy

To prevent structural confusion and maintain strict DDD discipline, the core platform separates three foundational concepts:

### A. Identity

The absolute root of existence. It represents the ontological anchor for any actor inside the platform. It holds the globally unique identifier, the classification type, the master lifecycle status, and auditing metadata.

### B. User (Human Identity Subtype)

A domain-specific representation of a physical human being. It extends or is mapped directly from a root `Identity` of type `Human`. It is the unique owner of a personal `Profile` and a `ContactRegistry`.

### C. Account

The operational container and policy boundary through which an `Identity` interacts with platform resources. An `Account` is **not** a synonym for an `Identity`; it represents the operational _enablement_ of that Identity.

- **Why it exists:** To isolate runtime behaviors (rate limits, usage tiers, resource consumption quotas) from the immutable biological/ontological existence of the Identity itself.
- **What it owns:** Quotas (e.g., storage capacity limits), throttling profiles (e.g., API tier limits), technical configuration flags, and platform-specific access states (e.g., `Suspended`, `RateLimited`, `Locked`).
- **Lifecycle:** Created upon Identity activation, can be independently suspended (e.g., for non-payment or abuse) without destroying the core Identity, and can be deleted/purged in compliance with system retention policies.
- **Relationship with Identity:** Exactly 1-to-1 for default operations, but structurally supports 1-to-Many in multi-account or multi-tenant system overlays (e.g., one physical human Identity owning a standard Account and a separate administrative/developer Account).

### D. IdentityType

An explicit, immutable classification that determines the nature of the Identity. It allows the core directory to handle non-human actors identically to human actors at the infrastructure layer, while branching validation logic in the application layer.

The platform conceptually recognizes the following taxonomy:

- **Human:** Real physical actors (mapped to a `User` entity containing profile parameters).
- **Service:** Automated API clients, Webhook runners, or external machines.
- **System:** Internal automated processes, database triggers, cron daemons, or system microservices.
- **External:** Actors synchronized from external identity providers (IdPs) or federated directories.
- **Integration:** Third-party marketplace applications or SaaS connector instances.
- **AI:** Autonomous AI agents, language model interfaces, or automated decision agents.
- **Guest:** Anonymous, temporary, or unverified actors requiring short-term tracking.

---

## 9. Aggregate Design

### Identity Aggregate Root

The `Identity` aggregate root governs the consistency boundary for all core identity states, profiles, and accounts.

```
                                  +-----------------------+
                                  |   Identity (Root)     |
                                  |                       |
                                  | - Id: IdentityId      |
                                  | - Type: IdentityType  |
                                  | - Status: LifeStatus  |
                                  +-----------------------+
                                              |
                     +------------------------+------------------------+
                     |                                                 |
                     v                                                 v
        +--------------------------+                      +--------------------------+
        |       User (Entity)      |                      |      Account (Entity)    |
        |                          |                      |                          |
        | - Profile: Profile (VO)  |                      | - AccessState: State     |
        | - Contacts: Contact (E)  |                      | - Limits: LimitConfig    |
        +--------------------------+                      +--------------------------+
```

### Aggregate Consistency Guarantees (Invariants):

1. **Type-Subtype Constancy:** If `IdentityType` is `Human`, the aggregate must contain a non-null `User` entity. If the type is non-human (e.g., `Service`), the `User` entity must be null, and an `Account` config must govern service limits directly.
2. **Transition Legality:** State transitions of the aggregate root must strictly comply with the **Identity State Model**. An identity cannot transition to `Active` without a verified primary contact channel.
3. **Account Linkage:** An active `Identity` must have at least one active operational `Account` configured before performing resource-consuming interactions.

---

## 10. Entities

### A. User Entity

- **Purpose:** Represents human-specific attributes, contact points, and preferences within the aggregate.
- **Key Attributes:**
  - `UserId` (UUID, matches or references `IdentityId`).
  - `Profile` (Value Object).
  - `ContactRegistry` (Entity).
- **Access Rule:** Only accessible and modifiable via the `Identity` aggregate root. It cannot be updated directly.

### B. ContactRegistry Entity

- **Purpose:** Manages the human user's communication channels, verification flags, and preferences.
- **Key Attributes:**
  - `PrimaryEmail` (String, verified/unverified status).
  - `PrimaryPhone` (String, optional, verified status).
  - `AlternativeContacts` (List of verified/unverified channels).
- **Access Rule:** Strictly encapsulated within the `User` entity. Any modification triggers system-wide uniqueness and verification workflows.

---

## 11. Value Objects

### A. Profile (Value Object)

- **Justification for Value Object:**
  A Profile (comprising display name, avatar URL, bio, and locale settings) lacks independent identity or a lifecycle separate from the `User`. It is defined entirely by its attributes. If two Profiles possess the exact same attributes, they are structurally identical and interchangeable. Mutating a profile does not change "who" the user is; it merely replaces the previous attributes with new values in an atomic operation.
- **Key Attributes:**
  - `DisplayName` (String, validated).
  - `AvatarUrl` (String, validated format).
  - `PreferredLanguage` (BCP 47 language code).
  - `TimeZone` (IANA time zone string).

### B. TechnicalMetadata (Value Object)

- **Justification for Value Object:**
  Represents purely operational, system-level metadata. It has no identity and is treated as an immutable key-value set.
- **Governance Constraint:**
  - **Strict Technical Limit:** Technical Metadata is strictly reserved for orchestration concerns (e.g., synchronization watermarks, source migration identifiers, schema version offsets, integration markers).
  - **Zero Business Data Leakage:** It is strictly forbidden from housing any business, domain, application, or profile data. It must never act as an un-schema'd, generic back-alley database for application features.

---

## 12. Domain Services

### IdentityValidationService

- **Purpose:** Executes complex multi-field verification checks that transcend the boundary of a single aggregate instance, such as checking system-wide uniqueness of email or phone numbers across active identities.
- **Key Responsibilities:**
  - Validates contact uniqueness against the database during identity provision.
  - Validates formatting of locale preferences and structural integrity of incoming display names.

### IdentityRelationshipService

- **Purpose:** Governs the creation, validation, and lifecycle of relationships between distinct `Identity` roots without embedding those references directly in the main aggregate roots.
- **Key Relationships Managed:**
  - **Parent-Child / Guardian-Dependent Identity:** (E.g., mapping a minor human user to a primary responsible human user).
  - **Linked Identity:** Linking multiple federated or external identities back to a single human root.
  - **Delegated Identity:** Authorizing a `Service` or another `Human` identity to act on behalf of a target identity within a temporal boundary.

---

## 13. Repository Contracts

The repository interface remains provider-neutral, avoiding any framework-specific leaks (like Prisma or TypeORM). It provides high-performance lookup capabilities.

```typescript
export interface IIdentityRepository {
  // Core Persistence Operations
  findById(id: string): Promise<Identity | null>;
  save(identity: Identity): Promise<void>;
  delete(id: string): Promise<void>;

  // Neutral Operational Lookups
  findByPrimaryEmail(email: string): Promise<Identity | null>;
  findByExternalReference(provider: string, referenceId: string): Promise<Identity | null>;

  // Generic Criteria & Pagination
  findPaged(criteria: {
    type?: IdentityType;
    status?: LifeStatus;
    limit: number;
    offset: number;
  }): Promise<{ items: Identity[]; total: number }>;

  // Uniqueness Verification Guards
  isEmailUnique(email: string): Promise<boolean>;
  isPhoneUnique(phone: string): Promise<boolean>;
}
```

---

## 14. Business & Validation Rules

### A. Display Name Rules

- Must be between 2 and 100 characters in length.
- Must contain only UTF-8 alphanumeric characters, spaces, hyphens, and apostrophes.
- Must not contain offensive patterns or attempt SQL/script injection.

### B. Preferred Language Rules

- Must resolve to a valid, standard IETF BCP 47 language tag (e.g., `en-US`, `ar-SA`).
- Defaults to a system-wide fallback locale if the requested tag is unsupported.

### C. Contact Uniqueness Rule

- No two active `Human` identities can share the same verified primary email address or primary phone number.
- Inactive or purged identities do not block contact reuse.

### D. Primary Contact Mandate

- Every `Human` identity must possess at least one primary verified contact channel (email or phone) to transition from `PROVISIONED` to `ACTIVE`.

---

## 15. Identity Lifecycle & Extensibility

```
   +------------------+
   |   PROVISIONED    |  (Created in directory, contacts unverified)
   +------------------+
            |
            | (Contact Verified)
            v
   +------------------+
   |      ACTIVE      |  (Fully operational, Account created)
   +------------------+
         |     ^
         |     | (Issue Resolved)
         v     |
   +------------------+
   |    SUSPENDED     |  (Access blocked temporarily, Identity preserved)
   +------------------+
            |
            | (Decommission Request / Legal Retention Expired)
            v
   +------------------+
   |     ARCHIVED     |  (Read-only archive state for regulatory compliance)
   +------------------+
            |
            | (Purge & Compliance Window Cleansed)
            v
   +------------------+
   |      PURGED      |  (Anonymized or physically removed, hard terminal state)
   +------------------+
```

### Architectural Extensibility for Future Lifecycle States:

To prevent modifications to the core `Identity` aggregate when compliance, legal retention, or country-specific GDPR laws evolve, the lifecycle architecture is built on the **State Pattern and Hook Pipeline**:

- **State Transition Interceptors (Pipeline Hooks):** Before any transition occurs (e.g., `ACTIVE -> ARCHIVED`), the system executes a registered list of `IIdentityLifecycleInterceptor` implementations. External modules (like a Compliance or Legal module) register their interceptors to veto the transition or delay it based on downstream database audits.
- **Loose State Configuration:** State definitions use a decoupled metadata engine allowing downstreams to register retention parameters (e.g., "Retain Archived state for 7 years under regulatory code XYZ") without editing the central state enum or DB schema.

---

## 16. Domain Events

Domain events are published on the core transaction completion, enabling decoupled downstream side-effects:

### A. `IdentityCreatedEvent`

- **Payload:** `identityId`, `identityType`, `timestamp`.
- **Downstream Consumers:** Authentication service (creates passkey record), Audit service (creates log).

### B. `IdentityActivatedEvent`

- **Payload:** `identityId`, `primaryEmail`, `timestamp`.
- **Downstream Consumers:** Notification service (sends onboarding welcome), Account billing.

### C. `IdentityStatusChangedEvent`

- **Payload:** `identityId`, `oldStatus`, `newStatus`, `reason`, `timestamp`.
- **Downstream Consumers:** Security platform (force terminates active user sessions if suspended), Audit engine.

### D. `IdentityContactUpdatedEvent`

- **Payload:** `identityId`, `contactType`, `oldValue`, `newValue`, `timestamp`.
- **Downstream Consumers:** Communication dispatch registers.

---

## 17. Cross-Platform & Bounded Context Relationships

- **Authentication Context:** Subscribes to `IdentityCreated` to provision login credentials securely. Reads `IdentityStatus` to block token issuance if suspended.
- **Authorization Context:** Reads `IdentityId` to map platform roles and permissions. Never modifies the identity parameters.
- **Organization Context:** Subscribes to `IdentityCreated` to manage corporate/educational tenancy memberships.
- **Audit Platform:** Listens to all identity domain events to construct a unified, legally compliant timeline of changes.

---

## 18. Architectural Constraints

1. **The Dependency Rule:** No module inside the core identity domain may import frameworks (such as Express, Prisma, or AWS SDK).
2. **Entity Isolation:** Domain aggregates must be fully self-contained. Databases must be modeled as clean projections of these aggregates.
3. **No Database Leakage:** Database models (e.g. Prisma schemas) represent structural mapping layers and are strictly forbidden from dictating the business logic of the aggregate root.

---

## 19. Risks & Mitigations

- **Risk: Identity Directory Bloat (Too many non-human service accounts).**
  - _Mitigation:_ System-defined automated cleanups, short-lived Guest identities, and separate index boundaries in physical storage partitions.
- **Risk: Sync Latency with Downstream Auth.**
  - _Mitigation:_ Atomic write-through transactions at the transactional boundary, coupled with robust, idempotent outbox message patterns for domain event publishing.

---

## 20. Recommendations

- **Anonymization over Deletion:** During the `PURGED` lifecycle phase, anonymize personal attributes (display names, contact records) instead of hard-deleting the database row. This maintains relational integrity for statistical financial audits without breaching privacy mandates (GDPR/HIPAA).
- **Strong Key Indexing:** Ensure that `IdentityId` and primary contact keys (emails, external references) are heavily indexed using B-Tree index partitions inside the physical storage systems.

---

## 21. Architecture Decision

### ARB BOARD RESOLUTION:

The refined design of the **Identity Management Platform** is hereby officially frozen, approved, and certified. It completely separates Biological Identity from Operational Accounts, encapsulates profile structures within immutable value objects, enforces strict technical-only metadata limits, and provides perfect extensibility for future non-human actors and complex compliance lifecycles.

```
+-----------------------------------------------------------------------------------+
|                                  ARB FINAL SEAL                                   |
|                                                                                   |
|  Phase 5.1: Identity Management Architecture Design                               |
|                                                                                   |
|  STATUS: APPROVED & Baseline Certified                                            |
|  Revision: 5.1.0                                                                  |
|  Readiness: Ready to transition to Phase 5.2 - Authorization Platform Design     |
+-----------------------------------------------------------------------------------+
```

---

PHASE 5.1 COMPLETED

APPROVED

Revision: 5.1.0

IDENTITY BASELINE CERTIFIED

READY TO PROCEED TO PHASE 5.2

---

### Navigation

- **Previous**: [Phase 04 Sign-off](../../../phase-04-architecture-governance/baselines/phase-04-21-report.md)
- **Next**: [Phase 5.1 Identity Implementation Baseline](phase-05-01-implementation-baseline.md)
