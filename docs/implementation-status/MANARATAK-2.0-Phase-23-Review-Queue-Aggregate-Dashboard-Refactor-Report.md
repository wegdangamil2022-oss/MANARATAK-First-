# MANARATAK 2.0: Phase 23 Review Queue Aggregate Dashboard Refactor Report

**Document ID:** MANARATAK-20-PHASE-23-REVIEW-QUEUE-REFACTOR-REPORT  
**Date:** July 27, 2026  
**Phase:** Phase 23 — Enterprise Administration Portal  
**Status:** Completed & Verified  

---

## 1. Executive Summary

In accordance with Phase 23 Enterprise Administration Portal governance, the Admin Review Queue (`/admin/review-queue`) has been fully refactored from a duplicate record management interface into an **Aggregate Pending-Work Control-Plane Dashboard** ("نظرة عامة على قائمة المراجعة").

### Architectural Philosophy
Detailed content review, record editing, status publishing, bulk updates, and deletion workflows belong exclusively within their respective domain admin workspaces:
- **Scholarships:** `/admin/scholarships`
- **Universities:** `/admin/universities`
- **Majors:** `/admin/majors`
- **Courses:** `/admin/courses`
- **International Tests:** `/admin/international-tests`
- **Services:** `/admin/services`
- **CMS/Articles:** `/admin/cms`

The Review Queue serves purely as a **read-only monitoring and routing overview** that summarizes pending items, visualizes bottlenecks across platform domains, and directs administrators to the authoritative domain admin workspace for execution.

---

## 2. Removals & Deprecations

The following dangerous, misleading, or duplicate record management UI elements were **completely removed** from `/admin/review-queue`:

| Removed Feature / Action | Reason for Removal |
|---|---|
| **Direct Edit Buttons** | Edits must occur inside domain admin workspaces to preserve domain validation rules. |
| **Delete Buttons** | Deletion from an aggregate queue causes accidental data loss and breaks audit compliance. |
| **Publish / Activate-All Actions** | Publishing requires domain-specific quality checks in domain workspaces. |
| **"Accept All Completed" Bulk Action** | Risky mass approvals without domain context violate enterprise maker-checker rules. |
| **Direct Record Approval / Rejection Forms** | Record lifecycle changes are strictly delegated to domain admin controllers. |
| **Duplicate Record Editing Modals** | Prevents interface fragmentation and state divergence across admin views. |

---

## 3. Additions & Enhancements

A dedicated aggregate dashboard component was created at `apps/web/src/features/admin-preview/AdminReviewQueuePreviewPage.tsx` featuring:

### A. High-Level Summary Metrics
- **Total Pending Review** (`إجمالي بانتظار المراجعة`): Centralized counter of pending work.
- **Needs Translation** (`يحتاج ترجمة`): Count of untranslated items requiring editorial attention.
- **Missing Required Fields** (`حقول مطلوبة ناقصة`): Count of records failing minimum data completeness checks.
- **Ready to Publish** (`جاهز للنشر`): Count of records passing automated checks awaiting final domain approval.
- **Source Verification Required** (`يحتاج تحقق من المصder`): Count of imported items flagged for source trust review.
- **Recently Imported (Unreviewed)** (`مستورد حديثاً لم يراجع`): Unprocessed import records.

### B. Aggregate Domain Summary Cards
Seven domain cards representing the platform catalog modules:
1. **Scholarships** (`المنح الدراسية`) → links to `/admin/scholarships`
2. **Universities** (`الجامعات`) → links to `/admin/universities`
3. **Majors & Disciplines** (`التخصصات الأكاديمية`) → links to `/admin/majors`
4. **Courses & Training** (`الدورات والبرامج`) → links to `/admin/courses`
5. **International Tests** (`الاختبارات الدولية`) → links to `/admin/international-tests`
6. **Educational Services** (`الخدمات التعليمية`) → links to `/admin/services`
7. **CMS Articles & Content** (`المقالات والمحتوى`) → links to `/admin/cms`

Each card presents pending count, reason breakdown pill badges, and an explicit **"Open Workspace" / "فتح اللوحة"** button.

### C. Review Reasons Breakdown Matrix
Interactive metric cards allowing administrators to filter pending work by review reason:
- Needs Translation (`يحتاج ترجمة`)
- Missing Required Fields (`حقول مطلوبة ناقصة`)
- Ready to Publish (`جاهز للنشر`)
- Source Verification Required (`يحتاج تحقق من المصدر`)
- Recently Imported Unreviewed (`مستورد حديثاً لم يراجع`)

### D. Multi-Axis Safe Read-Only Filters
- **Domain Filter:** All Domains, Scholarships, Universities, Majors, Courses, Tests, Services, CMS.
- **Reason Filter:** All Reasons, Needs Translation, Missing Required Fields, Ready to Publish, Source Verification, Recently Imported.
- **Priority Filter:** All Priorities, High (`عالية`), Medium (`متوسطة`), Low (`منخفضة`).
- **Source Filter:** All Sources, Automated Import, Manual Entry, Partner Feed.
- **Age Filter:** All Ages, Today, Last 3 Days, Last 7 Days, Older than 7 Days.

### E. Read-Only Pending Work Queue Table & Action Routing
Each row displays:
- Record title and item description
- Domain Tag with icon
- Review Reason Badge with color code
- Priority indicator
- Source type badge
- Item age
- **Primary Action:** `Open in Workspace` (`فتح في لوحة المجال`) button routing directly to `/admin/{domain}`.

### F. Read-Only Operational Governance Banner
A persistent notice banner clarifying that `/admin/review-queue` is a read-only control plane and that content modification takes place inside domain workspaces.

