# القسم 02 — سجل التدقيق: التنفيذ وإعادة المراجعة

هذا سجل تنفيذ للمهام الأصلية في `MANARATAK_ADMIN_REVIEW_CODEX.md`، وليس خطة موازية أو إعلان إغلاق. حُفظت المعرفات، ولم يُعدّل الملف المعتمد.

## المرجع والقرار

- مرجع المصدر وأحدث `main` البعيد عند الفحص بتاريخ 2026-10-08: `bac768e7fcd76e5702697760669449b39b0e2cca`.
- فرع العمل: `codex/section-01-iam-rbac`، ويحتفظ بتعديلات القسم 01. عند إعداد أدلة الاختبارات كانت التعديلات محلية؛ سجل Git يحدد commit والدفع اللاحق. الدفع إلى فرع العمل لا يعني إغلاق القسم أو اعتماد الإنتاج.
- الجرد الأصلي: **5 P0 + 10 P1 + 5 P2 + إضافتان FGA = 22 مهمة**. بادئة `02/` أدناه للتوضيح فقط؛ المعرفات الأصلية لم تتغير.
- قرار المستخدم: **لا توجد سياسة معتمدة لمدد الاحتفاظ؛ توثيق الاعتمادية دون حذف أو أرشفة تلقائية**. لا مدد افتراضية ولا انتهاء صلاحية مخترع للسجلات الجديدة غير المهيأة.
- لم يُشغّل migration أو seed أو reset أو backfill أو retention sweep، ولم تُكتب قاعدة بيانات حقيقية أو تُرسل إشعارات أو تُنفّذ عمليات مالية أو نشر.

## سجل المهام

`SOURCE_IMPLEMENTED` يعني تنفيذًا مدعومًا بالفحوص المذكورة، ولا يعني `CLOSED`. التحقق التشغيلي والاعتماديات المبينة تظل مفتوحة.

