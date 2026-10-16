# MANARATAK — نتيجة استكمال R02-core وتجهيز R03 على Neon

## 1. الفرع والنسخة

- الفرع: `fix/post28-ci-environment-inventory-20261016`.
- أحدث رأس مرصود عند البداية: `b15ff2e839519e9dab3657eda2c906c87a35b732`؛ جُلب المرجع نفسه وصُعّد الفرع المحلي fast-forward، دون محو عمل أحدث.
- نسخة المصدر النهائية المفحوصة: **`c9e8e98d4e650d0157ee8ec95ee4d9db9a695de0`**، بعد تنفيذ adapter في `58c402ac148b969a18f58a827aed8d36fc2e004b` وتصحيح aliases لاحقًا.
- جميع الفحوص النهائية الـ13 على SHA المذكور وشجرة نظيفة. commit حفظ هذا التقرير والأدلة لاحق ولا يعيد نسب الاختبارات إلى SHA آخر.
- [ملخص الفحوص وبصمات المصدر](../reviews/evidence/post28/c9e8e98d4e650d0157ee8ec95ee4d9db9a695de0/R02-neon-final/summary.json)، [الأوامر والأوقات والنتائج](../reviews/evidence/post28/c9e8e98d4e650d0157ee8ec95ee4d9db9a695de0/R02-neon-final/checks.json)، [بصمات ملفات الأدلة](../reviews/evidence/post28/c9e8e98d4e650d0157ee8ec95ee4d9db9a695de0/R02-neon-final/evidence-hashes.json).

## 2. مراجعة السابق وحدود المهمة

قُرئت تقارير R00–R02 وتجهيز R04–R09 والخطة v1.3 وسجل Neon ودلائل التشغيل. لم يوجد AGENTS منطبق. استُخدم فهرس الحوكمة وRoadmap v6.0 وحدود أدوات Prisma. الفشل التاريخي39/1 أُصلح في العمل السابق؛ اختبارات Vitest inert roundtrip السابقة ما زالت ضمن181/181، ولم يُعَد بناء إصلاحها من الصفر. نتائج المصدر والبناء السابقة لا تصبح قبولًا حاليًا لـPostgreSQL أو المتصفح.

أوامر المستخدم الحالية تسمح بتعديل الحراس وفحوص المصدر والقراءة الآمنة؛ لا تتطلب تبديل نموذج عند الفشل. لا تغيير لقرارات DEC-01…07 أو الإنتاج أو صلاحيات التوقيع. لم تُنفذ ترحيلات أو seed أو reset أو db push أو حذف أو إنشاء فرع/قاعدة/دور، ولم تُشغّل suites DB مدمرة أو نشر أو دمج main.

## 3. الملفات المعدلة

| المجموعة | الملفات |
|---|---|
| سياسة Neon وهوية الهدف | `scripts/database/post28-neon-policy.mjs`، `scripts/database/post28-isolation.mjs` |
| هوية provider وSQL للقراءة فقط | `scripts/database/post28-neon-provider.mjs` **جديد**، `scripts/database/post28-preflight.mjs` |
| منع تصعيد القراءة إلى كتابة | `scripts/database/run-post28-suite.mjs`، `scripts/database/prisma-env-diff.mjs`، `scripts/database/verify-greenfield-migration-parity.sh`، `scripts/lib/disposable-database-target-guard.mjs`، `tests/database/post28-database-safety.setup.mjs` |
| اختبارات الحراس | `tests/database/post28-neon-preflight.test.mjs` **جديد** |
| الحوكمة والتجهيز | `scripts/architecture/operational-tooling-boundary.json`، `scripts/database/prepare-post28-acceptance.mjs`، `config/testing/post28-neon-target.json` |
| تعليمات التشغيل | `docs/operations/POST28_NEON_READ_ONLY_PREFLIGHT.md` **جديد**، `docs/operations/POST28_NEON_TEST_DATABASE_HANDOFF.md`، `docs/operations/POST28_NEON_R04_R05_PREPARATION.md` |
| جرد مولّد دون أسرار | `.env.aistudio.example`، `docs/operations/GOOGLE_AI_STUDIO_ENVIRONMENT.md` |

التغيير18 ملفًا في المصدر المجمد؛ يضاف هذا التقرير والأدلة عند التسليم. لم تتغير schema أو migrations التاريخية أو lockfile أو منطق المنتج.

## 4. المشكلات والإصلاحات

