# MANARATAK 2.0: Phase 5.3 Organization Architecture Baseline

> [!CAUTION]
> **SUPERSEDED AND BANNED BY ADR-027**
> This Phase 05.3 Enterprise Organization Management Platform baseline is **permanently excluded and banned** under **ADR-027 (Exclusion of Organizations & Employers Platform)**.
> A standalone Organizations Platform, generic organization CRUD, `/api/organizations`, `/admin/organizations`, and centralized organization registries MUST NOT be implemented or used.
> B2B entities (sponsors, providers, employers, universities) are owned natively by their respective domain phases (Phase 11, Phase 12, Phase 20, Phase 21).

## ADR-027 Resolution Status
This document is retained only as a historical record. It is not an approved implementation baseline. No application code, API route, admin UI, database model, import target, or future phase may implement this Organizations Platform.

## Replacement Ownership
- Phase 11 owns universities/institutions.
- Phase 12 owns scholarship sponsor metadata as part of scholarship records.
- Phase 20 owns service provider metadata as part of service catalog records.
- Phase 21 owns employer/recruitment metadata as part of career records.
- Phase 23 may display domain-specific admin screens only; it must not create generic Organizations Management.
- Phase 06 imports must remain generic and must not contain organization-domain logic.

## 1. Document Information

**Document Type:** Architecture Design Document
**Phase:** 5.3
**Platform:** Enterprise Organization Management Platform
**Status:** SUPERSEDED / BANNED BY ADR-027 / HISTORICAL RECORD ONLY
**Date:** 2026-07-16

## 2. Vision

To provide a highly scalable, flexible, and generic enterprise platform that definitively and exclusively answers the question: "How are identities organized inside the enterprise?"

## 3. Purpose

The Organization Management Platform centralizes all organizational structuring, hierarchies, and membership lifecycle management across the enterprise. It decouples the physical or logical grouping of identities from Identity Management and Authorization, acting as the Single Source of Truth for structural relationships within the enterprise.

## 4. Scope

This architecture covers the domain modeling, use case orchestration, and abstract persistence mechanisms required to manage organizational structures, business units, and entity memberships. It strictly adheres to Clean Architecture, Domain-Driven Design (DDD), and SOLID principles, maintaining absolute isolation from external infrastructure, identity authentication, and authorization logic.

## 5. Responsibilities

The Organization Management Platform is responsible ONLY for:

- Organizations
- Organization Hierarchy
- Parent / Child Organizations
- Business Units
- Departments
- Teams
- Membership
- Organizational Positions
- Reporting Structure
- Membership Lifecycle
- Organization Metadata
- Organization Relationships
- Organization Events

## 6. Non-Responsibilities

This platform MUST NOT contain:

- Authentication
- Authorization
- Roles
- Permissions
- Policies
- Identity lifecycle (creation, suspension, deletion of the Identity itself)
- User Profiles
- Sessions
- Passwords
- JWT
- Scholarships, Universities, Courses, Schools, Faculties
- Countries
- Import Framework
- Files, Media
- Notifications
- Settings

## 7. Bounded Context

**Context Name:** Organization Context
**Domain:** Enterprise Resource Management (ERM) Subdomain
**Classification:** Core Domain
**Language:** Organization, BusinessUnit, Department, Team, Membership, Position, Hierarchy, Parent, Child, IdentityId.

## 8. Core Concepts

- **Organization:** The root or node entity representing a distinct structural boundary. It is strictly generic.
- **Organization Type:** A dynamically configurable classification boundary (e.g., node type configuration), completely devoid of hardcoded domain specific business subclasses (like "University" or "Ministry"). It must not be an enum.
- **Hierarchy:** The directed acyclic graph (DAG) representing parent-child relationships between Organizations. Supports unlimited depth, strict cycle prevention, and safe traversal.
- **Membership:** The association between an `IdentityId` and an Organization, often accompanied by a specific `Position` or title.
- **IdentityId:** The unique identifier of an external entity (managed by the Identity Platform). The respective bounded context natively owns and references this but never manages the identity itself.

## 9. Aggregate Design

The domain is structured around the following Aggregate Roots:

