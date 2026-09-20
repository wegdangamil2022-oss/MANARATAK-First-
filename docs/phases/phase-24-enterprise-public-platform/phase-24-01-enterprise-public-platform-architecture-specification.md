# MANARATAK 2.0: Phase 24 (Enterprise Public Platform) Architecture Specification

> **P13 Final Source Alignment — 2026-09-03:** The current source implements session/API-backed live Student Workspace composition and canonical owner-read hydration. Prototype/local preview behavior is explicit-only and is not a live source of truth. Runtime/DB/E2E validation remains pending; this note does not assert production certification.


**Document ID:** PHASE-24-01-ARCH-SPEC  
**Status:** SOURCE_REBASELINED — RUNTIME_EVIDENCE_PENDING  
**Phase:** 24  
**Domain:** Enterprise Public Platform  
**Artifact:** Part A - Public Platform Vision & Boundaries  

---

> **W7 source-rebaseline notice (2026-09-07):** This specification is source-rebaselined under `MNT-AUD-0045` against the remediated owner APIs, Admin/Public composition, source tests and cross-phase traceability. This status is not runtime or production certification; external DB/provider/deployment/browser evidence remains `RUNTIME_EVIDENCE_PENDING`. See `docs/remediation/P23_P24_REBASELINE_TRACEABILITY.md`.

### Navigation
[← Phase 23: Enterprise Administration Portal](../phase-23-enterprise-administration-portal/phase-23-01-enterprise-administration-portal-architecture-specification.md) | [Phase 24: Structure Contracts (Part B)](./phase-24-02-enterprise-public-platform-structure-contracts.md) | [Phase 24: Public Pages & User Experience (Part C)](./phase-24-03-enterprise-public-platform-public-pages-user-experience.md) | [Roadmap Completion ]

---

> **Note:** This phase references the [Enterprise Shared Contracts Specification](../../architecture/shared-contracts/03-enterprise-shared-contracts-specification.md) as the canonical architectural source for shared foundation contracts.  
> **Note:** This phase references the [Enterprise Lifecycle Framework Specification](../../architecture/lifecycle-framework/03-enterprise-lifecycle-framework-specification.md) as the canonical architectural source for all state, status, and lifecycle governance.  
> **Note:** Part A establishes the vision, identity, ownership boundaries, and guiding principles of Phase 24 — Enterprise Public Platform within Roadmap v6.0.  

---

## Part A — Public Platform Vision & Boundaries

### 24.A.1 Public Platform Vision

**Architectural Commentary**  
The MANARATAK Enterprise Public Platform is architected as the unified public discovery, presentation, and composition tier for students globally seeking educational opportunities within the fixed 24-phase Roadmap v6.0.

The vision of the platform transcends a standard directory. It is engineered to present and compose the entire educational discovery journey—from initial exploration to decision-making—through one fully integrated, macroscopic public ecosystem.

---

### 24.A.2 Public Platform Mission

**Architectural Commentary**  
The mission of the MANARATAK Public Platform is to radically simplify educational discovery by organizing disparate global educational opportunities into one trusted, structured, and continuously maintained public platform.

By standardizing and presenting fragmented educational data supplied by underlying domain engines, the platform empowers students to make informed, life-altering decisions without navigating disorganized, isolated information silos.

---

### 24.A.3 First User Impression

**Architectural Commentary**  
The public platform must instantly command authority. The architectural design of the experience guarantees that the first user impression instantaneously communicates organizational clarity and systemic reliability.

Upon visiting MANARATAK, visitors must immediately experience:
- **Organization:** Every data point is predictable, structured, and cleanly formatted.
- **Professionalism:** The ecosystem operates at an enterprise tier.
- **Trust:** Data presented is authoritative, verified, and safely governed.
- **Simplicity:** Structural complexity is abstracted behind intuitive public navigation.
- **Educational Quality:** High-caliber opportunities, programs, and institutions are represented.
- **Completeness:** A holistic educational discovery hub that links related academic opportunities.

---

### 24.A.4 Educational Philosophy & Connected Knowledge

**Architectural Commentary**  
The platform treats education as a connected relational graph. Educational entities do not exist in isolation; they complement one another to form a cohesive network of knowledge.

