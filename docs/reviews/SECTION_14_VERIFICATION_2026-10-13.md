# تقرير تحقق القسم 14 — الشهادات / Certificates (P14)

التاريخ: 2026-10-13. المستودع: `wegdangamil2022-oss/MANARATAK-First-`.

**المصدر المراجع:** `main` عند `2d31d7ed60c24df137294496423b7f6136ee2a5d`. فرع التقرير: `codex/review-section-14-evidence-20261013`.

**النتيجة: القسم غير مغلق.** راجعت 33 متطلب CERT-ADM وملحقي FGA-14: **23 منفذًا بحسب قراءة المصدر لكن غير مثبت بالتشغيل في هذه الجولة، و12 جزئيًا**. لم أصنف أي متطلب «مكتمل ومثبت»؛ وجود كود/اختبارات/تقرير سابق ليس دليل PASS للكوميت الحالي. لا يوجد متطلب صنفته غير منفذ بالكامل، لكن داخل المتطلبات الجزئية توجد أجزاء غير منفذة.

## النطاق وحدود الأدلة

هذه مراجعة القسم 14، استمرارًا للسؤال السابق عن الشهادات، وليست إعادة تحقق للأقسام 1–13 أو 15–28. قرأت الخطة والكود والتوثيق السابق ولم أعتمد إغلاقات التقارير وحدها. حالة الخطة القديمة مرتبطة بـ baseline سابق، ولا تطابق تلقائيًا `main` الحالي.

لم أغير مصدر التطبيق، ولم أشغل اختبارات ثقيلة أو خفيفة أو أكرر فحوصًا سابقة، التزامًا بتوجيهك بعدم تكرار الاختبارات. لم أتصل بقاعدة بيانات أو موفر، ولم أطبق ترحيلات أو أنشر. الأدلة أدناه **قراءة مصدر** وليست نتائج تشغيل أو اختبارات ناجحة.

## المنجز بحسب المصدر

خصوصية PDF/preview، حجب claims غير الموثوقة، حراسة إعادة الإصدار، القوالب التاريخية، فحص الأصول المجمدة، تنزيل محكوم بالصلاحية/المالك والحالة، أهلية الإكمال التاريخية، مراجعة تصحيح المستفيد وإعادة التحقق، الفصل بين الإلغاء والانتهاء، pagination وفلاتر owner، ومقارنة التوقيع بزمن ثابت موجودة. توجد واجهات إنشاء/تعديل/تعليق/اعتماد الجهة والتنزيل ومعاينة النسخة، لكن عرضها وتجربتها في متصفح ليس مثبتًا هنا.

## المتبقي من الأكواد والواجهات — وليس مجرد تشغيل مؤجل

1. **سلطة الجهة الخارجية (002):** وجود جامعة منشورة لا يثبت تفويض الجهة؛ استكمال authority resolver للمؤسسات والتحقق من التفويض الفعلي.
2. **سياسة السجلات (005):** جعل الاحتفاظ قابلًا للإعداد الإداري بدل مدة 30 يومًا المثبتة، وتحديد نطاق حماية rate limit عبر العقد عند التوسع.
3. **التوقيع (006):** توصيل adapter KMS/HSM غير قابل للتصدير وإدارة المفاتيح التاريخية؛ الحظر الآمن في الإنتاج موجود لكنه لا يوفر خدمة إصدار جاهزة.
4. **تاريخ سلطة الإصدار (007):** حفظ نسخ authority ومراجعاتها قبل/بعد بدل استبدال trust metadata وتدقيق issuerCode وحده.
5. **فشل الرفع الجزئي (010):** استئناف/تسوية الأصل غير ACTIVE وتنظيف orphan. checkpoints الحالية لا تعالج فشلًا بين إنشاء locator وتفعيل الأصل.
6. **اتساق الانتهاء (014):** توحيد effective status في عدادات الإدارة وصفوفها قبل عمل expiry worker.
7. **عرض جهات الإصدار (021):** حجب signingKeyReference من DTO على الخادم لغير المخول وعرض تاريخ المراجعات؛ إخفاؤه بصريًا لا يحجبه من API.
8. **اللغة (024):** إكمال labels وحالات الواجهة إلى ترجمة owner-compatible موحدة.
9. **CI (025):** إضافة تعريف فحص DB معزول وسباق عاملين والتكاملات المطلوبة، دون تشغيلها الآن أو اعتبار workflow المصدر إثباتًا لها.
10. **readiness (029):** توصيل probe حقيقي للأصول والتسليم يمكنه إصدار READY بعد أدلة فعلية، بدل RUNTIME_PENDING الدائم.
11. **مراجعة القالب (030):** تقديم snapshot/diff قبل اعتماد النسخة، فوق الحماية الحالية If-Match والمراجع المستقل.
12. **صور القالب (033):** إضافة حدود الأبعاد/عدد البكسلات وفحص bytes قبل decode، وإثبات مطابقة PDF/preview لاحقًا.

