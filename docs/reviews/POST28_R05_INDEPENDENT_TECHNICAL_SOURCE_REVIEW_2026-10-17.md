# MANARATAK 2.0 — R05 independent source and architecture review

**تاريخ المراجعة:** 2026-10-17  
**المرجع المصدر المجمّد للمراجعة:** bd112aaebb7c72e80bda390c4370aef990ef55e1  
**الفرع الأصلي عند القراءة:** fix/post28-ci-environment-inventory-20261016  
**نوع الاعتماد:** مراجعة مصدر مستقلة بواسطة مساعد تقني؛ **ليست** توقيع مالك Assets أو Student، وليست شهادة تشغيل PostgreSQL.  
**نتيجة المراجعة:** **CHANGES_REQUIRED** لخطة التنفيذ والإثبات قبل الترقية؛ **R05 = BLOCKED** و **109→110 = NOT EXECUTED** من جانب هذه المراجعة. لا تعديل migrations ولا R06 ولا main.

## 1. حدود المراجعة ومصدر الحقيقة

- تم جلب HEAD من GitHub مرتين؛ آخر قيمة عند إنشاء فرع المراجعة bd112aaebb7c72e80bda390c4370aef990ef55e1. تم جرد شجرة المستودع كاملة (7,230 عنصرًا من GitHub API؛ غير مبتورة) ولم يظهر AGENTS.md في أي مسار عند SHA المفحوص. لا تُنسب نتيجة إلى SHA أقدم عند اختلاف الملفات.
- تمت قراءة الخطة v1.3، التقارير التاريخية/المعالجة/التسليم/القرارات R05 وR06، حالة config/testing/post28-stage-disposition.json، وملف POST28_R05_KNOWN_SOURCE_TECHNICAL_REVIEW_2026-10-16.md الموجود بالفعل في GitHub. كما قورنت نتائج JSON المنشورة بحالة التنفيذ المكتوبة.
- تتبع المصدر: IngestAssetUseCase وAssetValidator وAssetRecord (دورة الحياة والـevents) وProcessAssetLifecycleUseCase وAssetReferencePolicy وPrismaAssetRecordRepository، محولات التخزين والفحص والتعقيم وNoop، سياسة usage/retention وasset triggers؛ في Student تتبع StudentDocumentUploadUseCases وStudentApplicationTrackerUseCases وStudentDocumentReviewUseCases وPrismaStudentApplicationTrackerRepository، schema/migration 109 و110 والاختبارات الملائمة، وأدوات قياس/مقارنة الترقية.
- **لم** تتم هنا أي جلسة DB أو تشغيل scanner/provider أو رفع ملف فعلي أو اختبار Node/Vitest محليًا؛ نتائج التشغيل المنشورة من Codex **أدلة سابقة قرأتها** وليست اختبارات أُعيد تنفيذها في هذه المراجعة. البيئة الخاصة /workspace/scratch/post28/labs غير متاحة لهذا الاتصال؛ لا يجوز استخدام أو الادعاء باستعادة هوية مختبر سابق.

## 2. التمييز بين السيناريوهين

**الحالة الأصلية المرفوضة:** على SHA 40f93b655c4835f669c6686d7301817f48f0e5c2، binding = 2a4960c9-b4be-405a-8b21-7c3b34a5034f، missing asset = aafb690a-1f6c-463d-8b24-3d88e9a9b5d8. إنها fixture صناعية قديمة أُدخلت قبل FK 109؛ أدت audit ذات التسع مجموعات إلى مخالفة FK واحدة ورفض بوابة 110. لم يتوفر لها ملف أصلي ولا digest. يجب **الاحتفاظ بها دون تعديل** دليلاً سالبًا.

