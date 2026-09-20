# MANARATAK 2.0: Phase 24 (Enterprise Public Platform) Public Pages & User Experience

**Document ID:** PHASE-24-03-PAGES-UX-SPEC  
**Status:** SOURCE_REBASELINED — RUNTIME_EVIDENCE_PENDING  
**Phase:** 24  
**Domain:** Enterprise Public Platform  
**Artifact:** Part C - Public Pages & User Experience  

---

> **W7 source-rebaseline notice (2026-09-07):** This specification is source-rebaselined under `MNT-AUD-0045` against the remediated owner APIs, Admin/Public composition, source tests and cross-phase traceability. This status is not runtime or production certification; external DB/provider/deployment/browser evidence remains `RUNTIME_EVIDENCE_PENDING`. See `docs/remediation/P23_P24_REBASELINE_TRACEABILITY.md`.

### Navigation
[← Phase 23: Enterprise Administration Portal](../phase-23-enterprise-administration-portal/phase-23-01-enterprise-administration-portal-architecture-specification.md) | [Phase 24: Architecture Spec (Part A)](./phase-24-01-enterprise-public-platform-architecture-specification.md) | [Phase 24: Structure Contracts (Part B)](./phase-24-02-enterprise-public-platform-structure-contracts.md) | [Roadmap Completion ]

---

> **Note:** This phase references the [Enterprise Shared Contracts Specification](../../architecture/shared-contracts/03-enterprise-shared-contracts-specification.md) as the canonical architectural source for shared foundation contracts.  
> **Note:** This phase references the [Enterprise Lifecycle Framework Specification](../../architecture/lifecycle-framework/03-enterprise-lifecycle-framework-specification.md) as the canonical architectural source for all state, status, and lifecycle governance.  
> **Note:** Part C serves as a public page layout, visitor interaction, and experience specification. It defines presentation principles and user journey rules, NOT executable software blueprints, database schemas, or frontend application code.  

---

## Part C — Public Pages & User Experience

### 24.C.1 Public Page Philosophy

**Architectural Commentary**  
The public page philosophy mandates that every page within the MANARATAK public platform provides a consistent, educational experience. The architecture enforces predictable layouts across content domains.

Regardless of whether a visitor views a scholarship, university, course, article, country guide, major, educational service, or student tool, the core experience remains familiar, structured, and organized. Consistent visual pacing allows visitors to focus on evaluating educational opportunities without re-learning navigation paradigms.

---

### 24.C.2 Standard Public Page Layout Skeleton

**Architectural Commentary**  
To guarantee visual consistency, all public pages across the ecosystem share a standard structural layout chassis:

- **Master Header:** Branding logo, bilingual title, central search input, login action (routing to Phase 15), and navigation controls.
- **Page Hero / Title Header:** Breadcrumb navigation, primary title, and high-level metadata badges.
- **Primary Content Body:** Unfragmented presentation of core entity details and read-model attributes.
- **Structured Detail Sections:** Tabbed or vertically stacked metadata cards (e.g., eligibility, deadlines, provider details).
- **Related Educational Resources:** Contextual suggestions driving horizontal discovery across related roadmap domains.
- **In-Text Semantic Links:** Contextual links embedded in editorial text to route visitors to related entity pages.
- **Primary Action Surface:** Call-to-action buttons (e.g., "Apply Now", "View Course", "Explore University", "Launch Tool").
- **Trust & Verification Signals:** Verification badges, last-updated timestamps, and authority tags.
- **Global Footer:** Platform links, copyright, compliance disclosures, and site navigation.

---

### 24.C.3 Educational Entity Presentation

**Architectural Commentary**  
Educational entities act as authoritative, structured information nodes. Public pages focus deeply on their primary dataset while surfacing connected pathways to related roadmap resources.

When presenting educational entities—including Scholarships (Phase 12), Universities (Phase 11), Courses (Phase 13), Countries (Phases 07 & 16), Majors (Phase 10), Articles & Guides (Phase 16), Educational Services (Phase 20), Educational Tools & AI-assisted Student Tools (Phases 17 & 18), and Career/Alumni Read-Models (Phase 21)—each public page presents its primary data and acts as a router to related opportunities.

For example, a University page details campus locations, academic rankings, and offered majors, while linking directly to accepted Scholarships and relevant Country Destination Guides.

