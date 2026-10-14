# الأقسام 15 و16 و17 — إكمال إصلاحات المصدر

- المستودع: `wegdangamil2022-oss/MANARATAK-First-`.
- الفرع: `codex/complete-sections-15-17-source-20261014`.
- المصدر الأساسي: `main@4e203a88ac766a5da6af3e726fe7f6547c531ae0`؛ أعيد fetch أثناء العمل وبقي main على المصدر نفسه.
- المرجع: القسم 15/15.FG،16/16.FG،17/17.FG في `MANARATAK_ADMIN_REVIEW_CODEX.md`.
- الترقيم: `feat/section-17-enterprise-ai-platform` و`section-17-implementation.md` يعالجان القسم18 AI، ولا يُستخدمان دليلًا لإغلاق LOC-ADM.
- النطاق: مصدر وTypeScript واختبارات محددة ببدائل معزولة وHTTP محلي وReact test renderer فقط. لا قاعدة أو مزوّد أو عامل حقيقي أو E2E ثقيل أو نشر.

## القسم 15

إصلاحات `09159436` المدمجة سابقًا محفوظة: تركيب مسارات catch-up/certificates/replay/reminders/tracker owners في عامل الخادم الفعلي، حماية ترتيب الشهادة البديلة/الأصل، فحص409 وإعادة التأكيد، وفلاتر triage للوقت والحالة ومصدر التدهور. لم تُعد كتابة هذه الوظائف بلا حاجة.

فحص TypeScript الجديد يشمل مشاريع المصدر المتأثرة. suite هذه الجولة يغطي SourceGaps، التركيب الفعلي للعامل، HTTP الدعم، وواجهة الإدارة. أعيد فحص fixtures التذكيرات/gateway/use cases التي سجل تقرير13 أكتوبر إخفاقاتها قبل تعديلها. النتائج الفعلية محفوظة في الأدلة، ولا تنسب إلى فحص قاعدة بيانات أو عامل حقيقي.

`STU-ADM-026` خارج حكم اكتمال الأكواد؛ لا يحوّل تأجيل التشغيل إلى نقص مصدر.

## القسم 16 — إصلاح الملاحظات الخمس

| المتطلبات | الإصلاح |
|---|---|
| CMS-ADM-016/017 | `saveBlock` يمنع تبديل schemaId لكتلة قائمة، والواجهة تعطل حقل المخطط عند التعديل؛ لا يفسر payload الجديد بمخطط قديم. |
| CMS-ADM-008/017 | `verifyAssetIds` يطبق سياسة حقوق EAP العامة عند قرار نشر الكتل/المجدول، إضافة إلى classification/trust. الحقوق غير المحددة تبقى advisory حسب سياسة المالك القائمة؛ لم تُخترع رخصة. |
| CMS-ADM-004/022 | قراءة الإدارة تميز `hasPublicSnapshot`؛ الأرشفة تقبل snapshot المنشور أثناء مسودة التعديل، وتطلب سببًا وتثبت الفاعل/السبب والتقاعد في معاملة المالك. |
| CMS-ADM-012/013 | المهمة التي سبقتها publication حالية تُلغى بصراحة تحت lease/identity/version ومعاملة وتدقيق؛ لا تبقى PROCESSING ولا تُحسب نشرًا جديدًا. |
| CMS-ADM-011 | أخطاء/عدم جاهزية Redis ترصد برسالة آمنة؛ العقد canonical owner reads + bounded TTL، ولا يدعي تشغيل purge/CDN consumer غير موجود. |

`CMS-ADM-030` وإثباتات التشغيل الثقيلة مستبعدة من الحكم بطلب المستخدم.

## القسم 17 — مصفوفة إصلاح المصدر