**الحالة الجديدة ذات المصدر المعروف:** وفق source-packet المنشور على SHA 3988832ed599baf94a569a41e9f116806da2546a، ملف PDF صناعي **636 بايت**، SHA256 = **7815592e17eeb3bb1b720b4d8df1f6a697954b99328843dff6fb6f1555c08da7**، مملوك لطالب fixture 000f4d39-0c78-45b5-8429-8223ffdb205c. الـpacket يؤكد assetCreated=false، approvals=[]، activeCleanEvidence=false. نسخته 108→109 والنسخ والاستعادة البنيوية وaudit exit 2 موثقة، أما الإصلاح الفعلي و110 **فغير منفذين**. تكرار معرف اليتيم داخل قاعدة مستقلة لا يحوّل ملفها الجديد إلى الملف الأصلي المفقود. ينبغي قياس SHA256 من البايتات الخاصة في المختبر عند التشغيل، لا الاكتفاء بنسخ قيمة الـJSON.

## 3. نتائج تتبع التنفيذ المؤكدة

### F01 — استعادة المعرف التاريخي ممكنة عبر المسار العام لا عبر واجهة الطالب (إيجابي بشروط)

في https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/bd112aaebb7c72e80bda390c4370aef990ef55e1/packages/application/src/asset-platform/use-cases/IngestAssetUseCase.ts#L31-L103 تستقبل requestUploadLocator قيمة assetId من input، تبني AssetId بها، ترفض وجود السجل مسبقًا، تخصص locator في QUARANTINE، وتبني AssetRecord ثم تستدعي repository.save. في https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/bd112aaebb7c72e80bda390c4370aef990ef55e1/packages/infrastructure/src/asset-platform/PrismaAssetRecordRepository.ts#L42-L112 يستعمل repository عند غياب snapshot عملية Prisma create وليس upsert؛ لذلك **لا يلزم تعديل schema ولا SQL خاص** لمجرد الإبقاء على الـUUID التاريخي في السيناريو الجديد بشرط عدم اصطدامه بسجل قائم.

لكن https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/bd112aaebb7c72e80bda390c4370aef990ef55e1/packages/application/src/students/use-cases/StudentDocumentUploadUseCases.ts#L24-L54 يولّد randomUUID جديدًا، وhttps://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/bd112aaebb7c72e80bda390c4370aef990ef55e1/packages/application/src/asset-platform/use-cases/IngestAssetUseCase.ts#L38-L44 يسجل consentGrantedAt حديثة ضمن metadata للرفع الداخلي. **لا يستعمل أي منهما** لإصلاح ربط تاريخي. استخدم owner-scoped backoffice/lab orchestration يستدعي المسار العام بمعرّف ثابت وتحقق مالك موثوق؛ ليس استدعاء endpoint طالب عادي أو SQL insert. عدم تقييد هوية الممثل عند واجهة الاستدعاء يحتاج إثبات API/worker principal قبل السماح بأي استخدام.

### F02 — FK/VALIDATE وحدهما لا يثبتان سلامة الملف (P0 قبول)

https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/bd112aaebb7c72e80bda390c4370aef990ef55e1/packages/infrastructure/prisma/migrations/20261015100000_student_document_asset_boundary/migration.sql#L9-L41 يضيف FK NOT VALID ويمنع الربط الجديد بأصل غير ACTIVE، ويحمي تحول/حذف أصل مستخدم. غير أن trigger على AssetRecord يعمل في DELETE أو UPDATE، **وليس INSERT**. إنشاء AssetRecord بحالة INITIATED للـUUID المفقود قد يحل مخالفة الوجود المرجعي قبل اكتمال فحص البايتات. وفي https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/bd112aaebb7c72e80bda390c4370aef990ef55e1/packages/infrastructure/prisma/migrations/20261016150000_post28_schema_reconciliation/migration.sql#L59-L65 فحص 110 يتأكد من وجود AssetRecord ثم VALIDATE CONSTRAINT، وليس من تحقق CLEAN/checksum/ownership/consent.

