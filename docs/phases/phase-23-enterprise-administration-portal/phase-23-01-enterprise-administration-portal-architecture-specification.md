# MANARATAK 2.0: Phase 23 (Enterprise Administration Portal) Enterprise Architecture Specification

**Document ID:** PHASE-23-01-ARCH-SPEC  
**Status:** SOURCE_REBASELINED — RUNTIME_EVIDENCE_PENDING  
**Phase:** 23  
**Domain:** Enterprise Administration Portal  
**Artifact:** Part A - Administration Vision & Management Philosophy  

---

> **W7 source-rebaseline notice (2026-09-07):** This specification is source-rebaselined under `MNT-AUD-0045` against the remediated owner APIs, Admin/Public composition, source tests and cross-phase traceability. This status is not runtime or production certification; external DB/provider/deployment/browser evidence remains `RUNTIME_EVIDENCE_PENDING`. See `docs/remediation/P23_P24_REBASELINE_TRACEABILITY.md`.

### Navigation
[← Phase 22: Enterprise Product Experience](../phase-22-enterprise-product-experience/phase-22-01-enterprise-product-experience-architecture-specification.md) | [Phase 23: Structure Contracts (Part B)](./phase-23-02-enterprise-administration-portal-structure-contracts.md) | [Phase 23: Workflows & Operational Experience (Part C)](./phase-23-03-enterprise-administration-portal-workflows-operational-experience.md) | [Phase 24: Enterprise Public Platform →](../phase-24-enterprise-public-platform/phase-24-01-enterprise-public-platform-architecture-specification.md)

---

> **Note:** This phase references the [Enterprise Shared Contracts Specification](../../architecture/shared-contracts/03-enterprise-shared-contracts-specification.md) as the canonical architectural source for shared foundation contracts.  
> **Note:** This phase references the [Enterprise Lifecycle Framework Specification](../../architecture/lifecycle-framework/03-enterprise-lifecycle-framework-specification.md) as the canonical architectural source for all state, status, and lifecycle governance.  
> **Note:** Phase 23 defines the administration UI, admin workflows, moderation queues, approval screens, review dashboards, operational task views, admin command surfaces, administrative read-model presentation, and cross-domain admin orchestration.  

---

## 23.A.1 Administration Portal Vision

**Architectural Commentary**  
The Administration Portal serves as the unified administrative command center orchestrating operational workflows across the MANARATAK ecosystem. It provides administrators with a single, cohesive management environment for reviewing content, monitoring platform health, executing moderation tasks, and configuring operational parameters.

The vision for Phase 23 is to function as a centralized administrative operating surface. It abstracts underlying domain services and databases into unified review dashboards and control panels. Crucially, Phase 23 owns administrative interfaces and orchestration workflows, while delegating core domain business logic, data persistence, and public rendering to their respective domain platforms across the fixed 24-phase roadmap.

---

## 23.A.2 Administration Philosophy

**Architectural Commentary**  
The architectural mandate for MANARATAK relies on administrative convergence. The platform is intentionally designed around a single, centralized administration portal user experience.

There are strictly no fragmented administrative panels scattered across different domains. Every administrative operation-whether reviewing a university record, auditing a course listing, or approving a scholarship opportunity-is performed from one unified administration environment.

The architectural benefits of this centralized philosophy include:
- **Elimination of Administrative Silos:** Operational workflows and task queues live in a single, predictable interface.
- **Uniform Security Governance:** Identity, role-based access control (RBAC/ABAC), and audit logging are uniformly governed by Phase 05 infrastructure contracts.
- **Operational Cohesion:** Administrators utilize consistent interaction patterns across all roadmap domains without toggling between disparate management tools.
- **Maintainable Management Surfaces:** System updates to administrative layouts and component libraries deploy centrally without interface version drift.

---

## 23.A.3 Administrative Users & Security Governance

**Architectural Commentary**  
The security architecture of the Administration Portal is grounded in strict access governance, identity verification, and complete operational auditability.

Administrative users are defined and governed as follows:
- **System Owner (Primary Administrator):** Operates with governed super-admin authority constrained strictly by Identity and Access Management (Phase 05), RBAC/ABAC rules, mandatory audit logging, maker-checker approval chains, and emergency policy bounds.
- **Backup Administrator (Emergency Administrative Access):** Operates as a break-glass access role with full audit logging, multi-factor verification, and time-bound revocation rules, utilized strictly for business continuity and disaster recovery.
- **Delegated Administrative Roles:** Scoped roles (e.g., Content Reviewer, Translation Reviewer, Moderation Agent) configured with least-privilege permissions mapped to specific administrative views.

---

## 23.A.4 Administration Dashboard Philosophy

**Architectural Commentary**  
The Administration Dashboard acts as an operational read-model command view. Following the Phase 23 Governance Sprint, its design philosophy strictly avoids vanity metrics or fake KPIs, focusing entirely on actionable, enterprise-wide observability, system readiness, and audit safety derived from domain platform telemetry.

To prevent operational accidents, high-risk direct pipelines (e.g. immediate database backups, mass broadcasting, and AI recommendation matching weight adjustments) are explicitly demoted to non-interactive protected placeholders labeled with their appropriate integration requirements (e.g., *Requires production integration*, *Requires approval workflow*, *Requires dedicated module*).

