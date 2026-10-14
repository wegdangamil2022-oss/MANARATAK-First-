# القسم 16 — إكمال نواقص CMS وإعادة التحقق الخفيف

- المستودع: `wegdangamil2022-oss/MANARATAK-First-`.
- الأساس: `main@cb3c9b592b6722ee869a863c5640d62ceffe3fb5` بعد إكمال القسم 15؛ لا تغيير للقسم 15 في هذه الجولة.
- المرجع: القسم 16 و16.FG من `MANARATAK_ADMIN_REVIEW_CODEX.md`، ومصفوفة المصدر في `section-16-implementation.md`.
- القرار: **CODE_CLOSED — RUNTIME_DEFERRED** للمتطلبات CMS-ADM-001…029 وFGA-16-001/002؛ CMS-ADM-030 وإثباتات التشغيل بعد القسم 28 تبقى مؤجلة.
- النطاق: المصدر واختبارات unit/contract/security وReact interaction معزولة وHTTP محلي فقط. لا إدخال تغييرات القسم 17 أو استيراد فرع إكمال 15–17 كاملًا.

## مطابقة المالك والمخطط قبل التنفيذ

المصدر الحالي يملك أصلًا `CmsContentNode` و`CmsLocalizedContent` وreview fingerprint/revisions، و`CmsSitePublishedSnapshot` المستقل للتنقل والإعلانات والكتل، و`CmsContentBlock.schemaId` المرتبط بـ`CmsBlockSchema`، و`CmsScheduledJob` مع lease/claim/idempotency. عقود API وPrisma الفعلية فُحصت؛ لم يُستنتج وجود هذه الحقائق من تصميم الواجهة.

الصلاحيات الدقيقة، maker/checker، نسخة النشر المستقلة، CAS/Serializable، graph restore، strict locale، canonical owner delivery وredirect management موجودة أصلًا في main. هذه الجولة تكمل نواقصها الموضحة أدناه وتعيد التحقق المستهدف. لا جدول أو حقل مخطط جديد؛ `hasPublicSnapshot` إسقاط قراءة إداري مشتق من snapshot المملوك لـCMS، وليس حالة ترجمة أو حقيقة مخزنة موازية.

## النواقص الخمس وإصلاحاتها

| متطلبات الخطة | نقص المصدر | الإصلاح والدليل |
|---|---|---|
| CMS-ADM-016/017 | saveBlock يتحقق من payload باستخدام schemaId المرسل، لكن update لا يغير schemaId القديم؛ يمكن حفظ payload بمعنى مختلف عن المخطط المملوك. | منع تبديل schemaId لكتلة قائمة داخل repository، وتعطيل اختيار المخطط عند فتحها في المحرر؛ المخطط يبقى قابلًا للاختيار لكتلة جديدة. اختبار رفض قبل كتابة block واختبار تفاعل actual editor/version. |
| CMS-ADM-008/017 | الحد الأخير للنشر/نشر الكتل يفحص PUBLIC وtrust دون تطبيق حقوق EAP. | `verifyAssetIds` يطبق `assertAssetPublicRights` المملوك لـEAP بعد trust check. publication الحقيقي يرفض الحقوق الإلزامية INTERNAL والمنتهية والمشوهة قبل أي public write. الحقوق غير المحددة تبقى advisory؛ لا ترخيص مختلق ولا تجاوز لسياسة المالك. |
| CMS-ADM-004/022 | تعديل إعلان منشور يترك snapshot العام صحيحًا، لكن صف المسودة يحجب زر archive ويرفضه repository. | القائمة تميز `hasPublicSnapshot` عن DRAFT؛ publish grant مستقل، وreason بطول6…1000 مطلوب عند UI/API/Application/Repository. الأرشفة تقبل snapshot العام أثناء المسودة وتزيله مع تغيير الصف وaudit/outbox داخل المعاملة نفسها، وexpectedVersion محفوظ. tests لرفض الأذونات/السبب/version، وعدم أثر draft غير منشورة، والفاعل من الجلسة لا request body. |
| CMS-ADM-012/013/029 | مهمة PUBLISH تستلم locale سبق نشرها فتتجاوز publish الذي يكمل المهمة، وتترك PROCESSING وتزيد published كأنه نشر جديد. | تلغى المهمة بصراحة تحت lease owner/expiry وjob identity/idempotency، مع إعادة فحص owner version داخل Serializable وledger/audit/outbox. لا يستدعى publish ولا يزيد published، ويحفظ SYSTEM actor وexecutionContext. tests لفقد lease أو تغير version دون audit نجاح أو publication event. |
| CMS-ADM-011 | أعطال إبطال Redis تمر بصمت. | warning آمن عند not-ready أو فشل invalidation، دون exception/raw secrets/site/reason؛ return يبقى ناجحًا بعد owner commit. العقد canonical owner reads + bounded TTL، وليس إثبات CDN purge أو durable consumer. tests للرسالة وعدم كشف تفاصيل. |