---

### 24.C.4 Related Content Flow & Connected Knowledge

**Architectural Commentary**  
Every public page dynamically bridges visitors to related educational information through a connected semantic graph:

**Scholarship (Phase 12)**  
->  
**Related University (Phase 11)**  
->  
**Country Destination Guide (Phases 07 & 16)**  
->  
**Eligible Majors (Phase 10)**  
->  
**Related Courses (Phase 13)**  
->  
**Educational Articles (Phase 16)**  
->  
**Educational Services (Phase 20)**  
->  
**AI-assisted Student Tools (Phases 17 & 18)**  

Educational terminology embedded in unstructured editorial copy automatically renders as contextual navigation links, driving continuous exploration.

---

### 24.C.5 Visitor Interaction Principles

**Architectural Commentary**  
Interaction with public pages must be frictionless, intuitive, and aligned with visitor discovery intent:

- **Intuitive Navigation:** Clear pathways requiring zero user training.
- **Predictable Behavior:** Consistent action responses across all domain pages.
- **Zero Modal Friction:** Direct display of core metadata without unnecessary intermediate popups.
- **Seamless Progression:** Transitioning from macro discovery to micro detail pages while preserving navigation context.
- **Clean Authentication Gateways:** Login buttons clearly route visitors to Phase 15 — Enterprise Student Platform for authenticated workspace access.

---

### 24.C.6 Content Presentation Principles

**Architectural Commentary**  
Educational data is inherently complex. The public platform distills this complexity into clear, scannable layouts:

- **Clarity:** Plain, unambiguous language and structured field formatting.
- **Hierarchy:** Logical progression from high-level summaries to granular details.
- **Scannability:** Clear visual tags for key decision factors (e.g., application deadlines, free tuition claims, language requirements).
- **Readability:** Optimized typography and generous line spacing for long-form reading.
- **Consistency:** Standard visual components used globally for identical data types.

---

### 24.C.7 Accessibility & Responsive Design

**Architectural Commentary**  
The public platform guarantees equivalent presentation quality across mobile, tablet, and desktop viewports:

- **Desktop Viewports:** Multi-column layouts utilizing available screen width for structured sidebars and related resource panels.
- **Mobile Viewports:** Fluid single-column stacks with touch-friendly touch targets (minimum 44px) and sticky action bars.
- **Accessibility:** WCAG AA contrast compliance, semantic HTML elements, and screen-reader accessible navigation controls.

---

### 24.C.8 Public Visual Identity Application

**Architectural Commentary**  
Public visual styling follows the active MANARATAK semantic-token system implemented by `apps/web/src/features/public-template/template.css`; raw palette names are not architecture authority.

- **Primary / Navy:** `--mn-primary: #142B5F` for the principal brand surface and high-emphasis controls.
- **Secondary / Teal:** `--mn-secondary: #0E7C86`; interactive hover/secondary emphasis follows the same semantic family.
- **Digital Accent:** teal/digital accents are expressed through shared semantic variables rather than a retired emerald brand anchor.
- **Gold Accent:** `--mn-accent: #D6A43B` and `--mn-accent-soft: #F2CD78` for high-value highlights, verified emphasis, and selected callouts.
- **Canvas / Foreground:** white and neutral surfaces must preserve WCAG AA contrast using semantic foreground tokens.
- **Visual Pacing:** spacing, radius, elevation and typography must consume shared public-template tokens/components rather than page-local visual contracts.

The former **Emerald Green primary-brand** instruction is superseded and historical. Component-level state colors (for example an emerald success badge) are allowed only as semantic status colors and do not redefine the MANARATAK brand identity.

---

### 24.C.9 Course Catalog and Detail Page Experience

**Architectural Commentary**  
To prevent domain duplication or fragmentation, Phase 24 acts strictly as a presentation and composition tier for course offerings. Phase 24 composes public course pages using read-model DTOs supplied by Phase 13 — Enterprise Course Platform.

