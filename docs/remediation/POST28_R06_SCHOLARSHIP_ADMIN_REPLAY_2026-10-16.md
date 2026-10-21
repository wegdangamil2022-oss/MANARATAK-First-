# R06 — أوامر المنح وصلاحية إعادة الرد والقراءة العامة

التاريخ:2026-10-16. الفرع:`fix/post28-ci-environment-inventory-20261016`.

**R04:PASS/CLOSED محليًا؛ R05:BLOCKED؛ R06:PARTIAL وليست CLOSED.**

عند الاستئناف تطابق HEAD المحلي والبعيد مع `3719302024885ecd08199639c3f508de76a877ce`، وشجرة العمل نظيفة. استُكمل العمل المحفوظ عند127 حالة PostgreSQL مختلفة، دون إعادة مجموعاتها غير المتأثرة.

## النتيجة

**22 حالة مختلفة جديدة ناجحة =18 لأوامر المنح وحدود Admin +4 للقراءة العامة. التراكمي149=127+22.** هذه حصيلة أدلة علىSHAs مختلفة، وليست ادعاءً بنجاح جميع الحالات علىSHA واحد أو قبول جميع سيناريوهاتCD-006/R06.

| SHA | المجموعة | المكتشف | المنفذ | الناجح | الفاشل | المتخطى/المستبعد |
|---|---|---:|---:|---:|---:|---|
|`77ee49859b19adb923f0c98e5d6bbee3d3c75fc8`|scholarship-admin قبل الإصلاح|17|17|16|1|0|
|`cf91e81332c722bb701b4d4ed1333710444890af`|إعادة بعد سحب الصلاحية؛ تعديل وسيط|18|1|1|0|17 مستبعدة صراحةً|
|نفس SHA|إعادة مشروعة؛ تعديل وسيط|18|1|1|0|17 مستبعدة صراحةً|
|`6b5f8db81ef339fc7ea41b4797a4de6fc2480607`|scholarship-public-relations|4|4|4|0|0|
|`84dbfcdff3cb274022dadf542fa4d25f1735c28b`|إعادة بعد سحب الصلاحية؛ الحد النهائي|18|1|1|0|17 مستبعدة صراحةً|
|نفس SHA|إعادة مشروعة؛ الحد النهائي|18|1|1|0|17 مستبعدة صراحةً|

لا تجمع الإعادتين الوسيطتين مع النهائيتين؛ لهما هويتا الاختبار نفسيهما. لا تجمع الاستبعادات17 مع المنفذ أو الناجح. تقرير Vitest الخام لكل اختيار نهائي يحوي1 passed و17 skipped، بينما المشغّل الرسمي يثبت جرد18 كاملًا ونجاح الحالة المحددة فقط مع `fullProfileAcceptance=false`.

قبل أول تشغيل17، تعثر الجمع بسبب غياب artifact محلي لحزمة `@manaratak/config`:منفذ0 وناجح0، وليس فشل منتج. بُنيت الحزمة بـNode22 ثم استُعمل مجلد نتائج جديد على المصدر النظيف نفسه والعقد نفسه؛لم يكن أي اختبار DB قد نُفذ في محاولة الجمع المتعثرة.

## الخلل والإصلاح

أثبتت حالة PostgreSQL/HTTP على`77ee4985` أن طلبًا نجح ثم سُحبت صلاحية صاحبه منDB، وبعد ذلك أعاد مفتاح idempotency الرد السابق بـ200. السبب أن حد الرد المحفوظ العام كان يسبق حارس `admin:scholarships:manage`.

أضيف فحص الصلاحية الحالية لمسار المنح داخل callback الإدارة القائم **قبل** استدعاء idempotency، وبمطابقة prefix غير حساسة لحالة الأحرف كما يفعل mount الأصلي. بقي حارس المسار الأصلي أيضًا. على`84dbfcdf`:

- الإعادة بعد سحب الدور ترجع403 ولا تحمل `Idempotency-Replayed`، والـrevision تبقى2 دون أثر إضافي.
- الإعادة مع بقاء الإذن ترجع200 و`Idempotency-Replayed=true`، والرد مطابق، وكل حقائق المالك والنسخ والدورات والتدقيق وoutbox لا تتغير.

الصيغة الوسيطة`cf91e813` نجحت تشغيليًا في الحالتين، لكن فاحص التدقيق رفض standalone permission mount بـ`ADMIN_ROUTER_BINDING_UNRESOLVED:/admin/scholarships`. أعيد تنظيم الفحص داخل الحد القائم دون تعديل قواعد الفاحص. نجح بعدها بـ444 handlers و443 unique endpoints. أعيدت الحالتان المتأثرتان فقط على مختبر وSHA جديدين؛لا اعتماد للصيغة الوسيطة كمرشح قبول نهائي. قراءة المنح العامة على6b5f8db8 مستقلة عن شكل mount، ونجاحها لا يقبل التطبيق فيذلكSHA.

