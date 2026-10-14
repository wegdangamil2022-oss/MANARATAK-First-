# تقرير إكمال كود القسم 12 — دول الدراسة

التاريخ: 2026-10-14. الخطة: `docs/reviews/MANARATAK_ADMIN_REVIEW_CODEX.md`، من STD-ADM-001 إلى STD-ADM-026، ثم FGA-12-001/002. لا يشمل هذا التقرير القسم 13 الخاص بالدورات.

تم تنفيذ بنود الكود الـ28. هذه نتيجة إكمال المصدر والتحقق الخفيف؛ التحقق التشغيلي بقاعدة بيانات فعلية ومتصفح ومزود حي مؤجل بحسب ملحق الخطة بعد القسم 28.

## نتيجة التحقق

- 55 اختبارًا مستهدفًا ناجحًا في 9 ملفات، صفر فشل. تشغيل واحد متسلسل `--maxWorkers=1`؛ نحو 4.6 ثانية.
- فحص المصدر: 116/116، مع ضوابط جديدة مكملة للاختبارات السلوكية.
- فحص TypeScript للحزم والخادم والإدارة والعرض العام: ناجح.
- بوابة جودة المصدر: ناجحة؛ صفر دورات اعتماد وصفر مخالفات الإتاحة.
- فحص الأسرار و`git diff --check`: ناجحان. نُقّح مفتاح موجود مسبقًا داخل رابط بحث عام محفوظ.
- لم تُشغّل suite شاملة أو E2E أو اختبارات قاعدة بيانات أو مزود حي.

## ما تغير

الخادم يطلب هوية مصادقًا عليها وسببًا ونسخة `If-Match` لكل تغيير. المحرر لا يكتب بيانات الاعتماد، والمراجع مختلف عن آخر محرر. الاعتماد يحتفظ ببصمة المحتوى ونسخته والجهات المعتمدة؛ تغيير المحتوى أو الصورة أو الإبراز أو المدن يبطله. جميع الأوامر تكتب بيانات العمل والتدقيق والحدث داخل معاملة P5 واحدة.

العرض العام يعرض فقط الحقول المعتمدة، ويحل المراجع دفعيًا ويفحص حالتها. الصور تمر عبر Asset Platform بمنحة حتى خمس دقائق، دون cache مشترك، ويجدد العرض المنح كل ثلاث دقائق. المدن مختارة من P7، والتكلفة شهرية بالعملة الأصلية. البحث والتنقل في العلاقات أصبحا بصفحات مستقلة من المالك.

## مصفوفة البنود