## مصفوفة المتطلبات والأدلة

الروابط إلى الخطة تشير إلى موضع المتطلب؛ مسارات الكود وأرقام الأسطر تخص الكوميت المراجع.

| المعرّف | التصنيف | المتطلب في الخطة | دليل المصدر وحدوده |
| --- | --- | --- | --- |
| CERT-ADM-001 | منفذ وغير متحقق تشغيليًا | [P0 — عرض PDF والشهادات الشخصية يصنف PUBLIC رغم مسار تنزيل الطلاب المحمي](MANARATAK_ADMIN_REVIEW_CODEX.md) (سطر 10945) | `packages/infrastructure/src/certificates/EapCertificateArtifactStore.ts:23` — PDF/PREVIEW INTERNAL؛ QR فقط PUBLIC؛ منح التنزيل يمر بفحص الملكية والحالة. ACL للأصول القديمة غير متحقق. |
| CERT-ADM-002 | جزئي | [P0 — جهة الإصدار الخارجية تعتمد على بيانات اعتماد نصية ويمكن إنشاؤها ACTIVE من دون إثبات authority](MANARATAK_ADMIN_REVIEW_CODEX.md) (سطر 10951) | `apps/api/src/infrastructure/di/container.ts:993` — الاعتماد مستقل ووثيقته خاصة، لكن resolver يثبت وجود جامعة PUBLISHED فقط؛ لا يثبت التفويض المؤسسي ولا يدعم باقي الجهات الخارجية. |
| CERT-ADM-003 | منفذ وغير متحقق تشغيليًا | [P0 — غياب CAS/unique لمنع بديلين متزامنين لشهادة واحدة](MANARATAK_ADMIN_REVIEW_CODEX.md) (سطر 10957) | `packages/infrastructure/src/certificates/PrismaCertificateRepository.ts:434` — قفل صف الأصل داخل المعاملة وربط البديل والتحقق من دلالة إعادة الطلب. سباق PostgreSQL بين عاملين غير منفذ في هذه الجولة. |
| CERT-ADM-004 | منفذ وغير متحقق تشغيليًا | [P1 — Public verification يعرض حقول الادعاء من signedEnvelope حتى عند فشل سلامة التوقيع](MANARATAK_ADMIN_REVIEW_CODEX.md) (سطر 10963) | `packages/application/src/certificates/use-cases/CertificateUseCases.ts:302` — فحص hash/التوقيع وهوية الصف؛ إخفاء claims عند فساد السلامة، ثم public allowlist. |
| CERT-ADM-005 | جزئي | [P1 — التحقق العام يكتب سجلًا وOutbox مع كل طلب بلا سياسة معدل خاصة أو احتفاظ](MANARATAK_ADMIN_REVIEW_CODEX.md) (سطر 10969) | `packages/infrastructure/src/certificates/PrismaCertificateRepository.ts:472` — ميزانية IP/code في الراوتر وsampling مشترك عبر DB موجودان؛ الاحتفاظ ثابت 30 يومًا داخل expiry sweep وليس سياسة قابلة للإعداد؛ الميزانية محلية لكل عملية. |
| CERT-ADM-006 | جزئي | [P1 — التوقيع بمفتاح HMAC runtime واحد لا يحقق تاريخ key rotation/issuer isolation](MANARATAK_ADMIN_REVIEW_CODEX.md) (سطر 10975) | `apps/api/src/infrastructure/di/container.ts:972` — port توقيع غير قابل للتصدير وحظر fallback في production موجودان؛ الربط الافتراضي null ولا توجد وصلة KMS/HSM جاهزة مثبتة في تركيب التطبيق. |
| CERT-ADM-007 | جزئي | [P1 — تحديث بيانات authority لجهة إصدار نشطة أوسع من تغيير مفتاح التوقيع المحظور](MANARATAK_ADMIN_REVIEW_CODEX.md) (سطر 10981) | `packages/infrastructure/src/certificates/PrismaCertificateRepository.ts:58` — حظر تغييرات authority النشطة وIf-Match وإعادة اعتماد موجودة؛ metadata.trust يُستبدل عند التعديل، وحدث التدقيق يخزن issuerCode فقط، وليس نسخة authority قبل/بعد أو سلسلة مراجعات مكتملة. |
| CERT-ADM-008 | منفذ وغير متحقق تشغيليًا | [P1 — انتقال القالب إلى ACTIVE لا يعيد فحص أصول التصميم والجهة على مستوى المعاملة](MANARATAK_ADMIN_REVIEW_CODEX.md) (سطر 10987) | `packages/infrastructure/src/certificates/PrismaCertificateRepository.ts:170` — تفعيل تحت قفل مع فحص النسخة/الحالة والجهة والأصول المجمدة في المعاملة. |
| CERT-ADM-009 | منفذ وغير متحقق تشغيليًا | [P1 — Renderer يستخدم حقول صف الشهادة بدل الظرف الموقع للتحقق من محتوى النسخة الورقية](MANARATAK_ADMIN_REVIEW_CODEX.md) (سطر 10993) | `packages/application/src/certificates/use-cases/CertificateUseCases.ts:281` — render trust guard يفحص التوقيع وهوية الصف، مع جلب نسخة قالب تاريخية ومراجعة provenance. |
| CERT-ADM-010 | جزئي | [P1 — إنشاء ثلاث أصول EAP ثم attach قد يتوقف جزئيًا بلا saga أو cleanup](MANARATAK_ADMIN_REVIEW_CODEX.md) (سطر 10999) | `packages/infrastructure/src/certificates/EapCertificateArtifactStore.ts:18` — checkpoints لكل ملف مكتمل موجودة؛ سجل أصل غير ACTIVE من فشل الرفع/التفعيل يوقف retry دائمًا. لا مسار استئناف/تنظيف orphan واضح هنا. |
| CERT-ADM-011 | منفذ وغير متحقق تشغيليًا | [P1 — Attach-artifact لا يحمي lifecycle/immutability أو ارتباط EAP ownership داخل repository](MANARATAK_ADMIN_REVIEW_CODEX.md) (سطر 11005) | `packages/infrastructure/src/certificates/PrismaCertificateRepository.ts:290` — إرفاق الأصول تحت قفل مع فحص المالك وMIME والحالة وبصمة render، ومنع تغيير معرفات سبق تثبيتها. |
| CERT-ADM-012 | منفذ وغير متحقق تشغيليًا | [P1 — علامة سلامة الشهادة في Admin ليست تحققًا للتوقيع](MANARATAK_ADMIN_REVIEW_CODEX.md) (سطر 11011) | `apps/admin/src/pages/CertificateDetailPage.tsx:72` — صفحة التفاصيل تطلب تحققًا فعليًا من owner وتعرض وقت فحص السلامة؛ لا تكتفي بوجود metadata. |
| CERT-ADM-013 | منفذ وغير متحقق تشغيليًا | [P1 — معاينة شهادة تاريخية باستخدام النسخة الحالية للقالب بدل templateVersionId التاريخي](MANARATAK_ADMIN_REVIEW_CODEX.md) (سطر 11017) | `apps/api/src/presentation/api/router/CertificateAdminRouter.ts:126` — قراءة template-version تاريخية موجودة، وصفحة التفاصيل تجلب النسخة المرتبطة بالشهادة. |
| CERT-ADM-014 | جزئي | [P1 — الانتهاء الفعلي محسوب عند verify لكن لا يظهر عمل expireDue دوري في workers المراجَعة](MANARATAK_ADMIN_REVIEW_CODEX.md) (سطر 11023) | `packages/infrastructure/src/certificates/PrismaCertificateRepository.ts:407` — expiry sweep متصل بعامل completion وقفل SKIP LOCKED؛ public/student يحسبان الانتهاء. لكن analytics.active يعد جميع ACTIVE حتى المنتهية قبل sweep، وتحويل صف الإدارة لا يحسب effective status. |
| CERT-ADM-015 | منفذ وغير متحقق تشغيليًا | [P1 — الإصدار من حدث إتمام P13 يعيد قراءة mutable course flag الحالي بدل إثبات event التاريخي](MANARATAK_ADMIN_REVIEW_CODEX.md) (سطر 11029) | `packages/application/src/certificates/use-cases/CertificateUseCases.ts:361` — الإصدار يقرأ learning version عند الإكمال ويتحقق من أهلية النسخة التاريخية ومصدر native/event الموثوق. |
| CERT-ADM-016 | منفذ وغير متحقق تشغيليًا | [P1 — السياسة الثنائية اللغة للقالب لا تُنفّذ فعليًا في PDF/Preview](MANARATAK_ADMIN_REVIEW_CODEX.md) (سطر 11035) | `packages/infrastructure/src/certificates/ProviderNeutralCertificateRenderingService.ts:1` — renderer ثنائي اللغة وخطوط محلية وقياس نص/PDF/preview موجود؛ جودة الرسم والقص البصري لم تُختبر هنا. |
| CERT-ADM-017 | منفذ وغير متحقق تشغيليًا | [P1 — تنزيل الطالب لا يتحقق من صلاحية certificate الحالية قبل منح artifact grant](MANARATAK_ADMIN_REVIEW_CODEX.md) (سطر 11041) | `packages/application/src/certificates/use-cases/CertificateUseCases.ts:291` — التنزيل يرفض الشهادة غير الصالحة عبر assertRenderable قبل grant؛ الحالة التاريخية تبقى في ledger/public. |
| CERT-ADM-018 | منفذ وغير متحقق تشغيليًا | [P1 — تصحيح اسم المستفيد عند Reissue مسموح بفرد واحد بغير تحقق من هوية الاسم](MANARATAK_ADMIN_REVIEW_CODEX.md) (سطر 11047) | `packages/application/src/certificates/use-cases/CertificateUseCases.ts:271` — تصحيح المستفيد مرتبط بإثبات خاص وهوية canonical ومراجع مستقل وexpectedUpdatedAt. |
| CERT-ADM-019 | منفذ وغير متحقق تشغيليًا | [P1 — Event ID collision checking يتوقف عند fallback sourceCompletionId دون payload equivalence](MANARATAK_ADMIN_REVIEW_CODEX.md) (سطر 11053) | `packages/application/src/certificates/use-cases/CertificateUseCases.ts:70` — فحص hash ودلالة event replay، مع منع collision للإكمال داخل repository. |
| CERT-ADM-020 | منفذ وغير متحقق تشغيليًا | [P2 — Registry UI يجلب أول 50 شهادة ولا يقدم pagination ولو أن API يدعمه](MANARATAK_ADMIN_REVIEW_CODEX.md) (سطر 11059) | `packages/infrastructure/src/certificates/PrismaCertificateRepository.ts:380` — قائمة محدودة page/pageSize مع total وفرز issuedAt ثم id؛ UI انتقال صفحات بدل أول 50 فقط. |
| CERT-ADM-021 | جزئي | [P2 — واجهة جهات الإصدار تعرض توقيع reference لكنها لا توفر إدارة مراجعته وstatus lifecycle](MANARATAK_ADMIN_REVIEW_CODEX.md) (سطر 11065) | `apps/api/src/presentation/api/router/CertificateAdminRouter.ts:106` — واجهة تعديل/تعليق/مراجعة موجودة. إخفاء المفتاح في UI فقط: GET issuers يعيد DTO كاملًا لصلاحية view؛ تاريخ authority/عرض المراجعات غير مكتمل. |
| CERT-ADM-022 | منفذ وغير متحقق تشغيليًا | [P2 — زر تنزيل PDF الإداري موجود لكنه بلا onClick](MANARATAK_ADMIN_REVIEW_CODEX.md) (سطر 11071) | `apps/api/src/presentation/api/router/CertificateAdminRouter.ts:171` — زر PDF يستخدم delivery grant حقيقيًا بصلاحية download، ويمر بالحالة وEAP بدل زر شكلي. |
| CERT-ADM-023 | منفذ وغير متحقق تشغيليًا | [P2 — Query في Admin قائمة الشهادات يستخدم Number وString بلا contract bounded صارم](MANARATAK_ADMIN_REVIEW_CODEX.md) (سطر 11077) | `apps/api/src/presentation/api/router/CertificateAdminRouter.ts:98` — Zod strict وبحث محدود وتواريخ/UUID وصفحات محدودة، مع رفض نطاق تاريخ معكوس. |
| CERT-ADM-024 | جزئي | [P2 — النصوص واللغات والتواريخ في الشهادات غير موحدة عبر AR/EN](MANARATAK_ADMIN_REVIEW_CODEX.md) (سطر 11083) | `apps/admin/src/pages/CertificateAdminPage.tsx:462` — قاموس مشترك AR/EN موجود؛ لا تزال labels مثل Logo Asset وSigning Key وSigning Key Reference ثابتة، وبعض أنواع الجهات تظهر كقيم enum. |
| CERT-ADM-025 | جزئي | [P2 — اختبارات source لا تبرهن تشغيل KMS/storage/reissue contention/real verification](MANARATAK_ADMIN_REVIEW_CODEX.md) (سطر 11089) | `.github/workflows/certificates-plan-source.yml:1` — CI مصدر موجود يتضمن Prisma generate/validate وtypecheck/vitest؛ لا job PostgreSQL معزول/سباق عاملين/تدوير موفر حقيقي في هذا workflow، ولا دليل تشغيل حديث للكوميت الحالي. |
| CERT-ADM-026 | منفذ وغير متحقق تشغيليًا | [P1 — علامة `requiresRevalidation` الموقعة لا تدخل في قرار صلاحية الشهادة](MANARATAK_ADMIN_REVIEW_CODEX.md) (سطر 11113) | `packages/application/src/certificates/use-cases/CertificateUseCases.ts:316` — requiresRevalidation لا يعتبر موافقة: يلزم approvedBy وvalidUntil صالح مستقبلي؛ approval workflow مرتبط بالإثبات. |
| CERT-ADM-027 | منفذ وغير متحقق تشغيليًا | [P1 — حالة `EXPIRED` المحسوبة تخفي REVOKED/REISSUED من التحقق العام](MANARATAK_ADMIN_REVIEW_CODEX.md) (سطر 11119) | `packages/application/src/certificates/use-cases/CertificateUseCases.ts:302` — lifecycleStatus منفصل عن temporalStatus؛ EXPIRED مشتق من ACTIVE فقط فلا يطمس REVOKED/REISSUED. |
| CERT-ADM-028 | منفذ وغير متحقق تشغيليًا | [P1 — اختيار القالب الافتراضي للاعتماد بالاسم فقط يمكن أن يصبح غير حتمي](MANARATAK_ADMIN_REVIEW_CODEX.md) (سطر 11125) | `packages/infrastructure/src/certificates/PrismaCertificateRepository.ts:209` — اختيار القالب الافتراضي canonical بدل الاسم المعروض مع جهة نشطة وربط نسخة. |
| CERT-ADM-029 | جزئي | [P1 — Health/readiness يعرض EAP renderer غير جاهز دائمًا حتى مع تهيئة العامل](MANARATAK_ADMIN_REVIEW_CODEX.md) (سطر 11131) | `apps/api/src/infrastructure/di/container.ts:988` — حالة readiness صادقة، لكن probe الافتراضي لا يستطيع إعادة READY: العامل السليم يعيد RUNTIME_PENDING دائمًا؛ ينقص probe تخزين/تسليم فعلي قابل للتوصيل. |
| CERT-ADM-030 | جزئي | [P1 — تحرير واعتماد template لا يستخدم expected-version precondition لحماية المراجع](MANARATAK_ADMIN_REVIEW_CODEX.md) (سطر 11137) | `packages/infrastructure/src/certificates/PrismaCertificateRepository.ts:129` — If-Match/version/status وقفل ومراجع مستقل موجودة؛ UI لا تعرض مقارنة diff بين النسخة السابقة والنسخة قيد الاعتماد. |
| CERT-ADM-031 | منفذ وغير متحقق تشغيليًا | [P1 — تحقق HMAC يجب أن يستخدم مقارنة زمنية ثابتة ومرجع مفتاح تاريخيًا موثوقًا](MANARATAK_ADMIN_REVIEW_CODEX.md) (سطر 11143) | `packages/application/src/certificates/services/CertificateTrustPolicy.ts:60` — hex/length validation وtimingSafeEqual ومفاتيح تاريخية محلية، أو delegate إلى signer؛ تدوير الموفر الخارجي مؤجل. |
| CERT-ADM-032 | منفذ وغير متحقق تشغيليًا | [P2 — قوائم شهادات الطالب والـledger غير محددة الحجم والـgrant يفحص القائمة كاملة](MANARATAK_ADMIN_REVIEW_CODEX.md) (سطر 11149) | `packages/infrastructure/src/certificates/PrismaCertificateRepository.ts:515` — student/ledger bounded cursor؛ deliveryArtifact يستخدم findForStudent بالشهادة والمالك بدل تنزيل قائمة الطالب كلها. |
| CERT-ADM-033 | جزئي | [P2 — الـPDF/Preview لا يعرضان أصول الشعار والختم والتوقيع المُعدّة في نسخة القالب](MANARATAK_ADMIN_REVIEW_CODEX.md) (سطر 11155) | `packages/infrastructure/src/certificates/EapCertificateVisualAssetResolver.ts:10` — materialization فعلي للأصول المجمدة مع checksum وMIME وحد 2MiB؛ لا فحص صريح لأبعاد/عدد بكسلات الصورة قبل decode، ولا دليل مطابقة PDF/preview بصريًا. |
| FGA-14-001 | منفذ وغير متحقق تشغيليًا | [P1 — تعديل جهة الإصدار القائمة وإدارة حالة اعتمادها من الشاشة](MANARATAK_ADMIN_REVIEW_CODEX.md) (سطر 11177) | `apps/admin/src/pages/CertificateAdminPage.tsx:463` — editor وPATCH وIf-Match وصلاحيات الحفظ/التعليق والمراجعة موجودة؛ الحقول الحرجة تحظر عند ACTIVE. لا نساوي وجود الزر باختبار المتصفح. |
| FGA-14-002 | منفذ وغير متحقق تشغيليًا | [P2 — فلاتر البحث في سجل الشهادات حسب الجهة والمستفيد والقالب والنطاق الزمني](MANARATAK_ADMIN_REVIEW_CODEX.md) (سطر 11188) | `apps/admin/src/pages/CertificateAdminPage.tsx:228` — فلاتر جهة/مستفيد/نسخة/تاريخ محفوظة في URL ومتجهة إلى owner API وcount على جميع الصفحات؛ لم يُفحص execution plan/index performance فعليًا. |