| البنود | التنفيذ |
|---|---|
| LOC-ADM-001 | بوابة source-controlled للإنجليزية في routing/SEO/sitemap/prerender؛ استخراج47 مفتاحًا للنصوص الأساسية من PublicTemplateApp مع AR/EN، وفحص JSX للنسخ غير المترجمة عند طلب فتح البوابة. |
| LOC-ADM-002 | منع mode عند transfer service وعند repository قبل أي transaction، دون override من request؛ لا تفعيل للمحتوى. |
| LOC-ADM-003 | approvalId من سلطة Governance الحالية، digest للهدف/القيمة/handoff، maker/checker مستقلان، وإعادة فحص أذونات المالك عند النقل. الفاعل يأتي من mutation context؛ publication HTTP يأخذه من الجلسة. |
| LOC-ADM-004 | النقل يستبقي النص المنشور ويخزن proposal لدى مالكه؛ `publishApproved` عملية مستقلة باعتماد مستقل وCAS/owner revision. النتيجة تميز approved/published/publicEligible. |
| LOC-ADM-005 | استهلاك الموافقة وتغيير بيانات المالك وaudit/outbox/receipt في transaction Serializable واحدة؛ audit/outbox يحملان hashes ودليل العملية دون النص الخام. |
| LOC-ADM-006 | اقتراحات أسماء Major في optionalFields المملوكة لـMajor حسب اللغة مع evidence وحالة؛ لا تستبدل الاسم العام قبل publication. |
| LOC-ADM-007 | ownerRevision/reviewStatus/sourceDigest ضمن snapshot ومقارنة النسخة النهائية تحت owner lock، حتى إذا بقي النص نفسه. |
| LOC-ADM-008/009 | presence مستقل عن publication readiness؛ حالة أصحاب التخزين القديم UNKNOWN وليست ادعاء publication من وجود نص. |
| LOC-ADM-010 | GET workspace يفلتر الخادم قبل العدد والصفحة عبر projection قراءة من owner tables؛ repeatable-read للعدد/الصفحة وGLOBAL معلنة. |
| LOC-ADM-011 | source locale يختار current/verified ثم تاريخ الاستيراد/المصدر، والتعارض المتعادل AMBIGUOUS بدل ترتيب المصفوفة. لا يدعي verification دون دليل. |
| LOC-ADM-012 | University/Major/Tests تعيد provenance/resolvedLocale؛ الواجهة تحفظها وتعرض تنبيه مصدر/fallback. |
| LOC-ADM-013 | أقسام Major المترجمة تحتاج PUBLISHED؛ APPROVED وحده لا يكفي. سياسة P9 blocks تظل APPROVED في نسخة الاختبار المنشورة حسب مالكها، ولا توحد enums بين المجالات. |
| LOC-ADM-014 | alternates تتبع اللغات المسموح بها بدل ar/en غير المشروط، وتحذف الوسوم القديمة؛ sitemap/prerender لا يعلنان الإنجليزية المقفلة. |
| LOC-ADM-015 | تغيير لغة الويب ينتقل عبر URL مع query/hash؛ initialization وAPI locale يستمدان الرابط؛ setLanguage/t مستقران بين renders. |
| LOC-ADM-016 | preparation يرفض IDs المجالات غير المدعومة بـUNSUPPORTED_TARGET_OWNER، وworkspace يصرح University/Major فقط للاستيراد. |
| LOC-ADM-017 | required-field readiness منفصلة عن الاسم: University name/description، وMajor الاسم ذو evidence وأقسامه المنشورة؛ missing/fallback/approved لا يعد fullyLocalized. capabilities التي لا تقدم دليل field publication تعلن UNKNOWN، ولا تخلق دليلًا بديلًا. |
| LOC-ADM-018 | safe browser storage يمنع سقوط initialization/legacy redirect عند SecurityError أو غياب window. |
| LOC-ADM-019 | literal key checks لكل Web/Admin محفوظة، وأضافت الجولة JSX copy gate واختبار button/aria-label عميق؛ ليس الادعاء القديم أنها تفحص ملفين فقط. |
| LOC-ADM-020 | تعدد locale query يرفض بدل اختيار آخر قيمة. |
| LOC-ADM-021 | receipt owner-scoped دائم لـAPPLIED/NO_CHANGE؛ يثبت approval/actor/reviewer/digest/handoff، ويمنع replay مختلفًا. لا يخزن نسخة ثانية للنص. |
| LOC-ADM-022 | أربعة اختبارات React خفيفة: stale domain detail، منع الكتابة، حفظ مسودةEN عند حفظAR، ومنع إعادة الكتابة بعد failed readback. |
| LOC-ADM-023 | GLOBAL scope، canonical source، حالة proof صريحة، migrationRequired/capability، وقيم pending/rejected/published/name availability/readiness منفصلة. |
| FGA-17-001 | قائمة مراجعة read-only بـdomain/locale/reviewState/updatedFrom/page مع owner grant وعدد خادمي وروابط صفحة المالك؛ لا يملك المركز موافقة موازية. |

