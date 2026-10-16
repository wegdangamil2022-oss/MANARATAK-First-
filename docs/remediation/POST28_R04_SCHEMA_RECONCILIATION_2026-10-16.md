# Post28 R04 — مراجعة التسوية

نطاق التفويض: تجربة محلية جديدة فقط؛ لا يجيز تطبيق SQL على Neon أو الإنتاج أو ترقية بيانات قديمة. لا تعديل DEC أو ترحيلات تاريخية.

## قرار المراجعة

تُمثل العلاقات والفهارس الموجودة بالفعل في SQL داخل Prisma، مع إبقاء أسماء القيود والفهارس وإجراءات الحذف والتحديث. العلاقات العكسية حقول Prisma فقط وليست ملكية جديدة للبيانات.

| الجدول | التسوية |
|---|---|
| CertificateAuthorityDelegation | رفض حذف default؛ إضافة @default(now()) إلى @updatedAt؛ يحفظ عقد SQL وقيمة الإنشاء من Prisma |
| CmsBlockSchema | default DRAFT بترحيل إضافي؛ createBlockSchema يكتب DRAFT وترحيل الموافقة 20261011065000 يقرر ذلك؛ لا تغيير للحالات القديمة |
| CmsContentNode | تمثيل 4 فهارس GIN/trgm الموجودة |
| CmsLocalizedContent | تمثيل 3 فهارس GIN/trgm الموجودة |
| CmsPublishedContent | تمثيل 3 فهارس GIN/trgm الموجودة |
| InternationalTestEvidenceHistory | FK testId وعكسه؛ Restrict/NoAction |
| InternationalTestGovernance | FK testId فريد وعكسه الاختياري؛ Restrict/NoAction |
| InternationalTestPublicationSnapshot | id يشير إلى InternationalTestVersion.id؛ testId إلى InternationalTest؛ عكسان منفصلان |
| MajorPublicationSnapshot | FKs majorId/profileId/versionId وعكوسها؛ versionId فريد |
| NewMajorCandidateDecision | FK majorId اختياري وعكسه؛ Restrict/NoAction |
| NotificationChannelDelivery | تثبيت Cascade/NoAction كما SQL |
| NotificationRateReservation | تثبيت Cascade/NoAction كما SQL |
| OwnerTranslationTransferReceipt | map لاسم unique القائم دون rename |
| ServiceRequestRecord | تمثيل فهرس staff_due القائم غير الجزئي |
| StudentSupportOwnerReadObservation | map للاسم القائم |
| UniversityProgramIntake | Restrict/NoAction وmap للاسم القائم |
| UniversityProgramStudyLanguage | علاقتان Restrict/NoAction وmap للاسم القائم |
| UniversityProgramStudyProfile | Restrict/NoAction كما SQL |

دليل snapshot: InternationalTestGovernancePersistence يكتب id=versionId؛ PrismaInternationalTestRepository يربط snapshot.id=version.id وtestId نفسه عند القراءة. العلاقة ليست إلى أحدث إصدار عشوائي. FK منفرد لا يثبت تطابق مالك الإصدار مع testId؛ فحص التطبيق يحفظ ذلك، ولا تُخترع علاقة مركبة جديدة في هذه التسوية.

المصدر التاريخي يعرّف الفهارس والأفعال المقاسة في catalog السابق. إضافة required relation fields مع scalar IDs لا تغير أسماء scalar أو payload عقود DTO. Client generation وtypecheck والاختبارات المصدرية والتجربة الجديدة مطلوبة قبل القبول.

## الترحيل الإضافي

20261016150000_post28_schema_reconciliation: default CMS واحد و9 VALIDATE. يحفظ default شهادة التفويض. كل قيد يسبقه count صريح مطابق لتعبيره أو FK MATCH SIMPLE؛ NULL في CHECK ليس مخالفة. أي مخالفة ترفع استثناء وتلغي transaction كاملة؛ لا حذف/إصلاح صفوف ولا تعطيل trigger/FK. يحتفظ FK إعدادات النظام بـDEFERRABLE INITIALLY DEFERRED.

