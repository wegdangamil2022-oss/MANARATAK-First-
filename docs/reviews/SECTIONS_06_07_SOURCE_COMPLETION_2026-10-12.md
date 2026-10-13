# استكمال المصدر للقسمين 06 و07 — 12 أكتوبر 2026

الأساس: `main@91cad346b0235d23b15d8f730ed27cb0b9d351d9`.
فرع العمل: `fix/sections-6-7-source-completion-20261012`.
النطاق: إصلاح النواقص الأربعة التي ظهرت في إعادة المراجعة حسب خطة `MANARATAK_ADMIN_REVIEW_CODEX.md`، مع فحوص خفيفة ودفع للفرع؛ لا دمج أو نشر أو تغيير قاعدة المستخدم.

## الإصلاحات

| مرجع الخطة | التغيير النهائي | الحدود |
| --- | --- | --- |
| FGA-06-002 | تقرير جودة P7 فعلي من SQL واحد: العملة واللغة الافتراضيتان المفقودتان/غير الصالحتين، نقص المنطقة/المنطقة الزمنية للمدينة، تعارض الدولة/المنطقة، وغموض aliases. التصفية حسب الدولة ونوع المشكلة، facets وإجمالي من نفس snapshot، 25 صفًا بترتيب ثابت، وروابط للقائمة المصفاة مع ID السجل. | عداد كل مشكلة هو عدد السجلات المتأثرة؛ السجل قد يظهر في أكثر من مشكلة. aliases بحسب normalizedAlias المحفوظ والنشط؛ المراجعة التاريخية للتطبيع منفصلة. المدن والمناطق country-scoped، والعملات/اللغات global. التغطية الرسمية والخارجية تبقى unknown. |
| 06.26/06.41 | عداد المدن النشطة يستخدم نفس cityWhere الذي تستخدمه القوائم، بما فيه isActive=true وlifecycleState=ACTIVE. | لم يُعدّل أي سجل قديم. |
| TAX-P0-006 | P8 screening يحفظ artifactId وبصمة SHA256؛ preview/refresh/apply تتحقق من الملف الحالي عبر EAP تحت FOR SHARE وassertCanDeliver/checksum. previewHash يشمل هوية المصدر وبصمته، مع مقارنة record المنظم من receipt عند refresh/apply. | receipts القديمة بلا هوية ملف/بصمة سليمة ترفض؛ تحتاج staging جديدًا. previews القديمة تحتاج refresh وموافقة جديدة. applied replay يبقى بلا canonical mutation أو duplicate audit/outbox. لا ادعاء تحقق bytes/provider مباشر في هذه الجولة. |
| حوكمة DAG ومسار TAX-P0-006 | قراءات الرسم غير المقسمة محدودة إلى 5000 عقدة و20000 حافة مع قراءة sentinel إضافي، وترفض الزيادة قبل validation؛ لا قبول لرسم مقطوع قد يخفي دورة. HTTP يعيد 503 للنطاق الزائد. | paged discovery يبقى متاحًا. دعم mutations لرسوم تتجاوز الحد يتطلب لاحقًا فحص وصول موجهًا ومعتمدًا؛ زيادة الحدود أو تقسيم الرسم عشوائيًا غير مسموح كحل. |

الواجهة الجديدة تعرض AR/EN، loading/empty/error، زر تحديث، تصفية الدولة، facets، وصفحات. طلبات القراءة قابلة للإلغاء وتمنع استجابة قديمة بعد تغيير السياق. لا HTML من payload ولا canonical writes في التقرير. المراجعة المختصرة وفق مهارة React غطت hooks/dependencies، أزرار type=button، labels وaria/error/status، حدود الصفحات وعدم تحميل catalog كاملًا.

مسارات المصدر الرئيسية: `ReferenceDataUseCases.getQualityReport`، `PrismaReferenceDataRepository.getQualityReport/getCityQualityCounters`، `/admin/reference-data/quality/issues`، `ReferenceQualityWorkspace`؛ و`AcademicTaxonomyScreeningConsumer`، `AcademicTaxonomyOwnerImportUseCases`، `PrismaAcademicTaxonomyImportGateway`، `PrismaAcademicTaxonomyRepository`.

## التحقق الحالي

Node 22.23.3، دون secrets أو اتصال بقاعدة المستخدم:

- `npx --no-install tsc -b packages/infrastructure apps/api apps/admin --pretty false`: PASS بعد تصحيح نوع خيارات skip في القراءة المحدودة. المحاولة الأولى فشلت بتشخيص TS2345 واحد؛ أضيف skip=0 ثم نجح الفحص. لا تجاهل لفشل متعلق بالتغيير.
- اختبارات مستهدفة: 14 ملفًا / 104 حالات. أول تشغيل: 103 PASS و1 FAIL لتوقع قديم لقراءة nodes بلا take/skip. حُدث التوقع ليثبت حد القراءة الجديد مع الحفاظ على فحص جميع filters؛ إعادة ملف nodes: 6/6 PASS، 1.22 ثانية. النتيجة المجمعة للحالات المختارة بعد التصحيح: 104/104. لم تُعد المجموعة كاملة أو اختبارات DB/E2E الكبيرة.
- المجموعة تشمل owner import/quality/application، persistence وحدود المصدر والرسم، repository nodes/relations، وHTTP quality/owner/closure. اختبارات سلبية جديدة للملف المحجور/المفقود/البصمة المخالفة، receipt القديمة، تبديل المصدر أو payload مع requestHash ثابت، oversize graph، country/kind/page/query غير المصرح، وisActive القديم.
- تحقق صياغة الاستعلام المتولد باستخدام PostgreSQL parser (pglast): PASS. SQL المتولد محفوظ في مجلد الأدلة؛ لا بيانات أو credentials.
- تحقق بيانات صغير داخل PostgreSQL معزول في الذاكرة (PGlite): PASS لثلاث دول وبيانات مرجعية صغيرة، defaults غير صالحة/مفقودة، صفر للبلد السليم، country-scoped alias ambiguity، عدم تكرار السجل صاحب عدة aliases، فصل global currencies، وصفحتين لــ31 مدينة متأثرة. استُخدم نفس استعلام repository دون mock للأعداد. لا DB متصلة أو إعداد خادم أو migration. المصدر القابل لإعادة التشغيل في `evidence/sections-06-07-completion-20261012/quality-fixture.ts`؛ الحزمة المؤقتة لم تُضف إلى dependencies/lockfile.
- `node scripts/quality/verify-source-quality.mjs`: PASS؛ package/file cycles=0، accessibility findings=0.
- `git diff --check`: PASS.
- `node scripts/architecture/verify-persistence-boundaries.mjs`: FAIL بنفس 15 مخالفة المراجعة الأساسية، دون مخالفة جديدة لهذه التغييرات: model manifest 270/266، قراءتان scholarships→UniversityAcademicProgram، و12 علامة metadata ناقصة لأربعة ترحيلات الأقسام 02/03/04 بتاريخ 12 أكتوبر. تلك مخالفات مصدر فعلية خارج نطاق الإصلاحات الأربعة؛ لم تُسمَّ اختبارات تشغيل مؤجلة أو تُخفَ.

## إعادة تشغيل fixture الصغيرة

من جذر المستودع، مع حزم المشروع مجهزة ومبنية، انسخ `quality-fixture.ts` إلى مجلد مؤقت وثبّت `@electric-sql/pglite` هناك (`npm install --prefix <temporary-directory> --no-audit --no-fund @electric-sql/pglite`). شغّل الملف من جذر المستودع بواسطة `node --import tsx <temporary-directory>/quality-fixture.ts`. يستخدم PGlite الذاكرة فقط، وينشئ/يغلق fixture خاصة دون DATABASE_URL أو قاعدة المستخدم.

## المتبقي حسب الخطة

النواقص الأربعة لها الآن مصدر وفحوص خفيفة. يبقى تشغيل ملحق ما بعد 28: ترحيلات P7/P8 المعتمدة، فحص multiple-primary التاريخي قبل تفعيل index، PostgreSQL locking/rollback/audit/outbox الفعلي، genuine EAP provider/bytes، P6→P7/P8 والمتصفح/public/AR-EN، بيانات المدن وUnicode التاريخية، المصادر الرسمية ISO/UN/IANA/CLDR، الأداء والاسترجاع. الترحيلات السابقة لم تُطبق وما زالت مسارات تعتمد عليها غير جاهزة لقاعدة تفتقد الجداول.

لم يُضف schema/migration أو dependency جديدة في هذه الدفعة. لا تغيير Roadmap أو ملكية المجالات. المخالفات المشتركة الخمس عشرة تبقى FIXES_REQUIRED لأصحابها؛ لا إعلان إغلاق المستودع كله أو PRODUCTION_GO.