**التصحيح المطلوب:** يضاف إلى مسار R05 الاستثنائي audit موجّه للـmanifest المعين: asset ACTIVE، clean locator، checksum SHA256 الدائم مطابق لبصمة *الناتج المعقم* لا يُفترض مطابقًا للمصدر الخام، upload verification موثّق، scan ناجح قبل/بعد sanitization، classification/owner/retention صحيحة، delivery trust assertion تنجح، binding والحقول التاريخية لم تتغير. يُرفض أي INITIATED/QUARANTINED حتى لو أصبح orphanCount=0. لا حاجة لإعادة كتابة migration109 أو110.

### F03 — سلامة الفحص تحتاج مزودًا فعليًا لا مجرد نص وصف (P0)

https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/bd112aaebb7c72e80bda390c4370aef990ef55e1/packages/application/src/asset-platform/use-cases/ProcessAssetLifecycleUseCase.ts#L41-L159 يتحقق من الحجم والنوع وبصمة البايتات في التخزين، يعاينها مرة أخرى قبل malware scan، يشغّل sanitize، يعيد verify ويجري scan بعد التعقيم. https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/bd112aaebb7c72e80bda390c4370aef990ef55e1/packages/application/src/asset-platform/use-cases/ProcessAssetLifecycleUseCase.ts#L162-L216 يسجل activation intent، ينتقل إلى CLEAN بعملية digest-bound مع retry/recovery، ويمنع التفعيل عند غياب الإثبات. https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/bd112aaebb7c72e80bda390c4370aef990ef55e1/packages/domain/src/asset-platform/aggregates/AssetRecord.ts#L415-L442 يرفض التسليم إلا في ACTIVE/CLEAN مع evidence متسق.

المحولان Noop يرفعان ASSET_MALWARE_SCANNING_UNAVAILABLE وASSET_SANITIZATION_UNAVAILABLE صراحةً؛ لا يعدان نجاحًا. توجد محولات HTTP موقعة جاهزة للتحقق من مزود خارجي في https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/bd112aaebb7c72e80bda390c4370aef990ef55e1/packages/infrastructure/src/asset-platform/HttpAssetSecurityGateways.ts#L258-L315؛ لكن وجود المحول في المصدر **لا يثبت** إعداده أو تشغيل مزود PDF. مخرجات R06 المنشورة تصرّح بعدم وجود اختبار مخزن/scan/provider حقيقي. يجب توفر مزود مُثبت الهوية/جاهز وفحص PDF حقيقي قبل القبول، أو ترك الحالة BLOCKED.

### F04 — Consent وهوية الطالب منفصلتان عن إصلاح الأصل (P0 خصوصية)

https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/bd112aaebb7c72e80bda390c4370aef990ef55e1/packages/application/src/students/use-cases/StudentApplicationTrackerUseCases.ts#L54-L115 يشترط consent عند الربط، tracker/cycle/requirement version حاليين، أصل الطالب نفسه عبر AssetReferencePolicy وحالة موثوقة، ويكتب consentGrantedAt وقت الربط. https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/bd112aaebb7c72e80bda390c4370aef990ef55e1/packages/application/src/asset-platform/AssetReferencePolicy.ts#L25-L73 يفحص الحالة والمالك والنوع وMIME وDomain delivery evidence.

https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/bd112aaebb7c72e80bda390c4370aef990ef55e1/packages/infrastructure/src/students/PrismaStudentApplicationTrackerRepository.ts#L133-L170 يخزن منح/سحب موافقة *المراجعة* عبر CAS + audit/timeline/outbox؛ وسحبها يصفّر reviewConsentGrantedAt/reviewConsentUntil وattestation. https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/bd112aaebb7c72e80bda390c4370aef990ef55e1/packages/application/src/students/use-cases/StudentDocumentReviewUseCases.ts#L47-L132 لا يفتح الملف دون صلاحية موافقة المراجعة الحالية، requirement/version، retention، هوية المالك والـchecksum، ويعيد التحقق بعد طلب grant.