The Dashboard is structurally organized into six safe control-plane modules:
1. **System & Services Status Indicators:** Displays real-time status signals for APIs, database preview mode, Redis queue integration blockers, import engines, and administrative authentication.
2. **Pending Review & Quality Verification Queue:** Serves as an aggregate control-plane overview of pending work across platform domain modules (Scholarships, Universities, Majors, Courses, International Tests, Services, CMS). Crucially, the Review Queue does not own domain review logic, nor does it edit, publish, import, or delete domain records directly. Domain workspaces remain the sole source of truth for detailed review and lifecycle actions; Phase 23 only composes pending-work read models and routes administrators to the appropriate domain admin workspace.
3. **Generic Import Control Plane:** Serves as a multi-domain control plane for data ingestion across all platform modules (Scholarships, Universities, Majors, Courses, International Tests, Services, CMS). The main Import Management page (`/admin/imports`) provides a generic multi-domain overview with domain summary cards, active sources summary, and read-only import operations audit tables. Clicking 'Start Import' on any domain card routes to a dedicated Domain Import Center page (`/admin/imports/:domainKey`) featuring domain-specific provider cards (e.g. DAAD, Chevening, Coursera, edX, ISCED, IELTS/TOEFL) and a 6-step Import Wizard. Crucially, Phase 23 controls UI/navigation only; Phase 06 owns generic import mechanics, while domain phases retain sole authority over validation schemas, completeness classification, deduplication, and domain workspace transfer handoffs without auto-publishing or uncontrolled web crawling.
4. **Content Public-Publishing Readiness Metrics:** Evaluates content completeness and readiness scores for public release.
5. **Safe Quick Shortcuts:** Offers direct links to scoped management panels (Imports, Review Queue Overview, Scholarships, Universities, Diagnostics, and RBAC Settings).
6. **Safe Operational & Audit Activity Log:** Exposes read-only, non-deletable audit trails of admin actions. Destructive operations (such as deleting audit entries) are strictly forbidden to ensure data compliance.

Every module presented serves a direct operational decision-making purpose, enabling administrators to monitor platform health, verify ingestion completeness, and dispatch safe commands efficiently.

---

## 23.A.5 Unified Content Lifecycle & Admin Workflows

**Architectural Commentary**  
In an enterprise ecosystem, operational workflows must follow structured pipelines. The administration architecture mandates that content review and moderation follow a unified administrative lifecycle.

No administrative view operates in isolation. Every workflow natively advances content through defined administrative gates:

**Import Ingestion (Phase 06)**  
->  
**Triage & Review (Phase 23)**  
->  
**Metadata Enrichment & Editing (Phase 23 / Domain APIs)**  
->  
**Translation Review (Phase 23 / Phase 17)**  
->  
**Publication Approval (Phase 23)**  
->  
**Public Composition & Rendering (Phase 24)**  

This operational pipeline applies consistently across scholarships (Phase 12), universities (Phase 11), courses (Phase 13), articles (Phase 16), educational services (Phase 20), educational tools (Phase 18), and all approved roadmap-scoped entities.

---

## 23.A.6 Administrative Simplicity

**Architectural Commentary**  
Enterprise control does not require cognitive clutter. The Administration Portal is engineered to prioritize administrative efficiency and clear task focus.

The portal strictly adheres to the following principles:
- **Simple:** Stripped of unnecessary visual noise and redundant navigational layers.
- **Organized:** Hierarchically structured so that related management tasks reside in predictable locations.
- **Fast:** Instantaneous data retrieval and command execution using optimized read-models.
- **Practical:** Focused entirely on operational fulfillment without theoretical abstractions.
- **Efficient:** Minimizing clicks and context switches required to complete moderation tasks.

---

## 23.A.7 Cross-Phase Boundaries & Domain Delegations

**Architectural Commentary**  
Phase 23 owns administrative UI screens, moderation workflows, review queues, approval dashboards, operational command surfaces, and cross-domain administrative orchestration. Phase 23 explicitly does NOT own domain business logic, data schemas, or runtime execution services.

Domain ownership boundaries are strictly delegated across the 24-phase roadmap as follows:
- **Phase 05 - Enterprise Foundation / EAP:** Owns the relevant foundation capabilities, including IAM/security infrastructure and immutable asset handles where defined by the Foundation architecture.
- **Phase 06 - Universal Import Infrastructure:** Owns generic import mechanics (acquisition, parsing, batching, retry/audit/provenance mechanics), not downstream domain truth.
- **Phase 07 - Global Reference Data:** Owns canonical country/region/city/language/currency and shared reference identity/resolution.
- **Phase 08 - Academic Taxonomy:** Owns academic taxonomy, classification hierarchy and DegreeLevel. It does **not** own canonical Majors.
- **Phase 09 - International Tests:** Owns canonical international-test identity and test lifecycle/reference semantics.
- **Phase 10 - Majors & Disciplines:** Owns canonical Major identity, aliases/equivalency, major lifecycle and Major read models.
- **Phase 11 - Universities & Institutions:** Owns university/institution/campus records, AcademicPrograms and university-domain validation/admissions requirements.
- **Phase 12 - Scholarships:** Owns scholarship definitions, eligibility, benefits/documents and canonical scholarship relationships. It is not assigned a general Student Workspace or broad application-processing platform here.
- **Phase 13 - Learning:** Owns course catalog, curriculum, learning paths, progression and completion facts; it publishes completion events and does not issue certificates.
- **Phase 14 - Enterprise Certificates:** Owns certificate issuance, verification, revocation, template/signature policy and credential lifecycle.
- **Phase 15 - Student Workspace:** Owns private student profile/workspace state, saved collections, recently viewed/history, privacy/preferences, dashboard state and references to domain-owned records. It does **not** own broad university/scholarship application processing unless a future Roadmap/ADR explicitly assigns that owner.
- **Phase 16 - Enterprise CMS:** Owns editorial content/version/localization/SEO lifecycle; it does not own domain business records.
- **Phase 17 - Enterprise AI Platform:** Owns AI provider/model routing, prompts, inference, embeddings, safety and AI cost/execution governance.
- **Phase 18 - Enterprise Student Tools Platform:** Owns tool registry, tool orchestration, tool lifecycle/experience and outputs; AI execution remains Phase 17.
- **Phase 19 - Finance & Payments:** Owns payments, ledger, invoices, refunds, settlement and financial execution/status.
- **Phase 20 - Enterprise Services:** Owns service catalog/request/fulfillment/provider-dispatch semantics; payment execution remains Phase 19.
- **Phase 21 - Career & Alumni Platform:** Owns jobs/internships, career applications, alumni profiles and bounded recruitment metadata; no standalone Organizations & Employers platform exists.
- **Phase 22 - Product Experience:** Owns product identity, personas, experience principles and UX objective contracts, not business-domain persistence.
- **Phase 23 - Enterprise Administration Portal:** Owns administrative UI/control-plane composition, review/approval surfaces and command dispatch. It does not own domain persistence/business logic.
- **Phase 24 - Enterprise Public Platform:** Owns public layout composition, visitor routing, SEO and page assembly; published domain truth remains with its P7–P21 owner.

