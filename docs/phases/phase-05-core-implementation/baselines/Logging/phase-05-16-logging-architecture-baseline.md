# MANARATAK 2.0: Phase 5.16 Logging Architecture Baseline

## Architecture Baseline Report

**Status:** APPROVED  
**Revision:** 5.16.0  
**Phase:** 5.16  
**Architecture Baseline:** FROZEN  
**Date:** 2026-07-16

---

## 1. Vision

To provide a provider-neutral, logical Single Source of Truth (SSoT) for the definition, governance, and lifecycle management of logging intents across the MANARATAK 2.0 ecosystem. The Logging Foundation establishes the semantic framework for what is being logged and why, without coupling to specific log collectors, aggregators, or storage infrastructure.

## 2. Purpose

The Logging Foundation governs the logical modeling of log entries. It enables consistent log referencing across bounded contexts, ensuring that log definitions, classifications, and ownership are centrally managed. It separates the "intent to log" from the "execution of logging." Business domains must reference Log Entries exclusively through `LogReference`. `LogEntryId` remains strictly internal.

## 3. Scope

### 3.1 In-Scope

- **Logical Log Modeling:** Defining the abstract structure and intent of what is being logged.
- **Log Identity & Referencing:** Global identification via immutable references (`LogReference`).
- **Classification Definition:** Modeling logical log categories and severity levels.
- **Version Management:** Semantic versioning of log definitions.
- **Lifecycle Governance:** Managing the lifecycle states of the log entry definition itself (e.g., Created, Activated, Archived).
- **Ownership Assignment:** Neutral referencing of logging owners via `LogOwnerReference`.
- **Log Metadata:** Abstract structural metadata for log enrichment intent.

### 3.2 Out-of-Scope (The Platform Must Never Know)

- **Log Writing & Collection:** No knowledge of `console.log`, file writes, buffer management, sidecar agents, or shipping logic.
- **Log Aggregation & Persistence:** No knowledge of log aggregators, storage engines, or indexing structures.
- **Log Indexing & Search:** No knowledge of search metadata, query syntax, or search engines.
- **Log Visualization & Analysis:** No knowledge of dashboard rendering, visual charts, or observability platforms.
- **Retention & Compliance Execution:** No knowledge of retention policies or compliance shipping.
- **Infrastructure Logging:** No knowledge of system-level logs or infrastructure-specific outputs.

Actual log writing, collection, shipping, indexing, persistence, retention execution, and visualization belong exclusively to Infrastructure.

## 4. Bounded Context

The Logging Foundation operates as a **Generic Subdomain**. It provides supporting logging metadata and governance to other Bounded Contexts. Business domains reference logical log definitions through `LogReference` to declare logging requirements for their processes without technical leakage.

---

## 5. Domain Model

### 5.1 Aggregate Roots

#### 5.1.1 LogEntry

The Aggregate Root representing a logical logging definition/intent.

- **LogEntryId:** Strictly internal, immutable aggregate identifier.
- **LogReference:** Official, immutable cross-context reference Value Object.
- **LogOwnerReference:** Provider-neutral owner identifier Value Object.
- **LogDefinition:** Immutable blueprint of the logging intent (structure, message template).
- **LogClassification:** Immutable declaration of logical categories (e.g., AUDIT, SECURITY, OPERATIONAL).
- **LogMetadata:** Immutable logical annotations for classification and enrichment intent.
- **LogVersion:** Immutable semantic version of the definition.
- **LogLifecycle:** The current governing state of the log entry definition itself.
- **LoggingIntent:** Logical declaration of why the log exists.

**Mandatory Purity Rules:**
LogEntry must never contain:

- Business entities (Students, Users, etc.).
- Log payloads or actual log data.
- Storage implementations or database references.
- Index structures or search-optimized metadata.
- Runtime logging state or execution telemetry.
- Infrastructure execution details or log-shipper configurations.

### 5.2 Value Objects

