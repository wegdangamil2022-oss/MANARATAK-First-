# R04 — تجهيز الترحيلات وNeon

الحالة: `PREPARED_NOT_EXECUTED`؛ لا CLOSED أو قبول DB. R00/R01/R02 ومتطلبات R03 الحية تبقى كما في تقاريرها؛ هذا عمل تجهيز مستقل بتوجيه المستخدم.

مرشح المصدر المفحوص: `3deef4557f181d6d7a3fd05e959990ac1bbfd36a`، الفرع `fix/post28-ci-environment-inventory-20261016`، شجرة نظيفة عند الفحوص. [الأوامر وSHA والتوقيت وexit codes وبصمات السجلات](../reviews/evidence/post28/3deef4557f181d6d7a3fd05e959990ac1bbfd36a/R04-R05-preparation/summary.json)، [حزمة التجهيز](../reviews/evidence/post28/3deef4557f181d6d7a3fd05e959990ac1bbfd36a/R04-R05-preparation/acceptance-preparation.json). الاختبارات الجديدة تخص المنطق والأدوات، وليست تنفيذ PostgreSQL. commit الأدلة اللاحق لا يعيد نسب هذه النتائج إلى SHA آخر.

## شروط القبول والأدلة والمتبقي

| الشرط | ما جهز فعليًا | ما بقي للقبول |
|---|---|---|
| نسخة وترتيب وبصمات migrations | استخراج109 ترحيلات من الشجرة الحالية مع checksum لكل SQL، وchainSha256 `937036de62620f4474fbe9071ef0e1eaddac971b64025a1b94c8ab1e62d67da7`، وschemaSha256 `56966e566cbcd7ea60966d3954a4368630753f35a265e24b8ece354387450d45`. لا تعديل للـschema أو SQL تاريخي أو lockfile. | Prisma client مطابق وقياس `_prisma_migrations` فعلي على الهدف. |
| ledger كامل | أضيف فحص الأسماء/checksums والترتيب والوقت وfinished/rollback/applied steps؛ يرفض نفس العدد مع اسم/بصمة مختلفة أو سجل جزئي أو resolved بلا replay. verifier المحلي يستعمله بدل الاعتماد على العدد وحده. | تشغيل فعلي على DB-G مصرح ومعروف الهوية. ملفات JSON الصناعية لا تصبح قبولًا. |
| idempotency | أضيف deploy ثانٍ بعد إعادة فحص الهوية، ومقارنة ledger كاملة بلا تغيير. | تشغيله فعليًا والتحقق من الآثار، دون seed أو browser قبل قبول البنية. |
| نظافة الأدلة | output directory جديد مطلق خارج Git؛ رفض الموجود أو symlink يعيد المسار إلى المستودع. producer النهائي يحفظ source SHA وchain/ledger digests ويميز seed غير المنفذ. | أدلة runtime حقيقية حديثة وبيئة ثابتة. |
| catalog والعلاقات |9 مرشحات NOT VALID مصدرية، تشمل CHECKs مالية وخدمية وFK وثيقة الطالب؛ لا إخفاء للفاحص أو تغيير migration قديمة. روابط77 علاقة/42 حالة/13 FX محفوظة بالمصدر والحزمة. | catalog/FK/index/trigger وorphan audits، وإجراء VALIDATE محدد مراجع؛nullable requirement وDEC dependencies لا تحسم بالافتراض. |
| Neon والعزل | أضيف فاحص تصريح منفصل دون اتصال: direct endpoint/TLS ورفض owner/pooler/aliases/restore؛ لا يغيّر الحارس المحلي ويعيد liveIdentityVerified=false وruntimeExecutionAuthorized=false. | إنشاء المشروع بواسطة المستخدم، أسرار البيئة، TCP exact host، provider-attested identity وroles/TLS adapter حي؛دالة pg_control_system المحلية لا تُفترض متاحة. |
| seed والتكامل | الخطة تتطلب required-only seed وdry-run/reconciliation/reapply، لا تشغيل ضمني لـdb:provision/db push/reset. | التنفيذ المقاس بعد قبول البنية، والتوقيعات المستقلة وCI الخارجي. |

## الفحوص المنفذة دون تكرار المجموعة العامة

- 83 اختبارًا متأثرًا:83 ناجحة،صفر فشل/تخطٍّ/إلغاء؛ تشمل ledger والترقية وتصريحات Neon وحراس العزل السابقة ذات الصلة.
- preflight:36/36،صفر فشل أو تخطٍّ. نجحت W2 وsource quality وorganization وsecret scan وESLint للملفات المتغيرة وBash syntax (exit0).
- صفر اتصالات DB،صفر migrations/fixtures/seed/restore. فحوص النظام العامة السابقة لا تعاد نسبتها لهذا المرشح، ولم تُعد مجموعة5076 أو build بلا تغيير منتج يقتضي ذلك.

[دليل إعداد Neon وخطوات R04/R05](../operations/POST28_NEON_R04_R05_PREPARATION.md). إنشاء حساب/قاعدة لا يفتح تلقائيًا صلاحية التنفيذ. لا R03 أو R04 runtime قبل متطلباته،لا main merge أو نشر،production=NO_GO.
