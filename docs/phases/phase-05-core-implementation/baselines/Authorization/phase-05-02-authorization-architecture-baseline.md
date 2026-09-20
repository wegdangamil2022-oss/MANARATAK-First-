# MANARATAK 2.0: Phase 5.2 Architecture Baseline

## 1. Document Information

**Document Type:** Architecture Design Document
**Phase:** 5.2
**Platform:** Enterprise Authorization Platform
**Status:** APPROVED
**Revision:** 5.2.0
**Date:** 2026-07-16

## 2. Vision

To provide a secure, provider-neutral, and highly scalable enterprise platform that definitively and exclusively answers the question: "What is this Identity allowed to do?"

## 3. Purpose

The Authorization Platform centralizes all access control decisions across the enterprise. It decouples the definition of roles, permissions, policies, and role assignments from the business platforms that consume them, ensuring a single, authoritative source for access governance.

## 4. Scope

This architecture covers the domain modeling, use case orchestration, and abstract persistence mechanisms required to manage and evaluate authorizations. It strictly adheres to Clean Architecture, Domain-Driven Design (DDD), and SOLID principles, maintaining absolute isolation from external infrastructure and identity management logic.

## 5. Responsibilities

The Authorization Platform is responsible ONLY for:

- Roles
- Permissions
- Permission Groups
- Policies
- Role Assignments
- Authorization Evaluation
- Permission Resolution
- Authorization Decisions
- Access Rules
- Permission Inheritance
- Authorization Events

## 6. Non-Responsibilities

This platform MUST NOT contain:

- Authentication
- Passwords
- JWT
- Sessions
- Refresh Tokens
- OAuth
- OpenID
- User Profiles
- Identity lifecycle
- Organizations, Teams, Departments
- Students, Scholarships, Universities, Courses
- Files, Media
- Notifications
- Import Framework

## 7. Bounded Context

**Context Name:** Authorization Context
**Domain:** Identity & Access Management (IAM) Subdomain
**Classification:** Core Domain
**Language:** Role, Permission, Policy, RoleAssignment, AccessDecision, Resource, Action.

## 8. Core Concepts

- **IdentityId:** The unique identifier of an external entity (managed by the Identity Platform). Authorization knows only this ID.
- **Permission:** A fundamental right to perform an Action on a Resource. Modeled as an immutable concept within a globally managed catalog.
- **Role:** A named collection of Permissions and Policies that can be assigned to an Identity.
- **Policy:** A conditional access rule evaluated at runtime (e.g., "allowed if time is between 9 AM and 5 PM").
- **Role Assignment:** The binding between an IdentityId and a Role.

## 9. Aggregate Design

The domain is structured around the following Aggregate Roots:

### 9.1 Role (Aggregate Root)

- **Description:** A defined business function represented as a collection of permissions and policies.
- **Rules:** Cannot have circular inheritance with other roles.

### 9.2 Policy (Aggregate Root)

- **Description:** Encapsulates dynamic, conditional access rules. The domain owns the policy model, while the evaluation mechanism is abstracted.
- **Rules:** Must remain provider-neutral.

### 9.3 RoleAssignment (Aggregate Root)

- **Description:** Binds a Role to an `IdentityId`.
- **Rules:**
  - Must never reference an Identity directly beyond the `IdentityId`.
  - Authorization never owns Identity lifecycle. If an Identity disappears, Authorization reacts only through published events. No direct dependency is allowed.

### 9.4 Architectural Justification: Permission

**Decision:** Permission is NOT an Aggregate Root.
**Justification:** Permission is better modeled as a globally immutable catalog (a Value Object or immutable entity within a specialized catalog aggregate) referenced by Roles, instead of an independently evolving aggregate. Permissions (e.g., `document:read`) are structural constants in the system. They do not have complex independent lifecycles; they are asserted by the system and grouped by Roles.

## 10. Entities

- **PermissionGroup:** Groups related permissions logically. Must forbid circular inheritance.

## 11. Value Objects

- **IdentityId:** Encapsulates the external identity reference.
- **PermissionReference:** An immutable reference to a specific permission in the catalog.
- **ResourceUrn:** Identifies the target resource for a permission.
- **Action:** Identifies the operation (e.g., `CREATE`, `READ`, `UPDATE`, `DELETE`).
- **AccessDecision:** The result of an authorization evaluation (e.g., `GRANTED`, `DENIED`), including reasons.

