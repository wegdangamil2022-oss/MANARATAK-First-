# تقرير R02 — core وcoverage

الحالة: `R02-core=PARTIAL_SOURCE_VERIFIED_DATABASE_DEFERRED`، `R02-coverage=BLOCKED_OWNER_DECISIONS_AND_PRODUCERS`. لا CLOSED أو PASS للمرحلة كاملة.

مرشح الكود المفحوص: `786d450c26282d5a02f9d5ea3bf057a350a5f5b9`، الفرع `fix/post28-ci-environment-inventory-20261016`. جميع سجلات الجولة المجمّدة تثبت SHA نفسه وشجرة نظيفة عند البداية والنهاية، مع command ووقت وexit code وSHA-256 للسجل. [فهرس الأدلة](../reviews/evidence/post28/786d450c26282d5a02f9d5ea3bf057a350a5f5b9/R00-R02-20261016/summary.json) و[ملخص القبول](../reviews/evidence/post28/786d450c26282d5a02f9d5ea3bf057a350a5f5b9/R00-R02-20261016/acceptance-summary.json). commit التقارير اللاحق يضيف توثيقًا؛ لا تُنسب إليه نتائج المرشح تلقائيًا.

## R02-core: شروط القبول والأدلة

| الشرط | المنجز | المتبقي |
|---|---|---|
| exact file/case identity | ثبت الفشل السابق39/1. Vitest list يربط المجموعات بـ` > ` وJSON fullName بمسافات. تُعاد الهوية من ancestorTitles/title مع تحقق fullName بدل استبدال حروف داخل الاسم. تقارن مجموعة الملفات والحالات بالضبط وترفض ملفات إضافية فارغة أو مكررة. | تشغيل DB الفعلي على الهدف المصرح. |
| negative/roundtrip proof |40/40 ناجحة بلا skip، تشمل subprocess Vitest فعليًا بملفات inert: nested names وliteral separators وtop-level وparameter expansion؛ اختبارات رفض forged/missing/skipped/duplicate/changed targets باقية. | ليست اختبارات PostgreSQL. |
| profiles وrequired discovery | assets32،leases2،persistence4،sections12312؛8 ملفات محددة إجمالًا. ملفات configs الفعلية مفحوصة. minimum definitions واكتشاف runtime expanded counts منفصلان، ولا نجاح من صفر حالات. | runtime discovery ثم execution نفسه مع صفر skip/fail/todo على DB-T. |
| الهوية والعزل والصلاحيات | حراس source-SHA وloopback وDB-G/S وأدوار محدودة وserver/OID/comment وREAD ONLY وcatalog وrestore preimport rejection وprivate Prisma argv مغطاة باختبارات المصدر. | هوية PostgreSQL حية وcatalog/parity والتفويض قبل أي كتابة؛ لا R03 في هذه الجولة. |
| NOT VALID | لم تُعدّل migration تاريخية ولم يُخفَ فحص صفر القيود غير المتحققة. | orphan audit وإجراء VALIDATE مراجع ثم replay على DB-G وupgrade مستقل في مرحلته. |
| الأدوات والبيانات | توفر psql/nginx مع checksums وDocker daemon؛ لا إنشاء DB/fixture. فهرس13 FX يحفظ المدخلات المطلوبة دون نتيجة مفترضة. | أوامر مالك fixtures الفعلية والنسخ المنشورة وDB-E/DB-T المنفصلتان؛ PostgreSQL provider/version غير معتمدين. |

## R02-coverage: الشروط والحدود

[الفهرس القابل للآلات](post28-readiness-20261016/README.md) يحفظ77 علاقة و42 حالة وقراراتها وأدوارها وحالتها الأصلية، وactual/evidence/target/artifact فارغة بدل اختلاق نتائج. فاحص البنية يقارن IDs وhashes وعدد المرشحات679 ويصرح BLOCKED. لا يرث Source Closed قبولًا تشغيليًا.

- DEC-01…07 لا تزال دون موافقة مالك؛ رد المستخدم أجّل DB فقط. لا قرار لزوج الدرجة–التخصص أو دول المنحة أو مجانية الدورات أو فصل مستوى التخصص أو إبطال الإسقاط أو nullable uniqueness أو أسواق/لغة التدريس نيابةً عنه.
- FG-024: evidence contract موجود، لكن canonical teaching-language owner/query وlaunch scope والواجهة غير مثبتة؛business-discovery BLOCKED.
- أدوات database discovery/execution موجودة بمحددات الهوية والنتائج؛ التنفيذ مؤجل. لا يوجد إثبات جاهز كامل لمشغّل ثلاث وحدات مبنية مع TLS موثوق وإدارة lifecycle وتنظيفها. wrapper المتصفح الضيق واختبارات HTTP المعترضة لا يكفيان.
- producers قياس آثار workers والاستعادة غير المدمرة وload/rollback والتوقيعات المستقلة ما زالت متطلبات تقنية مفتوحة، كما هو مفصل في جدول readiness. العقود وfixtures ليست producer قبول.
- target approvals وprotected key bindings وسلطات الاستعادة والتوقيع لم تجهز. لم تُقرأ أسرار ولم تُكتب روابط اتصال إلى Git أو الدردشة.

## المتبقي والخطوة التالية

المطلوب التالي يظل إكمال متطلبات R00/R01 وR02 المستقلة والقرارات أعلاه. إنشاء وربط Neon مؤجل إلى اليوم التالي بتوجيه المستخدم، وليس مجدولًا تلقائيًا. لا R03 حتى تحقق شروطه؛ لا migration/restore/seed أو دمج main أو نشر. production=NO_GO.
