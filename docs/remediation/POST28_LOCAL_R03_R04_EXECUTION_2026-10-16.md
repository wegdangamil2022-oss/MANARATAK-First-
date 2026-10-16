# POST28 — تنفيذ مختبر PostgreSQL المحلي ونتيجة R03/R04

## النسخ والحدود

الفرع `fix/post28-ci-environment-inventory-20261016`. أحدث رأس جُلب عند البداية `868b4d2bf2a7d3d5bfce6c48fc5305f32c23a982`؛ حُفظ عمل التجهيز السابق ولم يُعد من الصفر. قُرئت الخطة v1.3 وتقارير R00–R09 ودليل المختبر والأدوات الأربع المطلوبة. لا AGENTS إضافية منطبقة. تفويض المستخدم الحالي يجيز **المختبر المحلي الجديد فقط وتجربة R04 المحروسة**.

| SHA | التنفيذ المنسوب إليه |
|---|---|
| `868b4d2b` | أول مختبر رسمي؛ فشل اتصال localhost قبل أي migration |
| `17c02c3266bbad3d9989ef1fc956379215c7a251` | إصلاح توصيل الشبكة؛ R03 محلية ناجحة، replay109 ،ثم R04 محجوبة عند schema diff ؛ تدقيق catalog/ledger مستقل بالقراءة فقط |
| `95c0888161badd9efe47cecb4a732d35f39fc1ca` | إصلاح منح التطبيق؛ مختبر جديد وفحص R03/default ACL واختبارات متأثرة فقط؛ لا إعادة replay مع schema لم تتغير |

Commit التقرير اللاحق يحفظ الأدلة ولا يعيد تسميتها باسم SHA آخر. لم تُلمس Neon أو الإنتاج،ولم يُنفذ نشر أو main merge أو db push/reset أو restore أو حذف قواعد/volumes أو تعديل ترحيل تاريخي. كل كلمات المرور وعقود الأهداف والسجلات الخاصة باقية **خارج Git**؛ المحفوظ هنا summaries/metadata منقحة و hashes فقط.

## الأدوات والمختبرات

Docker28.4.0 متاح عبر المقبس المحلي، Node22.16.0 مستعمل للأوامر، Prisma/client5.22.0 ،والصورة المثبتة `postgres@sha256:ca0bd484cb98bf4b24eb1010e73fb3fcbd6714d240fbc1a10eea5b7dbecb641d` شغّلت PostgreSQL16.15. لا حاجة لتنزيل/ترقية الاعتمادات. عميل psql16.15 من الحاوية نفسها عبر adapter خاص في مجلد المختبر؛ يثبت container ID/run/scope ويمرر الاعتماد بملف 600 مؤقت،لا argv. نُفذ SELECT رسمي به ونجح.

| الجولة | run / loopback | system identifier | G OID / S OID | الحالة عند التسليم |
|---|---|---|---|---|
| أولى | `8b4d0fa3-0a8e-4b68-ae26-6870649096bb` /15432 | `7697255634335408173` |16387 /16471 | أوقفت الحاوية؛لا migrations ،الأدلة والـ volume محفوظان |
| replay | `2ad85d94-bb98-4e15-82ee-4a4a4633ef32` /15432 | `7697256504203268140` |16387 /16471 | أوقفت الحاوية والـ forwarder بعد جمع الأدلة؛ G281+ledger و S فارغة |
| أحدث | `4c2fbadb-befc-4a96-8e3e-d3340830a611` /15433 | `7697259355466080300` |16387 /16471 | تعمل في شبكة داخلية؛ G/S فارغتان،حدالـ forwarder3 ساعات |

الأسماء في كل خادم جديد: G=`manaratak_post28_greenfield_test`، S=`manaratak_post28_shadow_test`. تكرار OID أو الاسم عبر خوادم جديدة لا يعني alias ؛العقد يثبت system ID/nonce/run/SHA/port أيضًا. لا تعديل لربط عقد قديم بـ SHA أحدث. مجلدات هذه الجولات الخاصة: `/workspace/scratch/post28/labs/lab-qXhwVb`،`lab-EwrEBJ`،`lab-NlhtLs`. لا نفترض نقل ملفاتها أو الحاويات إلى حساب أو بيئة جديدة.

## R03 المحلية — ما نُفذ فعليًا

