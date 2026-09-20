# MANARATAK 2.0: Phase 20 (Enterprise Services Platform) Enterprise Architecture

**Document ID:** PHASE-20-01-ARCH-SPEC
**Status:** BASELINED / SOURCE_COMPLETE — RUNTIME_EVIDENCE_PENDING
**Phase:** 20
**Domain:** Enterprise Services Platform
**Artifact:** Part A - Architecture Specification

---

## 20.A.1 Executive Summary

The **Enterprise Services Platform (Phase 20)** establishes the centralized, authoritative engine for all service management capabilities within the MANARATAK 2.0 ecosystem. It serves as the Single Source of Truth (SSoT) for the complete lifecycle of every service offered by MANARATAK, regardless of its category, customer context, execution method, pricing model, or workflow.

By consolidating service definitions, scheduling, orders, tracking, and promotions into a single Bounded Context, the platform ensures that both current and future services—ranging from student academic consultations to operational auxiliary service packages—can be provisioned, tracked, and delivered without requiring architectural modifications to the core system.

---

## 20.A.2 Architectural Vision & Position

**Architectural Commentary**
_In a complex enterprise, allowing individual domains (like Phase 12 — Scholarships or Phase 11 — Universities & Institutions) to define and manage their own service workflows leads to fragmentation, duplicated logic, and inconsistent customer experiences. Phase 20 is positioned as the universal service layer, decoupling the definition and orchestration of services from the specific business verticals that consume them._

### 20.A.2.1 The Service Ownership Boundary

Phase 20 owns the service lifecycle and catalog entirely.

- **The Business Domain (e.g., Phase 11 — Universities & Institutions, Phase 12 — Scholarships, Phase 21 — Enterprise Career & Alumni Platform):** Represents the target domain context where a service might be applied, but does not manage the delivery or operational fulfillment of the service itself.
- **The Service Domain (Phase 20):** Determines _what_ services are available, _how_ they are priced, _who_ provides them, and the _workflow_ for their delivery.

### 20.A.2.2 Explicit Non-Ownership & Boundary Constraints

To maintain clean architectural boundaries, Phase 20 explicitly **DOES NOT OWN**:
- Payments, invoices, refunds, wallets, financial ledgers, or money movement (Owned strictly by Phase 19 — Enterprise Finance & Payments Platform).
- Student academic profiles, workspace data, or identity records (Owned by Phase 15 — Enterprise Student Platform / Phase 05 — Core Implementation).
- University profiles, degree programs, or institutional catalogs (Owned by Phase 11 — Universities & Institutions).
- Scholarship definitions, eligibility rules, or grant award packages (Owned by Phase 12 — Scholarships).
- Course content, learning delivery, curriculum metadata, or test-prep delivery (Owned by Phase 13 — Learning Platform).
- Certificates and credential issuance (Owned by Phase 14 — Enterprise Certificates & Verification Platform).
- Editorial CMS content or public marketing articles (Owned by Phase 16 — Enterprise CMS Platform).
- AI execution engines or model inference (Owned by Phase 17 — Enterprise AI Platform).
- Deterministic student tools or tool-assisted outputs (Owned by Phase 18 — Enterprise Student Tools Platform).
- Career networks, alumni profiles, or employer directory entities (Owned by Phase 21 — Enterprise Career & Alumni Platform).
- Administration UI screens (Owned by Phase 23 — Enterprise Administration Portal).
- Public visitor page composition (Owned by Phase 24 — Enterprise Public Platform).
- Physical file/asset binary storage (Owned by Phase 05 — Core Implementation Enterprise Asset Platform / EAP baseline).
- Organizations, employers, or partner business entity management (In accordance with ADR-027, Phase 20 models external service providers or clients via references only and does not establish an Organizations & Employers Platform).

---

## 20.A.3 Enterprise Principles

Phase 20 adheres to the core MANARATAK 2.0 enterprise principles while introducing critical tenets specific to the services domain:

1.  **Universal Service Abstraction:** All services, whether an airport pickup or a PhD research proposal review, MUST be represented by a common polymorphic service structure.
2.  **Decoupled Workflow Orchestration:** The platform MUST support dynamic workflows (e.g., multi-stage document translation vs. instant digital subscription) without hardcoding execution paths for specific service types.
3.  **Centralized Pricing & Promotions:** All base pricing, discounts, and coupon calculations MUST be localized within the Service Platform before generating a quote via Phase 19 — Enterprise Finance & Payments Platform.
4.  **Extensibility:** The architecture MUST natively support the introduction of future service categories without structural database schema changes.
5.  **Service Traceability:** Every customer request and service order MUST maintain a strict, immutable audit trail mapping back to the executing service provider and the originating customer.