### 9.1 Organization (Aggregate Root)

- **Description:** Represents a structural unit.
- **Rules:**
  - Maintains its own localized metadata and configured dynamic type.
  - Controls its placement in the hierarchy through an optional `ParentOrganizationId`.
  - Responsible for its own lifecycle (e.g., active, archived).
- **Transactional Boundary:** Operations affecting the organization's definition, metadata, or immediate parent/child linkage occur within the Organization aggregate boundary.

### 9.2 Membership (Aggregate Root)

- **Description:** Binds an `IdentityId` to an `OrganizationId` for a specific duration or role-context (position).
- **Justification for Aggregate Root Status:** Making Membership an Aggregate Root prevents massive concurrency conflicts. If an Organization with 10,000 members were a single aggregate, adding or removing one member would lock the entire organization. By modeling Membership as an independent aggregate, organizations scale infinitely without concurrency bottlenecks.
- **Rules:**
  - References Identity only through `IdentityId`. No names, no emails, no profile data.
  - Contains its own lifecycle, distinct from Identity and Organization lifecycles.
- **Transactional Boundary:** Assigning, modifying, or removing a membership is an independent transaction scoped solely to the Membership aggregate.

## 10. Entities

- **OrganizationTypeDefinition:** Represents the configurable metadata defining allowed organization node types in the system, guaranteeing types are data-driven rather than hardcoded enums.
- **Position:** Represents a specific slot or title within an Organization that a Membership fulfills.

## 11. Value Objects

- **IdentityId:** Encapsulates the external identity reference. The Single Source of Truth for identity definition remains outside this platform.
- **OrganizationId:** Unique identifier for an organization.
- **MembershipId:** Unique identifier for a membership record.
- **TimeSpan:** Represents the active duration of a membership (start date, optional end date).

## 12. Domain Services

- **HierarchyValidationService:** The critical governor of organization structures.
  - **No Cyclic Hierarchy:** Traverses the intended path before saving to guarantee an organization never becomes its own ancestor.
  - **No Self-Parent:** Prevents an organization from declaring itself as its parent.
  - **Unlimited Depth:** Uses efficient path traversal strategies designed for unbounded depth.
  - **Safe Traversal:** Guarantees deterministic graph resolution without infinite loops.

## 13. Repository Contracts

Repositories expose generic Specification-based querying to avoid the anti-pattern of repositories growing into massive collections of custom lookup methods.

- **IOrganizationRepository:**
  - `save(organization: Organization): Promise<void>`
  - `findById(id: OrganizationId): Promise<Organization | null>`
  - `findBy(specification: ISpecification<Organization>): Promise<Organization[]>`
- **IMembershipRepository:**
  - `save(membership: Membership): Promise<void>`
  - `findById(id: MembershipId): Promise<Membership | null>`
  - `findBy(specification: ISpecification<Membership>): Promise<Membership[]>`

## 14. Business Rules

- **Configurable Types:** Organization types are purely configurable data definitions. Hardcoding types like `enum OrganizationType { University, Company }` is strictly forbidden.
- **Acyclic Hierarchy:** The system explicitly rejects any parent-child assignment that creates a circular dependency or self-parenting.
- **Strict Identity Isolation:** The platform references Identity _only_ by `IdentityId`. It must never duplicate names, emails, avatars, or profile data. Identity remains the sole Single Source of Truth for user state.
- **Authorization Independence:** Memberships do not inherently grant system permissions. They represent physical or logical placement only. Permissions are exclusively the domain of the Authorization Platform.

## 15. Lifecycles

### 15.1 Organization Lifecycle

1. **Creation:** An Organization node is created and typed dynamically.
2. **Structuring:** The Organization is placed into the hierarchy by assigning a valid parent.
3. **Restructuring:** Organizations can be moved within the hierarchy, guarded by `HierarchyValidationService` to prevent cycles.
4. **Archiving:** An Organization is formally archived, emitting business events.

### 15.2 Membership Lifecycle

