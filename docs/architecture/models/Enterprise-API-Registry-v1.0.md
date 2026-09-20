# Enterprise-API-Registry-v1.0

## 1. Document Information

- **Title:** Enterprise API Registry
- **Version:** 1.0.2
- **Status:** Finalized — aligned with Roadmap v6.0
- **Date:** 2026-09-03
- **Owner:** Chief Enterprise Software Architect
- **Approval Authority:** Architecture Review Board (ARB)
- **Artifact Type:** Enterprise Architecture Model
- **Authority:** `docs/governance/roadmap/MANARATAK-2.0-Roadmap-v6.0.md`

> **P13 Final Source Alignment — 2026-09-03:** Re-audited against Roadmap v6.0 and the final source implementation. Ownership and dependency direction remain authoritative. Student Workspace composes P10/P11/P12 saved-item owner reads plus P13 learning and P14 certificate reads through application contracts; P24 live composition consumes P15 session/API state. Runtime/DB/E2E proof remains explicitly pending and is not certified by this document.

## 2. Purpose

This document serves as the single authoritative registry for all enterprise APIs and service contracts within the MANARATAK 2.0 architecture. Its primary purposes are to ensure enterprise-wide discoverability, prevent the duplication of APIs, enforce architectural consistency, and support rigorous enterprise governance. This is a logical architecture artifact guiding future physical implementation; it does not dictate specific URLs, endpoints, or data payloads.

## 3. API Governance

The following architectural rules govern the design and evolution of all enterprise APIs:

- **Naming Standards:** Logical API names must align perfectly with the Domain-Driven Design (DDD) Ubiquitous Language of their respective Bounded Contexts.
- **Versioning Rules:** All APIs must strictly adhere to Semantic Versioning (SemVer). Major versions represent breaking changes; minor versions represent backward-compatible additions.
- **Deprecation Policy:** A minimum 90-day sunset period is mandatory for any deprecated API. Consumers must be proactively notified via the API Registry.
- **Breaking Change Policy:** Zero tolerance for unversioned breaking changes. Any modification that removes fields, changes data types, or alters semantic meaning requires a new major version.
- **Compatibility Rules:** APIs must be designed for forward compatibility. Consumers must gracefully ignore unrecognized fields in response payloads (Tolerant Reader pattern).
- **Ownership Rules:** Every API must be exclusively owned by a single Domain Architect or Platform Architect.
- **Documentation Standards:** All synchronous APIs must eventually produce standardized, machine-readable specifications (e.g., OpenAPI/AsyncAPI) during implementation.
- **Review Process:** All new APIs and major version bumps require a formal peer-driven design review.
- **Approval Process:** Core domain APIs are approved by the Domain Architect. Cross-domain and Shared Service APIs require formal Architecture Review Board (ARB) approval.

## 4. API Lifecycle

1. **Proposal:** Domain Architect drafts the logical contract and proposes it to the ARB or peer group.
2. **Design Review:** Cross-domain consumers evaluate the proposed contract for completeness, usability, and isolation.
3. **Approval:** The ARB or Domain Architect grants formal approval to proceed to implementation.
4. **Publication:** The API specification is published to the centralized Enterprise API Developer Portal.
5. **Version Upgrade:** Non-breaking enhancements are applied directly (Minor bump). Breaking changes spin up a parallel logical contract (Major bump).
6. **Deprecation:** The legacy API version is marked as deprecated in the Registry, triggering automated alerts to registered consumers.
7. **Retirement:** The API is physically decommissioned and removed from the API Gateway routing tables.

## 5. API Categories & Logical Registry

### 5.1. Phase 11 (Universities & Institutions) APIs

- **API Name:** University Profile API
- **Owning Domain:** Phase 11 (Universities & Institutions)
- **Purpose:** Expose institutional data, campus details, and program catalogs.
- **Business Capability:** Institution Management
- **API Style:** REST / GraphQL
- **Primary Consumers:** Phase 15 (Enterprise Student Platform (Student Workspace)), Phase 12 (Scholarships)
- **Upstream Dependencies:** Academic Taxonomy
- **Downstream Dependencies:** None
- **Authentication Requirement:** Required (Service-to-Service or User Token)
- **Authorization Requirement:** Required (RBAC/ABAC)
- **Version Strategy:** Semantic
- **Lifecycle Status:** Approved for Implementation
- **Criticality:** High
- **Availability Target:** 99.99%
- **Owner Role:** Domain Architect (Univ)

