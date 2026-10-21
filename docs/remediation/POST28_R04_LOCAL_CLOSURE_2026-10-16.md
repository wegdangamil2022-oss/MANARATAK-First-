# POST28 R04 — إغلاق التجربة المحلية

## قرار القبول

**R04: PASS / CLOSED للمختبر المحلي المؤقت المعزول.** اكتملت بوابات الترحيلات والتطابق والقيود وrequired-only seed ومصالحة المصادر وإعادة التطبيق. يحل هذا القرار محل BLOCKED المحلي في تقرير التسوية السابق، للمصدر والتشغيل المحددين هنا فقط. قبول Neon/الإنتاج ومراحل R00/R01/R02-coverage والخدمات السحابية باقية وفق تقاريرها؛ لا ترقية لهذا الدليل المحلي إلى قبول نشر.

- الفرع: `fix/post28-ci-environment-inventory-20261016`.
- SHA المجمد والمفحوص: `467d1369e8da0a93ea3444bc1ef6a56c5e53d57d`؛ commit حفظ هذا التقرير لاحق له ولا يعيد نسبة الاختبارات إلى SHA آخر.
- [قرار الإغلاق المقروء آليًا](../reviews/evidence/post28/467d1369e8da0a93ea3444bc1ef6a56c5e53d57d/r04-closure/closure.json)، [بصمات الأدلة](../reviews/evidence/post28/467d1369e8da0a93ea3444bc1ef6a56c5e53d57d/r04-closure/evidence-hashes.json).

## ما أصلحناه

1. ربط required seed بمسار P7 الموجود فعلًا: screening receipt → preview → owner review → atomic apply مع receipt/audit/outbox. بقي `ReferenceDataSeedApplyService` القديم معطلًا؛ لا تحويل تلقائي لـVALIDATED إلى إذن تطبيق. أضيف مشغّل محلي مستقل، وأصبح المشغّل العام يشرح حاجته إلى هذا المسار بدل أن يعلن جاهزية تطبيق قديمة مضللة.
2. ترتيب العملات ثم اللغات ثم الدول، مع فحص اعتماديات defaults قبل الكتابة. المصادر نفسها ما زالت مثبتة بالبصمات؛ seed set الجديد `2026-10-16.2` يوثق ترتيب التشغيل ومساره.
3. توثيق تفويض طلب المستخدم الحالي لإكمال R04 المحلية بملف خاص mode600 مربوط بـSHA/run/manifest/source hashes ومدة محدودة. `post28-local-user-authorized` وصف للمشغّل المحلي، وليس هوية دخول إنتاجية أو توقيع مالك خارجي. P7 يحفظ قرارات مراجعة فعلية بأسباب وبصمات المصدر في DB-G؛ لا اعتماد DEC أو مصادر إنتاج.
4. توفير مصدر artifact فعلي لكل مجموعة مراجع: JSON مشتق من workbook/CSV المثبتين، مع حفظ بصمة المصدر الأصلي. التحقق من رفع الملف ثم فحص ClamAV حقيقي، sanitation للـcanonical UTF-8 JSON، إعادة الفحص، ثم activation عبر use cases الأصلية. صورة الماسح مثبتة: `clamav/clamav@sha256:638d90201ee7ee6a82d249a2fc23b132e578673b5f1f2766852b127676ca1ef6`؛ الإصدار1.5.4 والتواقيع28150 بتاريخ2026-10-11. الماسح يعمل دون شبكة، ولم يستخدم noop ناجحًا.
5. إصلاح فشل Prisma الحقيقي عند استرجاع `void` من أقفال P7 وscreening receipt: إضافة `::text` للقيمة المعادة فقط، مع إبقاء دالة القفل ومفتاحه وحد المعاملة كما هي. أضيف اختباران لهذا المسار وأعيد بناء infrastructure.
6. إصلاح metadata للدول بإرسال تمثيل JSON الفعلي الذي يحذف حقول undefined، دون تغيير حارس P6/P7. اختبار مصدر جديد مرّر السجلات622 كلها عبر consumer الحقيقي في وضع shape-only؛ لم ينسب إليه تنفيذ DB أو اعتماد بيانات.
7. حفظ aliases الأصلية في artifact وpayload metadata، ثم كتابتها عبر أمر P7 الذري بأسماء الـID وexpectedVersion.48 alias على20 لغة؛ لا تمريرها كحقول P6 ممنوعة.
8. منع إعادة bootstrap غير الضروري للخطوات الأخرى، ورفض الهدف غير الفارغ عند الإنشاء الأول ورفض استئناف run جزئي آليًا. إعادة التطبيق تقارن بصمات محتوى جميع282 جدولًا، بما فيها ledger وaudit/outbox والنسخ والإيصالات، وتفشل عند أي اختلاف.

