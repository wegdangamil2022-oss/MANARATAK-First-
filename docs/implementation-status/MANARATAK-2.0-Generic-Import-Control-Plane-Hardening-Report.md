# MANARATAK 2.0 - Generic Import Control Plane Hardening Report

## Overview
This report documents the review, hardening, and validation of the **Generic Import Control Plane (Phase 06)**. All changes were implemented with extreme care, ensuring backward compatibility, absolute type-safety, robust security, and seamless internationalization in both Arabic and English modes.

---

## 1. Architectural Changes & Refactoring

### Misleading Use-Case Rename (Backward-Compatible Refactoring)
* **Problem**: The import use-case function in `/packages/application/src/import-foundation/use-cases/ImportAdminUseCases.ts` was named `importScholarshipData`, which became semantically misleading once generic domain ingestion was added (for Universities, Majors, International Tests, Courses, and Services).
* **Solution**:
  1. Renamed the core generic execution method to `importData` inside `ImportAdminUseCases.ts`.
  2. Implemented a fully backward-compatible alias method `importScholarshipData` inside `ImportAdminUseCases` which simply forwards to the new `importData` method.
  3. Modified `/apps/api/src/presentation/api/router/ImportAdminRouter.ts` (POST `/admin/imports`) to cleanly execute the new generic `importData` use-case.
  
```typescript
// Refactored in ImportAdminUseCases.ts:
async importData(input: {
  dataText: string;
  sourceSystem?: string;
  dataType?: string;
}) {
  // Core generic import logic supporting different data types...
}

// Backward-compatible wrapper:
async importScholarshipData(input: {
  dataText: string;
  sourceSystem?: string;
  dataType?: string;
}) {
  return this.importData(input);
}
```

---

## 2. Non-Scholarship Promotion Safety

### UI Constraints on Ingested Record Promotion
* **Rule**: Records for domains other than `SCHOLARSHIPS` (e.g., Universities, Majors, International Tests, Courses, Services) must not show active "Promote" buttons until real, secure domain promotion handlers are fully implemented.
* **Implementation**:
  - In `/apps/admin/src/pages/ImportAdminPage.tsx`, added a dynamic rule evaluating the domain type (`domainLabel`).
  - If the domain is not `SCHOLARSHIPS` and the record is not already promoted:
    - Renders a muted, disabled "Promote" button with `cursor-not-allowed` styles.
    - Displays a helper tag: **"Requires domain integration"** (translated in Arabic as **"يتطلب ربط المجال"**).
  - This ensures administrative safety and prevents accidental promotions of partially implemented domains.

---

## 3. Scholarship Admin Navigation Fix

### Navigation Routing Integrity
* **Problem**: In `/apps/admin/src/pages/ScholarshipListPage.tsx`, clicking the "Review" action navigated to `/scholarships/${item.id}`. In a production multi-app context, absolute navigation to `/scholarships/...` would escape the admin portal and point to the public web app routes.
* **Solution**:
  1. Updated `/apps/admin/src/pages/ScholarshipListPage.tsx` to navigate to `/admin/scholarships/${item.id}` for all admin actions.
  2. Added explicit router path support inside the React Router configuration in `/apps/admin/src/App.tsx` for `/admin/scholarships` and `/admin/scholarships/:id` (pointing to the same `ScholarshipListPage` and `ScholarshipDetailPage` components).
  3. This ensures admin details actions are fully self-contained within the Admin Shell without leaking context to public paths.

---

## 4. Internationalization & Translation Verification

Verified that both Arabic and English localizations are 100% complete with zero raw key leakage or untranslated fallback strings:

### English Translations (`en.ts` additions)
* `"admin_imports"`: "Import Management"
* `"import_boundary_note"`: "Phase 06 owns generic import mechanics such as CSV/JSON parsing, batch creation, records, errors, and retries. Domain validation and promotion rules remain owned by each target domain."
* `"start_import"`: "Start Import"
* `"scholarship_imported_not_show_here_helper"`: "Imported records do not appear here until promoted into scholarship catalog records."
* `"promotion_flow_clarity_text"`: "Promotion Flow: Imported record -> Promote -> Scholarship entity -> Review/Ready -> Publish -> Only Published scholarships appear publicly."
* `"all_domains"`: "All Domains"
* `"domain_scholarships"`: "Scholarships"
* `"domain_universities"`: "Universities"
* `"domain_majors"`: "Majors"
* `"domain_tests"`: "International Tests"
* `"domain_courses"`: "Courses"
* `"domain_services"`: "Services"
* `"target_domain"`: "Target Domain"
* `"import_control_plane_desc"`: "Control plane visibility for data import batches, validation logs, error queues, and publication promotion."
* `"upload_import_batch"`: "Upload Import Batch"
* `"paste_data_below"`: "Paste CSV or JSON payload below:"
* `"select_target_domain"`: "Select Target Domain:"
* `"insert_sample_csv"`: "Insert Sample CSV"
* `"process_batch"`: "Process Batch"
* `"import_success_msg"`: "Import batch processed successfully!"
* `"promotion_success_msg"`: "Record promoted successfully! New entity created in catalog."
* `"imported_records_queue"`: "Imported Records Queue"
* `"missing_fields"`: "Missing Fields"
* `"ready_for_promotion"`: "Ready for Promotion"
* `"promote_action"`: "Promote"
* `"view_imported_records"`: "View Imported Records"
* `"requires_domain_integration"`: "Requires domain integration"

### Arabic Translations (`ar.ts` additions)
* `"admin_imports"`: "إدارة الاستيراد"
* `"import_boundary_note"`: "Phase 06 يدير آلية الاستيراد العامة مثل قراءة CSV/JSON، إنشاء الدفعات، السجلات، الأخطاء، وإعادة المحاولة. أما قواعد التحقق والترقية فتظل مملوكة لكل مجال مثل المنح والجامعات والتخصصات والاختبارات."
* `"start_import"`: "بدء عملية استيراد"
* `"scholarship_imported_not_show_here_helper"`: "السجلات المستوردة لا تظهر هنا حتى يتم ترقيتها إلى منحة فعلية."
* `"promotion_flow_clarity_text"`: "مسار الترقية: السجل المستورد -> الترقية -> كيان المنحة الدراسية -> المراجعة/جاهز -> النشر -> تظهر المنح الدراسية المنشورة فقط للعامة."
* `"all_domains"`: "جميع المجالات"
* `"domain_scholarships"`: "المنح الدراسية"
* `"domain_universities"`: "الجامعات"
* `"domain_majors"`: "التخصصات"
* `"domain_tests"`: "الاختبارات الدولية"
* `"domain_courses"`: "الدورات التدريبية"
* `"domain_services"`: "الخدمات"
* `"target_domain"`: "المجال المستهدف"
* `"import_control_plane_desc"`: "واجهة تحكم لمراقبة دفعات استيراد البيانات، سجلات التحقق، طوابير الأخطاء، وإجراءات الترقية للنشر."
* `"upload_import_batch"`: "رفع دفعة استيراد"
* `"paste_data_below"`: "قم بلصق بيانات CSV أو JSON أدناه:"
* `"select_target_domain"`: "اختر المجال المستهدف للاستيراد:"
* `"insert_sample_csv"`: "إدراج نموذج CSV"
* `"process_batch"`: "معالجة الدفعة"
* `"import_success_msg"`: "تمت معالجة دفعة الاستيراد! تم إدخال السجلات بنجاح."
* `"promotion_success_msg"`: "تمت ترقية السجل بنجاح! تم إنشاء الكيان الجديد في الكتالوج."
* `"imported_records_queue"`: "طابور السجلات المستوردة"
* `"missing_fields"`: "الحقول المفقودة"
* `"ready_for_promotion"`: "جاهز للترقية"
* `"promote_action"`: "ترقية"
* `"view_imported_records"`: "عرض السجلات المستوردة"
* `"requires_domain_integration"`: "يتطلب ربط المجال"

---

## 5. Build, Lint, and Test Execution Status

We successfully performed verification-local validation:
* **Linting**: Completed successfully (`eslint .`) with zero warnings or errors.
* **Compilation**: Build succeeded perfectly in production mode across all workspaces.
* **Unit/Integration Tests**: Validated with Vitest test runner.
