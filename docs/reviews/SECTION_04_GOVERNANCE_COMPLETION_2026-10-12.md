# استكمال مصدر القسم 04 — الإعدادات العامة

الأساس: `8499ef86`، كوميت المصدر: `6a789689`؛ فرع `codex/review-sections-4-5-source-20261012`. هذا التقرير يستكمل النواقص المحددة في المراجعة السابقة ولا يغير أدلتها التاريخية. القسم 05 يحتفظ بمراجعته وإصلاحاته السابقة دون إعادة اختبارات.

| معرّف الخطة | التنفيذ الحالي | المصدر | التحقق وحدوده |
|---|---|---|---|
| FGA-04-001 | منفذ وغير متحقق تشغيليًا: read-only preview، old/new وscope وconstraints والمستهلك المعلن، digest على نسخ التعريفات والقيم والسياسة، طلب وموافقة مستقلة محددة الهوية، ثم حفظ جميع القيم واستهلاك الموافقة تحت coordinator transaction. stale version/digest ترفض، وفشل كتابة لاحقة لا يستهلك الموافقة. audit/outbox يحملان changeSetId. | `SettingsGovernanceUseCases.ts`؛ `PrismaSettingsGovernanceGateway.ts`؛ `SettingsGovernancePanel.tsx`؛ `SettingsAdminRouter.ts` | اختبار جديد للمعاينة/الموافقة/النسخة/الفشل اللاحق؛ database rollback الحقيقي مؤجل، وليس مثبتًا بمستودع mock. |
| FGA-04-002 | منفذ وغير متحقق تشغيليًا: registry إداري محدود، Boolean trigger مع مفاتيح مطلوبة في context مصرح به، على effective values بعد overlay المجموعة/الوراثة. الافتراضي rules=[]؛ لا SMTP أو rules مخترعة. تغيير السياسة نفسه يحتاج preview وموافقة مستقلة. جميع مستودعات الكتابة الحالية تشترك في قفل الحوكمة؛ save/clear/rollback/deprecate يعيدون فحص السياسة فلا تتجاوزها الكتابة المنفردة. | `SettingsDependencyPolicy.ts`؛ `PrismaSettingsDependencyGuard.ts`؛ مستودعا Settings؛ Gateway | 7 حالات Domain جديدة ناجحة؛ لا قواعد عامة ضمنية على كل سياق/مؤسسة، ولا claim ربط المستهلك الحي. الأسرار لا يسمح استخدامها كمفاتيح هذه القواعد. |
| 04.15 | منفذ وغير متحقق: consumerDomain metadata معلنة من المدير من القاموس الحالي، lastChangedBy يكتب من actor الخادمي، revision وقواعد وعدد التعيينات وحالة flag، مع API وواجهة إنشاء/تعديل/عرض. السجلات القديمة بلا author/consumer تبقى معلنة كمجهولة؛ لا backfill ولا اختلاق مالك. | `SettingDefinition.ts`؛ `ManageSettingsUseCase.ts`؛ `PrismaSettingDefinitionRepository.ts`؛ `SettingsAdminPage.tsx`؛ schema/migration | مراجعة مصدر؛ لا ترحيل أو browser/DB اختبار. consumerDomain إعلان ownership metadata وليس دليل حقن فعلي في consumer service. |

## السلامة والتجهيز المؤجل

- الترحيل المصدر: `20261012040000_settings_governance` يضيف عمودي metadata وجدول Settings-owned للسجل الإداري والموافقات، وقيد namespace. **لم يُطبق** ولم يُغيّر schema أو بيانات قاعدة قائمة.
- حوكمة الكتابة الجديدة تقرأ هذا الجدول؛ قبل تجهيز القاعدة الجديدة لا يُدعى أن المسار يعمل. الحالة **NOT_RUNTIME_SAFE / MIGRATION_UNAPPLIED**، ولا fallback يسمح بتجاوز dependency checks إذا تعذر التخزين.
- approvals محددة requester/reviewer، context actor من جلسة موثوقة، MFA/CSRF/RBAC/idempotency الحالية محفوظة، expiry 30 دقيقة للموافقة، replays لا تنتج business audit/outbox أخرى. commit يعيد التحقق من صلاحية وفعالية المعتمد عبر API، ومن النسخ/digest داخل المعاملة.
- preview مصنف read-only ولا يكتب business/audit/outbox؛ طلباته لا تفعّل قيمًا. تغيير السياسة/القيم لا يشغّل consumer/provider/notifications.
- policy contexts صريحة global/domain/identity؛ الواجهة تعرض global/domain وتحفظ سياق identity الموجود مع تحذير عند تغييره. لا Tenant authority جديدة أو تغطية لكل context ممكنة دون قاعدة إدارية معلنة.
- الاستعادة/الاحتفاظ بالموافقات وتاريخ القيم تحفظ وفق migration recovery policy؛ لا down SQL أو purge في هذه الجولة.

## الفحوص: مرة واحدة فقط

- `npx prisma generate --schema packages/infrastructure/prisma/schema.prisma`: PASS، source client generation فقط بلا اتصال/ترحيل قاعدة. [السجل](evidence/sections-04-05-settings-completion-20261012/prisma-generate-once.log).
- `npx tsc -b packages/infrastructure apps/api apps/admin --pretty false`: FAIL exit 2 بسبب TS6133 لاستيرادي `SettingsChange` و`SettingsDependencyPolicy` غير المستخدمين. أزيلا من Gateway؛ **لم يُعد الفحص** وفق طلب المستخدم. [السجل](evidence/sections-04-05-settings-completion-20261012/typecheck-once.log).
- `npx vitest run packages/domain/tests/settings/SettingsDependencyPolicy.spec.ts packages/infrastructure/tests/settings/SettingsChangeSetBoundary.spec.ts`: PASS، ملفان جديدان/12 حالة، 1.55 ثانية، مرة واحدة. 7 Domain و5 Gateway tests؛ لا DB حقيقية، ولا إعادة اختبار قديم. [السجل](evidence/sections-04-05-settings-completion-20261012/new-tests-once.log).
- توليد DI manifest للمصدر الجديد: 394 reachable/394 registrations. جرد audit source زيدت له 4 handlers جديدة للقسم 04، بما فيها preview read-only؛ لا تحويل OWNER_VERIFICATION_REQUIRED إلى شهادة runtime.

الأوامر نُفذت على شجرة العمل فوق `8499ef86` قبل حفظ `6a789689`. الاختبارات الجديدة بعد تصحيح الاستيرادين، ثم formatting فقط وتحديث manifests؛ لم تُعد على SHA محفوظ. لا شهادة TypeScript ناجحة للكوميت النهائي. mock fixtures القديمة حدثت للتخزين الجديد، لكنها لم تُشغّل مجددًا.

## المتبقي

نواقص المصدر الثلاثة التي سجلت في التقرير السابق لها الآن مسارات API/use cases/repositories/UI. المتبقي هو التحقق النهائي للنسخة الحالية، تجهيز ترحيل معزول بعد عرض أمره، إثبات multi-key rollback والموافقات/القفل في PostgreSQL، browser/RBAC/load، وربط القيم بمستهلك runtime معتمد. لا CODE_CLOSED مطلق أو PRODUCTION_GO بلا هذه الأدلة، ولا اختبارات ثقيلة هنا.
