# B04 — ملكية البيانات ومراجع الأصول والفواحص

الحالة: **SOURCE_VERIFIED — DATABASE/RUNTIME PENDING**. التاريخ: 15 أكتوبر 2026.
فرع العمل: `fix/b02-auth-session-boundary-20261015`. قبل الإصلاح دُمج main عند `2524ae885e89d492a897b6c828a87cbb651080bc` في merge commit `3912c45`، مع الحفاظ على B03 والخطة. لم يُدفع إلى main.

## التنفيذ والتحقق من النواقص الحالية

- **ARCH-01/06:** بعد دمج عمل section 27 الأحدث أصبح manifest يغطي **281/281 نموذجًا**، وبيانات الحوكمة مقبولة في المصدر؛ لم نكرر إصلاحًا موجودًا. راجعنا ملكية `StudentApplicationDocumentBinding` و`StudentSupportOwnerReadObservation` لدى student، و`OwnerTranslationTransferReceipt` لدى import: منفذ `PrismaTranslationImportGateway` يكتب إيصال النقل داخل معاملته، وليس مخزن ترجمة/محتوى جديدًا. فاحص persistence ناجح مع 47 ملفًا في baseline التاريخي و26 sidecar مع checksum. هذه أرقام سياسة المصدر وليست حالات تطبيق DB.
- جهزنا [جرد ملفات الترحيل](evidence/b04-migration-inventory-2026-10-15.json): **108 ملفات SQL**، بصمتها ومرجع metadata وحالة التطبيق `UNKNOWN_NOT_QUERIED`. ملفات baseline التي ليس لها owner في الترويسة تسجل null دون اختراع مالك. لم يتغير أي SQL تاريخي أو schema، ولم تُشغل قاعدة أو ترحيلات.
- استُبدلت قائمة اختبار metadata القديمة ذات 16 اسمًا بتغطية جميع ملفات الجرد ومطابقتها لملفات SQL الفعلية؛ تبقى اختبارات رفض تغيير checksum، والإعفاء لترحيل مستقبلي، والمالك المجهول/مرجع المراجعة الفارغ.
- **ARCH-02/NEW-05:** أضيفت حقول `CertificateAuthorityDelegation.evidenceAssetId` و`AssetRenditionRecord.assetId/generatedAssetId` و`StudentApplicationDocumentBinding.assetId` إلى سجل المراجع؛ الثلاثة الأولى كانت محسوبة بالفعل في الاستخدام، فلم نكرر تسجيلها. أضيف مرجع وثيقة الطالب إلى `PrismaAssetUsageRegistryGateway` ليمنع الحذف عندما يكون المرجع الوحيد.
- الربط الموجود يمنع purge حتى لو انتهت صلاحيته؛ لا يُهمل بمجرد مرور الوقت. الحذف المحدود لدى مالك الوثائق أو unlink الصحيح يزيل الربط فعليًا، وبعد ذلك يظل `assertPurgeAllowed` الخاص باحتفاظ الأصل واجبًا. تعطل delegate الخاص بالوثائق يفشل مغلقًا.
- فاحص الأصول يرفض تكرار manifest، ويتحقق من **delegate + field مرة واحدة** بدل الاكتفاء بالعثور على اسم حقل قد يكون تابعًا لنموذج آخر. يعترف بمسار `assertAssetReferenceUsable` القائم وبحوكمة rendition القائمة التي تفحص حالة الأصل والنسخة والمالك والدليل. لا صلاحية جديدة لتجاوز سياسة الأصول.
- **ARCH-04:** انتقل شكل `MajorImportReview` إلى عقود majors في domain. تستورده لوحة الإدارة من domain، وتعيد application تصديره لتوافق المستهلكين الحاليين؛ لم ينتقل منطق حالات الاستخدام إلى الواجهة.
- **NEW-02:** صُنفت السكربتات الثلاثة مع purpose/access/environment/gate/review. أداة التحقق من الشهادات محصورة في قاعدة محلية فارغة ومعزولة؛ سكربتا release يذكران اسم Prisma ضمن metadata فقط ولا يملكان إذن اتصال قاعدة. الحارس يرفض تحول reference-only إلى import/constructor/raw query، أو اختفاء بوابات المصدر المعتمدة. لا سماح شامل لكل scripts ولا تنفيذ تشغيلي بسبب التصنيف.
- **REL-03:** أصلحنا شرط الفاحص النصي ليتحمل المسافات/الأقواس في صيغة اللغة الموجودة فعلًا. اختبارات خدمة المنح تثبت تغيير اللغة، وثباتها دلاليًا، وعدم إعادة كتابة مرجعها في تعديل غير متعلق؛ لم نغير السلوك الصحيح لإرضاء الفاحص.
- **NEW-03:** استُخرج fallback إلى `scholarshipCanonicalReviewInput` الذي تستهلكه صفحة الاستيراد فعليًا. الاختبار يثبت حفظ requestedCanonicalId عند غياب rawValue، مع أولوية المصدر الحقيقي وتجاهل القيم الفارغة/غير النصية. يتابع الفاحص استدعاء helper وعقده بدل افتراض ترتيب السطور في الصفحة. المعرف المطلوب يبقى مدخل مراجعة ولا يصبح resolved تلقائيًا.

