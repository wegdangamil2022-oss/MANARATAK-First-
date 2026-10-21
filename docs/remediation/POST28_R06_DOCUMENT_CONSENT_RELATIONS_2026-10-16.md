# R06 — موافقة مراجعة الوثائق وعلاقات البرنامج الجامعي

التاريخ:2026-10-16. الفرع: `fix/post28-ci-environment-inventory-20261016`.

## النتيجة

**17 حالة PostgreSQL جديدة PASS،0 FAIL،0 SKIP. التراكمي85 حالة مختلفة=68 السابقة+10 وثائق+7 علاقات. R06 PARTIAL وليست CLOSED. R05 ما زالت BLOCKED وفق قرار الاستمرار المحلي المحدود؛ R04 تظل PASS_LOCAL.**

SHA اختبارات الوثائق: `10e0ddf1fa72697dae2c5597786c0707ef6c3687`.
SHA اختبارات العلاقات: `41fb7c90ccb732177a160677669634982fc61173`.
تقرير الأدلة محفوظ بcommit لاحق؛ لا تنسب اختبارات المصدر إلى commit التقرير.

## الأخطاء المثبتة والإصلاح

أظهرت الجولة المصدرية قبل الإصلاح6 فشل و9 نجاح:

- المستودع كان يقبل تسجيل وصول لمراجع فارغ أو أبيض؛ أضيف الرفض في use case قبل قراءة الوثيقة وفي حد المعاملة قبل التدقيق.
- المستودع كان يقبل موافقة يبدأ وقتها مستقبلًا؛ أضيف رفضها، مع رفض صريح لغياب نهاية الموافقة.
- قائمة انتظار المراجعة لم تكن تفحص بدء الموافقة أو انتهاء صلاحية الوثيقة؛ أضيفت شروط البداية<=الآن وexpiresAt فارغ أو مستقبل.

لا تغيير للـPrisma Schema أو110 migrations التاريخية أوDEC أو سياسات نشر المالكين. لم يُعدل كود علاقات الجامعة لأن الحالات المنفذة لم تكشف فشلًا فيه.

## التشغيل الفعلي

### document-consent —10 حالات

مستودع `PrismaStudentApplicationTrackerRepository` وuse case `StudentDocumentReviewUseCases` ومعاملات PostgreSQL والتدقيق وtimeline وoutbox حقيقية:

1. تسجيل وصول بموافقة حالية.
2. رفض المراجع الفارغ والأبيض دون audit.
3. رفض الموافقة المستقبلية واستبعادها من القائمة.
4. رفض الوثيقة المنتهية واستبعادها من القائمة.
5. سحب موافقة المالك، version2، وتدقيق وtimeline وoutbox متسقة؛ منع الوصول اللاحق.
6. رفض سحب طالب آخر دون تغيير الموافقة أو النسخة.
7. تنافس grant/withdraw من PrismaClientين مستقلين بالنسخة1؛ نجاح واحد وVERSION_CONFLICT للآخر، حدث واحد فقط.
8. نجاح فتح الوثيقة باستخدام بديل delivery محدد عند بقاء الموافقة.
9. سحب الموافقة من الاتصال الثاني أثناء استدعاء delivery؛ الفحص اللاحق يرفض إرجاع الرابط. يبقى audit الوصول السابق للسحب دليلًا صحيحًا.
10. طلب فتح بعد السحب يرفض قبل استدعاء delivery.

**حدود الدليل:** scholarship owner وasset policy وdelivery هي ports بديلة معلنة في هذه المجموعة، والـasset fixture صناعية وليست إثبات scan أو clean storage. لا URL خارجي فعلي أو خدمة تخزين أو HTTP/JWT. لا يثبت الاختبار إبطال رابط سبق تسليمه قبل السحب؛ مدة الرابط والـprovider الفعلي وسحب الرابط المصدر سابقًا تحتاج اختبار تشغيل مستقل. اختبار أثناء mint يثبت عدم إرجاع الرابط بعد السحب المحدد، وليس منع كل سباق ممكن بعد آخر فحص. لا ندّعي تحقق مسار attestation الكامل.

### university-relations —7 حالات

`PrismaUniversityProgramReadPort` وسياسة `isPublicUniversityProgram` وPostgreSQL حقيقية، وfixtures صناعية في6 جداول:

1. برنامج منشور بجامعة وتخصص وprofile ودرجة ونسخة متطابقة.
2. حدود university/program/degree الدقيقة وإزالة تكرار IDs.
3. سحب نشر الجامعة ثم التخصص يمنع القراءة العامة فورًا.
4. profile لدرجة أخرى أو دون مؤشر نسخة منشورة لا يؤهل البرنامج.
5. برنامج مؤرشف أو غير مربوط canonical لا يؤهل ولو صحت FKs.
6. رفض تحديث universityId/majorId/degreeLevelId إلى مراجع مفقودة بـP2003، وبقاء الصف الصحيح.
7. قراءة عدم النشر داخل transaction بواسطة `withTransaction` ثم rollback يعيد الأهلية الأصلية.

