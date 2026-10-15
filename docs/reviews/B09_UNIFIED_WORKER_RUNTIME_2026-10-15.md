# B09 — توحيد تشغيل العمال ودليل التشغيل

التاريخ: 2026-10-15. أساس العمل: `8cb0c8f` على `fix/b02-auth-session-boundary-20261015`.
يغطي ARCH-07. الحالة: **SOURCE_VERIFIED**؛ تشغيل المضيف وقاعدة البيانات والمزودين **PENDING**.

## النتيجة

وجدت نسختين من scheduler، لكن `server.ts` وحده يستدعي النسخة الفعلية؛ استيراد
`PollingWorkerBootstrapper` في `app.ts` لم يكن مستخدمًا. لذلك لم يثبت تشغيل عاملين
متطابقين بسبب هذا الاستيراد. أزلت الملف القديم والاستيراد بعد جرد المستهلكين،
ووحّدت تسجيل وتشغيل وإيقاف مسارات polling الأربعة في `PollingWorkerRuntime.ts`.

- الحفاظ على ترتيب certificate، ومسارات الطالب الثمانية، وsettings/career/services، وdurable jobs.
- جميع الاعتمادات والفترات تتحقق قبل أي timer أو تنفيذ: فشل تسجيل متأخر لا يترك نصف مشغل نشط.
- منع تداخل دورة المسار نفسه، وهوية تشغيل تضم UUID مع PID، وstop ثابت ينتظر المهام؛ استدعاء stop قديم لا يمحو مقبض تشغيل أحدث.
- تسجيل نجاح/فشل وإيقاف كل مسار، بما فيه durable؛ إبقاء مقاييس iterations/duration القائمة.
- نقل تعريفات recurring الأحد عشر إلى `RegisterRecurringJobs.ts` واستدعائها من الخادم. مقارنة AST قبل/بعد أثبتت تطابق جميع الكائنات الأحد عشر، دون تغيير cron أو payload أو retry أو stableReference.
- حماية heartbeat العامل الدائم من rejection غير معالج: فقد/تعذر إثبات الملكية يلغي سياق المعالج ولا يسجل complete/fail زائفًا.
- drain يتتبع طلب claim نفسه، وليس المعالجات التي بدأت فقط؛ لا يغلق الموارد أثناء انتظار رد الحجز.
- التقاط خطأ heartbeat outbox الخلفي دون rejection غير معالج؛ terminal CAS يبقى المرجع النهائي للملكية. لا يمكن لهذا التعديل إلغاء أثر خارجي بدأ بالفعل.
- تحديث DI manifest: **424/424 reachable**، وحارس W3 لقراءة تعريفات recurring من موقعها الجديد دون إضعاف شروطها.

## اختيار المضيف والجرد

المضيف المدعوم بالمصدر هو خادم Node الدائم `apps/api/src/server.ts` مع دورة حياته الحالية؛
لم يثبت وجود نشر عامل دائم في البيئة الفعلية، ولم ننشئ cron خارجيًا أو بنية نشر تخمينية.
`createApiApp` لا يبدأ polling؛ طلبات HTTP لا تملك scheduler. راجع
[دليل التشغيل](../operations/BACKGROUND_WORKER_RUNTIME.md) لجرد route→host→cadence→lease→retry→DLQ→shutdown،
والتعريفات الأحد عشر، ومسؤول المشغل، والمراقبة والتراجع. Serverless HTTP يحتاج مضيفًا
دائمًا منفصلًا مثبتًا أو تصميم cron/queue مؤمن قبل إعلان تفعيل العمال؛ flags وحدها غير كافية.

لا نمنح كل أعمال الصيانة ضمان lease موحدًا: expiry/recovery/replay/reconciliation
تحتفظ بعقود المالك القائمة، أما outbox وdurable queue فيحتفظان بأقفالهما وCAS.
Delivery at-least-once؛ منع الأثر المكرر يتطلب idempotency من المالك/المزود.

صحة HTTP لا تثبت تشغيل العمال: health يقرأ أدلة Redis الحديثة الخاصة بالبيئة/المراجعة،
ولا يصنع heartbeat عند القراءة. غياب العامل أو تقادم الدليل يبقي القدرة RUNTIME_PENDING.
احتفظنا بهذا العقد واختبرنا غياب/تقادم/توقف الدليل ببدائل محلية.

## الفحص الخفيف

**26 اختبارًا ناجحًا، صفر فشل**:

- 21 Vitest في 4 ملفات: fake timers، ترتيب المسارات، تعطيل flags، عدم التداخل، retry بعد فشل دورة، startup بلا آثار جزئية، stop/drain/restart، انتظار claim المعلق، renewal وفقد/تعذر lease، تنازع عاملين ببديل queue، DLQ/backoff، تعريفات recurring وhealth، وتجديد outbox وCAS.
- 5 Node قائمة للعامل/cron/idempotency/stale lease/outbox fencing.
- `tsc --noEmit -p apps/api/tsconfig.json --composite false --incremental false`: ناجح.
- ESLint للملفات المعدلة: صفر أخطاء و12 تحذير any موثقة في سجل الفحص.
- Source quality: ناجح، صفر cycles أو a11y findings. DI: ناجح 424/424. `git diff --check`: ناجح.
- W3 العام: **53/55، فاشل إجمالًا**. مقارنة تشغيل النص على HEAD السابق أثبتت وجود نفس الملاحظتين قبل B09: `MNT-AUD-0011` (upload grant)، و`MNT-AUD-0016` (شرط نصي role event). لم نغير نطاقهما ولم نصف W3 بأنه ناجح.

الأدلة المحلية: `/workspace/reports/b09-workers-20261015/`.
لم نشغل build شاملًا أو حزمة اختبارات ثقيلة، ولم نتصل بقاعدة تشغيل أو نشغل مزود إشعارات أو إصدار شهادات حقيقي.

## المتبقي والتراجع

يلزم قبول runtime معزول: قاعدة قابلة للإتلاف لإثبات claim contention/reclaim وCAS،
مضيف دائم مثبت، SIGTERM ومدة الإيقاف، انتشار heartbeat بين HTTP والعامل، ومزودون
بـidempotency مثبتة. الاختبارات المحلية تستخدم بدائل ولا تثبت أقفال PostgreSQL الحقيقية.
ميزانية الخادم الحالية 15 ثانية؛ تجاوزها يحتفظ بسلوك forced cleanup/nonzero exit.
المعالجات التي تتجاهل AbortSignal لا يمكن إيقاف أثرها الخارجي بمجرد Promise.

التراجع: إيقاف المضيف البديل وانتظار drain/انتهاء lease قبل القديم؛ لا حذف بيانات queue
أو تعديل tokens أو تشغيل نسختين غير مضبوطتين. لم يتغير schema أو migration أو عقد API.
الحزمة التالية **B10a**، تبدأ بمواصفة دورة حياة الزمالات قبل واجهتها.
