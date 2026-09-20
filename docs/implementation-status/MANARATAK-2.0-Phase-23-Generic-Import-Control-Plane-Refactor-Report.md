# MANARATAK 2.0: Phase 23 Generic Import Control Plane Refactor Report

**Document ID:** MANARATAK-20-PHASE-23-GENERIC-IMPORT-CONTROL-PLANE-REFACTOR-REPORT  
**Date:** July 27, 2026  
**Phase:** Phase 23 — Enterprise Administration Portal  
**Status:** Completed & Verified  

---

## 1. Executive Summary

In accordance with Phase 23 Enterprise Administration Portal governance and Phase 06 Ingestion Architecture, the Admin Import Management page (`/admin/imports`) has been completely refactored from a single-domain (scholarship-specific) view into a **Generic, Multi-Domain Import Control Plane**.

### Architectural Boundaries
1. **Phase 06 Ingestion Engine:** Owns generic ingestion mechanics only (CSV/JSON parsing, source connectors, batches, record staging, row-level errors, retries, audit logs).
2. **Domain Platform Modules (Phases 12, 13, 14, 15, 16, 17):** Own domain field schemas, validation rules, completeness classification, deduplication, domain workspace transfer handoffs, and public publishing.
3. **Phase 23 Admin Portal:** Owns control-plane UI visualization, source connector management, batch auditing, and navigation routing to domain admin workspaces.

---

## 2. Changes Implemented in `/admin/imports`

### A. Page Header & Top Summary Metrics
- **Header & Subtitle:** Updated to generic title "Import Management" / "إدارة الاستيراد" with explicit subtitle clarifying multi-domain data ingestion, source connectors, batch tracking, and domain transfers.
- **Architecture Boundary Banner:** Displays persistent warning clarifying Phase 06 vs Domain Phase responsibilities.
- **Top Summary Metric Grid (6 Cards):**
  1. `Total Import Batches` (`إجمالي دفعات الاستيراد`)
  2. `Total Imported Records` (`إجمالي السجلات المستوردة`)
  3. `Failed / Error Rows` (`الأسطر الفاشلة / الأخطاء`)
  4. `Transferred to Domain` (`تم الترحيل إلى لوحة المجال`)
  5. `Needs Review / Incomplete` (`بحاجة لمراجعة / غير مكتمل`)
  6. `Active Sources & Connectors` (`المصادر والموصلات النشطة`)

### B. Multi-Domain Import Cards (7 Platform Domains)
Added 7 dedicated domain import cards representing all catalog modules:
1. **Scholarships** (`المنح الدراسية`) → `/admin/scholarships`
2. **Universities** (`الجامعات`) → `/admin/universities`
3. **Majors & Disciplines** (`التخصصات الأكاديمية`) → `/admin/majors`
4. **Courses & Training** (`الدورات والبرامج`) → `/admin/courses`
5. **International Tests** (`الاختبارات الدولية`) → `/admin/international-tests`
6. **Educational Services** (`الخدمات التعليمية`) → `/admin/services`
7. **CMS Articles & Content** (`المقالات والمحتوى CMS`) → `/admin/cms`

Each card presents:
- Domain Icon & Title
- Supported Input Badges: `CSV/JSON`, `Paste Data`, `Official URL`, `Registered Source`
- Statistics Grid: Imported Count, Incomplete Count, Transferred Count, Failed Count
- Primary Action: `Start Import` (`بدء الاستيراد`) -> Opens Generic Import Modal
- Workspace Action: `Open Domain Workspace` (`فتح لوحة المجال`) -> Links directly to `/admin/{domain}`

### C. Multi-Method Import Modal
The generic import modal supports 5 ingestion methods:
1. **CSV / JSON File Upload:** File drag-and-drop parsing.
2. **Paste Data:** Raw CSV/JSON text payload area.
3. **Official URL Import:**
   - Accepts 1 Official URL.
   - Stores URL as staged source reference.
   - Displays required notice:
     - EN: *"URL extraction is staged for review; automated extraction will be added later."*
     - AR: *"تم تجهيز رابط المصدر للمراجعة؛ سيتم إضافة الاستخراج الآلي لاحقًا."*
4. **Registered Source Connector:** Select from trusted institutional feeds.
5. **Demo Dataset:** Loads clean sample structured records for safe domain validation testing.

