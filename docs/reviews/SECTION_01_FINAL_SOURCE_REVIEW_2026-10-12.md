# مراجعة المصدر النهائية — 01 — الموظفون والصلاحيات / IAM & RBAC

المرجع: [الخطة نفسها](MANARATAK_ADMIN_REVIEW_CODEX.md). الأساس `31e11dc7` من آخر `origin/main` بعد fetch. الفرع `codex/sections-1-3-source-final-review-20261012`. هذه مراجعة كود/واجهات فقط؛ لا اختبار ثقيل أو إعادة اختبار ولا تطبيق ترحيل.

«منفذ وغير متحقق» هنا يعني أن مسار المصدر موجود وتمت مراجعته، لكن التحقق التشغيلي النهائي مؤجل. الأدلة القديمة محفوظة في التقارير السابقة، ولا تُنسب لتعديلات هذه الجولة. الفشل الوحيد في فحص TypeScript أُصلح دون إعادة الفحص؛ لذلك لا ندّعي نجاح الفحوص النهائية.

| معرّف الخطة | المتطلب من الملف | التصنيف | الكود / حدود المراجعة |
|---|---|---|---|
| `01/P0-01` | صلاحية إدارة الهويات موجودة ولكن لا يوجد لها Admin Surface | منفذ وغير متحقق | [IdentityAdminPage.tsx](../../apps/admin/src/pages/IdentityAdminPage.tsx)؛ مسار المصدر والبوابات/العقود القائمة موجود؛ لا إعادة اختبارات للوظائف المنفذة. راجع التقرير السابق لحدود دليل التشغيل. |
| `01/P0-02` | `admin:identities:manage` لا تمنح مسارًا إداريًا في `ADMIN_SECTIONS` | منفذ وغير متحقق | [adminAccess.ts](../../packages/shared/src/authorization/adminAccess.ts)؛ مسار المصدر والبوابات/العقود القائمة موجود؛ لا إعادة اختبارات للوظائف المنفذة. راجع التقرير السابق لحدود دليل التشغيل. |
| `01/P1-01` | لا توجد صفحة موظفين حقيقية | منفذ وغير متحقق | [IdentityAdminPage.tsx](../../apps/admin/src/pages/IdentityAdminPage.tsx)؛ عمود الوصول الإداري المعيّن ظاهر صراحة؛ تقييم الصلاحيات الفعلية في تفاصيل الموظف بصلاحية Authorization المناسبة، دون منحها تلقائيًا لمشغّل الهوية. |
| `01/P1-02` | اختيار الموظف الحالي غير مناسب للتوسع | منفذ وغير متحقق | [AuthorizationIdentityPicker.tsx](../../apps/admin/src/components/AuthorizationIdentityPicker.tsx)؛ مسار المصدر والبوابات/العقود القائمة موجود؛ لا إعادة اختبارات للوظائف المنفذة. راجع التقرير السابق لحدود دليل التشغيل. |
| `01/P1-03` | إنشاء Role يعرض raw permission codes فقط | منفذ وغير متحقق | [adminPermissionCatalog.ts](../../packages/shared/src/authorization/adminPermissionCatalog.ts)؛ مسار المصدر والبوابات/العقود القائمة موجود؛ لا إعادة اختبارات للوظائف المنفذة. راجع التقرير السابق لحدود دليل التشغيل. |
| `01/P1-04` | Granularity الصلاحيات غير متوازنة | مكتمل ومثبت بالمراجعة المصدرية للنطاق المطلوب | [SECTION_01_RBAC_GRANULARITY_DESIGN.md](../../docs/reviews/SECTION_01_RBAC_GRANULARITY_DESIGN.md)؛ مهمة تصميم مرحلي صريحة؛ التنفيذ الشامل لكل مالك ليس مطلوبًا في هذه الجولة. |
| `01/P1-05` | Role lifecycle ناقص | منفذ وغير متحقق | [AuthorizationRoleEditor.tsx](../../apps/admin/src/components/AuthorizationRoleEditor.tsx)؛ إكمال عرض خطورة الدور من القاموس المركزي؛ المحرر الحالي يدعم البيانات والسياسات وmemberCount والحماية وCAS. |
| `01/P1-06` | أسماء Roles يمكن تكرارها عمليًا | منفذ وغير متحقق | [PrismaRoleRepository.ts](../../packages/infrastructure/src/authorization/PrismaRoleRepository.ts)؛ مسار المصدر والبوابات/العقود القائمة موجود؛ لا إعادة اختبارات للوظائف المنفذة. راجع التقرير السابق لحدود دليل التشغيل. |
| `01/P1-07` | Policy engine موجود لكنه غير قابل للإدارة | منفذ وغير متحقق | [ManagePoliciesUseCase.ts](../../packages/application/src/authorization/use-cases/ManagePoliciesUseCase.ts)؛ مسار المصدر والبوابات/العقود القائمة موجود؛ لا إعادة اختبارات للوظائف المنفذة. راجع التقرير السابق لحدود دليل التشغيل. |
| `01/P1-08` | لا يوجد Effective Access Viewer | منفذ وغير متحقق | [AuthorizationEffectiveAccess.tsx](../../apps/admin/src/components/AuthorizationEffectiveAccess.tsx)؛ اختيار صلاحية واختبارها خادميًا، تجميع النتائج حسب المجال، مصدر مباشر/طارئ، شرط ALLOW/DENY وأسبابه من evaluator. يفرغ نتائج العرض السابقة عند فشل التقييم. |
| `01/P1-09` | Maker-Checker UX مربك | منفذ وغير متحقق | [AuthorizationAdminRouter.ts](../../apps/api/src/presentation/api/router/AuthorizationAdminRouter.ts)؛ مسار المصدر والبوابات/العقود القائمة موجود؛ لا إعادة اختبارات للوظائف المنفذة. راجع التقرير السابق لحدود دليل التشغيل. |
| `01/P1-10` | Local audit داخل القسم غير شامل وغير قابل للتصفح | منفذ وغير متحقق | [AuthorizationAdminRouter.ts](../../apps/api/src/presentation/api/router/AuthorizationAdminRouter.ts)؛ مسار المصدر والبوابات/العقود القائمة موجود؛ لا إعادة اختبارات للوظائف المنفذة. راجع التقرير السابق لحدود دليل التشغيل. |
| `01/P1-11` | Pagination لا يلتزم STD-API-001 | منفذ وغير متحقق | [PrismaRoleRepository.ts](../../packages/infrastructure/src/authorization/PrismaRoleRepository.ts)؛ مسار المصدر والبوابات/العقود القائمة موجود؛ لا إعادة اختبارات للوظائف المنفذة. راجع التقرير السابق لحدود دليل التشغيل. |
| `01/P1-12` | الصفحة لا تتبع i18n الفعلي للوحة الإدارة | منفذ وغير متحقق | [AuthorizationAdminPage.tsx](../../apps/admin/src/pages/AuthorizationAdminPage.tsx)؛ مسار المصدر والبوابات/العقود القائمة موجود؛ لا إعادة اختبارات للوظائف المنفذة. راجع التقرير السابق لحدود دليل التشغيل. |
| `01/P1-13` | Repository delete في Role/Policy يبتلع أخطاء غير متوقعة | منفذ وغير متحقق | [PrismaRoleRepository.ts](../../packages/infrastructure/src/authorization/PrismaRoleRepository.ts)؛ مسار المصدر والبوابات/العقود القائمة موجود؛ لا إعادة اختبارات للوظائف المنفذة. راجع التقرير السابق لحدود دليل التشغيل. |
| `01/P1-14` | HTTP error semantics تحتاج تحسين | منفذ وغير متحقق | [AuthorizationErrorResponse.ts](../../apps/api/src/presentation/security/AuthorizationErrorResponse.ts)؛ مسار المصدر والبوابات/العقود القائمة موجود؛ لا إعادة اختبارات للوظائف المنفذة. راجع التقرير السابق لحدود دليل التشغيل. |
| `FGA-01-001` | مصفوفة تضارب الصلاحيات Separation-of-Duties (SoD) عند الجمع بين الأدوار | منفذ وغير متحقق | [PrismaDutyGuard.ts](../../packages/infrastructure/src/authorization/PrismaDutyGuard.ts)؛ مصفوفة إدارية واتحاد الأدوار، preview يحترم الاستثناء الساري، وحماية الإسناد وتعديل الأدوار والوصول الطارئ والتقييم. |

## بنود إضافية وحدود النطاق

01.6: MFA/step-up موجودان في Auth foundation؛ recurring reviews أيضًا موجودة. JIT غير الطارئ وانتهاء التعيين العادي وصلاحيات الموارد مرحلة لاحقة منصوص عليها في 01.7، ولم تُضاف. لا تحدد الواجهة صلاحية المنفذ من نفسها.

التجهيز والاختبارات التشغيلية تبقى مؤجلة. هذه المصفوفة لا تعلن إغلاق إنتاج أو نجاح جميع الاختبارات.