### 5.2. Phase 12 (Scholarships) APIs

- **API Name:** Scholarship Discovery API
- **Owning Domain:** Phase 12 (Scholarships)
- **Purpose:** Query available scholarships and validate eligibility criteria.
- **Business Capability:** Financial Aid Administration
- **API Style:** REST
- **Primary Consumers:** Phase 15 (Enterprise Student Platform (Student Workspace))
- **Upstream Dependencies:** Phase 11 (Universities & Institutions), Academic Taxonomy
- **Downstream Dependencies:** None
- **Authentication Requirement:** Required
- **Authorization Requirement:** Required
- **Version Strategy:** Semantic
- **Lifecycle Status:** Approved for Implementation
- **Criticality:** High
- **Availability Target:** 99.99%
- **Owner Role:** Domain Architect (Schol)

### 5.3. Phase 8 (Academic Taxonomy) APIs

- **API Name:** Taxonomy Query API
- **Owning Domain:** Phase 8 (Academic Taxonomy)
- **Purpose:** Provide a unified graph of academic disciplines and standard classifications.
- **Business Capability:** Academic Classification
- **API Style:** REST / GraphQL
- **Primary Consumers:** Phase 11 (Universities & Institutions), Phase 12 (Scholarships), Phase 15 (Enterprise Student Platform (Student Workspace))
- **Upstream Dependencies:** None
- **Downstream Dependencies:** None
- **Authentication Requirement:** Required (Service-to-Service)
- **Authorization Requirement:** None (Read-only reference data)
- **Version Strategy:** Semantic
- **Lifecycle Status:** Approved for Implementation
- **Criticality:** High
- **Availability Target:** 99.99% (Heavily Cached)
- **Owner Role:** Domain Architect (Tax)

### 5.4. Phase 15 (Enterprise Student Platform / Student Workspace) APIs

- **API Name:** Student Workspace API
- **Owning Domain:** Phase 15 (Enterprise Student Platform / Student Workspace)
- **Purpose:** Manage authenticated student profile/workspace state, dashboard hydration, collections/saved references, recently viewed/history, and privacy/preferences.
- **Business Capability:** Student Workspace & Personalization
- **API Style:** REST
- **Primary Consumers:** Authenticated MANARATAK web/mobile surfaces and approved internal read-model consumers
- **Upstream Dependencies:** Owner read models from Phases 11–14 and other approved domain references as needed
- **Downstream Dependencies:** None for business-domain ownership; workspace references remain local personal state
- **Authentication Requirement:** Required
- **Authorization Requirement:** Required (Strict Owner-Only ABAC)
- **Version Strategy:** Semantic
- **Lifecycle Status:** Approved for Implementation
- **Criticality:** Critical
- **Availability Target:** 99.99%
- **Owner Role:** Domain Architect (Student)
- **Boundary:** This API is **not** a general University/Scholarship Application API. Broad application-processing ownership requires a separate explicit Roadmap/ADR decision.

### 5.4a. Phase 14 (Enterprise Certificates Platform) APIs

- **API Name:** Certificate Verification API
- **Owning Domain:** Phase 14 (Enterprise Certificates Platform)
- **Purpose:** Verify issued credential identity/status and expose authorized certificate lifecycle read models.
- **Business Capability:** Enterprise Credentialing
- **API Style:** REST / internal service contract as appropriate
- **Primary Consumers:** Phase 15 Student Workspace, Phase 23 Admin, Phase 24 Public verification composition
- **Upstream Dependencies:** Phase 13 completion **events**, not a synchronous generation API
- **Authentication Requirement:** Context-dependent; privileged lifecycle operations require authorization
- **Authorization Requirement:** Required for mutation/privileged reads
- **Version Strategy:** Semantic
- **Lifecycle Status:** Approved boundary
- **Criticality:** Critical
- **Owner Role:** Domain Architect (Certificates)