الاختبار النهائي يستخرج callback المثبت فعليًا من`apps/api/src/app.ts` عبر TypeScript AST ويشغله مع store وevaluator الحقيقيين، ويرفض وجود حدين ملتبسين. يوجد اختبار مصدر يربط موضع الفحص بصلاحية المنح وبحارس router القائم؛لا fixture ناجحة منفصلة عن wiring النهائي.

## أوامر المالك وHTTP —18 حالة مختلفة

المكونات الحقيقية: `AdminScholarshipUseCases`، `PrismaScholarshipRepository`، `PrismaScholarshipCanonicalLookupGateway`، owner program read port، منسق المعاملات وunit of work ومستودعا audit/outbox. أثبتت11 حالة مالك:

1. تطابق برنامج/جامعة، revision2، child resolved، نسخةDRAFT جديدة ودورةDRAFT مرتبطة بها، وتدقيق/outbox واحدان.
2. رفض الجامعة الأجنبية دون تغيير root/links/versions/cycles/sponsor/audit/outbox.
3. رفض برنامج مفقود أو مؤرشف أو جامعة غير منشورة قبل الكتابة.
4. رفض child keys مكررة دون نسخة أو دورة أو أثر جزئي.
5. رفض actor/reason/revision مفقودة أوrevision قديمة.
6. حقن PostgreSQL حقيقي عندoutbox:إثبات الوصول إلى الحقن وPrisma P2010/meta SQLSTATE22012، ثم تطابق كل الحقائق مع ما قبل المعاملة.
7. اتصالان مستقلان بدورapplication:نجاح واحد ورفض stale للآخر، ونسخة واحدة إضافية وأثر واحد.
8. بقاء child ID عند التعديل مع append للنسخة البنيوية التالية.
9. تغيير العلاقة يبطل READY_TO_PUBLISH إلىREADY_TO_REVIEW دون نشر المسودة.
10. رفض تعديل منحة منشورة أو مؤرشفة.
11. سحب نشر الجامعة من الاتصال الآخر بعد canonical lookup وقبل الكتابة:المستودع يعيد قراءة دليل المالك داخل المعاملة ويرفض التغيير دون آثار. الغلاف هنا barrier علىlookup الفعلي، لا بديل ناجح لنتيجته.

حالات HTTP السبع تستعمل Express/Supertest وScholarshipAdminRouter وstrict Admin guard، وJWT RS256 وجلساتDB وprincipal lifecycle validator وCSRF حقيقيًا. evaluator يقرأ roles/assignments/policies من مستودعاتPrisma، وidempotency store حقيقي. أثبتت401 دون مصادقة، actor الحقيقي في التدقيق،403 للدور الخطأ أوالمسحوب،428/409 للـIf-Match المفقود/القديم،400 لحقنactor بالـbody و403 لغيابCSRF، ثم حالتيreplay أعلاه.

**الحدود:**مفاتيحJWT وCSRF عابرة محلية؛الأدوار والمعرفات صناعية. لاlogin/refresh أوMFA/step-up أوcredentials repository الاختيارية أوduty/emergency policy في هذا التركيب، ولاboot كامل منartifact أومتصفح. لم يُشغل globalMutationAuditMiddleware للطلب/النتيجة فيتركيبHTTP؛التدقيق المثبت هنا هو تدقيق المالك الذري. سجلات رفضHTTP العامة ليست جزءًا من قبول هذه الجولة. الإصلاح والدليل خاصان بحد المنح؛لا إعلان تحقق جميع مساراتAdmin الأخرى منreplay. لم ينفذ مسارImport أواعتماد مصدر أوpublish workflow كاملًا.

## القراءة العامة —4 حالات

استُعمل مستودع المنح وowner port وPostgreSQL الحقيقيون:

- النتيجة والعدد في search المقيّد بجامعة/برنامج وفيreverse program page يساويان1 للربط الصحيح.
- زوج برنامج/جامعة أجنبية يرجع0؛وبعد زرع link خاطئة ذاتFKs فردية صحيحة،تبقى data والعدد0 في الاتجاهين.
- سحب نشر الجامعة،وأرشفةmajor،وحالةRETIRED للـprofile،ونسخةmajor DRAFT،وبرنامجARCHIVED تمنع العلاقة والعدد فورًا. استعادة الحالة تعيد الأهلية؛هذه حالة اختبار واحدة ذات خمسة تبديلات،وليست خمس حالات إضافية.
- سحب نشر المنحة أو غياب نسخة منحة PUBLISHED باستبدالها بـSUPERSEDED يمنع الاتجاهين.