**قرار الإصلاح:** لا تستدع bindDocument أو consent(true) أو requestStudentDocumentUpload، ولا تحدث student binding أو requirementSnapshot أو تاريخ موافقة قديمة أو attestation لمجرد ترميم FK. اختبر أن أصلًا عاد ACTIVE لا يمنح وصولًا إذا كانت الموافقة مفقودة أو مسحوبة أو مستقبلية/منتهية، أو tracker قديم/ownerVersion غير متوافق. يجب أن يكون السلوك عند عودة الأصل مجرد إمكانية إعادة تقييم الجاهزية وفق السياسة الحالية، **لا منح وصول جديد**. الملف الصناعي القديم يحمل tracker cycleReferenceId=LEGACY، وattestation اصطناعية غير صالحة للمراجعة الواقعية؛ لا تحويلها إلى دليل موافقة أو إيجابية وظيفية.

### F05 — Retention وlegal hold يحتاجان قرارًا صريحًا (P0 بيانات)

AssetValidator يجيز TEMPORARY فقط مع expiry مستقبلي، ويحد الحجم إلى 10 MiB وMIME/extension whitelist: https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/bd112aaebb7c72e80bda390c4370aef990ef55e1/packages/application/src/asset-platform/utils/AssetValidator.ts#L90-L177. واجهة StudentDocumentUploadUseCases تثبت classification=CONFIDENTIAL وTEMPORARY لمدة 180 يومًا: https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/bd112aaebb7c72e80bda390c4370aef990ef55e1/packages/application/src/students/use-cases/StudentDocumentUploadUseCases.ts#L24-L51. ملف fixture القديم يحمل binding.retentionUntil تاريخًا بعيدًا (2035)، ولا يسمح ذلك وحده بنقل التاريخ إلى retentionExpiresAt للأصل الجديد. يلزم قرار مالك Student + Assets حول classification، retention/expiry، هل الأصل الجديد يبقى أقل مدة من binding وكيف تظهر حالة الوثيقة بعدها، وما إذا كان legal hold مطلوبًا. عدم تطابق الآجال ينبغي أن ينتج حالة وصول مغلقة عند انتهاء الأصل، لا تغييرًا صامتًا في consent أو التاريخ.

https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/bd112aaebb7c72e80bda390c4370aef990ef55e1/packages/infrastructure/src/asset-platform/PrismaAssetRecordRepository.ts#L284-L333 يحرس purge حسب expiry/hold/lease والتقاعد؛ https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/bd112aaebb7c72e80bda390c4370aef990ef55e1/packages/application/src/asset-platform/use-cases/ProcessAssetLifecycleUseCase.ts#L242-L374 يرفض حذف أصل مستعمل ويدعم journaling/retry. هذه حماية مصدرية، لا إثبات لتشغيل أي hold في الحالة الجديدة. لا تستخدم أصل دائم افتراضيًا لتفادي قرار الاحتفاظ.

### F06 — تدقيق Asset/Outbox ليس تلقائيًا في مسار Ingest/Lifecycle (P0 عقد الإثبات)

https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/bd112aaebb7c72e80bda390c4370aef990ef55e1/packages/domain/src/asset-platform/aggregates/AssetRecord.ts#L158-L165 يصف event objects بأنها local artifacts **بلا published integration/outbox contract**. وفي https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/bd112aaebb7c72e80bda390c4370aef990ef55e1/packages/infrastructure/src/asset-platform/PrismaAssetRecordRepository.ts#L42-L153 عملية save تكتب assetRecord والتاريخ/metadata ولا تضيف AuditRecord أو TransactionalOutboxRecord. بخلاف ذلك https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/bd112aaebb7c72e80bda390c4370aef990ef55e1/packages/infrastructure/src/students/PrismaStudentApplicationTrackerRepository.ts#L514-L590 يكتب Student audit/timeline/outbox داخل المعاملة عند تعديل tracker.

