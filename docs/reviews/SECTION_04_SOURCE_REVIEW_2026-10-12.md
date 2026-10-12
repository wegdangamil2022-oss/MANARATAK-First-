# مراجعة مصدر 04 — الإعدادات العامة / Enterprise Settings & Configuration Review — 2026-10-12

الخطة المرجعية: [MANARATAK_ADMIN_REVIEW_CODEX.md](MANARATAK_ADMIN_REVIEW_CODEX.md). الأساس `3a00176a` من main بعد الدمج وfetch؛ فرع العمل `codex/review-sections-4-5-source-20261012`. كوميت الإصلاحات: `8fb0fe6d`.

المراجعة كود وواجهات فقط، وليست قبول تشغيل. التقارير السابقة قُرئت، ثم رُوجعت المسارات الخادمية/المستودعات/الواجهات المشار إليها أدناه. «منفذ وغير متحقق» يعني تنفيذ المصدر مع تأجيل إثبات التشغيل النهائي. لم تُشغّل قاعدة بيانات أو E2E أو مزودات ولم تُطبق ترحيلات.

| معرّف الخطة | العنوان الأصلي | التصنيف | المصدر / النتيجة |
|---|---|---|---|
| `04.3` | المشكلة المعمارية الأولى — Settings ليست Runtime Authority فعليًا | منفذ وغير متحقق | [IResolvedSettingsReader.ts](../../packages/domain/src/settings/services/IResolvedSettingsReader.ts)؛ عقد typed وتشخيص precedence؛ لا نقل readConfig إلى DB أو ادعاء تغيير سلوك مستهلك حي. |
| `04.4` | Settings vs Configuration Foundation — سلطة مزدوجة/Orphan Context | منفذ وغير متحقق | [container.ts](../../apps/api/src/infrastructure/di/container.ts)؛ settings هو السياق المركب؛ لا API لسلطة Configuration Foundation منافسة. |
| `04.5` | Definition lifecycle ناقص | منفذ وغير متحقق | [ManageSettingsUseCase.ts](../../packages/application/src/settings/use-cases/ManageSettingsUseCase.ts)؛ تعديل وصف/deprecate مع revision/history، دون hard delete. |
| `04.6` | Validation Governance أقل بكثير من baseline | مكتمل ومثبت | [PrismaSettingAssignmentRepository.ts](../../packages/infrastructure/src/settings/PrismaSettingAssignmentRepository.ts)؛ إصلاح إعادة بناء validationRules في تعريف المعاملة؛ إثبات جديد محدود بحالتي منع تجاوز max/maxLength قبل أي كتابة. لا إثبات PostgreSQL. |
| `04.7` | Feature Flags — ما هو الضروري وما يؤجل | منفذ وغير متحقق | [SettingsAdminPage.tsx](../../apps/admin/src/pages/SettingsAdminPage.tsx)؛ Boolean flag غير سري/default صريح وحالة تشخيصية؛ لا targeting/rollout مفترض. |
| `04.8` | Feature Flag null bug | منفذ وغير متحقق | [SettingDefinition.ts](../../packages/domain/src/settings/entities/SettingDefinition.ts)؛ feature flag يحتاج default Boolean، فلا tri-state بسبب تعريف ناقص. |
| `04.9` | لا يوجد Clear Override / العودة إلى inheritance | منفذ وغير متحقق | [ManageSettingsUseCase.ts](../../packages/application/src/settings/use-cases/ManageSettingsUseCase.ts)؛ clear override بإضافة نسخة، expectedCurrentVersionId وسبب؛ resolver يعود للوراثة. |
| `04.10` | Scope governance | منفذ وغير متحقق | [ScopeIdentifier.ts](../../packages/domain/src/settings/value-objects/ScopeIdentifier.ts)؛ GLOBAL بلا scopeId؛ DOMAIN من القاموس المنشور؛ IDENTITY من مالك IAM؛ TENANT تاريخي read-only. |
| `04.11` | Effective Configuration Inspector مفقود | منفذ وغير متحقق | [SettingsResolutionInspector.tsx](../../apps/admin/src/components/SettingsResolutionInspector.tsx)؛ effective value/winner/chain من owner read؛ secrets غير متاحة، وليس تفعيلًا لمستهلك حي. |
| `04.12` | Secret definitions — التسمية الحالية مضللة | منفذ وغير متحقق | [SettingsAdminPage.tsx](../../apps/admin/src/pages/SettingsAdminPage.tsx)؛ Secret requirement/binding unverified؛ لا قيمة سر أو provider binding وهمي. |
| `04.13` | Runtime resolver contract غير كافٍ | منفذ وغير متحقق | [ConfigurationResolutionService.ts](../../packages/domain/src/settings/services/ConfigurationResolutionService.ts)؛ typed resolution metadata وstatus/scope/version/default وسلسلة محكومة. |
| `04.14` | Performance / Pagination | منفذ وغير متحقق | [PrismaSettingAssignmentRepository.ts](../../packages/infrastructure/src/settings/PrismaSettingAssignmentRepository.ts)؛ readSummaryPage/history bounded/keyset مع typed context مستقل؛ الواجهات لا تحمل history كاملًا. |
| `04.15` | Definition metadata الناقصة في Admin | جزئي | [SettingsAdminPage.tsx](../../apps/admin/src/pages/SettingsAdminPage.tsx)؛ أضيفت revision/validation summary وعدد التعيينات وحالة flag عند الطلب، وقُص العرض الطويل. consumer/last editor لا يردان في عقد التعريف ولم تُختلق قيمهما. |
| `04.16` | Change governance / Audit | منفذ وغير متحقق | [ManageSettingsUseCase.ts](../../packages/application/src/settings/use-cases/ManageSettingsUseCase.ts)؛ أسباب bounded للعمليات الحساسة وactor خادمي وCAS وaudit داخل المنسق؛ manage الحالي مسموح مبدئيًا بالخطة. |
| `04.17` | Outbox / Correlation Review | منفذ وغير متحقق | [PrismaSettingDefinitionRepository.ts](../../packages/infrastructure/src/settings/PrismaSettingDefinitionRepository.ts)؛ CONTROL_PLANE_MUTATION وOWNER_DOMAIN_EVENT مميزان ومترابطان؛ live delivery/replay مؤجل. |
| `04.18` | Prisma integrity | منفذ وغير متحقق | [schema.prisma](../../packages/infrastructure/prisma/schema.prisma)؛ علاقات current version وخطة SQL/preflight بالمصدر؛ لم تُطبق ترحيلات. |
| `04.19` | Admin UX المطلوب | جزئي | [SettingsAdminPage.tsx](../../apps/admin/src/pages/SettingsAdminPage.tsx)؛ definitions/assignments/history/inspector/clear والقيود موجودة؛ نقص metadata وFGA المذكوران لا يُخفَيان. |
| `04.20` | العلاقة مع بقية الأقسام | منفذ وغير متحقق | [ManageSettingsUseCase.ts](../../packages/application/src/settings/use-cases/ManageSettingsUseCase.ts)؛ Settings لا يملك موظفين/صلاحيات/حسابات مزود/أسرار أو تصرفات مالية. الربط بمستهلك معتمد يتطلب إعدادًا لاحقًا. |
| `FGA-04-001` | Change-set Preview ذري متعدد المفاتيح للتغييرات الحساسة | غير منفذ | [SettingsAdminRouter.ts](../../apps/api/src/presentation/api/router/SettingsAdminRouter.ts)؛ لا multi-key change-set preview/atomic commit؛ عمليات المنسق الحالية منفردة ولا تحقق قبول all-or-none للمجموعة. |
| `FGA-04-002` | سياسات اتساق Cross-key Configuration قبل حفظ الحالة الفعالة | غير منفذ | [SettingsAdminRouter.ts](../../apps/api/src/presentation/api/router/SettingsAdminRouter.ts)؛ لا cross-key dependency registry/effective-value validation. لا قواعد dependencies معتمدة محددة في المصدر؛ لا يُعتبر الفحص المنفرد بديلًا عنها. |

## الإصلاحات ودليل هذه الجولة

إضافة `validationRules` إلى تعريف المعاملة عند حفظ assignment تمنع تجاوز قواعد العدد/النص عبر المستودع مباشرة. اختبار جديد واحد/حالتان ناجحتان بمستودع mock، دون إعادة. عرض metadata والعداد/الحالة lazy وtruncation إضافات واجهة بعد فحص TypeScript؛ لم يُعد الفحص لها.

**لا يُغلق القسم بالكامل:** FGA-04-001 وFGA-04-002 غير منفذين؛ consumer/last editor ضمن 04.15 غير متاحين في العقد. هذه نواقص مصدر منفصلة عن اختبارات التشغيل.

[الأوامر والحدود وسجل التسليم](SECTIONS_04_05_SOURCE_REVIEW_2026-10-12.md). لا تُنسب نتائج CI أو الاختبارات التاريخية للكوميت النهائي.