---

## 20.A.4 Platform Capabilities

**Architectural Commentary**
_The capabilities defined here encompass the full spectrum of service management, ensuring all operational permutations are natively supported by the platform's core engine._

- **Service Catalog Management:** Authoritative repository for Service Categories, Packages, and standalone offerings.
- **Service Orders & Fulfillment:** End-to-end tracking of Service Orders, Customer Requests, and Delivery Tracking.
- **Scheduling & Booking:** Unified calendar and resource management for time-bound services (consultations, appointments).
- **Pricing & Promotions:** Centralized engine for Service Pricing, Discounts, Coupons, and Campaigns.
- **Service Providers:** Management of internal teams, external contractors, and agencies responsible for service execution.
- **Service Workflows:** Configurable state machines governing how a service progresses from order to completion.

---

## 20.A.5 Service Categories

**Architectural Commentary**
_To ensure clean categorization and future-proofing, services are grouped into standardized domains. The engine handles each category dynamically while retaining the ability to attach specialized metadata per category._

### 20.A.5.1 Student Services

Focuses on operational support for student application journeys:

- Scholarship Application Preparation
- University Application
- Document Review
- SOP (Statement of Purpose) Writing
- Motivation Letter
- Recommendation Letter Assistance
- CV Preparation
- Research Proposal Review
- Application File Preparation
- Scholarship Consultation
- Academic Consultation

### 20.A.5.2 Document Services

Provides processing, legalizing, and formatting capabilities:

- Translation
- Certified Translation
- Proofreading
- File Formatting
- PDF Processing
- Document Verification
- Scanning
- Printing
- File Conversion
- Document Packaging

### 20.A.5.3 Visa Services

Handles the compliance and logistical requirements for international travel:

- Visa Consultation
- Visa File Preparation
- Visa Document Review
- Appointment Booking
- Visa Tracking
- Embassy Requirements
- Interview Preparation

### 20.A.5.4 Travel Services

Manages physical logistics and arrival coordination:

- Flight Booking
- Airport Pickup
- Accommodation Arrangement
- Medical Insurance
- SIM Card Services
- Arrival Assistance
- Travel Consultation

### 20.A.5.5 Academic Services

Strategic guidance and educational planning:

- University Selection
- Major Consultation
- Scholarship Matching
- Admission Consultation
- Academic Planning
- Study Roadmap
- Language Consultation

### 20.A.5.6 Auxiliary & Enterprise Operational Services

Focuses on high-tier operational auxiliary services and technical assistance offerings:

- Service Subscriptions (e.g., premium support tiers, recurring auxiliary service packages)
- Specialized Professional Assistance (e.g., custom technical or educational execution assistance via `externalClientReference`)

---

## 20.A.6 Service Import Specification & Asset Governance

**Architectural Commentary**
_To populate and maintain enterprise service catalogs at scale, Phase 20 defines a rigorous Service Import Specification and Asset Governance model. This ensures incoming service data and uploaded artifacts conform to enterprise standards without blurring bounded context responsibilities._

### 20.A.6.1 Import Boundary Separation
- **Phase 06 — Import Foundation Ownership:** Phase 06 owns generic import infrastructure, data source connectors, file parsing engines, batching, validation queues, duplicate detection execution, failed-row review queues, audit logs, and retry mechanics.
- **Phase 20 — Enterprise Services Platform Ownership:** Phase 20 owns service-domain import schemas, field mapping rules, domain validation logic, completeness criteria, canonical naming normalization, and administrative import state machine transitions.

### 20.A.6.2 Importable Datasets
Phase 20 supports governed batch imports for the following service-domain datasets:
1. **Service Categories:** Hierarchical taxonomy definitions.
2. **Service Catalog Items:** Standalone service offerings and configurations.
3. **Service Packages & Bundles:** Multi-service bundled offerings and constituent mappings.
4. **Service Provider Metadata:** Provider profiles, specializations, and accreditation records.
5. **Appointment Availability Templates:** Recurring calendar slot templates for providers.
6. **Fulfillment Workflow Templates:** State machine transition definitions for service types.
7. **SLA Templates:** Timeframe and milestone definitions per service level.
8. **Required Document Templates:** Schema definitions for required customer input documents.
9. **Delivery Artifact Definitions:** Output schema specifications for service deliverables.
10. **Service Pricing References:** Base prices and country adjustments (without executing financial transactions or managing financial ledgers).

