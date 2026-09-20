# Phase 23: Enterprise Administration Portal - Admin Preview UI Design and Action Backlog


## 1. Title and Governance Notice

> **2026-09-05 SOURCE-CLOSURE UPDATE — HISTORICAL/SUPERSEDED INVENTORY**
> This document remains as migration history and design rationale. It is no longer the runtime or source-of-truth inventory for Admin surfaces. Canonical administrative ownership now lives in `apps/admin/src/pages` and its API/domain boundaries. In particular, the legacy Web AI Governance, Student Tools, and Settings preview surfaces are removed/superseded; `/admin/ai*`, `/admin/student-tools*`, and `/admin/settings` must resolve to the canonical Admin application. Do not recreate removed preview pages or shadow AI/tool execution paths from this backlog.

**Document Title:** Phase 23 Enterprise Administration Portal - Admin Preview UI Design and Action Backlog  
**Target File Path:** `docs/phases/phase-23-enterprise-administration-portal/phase-23-04-admin-preview-ui-design-and-action-backlog.md`  
**Historical Design Source:** `apps/web/src/features/admin-preview`  
**Current Canonical Admin Source:** `apps/admin/src/pages`  

> **GOVERNANCE MANDATE:**
> Historically, the 46 React component files in `apps/web/src/features/admin-preview` represented the approved target design inventory for MANARATAK 2.0. That inventory guided migration into `apps/admin`; it must not be interpreted as permission to restore a removed preview after the canonical Admin implementation exists. Current runtime behavior, permissions, domain ownership, and source-closure decisions in `apps/admin` and the owning domain take precedence.
> 
> **STRICT PROHIBITION:**
> Under no circumstances shall the admin portal design be simplified into basic CRUD tables or generic boilerplate admin screens. The rich data density, multi-tab layout, review queues, workflow actions, and governance controls must be preserved in full when migrating these components from `apps/web` to `apps/admin`.

---


## 2. Purpose
This document establishes the official bridge between:
1. **Phase 23 Architecture & Control Plane:** The structural specifications for administration routing, RBAC guards, audit invocation, and workflow orchestration.
2. **Historical Admin Preview UI:** The former design inventory under `apps/web/src/features/admin-preview`, retained only as migration/design history where files still exist.
3. **Domain Backend Implementation Backlog:** The step-by-step requirements for connecting each UI element to its corresponding domain backend phase API.

---


## 3. Relationship to Existing Phase 23 Documents

- **`phase-23-01-architecture-specification.md`:** Defines the high-level architecture, container boundaries, security middleware, and control plane.

- **`phase-23-02-structure-contracts.md`:** Defines administrative router contracts, response envelopes, and error handling standards.

- **`phase-23-03-workflows-operational-experience.md`:** Outlines operational procedures, review queue workflows, and readiness gates.

- **This Document (`phase-23-04-...`):** Codifies the complete 46-file UI design inventory, component breakdown, action matrix, and domain ownership mapping for every button and workflow in the preview suite.

---


## 4. Admin Preview Folder as Approved Design Reference
The folder `apps/web/src/features/admin-preview` served as the historical design inventory during Phase 23 migration. It is **not** the current source of truth; the canonical Admin implementation is under `apps/admin`. The list below is retained as a historical 46-file inventory:


- **AI Governance & Model Routing** (`AdminAiGovernancePreviewPage.tsx`)

- **Careers & Alumni / Recruitment Metadata** (`AdminCareersPreviewPage.tsx`, `AdminCareerOpportunityDetailPage.tsx`)

- **Certificates & Credential Verification** (`AdminCertificatesPreviewPage.tsx`, `AdminCertificateDetailPage.tsx`)

- **CMS & Editorial Content Engine** (10 dedicated files for Articles, FAQs, Pages, Categories, Translations, Review Queue)

- **Course Catalog Management** (8 dedicated files for Native, Imported, Paid Courses, and Catalog Landing)

- **Domain Import & Staging Control Center** (`AdminDomainImportCenterPage.tsx`, `AdminImportsPreviewPage.tsx`, `AdminReviewQueuePreviewPage.tsx`)

- **Finance & Invoicing Platform** (`AdminFinancePreviewPage.tsx`, `AdminInvoiceDetailPage.tsx`)

- **International Tests & Standardized Exams** (`AdminInternationalTestsPreviewPage.tsx`, `AdminInternationalTestDetailPage.tsx`)

- **Academic Majors & Degree Pathways** (`AdminMajorsPreviewPage.tsx`, `AdminMajorDetailPage.tsx`)

- **Non-Course Services Marketplace** (`AdminServicesLandingPage.tsx`, `AdminStudentServices...`, `AdminGeneralServices...`)

- **Scholarship Management** (`AdminScholarshipsPreviewPage.tsx`, `AdminScholarshipDetailPage.tsx`)

- **Student Tools Registry & Governance** (`AdminStudentToolsPreviewPage.tsx`, `AdminStudentToolDetailPage.tsx`)

- **Universities & Higher Education Institutions** (`AdminUniversitiesPreviewPage.tsx`, `AdminUniversityDetailPage.tsx`)

- **System Health & Infrastructure Readiness** (`AdminHealthPreviewPage.tsx`)

- **Global Settings & Policy Configuration** (`AdminSettingsPreviewPage.tsx`) — **HISTORICAL/SUPERSEDED; compatibility redirect only, do not restore preview data or IAM/secrets ownership**

- **System Shell & Generic Preview Controls** (`AdminPreviewShell.tsx`, `AdminGenericPreviewPage.tsx`)

---


## 5. Non-Negotiable Rule: Do Not Simplify the Admin Portal
1. **Preserve Layout Complexity:** Every detail screen must maintain its multi-tab hierarchy (e.g., Overview, Financial Breakdown, Eligibility, Curriculum, Governance).
2. **Preserve Action Granularity:** Actions like "Approve with Conditions", "Request Revision", "Mark Verified", "Promote Import Batch", "Set Token Quota", and "Revoke Certificate" must remain explicit actions in the UI.
3. **No Over-Simplification:** Replacing custom detail screens with plain JSON inspectors or generic single-table views is considered a critical architecture defect.

---


## 6. Phase Ownership and Delegation Matrix

Phase 23 owns the **Administrative UI Shell, Routing, Permission Checks, Confirmation Modals, and Audit Event Invocation**. Business logic and database operations are delegated strictly to domain phases.

#


## Domain Phase Mapping:

- **Phase 05 (Core IAM, Audit, Assets, Settings):** User roles, RBAC/ABAC middleware, audit log persistence, asset/S3 uploads, system settings.

- **Phase 06 (Generic Import Mechanics):** Batching, file parsing (CSV/JSON), row error logging, retry queues.

- **Phase 07 (Reference Data):** Countries, languages, currencies, field-of-study taxonomy.

- **Phase 08 (Academic Taxonomy):** Foundational academic fields, disciplines, program areas, ISCED/CIP standards, hierarchy/DAG nodes, cross-standard mappings.

- **Phase 09 (International Tests):** Standardized test metadata, exam score structures, test provider settings.

- **Phase 10 (Academic Majors):** Degree pathways, CIP codes, career outcome mappings, major completeness.

- **Phase 11 (Universities & Institutions):** University entity data, accreditation status, website scraping/extraction, campus locations.

- **Phase 12 (Scholarships):** Funding programs, eligibility criteria, award amounts, deadline tracking, scholarship publishing.

- **Phase 13 (Course Catalog):** Native courses, imported MOOCs, paid provider courses, syllabus structures, video assets.

- **Phase 14 (Certificates):** Credential issuance, cryptographic verification signatures, revocation reason tracking.

- **Phase 15 (Student Workspace):** Private student state, saved items, progress tracking (not directly manageable via admin UI).

- **Phase 16 (CMS & Editorial):** Articles, FAQs, static pages, categories, multi-language translation queues, editorial workflow.

- **Phase 17 (AI Governance):** Gemini model routing, token usage limits, cost governance, prompt templates, AI safety rules.

- **Phase 18 (Student Tools Registry):** Utility tools catalog, input/output schemas, execution mode (Local/API/AI Proxy).

- **Phase 19 (Finance Platform):** Invoices, payments, refund processing, gateway transaction logs.

- **Phase 20 (Non-Course Services):** Service marketplace, student request tickets, processing SLAs.

- **Phase 21 (Careers & Alumni):** Job postings, recruitment employer metadata, internship listings, career paths.

- **Phase 22 (Product Experience Identity):** UX guidelines, public navigation principles.

- **Phase 23 (Admin Portal):** Control plane, navigation sidebar, review queues, action modals, audit trigger.

- **Phase 24 (Public Platform):** Public routing, read-model rendering, public search composition.

#


## Strict Architectural Boundaries:

- **No Phase 25:** All work must fit within the existing 24-phase roadmap.

- **No Organizations Platform:** Organizations or sponsors are stored as plain metadata attributes inside Phase 11/12/21 entities.

- **No Employers Platform:** Employers exist strictly as recruitment metadata inside Phase 21 (`CareerEmployer`).

- **No Standalone Search Platform:** Search inside the admin portal is local page-level filtering or domain read-model queries.

- **No Secret Exposure:** Secrets (API keys, connection strings, JWT secrets) must never be sent to or displayed in the React frontend.

- **No Auto-Publishing:** Imported data must enter staging or `READY_TO_REVIEW` status. Admin intervention is mandatory for `PUBLISHED` status.

- **No Silent Overwriting:** Re-importing matched records must prompt the admin with a diff/review modal.

- **No Hard Deletion:** Core domain entities (Invoices, Certificates, Published Scholarships, Audit Logs) must use soft-delete or archiving (`ARCHIVED` status).

---


## 7. Complete Admin Preview File Inventory (46 Files)

Below is the complete inventory of all 46 files in `apps/web/src/features/admin-preview`:

| # | Exact Filename | Functional Area | Intended Route | Page Type | Domain Owner | UI vs Backend Role | Current Status | Migration Target | Notes & Dependencies |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `AdminAiGovernancePreviewPage.tsx` | AI Governance | `/admin/ai-governance` | Governance | Phase 17 | Historical Phase 23 preview / Phase 17 API | **SUPERSEDED / REMOVED** | `apps/admin/src/pages/AIGovernancePage.tsx` | Canonical provider-neutral AI governance; Web legacy route redirects to Admin |
| 2 | `AdminCareerOpportunityDetailPage.tsx` | Careers & Alumni | `/admin/careers/jobs/:id` | Detail | Phase 21 | Phase 23 UI / Phase 21 API | UI Only | `apps/admin/src/pages/CareerJobDetailPage.tsx` | Job posting & employer meta |
| 3 | `AdminCareersPreviewPage.tsx` | Careers & Alumni | `/admin/careers` | List | Phase 21 | Phase 23 UI / Phase 21 API | Partial API | `apps/admin/src/pages/CareerAdminPage.tsx` | Employers & Job Opportunities |
| 4 | `AdminCertificateDetailPage.tsx` | Certificates | `/admin/certificates/:id` | Detail | Phase 14 | Phase 23 UI / Phase 14 API | UI Only | `apps/admin/src/pages/CertificateDetailPage.tsx` | Verification & Revocation |
| 5 | `AdminCertificatesPreviewPage.tsx` | Certificates | `/admin/certificates` | List | Phase 14 | Phase 23 UI / Phase 14 API | Partial API | `apps/admin/src/pages/CertificateAdminPage.tsx` | Issue & registry search |
| 6 | `AdminCmsArticleDetailPage.tsx` | CMS Editorial | `/admin/cms/articles/:id` | Detail | Phase 16 | Phase 23 UI / Phase 16 API | UI Only | `apps/admin/src/pages/CmsArticleDetailPage.tsx` | Rich editor & publish |
| 7 | `AdminCmsArticlesPreviewPage.tsx` | CMS Editorial | `/admin/cms/articles` | List | Phase 16 | Phase 23 UI / Phase 16 API | Partial API | `apps/admin/src/pages/CmsArticlesPage.tsx` | Article management |
| 8 | `AdminCmsCategoriesPreviewPage.tsx` | CMS Editorial | `/admin/cms/categories` | List | Phase 16 | Phase 23 UI / Phase 16 API | UI Only | `apps/admin/src/pages/CmsCategoriesPage.tsx` | Content taxonomy |
| 9 | `AdminCmsFaqDetailPage.tsx` | CMS Editorial | `/admin/cms/faqs/:id` | Detail | Phase 16 | Phase 23 UI / Phase 16 API | UI Only | `apps/admin/src/pages/CmsFaqDetailPage.tsx` | FAQ item & category |
| 10 | `AdminCmsFaqsPreviewPage.tsx` | CMS Editorial | `/admin/cms/faqs` | List | Phase 16 | Phase 23 UI / Phase 16 API | UI Only | `apps/admin/src/pages/CmsFaqsPage.tsx` | FAQ directory |
| 11 | `AdminCmsLandingPage.tsx` | CMS Editorial | `/admin/cms` | Landing | Phase 16 | Phase 23 UI / Phase 16 API | Partial API | `apps/admin/src/pages/CmsAdminPage.tsx` | CMS overview dashboard |
| 12 | `AdminCmsPageDetailPage.tsx` | CMS Editorial | `/admin/cms/pages/:id` | Detail | Phase 16 | Phase 23 UI / Phase 16 API | UI Only | `apps/admin/src/pages/CmsPageDetailPage.tsx` | Static page builder |
| 13 | `AdminCmsPagesPreviewPage.tsx` | CMS Editorial | `/admin/cms/pages` | List | Phase 16 | Phase 23 UI / Phase 16 API | UI Only | `apps/admin/src/pages/CmsPagesPage.tsx` | Page directory |
| 14 | `AdminCmsReviewQueuePage.tsx` | CMS Editorial | `/admin/cms/review-queue` | Review Queue | Phase 16 | Phase 23 UI / Phase 16 API | UI Only | `apps/admin/src/pages/CmsReviewQueuePage.tsx` | Editorial approval queue |
| 15 | `AdminCmsTranslationsPreviewPage.tsx` | CMS Editorial | `/admin/cms/translations` | List | Phase 16 | Phase 23 UI / Phase 16 API | UI Only | `apps/admin/src/pages/CmsTranslationsPage.tsx` | AR/EN translation status |
| 16 | `AdminCoursesLandingPage.tsx` | Course Catalog | `/admin/courses` | Landing | Phase 13 | Phase 23 UI / Phase 13 API | Partial API | `apps/admin/src/pages/CourseAdminPage.tsx` | Course hub |
| 17 | `AdminDomainImportCenterPage.tsx` | Imports & Staging | `/admin/imports/domains` | Import Center | Phase 06 | Phase 23 UI / Phase 06 Engine | Real API | `apps/admin/src/pages/DomainImportCenterPage.tsx` | Multi-domain import launcher |
| 18 | `AdminFinancePreviewPage.tsx` | Finance Platform | `/admin/finance` | List | Phase 19 | Phase 23 UI / Phase 19 API | Partial API | `apps/admin/src/pages/FinanceAdminPage.tsx` | Invoices, revenue, refunds |
| 19 | `AdminGeneralServiceDetailPage.tsx` | Non-Course Services | `/admin/services/general/:id` | Detail | Phase 20 | Phase 23 UI / Phase 20 API | UI Only | `apps/admin/src/pages/GeneralServiceDetailPage.tsx` | General service configuration |
| 20 | `AdminGeneralServicesPreviewPage.tsx` | Non-Course Services | `/admin/services/general` | List | Phase 20 | Phase 23 UI / Phase 20 API | UI Only | `apps/admin/src/pages/GeneralServicesPage.tsx` | General services directory |
| 21 | `AdminGenericPreviewPage.tsx` | System Shell | `/admin/preview/*` | Shell | Phase 23 | Phase 23 UI | UI Only | `apps/admin/src/pages/GenericPreviewPage.tsx` | Dynamic route preview shell |
| 22 | `AdminHealthPreviewPage.tsx` | System Health | `/admin/health` | Health | Phase 05 / 23 | Phase 23 UI / Phase 05 Infra | Real API | `apps/admin/src/pages/AdminHealthReadinessPage.tsx` | Database, Auth, Storage health |
| 23 | `AdminImportedCourseDetailPage.tsx` | Course Catalog | `/admin/courses/imported/:id` | Detail | Phase 13 | Phase 23 UI / Phase 13 API | UI Only | `apps/admin/src/pages/ImportedCourseDetailPage.tsx` | MOOC / Coursera imported item |
| 24 | `AdminImportedCoursesPreviewPage.tsx` | Course Catalog | `/admin/courses/imported` | List | Phase 13 | Phase 23 UI / Phase 13 API | UI Only | `apps/admin/src/pages/ImportedCoursesPage.tsx` | External course repository |
| 25 | `AdminImportsPreviewPage.tsx` | Imports & Staging | `/admin/imports` | Import Center | Phase 06 | Phase 23 UI / Phase 06 Engine | Real API | `apps/admin/src/pages/ImportAdminPage.tsx` | Import jobs history & retry |
| 26 | `AdminInternationalTestDetailPage.tsx` | International Tests | `/admin/international-tests/:id` | Detail | Phase 09 | Phase 23 UI / Phase 09 API | UI Only | `apps/admin/src/pages/InternationalTestDetailPage.tsx` | Exam details & scoring |
| 27 | `AdminInternationalTestsPreviewPage.tsx` | International Tests | `/admin/international-tests` | List | Phase 09 | Phase 23 UI / Phase 09 API | Partial API | `apps/admin/src/pages/InternationalTestsAdminPage.tsx` | IELTS, TOEFL, SAT registry |
| 28 | `AdminInvoiceDetailPage.tsx` | Finance Platform | `/admin/finance/invoices/:id` | Detail | Phase 19 | Phase 23 UI / Phase 19 API | UI Only | `apps/admin/src/pages/InvoiceDetailPage.tsx` | Invoice line items & refunds |
| 29 | `AdminMajorDetailPage.tsx` | Academic Majors | `/admin/majors/:id` | Detail | Phase 10 | Phase 23 UI / Phase 10 API | UI Only | `apps/admin/src/pages/MajorDetailPage.tsx` | Degree mapping & outcomes |
| 30 | `AdminMajorsPreviewPage.tsx` | Academic Majors | `/admin/majors` | List | Phase 10 | Phase 23 UI / Phase 10 API | Partial API | `apps/admin/src/pages/MajorAdminPage.tsx` | Major taxonomy catalog |
| 31 | `AdminNativeCourseDetailPage.tsx` | Course Catalog | `/admin/courses/native/:id` | Detail | Phase 13 | Phase 23 UI / Phase 13 API | UI Only | `apps/admin/src/pages/NativeCourseDetailPage.tsx` | Native syllabus & video lessons |
| 32 | `AdminNativeCoursesPreviewPage.tsx` | Course Catalog | `/admin/courses/native` | List | Phase 13 | Phase 23 UI / Phase 13 API | UI Only | `apps/admin/src/pages/NativeCoursesPage.tsx` | Native courses catalog |
| 33 | `AdminPaidCourseDetailPage.tsx` | Course Catalog | `/admin/courses/paid/:id` | Detail | Phase 13 | Phase 23 UI / Phase 13 API | UI Only | `apps/admin/src/pages/PaidCourseDetailPage.tsx` | Partner paid course pricing |
| 34 | `AdminPaidCoursesPreviewPage.tsx` | Course Catalog | `/admin/courses/paid` | List | Phase 13 | Phase 23 UI / Phase 13 API | UI Only | `apps/admin/src/pages/PaidCoursesPage.tsx` | Paid courses repository |
| 35 | `AdminPreviewShell.tsx` | System Shell | `/admin/*` | Shell | Phase 23 | Phase 23 UI Layout | Real API | `apps/admin/src/App.tsx` | Main sidebar & top nav shell |
| 36 | `AdminReviewQueuePreviewPage.tsx` | Review Queues | `/admin/review-queue` | Review Queue | Phase 06 / Domain | Phase 23 UI / Domain API | Partial API | `apps/admin/src/pages/AdminReviewQueuePage.tsx` | Global multi-domain review queue |
| 37 | `AdminScholarshipDetailPage.tsx` | Scholarships | `/admin/scholarships/:id` | Detail | Phase 12 | Phase 23 UI / Phase 12 API | Real API | `apps/admin/src/pages/ScholarshipDetailPage.tsx` | Funding details & eligibility |
| 38 | `AdminScholarshipsPreviewPage.tsx` | Scholarships | `/admin/scholarships` | List | Phase 12 | Phase 23 UI / Phase 12 API | Real API | `apps/admin/src/pages/ScholarshipListPage.tsx` | Scholarship catalog & filter |
| 39 | `AdminServicesLandingPage.tsx` | Non-Course Services | `/admin/services` | Landing | Phase 20 | Phase 23 UI / Phase 20 API | Partial API | `apps/admin/src/pages/ServicesAdminPage.tsx` | Services overview hub |
| 40 | `AdminSettingsPreviewPage.tsx` | System Settings | `/admin/settings` | Settings | Phase 05 / 23 | Phase 23 UI / Phase 05 API | Real API | `apps/admin/src/pages/SettingsAdminPage.tsx` | Global environment & security |
| 41 | `AdminStudentServiceDetailPage.tsx` | Non-Course Services | `/admin/services/student/:id` | Detail | Phase 20 | Phase 23 UI / Phase 20 API | UI Only | `apps/admin/src/pages/StudentServiceDetailPage.tsx` | Student service request processing |
| 42 | `AdminStudentServicesPreviewPage.tsx` | Non-Course Services | `/admin/services/student` | List | Phase 20 | Phase 23 UI / Phase 20 API | UI Only | `apps/admin/src/pages/StudentServicesPage.tsx` | Student services catalog |
| 43 | `AdminStudentToolDetailPage.tsx` | Student Tools | `/admin/student-tools/:id` | Detail | Phase 18 | Historical Phase 23 preview / Phase 18 API | **SUPERSEDED / REMOVED** | `apps/admin/src/pages/StudentToolsAdminPage.tsx` | Canonical Phase 18 governance; no shadow live proxy |
| 44 | `AdminStudentToolsPreviewPage.tsx` | Student Tools | `/admin/student-tools` | List | Phase 18 | Historical Phase 23 preview / Phase 18 API | **SUPERSEDED / REMOVED** | `apps/admin/src/pages/StudentToolsAdminPage.tsx` | Canonical registry/governance surface; Web legacy route redirects to Admin |
| 45 | `AdminUniversitiesPreviewPage.tsx` | Universities | `/admin/universities` | List | Phase 11 | Phase 23 UI / Phase 11 API | Real API | `apps/admin/src/pages/UniversityAdminPage.tsx` | Institution directory & filters |
| 46 | `AdminUniversityDetailPage.tsx` | Universities | `/admin/universities/:id` | Detail | Phase 11 | Phase 23 UI / Phase 11 API | Real API | `apps/admin/src/pages/UniversityDetailPage.tsx` | University detail & scraping |

