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