| المعرف الأصلي | التصنيف بعد التحقق | التنفيذ والدليل | الحالة المتبقية |
| --- | --- | --- | --- |
| 02/P0-01 | PARTIALLY_IMPLEMENTED | نطاق الفحص الآن `REFERENCE_LINKAGE_AND_TIMESTAMPS` مع `cryptographicVerification: false` ووقت الخادم وحدود الدفعة. اختبار يثبت أن تغيير payload لا يُكشف بهذا الفحص. | SOURCE_IMPLEMENTED؛ لا إثبات cryptographic tamper integrity |
| 02/P0-02 | CONFIRMED_DEFECT | `AuditHelper` يفصل المصدر المنطقي `admin-api/auth-api` عن `requestIp`، ويزيل query string من path ويحفظ actor من principal. لا تعديل تاريخي. | SOURCE_IMPLEMENTED / RUNTIME_PENDING |
| 02/P0-03 | ALREADY_IMPLEMENTED | `LoggingMiddleware` يولد UUID خادميًا قبل routers ويستبدل header المتصل. اختبارات تربط intent وbusiness audit وoutbox وHTTP outcome دون إنشاء middleware مكرر. | EXISTING_SOURCE_VERIFIED / RUNTIME_PENDING |
| 02/P0-04 | CONFIRMED_FUNCTIONAL_GAP | resolver مركزي يصنف السجلات ويضيف class/status عبر factory المستخدم في AuditHelper وatomic executors. غير المهيأ يبقى `UNCONFIGURED_RETAIN` دون expiry، ومدة owner الصريحة محفوظة. أضيفت إعادة فحص legal hold عند حجز وتنفيذ الأرشفة في المصدر فقط. | SOURCE_IMPLEMENTED جزئيًا؛ مدد معتمدة وحوكمة الأرشفة وإعادة المحاولة اعتمادات مفتوحة |
| 02/P0-05 | CONFIRMED_DEFECT | فحص Prisma محدود: حتى 101 صفًا لإرجاع 100، ثم حتى 100 predecessor محددًا؛ cursor/date validation وhasMore ونطاق ووقت معلنان. | SOURCE_IMPLEMENTED / DB_PERFORMANCE_PENDING |
| 02/P1-01 | PARTIALLY_IMPLEMENTED | اقتراحات بحث من catalog مشترك مُرقّم الإصدار ومعلن `complete:false` ومن الصفوف المحملة، مع أكواد خام قابلة للبحث وفلاتر خادمية محددة. | SOURCE_IMPLEMENTED؛ ليس جردًا شاملًا لجميع أكواد owners |
| 02/P1-02 | PARTIALLY_IMPLEMENTED | DTO وعمود وفلتر خادمي يميزون SUCCESS/FAILURE/INTENT/UNKNOWN؛ intent يغلب نتيجة خام مضللة. | SOURCE_IMPLEMENTED / POSTGRES_QUERY_PENDING |
| 02/P1-03 | PARTIALLY_IMPLEMENTED | روابط actor/target للمسارات الفعلية المعروفة فقط، مقيدة بالصلاحيات؛ المجهول يبقى ID. Identity يقبل search من URL. | SOURCE_IMPLEMENTED / BROWSER_RBAC_PENDING |
| 02/P1-04 | CONFIRMED_FUNCTIONAL_GAP | timeline للأحداث المحملة ذات correlation واحد، بترتيب زمني ومستويات الدليل ونص يوضح جزئية البيانات. لا دمج وهمي مع outbox ولا استنتاج نجاح من intent. | SOURCE_IMPLEMENTED / END_TO_END_PENDING |
| 02/P1-05 | PARTIALLY_IMPLEMENTED | CSV محلي معلن النطاق، وJSON مُصفّى من backend بدفعات 100 مع متابعة cursor وإلغاء نتائج الطلب القديمة. CSV الخادمي يعلن العدد/hasMore/cursor ويحمي من formula injection. | SOURCE_IMPLEMENTED / BROWSER_EXPORT_PENDING |
| 02/P1-06 | CONFIRMED_DEFECT | إزالة Yemen الثابتة؛ UTC أو توقيت المتصفح مع حفظ التفضيل وتحويل الحدود، ونهاية الدقيقة كاملة، ورفض تاريخ غير صالح وفجوة DST. refresh يستخدم توقيت الفلاتر المطبقة. | SOURCE_IMPLEMENTED؛ التباس الساعة المحلية المتكررة يتطلب UTC أو قرار UX لاحقًا |
| 02/P1-07 | CONFIRMED_DEFECT | نصوص AuditCenter في قاموسي AR/EN، واتجاه الصفحة واللغة؛ SSR يثبت العرض الإنجليزي دون نصوص عربية ثابتة. | SOURCE_IMPLEMENTED / BROWSER_PENDING |
| 02/P1-08 | PARTIALLY_IMPLEMENTED | Student Support private-layout reset أصبح Critical. نشر/أرشفة Study Destinations كانا Critical أصلًا؛ draft بقي Standard. الجرد يتحقق من التصنيف. | SOURCE_IMPLEMENTED؛ عقود owners لكل عملية تبقى مراجعة مستقلة |
| 02/P1-09 | CONFIRMED_FUNCTIONAL_GAP | AST inventory وCI guard: 316 تعريف handler، 315 endpoint فريدًا؛ 308 Critical و3 Standard و5 POST غير معدِّلة مستثناة بعد المراجعة. تغيير route/permission/classification أو collision غير معتمد يفشل. | SOURCE_IMPLEMENTED؛ ليس إثبات اختبار جميع endpoints أو validation/atomicity الخاصة بالـowners |
| 02/P1-10 | PARTIALLY_IMPLEMENTED | فصل intent وHTTP outcome وatomic business audit في DTO/timeline. لا يزال HTTP outcome بعد response best-effort. اختبارات Settings تثبت عقد owner atomic باستخدام UOW معزول. | PARTIAL؛ تبني atomic audit لكل owner والتحقق الحقيقي من rollback مفتوحان |
| 02/P2-01 | NEEDS_RUNTIME_VERIFICATION | لا تغيير schema/index عشوائي. يلزم قياس EXPLAIN وخطط pagination/JSON وحجم ledger قبل اختيار indexes مركبة. | OPEN — PERFORMANCE_EVIDENCE_REQUIRED |
| 02/P2-02 | CONFIRMED_DEFECT | consumer الفعلي في Scholarship catalog-detail انتقل إلى queryAuditPage بحد 50 وhasMore؛ use case legacy محدود 50 وfindBy معلّم deprecated. الواجهة تعلن جزئية التاريخ وتربط Audit حسب الصلاحية. | SOURCE_IMPLEMENTED / RUNTIME_PENDING |
| 02/P2-03 | PARTIALLY_IMPLEMENTED | فلاتر reference/trace/actorType/targetType/source/lifecycle/result/complianceTag/method/path مع validation وعقد repository. يتداخل بعضها مع P1-01/P1-02 ونُفذ مرة واحدة. | SOURCE_IMPLEMENTED؛ لا حذف للمعرف بسبب التداخل |
| 02/P2-04 | PROPOSED_ENHANCEMENT | أربعة presets محدودة: critical failures وauth وfinance وemergency grants. لا case storage أو قواعد تشغيلية مخفية. | SOURCE_IMPLEMENTED / UX_PENDING |
| 02/P2-05 | PARTIALLY_IMPLEMENTED | sanitizer التكراري القائم محفوظ؛ تفاصيل ذات نطاق ودليل واضح، دون bodies/headers كاملة، وروابط وفق الصلاحية وCSV آمن. لا اختراع field-level RBAC غير معتمد. | PARTIAL — PRIVACY_OWNER_REVIEW_REQUIRED |
| FGA-02-001 | PROPOSED_ENHANCEMENT | Case Workspace منتج إضافي مستقل، لا خلل مثبت؛ لم يُنشأ ledger موازٍ. | DEFERRED — CASE_OWNER/RBAC/RETENTION_CONTRACTS |
| FGA-02-002 | PROPOSED_ENHANCEMENT | alert rules تتطلب owner للإشعارات وعقود تفويض/idempotency؛ لم تنفذ أو ترسل تنبيهات. | DEFERRED — NOTIFICATION_CONTRACTS |