The architecture ensures that educational terminology inside public content automatically becomes a meaningful navigational opportunity. Examples of connected knowledge pathways include:
- **Scholarships connect to Majors:** A scholarship eligibility requirement pathways to the exploration of that specific major.
- **Majors connect to Universities:** Discovering a major leads directly to the institutions that offer it.
- **Majors connect to Courses:** Academic disciplines route to available preparatory or core courses.
- **Courses connect to Educational Services:** Course enrollment pathways logically to advisory or credentialing services.
- **Educational Services connect to Student Tools:** Service execution seamlessly integrates with AI-assisted student tools (e.g., encountering a "Motivation Letter" requirement within a scholarship links to the Motivation Letter Student Tool).

---

### 24.A.5 Public Platform & Administration Relationship

**Architectural Commentary**  
The relationship between Phase 24 — Enterprise Public Platform and Phase 23 — Enterprise Administration Portal is strictly governed by command and presentation separation:

- **Command Authority:** Phase 23 invokes publication/unpublication/availability commands through the owning domain APIs. Section ordering/navigation is authored through Phase 16 CMS contracts; Phase 23 owns no duplicate public-visibility store.
- **Composition Ownership:** Phase 24 owns final public page composition, visitor routing, SEO rendering, client-side layout assembly, and visitor-facing page state.
- **Domain Record Origin:** Published domain records originate exclusively from their owning domain platforms (Phase 07 Countries, Phase 11 Universities, Phase 12 Scholarships, Phase 13 Courses, Phase 16 CMS, Phase 18 Tools, Phase 20 Services, Phase 21 Career/Alumni), NOT from Phase 23 or Phase 24.

Phase 24 presents a real-time composition of owner-approved public records plus published Phase 16 CMS navigation/blocks. It does not consume a separate Phase 23 visibility database.

---

### 24.A.6 Brand Identity

**Architectural Commentary**  
The brand identity is a structural attribute of the platform. MANARATAK is recognized as the definitive educational platform for Arabic-speaking students and international scholars.

The platform consistently represents:
- **Educational Excellence:** Uncompromising quality in data presentation.
- **Professionalism:** Enterprise-grade aesthetic and layout stability.
- **Trust:** Accuracy and clear verification signals.
- **Organization:** Structured presentation of complex global educational data.
- **Simplicity:** Elegant abstraction of administrative complexity.
- **Accessibility:** Responsive, high-availability public experience across all devices.

---

### 24.A.7 Growth & Roadmap Scalability

**Architectural Commentary**  
The public platform is engineered as a scalable composition chassis strictly bounded to approved roadmap-scoped entities within the fixed 24-phase Roadmap v6.0.

The architecture ensures that approved domain entities, AI-assisted student tools, educational services, country guides, and university catalogs can be cleanly rendered without requiring structural redesign. Phase 24 strictly prohibits adding unapproved domains, open-ended future sections outside Roadmap v6.0, or un-scoped platform expansions.

---

### 24.A.8 Phase 24 Ownership & Boundary Rules

**Architectural Commentary**  
To prevent architectural drift and maintain clean separation of concerns, the ownership boundaries of Phase 24 are explicitly defined:

#### Phase 24 OWNS:
- Public page composition, layout assembly, and responsive rendering.
- Homepage structure, section arrangement, and hero presentation.
- Public catalog navigation, category routing, and public search presentation.
- Visitor-facing detail page rendering and anonymous exploration flows.
- Public read-model aggregation and SEO page composition.

#### Phase 24 DOES NOT OWN:
- **Domain Persistence & Business Logic:** Owned by respective domain platforms (Phases 07, 10, 11, 12, 13, 14, 16, 18, 19, 20, 21).
- **Import Mechanics & ETL:** Owned by Phase 06 — Enterprise External Data Integration Platform.
- **Student Workspace & Private User State:** Owned by Phase 15 — Enterprise Student Platform (dashboards, saved items, personal progress, search history, notifications display, account settings).
- **Administration & Moderation Queues:** Owned by Phase 23 — Enterprise Administration Portal.
- **CMS Editorial Lifecycle & Authoring:** Owned by Phase 16 — Enterprise CMS.
- **AI Models & Generation Execution:** Owned by Phase 17 — Enterprise AI Platform.
- **Tool Definitions & Orchestration:** Owned by Phase 18 — Enterprise Student Tools Platform.
- **Payments & Financial Transactions:** Owned by Phase 19 — Enterprise Finance & Payments Platform.
- **Service Fulfillment:** Owned by Phase 20 — Enterprise Educational Services Platform.
- **Career & Alumni Records:** Owned by Phase 21 — Enterprise Career & Alumni Platform.
- **Certificate Verification Engines & Storage:** Owned by Phase 14 — Enterprise Certificates Platform and Phase 05 — Enterprise Shared Foundations (Asset Platform).
- **Search Engine Infrastructure & Indexing:** Owned by core shared search/indexing infrastructure.