### D. Data Sources & Connectors (DCP Ingestion Framework)
- Displays trusted institutional source connectors (Government, University, Foundation, Partner Platform, Manual).
- **Source Trust Score Model:**
  - `100%`: Official Government Sources (e.g. Saudi MOE)
  - `95%`: Official University & Foundation Feeds (e.g. DAAD, QS)
  - `85%`: Trusted Learning Platforms (e.g. Coursera)
  - `<80%`: known sources requiring verification warnings in the import modal.
- Connector Actions: `Test Source`, `Enable/Disable`, `Import From Source`.
- Add Connector Modal: Safe creation of source connector references.

### E. Import Operations Center (IOC)
Read-only operational audit table providing real-time visibility across all ingestion jobs:
- Filterable by Domain and Status (All, Success, Partial Success, Failed, Running, Queued).
- Columns: Batch ID/Name, Target Domain, Source System, Status Badge, Start Time, Imported Count, Failed Count, Transferred Count, `View Details` Action.
- **Batch Details Modal:** Displays staged record items, error logs, and "Transfer to Domain Workspace" action.

### F. Scheduled Imports (Preview / Coming Soon)
- Read-only preview card describing future recurring background ingestion schedules (Daily/Weekly frequency, target sources, max retry limits).
- Includes explicit notice: *"Scheduled background imports are in preview mode. Recurring auto-sync jobs require explicit platform configuration."*

---

## 3. Features Intentionally Excluded for Safety

To prevent operational accidents and maintain MANARATAK 2.0 governance:

| Excluded Feature | Architectural Safety Reason |
|---|---|
| **Auto-Publishing** | Records must be reviewed and published manually from domain admin workspaces. |
| **Uncontrolled Web Crawling / Multi-Page Scraping** | URL imports store 1 staged URL reference only to prevent illegal or noisy web scraping. |
| **Global Unsafe Actions ("Run All", "Stop All", "Pause All")** | Mass batch operations risk unintended server overload and data corruption. |
| **Direct Record Deletion Without Confirmation** | Ingestion audit trails must be preserved for compliance. |
| **Unmonitored Background Cron Timers** | Scheduled sync is rendered as Preview Only until background worker infra is configured. |
| **Visible "Promote" Terminology** | Replaced with explicit `Transfer to Domain Workspace` (`ترحيل إلى لوحة المجال`). |

---

## 4. Domain Workspace Handoff & Routing Verification

All domain import cards and batch detail links route directly to their authoritative `/admin/...` workspace:

| Domain | Route | Action Button Label |
|---|---|---|
| Scholarships | `/admin/scholarships` | `Open Domain Workspace` (`فتح لوحة المجال`) |
| Universities | `/admin/universities` | `Open Domain Workspace` (`فتح لوحة المجال`) |
| Majors | `/admin/majors` | `Open Domain Workspace` (`فتح لوحة المجال`) |
| Courses | `/admin/courses` | `Open Domain Workspace` (`فتح لوحة المجال`) |
| International Tests | `/admin/international-tests` | `Open Domain Workspace` (`فتح لوحة المجال`) |
| Educational Services | `/admin/services` | `Open Domain Workspace` (`فتح لوحة المجال`) |
| CMS Articles | `/admin/cms` | `Open Domain Workspace` (`فتح لوحة المجال`) |

---

## 5. Verification & Compliance Checklist

| Test / Check | Result | Proof |
|---|---|---|
| **TypeScript Compilation** (`compile_applet`) | **PASSED** | Applet builds cleanly with zero errors. |
| **Code Quality Linter** (`lint_applet`) | **PASSED** | ESLint executed with 0 errors and 0 warnings. |
| **No Scholarship Isolation** | **VERIFIED** | `/admin/imports` supports all 7 platform catalog domains. |
| **No Auto-Publishing** | **VERIFIED** | Staged records transfer to domain workspace in draft/review state. |
| **No Raw i18n Keys** | **VERIFIED** | All UI strings use `t('key')` with full English & Arabic fallbacks. |

---

**Conclusion:** The Phase 23 Generic Import Control Plane refactoring is complete, fully verified, and compliant with MANARATAK 2.0 enterprise architecture standards.