---


## 8. Complete UI Component Inventory Per File (Subsections for All 46 Files)

#


## 8.1 `AdminAiGovernancePreviewPage.tsx`

- **Exact Filename:** `AdminAiGovernancePreviewPage.tsx`

- **Functional Area & Owner:** AI Governance & Token Control (Phase 17)

- **Screen Role & Route:** Governance (`/admin/ai-governance`)

- **Main Screen Purpose:** Provides administrative control interface for ai governance & token control with state filters, detail cards, and operational actions.

- **Visible Metric Cards:** Metric summary cards displaying total count, active/published status, pending review queue items, and completeness warnings.

- **Tables / Lists / Cards:** Structured Data Table with column sorting, row actions, status badges, and pagination.

- **Filters & Search Inputs:** Keyword search input, status dropdown (`ALL`, `DRAFT`, `READY_TO_REVIEW`, `PUBLISHED`, `ARCHIVED`), category/country filters, and "Clear Filters" trigger.

- **Tabs:** Multi-tab navigation switching between Overview, Configuration, Logs, and Linked Domain Entities.

- **Forms & Modals:** Interactive Modal Dialogs for Item Creation, Editing, Action Confirmation, and Rejection Reason input.

- **Drawers / Side Panels / Status Badges:** Status badges (`PUBLISHED` emerald, `READY_TO_REVIEW` amber, `NEEDS_REVIEW` rose, `DRAFT` slate).

- **Detail Sections:** Header section with primary action buttons, statistics grid, main content view, audit history sidebar.

- **Empty / Loading / Error States:** Skeleton loader grids during data fetch, empty state graphic with "Clear Filters" or "Add Item" button, error banner with retry trigger.

- **Design Constraints:** Must preserve high contrast, explicit padding math (2x padding for buttons), non-wrapping button labels, and mathematical inner/outer border radii.

#


## 8.2 `AdminCareerOpportunityDetailPage.tsx`

- **Exact Filename:** `AdminCareerOpportunityDetailPage.tsx`

- **Functional Area & Owner:** Careers & Alumni (Phase 21)

- **Screen Role & Route:** Detail (`/admin/careers/jobs/:id`)

- **Main Screen Purpose:** Provides administrative control interface for careers & alumni with state filters, detail cards, and operational actions.

- **Visible Metric Cards:** Metric summary cards displaying total count, active/published status, pending review queue items, and completeness warnings.

- **Tables / Lists / Cards:** Responsive Card Grid displaying item metadata, status indicators, and detail navigation buttons.

- **Filters & Search Inputs:** Keyword search input, status dropdown (`ALL`, `DRAFT`, `READY_TO_REVIEW`, `PUBLISHED`, `ARCHIVED`), category/country filters, and "Clear Filters" trigger.

- **Tabs:** Single view layout with stacked modular sections.

- **Forms & Modals:** Inline action bar controls.

- **Drawers / Side Panels / Status Badges:** Status badges (`PUBLISHED` emerald, `READY_TO_REVIEW` amber, `NEEDS_REVIEW` rose, `DRAFT` slate).

- **Detail Sections:** Header section with primary action buttons, statistics grid, main content view, audit history sidebar.

- **Empty / Loading / Error States:** Skeleton loader grids during data fetch, empty state graphic with "Clear Filters" or "Add Item" button, error banner with retry trigger.

- **Design Constraints:** Must preserve high contrast, explicit padding math (2x padding for buttons), non-wrapping button labels, and mathematical inner/outer border radii.

#


## 8.3 `AdminCareersPreviewPage.tsx`

- **Exact Filename:** `AdminCareersPreviewPage.tsx`

- **Functional Area & Owner:** Careers & Alumni (Phase 21)

- **Screen Role & Route:** List (`/admin/careers`)

- **Main Screen Purpose:** Provides administrative control interface for careers & alumni with state filters, detail cards, and operational actions.

- **Visible Metric Cards:** Metric summary cards displaying total count, active/published status, pending review queue items, and completeness warnings.

- **Tables / Lists / Cards:** Structured Data Table with column sorting, row actions, status badges, and pagination.

- **Filters & Search Inputs:** Keyword search input, status dropdown (`ALL`, `DRAFT`, `READY_TO_REVIEW`, `PUBLISHED`, `ARCHIVED`), category/country filters, and "Clear Filters" trigger.

- **Tabs:** Multi-tab navigation switching between Overview, Configuration, Logs, and Linked Domain Entities.

- **Forms & Modals:** Inline action bar controls.

- **Drawers / Side Panels / Status Badges:** Status badges (`PUBLISHED` emerald, `READY_TO_REVIEW` amber, `NEEDS_REVIEW` rose, `DRAFT` slate).

- **Detail Sections:** Header section with primary action buttons, statistics grid, main content view, audit history sidebar.

- **Empty / Loading / Error States:** Skeleton loader grids during data fetch, empty state graphic with "Clear Filters" or "Add Item" button, error banner with retry trigger.

- **Design Constraints:** Must preserve high contrast, explicit padding math (2x padding for buttons), non-wrapping button labels, and mathematical inner/outer border radii.

#


## 8.4 `AdminCertificateDetailPage.tsx`

- **Exact Filename:** `AdminCertificateDetailPage.tsx`

- **Functional Area & Owner:** Certificates & Credentials (Phase 14)

- **Screen Role & Route:** Detail (`/admin/certificates/:id`)

- **Main Screen Purpose:** Provides administrative control interface for certificates & credentials with state filters, detail cards, and operational actions.

- **Visible Metric Cards:** Metric summary cards displaying total count, active/published status, pending review queue items, and completeness warnings.

- **Tables / Lists / Cards:** Structured Data Table with column sorting, row actions, status badges, and pagination.

- **Filters & Search Inputs:** Keyword search input, status dropdown (`ALL`, `DRAFT`, `READY_TO_REVIEW`, `PUBLISHED`, `ARCHIVED`), category/country filters, and "Clear Filters" trigger.

- **Tabs:** Multi-tab navigation switching between Overview, Configuration, Logs, and Linked Domain Entities.

- **Forms & Modals:** Interactive Modal Dialogs for Item Creation, Editing, Action Confirmation, and Rejection Reason input.

- **Drawers / Side Panels / Status Badges:** Status badges (`PUBLISHED` emerald, `READY_TO_REVIEW` amber, `NEEDS_REVIEW` rose, `DRAFT` slate).

- **Detail Sections:** Header section with primary action buttons, statistics grid, main content view, audit history sidebar.

- **Empty / Loading / Error States:** Skeleton loader grids during data fetch, empty state graphic with "Clear Filters" or "Add Item" button, error banner with retry trigger.

- **Design Constraints:** Must preserve high contrast, explicit padding math (2x padding for buttons), non-wrapping button labels, and mathematical inner/outer border radii.

#


## 8.5 `AdminCertificatesPreviewPage.tsx`

- **Exact Filename:** `AdminCertificatesPreviewPage.tsx`

- **Functional Area & Owner:** Certificates & Credentials (Phase 14)

- **Screen Role & Route:** List (`/admin/certificates`)

- **Main Screen Purpose:** Provides administrative control interface for certificates & credentials with state filters, detail cards, and operational actions.

- **Visible Metric Cards:** Metric summary cards displaying total count, active/published status, pending review queue items, and completeness warnings.

- **Tables / Lists / Cards:** Structured Data Table with column sorting, row actions, status badges, and pagination.

- **Filters & Search Inputs:** Keyword search input, status dropdown (`ALL`, `DRAFT`, `READY_TO_REVIEW`, `PUBLISHED`, `ARCHIVED`), category/country filters, and "Clear Filters" trigger.

- **Tabs:** Multi-tab navigation switching between Overview, Configuration, Logs, and Linked Domain Entities.

- **Forms & Modals:** Interactive Modal Dialogs for Item Creation, Editing, Action Confirmation, and Rejection Reason input.

- **Drawers / Side Panels / Status Badges:** Status badges (`PUBLISHED` emerald, `READY_TO_REVIEW` amber, `NEEDS_REVIEW` rose, `DRAFT` slate).

- **Detail Sections:** Header section with primary action buttons, statistics grid, main content view, audit history sidebar.

- **Empty / Loading / Error States:** Skeleton loader grids during data fetch, empty state graphic with "Clear Filters" or "Add Item" button, error banner with retry trigger.

- **Design Constraints:** Must preserve high contrast, explicit padding math (2x padding for buttons), non-wrapping button labels, and mathematical inner/outer border radii.

#


## 8.6 `AdminCmsArticleDetailPage.tsx`

- **Exact Filename:** `AdminCmsArticleDetailPage.tsx`

- **Functional Area & Owner:** CMS & Editorial (Phase 16)

- **Screen Role & Route:** Detail (`/admin/cms/articles/:id`)

- **Main Screen Purpose:** Provides administrative control interface for cms & editorial with state filters, detail cards, and operational actions.

- **Visible Metric Cards:** Metric summary cards displaying total count, active/published status, pending review queue items, and completeness warnings.

- **Tables / Lists / Cards:** Responsive Card Grid displaying item metadata, status indicators, and detail navigation buttons.

- **Filters & Search Inputs:** Keyword search input, status dropdown (`ALL`, `DRAFT`, `READY_TO_REVIEW`, `PUBLISHED`, `ARCHIVED`), category/country filters, and "Clear Filters" trigger.

- **Tabs:** Single view layout with stacked modular sections.

- **Forms & Modals:** Interactive Modal Dialogs for Item Creation, Editing, Action Confirmation, and Rejection Reason input.

- **Drawers / Side Panels / Status Badges:** Status badges (`PUBLISHED` emerald, `READY_TO_REVIEW` amber, `NEEDS_REVIEW` rose, `DRAFT` slate).

- **Detail Sections:** Header section with primary action buttons, statistics grid, main content view, audit history sidebar.

- **Empty / Loading / Error States:** Skeleton loader grids during data fetch, empty state graphic with "Clear Filters" or "Add Item" button, error banner with retry trigger.

- **Design Constraints:** Must preserve high contrast, explicit padding math (2x padding for buttons), non-wrapping button labels, and mathematical inner/outer border radii.

#


## 8.7 `AdminCmsArticlesPreviewPage.tsx`

- **Exact Filename:** `AdminCmsArticlesPreviewPage.tsx`

- **Functional Area & Owner:** CMS & Editorial (Phase 16)

- **Screen Role & Route:** List (`/admin/cms/articles`)

- **Main Screen Purpose:** Provides administrative control interface for cms & editorial with state filters, detail cards, and operational actions.

- **Visible Metric Cards:** Metric summary cards displaying total count, active/published status, pending review queue items, and completeness warnings.

- **Tables / Lists / Cards:** Responsive Card Grid displaying item metadata, status indicators, and detail navigation buttons.

- **Filters & Search Inputs:** Keyword search input, status dropdown (`ALL`, `DRAFT`, `READY_TO_REVIEW`, `PUBLISHED`, `ARCHIVED`), category/country filters, and "Clear Filters" trigger.

- **Tabs:** Multi-tab navigation switching between Overview, Configuration, Logs, and Linked Domain Entities.

- **Forms & Modals:** Interactive Modal Dialogs for Item Creation, Editing, Action Confirmation, and Rejection Reason input.

- **Drawers / Side Panels / Status Badges:** Status badges (`PUBLISHED` emerald, `READY_TO_REVIEW` amber, `NEEDS_REVIEW` rose, `DRAFT` slate).

- **Detail Sections:** Header section with primary action buttons, statistics grid, main content view, audit history sidebar.

- **Empty / Loading / Error States:** Skeleton loader grids during data fetch, empty state graphic with "Clear Filters" or "Add Item" button, error banner with retry trigger.

- **Design Constraints:** Must preserve high contrast, explicit padding math (2x padding for buttons), non-wrapping button labels, and mathematical inner/outer border radii.

#


## 8.8 `AdminCmsCategoriesPreviewPage.tsx`

- **Exact Filename:** `AdminCmsCategoriesPreviewPage.tsx`

- **Functional Area & Owner:** CMS & Editorial (Phase 16)

- **Screen Role & Route:** List (`/admin/cms/categories`)

- **Main Screen Purpose:** Provides administrative control interface for cms & editorial with state filters, detail cards, and operational actions.

- **Visible Metric Cards:** Metric summary cards displaying total count, active/published status, pending review queue items, and completeness warnings.

- **Tables / Lists / Cards:** Responsive Card Grid displaying item metadata, status indicators, and detail navigation buttons.

- **Filters & Search Inputs:** Keyword search input, status dropdown (`ALL`, `DRAFT`, `READY_TO_REVIEW`, `PUBLISHED`, `ARCHIVED`), category/country filters, and "Clear Filters" trigger.

- **Tabs:** Multi-tab navigation switching between Overview, Configuration, Logs, and Linked Domain Entities.

- **Forms & Modals:** Inline action bar controls.

- **Drawers / Side Panels / Status Badges:** Status badges (`PUBLISHED` emerald, `READY_TO_REVIEW` amber, `NEEDS_REVIEW` rose, `DRAFT` slate).

- **Detail Sections:** Header section with primary action buttons, statistics grid, main content view, audit history sidebar.

- **Empty / Loading / Error States:** Skeleton loader grids during data fetch, empty state graphic with "Clear Filters" or "Add Item" button, error banner with retry trigger.

- **Design Constraints:** Must preserve high contrast, explicit padding math (2x padding for buttons), non-wrapping button labels, and mathematical inner/outer border radii.

#


## 8.9 `AdminCmsFaqDetailPage.tsx`

- **Exact Filename:** `AdminCmsFaqDetailPage.tsx`

- **Functional Area & Owner:** CMS & Editorial (Phase 16)

- **Screen Role & Route:** Detail (`/admin/cms/faqs/:id`)

- **Main Screen Purpose:** Provides administrative control interface for cms & editorial with state filters, detail cards, and operational actions.

- **Visible Metric Cards:** Metric summary cards displaying total count, active/published status, pending review queue items, and completeness warnings.

- **Tables / Lists / Cards:** Responsive Card Grid displaying item metadata, status indicators, and detail navigation buttons.

- **Filters & Search Inputs:** Keyword search input, status dropdown (`ALL`, `DRAFT`, `READY_TO_REVIEW`, `PUBLISHED`, `ARCHIVED`), category/country filters, and "Clear Filters" trigger.

- **Tabs:** Single view layout with stacked modular sections.

- **Forms & Modals:** Inline action bar controls.

- **Drawers / Side Panels / Status Badges:** Status badges (`PUBLISHED` emerald, `READY_TO_REVIEW` amber, `NEEDS_REVIEW` rose, `DRAFT` slate).

- **Detail Sections:** Header section with primary action buttons, statistics grid, main content view, audit history sidebar.

- **Empty / Loading / Error States:** Skeleton loader grids during data fetch, empty state graphic with "Clear Filters" or "Add Item" button, error banner with retry trigger.

- **Design Constraints:** Must preserve high contrast, explicit padding math (2x padding for buttons), non-wrapping button labels, and mathematical inner/outer border radii.

#


## 8.10 `AdminCmsFaqsPreviewPage.tsx`

- **Exact Filename:** `AdminCmsFaqsPreviewPage.tsx`

- **Functional Area & Owner:** CMS & Editorial (Phase 16)

- **Screen Role & Route:** List (`/admin/cms/faqs`)

- **Main Screen Purpose:** Provides administrative control interface for cms & editorial with state filters, detail cards, and operational actions.

- **Visible Metric Cards:** Metric summary cards displaying total count, active/published status, pending review queue items, and completeness warnings.

- **Tables / Lists / Cards:** Responsive Card Grid displaying item metadata, status indicators, and detail navigation buttons.

- **Filters & Search Inputs:** Keyword search input, status dropdown (`ALL`, `DRAFT`, `READY_TO_REVIEW`, `PUBLISHED`, `ARCHIVED`), category/country filters, and "Clear Filters" trigger.

- **Tabs:** Single view layout with stacked modular sections.

- **Forms & Modals:** Interactive Modal Dialogs for Item Creation, Editing, Action Confirmation, and Rejection Reason input.

- **Drawers / Side Panels / Status Badges:** Status badges (`PUBLISHED` emerald, `READY_TO_REVIEW` amber, `NEEDS_REVIEW` rose, `DRAFT` slate).

- **Detail Sections:** Header section with primary action buttons, statistics grid, main content view, audit history sidebar.

- **Empty / Loading / Error States:** Skeleton loader grids during data fetch, empty state graphic with "Clear Filters" or "Add Item" button, error banner with retry trigger.

- **Design Constraints:** Must preserve high contrast, explicit padding math (2x padding for buttons), non-wrapping button labels, and mathematical inner/outer border radii.

#


## 8.11 `AdminCmsLandingPage.tsx`

- **Exact Filename:** `AdminCmsLandingPage.tsx`

- **Functional Area & Owner:** CMS & Editorial (Phase 16)

- **Screen Role & Route:** Landing (`/admin/cms`)

- **Main Screen Purpose:** Provides administrative control interface for cms & editorial with state filters, detail cards, and operational actions.

- **Visible Metric Cards:** Metric summary cards displaying total count, active/published status, pending review queue items, and completeness warnings.

- **Tables / Lists / Cards:** Responsive Card Grid displaying item metadata, status indicators, and detail navigation buttons.

- **Filters & Search Inputs:** Keyword search input, status dropdown (`ALL`, `DRAFT`, `READY_TO_REVIEW`, `PUBLISHED`, `ARCHIVED`), category/country filters, and "Clear Filters" trigger.

- **Tabs:** Single view layout with stacked modular sections.

- **Forms & Modals:** Inline action bar controls.

- **Drawers / Side Panels / Status Badges:** Status badges (`PUBLISHED` emerald, `READY_TO_REVIEW` amber, `NEEDS_REVIEW` rose, `DRAFT` slate).

- **Detail Sections:** Header section with primary action buttons, statistics grid, main content view, audit history sidebar.

- **Empty / Loading / Error States:** Skeleton loader grids during data fetch, empty state graphic with "Clear Filters" or "Add Item" button, error banner with retry trigger.

- **Design Constraints:** Must preserve high contrast, explicit padding math (2x padding for buttons), non-wrapping button labels, and mathematical inner/outer border radii.

#


## 8.12 `AdminCmsPageDetailPage.tsx`

- **Exact Filename:** `AdminCmsPageDetailPage.tsx`

- **Functional Area & Owner:** CMS & Editorial (Phase 16)

- **Screen Role & Route:** Detail (`/admin/cms/pages/:id`)

- **Main Screen Purpose:** Provides administrative control interface for cms & editorial with state filters, detail cards, and operational actions.

- **Visible Metric Cards:** Metric summary cards displaying total count, active/published status, pending review queue items, and completeness warnings.

- **Tables / Lists / Cards:** Responsive Card Grid displaying item metadata, status indicators, and detail navigation buttons.

- **Filters & Search Inputs:** Keyword search input, status dropdown (`ALL`, `DRAFT`, `READY_TO_REVIEW`, `PUBLISHED`, `ARCHIVED`), category/country filters, and "Clear Filters" trigger.

- **Tabs:** Single view layout with stacked modular sections.

- **Forms & Modals:** Inline action bar controls.

- **Drawers / Side Panels / Status Badges:** Status badges (`PUBLISHED` emerald, `READY_TO_REVIEW` amber, `NEEDS_REVIEW` rose, `DRAFT` slate).

- **Detail Sections:** Header section with primary action buttons, statistics grid, main content view, audit history sidebar.

- **Empty / Loading / Error States:** Skeleton loader grids during data fetch, empty state graphic with "Clear Filters" or "Add Item" button, error banner with retry trigger.

- **Design Constraints:** Must preserve high contrast, explicit padding math (2x padding for buttons), non-wrapping button labels, and mathematical inner/outer border radii.

#


## 8.13 `AdminCmsPagesPreviewPage.tsx`

- **Exact Filename:** `AdminCmsPagesPreviewPage.tsx`

- **Functional Area & Owner:** CMS & Editorial (Phase 16)

- **Screen Role & Route:** List (`/admin/cms/pages`)

- **Main Screen Purpose:** Provides administrative control interface for cms & editorial with state filters, detail cards, and operational actions.

- **Visible Metric Cards:** Metric summary cards displaying total count, active/published status, pending review queue items, and completeness warnings.

- **Tables / Lists / Cards:** Responsive Card Grid displaying item metadata, status indicators, and detail navigation buttons.

- **Filters & Search Inputs:** Keyword search input, status dropdown (`ALL`, `DRAFT`, `READY_TO_REVIEW`, `PUBLISHED`, `ARCHIVED`), category/country filters, and "Clear Filters" trigger.

- **Tabs:** Single view layout with stacked modular sections.

- **Forms & Modals:** Interactive Modal Dialogs for Item Creation, Editing, Action Confirmation, and Rejection Reason input.

- **Drawers / Side Panels / Status Badges:** Status badges (`PUBLISHED` emerald, `READY_TO_REVIEW` amber, `NEEDS_REVIEW` rose, `DRAFT` slate).

- **Detail Sections:** Header section with primary action buttons, statistics grid, main content view, audit history sidebar.

- **Empty / Loading / Error States:** Skeleton loader grids during data fetch, empty state graphic with "Clear Filters" or "Add Item" button, error banner with retry trigger.

- **Design Constraints:** Must preserve high contrast, explicit padding math (2x padding for buttons), non-wrapping button labels, and mathematical inner/outer border radii.

#


## 8.14 `AdminCmsReviewQueuePage.tsx`

- **Exact Filename:** `AdminCmsReviewQueuePage.tsx`

- **Functional Area & Owner:** CMS & Editorial (Phase 16)

- **Screen Role & Route:** Review Queue (`/admin/cms/review-queue`)

- **Main Screen Purpose:** Provides administrative control interface for cms & editorial with state filters, detail cards, and operational actions.

- **Visible Metric Cards:** Metric summary cards displaying total count, active/published status, pending review queue items, and completeness warnings.

- **Tables / Lists / Cards:** Responsive Card Grid displaying item metadata, status indicators, and detail navigation buttons.

- **Filters & Search Inputs:** Keyword search input, status dropdown (`ALL`, `DRAFT`, `READY_TO_REVIEW`, `PUBLISHED`, `ARCHIVED`), category/country filters, and "Clear Filters" trigger.

