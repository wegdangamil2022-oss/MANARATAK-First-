# R08 — إثبات SIGTERM وRedis المعزول على Linux

**نجح النطاق التشخيصي لـLinux/Redis على المصدر `26fe899a033ab93eb3a44b39df1c10d9600bcd87`. قبول R08 الشامل وR07 الرسمي ما زالا مفتوحين.** [التشغيل](https://github.com/wegdangamil2022-oss/MANARATAK-First-/actions/runs/39287364100)، job `118178128146`.

أُصلح تركيب WorkerHealthObservation ليقرأ `REDIS_NAMESPACE` الفعلي، وصارت المفاتيح داخل namespace مع environment/origin/revision ببصمة مستقرة وصيغة v2. لم تكن مفاتيح health القديمة تتبع namespace الذي يستخدمه عميل Redis لبقية الميزات. لا تعاد قراءة المفاتيح القديمة؛ لذلك ينتظر readiness ملاحظة جديدة من عامل أكمل دورة على النطاق والإصدار الجديدين. لا حذف Redis عام ولا ترحيل بيانات أو تعديل قاعدة.

أثبت الاختبار الفشل قبل الإصلاح، ثم نجحت ثلاثة اختبارات جديدة وثلاثة B09 متأثرة مباشرة. نجح API TypeScript وYAML وESLint بلا أخطاء مع تحذير any موروث واحد، وفحص تثبيت 65 مرجع Actions. أُعيد توليد جرد البيئة الرسمي: 321 اسمًا، دون قراءة قيم الأسرار؛ كان تحديث مراجع الملفات الجديدة مطلوبًا أيضًا لإصلاح فشل R07 السابق.

## النتائج الفعلية

شغّل job مستقل على Ubuntu/Node22.16 اختبارات العمليات نفسها ثم مختبر Redis جديدًا، دون انتظار بناء المشروع أو تشغيل قاعدة بيانات:

| الفحص | الدليل |
|---|---|
| Owner وStudent SIGTERM | عمليتان حقيقيتان، لا خطوة جديدة بعد stop، والحالة STOPPED وfresh=false؛ drain نحو 81ms بعد تحرير المهمة |
| مراقبة معلقة | جسم shutdown الفعلي مع HTTP معزول وflush لا ينتهي: خرج بالرمز1 بعد 15008.258ms عند مهلة15000ms |
| معدل مشترك | عمليتا Node مستقلتان استعملتا RedisRateLimiter الفعلي: 24 محاولة إجمالًا، المسموح10 فقط |
| فصل النطاق والإصدار | ملاحظة namespace أو revision أخرى كانت NOT_STARTED؛ الملاحظة المتقادمة رُفضت |
| أقل صلاحية | user `post28` فقط، default معطل، مفاتيح محصورة بمعرف run، ولا ACL/CONFIG/FLUSHALL؛ أمر إداري للقراءة رُفض بـNOPERM |
| انقطاع Redis | أُوقفت الحاوية المملوكة بعد التحقق من هويتها وlabel؛ قراءة health رفضت الخطأ ولم تصطنع healthy |
| التنظيف | أُزيلت الحاوية التي أنشأها التشغيل وحدها؛ receipt يثبت `ownedContainerRemoved=true` |

بُني المختبر من `redis:7-alpine` المستخدم أصلًا للتطوير، وحُسمت الصورة إلى digest قبل تشغيلها، وحُفظ digest الفعلي في الإيصال. حاوية Redis بمستخدم redis، read-only/cap-drop/no-new-privileges، دون persistence، ومنفذ عشوائي على loopback فقط. كلمة المرور مولدة للتشغيل وتُنقل عبر stdin إلى عمليات الاختبار؛ لا argv أو env artifact، ويُحذف ملف ACL المؤقت. لا استعمال لعناوين DATABASE_URL أو REDIS_URL الموروثة، ولا لمس خدمة موجودة.

استُرجع artifact `12203358536` فعليًا، وتحقق أن ZIP يحتوي ملف JSON واحدًا باسمه المحدد، وأن SHA المصدر ونتائج assertions والتنظيف متطابقة. [الإيصال الأصلي](../reviews/evidence/post28/26fe899a033ab93eb3a44b39df1c10d9600bcd87/r08-redis-boundary/redis-execution-receipt.json)، [سجل عمليات Linux](../reviews/evidence/post28/26fe899a033ab93eb3a44b39df1c10d9600bcd87/r08-redis-boundary/linux-process-proof.log)، [فهرس البصمات](../reviews/evidence/post28/26fe899a033ab93eb3a44b39df1c10d9600bcd87/r08-redis-boundary/evidence-index.json). استرجاع هذا التقرير ليس إثبات استرجاع وحدات API/Web/Admin المطلوبة لـR07.

## حدود النتيجة والمتبقي

هذا إثبات لعامل polling ومحدد المعدل ومخزن health الفعليين، وليس تشغيل جلستين كاملتين من API مبني أو إثبات إغلاق موارد PostgreSQL/Redis داخل API كامل عند التجاوز. تبقى persisted sessions بعمليتي API، وترتيب أحداث المالك، وcanonical import، وprovider stubs للـsigned webhook/unknown outcome/reconciliation والسلاسل المالية المعنية. لا قبول مالي مستنتج من عداد Redis، ولا exactly-once transport.

R07: استُخدم سجل job السابق بدل حالة REST المتأخرة؛ تشغيل `39285187356` فشل في inventory رغم ظهور queued. أُصلح الجرد، والتشغيل الحالي اجتاز preflight/closure/Prisma/typecheck/Vercel ثم lint والبناء، ودخل اختبارات unit عند آخر قراءة. unit/artifacts والاسترجاع وصورة الإصدار ليست PASS بعد. حالة R05/R06 محفوظة. لا إنتاج أو Neon أو main أو مزود مؤثر.

نقطة الاستئناف: نتيجة R07 الحالية من job logs/steps، ثم جلسات API الموزعة وبقية سلاسل R08. حفظ التوثيق فقط بـskip ci يمنع تشغيل نسخة مكررة؛ أدلة التنفيذ تبقى مرتبطة بالمصدر أعلاه.

### نتيجة R07 اللاحقة

اكتمل job المصدر `118178128350` بالفشل في unit على المصدر نفسه؛ اجتازت source-quality/preflight/regressions/closure وPrisma وtypecheck/Vercel وlint/build. نتيجة Vitest: 5134 passed، و11 failed، و7 skipped؛ خمس ملفات فاشلة و687 ناجحة وثلاثة متخطاة. لا يُحوَّل هذا إلى نسبة قبول أو PASS. لم تُبنَ artifacts، وبقي استرجاع وحدات الإصدار وصورتها محجوبين. نطاق R08 المستقل الناجح لا يتأثر بهذا التصنيف.

الملفات الفاشلة: `tests/remediation/B05ProgramOwner.spec.ts` (7 حالات عقد مالك البرنامج)، و`packages/application/tests/localization/B11OwnerDescriptions.spec.ts` (قراءة published)، و`packages/infrastructure/tests/asset-platform/PrismaAssetEvidenceRoundtrip.spec.ts` (`ASSET_VERSION_HISTORY_INVALID`)، و`packages/infrastructure/tests/cms/CmsRelatedPublishedSelection.spec.ts` (delegate course.findMany ناقص)، و`packages/infrastructure/tests/scholarships/PrismaScholarshipCanonicalLookupGateway.spec.ts` (عقد lookup). يلزم فحص كل fixture مقابل عقد الكود الحالي قبل إصلاحه؛ لا تضعيف assertion أو guard ولا إعادة مجموعة عامة دون تغيير يبررها. السجل الرسمي: [job المصدر](https://github.com/wegdangamil2022-oss/MANARATAK-First-/actions/runs/39287364100/job/118178128350). توجيه المالك الحالي عند عدم اكتمال R07 هو مواصلة R08؛ التالي جلسات API الموزعة وسلاسل المزودين، مع إبقاء إخفاق CI ظاهرًا.
