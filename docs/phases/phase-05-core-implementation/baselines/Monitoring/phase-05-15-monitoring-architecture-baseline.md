# MANARATAK 2.0: Phase 5.15 Monitoring Architecture Baseline

## Architecture Baseline Report

**Status:** APPROVED  
**Revision:** 5.15.0  
**Phase:** 5.15  
**Architecture Baseline:** FROZEN  
**Date:** 2026-07-16

---

## 1. Vision

To provide a provider-neutral, logical Single Source of Truth (SSoT) for the definition, governance, and lifecycle management of monitoring intents across the MANARATAK 2.0 ecosystem. The Monitoring Foundation establishes the semantic framework for what is being monitored and why, without coupling to specific metrics engines, telemetry systems, or alerting infrastructure.

## 2. Purpose

The Monitoring Foundation governs the logical modeling of monitors. It enables consistent monitor referencing across bounded contexts, ensuring that monitoring definitions, expected states, and ownership are centrally managed. It separates the "intent to monitor" from the "execution of monitoring." Business domains MUST reference monitors exclusively through `MonitorReference`.

## 3. Scope

### 3.1 In-Scope

- **Logical Monitor Modeling:** Defining the abstract nature of what is being monitored.
- **Monitor Identity & Referencing:** Global identification via immutable references (`MonitorReference`).
- **State Definition:** Modeling logical monitor states and transitions.
- **Version Management:** Semantic versioning of monitor definitions.
- **Lifecycle Governance:** Managing the lifecycle states of the monitor itself (e.g., Created, Activated, Archived).
- **Ownership Assignment:** Neutral referencing of monitoring owners via `MonitorOwnerReference`.

### 3.2 Out-of-Scope (The Platform Must Never Know)

- **Metrics Collection & Telemetry:** No knowledge of specific data collection engines, telemetry vendors, or scraping logic.
- **Execution of Availability Probes:** No knowledge of physical pinging or endpoint probing.
- **Alerting & Incident Management:** No knowledge of notification triggers, external alert services, or messaging logic.
- **Dashboarding & Visualization:** No knowledge of visual rendering platforms, UI charts, or visual representations.
- **Instrumentation & Tracing:** No knowledge of tracing standards, logs, or traces.
- **Infrastructure Monitoring:** No knowledge of low-level system metrics (CPU, memory) or cloud-provider metrics.
- **Physical Execution:** Monitoring execution, metrics engine management, and dashboard synchronization belong exclusively to Infrastructure.

## 4. Bounded Context

The Monitoring Foundation operates as a **Generic Subdomain**. It provides supporting monitoring metadata to other Bounded Contexts. Business domains reference logical monitors through `MonitorReference` to declare monitoring requirements for their processes without technical leakage.

---

## 5. Domain Model

### 5.1 Aggregate Roots

#### 5.1.1 Monitor

The Aggregate Root representing a logical monitoring intent.

- **MonitorId:** Strictly internal, immutable aggregate identifier.
- **MonitorReference:** Official, immutable cross-context reference Value Object.
- **MonitorOwnerReference:** Provider-neutral owner identifier Value Object.
- **MonitorDefinition:** Immutable blueprint of the monitoring intent (what and how).
- **MonitorStateDefinition:** Immutable declaration of logical states (e.g., UP, DOWN, DEGRADED).
- **MonitorMetadata:** Immutable logical annotations for classification.
- **MonitorVersion:** Immutable semantic version of the definition.
- **MonitorLifecycle:** The current governing state of the monitor entity itself.
- **MonitoringIntent:** The logical declaration of why and what is being monitored.

**Mandatory Purity Rules:**
The Monitor Aggregate MUST NEVER contain:

- Business entities or domain-specific objects.
- Metrics or Telemetry payloads.
- Probing implementations or physical endpoint details.
- Alert definitions or notification logic.
- Runtime monitoring state or live health status.
- Infrastructure execution details or vendor-specific configurations.

### 5.2 Value Objects