---

## 23.A.8 Tool Administration Governance

**Architectural Commentary**
Phase 23 owns admin screens, dashboards, controls, and governance workflows for managing the visibility and operational status of tools. Phase 23 does not own tool definitions, tool execution, AI execution, deterministic logic, generated outputs, or public presentation.

Domain ownership mapping for tool governance:
- **Phase 18 - Enterprise Student Tools Platform** remains the owner of the Official Tool Registry Backlog, tool metadata, execution orchestration, tool lifecycle model, input/output schemas, and execution contracts.
- **Phase 17 - Enterprise AI Platform** remains the only owner of AI execution, prompts, model routing, provider integrations, safety filters, and AI cost governance.
- **Phase 24 - Enterprise Public Platform** remains the public presentation and composition owner for public tool pages.
- **Phase 15 - Enterprise Student Platform** remains the authenticated student workspace owner for saved results, private usage history, and dashboard embedding.
- **Phase 05 - Core Implementation / Enterprise Asset Platform** remains the owner of generated files and persisted assets through AssetId / AssetReference.
- **Phase 19 - Enterprise Finance & Payments Platform** owns payment execution if a tool becomes paid or monetized.

**Admin Capability Requirements**
The Administration Portal must support management of:
- Tool enable/disable status.
- Launch visibility: Active, Coming Soon, Under Development, Hidden/Admin Only, Disabled, Retired.
- Implementation priority: P1 Core Launch, P2 Expansion, P3 Later.
- Public availability.
- Authenticated-only availability.
- Anonymous execution permission.
- Rate-limit profile.
- Cost-risk profile for AI-Delegated or Hybrid tools.
- Regional/language availability.
- Tool lifecycle review.
- Moderation or safety review status.
- Dependency health indicators.
- Last updated metadata and audit trail.

**Admin/Internal Tool Governance**
Explicitly, Admin/Internal tools from Phase 18 (such as import completeness checkers, duplicate review helpers, missing-data assistants, imported record deduplication reviewers, and source trust reviewers) are managed only through Phase 23 admin workflows. 
- These tools must never be exposed on public Phase 24 pages.
- Phase 23 may provide admin UI for these tools, but does not own their validation authority.
- Phase 06 - Import Foundation owns generic import mechanics only. 
- Each downstream domain owns its own import schemas, rules, deduplication authority, enrichment authority, and publish-readiness decisions (Phase 10 - Major Platform, Phase 11 - Universities & Institutions, Phase 12 - Scholarships, Phase 13 - Learning Platform).

---

## 23.A.9 Course Administration Governance

**Architectural Commentary**
Phase 23 owns admin screens, moderation workflows, review queues, operational dashboards, and admin UX for course management. Phase 23 does not own course entities, curriculum rules, course publishing authority, learning progress, assessments, payment logic, certificates, or media storage.

Domain ownership mapping for course governance:
- **Phase 13 - Learning Platform** remains the sole owner of course records, native course authoring logic, course metadata, modules, lessons, learning materials, quizzes, exams, assignments, question banks, enrollment, progress, completion rules, and CourseCompleted / LearningPathCompleted events.
- **Phase 05 - Core Implementation / Enterprise Asset Platform (EAP)** owns all video, image, PDF, subtitle, thumbnail, SCORM, downloadable material, and preview assets through AssetId / AssetReference.
- **Phase 14 - Enterprise Certificates Platform** owns certificate generation and verification.
- **Phase 19 - Enterprise Finance & Payments Platform** owns checkout, invoices, refunds, and settlement for paid courses.
- **Phase 24 - Enterprise Public Platform** owns public course page composition only.
- **Phase 16 - Enterprise CMS** may own long-form editorial/marketing copy about courses, but not course entities, curriculum, LMS content, or publishing authority.
- **Phase 20 - Enterprise Services Platform** owns non-course paid services only.

**Admin Course Management Capabilities**
The Administration Portal must support screens/workflows for:
- Add new course.
- Edit course metadata.
- Configure course type/origin: `NativeManaratakCourse`, `ExternalLinkedCourse`, `PaidCourse`, and `RelatedPaidService` (as cross-link only, not a course record).
- Configure free/paid status.
- Configure course language, level, duration, category/tags, target majors/disciplines, and prerequisites.
- Configure instructor/provider metadata.
- Configure course visibility and draft/review/approval/published/archived lifecycle.
- Preview public course page before publishing.

**Curriculum Builder Requirements**
The admin course builder must support:
- Curriculum/syllabus editor.
- Module creation and ordering.
- Lesson creation and ordering.
- Lesson type selection: Video lesson, Text lesson, PDF/document lesson, Quiz lesson, Assignment lesson, External link lesson, Mixed media lesson.
- Required/optional lesson markers and estimated lesson duration.
- Completion requirement settings and lock/unlock/prerequisite rules between lessons/modules.

**Media and Asset Management Requirements**
The admin UI must support attaching learning assets via Phase 05 EAP only (Course thumbnail, cover image, lesson video, lesson images, PDFs/documents, subtitles, audio, SCORM packages if supported, downloadable materials, preview assets).
- **Boundary**: Phase 23 uploads/selects/links assets through EAP controls only. Phase 23 must not store raw files, direct storage URLs, CDN URLs, or physical paths. Course documents and media are referenced using AssetId / AssetReference only.

