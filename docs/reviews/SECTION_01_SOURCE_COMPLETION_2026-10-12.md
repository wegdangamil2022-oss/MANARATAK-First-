# إكمال مصدر القسم 01 — الموظفون والصلاحيات / IAM & RBAC

هذه جولة إكمال **المصدر** بناءً على طلب المستخدم الأخير. التقارير السابقة تاريخية ولم تُستبدل. الفرع: `codex/complete-sections-1-3-source-20261012`، الأساس: `01c505532272d3bb085966a35b630ab55da11393`.

التصنيف «منفذ وغير متحقق» أدناه يعني وجود الكود والواجهات والعقود، مع تأجيل إثبات التشغيل النهائي. لا يعني نجاح اختبارات قاعدة البيانات أو المتصفح أو جاهزية الإنتاج. أُوقفت الاختبارات عند طلب المستخدم، ولم تُعد أي اختبارات بعد هذا الطلب.

| المتطلب | التصنيف الحالي | التنفيذ | ملفات المصدر |
|---|---|---|---|
| FGA-01-001؛ 01/P1-04 | منفذ وغير متحقق | مصفوفة أزواج تعارض قابلة للإعداد الإداري، فحص اتحاد الأدوار والتفويض الطارئ عند التغيير وعند التقييم، استثناءات مؤقتة مع الإلغاء وانتهاء الصلاحية وموافقة مستقلة. لا أزواج مفترضة. | packages/domain/src/authorization/services/SeparationOfDuties.ts؛ packages/infrastructure/src/authorization/PrismaDutyGuard.ts؛ packages/application/src/authorization/use-cases/AuthorizationGovernanceUseCases.ts؛ apps/admin/src/components/AuthorizationGovernancePanel.tsx |
| 01/P1-09؛ حوكمة الموافقات | منفذ وغير متحقق | طلب وموافقة مسجلة من مستخدم مستقل واستهلاك وحيد مرتبط ببصمة المحتوى للسياسة والاستثناء وإعادة ضبط MFA. لا يُدّعى تحويل جميع مسارات الموافقة القديمة إلى هذا التدفق. | packages/application/src/authorization/use-cases/GovernanceApprovalUseCases.ts؛ packages/infrastructure/src/authorization/PrismaGovernanceApprovalGateway.ts؛ apps/admin/src/components/GovernanceApprovalsPanel.tsx |
| 01: إدارة المصادقة ومراجعة الوصول | منفذ وغير متحقق | TOTP مشفر، منع إعادة استخدام الرمز، ربط الإثبات بالجلسة، step-up للكتابة الإدارية، صفحة أمن الحساب وإعادة الضبط بموافقة مستقلة، سجل مراجعات الوصول وموعد المراجعة. | packages/application/src/auth/mfa/MfaUseCases.ts؛ packages/infrastructure/src/auth/mfa/PrismaMfaGateway.ts؛ apps/api/src/presentation/security/SecurityMiddlewareFactory.ts؛ apps/admin/src/pages/AccountSecurityPage.tsx |

## دليل التحقق وحدوده

انظر [سجل الجولة المشترك](SECTIONS_01_03_SOURCE_COMPLETION_2026-10-12.md) والسجلات المرفقة. النجاحات السابقة تخص نسخًا أثناء التطوير؛ لم تُعد الاختبارات على جميع التعديلات النهائية.

## المتبقي

يلزم إعداد MANARATAK_MFA_ENCRYPTION_KEY والمحافظة عليه، تسجيل MFA للمسؤولين قبل الكتابة، وتحديد أزواج التعارض إداريًا. ترفض السياسة الجديدة التعارضات القائمة؛ لا إعفاء صامت للحسابات ذات wildcard. مسارات JIT غير الطارئة والأدوار على مستوى المورد مشروطة/مرحلة لاحقة في الخطة؛ لم تُضف في هذه الجولة.