- أنشأت الأداة الرسمية شبكات داخلية و volumes وحاويات **جديدة فقط**،بحد 2CPU/2GB و max_connections40 و UTC ،و G/S مستقلتين.
- فحص Prisma الرسمي للزوج نجح:مصادقة حقيقية للدورين `post28_migrator` و`post28_shadow`، system/OID/marker/الإصدار و READ ONLY ،صفر جداول قبل replay ،ودون superuser/CREATEDB/CREATEROLE/REPLICATION/BYPASSRLS أو عضوية إدارة/ملكية قاعدة/CREATE database.
- نجح اتصال `post28_app` المحدود بالقراءة فقط:لا CREATE schema ،ولا اتصال إلى S ؛ migrator لا يتصل بـ S و shadow لا يتصل بـ G. session_replication_role=origin.
- في المختبر النهائي قياس default ACL من جلسة التطبيق أعاد appDefaultDml=0 ؛اجتازت 7 assertions إضافية. لا اختبار تطبيق بدور bootstrap ؛استعماله اقتصر على إنشاء الموارد والأدوار والـ markers عبر الأداة الرسمية.
- [هويات R03 الأولى](../reviews/evidence/post28/17c02c3266bbad3d9989ef1fc956379215c7a251/local-validation/local-identities.json)،[هويات المختبر المصحح](../reviews/evidence/post28/95c0888161badd9efe47cecb4a732d35f39fc1ca/local-validation/local-identities.json)،[قياس التطبيق النهائي](../reviews/evidence/post28/95c0888161badd9efe47cecb4a732d35f39fc1ca/local-validation/R03-role-and-isolation.json).

هذه نتيجة **بوابات قاعدة البيانات المحلية للـ rehearsal**،وليست إغلاقًا شاملًا لـ R03 مع Redis/storage/providers والميزانيات،ولا قبول TLS/Neon أو إنتاج. اتصال PostgreSQL محلي داخل مختبر خاص،ولم يُنسب إليه إثبات TLS سحابي.

## R04 — replay فعلي ثم توقف صحيح

شُغّل `verify-greenfield-migration-parity.sh` مرة على G الفارغة المعروفة،بغرض migrate المحروس،لا bootstrap/مالك. تحقق Prisma validate ،ثم **طُبقت 109 migrations بنجاح**،وأعاد migrate status أنها up to date. عند فحص `replayed` خرج Prisma برمز**2** بسبب عدم التطابق مع schema ؛توقف المشغّل كما ينبغي.

**لم يصل** إلى migration-directory/shadow diff أو deploy الثاني أو seed، ولا إلى فاحص NOT VALID النهائي؛ القيود التسعة أُثبتت بتدقيق القراءة المستقل. لا دليل idempotency/ledger ثابت بعد deploy ثانٍ؛نجاح 109 لا يساوي R04 PASS. الملف المنتهي بـ diff.sql يحتوي تقرير Prisma نصيًا،ولم يُنفذ محتواه.

التحليل المستقل التالي كان READ ONLY بوقت محدود وعلى الهوية نفسها،دون متابعة DDL:

| القياس | النتيجة الفعلية |
|---|---|
| ledger |109/109 أسماء وترتيب و checksums و finished/steps مطابقة؛ partial0 ، rollback0 |
| model coverage |281/281 model لها جدول مطابق؛لا جدول تطبيق مفقود أو زائد؛ومع ledger282 جدولًا |
| صفوف التطبيق |63 صفًا من SQL migrations:ExternalCourseProvider18 ، ExternalCourseProviderAlias6 ، ExternalCourseProviderDomain39 ؛لم يشغل seed مستقل |
| العلاقات |313 FK ،كلها MATCH SIMPLE ؛ 313 استعلام orphan بصفر مخالفة |
| CHECK |102 ،منها 7 NOT VALID ؛فحص تعبيرات السبعة بصفر مخالفة |
| قيود أخرى |35 UNIQUE ، 282 PK مع ledger |
| indexes / triggers |1191 index صالحًا، invalid0 ؛ 40 user trigger مقاسة في catalog ،لا اختبار وظيفي لها هنا |
| NOT VALID |9 باقية فعلًا:7 CHECK و 2 FK ؛لم ننفذ VALIDATE أو نتجاهلها |
| schema isolation |صفر user schemas غير متوقعة خارج public |
| shadow |بقيت فارغة؛لم يُنفذ عليها diff يكتب/يعيد التهيئة |

[ledger المقاس](../reviews/evidence/post28/17c02c3266bbad3d9989ef1fc956379215c7a251/local-validation/migration-ledger-verification.json)،[catalog والجداول و 320 orphan/CHECK audit](../reviews/evidence/post28/17c02c3266bbad3d9989ef1fc956379215c7a251/local-validation/catalog-and-orphan-verification.json)،[ملخص R04](../reviews/evidence/post28/17c02c3266bbad3d9989ef1fc956379215c7a251/local-validation/R04-measured-summary.json). هذه ليست تنفيذ 42 حالة أعمال أو 77 علاقة E2E ؛الجداول والقيود الفيزيائية لا تثبت كل العقود.

## المشكلات والإصلاحات

