# POST28 — تحقق Neon بالقراءة فقط قبل R03

## النطاق والوضع الحقيقي

المرجع المعتمد هو [سجل الهدف](../../config/testing/post28-neon-target.json). المشروع `lively-feather-03681988` والفرع المرجعي `br-patient-recipe-bahs1ix7` وقاعدته `manaratak_test` مخصصون للاختبار. هذا الفرع طويل العمر مرجع، ولا يُقبل كهدف DB-G/DB-S/DB-T حتى إن كان فارغًا. لم تُنشأ أهداف إضافية في هذه الجولة.

أداة Neon المتصلة بالحساب تقرأ المشروع والفرع والقاعدة بنجاح. أما عملية Prisma في بيئة Codex فلا تملك حاليًا DATABASE_URL/DIRECT_URL أو NEON_API_KEY، وسياسة TCP لا تحتوي مضيفًا مصرحًا. لا تُنسخ صلاحيات الأداة إلى بيئة التنفيذ تلقائيًا، ولا ينتقل الوصول بمجرد اختيار فرع Git.

الفحص الحي بالقراءة فقط كشف PostgreSQL16، صفر جدول عام، ومالكًا ذا CREATE ROLE/CREATEDB/REPLICATION/BYPASSRLS وعضويات مرتفعة. لا يُستخدم هذا المالك للتشغيل أو لتنظيف fixtures. جلسة SQL عبر MCP أعادت `tls=false`؛ هذه ملاحظة للمسار الداخلي للأداة وليست إثبات TLS لاتصال Codex المباشر. لا ندعي نجاح اتصال Prisma أو اعتماد TLS من هذه النتيجة.

## ما أصبح مدعومًا

- التصريح القديم غير المتصل يبقى متاحًا، ولا يمنح هوية حية أو إذن تشغيل.
- التصريح الأقوى يتطلب `purpose=READ_ONLY_PREFLIGHT` وUUID تشغيل وSHA حاليًا، والسجل المعتمد، والدور والغرض والفرع والـendpoint والقاعدة صراحةً. لا مشروع افتراضي ولا فرع main ولا baseline كهدف.
- تستعلم أداة التحقق عن **Neon API مصادق عليه** عبر GET فقط، لتطابق المشروع/الإصدار/المنطقة، وفرعًا غير افتراضي جاهزًا مشتقًا مباشرة من المرجع، وربط endpoint بالفرع، والقاعدة والدور ومالكًا مستقلًا. تُعاد المطابقة بعد SQL لرفض تبدل الهوية أثناء الجولة. JSON يكتبه المستخدم أو رايات البيئة ليس بديلًا عن هذه المطابقة.
- اتصال Prisma5.22 المباشر يتطلب `sslmode=require&sslaccept=strict`؛ يُرفض pooler وTLS المخفف والخيارات الزائدة أو المكررة وتغيير host/role/schema. يظل إثبات صلاحية هذا الإعداد على Neon الحقيقي مطلوبًا بعد إعداد الوصول.
- SQL ثابت داخل `SET TRANSACTION READ ONLY` بوقت محدود. لا يعتمد على امتياز pg_control_system أو كتابة database comments على Neon. تقاس هوية الجلسة والقاعدة وOID والإصدار وUTC/GMT وTLS1.2/1.3، وعضويات neon_superuser/global read/write وملكية القاعدة/العلاقات وCREATE داخل/خارج public وsession_replication_role. غياب أي حقل مطلوب يفشل.
- التطبيق/المفتش لا يملكان CREATE أو علاقات؛ migrator/shadow يحتاجان CREATE في public دون صلاحيات إدارة القواعد والأدوار. ليس هذا بديلًا عن مراجعة grants الكاملة في R03/R06.
- تُفحص جميع تصريحات G/S وعدم اشتراك الهدف قبل أي SQL؛ الدوران مختلفان، وهوية القاعدة لا تستنتج من اختلاف كلمات المرور أو أسماء endpoints فقط.

كل نجاح يصدر `runtimeExecutionAuthorized=false`. مشغّل parity وPrisma diff وDB-T ما زالت تتطلب عقدًا محليًا، وglobalSetup يرفض Neon قبل استيراد الاختبارات؛ أعلام CI لا تتجاوز الرفض. لا تزل هذه الحماية لتشغيل R04.

## ما يلزم قبل استخدام المسار من Codex

هذه قائمة تجهيز لاحقة؛ **ليست تفويض إنشاء أو تغيير موارد**:

1. تفويض مستقل ومحدد للأهداف الجديدة والأدوار وحدودها، ثم إنشاء DB-G وDB-S فارغتين بهويتين منفصلتين عن المرجع. لا تستعمل رابط المالك الحالي ولا تعِد تسمية host لتجاوز السياسة.
2. حقن روابط Direct ذات أدوار محدودة في أسرار بيئة التنفيذ، وبصلاحيات اختبار المشروع فقط. للحالة الزوجية يستعمل المسار `GREENFIELD_DATABASE_URL` و`GREENFIELD_SHADOW_DATABASE_URL`، وللحالة الفردية DATABASE_URL وPOST28_TARGET_LABEL. DIRECT_URL مطلوب في إعداد Prisma العام؛ لا تضبطه على قاعدة أخرى أو دور أعلى. لا رابط أو token في الدردشة أو Git أو OS argv.
3. توفير NEON_API_KEY مصرح له بقراءة بيانات المشروع/الفرع المطلوبة؛ تحفظ قيمته في أسرار البيئة فقط. قراءة MCP لا توفر هذه القيمة لعملية Codex. لا تشغّل تسجيل دخول تفاعليًا نيابة عن المستخدم، ولا تنشئ مشروعًا بديلًا عند فشل المصادقة.
4. عبر إعداد البيئة المدعوم، تصريح TCP باسم **كل مضيف Direct بعينه**؛ HTTPS المفتوح أو wildcard لا يحقق شرط المسار. يحتفظ curl بالـproxy وCA، ويعطل تحميل curlrc ولا يعطل TLS. تحقّق من جاهزية الأسرار والسياسة بعد إعداد البيئة.
5. مصدر نظيف على فرع Git المسجل، ثم عقد هدف خاص خارج Git يُكتب للـSHA الحالي وrun جديد. أي تغيير مصدر يتطلب تجميدًا ودليلًا جديدين.

## شكل العقد — قالب غير قابل للتنفيذ كما هو

```json
{
  "version": 1,
  "kind": "POST28_NEON_TEST_DECLARATIONS",
  "purpose": "READ_ONLY_PREFLIGHT",
  "sourceSha": "<current clean 40-character SHA>",
  "runId": "<new UUID>",
  "projectId": "lively-feather-03681988",
  "referenceBranchId": "br-patient-recipe-bahs1ix7",
  "postgresMajor": 16,
  "targets": {
    "DB-G": {
      "branchId": "<authorized new branch ID>",
      "branchName": "post28-<run>-g",
      "endpointId": "<exact ep-ID>",
      "directHost": "<exact direct hostname from Neon>",
      "database": "manaratak_post28_greenfield_test",
      "role": "post28_migrator",
      "roleKind": "MIGRATION"
    },
    "DB-S": {
      "branchId": "<authorized new shadow branch ID>",
      "branchName": "post28-<run>-s",
      "endpointId": "<exact shadow ep-ID>",
      "directHost": "<exact shadow direct hostname from Neon>",
      "database": "manaratak_post28_shadow_test",
      "role": "post28_shadow",
      "roleKind": "SHADOW"
    }
  }
}
```

بعد توفير المتطلبات، يحدد POST28_TARGET_CONTRACT_FILE مسار العقد الخاص. الأمر التالي **قراءة فقط**، ولا يشغل ترحيلًا أو يجهز قاعدة:

```bash
node scripts/database/post28-preflight.mjs --pair --require-empty
```

لا تغيّر CI أو DATABASE_DISPOSABLE_REMOTE_APPROVED لإنجاحه. عند BLOCKED، سجّل السبب ولا تنتقل إلى R04.

## نقطة الاستئناف

بعد المصدر: R02-core جزئية؛ R03 محجوبة إلى حين الأهداف والأدوار والأسرار والشبكة والتحقق المباشر. R02-coverage وقرارات DEC والتوقيعات والميزانيات لها متطلبات مستقلة باقية. قبل R04 يلزم أيضًا قبول R03، وتكييف تنفيذ بعيد منفصل ومراجع مع حواجز كل subprocess، وتفويض ترحيلات واضح، وتجميد سلسلة migrations، ومراجعة orphan/NOT VALID دون تحرير التاريخ. لا migrate/seed/reset/db push/restore/load أو نشر ضمن هذه الجولة.

مراجع الاتصال الرسمية المقروءة في الجولة: [TLS](https://neon.com/docs/connect/connect-securely)، [Prisma](https://neon.com/docs/guides/prisma)، [Neon API](https://neon.com/docs/reference/api). دليل Prisma الحالي يصف الإصدار7؛ المشروع باقٍ على5.22، ولم يُرقَّ اعتمادًا على هذا الدليل.