- **MonitorReference:** The exclusive cross-context identifier. All external layers must use this reference.
- **MonitorOwnerReference:** A generic abstraction for monitoring ownership. The Monitoring Foundation MUST NOT own business entities. Every Monitor references its logical owner only through this generic Value Object. The platform MUST NEVER understand the business meaning of the owner.
- **MonitorDefinition:** Permanently immutable collection of monitoring targets, frequencies, and logical requirements.
- **MonitorStateDefinition:** Permanently immutable declaration of the logical health states the monitor can report.
- **MonitorVersion:** Permanently immutable semantic structural version (Major, Minor, Patch).
- **MonitorMetadata:** Map-based logical annotations for classification without infrastructure leakage.

### 5.3 Enums

- **MonitorLifecycleState:**
  - `CREATED`: Monitor registered but not yet active in the ecosystem.
  - `ACTIVATED`: Monitor is official and available for cross-context referencing.
  - `DEPRECATED`: Monitor remains available but its use is discouraged.
  - `ARCHIVED`: Monitor is logically retired.

---

## 6. Domain Services

- **MonitorValidationService:** Ensures a monitor definition is logically sound and consistent with enterprise governance rules.
- **MonitorLifecycleService:** Orchestrates logical transitions between lifecycle states based on core domain rules.

## 7. Repository Contracts

Repositories must follow the **Specification Pattern** exclusively. No repository-specific lookup methods are permitted.

- **IMonitorRepository:**
  - `save(monitor: Monitor): Promise<void>`
  - `findBy(specification: ISpecification<Monitor>): Promise<Monitor[]>`

---

## 8. Business Rules

- **Identity Secrecy:** External contexts must never expose or utilize the internal `MonitorId`.
- **Definition Immutability:** Once a `MonitorDefinition` is assigned to a `MonitorVersion`, it can never be changed.
- **Versioning Requirement:** Any structural change to a monitor's definition or state definition requires the creation of a completely new `Monitor` entity with a new version.
- **Owner Neutrality:** Owners are treated as opaque identifiers; the foundation carries no business logic regarding owner types or identities.
- **Lifecycle Integrity:** Transitions must follow authorized paths managed by the `MonitorLifecycleService`.

---

## 9. Domain Events

Events are restricted to business-significant lifecycle transitions only.

- **MonitorCreatedEvent:** Dispatched when a new monitoring intent is registered.
- **MonitorActivatedEvent:** Dispatched when a monitor becomes available for consumption.
- **MonitorStateChangedEvent:** Dispatched when the logical definition of states for a monitor is updated (always results in a new monitor version).
- **MonitorDeprecatedEvent:** Dispatched when a monitor is marked as deprecated.
- **MonitorArchivedEvent:** Dispatched when a monitor is logically retired.

Operational events related to metrics collection, health checks, telemetry, tracing, alerting, dashboards, or infrastructure execution are strictly forbidden.

---

## 10. Architectural Decision Records (ADR)

### ADR-1: Provider Neutrality

- **Decision:** The Domain and Application layers shall contain absolutely no references to specific metrics engines, monitoring vendors, cloud providers, or infrastructure SDKs.
- **Rationale:** To maintain absolute decoupling from the rapidly evolving monitoring and observability landscape and ensure the core foundation remains purely logical.

### ADR-2: Monitoring Ownership

- **Decision:** Monitoring intents are owned by logical organizational references via `MonitorOwnerReference`.
- **Rationale:** Decouples monitoring governance from specific business entities or infrastructure-level access controls.

### ADR-3: Monitor Definition Immutability

- **Decision:** `MonitorDefinition`, `MonitorStateDefinition`, and `MonitorVersion` are permanently immutable.
- **Rationale:** To ensure structural integrity and auditability. Any modification to a monitor's definition requires the creation of a completely new `Monitor` with a unique `MonitorReference`. No mutation path exists for these attributes.

### ADR-4: Monitoring Lifecycle Ownership

- **Decision:** The Domain owns ONLY the logical lifecycle of monitors.
- **Rationale:** Physical monitoring, telemetry, metrics collection, health checks, alert execution, tracing, and dashboard synchronization belong exclusively to Infrastructure. The Domain defines "intent"; Infrastructure performs "execution".

### ADR-5: Monitoring Boundary

