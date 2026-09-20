# MANARATAK 2.0: International Tests Admin Workspace & Detail UX Phase 23 Alignment Report

**Document ID:** REP-PHASE-23-INTERNATIONAL-TESTS-ADMIN-UX  
**Status:** Completed & Verified  
**Phase:** Phase 23 (Enterprise Administration Portal) & Phase 09 (International Standardized Tests & Exam Registries)  
**Date:** July 28, 2026  

---

## 1. Executive Summary
This report documents the architectural alignment and comprehensive implementation of the **International Tests Admin Workspace (`/admin/international-tests`)**, the introduction of the unified **International Test Detail Page (`/admin/international-tests/:id`)**, separation from the **Tests Import Center (`/admin/imports/international-tests`)**, and the update of **Phase 23 documentation**.

---

## 2. Key Enhancements & Implementation Details

### A. Simplified List Layout (`/admin/international-tests`)
- Transitioned international tests display to a lightweight, mobile-first **vertical administrative table layout** designed for fast scanning.
- Each row presents:
  - Test Name (Arabic / English, e.g. IELTS Academic, TOEFL iBT, Digital SAT, GRE, GMAT)
  - Official Provider / Owner (e.g. British Council / IDP, ETS, College Board, GMAC)
  - Minimum Required Score or Range
  - Result Validity Duration (e.g. 2 Years, 5 Years)
  - Approximate Fee & Currency
  - Lifecycle Status badge
  - Quick action: **View Details** (routing to `/admin/international-tests/:id`).
- Explicitly excluded from main list view to prevent clutter: full test center lists, long preparation resources, detailed score conversion tables, registration requirements, sample material files, import/merge history, source details, and direct delete buttons.

### B. Top Statistics Counters (8 Metrics)
Added and verified 8 explicit dashboard counters matching governance requirements:
1. All Tests (`كل الاختبارات`)
2. Imported Awaiting Review (`مستوردة بانتظار مراجعة`)
3. Verified / Approved (`موثقة / معتمدة`)
4. Missing Data (`ناقصة البيانات`)
5. Needs Source Verification (`تحتاج تحقق من المصدر`)
6. Ready to Publish (`جاهزة للنشر`)
7. Published (`منشورة`)
8. Archived (`مؤرشفة`)

### C. Import Center Routing Separation
- The "Open Tests Import Center" action routes directly to `/admin/imports/international-tests` (International Tests Import Center).
- The International Tests Admin Workspace does not execute raw provider feeds or background scraping directly from the list view.

### D. Unified International Test Details Page (`/admin/international-tests/:id`)
- Added a full profile view displaying Arabic test name, English test name, original imported/source name, test category/type (Language / Admission / Professional / Aptitude), official provider/owner, official registration URL, official source URL, available countries count, test centers count, approximate fee and currency, result validity duration, score scale, accepted minimum scores, accepted for scholarships/universities count, registration requirements, cancellation/rescheduling notes, preparation links, sample materials via Phase 05 EAP asset references, source references, missing fields, source verification status, import/update/merge history, and admin audit history.

### E. Admin Action Bar & Lifecycle Governance
- Top action bar featuring: Edit, Verify / Approve (`توثيق / اعتماد`), Mark Ready to Publish (`جاهز للنشر`), Publish (`نشر`), Unpublish (`إلغاء النشر`), Reject (`رفض`), Archive (`أرشفة`), Fetch Missing Fields from Official Source (`جلب النواقص من المصدر الرسمي`), and Link Test to Scholarships / Universities (`ربط الاختبار بالمنح / الجامعات`).
- Strict rules enforced: **No auto-publish**. Public page links appear **only** when status is Published. Dangerous actions require confirmation.

### F. "Fetch Missing Fields from Official Source" Action
- Added visible button: `"Fetch Missing Fields from Official Source"` / `"جلب النواقص من المصدر الرسمي"`.
- Checks official provider websites (ETS, British Council, College Board) and suggests missing fields only (official registration URL, fee/currency, test centers, available countries, validity duration, score scale, registration requirements, prep links, sample material asset refs).
- Features Arabic safety notice: *"سيتم اقتراح إكمال الحقول الناقصة فقط من المصادر الرسمية، ولن يتم استبدال البيانات التي تمت مراجعتها دون موافقة صريحة منك."*
- Staged preview modal displaying suggested additions without silently overwriting reviewed data.