lock_timeout=3s وstatement_timeout=30s؛ لا يثبت نجاح مختبر فارغ قبول ترقية بيانات قديمة. المعاينة التشغيلية/النسخ الاحتياطي وحل الأيتام وتفويض منفصل واجبة قبل أي هدف مشترك. لا reverse SQL مزعوم؛ على المحلي أعد توفير مختبر جديد. تفاصيل التنفيذ النهائي تُضاف بعد SHA مجمد.

## إصلاح shadow بعد التجربة الأولى

على SHA 8dde53cb نجحت 110 migrations وreplayed diff، ثم فشل shadow الآلي P3006: حذف Prisma مخطط public ولم يستطع الدور المحدود إنشاءه بسبب حظر database CREATE. لم تُمنح صلاحيات أوسع ولم تُعد تهيئة الهدف الفاشل.

أصبح نمط migrations يعيد تشغيل المجلد بواسطة migrate deploy على DB-S مثبتة وفارغة حديثًا فقط، ويتحقق من ledger الكامل بالاسم والترتيب والبصمة ثم يقارن DB-S بـschema. هذا replay مستقل دون automatic shadow reset؛ ليس ادعاء نجاح RPC from-migrations القديم. يُرفض S غير الفارغ. G/S تبقيان مستقلتين، ويفحص gate هوية هدف S قبل deploy. الإصلاح يستلزم SHA ومختبرًا جديدين؛ الأدلة القديمة تبقى منسوبة إلى SHA الأولى.

## النتيجة الفعلية النهائية

**R04 الكاملة: BLOCKED. بوابات الترحيل والبنية المحلية: PASS.** لا قبول Neon/إنتاج ولا انتقال R05/DB-T/R06. سبب بقاء المرحلة مفتوحة هو بوابة seed الإلزامية في البند R04.6، وليس schema drift أو NOT VALID؛ كلاهما عولج فعليًا.

الفرع `fix/post28-ci-environment-inventory-20261016`. المصدر المجمد والمفحوص `8d92b20967af3972a5d4f6d4ebc50eb415c0bd63`؛ تسوية schema والترحيل في `8dde53cb3d57037a1086ee044cd14588cc025046`. Commit حفظ الأدلة اللاحق لا يعيد نسب تشغيل DB إلى SHA آخر. [الأدلة](../reviews/evidence/post28/8d92b20967af3972a5d4f6d4ebc50eb415c0bd63/schema-reconciliation/scope-and-counts.json).

### المختبر والهوية

الأداة الرسمية أنشأت مختبرًا جديدًا للمصدر النهائي: run `65411e27-1254-41bb-9d30-e7737a978ec5`، PostgreSQL16.15، Node22.16، Prisma5.22، loopback15434، system identifier `7697267490013786155`؛ DB-G `manaratak_post28_greenfield_test`/OID16387/`post28_migrator`؛ DB-S `manaratak_post28_shadow_test`/OID16469/`post28_shadow`. حاوية `post28-pg16-65411e27` ضمن شبكة داخلية وvolume جديدة. هويات nonce/password/URL والسجلات الخام والعقد خارج Git في `/workspace/scratch/post28/labs/lab-CIu8LU`. لا ضمان بقاء المختبر بعد انتهاء البيئة؛ forwarder محدود3 ساعات من14:09UTC.

نجحت R03 المحلية قبل replay على القاعدتين الفارغتين، مع أدوار محدودة غير مالكة لقواعد البيانات، لا CREATE database أو صلاحيات إدارة. فحص التطبيق قبل وبعد replay: origin؛ لا CREATE schema أو اتصال S أو default DML؛ وبعد replay لا INSERT/UPDATE/DELETE/TRUNCATE على ledger. هذه فحوص DB محلية وليست إغلاق R03 السحابية أو الخدمات الأخرى.