#### 1. Core Catalog Isolation
The public course interface composed by Phase 24 visually isolates three distinct, non-overlapping catalogs:
- **`Manaratak Courses`**: Presents native courses authored and delivered inside the internal LMS of Phase 13.
- **`Global Free Courses`**: Presents external courses imported and indexed from trusted global providers. These must be free to study or provide a free certificate.
- **`Paid Auxiliary Courses and Services`**: Presents paid offerings such as international test preparation (IELTS/TOEFL) and document prep services. These remain visually and semantically separate from free course listings. Payment execution belongs exclusively to Phase 19, while domain fulfillment is managed by Phase 18 or Phase 20. No free claims are mixed with paid offerings.

#### 2. Provider Cards & Pages
Phase 24 displays provider listings using compact metadata DTOs supplied by Phase 13:
- Each provider card renders `providerName`, `providerSummary`, `numberOfCourses`, `freeCourseCount`, and provider logo assets sourced from Phase 05 Asset Platform (`AssetId` / `AssetReference`).
- Selecting a provider card filters the catalog to display that specific provider's offerings.

#### 3. Course-Card Presentation
When rendering course cards and search result items, Phase 24 displays parameters supplied by Phase 13 DTOs:
- Displays `courseName`, `providerName`, `learningLanguage`, `studyDuration`, difficulty levels, and explicit badges for `isFreeCourse` or `isFreeCertificate`.
- External action buttons use `directCourseUrl`. This URL points directly to the specific course landing page on the provider's platform, never to a general provider homepage.

#### 4. Course Detail Page Presentation & Boundaries
Phase 24 composes the public Course Detail Page by aggregating read-model DTOs from Phase 13:
- Renders full details including curriculum summaries, learning languages, study durations, difficulty tiers, skill outcomes, and verification timestamps.
- **Boundary Rule**: Phase 24 presents public course previews, syllabus overviews, and provider information. Authenticated student workspace behavior, active progress tracking, lesson progression, personal dashboards, and user course state belong exclusively to Phase 15 — Enterprise Student Platform and Phase 13 LMS execution. Certificate generation and verification belong to Phase 14, with physical assets stored via Phase 05. Phase 24 does NOT own or redefine course lifecycles, progress state, or validation rules.

---

### 24.C.10 Enterprise Review & Acceptance

**Architectural Commentary**  
The following criteria constitute formal governance gates for Phase 24 Part C:

#### 24.C.10.1 Public Experience Validation
- **Layout Consistency:** Validated. Standard layout skeleton enforced across all public domain pages.
- **Connected Knowledge:** Validated. Contextual semantic graph bridges all roadmap domains.
- **Boundary Integrity:** Validated. Authenticated workspace state delegated to Phase 15, admin controls to Phase 23, AI execution to Phase 17, and course LMS state to Phase 13.
- **Course Catalog Compliance:** Validated. Strict separation of native, global free, and paid auxiliary courses enforced. External URLs point directly to course landing pages (`directCourseUrl`).

#### 24.C.10.2 Acceptance Criteria
- Defines public page presentation, layout skeletons, and visitor interaction principles.
- Establishes clear separation between public composition (Phase 24), student workspace state (Phase 15), and admin commands (Phase 23).
- Provides unambiguous experience specifications without code implementation artifacts.

#### 24.C.10.3 Architecture Review Checklist
- [x] Standard Public Page Skeleton Validation
- [x] Educational Entity Presentation & Connected Pathways Validation
- [x] Visitor Interaction & Accessibility Principles
- [x] Course Catalog Isolation & Direct Course URL Validation
- [x] Scope & Boundary Compliance (Phase 15, 17, 18, 21, 23, 24)
- [x] Readiness Review

#### 24.C.10.4 ARB Decision

**Decision:** Approved for Baseline / Documentation Ready  
**Approver:** Chief Enterprise Architect & Architecture Review Board (ARB)  

---

### Navigation
[← Phase 23: Enterprise Administration Portal](../phase-23-enterprise-administration-portal/phase-23-01-enterprise-administration-portal-architecture-specification.md) | [Phase 24: Architecture Spec (Part A)](./phase-24-01-enterprise-public-platform-architecture-specification.md) | [Phase 24: Structure Contracts (Part B)](./phase-24-02-enterprise-public-platform-structure-contracts.md) | [Roadmap Completion ]

---

**Status:** APPROVED FOR BASELINE / DOCUMENTATION READY  
**Approver:** Chief Enterprise Architect & Architecture Review Board (ARB)  
