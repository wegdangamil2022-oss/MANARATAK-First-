# سجل التحقق المستقل لجميع بنود التقرير

تاريخ التحقق: 2026-10-15 — خط الأساس: `5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb` على main.

> هذا **snapshot تاريخي للمراجعة**؛ B01 وB02 نُفذتا بعده، كما دخلت تحديثات أخرى إلى main. لا تعِد إصلاح بند اعتمادًا على هذا السجل وحده. راجع [الخطة المعتمدة](../remediation/ARCHITECTURAL_SECURITY_APPROVED_PLAN_2026-10-15.md) و[سجل التنفيذ الجاري](../remediation/ARCHITECTURAL_SECURITY_EXECUTION_STATUS_2026-10-15.json) والكود في فرع العمل. روابط الأدلة أدناه مثبتة عمدًا على commit المراجعة.

هذا السجل يحكم على الادعاءات في النسخة الحالية؛ ليس تقييمًا للنموذج الذي كتب التقرير. الحكم «مؤكد» يثبت جوهر الملاحظة، ولا يصدق تلقائيًا تصنيف الخطورة أو كل أثر ادعاه التقرير. الأولوية الحالية تربط الأثر المثبت وقرب التعرض، وليست درجة CVSS.

## توزيع الأحكام

| الحكم | العدد |
|---|---:|
| مؤكد | 25 |
| صحيح جزئيًا | 19 |
| غير صحيح حاليًا | 4 |
| مُعالج سابقًا | 1 |

## مصفوفة التنفيذ

| المعرف | البند | الحكم | الأولوية | الحزمة |
|---|---|---|---|---|
| ARCH-01 | تغطية سجل ملكية النماذج | مؤكد | P1 | B04 |
| ARCH-02 | مراجع الأصول ومنع الحذف | صحيح جزئيًا | P1 | B04 |
| ARCH-03 | قراءة المنح مباشرة من مالك البرامج الجامعية | مؤكد | P1 | B05 |
| ARCH-04 | استيراد Application إلى الإدارة | مؤكد | P2 | B04 |
| ARCH-05 | اقتران AuthRouter بالبنية التحتية | مؤكد | P1 | B02 |
| ARCH-06 | بيانات حوكمة ملفات الترحيل | مؤكد | P2 | B04 |
| ARCH-07 | ازدواج تشغيل العمال | صحيح جزئيًا | P1 | B09 |
| ARCH-08 | تقادم حالات الخارطة | صحيح جزئيًا | P2 | B14 |
| FK-01 | عملة مبلغ المنحة القديمة | صحيح جزئيًا | P2 | B05 |
| FK-02 | رموز العملة واللغة الافتراضية للدولة | صحيح جزئيًا | P3 | B05 |
| FK-03 | علاقات حوكمة الاختبارات والتخصصات | صحيح جزئيًا | P2 | B05 |
| FK-04 | دولة مقدم الخدمة | صحيح جزئيًا | P2 | B05 |
| REL-01 | حقول المنحة والدرجات غير المحلولة | مؤكد | P1 | B06 |
| REL-02 | فلاتر المنح المعيارية والنصية | صحيح جزئيًا | P2 | B06 |
| REL-03 | إبطال مرجع لغة المنحة | غير صحيح حاليًا | تحقق | B04 |
| REL-04 | صفحات CanonicalPicker | صحيح جزئيًا | P2 | B06 |
| REL-05 | عقد رسالة عدم تطابق برنامج الجامعة | مؤكد | P2 | B06 |
| A2A-01 | طابور مراجعة الوظائف | غير صحيح حاليًا | تحقق | B07 |
| A2A-02 | رابط مساحة البيانات المرجعية | مؤكد | P2 | B07 |
| A2A-03 | روابط الجامعات إلى الاستيراد والوجهات | مؤكد | P2 | B07 |
| A2A-04 | روابط قائمة المنح | مؤكد | P2 | B07 |
| A2A-05 | تغطية الوجهات والانتقال لتفاصيل الجامعة | مؤكد | P2 | B07 |
| A2A-06 | تغطية الترجمة والأوصاف | مؤكد | P2 | B11 |
| A2A-07 | روابط مالكي الأصول وسجلات التدقيق | صحيح جزئيًا | P2 | B07 |
| A2A-08 | اختيار شعار جهة التوظيف | مؤكد | P2 | B07 |
| ADM-01 | إدارة الزمالات | مؤكد | P3 | B10a |
| ADM-02 | الحرم والوحدات التنظيمية | صحيح جزئيًا | P2 | B10b |
| ADM-03 | الإنشاء اليدوي | مؤكد | P3 | B10c |
| ADM-04 | الوصول للبيانات المرجعية من القائمة | مؤكد | P2 | B07 |
| ADM-05 | تحرير بنية الدورات ومسارات التعلم | مؤكد | P2 | B10d |
| ADM-06 | الإرشاد والخريجون | صحيح جزئيًا | P3 | B12 |
| ADM-07 | واجهات العمليات المالية المتقدمة | مؤكد | P2 | B13 |
| ADM-08 | ادعاء الملفات الميتة | صحيح جزئيًا | P3 | B14 |
| SYNC-01 | غرفة تعلم تجريبية في مسار الدورة العامة | مؤكد | P1 | B03 |
| SYNC-02 | حدود اللقطة العامة وصفحات الاكتشاف | صحيح جزئيًا | P2 | B08 |
| SYNC-03 | بطاقات منح رئيسية ثابتة | مؤكد | P1 | B03 ثم B08 |
| SYNC-04 | وجهات الدراسة المميزة | مُعالج سابقًا | محمي | تحقق فقط |
| SYNC-05 | أعداد درجات التخصصات الثابتة | مؤكد | P1 | B03 ثم B08 |
| SYNC-06 | التقارير الأكاديمية التجريبية في الوضع الحي | غير صحيح حاليًا | تحقق | تحقق فقط |
| SYNC-07 | بيانات الزمالة التجريبية | صحيح جزئيًا | P3 | B10a ثم B08 |
| SYNC-08 | تمرير اللغة وتحديث الوظائف | مؤكد | P2 | B08 |
| SYNC-09 | اختبارات وأدوات وFAQ والبحث | صحيح جزئيًا | P2 | B08 |
| SEC-01 | حماية البحث الداخلي وسجله | مؤكد | P0 | B01 |
| SEC-02 | نقطة تشخيص طلبات عامة | صحيح جزئيًا | P1 | B01 |
| SEC-03 | فجوات سياسة CSRF | مؤكد | P1 | B02 |
| SEC-04 | قبول سر CSRF التطويري | مؤكد | P1 | B02 |
| SEC-05 | معدلات المصادقة والتعداد | صحيح جزئيًا | P1 | B02 |
| SEC-06 | fallback محلي لرموز الاستعادة | صحيح جزئيًا | P1 | B02 |
| SEC-07 | Markdown وروابط javascript/data | غير صحيح حاليًا | تحقق | لا إصلاح |

## ARCH-01 — تغطية سجل ملكية النماذج

**الحكم: مؤكد — الأولوية: P1 — التنفيذ: B04**

الفجوة حقيقية وأكبر من التقرير: 278 نموذجًا مقابل 267؛ المفقود 11، لا 9. أضيفت نماذج ترجمة ووثائق طالب بعد خط الأساس الأصلي.

الإجراء المعتمد: تسجيل كل نموذج لدى مالكه القائم؛ لا نسخ أسماء السياقات المقترحة آليًا. StudentApplicationDocumentBinding وStudentSupportOwnerReadObservation يتبعان student، وتثبت ملكية receipt من منفذ نقل الترجمة وADR.

الدليل في خط الأساس:

