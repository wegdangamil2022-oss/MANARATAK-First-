# MANARATAK 2.0: Phase 23 (Enterprise Administration Portal) Workflows & Operational Experience

**Document ID:** PHASE-23-03-WORKFLOWS-SPEC  
**Status:** SOURCE_REBASELINED — RUNTIME_EVIDENCE_PENDING  
**Phase:** 23  
**Domain:** Enterprise Administration Portal  
**Artifact:** Part C - Workflows & Operational Experience  

---

> **W7 source-rebaseline notice (2026-09-07):** This specification is source-rebaselined under `MNT-AUD-0045` against the remediated owner APIs, Admin/Public composition, source tests and cross-phase traceability. This status is not runtime or production certification; external DB/provider/deployment/browser evidence remains `RUNTIME_EVIDENCE_PENDING`. See `docs/remediation/P23_P24_REBASELINE_TRACEABILITY.md`.

### Navigation
[← Phase 22: Enterprise Product Experience](../phase-22-enterprise-product-experience/phase-22-01-enterprise-product-experience-architecture-specification.md) | [Phase 23: Architecture Spec (Part A)](./phase-23-01-enterprise-administration-portal-architecture-specification.md) | [Phase 23: Structure Contracts (Part B)](./phase-23-02-enterprise-administration-portal-structure-contracts.md) | [Phase 24: Enterprise Public Platform →](../phase-24-enterprise-public-platform/phase-24-01-enterprise-public-platform-architecture-specification.md)

---

> **Note:** This phase references the [Enterprise Shared Contracts Specification](../../architecture/shared-contracts/03-enterprise-shared-contracts-specification.md) as the canonical architectural source for shared foundation contracts.  
> **Note:** This phase references the [Enterprise Lifecycle Framework Specification](../../architecture/lifecycle-framework/03-enterprise-lifecycle-framework-specification.md) as the canonical architectural source for all state, status, and lifecycle governance.  
> **Note:** Part C serves as an administrative workflow and operational experience specification. It defines interaction rules, review pipelines, and task flows, NOT executable code implementations, database schemas, or frontend software blueprints.  

---

## 23.C.1 Administration Workflow Philosophy

**Architectural Commentary**  
The administration workflow philosophy dictates that every operation inside the Administration Portal follows a structured operational pipeline. The architecture prohibits ad-hoc data manipulation or un-audited state changes.

Administrative tasks move through defined stages. Enforcing strict adherence to these operational pipelines guarantees that every administrative action is transparent, traceable, and fully auditable under Phase 05 security logging.

---

## 23.C.2 Unified Content Lifecycle

**Architectural Commentary**  
To prevent operational fragmentation, all educational content entities abide by a consistent administrative review lifecycle.

This lifecycle applies to roadmap-scoped entities, including:
- Scholarships (Phase 12)
- Universities (Phase 11)
- Courses (Phase 13)
- Articles & Guides (Phase 16 - Enterprise CMS)
- Educational Services (Phase 20)
- Educational Tools (Phase 18)

The standard administrative content lifecycle flows as follows:

**Import Ingestion (Phase 06)**  
->  
**Domain Validation Check (Domain Engine)**  
->  
**Administrative Review (Phase 23)**  
->  
**Metadata Editing & Enrichment (Phase 23)**  
->  
**Translation Review (Phase 23 / Phase 17)**  
->  
**Quality & Compliance Verification (Phase 23)**  
->  
**Publication Approval Command (Phase 23)**  
->  
**Public Composition & Rendering (Phase 24)**  

This unified flow ensures administrators experience identical operational paradigms across all catalog domains.

---

## 23.C.3 Workflow Integration

**Architectural Commentary**  
Administrative views operate as processing nodes within an integrated pipeline. The architecture enforces seamless handoffs between ingestion, editing, translation, and publication control.

A representative operational integration pipeline flows as follows:

**Import Review View (Phase 23)**  
->  
**Domain Management View (Phase 23)**  
->  
**Translation Review View (Phase 23 / Phase 17)**  
->  
**Publication Command Surface (Phase 23)**  
->  
**Public Page Composition (Phase 24)**  

Operational views communicate continuously, automatically advancing entities to their next logical administrative state without manual data re-entry.

---

## 23.C.4 Administration Task Flow

**Architectural Commentary**  
The Administration Portal proactively guides administrators toward pending work by surfacing entities in actionable task queues.

Tasks dynamically move through administrative queues based on lifecycle status:
- Pending Initial Triage & Review
- Pending Translation Verification
- Pending Publication Approval
- Pending Metadata Correction
- Expired Offering Alerts
- Failed Validation Warnings
- System Operational Notifications

This proactive task routing ensures that content never stagnates in an unmonitored state and operational bottlenecks remain immediately visible.

---

## 23.C.4.1 Review Queue Aggregate Control-Plane Workflow

**Architectural Commentary**  
The Review Queue (`/admin/review-queue`) is defined strictly as a read-only aggregate pending-work control plane ("نظرة عامة على قائمة المراجعة"). It provides a cross-domain operational summary of pending work without duplicating domain editing or management workflows.

**Operational Boundary & Workflow Rules:**
1. **Aggregate Overview Only:** Displays cross-domain summary metrics, aggregate cards per domain module (Scholarships, Universities, Majors, Courses, International Tests, Educational Services, CMS Articles), reason breakdown counts, and a filtered read-only pending work queue.
2. **No Direct Domain Editing or Mutating Actions:** Direct record-level editing, publishing, deleting, or "accept all completed" bulk actions are strictly forbidden and removed from the Review Queue interface to eliminate operational risk and duplicate management workflows.
3. **Domain Workspace Handoff:** Every item action is a navigation link ("Open in Workspace" / "فتح في لوحة المجال") routing the administrator to the domain admin workspace (`/admin/scholarships`, `/admin/universities`, `/admin/majors`, `/admin/courses`, `/admin/international-tests`, `/admin/services`, `/admin/cms`). Domain admin workspaces remain the single source of truth for record modification, approval, publishing, import, and lifecycle actions.
4. **Safe Interactive Filters:** Allows filtering pending work by Domain, Review Reason (Needs Translation, Missing Required Fields, Ready to Publish, Source Verification Required, Recently Imported), Priority, Source Type, and Record Age.
5. **Operational Notice Banner:** Displays an explicit read-only governance banner clarifying that content modification and lifecycle actions take place exclusively within domain workspaces.

---

## 23.C.4.2 Generic Import Control Plane Workflow & Domain Import Centers

**Architectural Commentary**  
The Import Management framework operates as a two-tier, multi-domain Import Control Plane for data ingestion across all supported platform catalog modules.

**Architecture Architecture & Workflow Rules:**
1. **Tier 1: Generic Overview (`/admin/imports`):** Displays simple domain summary cards for all 7 platform domains (Scholarships, Universities, Majors, Courses, International Tests, Educational Services, CMS Articles), active source connectors summary, and a read-only Import Operations Center (IOC) audit log.
2. **Tier 2: Dedicated Domain Import Centers (`/admin/imports/:domainKey`):** Clicking "Start Import" on any domain card routes the administrator to a domain-isolated control view (`/admin/imports/scholarships`, `/admin/imports/universities`, `/admin/imports/majors`, `/admin/imports/courses`, `/admin/imports/international-tests`, `/admin/imports/services`, `/admin/imports/cms`).
3. **Domain Provider / Source Cards:** Each Domain Import Center hosts domain-specific provider cards (e.g., DAAD, Chevening, Coursera, edX, ISCED, IELTS/TOEFL) displaying source types, trust scores (0-100%), source URLs, last check times, and metrics (imported, transferred, incomplete, failed).
4. **6-Step Import Wizard:** Clicking "Start Import From This Source" launches an execution stepper:
   - **Step 1: Confirm Domain & Source:** Verifies domain workspace handoff path and trust score warnings.
   - **Step 2: Input Method Selection:** File upload (CSV/JSON), Paste payload, Official URL reference (1 URL only, staged for review notice), Registered Connector, or Demo dataset.
   - **Step 3: Processing Limits:** Selects batch size boundary (10, 50, 100, or custom small limit) to prevent timeout failures.
   - **Step 4: Admin Engine Rules:** Toggles operational instructions (e.g., focus postgrad, ignore expired, require official URL, mark missing deadline as Needs Review, import bilingual text) and custom notes.
   - **Step 5: Review Run:** High-contrast summary review before batch execution.
   - **Step 6: Run Batch & Execution Results:** Executes batch, transfers valid records to domain workspace as `Needs Review`, quarantines incomplete items, logs failed items, and confirms zero auto-publishing.