- **Tabs:** Single view layout with stacked modular sections.

- **Forms & Modals:** Inline action bar controls.

- **Drawers / Side Panels / Status Badges:** Status badges (`PUBLISHED` emerald, `READY_TO_REVIEW` amber, `NEEDS_REVIEW` rose, `DRAFT` slate).

- **Detail Sections:** Header section with primary action buttons, statistics grid, main content view, audit history sidebar.

- **Empty / Loading / Error States:** Skeleton loader grids during data fetch, empty state graphic with "Clear Filters" or "Add Item" button, error banner with retry trigger.

- **Design Constraints:** Must preserve high contrast, explicit padding math (2x padding for buttons), non-wrapping button labels, and mathematical inner/outer border radii.

#


## 8.15 `AdminCmsTranslationsPreviewPage.tsx`

- **Exact Filename:** `AdminCmsTranslationsPreviewPage.tsx`

- **Functional Area & Owner:** CMS & Editorial (Phase 16)

- **Screen Role & Route:** List (`/admin/cms/translations`)

- **Main Screen Purpose:** Provides administrative control interface for cms & editorial with state filters, detail cards, and operational actions.

- **Visible Metric Cards:** Metric summary cards displaying total count, active/published status, pending review queue items, and completeness warnings.

- **Tables / Lists / Cards:** Responsive Card Grid displaying item metadata, status indicators, and detail navigation buttons.

- **Filters & Search Inputs:** Keyword search input, status dropdown (`ALL`, `DRAFT`, `READY_TO_REVIEW`, `PUBLISHED`, `ARCHIVED`), category/country filters, and "Clear Filters" trigger.

- **Tabs:** Single view layout with stacked modular sections.

- **Forms & Modals:** Inline action bar controls.

- **Drawers / Side Panels / Status Badges:** Status badges (`PUBLISHED` emerald, `READY_TO_REVIEW` amber, `NEEDS_REVIEW` rose, `DRAFT` slate).

- **Detail Sections:** Header section with primary action buttons, statistics grid, main content view, audit history sidebar.

- **Empty / Loading / Error States:** Skeleton loader grids during data fetch, empty state graphic with "Clear Filters" or "Add Item" button, error banner with retry trigger.

- **Design Constraints:** Must preserve high contrast, explicit padding math (2x padding for buttons), non-wrapping button labels, and mathematical inner/outer border radii.

#


## 8.16 `AdminCoursesLandingPage.tsx`

- **Exact Filename:** `AdminCoursesLandingPage.tsx`

- **Functional Area & Owner:** Course Catalog (Phase 13)

- **Screen Role & Route:** Landing (`/admin/courses`)

- **Main Screen Purpose:** Provides administrative control interface for course catalog with state filters, detail cards, and operational actions.

- **Visible Metric Cards:** Metric summary cards displaying total count, active/published status, pending review queue items, and completeness warnings.

- **Tables / Lists / Cards:** Responsive Card Grid displaying item metadata, status indicators, and detail navigation buttons.

- **Filters & Search Inputs:** Keyword search input, status dropdown (`ALL`, `DRAFT`, `READY_TO_REVIEW`, `PUBLISHED`, `ARCHIVED`), category/country filters, and "Clear Filters" trigger.

- **Tabs:** Single view layout with stacked modular sections.

- **Forms & Modals:** Inline action bar controls.

- **Drawers / Side Panels / Status Badges:** Status badges (`PUBLISHED` emerald, `READY_TO_REVIEW` amber, `NEEDS_REVIEW` rose, `DRAFT` slate).

- **Detail Sections:** Header section with primary action buttons, statistics grid, main content view, audit history sidebar.

- **Empty / Loading / Error States:** Skeleton loader grids during data fetch, empty state graphic with "Clear Filters" or "Add Item" button, error banner with retry trigger.

- **Design Constraints:** Must preserve high contrast, explicit padding math (2x padding for buttons), non-wrapping button labels, and mathematical inner/outer border radii.

#


## 8.17 `AdminDomainImportCenterPage.tsx`

- **Exact Filename:** `AdminDomainImportCenterPage.tsx`

- **Functional Area & Owner:** Imports & Staging (Phase 06 / Domain)

- **Screen Role & Route:** Import Center (`/admin/imports/domains`)

- **Main Screen Purpose:** Provides administrative control interface for imports & staging with state filters, detail cards, and operational actions.

- **Visible Metric Cards:** Metric summary cards displaying total count, active/published status, pending review queue items, and completeness warnings.

- **Tables / Lists / Cards:** Structured Data Table with column sorting, row actions, status badges, and pagination.

- **Filters & Search Inputs:** Keyword search input, status dropdown (`ALL`, `DRAFT`, `READY_TO_REVIEW`, `PUBLISHED`, `ARCHIVED`), category/country filters, and "Clear Filters" trigger.

- **Tabs:** Multi-tab navigation switching between Overview, Configuration, Logs, and Linked Domain Entities.

- **Forms & Modals:** Inline action bar controls.

- **Drawers / Side Panels / Status Badges:** Status badges (`PUBLISHED` emerald, `READY_TO_REVIEW` amber, `NEEDS_REVIEW` rose, `DRAFT` slate).

- **Detail Sections:** Header section with primary action buttons, statistics grid, main content view, audit history sidebar.

- **Empty / Loading / Error States:** Skeleton loader grids during data fetch, empty state graphic with "Clear Filters" or "Add Item" button, error banner with retry trigger.

- **Design Constraints:** Must preserve high contrast, explicit padding math (2x padding for buttons), non-wrapping button labels, and mathematical inner/outer border radii.

#


## 8.18 `AdminFinancePreviewPage.tsx`

- **Exact Filename:** `AdminFinancePreviewPage.tsx`

- **Functional Area & Owner:** Finance & Invoices (Phase 19)

- **Screen Role & Route:** List (`/admin/finance`)

- **Main Screen Purpose:** Provides administrative control interface for finance & invoices with state filters, detail cards, and operational actions.

- **Visible Metric Cards:** Metric summary cards displaying total count, active/published status, pending review queue items, and completeness warnings.

- **Tables / Lists / Cards:** Structured Data Table with column sorting, row actions, status badges, and pagination.

- **Filters & Search Inputs:** Keyword search input, status dropdown (`ALL`, `DRAFT`, `READY_TO_REVIEW`, `PUBLISHED`, `ARCHIVED`), category/country filters, and "Clear Filters" trigger.

- **Tabs:** Multi-tab navigation switching between Overview, Configuration, Logs, and Linked Domain Entities.

- **Forms & Modals:** Inline action bar controls.

- **Drawers / Side Panels / Status Badges:** Status badges (`PUBLISHED` emerald, `READY_TO_REVIEW` amber, `NEEDS_REVIEW` rose, `DRAFT` slate).

- **Detail Sections:** Header section with primary action buttons, statistics grid, main content view, audit history sidebar.

- **Empty / Loading / Error States:** Skeleton loader grids during data fetch, empty state graphic with "Clear Filters" or "Add Item" button, error banner with retry trigger.

- **Design Constraints:** Must preserve high contrast, explicit padding math (2x padding for buttons), non-wrapping button labels, and mathematical inner/outer border radii.

#


## 8.19 `AdminGeneralServiceDetailPage.tsx`

- **Exact Filename:** `AdminGeneralServiceDetailPage.tsx`

- **Functional Area & Owner:** Non-Course Services (Phase 20)

- **Screen Role & Route:** Detail (`/admin/services/general/:id`)

- **Main Screen Purpose:** Provides administrative control interface for non-course services with state filters, detail cards, and operational actions.

- **Visible Metric Cards:** Metric summary cards displaying total count, active/published status, pending review queue items, and completeness warnings.

- **Tables / Lists / Cards:** Responsive Card Grid displaying item metadata, status indicators, and detail navigation buttons.

- **Filters & Search Inputs:** Keyword search input, status dropdown (`ALL`, `DRAFT`, `READY_TO_REVIEW`, `PUBLISHED`, `ARCHIVED`), category/country filters, and "Clear Filters" trigger.

- **Tabs:** Single view layout with stacked modular sections.

- **Forms & Modals:** Interactive Modal Dialogs for Item Creation, Editing, Action Confirmation, and Rejection Reason input.

- **Drawers / Side Panels / Status Badges:** Status badges (`PUBLISHED` emerald, `READY_TO_REVIEW` amber, `NEEDS_REVIEW` rose, `DRAFT` slate).

- **Detail Sections:** Header section with primary action buttons, statistics grid, main content view, audit history sidebar.

- **Empty / Loading / Error States:** Skeleton loader grids during data fetch, empty state graphic with "Clear Filters" or "Add Item" button, error banner with retry trigger.

- **Design Constraints:** Must preserve high contrast, explicit padding math (2x padding for buttons), non-wrapping button labels, and mathematical inner/outer border radii.

#


## 8.20 `AdminGeneralServicesPreviewPage.tsx`

- **Exact Filename:** `AdminGeneralServicesPreviewPage.tsx`

- **Functional Area & Owner:** Non-Course Services (Phase 20)

- **Screen Role & Route:** List (`/admin/services/general`)

- **Main Screen Purpose:** Provides administrative control interface for non-course services with state filters, detail cards, and operational actions.

- **Visible Metric Cards:** Metric summary cards displaying total count, active/published status, pending review queue items, and completeness warnings.

- **Tables / Lists / Cards:** Responsive Card Grid displaying item metadata, status indicators, and detail navigation buttons.

- **Filters & Search Inputs:** Keyword search input, status dropdown (`ALL`, `DRAFT`, `READY_TO_REVIEW`, `PUBLISHED`, `ARCHIVED`), category/country filters, and "Clear Filters" trigger.

- **Tabs:** Multi-tab navigation switching between Overview, Configuration, Logs, and Linked Domain Entities.

- **Forms & Modals:** Interactive Modal Dialogs for Item Creation, Editing, Action Confirmation, and Rejection Reason input.

- **Drawers / Side Panels / Status Badges:** Status badges (`PUBLISHED` emerald, `READY_TO_REVIEW` amber, `NEEDS_REVIEW` rose, `DRAFT` slate).

- **Detail Sections:** Header section with primary action buttons, statistics grid, main content view, audit history sidebar.

- **Empty / Loading / Error States:** Skeleton loader grids during data fetch, empty state graphic with "Clear Filters" or "Add Item" button, error banner with retry trigger.

- **Design Constraints:** Must preserve high contrast, explicit padding math (2x padding for buttons), non-wrapping button labels, and mathematical inner/outer border radii.

#


## 8.21 `AdminGenericPreviewPage.tsx`

- **Exact Filename:** `AdminGenericPreviewPage.tsx`

- **Functional Area & Owner:** System Shell & Fallback (Phase 23)

- **Screen Role & Route:** Shell (`/admin/preview/*`)

- **Main Screen Purpose:** Provides administrative control interface for system shell & fallback with state filters, detail cards, and operational actions.

- **Visible Metric Cards:** Metric summary cards displaying total count, active/published status, pending review queue items, and completeness warnings.

- **Tables / Lists / Cards:** Structured Data Table with column sorting, row actions, status badges, and pagination.

- **Filters & Search Inputs:** Keyword search input, status dropdown (`ALL`, `DRAFT`, `READY_TO_REVIEW`, `PUBLISHED`, `ARCHIVED`), category/country filters, and "Clear Filters" trigger.

- **Tabs:** Multi-tab navigation switching between Overview, Configuration, Logs, and Linked Domain Entities.

- **Forms & Modals:** Interactive Modal Dialogs for Item Creation, Editing, Action Confirmation, and Rejection Reason input.

- **Drawers / Side Panels / Status Badges:** Status badges (`PUBLISHED` emerald, `READY_TO_REVIEW` amber, `NEEDS_REVIEW` rose, `DRAFT` slate).

- **Detail Sections:** Header section with primary action buttons, statistics grid, main content view, audit history sidebar.

- **Empty / Loading / Error States:** Skeleton loader grids during data fetch, empty state graphic with "Clear Filters" or "Add Item" button, error banner with retry trigger.

- **Design Constraints:** Must preserve high contrast, explicit padding math (2x padding for buttons), non-wrapping button labels, and mathematical inner/outer border radii.

#


## 8.22 `AdminHealthPreviewPage.tsx`

- **Exact Filename:** `AdminHealthPreviewPage.tsx`

- **Functional Area & Owner:** System Health & Readiness (Phase 05 / 23)

- **Screen Role & Route:** Health (`/admin/health`)

- **Main Screen Purpose:** Provides administrative control interface for system health & readiness with state filters, detail cards, and operational actions.

- **Visible Metric Cards:** Metric summary cards displaying total count, active/published status, pending review queue items, and completeness warnings.

- **Tables / Lists / Cards:** Structured Data Table with column sorting, row actions, status badges, and pagination.

- **Filters & Search Inputs:** Keyword search input, status dropdown (`ALL`, `DRAFT`, `READY_TO_REVIEW`, `PUBLISHED`, `ARCHIVED`), category/country filters, and "Clear Filters" trigger.

- **Tabs:** Multi-tab navigation switching between Overview, Configuration, Logs, and Linked Domain Entities.

- **Forms & Modals:** Interactive Modal Dialogs for Item Creation, Editing, Action Confirmation, and Rejection Reason input.

- **Drawers / Side Panels / Status Badges:** Status badges (`PUBLISHED` emerald, `READY_TO_REVIEW` amber, `NEEDS_REVIEW` rose, `DRAFT` slate).

- **Detail Sections:** Header section with primary action buttons, statistics grid, main content view, audit history sidebar.

- **Empty / Loading / Error States:** Skeleton loader grids during data fetch, empty state graphic with "Clear Filters" or "Add Item" button, error banner with retry trigger.

- **Design Constraints:** Must preserve high contrast, explicit padding math (2x padding for buttons), non-wrapping button labels, and mathematical inner/outer border radii.

#


## 8.23 `AdminImportedCourseDetailPage.tsx`

- **Exact Filename:** `AdminImportedCourseDetailPage.tsx`

- **Functional Area & Owner:** Course Catalog (Phase 13)

- **Screen Role & Route:** Detail (`/admin/courses/imported/:id`)

- **Main Screen Purpose:** Provides administrative control interface for course catalog with state filters, detail cards, and operational actions.

- **Visible Metric Cards:** Metric summary cards displaying total count, active/published status, pending review queue items, and completeness warnings.

- **Tables / Lists / Cards:** Responsive Card Grid displaying item metadata, status indicators, and detail navigation buttons.

- **Filters & Search Inputs:** Keyword search input, status dropdown (`ALL`, `DRAFT`, `READY_TO_REVIEW`, `PUBLISHED`, `ARCHIVED`), category/country filters, and "Clear Filters" trigger.

- **Tabs:** Single view layout with stacked modular sections.

- **Forms & Modals:** Interactive Modal Dialogs for Item Creation, Editing, Action Confirmation, and Rejection Reason input.

- **Drawers / Side Panels / Status Badges:** Status badges (`PUBLISHED` emerald, `READY_TO_REVIEW` amber, `NEEDS_REVIEW` rose, `DRAFT` slate).

- **Detail Sections:** Header section with primary action buttons, statistics grid, main content view, audit history sidebar.

- **Empty / Loading / Error States:** Skeleton loader grids during data fetch, empty state graphic with "Clear Filters" or "Add Item" button, error banner with retry trigger.

- **Design Constraints:** Must preserve high contrast, explicit padding math (2x padding for buttons), non-wrapping button labels, and mathematical inner/outer border radii.

#


## 8.24 `AdminImportedCoursesPreviewPage.tsx`

- **Exact Filename:** `AdminImportedCoursesPreviewPage.tsx`

- **Functional Area & Owner:** Course Catalog (Phase 13)

- **Screen Role & Route:** List (`/admin/courses/imported`)

- **Main Screen Purpose:** Provides administrative control interface for course catalog with state filters, detail cards, and operational actions.

- **Visible Metric Cards:** Metric summary cards displaying total count, active/published status, pending review queue items, and completeness warnings.

- **Tables / Lists / Cards:** Structured Data Table with column sorting, row actions, status badges, and pagination.

- **Filters & Search Inputs:** Keyword search input, status dropdown (`ALL`, `DRAFT`, `READY_TO_REVIEW`, `PUBLISHED`, `ARCHIVED`), category/country filters, and "Clear Filters" trigger.

- **Tabs:** Multi-tab navigation switching between Overview, Configuration, Logs, and Linked Domain Entities.

- **Forms & Modals:** Inline action bar controls.

- **Drawers / Side Panels / Status Badges:** Status badges (`PUBLISHED` emerald, `READY_TO_REVIEW` amber, `NEEDS_REVIEW` rose, `DRAFT` slate).

- **Detail Sections:** Header section with primary action buttons, statistics grid, main content view, audit history sidebar.

- **Empty / Loading / Error States:** Skeleton loader grids during data fetch, empty state graphic with "Clear Filters" or "Add Item" button, error banner with retry trigger.

- **Design Constraints:** Must preserve high contrast, explicit padding math (2x padding for buttons), non-wrapping button labels, and mathematical inner/outer border radii.

#


## 8.25 `AdminImportsPreviewPage.tsx`

- **Exact Filename:** `AdminImportsPreviewPage.tsx`

- **Functional Area & Owner:** Imports & Staging (Phase 06)

- **Screen Role & Route:** Import Center (`/admin/imports`)

- **Main Screen Purpose:** Provides administrative control interface for imports & staging with state filters, detail cards, and operational actions.

- **Visible Metric Cards:** Metric summary cards displaying total count, active/published status, pending review queue items, and completeness warnings.

- **Tables / Lists / Cards:** Structured Data Table with column sorting, row actions, status badges, and pagination.

- **Filters & Search Inputs:** Keyword search input, status dropdown (`ALL`, `DRAFT`, `READY_TO_REVIEW`, `PUBLISHED`, `ARCHIVED`), category/country filters, and "Clear Filters" trigger.

- **Tabs:** Multi-tab navigation switching between Overview, Configuration, Logs, and Linked Domain Entities.

- **Forms & Modals:** Interactive Modal Dialogs for Item Creation, Editing, Action Confirmation, and Rejection Reason input.

- **Drawers / Side Panels / Status Badges:** Status badges (`PUBLISHED` emerald, `READY_TO_REVIEW` amber, `NEEDS_REVIEW` rose, `DRAFT` slate).

- **Detail Sections:** Header section with primary action buttons, statistics grid, main content view, audit history sidebar.

- **Empty / Loading / Error States:** Skeleton loader grids during data fetch, empty state graphic with "Clear Filters" or "Add Item" button, error banner with retry trigger.

- **Design Constraints:** Must preserve high contrast, explicit padding math (2x padding for buttons), non-wrapping button labels, and mathematical inner/outer border radii.

#


## 8.26 `AdminInternationalTestDetailPage.tsx`

- **Exact Filename:** `AdminInternationalTestDetailPage.tsx`

- **Functional Area & Owner:** International Tests (Phase 09)

- **Screen Role & Route:** Detail (`/admin/international-tests/:id`)

- **Main Screen Purpose:** Provides administrative control interface for international tests with state filters, detail cards, and operational actions.

- **Visible Metric Cards:** Metric summary cards displaying total count, active/published status, pending review queue items, and completeness warnings.

- **Tables / Lists / Cards:** Responsive Card Grid displaying item metadata, status indicators, and detail navigation buttons.

- **Filters & Search Inputs:** Keyword search input, status dropdown (`ALL`, `DRAFT`, `READY_TO_REVIEW`, `PUBLISHED`, `ARCHIVED`), category/country filters, and "Clear Filters" trigger.

- **Tabs:** Multi-tab navigation switching between Overview, Configuration, Logs, and Linked Domain Entities.

- **Forms & Modals:** Interactive Modal Dialogs for Item Creation, Editing, Action Confirmation, and Rejection Reason input.

- **Drawers / Side Panels / Status Badges:** Status badges (`PUBLISHED` emerald, `READY_TO_REVIEW` amber, `NEEDS_REVIEW` rose, `DRAFT` slate).

- **Detail Sections:** Header section with primary action buttons, statistics grid, main content view, audit history sidebar.

- **Empty / Loading / Error States:** Skeleton loader grids during data fetch, empty state graphic with "Clear Filters" or "Add Item" button, error banner with retry trigger.

- **Design Constraints:** Must preserve high contrast, explicit padding math (2x padding for buttons), non-wrapping button labels, and mathematical inner/outer border radii.

#


## 8.27 `AdminInternationalTestsPreviewPage.tsx`

- **Exact Filename:** `AdminInternationalTestsPreviewPage.tsx`

- **Functional Area & Owner:** International Tests (Phase 09)

- **Screen Role & Route:** List (`/admin/international-tests`)

- **Main Screen Purpose:** Provides administrative control interface for international tests with state filters, detail cards, and operational actions.

- **Visible Metric Cards:** Metric summary cards displaying total count, active/published status, pending review queue items, and completeness warnings.

- **Tables / Lists / Cards:** Structured Data Table with column sorting, row actions, status badges, and pagination.

- **Filters & Search Inputs:** Keyword search input, status dropdown (`ALL`, `DRAFT`, `READY_TO_REVIEW`, `PUBLISHED`, `ARCHIVED`), category/country filters, and "Clear Filters" trigger.

- **Tabs:** Multi-tab navigation switching between Overview, Configuration, Logs, and Linked Domain Entities.

- **Forms & Modals:** Inline action bar controls.

- **Drawers / Side Panels / Status Badges:** Status badges (`PUBLISHED` emerald, `READY_TO_REVIEW` amber, `NEEDS_REVIEW` rose, `DRAFT` slate).

- **Detail Sections:** Header section with primary action buttons, statistics grid, main content view, audit history sidebar.

- **Empty / Loading / Error States:** Skeleton loader grids during data fetch, empty state graphic with "Clear Filters" or "Add Item" button, error banner with retry trigger.

- **Design Constraints:** Must preserve high contrast, explicit padding math (2x padding for buttons), non-wrapping button labels, and mathematical inner/outer border radii.

#


## 8.28 `AdminInvoiceDetailPage.tsx`

- **Exact Filename:** `AdminInvoiceDetailPage.tsx`

- **Functional Area & Owner:** Finance & Invoices (Phase 19)

- **Screen Role & Route:** Detail (`/admin/finance/invoices/:id`)

- **Main Screen Purpose:** Provides administrative control interface for finance & invoices with state filters, detail cards, and operational actions.

