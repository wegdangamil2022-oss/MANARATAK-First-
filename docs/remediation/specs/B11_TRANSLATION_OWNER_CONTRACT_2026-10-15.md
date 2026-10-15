# B11 — عقود ترجمة المالك المقبولة على مستوى المصدر

حالة العقد: **SOURCE_VERIFIED**. خط أساس الإغلاق `ea0999e578e39608c757afe1a835800c67fbebdc`. [تقرير الإغلاق والفحوص](../../reviews/B11_OWNER_TRANSLATION_CLOSURE_2026-10-15.md). لا تفعيل للكتابة أو نشر تشغيلي؛ `INFRASTRUCTURE_ONLY` مستمر حتى بوابة التشغيل المعزولة.

## مصفوفة المالك والحقول والمراجعة والقارئ

جميع العقود تدعم ar/en صراحة. دعم الوصف لدى المالك منفصل عن محرر الوصف الجذري المركزي وعن دعم import. العقد المركزي الحالي يسلّم إلى UNIVERSITY وMAJOR فقط؛ النطاقات الأخرى تستقبل الأوصاف من أوامر مالكها ومساحة إدارته. لا إعلان عن import مركزي لها ولا ORM عابر أو مخزن ترجمة خارجي.

| المالك | المصدر والحقول | التخزين والنسخة | سلطة التأليف/المراجعة والنشر القائمة | القارئ العام ودليل المصدر |
|---|---|---|---|---|
| UNIVERSITY | الاسم وoptionalFields.description وحقول المصدر وسجلاته | UniversityTranslation، زوج الاسم/الوصف واللغة مرتبط ببصمة المصدر والقيم | admin:universities:manage؛ TRANSLATION_TRANSFER ثم TRANSLATION_PUBLICATION المستقلتان وreceipt القائمة | قارئ الجامعة يحسب CURRENT/STALE/UNVERIFIED؛ projectUniversity والرسم العام للبرامج يستبعدان الدليل المتقادم. لا توريث لحالة PUBLISHED عند التحرير |
| MAJOR بما فيه FELLOWSHIP | هوية الجذر والملف والنسخة وsectionKey والقسم المصدر | مرشح الاسم وtranslationNames داخل metadata **نسخة العمل المحددة**، والأقسام في profileId/versionId نفسيهما؛ snapshot جديدة عند النشر | admin:majors:manage للنقل المحكوم؛ اعتماد TRANSLATION_PUBLICATION يعني تسليمًا للمراجعة، ثم مراجعة نسخة المالك وصلاحيات review/publish القائمة | MajorTranslationEvidence يعيد التحقق عند المراجعة والنشر؛ digest المراجعة يشمل الأسماء؛ MajorPublicationSnapshot تجمع الاسم والأقسام واللغة في نسخة واحدة |
| INTERNATIONAL_TEST | اسم ووصف المصدر في optionalFields.description/overview وسائر حقول المصدر المحددة | optionalFields.ownerLocalizedDescriptions؛ كل زوج يحفظ ownerId وsourceRevision وبصمة المصدر والقيم | saveLocalizedDescription في InternationalTestAdminUseCases ضمن قفل/revision/audit/outbox المالك؛ التحرير يبطل الاعتماد؛ verify/approve/publish القائمة | عقد المصدر يفحص الزوج؛ candidateHash يختم الوصف والأزواج وأسماء اللغة؛ InternationalTestPublicationSnapshot ثم الإسقاط والـadapter العامان |
| SCHOLARSHIP | الاسم والوصف الأصلي وتفاصيل المصدر والتمويل | optionalFields.ownerLocalizedDescriptions داخل المالك؛ تشملها ScholarshipVersion الجديدة | saveLocalizedDescription في AdminScholarshipUseCases ضمن mutate وقفل revision؛ المسودة فقط؛ يعيد READY_TO_PUBLISH للمراجعة؛ دورة مالك المنح القائمة | assertPublicationReady يرفض تغير المصدر؛ PublicScholarshipUseCases يخرج الزوج عبر allowlist دون الدليل الخاص |
| COURSE | الاسم وoptionalFields.description/courseContent وحقول المصدر | optionalFields.ownerLocalizedDescriptions داخل Course؛ CourseVersion تحتفظ بالزوج مع المحتوى والمنهج، دون تعديل تاريخ المسجلين | saveLocalizedDescription في AdminCourseUseCases داخل CourseAdminCommandUseCases وقفل version/audit/outbox؛ المسودة فقط وإعادة المراجعة؛ CoursePublicationService القائمة | فحص المصدر عند المراجعة والنشر، ثم PublicCourseUseCases؛ تاريخ CourseVersion/enrollment لا يُعدّل |
| STUDY_DESTINATION | overviewAr/En وstudySystemSummaryAr/En وvisaSummaryAr/En والحقول الثنائية الأصلية | StudyDestinationProfile revision/governance الأصلية | مسار المالك القائم وصلاحيات read/edit/review/publish المستقلة؛ بصمة الدليل ومراجعة مصدره | StudyDestinationUseCases يعرض الملف الموافق عليه وحده؛ نصوص اللغتين من الملف نفسه، لا overlay مركزي |
| SERVICE | displayName/serviceDescription في localizedContent.ar/en | Service version/reviewedVersion/publishedSnapshot القائمة | مالك الخدمات، maker/reviewer وصلاحية/version واعتماد النشر والتسعير القائمة | PublicServiceCatalogUseCases يأخذ المحتوى من snapshot كاملة وحدها، ويتحقق من المالك والحالة، ولا يملأ الحقول الناقصة من المسودة؛ يختار الزوج الكامل فقط |
| CAREER_JOB | title/description في metadata.localizedContent.ar/en | Career job version وpublishedSnapshot القائمة | مالك الوظائف وصلاحياته ومراجعه ونطاق جهة العمل والـconsent القائمة | publishedCareerJob يأخذ حقول snapshot وحدها مع مرجع جهة العمل المسموح؛ CareerPublicUseCases يختار الزوج الكامل؛ لا ملء من metadata مسودة |

