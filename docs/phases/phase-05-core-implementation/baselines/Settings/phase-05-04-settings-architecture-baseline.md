# MANARATAK 2.0: Phase 5.4 Settings Architecture Baseline

## 1. Document Information

**Document Type:** Architecture Design Document
**Phase:** 5.4
**Platform:** Enterprise Settings Platform
**Status:** APPROVED BASELINE (Revision: 5.4.0)
**Date:** 2026-07-16

## 2. Vision

To provide a highly scalable, fully dynamic, and strongly typed enterprise configuration engine that definitively answers: "How is enterprise configuration managed?"

## 3. Purpose

The Settings Platform acts as the single source of truth for all configuration management across the enterprise. It centralizes global, system, user, and organization-level settings into a unified, versioned, and auditable platform, completely decoupling configuration state from hardcoded application logic and external environment variables within the business domain.

## 4. Scope

This architecture encompasses the domain modeling, validation rules, and use case orchestration required to manage dynamic configuration parameters, feature flags, and localization settings. It strictly adheres to Clean Architecture, Domain-Driven Design (DDD), and SOLID principles, maintaining absolute isolation from other business domains like Identity, Authorization, and Organization.

## 5. Responsibilities

The Settings Platform is responsible ONLY for:

- Global Settings
- System Settings
- User Settings
- Organization Settings
- Localization Settings
- Regional Settings
- Feature Flags
- Configuration Profiles
- Configuration Categories
- Configuration Validation
- Configuration Versioning
- Settings History
- Settings Events

## 6. Non-Responsibilities

This platform MUST NOT contain:

- Authentication
- Authorization
- Identity Management
- Organizations
- Membership
- Students, Universities, Scholarships, Courses, Countries
- Import Framework
- CMS, Files, Media
- Notifications

## 7. Bounded Context

**Context Name:** Settings Context
**Domain:** Enterprise Configuration (EC) Subdomain
**Classification:** Core Domain
**Language:** SettingDefinition, SettingAssignment, Scope, Precedence, FeatureFlag, ConfigurationResolution, Version.

## 8. Core Concepts

- **Setting Definition:** The schema and metadata defining a setting (e.g., its key, namespace, expected data type, default value, and validation rules).
- **Setting Assignment:** The actual concrete value assigned to a Setting Definition within a specific scope.
- **Scope & Hierarchy:** The contextual boundary in which a setting value applies. The platform supports hierarchical scopes, minimally including:
  - **Global:** Applies enterprise-wide unless overridden.
  - **Organization:** Applies to a specific `OrganizationId`. Overrides Global.
  - **Identity:** Applies to a specific `IdentityId`. Overrides Organization and Global.
- **Scope Precedence:** Conflict resolution is strictly determined by scope specificity. Identity > Organization > Global.
- **Feature Flag:** A specialized boolean setting used to toggle application features at runtime.
- **Versioning Governance:** All modifications to setting values produce a new version, preserving an immutable audit trail. Rollbacks must never modify historical versions; instead, a rollback creates a new version derived from a previous version.

## 9. Aggregate Design

The domain is structured around the following Aggregate Roots.

### 9.1 SettingDefinition (Aggregate Root)

- **Description:** Defines _what_ a setting is. It dictates the allowed data types, the unique namespaced key, default values, and validation constraints.
- **Justification:** The lifecycle of a configuration's schema (creation, deprecation, constraint changes) is entirely independent of the values assigned to it across thousands of different users or organizations. Treating it as an independent Aggregate Root prevents global locks when assigning values.
- **Transactional Boundary:** Creating, modifying the schema, or deprecating a setting.

### 9.2 SettingAssignment (Aggregate Root)

- **Description:** Binds a concrete value to a `SettingDefinition` within a specific `Scope`.
- **Justification:** An enterprise may have one `SettingDefinition` (e.g., `theme.color`) but millions of `SettingAssignment`s (one for each user/identity). Modeling `SettingAssignment` as a separate Aggregate Root ensures that updating one user's setting does not contend with another user's update or lock the central definition.
- **Transactional Boundary:** Assigning a value, updating a value (generating a new version), or performing a rollback for a given scope.

## 10. Entities

- **SettingVersion:** An immutable entity within the `SettingAssignment` Aggregate representing a historical record of a setting's value, including the timestamp and the author of the change.

## 11. Value Objects

- **NamespacedKey:** Encapsulates the dot-notation or segmented identifier of a setting (e.g., `ui.theme.default`).
- **SettingValueData:** A polymorphic value object holding the actual data, strongly typed according to the definition (e.g., StringValue, NumberValue, BooleanValue).
- **ScopeIdentifier:** Represents the context and level of the setting (e.g., `Level: Identity, Id: 123`).

## 12. Domain Services

- **ConfigurationValidationService:** Separates configuration validation from persistence. It ensures that a proposed `SettingValueData` conforms strictly to the rules, data type, and constraints established by the `SettingDefinition` before an assignment is saved. Repositories must never validate configuration semantics.
- **ConfigurationResolutionService:** Responsible for resolving the effective configuration for a given context by combining scopes according to strict precedence rules (Identity > Organization > Global). This algorithm belongs entirely to the Domain.

## 13. Repository Contracts

Repositories expose generic Specification-based querying. They strictly implement persistence contracts and contain no validation or business logic.