5. **Phase Ownership Delegation:** Phase 23 controls UI, navigation, and administrative orchestration only. Phase 06 owns generic ingestion mechanics (CSV/JSON parsing, batching, error queues). Domain phases own field validation schemas, completeness rules, deduplication, and public publishing.
6. **Safety Rules:** No auto-publishing, no uncontrolled multi-page web crawling (1 official URL reference only), no global unsafe actions ("Run all", "Stop all"), and no public exposure until approved inside the domain admin workspace.

---

## 23.C.5 Administration Experience Principles

**Architectural Commentary**  
The administrator experience prioritizes operational velocity and human efficiency. The portal is an enterprise work environment engineered for high-throughput management.

The administrator experience is defined by:
- Operational simplicity and layout consistency
- Minimal required clicks for routine approvals
- Rapid navigation between task queues
- Centralized task observability
- Deterministic, predictable system responses
- Reduced manual data repetition

---

## 23.C.6 Public Platform Command & Visibility Synchronization

**Architectural Commentary**  
Phase 23 acts as the administrative client for publication, availability, and editorial composition. Commands are always sent to the owning domain or to Phase 16 CMS; Phase 23 does not maintain a parallel public-visibility record. Phase 24 owns visitor routing, SEO rendering, and public composition only.

Administrative operations from Phase 23 therefore govern:
- Publishing and unpublishing records through each owner API
- Activating/deactivating owner-domain availability where that domain defines such lifecycle
- Editing homepage/navigation/featured composition through Phase 16 CMS navigation/block APIs
- Previewing the resulting public read models without persisting duplicate visibility flags

---

## 23.C.7 Operational Scalability & Scope Bounds

**Architectural Commentary**  
The administrative architecture acts as a durable, extensible surface strictly for approved roadmap-scoped entities within the fixed 24-phase roadmap.

Future workflow expansions are bounded to:
- Integrating admin review views for Phase 17 AI models and automated translation flows.
- Enhancing moderation queues for Phase 20 service requests and Phase 21 career metadata.
- Extending operational telemetry views over domain read-models.

Phase 23 strictly prohibits adding unapproved domain workflows or creating phases beyond Roadmap v6.0.

---

## 23.C.8 Enterprise Operational Principles

**Architectural Commentary**  
These foundational principles govern the execution and governance of all administrative workflows:
- Single Source of Truth (SSoT) for domain records
- Workflow Consistency across all catalog views
- Centralized Security & Auditability (Phase 05)
- Operational Transparency and Task Traceability
- Seamless Cross-Phase Delegation
- Fixed 24-Phase Roadmap Compliance

---

## 23.C.9 Course Administration Workflow

**Architectural Commentary**
Phase 23 enforces a strict tollgate review workflow and provides comprehensive administrative screens for course authoring, media management, curriculum building, assessment creation, and publication review.
**Read-only handoff indicator**: Phase 13 - Learning Platform remains the authoritative owner of course domain execution, curriculum logic, learning progress, and completion rules. Phase 23 provides admin UI/control plane only. Phase 14 owns certificates, Phase 19 owns payments, and Phase 05 EAP owns physical media files.

**Course Management Overview**
The admin experience includes:
- **Course management overview table**: Lists all draft, under-review, published, and archived courses.
- **Filters**: Filter by course type, status, language, level, category, paid/free, origin, publication state, and import state.
- **Audit history panel**: Displays chronological record of all administrative changes to course state.
- **Validation/error panel**: Displays warnings and blockers preventing course publication.

**Add Course Wizard & Editor**
Administrators build native courses or manage imported courses through a step-by-step editor:

1. **Course Metadata Step**:
   - Configure course type/origin: `NativeManaratakCourse`, `ExternalLinkedCourse`, `PaidCourse`, or `RelatedPaidService` (as cross-link only).
   - Configure language, level, duration, category/tags, target majors/disciplines, and prerequisites.
   - Configure instructor/provider metadata.

2. **Curriculum Builder Step**:
   - Build modules and lessons via a drag-and-drop ordering interface.
   - Select lesson type: Video, Text, PDF, Quiz, Assignment, External link, Mixed media.
   - Configure required/optional markers, estimated duration, and lock/unlock/prerequisite rules between modules or lessons.

3. **Media/Assets Step (EAP Integration)**:
   - Upload and attach learning assets (Course thumbnail, cover image, video, images, PDFs, subtitles, audio, SCORM, downloadable materials, preview assets).
   - **Boundary Enforcement**: Phase 23 interacts exclusively via Phase 05 EAP selection components. Warnings are shown if media is not registered through EAP. Phase 23 must not store physical paths or raw URLs.

4. **Quiz, Exam, and Question Bank Step**:
   - Create assessments (quizzes, exams, assignments) and centralized question banks.
   - Add/edit question types (Multiple choice, True/false, Short answer, Essay, Matching, Ordering, File upload).
   - Configure difficulty, tags, randomized pools, attempt limits, timer settings, passing score, manual review flag, auto-grading settings, and feedback fields.

5. **Pricing Step (Paid Courses)**:
   - Mark a course as paid.
   - Assign a Phase 19 price reference.
   - The UI displays payment readiness state and checkout availability.
   - **Safety Warning**: Displays warnings when a paid course lacks Phase 19 payment readiness or refund/settlement dependencies.

6. **External/Free Course Review Step**:
   - Review imported global external course records.
   - Verify direct course URL and free study / free certificate indicators.
   - Approve, reject, or mark incomplete for missing mandatory fields.
   - **Safety Warning**: Displays warnings when an external course is paid but mistakenly marked as global free, or triggers admin review for source trust concerns.

7. **Review and Publish Step**:
   - Public preview step to visualize the course detail page prior to publishing.
   - Enforce publishing constraints: Warnings when attempting to publish incomplete course structures.
   - Transition visibility through draft/review/approval/published/archived lifecycles.

### 23.C.9.1 Imported External Courses Operational Workflow
- **Path & List Surface**: `/admin/courses/imported` provides a lightweight vertical list for fast scanning.
- **Import Center Routing**: All import operations route directly to `/admin/imports/courses` (Phase 06 Ingestion Engine).
- **Detail Surface**: `/admin/courses/imported/:id` provides comprehensive management for imported catalog links.
- **Action Bar**: Features 10 explicit buttons: Edit, Verify Source, Check Course Link, Fetch Missing Fields from Source (with modal & safety notice), Mark Ready to Publish, Publish, Unpublish, Reject, Archive, Open External Course.
- **Deduplication & Safe Merge**: Merges records using cleaned course title + external provider + direct URL. Fills missing optional fields safely without overwriting admin-reviewed data.

