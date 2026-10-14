# القسم 17 — إصلاح مصدر الترجمة والتعدد اللغوي

- المستودع: `wegdangamil2022-oss/MANARATAK-First-`.
- الأساس: `main@cb65e7652fb1edde8371d11804ac4d87f729b5b8`، بعد إكمال المصدر في القسمين15 و16.
- المرجع: **القسم17/17.FG — LOC-ADM** من `MANARATAK_ADMIN_REVIEW_CODEX.md`؛ لا خلط مع تقارير `section-17-implementation.md` القديمة التي تعالج AI في القسم18/P17.
- المصدر السابق المراجع: إصلاحات الترجمة وواجهة الويب على `codex/complete-sections-15-17-source-20261014`؛ نقلت ملفات هذا النطاق فقط وأضيفت الإصلاحات والتحقق الحاليان. لم يُدمج الفرع كله أو يُستبدل إكمال15/16.
- النتيجة: إصلاحات حماية المصدر والتحقق المستهدف مكتملة؛ **RUNTIME_DEFERRED** لـLOC-ADM-024. **إطلاق الإنجليزية وتفعيل نقل/نشر المحتوى مقفلان**؛ لا ادعاء اكتمال ترجمة المحتوى أو جاهزية إنتاج.

## مطابقة المخطط والمالك

UniversityTranslation وMajor/root/section metadata تظل مخزن المالك؛ canonical IDs وبيانات الأكاديميات لا تنسخ إلى مركز ترجمة جديد. المركز read-only projection من owner tables، وصلاحيات المجالات تفحص على الخادم. University/Major فقط يدعمان preparation/transfer؛ بقية المجالات تعلن capabilities وpublication evidence غير المتاحة بوضوح.

إضافة المخطط الوحيدة `OwnerTranslationTransferReceipt` تسجل digest/approval/actor/reviewer/outcome/handoff دون النص المترجم. هي دليل معالجة تحت مالك الجامعة/التخصص، وليست نسخة محتوى. mutation يستهلك موافقة Governance الدائمة مع تعديل المالك وaudit/outbox/receipt في Serializable واحدة؛ approval string/status من caller وحدهما لا يمنحان سلطة.

## مصفوفة LOC-ADM وإصلاحات المصدر