[عقد المشغّل وأوامره وحدوده](../operations/POST28_REQUIRED_SEED_LOCAL.md). لا تغييرات جديدة في schema أو SQL migrations في جولة الإغلاق؛ تسوية الجداول18 والترحيل الإضافي كما وثّقا في [مراجعة التسوية](POST28_R04_SCHEMA_RECONCILIATION_2026-10-16.md). بقي109 ترحيلات تاريخية دون تعديل، والإجمالي110.

## هوية المختبر

مختبر جديد أنشأته الأداة الرسمية على SHA النهائي، لا إعادة ربط لعقد قديم:

| البند | القيمة |
|---|---|
| run |`5bae63bb-1b6c-457e-af39-89c425deb896` |
| PostgreSQL / Node / Prisma |16.15 /22.16 /5.22 |
| system identifier |`7697274830192943148` |
| loopback |127.0.0.1:15437 |
| DB-G |`manaratak_post28_greenfield_test`، OID16387، `post28_migrator` |
| DB-S |`manaratak_post28_shadow_test`، OID16469، `post28_shadow` |
| container |`post28-pg16-5bae63bb`؛ شبكة داخلية وvolume جديدتان |

كل التشغيل بأدوار محدودة غير مالكة لقواعد البيانات، دون superuser/CREATEDB/CREATEROLE/replication/bypassRLS/database CREATE. فحص التطبيق قبل وبعد:origin،لا CREATE schema أو اتصال S أو default DML؛ ولا DML على ledger بعد إنشائها. عقد الهدف والاعتمادات والـapproval والسجلات الخام وملفات الأصول خارج Git في `/workspace/scratch/post28/labs/lab-pPnZus`. forwarder محدود3ساعات من14:37UTC؛ لا ضمان لبقاء المختبر بعد انتهاء البيئة، ولا استمرار بعقد SHA قديم بعد تعديل المصدر.

## جميع بوابات R04 المنفذة

| البوابة | النتيجة الفعلية |
|---|---|
| R03 المحلية |هوية وعزل وأدوار G/S فارغتين ناجحة، ثم فحص app بعد seed ناجح |
| Prisma validate |ناجح على SHA النهائي |
| replay G / migrate status |110/110، up to date |
| replay S المستقلة |110/110؛ ledger names/order/checksums كاملة؛ لا shadow reset أو database CREATE |
| G وS schema diff |exit0، No difference detected لكل منهما |
| ledger/checksums |110 مطابقة، partial0، rollback0؛ chain `542a3b4a6f90a50dda5e10bdb062bb2b4eae16e211e79c110417cd3dea8c2ab7` |
| redeploy |no pending migrations؛ ledger قبل/بعد متطابقة byte-for-byte |
| NOT VALID |القيود التسعة كلها validated؛ لا استثناء في الفاحص |
| audit بعد seed |313 FK و102 CHECK =415 استعلام قراءة؛ مخالفات0 |
| model/table coverage |281/281 model؛282 جدولًا مع ledger؛ نقص0/زيادة0 |
| catalog |313 FK،102 CHECK،35 UNIQUE،282 PK،1191 index،40 user trigger |
| حفظ البنية |تعريفات الفهارس1191 والتريجرات40 مطابقة للتجربة السابقة، وتعريفات القيود محفوظة عدا validation التسعة؛ settings FK ما زال DEFERRABLE INITIALLY DEFERRED |
| enabled/ready |على G وS:disabled/replica-only triggers0، invalid/not-ready/not-live indexes0، unvalidated0 |
| required seed |الخطوات السبع مكتملة، والمصالحة ناجحة |
| إعادة seed |0 تطبيق جديد؛622 receipt replay؛0 alias command إضافي؛ بصمة282 جدولًا مطابقة |
| diff بعد seed |exit0، No difference detected |

تتضمن الأدلة [catalog والتدقيق](../reviews/evidence/post28/467d1369e8da0a93ea3444bc1ef6a56c5e53d57d/r04-closure/catalog-and-audits.json)، [قياس G/S النهائي](../reviews/evidence/post28/467d1369e8da0a93ea3444bc1ef6a56c5e53d57d/r04-closure/G-S-final-catalog.json)، [نتائج القيود التسعة بالأسماء](../reviews/evidence/post28/467d1369e8da0a93ea3444bc1ef6a56c5e53d57d/r04-closure/nine-constraints.json). هذه فحوص catalog/enforcement state؛ اختبارات الأعمال الوظيفية للتريجرات والمعاملات تبقى في مراحلها.

## نتيجة required-only seed

| المرجع | العدد الفعلي |
|---|---:|
| ReferenceCurrency |168 |
| ReferenceLanguage |260 |
| ReferenceCountry |194 |
| ReferenceAliasRecord |48 |
| DegreeLevel |7 |
| AcademicTaxonomyNode / Edge / Alias |163 /152 /39 |
| ExternalCourseProvider / Alias / Domain |18 /6 /39 |
| StudentToolDefinitionRecord / Version / Dependency |83 /83 /4 |
| AssetRecord |3 ACTIVE، فحوص malware محفوظة PASSED |
| ImportScreeningReceipt / ReferenceOwnerImportReview |622 /622؛كل owner reviews APPLIED |
| ReferenceVersionRecord |642؛منها20 أمر alias إضافيًا |
| AuditRecord / TransactionalOutboxRecord |1969 /1969؛منها1886 لكل منهما لمسار المراجع |