### 20.A.6.3 Service Field Requirements
- **Mandatory Fields:** Every imported service record MUST specify:
  - `serviceName`: Public title of the service.
  - `serviceCategory`: Assigned taxonomy category identifier.
  - `fulfillmentType`: Execution archetype (e.g., DigitalDocument, LiveConsultation, PhysicalLogistics).
  - `serviceDescription`: Detailed explanation of service scope.
  - `serviceAvailabilityStatus`: Active, Inactive, or Seasonal flag.
  - `requiredInputsOrDocuments`: Required customer input schema.
  - `deliveryMode`: Mode of delivery (e.g., EphemeralDownload, SynchronousMeeting, PhysicalArrival).
  - `responsibleServiceOwnerType`: Responsible owner classification (e.g., InternalTeam, ExternalAgency).
- **Optional Fields:**
  - `providerName`, `providerReferenceId`
  - `estimatedDeliveryTime`, `slaPolicy`
  - `appointmentRequired` (boolean)
  - `supportedCountries`, `supportedLanguages`
  - `servicePrerequisites`
  - `deliveryArtifactTypes`
  - `pricingReferenceId`
  - `promotionalMetadata`
  - `publicDisplayMetadata`

### 20.A.6.4 Canonical Naming & Deduplication Rules
- **Canonical Name Normalization:** All imported service names MUST be automatically cleaned by removing marketing fluff (e.g., "Best Offer!", "100% Guaranteed"), emojis, year-only decorations (e.g., "2024/2025 Edition"), duplicate tokens, and source platform clutter.
- **Deduplication Matching Key:** Duplicates are detected using a composite match key: `canonicalServiceName` + `serviceCategory` + `fulfillmentType` + `countryOrLanguageScope`.
- **Safe Metadata Merging:** When a duplicate is detected, missing optional metadata is safely merged into the existing record instead of creating duplicate catalog entries.
- **Immutability of Reviewed Fields:** Admin-reviewed or published fields MUST NEVER be overwritten silently by subsequent import batches.

### 20.A.6.5 Administrative Import Lifecycle States
Imported service records MUST progress through a governed administrative lifecycle:
- `Imported`: Staged raw data ingested from Phase 06.
- `Incomplete`: Lacks one or more mandatory fields or valid schemas.
- `Complete`: All mandatory fields present and structurally valid.
- `NeedsReview`: Requires administrative verification for business or pricing compliance.
- `ReadyToPublish`: Validated and approved for publishing.
- `Published`: Live and discoverable in the active service catalog.
- `Rejected`: Flagged as non-compliant or erroneous during review.
- `Archived`: Soft-deleted or retired service offering.

### 20.A.6.6 Asset & File Registration Governance
- **No Raw Path or URL Storage:** Passports, translated files, uploaded drafts, final deliverables, receipts, PDFs, and supporting documents MUST NOT be stored as raw URLs or physical disk paths in Phase 20 domain records.
- **Phase 05 EAP Registration:** All persisted files MUST be registered through Phase 05 — Core Implementation Enterprise Asset Platform (EAP) using immutable `assetId` / `assetReference` handles.
- **Ephemeral Staging:** Temporary upload buffers are treated strictly as internal implementation details and MUST NEVER serve as domain identity.

---

## 20.A.7 Integration Model

Phase 20 integrates extensively with the MANARATAK ecosystem, acting as the bridge between customer intent and financial execution.

