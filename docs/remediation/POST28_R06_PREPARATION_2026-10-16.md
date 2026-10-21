# R06 — تجهيز المعاملات والعلاقات

الحالة `PREPARED_NOT_EXECUTED`،لا CLOSED أو قبول SQL. التنفيذ يعتمد R04/R05؛لم تُتجاوز بواباتها.

الفرع `fix/post28-ci-environment-inventory-20261016`. مرشح تجهيز R06/R07 وفحوصه: `70e22445f95f2c86bb8155f80ad1aea3fce41982`. [سجل الأوامر والوقت والنتائج والـhashes](../reviews/evidence/post28/70e22445f95f2c86bb8155f80ad1aea3fce41982/R06-R09-preparation/summary.json)، [فهرس التغطية](../reviews/evidence/post28/70e22445f95f2c86bb8155f80ad1aea3fce41982/R06-R09-preparation/R06-R09-preparation.json). تصحيح تقارير WP-IC-10 اللاحق: `328535ffa80e6a2a9e819100f546424d525b5833`،[أدلته المنفصلة](../reviews/evidence/post28/328535ffa80e6a2a9e819100f546424d525b5833/R09-playwright-contracts/summary.json). لا يعاد وسم بناء المرشح الأول باسم الثاني؛التغيير اللاحق يخص wrapper تشخيص HTTP وليس مخرجات الوحدات المبنية. كلا الجولتين على مصدر نظيف وNode22.16.0.

## شروط القبول والمنجز والمتبقي

| الشرط | المنجز | المتبقي |
|---|---|---|
| تغطية الحالات الإلزامية | فهرس26 حالة:CD-001…019 و026/028/029/030/035/036/040،مع owner والنتيجة والقرارات. | ربط كل حالة بأمر مالك وfixture منشورة واختبار runtime فعلي؛تبقى الأوامر غير المثبتة null. |
| عزل DB-T وأدوار التطبيق | وثق الفصل عنDB-E وDB-R ووجوب live identity وleast privilege. profiles الأربعة محفوظة بملفاتها وحدودها،ولا تعتبر تغطية كاملة. | PostgreSQL/Neon حي ومحروس،صلاحيات وcatalog مقبولان وfixtures صناعية. |
| معاملات وقفل وrollback | checklist لاتصالين/backend PIDs وbarriers محدودة وملاحظة lock/CAS وowner+audit+outbox/receipt معًا. | التنفيذ الحقيقي وحقن الفشل قبلcommit؛لا mock يثبت rollback أوSKIP LOCKED. |
| مالية وconsent وعلاقات | حافظت الخطة على replay/version/money/scale/approval وconsent/withdrawal وbinding/purge وdegree-major/program وprojection invalidation. | owner runtime suites وDEC-01…07 ومراجعة السياسة؛لم يتغير schema أو owner business behavior. |

## النتائج

صفر اختبار DB وصفر migrations/fixtures أو اتصال. أداة الجرد لا تستورد suites أوتشغل hooks. فحوص R07 المتأثرة85/85 وpreflight36/36 نجحت على المصدر الموضح،لكنها ليست نتيجة R06 SQL. غطى اختبار الأداة بقاء الحالات26 وعدم ادعاء تنفيذها. لم تُكرر مجموعات المالية/B12/B13 العامة التي لم يتغير كودها.

[دليل التشغيل التحضيري](../operations/POST28_R06_R09_PREPARATION.md). قاعدة Neon وتكييف الهوية/TLS والأدوار ونتائجR04/R05 لا تزال مطلوبة؛production NO_GO.