1. **Docker internal network لم ينشر localhost:**الطلب كان موجودًا في HostConfig لكن NetworkSettings.Ports فارغة و TCP مرفوض. أصلحت الأداة بإبقاء الشبكة الداخلية وإضافة forwarder على 127 فقط للحاوية الجديدة ذات ID/run/scope/network مطابقين،مع فحص دوري وانتهاء 3 ساعات. لا host networking أو egress أو guard exception. نجح R03 الفعلي بعد الإصلاح.
2. **default grants للتطبيق شملت ledger:**قراءة catalog بعد replay أثبتت INSERT/UPDATE/DELETE للتطبيق على `_prisma_migrations`. أوقفت استخدام المختبر القديم،وأزلت منح الجداول/sequences العامة من creator. المختبر الجديد يمنح دور التطبيق في DB-G صلاحيات CONNECT/USAGE فقط؛قياس default ACL=0 واختبار regression ناجح. لا ندعي replay بعد التصحيح أو فحص ledger منشأة على النسخة الجديدة؛تلك القاعدة ما زالت فارغة.
3. **schema drift في 18 جدولًا:**قيمتين افتراضيتين، 11 index ، 8 FKs غير ممثلة و 6 FK actions و 4 أسماء index. لم تُحذف الفهارس أو القيود لإسكات Prisma. أعددت [تسوية للمراجعة](post28-local-review-20261016/README.md):patch يحافظ على SQL القائم و SQL defaults/VALIDATE منفصلان غير مطبقين. اجتازت نسخة schema مرشحة خارجالمصدر `Prisma validate`،ونجح `git apply --check`؛لا قبول parity أو build/typescript لها.
4. **NOT VALID:**القيود التسعة معروفة بالأسماء في الدليل؛غياب الأيتام اليوم لا يحل محل VALIDATE مراجع وأدلة جديدة بعد اعتماد التسوية. لا تعديل تاريخي،ولا حذف صفوف أو استثناء عام.

## الاختبارات والفحوص المستقلة

| SHA | ما نُفذ |
|---|---|
|17c02c32|96/96 اختبارًا موجهًا؛فشل 0/skip0/todo0/إلغاء 0 ؛ preflight36/36 ؛ ESLint و source quality ناجحان |
|95c08881|أعيد المتأثر فقط:51/51 ؛فشل 0/skip0/todo0/إلغاء 0 ؛ ESLint ناجح؛ R03 app/default ACL7 assertions ناجحة |
|95c08881|Prisma validate للمرشح المقترح ناجح؛لا تطبيق schema أو client generation منه |
|17c02c32|فهرس readiness77 علاقة/42 حالة/13 fixture/679 مرشح مهمة/7DEC سليم بنيويًا؛ runtimeExecuted=false |

لا تُجمع الأعداد كحالات فريدة؛كثير من الفحوص المعادة متداخل. فشل تشغيل واحد للمختبر الأول قبل R04 ،وفشل بوابة R04 واحدة بالرمز 2 محفوظان مع السبب. **صفر suites DB-T/DB-E تشغيلية،وصفر اختبارات مدمرة أو browser/worker/load/restore.** لم تُعد آلاف الاختبارات أو build شاملًا. فاحص التنظيم رفض حفظ ملف patch مؤقت؛ حُفظ المقترح كمستند مراجعة Markdown بدلًا منه دون استثناء للحارس. [أوامر/أوقات/بصمات المصدر و DB لـ 17](../reviews/evidence/post28/17c02c3266bbad3d9989ef1fc956379215c7a251/local-validation/checks-private-log-references.json)،[فحوص 95](../reviews/evidence/post28/95c0888161badd9efe47cecb4a732d35f39fc1ca/local-validation/checks-private-log-references.json). السجلات الخام والأسرار والعقود خارج Git ،وقد تفقد عند انتهاء البيئة؛الملخصات والبصمات محفوظة هنا دون محتوى صفوف.

## BLOCKED ونقطة الاستئناف

- **R04 BLOCKED:**schema drift و 9NOT VALID ،مع بقاء shadow diff و deploy الثاني/عدم التكرار و seed proof غير منفذة. لم يُضَعف الفاحص.
- **R05 BLOCKED:**يعتمد R04 ،ولا predecessor/upgrade dataset/backup/سلطات مقبولة بعد.
- **R06 وما بعدها BLOCKED:**لا DB-T مستقلة أو fixtures وعلاقات/معاملات مقبولة؛لا تشغيل على G/S بدلًا منها.
- **R03 الشاملة و Neon و R00/R01/R02-coverage:**الخدمات/الميزانيات/الأسرار/TCP/TLS السحابية والقرارات والتوقيعات و CI الباقية لا تغلقها هذه الجولة. production=NO_GO.

التالي:مراجعة واعتماد اتجاه تسوية schema والـ defaults والقيود،ثم تطبيق التغيير الموافق عليه **في المصدر وترحيل إضافي مراجع** لا التاريخ. freezeSHA جديد،ومختبر رسمي جديد،و R03 ثم R04 كاملة مع orphan audits جديدة و VALIDATE المراجع،ثم parity والـ shadow وإعادة deploy والـ ledger. لا تعاود استعمال مختبر 17 أوإعادة وسم عقده. جهّز DB-T بعد تحقق شروط R04/R05 بقاعدة و OID و role/run/marker مستقلين؛الحراس القديمة لبعض profiles تتطلب `manaratak_eap_ci_test`/`eap_ci`،ولا تُعطّل لتوجيهها إلى G/S. لا ترقية هذا الإثبات المحلي إلى قبول سحابي أو إنتاجي.