**Quizzes, Exams, Assignments, and Question Bank Management**
The admin workflow must support:
- Create quiz, exam, assignment, question bank.
- Add/edit questions (Types: Multiple choice, True/false, Short answer, Essay, Matching, Ordering, File upload assignment if supported by Phase 13).
- Difficulty level, tags and taxonomy mapping, randomized question pools, attempt limits, timer settings, passing score, manual review flag, auto-grading settings where supported, feedback/explanation fields, and assessment publication state.
- **Boundary**: Phase 13 owns assessment/question domain logic. Phase 23 only provides admin UI and command surfaces and must not calculate grades outside approved Phase 13 commands.

**Paid Course Administration**
The admin workflow must support:
- Mark course as paid.
- Assign price reference or pricing configuration through Phase 19-approved integration.
- Display payment readiness state, checkout availability, and refund/settlement dependency notes.
- **Boundary**: Phase 19 owns payment execution, invoices, refunds, and settlement. Phase 13 owns course access rules after payment confirmation. Phase 23 only displays/administers configuration and status.

**Scholarship Admin Workspace & Import Center Boundaries**
The administration architecture enforces a strict separation of concerns between raw data ingestion and scholarship lifecycle management:
- **Scholarship Admin Workspace (`/admin/scholarships`)**: Dedicated to review, editing, naming normalization inspection, completeness classification, safe missing-field merging, approval, publishing, unpublishing, rejection, and archiving of scholarship records.
- **Scholarship Import Center (`/admin/imports/scholarships`)**: Dedicated to ingestion controls, source provider feeds, and batch processing. The Scholarship Admin Workspace does not manage raw provider feeds or execute raw ingestion engines directly.
- **Fetch Missing Fields Workflow**: An admin-triggered enrichment action ("Fetch Missing Fields from Official Source" / "جلب النواقص من المصدر الرسمي") that checks official source URLs and suggests missing fields only (benefits, majors, criteria, documents, deadlines, links). It never overwrites previously reviewed/admin-approved fields silently and always requires explicit administrator preview and confirmation.
- **Publication & Public Visibility**: No auto-publish is permitted. Public visibility on Phase 24 public pages occurs exclusively after manual administrative publishing. Public links are accessible only when status is Published.
- **Boundaries**: Phase 23 owns admin UX composition only. Phase 12 owns scholarship naming normalization, deduplication, completeness classification, safe merge rules, and domain lifecycle rules. Phase 06 owns generic import mechanics. Phase 24 owns public rendering.

**University Admin Workspace & Import Center Boundaries**
The administration architecture enforces a strict separation of concerns between raw data ingestion and university lifecycle management:
- **University Admin Workspace (`/admin/universities`)**: Uses a lightweight vertical list for quick scanning. Detailed management, review, editing, naming normalization inspection, completeness classification, safe missing-field merging, approval, and publishing occur inside the dedicated University Details page (`/admin/universities/:id`).
- **University Import Center (`/admin/imports/universities`)**: Dedicated to ingestion controls, source provider feeds, and batch processing. The University Admin Workspace does not manage raw provider feeds or execute raw ingestion engines directly.
- **Fetch Missing Fields Workflow**: An admin-triggered enrichment action ("Fetch Missing Fields from Official Website" / "جلب النواقص من الموقع الرسمي") that checks official website URLs and suggests missing fields only (logo, faculties, programs, requirements, tuition, accreditations). It never silently overwrites previously reviewed/admin-approved fields and always requires explicit administrator preview and confirmation.
- **Publication & Public Visibility**: No auto-publish is permitted. Public visibility on Phase 24 public pages occurs exclusively after manual administrative publishing. Public links are accessible only when status is Published.
- **Boundaries**: Phase 23 owns admin UX composition only. Phase 11 owns university domain data, official-source validation, deduplication, completeness rules, and university lifecycle. Phase 06 owns generic import mechanics. Phase 24 owns public rendering.

**Majors Admin Workspace & Import Center Boundaries**
The administration architecture enforces a strict separation of concerns between raw taxonomy ingestion and academic majors lifecycle management:
- **Majors Admin Workspace (`/admin/majors`)**: Uses a lightweight vertical list for quick scanning (displaying major name, degree level, college/field, CIP/ISCED code, job demand level, and status). Detailed management, review, editing, naming normalization inspection, completeness classification, safe missing-field merging, approval, and publishing occur inside the dedicated Major Details page (`/admin/majors/:id`).
- **Majors Import Center (`/admin/imports/majors`)**: Dedicated to taxonomy ingestion controls, CIP/ISCED feeds, and batch processing. The Majors Admin Workspace does not manage raw provider feeds or run raw CIP/ISCED sync engines directly.
- **Fetch Missing Fields Workflow**: An admin-triggered enrichment action ("Fetch Missing Fields from Trusted Source" / "جلب النواقص من مصدر موثوق") that checks trusted major/classification sources (CIP, ISCED, official program catalogs) and suggests missing fields only (classification code, academic field, degree level mapping, description, acquired skills, career outcomes, related majors, typical courses). It never silently overwrites previously reviewed/admin-approved fields and always requires explicit administrator preview and confirmation.
- **AI Description Suggestion Workflow**: An admin-triggered AI feature ("Suggest Student-Friendly Description" / "اقتراح وصف مبسط للطلاب"). Phase 17 generates a draft only, which must never publish automatically and requires administrative review and approval before becoming active.
- **Publication & Public Visibility**: No auto-publish is permitted. Public visibility on Phase 24 public pages occurs exclusively after manual administrative publishing. Public links are accessible only when status is Published.
- **Boundaries**: Phase 23 owns admin UX/control-plane composition only. Phase 10 owns major domain data, naming normalization, deduplication, completeness rules, and major lifecycle. Phase 08 owns taxonomy, degree levels, and classification hierarchy governance. Phase 06 owns generic import mechanics. Phase 16 owns reviewed editorial publishing where applicable. Phase 17 only provides AI draft suggestions. Phase 24 owns public rendering.