المصالحة قاست محتوى السجلات622 مقابل المصادر، وليس عدد الصفوف فقط، وتحققت من aliases48. baseline بعد الترحيلات وقبل seed كان63 صف تطبيق من provider migration؛ وبعد seed7091 صف تطبيق. بقيت catalogs الجامعات والمنح والدورات والاستيرادات الكبيرة خارج النطاق.

- [تطبيق seed الأول](../reviews/evidence/post28/467d1369e8da0a93ea3444bc1ef6a56c5e53d57d/r04-closure/seed-first-apply.json):622 تطبيقًا و20 أمر aliases.
- [إعادة التطبيق](../reviews/evidence/post28/467d1369e8da0a93ea3444bc1ef6a56c5e53d57d/r04-closure/seed-reapply.json):622 replay،0 تطبيق/0 أمر aliases إضافي.
- [مصالحة المحتوى](../reviews/evidence/post28/467d1369e8da0a93ea3444bc1ef6a56c5e53d57d/r04-closure/seed-content-reconciliation.json).
- بصمة قاعدة البيانات بعد التطبيق وبعد الإعادة: `3d8d12638b1ef4a9f550f514ef2a920a059d02f2ee2076970461a2f63698f3fc`؛ تشمل كل صفوف الجداول العامة282، دون نشر محتوى الصفوف. لم تزد سجلات audit/outbox أو versions/receipts ولم يتغير ledger.

## الاختبارات والفحوص

على SHA النهائي60 اختبارًا فريدًا:34 Vitest و26 Node؛ نجحت60،فشل0،skip0/todo0/إلغاء0. واحدة من الحالات تفحص shape للسجلات622؛ لا تُحسب622 حالة اختبار مستقلة. فحص الماسح الفعلي قبول ملف سليم ورفض EICAR نجح2/2 قبل freeze على ملف الماسح وبصمة الصورة نفسيهما؛ أما الجولة النهائية ففحصت الأصول الثلاثة وأعادت فحصها فعليًا أثناء lifecycle.

نجح TypeScript للمشغّل وrebuild infrastructure، وsource quality وsource architecture. Prisma schema/client بقيتا بالبصمات السابقة دون تغيير؛ استفدنا من generation/compatibility الناجحين سابقًا، ولم نعد المجموعات العامة. ESLint خرج0 مع18 تحذير any (منها5 موجودة في gateway السابق)؛ لا أخطاء lint، ولا تغيير لقواعده أو إخفاء تحذيراته. هذه ملاحظة تحسين أنواع، ولا تدعي الوثيقة صفر تحذيرات.

السجلات الخاصة وبصماتها وأوقات الأوامر محفوظة كـmetadata فقط في [مراجع التشغيل](../reviews/evidence/post28/467d1369e8da0a93ea3444bc1ef6a56c5e53d57d/r04-closure/private-runtime-log-references.json) و[فحوص المصدر](../reviews/evidence/post28/467d1369e8da0a93ea3444bc1ef6a56c5e53d57d/r04-closure/private-source-log-references.json). لا خام logs أو أسرار أو عقود هدف في Git.

## الإخفاقات السابقة التي عولجت

- SHA `b645f755`:نجحت R03/replay110/parity،ثم فشل seed عند أول screening lock بنوع void؛ أُصلح ::text في البنية التحتية.
- SHA `0de11019`:نجحت R03/replay/parity وتطبيق العملات واللغات،ثم رفض P7 أول country metadata بسبب undefined. حُفظ الرفض وأصلح wire serialization،وأضيف فحص622 سجلًا قبل التنفيذ.
- SHA `467d1369`:مختبر جديد؛نجحت السلسلة كاملة وseed/reapply والتدقيق اللاحق. لم يُعَد وسم أي مختبر قديم، ولم تُمسح بيانات محاولات سابقة أو تُعدّل migrations تاريخية. فشل fixture ترتيب متوقع في اختبار مصدر بعد تصحيح ترتيب seed عولج بتصحيح التوقع مع إبقاء كل حالات الرفض.

## نقطة الاستئناف

R04 المحلية مغلقة. التالي تجهيز R05 بbaseline سابق ممثل وmanifest/backup وعدادات وملكية وهدف مستقل مصرح، ثم تقييم بواباته قبل أي تنفيذ. R06 يحتاج قبول R04/R05 وDB-T مستقلة؛لم تُنشأ DB-T ولم يبدأ R05 أو R06. Neon والإنتاج وmain والنشر لم تُلمس، وقرارات DEC-01…07 لم تُعتمد بالنيابة عن مالك المشروع.