### 23.C.9.2 Paid Courses Operational Workflow
- **Path & List Surface**: `/admin/courses/paid` provides a lightweight vertical list for monetized offerings.
- **Boundary Rules**: Paid courses remain Phase 13 learning offerings. Payment execution, gateway handoffs, invoices, and refunds are handled by Phase 19. Non-course paid services belong to Phase 20.
- **Detail Surface**: `/admin/courses/paid/:id` provides pricing, currency, VAT, access model, and Phase 19 handoff status.
- **Action Bar**: Features 8 explicit buttons: Edit, Configure Pricing, Request Finance Review, Mark Ready to Sell, Publish, Unpublish, Archive, Open Finance/Payment Settings (Phase 19).

### 23.C.9.3 Educational & Support Services Operational Workflow
- **Path & Landing Surface**: `/admin/services` serves as the central landing page providing section selection cards for Student Services and General Services, accompanied by a mandatory architectural boundary banner: *"الخدمات هنا عروض غير تعليمية ضمن المرحلة 20. الدورات المدفوعة تبقى ضمن المرحلة 13. تنفيذ الدفع يتم عبر المرحلة 19."*
- **Student Services Workspace (`/admin/services/student`)**:
  - Manages student advisory, selection, SOP/letter review, CV optimization, and application prep offerings.
  - Features top statistics counters (Total, Published, Draft/Review, Missing Price, Missing Templates, Active Requests, Needs Review), lightweight vertical lists, and category/status filtering.
  - Detail page (`/admin/services/student/:id`) features a 10-action bar: Edit, Configure Pricing, Configure Packages, Manage Templates/Forms (Phase 05 EAP), Mark Ready to Publish, Publish, Unpublish, Archive, Open Related Requests, and Open Finance/Payment Settings (Phase 19).
- **General Support Services Workspace (`/admin/services/general`)**:
  - Manages translation, attestation, visa support, form prep, and general operational support offerings.
  - Features dedicated top statistics counters, lightweight vertical list, creation modal, and comprehensive category/status filtering.
  - Detail page (`/admin/services/general/:id`) features a matching 10-action bar with complete scope definitions (Included vs Excluded), package cards, EAP template links, FAQ section, cancellation policy reference, fulfillment SLA details, and audit history log.

---
## 23.C.10 Educational Tool Administration Workflow

**Operational Philosophy**
Phase 23 provides the governance dashboard for the Official Tool Registry Backlog (owned by Phase 18). It allows administrators to safely manage tool lifecycles without interfering with execution logic.

**Tool Registry Administration Experience**
The admin experience includes the following workflows and controls:
- **Registry Overview Table:** Displays all tools synced from Phase 18.
- **Filters:** Allows filtering by category, execution type (Deterministic, AI-Delegated, Hybrid, Admin/Internal), visibility, priority, lifecycle, AI dependency, and dependency health.
- **Detail Drawer/Page:** Drill-down into each tool for configuration.
- **Enable/Disable Toggle:** Soft switch to instantly halt a tool's execution capability. Requires a reason input for the audit log.
- **Visibility Controls:** Toggle a tool between `ACTIVE`, `COMING_SOON`, `UNDER_DEVELOPMENT`, `HIDDEN_ADMIN_ONLY`, `DISABLED`, and `RETIRED`.
- **Priority Controls:** Adjust `P1_CORE_LAUNCH`, `P2_EXPANSION`, `P3_LATER` for engineering queues.
- **AI Cost-Risk Indicator:** Visual highlight showing token usage cost estimation profiles for AI-Delegated or Hybrid tools.
- **Dependency Health Panel:** Real-time ping checking the health of required domain APIs (e.g., Phase 11 for Universities) and Phase 17 for AI.
- **Audit History Panel:** Timeline of all admin actions (who changed what visibility, when).

**Boundary Enforcements & Safety Warnings**
- **Read-Only Registry Source Indicator:** A persistent badge indicating that tool metadata and execution logic belong to Phase 18, and Phase 23 is acting purely as a control plane.
- **Admin/Internal Tool Safety:** The system throws a strict warning if an admin attempts to expose `HIDDEN_ADMIN_ONLY` tools (like Import Completeness Checkers) to Phase 24 public pages.
- **Anonymous AI Warning:** The system warns the admin if expensive `AI_DELEGATED` tools are set to allow anonymous execution, highlighting the denial-of-wallet risk.

---

## 23.C.11 Scholarship Admin Workspace & Import Center Workflow

**Operational Philosophy**
Phase 23 provides the administrative command center for scholarship review, normalization inspection, completeness classification, safe merging, and manual publishing control (owned by Phase 12). Raw ingestion is strictly separated and handled by the dedicated Scholarship Import Center under `/admin/imports/scholarships`.

**Scholarship Admin Workspace Experience (`/admin/scholarships`)**
- **Vertical Administrative List**: A clean, mobile-friendly vertical list/table displaying cleaned scholarship names, sponsor/provider, academic degree level, application deadline, funding coverage, country, source trust badge, completeness status, and lifecycle status, with quick navigation to `/admin/scholarships/:id`.
- **Top Statistics Dashboard**: 8 explicit counters for All Scholarships, Imported Awaiting Review (`مستوردة بانتظار مراجعة`), Missing Required Fields (`ناقصة البيانات`), Needs Source Verification (`تحتاج تحقق من المصدر`), Needs Translation (`تحتاج ترجمة`), Ready to Publish (`جاهزة للنشر`), Published (`منشورة`), and Archived (`مؤرشفة`).
- **Advanced Filters**: 10 comprehensive filters covering lifecycle status, completeness status, country, academic degree, funding type, source/provider, trust verification status, translation status, deadline date, and import/manual source.
- **Unified Scholarship Details View (`/admin/scholarships/:id`)**: Comprehensive review screen showing scholarship title / cleaned title, original source raw title, sponsor/provider, country, academic degree, funding coverage, deadline, application URL, official source URL, eligibility criteria, required documents, eligible majors, benefits, language requirements, trust score, missing fields, translation status, import/merge history, and admin audit history.
- **Admin Action Bar**: Top action bar supporting Edit, Approve, Mark Ready to Publish, Publish, Unpublish, Reject, Archive, Temporary Delete, and Permanent Delete (protected by mandatory confirmation). Public page links appear ONLY when status is Published.
- **"Fetch Missing Fields from Official Source" Action**: Button ("Fetch Missing Fields from Official Source" / "جلب النواقص من المصدر الرسمي") that checks official source URLs and suggests missing fields only. Displays Arabic safety message: *"سيتم اقتراح إكمال الحقول الناقصة فقط، ولن يتم استبدال البيانات التي تمت مراجعتها دون موافقة."* Shows preview of suggested field additions before saving and never silently overwrites previously reviewed data.
- **Naming Cleanup & Safe Merge Visibility**: Displays original source titles versus cleaned canonical titles (explaining normalization rules where degree level, funding coverage, urgency words, and marketing text are removed from the clean title but stored in structured fields), duplicate status (`new`, `duplicate_skipped`, `existing_enriched`), merged fields, and protected reviewed fields.
- **Empty State**: When no scholarships exist, shows "No scholarships found", "Add Scholarship", and "Open Scholarship Import Center" (routing to `/admin/imports/scholarships`).

---

## 23.C.12 University Admin Workspace & Import Center Workflow

**Operational Philosophy**
Phase 23 provides the administrative command center for university review, normalization inspection, completeness classification, safe merging, and manual publishing control (owned by Phase 11). Raw ingestion is strictly separated and handled by the dedicated University Import Center under `/admin/imports/universities`.

