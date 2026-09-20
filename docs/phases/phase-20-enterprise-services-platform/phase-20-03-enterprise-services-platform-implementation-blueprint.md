# MANARATAK 2.0: Phase 20 (Enterprise Services Platform) Enterprise Implementation Blueprint

**Document ID:** PHASE-20-03-IMPL-BLUEPRINT
**Status:** BASELINED / SOURCE_COMPLETE — RUNTIME_EVIDENCE_PENDING
**Phase:** 20
**Domain:** Enterprise Services Platform
**Artifact:** Part C - Implementation Guide

> **Note:** This phase references the [Enterprise Shared Contracts Specification](../../architecture/shared-contracts/03-enterprise-shared-contracts-specification.md) as the canonical architectural source for shared foundation contracts.
> **Note:** This phase references the [Enterprise Lifecycle Framework Specification](../../architecture/lifecycle-framework/03-enterprise-lifecycle-framework-specification.md) as the canonical architectural source for all state, status, and lifecycle governance.
> **Note:** This phase acts as the Single Source of Truth for every service offered by MANARATAK.

---

## 20.C.1 Implementation Overview

**Architectural Commentary**
The Enterprise Services Platform (Phase 20) Implementation Blueprint translates the abstract domain contracts into a concrete, structural roadmap. This platform dictates how services are cataloged, packaged, priced, booked, and tracked across the entire enterprise. It ensures that service delivery—whether a physical airport pickup, a digital document translation, or an ongoing auxiliary support subscription—is governed by a unified engine capable of handling diverse execution workflows without custom, hardcoded logic.

In accordance with enterprise **ADR-025 Technology Stack Standardization**, Phase 20 is implemented on the standard Node.js / TypeScript stack:
- **Language & Runtime:** TypeScript 5.x / Node.js 22.16.0 (`>=22.16.0 <23`)
- **Application Framework:** Express.js with Modular Router architecture
- **Database & ORM:** PostgreSQL / Prisma ORM
- **Async Messaging & Queues:** BullMQ / Redis
- **Logging & Telemetry:** Pino / OpenTelemetry
- **Testing:** Vitest / Supertest

---

## 20.C.2 Implementation Principles

**Architectural Commentary**
These principles govern the physical coding and structural decisions for Phase 20 engineers.

1.  **Polymorphic Execution:** The core engine MUST be capable of advancing any service type through its lifecycle without knowing the specific business rules of that service, relying on configurable metadata and state machines.
2.  **Absolute Decentralization of Execution:** The platform orchestrates the service order but delegates specific financial calculations and invoicing to Phase 19 — Enterprise Finance & Payments Platform, and specific educational logic to Phase 11 — Universities & Institutions.
3.  **Strict State Transitioning:** Service orders MUST follow a rigorous lifecycle (e.g., Requested, Assigned, In Progress, Delivered). Developers MUST NOT provide APIs that allow bypassing intermediate workflow stages.
4.  **Immutability of Pricing:** Once a service order is finalized and sent for invoicing, the pricing configuration for that specific order is locked. Changes require a formal cancellation and re-booking.
5.  **Provider Accountability:** Every completed service MUST be immutably linked to the specific internal staff member or external agency that executed it for audit and commission purposes.

---

## 20.C.3 Implementation Layers & Folder Structure

**Architectural Commentary**
The platform strictly adheres to the enterprise Clean Architecture blueprint, guaranteeing that service catalog definitions, pricing logic, and workflow state machines remain completely isolated from infrastructure, APIs, and external tracking systems.

```text
src/
├── domain/                  # (Core) Service models, pricing rules, booking aggregates, events
├── application/             # (Use Cases) CQRS commands, workflow orchestrators, catalog queries
├── infrastructure/          # (Adapters) External calendar APIs, DB contexts, message bus adapters
├── api/                     # (Delivery) Express controllers, REST routes, auth middleware
└── workers/                 # (Background) SLA monitoring, appointment reminders, workflow escalations
```

---

## 20.C.4 Module Organization

**Architectural Commentary**
The platform is internally divided into highly cohesive, loosely coupled modules to manage the vast array of services provided by the enterprise.