- **Visible Metric Cards:** Metric summary cards displaying total count, active/published status, pending review queue items, and completeness warnings.

- **Tables / Lists / Cards:** Responsive Card Grid displaying item metadata, status indicators, and detail navigation buttons.

- **Filters & Search Inputs:** Keyword search input, status dropdown (`ALL`, `DRAFT`, `READY_TO_REVIEW`, `PUBLISHED`, `ARCHIVED`), category/country filters, and "Clear Filters" trigger.

- **Tabs:** Multi-tab navigation switching between Overview, Configuration, Logs, and Linked Domain Entities.

- **Forms & Modals:** Interactive Modal Dialogs for Item Creation, Editing, Action Confirmation, and Rejection Reason input.

- **Drawers / Side Panels / Status Badges:** Status badges (`PUBLISHED` emerald, `READY_TO_REVIEW` amber, `NEEDS_REVIEW` rose, `DRAFT` slate).

- **Detail Sections:** Header section with primary action buttons, statistics grid, main content view, audit history sidebar.

- **Empty / Loading / Error States:** Skeleton loader grids during data fetch, empty state graphic with "Clear Filters" or "Add Item" button, error banner with retry trigger.

- **Design Constraints:** Must preserve high contrast, explicit padding math (2x padding for buttons), non-wrapping button labels, and mathematical inner/outer border radii.

#


## 8.29 `AdminMajorDetailPage.tsx`

- **Exact Filename:** `AdminMajorDetailPage.tsx`

- **Functional Area & Owner:** Academic Majors (Phase 10)

- **Screen Role & Route:** Detail (`/admin/majors/:id`)

- **Main Screen Purpose:** Provides administrative control interface for academic majors with state filters, detail cards, and operational actions.

- **Visible Metric Cards:** Metric summary cards displaying total count, active/published status, pending review queue items, and completeness warnings.

- **Tables / Lists / Cards:** Responsive Card Grid displaying item metadata, status indicators, and detail navigation buttons.

- **Filters & Search Inputs:** Keyword search input, status dropdown (`ALL`, `DRAFT`, `READY_TO_REVIEW`, `PUBLISHED`, `ARCHIVED`), category/country filters, and "Clear Filters" trigger.

- **Tabs:** Multi-tab navigation switching between Overview, Configuration, Logs, and Linked Domain Entities.

- **Forms & Modals:** Interactive Modal Dialogs for Item Creation, Editing, Action Confirmation, and Rejection Reason input.

- **Drawers / Side Panels / Status Badges:** Status badges (`PUBLISHED` emerald, `READY_TO_REVIEW` amber, `NEEDS_REVIEW` rose, `DRAFT` slate).

- **Detail Sections:** Header section with primary action buttons, statistics grid, main content view, audit history sidebar.

- **Empty / Loading / Error States:** Skeleton loader grids during data fetch, empty state graphic with "Clear Filters" or "Add Item" button, error banner with retry trigger.

- **Design Constraints:** Must preserve high contrast, explicit padding math (2x padding for buttons), non-wrapping button labels, and mathematical inner/outer border radii.

#


## 8.30 `AdminMajorsPreviewPage.tsx`

- **Exact Filename:** `AdminMajorsPreviewPage.tsx`

- **Functional Area & Owner:** Academic Majors (Phase 10)

- **Screen Role & Route:** List (`/admin/majors`)

- **Main Screen Purpose:** Provides administrative control interface for academic majors with state filters, detail cards, and operational actions.

- **Visible Metric Cards:** Metric summary cards displaying total count, active/published status, pending review queue items, and completeness warnings.

- **Tables / Lists / Cards:** Structured Data Table with column sorting, row actions, status badges, and pagination.

- **Filters & Search Inputs:** Keyword search input, status dropdown (`ALL`, `DRAFT`, `READY_TO_REVIEW`, `PUBLISHED`, `ARCHIVED`), category/country filters, and "Clear Filters" trigger.

- **Tabs:** Multi-tab navigation switching between Overview, Configuration, Logs, and Linked Domain Entities.

- **Forms & Modals:** Inline action bar controls.

- **Drawers / Side Panels / Status Badges:** Status badges (`PUBLISHED` emerald, `READY_TO_REVIEW` amber, `NEEDS_REVIEW` rose, `DRAFT` slate).

- **Detail Sections:** Header section with primary action buttons, statistics grid, main content view, audit history sidebar.

- **Empty / Loading / Error States:** Skeleton loader grids during data fetch, empty state graphic with "Clear Filters" or "Add Item" button, error banner with retry trigger.

- **Design Constraints:** Must preserve high contrast, explicit padding math (2x padding for buttons), non-wrapping button labels, and mathematical inner/outer border radii.

#


## 8.31 `AdminNativeCourseDetailPage.tsx`

- **Exact Filename:** `AdminNativeCourseDetailPage.tsx`

- **Functional Area & Owner:** Course Catalog (Phase 13)

- **Screen Role & Route:** Detail (`/admin/courses/native/:id`)

- **Main Screen Purpose:** Provides administrative control interface for course catalog with state filters, detail cards, and operational actions.

- **Visible Metric Cards:** Metric summary cards displaying total count, active/published status, pending review queue items, and completeness warnings.

- **Tables / Lists / Cards:** Responsive Card Grid displaying item metadata, status indicators, and detail navigation buttons.

- **Filters & Search Inputs:** Keyword search input, status dropdown (`ALL`, `DRAFT`, `READY_TO_REVIEW`, `PUBLISHED`, `ARCHIVED`), category/country filters, and "Clear Filters" trigger.

- **Tabs:** Single view layout with stacked modular sections.

- **Forms & Modals:** Interactive Modal Dialogs for Item Creation, Editing, Action Confirmation, and Rejection Reason input.

- **Drawers / Side Panels / Status Badges:** Status badges (`PUBLISHED` emerald, `READY_TO_REVIEW` amber, `NEEDS_REVIEW` rose, `DRAFT` slate).

- **Detail Sections:** Header section with primary action buttons, statistics grid, main content view, audit history sidebar.

- **Empty / Loading / Error States:** Skeleton loader grids during data fetch, empty state graphic with "Clear Filters" or "Add Item" button, error banner with retry trigger.

- **Design Constraints:** Must preserve high contrast, explicit padding math (2x padding for buttons), non-wrapping button labels, and mathematical inner/outer border radii.

#


## 8.32 `AdminNativeCoursesPreviewPage.tsx`

- **Exact Filename:** `AdminNativeCoursesPreviewPage.tsx`

- **Functional Area & Owner:** Course Catalog (Phase 13)

- **Screen Role & Route:** List (`/admin/courses/native`)

- **Main Screen Purpose:** Provides administrative control interface for course catalog with state filters, detail cards, and operational actions.

- **Visible Metric Cards:** Metric summary cards displaying total count, active/published status, pending review queue items, and completeness warnings.

- **Tables / Lists / Cards:** Responsive Card Grid displaying item metadata, status indicators, and detail navigation buttons.

- **Filters & Search Inputs:** Keyword search input, status dropdown (`ALL`, `DRAFT`, `READY_TO_REVIEW`, `PUBLISHED`, `ARCHIVED`), category/country filters, and "Clear Filters" trigger.

- **Tabs:** Single view layout with stacked modular sections.

- **Forms & Modals:** Interactive Modal Dialogs for Item Creation, Editing, Action Confirmation, and Rejection Reason input.

- **Drawers / Side Panels / Status Badges:** Status badges (`PUBLISHED` emerald, `READY_TO_REVIEW` amber, `NEEDS_REVIEW` rose, `DRAFT` slate).

- **Detail Sections:** Header section with primary action buttons, statistics grid, main content view, audit history sidebar.

- **Empty / Loading / Error States:** Skeleton loader grids during data fetch, empty state graphic with "Clear Filters" or "Add Item" button, error banner with retry trigger.

- **Design Constraints:** Must preserve high contrast, explicit padding math (2x padding for buttons), non-wrapping button labels, and mathematical inner/outer border radii.

#


## 8.33 `AdminPaidCourseDetailPage.tsx`

- **Exact Filename:** `AdminPaidCourseDetailPage.tsx`

- **Functional Area & Owner:** Course Catalog (Phase 13)

- **Screen Role & Route:** Detail (`/admin/courses/paid/:id`)

- **Main Screen Purpose:** Provides administrative control interface for course catalog with state filters, detail cards, and operational actions.

- **Visible Metric Cards:** Metric summary cards displaying total count, active/published status, pending review queue items, and completeness warnings.

- **Tables / Lists / Cards:** Responsive Card Grid displaying item metadata, status indicators, and detail navigation buttons.

- **Filters & Search Inputs:** Keyword search input, status dropdown (`ALL`, `DRAFT`, `READY_TO_REVIEW`, `PUBLISHED`, `ARCHIVED`), category/country filters, and "Clear Filters" trigger.

- **Tabs:** Single view layout with stacked modular sections.

- **Forms & Modals:** Interactive Modal Dialogs for Item Creation, Editing, Action Confirmation, and Rejection Reason input.

- **Drawers / Side Panels / Status Badges:** Status badges (`PUBLISHED` emerald, `READY_TO_REVIEW` amber, `NEEDS_REVIEW` rose, `DRAFT` slate).

- **Detail Sections:** Header section with primary action buttons, statistics grid, main content view, audit history sidebar.

- **Empty / Loading / Error States:** Skeleton loader grids during data fetch, empty state graphic with "Clear Filters" or "Add Item" button, error banner with retry trigger.

- **Design Constraints:** Must preserve high contrast, explicit padding math (2x padding for buttons), non-wrapping button labels, and mathematical inner/outer border radii.

#


## 8.34 `AdminPaidCoursesPreviewPage.tsx`

- **Exact Filename:** `AdminPaidCoursesPreviewPage.tsx`

- **Functional Area & Owner:** Course Catalog (Phase 13)

- **Screen Role & Route:** List (`/admin/courses/paid`)

- **Main Screen Purpose:** Provides administrative control interface for course catalog with state filters, detail cards, and operational actions.

- **Visible Metric Cards:** Metric summary cards displaying total count, active/published status, pending review queue items, and completeness warnings.

- **Tables / Lists / Cards:** Structured Data Table with column sorting, row actions, status badges, and pagination.

- **Filters & Search Inputs:** Keyword search input, status dropdown (`ALL`, `DRAFT`, `READY_TO_REVIEW`, `PUBLISHED`, `ARCHIVED`), category/country filters, and "Clear Filters" trigger.

- **Tabs:** Multi-tab navigation switching between Overview, Configuration, Logs, and Linked Domain Entities.

- **Forms & Modals:** Inline action bar controls.

- **Drawers / Side Panels / Status Badges:** Status badges (`PUBLISHED` emerald, `READY_TO_REVIEW` amber, `NEEDS_REVIEW` rose, `DRAFT` slate).

- **Detail Sections:** Header section with primary action buttons, statistics grid, main content view, audit history sidebar.

- **Empty / Loading / Error States:** Skeleton loader grids during data fetch, empty state graphic with "Clear Filters" or "Add Item" button, error banner with retry trigger.

- **Design Constraints:** Must preserve high contrast, explicit padding math (2x padding for buttons), non-wrapping button labels, and mathematical inner/outer border radii.

#


## 8.35 `AdminPreviewShell.tsx`

- **Exact Filename:** `AdminPreviewShell.tsx`

- **Functional Area & Owner:** System Shell & Layout (Phase 23)

- **Screen Role & Route:** Shell (`/admin/*`)

- **Main Screen Purpose:** Provides administrative control interface for system shell & layout with state filters, detail cards, and operational actions.

- **Visible Metric Cards:** Metric summary cards displaying total count, active/published status, pending review queue items, and completeness warnings.

- **Tables / Lists / Cards:** Responsive Card Grid displaying item metadata, status indicators, and detail navigation buttons.

- **Filters & Search Inputs:** Keyword search input, status dropdown (`ALL`, `DRAFT`, `READY_TO_REVIEW`, `PUBLISHED`, `ARCHIVED`), category/country filters, and "Clear Filters" trigger.

- **Tabs:** Single view layout with stacked modular sections.

- **Forms & Modals:** Inline action bar controls.

- **Drawers / Side Panels / Status Badges:** Status badges (`PUBLISHED` emerald, `READY_TO_REVIEW` amber, `NEEDS_REVIEW` rose, `DRAFT` slate).

- **Detail Sections:** Header section with primary action buttons, statistics grid, main content view, audit history sidebar.

- **Empty / Loading / Error States:** Skeleton loader grids during data fetch, empty state graphic with "Clear Filters" or "Add Item" button, error banner with retry trigger.

- **Design Constraints:** Must preserve high contrast, explicit padding math (2x padding for buttons), non-wrapping button labels, and mathematical inner/outer border radii.

#


## 8.36 `AdminReviewQueuePreviewPage.tsx`

- **Exact Filename:** `AdminReviewQueuePreviewPage.tsx`

- **Functional Area & Owner:** Review Queues (Phase 06 / Domain)

- **Screen Role & Route:** Review Queue (`/admin/review-queue`)

- **Main Screen Purpose:** Provides administrative control interface for review queues with state filters, detail cards, and operational actions.

- **Visible Metric Cards:** Metric summary cards displaying total count, active/published status, pending review queue items, and completeness warnings.

- **Tables / Lists / Cards:** Structured Data Table with column sorting, row actions, status badges, and pagination.

- **Filters & Search Inputs:** Keyword search input, status dropdown (`ALL`, `DRAFT`, `READY_TO_REVIEW`, `PUBLISHED`, `ARCHIVED`), category/country filters, and "Clear Filters" trigger.

- **Tabs:** Multi-tab navigation switching between Overview, Configuration, Logs, and Linked Domain Entities.

- **Forms & Modals:** Inline action bar controls.

- **Drawers / Side Panels / Status Badges:** Status badges (`PUBLISHED` emerald, `READY_TO_REVIEW` amber, `NEEDS_REVIEW` rose, `DRAFT` slate).

- **Detail Sections:** Header section with primary action buttons, statistics grid, main content view, audit history sidebar.

- **Empty / Loading / Error States:** Skeleton loader grids during data fetch, empty state graphic with "Clear Filters" or "Add Item" button, error banner with retry trigger.

- **Design Constraints:** Must preserve high contrast, explicit padding math (2x padding for buttons), non-wrapping button labels, and mathematical inner/outer border radii.

#


## 8.37 `AdminScholarshipDetailPage.tsx`

- **Exact Filename:** `AdminScholarshipDetailPage.tsx`

- **Functional Area & Owner:** Scholarships (Phase 12)

- **Screen Role & Route:** Detail (`/admin/scholarships/:id`)

- **Main Screen Purpose:** Provides administrative control interface for scholarships with state filters, detail cards, and operational actions.

- **Visible Metric Cards:** Metric summary cards displaying total count, active/published status, pending review queue items, and completeness warnings.

- **Tables / Lists / Cards:** Responsive Card Grid displaying item metadata, status indicators, and detail navigation buttons.

- **Filters & Search Inputs:** Keyword search input, status dropdown (`ALL`, `DRAFT`, `READY_TO_REVIEW`, `PUBLISHED`, `ARCHIVED`), category/country filters, and "Clear Filters" trigger.

- **Tabs:** Single view layout with stacked modular sections.

- **Forms & Modals:** Interactive Modal Dialogs for Item Creation, Editing, Action Confirmation, and Rejection Reason input.

- **Drawers / Side Panels / Status Badges:** Status badges (`PUBLISHED` emerald, `READY_TO_REVIEW` amber, `NEEDS_REVIEW` rose, `DRAFT` slate).

- **Detail Sections:** Header section with primary action buttons, statistics grid, main content view, audit history sidebar.

- **Empty / Loading / Error States:** Skeleton loader grids during data fetch, empty state graphic with "Clear Filters" or "Add Item" button, error banner with retry trigger.

- **Design Constraints:** Must preserve high contrast, explicit padding math (2x padding for buttons), non-wrapping button labels, and mathematical inner/outer border radii.

#


## 8.38 `AdminScholarshipsPreviewPage.tsx`

- **Exact Filename:** `AdminScholarshipsPreviewPage.tsx`

- **Functional Area & Owner:** Scholarships (Phase 12)

- **Screen Role & Route:** List (`/admin/scholarships`)

- **Main Screen Purpose:** Provides administrative control interface for scholarships with state filters, detail cards, and operational actions.

- **Visible Metric Cards:** Metric summary cards displaying total count, active/published status, pending review queue items, and completeness warnings.

- **Tables / Lists / Cards:** Structured Data Table with column sorting, row actions, status badges, and pagination.

- **Filters & Search Inputs:** Keyword search input, status dropdown (`ALL`, `DRAFT`, `READY_TO_REVIEW`, `PUBLISHED`, `ARCHIVED`), category/country filters, and "Clear Filters" trigger.

- **Tabs:** Multi-tab navigation switching between Overview, Configuration, Logs, and Linked Domain Entities.

- **Forms & Modals:** Interactive Modal Dialogs for Item Creation, Editing, Action Confirmation, and Rejection Reason input.

- **Drawers / Side Panels / Status Badges:** Status badges (`PUBLISHED` emerald, `READY_TO_REVIEW` amber, `NEEDS_REVIEW` rose, `DRAFT` slate).

- **Detail Sections:** Header section with primary action buttons, statistics grid, main content view, audit history sidebar.

- **Empty / Loading / Error States:** Skeleton loader grids during data fetch, empty state graphic with "Clear Filters" or "Add Item" button, error banner with retry trigger.

- **Design Constraints:** Must preserve high contrast, explicit padding math (2x padding for buttons), non-wrapping button labels, and mathematical inner/outer border radii.

#


## 8.39 `AdminServicesLandingPage.tsx`

- **Exact Filename:** `AdminServicesLandingPage.tsx`

- **Functional Area & Owner:** Non-Course Services (Phase 20)

- **Screen Role & Route:** Landing (`/admin/services`)

- **Main Screen Purpose:** Provides administrative control interface for non-course services with state filters, detail cards, and operational actions.

- **Visible Metric Cards:** Metric summary cards displaying total count, active/published status, pending review queue items, and completeness warnings.

- **Tables / Lists / Cards:** Responsive Card Grid displaying item metadata, status indicators, and detail navigation buttons.

- **Filters & Search Inputs:** Keyword search input, status dropdown (`ALL`, `DRAFT`, `READY_TO_REVIEW`, `PUBLISHED`, `ARCHIVED`), category/country filters, and "Clear Filters" trigger.

- **Tabs:** Single view layout with stacked modular sections.

- **Forms & Modals:** Inline action bar controls.

- **Drawers / Side Panels / Status Badges:** Status badges (`PUBLISHED` emerald, `READY_TO_REVIEW` amber, `NEEDS_REVIEW` rose, `DRAFT` slate).

- **Detail Sections:** Header section with primary action buttons, statistics grid, main content view, audit history sidebar.

- **Empty / Loading / Error States:** Skeleton loader grids during data fetch, empty state graphic with "Clear Filters" or "Add Item" button, error banner with retry trigger.

- **Design Constraints:** Must preserve high contrast, explicit padding math (2x padding for buttons), non-wrapping button labels, and mathematical inner/outer border radii.

#


## 8.40 `AdminSettingsPreviewPage.tsx`

- **Exact Filename:** `AdminSettingsPreviewPage.tsx`

- **Functional Area & Owner:** Settings & System Config (Phase 05 / 23)

- **Screen Role & Route:** Settings (`/admin/settings`)

- **Main Screen Purpose:** Provides administrative control interface for settings & system config with state filters, detail cards, and operational actions.

- **Visible Metric Cards:** Metric summary cards displaying total count, active/published status, pending review queue items, and completeness warnings.

- **Tables / Lists / Cards:** Structured Data Table with column sorting, row actions, status badges, and pagination.

- **Filters & Search Inputs:** Keyword search input, status dropdown (`ALL`, `DRAFT`, `READY_TO_REVIEW`, `PUBLISHED`, `ARCHIVED`), category/country filters, and "Clear Filters" trigger.

- **Tabs:** Multi-tab navigation switching between Overview, Configuration, Logs, and Linked Domain Entities.

- **Forms & Modals:** Interactive Modal Dialogs for Item Creation, Editing, Action Confirmation, and Rejection Reason input.

- **Drawers / Side Panels / Status Badges:** Status badges (`PUBLISHED` emerald, `READY_TO_REVIEW` amber, `NEEDS_REVIEW` rose, `DRAFT` slate).

- **Detail Sections:** Header section with primary action buttons, statistics grid, main content view, audit history sidebar.

- **Empty / Loading / Error States:** Skeleton loader grids during data fetch, empty state graphic with "Clear Filters" or "Add Item" button, error banner with retry trigger.

- **Design Constraints:** Must preserve high contrast, explicit padding math (2x padding for buttons), non-wrapping button labels, and mathematical inner/outer border radii.

#


## 8.41 `AdminStudentServiceDetailPage.tsx`

- **Exact Filename:** `AdminStudentServiceDetailPage.tsx`

- **Functional Area & Owner:** Non-Course Services (Phase 20)

- **Screen Role & Route:** Detail (`/admin/services/student/:id`)

- **Main Screen Purpose:** Provides administrative control interface for non-course services with state filters, detail cards, and operational actions.

- **Visible Metric Cards:** Metric summary cards displaying total count, active/published status, pending review queue items, and completeness warnings.

- **Tables / Lists / Cards:** Responsive Card Grid displaying item metadata, status indicators, and detail navigation buttons.

- **Filters & Search Inputs:** Keyword search input, status dropdown (`ALL`, `DRAFT`, `READY_TO_REVIEW`, `PUBLISHED`, `ARCHIVED`), category/country filters, and "Clear Filters" trigger.

- **Tabs:** Single view layout with stacked modular sections.

- **Forms & Modals:** Interactive Modal Dialogs for Item Creation, Editing, Action Confirmation, and Rejection Reason input.

- **Drawers / Side Panels / Status Badges:** Status badges (`PUBLISHED` emerald, `READY_TO_REVIEW` amber, `NEEDS_REVIEW` rose, `DRAFT` slate).

- **Detail Sections:** Header section with primary action buttons, statistics grid, main content view, audit history sidebar.

- **Empty / Loading / Error States:** Skeleton loader grids during data fetch, empty state graphic with "Clear Filters" or "Add Item" button, error banner with retry trigger.

- **Design Constraints:** Must preserve high contrast, explicit padding math (2x padding for buttons), non-wrapping button labels, and mathematical inner/outer border radii.

#


## 8.42 `AdminStudentServicesPreviewPage.tsx`