**International Tests Admin Workspace & Import Center Boundaries**
The administration architecture enforces a strict separation of concerns between raw exam data ingestion and standardized tests lifecycle management:
- **International Tests Admin Workspace (`/admin/international-tests`)**: Uses a lightweight vertical list for quick scanning (displaying test name, official provider/owner, minimum required score/range, validity duration, status, and view details action). Detailed management, review, editing, naming normalization inspection, completeness classification, safe missing-field merging, approval, and publishing occur inside the dedicated Test Details page (`/admin/international-tests/:id`).
- **Tests Import Center (`/admin/imports/international-tests`)**: Dedicated to ingestion controls, exam provider feeds, and batch processing. The International Tests Admin Workspace does not manage raw provider feeds or execute raw ingestion engines directly.
- **Fetch Missing Fields Workflow**: An admin-triggered enrichment action ("Fetch Missing Fields from Official Source" / "جلب النواقص من المصدر الرسمي") that checks official provider websites (ETS, British Council, College Board) and suggests missing fields only (official registration URL, test fee/currency, test centers, available countries, validity duration, score scale, registration requirements, preparation links, sample material asset references via Phase 05 EAP). It never silently overwrites previously reviewed/admin-approved fields and always requires explicit administrator preview and confirmation.
- **Publication & Public Visibility**: No auto-publish is permitted. Public visibility on Phase 24 public pages occurs exclusively after manual administrative publishing. Public links are accessible only when status is Published.
- **Boundaries**: Phase 23 owns admin UX/control-plane composition only. Phase 09 owns international test domain data, test naming normalization, deduplication, completeness rules, fee/score/center metadata, and test lifecycle. Phase 06 owns generic import mechanics. Phase 05 EAP owns sample/preparation asset references. Phase 19 owns payment processing for paid services if applicable. Phase 24 owns public rendering.

**Courses Admin Workspace Architecture & Section Separation Boundaries**
The administration architecture enforces a strict tripartite division within the Courses Admin Workspace:
- **Courses Landing Workspace (`/admin/courses`)**: Presents three distinct, dedicated section cards separating Native MANARATAK Courses, Imported External Courses, and Paid Courses.
- **Native MANARATAK Courses Workspace (`/admin/courses/native`)**: Dedicated exclusively to courses authored directly inside MANARATAK. Native courses are NOT imported courses and are created/authored natively.
  - **Lightweight Vertical List**: Displays course title, category/field, level (Beginner/Intermediate/Advanced), language, price type (Free/Paid/Draft Pricing), status, and view details action. Detailed curriculum, modules, lessons, question banks, media assets, and certificate settings are managed exclusively inside the Native Course Detail page (`/admin/courses/native/:id`).
  - **Native Authoring Wizard**: A 6-step creation wizard (Course Basics -> Curriculum Builder -> Media & Attachments via EAP -> Assessments & Question Bank -> Certificate Settings -> Review & Publish Readiness).
  - **Domain Ownership & Boundaries**: Phase 13 owns native course curriculum, modules, lessons, question banks, assessments, course progression, and course publishing. Phase 05 EAP owns uploaded video, PDF, and image assets via EAP Asset Ref IDs. Phase 14 owns certificate generation and issuance upon student completion (Admin configures eligibility criteria and template reference IDs only; Phase 13 does not issue certificates directly). Phase 19 owns checkout, payment execution, and subscriptions for monetized courses (Phase 13 sets store pricing metadata only). Phase 20 owns non-course paid student services and must NOT reclassify native courses as services. Phase 23 owns admin control-plane composition only. Phase 24 owns public rendering only.
- **Imported External Courses (`/admin/imports/courses`)**: Dedicated to external catalog feeds and batch ingestion. Native course authoring does not link to or manage raw external import feeds directly.
- **Paid Courses Overview (`/admin/courses/paid`)**: Overview of monetized course offerings integrated with Phase 19 store management.
- **Publication & Public Visibility**: No auto-publish is permitted. Courses require completeness verification across basics, curriculum, media, and assessments before publishing. Public visibility on Phase 24 public pages occurs exclusively after manual administrative publishing.

---

## 23.A.10 Scope Creep Prevention & Roadmap Scalability

**Architectural Commentary**  
The Administration Portal acts as an extensible chassis strictly for approved roadmap-scoped modules within the fixed 24-phase roadmap.

Future administrative enhancements are constrained to:
- Adding configured admin views for approved roadmap-scoped entities.
- Integrating admin governance controls for Phase 17 AI services and translation workflows.
- Enhancing operational telemetry dashboards over existing domain read-models.
- Expanding role-based administrative task routing within Phase 05 security policies.

Phase 23 strictly prohibits the creation of unapproved domain entities, standalone external platforms, or expansion beyond the baselined 24-phase architecture.

---

## 23.A.10.1 Courses Administration Tripartite Structure

**Architectural Commentary**  
The Courses Administration Workspace in Phase 23 is structured into three dedicated administrative sections:
1. **Native MANARATAK Courses (`/admin/courses/native`):**
   - Owns authoring, curriculum building, lessons, question banks, assessments, media management, and completion certificate issuance.
   - Domain logic owned by Phase 13 (Learning Architecture) and Phase 05 EAP (Asset management).
2. **Imported External Courses (`/admin/courses/imported`):**
   - Owns external course catalog links from verified providers (Coursera, edX, Cisco, Microsoft, AWS, etc.).
   - Explicitly does NOT own native curriculum authoring or video hosting. Import mechanics owned by Phase 06; catalog domain record owned by Phase 13.
3. **Paid Courses (`/admin/courses/paid`):**
   - Owns monetized learning programs, pricing models, VAT/tax references, and access policies.
   - Payment execution, gateway handoffs, invoices, and refunds are strictly owned by Phase 19 (Finance & Payments). Non-course paid services remain in Phase 20 (Educational Services). Paid courses must never be reclassified as services.