## قواعد التسليم

- هوية الهدف lookup exact فقط؛ لا أسماء أو fuzzy matching أو تخمين IDs. اسم التخصص والقسم كلاهما يحتاجان profileId وversionId، وتطابق الملكية وأحدث نسخة عمل غير منشورة. تستخدم route الترجمة publicId الجذر مع scope صريح؛ لا تستنتج ملفًا أو نسخة.
- النقل المحكوم إلى الجامعة والتخصص يبقي receipt وmaker/checker وscope الموافقة واستهلاكها وaudit/outbox في معاملة المالك. إعادة receipt المطابقة لا تكرر الأثر. لا تستبدل أوامر المالك الأصلية بسياسة موافقة جديدة للنطاقات الأخرى.
- تسليم التخصص يستدعي PrismaMajorTranslationOwnerPort داخل المعاملة؛ لا يكتب اسم الجذر ولا snapshot تاريخية. النتيجة `published=false`, `publicEligible=false`, `publicationStage=OWNER_REVIEW_REQUIRED`. تُبطل مراجعة النسخة، ويعود الملف READY_TO_REVIEW مع حفظ مؤشر النسخة العامة السابقة، ويُقدّم revision المالك رتيبًا تحت القفل. النشر العام يتطلب مراجعة المالك ثم إنشاء snapshot جديدة.
- الأوصاف الثلاثة الجديدة تُحفظ بأمر المالك كزوج كامل، لا payload JSON عام. ترتبط بهوية المالك وcheckpoint مصدر فعلي وبصمة المصدر وبصمة locale/الاسم/الوصف. revision الاختبار يبدأ من صفر وفق عقده القائم؛ لا نفترض أنه يبدأ من واحد. بقاء النص في نسخة عمل لا يمنحه حالة نشر مستقلة؛ سلطة النشر هي دورة المالك ونسخته.
- تعديل المصدر يجعل الدليل غير صالح ويوقف الاعتماد/النشر حتى إعادة تأليف الزوج أو إزالته صراحة ومراجعته. الاسم والوصف لا يُختاران من زوجين أو لغتين مختلفتين. نقص الترجمة يعيد المصدر المتاح أو القيمة الفارغة؛ لا نسخ لافتعال تغطية.
- الـpublic allowlists لا تعرض الأدلة أو revision المصدر أو metadata المسودة. لا تحتوي الحقول الجديدة handles أصول أو قواعد مالية/consent. الـcheckpoint المعماري: لا schema أو migration أو SQL تاريخي جديد، ولا توسيع ORM allowlist أو مراجع الأصول.

## API والإدارة

`POST /admin/{courses|scholarships|international-tests}/:id/localized-description`: locale مع displayName وdescription، أو remove=true للغة المحددة. يستخدم If-Match وسبب المراجعة وصلاحيات المالك القائمة. تفرض الأوامر سياسة الترجمة المعلقة أيضًا. حُظر حقن ownerLocalizedDescriptions عبر تحديث JSON العام، وحقن أدلة أسماء/أقسام التخصص عبر metadata الاستيراد العامة.

لوحة وصف المالك في صفحات الإدارة الأصلية تعرض الأزواج المحفوظة، وتستخدم أمر المالك وإعادة قراءة القيم؛ بعد فشل readback يمنع تكرار الحفظ حتى إعادة التحميل. لوحة التخصص تعرض المرشح المحفوظ لنفس الملف والنسخة والحقل وتسلّمه بالموافقة القائمة إلى مراجعة المالك. الكتابة في اللوحتين معطلة بالسياسة الحالية. اكتشاف capabilities مفلتر بصلاحية كل مالك، وcentralDescriptionEditor=true للجامعة وحدها؛ لا استنتاج إمكان تحرير وصف جذري من دعم وصف داخل نسخة.

## التشغيل والتراجع

نجاح المصدر لا يثبت معاملات PostgreSQL أو المتصفح أو البيانات التاريخية. تبقى بوابة المصدر/approval/receipt والأقفال والتراجع وbrowser→API→DB وسحب النشر وتبديل اللغة وNode 22 معلقة. لا نقوم بترقية أدلة تاريخية أو ربط snapshot بمعرفات مستنتجة. إغلاق B11 هنا إغلاق مصدر كما في B10؛ التشغيل والنشر مفصولان في السجل والتقرير.

التراجع بتعطيل الأوامر/القدرات المتأثرة والإبقاء على النسخ والصفوف وreceipts. لا حذف بيانات أو تعديل snapshots تاريخية. لا تغيير main.
