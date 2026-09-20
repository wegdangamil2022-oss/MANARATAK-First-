# MANARATAK 2.0: Majors Admin Workspace & Detail UX Phase 23 Alignment Report

**Document ID:** REP-PHASE-23-MAJORS-ADMIN-UX  
**Status:** Completed & Verified  
**Phase:** Phase 23 (Enterprise Administration Portal), Phase 10 (Majors & Specializations) & Phase 08 (Academic Taxonomy & Classifications)  
**Date:** July 28, 2026  

---

## 1. Executive Summary
This report documents the architectural alignment and comprehensive implementation of the **Majors Admin Workspace (`/admin/majors`)**, the introduction of the unified **Major Detail Page (`/admin/majors/:id`)**, separation from the **Majors Import Center (`/admin/imports/majors`)**, and the update of **Phase 23 documentation**.

---

## 2. Key Enhancements & Implementation Details

### A. Simplified List Layout (`/admin/majors`)
- Transitioned academic majors display to a lightweight, mobile-first **vertical administrative list/table layout** designed for fast scanning.
- Each row presents:
  - Major Display Name (Arabic/English)
  - Degree Level (Bachelor, Master, PhD, Diploma)
  - College / Academic Field (e.g. Engineering, Computer Science, Business)
  - Classification Code (CIP / ISCED)
  - Job Demand Level (High / Medium / Low)
  - Lifecycle status badge
  - Quick action: **View Details** (routing to `/admin/majors/:id`).
- Explicitly excluded from main list view to prevent clutter: long skill lists, career outcome details, related majors, offering universities list, scholarships, courses, import/merge history, source details, and direct delete buttons.

### B. Top Statistics Counters (8 Metrics)
Added and verified 8 explicit dashboard counters matching governance requirements:
1. All Majors (`كل التخصصات`)
2. Imported Awaiting Review (`مستوردة بانتظار مراجعة`)
3. Missing Data (`ناقصة البيانات`)
4. Needs Translation (`تحتاج ترجمة`)
5. Classified / Mapped (`مصنفة / مرتبطة`)
6. Ready to Publish (`جاهزة للنشر`)
7. Published (`منشورة`)
8. Archived (`مؤرشفة`)

### C. Import Center Routing Separation
- The "Open Majors Import Center" action routes directly to `/admin/imports/majors` (Majors Import Center).
- The Majors Admin Workspace does not execute raw taxonomy ingestion or background CIP/ISCED syncing directly from the list view.

### D. Unified Major Details Page (`/admin/majors/:id`)
- Added a full profile view displaying Arabic name, English name, original imported/source name, degree level, college/field, CIP code, ISCED code, source classification system, student-friendly description, acquired skills, expected courses/typical subjects, career paths, related jobs, related majors, offering universities count, linked scholarships count, recommended courses, source references, missing fields, translation status, import/merge history, and admin audit history.

### E. Admin Action Bar & Lifecycle Governance
- Top action bar featuring: Edit, Approve (`اعتماد`), Mark Ready to Publish (`جاهز للنشر`), Publish (`نشر`), Unpublish (`إلغاء النشر`), Reject (`رفض`), Archive (`أرشفة`), Fetch Missing Fields from Trusted Source (`جلب النواقص من مصدر موثوق`), and Suggest Student-Friendly Description (`اقتراح وصف مبسط للطلاب`).
- Strict rules enforced: **No auto-publish**. Public page links appear **only** when status is Published. Dangerous actions require confirmation.

### F. "Fetch Missing Fields from Trusted Source" Action
- Added visible button: `"Fetch Missing Fields from Trusted Source"` / `"جلب النواقص من مصدر موثوق"`.
- Checks trusted major/classification sources (CIP, ISCED, official program catalogs) and suggests missing fields only (classification code, academic field, degree level mapping, description, acquired skills, career outcomes, related majors, typical courses).
- Features Arabic safety notice: *"سيتم اقتراح إكمال الحقول الناقصة فقط، ولن يتم استبدال البيانات التي تمت مراجعتها دون موافقة صريحة منك."*
- Staged preview modal displaying suggested additions without silently overwriting reviewed data.

### G. AI Student-Friendly Description Suggestion (Phase 17)
- Added visible button: `"Suggest Student-Friendly Description"` / `"اقتراح وصف مبسط للطلاب"`.
- Invokes Phase 17 to generate a draft description only. Never publishes automatically.
- Displays badge *"AI Draft - Requires Review"* and Arabic notice: *"مسودة تم إنشاؤها عبر الذكاء الاصطناعي. تتطلب مراجعة إدارية قبل النشر."*
- Requires manual admin review and approval before becoming active.

### H. Duplicate & Safe Merge Visibility
- Displays original source titles versus cleaned canonical titles.
- Displays duplicate status (`new`, `duplicate_skipped`, `existing_enriched`), merged fields, and protected reviewed fields.

### I. Empty State
- When no majors exist, shows:
  - "No majors found" / "لم يتم العثور على تخصصات"
  - Button: "Add Major" / "إضافة تخصص"
  - Button: "Open Majors Import Center" / "فتح مركز استيراد التخصصات" (routing to `/admin/imports/majors`).

---

## 3. Documentation Alignment
Updated the three core Phase 23 specification documents to incorporate Majors Admin Workspace rules and boundaries:
- `/docs/phases/phase-23-enterprise-administration-portal/phase-23-01-enterprise-administration-portal-architecture-specification.md`: Added Majors Admin Workspace & Import Center Boundaries specification.
- `/docs/phases/phase-23-enterprise-administration-portal/phase-23-02-enterprise-administration-portal-structure-contracts.md`: Added `IAdminMajorListItem`, `IAdminMajorDetail`, and `IAdminMajorActionCommand` TypeScript interfaces.
- `/docs/phases/phase-23-enterprise-administration-portal/phase-23-03-enterprise-administration-portal-workflows-operational-experience.md`: Added Section `23.C.13 Majors Admin Workspace & Import Center Workflow`.

---

## 4. Verification Results
- **TypeScript & Build:** `npm run build` executed and passed cleanly.
- **Linter:** `npm run lint` executed and passed with 0 errors.
- **Test Suite:** `npm run test` executed and passed with 100% success rate across all test suites.

---

**Report Sign-off:** Enterprise Architecture Team & Lead Frontend Developer  
**Status:** ALL REQUIREMENTS SATISFIED & BASELINE VERIFIED
