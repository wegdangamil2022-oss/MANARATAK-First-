# P10a — أصل مصدر مفحوص وإيصالات screening دائمة

الحالة **LOCAL_ASSET_AND_P6_SCREENING_VERIFIED / OWNER_PROMOTION_PENDING**. مصدر التشغيل `dd8ab386f96c8e803c90102c0fd1dac9b2284d3d`، مختبر PostgreSQL 16.15 جديد run `0f36a6dc-5241-4a3d-8733-c41aa2125655` على loopback:51234. [الإيصال](evidence/IMPORT_UNIVERSITY_SOURCE_POSTGRES_2026-10-23.json)، [المشغل المنفذ](evidence/IMPORT_UNIVERSITY_SOURCE_EXECUTION_2026-10-23.ts.txt)، [استئناف التحقق المتبقي](evidence/IMPORT_UNIVERSITY_SOURCE_RESUME_2026-10-23.ts.txt).

## ما أصبح مثبتًا

1. فُحص مصنفا XLSX الأصليان بـWindows Defender بهوية ملف تنفيذي وبصمة وتوقيع Microsoft وصحة تعريفات مثبتة. خرج الفحص بنجاح دون تهديدات ودون تغيّر SHA256، وبـDisableRemediation. المحاولة النسبية الأولى لم تنجح؛ أثبت تشخيص المسار المطلق السبب وصُحح المشغل فقط دون تخفيف حارس الماسح.
2. طابقت بصمات المصنفين مراجعة الصفوف السابقة. أُنشئ JSON مشتق من الأربع جامعات ذات الحقول المراجعة، ويحفظ المصدر ورقم صفه وبصمة ملفه وصفه والمراجعة في metadata. لم ننفذ صيغ XLSX أو نغير المصنفين أو نعتبر فحص الفيروسات مراجعة للحقائق.
3. مر أصل JSON عبر IngestAssetUseCase وLocalAssetStorageGateway وPrismaAssetRecordRepository ثم finalizeUploadedAsset/validate/sanitize/activate. رُفضت القراءة قبل التفعيل؛ نجحت readAuthenticatedDelivery بعده مع تطابق SHA256 والعدد والبايتات. مسار الفحص يقتصر على JSON محدود مطابق حرفيًا للإسقاط، مع فحص قبل/بعد وsanitization metadata؛ ليس sanitizer لملفات XLSX أو ملفات الطلاب.
4. الأصل INTERNAL وTEMPORARY لمدة 30 يومًا ثابتة من إنشاء هذه التجربة، انتهاء `2026-11-22T00:50:19.841Z`. هذه سياسة أصل تجربة محلي قابل لإعادة الإنشاء من المستودع وليست سياسة احتفاظ إنتاج أو طلاب أو اعتماد Legal Hold. لا PERMANENT لتجاوز الفحص. المعرف الفعلي وبصمة الأصل وحالة الفحص محفوظة في الإيصال؛ المخزن محلي خاص، دون رابط عام.
5. استُخدم UniversityImportHandoffService الفعلي مع PrismaUniversityRepository، وImportHandoffDispatcher وPrismaImportScreeningReceiptStore وImportAdminUseCases/PrismaImportRepository. النتيجة 4 ImportRecord و4 screening receipts مرتبطة بأصل المصدر وبصمته، وكل مرشح promotion.automatic=false وpublication=false وMANUAL_REVIEW_REQUIRED.
6. نجحت إعادة إيصال handoff دون زيادة، ورُفضت محاولة تغيير المدينة تحت الهوية نفسها بـIMPORT_RECEIPT_CONTENT_CONFLICT. أعادت دفعة staging تخطي المكررات الأربعة بلا ImportRecord أو إيصال إضافي. أنشأت الإعادة إطار batch فارغًا وفق العقد الحالي؛ لا ادعاء صفر كتابة كاملة لمجرد تخطي الصفوف.

لم تُنشأ جامعة أو UniversitySourceRecord أو UniversityImportChangeSet أو مراجعة ترقية. حالات الأربع **STAGED_INCOMPLETE** لغياب institutionType غير المراجع؛ structural validity في P6 لا تعني اكتمال المالك أو نجاح ترقية. اختلاف ownerDomain مقصود حسب الحدود: مخطط Stage 1 يستخدم PHASE_11_UNIVERSITY، بينما dispatcher المسجل في DI يدعم UNIVERSITY/UNIVERSITIES؛ لم نُعد تسمية الملفات أو نلغ الحراس لتوحيد شكلي.

## العزل والتحقق

طُبقت 111 migration في cluster جديد بمشغّل المخطط غير المرتفع. كل إجراءات الأصل وP6 بدور post28_app دون DDL أو ملكية أو ledger أو أدوار مرتفعة؛ SELECT لنماذج Prisma وكتابة 27 جدولًا لازمة للتهيئة المحلية. لا اتصال Neon أو قواعد سابقة أو إنشاء حساب حقيقي.

أثبت اختبارا RED أن dispatcher كان يسمح screening للجامعة بلا مخزن إيصالات. صار يرفض قبل استدعاء المالك عند غياب المخزن، مع بقاء store الموجود في DI. نجح 12 فحصًا مباشرا في ملفي dispatcher وuniversity handoff مع بناء application؛ lint لا أخطاء وله 4 تحذيرات any سابقة لم تتغير. لم تُعد مجموعات الاستيراد أو التعويض أو baseline.

توقف المشغّل الأول بعد إنشاء الإيصالات عند مقارنة نتيجة الذاكرة التي تحتوي importSessionId=undefined بالـJSON المخزن الذي يحذف ذلك المفتاح. هذه مقارنة دليل، لا خلل بيانات أو تغير محتوى؛ استُؤنفت فحوص replay/conflict والمكررات فقط بعد توحيد JSON كما يخزنه العقد، دون إعادة الأصل أو الصفوف الأولى. أُعيدت قراءة الأصل المصادق عليه وفحصه بعد التفعيل لحفظ إيصال المسح النهائي، مع قراءة malware/sanitization metadata الأصلية من قاعدة المختبر. أُوقف الخادم بعد مطابقة run/المسار/PID/الملف التنفيذي، وبقيت ملفاته وأصله دون حذف.

## ما لا يزال مطلوبًا

المختبر يثبت مرحلة المصدر والفحص فقط. لا ربط تنفيذي معتمد بعد بين مراجعات screening الأربعة وخطتي كتابة الجامعة المختومتين، ولا نتجاوز UniversityImportPromotionUseCase القديم الذي يرفض bulk promotion صراحة. يلزم مسار مراجعة المالك وربط الدليل بالخطة، ومراجعة نوع المؤسسة حيث يلزم، ثم الهوية المفوضة الفعلية وفحص الهدف الحي والنسخ/الاستعادة والاعتماد قبل التطبيق المدار. الحساب الحقيقي مؤجل باختيار المالك؛ لا تحويل فحص المصدر أو اكتمال الأصل إلى موافقة حساب/ترقية. بقية P09/P10 باقية مفتوحة.

CI لمرجع البداية 80f46792 عند آخر فحص: Architecture وCross-module وSecurity ناجحة؛ Enterprise 39880042832 وImported Courses 39880042811 مستمران. تسليم الأصل يحتاج نتيجة SHA الخاصة به؛ لا PASS شامل مفترض.