### بوابات R04 المقاسة

| البوابة | الدليل والنتيجة |
|---|---|
| Prisma validate / client generation | ناجحتان؛ النوعيات `tsc -b packages/infrastructure` ناجحة |
| التاريخ |109 migrations تاريخية مطابقة byte/checksum لـ23897bda؛ لا تعديل؛ migration جديدة واحدة؛ الإجمالي110 |
| DB-G replay / status |110/110 مكتملة؛ up to date؛ partial0/rollback0 |
| DB-S المستقلة |110/110 بالاسم والترتيب وchecksum؛ لا automatic shadow reset أو صلاحيات أوسع |
| ledger / checksums |110 مطابقة للمصدر على G وS؛ chain SHA256 `542a3b4a6f90a50dda5e10bdb062bb2b4eae16e211e79c110417cd3dea8c2ab7` |
| G schema diff |exit0، No difference detected |
| S schema diff |exit0، No difference detected؛ بعد replay مستقل لمجلد migrations، وليس RPC القديم from-migrations |
| deploy الثاني |نجح؛ no pending migrations؛ ledger قبل/بعد مطابق byte-for-byte |
| model/table coverage |281/281 model؛ صفر جداول تطبيق ناقصة/زائدة؛282 مع ledger |
| FK/CHECK audits |313 FK +102 CHECK =415 استعلام قراءة، مخالفات0 |
| catalog |313 FK؛102 CHECK؛35 UNIQUE؛282 PK؛1191 index؛40 user trigger |
| سلامة الحفظ |كل1191 تعريف index وكل40 تعريف trigger مطابقة للتجربة السابقة؛ كل أسماء/تعريفات القيود محفوظة عدا إزالة NOT VALID من التسعة |
| صحة الفهارس والتريجرات |على G وS:invalid/not-ready/not-live indexes0؛ disabled/replica-only triggers0؛ settings FK ما زال DEFERRABLE INITIALLY DEFERRED |
| schema isolation |public فقط خارج مخططات النظام؛ لا foreign schemas غير متوقعة |
| baseline |63 صفًا مصدرها migrations:18 provider و6 alias و39 domain؛ لا seed مستقل |
| required seed |BLOCKED؛ لا apply ولا إعادة apply أو قبول idempotency للـseed |

جرد العلاقات والقيود والحقول والفهارس والتريجرات وعدادات كل جدول محفوظ في [catalog والأيتام](../reviews/evidence/post28/8d92b20967af3972a5d4f6d4ebc50eb415c0bd63/schema-reconciliation/catalog-and-audits.json). هذا تدقيق catalog/enforcement state وليس اختبارات معاملات أعمال/تشغيل وظيفي لكل trigger. أسماء الترحيلات التاريخية المرتبطة بكل جدول من18 محفوظة في [خريطة المصادر](../reviews/evidence/post28/8d92b20967af3972a5d4f6d4ebc50eb415c0bd63/schema-reconciliation/eighteen-table-historical-sources.json).

### القيود التسعة

| القيد | النتيجة |
|---|---|
| FinancePayment_positive_units |validated=true، مخالفات0 |
| FinanceRefund_positive_units |validated=true، مخالفات0 |
| FinanceTransfer_positive_units |validated=true، مخالفات0 |
| FinanceWalletHold_positive_units |validated=true، مخالفات0 |
| FinanceLedger_positive_units |validated=true، مخالفات0 |
| ServiceCatalogRecord_fulfillment_policy |validated=true، مخالفات0 |
| ServicePricingRecord_bounded_money |validated=true، مخالفات0 |
| SettingAssignmentRecord_id_currentVersionId_fkey |validated=true، أيتام0، deferred محفوظ |
| StudentApplicationDocumentBinding_assetId_fkey |validated=true، أيتام0 |