### 5.5. CMS APIs

- **API Name:** Headless Content Delivery API
- **Owning Domain:** CMS
- **Purpose:** Serve marketing assets, articles, and localized UI content.
- **Business Capability:** Content Management
- **API Style:** GraphQL / REST
- **Primary Consumers:** External Frontends
- **Upstream Dependencies:** Translation Platform
- **Downstream Dependencies:** None
- **Authentication Requirement:** Optional (Public Content)
- **Authorization Requirement:** None
- **Version Strategy:** Semantic
- **Lifecycle Status:** Approved for Implementation
- **Criticality:** Medium
- **Availability Target:** 99.9% (CDN backed)
- **Owner Role:** Platform Architect (CMS)

### 5.6. Universal Import Platform APIs

- **API Name:** Data Ingestion API
- **Owning Domain:** Universal Import Platform
- **Purpose:** Secure endpoint for external partners to push canonical data updates.
- **Business Capability:** Data Integration
- **API Style:** REST
- **Primary Consumers:** External Partners, Third-Party Systems
- **Upstream Dependencies:** None
- **Downstream Dependencies:** Event Platform
- **Authentication Requirement:** Required (Strict mTLS / API Keys)
- **Authorization Requirement:** Required
- **Version Strategy:** Semantic
- **Lifecycle Status:** Approved for Implementation
- **Criticality:** Medium
- **Availability Target:** 99.9%
- **Owner Role:** Platform Architect (UIP)

### 5.7. Translation Platform APIs

- **API Name:** Localization API
- **Owning Domain:** Translation Platform
- **Purpose:** Provide dynamic translation strings for multi-language interfaces.
- **Business Capability:** Localization
- **API Style:** REST
- **Primary Consumers:** Frontends, CMS
- **Upstream Dependencies:** None
- **Downstream Dependencies:** None
- **Authentication Requirement:** Required (Service-to-Service)
- **Authorization Requirement:** None
- **Version Strategy:** Semantic
- **Lifecycle Status:** Approved for Implementation
- **Criticality:** Low
- **Availability Target:** 99.9%
- **Owner Role:** Platform Architect (Loc)

### 5.8. AI Platform APIs

- **API Name:** AI Inference API
- **Owning Domain:** AI Platform
- **Purpose:** Abstract LLM models for text generation, semantic matching, and prompt execution.
- **Business Capability:** Artificial Intelligence
- **API Style:** REST / WebSocket
- **Primary Consumers:** All Business Domains
- **Upstream Dependencies:** None
- **Downstream Dependencies:** None
- **Authentication Requirement:** Required (Service-to-Service)
- **Authorization Requirement:** Required
- **Version Strategy:** Semantic
- **Lifecycle Status:** Approved for Implementation
- **Criticality:** Medium
- **Availability Target:** 99.9%
- **Owner Role:** Platform Architect (AI)

### 5.15. Enterprise Search APIs

- **API Name:** Unified Search API
- **Owning Domain:** Enterprise Search
- **Purpose:** Provide high-speed full-text and faceted search across the enterprise.
- **Business Capability:** Search & Discovery
- **API Style:** REST / GraphQL
- **Primary Consumers:** Frontends
- **Upstream Dependencies:** Event Platform
- **Downstream Dependencies:** None
- **Authentication Requirement:** Required
- **Authorization Requirement:** Required (Contextual Filtering)
- **Version Strategy:** Semantic
- **Lifecycle Status:** Approved for Implementation
- **Criticality:** High
- **Availability Target:** 99.99%
- **Owner Role:** Platform Architect (Srch)

### 5.16. Workflow Engine APIs

- **API Name:** Saga Coordination API
- **Owning Domain:** Workflow Engine
- **Purpose:** Trigger and monitor long-running cross-domain business processes.
- **Business Capability:** Process Automation
- **API Style:** REST / Event Interface
- **Primary Consumers:** Phase 15 (Enterprise Student Platform (Student Workspace)), Core Domains
- **Upstream Dependencies:** Event Platform
- **Downstream Dependencies:** Core Domains
- **Authentication Requirement:** Required (Service-to-Service)
- **Authorization Requirement:** Required
- **Version Strategy:** Semantic
- **Lifecycle Status:** Approved for Implementation
- **Criticality:** High
- **Availability Target:** 99.99%
- **Owner Role:** Platform Architect (WF)