### حدود واجهة الإنجليزية ونقل المحتوى

`TRANSLATION_CONTENT_MODE=INFRASTRUCTURE_ONLY` و`PUBLIC_ENGLISH_COPY_READY=false` محفوظان. بوابة الإنجليزية مغلقة حتى parity أوسع للقالب؛ لم تُعلن هذه الجولة ترجمة كل المكونات المتداخلة أو جاهزية الإنجليزية للإطلاق. فاحص JSX محافظ: يرصد literals عربية، وليس شهادة أن جميع تلك الحالات تُعرض في EN. فتح اللغة أو authoring لاحقًا يحتاج الأدلة والسياسة المقررتين في الخطة؛ لا يكفي قلب علم في request أو نجاح اختبارات المصدر.

مصدر القالب الأساسي استخرجت نصوصه، وبقية النصوص/محتوى المالك لا تُترجم أو تُنشر تلقائيًا. لا يعد هذا تشغيلًا للترجمات ولا شهادة production. `LOC-ADM-024` والتشغيل بعد28 مستبعدان من نواقص الأكواد الحالية.

## تحقق الجولة

Node22.23.3؛ npm lockfile installation مع lifecycle scripts معطلة. Prisma generation محلي فقط، دون URL أو اتصال أو migration.

- TypeScript: مشاريع shared/domain/application/infrastructure/API/Admin/Web نجحت.
- Vitest:108 اختبارات في18 ملفًا، كلها نجحت،16.18 ثانية في الجولة النهائية.
- React interaction: ضمن suite؛4 اختبارات فعلية على المكونات، بلا browser E2E.
- Node copy-gate:2 اختبار، نجاح.
- فحوص translation source وsource quality: نجاح؛ package cycles=0،file cycles=0،accessibility findings=0.
- ESLint المستهدف:0 errors،2 warnings لrefs عدادات إبطال الطلبات في cleanup؛ ليست refs DOM. لم يغير baseline.
- git diff --check: نجاح.

fixtures القسم15 الإضافية:32 اختبارًا في3 ملفات، كلها نجحت خلال4.31 ثانية. المجموع140 اختبار Vitest +2 Node. الأدلة في `evidence/sections-15-17-20261014/section15-final-fixtures.txt`.
لا تطلق الجولة suite العامة، ولا build/E2E عام أو database integration.

## الترحيل والتراجع

`20261014010000_owner_translation_receipt/migration.sql` تعريف مصدر لreceipt فقط. لا تغيير للترحيلات القديمة، ولا تطبيق على قاعدة. السجل يحتفظ بدليل أثر/قرار دون النص المترجم؛ لا ينقل canonical ownership إلى Localization أو Authorization.