- **Service Catalog Module:** Manages the core definitions, metadata, and visibility of all offerings.
- **Service Category Module:** Organizes services into navigable taxonomies.
- **Service Package Module:** Bundles individual services into tiered offerings (e.g., Basic, VIP).
- **Student Services Module:** Specialized handlers for application preparation and academic reviews.
- **Academic Services Module:** Handlers for university selection and roadmap planning.
- **Document Services Module:** Logic for translation workflows, formatting, and artifact delivery.
- **Visa Services Module:** Orchestration for embassy requirements, tracking, and preparation.
- **Travel Services Module:** Logistics handlers for flights, accommodation, and airport pickups.
- **Auxiliary Services Module:** Handlers for technical execution, specialized consulting, and operational assistance offerings.
- **Enterprise Operational Services Module:** Logic for specialized high-tier digital and operational execution.
- **Booking Module:** Manages time-bound reservations, collision detection, and reschedules.
- **Scheduling Module:** Maintains calendar availability and timezone alignments.
- **Pricing Module:** Calculates base prices, geographic adjustments, and multi-currency context.
- **Discount Module:** Manages coupon validation, loyalty point application, and fixed deductions.
- **Promotion Module:** Orchestrates time-bound marketing campaigns affecting service pricing.
- **Provider Module:** Manages the profiles, capacity, and accreditation of service executors.
- **Workflow Module:** The state machine advancing service orders from inception to completion.

---

## 20.C.5 CQRS & Internal Communication Blueprint

**Architectural Commentary**
Phase 20 utilizes strict Command Query Responsibility Segregation (CQRS) via the Mediator pattern to decouple read-heavy operations (like browsing the catalog) from write-heavy operations (like placing an order or assigning a provider).

- **Commands:** All operations modifying service state (e.g., `PlaceServiceOrderCommand`, `AssignProviderCommand`, `ApplyCouponCommand`). Handlers for these MUST wrap executions in database transactions and publish domain events upon success.
- **Queries:** All operations retrieving data (e.g., `GetCatalogQuery`, `GetProviderAvailabilityQuery`). Handlers read from optimized, read-only projections to guarantee high performance during customer browsing.
- **Pipeline Behaviors:**
  - **Validation Pipeline:** Enforces structural and business rules (e.g., cannot book a time slot in the past).
  - **Authorization Pipeline:** Confirms the executing identity possesses the required service or administrative roles.
  - **Audit Pipeline:** Automatically intercepts commands to log intent and execution status into the Phase 05 — Core Implementation audit ledger.

---

## 20.C.6 Repository Implementation Blueprint

**Architectural Commentary**
Repositories in Phase 20 abstract the persistence layer, ensuring that complex service metadata and workflows are stored and reconstructed identically regardless of the underlying database technology.

- **Service Repository:** Manages the lifecycle of individual service offerings.
- **Catalog Repository:** Provides optimized reads for categories, hierarchies, and active listings.
- **Category Repository:** Handles taxonomy persistence.
- **Package Repository:** Manages bundled offerings and their constituent service mappings.
- **Booking Repository:** Handles time-bound reservations and calendar constraints.
- **Provider Repository:** Stores profiles, accreditations, and active assignments of executors.
- **Pricing Repository:** Manages contextual price rules (e.g., student vs. corporate).
- **Discount & Promotion Repository:** Tracks coupon usage limits, active campaigns, and expiries.
- **Workflow Repository:** Stores state machine definitions and historical transition logs for active orders.

---

## 20.C.7 Application Services Blueprint

**Architectural Commentary**
Application Services orchestrate complex interactions spanning multiple aggregates, acting as the entry points for the delivery layer.

- **Service Catalog Service:** Aggregates visibility rules, pricing, and availability to present a unified catalog view.
- **Category Service:** Admin-facing orchestrator for building taxonomies.
- **Package Service:** Admin-facing orchestrator for building bundles.
- **Booking Service:** Resolves calendar collisions, timezone mathematics, and reservations.
- **Scheduling Service:** Manages provider schedules and slot availability.
- **Pricing Service:** The financial calculation engine (pre-invoice) that determines the final theoretical cost before sending to Phase 19 — Enterprise Finance & Payments Platform.
- **Discount Service:** Handles coupon validation and deductions.
- **Promotion Service:** Orchestrates campaign logic.
- **Provider Service:** Handles the matching, routing, and assignment of orders to qualified personnel.
- **Workflow Service:** The core state engine enforcing SLA milestones and delivery gates.
- **Domain-Specific Services (Student Service, Academic Service, Document Service, Visa Service, Travel Service, Auxiliary Service, Enterprise Service):** Specialized orchestrators that implement the specific metadata validation required for their domain (e.g., a Visa Service ensures a passport copy is attached before workflow begins).