### 5.17. Notification Platform APIs

- **API Name:** Unified Messaging API
- **Owning Domain:** Notification Platform
- **Purpose:** Dispatch emails, SMS, and push notifications to users.
- **Business Capability:** User Communication
- **API Style:** REST / Event Interface
- **Primary Consumers:** All Domains
- **Upstream Dependencies:** None
- **Downstream Dependencies:** None
- **Authentication Requirement:** Required (Service-to-Service)
- **Authorization Requirement:** Required
- **Version Strategy:** Semantic
- **Lifecycle Status:** Approved for Implementation
- **Criticality:** Medium
- **Availability Target:** 99.9%
- **Owner Role:** Platform Architect (Notif)

### 5.18. Analytics Platform APIs

- **API Name:** Telemetry Ingestion API
- **Owning Domain:** Analytics Platform
- **Purpose:** Receive custom business metrics and usage data (bypassing the event bus if necessary).
- **Business Capability:** Business Intelligence
- **API Style:** REST (Batch)
- **Primary Consumers:** All Domains
- **Upstream Dependencies:** None
- **Downstream Dependencies:** None
- **Authentication Requirement:** Required (Service-to-Service)
- **Authorization Requirement:** Required
- **Version Strategy:** Semantic
- **Lifecycle Status:** Approved for Implementation
- **Criticality:** Low
- **Availability Target:** 99.9%
- **Owner Role:** Data Architect

### 5.19. Authentication & Authorization APIs (IAM)

- **API Name:** Identity & Access API
- **Owning Domain:** IAM
- **Purpose:** Issue JWTs, manage sessions, and evaluate access policies.
- **Business Capability:** Security & Compliance
- **API Style:** REST (OIDC Compliant)
- **Primary Consumers:** All Frontends, All Domains
- **Upstream Dependencies:** None
- **Downstream Dependencies:** None
- **Authentication Requirement:** Required
- **Authorization Requirement:** Required
- **Version Strategy:** Semantic
- **Lifecycle Status:** Approved for Implementation
- **Criticality:** Critical
- **Availability Target:** 99.999%
- **Owner Role:** Security Architect

### 5.20. Infrastructure Interfaces (Config, Jobs, Events)

- **API Name:** Core Infrastructure Contracts
- **Owning Domain:** Shared Infrastructure
- **Purpose:** Provide dynamic config fetching, job queuing, and event publishing capabilities.
- **Business Capability:** Technical Infrastructure
- **API Style:** Internal Service Contract / RPC
- **Primary Consumers:** All Domains
- **Upstream Dependencies:** None
- **Downstream Dependencies:** None
- **Authentication Requirement:** Required (Internal Network Trust)
- **Authorization Requirement:** None
- **Version Strategy:** Semantic
- **Lifecycle Status:** Approved for Implementation
- **Criticality:** Critical
- **Availability Target:** 99.999%
- **Owner Role:** Infrastructure Architect

## 6. API Dependency Matrix

| Provider                                   | Consumer                                                   | API                        | Communication Style | Criticality |
| :----------------------------------------- | :--------------------------------------------------------- | :------------------------- | :------------------ | :---------- |
| **IAM**                                    | All Domains                                                | Identity & Access API      | Synchronous         | Critical    |
| **Academic Taxonomy**                      | Phase 11 (Universities & Institutions)                     | Taxonomy Query API         | Synchronous         | High        |
| **Phase 11 (Universities & Institutions)** | Phase 12 (Scholarships)                                    | University Profile API     | Synchronous         | High        |
| **Phase 12 (Scholarships)**                | Phase 15 (Enterprise Student Platform (Student Workspace)) | Scholarship Discovery API  | Synchronous         | High        |
| **Phase 14 (Enterprise Certificates)**    | Phase 15 / Phase 23 / Phase 24                             | Certificate Verification API | Synchronous read/command by authorization | Critical |