## مصفوفة بقية متطلبات المصدر

مصفوفة البنود التفصيلية السابقة محفوظة في `section-16-implementation.md`؛ هذه الجولة لا تعيد احتساب نتائجها القديمة كاختبارات جديدة.

- CMS-ADM-001…007/018: HTTP permission/actor/version tests، root maker-checker، immutable editorial fingerprints، slug draft continuation وrevision paging؛ review/root/locale والنشر يبقون عند المالك.
- CMS-ADM-009/010/015/020/021: canonical owner domain links، navigation freshness/target resolution، published relation selection وstrict public routing وredirect contracts؛ لا fallback لغوي مخفي أو نسخ كتالوجات أكاديمية داخل CMS.
- CMS-ADM-012…014/029: atomic publish lease، schedule repair وworker audit context، إضافة إلى cancellation الجديد؛ لا تشغيل worker حقيقي.
- CMS-ADM-016/017/019/022: schema/payload/window/audience policy، block archive وواجهة العمليات؛ لا نشر تلقائي عند حفظ مسودة.
- CMS-ADM-023: unit/API/SEO prerender/web contracts القائمة ضمن suite؛ لا build أو nginx runtime أو CDN/E2E عام في هذه الجولة.
- CMS-ADM-024…028 وFGA-16-001/002: bounded API/revision contracts، لوحة scoped للصفحة واللغة وowner readiness، redirects search/version/reason وSSR AR/EN؛ interaction جديد يثبت بقاء خطأ navigation منفصلًا مع تحميل إعلان صحيح وتغيير locale دون إبقاء بيانات اللغة السابقة.

## الأوامر والنتائج الفعلية

Node **22.23.3**؛ dependencies/Prisma Client المحلي من الجولة السابقة، و`react-test-renderer@19.2.8` موجود أصلًا في main من القسم 15؛ لا تعديل lockfile أو migration أو اتصال DB.

| الفحص | النتيجة الحالية |
|---|---|
| `vitest run --config .section16-vitest.config.ts` | **28 ملفًا /148 اختبارًا، كلها نجحت**؛15.41 ثانية إجمالية،1.41 ثانية تنفيذ tests. maxWorkers=2 وبدائل/HTTP محلي وrenderer فقط. |
| الاختبارات الجديدة | **30** ضمن148:21 repository/rights/scheduler/cache،7 React interaction،1 HTTP،1 application؛ لا تجمع مرتين. |
| `tsc -b packages/infrastructure apps/api apps/admin --pretty false` | exit0؛ مشاريع المصدر والعقود المتأثرة، دون build عام أو تشغيل التطبيق. |
| ESLint المستهدف | exit0؛**0 errors،21 warnings**، تفاصيل any في fixtures محفوظة؛ لا ادعاء إغلاقها. |
| `verify-phase16-source.mjs` و`verify-cms-source.mjs` | **20/20 و20/20**، assertions مصدرية فقط. |
| `git diff --check` | نجاح. |

التشغيل الأول لأربعة ملفات مستهدفة سجّل59 نجاحًا و3 إخفاقات بسبب fixture publication استخدمت `APPROVED` بدل `READY_TO_PUBLISH` الفعلية. صححت fixture دون إضعاف production transition policy، ثم نجحت suite القسم الكاملة. log الأول والنتيجة النهائية محفوظان لعدم إخفاء الفارق.

الأدلة والـSHA256: `evidence/section-16-completion-20261014/verification.json` وlogs المرافقة. لم يشغّل suite المستودع العامة أو اختبارات ثقيلة.

## الترحيل والرجوع وحدود التشغيل

**MIGRATIONS_APPLIED=0**؛ الترحيلات القائمة وخطة `section-16-migration-recovery.md` محفوظة. نشر المصدر لاحقًا يتطلب schema/client متوافقين مع snapshots/leases/indexes القائمة، دون ادعاء أنها مطبقة على البيئة.

عقد archiveAnnouncement يتطلب reason الآن؛ يجب تحديث المستدعين مع API/واجهة الإدارة. الطلب القديم بلا سبب يرفض400 بدل إيقاف إعلان بلا دليل. الرجوع عن هذا الكوميت يعيد الكود/العقد السابق دون حذف snapshots أو تعديل بيانات/مخطط؛ أي rollout/recovery تشغيلي له مصفوفته المنفصلة.

لا قاعدة حية أو browser E2E أو external provider أو cache purge أو تشغيل schedule worker أو نشر تطبيق. CMS-ADM-030 وSQL concurrency/asset runtime/CDN/real RBAC proofs مؤجلة لما بعد28. دفع main يستخدم `[skip ci]` احترامًا لطلب الاختبارات الخفيفة فقط، ولا يُعد شهادة إنتاج.
