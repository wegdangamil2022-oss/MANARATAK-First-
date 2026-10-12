# إكمال مصدر القسم 02 — سجل التدقيق / Enterprise Audit Center

هذه جولة إكمال **المصدر** بناءً على طلب المستخدم الأخير. التقارير السابقة تاريخية ولم تُستبدل. الفرع: `codex/complete-sections-1-3-source-20261012`، الأساس: `01c505532272d3bb085966a35b630ab55da11393`.

التصنيف «منفذ وغير متحقق» أدناه يعني وجود الكود والواجهات والعقود، مع تأجيل إثبات التشغيل النهائي. لا يعني نجاح اختبارات قاعدة البيانات أو المتصفح أو جاهزية الإنتاج. أُوقفت الاختبارات عند طلب المستخدم، ولم تُعد أي اختبارات بعد هذا الطلب.

| المتطلب | التصنيف الحالي | التنفيذ | ملفات المصدر |
|---|---|---|---|
| 02/P0-04 | منفذ وغير متحقق | إعداد مدد احتفاظ إداريًا لكل تصنيف، والافتراضي الاحتفاظ دون مدة مخترعة. حلّ مصدر الإدراج في المستودع مع trigger جديد لمسارات الإدراج القديمة، دون تعديل السجلات الموجودة. إعداد السياسة يرفض العمل دون الحارس المثبت. | packages/infrastructure/src/audit/PrismaAuditWorkspaceGateway.ts؛ packages/infrastructure/src/audit/PrismaAuditRecordRepository.ts؛ packages/infrastructure/prisma/migrations/20261012010000_audit_workspace/migration.sql |
| FGA-02-001؛ 02/P1-04 | منفذ وغير متحقق | ملفات تحقيق مستقلة تربط السجلات الأصلية مع ملاحظات موثقة وإسناد وحالة وتاريخ وتجميد قانوني. حماية الاحتفاظ للمراجع المجمدة وCAS وصلاحيات قراءة/إدارة منفصلة. | packages/application/src/audit/workspace/AuditWorkspaceUseCases.ts؛ packages/infrastructure/src/retention/PrismaAuditRetentionGateway.ts؛ apps/admin/src/components/AuditWorkspacePanel.tsx |
| FGA-02-002 | منفذ وغير متحقق | قواعد بفلاتر مسموحة وعتبة ونافذة وcooldown، إيصالات دائمة ومفاتيح تكرار ثابتة وإعادة محاولة مؤجرة وإلغاء القاعدة المتغيرة. الإنشاء عبر مالك الإشعارات، وليس إرسالًا مباشرًا. | packages/application/src/audit/workspace/AuditAlertEvaluation.ts؛ packages/infrastructure/src/audit/PrismaAuditAlertEvaluationGateway.ts؛ packages/application/src/notification/AuditAdministratorRecipientGateway.ts |
| 02/P1-01 | جزئي | توسيع التسميات العربية والإنجليزية وقائمة أكواد الحوكمة الجديدة؛ الكتالوج يعلن complete:false ولا يدّعي جرد جميع مالكي الأحداث. | packages/shared/src/authorization/auditQueryCatalog.ts |

## دليل التحقق وحدوده

انظر [سجل الجولة المشترك](SECTIONS_01_03_SOURCE_COMPLETION_2026-10-12.md) والسجلات المرفقة. النجاحات السابقة تخص نسخًا أثناء التطوير؛ لم تُعد الاختبارات على جميع التعديلات النهائية.

## المتبقي

يلزم لاحقًا تطبيق ترحيل مساحة التدقيق على بيئة معزولة بعد عرض أمر التجهيز، وضبط مدد الاحتفاظ والقالب والمستلم، ثم اختبار العامل. AUDIT_ALERTS_ENABLED معطل افتراضيًا. لم يُرسل أي إشعار. التحقق الحقيقي من trigger والفهارس والتجميد القانوني مؤجل. لا سياسة خصوصية حقول جديدة مفترضة؛ بقيت حماية الأسرار القائمة.