الجداول: University،UniversityAcademicProgram،DegreeLevel،Major،MajorLevelProfile،MajorVersion؛ بالإضافة إلى وثائق الطالب ومساحته وtracker وAssetRecord وAuditRecord وStudentTimelineEntry وTransactionalOutboxRecord في الجولة السابقة. لا إثبات لتوافق campus/unit أو دورة نشر scholarship أو test/version أو FK مركبة غير منفذة. وجود fixture نسخة صحيحة لا يثبت رفض كل ارتباط نسخة خاطئة بمالك آخر.

## المختبران والصلاحيات

| المجموعة | Run | Port | server identity | OID |
|---|---|---|---|---|
| الوثائق | ccf07591-e627-4d26-bbea-f91ee716b2f1 |15432|7697316604887633964|16386|
| العلاقات |69cbb0b3-c0e2-4b46-839f-9296d32583f8|15434|7697317112567377965|16386|

اسم DB في الخادمين المستقلين `manaratak_post28_transactions_test`، كلاهما DB-T جديد بالأداة الرسمية وPG16.15 وNode22.16.0 وPrisma5.22.0. تساوي الاسم/OID ليس تطابق الهدف: server/run/container مختلفة ومقيدة بـSHA. bootstrap للإنشاء فقط، `post28_tx_migrator` المحدود للإعداد و`post28_app` للاختبارات. لا alias إلىG/S/U/R ولا Neon.

في كل مختبر:110 migrations مطبقة،110 checksums متطابقة،0 partial/rolledBack؛ validate/status/diff ناجحة،schema diff exit0،282 جدولًا و281 application tables للقراءة. catalog preflight الرسمي ناجح. بقي التطبيق دونDDL أوledger grants. زيدت whitelist DML من27 إلى28 بإضافةtimeline، ثم34 بإضافة6 جداول fixture العلاقات؛ هذه grants للمختبر الصناعي، وليست سياسة إنتاج.

الأسرار والعقود والسجلات خارجGit تحت `/workspace/scratch/post28/labs/lab-AvKWLN` و`lab-nxl1LO`. صلاحية forwarder مؤقتة3ساعات؛ من بيئة أخرى أوSHA آخر أنشئ مختبرًا جديدًا ولا تعدّل العقد القديم.

## الفحوص المصدرية

- بعد إصلاح الأخطاء:15/15 حالة Vitest متأثرة PASS،0 FAIL/SKIP علىSHA الوثائق.
- حراس provisioning:21/21 علىSHA الوثائق، ثم22/22 علىSHA العلاقات؛21 داخلة في22 ولا تُجمع ثانية. عدد الحالات المصدرية المختلفة37=15+22.
- architecture/source quality ناجحة علىSHAي التشغيل. ESLint ملفات الاختبار الجديدة والأدوات0 errors/0 warnings.
- ESLint الملفات القديمة المتأثرة:0 errors و35 تحذير any قائمًا سابقًا. المقارنة مع `e74e2d91` تثبت24+11 قديمة و0 تحذيرات جديدة. محاولة --max-warnings=0 الأولى فشلت لهذا السبب؛ لا ندّعي أنها نجحت. أزيلت جميع تحذيرات any المضافة في الاختبارات الجديدة، دون تعطيل القاعدة أو تغيير baseline.
- secrets/organization ناجحة في جولة الوثائق، وتُعاد على التقرير النهائي. جرد البيئة307 أسماء فقط دون قيم؛لا إعادة مجموعات68 غير المتأثرة.

## الأدلة ونقطة الاستئناف

[الوثائق](../reviews/evidence/post28/10e0ddf1fa72697dae2c5597786c0707ef6c3687/r06-document/status.json) و[العلاقات](../reviews/evidence/post28/41fb7c90ccb732177a160677669634982fc61173/r06-relations/status.json): summary/discovery/Vitest،setup ledger/identity،timestamps وhashes،checks. [مصفوفة الحالات](../reviews/evidence/post28/41fb7c90ccb732177a160677669634982fc61173/r06-relations/required-case-status.json) تحفظ26 حالة مطلوبة وتضيف أدلة جزئية إلىCD-002/003/036؛لا قبول كامل مستنتج.

**الاستئناف التالي:** اختبار روابط campus/organizationUnit للبرنامج وعلاقة test/version وscholarship/cycle بالمالكين الفعليين، دون اعتمادDEC. ثم HTTP principal/permissions وعزلgraph،ودورة الاعتماد المالي والتنفيذ/payment/refund/settlement. مسار الوثائق الخارجي والـattestation يحتاجان ports حقيقية وأدلة منفصلة. لا إعادة17 الحالة إلا عند تعديل مساراتها. R05 تحتفظ بعائق orphan الموثق ولا تعلنPASS؛لاR07 أو نشر أوmain أوإجراءاتNeon في هذه الجولة.