---

## 20.C.8 Service Catalog Implementation Blueprint

**Architectural Commentary**
The Service Catalog is the primary customer-facing entity. Its implementation MUST be highly flexible to accommodate vastly different offerings while maintaining a standardized querying interface.

**Implementation Flow & Requirements:**
Each service instance MUST natively support:

1.  **Name & Description:** Localized presentation data.
2.  **Category:** Hierarchical linking for navigation.
3.  **Price & Currency:** Base pricing definitions mapped to Phase 19 currency standards.
4.  **Duration:** Expected SLA or physical time requirement.
5.  **Requirements & Required Documents:** Dynamic JSON schema defining what the customer MUST provide (e.g., PDF of transcripts) before the service can enter `InProgress`.
6.  **Availability:** Boolean toggles and geographical restrictions.
7.  **Workflow:** A pointer to the specific state machine definition in the Workflow Module.
8.  **Status:** Draft, Published, or Archived lifecycle markers.

---

## 20.C.9 Service Package Implementation Blueprint

**Architectural Commentary**
Service Packages allow marketing and sales teams to bundle capabilities. The implementation MUST ensure that purchasing a package correctly instantiates the workflow for all included constituent services.

**Implementation Flow & Requirements:**
The implementation MUST natively support tiering:

- **Basic:** Entry-level bundle (e.g., Document Translation + Proofreading).
- **Standard:** Mid-tier bundle adding consultation (e.g., Basic + University Selection).
- **Premium:** High-touch bundle (e.g., Standard + Visa File Preparation + Airport Pickup).
- **VIP:** Concierge-level execution with prioritized SLAs and senior providers.

When a package is ordered, the system MUST generate child `IServiceOrder` records for each service within the package, allowing them to be tracked and fulfilled independently while maintaining a parent-child relationship.

---

## 20.C.10 Validation Strategy Blueprint

**Architectural Commentary**
Validation ensures that service configurations and customer requests are structurally sound before execution begins.

- **Service Validation:** Ensures required metadata (e.g., SLA duration, target country) is present before publication.
- **Booking Validation:** Prevents double-booking, verifies provider working hours, and handles timezone conversions.
- **Package Validation:** Prevents circular dependencies or inclusion of archived services.
- **Pricing Validation:** Ensures that base prices are not negative and discounts do not exceed the total cost.
- **Provider Validation:** Confirms accreditation is valid and active before assigning high-tier services (e.g., certified translations).
- **Workflow & Delivery Validation:** Ensures a provider cannot mark a document service as `Delivered` unless the artifact URI is actually provided.

---

## 20.C.11 Integration Guidance Blueprint

**Architectural Commentary**
Phase 20 integrates via strictly defined APIs and Enterprise Service Bus (ESB) events.

- **Phase 15 — Enterprise Student Platform:** Exposes the catalog to the portal; allows students to track order progress.
- **Phase 12 — Scholarships:** Links specific service orders (like SOP writing) to scholarship application milestones.
- **Phase 11 — Universities & Institutions:** Associates admission services with specific institutional requirements.
- **Phase 21 — Enterprise Career & Alumni Platform:** Surfaces professional services like CV preparation and career coaching.
- **Phase 19 — Enterprise Finance & Payments Platform:** Receives the final calculated service cost from Phase 20 to generate the official `Invoice`. Phase 20 listens for `PaymentCompletedEvent` from Phase 19 before moving a service from `PendingPayment` to `InProgress`.
- **Phase 23 — Enterprise Administration Portal:** Consumes state changes for operational monitoring, SLA tracking, and catalog management.
- **Phase 24 — Enterprise Public Platform:** Consumes public service catalog listings for site visitors.
- **Phase 05 — Core Implementation:** Consumes IAM, audit baselines, and Enterprise Asset Platform (EAP) baselines.
- **Read-Model / Customer Engagement Consumers:** Ingests all service interactions to build customer engagement timelines.
- **Notification / Event Consumers:** Triggered on state transitions to inform the customer via email/SMS.

---

## 20.C.12 Security Implementation Blueprint

**Architectural Commentary**