لذا لا يجوز الاستدلال على audit/outbox لعملية معالجة Assets بمجرد رؤية AssetActivatedEvent، ولا اختلاق Student event. **المطلوب تصميم وتنفيذ سجل معالجة R05 مستقل وموثوق** يحمل actor/principal وسبب remediation ومعرّف manifest ومراجع binding/asset والبصمات evidence لكل انتقال، مع append-only audit وidempotency key وربط الحالة النهائية؛ إذا طلب عقد المالك نشر outbox للأصل، يُضاف wiring صريح وأدلة dispatch/retry عبر coordinator/transaction عند انتقالات DB، مع التعامل مع آثار التخزين الخارجية بوصفها saga/recovery وليست معاملة SQL ذرية. لا تُضاف events مالية أو موافقة طالب. خيار تسجيل R05 audit خاص بلا asset integration outbox يحتاج موافقة عقد المالك إن اعتُبر كافيًا.

### F07 — فروق الثقة في fixtures وعدم قبول نتيجة أعمال زائفة (P1)

https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/bd112aaebb7c72e80bda390c4370aef990ef55e1/scripts/database/post28-historical-fixtures.mjs#L14-L21 يولّد AssetRecord صناعية بحالة ACTIVE بلا evidence دورة رفع حقيقية، ويولد attestation/consent اصطناعية مختلفة لأغراض preservation. هذه صحيحة كاختبار تاريخي للصفوف والـFK، لكنها **ليست** أهلية تسليم ملفات أو قرار مراجعة طالب. اختبارات https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/bd112aaebb7c72e80bda390c4370aef990ef55e1/tests/database/post28-document-consent.database.spec.mjs#L8-L24 تستعمل adapter assets/grant مصنوعًا معلنًا للـconsent وتثبت PostgreSQL في نطاقها، لا فحص التخزين الفعلي. لا تجمّع نتائج R06 المختلفة لتقول إن R05 end-to-end نجحت.

## 4. مسار المعالجة المقبول مبدئيًا في مختبر جديد فقط

1. احتفظ بالسيناريو الأصلي 40f93b65 وأدلته وفشل audit؛ وافتح run/U/V خاصًا بالـsource packet الجديد مرتبطًا بـSHA واحد وقاعدة معزولة وصلاحيات أقل امتيازًا. لا تغيّر أسماء الترحيلات ولا بصماتها.
2. أثبت البايتات الـ636 وحجمها ومحتواها وSHA المصدر ومالكها من حزمة منفصلة قبل أي إجراء، مع حفظ locator في quarantine وضبط principal. قد يغيّر sanitizer بايتات الملف؛ لذلك احتفظ بصمتي **source input** و**sanitized output** كلٍّ باسمها. لا تستبدل fingerprint الأولى بالثانية.
3. حدّد قرار retention/classification/hold وتوافق metadata وpurpose وassetReference مع student binding، وتأكد من عدم وجود AssetRecord بنفس ID. استدع requestUploadLocator عبر مالك Assets scoped principal بنفس assetId= aafb...، ثم رفع **البايتات الفعلية** إلى quarantine عبر المزود الحقيقي. لا تستخدم registerQuarantinedAsset لإعطاء انطباع بأن الملف موجود إن لم يُرفع أصلًا؛ ولا تستخدم INSERT مباشر.
4. نفذ finalizeUploadedAsset → validateAsset → sanitizeAsset → activateAsset مع إثبات verify/storage provider readiness وmalware scan قبل وبعد وprovider digest-bound move، وأعد القراءة من DB بعد كل مرحلة. اختبر فشل المزود والاستئناف وعدم تكرار CLEAN object أو تراكم intent بلا reconciliation.
5. إثبات binding unchanged، وowner/workspace/requirement/consent/attestation unchanged؛ اختبر cross-student/withdrawn/expired/legacy negatives. احصر allowed delta في AssetRecord الجديدة، lifecycle metadata/version عند الضرورة، storage objects ومعرّفات عملياتها، وAudit/Outbox المصرح بهما *فقط*. لا ماليات ولا إعادة إنشاء binding.
6. أخذ baseline AFTER remediation محدد وربطه بbaseline BEFORE وبالنسخة الأصلية؛ backup ممثل جديد وrestore بنيوية على V؛ ثم audits التسع صفر وصحة repair trust audit العاشرة المخصصة. يسمح بالانتقال للاختبار110 فقط عند اكتمال هذه البوابات واستيفاء اعتماد المالكين التقني.
7. إذا تعذّر استخدام UUID تاريخي بسبب تصادم حقيقي أو سياسة تمنع ملكيته، **توقف** ولا تحدث binding بمعرف جديد تلقائيًا. يُراجع مالكا Assets/Student تصميم rebind رسمي موثق مع ledger history وconsent semantics، وربما migration إضافية append-only بعد القرار؛ ليس حل هذه fixture الحالية.

