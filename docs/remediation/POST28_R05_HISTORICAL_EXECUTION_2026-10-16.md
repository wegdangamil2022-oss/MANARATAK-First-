# R05 — تشغيل البيانات التاريخية وقياسات بوابة الترقية

التاريخ: 2026-10-16. الفرع: `fix/post28-ci-environment-inventory-20261016`.

**R05: BLOCKED للقبول الكامل. نجح تكوين baseline تاريخي صناعي والنسخ والاستعادة والقياسات، وأثبتت البوابة رفض السجل اليتيم المقصود.**
SHA التنفيذ والفحوص: `40f93b655c4835f669c6686d7301817f48f0e5c2`؛ commit التقرير لاحق ولا ينسب هذا التشغيل إلى SHA مختلف.
HEAD البعيد عند البدء كان `cb284c25f9381f271f94d5f3a32cfe6403643bec` وتطابق مع HEAD المحلي، وشجرة العمل نظيفة.

## التقدم الفعلي منذ التقرير السابق

| البند | النتيجة المثبتة |
|---|---|
| المصدر المختار |109 migrations من `23897bdaa66d966eef15c85f44288589ecbcdf2b` |
| تمثيل الحالة الأقدم |108 migrations من `f80e3b0ab9aa29f0ea5312af3d6aa7ab461be7b7`؛ جميع أسمائها وبصماتها مطابقة |
| البيانات الصناعية |46 صفًا في36 نموذجًا، داخل معاملة، قبل إضافة FK/trigger رقم109 |
| الانتقال108→109 | الترحيل التاريخي الأصلي بلا تغيير، ledger109/109 بأسماء وترتيب وبصمات مطابقة؛0 partial/rolled-back |
| Prisma5.22.0 السابق |validate/generate/deploy108/deploy109/status ناجحة؛ استعلامات فعلية بالعميل المولد |
| قياسات الحفظ قبل الترقية |281 model counter،8 مجموعات بصمات،282 table content hashes، مجموعتان ماليتان |
| backup الممثل |custom PostgreSQL،1,046,880 bytes؛ PGDMP/TOC وفك SQL كامل في الذاكرة دون تنفيذ |
| الاستعادة البنيوية |نجحت على DB-V المستقلة بدورها المحدود؛ كل محتوى282 جدولًا وcatalog مطابق، وU لم تتغير |
| audits قبل110 |ثمانية بصفر مخالفات، وواحد بمخالفة صناعية مقصودة واحدة؛ gate=BLOCKED/exit2 المتوقع |
| الترحيل110 |لم يبدأ؛ mutationCommandsExecuted=0 في أداة فحص البوابة |

المصدر الحالي به110 migrations؛ المختبر الحالي يقف عند109 عمدًا. بياناته109 application rows:63 من migrations الأصلية +46 fixture. لا تخلط عدد الصفوف مع عدد migrations.

## هوية المختبر

- Run: `57cf058e-7d41-41c3-a410-ee6523853057`.
- PostgreSQL16.15؛ الصورة المثبتة بأداة المختبر الرسمية، UTC؛ loopback port15441.
- Server identity: `7697298808856363051`.
- DB-U: `manaratak_post28_upgrade_test`، الدور `post28_upgrader`، OID16387.
- DB-V: `manaratak_post28_upgrade_verify_test`، الدور `post28_verifier`، OID16469.
- لكل منهما roleKind=MIGRATION؛ لا دور مالك قاعدة أو superuser أو bypassRLS للاختبارات. bootstrap استعمل لإنشاء موارد جديدة فقط. لا استخدام G/S/R/T بدل U/V.
- العقود والأسرار والأرشيف والعميل والسجلات الخاصة خارج Git في `/workspace/scratch/post28/labs/lab-OLXAHc/`؛ الملفات المنشورة أدلة منقحة وبيانات صناعية فقط. المختبر مؤقت وغير قابل للاعتماد عليه من دردشة في بيئة أخرى؛ ينشأ مختبر جديد لكل SHA تنفيذ جديد، دون إعادة ربط عقد قديم.

## تغطية البيانات وحدودها

[الـmanifest الصناعي](../reviews/evidence/post28/40f93b655c4835f669c6686d7301817f48f0e5c2/r05-historical/fixture-manifest.json) يربط كل صف بمعرف ثابت ومالك من سجل الملكية وscenario ومصدر108/109. يشمل:

- بحثًا تاريخيًا actor=NULL وبحثًا مملوكًا؛ بقي NULL دون إسناد مختلق.
- workspace/tracker و6 document bindings: missing/whitespace/revoked/future/valid consent وorphan مقصود؛ وأصلًا مرتبطًا وآخر غير مرتبط، ودليل سحب consent.
- invoice/payment/refund/wallet/hold/transaction وقيود debit/credit وإيصال أمر مالي.
- CMS publication/revision/localized content وإيصال ترجمة UNIVERSITY وترجمة جامعية، وInternationalTestVersion/snapshot يشتركان في version id الصحيح.
- university/program/degree، scholarship/version/degree target محلول وآخر legacy غير محلول، course/version/major projection وstudent learning projection.

هذه **صورة تاريخية صناعية** تنشأ عبر أداة fixture محلية محروسة. لا تعني نجاح أوامر المالكين أو موافقات نشر/ترجمة أو منح وصول للطالب. قيم attestation القديمة المتعمدة غير السليمة محفوظة كدليل JSON تاريخي؛ لم ننفذ اختبارات استعمالها في التطبيق أو مراجعة وصول الوثائق في R06. التصنيف والـmetadata الصناعية ليست إثبات فحص ملف فعلي للأصول. حقل `representativeFixturesProvisioned=true` يعني زرع المرشح الموثق؛ `domainApproval/DECApproval/R05Accepted=false` ما زالت صريحة، ومراجعة اكتمال semantics مطلوبة قبل القبول.

الماليات قيست من PostgreSQL بعملية numeric والجمع حسب account/currency/scale ثم أعيدت كنصوص؛ لا تحويل لـNumber. القيم الموقعة (DEBIT−CREDIT) هي `900719925474099312345` و`-900719925474099312345`، USD/scale2. مجموعهما0؛ هذه قاعدة القياس للمقارنة وليست تفسير رصيد محفظة متاح أو قبول قواعد أعمال مالية. قُرئت46 صفًا بالعميل السابق وتطابقت جميع الحقول المعلنة في manifest.

## القيود والبنية

تطابقت732 constraint و1191 index و40 trigger مفعّلًا و14 دالة و3477 عمودًا بين U وV. فهارس غير صالحة0؛ القيود التسعة NOT VALID ما زالت كذلك في النسخة109، ولم ننفذ VALIDATE على هذه القواعد.

| audit قبل110 | المخالفات |
|---|---:|
|FinancePayment_positive_units|0|
|FinanceRefund_positive_units|0|
|FinanceTransfer_positive_units|0|
|FinanceWalletHold_positive_units|0|
|FinanceLedger_positive_units|0|
|ServiceCatalogRecord_fulfillment_policy|0|
|ServicePricingRecord_bounded_money|0|
|SettingAssignmentRecord_id_currentVersionId_fkey|0|
|StudentApplicationDocumentBinding_assetId_fkey|1|

السجل اليتيم **مصطنع أنشأناه عمدًا**، وليس اكتشاف فقدان بيانات إنتاج: binding=`2a4960c9-b4be-405a-8b21-7c3b34a5034f` يشير إلى missing asset=`aafb690a-1f6c-463d-8b24-3d88e9a9b5d8`. إدخاله على108 ثم109 NOT VALID يمثل تاريخًا حقيقيًا دون تعطيل trigger أو التلاعب بالقيود. البوابة رفضت المتابعة وفق الخطة؛ هذا نجاح لاختبار الرفض، **وليس PASS للترقية**. قورن محتوى U وcatalog قبل القياسات وبعدها وثبت عدم تغيرهما.

## الأخطاء والإصلاحات والاختبارات

التشغيل الأول على SHA`ce219ecefa5beb446502132ecc3d04c6b7f7de88` رفض receipt بمالك `cms` عبر CHECK التاريخي الذي يسمح UNIVERSITY/MAJOR فقط (SQLSTATE23514). فشلت معاملة fixture وتراجعت، ولم نغير SQL التاريخي. صُحح المرشح إلى UNIVERSITY مع target/translation مطابقين، وأضيف اختبار رجوع للقيد. أُعيد المسار المتأثر على مختبر جديد وSHA40f93b65، مع الاحتفاظ بالمختبر السابق وأثر الفشل. لا reset أو حذف قواعد.