- **Authorization:** Strict ABAC (Attribute-Based Access Control). A provider can only view the specific service orders assigned to them, not the entire customer history.
- **Role-Based Access:** Distinct roles for Catalog Managers, Pricing Managers, and Service Executors.
- **Sensitive Data Protection:** Document payloads (e.g., passports for Visa services, translated drafts, final deliverables, receipts, PDFs, supporting files) MUST NOT be stored as raw URLs or physical disk paths in Phase 20 domain records. All persisted files MUST be registered through Phase 05 — Core Implementation Enterprise Asset Platform (EAP) using immutable `assetId` / `assetReference` handles with expiring signed access URLs, not public static hosting. Temporary upload staging is allowed only as an internal implementation detail and must not serve as domain identity.
- **Audit Trail:** Every status change, provider assignment, and file upload MUST be immutably logged into Phase 05 Audit baselines with the executing user's ID.

---

## 20.C.13 Scalability Strategy Blueprint

**Architectural Commentary**

- **High Catalog Read Volume:** The `ServiceCatalogRepository` MUST aggressively cache active services and categories in Redis to support massive concurrent browsing during peak intake seasons.
- **Asynchronous Processing:** Complex workflow evaluations, provider matching algorithms, and SLA breach detection MUST run on background workers to keep the API responsive.
- **Horizontal Scaling:** The booking and scheduling engines MUST be capable of scaling horizontally to handle spikes in appointment requests without locking the database.
- **Concurrent Operations:** Optimistic concurrency control ensures overlapping bookings are rejected gracefully.

---

## 20.C.14 Monitoring Blueprint

**Architectural Commentary**

- **Operational Monitoring:** Real-time dashboards tracking active orders, bottlenecked workflows, and provider utilization rates.
- **SLA Monitoring:** Automated background jobs measuring the time an order spends in each state against the defined service duration, raising alerts for imminent breaches.
- **Booking Monitoring:** Tracking calendar utilization, cancellation rates, and provider availability gaps.
- **Performance Monitoring:** Tracking API latencies on critical catalog read endpoints.

---

## 20.C.15 Logging Strategy Blueprint

**Architectural Commentary**

- **Structured Format:** JSON-based logs including exact Order IDs and Provider IDs.
- **Correlation IDs:** Absolute requirement. A `ServiceDeliveredEvent` log MUST carry the correlation ID back to the originating `CustomerRequest`.
- **Contextual Logging:** Workflow transitions MUST log the reason for the transition (e.g., "Customer approved draft", "Provider uploaded final document").

---

## 20.C.16 Performance Guidance Blueprint

**Architectural Commentary**

- **Read-Optimized Views:** Catalog browsing queries should read from denormalized views or approved enterprise search / read-model projections, never executing complex joins against the transactional database. Phase 20 exposes service catalog metadata for indexing but does not own a global search platform.
- **Eventual Consistency:** While the service order state is highly consistent, updating the global provider utilization metrics or dashboard aggregates can be eventually consistent to save database load.

---

## 20.C.17 Service Import Implementation Blueprint

**Architectural Commentary**
To populate service catalogs at scale without corrupting domain contracts, Phase 20 establishes a structured Service Import implementation blueprint.

### 20.C.17.1 Phase 06 vs. Phase 20 Import Boundary
- **Phase 06 — Import Foundation Responsibilities:** Owns generic ingestion pipelines, CSV/Excel/JSON file parsers, data stream connectors, execution batching, row-level validation queues, duplicate detection processing, failed-row review queues, audit logging, and retry mechanisms.
- **Phase 20 — Enterprise Services Platform Responsibilities:** Owns service-domain import schemas, field mapping definitions, domain-specific validation rules, completeness verification, canonical naming normalization, deduplication merging logic, and administrative import state transitions.

### 20.C.17.2 Importable Datasets & Field Mapping
- **Service Categories:** Code, ParentCategoryCode, EnglishName, ArabicName, Description.
- **Service Catalog Items:** ServiceCode, CategoryCode, FulfillmentType, EnglishTitle, ArabicTitle, Description, AvailabilityStatus, RequiredDocumentSchema, DeliveryMode, ResponsibleOwnerType.
- **Service Packages & Bundles:** PackageCode, EnglishTitle, ArabicTitle, IncludedServiceCodes, BundleDiscountPercentage.
- **Provider Metadata:** ProviderCode, ProviderType, Specializations, WorkingHours, MaxConcurrentOrders.
- **Availability Templates:** ProviderCode, DayOfWeek, StartTime, EndTime, Timezone, SlotDurationMinutes.
- **Fulfillment & SLA Templates:** ServiceCode, WorkflowStates, TargetDeliveryTimeHours, EscalationRole.
- **Pricing References:** ServiceCode, BasePriceAmount, Currency, EffectiveDate (pricing references only; financial ledgers and invoicing managed via Phase 19).