- **LogReference:** The exclusive cross-context identifier. All external layers must use this reference.
- **LogOwnerReference:** A generic abstraction for logging ownership. The Logging Foundation must never own business entities. Every LogEntry references its logical owner only through this generic Value Object. The platform must never understand the business meaning of the owner.
- **LogDefinition:** Permanently immutable collection of log message templates, required fields, and structural intent.
- **LogClassification:** Permanently immutable declaration of logical severity (INFO, WARN, ERROR) and category.
- **LogVersion:** Permanently immutable semantic structural version (Major, Minor, Patch).
- **LogMetadata:** Map-based logical annotations for classification without infrastructure leakage.

### 5.3 Enums

- **LogLifecycleState:**
  - `CREATED`: Log definition registered but not yet active.
  - `ACTIVATED`: Log definition is official and available for cross-context referencing.
  - `DEPRECATED`: Log definition remains available but its use is discouraged.
  - `ARCHIVED`: Log definition is logically retired.

---

## 6. Domain Services

- **LogValidationService:** Ensures a log definition is logically sound and consistent with enterprise governance rules.
- **LogLifecycleService:** Orchestrates logical transitions between lifecycle states based on core domain rules.

## 7. Repository Contracts

Repositories must follow the **Specification Pattern** exclusively. No repository-specific lookup methods are permitted.

- **ILogEntryRepository:**
  - `save(logEntry: LogEntry): Promise<void>`
  - `findBy(specification: ISpecification<LogEntry>): Promise<LogEntry[]>`

---

## 8. Business Rules

- **Identity Secrecy:** External contexts must never expose or utilize the internal `LogEntryId`.
- **Definition Immutability:** Once a `LogDefinition` is assigned to a `LogVersion`, it can never be changed.
- **Versioning Requirement:** Any structural change to a log's definition or classification requires the creation of a completely new `LogEntry` entity with a new version.
- **Owner Neutrality:** Owners are treated as opaque identifiers; the foundation carries no business logic regarding owner types (Students, Universities, etc.).
- **Lifecycle Integrity:** Transitions must follow authorized paths managed by the `LogLifecycleService`.

---

## 9. Domain Events

Events are restricted to business-significant lifecycle transitions only.

- **LogEntryCreatedEvent:** Dispatched when a new logging intent is registered.
- **LogEntryActivatedEvent:** Dispatched when a log definition becomes available for consumption.
- **LogVersionPublishedEvent:** Dispatched when a new version of a log definition is published.
- **LogEntryDeprecatedEvent:** Dispatched when a log definition is marked as deprecated.
- **LogEntryArchivedEvent:** Dispatched when a log definition is logically retired.

Operational events related to log writing, collection, shipping, aggregation, storage, indexing, visualization, or infrastructure execution are strictly forbidden.

---

## 10. Architectural Decision Records (ADR)

### ADR-1: Provider Neutrality

- **Decision:** The Domain and Application layers shall contain absolutely no references to logging engines, storage providers, or infrastructure SDKs.
- **Rationale:** To maintain absolute decoupling from the rapidly evolving logging and observability landscape.

### ADR-2: Logging Ownership

- **Decision:** Logging intents are owned by logical organizational references via `LogOwnerReference`.
- **Rationale:** Decouples logging governance from specific business entities or infrastructure-level access controls.

### ADR-3: Log Definition Immutability

- **Decision:** `LogDefinition`, `LogClassification`, and `LogVersion` are permanently immutable.
- **Rationale:** Any modification requires the creation of a completely new `LogEntry` with a new `LogReference`. This ensures reference stability and an immutable audit trail of logging intent.

### ADR-4: Logging Lifecycle Ownership

- **Decision:** The Domain owns ONLY the logical lifecycle of log definitions.
- **Rationale:** Physical logging, collection, shipping, indexing, storage, retention execution, and visualization belong exclusively to Infrastructure. The Domain manages the "intent" of the log, while Infrastructure manages the "realization" of that intent.

### ADR-5: Logging Boundary