**University Admin Workspace Experience (`/admin/universities`)**
- **Vertical Administrative List**: A lightweight, mobile-friendly vertical list/table for quick scanning, displaying university name, country, university type, ranking, lifecycle status, and a quick navigation button to `/admin/universities/:id`.
- **Top Statistics Dashboard**: 7 explicit counters for All Universities, Imported Awaiting Review (`مستوردة بانتظار مراجعة`), Verified / Approved (`موثقة / معتمدة`), Missing Data (`ناقصة البيانات`), Needs Source Verification (`تحتاج تحقق من المصدر`), Published (`منشورة`), and Archived (`مؤرشفة`).
- **Unified University Details View (`/admin/universities/:id`)**: Comprehensive review screen showing Arabic name, English official name, original imported/source name, country, city, university type, ranking, official website, logo, description, accreditations, faculties, academic programs, admission requirements, tuition references, linked scholarships, campuses, contact links, duplicate status, missing fields, import/merge history, and admin audit history.
- **Admin Action Bar**: Top action bar supporting Edit, Verify / Approve, Mark Ready to Publish, Publish, Unpublish, Reject, and Archive (protected by mandatory confirmation). Public page links appear ONLY when status is Published.
- **"Fetch Missing Fields from Official Website" Action**: Button ("Fetch Missing Fields from Official Website" / "جلب النواقص من الموقع الرسمي") that checks official website URLs and suggests missing fields only (logo, faculties, programs, requirements, tuition, accreditations). Displays Arabic safety message: *"سيتم اقتراح إكمال الحقول الناقصة فقط، ولن يتم استبدال البيانات التي تمت مراجعتها دون موافقة صريحة منك."* Shows preview of suggested field additions before saving and never silently overwrites previously reviewed data.
- **Naming Cleanup & Safe Merge Visibility**: Displays original source titles versus cleaned canonical titles, duplicate status (`new`, `duplicate_skipped`, `existing_enriched`), merged fields, and conflicting fields flagged for review. Never creates duplicate universities for the same institution.
- **Empty State**: When no universities exist, shows "No universities found", "Add University", and "Open University Import Center" (routing to `/admin/imports/universities`).

---

## 23.C.13 Majors Admin Workspace & Import Center Workflow

**Operational Philosophy**
Phase 23 provides the administrative command center for reviewing, normalizing, enriching, approving, and publishing academic majors/specializations (owned by Phase 10 & 08). Raw taxonomy ingestion and CIP/ISCED syncing are strictly separated and handled by the dedicated Majors Import Center under `/admin/imports/majors`.

**Majors Admin Workspace Experience (`/admin/majors`)**
- **Vertical Administrative List**: A lightweight, mobile-friendly vertical list/table for fast scanning, displaying major display name, degree level (Bachelor, Master, PhD, Diploma), college/academic field, CIP/ISCED classification codes, job demand level, lifecycle status, and a direct navigation button to `/admin/majors/:id`.
- **Top Statistics Dashboard**: 8 explicit counters for All Majors (`كل التخصصات`), Imported Awaiting Review (`مستوردة بانتظار مراجعة`), Missing Data (`ناقصة البيانات`), Needs Translation (`تحتاج ترجمة`), Classified / Mapped (`مصنفة / مرتبطة`), Ready to Publish (`جاهزة للنشر`), Published (`منشورة`), and Archived (`مؤرشفة`).
- **Import Button Behavior**: All import and taxonomy sync actions route directly to `/admin/imports/majors` rather than triggering inline modals or direct background syncing from the main list view.
- **Unified Major Details View (`/admin/majors/:id`)**: Comprehensive profile view displaying Arabic name, English name, original source name, degree level, college/field, CIP code, ISCED code, source classification system, student-friendly description, acquired skills, expected courses/typical subjects, career paths, related jobs, related majors, offering universities count, linked scholarships count, recommended courses, source references, missing fields, translation status, import/merge history, and admin audit history.
- **Admin Action Bar**: Top action bar supporting Edit, Approve (`اعتماد`), Mark Ready to Publish (`جاهز للنشر`), Publish (`نشر`), Unpublish (`إلغاء النشر`), Reject (`رفض`), Archive (`أرشفة`), Fetch Missing Fields from Trusted Source (`جلب النواقص من مصدر موثوق`), and Suggest Student-Friendly Description (`اقتراح وصف مبسط للطلاب`). Mandatory confirmation required for dangerous actions. Public page links appear ONLY when status is Published.
- **"Fetch Missing Fields from Trusted Source" Action**: Button ("Fetch Missing Fields from Trusted Source" / "جلب النواقص من مصدر موثوق") checking trusted classification repositories (CIP, ISCED, official program catalogs) and suggesting missing fields only. Displays Arabic safety message and a preview modal before saving. Never overwrites reviewed or admin-approved fields silently.
- **AI Student-Friendly Description Suggestion**: Button ("Suggest Student-Friendly Description" / "اقتراح وصف مبسط للطلاب"). Invokes Phase 17 to generate a draft description only. Never publishes automatically. Includes badge *"AI Draft - Requires Review"* and Arabic notice: *"مسودة تم إنشاؤها عبر الذكاء الاصطناعي. تتطلب مراجعة إدارية قبل النشر."* Requires admin review and manual approval.
- **Duplicate & Safe Merge Visibility**: Displays original source name versus normalized canonical name, duplicate status (`new`, `duplicate_skipped`, `existing_enriched`), merged fields, and conflicting fields flagged for review.
- **Empty State**: When no majors exist, displays "No majors found", "Add Major", and "Open Majors Import Center" (routing to `/admin/imports/majors`).

---

## 23.C.14 International Tests Admin Workspace & Import Center Workflow

**Operational Philosophy**
Phase 23 provides the administrative command center for reviewing, normalizing, validating, approving, and publishing standardized international tests (e.g., IELTS, TOEFL, SAT, GRE, GMAT), owned by Phase 09. Raw exam feed ingestion and batch processing are strictly separated and handled by the dedicated Tests Import Center under `/admin/imports/international-tests`.

**Important Phase Ownership Clarification:**
- `/admin/international-tests` is exclusively owned by Phase 09.
- `/admin/international-tests/:id` is exclusively owned by Phase 09.
- `/admin/imports/international-tests` is the dedicated import center route (mechanics by Phase 06, control by Phase 09).
- `/admin/majors` is exclusively owned by Phase 10 (Academic Majors) and must not be mixed with Phase 09 (International Tests).

**International Tests Admin Workspace Experience (`/admin/international-tests`)**
- **Vertical Administrative List**: A lightweight, mobile-friendly vertical list/table for fast scanning. The list page must explicitly show:
  - Test name
  - Provider / issuing body
  - Test category
  - Score range or minimum score summary
  - Result validity duration
  - Approximate fee metadata
  - Completeness status
  - Lifecycle status
  - Source verification status
  - Direct navigation button to open the detailed view at `/admin/international-tests/:id`
  - Button/link to `/admin/imports/international-tests` for import workflows
- **Top Statistics Dashboard**: 8 explicit counters for:
  - All Tests (`كل الاختبارات`)
  - Imported Awaiting Review (`مستوردة بانتظار مراجعة`)
  - Verified / Approved (`موثقة / معتمدة`)
  - Missing Data (`ناقصة البيانات`)
  - Needs Source Verification (`تحتاج تحقق من المصدر`)
  - Ready to Publish (`جاهزة للنشر`)
  - Published (`منشورة`)
  - Archived (`مؤرشفة`)
- **Import Button Behavior**: All import actions route directly to `/admin/imports/international-tests` rather than triggering inline raw import modals from the main list view. No direct raw imports are permitted within the main test profile view.