### 20.C.17.3 Canonical Naming & Deduplication Logic
- **Name Normalization:** Automated cleaning pipeline strips marketing fluff (e.g., "Best Deal!"), emojis, year-only decorations (e.g., "2024/2025"), duplicate whitespace, and source platform tags.
- **Deduplication Matching Key:** Composite hash of `canonicalServiceName` + `categoryCode` + `fulfillmentType` + `countryOrLanguageScope`.
- **Duplicate Handling:** Safe metadata enrichment merges missing optional fields into existing records without duplicating catalog entries. Published and admin-reviewed fields are immutable and cannot be overwritten by automated imports.

### 20.C.17.4 Administrative Import Lifecycle States
Every imported service record transitions through:
1. `Imported`: Staged raw import payload from Phase 06.
2. `Incomplete`: Validation failed due to missing mandatory fields or invalid schemas.
3. `Complete`: Structural and domain validation passed.
4. `NeedsReview`: Marked for administrative check (e.g., non-standard pricing or missing SLA).
5. `ReadyToPublish`: Approved by administrator for catalog inclusion.
6. `Published`: Active and visible in the live catalog.
7. `Rejected`: Discarded by administrator.
8. `Archived`: Retired service catalog item.

---

## 20.C.18 Architecture Constraints

**Architectural Commentary**
Any Pull Request violating the following constraints MUST be automatically rejected:

- **NO FINANCIAL EXECUTION:** Phase 20 MUST NOT create invoices or deduct wallet balances. It must invoke Phase 19 — Enterprise Finance & Payments Platform for all financial movements.
- **NO HARDCODED WORKFLOWS:** Developers MUST NOT write `if (service.name == "Visa Processing")` to determine workflow steps. All state transitions must be read from the workflow configuration.
- **NO CUSTOMER OWNERSHIP:** Phase 20 MUST rely on global Identity and Student profile IDs from Phase 15 / Phase 05; it must not create parallel user tables.
- **NO RAW FILE STORAGE:** All uploaded files and deliverables MUST be registered through Phase 05 EAP via `AssetId` / `AssetReference`. Raw file paths or static URLs in domain tables are strictly forbidden.

---

## 20.C.Final Implementation Review Checklist

- [x] **Implementation Validation:** Blueprint successfully maps all Part A and Part B requirements into concrete structural layers.
- [x] **Architecture Compliance:** Strict adherence to Clean Architecture and SSoT principles.
- [x] **Module Validation:** Catalog, Packages, Booking, Pricing, Import Governance, and specific Service categories are fully modularized.
- [x] **Repository Validation:** Persistence is abstracted, securing complex service metadata and workflows.
- [x] **Workflow Validation:** Dynamic state machines dictate service delivery without hardcoding.
- [x] **Import Governance Validation:** Clear boundary established between Phase 06 (mechanics) and Phase 20 (domain schemas, deduplication, and import lifecycle states).
- [x] **Integration Validation:** Clean API and Event interfaces are established for all downstream and upstream consumers using official phase names.
- [x] **Performance Validation:** CQRS and caching strategies guarantee enterprise responsiveness during catalog browsing.
- [x] **Security Validation:** ABAC, secure artifact storage via Phase 05 EAP (`AssetId` / `AssetReference`), and immutable logging are mandated.
- [x] **Readiness Review:** The guide provides unambiguous direction for engineering teams to begin construction.
- [x] **Acceptance Criteria:** Met in full.

**Status:** BASELINED / SOURCE_COMPLETE — RUNTIME_EVIDENCE_PENDING
**Approver:** Chief Enterprise Architect & Architecture Review Board (ARB)

---

## Navigation

- **Previous Artifact:** [Phase 20 Part B - Domain Contracts](phase-20-02-enterprise-services-platform-domain-contracts.md)
- **Current Artifact:** **Phase 20 Part C - Implementation Guide** (This File)
- **Next Phase:** Phase 21 — Enterprise Career & Alumni Platform