1. **الحراس المحلية لا تثبت هوية Neon:** أضيف عقد قراءة فقط مرتبط بالسجل المعتمد وSHA وUUID وبالمشروع/الفرع/endpoint/القاعدة/الدور. يُرفض baseline وmain وDB-R والأهداف غير المسجلة. كل تصريحات الهدف والـshadow تُفحص قبل أي SQL.
2. **الاسم/الرابط وحدهما ليسا دليل provider:** أضيف GET مصادق من Neon API، دون defaults، قبل وبعد SQL، مع رفض تبدل الفرع/endpoint. تُزال حقول كلمات المرور من الاستجابات ولا تُحفظ. token يمر على stdin لا OS argv، وcurl يبقي proxy/CA، ولا يحمل curlrc أو يسمح بإضعاف TLS.
3. **هوية النظام المحلية غير ملائمة لإدارة Neon:** أضيف SELECT مخصص لا يعتمد على pg_control_system أو كتابة تعليق. يربط endpoint المثبت من API بهوية SQL، ويقيس TLS/الدور/العضويات والملكية وCREATE/USAGE والـcatalog. يُنفذ داخل READ ONLY بوقت محدود، وتُحجب رسائل أخطاء العميل المحتوية على روابط، بما فيها فشل disconnect.
4. **احتمال تصعيد نجاح preflight إلى ترحيلات:** صارت مشغلات parity وdiff وDB-T ترفض عقود Neon صراحةً. globalSetup يرفض كل aliases الخاصة به قبل استيراد الاختبارات. لا يوجد remote mutation adapter معتمد في هذه الجولة، ولا يمنح نجاح القراءة هذا الإذن.
5. **أعلام CI القديمة قد تقبل مضيف Neon:** أُغلق هذا المسار لـNeon مع الحفاظ على loopback وخدمة CI المحلية القائمة. المراجعة كشفت aliases بحروف كبيرة أو نقطة DNS ختامية؛ أضيف التطبيع والاختبارات لكليهما.
6. **جرد البيئة stale بعد إضافة المتغيرات:** ظهر فشل preflight تشخيصي، وأُعيد توليد الجرد من أسماء المتغيرات في المصدر ثم أعيد بنجاح. لم تُقرأ أو تُنسخ قيم أسرار. أُصلح كذلك خطأ صياغة أثناء إضافة fixture curl الخاملة؛ الجولة النهائية لا تحتوي فشلًا أو skip.

## 5. الاختبارات المنفذة فعلًا

جميع ما يلي على Node22.16.0 وSHA المجمد أعلاه؛ السجلات الكاملة محفوظة مع hashes:

| الفحص | النتيجة |
|---|---|
| ستة ملفات Node موجهة: Neon، العزل، تجهيز R04/R05، parity المصدرية، disposable guard، mutation gate | **181/181**؛ فشل0، skip0، todo0، إلغاء0 |
| source-preflight | **36/36** و`SOURCE_PREFLIGHT=PASS` |
| W2 | **84/84** |
| ESLint لكل ملفات JS المتأثرة | exit0 بلا مخرجات أخطاء أو تحذيرات |
| source architecture | PASS |
| source quality | PASS؛ package/file cycles=0 وa11y findings=0 |
| repository organization | PASS؛ لا مسارات أو imports أو روابط مهمة مكسورة |
| secret scan | PASS |
| Bash syntax للـparity | PASS |
| static discovery | assets32، leases2، persistence4، sections12312؛ مجموع8 ملفات محددة |

لا تُجمع أعداد preflight مع181 باعتبارها حالات فريدة. اكتشاف profiles ساكن، لا يشغّل hooks ولا يوسع كل parameterization، وليس تنفيذ اختبارات DB. اختبارات curl/Vitest الجديدة تستعمل عمليات حقيقية بملفات inert دون قاعدة أو شبكة Neon؛ أما assertions هوية provider/الأخطاء فتعتمد تبعيات خاملة معلنة. **عدد suites DB المنفذة=0**. لم يُعَد full build أو manifest33 أو CI/CodeQL الخارجي في هذه المهمة؛ لا ادعاء جديد بشأنها.

## 6. اتصال Neon والهوية والصلاحيات

[الملاحظة الحية المنقحة](../reviews/evidence/post28/c9e8e98d4e650d0157ee8ec95ee4d9db9a695de0/R02-neon-final/live-reference-readonly.json) تثبت قراءة فعلية عبر أداة Neon المخولة، مع تثبيت معرفات الطلب؛ ليست ملف نجاح صناعيًا لمشغّل PostgreSQL.