**Unified International Test Details View (`/admin/international-tests/:id`)**
Each test profile must support these twelve admin-managed data groups:
1. **Core Test Identity**: Canonical test name, localized Arabic/English names, abbreviation/common name, test category (e.g., `LANGUAGE_PROFICIENCY`, `UNDERGRAD_ADMISSION`, `GRAD_ADMISSION`, `PROFESSIONAL_LICENSING`, `ACADEMIC_PLACEMENT`, `OTHER`), official provider/issuing body, lifecycle status, public visibility status, and source verification status.
2. **Test Versions / Variants**: Variant name (e.g., IELTS Academic, IELTS General Training, TOEFL iBT, SAT Digital), delivery mode (`ONLINE`, `IN_PERSON`, `HYBRID`), active/inactive status, specific official URL per variant, and administrative notes explaining difference from other variants.
3. **Score System**: Overall score minimum and maximum, score increment if applicable, section score ranges, bands/levels if applicable, pass/fail rules if applicable, CEFR or cross-test equivalency references if available, result validity duration (e.g., 2 years), result delivery time, and score reporting URL.
4. **Test Sections**: Section name, section type, duration, order, question types, and section score minimum and maximum.
5. **Fees and Currency Metadata**: Registration fee, currency code, regional price variation flag, late registration fee, rescheduling fee, cancellation fee, and fee validity window. 
   - *Pricing Disclaimer*: Phase 09 stores fee metadata only; Phase 19 (Finance) owns actual payment execution. No payments are processed in Phase 09.
6. **Registration and Policy Requirements**: Registration requirements, identification document requirements, age rules if applicable, retake policy, cancellation/rescheduling notes, and accessibility/accommodation notes.
7. **Availability**: Available countries (using Phase 07 Reference Data), available cities/test centers if known, online availability regions, and testing windows or session availability.
   - *Reference Disclaimer*: All countries, cities, languages, and currencies belong strictly to Phase 07 Reference Data.
8. **Official Links and Source Verification**: Official registration URL, official information URL, official preparation URL, score reporting URL, source URL, source name, last verified timestamp, source trust classification, and link health status.
9. **Preparation Materials and Assets**: Official sample question links, practice test URLs, preparation PDFs/brochures, listening/audio sample references, and guide assets.
   - *Strict Asset Rule*: All persisted files must use Phase 05 EAP `AssetId` / `AssetReference`, not raw file paths or arbitrary URLs.
10. **Cross-Phase References**: 
    - Related universities/program requirements from Phase 11 (references only)
    - Related scholarships from Phase 12 (references only)
    - Related preparation courses from Phase 13 (references only)
    - Related CMS guides from Phase 16 (references only)
    - Related student tools from Phase 18 (references only)
    - Related paid services from Phase 20 (references only)
    - *No Duplication Rule*: No duplication of downstream domain records inside Phase 09 is permitted.
11. **Import, Evidence, and Review**: Original imported name, normalized canonical name, deterministic key, `sourceId`, `sourceUrl`, `contentHash`, `retrievedAt`, `evidenceSnippet`, validation results, duplicate status, conflicting fields, merge suggestions, and admin review status.
    - *Automation Rule*: Confidence or source trust scores must never cause automatic publishing.
12. **Missing Data and Publication Readiness**: Missing mandatory fields, incomplete optional fields, source verification warnings, outdated fee warnings, and unavailable registration link warnings.
    - *Readiness Statuses*: `IMPORTED`, `INCOMPLETE`, `COMPLETE`, `NEEDS_REVIEW`, `READY_TO_PUBLISH`, `PUBLISHED`, `REJECTED`, `ARCHIVED`.

**Source and Import Policy:**
- **Authoritative Source Priority**: Official sources (e.g., ETS, British Council, College Board) are the authoritative source for canonical facts.
- **Supporting Source Rule**: Non-official/supporting sources may be used for enrichment of missing details only. They must never silently overwrite official or admin-reviewed fields.
- **Conflict Management**: Any conflicting fields between sources must be flagged for admin review and manual merge decisions.
- **Trust Indicator Rule**: Source confidence and trust classifications are advisory only. They must never trigger automatic merging or automatic publishing.
- **Clear Architectural Boundary**: Phase 06 owns raw import mechanics only. Phase 09 owns validation, deduplication, completeness checks, review, and final apply decisions.

**Publication Rules:**
- **Visibility Guard**: A public preview or public page link must appear only when the record status is explicitly `PUBLISHED`.
- **Restricted Access**: Staged, `IMPORTED`, `INCOMPLETE`, `NEEDS_REVIEW`, and `READY_TO_PUBLISH` records must remain strictly admin-only.
- **No Public Leakage**: No staged, unreviewed, or unsupported imported test data may ever be displayed publicly on Phase 24 pages.

**Admin Action Bar**: Top action bar supporting Edit, Verify / Approve (`توثيق / اعتماد`), Mark Ready to Publish (`جاهز للنشر`), Publish (`نشر`), Unpublish (`إلغاء النشر`), Reject (`رفض`), Archive (`أرشفة`), Fetch Missing Fields from Official Source (`جلب النواقص من المصدر الرسمي`), and Link Test to Scholarships / Universities (`ربط الاختبار بالمنح / الجامعات`). Mandatory confirmation required for dangerous actions. Public page links appear ONLY when status is Published. Real Phase 09 API endpoints must be utilized for all backend actions once implemented; placeholder paths are strictly non-final.

**"Fetch Missing Fields from Official Source" Action**: Button ("Fetch Missing Fields from Official Source" / "جلب النواقص من المصدر الرسمي") checking official provider portals and suggesting missing fields only. Displays Arabic safety message and a preview modal before saving. Never overwrites reviewed or admin-approved fields silently.

**Duplicate & Safe Merge Visibility**: Displays original source name versus normalized canonical test name, duplicate status (`new`, `duplicate_skipped`, `existing_enriched`), merged fields, and conflicting fields flagged for review. Deduplication considers normalized test name, provider/owner, and test category to prevent duplicate tests for the same exam.

**Empty State**: When no tests exist, displays "No international tests found" (`لم يتم العثور على اختبارات دولية`), "Add Test" (`إضافة اختبار`), and "Open Tests Import Center" (`فتح مركز استيراد الاختبارات`, routing to `/admin/imports/international-tests`).

---

## 23.C.15 Native Courses Admin Workspace & Authoring Operational Workflow

**Operational Philosophy**
Phase 23 provides the administrative command center for authoring, reviewing, structuring, and publishing native MANARATAK courses (owned by Phase 13). The Courses Admin Workspace is explicitly split into three sections: Native MANARATAK Courses (`/admin/courses/native`), Imported External Courses (`/admin/imports/courses`), and Paid Courses (`/admin/courses/paid`).

**Section 1: Native MANARATAK Courses Experience (`/admin/courses/native`)**
- **Native Authoring Isolation**: Native MANARATAK Courses are authored directly inside MANARATAK and are NOT imported courses. They do not trigger external scraping or import feeds.
- **Vertical Administrative List**: A lightweight vertical list displaying course title (Arabic/English), category/field, level (Beginner/Intermediate/Advanced), language, price type (Free/Paid/Draft Pricing), lifecycle status, instructor name, certificate enabled badge, and a direct "View Details" navigation button to `/admin/courses/native/:id`. Full curriculum modules, lesson lists, question banks, and media files are excluded from the main list view to maintain maximum visual clarity.
- **Top Statistics Dashboard**: 8 explicit counters for All Native Courses (`كل دورات منارتك`), Draft (`مسودة`), Under Review (`قيد المراجعة`), Ready to Publish (`جاهزة للنشر`), Published (`منشورة`), Archived (`مؤرشفة`), Certificate Enabled (`الشهادة مفعلة`), and Missing Content (`محتوى ناقص`).
- **Create Native Course Wizard**: An authoring overlay button ("Create Native Course" / "إضافة دورة منارتك") featuring 6 structured steps:
  1. *Course Basics*: Title Ar/En, short description, category/field, level, language, instructor, cover image via Phase 05 EAP Asset ID, free/paid pricing flag.
  2. *Curriculum Builder*: Module creation, lesson ordering, lesson duration, lesson type (video, text, file, link, quiz).
  3. *Media & Attachments*: Uploaded video, PDF, and image assets stored strictly via Phase 05 EAP Asset Ref IDs.
  4. *Assessments & Question Bank*: Question bank drafting (MCQ, True/False, Short Answer), module quizzes, final exam configuration, passing score percentage, attempt limit.
  5. *Certificate Configuration*: Enable certificate boolean, Phase 14 template reference ID. Explicitly notes that Phase 14 owns certificate generation & issuance upon student completion; admin configures eligibility rules here.
  6. *Review & Publish Readiness*: Content completeness warnings, curriculum completeness check, assessment completeness check, media readiness check, initial status transition (Draft -> Under Review -> Ready to Publish -> Published).