- **ISettingDefinitionRepository:**
  - `save(definition: SettingDefinition): Promise<void>`
  - `findBy(specification: ISpecification<SettingDefinition>): Promise<SettingDefinition[]>`
- **ISettingAssignmentRepository:**
  - `save(assignment: SettingAssignment): Promise<void>`
  - `findBy(specification: ISpecification<SettingAssignment>): Promise<SettingAssignment[]>`

## 14. Business Rules

- **Dynamic Definition:** The system must not hardcode settings into enums or application properties. All settings are data-driven.
- **Immutable Versioning:** A `SettingAssignment` update does not overwrite the past; it appends a new `SettingVersion`. History is immutable. Rollbacks are explicit append-only operations.
- **Type Safety:** The platform strictly enforces that assigned values match the type declared in the Definition. Validation is executed by the Domain Services, not the Repositories.
- **Environment Isolation:** The Domain Layer has absolutely no knowledge of `.env`, `process.env`, or environment variables. Infrastructure Adapters may map environment variables to definitions/assignments, but the domain remains pure.

## 15. Configuration Lifecycle

1. **Definition:** A new configuration key is defined, typed, and registered within a namespace.
2. **Assignment:** A value is assigned to the definition within a specific scope. Domain Services validate the assignment.
3. **Modification:** The value is updated, generating a new immutable version and emitting an event.
4. **Resolution:** The `ConfigurationResolutionService` dynamically calculates the effective setting by cascading overrides based on scope precedence.
5. **Rollback:** An assignment is reverted by appending a new version containing the historical state.
6. **Deprecation/Removal:** The definition is marked obsolete, and associated assignments are archived.

## 16. Domain Events

Domain Events represent only business-significant structural changes to the configuration landscape. Operational logging belongs exclusively to the Logging Platform.

- `SettingDefinitionCreatedEvent`
- `SettingDefinitionUpdatedEvent`
- `SettingValueAssignedEvent`
- `SettingValueUpdatedEvent`
- `SettingValueRolledBackEvent`

## 17. Cross-Platform Relationships

- **Identity Platform:** The Settings Platform uses `IdentityId` within a `ScopeIdentifier` to store user-specific settings. It does not know what an Identity is.
- **Phase 11 (Universities) & Phase 21 — Enterprise Career & Alumni Platform (recruitment employer metadata only):** The Settings Platform uses `OrganizationId` within a `ScopeIdentifier` to store org-wide settings.
- **Other Platforms:** All platforms consume configurations through public contracts (via `ConfigurationResolutionService`) without coupling to the Settings internal schema.

## 18. Architectural Constraints

- **Layer Isolation:** Domain must have zero external dependencies (no ORMs, no framework imports).
- **Dependency Inversion:** Infrastructure components implement interfaces defined in the Domain or Application layers.
- **Provider Neutrality:** The definition and assignment mechanisms must be agnostic of the underlying database or configuration provider (e.g., Redis, PostgreSQL, Consul).
- **Clean Architecture:** Use Cases orchestrate logic; Entities and Domain Services encapsulate business rules.

## 19. Risks

- **Resolution Latency:** Calculating effective settings (cascading from Global -> Org -> Identity) on the fly can be slow. **Mitigation:** Implement aggressive caching or materialized configuration profiles at the infrastructure layer behind the Domain Service interfaces.
- **Schema Drifts:** Removing a Setting Definition that is still expected by a consumer platform. **Mitigation:** Use deprecation flags and impact analysis before hard-deleting definitions.

## 20. Recommendations

- Utilize the Specification pattern extensively in Application Use Cases to keep querying flexible and decoupled from the persistence layer.
- Cache resolved configuration profiles aggressively using infrastructure-level decorators.

## 21. Architecture Decision

**Status:** APPROVED (Revision: 5.4.0) - BASELINE FROZEN
**Notes:** Architecture conforms to all Phase 5.4 mandatory refinements, ensuring an auditable, immutable, and fully decoupled enterprise configuration engine.

## 22. Official ARB Decision

The Enterprise Settings Platform Architecture is officially **APPROVED** (Revision: 5.4.0) and frozen as the permanent architecture baseline.

**From this point forward:**

- No architectural redesign is permitted.
- Settings remains the sole owner of enterprise configuration.
- Configuration Resolution shall always be performed through ConfigurationResolutionService.
- Configuration Versioning shall remain immutable.
- Rollback shall always create a new version and must never modify historical versions.
- Configuration Validation belongs exclusively to Domain Services.
- Repositories remain persistence-only.
- Environment variables remain Infrastructure concerns only.
- Any future architectural modification requires an official ARB revision.

---

## 23. Phase 06 Import Foundation Integration Note

- **Source Credentials & Configuration:** Settings Platform provides the underlying dynamic configuration and secrets management foundation for source credentials, API rate limits, and connector feature flags.
- **Ownership Boundary:** Settings provides dynamic configuration resolution abstractions only. Phase 06 Import Foundation owns source connector definitions, connector execution, and import orchestration.

---

### Navigation

- **Previous**: [Phase 5.3 Organization Implementation Baseline](../Organization/phase-05-03-organization-implementation-baseline.md)
- **Next**: [Phase 5.4 Settings Implementation Baseline](phase-05-04-settings-implementation-baseline.md)
