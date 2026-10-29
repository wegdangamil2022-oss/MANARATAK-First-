# شروط المنح من قسم المصدر وحده — 2026-10-29

## السبب والتصحيح

كان `ScholarshipImportSourceReview` يستبدل حقل الأهلية بتصحيح موسّع من المراجعة، وكان النقل الذري يضيف سياسة اللغة أو اختبارات metadata إلى `eligibilityItems`. ثم كان محرر الإدارة يفصّل جميع هذه السجلات إلى قوائم. أوقف هذا المسار؛ ليست معالجة إخفاء نصوص في CSS.

- **Source:** القسم المسمى «الشروط ومعايير التقديم» فقط. يلتقط قارئ Markdown نسخة `sourceEligibility` مرتبطة بمعرّف السجل وبصمته. السجلات الحالية تستخدم `metadata.rawSourceSections` الأصلية الموجودة، بما فيها القسم الفارغ. لا رجوع إلى الحقل القديم أو الملاحظات أو المستندات أو سياسة اللغة عند غياب القسم.
- **البنود الحرفية:** فاصل محدد للجمل والقوائم، يحفظ الترتيب و«أو» والأرقام والتواريخ والجمل الشرطية. يُسمح بعلامات الترقيم وإزالة علامة القائمة وواو الربط في «وإثبات» كما في المثال المطلوب. لا استنتاج عمر أو جنسية أو اختبار أو حد أدنى.
- **Manual:** اعتماد بند واحد بمسار PATCH خاص، وسبب مراجعة وفاعل موثّق وIf-Match. تُحفظ سلسلة التعديلات في `metadata.eligibilityAuthoring` مرتبطة بالنص الأصلي. قفل الإصدار والتدقيق وoutbox في المعاملة الموجودة؛ لا يجوز تزوير الأصل أو اعتماد بند عبر PATCH العام.
- **Enrichment:** تبقى سياسة اللغة ومراجعتها والسجلات القديمة ومراجع الاختبارات في أماكنها؛ لا تنشئ بنودًا معروضة. تصحيحات أهلية المراجعة تحفظ كدليل مراجعة فقط. النقل الذري والمسار القديم للنقل ينشئان بنودًا من القسم الأصلي حصريًا.

## الواجهة والأثر

عنوان واحد «الشروط ومعايير التقديم» ومربعات التصميم الحالي بخط Cairo. لا أقسام مولّدة للإعفاءات أو الاستبعاد أو إرسال الدرجات. لكل بند محرر وسبب اعتماد وزر «حفظ هذا الشرط» مستقلان؛ النص الأصلي متاح للتتبع. الحالة الفارغة: «الشروط غير مذكورة في المصدر». تحرس الصفحة مسودة البند عند المغادرة وتتحقق من إعادة قراءة السجل بعد الحفظ.

لم يُغيّر المخطط، ولم ينفّذ backfill أو ترحيل أو حذف أو إعادة استيراد. تغيير البند يكتب metadata وإصدار المالك فقط؛ اختبارات المستودع تثبت عدم كتابة مجموعات العلاقات أو مسح سجلات الإثراء. لا حفظ تجريبي على القاعدة الأصلية. إذا افتقد سجل قديم أي دليل للقسم الأصلي، يظهر فارغًا إلى أن يُتاح مصدره؛ لا نستخدم الإثراء لتعويضه.

## التحقق

اختبار الملف الفعلي يطابق سجل 0094 / `SCH-OC-0051` بالنص الأصلي ويثبت البنود الستة المطلوبة حرفيًا، ويختبر 15 سجلًا آخر من الملف دون إدخال كلمات من الإثراء. تشمل الاختبارات أيضًا اختلاف عدد البنود، القسم المفقود والفارغ، الاختبارات المذكورة صراحةً، الأرقام العشرية، القوائم والجمل الشرطية، فصل المراجعة، حفظ بند منفرد وإعادة قراءته، تزوير الأصل، وفشل الإصدار القديم. نتائج البناء والفحص التمهيدي والتفاعل على الأصلية تحفظ بعد التنفيذ في إيصالات منفصلة؛ لا يستنتج نجاح المتصفح من HTTP فقط.

نجحت 241 حالة في 34 ملف اختبار مستهدف، وبناء جميع المشاريع، وTypeScript، وESLint دون أخطاء (تحذيرات any ضمن ملفات الاختبار الحالية)، وجودة المصدر دون دورات أو مخالفات وصولية. نجح فحص التدقيق بعد تسجيل مسار PATCH الجديد، دون إسقاط أي ضوابط، والفحص التمهيدي 40/40.

## الملفات المعدلة

- المصدر والعقد: `packages/domain/src/scholarships/ScholarshipSourceEligibility.ts`، `packages/domain/src/index.ts`، `scripts/import/ScholarshipMasterGuideReader.ts`.
- الاستيراد: `packages/application/src/scholarships/import-center/ScholarshipImportAtomicTransferUseCase.ts`، `ScholarshipImportSourceReview.ts` في المجلد نفسه، و`packages/application/src/scholarships/use-cases/ScholarshipImportPromotionUseCase.ts`.
- الحفظ والتدقيق: `packages/application/src/scholarships/use-cases/AdminScholarshipUseCases.ts`، `apps/api/src/presentation/api/router/ScholarshipAdminRouter.ts`، `docs/remediation/evidence/section-02/admin-mutation-audit-inventory.json`.
- واجهة الإدارة: `apps/admin/src/api/scholarshipCatalog.ts`، `apps/admin/src/pages/ScholarshipCatalogDetailPage.tsx`، والملفات `ScholarshipEligibilityCriteria.tsx`، `ScholarshipDetailReadView.tsx`، `ScholarshipContentEditor.tsx`، `ScholarshipEditorValidation.ts`، `scholarship-detail.css` ضمن `apps/admin/src/features/scholarships/`. أزيل `ScholarshipCriteria.ts` القديم الذي كان يفصّل الإثراء إلى بنود.
- الاختبارات: `packages/domain/tests/scholarships/ScholarshipSourceEligibility.spec.ts`، `apps/admin/tests/scholarships/ScholarshipCriteria.spec.tsx`، `apps/api/tests/presentation/api/router/ScholarshipAdminRouter.spec.ts`، `packages/infrastructure/tests/scholarships/PrismaScholarshipRepository.spec.ts`، و`AdminScholarshipUseCases.spec.ts` و`ScholarshipImportAtomicTransferUseCase.spec.ts` و`ScholarshipImportSourceReview.spec.ts` ضمن `packages/application/tests/scholarships/`.