| البند | الملاحظة |
|---|---|
| Project | `manaratak-testing` / `lively-feather-03681988` |
| Branch | `post28-validation` / `br-patient-recipe-bahs1ix7`؛ ready وغير default/primary |
| Endpoint | `ep-restless-wind-badta11i` مرتبط بالمشروع والفرع المذكورين |
| Database / OID | `manaratak_test` / `16394` |
| PostgreSQL / region |16 / `aws-eu-central-1` |
| دور الاتصال المقاس | `manaratak_test_owner`؛ current_user=session_user |
| READ ONLY / tables | true / صفر جدول في public |
| صلاحيات الدور | CREATE ROLE وCREATEDB وREPLICATION وBYPASSRLS، وعضويات مرتفعة وglobal read/write وملكية/CREATE؛ **مرفوض كدور تشغيل** |
| TLS في جلسة MCP SQL | false؛ لا يثبت الاتصال الصارم من Codex ولا يجتاز الحارس الجديد |
| أسرار عملية Codex | DATABASE_URL وDIRECT_URL وG/S URLs وNEON_API_KEY والعقد الخاص غير مهيأة؛ observations_current=true ولا secret bindings |
| شبكة Codex | HTTPS unrestricted/enforced؛ TCP domains/IP ranges فارغة، فلا تصريح Direct endpoint |
| اتصال Prisma المباشر | **BLOCKED قبل المحاولة**؛ لم تُستخرج روابط أو كلمات مرور من الأداة ولم يُلتف على الشبكة |
| DB-G وDB-S | **NOT_CREATED**؛ لا مساواة بين الفرع المرجعي وأهداف الاختبار المدمرة |

التحقق المباشر الصارم من Prisma5.22/TLS وNeon API adapter يبقى متطلبًا حيًا؛ نجاح المصدر أو SQL عبر MCP لا يعوضه. دليل Prisma الرسمي الحالي يتحدث عن7؛ المشروع لم يُرقَّ لتجاوزه.

## 7. حالة المراحل ومتطلبات R04

- **R02-core: جزئية — SOURCE_VERIFIED، live prerequisites BLOCKED.** أُنجز مسار القراءة والحراس والاختبارات، لكن لا توجد هوية حية مقبولة لأهداف G/S أو دور تشغيل محدود أو اتصال Prisma مباشر.
- **R03: BLOCKED.** لا مختبر أهداف G/S مقبول ولا فصل أدوار فعلي ولا إعداد شبكة/أسرار أو خدمات Redis/storage/provider stubs وميزانياتها. إنشاء مشروع Neon المرجعي وحده لا يغلقها.
- R02-coverage وR00/R01 المفتوحة وقرارات المالك والتوقيعات تبقى كما هي في تقاريرها؛ production=NO_GO، والقسمان27/28 غير مغلقين بهذا العمل.

قبل R04 يلزم، بالترتيب:

1. تفويض مستقل ومحدد لإنشاء الأهداف والأدوار والحدود؛ ثم DB-G/DB-S فارغتان مستقلتان عن المرجع، وتفويض تغيير الصلاحيات دون تعديل إنتاج.
2. أسرار حقن آمنة في **كل بيئة تنفيذ مخولة**، وتصاريح TCP للمضيفين المباشرين، وعقد run/SHA نظيف جديد، وNeon API read permission للـprovider proof.
3. فحص مباشر فعلي لهوية G/S وTLS والشهادات والصلاحيات وعدم alias، وبقية متطلبات المختبر لقبول R03.
4. تكييف تنفيذ Neon مراجع ومختبر لكل subprocess دون نقل بيانات الاعتماد إلى argv أو تعطيل TLS؛ الأدوات الحالية تمنع الكتابة البعيدة عمدًا.
5. تفويض ترحيلات R04، وتجميد سلسلة المهاجرات وledger/checksums، ومراجعة orphan/NOT VALID وإجراء validation محدد دون تحرير SQL التاريخية؛ مع الأدلة المطلوبة في الخطة.

## 8. نقطة الاستئناف والتوقف

ابدأ من **تهيئة وصول بيئة Codex وأهداف R03 بعد تفويضها**، باستخدام [دليل القراءة فقط](../operations/POST28_NEON_READ_ONLY_PREFLIGHT.md). لا تعِد إصلاح مطابقة Vitest القديم ولا تبدأ من الصفر. اقرأ هذه النتيجة والسجل، ثم تحقّق من HEAD الجديد قبل أي جولة وأعد الأدلة المتأثرة عند تغيير المصدر. لا تشغّل R04/R05/R06 تلقائيًا؛ هذه المهمة تتوقف عند التقرير.