- **Exact Filename:** `AdminStudentServicesPreviewPage.tsx`

- **Functional Area & Owner:** Non-Course Services (Phase 20)

- **Screen Role & Route:** List (`/admin/services/student`)

- **Main Screen Purpose:** Provides administrative control interface for non-course services with state filters, detail cards, and operational actions.

- **Visible Metric Cards:** Metric summary cards displaying total count, active/published status, pending review queue items, and completeness warnings.

- **Tables / Lists / Cards:** Responsive Card Grid displaying item metadata, status indicators, and detail navigation buttons.

- **Filters & Search Inputs:** Keyword search input, status dropdown (`ALL`, `DRAFT`, `READY_TO_REVIEW`, `PUBLISHED`, `ARCHIVED`), category/country filters, and "Clear Filters" trigger.

- **Tabs:** Multi-tab navigation switching between Overview, Configuration, Logs, and Linked Domain Entities.

- **Forms & Modals:** Interactive Modal Dialogs for Item Creation, Editing, Action Confirmation, and Rejection Reason input.

- **Drawers / Side Panels / Status Badges:** Status badges (`PUBLISHED` emerald, `READY_TO_REVIEW` amber, `NEEDS_REVIEW` rose, `DRAFT` slate).

- **Detail Sections:** Header section with primary action buttons, statistics grid, main content view, audit history sidebar.

- **Empty / Loading / Error States:** Skeleton loader grids during data fetch, empty state graphic with "Clear Filters" or "Add Item" button, error banner with retry trigger.

- **Design Constraints:** Must preserve high contrast, explicit padding math (2x padding for buttons), non-wrapping button labels, and mathematical inner/outer border radii.

#


## 8.43 `AdminStudentToolDetailPage.tsx`

- **Exact Filename:** `AdminStudentToolDetailPage.tsx`

- **Functional Area & Owner:** Student Tools (Phase 18)

- **Screen Role & Route:** Detail (`/admin/student-tools/:id`)

- **Main Screen Purpose:** Provides administrative control interface for student tools with state filters, detail cards, and operational actions.

- **Visible Metric Cards:** Metric summary cards displaying total count, active/published status, pending review queue items, and completeness warnings.

- **Tables / Lists / Cards:** Responsive Card Grid displaying item metadata, status indicators, and detail navigation buttons.

- **Filters & Search Inputs:** Keyword search input, status dropdown (`ALL`, `DRAFT`, `READY_TO_REVIEW`, `PUBLISHED`, `ARCHIVED`), category/country filters, and "Clear Filters" trigger.

- **Tabs:** Single view layout with stacked modular sections.

- **Forms & Modals:** Interactive Modal Dialogs for Item Creation, Editing, Action Confirmation, and Rejection Reason input.

- **Drawers / Side Panels / Status Badges:** Status badges (`PUBLISHED` emerald, `READY_TO_REVIEW` amber, `NEEDS_REVIEW` rose, `DRAFT` slate).

- **Detail Sections:** Header section with primary action buttons, statistics grid, main content view, audit history sidebar.

- **Empty / Loading / Error States:** Skeleton loader grids during data fetch, empty state graphic with "Clear Filters" or "Add Item" button, error banner with retry trigger.

- **Design Constraints:** Must preserve high contrast, explicit padding math (2x padding for buttons), non-wrapping button labels, and mathematical inner/outer border radii.

#


## 8.44 `AdminStudentToolsPreviewPage.tsx`

- **Exact Filename:** `AdminStudentToolsPreviewPage.tsx`

- **Functional Area & Owner:** Student Tools (Phase 18)

- **Screen Role & Route:** List (`/admin/student-tools`)

- **Main Screen Purpose:** Provides administrative control interface for student tools with state filters, detail cards, and operational actions.

- **Visible Metric Cards:** Metric summary cards displaying total count, active/published status, pending review queue items, and completeness warnings.

- **Tables / Lists / Cards:** Responsive Card Grid displaying item metadata, status indicators, and detail navigation buttons.

- **Filters & Search Inputs:** Keyword search input, status dropdown (`ALL`, `DRAFT`, `READY_TO_REVIEW`, `PUBLISHED`, `ARCHIVED`), category/country filters, and "Clear Filters" trigger.

- **Tabs:** Multi-tab navigation switching between Overview, Configuration, Logs, and Linked Domain Entities.

- **Forms & Modals:** Interactive Modal Dialogs for Item Creation, Editing, Action Confirmation, and Rejection Reason input.

- **Drawers / Side Panels / Status Badges:** Status badges (`PUBLISHED` emerald, `READY_TO_REVIEW` amber, `NEEDS_REVIEW` rose, `DRAFT` slate).

- **Detail Sections:** Header section with primary action buttons, statistics grid, main content view, audit history sidebar.

- **Empty / Loading / Error States:** Skeleton loader grids during data fetch, empty state graphic with "Clear Filters" or "Add Item" button, error banner with retry trigger.

- **Design Constraints:** Must preserve high contrast, explicit padding math (2x padding for buttons), non-wrapping button labels, and mathematical inner/outer border radii.

#


## 8.45 `AdminUniversitiesPreviewPage.tsx`

- **Exact Filename:** `AdminUniversitiesPreviewPage.tsx`

- **Functional Area & Owner:** Universities & Institutions (Phase 11)

- **Screen Role & Route:** List (`/admin/universities`)

- **Main Screen Purpose:** Provides administrative control interface for universities & institutions with state filters, detail cards, and operational actions.

- **Visible Metric Cards:** Metric summary cards displaying total count, active/published status, pending review queue items, and completeness warnings.

- **Tables / Lists / Cards:** Structured Data Table with column sorting, row actions, status badges, and pagination.

- **Filters & Search Inputs:** Keyword search input, status dropdown (`ALL`, `DRAFT`, `READY_TO_REVIEW`, `PUBLISHED`, `ARCHIVED`), category/country filters, and "Clear Filters" trigger.

- **Tabs:** Multi-tab navigation switching between Overview, Configuration, Logs, and Linked Domain Entities.

- **Forms & Modals:** Inline action bar controls.

- **Drawers / Side Panels / Status Badges:** Status badges (`PUBLISHED` emerald, `READY_TO_REVIEW` amber, `NEEDS_REVIEW` rose, `DRAFT` slate).

- **Detail Sections:** Header section with primary action buttons, statistics grid, main content view, audit history sidebar.

- **Empty / Loading / Error States:** Skeleton loader grids during data fetch, empty state graphic with "Clear Filters" or "Add Item" button, error banner with retry trigger.

- **Design Constraints:** Must preserve high contrast, explicit padding math (2x padding for buttons), non-wrapping button labels, and mathematical inner/outer border radii.

#


## 8.46 `AdminUniversityDetailPage.tsx`

- **Exact Filename:** `AdminUniversityDetailPage.tsx`

- **Functional Area & Owner:** Universities & Institutions (Phase 11)

- **Screen Role & Route:** Detail (`/admin/universities/:id`)

- **Main Screen Purpose:** Provides administrative control interface for universities & institutions with state filters, detail cards, and operational actions.

- **Visible Metric Cards:** Metric summary cards displaying total count, active/published status, pending review queue items, and completeness warnings.

- **Tables / Lists / Cards:** Responsive Card Grid displaying item metadata, status indicators, and detail navigation buttons.

- **Filters & Search Inputs:** Keyword search input, status dropdown (`ALL`, `DRAFT`, `READY_TO_REVIEW`, `PUBLISHED`, `ARCHIVED`), category/country filters, and "Clear Filters" trigger.

- **Tabs:** Multi-tab navigation switching between Overview, Configuration, Logs, and Linked Domain Entities.

- **Forms & Modals:** Interactive Modal Dialogs for Item Creation, Editing, Action Confirmation, and Rejection Reason input.

- **Drawers / Side Panels / Status Badges:** Status badges (`PUBLISHED` emerald, `READY_TO_REVIEW` amber, `NEEDS_REVIEW` rose, `DRAFT` slate).

- **Detail Sections:** Header section with primary action buttons, statistics grid, main content view, audit history sidebar.

- **Empty / Loading / Error States:** Skeleton loader grids during data fetch, empty state graphic with "Clear Filters" or "Add Item" button, error banner with retry trigger.

- **Design Constraints:** Must preserve high contrast, explicit padding math (2x padding for buttons), non-wrapping button labels, and mathematical inner/outer border radii.

---


## 9. Complete Action and Button Inventory

#


## 9.1 AdminAiGovernancePreviewPage.tsx

| Action / Button Label | UI Location | Current Behavior | Required Production Behavior | Required API / Backend | Owner Phase | Permission / RBAC | Audit | Confirmation | Safety Rule |
|---|---|---|---|---|---|---|---|---|---|
| ميثاق الخدمات ومعمارية AIService | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase17/action | Phase 17 | admin:phase17:manage | Audit log | None | Admin review required |
| إغلاق | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase17/action | Phase 17 | admin:phase17:manage | Audit log | None | Admin review required |
| لوحة المراقبة | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase17/action | Phase 17 | admin:phase17:manage | Audit log | None | Admin review required |
| نشط) | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase17/action | Phase 17 | admin:phase17:manage | Audit log | None | Admin review required |
| مركز الترجمة بالذكاء | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase17/action | Phase 17 | admin:phase17:manage | Audit log | None | Admin review required |
| مستودع الموجهات (Prompts) | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase17/action | Phase 17 | admin:phase17:manage | Audit log | None | Admin review required |
| متابعة المهام () | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase17/action | Phase 17 | admin:phase17:manage | Audit log | None | Admin review required |
| طابور المعالجة (AI Queue) | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase17/action | Phase 17 | admin:phase17:manage | Audit log | None | Admin review required |
| السجلات والحوادث | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase17/action | Phase 17 | admin:phase17:manage | Audit log | None | Admin review required |
| الإعدادات العامة | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase17/action | Phase 17 | admin:phase17:manage | Audit log | None | Admin review required |
| التحليلات والاستهلاك | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase17/action | Phase 17 | admin:phase17:manage | Audit log | None | Admin review required |
| الحدود والمعمارية | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase17/action | Phase 17 | admin:phase17:manage | Audit log | None | Admin review required |
| تحديث الحالة | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase17/action | Phase 17 | admin:phase17:manage | Audit log | None | Admin review required |
| فحص الاتصال | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase17/action | Phase 17 | admin:phase17:manage | Audit log | None | Admin review required |
| بدء دفعة ترجمة | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase17/action | Phase 17 | admin:phase17:manage | Audit log | None | Admin review required |
| Edit Record | Table Row | Local state only | Execute API action and refresh state | POST /api/admin/phase17/action | Phase 17 | admin:phase17:manage | Audit log | None | Admin review required |
| Run Diagnostic / Test | Toolbar | API call | Run proxy test in sandbox | POST /api/admin/ai/test-proxy | Phase 17 | admin:phase17:manage | Audit log | None | No secret exposure |

#


## 9.2 AdminCareerOpportunityDetailPage.tsx

| Action / Button Label | UI Location | Current Behavior | Required Production Behavior | Required API / Backend | Owner Phase | Permission / RBAC | Audit | Confirmation | Safety Rule |
|---|---|---|---|---|---|---|---|---|---|
| العودة لسجل الفرص والوظائف | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase21/action | Phase 21 | admin:phase21:manage | Audit log | None | Admin review required |
| إغلاق | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase21/action | Phase 21 | admin:phase21:manage | Audit log | None | Admin review required |
| Publish Record | Toolbar | Mocked handler | Transition publishing status | POST /api/admin/phase21/publish | Phase 21 | admin:phase21:manage | High-Risk Audit | Confirmation modal | No auto-publish / Public visibility check |
| أرشفة | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase21/action | Phase 21 | admin:phase21:manage | Audit log | None | Admin review required |
| استجلاب الحقول المفقودة | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase21/action | Phase 21 | admin:phase21:manage | Audit log | None | Admin review required |

#


## 9.3 AdminCareersPreviewPage.tsx

| Action / Button Label | UI Location | Current Behavior | Required Production Behavior | Required API / Backend | Owner Phase | Permission / RBAC | Audit | Confirmation | Safety Rule |
|---|---|---|---|---|---|---|---|---|---|
| سجل فرص التوظيف والتدريب () | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase21/action | Phase 21 | admin:phase21:manage | Audit log | None | Admin review required |
| طلبات التقديم والـ CVs () | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase21/action | Phase 21 | admin:phase21:manage | Audit log | None | Admin review required |
| ملفات شبكة الخريجين () | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase21/action | Phase 21 | admin:phase21:manage | Audit log | None | Admin review required |
| ميتا بيانات الجهات التوظيفية () | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase21/action | Phase 21 | admin:phase21:manage | Audit log | None | Admin review required |
| Publish Record | Toolbar | Mocked handler | Transition publishing status | POST /api/admin/phase21/publish | Phase 21 | admin:phase21:manage | High-Risk Audit | Confirmation modal | No auto-publish / Public visibility check |
| تحليلات المهارات وسوق العمل | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase21/action | Phase 21 | admin:phase21:manage | Audit log | None | Admin review required |
| View Details | Table Row | Navigation only | Client-side route navigation | N/A | Phase 21 | admin:phase21:manage | None | None | N/A |
| Approve / Verify Record | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase21/action | Phase 21 | admin:phase21:manage | Audit log | None | Admin review required |

#


## 9.4 AdminCertificateDetailPage.tsx

| Action / Button Label | UI Location | Current Behavior | Required Production Behavior | Required API / Backend | Owner Phase | Permission / RBAC | Audit | Confirmation | Safety Rule |
|---|---|---|---|---|---|---|---|---|---|
| العودة لسجل الشهادات | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase14/action | Phase 14 | admin:phase14:manage | Audit log | None | Admin review required |
| معاينة الشهادة | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase14/action | Phase 14 | admin:phase14:manage | Audit log | None | Admin review required |
| فحص التوقيع الرقمي | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase14/action | Phase 14 | admin:phase14:manage | Audit log | None | Admin review required |
| Cancel / Close | Modal | Local state only | Close UI modal / drawer | N/A | Phase 14 | admin:phase14:manage | None | None | N/A |
| إغلاق المعاينة | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase14/action | Phase 14 | admin:phase14:manage | Audit log | None | Admin review required |

#


## 9.5 AdminCertificatesPreviewPage.tsx

| Action / Button Label | UI Location | Current Behavior | Required Production Behavior | Required API / Backend | Owner Phase | Permission / RBAC | Audit | Confirmation | Safety Rule |
|---|---|---|---|---|---|---|---|---|---|
| نماذج الشهادات () | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase14/action | Phase 14 | admin:phase14:manage | Audit log | None | Admin review required |
| طلبات الإصدار () | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase14/action | Phase 14 | admin:phase14:manage | Audit log | None | Admin review required |
| سجل الشهادات الصادرة () | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase14/action | Phase 14 | admin:phase14:manage | Audit log | None | Admin review required |
| طلبات الإصدار المعلقة () | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase14/action | Phase 14 | admin:phase14:manage | Audit log | None | Admin review required |
| نماذج وقوالب الشهادات () | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase14/action | Phase 14 | admin:phase14:manage | Audit log | None | Admin review required |
| View Details | Table Row | Navigation only | Client-side route navigation | N/A | Phase 14 | admin:phase14:manage | None | None | N/A |
| Approve / Verify Record | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase14/action | Phase 14 | admin:phase14:manage | Audit log | None | Admin review required |
| Reject Record | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase14/action | Phase 14 | admin:phase14:manage | Audit log | None | Admin review required |
| Create / Add Item | Header | Local state only | Execute API action and refresh state | POST /api/admin/phase14/action | Phase 14 | admin:phase14:manage | Audit log | None | Admin review required |
| معاينة النموذج | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase14/action | Phase 14 | admin:phase14:manage | Audit log | None | Admin review required |
| Cancel / Close | Modal | Local state only | Close UI modal / drawer | N/A | Phase 14 | admin:phase14:manage | None | None | N/A |
| Save Changes | Modal | Local state only | Execute API action and refresh state | POST /api/admin/phase14/action | Phase 14 | admin:phase14:manage | Audit log | None | Admin review required |
| إغلاق المعاينة | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase14/action | Phase 14 | admin:phase14:manage | Audit log | None | Admin review required |

#


## 9.6 AdminCmsArticleDetailPage.tsx

| Action / Button Label | UI Location | Current Behavior | Required Production Behavior | Required API / Backend | Owner Phase | Permission / RBAC | Audit | Confirmation | Safety Rule |
|---|---|---|---|---|---|---|---|---|---|
| إدارة المحتوى (CMS) | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase16/action | Phase 16 | admin:phase16:manage | Audit log | None | Admin review required |
| المقالات والأدلة | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase16/action | Phase 16 | admin:phase16:manage | Audit log | None | Admin review required |
| العودة للقائمة | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase16/action | Phase 16 | admin:phase16:manage | Audit log | None | Admin review required |
| Edit Record | Table Row | Local state only | Execute API action and refresh state | POST /api/admin/phase16/action | Phase 16 | admin:phase16:manage | Audit log | None | Admin review required |
| Save Changes | Modal | Local state only | Execute API action and refresh state | POST /api/admin/phase16/action | Phase 16 | admin:phase16:manage | Audit log | None | Admin review required |
| إرسال للمراجعة | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase16/action | Phase 16 | admin:phase16:manage | Audit log | None | Admin review required |
| Approve / Verify Record | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase16/action | Phase 16 | admin:phase16:manage | Audit log | None | Admin review required |
| Publish Record | Toolbar | Mocked handler | Transition publishing status | POST /api/admin/phase16/publish | Phase 16 | admin:phase16:manage | High-Risk Audit | Confirmation modal | No auto-publish / Public visibility check |
| Cancel / Close | Modal | Local state only | Close UI modal / drawer | N/A | Phase 16 | admin:phase16:manage | None | None | N/A |
| أرشفة | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase16/action | Phase 16 | admin:phase16:manage | Audit log | None | Admin review required |
| إنشاء ترجمة | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase16/action | Phase 16 | admin:phase16:manage | Audit log | None | Admin review required |
| معاينة العامة | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase16/action | Phase 16 | admin:phase16:manage | Audit log | None | Admin review required |
| اقتراح بيانات SEO | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase16/action | Phase 16 | admin:phase16:manage | Audit log | None | Admin review required |
| اقتراح مسودة ترجمة | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase16/action | Phase 16 | admin:phase16:manage | Audit log | None | Admin review required |
| إغلاق النافذة | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase16/action | Phase 16 | admin:phase16:manage | Audit log | None | Admin review required |

#


## 9.7 AdminCmsArticlesPreviewPage.tsx

| Action / Button Label | UI Location | Current Behavior | Required Production Behavior | Required API / Backend | Owner Phase | Permission / RBAC | Audit | Confirmation | Safety Rule |
|---|---|---|---|---|---|---|---|---|---|
| إدارة المحتوى (CMS) | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase16/action | Phase 16 | admin:phase16:manage | Audit log | None | Admin review required |
| Create / Add Item | Header | Local state only | Execute API action and refresh state | POST /api/admin/phase16/action | Phase 16 | admin:phase16:manage | Audit log | None | Admin review required |
| View Details | Table Row | Navigation only | Client-side route navigation | N/A | Phase 16 | admin:phase16:manage | None | None | N/A |
| Cancel / Close | Modal | Local state only | Close UI modal / drawer | N/A | Phase 16 | admin:phase16:manage | None | None | N/A |
| إنشاء والذهاب للتفاصيل | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase16/action | Phase 16 | admin:phase16:manage | Audit log | None | Admin review required |

#


## 9.8 AdminCmsCategoriesPreviewPage.tsx

| Action / Button Label | UI Location | Current Behavior | Required Production Behavior | Required API / Backend | Owner Phase | Permission / RBAC | Audit | Confirmation | Safety Rule |
|---|---|---|---|---|---|---|---|---|---|
| إدارة المحتوى (CMS) | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase16/action | Phase 16 | admin:phase16:manage | Audit log | None | Admin review required |
| Create / Add Item | Header | Local state only | Execute API action and refresh state | POST /api/admin/phase16/action | Phase 16 | admin:phase16:manage | Audit log | None | Admin review required |

#


## 9.9 AdminCmsFaqDetailPage.tsx

| Action / Button Label | UI Location | Current Behavior | Required Production Behavior | Required API / Backend | Owner Phase | Permission / RBAC | Audit | Confirmation | Safety Rule |
|---|---|---|---|---|---|---|---|---|---|
| إدارة المحتوى (CMS) | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase16/action | Phase 16 | admin:phase16:manage | Audit log | None | Admin review required |
| الأسئلة الشائعة | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase16/action | Phase 16 | admin:phase16:manage | Audit log | None | Admin review required |
| العودة للقائمة | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase16/action | Phase 16 | admin:phase16:manage | Audit log | None | Admin review required |
| Save Changes | Modal | Local state only | Execute API action and refresh state | POST /api/admin/phase16/action | Phase 16 | admin:phase16:manage | Audit log | None | Admin review required |
| إرسال للمراجعة | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase16/action | Phase 16 | admin:phase16:manage | Audit log | None | Admin review required |
| Publish Record | Toolbar | Mocked handler | Transition publishing status | POST /api/admin/phase16/publish | Phase 16 | admin:phase16:manage | High-Risk Audit | Confirmation modal | No auto-publish / Public visibility check |
| أرشفة | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase16/action | Phase 16 | admin:phase16:manage | Audit log | None | Admin review required |

#


## 9.10 AdminCmsFaqsPreviewPage.tsx

| Action / Button Label | UI Location | Current Behavior | Required Production Behavior | Required API / Backend | Owner Phase | Permission / RBAC | Audit | Confirmation | Safety Rule |
|---|---|---|---|---|---|---|---|---|---|
| إدارة المحتوى (CMS) | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase16/action | Phase 16 | admin:phase16:manage | Audit log | None | Admin review required |
| Create / Add Item | Header | Local state only | Execute API action and refresh state | POST /api/admin/phase16/action | Phase 16 | admin:phase16:manage | Audit log | None | Admin review required |
| View Details | Table Row | Navigation only | Client-side route navigation | N/A | Phase 16 | admin:phase16:manage | None | None | N/A |
| Cancel / Close | Modal | Local state only | Close UI modal / drawer | N/A | Phase 16 | admin:phase16:manage | None | None | N/A |
| إنشاء والذهاب للتفاصيل | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase16/action | Phase 16 | admin:phase16:manage | Audit log | None | Admin review required |