| **AI Platform** | Core Domains | AI Inference API | Synchronous / Async | Medium |
| **CMS** | Frontends | Headless Content Delivery | Synchronous | Medium |
| **Workflow Engine** | Core Domains | Saga Coordination API | Synchronous / Event | High |

**P13 → P14 boundary:** no synchronous Certificate Generation API is registered. Phase 13 publishes `CourseCompleted` / `LearningPathCompleted` events; Phase 14 consumes them and remains the sole credential lifecycle authority.

**Application boundary:** no general Student Application API is registered under Phase 15, and this registry does not assign broad university/scholarship application processing to P12 or P15.

## 7. Discovery Model

- **API Registry:** A centralized Developer Portal will act as the physical incarnation of this document, providing a searchable catalog of all APIs.
- **API Ownership:** Each API in the portal will explicitly list its responsible Domain Architect and Technical Lead.
- **Documentation Repository:** The portal will host auto-generated OpenAPI (Swagger) UI and Markdown integration guides.
- **Consumer Registration:** Domains consuming an API must register as "Consumers" within the portal, allowing the provider to track dependencies and issue deprecation warnings.
- **Version Tracking:** The portal will display active, deprecated, and retired versions for every logical contract.

## 8. Validation

The ARB has validated this registry against the following standards:

- **No duplicated APIs:** Responsibilities are cleanly delineated according to Bounded Contexts.
- **Clear ownership:** Every API has a named architect accountable for its lifecycle.
- **DDD alignment:** API boundaries map accurately to Aggregate Roots.
- **Bounded Context isolation:** Internal database schemas are entirely hidden behind these logical interfaces.
- **Contract consistency:** The API styles are unified and consistent across the enterprise.
- **Dependency correctness:** Validated against the Enterprise Dependency Graph to ensure no cyclic API calls exist.

## 9. Risks

### API Governance Risks

- **Description:** "Shadow APIs" developed without ARB approval or registry documentation.
- **Impact:** High.
- **Likelihood:** Low.
- **Mitigation:** API Gateway configuration must be managed via strict CI/CD pipelines; undocumented routes are rejected.

### Versioning Risks

- **Description:** Accidental deployment of unversioned breaking changes.
- **Impact:** Critical.
- **Likelihood:** Medium.
- **Mitigation:** Implement automated API contract testing (e.g., Pact or OpenAPI schema diffing) in the CI/CD pipeline to block breaking commits.

### Ownership Risks

- **Description:** Orphaned APIs when teams reorganize.
- **Impact:** Medium.
- **Likelihood:** Low.
- **Mitigation:** Enterprise Domain Ownership Matrix dictates that APIs belong to Domains, not specific ephemeral teams.

### Compatibility Risks

- **Description:** Downstream consumers failing because they strictly validate unknown payload fields.
- **Impact:** Medium.
- **Likelihood:** High.
- **Mitigation:** Mandate the Tolerant Reader pattern in enterprise coding standards.

### Security Risks

- **Description:** Sensitive APIs exposed without proper AuthZ constraints.
- **Impact:** Critical.
- **Likelihood:** Low.
- **Mitigation:** Zero-Trust architecture requires mandatory token validation at the API Gateway and explicit policy evaluation at the domain level.

## 10. Recommendations

1. **Priority 1:** Select and deploy a physical Enterprise API Developer Portal (e.g., Backstage) to host these logical contracts.
2. **Priority 2:** Enforce automated OpenAPI schema generation and contract diffing in all backend CI/CD pipelines before Phase 10 begins.
3. **Priority 3:** Define standard enterprise conventions for pagination, sorting, and error response structures across all REST APIs.

## 11. Approval

- **Architecture Review Board:** Approved
- **Chief Enterprise Software Architect:** Approved
- **Approval Status:** Formal Baseline Approved

## 12. Revision History

- **Initial Version (1.0.0):** Official Enterprise API Registry established for MANARATAK 2.0.
- **1.0.1 (2026-09-03):** Replaced the historical P15 Student Application API with the Student Workspace API; removed synchronous P13→P14 certificate generation and documented P14 certificate authority.