نتائج المصدر النهائية: **140 PASS /0 FAIL /0 SKIP /0 TODO** في6 ملفات متأثرة، منها19 اختبارًا لوحدة fixtures/measurement الجديدة. لا نجمع الجولات السابقة كاختبارات مستقلة. نجحت architecture/source quality/ESLint/environment inventory305 أسماء/secrets/repository organization/diff check. لا إعادة للآلاف أو لمجموعة Neon غير المتأثرة.

## الملفات والأوامر

- `post28-historical-fixtures.mjs`: manifest/معرفات/مالكو الصفوف وwriter مقيد بـ108 وorigin وقبل وجود FK109.
- `initialize-post28-upgrade.mjs`: خيار تاريخي محدد للمصدر المختار، تدقيقprefix108، قياسledger108، معاملةfixture ثم تطبيق109 وledger مطابق وتوليد client سابق مثبت دون auto-install.
- `post28-upgrade-measurement.mjs`: قياسات قبل الترقية ومجموعات hashes وماليات exact وaudits9 وبوابة رفض أي مخالفة.
- `audit-post28-upgrade.mjs`: قراءة فقط بهوية U/V وSHA/run وmanifest وbackup مثبتة؛ لا apply مخفي، ولا قبول R05 من مجرد القياس.
- `verify-post28-upgrade-backup.mjs`: يربط الأرشيف والتحقق بوجود fixtures وبصمة manifest، عوض قيمة تجهيز ثابتة false.
- اختبار source جديد وتصنيف operational tooling وتحديث جرد أسماء البيئة.

الأوامر الفعلية عبر helper خاص يحمّل أسرار المختبر دون argv أو طباعتها:

```sh
node scripts/database/initialize-post28-upgrade.mjs 23897bdaa66d966eef15c85f44288589ecbcdf2b --historical-fixtures
# عبر purpose=maintenance وتصريح DB-V المستقل المحفوظ في lab.env:
node scripts/database/verify-post28-upgrade-backup.mjs backup
node scripts/database/verify-post28-upgrade-backup.mjs verify
node scripts/database/audit-post28-upgrade.mjs
```

سجل [الأوامر والـexit codes والبصمات](../reviews/evidence/post28/40f93b655c4835f669c6686d7301817f48f0e5c2/r05-historical/execution-checks.json) و[فحوص المصدر](../reviews/evidence/post28/40f93b655c4835f669c6686d7301817f48f0e5c2/r05-historical/source-checks.json) و[نتيجة البوابة](../reviews/evidence/post28/40f93b655c4835f669c6686d7301817f48f0e5c2/r05-historical/preupgrade-audit.json).

## التوقف المطلوب ونقطة الاستئناف

R04 المحلية تظل PASS على SHA إغلاقها السابق؛ لا تنسب نجاحها للنسخة109 ذات orphan. R05 جزئية/BLOCKED، وR06 لم يبدأ. لم تُنفذ109→110 أو old-client-after-upgrade أو locks/interruption/resume/redeploy للترقية، ولم تُنشأ DB-T. لا قبول سحابي/إنتاجي، ولا تغيير Neon/main أو نشر أو اعتماد DEC.

المتبقي المباشر: مراجعة [إجراء معالجة اليتيم الصناعي](POST28_R05_SYNTHETIC_ORPHAN_REMEDIATION_REVIEW_2026-10-16.md) مع مالكي الوثائق والأصول وفق شرط خطة Post28 R05. المقترح يحافظ على اختبار الرفض الحالي، ثم يبني سيناريو معالجة جديدًا ذا مصدر ملف صناعي معلوم منذ البداية ومالك assets workflow، عوض اختلاق أصل في هذه القاعدة. الوثيقة مقترح قابل للمراجعة، وليست موافقة مالك أو توقيع مراجعة مستقل.

بعد ذلك: مصدر ومختبر جديدان، baseline ممثل بمراجعة semantics ومعالجة تتبع المصدر بلا فقد دليل، backup جديد مثبت، ثم بوابات الترقية110 والأقفال/المهلات والانقطاع الآمن والاستئناف والتوافق وحفظ الماليات والقيود والتطابق وإعادة deploy. توقف الإجراء التابع هنا مطلوب بنص الخطة عند orphan بلا قرار؛ الأدوات والفحوص المستقلة اكتملت لهذه الجولة.