- [docs/architecture/persistence/persistence-ownership.manifest.json:240](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/docs/architecture/persistence/persistence-ownership.manifest.json#L240) — `"StudentApplicationTracker": "student",`
- [packages/infrastructure/prisma/schema.prisma:6051](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/packages/infrastructure/prisma/schema.prisma#L6051) — `model StudentApplicationDocumentBinding {`

## ARCH-02 — مراجع الأصول ومنع الحذف

**الحكم: صحيح جزئيًا — الأولوية: P1 — التنفيذ: B04**

نقص سجل المراجع صحيح: الآن 4 حقول. لكن الحقول الثلاثة المذكورة بالتقرير موجودة فعلًا في سجل الاستخدام وقت التشغيل؛ ادعاء غيابها عن purge غير صحيح. الحقل الرابع الجديد يحتاج تغطية فعلية.

الإجراء المعتمد: إكمال manifest ومراجعة StudentApplicationDocumentBinding.assetId في usage/readiness/retention؛ اختبار منع الحذف قبل تمكينه، دون تكرار التسجيلات الموجودة.

الدليل في خط الأساس:

- [packages/infrastructure/src/asset-platform/PrismaAssetUsageRegistryGateway.ts:11](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/packages/infrastructure/src/asset-platform/PrismaAssetUsageRegistryGateway.ts#L11) — `{ delegate: 'assetRenditionRecord', field: 'assetId', consumer: 'ASSET_RENDITION_SOURCE' },`
- [packages/infrastructure/src/asset-platform/PrismaAssetUsageRegistryGateway.ts:15](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/packages/infrastructure/src/asset-platform/PrismaAssetUsageRegistryGateway.ts#L15) — `{ delegate: 'certificateAuthorityDelegation', field: 'evidenceAssetId', consumer: 'CERTIFICATE_AUTHORITY_EVIDENCE' },`
- [packages/infrastructure/prisma/schema.prisma:6051](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/packages/infrastructure/prisma/schema.prisma#L6051) — `model StudentApplicationDocumentBinding {`

## ARCH-03 — قراءة المنح مباشرة من مالك البرامج الجامعية

**الحكم: مؤكد — الأولوية: P1 — التنفيذ: B05**

يوجد موضعان لاستعلام ORM عابر للمالك دون اعتماد؛ هذا خرق حدود مؤكد، وليس إثبات تسرب معلومات منشورة.

الإجراء المعتمد: منفذ قراءة typed يملكه universities أو استثناء قراءة محدود ومبرر بـADR؛ الحفاظ على شروط النشر وعدم إضافة إذن شامل لإسكات الفاحص.

الدليل في خط الأساس:

- [packages/infrastructure/src/scholarships/PrismaScholarshipRepository.ts:81](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/packages/infrastructure/src/scholarships/PrismaScholarshipRepository.ts#L81) — `const rows = await this.prisma.universityAcademicProgram.findMany({`

## ARCH-04 — استيراد Application إلى الإدارة

**الحكم: مؤكد — الأولوية: P2 — التنفيذ: B04**

الاستيراد المباشر موجود ويخالف حارس المصدر.

الإجراء المعتمد: نقل DTO نقل مناسب إلى عقد مسموح؛ لا نقل منطق حالات الاستخدام إلى الواجهة.

الدليل في خط الأساس:

- [apps/admin/src/components/MajorOwnerImportWorkspace.tsx:3](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/admin/src/components/MajorOwnerImportWorkspace.tsx#L3) — `import type {MajorImportReview} from '@manaratak/application';`

## ARCH-05 — اقتران AuthRouter بالبنية التحتية

**الحكم: مؤكد — الأولوية: P1 — التنفيذ: B02**

الراوتر يستورد وينشئ تطبيقات بنية تحتية، مع fallback خارج composition root.

الإجراء المعتمد: الاعتماد على منافذ وUseCases محقونة من DI، وفشل إعداد واضح عند نقص تبعيات الإنتاج.

الدليل في خط الأساس:

- [apps/api/src/presentation/api/router/AuthRouter.ts:6](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/api/src/presentation/api/router/AuthRouter.ts#L6) — `import { CapturedEmailDeliveryGateway, InMemoryPasswordResetTokenRepository, PasswordHasher } from '@manaratak/infrastructure';`
- [apps/api/src/presentation/api/router/AuthRouter.ts:54](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/api/src/presentation/api/router/AuthRouter.ts#L54) — `const passwordResetTokenRepo = (cradle as any).passwordResetTokenRepository || (cradle as any).prismaPasswordResetTokenRepository || new InMemoryPasswordResetTokenRepository();`

## ARCH-06 — بيانات حوكمة ملفات الترحيل

**الحكم: مؤكد — الأولوية: P2 — التنفيذ: B04**

الفاحص يجد الآن 10 ملفات بلا بيانات الحوكمة، لا 7. هذا نقص metadata؛ لا يثبت أن ترحيل قاعدة البيانات فشل.

الإجراء المعتمد: حصر حالة التطبيق وchecksum أولًا؛ استعمال metadata تاريخية معتمدة للملفات المنفذة. تعديل الترويسة فقط لملف ثبت أنه غير مطبق.

الدليل في خط الأساس:

- [docs/architecture/persistence/persistence-ownership.manifest.json:435](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/docs/architecture/persistence/persistence-ownership.manifest.json#L435) — `"newMigrationHeader": {`

## ARCH-07 — ازدواج تشغيل العمال

**الحكم: صحيح جزئيًا — الأولوية: P1 — التنفيذ: B09**

توجد نسخة bootstrap واستيراد غير مستعمل مقابل runtime يستعمله server. لا يكفي ذلك لإثبات توقف عمال الإنتاج أو وجود تشغيل على Vercel.

الإجراء المعتمد: اعتماد مسار تشغيل واحد؛ جرد كل job والجدولة والleases؛ تحديد host فعلي دائم أو cron موثوق قبل حذف المسار القديم.

الدليل في خط الأساس:

- [apps/api/src/app.ts:45](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/api/src/app.ts#L45) — `import { startPollingWorkers } from './infrastructure/runtime/PollingWorkerBootstrapper.js';`
- [apps/api/src/server.ts:7](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/api/src/server.ts#L7) — `import { startPollingWorkers, stopPollingWorkers } from './infrastructure/workers/PollingWorkerRuntime.js';`

## ARCH-08 — تقادم حالات الخارطة

**الحكم: صحيح جزئيًا — الأولوية: P2 — التنفيذ: B14**

يوجد كود للمراحل اللاحقة، ووصف الخارطة لا يعكسه جيدًا. وجود الملفات لا يبرر وصف جميع المراحل مكتملة ومفعلة إنتاجيًا.

الإجراء المعتمد: تحديث حالة كل مرحلة إلى مصدر/اختبارات معزولة/تشغيل/إنتاج مع دليل مستقل؛ عدم إعلان Active بالاستدلال من schema.

الدليل في خط الأساس:

- [docs/governance/roadmap/MANARATAK-2.0-Roadmap-v6.0.md:10](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/docs/governance/roadmap/MANARATAK-2.0-Roadmap-v6.0.md#L10) — `- **Last Updated:** 2026-08-25`

## FK-01 — عملة مبلغ المنحة القديمة

**الحكم: صحيح جزئيًا — الأولوية: P2 — التنفيذ: B05**

amountCurrencyCode نص بلا relation كما ذكر التقرير؛ توجد عملة معيارية على ScholarshipBenefit. غياب relation لحقل توافق قديم لا يثبت وحده خطأ ماليًا أو ثغرة.

الإجراء المعتمد: قرار عقد يميز label القديم عن benefit canonical؛ إن لزم التغيير فـexpand ثم backfill غير ملتبس ثم التحويل، مع إبقاء المصدر وعدم اختراع عملة.

الدليل في خط الأساس:

- [packages/infrastructure/prisma/schema.prisma:1694](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/packages/infrastructure/prisma/schema.prisma#L1694) — `amountCurrencyCode   String?`
- [packages/infrastructure/prisma/schema.prisma:1742](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/packages/infrastructure/prisma/schema.prisma#L1742) — `model ScholarshipBenefit {`

## FK-02 — رموز العملة واللغة الافتراضية للدولة

**الحكم: صحيح جزئيًا — الأولوية: P3 — التنفيذ: B05**

لا توجد relation في Prisma، لكن الرموز روابط معيارية يتحقق UseCase من وجودها ونشاطها، والمستودع يقفل المراجع في المعاملة؛ وصفها نصوصًا حرة غير مضبوط مضلل.

الإجراء المعتمد: قرار تقوية SQL مقابل ISO الفريد بعد حصر البيانات ودورة الحياة؛ لا استبدال تلقائي للرموز بمعرفات أو تغيير واجهات الدولة.

الدليل في خط الأساس:

- [packages/application/src/reference-data/use-cases/ReferenceDataUseCases.ts:209](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/packages/application/src/reference-data/use-cases/ReferenceDataUseCases.ts#L209) — `// Code fields are authoritative links, never free-form labels.`
- [packages/infrastructure/src/reference-data/PrismaReferenceDataRepository.ts:376](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/packages/infrastructure/src/reference-data/PrismaReferenceDataRepository.ts#L376) — `WHERE "isoCode" = ${data.defaultCurrencyCode} FOR SHARE`

## FK-03 — علاقات حوكمة الاختبارات والتخصصات

**الحكم: صحيح جزئيًا — الأولوية: P2 — التنفيذ: B05**

غياب @relation عن تمثيل Prisma صحيح؛ قيود FOREIGN KEY موجودة فعلًا في ترحيلي حوكمة الاختبارات والتخصصات، مع triggers لسجلات غير قابلة للتعديل. لا نعرف حالة تطبيقها على الإنتاج.

الإجراء المعتمد: مطابقة Prisma وSQL وقاعدة معزولة؛ لا إضافة قيود مكررة ولا cascades تمس snapshots، ولا اعتبار غياب @relation مساويًا لغياب FK فعلي.

الدليل في خط الأساس:

- [packages/infrastructure/prisma/migrations/20261010100000_tests_publication_governance/migration.sql:6](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/packages/infrastructure/prisma/migrations/20261010100000_tests_publication_governance/migration.sql#L6) — `"testId" TEXT PRIMARY KEY REFERENCES "InternationalTest"("id") ON DELETE RESTRICT,`
- [packages/infrastructure/prisma/migrations/20261010120000_major_review_governance/migration.sql:9](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/packages/infrastructure/prisma/migrations/20261010120000_major_review_governance/migration.sql#L9) — `"majorId" TEXT REFERENCES "Major"("id") ON DELETE RESTRICT, "evidence" JSONB NOT NULL,`

## FK-04 — دولة مقدم الخدمة

**الحكم: صحيح جزئيًا — الأولوية: P2 — التنفيذ: B05**

الحقل بلا relation/FK في المخطط المتحقق منه؛ توجد حماية تطبيقية بحل الدولة عبر منفذ المراجع. مخاطرة integrity متبقية لا تعني قبول أي بلد اعتباطي عبر API.

الإجراء المعتمد: حصر الأيتام ثم قرار FK إضافي وسياسة دورة الحياة؛ إبقاء تحقق المالك ونقطة التطبيع.

الدليل في خط الأساس:

- [packages/infrastructure/prisma/schema.prisma:5161](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/packages/infrastructure/prisma/schema.prisma#L5161) — `model ServiceProviderRecord {`
- [packages/application/src/services-platform/use-cases/ServiceOperationsUseCases.ts:250](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/packages/application/src/services-platform/use-cases/ServiceOperationsUseCases.ts#L250) — `? (await this.references.resolveCountryReference(input.countryReferenceId)).id`

## REL-01 — حقول المنحة والدرجات غير المحلولة

**الحكم: مؤكد — الأولوية: P1 — التنفيذ: B06**

النصوص والقوائم المقترحة ومسار حفظ مجموعات الدرجات قد ينتج علاقات UNRESOLVED؛ الخادم يمنع النشر غير المكتمل، لذلك هو تعطيل تحرير وجودة بيانات، لا تجاوز نشر مثبت.

الإجراء المعتمد: واجهة معيارية موحدة فوق عقد المالك بعد B05؛ حفظ المعرفات دون فقدها عند تعديل حقل آخر؛ فصل source labels عن canonical IDs؛ تبقى المسودة غير المحلولة مسموحة.

الدليل في خط الأساس:

- [apps/admin/src/pages/ScholarshipCatalogDetailPage.tsx:75](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/admin/src/pages/ScholarshipCatalogDetailPage.tsx#L75) — `const PRESET_DEGREE_OPTIONS = [`
- [apps/admin/src/pages/ScholarshipCatalogDetailPage.tsx:334](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/admin/src/pages/ScholarshipCatalogDetailPage.tsx#L334) — `const syncDegreeGroupsToForm = (groups: DegreeWithMajors[]) => {`
- [packages/application/src/scholarships/use-cases/AdminScholarshipUseCases.ts:410](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/packages/application/src/scholarships/use-cases/AdminScholarshipUseCases.ts#L410) — `if (this.unresolvedLinks(existing).length > 0) throw new Error('SCHOLARSHIP_CANONICAL_LINKS_UNRESOLVED');`

## REL-02 — فلاتر المنح المعيارية والنصية

**الحكم: صحيح جزئيًا — الأولوية: P2 — التنفيذ: B06**

الفلاتر النصية الثابتة موجودة، لكن ScholarshipCanonicalFilters مستورد ومستخدم بالفعل؛ اقتراح إضافته من الصفر قد يكرر الواجهة.

الإجراء المعتمد: إتمام التحويل وإزالة ازدواج الدلالات بتوافق API؛ لا حذف البحث النصي العادي المخصص للعنوان؛ علاقات الدولة/الدرجة ترشح بالمعرف.

الدليل في خط الأساس:

- [apps/admin/src/pages/ScholarshipListPage.tsx:263](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/admin/src/pages/ScholarshipListPage.tsx#L263) — `<ScholarshipCanonicalFilters`
- [packages/infrastructure/src/scholarships/PrismaScholarshipRepository.ts:185](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/packages/infrastructure/src/scholarships/PrismaScholarshipRepository.ts#L185) — `countrySourceLabel: data.countrySourceLabel,`

## REL-03 — إبطال مرجع لغة المنحة

**الحكم: غير صحيح حاليًا — الأولوية: تحقق — التنفيذ: B04**

التنفيذ موجود ويعمل: تغير English إلى French يمسح ID ويعيد UNRESOLVED؛ النص المكافئ يحفظهما. الفاحص يفشل لأنه يبحث عن نص لا يقبل الأقواس و?? null في التنفيذ الحالي.

الإجراء المعتمد: عدم إعادة تنفيذ المنطق؛ تحديث الحارس إلى تحقق سلوكي/تحليل مصدر لا يتأثر بالتنسيق، مع إبقاء اختبارات التغير والثبات والتعديل غير المرتبط.

الدليل في خط الأساس:

- [packages/application/src/scholarships/use-cases/AdminScholarshipUseCases.ts:536](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/packages/application/src/scholarships/use-cases/AdminScholarshipUseCases.ts#L536) — `result.studyLanguageReferenceId = equivalent ? (existing.studyLanguageReferenceId ?? null)`
- [scripts/verify-wp12-9-scholarship-catalog-detail-source.mjs:71](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/scripts/verify-wp12-9-scholarship-catalog-detail-source.mjs#L71) — `assert(useCases.includes("result.studyLanguageReferenceId = equivalent ? existing.studyLanguageReferenceId"), 'Study Language semantic invalidation missing');`

## REL-04 — صفحات CanonicalPicker

**الحكم: صحيح جزئيًا — الأولوية: P2 — التنفيذ: B06**

غياب paged في استدعاءات صحيح؛ الحقل يدعم البحث بالفعل، لذلك ليست كل العناصر بعد أول 50 مستحيلة الاختيار. بعض loaders المغلفة قد تتجاهل query/page.

الإجراء المعتمد: تدقيق المكون وكل loader ثم تمرير query/page والتحقق من التالي ونتيجة البحث والاختيار الموجود خارج الصفحة وحالات المراجع غير النشطة.

الدليل في خط الأساس:

- [apps/admin/src/components/CanonicalPicker.tsx:6](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/admin/src/components/CanonicalPicker.tsx#L6) — `export function CanonicalPicker({ label, value, onChange, load, reloadKey = 'default', optional = false, disabled = false, paged = false }: {`
- [apps/admin/src/api/canonicalPickers.ts:51](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/admin/src/api/canonicalPickers.ts#L51) — `async countries(query = '', page = 1): Promise<CanonicalPickerOption[]> {`

## REL-05 — عقد رسالة عدم تطابق برنامج الجامعة

**الحكم: مؤكد — الأولوية: P2 — التنفيذ: B06**

اختبار قائم يفشل: المتوقع MISMATCH:mismatch والمستلم MISMATCH. الرفض الأمني للعلاقة ما زال يعمل؛ العطل في تفصيل رمز الخطأ فقط.

الإجراء المعتمد: ترجمة خطأ المالك إلى عقد الخطأ مع linkKey في حد المنحة؛ لا إزالة الرفض أو إضعاف المقارنة.

الدليل في خط الأساس:

- [packages/application/tests/scholarships/ScholarshipCanonicalAuthoringUseCases.spec.ts:133](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/packages/application/tests/scholarships/ScholarshipCanonicalAuthoringUseCases.spec.ts#L133) — `}, mutationContext)).rejects.toThrow('SCHOLARSHIP_ACADEMIC_PROGRAM_UNIVERSITY_MISMATCH:mismatch');`
- [packages/application/src/scholarships/use-cases/AdminScholarshipUseCases.ts:290](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/packages/application/src/scholarships/use-cases/AdminScholarshipUseCases.ts#L290) — `const impliedUniversityId = assertUniversityProgramParent(`

## A2A-01 — طابور مراجعة الوظائف

**الحكم: غير صحيح حاليًا — الأولوية: تحقق — التنفيذ: B07**

استنتاج التقرير من مصفوفة owners وحدها خطأ: بعد المصفوفة تضاف وظيفيًا حالتا careers عبر reviewSources.push ومسار /admin/careers/review-page. اختبار تحميل المصدر أكد الحالتين.

الإجراء المعتمد: لا إضافة tuple مكرر؛ الحفاظ على المصدر الحالي واختبار الانتقال والفلاتر والصلاحيات الفعلية.

الدليل في خط الأساس:

- [apps/admin/src/features/review-queue/ReviewSources.ts:124](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/admin/src/features/review-queue/ReviewSources.ts#L124) — `key: careers:${status},`
- [apps/api/src/presentation/api/router/CareerAdminRouter.ts:42](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/api/src/presentation/api/router/CareerAdminRouter.ts#L42) — `router.get('/review-page', careerHandler(async(req,res) => {`

## A2A-02 — رابط مساحة البيانات المرجعية

**الحكم: مؤكد — الأولوية: P2 — التنفيذ: B07**

workspace يساوي /reference-data بينما شاشة الإدارة تحت /settings/reference-data.

الإجراء المعتمد: استخدام عقد routes موحد مع basename، واختبار الوصول للصفحة ذات الإذن.

الدليل في خط الأساس:

- [apps/admin/src/pages/ImportAdminPage.tsx:257](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/admin/src/pages/ImportAdminPage.tsx#L257) — `{ key: 'REFERENCE_DATA', ar: 'البيانات المرجعية', en: 'Reference Data', workspace: '/reference-data', importPath: '/imports/reference-data', icon: Sparkles, template: 'iso2Code,iso3Code,name,nameAr' },`
- [apps/admin/src/App.tsx:334](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/admin/src/App.tsx#L334) — `<Route path="/settings/reference-data" element={<RequireAdminPermission permission="admin:reference-data:manage"><ReferenceDataAdminPage /></RequireAdminPermission>} />`

## A2A-03 — روابط الجامعات إلى الاستيراد والوجهات

**الحكم: مؤكد — الأولوية: P2 — التنفيذ: B07**

روابط /admin/imports و/admin/destinations غير متوافقة مع مسارات Router وbasename الحالي.

الإجراء المعتمد: روابط داخل التطبيق /imports/universities و/study-destinations مع state/IDs صحيحة.

الدليل في خط الأساس:

- [apps/admin/src/pages/UniversityAdminPage.tsx:222](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/admin/src/pages/UniversityAdminPage.tsx#L222) — `onClick={() => navigate('/admin/imports?dataType=UNIVERSITIES')}`
- [apps/admin/src/pages/UniversityAdminPage.tsx:230](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/admin/src/pages/UniversityAdminPage.tsx#L230) — `to="/admin/destinations"`

## A2A-04 — روابط قائمة المنح

**الحكم: مؤكد — الأولوية: P2 — التنفيذ: B07**

تكرار /admin على الاستيراد والطابور موجود؛ alias تفاصيل المنحة لا يصلح هذين الرابطين.

الإجراء المعتمد: توحيد رابط /imports/scholarships و/review-queue في جميع المواضع، لا تغيير API prefixes المشابهة.

الدليل في خط الأساس:

- [apps/admin/src/pages/ScholarshipListPage.tsx:318](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/admin/src/pages/ScholarshipListPage.tsx#L318) — `to="/admin/review-queue"`
- [apps/admin/src/pages/ScholarshipListPage.tsx:310](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/admin/src/pages/ScholarshipListPage.tsx#L310) — `onClick={() => navigate('/admin/imports?dataType=SCHOLARSHIPS')}`

## A2A-05 — تغطية الوجهات والانتقال لتفاصيل الجامعة

**الحكم: مؤكد — الأولوية: P2 — التنفيذ: B07**

StudyDestination غير مدرج في طابور المراجعة، والجامعات مضبوطة detail:false. ليس كل owner يستعمل نفس status أو نفس نوع المعرف.

الإجراء المعتمد: مصدر مستقل للوجهة وفق دورة حياتها الحالية، وتمكين تفاصيل الجامعة مع الصلاحية؛ country ISO ليس profile UUID.

الدليل في خط الأساس:

- [apps/admin/src/features/review-queue/ReviewSources.ts:81](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/admin/src/features/review-queue/ReviewSources.ts#L81) — `detail: !['universities', 'services', 'cms'].includes(domain),`
- [apps/admin/src/features/review-queue/ReviewSources.ts:141](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/admin/src/features/review-queue/ReviewSources.ts#L141) — `'study-countries',`

## A2A-06 — تغطية الترجمة والأوصاف

**الحكم: مؤكد — الأولوية: P2 — التنفيذ: B11**

خمسة نطاقات فقط، مع تعطيل الأوصاف لأربعة منها. هذا نقص تغطية لا يصلح بتغيير boolean قبل دعم المالك والنشر.

الإجراء المعتمد: عقد capabilities لكل مالك، snapshot وحالة اعتماد لكل لغة، وربط receipt الحالي؛ ثم تمكين حقول ودومينات مدعومة دون مخزن محتوى مواز.

الدليل في خط الأساس:

- [apps/admin/src/pages/AdminTranslationWorkspacePage.tsx:151](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/admin/src/pages/AdminTranslationWorkspacePage.tsx#L151) — `const domainConfigs: DomainConfig[] = [`
- [apps/admin/src/pages/AdminTranslationWorkspacePage.tsx:159](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/admin/src/pages/AdminTranslationWorkspacePage.tsx#L159) — `supportsDescriptions: false,`
- [packages/infrastructure/src/translation-import/PrismaTranslationImportGateway.ts:74](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/packages/infrastructure/src/translation-import/PrismaTranslationImportGateway.ts#L74) — `const previous = await tx.ownerTranslationTransferReceipt.findUnique({`

## A2A-07 — روابط مالكي الأصول وسجلات التدقيق

**الحكم: صحيح جزئيًا — الأولوية: P2 — التنفيذ: B07**

ownerPath محدود فعلًا لدورة وجامعة؛ auditTargetLink يدعم بالفعل عدة نطاقات ووجهات الدراسة، لكن تنقصه نطاقات أخرى. ليس صحيحًا أنه يغفل كل الأهداف المذكورة.

الإجراء المعتمد: مصفوفة type→permission→ID-kind→existing-route؛ ما ليس له صفحة تفاصيل يعرض رابط القائمة/بحث آمن أو سبب عدم الدعم، لا URL مخترع.

الدليل في خط الأساس:

- [apps/admin/src/components/AssetGovernancePanel.tsx:50](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/admin/src/components/AssetGovernancePanel.tsx#L50) — `const ownerPath = asset.ownerType === 'COURSE' ? /courses/${encodeURIComponent(asset.ownerId)}`
- [apps/admin/src/pages/audit/AuditViewModel.ts:60](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/admin/src/pages/audit/AuditViewModel.ts#L60) — `STUDY_DESTINATION: ['admin:study-destinations:read', '/study-destinations/'],`

## A2A-08 — اختيار شعار جهة التوظيف

**الحكم: مؤكد — الأولوية: P2 — التنفيذ: B07**

logoAssetId جزء من formKeys ومدخل يدوي بدل AssetPicker. هذا عيب تجربة استخدام، لا دليل على تجاوز فحص الخادم.

الإجراء المعتمد: AssetPicker بفئة صور وغرض معتمد، مع إبقاء سياسة ملكية الأصول والتحقق من جهة الخادم.

الدليل في خط الأساس:

- [apps/admin/src/pages/CareerAdminPage.tsx:107](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/admin/src/pages/CareerAdminPage.tsx#L107) — `const formKeys = tab === 'employers' ? ['displayName','employerType','industry','websiteUrl','logoAssetId','description'] : ['title','titleEn','description','descriptionEn','jobCategory','applicationDeadline','externalPostingUrl','sourceUrl','recruitmentCycle','requiredSkills','salaryMin','salaryMax','scale'];`

## ADM-01 — إدارة الزمالات

**الحكم: مؤكد — الأولوية: P3 — التنفيذ: B10a**

نماذج الزمالات موجودة دون واجهة إدارة متكاملة ومساراتها؛ هذه ميزة غير مكتملة، لا ثغرة ناتجة عن وجود جدول.

الإجراء المعتمد: تعريف aggregate المالك ودورة الحياة والمراجعة والنشر أولًا، ثم منفذ CRUD مسودات وواجهة وإسقاط منشور، دون store بديل.

الدليل في خط الأساس:

- [packages/infrastructure/prisma/schema.prisma:2248](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/packages/infrastructure/prisma/schema.prisma#L2248) — `model FellowshipDefinition {`
- [apps/api/src/presentation/api/router/MajorAdminRouter.ts:8](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/api/src/presentation/api/router/MajorAdminRouter.ts#L8) — `export class MajorAdminRouter {`

## ADM-02 — الحرم والوحدات التنظيمية

**الحكم: صحيح جزئيًا — الأولوية: P2 — التنفيذ: B10b**

توجد حقول campuses وorganizationUnits في عقد الجامعة وقراءة /organization-units. الناقص إدارة واضحة ومتكاملة، لا انعدام الخلفية تمامًا.

الإجراء المعتمد: إعادة استخدام aggregate الحالي؛ تحرير فرعي بإصدار متوقع، ومنع حذف عنصر مرتبط ببرنامج أو تقاعده بدلًا من cascade.

الدليل في خط الأساس:

- [apps/api/src/presentation/api/router/UniversityAdminRouter.ts:134](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/api/src/presentation/api/router/UniversityAdminRouter.ts#L134) — `campuses: z`
- [apps/api/src/presentation/api/router/UniversityAdminRouter.ts:153](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/api/src/presentation/api/router/UniversityAdminRouter.ts#L153) — `organizationUnits: z`
- [apps/api/src/presentation/api/router/UniversityAdminRouter.ts:260](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/api/src/presentation/api/router/UniversityAdminRouter.ts#L260) — `'/organization-units',`

## ADM-03 — الإنشاء اليدوي

**الحكم: مؤكد — الأولوية: P3 — التنفيذ: B10c**

مسار الاستيراد هو المسار الظاهر لعدة كيانات ولا توجد نماذج إنشاء مباشرة مكافئة؛ الحاجة لكل زر قرار منتج وحوكمة، خصوصًا DegreeLevel المعياري.

الإجراء المعتمد: إنشاء مسودة عبر API المالك القائم مع RBAC والتحقق وdedup وأصل مصدر؛ إنشاء درجة علمية يخضع لسياسة سجل معياري لا CRUD عام.

الدليل في خط الأساس:

- [apps/admin/src/pages/ScholarshipListPage.tsx:310](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/admin/src/pages/ScholarshipListPage.tsx#L310) — `onClick={() => navigate('/admin/imports?dataType=SCHOLARSHIPS')}`
- [apps/admin/src/pages/UniversityAdminPage.tsx:222](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/admin/src/pages/UniversityAdminPage.tsx#L222) — `onClick={() => navigate('/admin/imports?dataType=UNIVERSITIES')}`

## ADM-04 — الوصول للبيانات المرجعية من القائمة

**الحكم: مؤكد — الأولوية: P2 — التنفيذ: B07**

المسار موجود في App ولا يوجد عنصر مطابق في AdminNavigation.

الإجراء المعتمد: إضافة عنصر يحترم نفس صلاحيات المسار؛ اختبار ظهور/إخفاء ودعم اللغة.

الدليل في خط الأساس:

- [apps/admin/src/App.tsx:334](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/admin/src/App.tsx#L334) — `<Route path="/settings/reference-data" element={<RequireAdminPermission permission="admin:reference-data:manage"><ReferenceDataAdminPage /></RequireAdminPermission>} />`
- [apps/admin/src/components/AdminNavigation.tsx:121](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/admin/src/components/AdminNavigation.tsx#L121) — `export function AdminNavigation() {`

## ADM-05 — تحرير بنية الدورات ومسارات التعلم

**الحكم: مؤكد — الأولوية: P2 — التنفيذ: B10d**

الخلفية تملك مسارات إضافية بينما شاشة الدورة لا تقدم واجهات مكافئة للبنوك والمسارات وإعادة الترتيب والحذف.

الإجراء المعتمد: تجزئة البنوك ثم المسارات ثم ترتيب/إزالة المسودات؛ حماية الإصدارات المنشورة وتقدم الطلاب والشهادات؛ لا حذف مباشر لمحتوى مستعمل.

الدليل في خط الأساس:

- [apps/api/src/presentation/api/router/CourseAdminRouter.ts:531](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/api/src/presentation/api/router/CourseAdminRouter.ts#L531) — `router.post('/:id/question-banks', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {`
- [apps/api/src/presentation/api/router/CourseAdminRouter.ts:51](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/api/src/presentation/api/router/CourseAdminRouter.ts#L51) — `const kind=req.route.path.startsWith('/learning-paths')?'LEARNING_PATH':'COURSE';`
- [apps/admin/src/pages/CourseDetailPage.tsx:132](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/admin/src/pages/CourseDetailPage.tsx#L132) — `export function CourseDetailPage() {`

## ADM-06 — الإرشاد والخريجون

**الحكم: صحيح جزئيًا — الأولوية: P3 — التنفيذ: B12**

MentorshipSessionRecord المذكور غير موجود أصلًا في schema الحالي؛ الإرشاد توسعة منتج جديدة. كذلك الخريجون ليس تبويب نص صامت فقط: توجد قراءة /alumni بقيد permission وقائمة سجلات عامة في الصفحة. تقييد الإجراءات قد يكون سياسة موافقة وخصوصية.

الإجراء المعتمد: استكمال الإرشاد وفق دورة حياة الجلسة والخصوصية؛ أي إجراءات خريجين تتبع consent ولا تستنتج ضرورة حق تعديل بياناتهم من وجود الجدول.

الدليل في خط الأساس:

- [apps/admin/src/pages/CareerAdminPage.tsx:122](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/admin/src/pages/CareerAdminPage.tsx#L122) — `<ul className="space-y-2">{!loading && result?.data.map(row=><li key={row.id} className="flex flex-wrap gap-3 rounded border p-3">`
- [apps/api/src/presentation/api/router/CareerAdminRouter.ts:104](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/api/src/presentation/api/router/CareerAdminRouter.ts#L104) — `router.get('/alumni', careerHandler(async(req,res) => {`
- [packages/infrastructure/prisma/schema.prisma:5542](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/packages/infrastructure/prisma/schema.prisma#L5542) — `model CareerAlumniProfileRecord {`

## ADM-07 — واجهات العمليات المالية المتقدمة

**الحكم: مؤكد — الأولوية: P2 — التنفيذ: B13**

توجد فجوة واجهات لعمليات مالية متقدمة متاحة في الراوتر؛ لا يصح اختزالها إلى توصيل أزرار.

الإجراء المعتمد: حزمة مستقلة لكل تثبيت/ائتمان/حجز/حساب/عكس قيد؛ idempotency وصلاحيات وموافقة وتدقيق وقيود append-only؛ لا إعادة احتساب رصيد على العميل.

الدليل في خط الأساس:

- [apps/api/src/presentation/api/router/FinanceAdminRouter.ts:280](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/api/src/presentation/api/router/FinanceAdminRouter.ts#L280) — `'/accounts',`
- [apps/api/src/presentation/api/router/FinanceAdminRouter.ts:344](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/api/src/presentation/api/router/FinanceAdminRouter.ts#L344) — `'/ledger/transactions/:id/reverse',`

## ADM-08 — ادعاء الملفات الميتة

**الحكم: صحيح جزئيًا — الأولوية: P3 — التنفيذ: B14**

ScholarshipDetailPage.tsx القديم بلا مستورد ظاهر؛ لكن AIGovernanceOperations.tsx مستخدم فعلًا من AIGovernancePage عبر مكونين. حذف الملفين كما يقترح التقرير يكسر الإدارة.

الإجراء المعتمد: الاحتفاظ بملف العمليات؛ حذف القديم فقط بعد فحص imports الديناميكية والبناء/التصديرات. لا حذف لمجرد غيابه عن Routes.

الدليل في خط الأساس:

- [apps/admin/src/pages/AIGovernancePage.tsx:37](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/admin/src/pages/AIGovernancePage.tsx#L37) — `import { AIConfigurationOperations, AICostReconciliation } from './AIGovernanceOperations';`
- [apps/admin/src/App.tsx:10](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/admin/src/App.tsx#L10) — `import { ScholarshipDetailPage } from './pages/ScholarshipCatalogDetailPage';`

## SYNC-01 — غرفة تعلم تجريبية في مسار الدورة العامة

**الحكم: مؤكد — الأولوية: P1 — التنفيذ: B03**

فرع onStartStudy يفتح CourseStudyRoomView ذي محتوى ثابت بدل مسار تعلم الدورة الفعلي. لا يثبت ذلك وحده تجاوز الدفع أو كشف محتوى مدفوع من الخادم.

الإجراء المعتمد: توجيه إلى learner route الفعلي بالمعرف canonical عبر عقد التنقل المحلي والمصادقة/enrollment؛ عزل غرفة النموذج خلف prototype؛ منع أي تقدم/شهادة مصطنعة.

الدليل في خط الأساس:

- [apps/web/src/features/public-template/PublicTemplateApp.tsx:1404](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/web/src/features/public-template/PublicTemplateApp.tsx#L1404) — `<CourseStudyRoomView`
- [apps/web/src/features/public-template/components/CourseStudyRoomView.tsx:170](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/web/src/features/public-template/components/CourseStudyRoomView.tsx#L170) — `const COURSE_LECTURES: LectureModule[] = [`

## SYNC-02 — حدود اللقطة العامة وصفحات الاكتشاف

**الحكم: صحيح جزئيًا — الأولوية: P2 — التنفيذ: B08**

اللقطة تحمل أول صفحة فعلًا؛ الاستنتاج أن بقية الكتالوج غير قابلة للوصول غير صحيح عمومًا. الجامعة والتخصص والاختبارات والخدمات والوظائف لها متصفحات بخادم وصفحات/مؤشرات. بعض الفلاتر المحلية للجامعات تظل خاصة بالصفحة الحالية.

الإجراء المعتمد: لا تحميل كل الصفحات عند فتح الموقع؛ تثبيت snapshot محدود للمعاينة، ونقل كل فلتر مطلوب شامل إلى مالكه، واختبار عنصر خارج الصفحة الأولى لكل نطاق.

الدليل في خط الأساس:

- [apps/web/src/features/public-template/components/UniversitiesSearchPage.tsx:49](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/web/src/features/public-template/components/UniversitiesSearchPage.tsx#L49) — `const timer=window.setTimeout(()=>{void ApiClient.getUniversities({search:searchQuery.trim()||undefined,cursor,limit:25}).then(result=>{`
- [apps/web/src/features/public-template/components/ExamsSearchPage.tsx:55](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/web/src/features/public-template/components/ExamsSearchPage.tsx#L55) — `useEffect(()=>{if(dataMode!=='api')return;let active=true;setLoading(true);setError('');const timer=setTimeout(()=>ApiClient.getInternationalTests({locale,page,pageSize:50,searchQuery:searchQuery.trim()||undefined,testCategory:selectedCategory==='الكل'?undefined:selectedCategory}).then(result=>{if(active){setRemote(res`
- [apps/web/src/features/public-template/components/LiveCareerBrowser.tsx:17](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/web/src/features/public-template/components/LiveCareerBrowser.tsx#L17) — `const timer=setTimeout(()=>void ApiClient.getCareerJobs(filters).then(page=>{if(generation!==sequence.current)return;setJobs(page.data);setTotal(page.total);setCursor(page.nextCursor??null);}).catch(()=>{if(generation===sequence.current)setNotice(language==='ar'?'تعذر تحميل الفرص':'Could not load opportunities');}).fin`

## SYNC-03 — بطاقات منح رئيسية ثابتة

**الحكم: مؤكد — الأولوية: P1 — التنفيذ: B03 ثم B08**

FeaturedScholarships يعرض mockCards دائمًا رغم وصول props حية.

الإجراء المعتمد: احتواء البطاقات غير الموثقة أولًا، ثم عرض سجلات منشورة ومعرفات/روابط مالك حقيقية؛ empty/error بلا استبدال وهمي.

الدليل في خط الأساس:

- [apps/web/src/features/public-template/components/FeaturedScholarships.tsx:24](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/web/src/features/public-template/components/FeaturedScholarships.tsx#L24) — `const mockCards = [`

## SYNC-04 — وجهات الدراسة المميزة

**الحكم: مُعالج سابقًا — الأولوية: محمي — التنفيذ: تحقق فقط**

التقرير قديم هنا: المكون يستقبل countries وdataMode ويستخدم published/isFeatured مع عزل prototype. الإصلاح موجود على main.

الإجراء المعتمد: اختبار عدم الرجوع للحالة القديمة؛ لا إعادة تمرير كل countriesForView لأن بعضها قد يكون محملًا للتفاصيل فقط لا قائمة الرئيسية.

الدليل في خط الأساس:

- [apps/web/src/features/public-template/components/FeaturedCountries.tsx:8](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/web/src/features/public-template/components/FeaturedCountries.tsx#L8) — `dataMode?: 'api' | 'prototype';`
- [apps/web/src/features/public-template/components/FeaturedCountries.tsx:49](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/web/src/features/public-template/components/FeaturedCountries.tsx#L49) — `.filter((item) => dataMode === 'prototype' || item.isFeatured)`

## SYNC-05 — أعداد درجات التخصصات الثابتة

**الحكم: مؤكد — الأولوية: P1 — التنفيذ: B03 ثم B08**

الأعداد 840 و1114 وغيرها ثابتة. حساب بديل من snapshot أول 20 سيعطي رقمًا خاطئًا آخر.

الإجراء المعتمد: إخفاء العدد غير الموثق أولًا؛ اعتماد owner count/aggregation مصرح ومنشور أو الاستغناء عن العدد؛ لا اعتبار طول العينة إجماليًا.

الدليل في خط الأساس:

- [apps/web/src/features/public-template/components/FeaturedMajors.tsx:26](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/web/src/features/public-template/components/FeaturedMajors.tsx#L26) — `count: 840,`

## SYNC-06 — التقارير الأكاديمية التجريبية في الوضع الحي

**الحكم: غير صحيح حاليًا — الأولوية: تحقق — التنفيذ: تحقق فقط**

يوجد بالفعل early return عندما dataMode ليس prototype، برسالة عدم توفر خدمة تقارير موثقة؛ PublicTemplate يمرر وضع البيانات. لا تعرض المحاكاة المزعومة في api عبر هذا المسار.

الإجراء المعتمد: إبقاء الفصل؛ خدمة تقارير حقيقية توسعة مستقبلية مستقلة لا علاج تسرب وهمي قائم.

الدليل في خط الأساس:

- [apps/web/src/features/public-template/components/AcademicReportsPage.tsx:331](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/web/src/features/public-template/components/AcademicReportsPage.tsx#L331) — `if (dataMode !== 'prototype') {`
- [apps/web/src/features/public-template/PublicTemplateApp.tsx:1531](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/web/src/features/public-template/PublicTemplateApp.tsx#L1531) — `<AcademicReportsPage locale={language} onBack={goBack} dataMode={publicDataMode} />`

## SYNC-07 — بيانات الزمالة التجريبية

**الحكم: صحيح جزئيًا — الأولوية: P3 — التنفيذ: B10a ثم B08**

البيانات التجريبية موجودة في fallback. لكن MajorDetailModal يعطي الأولوية لـcontentSections، وإسقاط المالك يرسل مصفوفة حتى لو فارغة؛ [] truthy، فيتجاوز fallback في المسار المنشور المعتاد. لم يثبت عرضها حيًا كما يجزم التقرير.

الإجراء المعتمد: إزالة أي احتمال fallback تجريبي من api صراحة؛ ربط عرض الزمالة بعد تعريف عقدها في B10a؛ لا صناعة علاقات زمالات أو أرقام للمقارنة.

الدليل في خط الأساس:

- [apps/web/src/features/public-template/components/MajorDetailModal.tsx:247](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/web/src/features/public-template/components/MajorDetailModal.tsx#L247) — `return major.contentSections ? 'برنامج بكالوريوس' : 'برنامج بكالوريوس طبي';`
- [packages/domain/src/majors/PublicMajorProjection.ts:20](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/packages/domain/src/majors/PublicMajorProjection.ts#L20) — `contentSections:sections.filter(section=>section.locale ? section.reviewStatus==='PUBLISHED' : ['APPROVED','PUBLISHED'].includes(section.reviewStatus ?? '')).map(section=>({sectionKey:section.sectionKey,title:section.title,content:section.content,reviewStatus:section.reviewStatus})),`
- [apps/web/src/features/public-template/components/modal/FellowshipDetailView.tsx:56](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/web/src/features/public-template/components/modal/FellowshipDetailView.tsx#L56) — `const FELLOWSHIP_RELATIONSHIP_DEMOS: Record<string, FellowshipRelationshipDemo> = {`

## SYNC-08 — تمرير اللغة وتحديث الوظائف

**الحكم: مؤكد — الأولوية: P2 — التنفيذ: B08**

التحميل الأول للمنح لا يمرر locale؛ refreshServices يتجاهل locale؛ تحديث اللقطة عند focus لا يتضمن careers. يوجد متصفح وظائف مستقل لذا ذلك ليس دليل تعطل كل التوظيف.

الإجراء المعتمد: تمرير locale بانتظام لكل طلب، وإلغاء النتائج القديمة عند تغير اللغة؛ تحديث careers حيث اللقطة مستعملة أو إزالتها من المسار غير المستعمل؛ اختبارات focus وrace.

الدليل في خط الأساس:

- [apps/web/src/features/public-template/publicLiveDataSource.ts:709](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/web/src/features/public-template/publicLiveDataSource.ts#L709) — `const services = await loadPublishedServices();`
- [apps/web/src/features/public-template/publicLiveDataSource.ts:776](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/web/src/features/public-template/publicLiveDataSource.ts#L776) — `['scholarships', () => collectCursorPages((cursor) => ApiClient.getScholarships({ cursor, limit: 100 })).then((rows) => rows.map((dto) => mapPublicScholarshipDto(dto)))],`
- [apps/web/src/features/public-template/usePublicLiveData.ts:71](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/web/src/features/public-template/usePublicLiveData.ts#L71) — `const refreshTests = async () => {`

## SYNC-09 — اختبارات وأدوات وFAQ والبحث

**الحكم: صحيح جزئيًا — الأولوية: P2 — التنفيذ: B08**

المصفوفات الثابتة موجودة؛ البيانات التشغيلية والبحث المحصور في عينة مشكلة. النص التحريري أو FAQ ثابت معتمد ليس ثغرة تلقائيًا ولا يلزم API لكل نص.

الإجراء المعتمد: ربط الاختبارات والأدوات بما هو منشور وقابل للاستخدام، البحث بـpublic catalog، وقرار محتوى FAQ/CMS معتمد. تثبيت endpoint فعلي من الراوتر/العميل بدل نسخ URL المقترح دون تحقق.

الدليل في خط الأساس:

- [apps/web/src/features/public-template/components/FeaturedExams.tsx:12](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/web/src/features/public-template/components/FeaturedExams.tsx#L12) — `const EXAMS_LIST = [`
- [apps/web/src/features/public-template/components/AIToolsBanner.tsx:9](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/web/src/features/public-template/components/AIToolsBanner.tsx#L9) — `const TOOL_PAIRS = [`
- [apps/web/src/features/public-template/components/SmartSearchPage.tsx:60](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/web/src/features/public-template/components/SmartSearchPage.tsx#L60) — `const knownCountries = ['ألمانيا', 'الصين', 'المملكة المتحدة', 'بريطانيا', 'كندا', 'تركيا', 'السعودية', 'أوروبا'];`

## SEC-01 — حماية البحث الداخلي وسجله

**الحكم: مؤكد — الأولوية: P0 — التنفيذ: B01**

المساران الداخليان غير محميين في التركيب والراوتر؛ اختبار HTTP محلي ببدائل أثبت وصول مجهول إلى use cases. لا يثبت وحده حجم بيانات الإنتاج أو قابلية استغلال غير محدودة؛ توجد ضوابط حجم وrate limit عامة.

الإجراء المعتمد: فصل GET/public عن الداخلي؛ مصادقة وصلاحية خاصة بالسياق وتقييد history بالفاعل/النطاق؛ إبقاء عقد البحث العام منشورًا؛ لا إضافة MutationAudit/Idempotency آليًا إلى GET.

الدليل في خط الأساس:

- [apps/api/src/app.ts:983](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/api/src/app.ts#L983) — `v1Router.use('/search', lazyRouter('searchRouter'));`
- [apps/api/src/presentation/api/router/SearchRouter.ts:127](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/api/src/presentation/api/router/SearchRouter.ts#L127) — `router.post('/', async (req, res, next) => {`
- [apps/api/src/presentation/api/router/SearchRouter.ts:157](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/api/src/presentation/api/router/SearchRouter.ts#L157) — `router.get('/history/:reference', async (req, res, next) => {`

## SEC-02 — نقطة تشخيص طلبات عامة

**الحكم: صحيح جزئيًا — الأولوية: P1 — التنفيذ: B01**

النقطة تكشف آخر طلبات مشتركة وعناوين IP و4 قيم إعداد تشغيلية. لا تكشف جميع env أو كلمات مرور كما قد يفهم من النص.

الإجراء المعتمد: إزالة نقطة التشخيص وسجل global العام؛ رصد منقح مقيد الصلاحية بسياسة احتفاظ، ثم التحقق من غياب payload حتى في الأخطاء.

الدليل في خط الأساس:

- [apps/api/src/app.ts:1043](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/api/src/app.ts#L1043) — `v1Router.get('/diagnostic-rate-limit', (req, res) => {`
- [apps/api/src/presentation/security/SecurityMiddlewareFactory.ts:104](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/api/src/presentation/security/SecurityMiddlewareFactory.ts#L104) — `if (!(globalThis as any).diagnosticsList) {`

## SEC-03 — فجوات سياسة CSRF

**الحكم: مؤكد — الأولوية: P1 — التنفيذ: B02**

الاستثناء وsubstring وaccess-only مثبتة باختبارات guard مع اختبار رفض عادي ضابط. الاستغلال المتصفحي الكامل لم يفحص؛ SameSite strict وCORS ضوابط موازية وليست إصلاحًا للسياسة. كما أن exemptBearerAuth:false متجاهل.

الإجراء المعتمد: مطابقة مسار كاملة واعية بالmount، ومعالجة credential type الفعلي؛ ربط إصلاح refresh مع عملاء web/admin وCSRF bootstrap؛ لا endsWith بوصفه حلًا دقيقًا.

الدليل في خط الأساس:

- [apps/api/src/presentation/security/SecurityMiddlewareFactory.ts:161](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/api/src/presentation/security/SecurityMiddlewareFactory.ts#L161) — `if (exemptPaths.some((p) => req.path.startsWith(p) || req.path.includes(p))) {`
- [apps/api/src/presentation/security/SecurityMiddlewareFactory.ts:179](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/api/src/presentation/security/SecurityMiddlewareFactory.ts#L179) — `if (!sessionSecret) {`

## SEC-04 — قبول سر CSRF التطويري

**الحكم: مؤكد — الأولوية: P1 — التنفيذ: B02**

القيمة الافتراضية المعروفة تتجاوز predicate قوة السر كما أكد اختبار محلي؛ أنماط AppConfig لا تمنعها. هذا يثبت فجوة التحقق، لا أن الإنتاج يستعملها.

الإجراء المعتمد: سياسة مشتركة ترفض defaults المعروفة مع ضرورة حقن سر مستقل؛ اختبار validator وAppConfig في production/staging دون قراءة أسرار تشغيلية.

الدليل في خط الأساس:

- [packages/config/src/AppConfig.ts:123](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/packages/config/src/AppConfig.ts#L123) — `CSRF_SECRET: env.CSRF_SECRET || 'dev-csrf-secret-at-least-32-chars-long',`
- [packages/config/src/ProductionReadinessValidator.ts:217](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/packages/config/src/ProductionReadinessValidator.ts#L217) — `private static isStrongSecret(value: unknown): boolean {`

## SEC-05 — معدلات المصادقة والتعداد

**الحكم: صحيح جزئيًا — الأولوية: P1 — التنفيذ: B02**

المسارات الأربعة بلا ميزانيات مماثلة login/forgot؛ rate limit عام موجود. التسجيل يكشف EMAIL_ALREADY_EXISTS. لا تكفي مراجعة الراوتر وحده للجزم بغياب كل ضبط داخلي/provider.

الإجراء المعتمد: ميزانيات مخصصة account/IP ورسائل توافق تقلل التعداد، cooldown وتوكنات محدودة العمر؛ حصر الضوابط الموجودة وعدم إرسال email خام في مفاتيح تدقيق عامة.

الدليل في خط الأساس:

- [apps/api/src/presentation/api/router/AuthRouter.ts:439](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/api/src/presentation/api/router/AuthRouter.ts#L439) — `router.post('/register', async (req: Request, res: Response) => {`
- [apps/api/src/presentation/api/router/AuthRouter.ts:457](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/api/src/presentation/api/router/AuthRouter.ts#L457) — `res.status(error.code === 'EMAIL_ALREADY_EXISTS' ? 409 : 500).json(responseFormatter.error({`
- [apps/api/src/presentation/api/router/AuthRouter.ts:333](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/api/src/presentation/api/router/AuthRouter.ts#L333) — `securityService.getRateLimiter().consume(auth:account:${accountKey}, 20, 15 * 60 * 1000),`

## SEC-06 — fallback محلي لرموز الاستعادة

**الحكم: صحيح جزئيًا — الأولوية: P1 — التنفيذ: B02**

الـfallback حقيقي لكن DI القياسي يحقن use cases دائمة؛ لم يثبت تشغيل الإنتاج على مستودع الذاكرة. يبقى مسارًا غير آمن عند نقص الحقن واقترانًا معماريًا.

الإجراء المعتمد: إلزام التبعيات في production-like وبناؤها في composition root؛ بدائل الذاكرة داخل fixtures الاختبارات فقط؛ اختبار رفض التهيئة الناقصة.

الدليل في خط الأساس:

- [apps/api/src/presentation/api/router/AuthRouter.ts:54](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/api/src/presentation/api/router/AuthRouter.ts#L54) — `const passwordResetTokenRepo = (cradle as any).passwordResetTokenRepository || (cradle as any).prismaPasswordResetTokenRepository || new InMemoryPasswordResetTokenRepository();`
- [apps/api/src/infrastructure/di/container.ts:1432](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/api/src/infrastructure/di/container.ts#L1432) — `forgotPasswordUseCase: asFunction(({ identityRepository, passwordResetTokenRepository, emailDeliveryGateway }) => new ForgotPasswordUseCase({`

## SEC-07 — Markdown وروابط javascript/data

**الحكم: غير صحيح حاليًا — الأولوية: تحقق — التنفيذ: لا إصلاح**

المكون لا يحول روابط Markdown أو الصور إلى href/src أصلًا؛ يعرضها React كنص. اختبار SSR أكد غياب a/img وهروب HTML. لم يثبت XSS الموصوف.

الإجراء المعتمد: لا إضافة sanitizer غير مستعمل ولا renderer روابط جديد بحجة علاج هذا البند. إن أضيف دعم روابط لاحقًا يُصمم بعقد بروتوكولات آمن واختبارات جديدة.

الدليل في خط الأساس:

- [apps/admin/src/components/SafeMarkdownView.tsx:200](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/admin/src/components/SafeMarkdownView.tsx#L200) — `function renderInlineFormatting(text: string): React.ReactNode {`
- [apps/admin/src/components/SafeMarkdownView.tsx:203](https://github.com/wegdangamil2022-oss/MANARATAK-First-/blob/5c0f72cf268f4a127d1f9bc64b8af1bccb7fd1eb/apps/admin/src/components/SafeMarkdownView.tsx#L203) — `// Split by bold (**text**) or inline code (code)`