### G. Duplicate & Safe Merge Visibility
- Displays original source titles versus cleaned canonical titles.
- Displays duplicate status (`new`, `duplicate_skipped`, `existing_enriched`), merged fields, and protected reviewed fields.
- Deduplication takes into account normalized test name, provider/owner, and test category to prevent duplicate test creation.

### H. Empty State
- When no tests exist, shows:
  - "No international tests found" / "لم يتم العثور على اختبارات دولية"
  - Button: "Add Test" / "إضافة اختبار"
  - Button: "Open Tests Import Center" / "فتح مركز استيراد الاختبارات" (routing to `/admin/imports/international-tests`).

### I. i18n & Translation Keys Added
Added keys to `en.ts` and `ar.ts`:
- `all_tests`: "All Tests" / "كل الاختبارات"
- `no_tests_found`: "No international tests found" / "لم يتم العثور على اختبارات دولية"
- `no_tests_desc`: "Get started by adding an international test record or importing a batch from trusted test providers." / "ابدأ بإضافة اختبار دولي أو استيراد دفعة من مزودي الاختبارات المعتمدين."
- `add_test`: "Add Test" / "إضافة اختبار"
- `open_tests_import_center`: "Open Tests Import Center" / "فتح مركز استيراد الاختبارات"
- `needs_source_verification`: "Needs Source Verification" / "تحتاج تحقق من المصدر"
- `official_provider`: "Official Provider / Owner" / "الجهة المنظمة / المالكة"
- `min_score_range`: "Min Required Score / Range" / "الدرجة المطلوبة / النطاق"
- `validity_duration`: "Validity Duration" / "مدة صلاحية النتيجة"
- `test_type_category`: "Test Category / Type" / "نوع / تصنيف الاختبار"
- `official_registration_url`: "Official Registration URL" / "رابط التسجيل الرسمي"
- `official_source_url`: "Official Source URL" / "رابط المصدر الرسمي"
- `test_centers`: "Test Centers" / "مراكز الاختبار"
- `approx_fee`: "Approximate Fee & Currency" / "الرسوم التقريبية والعملة"
- `score_scale`: "Score Scale" / "مقياس الدرجات"
- `registration_requirements`: "Registration Requirements" / "متطلبات التسجيل"
- `cancellation_rescheduling_notes`: "Cancellation / Rescheduling Notes" / "ملاحظات الإلغاء وإعادة الجدولة"
- `preparation_links`: "Preparation Links" / "روابط التحضير"
- `sample_materials`: "Sample Materials & Assets" / "النماذج والمواد التدريبية"
- `accepted_minimum_scores`: "Accepted Minimum Scores" / "الحد الأدنى للدرجات المقبولة"
- `accepted_for_scholarships_universities`: "Accepted for Scholarships / Universities" / "مقبول في المنح والجامعات"
- `fetch_missing_fields_from_official_source`: "Fetch Missing Fields from Official Source" / "جلب النواقص من المصدر الرسمي"
- `link_test_to_scholarships_universities`: "Link Test to Scholarships / Universities" / "ربط الاختبار بالمنح / الجامعات"
- `fetch_missing_test_fields_notice`: Arabic safety notice regarding fetching missing fields without overwriting reviewed data.

---

## 3. Documentation Alignment
Updated the three core Phase 23 specification documents to incorporate International Tests Admin Workspace rules and boundaries:
- `/docs/phases/phase-23-enterprise-administration-portal/phase-23-01-enterprise-administration-portal-architecture-specification.md`: Added International Tests Admin Workspace & Import Center Boundaries specification.
- `/docs/phases/phase-23-enterprise-administration-portal/phase-23-02-enterprise-administration-portal-structure-contracts.md`: Added `IAdminInternationalTestListRow`, `IAdminInternationalTestDetailView`, `IAdminInternationalTestActionBar`, `IAdminInternationalTestMissingFieldFetchRequest`, `IAdminInternationalTestMissingFieldSuggestion`, `IAdminInternationalTestImportMergeHistory`, and `IAdminInternationalTestQualityStatus` TypeScript interfaces.
- `/docs/phases/phase-23-enterprise-administration-portal/phase-23-03-enterprise-administration-portal-workflows-operational-experience.md`: Added Section `23.C.14 International Tests Admin Workspace & Import Center Workflow`.

---

## 4. Verification Results
- **TypeScript & Build:** `compile_applet` executed and passed cleanly.
- **Linter:** `lint_applet` executed and passed with 0 errors.

---

**Report Sign-off:** Enterprise Architecture Team & Lead Frontend Developer  
**Status:** ALL REQUIREMENTS SATISFIED & BASELINE VERIFIED