## التحقق التشغيلي المتبقي — مؤجل بطلب المستخدم

- disposable PostgreSQL: سباق إعادة الإصدار/activation، durable replay والـoutbox، expiry sweep، pagination/index plans، توافق schema والترحيلات.
- mock/sandbox signer غير إنتاجي: إصدار وتدوير مفاتيح وتحقق تاريخي وفشل التفويض، دون موفر حي أو أسرار حقيقية.
- تخزين معزول: ACL/ownership، grants، الرفع الجزئي والاستئناف والتنظيف، خصوصية PDF/preview والأصول القديمة بعد خطة احتواء منفصلة.
- rendering: QR/PDF bytes والثنائية اللغوية والأسماء الطويلة/الصور، حدود الموارد وتطابق preview/PDF.
- متصفح معزول: RBAC deny، maker-checker، conflicts/refresh واللغة، التصحيح وإعادة التحقق والفلاتر عبر الصفحات.

هذه البنود **لم تنجح ولم تفشل باختبار في هذه الجولة: لم تُشغّل**. بعضُها متعذر الإغلاق قبل سد فجوات المصدر المذكورة أعلاه. لا يستلزم هذا التقرير تشغيل Google Studio؛ التحقق التشغيلي يحتاج بيئة تطوير/اختبار معزولة مجهزة عند طلبك.