---

### 24.A.9 Domain Detail Page Composition Rules

**Architectural Commentary**  
Phase 24 composes public detail pages by consuming structured read-model DTOs from their respective domain owners:

- **Country Destination Pages:** Phase 07 owns canonical reference country data; Phase 16 owns editorial country guides; Phase 24 composes the public country destination page.
- **University Detail Pages:** Phase 11 owns university records, campuses, and rankings; Phase 16 owns editorial content; Phase 24 composes the public university detail page.
- **Scholarship Detail Pages:** Phase 12 owns scholarship definitions, eligibility criteria, and domain state; Phase 16 owns editorial copy; Phase 24 composes the public scholarship detail page.
- **Course Detail Pages:** Phase 13 owns course catalog data, origin types, provider metadata, and course lifecycles; Phase 24 composes the public course detail page.
- **Certificate Verification Pages:** Phase 14 owns certificate verification logic; Phase 24 composes the public verification interface.
- **CMS Articles & Guides:** Phase 16 owns editorial articles, categories, and content blocks; Phase 24 composes the public article reading experience.
- **Educational Tools & AI-Assisted Student Tools:** Phase 18 owns tool definitions; Phase 17 owns AI generation; Phase 24 composes the public tool interface and access surfaces.
- **Educational Services Pages:** Phase 20 owns service offerings and fulfillment workflows; Phase 24 composes public service landing pages.
- **Career & Alumni Public Views:** Phase 21 owns career metadata, alumni profiles, and recruitment employer read-models; Phase 24 composes public career and employer read-model pages.

---

### 24.A.10 Core Platform Principles

**Architectural Commentary**  
These enterprise principles govern the public platform vision and design:
- **Organization First:** Structured presentation supersedes decorative experimentation.
- **Educational Value:** Content presentation prioritizes academic clarity and utility.
- **Trust & Transparency:** Clear data sourcing, verification badges, and last-updated timestamps.
- **Boundary Integrity:** Clean delegation of domain state to owning phases.
- **Roadmap Compliance:** Bounded strictly to the fixed 24-phase Roadmap v6.0.

---

### 24.A.11 Enterprise Review & Acceptance

**Architectural Commentary**  
The following criteria constitute formal governance gates for Phase 24 Part A:

- **Vision & Scope Validation:** Validated. Phase 24 is explicitly defined as the public composition and discovery platform within Roadmap v6.0.
- **Boundary Validation:** Validated. Domain ownership, student workspace state, CMS authoring, AI execution, and admin controls are cleanly delegated to their respective owning phases.
- **Governance Validation:** Validated. Command separation between Phase 23 (admin commands) and Phase 24 (public composition) is locked.
- **Readiness Review:** Approved for baseline.

---

### Navigation
[← Phase 23: Enterprise Administration Portal](../phase-23-enterprise-administration-portal/phase-23-01-enterprise-administration-portal-architecture-specification.md) | [Phase 24: Structure Contracts (Part B)](./phase-24-02-enterprise-public-platform-structure-contracts.md) | [Phase 24: Public Pages & User Experience (Part C)](./phase-24-03-enterprise-public-platform-public-pages-user-experience.md) | [Roadmap Completion ]

---

**Status:** APPROVED FOR BASELINE / DOCUMENTATION READY  
**Approver:** Chief Enterprise Architect & Architecture Review Board (ARB)  

## 24.12 Cross-Phase Alignment: Academic Taxonomy (Phase 08)

**Taxonomy Consumption Rules:**
- **Exposure:** The public platform may expose taxonomy-driven filters, categories, and labels ONLY after approved/published domain data exists.
- **Indirect Consumption:** Public major pages and country destination pages should consume Phase 08 taxonomy indirectly through approved Phase 10 (Majors), Phase 11 (Universities), or Phase 12 (Scholarships) data.
- **Strict Prohibition:** The public platform MUST NOT expose staged, imported, draft, or unreviewed taxonomy data.