| البند | الأولوية | الإصلاح المنفذ | الدليل |
| --- | --- | --- | --- |
| STD-ADM-001 | P0 | رفض تاريخ التوثيق من المحرر؛ التوقيت وهوية المراجع يصدران من الخادم. | [StudyDestinationAdminRouter.ts](../../apps/api/src/presentation/api/router/StudyDestinationAdminRouter.ts#L43) |
| STD-ADM-002 | P0 | منع الاعتماد الذاتي؛ قرار مستقل ببصمة المحتوى ونسخة المراجعة، ونشر نسخة معتمدة فقط. | [StudyDestinationUseCases.ts](../../packages/application/src/study-destinations/StudyDestinationUseCases.ts#L326) |
| STD-ADM-003 | P1 | إسقاط عام بقائمة حقول محددة؛ لا أدلة داخلية ولا حوكمة أو بيانات تدقيق خام. | [StudyDestinationUseCases.ts](../../packages/application/src/study-destinations/StudyDestinationUseCases.ts#L543) |
| STD-ADM-004 | P1 | استبدال بروتوكول الروابط النصي بمحرر صفوف يحفظ التصنيفات والفواصل كما هي. | [StudyDestinationDetailPage.tsx](../../apps/admin/src/pages/StudyDestinationDetailPage.tsx#L1496) |
| STD-ADM-005 | P1 | الدول المميزة تأتي من الملفات المنشورة والمميزة؛ أزيلت الإحصاءات والصور الثابتة. | [FeaturedCountries.tsx](../../apps/web/src/features/public-template/components/FeaturedCountries.tsx#L49) |
| STD-ADM-006 | P1 | التنقل بواسطة slug/ISO2 ثابت؛ ربط تفاصيل صفحات البحث اللاحقة بشبكة العلاقات. | [CountriesSearchPage.tsx](../../apps/web/src/features/public-template/components/CountriesSearchPage.tsx#L207) |
| STD-ADM-007 | P1 | تسليم الصورة عبر Asset Platform بمنحة آمنة قصيرة المدة مع بديل عند التعذر. | [StudyDestinationUseCases.ts](../../packages/application/src/study-destinations/StudyDestinationUseCases.ts#L119) |
| STD-ADM-008 | P1 | اشتراط القوائم الأساسية الإنجليزية والعناوين؛ تغطية الهياكل الاختيارية باللغتين. | [index.ts](../../packages/domain/src/study-destinations/index.ts#L436) |
| STD-ADM-009 | P1 | فحص lifecycle عند القراءة؛ إخفاء المراجع غير السارية مع تنبيه عام وإشارة مراجعة إدارية. | [StudyDestinationUseCases.ts](../../packages/application/src/study-destinations/StudyDestinationUseCases.ts#L29) |
| STD-ADM-010 | P1 | اعتماد كل نطاق مصدر واسم جهة ورابط إثبات؛ الاستثناء غير الحكومي يتطلب تبريرًا. | [StudyDestinationUseCases.ts](../../packages/application/src/study-destinations/StudyDestinationUseCases.ts#L672) |
| STD-ADM-011 | P1 | تغيير الصورة أو الإبراز أو المدن يبطل الاعتماد ويعيد المنشور إلى المسودة. | [StudyDestinationUseCases.ts](../../packages/application/src/study-destinations/StudyDestinationUseCases.ts#L124) |
| STD-ADM-012 | P1 | كل الأوامر داخل P5 atomic boundary: هوية وسبب ونسخ قبل/بعد وتدقيق وحدث مترابط. | [StudyDestinationUseCases.ts](../../packages/application/src/study-destinations/StudyDestinationUseCases.ts#L707) |
| STD-ADM-013 | P1 | نافذة مراجعة افتراضية 180 يومًا قابلة للضبط؛ رفض المستقبل والتقادم ووقف العرض القديم. | [index.ts](../../packages/domain/src/study-destinations/index.ts#L285) |
| STD-ADM-014 | P1 | تعريب/إنجليزية العناوين والرسائل وبيانات العلاقات مع RTL/LTR ودون ترجمة محتوى مؤلف. | [CountryDetailModal.tsx](../../apps/web/src/features/public-template/components/CountryDetailModal.tsx#L1) |
| STD-ADM-015 | P1 | قائمة مدن مختارة بمعرفات P7؛ رفض الدولة الخاطئة وتصفية المدينة غير السارية وحالة فراغ واضحة. | [StudyDestinationDetailPage.tsx](../../apps/admin/src/pages/StudyDestinationDetailPage.tsx#L25) |
| STD-ADM-016 | P2 | التمييز بين إجمالي النتيجة ومؤشرات الصفحة؛ لا استنتاج تقدم عام من الصفحة الحالية. | [StudyDestinationsAdminPage.tsx](../../apps/admin/src/pages/StudyDestinationsAdminPage.tsx#L246) |
| STD-ADM-017 | P2 | صفحة دول canonical مع profile join وعدّ متوافق في snapshot؛ دون قراءة Profile لكل دولة. | [PrismaStudyDestinationRepository.ts](../../packages/infrastructure/src/study-destinations/PrismaStudyDestinationRepository.ts#L276) |
| STD-ADM-018 | P2 | حل مراجع دفعي محدود؛ عند تغير الدولة بين اللقطات تُرفض القراءة بدل عدّ مضلل. | [StudyDestinationUseCases.ts](../../packages/application/src/study-destinations/StudyDestinationUseCases.ts#L474) |
| STD-ADM-019 | P2 | بحث وفلاتر وصفحات عامة من الخادم، وحالات تحميل/تعذر؛ لا تنزيل كل صفحات الدول. | [CountriesSearchPage.tsx](../../apps/web/src/features/public-template/components/CountriesSearchPage.tsx#L1) |
| STD-ADM-020 | P2 | خمس suites اختصاصية domain/application/router/repository/public mapping، وإصلاح doubles الرسم. | [StudyDestinationGovernance.spec.ts](../../packages/application/tests/study-destinations/StudyDestinationGovernance.spec.ts#L221) |
| STD-ADM-021 | P2 | قدرات read/edit/verify/publish منفصلة على API وAdmin؛ لا منح تلقائي لصلاحيات P7. | [adminPermissionCatalog.ts](../../packages/shared/src/authorization/adminPermissionCatalog.ts#L3) |
| STD-ADM-022 | P2 | حذف تصنيفات الملاءمة وفرص المنح غير المثبتة؛ العداد غير المتاح يبقى غير متاح. | [publicLiveDataSource.ts](../../apps/web/src/features/public-template/publicLiveDataSource.ts#L335) |
| STD-ADM-023 | P1 | مؤشرات مستقلة لكل مالك؛ تمرير cursors للجامعات والمنح والبرامج والخدمات والدورات. | [CrossDomainGraphReadService.ts](../../packages/application/src/read-models/CrossDomainGraphReadService.ts#L184) |
| STD-ADM-024 | P1 | إعادة فحص حالة الصورة وحقوقها وتصنيفها ونوعها عند النشر والتسليم العام. | [StudyDestinationUseCases.ts](../../packages/application/src/study-destinations/StudyDestinationUseCases.ts#L390) |
| STD-ADM-025 | P2 | نطاق شهري typed بالعملة الأصلية وتنسيق locale؛ حذف اسم الحقل المضلل USD. | [publicLiveDataSource.ts](../../apps/web/src/features/public-template/publicLiveDataSource.ts#L348) |
| STD-ADM-026 | P2 | Prisma delegate وWhereInput وGetPayload مولّدة؛ حذف any من مستودع الوجهات. | [PrismaStudyDestinationRepository.ts](../../packages/infrastructure/src/study-destinations/PrismaStudyDestinationRepository.ts#L24) |
| FGA-12-001 | P2 | فلتر النقص يسبق pagination وعدّ النتيجة، مع رابط مباشر إلى تبويب التحرير المناسب. | [PrismaStudyDestinationRepository.ts](../../packages/infrastructure/src/study-destinations/PrismaStudyDestinationRepository.ts#L213) |
| FGA-12-002 | P2 | روابط كل جامعات/منح الدولة بمعرف canonical، قراءة الفلتر من URL وإمكانية مسحه. | [ScholarshipListPage.tsx](../../apps/admin/src/pages/ScholarshipListPage.tsx#L114) |

## متطلبات التفعيل التشغيلي غير المنفذة

1. مراجعة وتطبيق ترحيل التوسعة `20261014090000_study_destination_governance_source_only` قبل تشغيل هذه النسخة على قاعدة بيانات حية. يضيف revision/governance/cityReferenceIds فقط؛ لا يعدّل الدول أو يختلق اعتمادًا للملفات القديمة.
2. إسناد صلاحيات الوجهات الجديدة إلى أدوار معتمدة: قراءة+تحرير للمحرر، قراءة+توثيق للمراجع، وقراءة+نشر للناشر. صلاحية P7 القديمة لا تمنح حق الاعتماد أو النشر تلقائيًا. لا توجد تغييرات على إسنادات الموظفين في هذا العمل.
3. إعادة مراجعة الملفات المنشورة القديمة قبل عرضها بالعقد الجديد. لا يوجد اعتماد تاريخي مصطنع؛ الملف بلا دليل مستقل لا يدخل القائمة العامة. الملف القديم بلا lastEditor يحتاج تعديل محتوى فعليًا من محرر ثم مراجعة مستقلة.
4. إجراء اختبارات DB والتزامن والمتصفح/المزود المؤجلة بعد القسم 28. اختبارات المستودع والتراجع هنا تستخدم doubles، وليست إثبات تشغيل PostgreSQL أو حقوق صور حية.

نافذة الحداثة موحّدة افتراضيًا عند 180 يومًا لكل مصادر ملف الدولة. يمكن ضبطها عند بناء publishing policy والمستودع بالقيمة نفسها. اعتماد الجهة غير الحكومية قرار مستقل موثق، ولا تجري أي عملية scraping تلقائية بديلًا عن المراجع.

الصلاحيات والترحيل لا تُفعّل في هذا التغيير؛ يجب إتمام المتطلبات أعلاه قبل النشر التشغيلي. لا يوجد تشغيل workers أو deploy ضمن هذه المهمة.

## ملفات التحقق الموجهة

- [StudyDestinationPublishingPolicy.spec.ts](../../packages/domain/tests/study-destinations/StudyDestinationPublishingPolicy.spec.ts)
- [StudyDestinationGovernance.spec.ts](../../packages/application/tests/study-destinations/StudyDestinationGovernance.spec.ts)
- [StudyDestinationRepositoryContract.spec.ts](../../packages/infrastructure/tests/study-destinations/StudyDestinationRepositoryContract.spec.ts)
- [StudyDestinationGovernanceRouter.spec.ts](../../apps/api/tests/presentation/api/router/StudyDestinationGovernanceRouter.spec.ts)
- [StudyDestinationPublicMapping.spec.ts](../../apps/web/src/features/public-template/tests/StudyDestinationPublicMapping.spec.ts)
- [CrossDomainGraphReadService.spec.ts](../../packages/application/tests/read-models/CrossDomainGraphReadService.spec.ts)
- [CrossDomainReadModelRouter.spec.ts](../../apps/api/tests/presentation/api/router/CrossDomainReadModelRouter.spec.ts)
- [public-locale-routing.spec.ts](../../tests/translation/public-locale-routing.spec.ts)
- [AuditViewModel.spec.ts](../../apps/admin/src/pages/audit/AuditViewModel.spec.ts)
