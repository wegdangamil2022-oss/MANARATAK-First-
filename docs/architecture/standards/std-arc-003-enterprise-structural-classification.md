# Standard: Enterprise Structural Classification

**Document ID:** STD-ARC-003
**Status:** Approved
**Baseline:** Enterprise Baseline
**Authority:** Architecture Review Board (ARB)
**Applicability:** Mandatory for all existing and future architecture documents.
**Title:** Enterprise Structural Classification Standard

## 1. Purpose

The purpose of this standard is to establish an unambiguous, enterprise-wide taxonomy for defining structural components within MANARATAK 2.0. It eliminates subjective interpretations of terminology such as Platform, Module, Widget, Capability, and Service, ensuring absolute consistency in architectural design, domain modeling, and technical reviews.

## 2. Scope

This standard applies to all present and future architectural designs, domain models, implementation blueprints, and technical documentation across the entire MANARATAK 2.0 ecosystem. It dictates how boundaries are classified and named.

## 3. Definitions

*   **Taxonomy:** The classification system governing structural terminology.
*   **Structural Component:** Any defined boundary of logic, data, or presentation within the enterprise architecture.
*   **Bounding Constraint:** The specific rules that limit the scope and responsibility of a classified component.

## 4. Classification Principles

1.  **Semantic Precision:** The name of a structure must exactly match its architectural classification constraint.
2.  **Hierarchical Ownership:** Larger structures (e.g., Platforms) govern smaller structures (e.g., Modules).
3.  **Independence Level:** Classification is determined by the component's degree of autonomy, state ownership, and deployment independence.
4.  **No Ambiguity:** A component cannot simultaneously be classified as a Module and a Service. It must fit exactly one structural definition.

## 5. Classification Precedence

When multiple classifications appear applicable, architects must resolve ambiguity by applying the following structural precedence hierarchy (highest to lowest). If a component meets the criteria for a higher classification, it must be classified as such, overriding any lower-tier matches.

**Platform**
↓
**Module**
↓
**Service**
↓
**Capability**
↓
**Widget**

*Example:* If a component encapsulates business logic (Module trait) but also completely owns an independent macroscopic data domain (Platform trait), it must be classified as a **Platform** because Platform precedence overrides Module precedence.

## 6. Decision Rules

When classifying a new structural component, architects must evaluate:
1.  Does it own its own data state?
2.  Does it serve multiple bounded contexts or just one?
3.  Is it a deployable unit or an embeddable presentation component?
4.  Does it orchestrate business processes or provide a generic functional utility?

Based on these answers, the component must be assigned to one of the criteria defined below.

## 7. Architecture Decision Flow

To ensure a deterministic, architecture-driven classification process, architects must follow this enterprise decision flow before creating any new structural component:

1.  **Does it represent a macroscopic business domain and maintain its own authoritative persistence (SSoT)?**
    *   **Yes:** Classify as a **Platform**.
    *   **No:** Proceed to step 2.
2.  **Does it own a specific subdomain of data and business logic, but structurally reside within a larger Platform?**
    *   **Yes:** Classify as a **Module**.
    *   **No:** Proceed to step 3.
3.  **Is it a highly autonomous execution unit focused on a distinct technical operation or external integration, without macroscopic data ownership?**
    *   **Yes:** Classify as a **Service**.
    *   **No:** Proceed to step 4.
4.  **Is it an abstract business or technical ability realized by orchestrating other systems, without direct logic or persistence?**
    *   **Yes:** Classify as a **Capability**.
    *   **No:** Proceed to step 5.
5.  **Is it a purely presentational, embeddable UI component that derives all state from a parent container?**
    *   **Yes:** Classify as a **Widget**.
    *   **No:** Reject the component design. It does not fit the Enterprise Structural Classification Standard.

## 8. Platform Criteria

A **Platform** is the highest-level architectural boundary within the enterprise.
*   **Data Ownership:** Must maintain its own authoritative state (SSoT) via dedicated persistence mechanisms.
*   **Scope:** Represents a massive, macroscopic business domain (e.g., Finance, AI, Student Tools).
*   **Autonomy:** Fully autonomous. Operates independently and exposes capabilities via strict contracts or APIs.
*   **Composition:** Contains multiple Modules, Services, and Capabilities.

**Negative Classification Rules (A Platform MUST NOT):**
*   Exist without owning a bounded business domain.
*   Be created only because the project or codebase becomes large.
*   Duplicate the domain or responsibilities of another Platform.
*   Exist only to organize source code or mono-repo packages.

## 9. Module Criteria

A **Module** is a cohesive, bounded subset of business logic within a Platform.
*   **Data Ownership:** Owns a specific subdomain of data, but relies on its parent Platform's infrastructure.
*   **Scope:** Represents a specific business process or entity group (e.g., Scholarship Application Module inside the Application Platform).
*   **Autonomy:** Semi-autonomous. It encapsulates its logic but cannot exist outside its parent Platform.
*   **Composition:** Contains domain logic, use cases, and localized services.

**Negative Classification Rules (A Module MUST NOT):**
*   Become an independent enterprise domain that serves the whole system directly.
*   Duplicate the functionality of another Module.
*   Bypass its parent Platform to expose top-level APIs to the enterprise unless explicitly routed.

## 10. Service Criteria