---

## 23.A.10.2 Services Administration Structural Boundaries

**Architectural Commentary**  
The Services Administration Workspace in Phase 23 manages non-course offerings under Phase 20 (Educational & Support Services) and is split into two clear sections:
1. **Student Services (`/admin/services/student`):**
   - Manages non-course student offerings: study consultations, university and major selection advisory, admission application file prep, statement of purpose (SOP) reviews, motivation letter reviews, academic CV optimization, and scholarship application support.
2. **General Support Services (`/admin/services/general`):**
   - Manages non-course support offerings: certified sworn translation for academic transcripts, degree attestation/notarization coordination, visa/travel support, official form preparation, and general operational assistance.

**Strict Domain Boundaries:**
- **Phase 20 (Services Domain):** Owns service catalog records, service categories, service fulfillment rules, booking/request workflows, SLA rules, service packages, and publication readiness.
- **Phase 19 (Finance & Payments):** Owns all payment execution, checkout, invoices, refunds, settlement, and payment gateway handoffs.
- **Phase 05 (EAP Assets):** Owns uploaded service templates, forms, PDFs, attachments, and asset keys.
- **Phase 17 (AI Engine):** Owns AI execution if a service uses AI-assisted review or translation support.
- **Phase 13 (Learning):** Owns all courses, including paid courses. Paid courses must NEVER be classified or mixed inside Services.
- **Phase 23 (Enterprise Administration Portal):** Owns admin UI and control-plane composition only.
- **Phase 24 (Public Platform):** Owns public student rendering and discovery.
- **Publication Policy:** No auto-publish. All services require explicit admin approval and publication readiness validation.

---

## 23.A.10.3 CMS Administration Editorial Structural Boundaries

**Architectural Commentary**  
The CMS Administration Workspace in Phase 23 manages editorial and marketing content only and is organized into dedicated editorial sections:
1. **Articles & Guides (`/admin/cms/articles`):**
   - Manages academic articles, study guides, editorial news, checklists, and editorial rich content.
2. **FAQs (`/admin/cms/faqs`):**
   - Manages guided Q&A pairs, categorization, and approved answers.
3. **Static Pages (`/admin/cms/pages`):**
   - Manages platform static pages (About, Privacy, Terms, Contact, Custom editorial pages).
4. **Categories & Tags (`/admin/cms/categories`):**
   - Manages editorial categories and tags for organizing CMS content.
5. **Translations (`/admin/cms/translations`):**
   - Manages multi-lingual content payloads and localization statuses (Phase 16 Localization).
6. **Content Review Queue (`/admin/cms/review`):**
   - Manages editorial review and approval workflow before final publication.

**Strict Editorial Boundaries:**
- **Phase 16 (CMS Domain):** Owns CMS content lifecycle, editorial workflows, content categories, rich text, localization payloads, and SEO metadata.
- **Phase 05 (EAP Assets):** Owns uploaded CMS images and media assets via EAP Asset Ref IDs.
- **Phase 17 (AI Engine):** May provide AI draft suggestions only (title, excerpt, SEO metadata, translation draft, summarization). AI MUST NOT publish content automatically.
- **Phase 23 (Enterprise Administration Portal):** Owns admin UI and control-plane composition only.
- **Phase 24 (Public Platform):** Owns public student rendering and discovery.
- **Core Domain Entities Boundary:** CMS MUST NOT manage, create, edit, or delete core domain entities (scholarships, universities, courses, majors, services, or payments). Internal references to domain entities inside articles or guides exist as read-only editorial links only.
- **Publication Policy:** No auto-publish. Public visibility on Phase 24 public pages occurs exclusively after manual administrative publishing. Public preview does not equal publish.

---

## 23.A.11 Student Tools Admin Architecture Boundaries

**Architectural Commentary**  
The Student Tools Admin Workspace manages the catalog, visibility, lifecycle, launch priority, and admin controls for student-facing tools. Some tools are normal/non-AI tools, and some depend on AI. AI execution, model routing, prompt policies, and cost governance must remain strictly under Phase 17.

- **Phase 18 (Student Tools Platform):** Owns the Student Tools registry, tool definitions, tool orchestration, tool availability metadata, and student-facing tool experience.
- **Phase 17 (AI Platform):** Owns AI execution, model routing, token/cost governance, safety rules, rate limits, and AI provider policies.
- **Phase 23 (Enterprise Administration Portal):** Owns admin UI/control-plane composition only.
- **Phase 15 (Student Workspace):** Owns authenticated student workspace state where relevant.
- **Phase 12 / 11 / 10 / 13 (Domain Platforms):** Own domain data consumed by tools (scholarships, universities, majors, courses).
- **Phase 19 (Finance & Payments):** Owns payment/cost execution if monetized features are introduced.
- **UI Safety Boundaries:** No AI model keys or provider secrets in the UI. No direct AI prompt or model configuration in Phase 23. No auto-enable of expensive AI tools without governance warnings. No direct delete actions.

---

## 23.A.12 Certificates Admin Architecture Boundaries

**Architectural Commentary**  
The Certificates Admin Workspace manages the issuing, verifying, revoking, and template management for student accomplishment certificates across MANARATAK 2.0.

- **Phase 14 (Certificates Engine Platform):** Owns certificate issuance, verification, revocation, template definitions, digital signatures, and certificate lifecycle.
- **Phase 13 (Courses & Learning Platform):** Owns course completion verification, academic progress, grades, and student eligibility.
- **Phase 15 (Student Workspace & Profile):** Owns student profile and identity metadata.
- **Phase 05 (EAP Enterprise Assets Platform):** Owns certificate PDF files, logos, and signature asset handles via EAP Asset Ref IDs.
- **Phase 23 (Enterprise Administration Portal):** Owns admin UI composition, issuance request reviews, template management, and operational controls.
- **Phase 24 (Public Platform Composition):** Owns public verification page rendering (`/verify-certificate`).
- **UI & Security Safety Rules:**
  - No editing student grades or course progress from Certificates Admin.
  - No editing course curriculum content from Certificates Admin.
  - No raw file URLs in UI; all PDF/media files referenced via Phase 05 EAP asset handles.
  - No auto-issuance without verified eligibility from Phase 13 or explicit authorized admin action with audit reason.
  - **Strict Permanent Deletion Prohibition:** Issued certificates can NEVER be deleted permanently. Certificates can only be revoked with a mandatory documented reason and immutable audit trail.
  - Public verification exposes verification status and protected student references without leaking private personal data.

