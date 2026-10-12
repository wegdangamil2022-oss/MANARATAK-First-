# إكمال مصدر القسم 03 — الأصول والملفات / Enterprise Asset Platform (EAP)

هذه جولة إكمال **المصدر** بناءً على طلب المستخدم الأخير. التقارير السابقة تاريخية ولم تُستبدل. الفرع: `codex/complete-sections-1-3-source-20261012`، الأساس: `01c505532272d3bb085966a35b630ab55da11393`.

التصنيف «منفذ وغير متحقق» أدناه يعني وجود الكود والواجهات والعقود، مع تأجيل إثبات التشغيل النهائي. لا يعني نجاح اختبارات قاعدة البيانات أو المتصفح أو جاهزية الإنتاج. أُوقفت الاختبارات عند طلب المستخدم، ولم تُعد أي اختبارات بعد هذا الطلب.

| المتطلب | التصنيف الحالي | التنفيذ | ملفات المصدر |
|---|---|---|---|
| FGA-03-001 | منفذ وغير متحقق | مصدر الحقوق والنسب ونطاق الاستخدام والسياسة الإلزامية/الإرشادية والانتهاء وتاريخ التغييرات؛ حماية النشر العام ومدة منح التنزيل بما فيها CMS وشعارات الجامعات. | packages/domain/src/asset-platform/value-objects/AssetRights.ts؛ packages/application/src/asset-platform/AssetReferencePolicy.ts؛ packages/application/src/asset-platform/use-cases/AssetGovernanceUseCases.ts؛ apps/admin/src/components/AssetRightsRenditionsPanel.tsx |
| FGA-03-002 | منفذ وغير متحقق | سجل نسخ عرض MISSING/READY/FAILED وربط أصل مشتق موجود بعد إثبات علاقة المزود والتحقق من hash والأبعاد والحجم والنوع. حماية استخدام الأصل والأصل المشتق وفك الربط. لا تحويل صور وهمي ولا pipeline معالجة جديد. | packages/infrastructure/src/asset-platform/PrismaAssetGovernanceGateway.ts؛ packages/infrastructure/src/asset-platform/HttpAssetSecurityGateways.ts؛ packages/infrastructure/prisma/migrations/20261012020000_asset_rendition_inventory/migration.sql |
| 03/P1-12؛ 03/P1-13 | منفذ وغير متحقق | استرداد الأرشفة والاستعادة المعلقة بإثبات مزود حديث ومعرف العملية وCAS، وعدم تنشيط أصل انتهت سياسة استعادته. التسجيل الذري والتعامل مع فشل كل أصل مستقل. | packages/application/src/asset-platform/use-cases/RecoverAssetLifecycleUseCase.ts؛ packages/infrastructure/src/asset-platform/PrismaAssetLifecycleRecoveryGateway.ts؛ packages/infrastructure/prisma/migrations/20261012030000_asset_authoritative_reconciliation/migration.sql |

## دليل التحقق وحدوده

انظر [سجل الجولة المشترك](SECTIONS_01_03_SOURCE_COMPLETION_2026-10-12.md) والسجلات المرفقة. النجاحات السابقة تخص نسخًا أثناء التطوير؛ لم تُعد الاختبارات على جميع التعديلات النهائية.

## المتبقي

يلزم لاحقًا مزود يدعم إثبات الاشتقاق والمصالحة authoritative والتحقق من عقود HTTP على بيئة تجريبية. ASSET_LIFECYCLE_RECOVERY_ENABLED معطل افتراضيًا. ترحيلا النسخ والمصالحة جاهزان كمصدر ولم يُطبقا. لم تُستخدم بيانات إنتاج أو قاعدة قائمة. التشغيل الكامل والتحويل الفعلي مشروطان بقدرات المزود وليسا مثبتين بهذه الجولة.