## الأدلة والملفات

- `apps/api/src/presentation/audit/AuditHelper.ts`: المصدر وIP وtrusted metadata وحدود path، والإنشاء عبر factory المركزي.
- `apps/api/src/presentation/api/router/AuditRouter.ts`: query validation و400 ProblemDetails للأخطاء المعروفة، والـDTO/export وفحص integrity المحدود.
- `packages/domain/src/audit/repositories/IAuditRecordRepository.ts` و`packages/application/src/audit/use-cases/ManageAuditRecordsUseCase.ts`: عقد الاستعلام المحدود وlegacy compatibility.
- `packages/infrastructure/src/audit/PrismaAuditRecordRepository.ts` و`InMemoryAuditRecordRepository.ts`: الفلاتر وcursor والفحص المحدود. Prisma JSON/AnyNull يجري التحقق منه بمَحاكاة العقود فقط، لا PostgreSQL فعليًا.
- `packages/application/src/audit/use-cases/AuditRetentionPolicyResolver.ts` و`packages/application/src/audit/use-cases/AuditRecordFactory.ts`: class/status دون مدة افتراضية. `packages/infrastructure/src/retention/PrismaAuditRetentionGateway.ts`: شروط hold/lease/expiry قبل الكتابة النهائية وإطلاق lease عند عدم التطابق.
- `apps/admin/src/pages/AuditCenterPage.tsx` و`pages/audit/AuditViewModel.ts` وقاموسا `apps/admin/src/i18n/`: التصفية واللغة والتوقيت والروابط وtimeline والتصدير.
- `packages/shared/src/authorization/auditQueryCatalog.ts`: اقتراحات مشتركة، معرفة جزئية معلنة، raw fallback محفوظ.
- `scripts/architecture/verify-admin-audit-coverage.mjs` و`tests/security/admin-audit-coverage.test.mjs` و[الجرد المعتمد](evidence/section-02/admin-mutation-audit-inventory.json): جرد AST ومقارنة fail-closed وربط guard بـ`ci:source:contracts`.
- `ScholarshipCatalogDetailRouter.spec.ts` و`AuditViewModel.spec.ts` و`AuditCenterPage.spec.tsx` و`AuditSearchAndExport.spec.ts` و`AuditRetentionHold.spec.ts` و`SettingsAtomicAuditBoundary.spec.ts`: أدلة العقود والواجهة المعزولة وحدود الاحتفاظ.

## الاعتماديات والمخاطر المفتوحة