- **Decision:** The Domain defines ONLY logical logging intent.
- **Rationale:** Actual logging execution (writing to output, shipping to aggregators, persistence) remains entirely outside the Domain boundary to maintain provider neutrality and layer isolation.

### ADR-6: Classification Boundary

- **Decision:** The Domain defines only the **logical classifications**. The mapping to infrastructure-specific severity levels belongs to the Infrastructure layer.
- **Rationale:** Ensures the domain remains focused on semantic modeling rather than technical log formatting.

### ADR-7: Versioning Boundary

- **Decision:** Every new log definition version must be treated as a unique structural marker.
- **Rationale:** Supports enterprise-scale dependency management and auditability without side effects.

---

## 11. Architectural Constraints

- **Dependency Rule:** `Domain <- Application <- Infrastructure <- API`.
- **Identifier Secrecy:** The `LogEntryId` must never leak across context boundaries.
- **Zero Infrastructure Dependency:** No third-party logging or observability types are permitted in the Domain.

## 12. Risks & Recommendations

- **Risk:** Developers might attempt to include PII (Personally Identifiable Information) patterns in log definitions.
- **Recommendation:** Implement a policy in the `LogValidationService` to flag or prevent the definition of log templates that explicitly request sensitive data fields.
- **Risk:** Confusion between a log _definition_ (managed here) and a log _instance_ (a specific line written to a file).
- **Recommendation:** Maintain strict nomenclature—the foundation manages `LogEntry` definitions; infrastructure handles the generation of log instances.

---

## 13. Final Architecture Certification

The Architecture Review Board (ARB) has completed the final review of the **Phase 5.16 — Enterprise Logging Foundation** architecture and certifies that:

- **LogReference:** Established as the official cross-context Log Entry reference.
- **LogEntryId:** Remains strictly internal to the Logging Foundation.
- **LogOwnerReference:** Exclusive abstraction for referencing external ownership.
- **Aggregate Purity:** `LogEntry` contains only provider-neutral metadata, immutable log definitions, immutable log classifications, immutable log version information, log lifecycle metadata, and logical logging intent.
- **Absolute Immutability:** `LogDefinition`, `LogClassification`, and `LogVersion` are permanently immutable. Any modification requires the creation of a completely new `LogEntry` with a new `LogReference`.
- **Separation of Concerns:** Log Definition is completely separated from Logging Execution. The Domain owns only logical lifecycle and intent; Infrastructure owns log writing, collection, shipping, aggregation, indexing, persistence, retention execution, search, and visualization.
- **Design Integrity:** Repository contracts follow the Specification Pattern, and Domain Events are restricted to business-significant lifecycle transitions.

---

## 14. Official ARB Decision

```
================================================================================
                       OFFICIAL ARB DECISION: APPROVED
================================================================================
Phase:                  5.16 — Logging Foundation
Revision:               5.16.0
Status:                 APPROVED
Architecture Baseline:  FROZEN
================================================================================
```

The Enterprise Logging Foundation Architecture is hereby declared the permanent **Architecture Baseline** for Phase 5.16.

No further architectural modifications, redesigns, structural changes, feature additions, or scope expansions are permitted unless initiated through a formal Architecture Review Board (ARB) Change Request approved by the Project Owner.

---

## 15. Phase 06 Import Foundation Integration Note

- **Secret-Safe Log Templates:** Logging Foundation models log definitions (`LogReference`, `LogDefinition`, `LogClassification`) to ensure import operations output secret-safe structured logs without leaking credentials, passwords, or raw tokens.
- **Ownership Boundary:** Logging Foundation provides log templates and classification metadata only. Phase 06 Import Foundation produces operational logs during import execution without Logging Foundation owning import domain models or execution logic.

---

### Navigation

- **Previous**: [Phase 5.15 Monitoring Implementation Baseline](../Monitoring/phase-05-15-monitoring-implementation-baseline.md)
- **Next**: [Phase 5.16 Logging Implementation Baseline](phase-05-16-logging-implementation-baseline.md)