نقل/نشر الترجمات يبقى مقفلًا. قبل أي تمكين لاحق يلزم توافق schema/client والتدقيق/outbox ومراجعة retention/backup وفق مالك البيئة. التراجع التشغيلي لا يحدث هنا: تعطيل transfer/publication قبل rollback الكود؛ حذف receipt table لا يتم إلا في بيئة مأذونة مع صون أدلة التدقيق/العمليات. schema الحالي جزء من source artifact، وليس دليل تطبيقه.

لم يُدمج الفرع إلى main، ولم يُنشر. لا تغير في القسم18 أو تفعيل paid AI/إشعارات/خدمات خارجية.

## متابعة مكونات الواجهة — 2026-10-14

أضيف1190 مفتاحًا دلاليًا متطابقًا إلى قاموسَي Web العربية والإنجليزية. شمل الاستخراج المكونات المتداخلة: التنقل، البحث، المفضلة، الأدوات، حساب الطالب، الدورات، وواجهات تفاصيل الجامعة والمنحة والتخصص. شمل النص المرئي و`aria-label` و`title` و`placeholder` و`alt`، وتسميات الحقول المنشورة والأعداد والنصوص ذات المعاملات. قيم الفلاتر ومعرفات الكيانات والمحتوى القادم من المالك محفوظة؛ ترجمة تسميات قيم الفلاتر منفصلة عن القيم المستخدمة في الطلبات والمقارنة.

حقول البحث والمكونات ذات الاتجاه الصريح تستخدم اتجاه مزوّد اللغة، والمحاذاة تستخدم بداية النص. تسمية زر المفضلة الافتراضية مترجمة، مع احترام تسمية المستدعي. مبالغ المنح تستخدم لغة العرض دون تحويل العملة أو تعديل القيمة. مزوّد اللغة يدعم المعاملات المسماة باستبدال حرفي، وفاحص مفاتيح القواميس يغطي استدعاء المترجم بأسماء مستعارة ومعاملات إضافية.

**حدود الاكتمال:** بوابة الإنجليزية تبقى`false`. كل1090 ملاحظة متبقية من فاحص النصوص الموسع تقع في`CourseStudyRoomView.tsx`، الذي يتضمن مادة محاضرات عربية ومحتوى نموذج تعليمي مطولًا؛ لم يُعلن اكتمال ترجمة هذه المادة أو اعتمادها. استخرجت39 تسمية تحكم أساسية منه، دون استبدال المادة أو نشر محتوى غير معتمد. عدم وجود ملاحظات في بقية المكونات بهذه الأداة ليس إثباتًا لتغطية كل البيانات أو كل مسارات العرض. لا يزال اكتمال المحتوى المنشور ودليل التشغيل شرطًا منفصلًا عن قواميس الواجهة، ولا يجوز إعلان إغلاق إطلاق الإنجليزية.

**التحقق الإضافي:**53 اختبار Vitest في9 ملفات، كلها نجحت خلال8.92 ثانية، بينها9 اختبارات عرض/سلوك جديدة للمكونات مع لغة إنجليزية اصطناعية دون تفعيل مساراتها العامة؛ و5 اختبارات Node لبوابة النصوص ومفاتيح الترجمة. فحص TypeScript لـWeb، ومفاتيح القواميس على كامل مصادر التطبيقات، وفحص نقاء النص العربي نجحت. ESLint المستهدف:0 أخطاء؛ التحذيرات التفصيلية القائمة في مكونات القالب لا تُعلن مغلقة. عدلت تجهيز اختبارات العرض القائمة لتغليف المكونات بمزوّد اللغة الحقيقي كما في التطبيق.

الأدلة الإضافية:`evidence/sections-15-17-20261014/public-copy-followup/`. لا اختبارات ثقيلة، ولا اتصالات بقاعدة، ولا ترحيلات أو مزوّد حي أو تشغيل عامل أو نشر. حالات التحقق في الجولة السابقة محفوظة تاريخيًا، ولا تُجمع أعداد الجولتين لأن بينهما اختبارات مشتركة.