1. **Assignment:** An `IdentityId` is mapped to an `OrganizationId` creating a Membership.
2. **Evolution:** Membership positions or reporting lines are adjusted.
3. **Removal/Termination:** The Membership is terminated.
   **Constraint:** Membership state changes must NEVER directly modify the referenced Identity. Conversely, Identity state changes must NEVER directly modify the Membership. Cross-platform reactions occur strictly through published Domain Events (e.g., listening to an Identity Platform `IdentitySuspended` event to reactively suspend Memberships).

## 16. Domain Events

Domain Events represent only business-significant structural changes. Operational logging is excluded from domain events.

- `OrganizationCreated`
- `OrganizationMoved` (Parent changed)
- `OrganizationArchived`
- `MembershipAssigned`
- `MembershipModified`
- `MembershipRemoved`

## 17. Cross-Platform Relationships

- **Identity Platform:** Provides the `IdentityId` and publishes lifecycle events. The respective bounded context natively consumes these events (e.g., `IdentityPurged`) to asynchronously terminate or purge associated `Memberships`, maintaining eventual consistency.
- **Authorization Platform:** Operates independently. It may choose to consume Organization events to calculate dynamic roles, but The owning bounded context holds no knowledge of Authorization.

## 18. Architectural Constraints

- **Layer Isolation:** Domain must have zero external dependencies (no ORMs, no framework imports).
- **Dependency Inversion:** Infrastructure components implement interfaces defined in the Domain or Application layers.
- **Clean Architecture:** Use Cases orchestrate logic; entities encapsulate business rules.
- **Provider Neutrality:** The hierarchy and specification engines must be agnostic of the underlying database engine.

## 19. Risks

- **Performance in Deep Hierarchies:** Querying deeply nested organizational trees can introduce latency. **Mitigation:** Implement materialized paths, closure tables, or specialized read models behind the abstract repository contracts without leaking infrastructure logic into the Domain.
- **Eventual Consistency Latency:** Identities might be purged in the Identity Platform while Memberships lag. **Mitigation:** Robust event-driven architecture and graceful degradation when encountering orphaned `IdentityId`s during reads.

## 20. Recommendations

- Implement a Closure Table or Materialized Path pattern at the infrastructure level to efficiently query the unlimited-depth hierarchy.
- Utilize the Specification pattern extensively in Application Use Cases to keep querying flexible and decoupled.

## 21. Architecture Decision

**Status:** APPROVED (Revision: 5.3.0) - BASELINE BANNED
**Notes:** Architecture conforms to all Phase 5.3 mandatory refinements.

## 22. Architectural Decision Record (ADR): Membership as an Aggregate Root

**Decision:** Membership is explicitly modeled as an independent Aggregate Root rather than a child entity within the Organization Aggregate.

**Justification:**

- **Enterprise Scale:** Organizations may contain hundreds of thousands or millions of memberships.
- **Independent Lifecycle & Transactions:** Membership requires independent lifecycle management and independent transactional boundaries.
- **Avoid Aggregate Contention:** If Membership were a child of Organization, every assignment or removal would lock the entire Organization aggregate, causing massive concurrency bottlenecks.
- **Lightweight Organizations:** The Organization Aggregate must remain lightweight and focused strictly on structural definition and hierarchy.

**Status:** This decision is intentional, frozen, and must not be changed without an official ARB revision.

## 23. Official ARB Decision

The Enterprise Organization Management Architecture is officially **APPROVED** (Revision: 5.3.0) and frozen as the permanent architecture baseline.

**From this point forward:**

- No architectural redesign is permitted.
- Organization is the Single Source of Truth for organizational structures.
- Identity remains the sole owner of Identity.
- Authorization remains the sole owner of Roles, Permissions and Policies.
- Organization must reference identities only through IdentityId.
- Membership shall remain an Aggregate Root as documented in the approved ADR.
- Organization Types must remain configurable and must never become hardcoded.
- Hierarchy validation must permanently guarantee unlimited depth without circular relationships.
- Any future architectural modification requires an official ARB revision.

---

### Navigation

- **Previous**: [Phase 5.2 Authorization Implementation Baseline](../Authorization/phase-05-02-authorization-implementation-baseline.md)
- **Next**: [Phase 5.3 Organization Implementation Baseline](phase-05-03-organization-implementation-baseline.md)