| البند | الإصلاح والتحقق الخفيف |
|---|---|
| 001 | `PUBLIC_ENGLISH_COPY_READY=false` مصدرية، ولا request/env علم يفتحها. routing/SEO/sitemap/prerender تفشل مغلقة؛ نصوص القالب والتحكم أُخرجت إلى قاموسيAR/EN. لا إعلان parity عام؛ غرفة الدراسة ما زالت تحتوي نصوصًا غير مكتملة. |
| 002 | assertion لوضع `INFRASTRUCTURE_ONLY` عند service ومرة أخرى في repository قبل transaction؛ HTTP publication يرفض403 قبل owner lookup ولا يقبل enabling request. |
| 003 | actor من mutation context/الجلسة؛ approvalId مصادق ودائم، digest للtarget/value/handoff، maker/checker مستقلان وأذونات المالك لكليهما؛ رفض forged checker/replay/stale approval. |
| 004 | transfer يخزن proposal عند المالك ويبقي النص المنشور؛ publication قرار مستقل بموافقة مستقلة، لا توسيع public filter إلى APPROVED. result يميز approved/published/publicEligible. |
| 005 | approval consumption وowner write وaudit/outbox/receipt في transaction واحدة؛ أدلة audit hashes دون raw text؛ failure test يمنع receipt نجاح، وليس إثبات DB rollback حي. |
| 006 | مرشح اسم Major ذو evidence/status في optionalFields المملوكة لـMajor حسب اللغة؛ لا استبدال للاسم العام قبل publication. |
| 007 | ownerRevision/reviewStatus/sourceDigest وowner lock؛ stale review/source مع النص نفسه يرفض، وNO_CHANGE يبقى دليلًا دائمًا لا تجاهلًا للموافقة. |
| 008/009 | الاسم المتاح منفصل عن public readiness؛ University published name+description عند المالك، وlegacy/overlay تخزين غير مثبت يعرض UNKNOWN لا اكتمال منشورًا مختلقًا. |
| 010 | فلاتر coverage/review/locale/time/search عند الخادم قبل total/page؛ repeatable-read للعدد والصفحة وGLOBAL معلنة. tests للعدد الخادمي80 مقابل صف صفحة واحد وSQL parameters/scoped owner؛ لا إثبات EXPLAIN/SQL engine. |
| 011 | اختيار source locale مستقل عن ترتيب المصفوفة؛ current/verified ثم تاريخ المصدر/الاستيراد، وAMBIGUOUS عند التعارض المتعادل؛ no proof invented. |
| 012 | DTO يحمل requested/resolved locale وavailability؛ University/Major تحفظ metadata وتنبه fallback. أُكمل مسار International Test عبر shared mapper وExam type إلى تنبيه المصدر في القالب. |
| 013 | Major localized sections تتطلب PUBLISHED؛ undefined/APPROVED لا ينشر قسمًا مترجمًا. سياسة P9 test blocks تبقى ضمن النسخة المنشورة وAPPROVED حسب صاحبها، دون توحيد enums بين المجالات. |
| 014 | alternates تتبع enabled + owner published locales وتحذف tags القديمة. أُغلقت فجوة CMS HTML/client SEO/live sitemap أيضًا؛ EN HTML/redirect404 مع noindex/no-store قبل owner read. synthetic test منفصل يثبت slugs الصحيحة عند سياسة test-enabled، دون فتح الإنتاج. |
| 015 | لغة URL تتحكم في initialization وAPI؛ switch يحفظ query/hash. RootLayout لا يركب child readers/metadata حتى تتطابق لغة المزوّد مع الرابط؛ cold EN مغلقة تنتقل إلىAR دون reader إنجليزي. |
| 016 | supported import owners صريحة University/Major؛ unsupported handoff يرفض `UNSUPPORTED_TARGET_OWNER` ولا ينشئ adapters أو ownership جديدًا. |
| 017 | required-field readiness مستقلة عن وجود اسم: University name/description، Major owner name evidence/published sections. missing/fallback/approved ليستfullyLocalized؛ unknown owner field publication لا يعد نجاحًا. gate الإنجليزي العام يبقىfalse. |
| 018 | safe storage catches SecurityError/غيابwindow؛ legacy locale redirect لا يعتمد على نجاح localStorage. |
| 019 | فحص كل مفاتيح Web/Admin، بما في ذلك aliases والمعاملات، وJSX rendered-copy gate واختبارات title/aria/button؛ لا ادعاء فحص ملفين فقط أو تغطية كل runtime data. |
| 020 | locale query مكررة ترفض400 بدل اختيار آخر قيمة؛ العربية default، واللغات غير المدعومة لا تؤول إلى نجاح. |
| 021 | receipt دائم لـAPPLIED/NO_CHANGE، scoped للtarget/locale/field/handoff، approval/digest/actor/checker؛ replay مختلف يرفض دون كتابة ثانية. |
| 022 | أربعة اختبارات تفاعل فعلية للمركز: stale detail، frozen writes، حفظ مسودةEN عند حفظAR، منع إعادة الكتابة بعد failed readback. ليست browser E2E. |
| 023 | عرض global scope/canonical source/runtime proof/capability/migrationRequired؛ availability/pending/rejected/published/readiness تبقى مقاييس منفصلة. |
| 024 | مؤجل بعد28: applied schema، real principals، owner transitions، browser/crawler/cache/rollback. لم يُشغّل أو يُحوَّل source success إلىruntime PASS. |
| FGA-17-001 | review work queue read-only بـdomain/locale/reviewState/updatedFrom/page وعدد خادمي وowner permission وروابط إلى شاشة المالك؛ لا approve/publish سلطة موازية للمركز. |

## إصلاحات إضافية أثناء التحقق الحالي

الفرع السابق لم يوحد English gate مع live CMS HTTP HTML/XML/client SEO. اكتشفت هذه الفجوة وأصلحتها في dependency بين17 و16، دون تغيير authoring أو snapshot owner. JSON owner APIs ما زالت تعطي locale requested/resolved تحت عقودها؛ إتاحة البيانات ليست تفعيلًا لقالب إنجليزي قابل للفهرسة.

أضيفت حدود خطأ HTTP للمركز: Zod400، قفل authoring403، stale409، owner target404، unavailable503، وتفويض403. الأخطاء غير المعروفة تمر إلى handler العام؛ لا raw exception أو translated text في رسالة النتيجة.