- **Native Course Detail View (`/admin/courses/native/:id`)**: Comprehensive profile displaying course basics, curriculum modules & lessons, media assets via EAP IDs, assessments & question bank, certificate settings (Phase 14 note), pricing & payment metadata (Phase 19 note), publishing status, completeness checklist, and admin activity audit history.
- **Admin Action Bar**: 11 explicit actions: Edit (`تعديل`), Add Module (`إضافة وحدة`), Add Lesson (`إضافة درس`), Add Assessment (`إضافة اختبار`), Manage Question Bank (`إدارة بنك الأسئلة`), Manage Media (`إدارة الوسائط`), Enable/Configure Certificate (`تفعيل/إعداد الشهادة`), Mark Ready to Publish (`جاهزة للنشر`), Publish (`نشر`), Unpublish (`إلغاء النشر`), Archive (`أرشفة`). Dangerous actions require confirmation. No auto-publish.
- **Domain Boundaries**: Phase 13 owns native course curriculum, modules, lessons, question banks, assessments, course progression, and course publishing. Phase 05 EAP owns uploaded media/assets. Phase 14 owns certificate generation/issuance upon completion. Phase 19 owns checkout/payment execution for monetized courses. Phase 20 owns non-course paid student services and must NOT own or reclassify native courses as services. Phase 23 owns admin UI/control-plane only. Phase 24 owns public rendering only.

---

## 23.C.16 CMS Administration Editorial Operational Workflow

**Operational Philosophy**
Phase 23 provides the administrative control plane for editorial and marketing content management (owned by Phase 16). The CMS Admin Workspace is organized into 6 clear sections: Articles & Guides (`/admin/cms/articles`), FAQs (`/admin/cms/faqs`), Static Pages (`/admin/cms/pages`), Categories & Tags (`/admin/cms/categories`), Translations (`/admin/cms/translations`), and Content Review Queue (`/admin/cms/review`).

**Editorial Workspace Experience**
- **Articles & Guides (`/admin/cms/articles`)**: Lightweight vertical list showing article title, content type (Article, Study Guide, News, Checklist), category, language, status, and view details action. Detailed rich text editing, SEO metadata configuration, EAP featured image linking, and translation payloads are managed inside `/admin/cms/articles/:id`.
- **FAQs Management (`/admin/cms/faqs`)**: Manages guided questions and approved answers organized by category.
- **Static Pages (`/admin/cms/pages`)**: Manages platform static pages (About, Privacy, Terms, Contact, Custom).
- **Categories & Tags (`/admin/cms/categories`)**: Manages editorial categories and search tags without interfering with core domain taxonomy.
- **Translations (`/admin/cms/translations`)**: Manages localization payloads and translation review across languages.
- **Content Review Queue (`/admin/cms/review`)**: Aggregates items pending editorial approval before publishing.
- **11-Button CMS Action Bar**: Edit, Save Draft, Send to Review, Approve, Publish, Unpublish, Archive, Create Translation, Preview Public Page, Suggest SEO Metadata (AI), Suggest Translation Draft (AI).
- **AI Integration Boundaries**: Phase 17 provides AI draft suggestions for titles, excerpts, SEO metadata, translation drafts, and summaries. AI MUST NOT publish content directly; all suggestions remain drafts requiring explicit administrative review and manual publishing.
- **Domain Record Boundaries**: CMS content MUST NOT edit or modify core domain records (scholarships, universities, courses, majors, services, payments). References to domain entities exist as read-only editorial links only.

---

## 23.C.17 Student Tools Administration Operational Workflow

**Operational Philosophy**  
Phase 23 provides the control-plane administration interface for student-facing tools. The Student Tools Admin Workspace manages tool definitions, availability, launch priority, visibility states, and AI governance linkage without storing API keys, AI model prompts, or provider secrets in Phase 23.

**Student Tools Operational Experience**  
- **Tools Registry Listing (`/admin/student-tools`)**: Lightweight vertical list displaying tool title (bilingual), tool type (Assistant, AI Tool, Calculator, Comparison Tool, Normal Tool), visibility level (Public, Authenticated Students, Hidden, Admin Only), lifecycle status (Active, Coming Soon, Under Development, Disabled, Retired), launch priority (P1 Core Launch, P2 Expansion, P3 Later), AI dependency badge (AI / No AI), weekly usage count, health status, and a "View Details" action.
- **Top Summary Counters**: 8 real-time operational counters: All Tools, Active Tools, AI Tools, Coming Soon, Hidden/Admin Only, Disabled, Needs AI Governance Review, High-Cost Risk Tools.
- **Tool Detail Page (`/admin/student-tools/:id`)**: Comprehensive tool card detailing tool key/slug, bilingual title, description, tool type, visibility status, lifecycle status, launch priority, AI requirement, required login status, public/student UI placement, monthly/weekly usage metrics, cost risk assessment (Low, Medium, High), and admin activity audit trail.
- **11-Control Action Bar**: Edit Metadata, Activate, Disable, Mark Coming Soon, Hide/Admin Only, Show Publicly, Toggle Require Login, Change Priority (P1/P2/P3), Test Tool (Simulator), Open AI Governance (Phase 17), Open Dependency Health.
- **Sensitive Action Safety Rules**:
  - State changes (Activate, Disable) require confirmation modals.
  - Making high-cost AI-backed tools public requires a governance modal warning regarding token limits and cost controls in Phase 17.
- **AI Governance Linkage Panel**: Displays proxy route, model alias summary (without secrets), rate limit rules, token quota per run, academic safety policy, and last AI health check status. Links directly to Phase 17 AI Governance (`/admin/health`).
- **Dependency Health Matrix**: Shows connectivity and status across Phase 17 (AI), Phase 12 (Scholarships), Phase 11 (Universities), Phase 10 (Majors), Phase 13 (Courses), Phase 15 (Student Workspace), and Phase 19 (Payments), accompanied by graceful degradation user messaging.

---

## 23.C.18 Certificates Administration Operational Workflow

**Operational Philosophy**  
Phase 23 provides the administrative control-plane interface for issuing, verifying, revoking, and managing certificate templates across MANARATAK 2.0.

**Certificates Operational Experience**  
- **Main Certificates Registry (`/admin/certificates`)**: Clean, vertical list displaying certificate number/ID, verification code, student name/reference, source program/course, issue date, status badge (Issued, Verifiable, Pending, Revoked, Archived), and a "View Details" button.
- **Top Summary Counters**: 5 operational metrics: Total Certificates, Issued & Verifiable, Pending Requests, Revoked, Active Templates.
- **Pending Issuance Requests Tab**: Dedicated queue of pending certificate issuance requests. Displays student name/reference, course name, Phase 13 completion eligibility source, request timestamp, and actions (Approve & Issue, Reject, View Details). Certificates are issued ONLY upon verified eligibility or explicit authorized admin action with audit reason.
- **Certificate Templates Management Tab**: Configuration area for official certificate templates. Manages template name (bilingual), language (Arabic, English, Bilingual), Phase 05 EAP logo & signature asset handles, paper style, accent colors, legal/accreditation text, and active status, complete with an interactive visual template preview.
- **Certificate Detail View (`/admin/certificates/:id`)**: Comprehensive detail page providing certificate ID, student reference/name, source course/program reference, issue date, status, template used, digital signature verification status & hash, QR/public verification link (`/verify-certificate?code=...`), PDF asset handle (Phase 05 EAP), audit history ledger, and admin notes.
- **Safe Administrative Actions**:
  - Preview certificate (interactive visual certificate modal).
  - Issue certificate / Approve issuance request.
  - Verify digital signature against Phase 14 cryptographic ledger.
  - Download PDF via Phase 05 EAP asset handle.
  - Open public verification page (`/verify-certificate?code=...`).
  - Revoke certificate with mandatory revocation reason input modal.
  - Archive certificate if allowed.