---

## 23.A.13 Finance & Payments Admin Architecture Boundaries

**Architectural Commentary**  
The Finance & Payments Admin Workspace provides the administrative control-plane surface for monitoring invoicing, payment collections, refunds, manual bank transfer verifications, pricing references, and financial reports across MANARATAK 2.0.

- **Phase 19 (Finance & Payments Platform):** Owns invoices, payment transactions, refund execution, reconciliation, and financial settlement.
- **Phase 13 (Courses & Learning Platform):** Owns paid course records, pricing tier declarations, and course content.
- **Phase 20 (General & Student Services Platform):** Owns paid service catalog items and service fulfillment.
- **Phase 15 (Student Workspace & Profile):** Owns student/customer identity and profile references.
- **Phase 05 (EAP Enterprise Assets Platform):** Owns receipt PDFs, bank transfer slips, and invoice asset handles via EAP Asset Ref IDs.
- **Phase 23 (Enterprise Administration Portal):** Owns admin UI composition, invoice detail reviews, manual bank transfer verification, refund approvals, and operational reports.
- **UI & Security Safety Rules:**
  - No modifying course content from Finance Admin.
  - No modifying service catalog definitions from Finance Admin.
  - No raw file URLs in UI; all receipts and bank slip assets referenced via Phase 05 EAP handles (`eap_asset_receipt_...`, `eap_asset_slip_...`).
  - No auto-confirming payments without gateway confirmation or explicit authorized manual review with audit reason.
  - **Strict Permanent Deletion Prohibition:** Financial records can NEVER be deleted permanently. Financial records can only be voided, refunded, or marked failed with an immutable audit trail.
  - No payment secrets or gateway credentials in UI.

---

## 23.A.14 Career & Alumni Admin Architecture Boundaries

**Architectural Commentary**  
The Career & Alumni Admin Workspace provides the administrative control-plane interface for managing career pathways, job & internship opportunities, student application submissions, alumni profiles, and bounded recruitment entity metadata across MANARATAK 2.0.

- **Phase 21 (Career & Alumni Platform):** Owns job/internship opportunities, career applications, alumni profiles, and bounded recruitment entity metadata.
- **Phase 15 (Student Workspace & Profile):** Owns private student identity and profile data.
- **Phase 05 (EAP Enterprise Assets Platform):** Owns CVs, portfolio documents, and uploaded attachments via EAP Asset Ref IDs.
- **Phase 17 (AI Intelligence Engine):** Owns AI recommendations, skill matching, and fit scoring (Phase 21 consumes results as read-only advisory outputs).
- **Phase 23 (Enterprise Administration Portal):** Owns admin UI, opportunity review/approval/publishing, application queues, and career analytics.
- **Phase 24 (Public Platform Composition):** Owns public career/job page rendering post-publishing (`/careers/opportunities/:id`).
- **UI & Security Safety Rules:**
  - No creating a standalone Organizations Platform or Employers Platform.
  - No exposing private student or alumni data publicly by default without explicit student visibility settings.
  - No publishing opportunities automatically upon import or creation; explicit admin approval is required.
  - No raw file URLs in UI; all CVs and attachments referenced via Phase 05 EAP handles (`eap_asset_cv_...`).
  - No mixing career opportunities with paid courses (Phase 13) or paid student services (Phase 20).


---

## 23.A.15 AI Governance & AI Center Administration Architecture

**Architectural Identity & Purpose**  
The AI Governance / AI Center Admin Workspace within Phase 23 provides the central control-plane UI for Phase 17 (Enterprise AI Platform). It governs model routing, provider health, prompt repository management outside codebase, AI translation workflows, workload processing queues (BullMQ), privacy redaction, and operational limits across MANARATAK 2.0.

**Architectural Principles & Boundaries**  
1. **Unified AI Service Boundary (`AIService`):** All domain modules, student tools (Phase 18), translations, and recommendations must call the internal `AIService.routeRequest()` orchestrator. Domain modules are strictly forbidden from directly calling external AI provider APIs (OpenAI, Gemini, Claude, DeepSeek).
2. **Phase Ownership Breakdown:**
   - **Phase 17 (AI Platform Engine):** Owns AI routing, provider failover, prompt repository, BullMQ queue, privacy redaction, and safety limits.
   - **Phase 18 (Student Tools):** Owns student-facing UX for CV generation, motivation letters, and academic recommendations.
   - **Phase 16 (CMS & Editorial Content):** Owns editorial review and final publishing approvals for AI-generated translations and content.
   - **Phase 15 (Student Workspace & Profile):** Owns student private identity data (which is strictly redacted before model pass-through).
   - **Phase 23 (Enterprise Administration Portal):** Owns admin control-plane UI, provider toggles, prompt editor, task tracking, and queue controls.
3. **Strict Privacy & Key Masking:**
   - Raw API keys/secrets are NEVER rendered or returned in UI payloads; only masked configuration status (`Configured` / `Missing`) is exposed.
   - Raw student PII is redacted in AI logs and audit views.
4. **No Unreviewed Auto-Publishing:** AI-generated text, translations, and summaries MUST pass through Phase 16 editorial/CMS review or domain workflows before becoming public or approved.

---

## 23.A.16 Health & Readiness Admin Monitoring Architecture

