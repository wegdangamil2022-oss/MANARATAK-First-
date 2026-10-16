# R05 — تشغيل predecessor109 والتحقق من النسخ الاحتياطي محليًا

التاريخ: 2026-10-16. الفرع: `fix/post28-ci-environment-inventory-20261016`.

## الحالة

**R05: BLOCKED للقبول الكامل، مع نجاح baseline وأدوات النسخ الاحتياطي فعليًا.**
اختار المستخدم النسخة الموثقة ذات109 migrations: `23897bdaa66d966eef15c85f44288589ecbcdf2b`.
SHA المصدر المفحوص: `92a0f3b413f1e778479513d9f4eebea2159596dc`؛ commit التقرير لاحق عليه ولا يعيد نسبة التشغيل إلى SHA غير مفحوص.
R04 المحلية تظل PASS على مصدرها `467d1369e8da0a93ea3444bc1ef6a56c5e53d57d` وفق [تقرير إغلاقها](POST28_R04_LOCAL_CLOSURE_2026-10-16.md).
لم نعد اختبارات R04 المقبولة، ولم يبدأ R06 أو DB-T أو اتصال Neon أو أي إجراء إنتاجي.

الأدلة: [status.json](../reviews/evidence/post28/92a0f3b413f1e778479513d9f4eebea2159596dc/r05-baseline-backup/status.json).

## ما نُفذ

1. تحققنا من HEAD البعيد عبر FETCH_HEAD: `500a618417de749f447335c5496ee710506ae5c8`، ثم أضفنا العمل عليه. tracking ref المحلي القديم لا يعتمد كدليل HEAD.
2. قورن schema وlock وSQL التاريخي من Git. تطابقت109 بصمات مع مقدمة السلسلة110 دون تعديل migration تاريخية. التغيير المعلّق الوحيد `20261016150000_post28_schema_reconciliation`، ولم يطبق على DB-U.
3. أُنشئ مختبر PostgreSQL16.15 جديد بالأداة الرسمية، بأدوار upgrader/verifier محدودة، bootstrap للإنشاء فقط. لا database ownership أو superuser أو bypassRLS للأدوار التشغيلية. أثبت preflight العزل بالـserver identity وOID وmarker وrun/SHA، وUTC.
4. استُخرج schema109 وترحيلاتها الأصلية إلى مكان خاص خارج Git. نجحت Prisma validate وgenerate وmigrate deploy وmigrate status. جرى توليد العميل السابق5.22.0 باستخدام dependencies مثبتة والتحقق من نسخة CLI/client و281 model، دون auto-install.
5. نجح ledger109/109 اسمًا وترتيبًا وبصمة، بلا rolled-back أو partial. نجحت استعلامات delegates فعلية بالعميل السابق: providers18 وcountries0. هذه استعلامات قراءة قبل الترقية، وليست قبول توافق العميل بعد الترقية.
6. أُخذ pg_dump custom، وفُحص PGDMP وTOC وفُك كامل الأرشيف إلى SQL في الذاكرة دون تنفيذه. حجم الأرشيف1,039,993 bytes وبصمته `f1995aea0e94463dd87dfe28069b8434b70ec360dbf9e6340098f48889fc84d5`.
7. نجح اختباران سلبيان فعليان قبل الاستعادة: رفض غياب تصريح DB-V المنفصل، ورفض تعديل byte بالأرشيف. أُعيدت بايتات الأرشيف الأصلية في finally، وأثبت preflight مستقل أن V بقيت فارغة.
8. استُعيد الأرشيف على DB-V الفارغة بدور verifier عبر single transaction/exit-on-error/no-owner/no-acl. جرى استبعاد SCHEMA public وEXTENSION pg_trgm وتعليقه فقط، لأنها أُنشئت بواسطة bootstrap؛ لم يستبعد أي جدول أو بيانات أو قيد. تطابق كل محتوى الجداول وتعريفات catalog، وأُثبت أن DB-U لم تتغير.

## هوية التشغيل النهائية

| الإعداد | القيمة |
|---|---|
| Run | `ae7be4ce-3403-4001-8fd3-52c78235e721` |
| PostgreSQL | 16.15، image digest مثبت بأداة المختبر |
| Loopback port | 15439 |
| Server identity | `7697294871089496108` |
| DB-U | `manaratak_post28_upgrade_test` / `post28_upgrader` / OID16387 |
| DB-V | `manaratak_post28_upgrade_verify_test` / `post28_verifier` / OID16469 |
| جداول كل هدف بعد الاستعادة | 282:281 application + ledger |
| بيانات التطبيق | 63 صفًا من migrations الأصلية؛ ليست fixtures تاريخية ممثلة |

كلمات المرور وعقد الأهداف والأرشيف والعميل المولّد والسجلات الخاصة خارج Git تحت `/workspace/scratch/post28/labs/lab-3c9lno/`. هذا مسار بيئة مؤقتة؛ الدردشة الأخرى قد لا تملكه ويجب عليها إنشاء مختبر جديد بعقد SHA/run جديد، دون إعادة ربط هذا المختبر بمصدر آخر. ملفات Git تحتوي ملخصات وبصمات لا روابط مصادقة. المنفذ loopback محلي معزول؛ لا يستدل منه على قبول TLS السحابي.