- **Strict Governance Safety Bounds**: Permanent deletion of issued certificates is strictly forbidden. Issued certificates can only be revoked with a documented reason and immutable audit trail. Public verification displays verification status and protected student references without exposing private personal data.

---

## 23.C.19 Finance & Payments Administration Operational Workflow

**Operational Philosophy**  
Phase 23 provides the administrative control-plane interface for invoicing, payment collections, manual bank transfer verifications, refund management, pricing references, and financial reports across MANARATAK 2.0.

**Finance Operational Experience**  
- **Main Finance Workspace (`/admin/finance`)**:
  - **6 Top KPI Metric Cards**: Total payments this month, Paid invoices, Pending invoices, Failed payments, Refund requests, Bank transfers pending verification.
  - **6 Workstation Tabs**:
    1. **Invoices Registry**: Clean vertical table displaying Invoice Number, Student Name & Reference ID, Item Type (Paid Course, Service, Exam Fee, Printing Fee), Item Name, Amount & Currency, Payment Method, Payment Status Badge, Creation Date, and "View Details" button.
    2. **Refund Requests Queue**: Management queue displaying Request ID, Student Name & Ref, Related Invoice, Refund Amount, Reason, Status (Pending, Approved, Rejected, Processed), and Approve/Reject controls.
    3. **Bank Transfer Verification Area**: Manual verification queue displaying Student Name, Invoice Number, Uploaded Receipt (EAP asset handle), Amount, Bank Reference Number, Submission Date, Status, and Approve/Reject/Request clearer receipt controls.
    4. **Pricing References**: Read/admin-facing reference area displaying course pricing from Phase 13 and service pricing from Phase 20 with active status and currency without owning course/service content.
    5. **Financial Reports**: Overview displaying daily/monthly totals, revenue by item type, revenue by payment method, refund totals, and failed payment metrics.
- **Invoice Detail View (`/admin/finance/invoices/:id`)**: Comprehensive detail page providing Invoice Number, Student Reference & Name, Item Type & Name, Financial Breakdown (Subtotal, Discount, 15% VAT, Total Amount), Currency, Payment Method, Gateway Transaction ID & Status, EAP Receipt/Bank Slip handles, Audit Ledger, and Admin Notes.
- **Safe Administrative Actions**:
  - Confirm payment (for bank transfers or manual review).
  - Reject bank transfer (with reason).
  - Request more information / clearer receipt.
  - Issue refund (with mandatory reason modal).
  - Mark as failed.
  - Download official invoice / receipt via Phase 05 EAP asset handle.
  - Send payment notification to student email.
- **Strict Governance Safety Bounds**: Permanent deletion of invoices or payment records is strictly forbidden. Financial records can only be voided, refunded, or marked failed with a documented audit reason.

---

## 23.C.20 Career & Alumni Administration Operational Workflow

**Operational Philosophy**  
Phase 23 provides the administrative control-plane interface for managing job/internship opportunities, review and publication approvals, student application submissions, alumni network profiles, bounded recruitment entity metadata, and market skill analytics across MANARATAK 2.0.

**Career Operational Experience**  
- **Main Careers Workspace (`/admin/careers`)**:
  - **6 Top KPI Metric Cards**: Active opportunities, New applications, Opportunities needing review, Registered alumni profiles, Verified recruitment entities, Expired opportunities needing archive.
  - **6 Workstation Tabs**:
    1. **Opportunities Registry**: Clean vertical table displaying Opportunity Title & Classification, Recruitment Entity Name, Location (Country/City/Remote), Application Deadline, Applicant Count, Publication Status Badge, and "View Details" control.
    2. **Applications Queue**: Review queue displaying Student Name & Ref, Opportunity Title, Phase 05 EAP CV Asset Handle (`eap_asset_cv_...`), Application Status (Submitted, Under Review, Shortlisted, Rejected, Withdrawn, Accepted), Submission Date, and Admin Notes.
    3. **Alumni Profiles Section**: Admin view displaying Student Ref, Graduation Year, Current Role & Industry, Skills Summary, Visibility Status (Private, Alumni Network Only, Public Consent), and Profile Completeness Percentage.
    4. **Recruitment Entity Metadata**: Bounded metadata view displaying Entity Name, Entity Type (Company, Institution, NGO, Government), Country, Website, Verification Status, Related Opportunities Count, and Source Trust Level.
    5. **Review & Publishing Area**: Dedicated moderation workspace for opportunities awaiting explicit administrative review before publication.
    6. **Career Analytics**: Read-only analytics displaying applications by opportunity type, most requested skills, opportunities by country, expired vs active opportunities, alumni profile completion, and Phase 17 AI recommendation coverage (read-only advisory output).
- **Opportunity Detail View (`/admin/careers/opportunities/:id`)**: Comprehensive detail page providing Opportunity Title, Description, Type, Bounded Recruitment Entity Metadata, Location & Remote status, Required Skills, Eligibility Requirements, Application Deadline, Application Link/Internal Mode, Publication Status, Official Source Reference, Applicant Count, Missing Fields, Phase 17 AI Match Score & Advisory, and Audit History Timeline.
- **Safe Administrative Actions**:
  - Edit opportunity metadata.
  - Approve opportunity for publication.
  - Publish opportunity.
  - Unpublish / suspend opportunity.
  - Reject opportunity with reason.
  - Archive expired or obsolete opportunity.
  - Fetch missing fields from official source.
  - Open applicant submissions queue.
  - Open public page post-publishing (`/careers/opportunities/:id`).
- **Strict Governance Safety Bounds**:
  - Automatic publishing of imported/created opportunities is strictly forbidden.
  - Creating a standalone Organizations Platform or Employers Platform is strictly forbidden.
  - Exposing private student/alumni data publicly by default without explicit student visibility settings is strictly forbidden.
  - All CVs and document attachments must use Phase 05 EAP handles instead of raw file URLs.

---

## 23.C.21 AI Governance & AI Center Operational Workflow

**Operational Philosophy**  
Phase 23 provides the administrative control-plane interface for Phase 17 (Enterprise AI Platform). It governs provider management, model routing, prompt repository management outside codebase, AI translation workflows, BullMQ queue management, privacy redaction, and operational limits across MANARATAK 2.0.