كل count السابق لـVALIDATE جزء من transaction الترحيل؛ اكتمال الترحيل يثبت عدم إطلاق استثناء المخالفات. لم تُحفظ SELECT logs مستقلة لكل pre-audit؛ القياس المستقل بعد التنفيذ يؤكد صفر مخالفة وconvalidated=true. [نتيجة كل قيد وتعريفه](../reviews/evidence/post28/8d92b20967af3972a5d4f6d4ebc50eb415c0bd63/schema-reconciliation/nine-constraint-results.json).

### اختبارات المصدر والتوافق

254 حالة فريدة ناجحة، فشل0/skip0/todo0/إلغاء0:91 Node موجهة على SHA النهائي،90 preflight source،63 توافق CMS/اختبارات دولية على8dde53cb مع schema/client نفسها،10 لعقد منع seed بلا موافقة. تشمل الحراس السلبية الهوية/الصلاحيات/alias/هدف فارغ والـledger/skip والتسريبات. أُعيدت91 حالة كانت قد نُفذت أثناء إعداد الإصلاح لتسجيل أدلة SHA النهائي؛ إجمالي التنفيذ345، لا تُحسب المعادة حالات فريدة جديدة. لا آلاف الاختبارات أو build/browser أو DB-T.

نجحت ESLint وsource architecture وsource quality؛ validate/generate/typecheck؛ seed manifest/source inspection. جرت dry-runs للمراجع دون كتابة:194 دولة،168 عملة،260 لغة؛ لا duplicates أو invalid records. promotionAllowed=false لم يُحوّل إلى إذن تطبيق.

### العوائق والأخطاء

1. تجربة8dde53cb:110 replay وG diff ناجحان، ثم P3006 عند shadow reset. أُصلح المسار المحروس وأُعيدت R03/R04 على مختبر جديد وSHA جديد؛ لم يُمنح CREATE database أو يُستخدم مالك DB. الدليل الفاشل محفوظ ولا يختلط بالنجاح النهائي.
2. أداة تدقيق خاصة خارج Git مررت Date objects إلى verifier يقبل JSON timestamps؛ رفضها بـPARTIAL_OR_FAILED. أصلحنا serialization في الأداة فقط وأعدنا التدقيق المتأثر؛ ledger الرسمي قبل/بعد كان سليمًا أصلًا. لا تخفيف للتحقق.
3. **حاجز seed حقيقي:** manifest يعلن READY، لكن `ReferenceDataImportHandoffService.prepareSeedBatch` يعيد VALIDATED فقط؛ `seed-reference-countries.ts` يرفض غير READY_TO_APPLY قبل إنشاء عميل DB. والأهم أن `ReferenceDataSeedApplyService.applyBatch` معطل عمدًا ويطرح `REFERENCE_DATA_SEED_APPLY_REQUIRES_DURABLE_OWNER_APPROVAL`، حتى عند تزوير READY_TO_APPLY. اختبارات العقد10/10 تؤكد عدم الكتابة. لا تشغيل apply المعروف أنه محجوب، ولا تعديل owner approval أو اختراع receipt لمجرد إغلاق R04.

### نقطة الاستئناف

احفظ اعتماد P7 لعقد تطبيق seed ذري بموافقة دائمة مرتبطة بهوية المصدر وبصمته، مع audit/outbox/receipt ضمن المعاملة؛ ثم أصلح تعارض manifest/readiness والـrunner وفق ذلك الاعتماد. لا تستبدل الخدمة المعطلة بكتابة مباشرة. بعد تعديل المصدر:freezeSHA جديد ومختبر جديد، أعد المتأثر وأثبت required-only seed بالترتيب/reconciliation وإعادة apply دون تكرار، ثم أصدر قرار R04 الكامل.

بعد R04: جهز R05 بbaseline سابق ممثل وbackup وحدود التأثير وسلطات منفصلة؛ R06 يحتاج قبول R04/R05 وDB-T مستقلة، لا G/S. لم يبدأ R05 أو DB-T أو R06، ولم تُلمس Neon أو الإنتاج أو main ولم يُنفذ نشر.
