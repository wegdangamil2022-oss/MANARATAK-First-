# MANARATAK 2.0 - Careers & Alumni Admin Workspace Phase 21 Alignment Report

**Date:** July 28, 2026  
**Phase Target:** Phase 23 (Enterprise Administration Portal) & Phase 21 (Career Pathways & Alumni Outcomes)  
**Related Domain Phases:** Phase 15 (Student Workspace & Profile), Phase 05 (EAP Enterprise Assets Platform), Phase 17 (AI Intelligence Engine), Phase 24 (Public Platform Composition)  
**Status:** COMPLETE & VERIFIED  

---

## 1. Executive Summary

This report documents the design alignment and implementation of the **Career & Alumni Admin Workspace** within MANARATAK 2.0 Enterprise Administration Portal (`@manaratak/admin` / Phase 23).

The workspace establishes a secure, compliant control-plane surface for managing career opportunities, internships, graduate programs, student application submissions, alumni network profiles, bounded recruitment entity metadata, and market skill analytics, strictly adhering to cross-phase boundaries and governance safety rules.

---

## 2. Key Architecture & Domain Boundaries

1. **Phase 21 Ownership (Career & Alumni Platform):** Owns job/internship opportunities, career applications, alumni profiles, and bounded recruitment entity metadata.
2. **Phase 15 Ownership (Student Workspace & Profile):** Owns private student/customer identity data.
3. **Phase 05 Ownership (EAP Enterprise Assets Platform):** Owns CVs, portfolio documents, and uploaded attachments via EAP Asset Ref IDs (`eap_asset_cv_...`).
4. **Phase 17 Ownership (AI Intelligence Engine):** Owns AI recommendations, skill matching, and fit scoring (Phase 21 consumes results as read-only advisory outputs).
5. **Phase 23 Ownership (Enterprise Administration Portal):** Owns admin UI, opportunity review/approval/publishing, application queues, and career analytics.
6. **Phase 24 Ownership (Public Platform Composition):** Owns public career/job page rendering post-publishing (`/careers/opportunities/:id`).
7. **Strict Boundary Rules:**
   - **No Standalone Employers/Organizations Platform:** Bounded recruitment metadata is kept strictly lightweight under Phase 21 without establishing a separate B2B organization master.
   - **No Default Public Exposure of Private Alumni Data:** Private student and alumni data is never exposed publicly without explicit visibility consent settings (`PUBLIC_CONSENT`, `ALUMNI_NETWORK_ONLY`, `PRIVATE`).
   - **No Automatic Publishing:** Imported or created opportunities require explicit administrative review and approval before publishing.
   - **No Raw File URLs in UI:** All CVs and attachments referenced via Phase 05 EAP handles.
   - **No Mixing Career Opportunities with Paid Courses (Phase 13) or Paid Student Services (Phase 20).**

---

## 3. Implemented Components & Routes

### 3.1 Components Created & Modified
- `apps/web/src/features/admin-preview/AdminCareersPreviewPage.tsx`
  - Main Careers Workspace Page (`/admin/careers`).
  - **Top 6 KPI Summary Metrics**: Active opportunities, New applications, Opportunities needing review, Registered alumni profiles, Verified recruitment entities, Expired opportunities needing archive.
  - **6 Workstation Tabs**:
    - **سجل فرص التوظيف والتدريب (Opportunities Registry)**: Clean vertical table layout displaying Opportunity Title & Classification, Recruitment Entity Name, Location (Country/City/Remote), Application Deadline, Applicant Count, Publication Status Badge, and "View Details" button.
    - **طلبات التقديم والـ CVs (Applications Queue)**: Queue displaying Applicant/Student Ref, Opportunity Title, Phase 05 EAP CV Asset Handle (`eap_asset_cv_...`), Application Status (Submitted, Under Review, Shortlisted, Rejected, Withdrawn, Accepted), Submission Date, and Admin Notes.
    - **ملفات شبكة الخريجين (Alumni Profiles)**: Section displaying Student Ref, Graduation Year, Current Role & Industry, Skills Summary, Visibility Status, and Profile Completeness Percentage with privacy disclaimers.
    - **ميتا بيانات الجهات التوظيفية (Recruitment Entity Metadata)**: Bounded metadata view displaying Entity Name, Entity Type, Country, Website, Verification Status, Related Opportunities Count, and Source Trust Level.
    - **المراجعة والنشر (Review & Publishing)**: Dedicated moderation queue for opportunities requiring explicit admin review and approval.
    - **تحليلات المهارات وسوق العمل (Career Analytics)**: Applications by opportunity type, most requested skills, opportunities by country, expired vs active opportunities, alumni profile completion, and Phase 17 AI recommendation coverage (read-only advisory output).

- `apps/web/src/features/admin-preview/AdminCareerOpportunityDetailPage.tsx`
  - Unified Opportunity Detail Page (`/admin/careers/opportunities/:id`).
  - Displays Opportunity Title (Bilingual), Description, Type, Bounded Recruitment Entity Metadata, Location & Remote status, Required Skills, Eligibility Requirements, Application Deadline, Application Link/Internal Mode, Publication Status, Official Source Reference, Applicant Count, Missing Fields, Phase 17 AI Match Score & Advisory, and Audit History Timeline.
  - **Safe Administrative Actions Bar**:
    - Edit opportunity metadata
    - Approve & Publish opportunity
    - Unpublish / Suspend opportunity
    - Reject opportunity
    - Archive opportunity
    - Fetch missing fields from official source
    - Open applicant submissions queue
    - Open public page post-publishing (`/careers/opportunities/:id`)

### 3.2 Registered Router Routes
- `/admin/careers` -> `AdminCareersPreviewPage`
- `/admin/careers/opportunities/:id` -> `AdminCareerOpportunityDetailPage`

---

## 4. Summary of Verification & Quality Assurance

- **Build Status (`compile_applet`):** PASS - Clean build with zero TypeScript compilation errors.
- **Lint Status (`lint_applet`):** PASS - Clean lint with 0 ESLint warnings or errors.
- **RTL & Bilingual Support:** Fully verified with Arabic default RTL layout and English text handling.

---

## 5. Documentation Alignment

The following Phase 23 specification documents have been updated:
1. `docs/phases/phase-23-enterprise-administration-portal/phase-23-01-enterprise-administration-portal-architecture-specification.md` (Added Section 23.A.14)
2. `docs/phases/phase-23-enterprise-administration-portal/phase-23-02-enterprise-administration-portal-structure-contracts.md` (Added Section 23.B.16 TypeScript Contracts)
3. `docs/phases/phase-23-enterprise-administration-portal/phase-23-03-enterprise-administration-portal-workflows-operational-experience.md` (Added Section 23.C.20 Operational Workflows)

---

**Approval:** Chief Enterprise Architect & ARB  
**Status:** APPROVED & DEPLOYED IN PREVIEW