## 5. اختبار 109→110: شروط قبول قابلة للقياس

**Preflight:** نسخة 109 كاملة، 109 أسماء/بصمات ثابتة، client Prisma 5.22 السابق مولَّد من schema السابق، 281 counts / 8 invariants / 282 table hashes / financial exact totals، zero undefined-orphans، manifest hash وstorage evidence موقعة، أدوار DB-U/V مقيدة وهوية خادم/DB/schema/role/run متطابقة مع عقد التشغيل. لا ALTER يدوي على migrations القديمة ولا session_replication_role=replica.

**Apply:** حدّ lock_timeout/statement_timeout/transaction timeout معلن ويُراقب pg_blocking_pids، اختبار منع lock starvation ومراقبة elapsed؛ ALTER/VALIDATE من migration110 دون حذف evidence، ledger 110/110 بأسماء وبصمات مطابقة و0 partial/rolled back؛ فحص جميع constraints/indexes/triggers/NOT VALID=0 وschema diff. لا تستخدم migrate resolve أو reset.

**Preservation:** تطابق هوية DB-U قبل/بعد؛ counts وhashes canonical والـrelationships وفق allowed delta الموثق (قِس before-migration **بعد** الإصلاح كي لا يُفسّر asset الجديد كأثر ترحيل)، consent/ownership/retention/attestation لا تتغير، أرصدة ledger بوحدات integer نصية كبيرة موقعة حسب account/currency/scale، hash ونوع الملف في storage، والعميل القديم يقرأ ويمرّر عقوده الوظيفية بعد110.

**Recovery:** نقطتا اختبار منفصلتان: (أ) انقطاع آمن قبل apply دون أثر، ثم تشغيل ناجح، و(ب) إيقاف أثناء انتظار قفل أو عند حدّ timeout موثق وإثبات الحالة عبر ledger/transaction؛ استئناف/redeploy وإعادة التشغيل لا يولدان migration مكررًا أو outbox/event مزدوجًا؛ لا استنتاج rollback ناجح من exit code وحده.

**Postflight:** Audit صفر orphan وحالة asset موثوقة، ledger/catalog/schema hashing، backup artifact وR05 evidence hashes/versions، parallel negative security tests وprevious client. الترقية الفعلية **لم تنفذ في هذه المراجعة**؛ بوابة R05 تظل BLOCKED حتى تُجمع أدلة هذه الخطوات.

## 6. الأدلة والاختبارات: تفريق السلطات

| المستوى | النتيجة |
|---|---|
| 1. مصدر/تصميم | تمت قراءة المسارات المبينة وفحص قابلية UUID الثابت، بوابات file trust، وفصل موافقة الطالب، وحقيقة عدم وجود outbox تلقائي لمسار Assets؛ **SOURCE REVIEW COMPLETED WITH REQUIRED CHANGES**. لم أشغّل test runner بنفسي. |
| 2. PostgreSQL وfile lifecycle | التقارير السابقة تسجل 108→109 وbackup/structural restore وorphan gate exit2 (وأدلة R06 منفصلة)، لكن لا توجد معالجة الملف الجديد ولا provider PDF scan/sanitization ولا 109→110 أو previous-client-after-upgrade وlock/interruption/redeploy مثبتة. **PENDING**. |
| 3. مالك Assets ومالك Student | requiredReviews.approvals=[]؛ لا أملك صلاحية توقيع عنهما. نطاق المراجعة: قواعد الاستعادة بمعرف معلوم، classification/retention/legal-hold، binding/consent unchanged، evidence والعلاقات والأثر المعتمد. **AWAITING ACTUAL AUTHORITY**. |