- **Phase 19 — Enterprise Finance & Payments Platform:** Phase 20 pushes finalized Service Orders to Phase 19 for invoicing, payment collection, refunds, and financial settlement. Phase 20 relies on Phase 19 for multi-currency transaction execution.
- **Phase 15 — Enterprise Student Platform:** Exposes the Service Catalog to students and tracks their specific Service Orders and Appointments.
- **Phase 11 — Universities & Institutions:** Connects specific services (like "Admission Consultation") directly to relevant university entities.
- **Phase 12 — Scholarships:** Connects services (like "Scholarship Application Preparation") directly to scholarship entities.
- **Phase 21 — Enterprise Career & Alumni Platform:** Connects professional development services (e.g., CV Review, Career Interview Coaching) to career pathways.
- **Phase 13 — Learning Platform:** Integrates learning-adjacent services without taking over course delivery or curriculum content.
- **Phase 18 — Enterprise Student Tools Platform:** Integrates tool-assisted service execution while leaving tool execution logic to Phase 18.
- **Phase 23 — Enterprise Administration Portal:** Consumes service management endpoints for administrative operational control and catalog configuration.
- **Phase 24 — Enterprise Public Platform:** Consumes public service catalog listings for prospective visitor displays.
- **Phase 05 — Core Implementation:** Consumes IAM, audit baselines, and Enterprise Asset Platform (EAP) baselines for asset and file references.
- **Notification / Event Consumers:** Consumes events from Phase 20 (e.g., `ServiceOrderCompleted`, `AppointmentBooked`) to dispatch cross-channel alerts.
- **Read-Model / Customer Engagement Consumers:** Consumes service lifecycle events to log interactions against customer engagement read-models.

---

## 20.A.8 Consumer Model

The capabilities of Phase 20 are exposed to various presentation layers through specialized API gateways and domain contracts:

- **Phase 15 — Enterprise Student Platform:** Allows users to browse the Service Catalog, apply coupons, book appointments, and track the real-time status of their active service requests.
- **Service Provider Workflows:** Empowers contractors and internal staff to accept assigned service tasks, upload deliverable artifact references, and mark workflow milestones as complete.
- **Phase 23 — Enterprise Administration Portal (Service Module):** Enables administrators to create new Service Packages, adjust pricing, configure automated workflows, and monitor global delivery SLAs.
- **Phase 24 — Enterprise Public Platform:** Renders public service catalog listings and promotional packages for site visitors.

---

## 20.A.9 Architectural Constraints

- **No Financial Ledger Operations:** Phase 20 calculates base pricing and discounts, but it MUST NOT generate invoices, process payments, or manage wallets. All financial execution is strictly delegated to Phase 19 — Enterprise Finance & Payments Platform.
- **Dynamic Data Structures:** The platform MUST utilize JSON or flexible document structures for service-specific metadata (e.g., flight details vs. document translation requirements) to prevent schema pollution.
- **No Cross-Domain Ownership:** Phase 20 MUST NOT duplicate university catalogs, scholarship rules, or career networks. It references them via standard cross-domain identifiers.
- **State Machine Rigidity:** A Service Order MUST NEVER bypass required workflow steps (e.g., jumping from `Requested` to `Completed` without passing through `In Progress` or `Review`).

---

## 20.A.10 Enterprise Review & Acceptance

### 20.A.10.1 Architecture Validation

This specification establishes a robust, extensible foundation for all MANARATAK services, eliminating hardcoded business logic and unifying the service delivery pipeline under a single, highly cohesive platform.

### 20.A.10.2 Acceptance Criteria

- [x] Absolute centralization of all service catalog and delivery logic is established.
- [x] Comprehensive support for Student, Document, Visa, Travel, Academic, and Auxiliary Services is explicitly documented.
- [x] The boundary separating service definition (Phase 20) from financial execution (Phase 19) is clearly defined.
- [x] Universal abstraction principles ensure future service categories can be added without architectural modifications.

### 20.A.10.3 Architecture Review Checklist

- **Service Boundary Validation:** Yes. The platform strictly encapsulates service catalogs, pricing, and workflows without bleeding into external domains.
- **Integration Validation:** Yes. Clear asynchronous and synchronous contracts are defined for downstream and upstream platforms.
- **Ownership Validation:** Yes. Phase 20 acts as the sole owner of service delivery and tracking.
- **Readiness Review:** The architectural blueprint is fully prepared to inform domain contracts and implementation.

### 20.A.10.4 ARB Decision

- **Decision:** APPROVED
- **Status:** BASELINED / SOURCE_COMPLETE — RUNTIME_EVIDENCE_PENDING
- **Next Steps:** Proceed to Phase 20 Part B (Enterprise Domain Contracts).

---

## Navigation

- **Previous Phase:** Phase 19 — Enterprise Finance & Payments Platform
- **Current Artifact:** **Phase 20 Part A - Architecture Specification** (This File)
- **Next Artifact:** [Phase 20 Part B - Domain Contracts](phase-20-02-enterprise-services-platform-domain-contracts.md)