واجهت الاختبارات القديمة أربعة توقعات تعتمد على EN/indexing قبل بوابة الإطلاق أو شكل النص الحرفي السابق. حدثت assertions إلى شرط البوابة الحقيقي، مع tests مستقلة لسياسة synthetic enabled بدل إضعاف القفل. أخطاء fixtures اللاحقة (publishedAt/window) وإضافة Exam metadata type موثقة في evidence؛ النتائج النهائية أدناه فقط هي حالة المصدر الحالي.

## حدود النسخة الإنجليزية

قواميس الواجهة متطابقة ومفاتيح القالب/المكونات المستخرجة تغطي النص المرئي وARIA/title/placeholder/alt والفلاتر والأرقام والقيم ذات المعاملات، دون تغيير IDs أو قيم الطلبات أو العملة أو أسماء المصدر الأصلية.

**بوابة الإنجليزية تبقىfalse**. الفاحص يسجل **1090 ملاحظة rendered-copy في CourseStudyRoomView.tsx**، الذي يتضمن مادة محاضرات عربية مطولة ونصوصًا متبقية. هذه الجولة ليست ترجمة واعتمادًا لكل هذه المادة، ولا شهادة أن بقية البيانات/المسارات مكتملة. فتح الإنجليزية لاحقًا يحتاج معالجة copy/content parity ودليل المالك وفق الخطة؛ نجاح القواميس أو تغيير flag في طلب لا يكفي.

`TRANSLATION_CONTENT_MODE=INFRASTRUCTURE_ONLY` باقٍ؛ لا محتوى owner تُرجم أو نُقل أو نُشر تلقائيًا.

## النتائج الفعلية

- Node22.23.3؛ dependencies من main، دون إضافة مكتبات. Prisma generation محلي فقط لتوافق client مع migration source، بلا URL/اتصال قاعدة.
- `.section17-localization-vitest.config.ts`: **26 ملفًا /127 اختبارًا، كلها نجحت**؛18.74 ثانية إجمالية،1.50 ثانية test execution؛ maxWorkers=2.
- Node: **11 اختبارًا ناجحًا** لنسخ JSX/مفاتيح القواميس/نقاء النصوص؛ منفصلة عن127.
- TypeScript: `tsc -b packages/infrastructure packages/ui apps/api apps/admin apps/web --pretty false` نجحexit0 بعد إكمال Exam type وRootLayout.
- source-quality translation gate نجح، مع `DATABASE_MUTATIONS_ALLOWED=false DATABASE_ENVIRONMENT=source` لهذه القراءة المصدرية فقط وDATABASE_URL unset؛ لم يتصل بقاعدة.
- ESLint لـ131 ملفًا متغيرًا:0 errors،376 warnings؛ فحص التغييرات النهائية:0 errors،2 warnings، يتداخل مع الفحص السابق ولا تُجمع أعدادهما. تحذيرات المكونات/fixtures موجودة في evidence ولا تُعلن مغلقة.
- `git diff --check` نجح. لا suite عامة أو build/E2E عام أو worker/provider حقيقي أو نشر.

Logs وSHA256 في `evidence/section-17-localization-20261014/verification.json`. root rendering tests الاثنان وReact suite وsynthetic English tests كلها fixtures معزولة، لا تفعيل runtime.

## الترحيل والتراجع

`20261014010000_owner_translation_receipt/migration.sql` تعريف مصدر فقط؛ **MIGRATIONS_APPLIED=0**. لا تعديل للترحيلات السابقة ولا db push/seed/reset/backfill/transfer حقيقي.

قبل أي authoring enablement لاحق: schema/client متوافقان، صلاحيات المالك وGovernance، مراجعة احتفاظ/backup لأدلة receipt/audit/outbox، وقائمة ما بعد28. الرجوع الأول هو إيقاف نقل/نشر الترجمات واللغة الإنجليزية ثم rollback الكود مع الحفاظ على receipt/audit evidence. الجدول الإضافي يمكن أن يبقى عند rollback الكود؛ لا حذف أدلة أو DROP على قاعدة قائمة ضمن هذه الجولة.

الدفع إلىmain يستخدم `[skip ci]` التزامًا بالاختبارات الخفيفة فقط. لا تعد هذه الإضافات نشر تطبيق أو شهادة إنتاج، والقسم18/AI لم يتغير.