## الفحوصات الخفيفة

- **84 اختبارًا في 6 ملفات Vitest** عبر `.b04-vitest.config.ts`، بما فيها خدمة purge الفعلية مع usage gateway الحقيقي ومستودع الوثائق الحقيقي ببدائل persistence/provider. تشمل sole-reference، وانتهاء المدة، وunlink مع version conflict، وغياب delegate، وحوكمة الأصول ولغة المنحة.
- **21 اختبار Node** لعقود المعمارية، وmetadata الترحيلات، وسياسة التشغيل. اختبار أداة الشهادات يقيم المصدر الفعلي مع بدائل خاملة لـPrisma وspawn/process؛ لا socket ولا subprocess حقيقي. يرفض الأهداف الأجنبية/الخاطئة قبل إنشاء العميل، ويرفض قاعدة محلية غير فارغة قبل الترحيل.
- **43 اختبار B03** ناجحًا بعد دمج main، للتحقق من بقاء المسار الحقيقي واحتواء البيانات التجريبية.
- `tsc -b packages/domain packages/application packages/infrastructure apps/admin apps/web --pretty false`: PASS. توليد Prisma محلي فقط؛ لا اتصال أو تطبيق DB.
- ESLint للملفات المعدلة: صفر أخطاء، 18 تحذيرًا قديمًا؛ الملفات الجديدة: صفر أخطاء/تحذيرات.
- asset-reference integrity: **PASS — direct=32, json=4**.
- persistence boundaries: **PASS — 281/281**.
- scholarship catalog detail source: **PASS**.
- source quality: **PASS — صفر package/file cycles وصفر a11y findings**. فحص الأسرار و`git diff --check`: PASS.

الأدلة المحلية: `/workspace/reports/b04-ownership-assets-20261015/`.

## المتبقي وحدود الادعاء

- فاحص architecture العام ما زال يرفض موضعًا واحدًا يربط الدولة بالاسم (**NEW-01 / B08**). اختفت مخالفات DTO والسكربتات المنسوبة إلى B04.
- فاحص P3 أصبح **55/57**: المتبقي مرشحا country/degree القديمان ضمن **B06**، لا fallback المراجعة. لا تعطيل للفحصين ولا إعلان أن CI كله أخضر.
- جرد SQL لا يثبت applied status أو checksum المخزن في `_prisma_migrations` في البيئة المقصودة. مراجعة FK والأيتام وعقود المالك وإثبات تسلسل الربط والحذف في قاعدة معزولة ضمن **B05** قبل إغلاق تشغيل DB؛ لم نضف FK أو trigger تخمينًا.
- لم تُشغل اختبارات شاملة أو build شامل أو قواعد حقيقية أو مزودي ملفات/دفع/بريد أو نشر. بقاء أصل قبل ارتباط متزامن جديد يحتاج دليل معاملات/قيود قاعدة، ولا تغطيه بدائل هذه الحزمة.
- التالية **B05**؛ متطلبات تشغيل B01/B02 ومرحلة الاكتشاف B08 مستمرة كما هي في سجل التنفيذ.
