# تجهيز R06–R09 قبل اتصال Neon

هذا تجهيز مصدر وتشخيص بناء؛لا يبدأ قبول تشغيل R06 قبل R04/R05،ولا يقبل R07 دون قاعدة وخدمات مختبر موثقة وruntime layer. لا تتغير حدود R00–R05 أو DEC-01…07،ولا يُنفذ نشر أو migration أو seed أو اتصال مزود حقيقي.

## R06 — المعاملات والعلاقات

يمكن توليد قائمة المتطلبات دون استيراد اختبارات قاعدة البيانات أو تشغيل hooks:

```bash
node scripts/database/prepare-post28-r06-r09.mjs /absolute/private/new-preparation.json
```

يجب أن يوجد parent directory خارج Git،ولا يعاد استخدام ملف قائم. تسجل الحزمة26 حالة R06 الإلزامية من الملحق (CD-001…019 و026/028/029/030/035/036/040)،والمالكين والنتيجة المطلوبة والقرارات المعلقة. تسجل أيضًا ملفات profiles الموجودة وحدودها؛وجود assets/leases/persistence/sections123 لا يثبت تغطية التمويل أو consent أو جميع علاقات الجامعة والمنحة والدورة. أوامر runtime غير المربوطة تبقى null ولا تصنع PASSES.

غدًا بعد إثبات R03 وقبول R04/R05،يلزم على DB-T منفصلة:

- application role محدود فعليًا،وsynthetic owner fixtures بنسخة/run مستقلين عن DB-E.
- اتصالان حقيقيان بهويتَي backend مختلفتين،barriers محدودة وملاحظة lock/lease/CAS؛لا sleep تخمينيًا أو mock للـtransaction.
- owner+audit+outbox/receipt كلها commit أو كلها rollback؛failure injection قبلcommit مع assertion للأرصدة والـholds والـbindings والقراءة العامة.
- retry/idempotency وstale/missing version وprivilege/owner negatives،من دون حذف ledger أو receipt تاريخي للتنظيف.
- القرار المؤسسي المعلق،مثل degree-major pairing أوnullable uniqueness أوإبطالprojection،يبقى BLOCKED حتى اعتماده؛لا ينشأ schema علاج افتراضي.

الحزمة تكشف نقص owner runtime suites؛لا تنفذ هذه المعاملات أو تضيف دليلًا مزيفًا لها. الحارس الحالي محلي؛تكييف هوية Neon الحية وTLS/grants ما زال مطلوبًا كما في [دليل Neon](POST28_NEON_R04_R05_PREPARATION.md).

## R07 — بناء وتشخيص artifact دون boot أو نشر

أضيف أمر تشخيص يفرض Node22 ومصدرًا نظيفًا،وينشئ مجلدًا جديدًا خاصًا خارج Git:

```bash
node scripts/release/post28-diagnostic-build.mjs /absolute/private/new-r07-run
```

ينفذ Prisma generate من الحزم المحلية،ثم build للوحدات مرة واحدة،ثم packaging وdigest/SBOM verification وunpack جديد لكل وحدة. لا يبدأ API أو worker أو متصفحًا،ولا يتصل بقاعدة. يتحقق من وجود API entrypoint وJavaScript الواجهات داخل النسخة المفكوكة،ومن عدم وجود checkout أوnode_modules موروثة في جذرها. runtime layer الخارجي والـnative modules وPrisma engines والـboot نفسه تظل متطلبات غير مثبتة.

المخرجات:

- checks.json: الأوامر والتوقيت والنتائج وhashes للسجلات.
- artifacts/: ثلاث حزم tar وmanifest وSBOM وdigests؛محلية خاصة،ولا ترفع tar إلى Git تلقائيًا.
- unpacked-api/web/admin/: نسخ جديدة للفحص،دون process boot.
- summary.json: source/lock/schema/generated-client/SBOM/artifact digests؛runtimeBootVerified=false وstageAccepted=false وpromotionAuthorized=false.

فُرض output جديد على builder لمنع استبدال artifact قائم،وفُرضت نظافة المصدر بما فيه untracked files. ترفض مدخلات packaging symlinks والملفات الخاصة ومسارات الخروج قبل كتابة بصمات الواجهات.

أُصلح فحص BUILT: بصمة HTML وحدها لا تكفي؛يجب أن يشير HTML إلى JS محلي موجود وغير فارغ،دون symlink أو traversal أو مصدر خارجي. أُصلح smoke ليطلب JS للوحدتين ويرفض redirect و404 وHTML fallback ولو سمي JavaScript. هذه فحوص presence/protocol؛لا تثبت أن التطبيق تفاعل بنجاح في متصفح أوأن API اتصل بقاعدة.

للقبول الفعلي لاحقًا: CI موثق لنفسSHA،runtime image/native dependencies وclient متوافق،ثلاث وحدات منartifact وحده،TLS/CORS/cookies/base paths،readiness exact200/protocol2/fresh SHA،وقاعدة/Redis/storage مختبر موثقة. static build health لا يعوض backend readiness.

## R08 وR09

تدرج الحزمة متطلبات العمال والجلسات والمزودين،و77 علاقة و42 حالة ومصفوفة26 مجالًا بأبعادها الخمسة. اختبارات shutdown/lifecycle بمصادر معزولة لا تثبت تشغيل عاملين حقيقيين أوPostgreSQL/Redis أوprovider effects. اختبارات HTTP المعترضة لا تثبت built-browser+DB.

لا تشغيل SMTP أودفع أومزودAI حقيقي،ولا FLUSHALL علىRedis مشترك،ولاload أوrestore دون هدف وميزانية وسلطات مرحلتها. تبقى كل نتائج التشغيل NOT_EXECUTED حتى قياسها؛لا R03–R09 CLOSED بسبب تقرير تجهيز أوbuild تشخيصي.