## البنية والقيود

قورنت282 بصمة محتوى جدول،732 قيدًا،1191 index،40 trigger مفعّلًا،14 دالة تطبيقية و3477 عمودًا. عدد الفهارس غير الصالحة0. [الجرد](../reviews/evidence/post28/92a0f3b413f1e778479513d9f4eebea2159596dc/r05-baseline-backup/catalog-summary.json) يحتوي أسماء الجداول والقيود وبصماتها.

بقيت القيود التسعة NOT VALID كما هي على109 وعلى نسخة V، وهذا متوقع للنسخة السابقة؛ لم نعلن قبول R04/110 لهما:

- `FinancePayment_positive_units`
- `FinanceRefund_positive_units`
- `FinanceTransfer_positive_units`
- `FinanceWalletHold_positive_units`
- `FinanceLedger_positive_units`
- `ServiceCatalogRecord_fulfillment_policy`
- `ServicePricingRecord_bounded_money`
- `SettingAssignmentRecord_id_currentVersionId_fkey`
- `StudentApplicationDocumentBinding_assetId_fkey`

لم تنفذ orphan audits أو constraint validation الخاصة بالترقية110 على U. NOT VALID ليست إذنًا لإدخال orphan جديد؛ FK وtriggers القائمة تمنع ذلك. مصدر108 المرشح ومسار تجهيز الحالات التاريخية موثقان في [عقد fixtures للمراجعة](POST28_R05_HISTORICAL_FIXTURE_REVIEW_2026-10-16.md).

## الإصلاحات والفحوص

- المقارن أصبح يتطلب planv2 ببصمات schema/chain المتوقعة قبل/بعد وهوية DB-U مثبتة في الخطة؛ تساوي لقطتين مزورتين لا يكفي. ترفض خططv1 غير المثبتة، وخطة التجهيز غير المربوطة لا تمنح قبولًا.
- أضيف upgrade profile ينشئ U/V فقط، دون إعادة استخدام G/S/R/T. لكل من U/V roleKind=MIGRATION ودور مستقل، مع إبقاء profile الافتراضي G/S كما هو.
- ثُبت Docker على socket المحلي وصُرفت محددات السياق البعيد، مع إبقاء Docker config وproxy/CA كما هي.
- أضيف ربط تصريح الكتابة المنفصل لهوية DB-V. النسخ لا يستخدم clean/reset/drop ولا DB-R؛ أدوات القياس تعمل READ ONLY.
- صُنفت الأدوات في سياسة operational tooling وحدث جرد البيئة305 أسماء دون قيم.

| الفحص النهائي على SHA92a0f3b4 | النتيجة |
|---|---|
| الاختبارات المصدرية المتأثرة | 225 PASS /0 FAIL /0 SKIP /0 TODO |
| الاختبارات السلبية الفعلية | 2 PASS: غياب تصريح V وعبث الأرشيف |
| Prisma القديم | validate/generate/deploy/status:4 ناجحة |
| Architecture / source quality / ESLint | PASS؛ ESLint بلا تحذيرات لهذه الملفات |
| Environment inventory / secret scan / repository organization / diff check | PASS |

وقع أثناء التطوير خطأ fixture لاختبار DB-V (اسم قاعدة غير مطابق للرابط)، وصُحح؛ النتيجة النهائية أعلاه دون فشل. محاولة preflight باسم `r03-v-still-empty` استعملت افتراضي U بعد تعبئتها ورُفضت بحق بـEMPTY_DATABASE_REQUIRED؛ صُحح تحديد V وأثبتت0 جداول قبل الاستعادة. لا نُخفي المحاولة من execution-checks. تشغيل أول على SHA946c49fd نجح baseline/backup/restore، ثم أُعيدت فقط الأدوات المتأثرة على مختبر جديد بعد إصلاح تصريح V وتثبيت dependencies؛ لم يعاد استخدام الهدف السابق.

## ما يمنع قبول R05 ونقطة الاستئناف

ينقص manifest/producer للحالات التاريخية المطلوبة، وقرار معالجة للأيتام يراجعه مالكا الوثائق والأصول وفق R05 وmigration109؛ لم نفترض قرارًا أو نحذف دليلًا. اختيار predecessor وحده لا يقر هذه المعالجة.

الخطوة التالية المحددة: مراجعة [عقد fixtures](POST28_R05_HISTORICAL_FIXTURE_REVIEW_2026-10-16.md)، وتجهيز مسار108→109 الموثق إذا ثبت أنه يسمح بتمثيل الحالة دون تجاوز، ثم مختبر جديد على SHA المنتج. يلزم backup جديد **بعد** تجهيز fixtures، ثم الترقية الفعلية109→110 مع قياس الأقفال والمهلات والقطع الآمن والاستئناف، قياسات حفظ invariants والماليات والقيود وclient السابق بعد الترقية وidempotency. نسخة63 صفًا الحالية لا تستبدل هذه التجربة.

لا انتقال إلى R06 قبل قبول R05، ولا قبول سحابي أو إنتاجي مستنتج من هذه الأدلة المحلية. لا تغييرات في Neon أو main أو نشر، ولا اعتماد DEC-01…07.