**AI Center Operational Experience**  
- **Main AI Governance Workspace (`/admin/ai-governance`)**:
  - **6 Top KPI Metric Cards**: Total AI requests today, Translation operations, Motivation letter/CV generations, Token consumption & estimated cost, Average response latency (ms), Blocked/filtered requests.
  - **10 Workstation Tabs**:
    1. **AI Center Dashboard**: Health cards for providers (Gemini, OpenAI, Claude, DeepSeek, Local/Custom Models) with real-time status and failure rate metrics.
    2. **AI Providers**: Management table for providers displaying Name, Operational Status (Active/Disabled/Degraded/Not Configured), Priority order, Assigned default services, Health check, Latency, Failure rate, and API Key status (Configured/Missing - Masked ONLY, no secrets revealed!). Actions: Enable/Disable, Test Connection.
    3. **AI Translation Center**: Workflow view for translating Universities, Scholarships, Courses, CMS Articles, Majors, Tests, and Services. Shows Entity Type, Pending, Completed, Failed, Target languages, and Review status. Action: Start translation batch. *Governance Rule: AI translations NEVER publish automatically; sent to CMS/Editorial review queue (Phase 16).*
    4. **Prompt Management**: Centralized repository for system prompts stored outside codebase. Displays Prompt Name, Service Name, Version, Status, Target Provider/Model, Safety classification, and Last updated. Detail modal allows viewing/editing system prompt text, placeholder variables (`{{student_background}}`), expected JSON output schema, safety notes, prompt testing, and version history rollback.
    5. **AI Tasks**: Execution tracking view displaying Task ID, Task Type, Related Tool/Domain, Execution Status (Queued, Running, Completed, Failed, Blocked, Needs Human Review), Provider used, Model used, Timestamps, Runtime duration (ms), Token usage, and Retry count.
    6. **AI Queue**: Workload processing queue view (BullMQ / Redis). Displays Queued tasks, Running tasks, Retry queue, Average wait time, Throttling status, and Queue Controls (Pause Queue, Resume Queue, Retry Failed Task, Cancel Task). Includes clear preview label distinguishing control-plane preview from underlying Redis worker execution.
    7. **AI Logs & Incidents**: Audit log table displaying Operation ID, Tool Name, User Type (Guest/Student/Admin/System), Provider, Model, Safety Result, and Timestamps. *Privacy Rule: Student PII redacted and masked automatically.*
    8. **AI Settings**: System parameters configuring Default Language, Default Primary Provider, Fallback Provider, Max Retries, Input/Output Token Limits, Daily Request Limit per User, Safety Filter Sensitivity, Human Review Threshold Score, and Cost Alert Thresholds.
    9. **AI Usage Analytics**: Visual breakdowns for Most Used AI Tools, Provider Share, Success/Failure Rate, Latency trends, and Cost Distribution by service.
    10. **Unified AI Service Boundary Panel**: Read-only architectural guide explaining internal routing rules (`AIService.routeRequest()`), prohibiting direct domain calls to OpenAI/Gemini/Claude, and defining clear boundary ownership across Phase 17, Phase 18, Phase 16, Phase 15, and Phase 23.

---

## 23.C.22 Health & Readiness Operational Workflow

**Operational Philosophy**  
Phase 23 provides non-destructive, read-only system monitoring and readiness inspection (`/admin/health`). It offers real-time component health checks, readiness checklists, and diagnostic reporting to give administrators complete visibility into system operational status across all 24 phases of MANARATAK 2.0.

**Health & Readiness Operational Experience**  
- **Main Health Workspace (`/admin/health`)**:
  - **Runtime Preview Banner**: Prominently displays runtime mode awareness ("وضع معاينة: بعض فحوصات الإنتاج قد تكون غير متصلة").
  - **Safe Actions Toolbar**: Re-run health checks, Copy diagnostic summary, Download readiness report (JSON). Destructive data purges or secret rotations are strictly forbidden.
  - **Top 5 Component Summary Cards**: Overall System Status, API Response Time (42ms), Prisma DB Latency (18ms), Redis Queue Mode (In-Memory Safe Fallback), and AI Center Provider Status (420ms - Masked Keys).
  - **4 Workstation Tabs**:
    1. **Components Overview & Detailed List**: Table displaying Component Name, Owned Phase (Phase 05, 06, 17, 19, 23, 24), Operational Status (Healthy, Warning, Down, Not Configured), Latency, Last Checked Time, and Safe Actions ("View Details", "Open Domain"). Includes API Server, Database/Prisma, Redis/BullMQ, Import Foundation, EAP Assets, Auth/Admin, Public Web, AI Center, Payment Gateway, and Email Gateway.
    2. **Readiness Checklist**: 10-point production readiness checklist covering Environment Variables, Schema Sync, Redis Safe Fallback, Import Pipeline Reachability, API Secrets Masking, i18n/RTL Support, EAP Asset Handles, AI Output Review Enforcement, Payment Sandbox Guard, and Clean Lint/Build Compilation.
    3. **System Incident Log**: Non-destructive log tracking incident IDs, affected components, severity (Info, Warning, Critical), status, timestamps, error summaries, and detailed incident inspection modal.
    4. **Unified Diagnostics Summary & Export**: Raw diagnostic log viewer with one-click buttons to copy the diagnostic summary or download a JSON report file.

---

## 23.C.23 Admin Settings & Configuration Operational Workflow

> **2026-09-05 SOURCE-CLOSURE CORRECTION:** The former preview workflow with hardcoded admin-user counts, role matrices, session counts, login metrics, and masked API-key cards is historical and must not be recreated. Those records belong to IAM/Audit/Health/Secret Provider boundaries.

**Operational Philosophy**  
`/admin/settings` is a small governed configuration workspace, not a catch-all control panel. Every displayed value must originate from the Settings API and every mutation must preserve version history.

**Canonical Operational Experience**  
- **Definitions tab:** list/create dynamic settings with key, value type, description, feature-flag marker, lifecycle metadata, and optional non-secret default value.
- **Scoped Values & History tab:** assign values at `GLOBAL`, `DOMAIN`, `TENANT`, or `IDENTITY`; inspect the complete immutable version chain; roll back by creating a new version that records its source version.
- **Boundary cards/deep links:** direct admins to IAM/RBAC for identities and permissions, Secret Provider/Environment for credentials, and Reference Data for canonical countries/currencies/languages/cities.
- **Secret rules:** secret definitions may exist as metadata, but raw secret defaults, writes, reads, and rollback through the Settings API are prohibited.
- **Failure behavior:** API errors are shown as errors. The page must never substitute demo metrics, fake successful saves, or static readiness status.

---

**Architectural Commentary**  
The following criteria constitute formal governance gates for Phase 23 Part C, ensuring workflow specifications comply with MANARATAK 2.0 standards.

### 23.C.10.1 Administration Workflow Validation
- **Workflow Consistency:** Validated. All content types abide by a uniform administrative review pipeline.
- **Task Flow Efficiency:** Validated. Proactive task queues eliminate stagnant content states.
- **Cross-Phase Boundaries:** Validated. Import mechanics delegated to Phase 06, course state machine to Phase 13, AI translation to Phase 17, and public page rendering to Phase 24.
- **Scope Compliance:** Validated. Bounded strictly to approved roadmap entities within the 24-phase framework.

### 23.C.11.2 Acceptance Criteria
- Defines administrative workflows, task queues, and course moderation tollgate steps.
- Establishes clear boundaries between administrative command surfaces (Phase 23) and public page composition (Phase 24).
- Provides unambiguous operational specifications without code implementation artifacts.

### 23.C.11.3 Architecture Review Checklist
- [x] Administration Workflow Philosophy Validation
- [x] Unified Content Lifecycle Validation
- [x] Task Queue & Monitoring Surface Validation
- [x] Public Platform Command & Visibility Synchronization
- [x] Course & Provider Tollgate Moderation Workflow
- [x] Roadmap Scope Bounds & Governance
- [x] Readiness Review

### 23.C.11.4 ARB Decision

**Decision:** Approved for Baseline / Documentation Ready  
**Approver:** Chief Enterprise Architect & Architecture Review Board (ARB)  

---

### Navigation
[← Phase 22: Enterprise Product Experience](../phase-22-enterprise-product-experience/phase-22-01-enterprise-product-experience-architecture-specification.md) | [Phase 23: Architecture Spec (Part A)](./phase-23-01-enterprise-administration-portal-architecture-specification.md) | [Phase 23: Structure Contracts (Part B)](./phase-23-02-enterprise-administration-portal-structure-contracts.md) | [Phase 24: Enterprise Public Platform →](../phase-24-enterprise-public-platform/phase-24-01-enterprise-public-platform-architecture-specification.md)