1. **الاحتفاظ — P0-04 و02.7:** لا توجد مدد معتمدة، لذلك لا انتهاء افتراضي ولا backfill أو تشغيل sweep. العقد الحوكمي يجب أن يميز immutable audit payload عن operational retention envelope القابل للتحديث. يبقى قرار ADR ومراجعة السياسة مفتوحين دون نقل schema.
2. **إعادة المحاولة بعد legal hold:** `PrismaRetentionDecisionRepository` يعامل SKIPPED كقرار نهائي عبر terminalKey؛ قرار KEEP بسبب hold في RetentionSweep قد يمنع إعادة تقييم السجل بعد انتهاء hold. هذه اعتمادية مشتركة مع Import/Assets وتحتاج إصلاحًا واختبارًا منفصلًا قبل تفعيل الأرشفة؛ لم يُغيّر محرك الاحتفاظ العام هنا.
3. **جرد العمليات:** 242 handler لديها parse مباشرة مرصودة، و74 تتطلب تتبع validation داخل owner/handler؛ هذا ليس حكمًا بأنها بلا validation. جميع عقود atomic business audit/outbox تبقى OWNER_VERIFICATION_REQUIRED. الحماية العامة من التكرار تغطي 301 POST/PUT/PATCH؛ 15 DELETE تحتاج إثبات semantics الخاصة بها، ولم يُوسّع middleware العام اعتباطيًا.
4. **Import — القسم 05:** يوجد تعريفان لـ`POST /admin/imports/courses/preflight` في CourseImportOperationsRouter وImportAdminRouter بنفس الصلاحية؛ ترتيب mount يحدد الأول. collision معروف موثق في الجرد؛ حسم الملكية/العقد في القسم 05 قبل تغيير routing.
5. **الفهارس — P2-01:** توجد timestamp index وreference unique؛ المرشحون `(timestamp,id)` و`(actor,timestamp,id)` و`(category,timestamp,id)` يحتاجون قياسًا قبل migration. لا أداء Enterprise مثبتًا من اختبارات الذاكرة.
6. **CI:** guard التغطية الجديد ينجح، لكن `ci:source:contracts` يتوقف عند ثلاث مخالفات name-based relationships قائمة: ScholarshipCatalogDetailPage، ScholarshipListPage، CoursesSearchPage. أضيف إشعار التاريخ ورابط Audit للأول فقط؛ clause المخالف نفسه لم يتغير. المراحل التالية من الأمر لم تُنفّذ بعد الفشل. لا CI أخضر ولا GO.
7. **التوافق:** بيئة الاختبار Node 24.19.0، وCI يستخدم 22.16.0؛ يظل التحقق في بيئة CI المطلوبة اعتمادًا مفتوحًا.

تداخلات التنفيذ حُفظت دون حذف مهام: P1-01/P1-02/P2-03 تنفيذ query مشترك؛ P0-03/P1-04/P1-10 أدلة مترابطة؛ P0-01/P0-05 عقد واحد لفحص محدود صادق.

## نتائج إعادة المراجعة

- **128 اختبارًا ناجحًا في 21 ملفًا** بعد اكتمال `tsc -b`، تشمل regressions القسم 01 وScholarship وSettings.
- **9 اختبارات source guards ناجحة**، وaudit coverage guard ناجح.
- TypeScript و`quality:source` ناجحان؛ لا cycles أو accessibility findings في الفحص المصدرّي.
- lint المختار: **0 errors**؛ 21 warning في المجموعة الأساسية و6 في الفحص الإضافي للـgateway. لا ادعاء فحص lint لكل المستودع.
- `git diff --check` ناجح. [الأوامر والسجلات](evidence/section-02/README.md).
- ثلاث حالات Settings التي فشلت في snapshot القسم 01 كانت توقعات اختبار قديمة تطلب success audit مكررًا من router رغم انتقاله إلى atomic owner. حُدّثت لتتحقق من owner context وعدم التكرار، وأضيفت اختبارات UOW لعدم commit عند فشل audit/outbox. تبقى الأدلة القديمة محفوظة كسجل تاريخي، ولا يثبت mock UOW rollback حقيقيًا في PostgreSQL.

**الحالة: أعمال المصدر المنفذة موثقة؛ القسم ليس CLOSED.** يلزم تحقق المتصفح وPostgreSQL/التزامن الحقيقي وحجم البيانات وCI واعتماد مدد الاحتفاظ وقرارات الميزات الإضافية. لا نجاح Build أو اختبار معزول يكفي لإغلاق القسم أو إعلان G0–G7/GO.