**Architectural Identity & Purpose**  
The Health & Readiness Admin Workspace (`/admin/health`) in Phase 23 provides non-destructive, read-only operational telemetry and readiness monitoring across all underlying MANARATAK 2.0 subsystems. It enables administrators to inspect component statuses, latency metrics, incident logs, and production deployment readiness without performing destructive data or queue reset operations.

**Architectural Principles & Boundaries**  
1. **Non-Destructive Control Plane:** The Health & Readiness workspace is strictly limited to safe monitoring actions (Re-run health checks, Test connection, View logs, Download readiness report, Copy diagnostic summary, Open affected admin section). Destructive controls (Data purge, DB reset, Queue wipe, Secret rotation) are strictly prohibited on this page.
2. **Phase Ownership & Delegation:**
   - **Phase 23:** Owns the admin monitoring UI shell, diagnostic reports, and readiness checklist.
   - **Infrastructure Packages:** Own actual API/Prisma/Redis health check implementations.
   - **Phase 06:** Owns Import Foundation health details.
   - **Phase 05:** Owns Enterprise Assets Platform (EAP) storage health.
   - **Phase 17:** Owns AI Center provider health.
   - **Phase 19:** Owns Payment Gateway sandbox/production mode health.
3. **Preview / Runtime Mode Awareness:** Displays clear banner indicators when running in Google AI Studio preview containers where external Redis or production payment endpoints are simulated or safely isolated.
4. **Strict Security & Privacy Guard:** No raw API keys, database connection strings, JWT secrets, or unmasked credentials may be exposed in diagnostic outputs.

---

## 23.A.17 Admin Settings & Configuration Architecture

> **2026-09-05 SOURCE-CLOSURE CORRECTION:** Earlier drafts grouped IAM/RBAC, secrets, integration status, audit, and runtime configuration under `/admin/settings`. That ownership is superseded. The canonical Settings workspace owns dynamic setting definitions, scoped non-secret values, immutable version history, rollback-as-new-version, and feature flags only.

**Architectural Identity & Purpose**  
The Admin Settings Workspace (`/admin/settings`) is the governance surface for dynamic platform configuration that is legitimately owned by the Settings domain. It does not become a second IAM, secrets manager, health dashboard, or reference-data store.

**Architectural Principles & Boundaries**  
1. **Single Configuration Owner:** Settings owns setting definitions, scope resolution (`IDENTITY > TENANT > DOMAIN > GLOBAL > default`), feature-flag metadata, scoped assignments, and immutable assignment versions.
2. **IAM/RBAC Separation:** Admin identities, roles, permissions, MFA/session policies, and authorization evaluation remain owned by the Identity/Authorization boundary. `/admin/settings` may link to those controls but MUST NOT duplicate them.
3. **Secrets Separation:** API keys, passwords, signing keys, database credentials, and provider tokens are never persisted as Settings values. Secret material is owned by the approved runtime secret provider/environment boundary. A secret-marked definition is metadata only.
4. **Reference Data Separation:** Countries, cities, currencies, languages, academic taxonomies, and similar canonical reference records remain in their owning domains and MUST NOT be converted into arbitrary setting strings.
5. **Immutable History:** A setting update or rollback creates a new version. Historical versions are append-only and must not be overwritten in place.
6. **Explicit Scope Resolution:** Identity, tenant, and domain identifiers are distinct inputs. Ambiguous aliases such as a generic organization/scope identifier must not select multiple scopes implicitly.
7. **Audited Mutations:** Definition creation, scoped value assignment, and rollback operations require the authenticated admin actor, `admin:settings:manage`, validation, and an audit record.
8. **No Runtime Readiness Claims:** Database-backed Settings does not infer that an external provider is healthy merely because configuration exists; runtime readiness remains with Health/Readiness and the owning integration adapter.

---

## 23.A.18 Enterprise Review & Acceptance

**Architectural Commentary**  
The following criteria constitute formal governance gates for Phase 23 Part A, ensuring compliance with MANARATAK 2.0 architecture standards.

### 23.A.11.1 Architecture Validation
- **Vision Validation:** Validated. Established as the unified administrative command surface for MANARATAK.
- **Philosophy Validation:** Validated. Centralized admin interface mandated; domain logic strictly delegated to domain platforms.
- **Security & Governance Validation:** Validated. Super-admin authority governed by IAM, RBAC/ABAC, audit logs, and break-glass rules.
- **Cross-Phase Delegation:** Validated. Clear boundaries established with Phases 05, 06, 11, 12, 13, 16, 17, 19, 20, 21, 22, and 24.

### 23.A.11.2 Acceptance Criteria
- The architecture defines the strategic identity and management philosophy of the Enterprise Administration Portal.
- Principles of unified administration, cross-phase delegation, and operational simplicity are established.
- The document contains pure architectural specifications without implementation specifics or database schemas.

### 23.A.11.3 Architecture Review Checklist
- [x] Administration Vision Validation
- [x] Administration Philosophy Validation
- [x] Administrative Security & Access Governance
- [x] Dashboard Strategy Validation
- [x] Cross-Phase Delegation Validation (Phases 05, 06, 11-13, 15-22, 24)
- [x] Scope Bounds & Roadmap Scalability
- [x] Readiness Review

### 23.A.11.4 ARB Decision

**Decision:** Approved for Baseline / Documentation Ready  
**Approver:** Chief Enterprise Architect & Architecture Review Board (ARB)  

---

### Navigation
[← Phase 22: Enterprise Product Experience](../phase-22-enterprise-product-experience/phase-22-01-enterprise-product-experience-architecture-specification.md) | [Phase 23: Structure Contracts (Part B)](./phase-23-02-enterprise-administration-portal-structure-contracts.md) | [Phase 23: Workflows & Operational Experience (Part C)](./phase-23-03-enterprise-administration-portal-workflows-operational-experience.md) | [Phase 24: Enterprise Public Platform →](../phase-24-enterprise-public-platform/phase-24-01-enterprise-public-platform-architecture-specification.md)