#


## 9.11 AdminCmsLandingPage.tsx

| Action / Button Label | UI Location | Current Behavior | Required Production Behavior | Required API / Backend | Owner Phase | Permission / RBAC | Audit | Confirmation | Safety Rule |
|---|---|---|---|---|---|---|---|---|---|
| فتح القسم | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase16/action | Phase 16 | admin:phase16:manage | Audit log | None | Admin review required |

#


## 9.12 AdminCmsPageDetailPage.tsx

| Action / Button Label | UI Location | Current Behavior | Required Production Behavior | Required API / Backend | Owner Phase | Permission / RBAC | Audit | Confirmation | Safety Rule |
|---|---|---|---|---|---|---|---|---|---|
| إدارة المحتوى (CMS) | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase16/action | Phase 16 | admin:phase16:manage | Audit log | None | Admin review required |
| الصفحات الثابتة | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase16/action | Phase 16 | admin:phase16:manage | Audit log | None | Admin review required |
| العودة للقائمة | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase16/action | Phase 16 | admin:phase16:manage | Audit log | None | Admin review required |
| Save Changes | Modal | Local state only | Execute API action and refresh state | POST /api/admin/phase16/action | Phase 16 | admin:phase16:manage | Audit log | None | Admin review required |
| Publish Record | Toolbar | Mocked handler | Transition publishing status | POST /api/admin/phase16/publish | Phase 16 | admin:phase16:manage | High-Risk Audit | Confirmation modal | No auto-publish / Public visibility check |
| أرشفة | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase16/action | Phase 16 | admin:phase16:manage | Audit log | None | Admin review required |

#


## 9.13 AdminCmsPagesPreviewPage.tsx

| Action / Button Label | UI Location | Current Behavior | Required Production Behavior | Required API / Backend | Owner Phase | Permission / RBAC | Audit | Confirmation | Safety Rule |
|---|---|---|---|---|---|---|---|---|---|
| إدارة المحتوى (CMS) | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase16/action | Phase 16 | admin:phase16:manage | Audit log | None | Admin review required |
| Create / Add Item | Header | Local state only | Execute API action and refresh state | POST /api/admin/phase16/action | Phase 16 | admin:phase16:manage | Audit log | None | Admin review required |
| View Details | Table Row | Navigation only | Client-side route navigation | N/A | Phase 16 | admin:phase16:manage | None | None | N/A |
| Cancel / Close | Modal | Local state only | Close UI modal / drawer | N/A | Phase 16 | admin:phase16:manage | None | None | N/A |
| إنشاء والذهاب للتفاصيل | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase16/action | Phase 16 | admin:phase16:manage | Audit log | None | Admin review required |

#


## 9.14 AdminCmsReviewQueuePage.tsx

| Action / Button Label | UI Location | Current Behavior | Required Production Behavior | Required API / Backend | Owner Phase | Permission / RBAC | Audit | Confirmation | Safety Rule |
|---|---|---|---|---|---|---|---|---|---|
| إدارة المحتوى (CMS) | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase16/action | Phase 16 | admin:phase16:manage | Audit log | None | Admin review required |
| Approve / Verify Record | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase16/action | Phase 16 | admin:phase16:manage | Audit log | None | Admin review required |

#


## 9.15 AdminCmsTranslationsPreviewPage.tsx

| Action / Button Label | UI Location | Current Behavior | Required Production Behavior | Required API / Backend | Owner Phase | Permission / RBAC | Audit | Confirmation | Safety Rule |
|---|---|---|---|---|---|---|---|---|---|
| إدارة المحتوى (CMS) | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase16/action | Phase 16 | admin:phase16:manage | Audit log | None | Admin review required |
| فتح محرر الترجمة | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase16/action | Phase 16 | admin:phase16:manage | Audit log | None | Admin review required |

#


## 9.16 AdminCoursesLandingPage.tsx

No direct mutating actions detected. Navigation/view-only actions only.

#


## 9.17 AdminDomainImportCenterPage.tsx

| Action / Button Label | UI Location | Current Behavior | Required Production Behavior | Required API / Backend | Owner Phase | Permission / RBAC | Audit | Confirmation | Safety Rule |
|---|---|---|---|---|---|---|---|---|---|
| Next: Choose Input Method | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase06/action | Phase 06 | admin:phase06:manage | Audit log | None | Admin review required |
| {m.label} {m.desc} | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase06/action | Phase 06 | admin:phase06:manage | Audit log | None | Admin review required |
| Back | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase06/action | Phase 06 | admin:phase06:manage | Audit log | None | Admin review required |
| Next: Record Processing Limits | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase06/action | Phase 06 | admin:phase06:manage | Audit log | None | Admin review required |
| {l.desc} | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase06/action | Phase 06 | admin:phase06:manage | Audit log | None | Admin review required |
| Next: Admin Rules & Notes | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase06/action | Phase 06 | admin:phase06:manage | Audit log | None | Admin review required |
| Next: Review Summary | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase06/action | Phase 06 | admin:phase06:manage | Audit log | None | Admin review required |
| Run Import Batch | Header | API call | Trigger batch processing engine | POST /api/admin/imports/run-batch | Phase 06 | admin:phase06:manage | High-Risk Audit | Confirmation modal | No auto-publish |
| Create / Add Item | Header | Local state only | Execute API action and refresh state | POST /api/admin/phase06/action | Phase 06 | admin:phase06:manage | Audit log | None | Admin review required |
| Run Diagnostic / Test | Toolbar | API call | Run proxy test in sandbox | POST /api/admin/ai/test-proxy | Phase 06 | admin:phase06:manage | Audit log | None | No secret exposure |
| {batch.status === 'success' ? 'Success' : 'Partial Success'} {batch.batchName} {batch.providerName} Read {batch.totalRead} Transfer {batch.transferredCount} Dupl. {batch.duplicateCount} | Toolbar | API call | Trigger batch processing engine | POST /api/admin/imports/run-batch | Phase 06 | admin:phase06:manage | High-Risk Audit | Confirmation modal | No auto-publish |

#


## 9.18 AdminFinancePreviewPage.tsx

| Action / Button Label | UI Location | Current Behavior | Required Production Behavior | Required API / Backend | Owner Phase | Permission / RBAC | Audit | Confirmation | Safety Rule |
|---|---|---|---|---|---|---|---|---|---|
| سجل الفواتير () | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase19/action | Phase 19 | admin:phase19:manage | Audit log | None | Admin review required |
| Process Refund | Toolbar | Mocked handler | Issue gateway transaction refund | POST /api/admin/finance/refund | Phase 19 | admin:phase19:manage | High-Risk Audit | Reason required | Payment gateway safety |
| تدقيق الحوالات البنكية () | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase19/action | Phase 19 | admin:phase19:manage | Audit log | None | Admin review required |
| المشاهد المرجعية للأسعار () | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase19/action | Phase 19 | admin:phase19:manage | Audit log | None | Admin review required |
| التقارير المالية والتحليلات | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase19/action | Phase 19 | admin:phase19:manage | Audit log | None | Admin review required |
| View Details | Table Row | Navigation only | Client-side route navigation | N/A | Phase 19 | admin:phase19:manage | None | None | N/A |
| Confirm Action | Modal | Local state only | Execute API action and refresh state | POST /api/admin/phase19/action | Phase 19 | admin:phase19:manage | Audit log | None | Admin review required |
| Reject Record | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase19/action | Phase 19 | admin:phase19:manage | Audit log | None | Admin review required |
| طلب إيصال أوضح | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase19/action | Phase 19 | admin:phase19:manage | Audit log | None | Admin review required |

#


## 9.19 AdminGeneralServiceDetailPage.tsx

| Action / Button Label | UI Location | Current Behavior | Required Production Behavior | Required API / Backend | Owner Phase | Permission / RBAC | Audit | Confirmation | Safety Rule |
|---|---|---|---|---|---|---|---|---|---|
| إدارة الخدمات | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase20/action | Phase 20 | admin:phase20:manage | Audit log | None | Admin review required |
| الخدمات العامة | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase20/action | Phase 20 | admin:phase20:manage | Audit log | None | Admin review required |
| العودة للقائمة | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase20/action | Phase 20 | admin:phase20:manage | Audit log | None | Admin review required |
| Edit Record | Table Row | Local state only | Execute API action and refresh state | POST /api/admin/phase20/action | Phase 20 | admin:phase20:manage | Audit log | None | Admin review required |
| إعداد التسعير | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase20/action | Phase 20 | admin:phase20:manage | Audit log | None | Admin review required |
| إعداد الباقات | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase20/action | Phase 20 | admin:phase20:manage | Audit log | None | Admin review required |
| إدارة النماذج / الملفات (Phase 05 EAP) | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase20/action | Phase 20 | admin:phase20:manage | Audit log | None | Admin review required |
| Publish Record | Toolbar | Mocked handler | Transition publishing status | POST /api/admin/phase20/publish | Phase 20 | admin:phase20:manage | High-Risk Audit | Confirmation modal | No auto-publish / Public visibility check |
| Cancel / Close | Modal | Local state only | Close UI modal / drawer | N/A | Phase 20 | admin:phase20:manage | None | None | N/A |
| أرشفة | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase20/action | Phase 20 | admin:phase20:manage | Audit log | None | Admin review required |
| فتح الطلبات المرتبطة () | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase20/action | Phase 20 | admin:phase20:manage | Audit log | None | Admin review required |
| فتح إعدادات الدفع/المالية (Phase 19) | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase20/action | Phase 20 | admin:phase20:manage | Audit log | None | Admin review required |
| إغلاق النافذة | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase20/action | Phase 20 | admin:phase20:manage | Audit log | None | Admin review required |

#


## 9.20 AdminGeneralServicesPreviewPage.tsx

| Action / Button Label | UI Location | Current Behavior | Required Production Behavior | Required API / Backend | Owner Phase | Permission / RBAC | Audit | Confirmation | Safety Rule |
|---|---|---|---|---|---|---|---|---|---|
| إدارة الخدمات | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase20/action | Phase 20 | admin:phase20:manage | Audit log | None | Admin review required |
| Create / Add Item | Header | Local state only | Execute API action and refresh state | POST /api/admin/phase20/action | Phase 20 | admin:phase20:manage | Audit log | None | Admin review required |
| View Details | Table Row | Navigation only | Client-side route navigation | N/A | Phase 20 | admin:phase20:manage | None | None | N/A |
| Cancel / Close | Modal | Local state only | Close UI modal / drawer | N/A | Phase 20 | admin:phase20:manage | None | None | N/A |
| Save Changes | Modal | Local state only | Execute API action and refresh state | POST /api/admin/phase20/action | Phase 20 | admin:phase20:manage | Audit log | None | Admin review required |

#


## 9.21 AdminGenericPreviewPage.tsx

| Action / Button Label | UI Location | Current Behavior | Required Production Behavior | Required API / Backend | Owner Phase | Permission / RBAC | Audit | Confirmation | Safety Rule |
|---|---|---|---|---|---|---|---|---|---|
| {language === 'ar' ? 'معاينة تفعيل' : 'Trigger Action'} {language === 'ar' ? act.nameAr : act.nameEn} {language === 'ar' ? act.descAr : act.descEn} | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase23/action | Phase 23 | admin:phase23:manage | Audit log | None | Admin review required |

#


## 9.22 AdminHealthPreviewPage.tsx

| Action / Button Label | UI Location | Current Behavior | Required Production Behavior | Required API / Backend | Owner Phase | Permission / RBAC | Audit | Confirmation | Safety Rule |
|---|---|---|---|---|---|---|---|---|---|
| إعادة إجراء الفحوصات | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase0523/action | Phase 05 / 23 | admin:phase0523:manage | Audit log | None | Admin review required |
| تنزيل تقرير الجاهزية (JSON) | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase0523/action | Phase 05 / 23 | admin:phase0523:manage | Audit log | None | Admin review required |
| نظرة عامة على المكونات () | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase0523/action | Phase 05 / 23 | admin:phase0523:manage | Audit log | None | Admin review required |
| فحوصات مكونات المنظومة | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase0523/action | Phase 05 / 23 | admin:phase0523:manage | Audit log | None | Admin review required |
| سجل الملاحظات والحوادث غير التدميري () | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase0523/action | Phase 05 / 23 | admin:phase0523:manage | Audit log | None | Admin review required |
| Export Data | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase0523/action | Phase 05 / 23 | admin:phase0523:manage | Audit log | None | Admin review required |
| View Details | Table Row | Navigation only | Client-side route navigation | N/A | Phase 05 / 23 | admin:phase0523:manage | None | None | N/A |
| عرض تقرير الحادثة | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase0523/action | Phase 05 / 23 | admin:phase0523:manage | Audit log | None | Admin review required |
| تحميل التقرير كـ JSON | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase0523/action | Phase 05 / 23 | admin:phase0523:manage | Audit log | None | Admin review required |
| إغلاق | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase0523/action | Phase 05 / 23 | admin:phase0523:manage | Audit log | None | Admin review required |

#


## 9.23 AdminImportedCourseDetailPage.tsx

No direct mutating actions detected. Navigation/view-only actions only.

#


## 9.24 AdminImportedCoursesPreviewPage.tsx

No direct mutating actions detected. Navigation/view-only actions only.

#


## 9.25 AdminImportsPreviewPage.tsx

| Action / Button Label | UI Location | Current Behavior | Required Production Behavior | Required API / Backend | Owner Phase | Permission / RBAC | Audit | Confirmation | Safety Rule |
|---|---|---|---|---|---|---|---|---|---|
| {t(method.labelKey as any) || method.defaultLabel} | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase06/action | Phase 06 | admin:phase06:manage | Audit log | None | Admin review required |
| Close | Modal | Local state only | Close UI modal / drawer | N/A | Phase 06 | admin:phase06:manage | None | None | N/A |

#


## 9.26 AdminInternationalTestDetailPage.tsx

| Action / Button Label | UI Location | Current Behavior | Required Production Behavior | Required API / Backend | Owner Phase | Permission / RBAC | Audit | Confirmation | Safety Rule |
|---|---|---|---|---|---|---|---|---|---|
| Approve / Verify Record | Toolbar | Local state only | Execute API action and refresh state | Use real Phase 09 admin API endpoint when implemented; no generic placeholder endpoint is approved. | Phase 09 | admin:phase09:manage | Audit log | None | Admin review required |
| {t('mark_ready') || 'Mark Ready'} | Toolbar | Local state only | Execute API action and refresh state | Use real Phase 09 admin API endpoint when implemented; no generic placeholder endpoint is approved. | Phase 09 | admin:phase09:manage | Audit log | None | Admin review required |
| Unpublish Record | Toolbar | Use real Phase 09 admin API endpoint when implemented; no generic placeholder endpoint is approved. | Transition publishing status | Use real Phase 09 admin API endpoint when implemented; no generic placeholder endpoint is approved. | Phase 09 | admin:phase09:manage | High-Risk Audit | Confirmation modal | No auto-publish / Public visibility check |
| Publish Record | Toolbar | Use real Phase 09 admin API endpoint when implemented; no generic placeholder endpoint is approved. | Transition publishing status | Use real Phase 09 admin API endpoint when implemented; no generic placeholder endpoint is approved. | Phase 09 | admin:phase09:manage | High-Risk Audit | Confirmation modal | No auto-publish / Public visibility check |
| Cancel / Close | Modal | Local state only | Close UI modal / drawer | N/A | Phase 09 | admin:phase09:manage | None | None | N/A |
| Apply Suggested Fields | Toolbar | Local state only | Execute API action and refresh state | Use real Phase 09 admin API endpoint when implemented; no generic placeholder endpoint is approved. | Phase 09 | admin:phase09:manage | Audit log | None | Admin review required |
| Scholarships | Toolbar | Local state only | Execute API action and refresh state | Use real Phase 09 admin API endpoint when implemented; no generic placeholder endpoint is approved. | Phase 09 | admin:phase09:manage | Audit log | None | Admin review required |
| Universities | Toolbar | Local state only | Execute API action and refresh state | Use real Phase 09 admin API endpoint when implemented; no generic placeholder endpoint is approved. | Phase 09 | admin:phase09:manage | Audit log | None | Admin review required |
| Save Changes | Modal | Local state only | Execute API action and refresh state | Use real Phase 09 admin API endpoint when implemented; no generic placeholder endpoint is approved. | Phase 09 | admin:phase09:manage | Audit log | None | Admin review required |
| Delete Record | Table Row | Use real Phase 09 admin API endpoint when implemented; no generic placeholder endpoint is approved. | Soft delete or archive entity | Use real Phase 09 admin API endpoint when implemented; no generic placeholder endpoint is approved. | Phase 09 | admin:phase09:manage | High-Risk Audit | Confirmation modal / Reason required | Soft delete only / No hard delete |

#


## 9.27 AdminInternationalTestsPreviewPage.tsx

No direct mutating actions detected. Navigation/view-only actions only.

#


## 9.28 AdminInvoiceDetailPage.tsx

| Action / Button Label | UI Location | Current Behavior | Required Production Behavior | Required API / Backend | Owner Phase | Permission / RBAC | Audit | Confirmation | Safety Rule |
|---|---|---|---|---|---|---|---|---|---|
| العودة لسجل الفواتير والمالية | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase19/action | Phase 19 | admin:phase19:manage | Audit log | None | Admin review required |
| Confirm Action | Modal | Local state only | Execute API action and refresh state | POST /api/admin/phase19/action | Phase 19 | admin:phase19:manage | Audit log | None | Admin review required |
| Process Refund | Toolbar | Mocked handler | Issue gateway transaction refund | POST /api/admin/finance/refund | Phase 19 | admin:phase19:manage | High-Risk Audit | Reason required | Payment gateway safety |
| تنزيل الفاتورة الرسمية (PDF) | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase19/action | Phase 19 | admin:phase19:manage | Audit log | None | Admin review required |
| إرسال إشعار وسند للطالب | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase19/action | Phase 19 | admin:phase19:manage | Audit log | None | Admin review required |
| Cancel / Close | Modal | Local state only | Close UI modal / drawer | N/A | Phase 19 | admin:phase19:manage | None | None | N/A |

#


## 9.29 AdminMajorDetailPage.tsx

| Action / Button Label | UI Location | Current Behavior | Required Production Behavior | Required API / Backend | Owner Phase | Permission / RBAC | Audit | Confirmation | Safety Rule |
|---|---|---|---|---|---|---|---|---|---|
| Approve / Verify Record | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase10/action | Phase 10 | admin:phase10:manage | Audit log | None | Admin review required |
| {t('mark_ready') || 'Mark Ready'} | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase10/action | Phase 10 | admin:phase10:manage | Audit log | None | Admin review required |
| Unpublish Record | Toolbar | Mocked handler | Transition publishing status | POST /api/admin/phase10/publish | Phase 10 | admin:phase10:manage | High-Risk Audit | Confirmation modal | No auto-publish / Public visibility check |
| Publish Record | Toolbar | Mocked handler | Transition publishing status | POST /api/admin/phase10/publish | Phase 10 | admin:phase10:manage | High-Risk Audit | Confirmation modal | No auto-publish / Public visibility check |
| Cancel / Close | Modal | Local state only | Close UI modal / drawer | N/A | Phase 10 | admin:phase10:manage | None | None | N/A |
| Apply Suggested Fields | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase10/action | Phase 10 | admin:phase10:manage | Audit log | None | Admin review required |
| Save Changes | Modal | Local state only | Execute API action and refresh state | POST /api/admin/phase10/action | Phase 10 | admin:phase10:manage | Audit log | None | Admin review required |
| Delete Record | Table Row | Mocked handler | Soft delete or archive entity | DELETE /api/admin/phase10 | Phase 10 | admin:phase10:manage | High-Risk Audit | Confirmation modal / Reason required | Soft delete only / No hard delete |

#


## 9.30 AdminMajorsPreviewPage.tsx

No direct mutating actions detected. Navigation/view-only actions only.

#


## 9.31 AdminNativeCourseDetailPage.tsx

No direct mutating actions detected. Navigation/view-only actions only.

#


## 9.32 AdminNativeCoursesPreviewPage.tsx

No direct mutating actions detected. Navigation/view-only actions only.

#


## 9.33 AdminPaidCourseDetailPage.tsx

No direct mutating actions detected. Navigation/view-only actions only.

#


## 9.34 AdminPaidCoursesPreviewPage.tsx

No direct mutating actions detected. Navigation/view-only actions only.

#


## 9.35 AdminPreviewShell.tsx

No direct mutating actions detected. Navigation/view-only actions only.

#


## 9.36 AdminReviewQueuePreviewPage.tsx

No direct mutating actions detected. Navigation/view-only actions only.

#


## 9.37 AdminScholarshipDetailPage.tsx

| Action / Button Label | UI Location | Current Behavior | Required Production Behavior | Required API / Backend | Owner Phase | Permission / RBAC | Audit | Confirmation | Safety Rule |
|---|---|---|---|---|---|---|---|---|---|
| Confirm Action | Modal | Local state only | Execute API action and refresh state | POST /api/admin/phase12/action | Phase 12 | admin:phase12:manage | Audit log | None | Admin review required |

#


## 9.38 AdminScholarshipsPreviewPage.tsx

| Action / Button Label | UI Location | Current Behavior | Required Production Behavior | Required API / Backend | Owner Phase | Permission / RBAC | Audit | Confirmation | Safety Rule |
|---|---|---|---|---|---|---|---|---|---|
| Cancel / Close | Modal | Local state only | Close UI modal / drawer | N/A | Phase 12 | admin:phase12:manage | None | None | N/A |
| Save Changes | Modal | Local state only | Execute API action and refresh state | POST /api/admin/phase12/action | Phase 12 | admin:phase12:manage | Audit log | None | Admin review required |

#


## 9.39 AdminServicesLandingPage.tsx

| Action / Button Label | UI Location | Current Behavior | Required Production Behavior | Required API / Backend | Owner Phase | Permission / RBAC | Audit | Confirmation | Safety Rule |
|---|---|---|---|---|---|---|---|---|---|
| فتح قسم الخدمات الطلابية | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase20/action | Phase 20 | admin:phase20:manage | Audit log | None | Admin review required |
| فتح قسم الخدمات العامة | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase20/action | Phase 20 | admin:phase20:manage | Audit log | None | Admin review required |

#


## 9.40 AdminSettingsPreviewPage.tsx