الصفوف المنشورة هنا **fixtures تاريخية صناعية معلنة**؛ليست موافقات نشر/تحقق/ترجمة. لم تعتمد اختبارات اقترانdegree+major التجاري ولاDEC-01…07،ولم تُشغلPublic HTTP/graph/browser لكل تلك العلاقات أو اتساق عدة صفحات تحت التزامن.

## المختبرات والفحوص

أربعة مختبرات DB-T جديدة بالأدوات الرسمية، بـNode22.16.0 وPrisma5.22.0 وصورة PostgreSQL16 المثبتة. لا إعادة ربط لعقد قديم:

| SHA | Run | Port | server identity |
|---|---|---:|---|
|`77ee4985`|`991ed44a-bd4d-4aa3-b990-57b58aeb79d7`|15432|7697327898901151787|
|`cf91e813`|`a9c6f03a-fea4-4899-8e45-25abe4a5c2a9`|15433|7697328623084752940|
|`6b5f8db8`|`8571ef71-4b65-4ae7-8168-36c26d31dbb2`|15434|7697329147934593070|
|`84dbfcdf`|`e7238ef4-0bac-4127-9feb-96974f4ef973`|15435|7697329738210828331|

في كل مختبر:110 migrations مطبقة ومطابقة بالأسماء والترتيب والبصمات،0 partial/rolledBack، وvalidate/status/schema diff وcatalog preflight ناجحة، و282 جدولًا. الإعداد بـ`post28_tx_migrator` والاختبارات بـ`post28_app`، دون DDL أوledger grants أوملكية قاعدة. لم تزد قائمة DML عن55 جدولًا المصرح بها سابقًا؛281 جدول تطبيق للقراءة. الأسرار والعقود والسجلات في`/workspace/scratch/post28/labs/` خارج Git. ثبات port أوOID لا يعني ثبات الخادم أوالعقد.

فحوص المصدر:27 provisioning (تتضمن26/25 السابقة؛لا تجمع)، و5 replay/idempotency contracts، و19 audit coverage contracts؛ كلها ناجحة دون skip. بناء TypeScript لـconfig ثم API نجح؛ فاحص audit والـarchitecture وsource quality نجحت. الملفات الجديدة0 errors/0 warnings؛ `app.ts` فيه0 errors و49 تحذيرًا قائمًا، ولم يضف التعديل any جديدة. فحوص التسليم وبصماتها فيchecks.json؛الفحوص التطويرية قبل freeze موثقة كتشخيص، ولا ينسب تشغيل DB إلىSHA التقرير.

## الأدلة والحالة التالية

- [الفشل الأصلي و16 نجاحًا](../reviews/evidence/post28/77ee49859b19adb923f0c98e5d6bbee3d3c75fc8/r06-scholarship-admin-initial/status.json).
- [القراءة العامة4](../reviews/evidence/post28/6b5f8db81ef339fc7ea41b4797a4de6fc2480607/r06-scholarship-public-relations/status.json).
- [رفض الإعادة بعد السحب](../reviews/evidence/post28/84dbfcdff3cb274022dadf542fa4d25f1735c28b/r06-scholarship-replay-final-denied/status.json)، [الإعادة المشروعة](../reviews/evidence/post28/84dbfcdff3cb274022dadf542fa4d25f1735c28b/r06-scholarship-replay-final-allowed/status.json).
- [مصفوفةR06](../reviews/evidence/post28/84dbfcdff3cb274022dadf542fa4d25f1735c28b/r06-scholarship-continuation/required-case-status.json):149 حالة مختلفة كأساس جزئي، و0 قبول كامل لسيناريوهات المصفوفة26. الأدلة السابقة محفوظة بدون إعادة كتابة.

**الاستئناف التالي:** CD-001 لعلاقات geography عبر أوامر المالك، ثم CD-010/011/018/019/028 والأجزاء المستقلة المتبقية، وفحص replay permissions لبقية مسارات Admin. لا تكرر149 حالة إلا إذا مسها التغيير. اكتمال Admin/DB الجزئي في CD-006 لا يعوض نشر المالك والـPublic HTTP/graph الكاملين.

عوائق R05 والـDEC المعلقة باقية؛ وكذلك متطلبات storage/scanner/sanitizer والـattestation وإبطال URL سبق تسليمه، وpayment/refund/settlement بمزود مختبر مصرح. لا تصنف عدم كتابة بقية الحالات المستقلة عائق خدمات تلقائيًا. لم يمس Neon أو الإنتاج أو main أو النشر أو مزود خارجي، ولم تتغير Prisma Schema أوmigrations التاريخية.