## سجل أوامر المراجعة ونتائجها

- `git fetch origin` — جلب المراجع قبل إنشاء فرع التقرير؛ آخر main المراجع موضح أعلاه.
- `git status --short --branch` و`git rev-parse HEAD` — شجرة التطبيق نظيفة وبصمة المصدر مثبتة قبل كتابة التقرير.
- `sed -n '<range>p' docs/reviews/MANARATAK_ADMIN_REVIEW_CODEX.md` — استخراج القسم 14 ومتطلباته وملحقه من الخطة نفسها.
- `rg --files` و`rg -n '<symbol>' <source paths>` و`sed -n '<range>p' <source path>` — قراءة owner/API/repository/DI/renderer/UI/workflow. بعض عمليات البحث الأولية استخدمت مسارات مختصرة غير موجودة وأرجعت exit 2؛ جرى تحديد المسارات الفعلية وقراءة الملفات، وليس ذلك اختبار تطبيق فاشل.
- **أوامر الاختبارات: لا توجد. عدد الاختبارات المشغلة: 0.** لم أُعد نتائج سابقة ولم أنسبها إلى هذا SHA.

التقرير يحدد العمل ولا ينفذه؛ لا توجد إصلاحات تطبيق جديدة في فرع هذه المراجعة، ولا merge في main. إغلاق البنود يحتاج إصلاح الفجوات أولًا ثم أدلة التحقق التي تختار السماح بها لاحقًا.