| Action / Button Label | UI Location | Current Behavior | Required Production Behavior | Required API / Backend | Owner Phase | Permission / RBAC | Audit | Confirmation | Safety Rule |
|---|---|---|---|---|---|---|---|---|---|
| إدارة المدراء والمستخدمين () | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase0523/action | Phase 05 / 23 | admin:phase0523:manage | Audit log | None | Admin review required |
| الأدوار ومصفوفة الصلاحيات () | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase0523/action | Phase 05 / 23 | admin:phase0523:manage | Audit log | None | Admin review required |
| سياسات الوصول والأمان | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase0523/action | Phase 05 / 23 | admin:phase0523:manage | Audit log | None | Admin review required |
| رايات الميزات والرؤية (Flags) () | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase0523/action | Phase 05 / 23 | admin:phase0523:manage | Audit log | None | Admin review required |
| حالة ربط البيئة والتكامل | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase0523/action | Phase 05 / 23 | admin:phase0523:manage | Audit log | None | Admin review required |
| سجل التدقيق الأمني () | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase0523/action | Phase 05 / 23 | admin:phase0523:manage | Audit log | None | Admin review required |
| دعوة مدير جديد | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase0523/action | Phase 05 / 23 | admin:phase0523:manage | Audit log | None | Admin review required |
| التفاصيل | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase0523/action | Phase 05 / 23 | admin:phase0523:manage | Audit log | None | Admin review required |
| عرض مصفوفة النطاقات الـ 15 | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase0523/action | Phase 05 / 23 | admin:phase0523:manage | Audit log | None | Admin review required |
| تبديل الحالة | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase0523/action | Phase 05 / 23 | admin:phase0523:manage | Audit log | None | Admin review required |
| عرض | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase0523/action | Phase 05 / 23 | admin:phase0523:manage | Audit log | None | Admin review required |
| إغلاق | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase0523/action | Phase 05 / 23 | admin:phase0523:manage | Audit log | None | Admin review required |

#


## 9.41 AdminStudentServiceDetailPage.tsx

| Action / Button Label | UI Location | Current Behavior | Required Production Behavior | Required API / Backend | Owner Phase | Permission / RBAC | Audit | Confirmation | Safety Rule |
|---|---|---|---|---|---|---|---|---|---|
| إدارة الخدمات | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase20/action | Phase 20 | admin:phase20:manage | Audit log | None | Admin review required |
| الخدمات الطلابية | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase20/action | Phase 20 | admin:phase20:manage | Audit log | None | Admin review required |
| العودة للقائمة | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase20/action | Phase 20 | admin:phase20:manage | Audit log | None | Admin review required |
| Edit Record | Table Row | Local state only | Execute API action and refresh state | POST /api/admin/phase20/action | Phase 20 | admin:phase20:manage | Audit log | None | Admin review required |
| إعداد التسعير | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase20/action | Phase 20 | admin:phase20:manage | Audit log | None | Admin review required |
| إعداد الباقات | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase20/action | Phase 20 | admin:phase20:manage | Audit log | None | Admin review required |
| إدارة النماذج / الملفات (Phase 05 EAP) | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase20/action | Phase 20 | admin:phase20:manage | Audit log | None | Admin review required |
| Publish Record | Toolbar | Mocked handler | Transition publishing status | POST /api/admin/phase20/publish | Phase 20 | admin:phase20:manage | High-Risk Audit | Confirmation modal | No auto-publish / Public visibility check |
| Cancel / Close | Modal | Local state only | Close UI modal / drawer | N/A | Phase 20 | admin:phase20:manage | None | None | N/A |
| أرشفة | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase20/action | Phase 20 | admin:phase20:manage | Audit log | None | Admin review required |
| فتح الطلبات المرتبطة () | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase20/action | Phase 20 | admin:phase20:manage | Audit log | None | Admin review required |
| فتح إعدادات الدفع/المالية (Phase 19) | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase20/action | Phase 20 | admin:phase20:manage | Audit log | None | Admin review required |
| إغلاق النافذة | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase20/action | Phase 20 | admin:phase20:manage | Audit log | None | Admin review required |

#


## 9.42 AdminStudentServicesPreviewPage.tsx

| Action / Button Label | UI Location | Current Behavior | Required Production Behavior | Required API / Backend | Owner Phase | Permission / RBAC | Audit | Confirmation | Safety Rule |
|---|---|---|---|---|---|---|---|---|---|
| إدارة الخدمات | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase20/action | Phase 20 | admin:phase20:manage | Audit log | None | Admin review required |
| Create / Add Item | Header | Local state only | Execute API action and refresh state | POST /api/admin/phase20/action | Phase 20 | admin:phase20:manage | Audit log | None | Admin review required |
| View Details | Table Row | Navigation only | Client-side route navigation | N/A | Phase 20 | admin:phase20:manage | None | None | N/A |
| Cancel / Close | Modal | Local state only | Close UI modal / drawer | N/A | Phase 20 | admin:phase20:manage | None | None | N/A |
| Save Changes | Modal | Local state only | Execute API action and refresh state | POST /api/admin/phase20/action | Phase 20 | admin:phase20:manage | Audit log | None | Admin review required |

#


## 9.43 AdminStudentToolDetailPage.tsx

| Action / Button Label | UI Location | Current Behavior | Required Production Behavior | Required API / Backend | Owner Phase | Permission / RBAC | Audit | Confirmation | Safety Rule |
|---|---|---|---|---|---|---|---|---|---|
| سجل أدوات الطلاب | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase18/action | Phase 18 | admin:phase18:manage | Audit log | None | Admin review required |
| العودة للكتالوج | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase18/action | Phase 18 | admin:phase18:manage | Audit log | None | Admin review required |
| Edit Record | Table Row | Local state only | Execute API action and refresh state | POST /api/admin/phase18/action | Phase 18 | admin:phase18:manage | Audit log | None | Admin review required |
| تفعيل الأداة | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase18/action | Phase 18 | admin:phase18:manage | Audit log | None | Admin review required |
| تعطيل الأداة | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase18/action | Phase 18 | admin:phase18:manage | Audit log | None | Admin review required |
| وضع قادم قريبًا | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase18/action | Phase 18 | admin:phase18:manage | Audit log | None | Admin review required |
| إخفاء / للإدارة فقط | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase18/action | Phase 18 | admin:phase18:manage | Audit log | None | Admin review required |
| إظهار للعامة | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase18/action | Phase 18 | admin:phase18:manage | Audit log | None | Admin review required |
| Run Diagnostic / Test | Toolbar | API call | Run proxy test in sandbox | POST /api/admin/ai/test-proxy | Phase 18 | admin:phase18:manage | Audit log | None | No secret exposure |
| Open AI Governance | Toolbar | Navigation only | Client-side route navigation | N/A | Phase 18 | admin:phase18:manage | None | None | N/A |
| Approve / Verify Record | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase18/action | Phase 18 | admin:phase18:manage | Audit log | None | Admin review required |
| Cancel / Close | Modal | Local state only | Close UI modal / drawer | N/A | Phase 18 | admin:phase18:manage | None | None | N/A |
| Save Changes | Modal | Local state only | Execute API action and refresh state | POST /api/admin/phase18/action | Phase 18 | admin:phase18:manage | Audit log | None | Admin review required |
| Confirm Action | Modal | Local state only | Execute API action and refresh state | POST /api/admin/phase18/action | Phase 18 | admin:phase18:manage | Audit log | None | Admin review required |

#


## 9.44 AdminStudentToolsPreviewPage.tsx

| Action / Button Label | UI Location | Current Behavior | Required Production Behavior | Required API / Backend | Owner Phase | Permission / RBAC | Audit | Confirmation | Safety Rule |
|---|---|---|---|---|---|---|---|---|---|
| Navigate to Dashboard | Navigation | Navigation only | Client-side route navigation | N/A | Phase 18 | admin:phase18:manage | None | None | N/A |
| Create / Add Item | Header | Local state only | Execute API action and refresh state | POST /api/admin/phase18/action | Phase 18 | admin:phase18:manage | Audit log | None | Admin review required |
| View Details | Table Row | Navigation only | Client-side route navigation | N/A | Phase 18 | admin:phase18:manage | None | None | N/A |
| Cancel / Close | Modal | Local state only | Close UI modal / drawer | N/A | Phase 18 | admin:phase18:manage | None | None | N/A |

#


## 9.45 AdminUniversitiesPreviewPage.tsx

No direct mutating actions detected. Navigation/view-only actions only.

#


## 9.46 AdminUniversityDetailPage.tsx

| Action / Button Label | UI Location | Current Behavior | Required Production Behavior | Required API / Backend | Owner Phase | Permission / RBAC | Audit | Confirmation | Safety Rule |
|---|---|---|---|---|---|---|---|---|---|
| Approve / Verify Record | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase11/action | Phase 11 | admin:phase11:manage | Audit log | None | Admin review required |
| {t('mark_ready') || 'Mark Ready'} | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase11/action | Phase 11 | admin:phase11:manage | Audit log | None | Admin review required |
| Unpublish Record | Toolbar | Mocked handler | Transition publishing status | POST /api/admin/phase11/publish | Phase 11 | admin:phase11:manage | High-Risk Audit | Confirmation modal | No auto-publish / Public visibility check |
| Publish Record | Toolbar | Mocked handler | Transition publishing status | POST /api/admin/phase11/publish | Phase 11 | admin:phase11:manage | High-Risk Audit | Confirmation modal | No auto-publish / Public visibility check |
| Cancel / Close | Modal | Local state only | Close UI modal / drawer | N/A | Phase 11 | admin:phase11:manage | None | None | N/A |
| Apply Suggested Fields | Toolbar | Local state only | Execute API action and refresh state | POST /api/admin/phase11/action | Phase 11 | admin:phase11:manage | Audit log | None | Admin review required |
| Delete Record | Table Row | Mocked handler | Soft delete or archive entity | DELETE /api/admin/phase11 | Phase 11 | admin:phase11:manage | High-Risk Audit | Confirmation modal / Reason required | Soft delete only / No hard delete |


## 10. API and Backend Capability Mapping
To support the preview UI, domain backends must deliver the following standard capabilities:
1. **Unified Query Envelope:** All `GET` endpoints must support `page`, `pageSize`, `search`, `status`, `completenessStatus`, and `sortBy` parameters.
2. **Dashboard Counters:** Each domain must expose an aggregate count endpoint (e.g., `GET /api/admin/{domain}/counts`) returning total, published, pending review, and error item counts.
3. **Structured Audit Logs:** State transitions (`DRAFT` -> `READY_TO_REVIEW` -> `PUBLISHED` -> `ARCHIVED`) must emit structured event payloads to the Phase 05 audit system.

---


## 11. No Auto-Publish and No Silent Overwrite Policy
1. **No Auto-Publishing:** Data imported via Phase 06 from CSVs, external APIs, or web scrapers MUST land in `DRAFT` or `READY_TO_REVIEW` status. Promotion to `PUBLISHED` requires an explicit admin action in the UI.
2. **No Silent Overwrite:** When an import job detects duplicate keys (e.g., existing scholarship or university), it must create a staging review record. Existing `PUBLISHED` records cannot be overwritten without explicit admin approval in the Review Queue.

---


## 12. No Permanent Deletion Policy
1. **Soft Delete Mandatory:** Primary entities (Universities, Scholarships, Courses, Majors, Certificates, Invoices, Job Postings) MUST use soft deletion (`deletedAt` timestamp or `status = 'ARCHIVED'`).
2. **Financial & Credential Immutability:** Invoices, financial transaction logs, issued certificates, and audit log records can NEVER be deleted, hard or soft. Revocation is recorded via status change and audit event.

---


## 13. Security, Audit, and Safety Requirements
1. **Secret Masking:** Third-party credentials, database connection strings, and AI provider API keys managed in `AdminSettingsPreviewPage.tsx` and `AdminAiGovernancePreviewPage.tsx` must be handled via environment variables server-side. The React frontend receives only masked previews (e.g., `••••••••sk-89a`).
2. **Role-Based Guards:** Buttons representing privileged operations (e.g., "Process Refund", "Revoke Certificate", "Run Import Batch") must check permission flags before rendering or executing.
3. **Confirmation and Reason Modals:** Destructive or high-impact actions MUST trigger a confirmation modal asking for a reason text string, which is stored in the audit log.

---


## 14. Phase-by-Phase Implementation Timing

- **Phase 05:** Implement `AdminSettingsPreviewPage.tsx` and `AdminHealthPreviewPage.tsx` with real IAM/Audit APIs.

- **Phase 06:** Implement `AdminImportsPreviewPage.tsx` and `AdminDomainImportCenterPage.tsx` with the generic import engine.

- **Phase 09:** Implement `AdminInternationalTestsPreviewPage.tsx` and `AdminInternationalTestDetailPage.tsx`.

- **Phase 10:** Implement `AdminMajorsPreviewPage.tsx` and `AdminMajorDetailPage.tsx`.

- **Phase 11:** Implement `AdminUniversitiesPreviewPage.tsx` and `AdminUniversityDetailPage.tsx`.

- **Phase 12:** Implement `AdminScholarshipsPreviewPage.tsx` and `AdminScholarshipDetailPage.tsx`.

- **Phase 13:** Implement Course Catalog landing, Native, Imported, and Paid course pages.

- **Phase 14:** Implement `AdminCertificatesPreviewPage.tsx` and `AdminCertificateDetailPage.tsx`.

- **Phase 16:** Implement CMS landing, Article, FAQ, Page, Category, Translation, and Review Queue pages.

- **Phase 17:** **SUPERSEDED / COMPLETE** — canonical owner UI is `apps/admin/src/pages/AIGovernancePage.tsx`; the legacy Web preview was removed and must not be recreated.

- **Phase 18:** **SUPERSEDED / COMPLETE** — canonical owner UI is `apps/admin/src/pages/StudentToolsAdminPage.tsx`; legacy Web preview routes redirect to Admin and must not host a second tool-control plane.

- **Phase 19:** Implement `AdminFinancePreviewPage.tsx` and `AdminInvoiceDetailPage.tsx`.

- **Phase 20:** Implement Services landing, General, and Student services pages.

- **Phase 21:** Implement `AdminCareersPreviewPage.tsx` and `AdminCareerOpportunityDetailPage.tsx`.

- **Phase 23:** Final migration of all components from `apps/web/src/features/admin-preview` to `apps/admin/src/pages` with complete RBAC and router binding.

---



## 15. Missing Coverage Check & Checklist



- [x] **Total `.tsx` files found in `apps/web/src/features/admin-preview`:** 46

- [x] **Total `.tsx` files documented in inventory:** 46

- [x] **Total files with action subsections:** 46

- [x] **Total cleaned action rows actually documented in Section 9:** 233

- [x] **Total non-actions / JSX fragments removed:** 421

- [x] **Files with no direct mutating actions:** 12

- [x] **Actions still needing manual review:** 0

- [x] **Confirmation that NO application code was modified during this task:** Verified.

- [x] **Confirmation that NO admin-preview files were moved, renamed, or deleted:** Verified.



## 16. Final Output Report


- **Files Reviewed:** All 46 `.tsx` files in `apps/web/src/features/admin-preview`.

- **File Created/Updated:** `docs/phases/phase-23-enterprise-administration-portal/phase-23-04-admin-preview-ui-design-and-action-backlog.md`

- **Number of Admin Preview Files Documented:** 46 files (100% complete coverage).

- **Number of Clean Actions Documented in Section 9:** 233 clean action rows.

- **Non-Action JSX Fragments Removed:** 421 raw items filtered.

- **Ambiguous Actions Needing Manual Review:** 0 items.

- **Application Code Modified:** None (0 files modified in `apps/` or `packages/`).

- **Admin Preview Directory Status:** 100% untouched and preserved as the official design source of truth.

---

## 17. Admin Import UI Truthfulness & Architecture Boundary Constraints

> **CRITICAL COMPLIANCE NOTICE FOR PHASE 06 & PHASE 23 ADMIN UI:**
>
> The Admin Import UI (`apps/admin/src/pages/ImportAdminPage.tsx`), Domain Import Center (`apps/web/src/features/admin-preview/AdminDomainImportCenterPage.tsx`), and Imports Preview (`apps/web/src/features/admin-preview/AdminImportsPreviewPage.tsx`) must strictly represent actual backend runtime behavior and respect phase boundaries:
>
> 1. **No Untruthful Capability Claims:** The UI must NOT claim or simulate:
>    - `autoTransfer` / automatic background transfer
>    - Verified trust percentages (e.g., "100% Verified" or "95% Trust")
>    - AI or crawler readiness
>    - Automated record merge logic
>    - Publishing readiness
>    unless the backend and owning domain phase explicitly expose those capabilities.
>
> 2. **Phase 06 Scope Boundaries:** Phase 06 UI serves as a generic staging, validation, and review readiness interface ONLY.
>
> 3. **Owning Domain Responsibilities:** Domain promotion, domain-specific deep review, verification, and public publishing belong strictly to owning domain phases (Phases 09–13) and their respective domain admin workspaces.

---

## 18. Import Match/Merge Review UI Requirements

To allow administrators to govern the transition of data from staging into active domains, the Phase 23 Administrative Portal must implement a dedicated **Import Match/Merge Review UI**. This interface acts as the manual intervention gate for resolving record overlaps, reviewing AI-extracted evidence, and committing merged updates.

### 18.1 Key Capabilities & Components

- **Review Queue**: A global filterable view displaying all pending match candidates, completeness reports, and merge proposals generated from raw Phase 06 imports.
- **Side-by-Side Comparison / Diff Viewer**:
  - Displays the existing/published record fields on the left (if a match exists in the target domain).
  - Displays the proposed/extracted fields on the right (from the Phase 06 Import Staging record).
  - Clear visual indicators of differences (additions, modifications, missing values) with inline diff highlighting.
- **Field-Level Checkbox Selection**:
  - Administrators must be able to select or deselect individual fields to govern exactly which values overwrite the existing record.
  - Allows selective merging (e.g., overwrite the "tuition fee" field but preserve the existing, manually-verified "scholarship description").
- **Evidence & Confidence Visualizer**:
  - For each proposed field, displays the associated Phase 05/06 provenance metadata:
    - **Confidence Score**: Numeric representation (0..1) with its corresponding explanation.
    - **FieldEvidence**: Clickable link or tooltip revealing the `sourceId`, `contentHash`, `connectorVersion`, `schemaVersion`, and the exact `evidenceSnippet` used for extraction.
- **Manual Edit Override**:
  - Inline input text or text-area fields allowing the administrator to manually edit and override any proposed value directly in-context prior to saving.
- **Target Domain Publishing Action**:
  - A secure, high-privilege action button that calls the owning domain’s review/approval/publish workflow after explicit administrator action.
  - This action must NOT call Phase 06 to publish, and must NOT perform auto-publish or auto-merge without explicit human decision-making.


### 18.2 Import Operations Dashboard Truthfulness

- **Real Status Representation**: The dashboard must show real queue status, batch progress, source connector status, schema/content drift, and DLQ failure records only.
- **Prohibition of Untruthful Visual Claims**: No fake success indicators, fake trust scores, fake AI or crawler readiness claims, or fake auto-transfer metrics may be displayed.
- **Owning Domain Workflow Invocations**: All publish, approve, or merge operations triggered from the UI must call the respective owning domain workflows (e.g., Scholarships, Universities, Majors) rather than Phase 06 endpoints.




---

## 19. Phase 06 Import Foundation Architecture Alignment
Based on the completion of Phase 06 Import Foundation, the Admin Import Center UI elements (`AdminImportsPreviewPage`, `AdminDomainImportCenterPage`, `AdminReviewQueuePreviewPage`) must adhere to the following theoretical and architectural specifications when implemented in Phase 23.

### 19.1 Import Center General Dashboard
The Import Center dashboard must display only real backend-backed operational metrics:
- Total import batches
- Imported/staged records
- Failed records
- Duplicate records
- Proposals ready for domain review
- Active sources/connectors
- Drift alerts
- DLQ/error records

Explicitly prohibit fake success indicators, fake readiness indicators, fake trust scores, or simulated operational metrics.

### 19.2 Domain Import Cards
For each import-enabled domain (Scholarships, Universities, Majors, International Tests, Courses, CMS, Services, Certificates when enabled), each card must show:
- Import support status: Supported Now / Planned / Requires Enablement / Requires Domain Review
- Available input types: Inline CSV/NDJSON, Artifact Upload later, Connector later
- Staged records count
- Incomplete records count
- Failed records count
- Merge proposal count
- "Start Import" action only when a real backend supports it
- "Open Domain Workspace" or "Open Domain Review" action

### 19.3 Required Wording Corrections
The UI must use safe wording that respects phase boundaries.
Unsafe wording to remove:
- "transferred to domain"
- "auto transfer"
- "publish readiness"
- "moved to domain"
- "published by import"

Safe wording to use:
- "ready for domain review"
- "proposal sent for review"
- "awaiting owning domain approval"
- "requires owning domain workflow"

Phase 06 never publishes, transfers, or writes directly to domain tables.

### 19.4 Queue & Job Operations
Phase 23 must eventually display queue jobs with the following statuses:
- QUEUED
- RUNNING
- PAUSED
- COMPLETED
- FAILED_RETRYABLE
- FAILED_PERMANENT
- CANCELLED
- DLQ

Future job control actions (pause, resume, cancel, replay) must each require:
- RBAC permission
- Confirmation modal
- Audit log entry

These controls affect import jobs only and must never publish domain records.

### 19.5 Source Registry & Connectors
The source/connector view must eventually display:
- sourceId
- displayName
- category
- accessClassification
- status
- connectorId
- connectorVersion
- lastCheckAt
- lastHttpStatus when available
- ETag / Last-Modified when available
- rate limit policy
- drift status

Potential future actions (test source, disable source, mark needs review, run import) require explicit implementation. Live external acquisition must not be enabled unless real compliant backend support exists, including robots.txt and ToS compliance, and no CAPTCHA/paywall/authentication bypass.

### 19.6 DLQ / Error Center
The Import Center must include an error center showing:
- batchId
- sourceId
- connectorId
- error code
- error message
- failedAt
- retry count
- recoverable / non-recoverable
- replay action when allowed

It must never expose secrets or full raw payloads.

### 19.7 Drift Alerts
The admin portal must display drift alerts:
- sourceId
- connectorId
- connectorVersion
- driftType
- severity
- detectedAt
- recommendedAction
- short evidence sample only

Future actions may include mark reviewed and disable connector. Drift detection must halt staging instead of allowing incorrect data to enter review.