- **Decision:** The Domain defines ONLY the logical monitoring intent.
- **Rationale:** Actual monitoring execution (collection, probing, alerting) remains entirely outside the Domain boundary to maintain provider neutrality and layer isolation.

### ADR-6: State Boundary

- **Decision:** The Domain defines only the **logical monitor states**. The interpretation of physical data into these states belongs to the Infrastructure layer.
- **Rationale:** Ensures the domain remains focused on semantic modeling rather than data processing.

### ADR-7: Versioning Boundary

- **Decision:** Every new monitoring definition version must be treated as a unique structural marker.
- **Rationale:** Supports enterprise-scale dependency management and auditability without side effects.

---

## 11. Architectural Constraints

- **Dependency Rule:** `Domain <- Application <- Infrastructure <- API`.
- **Identifier Secrecy:** The `MonitorId` must never leak across context boundaries.
- **Zero Infrastructure Dependency:** No third-party monitoring or telemetry types are permitted in the Domain.

## 12. Risks & Recommendations

- **Risk:** Developers might attempt to include alert thresholds or pager IDs in monitor definition metadata.
- **Recommendation:** Strictly restrict metadata to logical classification (Purpose, Criticality, Environment Intent), deferring threshold logic to specialized infrastructure providers.
- **Risk:** Confusion between the lifecycle state of the Monitor entity and the reported health state of the monitored target.
- **Recommendation:** Use distinct nomenclature (`MonitorLifecycleState` for the registry vs `MonitorStateDefinition` for the health model).

---

## 13. Final Architecture Certification

The Architecture Review Board (ARB) has completed the final review of the **Phase 5.15 — Enterprise Monitoring Foundation** architecture and certifies that:

- **MonitorReference:** Established as the official cross-context Monitor reference.
- **MonitorId:** Remains strictly internal to the Monitoring Foundation.
- **MonitorOwnerReference:** Exclusive abstraction for referencing external ownership.
- **Aggregate Purity:** `Monitor` contains only provider-neutral metadata, immutable monitor definitions, immutable monitor state definitions, immutable monitor version information, monitor lifecycle metadata, and logical monitoring intent.
- **Absolute Immutability:** `MonitorDefinition`, `MonitorStateDefinition`, and `MonitorVersion` are permanently immutable. Any modification requires a completely new `Monitor`.
- **Separation of Concerns:** Monitor Definition is completely separated from Monitoring Execution. The Domain owns only logical lifecycle and intent; Infrastructure owns metrics collection, telemetry, health checks, alert execution, tracing, and dashboard synchronization.
- **Design Integrity:** Repository contracts follow the Specification Pattern, and Domain Events are restricted to business-significant lifecycle transitions.

---

## 14. Official ARB Decision

```
================================================================================
                       OFFICIAL ARB DECISION: APPROVED
================================================================================
Phase:                  5.15 — Monitoring Foundation
Revision:               5.15.0
Status:                 APPROVED
Architecture Baseline:  FROZEN
================================================================================
```

The Enterprise Monitoring Foundation Architecture is hereby declared the permanent **Architecture Baseline** for Phase 5.15.

No further architectural modifications, redesigns, structural changes, feature additions, or scope expansions are permitted unless initiated through a formal Architecture Review Board (ARB) Change Request approved by the Project Owner.

---

## 15. Phase 06 Import Foundation Integration Note

- **Import Telemetry & Metrics:** Monitoring Foundation models logical monitor definitions (`MonitorReference`, `MonitorDefinition`) used to track import execution telemetry, parsing throughput, staging performance, and SLO compliance.
- **Ownership Boundary:** Monitoring Foundation governs logical monitoring intents and state definitions. Phase 06 Import Foundation emits operational telemetry without Monitoring Foundation owning import execution logic or queue state transitions.

---

### Navigation

- **Previous**: [Phase 5.14 Shared Components Implementation Baseline](../SharedComponents/phase-05-14-sharedcomponents-implementation-baseline.md)
- **Next**: [Phase 5.15 Monitoring Implementation Baseline](phase-05-15-monitoring-implementation-baseline.md)