---

## 4. Component & Layout Structure

```
+-----------------------------------------------------------------------------------+
|  [Header] Review Queue Overview / نظرة عامة على قائمة المراجعة                       |
|  Central control-plane overview of pending work across platform domain modules     |
+-----------------------------------------------------------------------------------+
|  [Governance Banner] Notice: Read-only aggregate overview. Content editing,       |
|  approval, publishing, import, and deletion operations occur in domain workspaces |
+-----------------------------------------------------------------------------------+
|  [Summary Metric Grid]                                                            |
|  +--------------------+ +--------------------+ +--------------------+             |
|  | Total Pending: 44  | | Needs Trans: 14   | | Missing Fields: 12 |             |
|  +--------------------+ +--------------------+ +--------------------+             |
|  | Ready Publish: 10  | | Source Check: 8    | | Recent Imports: 18 |             |
|  +--------------------+ +--------------------+ +--------------------+             |
+-----------------------------------------------------------------------------------+
|  [Aggregate Review Status by Domain]                                             |
|  +------------------+ +------------------+ +------------------+                   |
|  | Scholarships (12)| | Universities (8) | | Majors (5)       | ... [7 Domains]   |
|  | [Open Workspace] | | [Open Workspace] | | [Open Workspace] |                   |
|  +------------------+ +------------------+ +------------------+                   |
+-----------------------------------------------------------------------------------+
|  [Review Reasons Breakdown]                                                       |
|  [ Needs Translation (14) ] [ Missing Fields (12) ] [ Ready to Publish (10) ]... |
+-----------------------------------------------------------------------------------+
|  [Filter Bar] Domain | Reason | Priority | Source | Age                           |
+-----------------------------------------------------------------------------------+
|  [Read-Only Pending Work Queue]                                                   |
|  Item Title                    | Domain       | Reason         | Priority | Action|
|  ------------------------------|--------------|----------------|----------|-------|
|  Oxford Excellence Scholarship | Scholarships | Needs Trans    | High     | [Open]|
|  King Fahd University Profile  | Universities | Missing Fields | Medium   | [Open]|
|  Advanced IELTS Bootcamp       | Courses      | Ready Publish  | High     | [Open]|
+-----------------------------------------------------------------------------------+
```

---

## 5. Routing & Read-Only Confirmation

1. **Router Wiring (`apps/web/src/router/index.tsx`):**
   - Route path `admin/review-queue` mounts `<AdminReviewQueuePreviewPage />`.
   - `AdminGenericPreviewPage` includes a delegation fallback that renders `<AdminReviewQueuePreviewPage />` if `titleKey === 'admin_review_queue'`.

2. **Action Routing Verification:**
   - Every pending item's action button renders a `<Link to="/admin/{domain}">` element with `Open in Workspace` (`فتح في لوحة المجال`) text.
   - Domain paths target `/admin/scholarships`, `/admin/universities`, `/admin/majors`, `/admin/courses`, `/admin/international-tests`, `/admin/services`, and `/admin/cms`.

3. **Read-Only Verification:**
   - Checked component code for `DELETE`, `PUT`, `POST`, `PATCH`, direct state mutation, or inline editing forms: **NONE EXIST**.
   - Checked component code for bulk approval or mass mutation buttons: **NONE EXIST**.

---

## 6. Internationalization (i18n) Synchronization

Added comprehensive bilingual keys to both `apps/web/src/i18n/ar.ts` and `apps/web/src/i18n/en.ts`:
- `review_queue_overview`
- `review_queue_overview_desc`
- `pending_work`
- `open_in_workspace`
- `needs_translation`
- `missing_required_fields`
- `ready_to_publish`
- `source_verification_required`
- `recently_imported_not_reviewed`
- `total_pending_review`
- `aggregate_domain_cards`
- `review_reasons_breakdown`
- `recent_pending_work_list`
- `filter_by_domain` / `reason` / `priority` / `source` / `age`
- `priority_high` / `medium` / `low`
- `read_only_overview_banner`
- `no_pending_work_matching_filters`

---

## 7. Phase 23 Architecture Documentation Updates

Updated three canonical Phase 23 architecture specification files:
1. `docs/phases/phase-23-enterprise-administration-portal/phase-23-01-enterprise-administration-portal-architecture-specification.md`:
   - Updated Section 23.A.4 to define Module 2 as an aggregate pending-work control-plane view.
2. `docs/phases/phase-23-enterprise-administration-portal/phase-23-02-enterprise-administration-portal-structure-contracts.md`:
   - Added `IReviewQueueAdminView` contract specification and explicit Review Queue governance rules in Section 23.B.9.
3. `docs/phases/phase-23-enterprise-administration-portal/phase-23-03-enterprise-administration-portal-workflows-operational-experience.md`:
   - Added Section 23.C.4.1 specifying Review Queue aggregate control-plane workflow rules, domain handoffs, and read-only constraints.

---

## 8. Verification & Build Confirmation

| Verification Tool | Status | Details |
|---|---|---|
| **TypeScript Compilation** (`compile_applet`) | **PASSED** | Applet builds cleanly with zero errors. |
| **Code Quality Linter** (`lint_applet`) | **PASSED** | ESLint executed with 0 errors and 0 warnings. |
| **Local System Verification** (`npm run verify:local`) | **PASSED** | Monorepo build, test, and lint pipelines succeeded. |

---

**Conclusion:** The Phase 23 Review Queue refactoring is fully implemented, verified, and aligned with MANARATAK 2.0 enterprise governance standards.