A **Service** is a stateless or strictly isolated execution unit that performs a specific technical or business function.
*   **Data Ownership:** Typically stateless or operates entirely on data passed to it. If stateful, it is highly isolated (e.g., a caching service).
*   **Scope:** Represents a distinct operation or integration (e.g., Email Notification Service, Payment Gateway Service).
*   **Autonomy:** Highly autonomous execution, but structurally subservient to the Platform or Module that invokes it.
*   **Composition:** Contains execution logic and external integration points.

**Negative Classification Rules (A Service MUST NOT):**
*   Own enterprise business domains or act as the SSoT for macroscopic entities.
*   Become a replacement or synonym for a Platform.
*   Hold orchestrating logic that spans multiple bounded contexts directly.

## 11. Capability Criteria

A **Capability** is an abstract business or technical ability possessed by the enterprise, often fulfilled by multiple Platforms or Services.
*   **Data Ownership:** Does not own data directly; it is an abstraction.
*   **Scope:** Represents "what" the system can do, rather than "how" it does it (e.g., "Multi-currency Processing Capability").
*   **Autonomy:** N/A (Abstract concept).
*   **Composition:** Realized by orchestrated Services and Platforms.

**Negative Classification Rules (A Capability MUST NOT):**
*   Own persistence or databases.
*   Implement business workflows or logic directly.
*   Have its own deployable artifact or codebase independent of the platforms realizing it.

## 12. Widget Criteria

A **Widget** is a purely presentational, embeddable UI component.
*   **Data Ownership:** Zero data ownership. Entirely state-derived or state-injected from a parent container.
*   **Scope:** Represents a self-contained visual element (e.g., Currency Converter Widget, Profile Completion Progress Bar).
*   **Autonomy:** Visually autonomous but functionally dependent on backend APIs or parent state.
*   **Composition:** Contains UI rendering logic and localized view state.

**Negative Classification Rules (A Widget MUST NOT):**
*   Contain business rules or domain logic.
*   Own backend state.
*   Communicate directly with persistence layers or databases.

## 13. Decision Matrix

| Characteristic | Platform | Module | Service | Capability | Widget |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Owns Core State?** | Yes (SSoT) | Yes (Subdomain) | No (Usually) | N/A | No |
| **Deployable Unit?** | Yes | Often inside Platform | Yes / No | N/A | Front-end only |
| **Scope Level** | Macroscopic | Subdomain | Operational | Abstract | Presentation |
| **Example** | Finance Platform | Invoicing Module | Exchange Rate Service | Audit Logging | GPA Calculator UI |

## 14. Promotion & Demotion Rules

Structural components may evolve. The following objective criteria govern their lifecycle:

*   **When a Module should become a Platform:** If a Module grows to encompass multiple disconnected subdomains, requires its own dedicated infrastructure, and is increasingly consumed by external Platforms rather than its parent, it must be promoted to a standalone Platform.
*   **When a Platform should be split:** If a Platform manages fundamentally divergent bounded contexts (e.g., Finance managing both Payments and User Identity), it must be split into two distinct Platforms to preserve SSoT.
*   **When a Service should become a Module:** If a Service begins to accrue persistent state, requires complex business validation rules, and handles subdomain orchestration beyond a simple execution task, it must be promoted to a Module.
*   **When a Capability should remain abstract:** A Capability must remain abstract indefinitely. If a single deployable unit is built to explicitly handle a Capability's logic, that unit is a Platform or Service, while the Capability remains the abstract description.
*   **When a Widget grows beyond presentation:** If a Widget begins directly fetching data via complex API orchestration, storing local business state, or executing domain logic, it must be refactored into a fully-fledged Front-End Module or its logic extracted to a backend Service.

## 15. Governance Enforcement

To ensure strict adherence to this standard across the enterprise, the following enforcement rules apply:

*   **ARB Approval:** Every new Platform requires explicit Architecture Review Board (ARB) approval and a dedicated Enterprise Architecture Phase.
*   **Review Standard:** Every architecture review must use STD-ARC-003 to validate component classification.
*   **Phase Compliance:** Every new phase must comply with this standard. Non-compliant proposals will be rejected.
*   **Conflict Resolution:** Any classification conflicts between teams or domains must be resolved using this document as the supreme authority.
*   **SSoT:** This document is the Single Source of Truth (SSoT) for structural classification across MANARATAK 2.0.
*   **Naming Convention:** Source code repositories and architecture documents must use the classified term in their nomenclature (e.g., `Enterprise Finance Platform`, not `Enterprise Finance System`).

## 16. Examples

*   **Platform:** Enterprise AI Platform (Phase 17)
*   **Module:** Scholarship Eligibility Module (within Application Platform)
*   **Service:** Translation Generation Service (within AI Platform)
*   **Capability:** Real-time Notifications (Fulfilled by Notification Platform)
*   **Widget:** "Upcoming Deadlines" Sidebar Card (in Student Portal)

## 17. Architecture Review Checklist

*   [ ] Does the proposed component's classification match its data ownership profile?
*   [ ] Is the terminology used consistently throughout the architecture document?
*   [ ] If proposed as a Platform, does it genuinely represent a macroscopic domain?
*   [ ] If proposed as a Widget, is it guaranteed to lack backend state ownership?
*   [ ] Does the classification adhere to the Decision Matrix and Decision Flow in STD-ARC-003?
*   [ ] Does the component strictly observe all relevant "MUST NOT" negative rules?