### 19.8 Evidence & Confidence Viewer
Import review screens must show field-level evidence:
- fieldName
- extractedValue
- sourceId
- sourceUrl
- retrievedAt
- contentHash
- connectorVersion
- extractorType
- modelName if AI-assisted
- promptVersion if AI-assisted
- schemaVersion
- selectorOrJsonPath
- short evidenceSnippet
- confidenceScore
- validationResults

Explicit rule: `confidenceScore` never grants auto-publish or auto-merge authority.

### 19.9 Match / Merge Review UI
The Match/Merge Review UI must include:
- Review queue
- Side-by-side diff viewer (existing published record vs. imported proposed record)
- Field-level checkbox selection
- Conflict indicators
- Missing field indicators
- Completeness report
- Manual override with audit reason
- Approve/send-to-domain-workflow action only

Phase 23 must never call Phase 06 to publish records. Final publishing must happen only through the owning domain workflow.

### 19.10 Scheduled Import Preview
If the UI or document mentions scheduled imports, document it as:
- Preview / Future Capability only
- Disabled until real scheduling backend exists
- Must not appear operational until Redis/BullMQ or an approved scheduler is implemented

### 19.11 Strict Forbidden Claims
- No fake AI readiness
- No fake crawler readiness
- No fake trust percentages such as 95% or 100% Verified
- No auto-publish
- No auto-merge
- No direct domain writes from Phase 06
- No staged data in the public platform
- No source credentials displayed in the frontend
- No CAPTCHA, paywall, robots.txt, or authentication bypass

---

## 20. Study Destinations / Country Profiles Admin Workspace

### 20.1 Purpose
The Study Destinations admin workspace manages rich country-level study destination profiles built on top of Phase 07 Reference Data and later enriched by Phases 10 (Majors), 11 (Universities), 12 (Scholarships), 16 (CMS Editorial), 23 (Enterprise Administration Portal), and 24 (Public Platform). It is a unified persistent country profile page from the beginning.

### 20.2 Workspace Routes
- `/study-destinations`: The continent/country directory.
- `/study-destinations/:countryIso2Code`: The unified country profile.

### 20.3 Main Directory Page (`/study-destinations`)
The main list page provides an administrative directory of all country study destinations:
- **Search Capabilities:** Search by country name (Arabic and English), ISO2 code, ISO3 code, or geographical region.
- **Filters:**
  - Continent/Region filtering: All, Asia, Europe, North America, South America, Africa, Oceania.
- **Country Cards & Table Grid Item View:**
  - Show countries grouped/filterable by region/continent from Phase 07 ReferenceCountry.region/subregion.
  - Show simple country cards:
    - Country name
    - ISO2 / ISO3
    - Region / subregion
    - Default currency
    - Default language
    - Open Unified Country Profile button
- **Avoid overloading cards with fake completeness metrics.**

### 20.4 Unified Country Profile Page (`/study-destinations/:countryIso2Code`)
Every country profile must always contain the full future structure from the beginning. Empty/pending sections must exist. No fake data and no cross-phase API calls before their owning phases are implemented.

The country detail page must always display the complete destination profile structure.

#### A. Reference Data
Owned by Phase 07 and filled now:
- ISO2
- ISO3
- Country name
- Official name
- Region
- Subregion
- Default currency
- Default language
- Calling code
- Cities
- Flag/asset reference

#### B. Universities
Owned by Phase 11 and pending now:
- Linked universities
- Cities/campuses
- Programs
- Accreditation
- Featured universities
*Must show empty/pending state until Phase 11 is implemented. No fake universities.*

#### C. Majors
Owned by Phase 10 and pending now:
- Best majors for this country
- High-demand majors
- Market-aligned majors
- Featured majors
*Must show empty/pending state until Phase 10 is implemented. No fake majors.*

#### D. Scholarships
Owned by Phase 12 and pending now:
- Available scholarships
- Funding type
- Provider
- Deadlines/cycles
- Featured scholarships
*Must show empty/pending state until Phase 12 is implemented. No fake scholarships.*

#### E. Visa & Requirements
Owned by Phase 16 CMS and pending now:
- Student visa requirements
- Required documents
- Processing time
- Embassy/government links
*Must show empty/pending state until Phase 16 is implemented. No fake visa guidance.*

#### F. Cost of Living
Owned by Phase 16 CMS and pending now:
- Housing
- Food
- Transportation
- Monthly average
- Currency and notes
*Must show empty/pending state until Phase 16 is implemented. No fake costs.*

#### G. Student Life
Owned by Phase 16 CMS and pending now:
- Culture
- Safety
- Work while studying
- Student communities
- Healthcare/insurance
*Must show empty/pending state until Phase 16 is implemented. No fake editorial content.*

#### H. Official Links
Owned by Phase 16 CMS/Admin Review and pending now:
- Education portal
- Visa portal
- Government scholarship portals
- Official university directory
- Link status and last verified date
*Must show empty/pending state. No fake links.*

#### I. Evidence & Provenance
Future Phase 06 evidence only:
- sourceId
- sourceUrl
- contentHash
- retrievedAt
- evidenceSnippet
- confidenceScore
- validationResults
*Rules:*
- confidenceScore does not grant publish authority.
- Phase 06 cannot publish, promote, transfer, or write directly.
- *Show empty state now.*

#### J. Public Preview
Owned by Phase 24 and pending now:
- Shows how the country page will appear to students.
- Only approved/published data can appear.
- Staged, draft, unreviewed, or failed validation data must be hidden.
- *Show pending state now.*

#### K. Profile Readiness / Public Review
Administrative readiness section:
- Current status: Draft / Incomplete / Ready for Review / Published.
- Missing required sections.
- Ready for Public Review action.
- The action must be disabled until required sections are complete.
- Must not publish directly.
- Must not transfer directly to public platform.
- Required wording: "Ready for Public Review" (not: "Transfer to homepage", "Auto publish", "Promote to public").

### 20.5 Progressive Ownership Rule
- Each future phase fills its owned section progressively.
- Phase 07 only owns reference identity.
- Phase 23 only coordinates admin review.
- Phase 24 only renders approved public data.

### 20.6 Empty/Pending State Rule
- Empty sections are valid and expected.
- Empty sections must be visible.
- Use "Pending Phase X".
- Do not hide future sections.
- Do not use mock data.

### 20.7 Final Closure Rule
A country profile becomes eligible for public review only after its required sections are filled by their owning phases and explicitly approved.

---

## 21. Academic Taxonomy Admin Workspace (Phase 08)

### 21.1 Scope & Domain Responsibilities
Phase 08 owns the foundational academic taxonomy layer for MANARATAK 2.0:
- **Academic Fields & Disciplines:** Broad fields, narrow disciplines, program areas, and specialization categories.
- **Standard Classification Nodes:** Formal taxonomy codes and classification standards (e.g., ISCED-F 2013, CIP).
- **Hierarchy & DAG Polyhierarchy:** Parent-child edges, closure tables, path resolution, and strict cycle prevention.
- **Aliases & Localized Names:** Synonyms, alternate titles, multi-language localized representations (AR/EN).
- **Cross-Standard Mappings:** Explicit mappings between standards (e.g., ISCED to CIP) with equivalency levels (ExactMatch, BroadMatch, NarrowMatch).
- **Taxonomy Validation & Completeness:** Domain completeness rules, deterministic match key generation, and taxonomy review status.

### 21.2 Separation of Phase 08 Taxonomy vs. Phase 10 Academic Majors
- **Phase 08 Workspace (`/admin/academic-taxonomy`):** Manages raw classification nodes, taxonomy trees, ISCED/CIP codes, polyhierarchy edges, and cross-standard equivalencies. It is NOT the student-facing major catalog.
- **Phase 10 Workspace (`/admin/majors`):** Manages degree pathways, university major offerings, career outcome mappings, and public student-facing major profiles. Phase 10 builds on top of Phase 08 taxonomy nodes as a foundational reference.
- Under no circumstances should Phase 10 academic majors be created or edited inside the Phase 08 taxonomy administration workspace, nor should Phase 08 taxonomy nodes be confused with degree-granting majors.

### 21.3 Workspace Routes
- `/admin/academic-taxonomy`: Main taxonomy tree explorer and catalog page.
- `/admin/academic-taxonomy/:nodeId`: Taxonomy node detail, hierarchy, and mapping management page.

### 21.4 Main Explorer Page (`/admin/academic-taxonomy`)
The taxonomy administration list page provides an enterprise tree explorer and registry of all taxonomy nodes:
- **Taxonomy Tree / DAG Explorer:** Visual tree view with expand/collapse hierarchy navigation and depth indicators.
- **Standard Filter:** All, ISCED (ISCED-F 2013), CIP, Custom/National Standards.
- **Node Type Filter:** Field, Discipline, Program Area, Specialization Category, Standard Classification.
- **Status Filter:** `DRAFT`, `READY_TO_REVIEW`, `ACTIVE`, `ARCHIVED`.
- **Search Capabilities:** Search by canonical name, localized name (Arabic/English), alias/synonym, or standard code.
- **Data Integrity:** Real empty state when no taxonomy records exist. No mock taxonomy nodes or fake metrics.
- **Import Review Summary:** Displays staged import proposals only when Phase 08 import integration is active.

### 21.5 Taxonomy Node Detail Page (`/admin/academic-taxonomy/:nodeId`)
The node detail page provides a comprehensive multi-tab interface for taxonomy governance:
1. **Overview / Basic Data:** Node ID, standard code, canonical name, description, level depth, leaf status, and operational status.
2. **Hierarchy Relationships:** Primary parent node, secondary parent edges (polyhierarchy DAG), child nodes, and cycle detection validation status.
3. **Aliases & Synonyms:** Alternate terms, common search queries, and historical naming variations.
4. **Localized Names:** Official Arabic (`ar`) and English (`en`) titles and localized descriptions.
5. **Standards Metadata:** Standard authority, standard version, effective date, and schema compliance.
6. **ISCED/CIP Cross-Standard Mappings:** Target standard mappings, equivalency levels (`ExactMatch`, `BroadMatch`, `NarrowMatch`, `RelatedMatch`), and verification status.
7. **Validation & Completeness:** Domain completeness state (`COMPLETE`, `NEEDS_REVIEW`, `INCOMPLETE`), missing required metadata, and structural health checks.
8. **Import Evidence & Review:** Source provenance snippet, extraction URL, content hash, and connector metadata (populated via Phase 06 staging when applicable).
9. **Audit Log:** Immutable log of creation, metadata edits, hierarchy changes, mapping updates, and status transitions.

### 21.6 Administrative Action Governance
- **Allowed Actions:**
  - Create draft taxonomy node (`DRAFT` status).
  - Edit draft node metadata, canonical titles, and localized names.
  - Add or deprecate node aliases and synonyms.
  - Link parent/child hierarchy edges following mandatory cycle detection validation.
  - Define cross-standard mappings (e.g., ISCED to CIP) with equivalency level annotations.
  - Submit draft taxonomy nodes for review (`READY_TO_REVIEW` -> `ACTIVE`).
  - Archive obsolete taxonomy nodes via soft-delete/archive lifecycle policy.
- **Strictly Forbidden Actions:**
  - Hard deletion of active or historical taxonomy nodes.
  - Auto-publishing or auto-merging imported taxonomy records.
  - Direct database writes from Phase 06 import staging to taxonomy tables.
  - Fabricating fake taxonomy completeness scores or dummy nodes.
  - Managing Phase 10 student-facing degree majors within the Phase 08 taxonomy workspace.

### 21.7 Phase 06 Import Boundary
Phase 06 Import Foundation is restricted strictly to delivering raw extraction records, taxonomy candidate diffs, evidence snippets, and merge proposals.
Phase 08 retains sole ownership over:
- Deterministic match key generation for taxonomy nodes.
- Taxonomy tree hierarchy validation and closure table updates.
- Cycle prevention checks prior to committing parent-child edges.
- Alias collision and cross-standard mapping conflict detection.
- Domain completeness policy enforcement and active publication approval.

### 21.8 Relationship to Study Destinations (Phase 07 Reference Data, Phase 23 Admin Portal, and Phase 24 Public Platform)
- The Study Destinations country profile (`/study-destinations/:countryIso2Code`) displays featured and high-demand "Majors" from Phase 10.
- Phase 10 majors rely on Phase 08 taxonomy as their underlying discipline classification layer.
- Phase 08 itself is a pure taxonomy foundation and does not curate market-aligned or featured country major lists directly.



---

## 22. International Tests Admin Workspace (Phase 09)

Phase 09 owns the foundational metadata, scoring structures, and requirements for International Tests and standardized exams (e.g., IELTS, TOEFL, SAT, GMAT). It acts as the central registry for tests which downstream phases (Universities, Scholarships) will reference. 

**Important Base Rule:**
Every piece of information that appears on the public student-facing test page must first have a place in the admin control panel. It will not appear to students until it is explicitly approved and published.

**Paths & Routes:**
- `/admin/international-tests`
- `/admin/international-tests/:id`
- `/admin/imports/international-tests`

### 22.1 Unified International Test Profile

#### A. Test Page Header / رأس ملف الاختبار
- Test Name (Arabic/English) / اسم الاختبار عربي/إنجليزي
- Official Abbreviation / الاختصار الرسمي
- Test Category / نوع الاختبار
- Official Provider / المزود الرسمي
- Delivery Mode / طريقة التقديم
- Score Scale Range / نطاق الدرجة
- Availability Status / حالة التوفر
- Last Source Verification Date / آخر تحقق من المصدر
- Source Trust Level / مستوى ثقة المصدر
- Public Preview Link (only visible after PUBLISHED) / رابط المعاينة العامة بعد النشر فقط

#### B. Description & Use Cases / الوصف والاستخدامات
- Introductory Brief / نبذة تعريفية
- Test Purpose/Benefit / فائدة الاختبار
- Who Needs It / من يحتاجه
- Use Cases: University Admission, Scholarships, Language Proof, Professional Licensing, Immigration / الاستخدامات: قبول جامعي، منح، إثبات لغة، ترخيص مهني، هجرة
- Target Audience / الجمهور المستهدف
- Commonly Used Countries/Regions / الدول أو المناطق التي يستخدم فيها غالبًا
- Associated Languages / اللغات المرتبطة

#### C. Versions & Delivery Modes / النسخ وطريقة التقديم
- Variant Name / اسم النسخة
- Variant Description / وصف النسخة
- Delivery Mode / طريقة التقديم
- Active Status / حالة النشاط
- Variant-Specific Official URL / رابط رسمي خاص بالنسخة
- Administrative Notes on differences between variants / ملاحظات الفرق بين النسخ

#### D. Test Sections / أقسام الاختبار
- Section Name / اسم القسم
- Section Type / نوع القسم
- Duration / المدة
- Order / الترتيب
- Question Types / أنواع الأسئلة
- Number of Questions (if applicable) / عدد الأسئلة إن وجد
- Section Score (Min/Max) / درجة القسم من/إلى
- Total Test Duration / إجمالي مدة الاختبار
- Breaks (if applicable) / فترات الراحة إن وجدت

#### E. Score Scale & Equivalencies / نظام الدرجات والمعادلات
- Minimum and Maximum Score / الدرجة الدنيا والعليا
- Score Increment / معدل الزيادة
- Section Scores / درجات الأقسام
- Bands / Levels 
- Pass/Fail Rules / قواعد النجاح والرسوب
- CEFR Mapping 
- Equivalencies to other tests (e.g., IELTS vs TOEFL) / معادلات اختبارات أخرى مثل IELTS مقابل TOEFL
- Result Release Duration / مدة ظهور النتيجة
- Result Validity Period / مدة صلاحية النتيجة
- Methods for sending results to universities / طريقة إرسال النتائج للجامعات
- Score Reporting / Sending URL / رابط إرسال/تقرير الدرجات

#### F. Fees & Financial Policies / الرسوم والسياسات المالية
- Registration Fee / رسوم التسجيل
- Currency / العملة
- Regional Price Variation / اختلاف السعر حسب الدولة
- Late Registration Fee / رسوم التسجيل المتأخر
- Rescheduling Fee / رسوم تغيير الموعد
- Cancellation Fee / رسوم الإلغاء
- Price Validity Window / Last Price Update / مدة صلاحية السعر أو آخر تحديث للسعر
- **Disclaimer:** Phase 09 stores descriptive fee metadata only; actual payment execution is handled in Phase 19. / تنبيه واضح: Phase 09 يخزن رسوم وصفية فقط، والدفع الفعلي يخص Phase 19

#### G. Requirements & Policies / المتطلبات والسياسات
- Registration Requirements / متطلبات التسجيل
- ID / Passport Requirements / متطلبات الهوية أو الجواز
- Age Restrictions / قيود العمر
- Retake Policy / سياسة إعادة الاختبار
- Cancellation Policy / سياسة الإلغاء
- Rescheduling Policy / سياسة تغيير الموعد
- Special Needs Accommodations / تسهيلات ذوي الاحتياجات
- Test Day Conditions / شروط يوم الاختبار

#### H. Availability & Test Centers / التوفر ومراكز الاختبار
- Available Countries / الدول المتاحة
- Available Cities / المدن المتاحة
- Authorized Test Centers / مراكز الاختبار المعتمدة
- Online Availability / التوفر أونلاين
- Online Availability Regions / مناطق التوفر أونلاين
- Testing Windows / Sessions 
- Nearest Test Center (future calculation based on student location) / أقرب مركز اختبار لاحقًا حسب موقع الطالب
- **Rule:** Countries, cities, currencies, and languages are pulled from Phase 07 and must not be duplicated in Phase 09. / قاعدة: الدول والمدن والعملات واللغات تأتي من Phase 07 ولا تكرر داخل Phase 09

#### I. Official Links & Verification / الروابط الرسمية والتحقق
- Official Registration URL / رابط التسجيل الرسمي
- Official Test Information URL / رابط معلومات الاختبار
- Official Preparation URL / رابط التحضير الرسمي
- Score Reporting URL / رابط إرسال النتائج
- Source Name / اسم المصدر
- Source Type / نوع المصدر
- Last Verification Date / آخر تاريخ تحقق
- Link Status / حالة الرابط
- Source or Link Trust Level / مستوى ثقة الرابط أو المصدر

#### J. Preparation Materials & Assets / مواد التحضير والأصول
- Practice Tests / اختبارات تجريبية
- Sample Questions / أسئلة نموذجية
- PDF Files / Brochures / ملفات PDF / brochures
- Audio Samples / عينات صوتية
- Preparation Guides / أدلة تحضير
- Official External Links / روابط خارجية رسمية
- **Rule:** Saved files must only use Phase 05 AssetId. / ملفات محفوظة عبر Phase 05 AssetId فقط
- (Later Phase 13 will provide preparation courses) / دورات تحضيرية لاحقًا من Phase 13

#### K. Cross-Phase References / الربط بالمراحل الأخرى
- Universities accepting the test (Phase 11) / جامعات تقبل الاختبار من Phase 11
- Scholarships requiring the test (Phase 12) / منح تطلب الاختبار من Phase 12
- Preparation Courses (Phase 13) / دورات تحضيرية من Phase 13
- CMS Articles and Guides (Phase 16) / مقالات وأدلة CMS من Phase 16
- Student Tools (Phase 18) / أدوات طلابية من Phase 18
- Registration or Support Services (Phase 20) / خدمات تسجيل أو دعم من Phase 20
- **Rule:** These are references only. Do not duplicate data, and do not use fake numbers. / قاعدة: مراجع فقط، بدون نسخ بيانات، وبدون أرقام وهمية

#### L. Import, Evidence & Review / الاستيراد والأدلة والمراجعة
- Original Imported Name / الاسم الأصلي المستورد
- Normalized Canonical Name / الاسم الموحد
- Deterministic Key 
- Source ID 
- Source URL 
- Content Hash 
- Retrieved At 
- Evidence Snippet 
- Verification Results / نتائج التحقق
- Conflicting Fields / الحقول المتعارضة
- Merge Proposals / اقتراحات الدمج
- Review Status / حالة المراجعة
- **Rule:** Confidence or source trust must never cause automatic publishing. / قاعدة: الثقة أو confidence لا تعني نشر تلقائي

#### M. Missing Data & Readiness / النقص والجاهزية
- Missing Fields / الحقول الناقصة
- Missing Fees / الرسوم ناقصة
- Missing Registration Link / رابط التسجيل ناقص
- Outdated Price / السعر قديم
- Unofficial Source / المصدر غير رسمي
- Broken Link / الرابط لا يعمل
- Incomplete Data / البيانات غير مكتملة
- Readiness Statuses: `IMPORTED`, `INCOMPLETE`, `NEEDS_REVIEW`, `READY_TO_PUBLISH`, `PUBLISHED`, `REJECTED`, `ARCHIVED` / الحالات

#### N. Public Preview & Publishing / المعاينة والنشر
- Public preview of what the student will see. / معاينة عامة لما سيظهر للطالب
- Displays only approved data. / تعرض البيانات المعتمدة فقط
- Does not display staged, imported, or unreviewed data. / لا تعرض staged أو imported أو unreviewed
- Publish button is disabled until all conditions are met. / زر النشر لا يعمل إلا بعد اكتمال الشروط
- Public page link only appears when status is `PUBLISHED`. / رابط الصفحة العامة يظهر فقط عند PUBLISHED

#### O. Future Student-Facing Enhancements / إضافات لاحقة للطالب
- FAQ 
- Comparison (e.g., IELTS vs TOEFL vs Duolingo) / مقارنة IELTS vs TOEFL vs Duolingo
- 4 / 8 / 12 Week Preparation Plans / خطة تحضير 4 / 8 / 12 أسابيع
- Approximate Score Calculator / حاسبة درجة تقريبية
- Price Change or Registration Opening Alerts / تنبيهات تغير السعر أو فتح التسجيل
- Save Test to Favorites / حفظ الاختبار في المفضلة
- Share Page / مشاركة الصفحة

### 22.2 Explicit Strict Rules
- **No Fake Metrics:** Do not use hardcoded counts (e.g., Universities 180, Scholarships 42, Centers +1400).
- **No Auto-Publish:** Publishing must always be manual or explicitly authorized post-review.
- **No Direct Imports in Test Page:** Import actions must route to `/admin/imports/international-tests`.
- **No Payments in Phase 09:** Phase 09 does not handle actual payment transactions.
- **No Reference Data Duplication:** Do not duplicate countries, cities, currencies, or languages from Phase 07.
- **No Public Display without PUBLISHED:** The public view must strictly guard against non-published records.
