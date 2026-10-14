# القسم 15 — إكمال المصدر وإعادة التحقق الخفيف

- المستودع: `wegdangamil2022-oss/MANARATAK-First-`.
- الأساس: `main@4e203a88ac766a5da6af3e726fe7f6547c531ae0`، ويشمل إصلاحات `09159436` المدمجة في `c695cd4e`.
- المرجع: القسم 15 و15.FG من `MANARATAK_ADMIN_REVIEW_CODEX.md`؛ مصفوفة متطلبات المصدر المفصلة في `section-15-implementation.md`.
- النطاق: القسم 15 فقط. لا استيراد لفرع إكمال الأقسام 15–17؛ لا تغيير في CMS أو الترجمة أو القسم 18.
- القرار: **CODE_CLOSED — RUNTIME_DEFERRED** للمتطلبات STU-ADM-001…025 وFGA-15-001/002؛ يبقى STU-ADM-026 مؤجلًا لما بعد القسم 28، وليس نجاحًا تشغيليًا.

## مطابقة الخطة بالمصدر الحالي

المتطلبات الأساسية منفذة أصلًا في main، ولم تُعد كتابة أصحاب البيانات أو إنشاء projections موازية. فُحصت حدود الموافقة والخصوصية والمعاملات وCAS في `PrismaStudentWorkspaceRepository`، وعزل قراءة المجالات وpurpose/audit في `StudentSupportAdminRouter`، والتزامن والتذكيرات وملكية الطالب في `PrismaStudentApplicationTrackerRepository`، وتركيب المهام في `PollingWorkerRuntime`. اختبارات الجولة الخفيفة تغطي هذه العقود ببدائل معزولة، وليست إثبات SQL أو عامل حي.

| متطلبات الخطة | أدلة المصدر والتحقق المستهدف |
|---|---|
| STU-ADM-001…006 | Repository/use cases/HTTP: تقليل بيانات consent في audit/outbox؛ فاعل الدعم وسببه داخل حد المعاملة؛ expectedVersion وstatus والملكية وفشل التحديث المشروط. |
| STU-ADM-007…010 | SourceGaps وgateway/worker/event-policy: أحداث الشهادات والبديل قبل الأصل، catch-up، continuation وreplay، recipient/type/version bounds؛ تركيب العامل الفعلي بساعة وهمية. |
| STU-ADM-011…014 | Cache isolation وhydration/owner gateways/router: canonical reads، أعطال cache، grants مستقلة، قراءة bounded ومصدر وحداثة/unknown totals، audit قبل الكشف. |
| STU-ADM-015…017 | Tracker repository/use cases وreminder delivery/gateway: CAS scoped للطالب، منع تعديل المؤرشف، حقائق التذكير الذرية والتحقق من owner/current eligibility. |
| STU-ADM-018…020 | HTTP/router وcursor codec: تشخيص هوية دون provisioning جانبي، DTO محدود، تطابق الفلاتر والتوقيع وانتهاء صلاحية cursor. |
| STU-ADM-021…023 | SSR AR/EN + اختبارات التفاعل الجديدة: conflict refresh ثم تأكيد مستقل بالنسخة الجديدة، reason محفوظ، SUSPENDED يمنع إعادة التأكيد، تغيير الطالب يبطل الردود القديمة. |
| STU-ADM-024/025 | اختبارات HTTP فعلية محلية مع authorization doubles، وواجهة لا تحضر owners عند فتح Operations؛ pagination تحدث health/provenance دون ادعاء اكتمال counts من صفحات جزئية. |
| FGA-15-001/002 | اختبارات tracker/history purpose+scope وtriage/owner-read health وP20 payment join: عزل الأذونات، تصفية قبل total/page، نوافذ زمنية وcursor، no PII أو owner payload في التشخيص. |

## النواقص المكتشفة في هذه الجولة وإصلاحها

1. **STU-ADM-014/025، FGA-15-002:** تحميل الصفحة التالية كان يحدث الصفوف وcursor فقط. الآن ينقل حالة المصدر ووقت قراءته وcounts الصادرة من المالك وwarning عند تعذر حفظ diagnostic observation. عند DEGRADED/RESTRICTED يمسح صفوف المجال القديمة بدل إبقائها مع إيحاء صلاحية/حداثة سابقة. لا يحسب total من عدد الصفوف المحملة، ولا يحوّل صفحة أخيرة إلى proof لاكتمال المصدر.
2. **STU-ADM-021/022:** رد reset أو قراءة conflict المتأخر كان يمكنه استبدال ملف الطالب المختار حديثًا وفتح dialog الطالب السابق. counter مستقل يبطل النتيجة عند تبديل الطالب أو إلغاء تركيب المكون؛ cleanup يبطل owner pagination أيضًا. الانتقال يغلق dialog ويزيل reason الخاص بالطالب السابق. guard إضافي بعد refresh القائمة يمنع inspect قديمًا.
3. **STU-ADM-024:** أضيفت خمسة اختبارات React interaction فعلية، بدل الاقتصار على SSR لمسار التعارض: Operations بلا owner fanout؛ 409 ثم إعادة تأكيد version2؛ منع retry للحساب SUSPENDED؛ pagination متدهورة دون صفوف قديمة؛ وقراءة conflict متأخرة بعد الانتقال إلى طالب آخر.

## التحقق الفعلي

- Node **22.23.3**؛ dependencies من lockfile؛ أضيف `react-test-renderer@19.2.8` للاختبارات فقط، مع الحفاظ على React production **19.2.8**.
- local Prisma Client generation فقط، دون اتصال قاعدة أو تنفيذ migration.
- `.section15-completion-vitest.config.ts`: **26 ملفًا /187 اختبارًا، كلها نجحت**؛ 56.45 ثانية إجمالية، منها 2.91 ثانية test execution. الإعداد معزول للقسم والحدود المرتبطة، maxWorkers=2، ولا يشغّل suite المستودع العامة.
- الاختبارات الخمسة الجديدة نجحت أيضًا منفردة؛ هي ضمن الـ187 ولا تجمع مرتين.
- ESLint المستهدف: **0 errors،25 warnings**؛ تحذيرات الملف القائم وrefs عدادات الطلبات وany في fixtures مفصلة في evidence، ولا ندّعي إغلاقها.
- TypeScript: `tsc -b packages/infrastructure apps/api apps/admin --pretty false` نجح (exit0)، وأعيد فحصه incremental على المصدر النهائي بنجاح. `git diff --check` نجح.

الأدلة: `evidence/section-15-completion-20261014/`. هذه الجولة تعيد التحقق من fixtures والإصلاحات التي وصف تقرير 13 أكتوبر تحققها بأنه جزئي؛ ذلك التقرير يبقى سجلًا تاريخيًا ولا يُحوَّل إلى PASS بأثر رجعي.

## الترحيلات والتشغيل

لا migration جديد لهذه الإصلاحات. مصدر جدول owner read health السابق محفوظ؛ **MIGRATIONS_APPLIED=0** في هذه الجولة. تشغيل owner-health triage يتطلب schema/client متوافقين كما في تقرير 13 أكتوبر وخطة recovery القائمة؛ دفع المصدر ليس إثبات تطبيق الترحيل.

لا database integration أو browser E2E أو provider حي أو تشغيل worker أو إرسال إشعارات أو نشر. STU-ADM-026 وSQL concurrency/replay/worker/runtime proofs مؤجلة. يشمل commit `[skip ci]` بناءً على طلب عدم تشغيل الاختبارات الثقيلة عند الدفع إلى main. الرجوع عن إصلاح الواجهة هو revert لهذا الكوميت دون تغيير بيانات أو schema.