## 12. Domain Services

- **AuthorizationEvaluatorService:** Coordinates Roles, Policies, and Permissions to render an `AccessDecision`.
- **InheritanceValidatorService:** Ensures that no circular inheritance loops exist between Roles or Permission Groups.

## 13. Repository Contracts

Repositories expose generic Specification-based querying instead of growing many lookup methods over time. They remain implementation-neutral.

- **IRoleRepository:**
  - `save(role: Role): Promise<void>`
  - `findBy(specification: ISpecification<Role>): Promise<Role[]>`
- **IPolicyRepository:**
  - `save(policy: Policy): Promise<void>`
  - `findBy(specification: ISpecification<Policy>): Promise<Policy[]>`
- **IRoleAssignmentRepository:**
  - `save(assignment: RoleAssignment): Promise<void>`
  - `findBy(specification: ISpecification<RoleAssignment>): Promise<RoleAssignment[]>`

## 14. Business Rules

- **Generic Structure:** Roles, permissions, and policies are dynamic data. The platform must never hardcode business roles (e.g., "Admin", "Student").
- **Cyclic Inheritance Prevention:** The system must explicitly reject any operation that creates a circular dependency in Role or Permission Group inheritance.
- **Policy Extensibility:** Policy evaluation must be extensible through pluggable evaluators. The Domain owns the policy model, but evaluation strategies belong behind abstractions. The architecture must not bind to a single policy engine (e.g., OPA).
- **Identity Independence:** Authorization acts purely as a consumer of `IdentityId`.

## 15. Authorization Lifecycle

1. **Definition:** Roles and Policies are created and defined.
2. **Assignment:** A Role is assigned to an `IdentityId` via a `RoleAssignment`.
3. **Evaluation:** An external platform requests an authorization check. The platform resolves the `IdentityId`'s assignments, evaluates permissions and pluggable policies, and returns an `AccessDecision`.
4. **Revocation:** A `RoleAssignment` is removed or expired.

## 16. Domain Events

Domain Events represent business-significant state changes only.

- `RoleCreatedEvent`
- `RoleAssignmentCreatedEvent`
- `RoleAssignmentRevokedEvent`
- `PolicyUpdatedEvent`

**Important:** Operational logging (e.g., `AuthorizationFailedEvent` for every denied request) belongs to the Logging Platform, not to Domain Events. Domain Events must remain strictly reserved for impactful state transitions.

## 17. Cross-Platform Relationships

- **Identity Platform:** Provides the `IdentityId` and publishes lifecycle events (e.g., `IdentityPurgedEvent`). Authorization consumes these events to clean up `RoleAssignments`, maintaining eventual consistency.

## 18. Architectural Constraints

- **Layer Isolation:** Domain must have zero external dependencies (no ORMs, no framework imports).
- **Dependency Inversion:** Infrastructure components (e.g., Prisma, Policy Engines) implement interfaces defined in the Domain or Application layers.
- **Clean Architecture:** Use Cases orchestrate logic; entities encapsulate rules.

## 19. Risks

- **Performance:** Complex inheritance or deep policy evaluation paths may introduce latency. **Mitigation:** Optimize data reads and employ robust caching strategies behind repository abstractions.
- **Orphaned Assignments:** Identity deletions might not propagate immediately. **Mitigation:** Eventual consistency via robust event handling for Identity lifecycle events.

## 20. Recommendations

- Adopt a standard representation for Permissions (e.g., URNs like `urn:manaratak:resource:action`).
- Use the Specification pattern extensively in repositories to keep querying flexible and decoupled.

## 21. Architecture Decision

**Status:** APPROVED
**Revision:** 5.2.0
**Notes:** Architecture conforms to all Phase 5.2 requirements and subsequent mandatory architectural refinements. It is officially frozen as the Single Source of Truth for Enterprise Authorization across the MANARATAK 2.0 platform. No further architectural redesigns are permitted without an official ARB revision.

---

### Navigation

- **Previous**: [Phase 5.1 Identity Implementation Baseline](../Identity/phase-05-01-implementation-baseline.md)
- **Next**: [Phase 5.2 Authorization Implementation Baseline](phase-05-02-authorization-implementation-baseline.md)