## 7. قرار المدير المطلوب والقرار التقني

**سبب R05 الرئيسي ليس فقدان ملفات طلاب حقيقيين مثبتًا، ولا خللًا في FK المكتشف.** العائق متعمد: *historical synthetic orphan* نجحت بوابة السلامة في رفضه. الجديد يسمح باختبار إصلاح مشروع، لكن قفزًا من «UUID موجود» إلى «محتوى موثوق + موافقة سليمة» غير مقبول؛ إضافة إلى فجوة عقد تدقيق/Outbox مسار Assets وعدم وجود provider evidence وموافقة المالِكين.

**القرار المقترح من مدير المشروع:** اعتماد **نطاق إعداد/اختبار غير إنتاجي فقط** للحالة الجديدة، دون اعتبار ذلك توقيع Asset/Student أو تصريح تعطيل gate، وتكليف المالِكين بحسم retention/classification وبنية remediation audit/outbox. يمكن بدء تنفيذ أداة الاختبار وتهيئة مزود PDF وقياس source بدون انتظار R06؛ تبقى الترقية نفسها متوقفة حتى negative/positive runtime evidence ومراجعات المالكين.

**التوصية النهائية: CHANGES_REQUIRED.** ليست دعوة لإعادة بناء Assets أو Student، ولا توصية بتعديل schema لتثبيت ID: التعديل الأصغر هو **R05-specific safe remediation harness + trust/audit gate + مزود فحص PDF حقيقي وتحديد عقد التدقيق/الموافقات**. لو لم تُعتمد إضافة outbox للأصول ضمن عقدها الحالي، يجب تسجيل الاستثناء بدليل مالك صريح، لا افتراض وجود أحداث منشورة. لا تغيير إلى PASS، ولا اقتراب من Neon/production.

## 8. مصادر قابلة للتدقيق

- [خطة R05 الأصلية، البنود 186–197](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/bd112aaebb7c72e80bda390c4370aef990ef55e1/docs/remediation/POST28_ISOLATED_VALIDATION_EXECUTION_PLAN_v1.3_2026-10-16.md#L186-L197)
- [تقرير R05 known-source](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/bd112aaebb7c72e80bda390c4370aef990ef55e1/docs/remediation/POST28_R05_KNOWN_SOURCE_TECHNICAL_REVIEW_2026-10-16.md#L1-L30)
- [حالة R05/R06 في config](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/bd112aaebb7c72e80bda390c4370aef990ef55e1/config/testing/post28-stage-disposition.json#L1-L20)
- [سجل تشغيل الحالة الجديدة، R05 BLOCKED](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/bd112aaebb7c72e80bda390c4370aef990ef55e1/docs/reviews/evidence/post28/3988832ed599baf94a569a41e9f116806da2546a/r05-known-source/status.json)
- [Source packet SHA/owner/approvals](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/bd112aaebb7c72e80bda390c4370aef990ef55e1/docs/reviews/evidence/post28/3988832ed599baf94a569a41e9f116806da2546a/r05-known-source/R05-baseline/known-source/source-packet.json)
- [تقرير R06 closure المحلي، فصل الاختبارات عن المخزن الخارجي](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/bd112aaebb7c72e80bda390c4370aef990ef55e1/docs/remediation/POST28_R06_CLOSURE_REVIEW_2026-10-16.md#L31-L56)

**استقلال المراجعة:** لا يحتوي المستند على توقيع مؤسسي أو موافقات مالكين غير صادرة عنهما. فرع التقرير منفصل عن فرع R06؛ أي تنفيذ لاحق يحتاج SHA/run/target وتوقيع مالك جديدين، وليس إضفاء الموافقة بأثر رجعي.
