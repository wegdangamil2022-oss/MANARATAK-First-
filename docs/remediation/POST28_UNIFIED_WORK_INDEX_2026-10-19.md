# MANARATAK — فهرس العمل الموحد R00–R09

تاريخ التجميع: 2026-10-19 بتوقيت عدن. فرع العمل المعتمد للاستكمال هو `feat/post28-r07-artifact-preparation`. يجمع هذا الفرع العمل السابق؛ اسم R07 في اسم الفرع لا يقصر محتواه على تلك المرحلة. هذا فهرس للاستكمال وحالة الأدلة، وليس اعتمادًا جديدًا للمراحل أو للإنتاج.

توجيه المالك الحالي: تجميع الإصلاحات في فرع العمل الحالي ومواصلة العمل منه، ثم تجهيز دمج مدروس إلى `main` لاحقًا. الإشارات إلى فروع مختلفة وتعليمات التوقف في تقارير التسليم القديمة تصف تسليماتها التاريخية؛ نقطة الاستكمال الحالية هي هذا الفهرس. لا تُعاد كتابة تلك التقارير أو نسب اختبارات قديمة إلى مصدر أحدث.

## ما جُمع ومن أين

| المصدر المثبت وقت التجميع | الرأس | طريقة إدراجه |
|---|---|---|
| `main` | `b1702289f43d0363d7bbf91f8eba465e4355c53c` | كان سلفًا كاملًا لفرع العمل، بما فيه إصلاحات الصفحة العامة؛ لا تغيير في main |
| `fix/post28-ci-environment-inventory-20261016` على GitHub | `55d423959f622cee8cbfe644695d7ba46f56b8a2` | كان سلفًا كاملًا لفرع العمل؛ الأخير يتقدمه بـ24 commit عند أساس التجميع |
| أساس فرع العمل الحالي | `c7f6585dddc6d350291d81726b936eb2daa0e2c9` | حُفظت إصلاحات R06/R07 وإصلاح NULL وأدلتها |
| `fix/post28-r05-known-source-runtime-20261017` | `61878b5b37b2109e37f55e554e163b38cc0f8311` | دُمجت commits السبع المتبقية في `2940c2ac20cebb4c45941ed0d48093976b059198` مع حل التعارضات |
| `review/r05-independent-source-audit-20261017` | `0970edd3181ac5b1184ae0165f2eb240fb8bac09` | ضُم تقرير المراجعة المستقلة الأصلي دون تعديل نصه أو نتيجته |
| `review/r05-independent-technical-audit-20261017` | `e81f9d797e7222d86b40309b6be4aa2c98208c64` | كان موجودًا كاملًا في تاريخ فرع العمل؛ لا تكرار للدمج |

النسخة المحلية لفرع `fix/post28-ci-environment-inventory-20261016` كانت عند `fcb0dc940b05a6209dd2587f2cfa149893656b92`؛ هي أيضًا سلف لفرع العمل الحالي. اختلافها عن رأس الفرع البعيد لا يعني وجود إصلاحات محلية مفقودة من الفرع الموحد. الفروع السابقة وstash الاسترداد محفوظة؛ لم تُحذف ولم تُعد كتابة تاريخ Git.

## حالة كل مرحلة

الجدول يلخص العمل المتراكم بأدلته الأصلية؛ لا يجمع أعداد الاختبارات المتداخلة ولا يختلق نسبة إنجاز. ملفات التقارير المرتبطة هي سجلات لمصادرها، وما تغير لاحقًا موضح في عمود المتبقي والمرجع الأحدث.

| المرحلة | العمل والأدلة المحفوظة | الحالة والمتبقي | المرجع |
|---|---|---|---|
| R00 | جلب الرؤوس وخط أساس جديد وخريطة مسؤوليات وقدرات وحدود تنفيذ؛ main الأحدث محفوظ منفصلًا | **مغلق عمليًا باستثناءات**؛ curation الشامل ونطاق السوق وسلطات الإصدار باقية | [قرار R00–R03 الحالي](POST28_R00_R03_PRACTICAL_CLOSEOUT_2026-10-21.md) |
| R01 | CI ناجح بست مهام على d1c379d ثم46c9416؛ B13 الحالي63/63 دون تخطٍّ؛ فحص أثر تعديل المختبر | **مغلق عمليًا باستثناءات**؛ حُسم انتظار CI، والقبول العام غير ممنوح | [القرار والفحوص الحالية](POST28_R00_R03_PRACTICAL_CLOSEOUT_2026-10-21.md)، [نتيجة CI اللاحقة](POST28_R04_R05_PRACTICAL_REVIEW_2026-10-21.md) |
| R02 | مراجعة أدوات discovery/الهوية/الثقة والمنتجين؛ تحقق بنية77/42/13/679/7 وبصمات15 ملف دليل محفوظًا | **مغلق عمليًا باستثناءات**؛ لم يتحول الجرد التاريخي أو كل المصفوفة إلى PASS | [النطاق والمنتجون والاستثناءات](POST28_R00_R03_PRACTICAL_CLOSEOUT_2026-10-21.md) |
| R03 | إصلاح دعم greenfield الأصلي لـWindows؛ زوج G/S جديد فارغ بأدوار محدودة، ثلاث حالات منع اتصال، وإيقاف المختبر | **مغلق عمليًا لنطاق المختبر الفارغ**؛ لا قبول شامل للخدمات أو الاستضافة أو الإنتاج | [التنفيذ الحالي](POST28_R00_R03_PRACTICAL_CLOSEOUT_2026-10-21.md)، [الدليل](../reviews/evidence/post28/46c9416c340fbe21d92fd1581b75e3ce84a09520/r00-r03-practical-review/fresh-greenfield-lab.json) |
| R04 | replay111 فعلي على G/S جديدتين، schema/catalog وledger/redeploy وصلاحيات التطبيق؛ seed110 الأصلية ومصادرها ثابتة | **مغلقة عمليًا محليًا**؛ لا ادعاء بإعادة seed/lifecycle كاملة على111 أو قبول مرشح إنتاج نهائي | [الاستكمال الحالي](POST28_R04_R05_PRACTICAL_REVIEW_2026-10-21.md)، [إغلاق seed الأصلي](POST28_R04_LOCAL_CLOSURE_2026-10-16.md) |
| R05 | الإغلاق الصناعي109→110 والمراجعة المستقلة محفوظان؛ تحقق35 ملف دليل وحفظ281 جدولًا و8 ثوابت والمال، ومراجعة تغيّر المصدر | **الإغلاق المحلي السابق مؤكد**؛ بلا إعادة ترقية أو فحص PDF أو توقيع مستقل جديد أو اعتماد إنتاج | [التثبيت الحالي](POST28_R04_R05_PRACTICAL_REVIEW_2026-10-21.md)، [الإغلاق الأصلي](POST28_R05_LOCAL_CLOSURE_2026-10-19.md)، [المراجعة المستقلة](../reviews/POST28_R05_INDEPENDENT_IMPLEMENTATION_REVIEW_2026-10-19.md) |
| R06 | إصلاح111 وحفظ البيانات والمال موثقان؛ أضيفت مجموعة حالية5/5 للحالات الأربع وFK، وحاجز الاختبارات التاريخية وتشخيصه؛ حُدّث المتبقي من الأدلة اللاحقة | **اكتمل النطاق الأساسي مع استثناءات موثقة؛ القبول الرسمي الشامل معلق** | [المراجعة الحالية](POST28_R06_CURRENT_REVIEW_2026-10-21.md)، [الإغلاق الأصلي](POST28_R06_CORE_CLOSURE_2026-10-19.md) |
| R07 | CI تسليم R06 ناجح بست مهام؛ استرجاع محلي جديد للوحدات الثلاث وSBOM؛ Linux/PG16/readiness ومتصفح ودخول/خروج وتنظيف على0ee961a | **مغلقة عمليًا للنطاق التشخيصي**؛ قبول الإصدار والتوقيع والاستضافة الإنتاجية يبقى مفتوحًا | [الإغلاق الحالي والأدلة](POST28_R07_CURRENT_CLOSURE_2026-10-21.md) |
| R08 | استعادة الجلسات والمال وOutbox، ثم نسختا API مبنيتان مع PG16/Redis/HTTPS؛ مراجعة 2026-10-21 تثبت Redis وحالتي المال على 0ee961a | **النطاق العملي مغلق**؛ القبول الشامل ومصفوفة المزودين والاستضافة مؤجلة بحدود موثقة | [المراجعة الحالية](POST28_R08_CURRENT_REVIEW_2026-10-21.md)، [الإغلاق السابق](POST28_R08_PRACTICAL_CLOSE_2026-10-20.md) |
| R09 | خمسة سيناريوهات ناجحة على 0ee961a وقاعدة صناعية واحدة: الخصوصية وCMS والشهادة والمال والعلاقات | **النطاق العملي مكتمل باستثناءات موثقة؛ القبول الرسمي OPEN**، ولا إعفاء من mandatory gates | [المراجعة الحالية والاستثناءات](POST28_R09_CURRENT_REVIEW_2026-10-21.md) |

## قرارات الدمج والفحوص

- احتُفظ بمنشئ المختبر الأحدث من أساس R06/R07 دون تغيير بايتاته في Git: يدعم `upgrade` و`transactions`، ويفصل `post28_app` عن `post28_tx_migrator`. نسخة R05 الأقدم اقتصرت على upgrade؛ لم يُسقط الدمج دعم R06.
- أعيد توليد ملفي جرد البيئة بالأداة الرسمية من الشجرة المجمعة: 320 اسم متغير، دون قراءة قيم البيئة أو تصدير أسرار. احتُفظ بمتطلبات TLS الحالية ومتطلبات أدوات PostgreSQL المستوردة معًا.
- ضُم دعم Windows junction لتوليد العميل السابق، وحماية ACL لحزمة known-source، وتحقق هوية المختبر والثنائيات قبل backup/restore المحليين. لم تُغيّر حراس الثقة حالة الموافقات؛ تعيد صراحة `ownerAuthorizationVerified:false` و`upgradeAuthorized:false`.
- بقي schema وسلسلة migrations الفعلية 110 دون تغيير، وكذلك حزم التطبيق وملفات package/lock. مرشح NULL بقي في مجلد المقترحات خارج migrations الفعلية.
- على مصدر الدمج النظيف `2940c2ac20cebb4c45941ed0d48093976b059198`: نجحت 92 حالة Node موجهة من سبعة ملفات، صفر فشل/تخطٍّ/إلغاء/todo. أُعيدت لأنها تغطي الشيفرة المستوردة وحدود العزل والنسخ والعميل السابق المتأثرة بها؛ ليست 92 حالة قبول جديدة ولا تشغيل PostgreSQL جديدًا.
- نجحت جودة المصدر، وجرد البيئة، وفحص الأسرار، وESLint للملفات المتأثرة. لم تُعد المجموعات العامة أو الأبنية أو المتصفح أو مزودي PDF/الدفع. لا يُعاد وسم أدلتها السابقة.
- تقرير المراجعة المستقل والفهرس وأدلة هذه الجولة إضافات توثيق بعد المصدر المفحوص؛ لم تتغير الشيفرة التنفيذية بعده ضمن تسليم التجميع.
- حُفظ تقرير المراجعة المستورد ببايتات Git الأصلية، بما فيها نهايات أسطر Markdown ذات المسافتين في الأسطر 3–6. تنبيه whitespace لهذه الأسطر الأصليّة موثق؛ فُحصت التغييرات المؤلفة في الجولة منفصلة دون إعادة تنسيق المراجعة أو تغيير قواعد الفحص العامة.

[الفهرس القابل للقراءة الآلية](POST28_UNIFIED_WORK_INDEX_2026-10-19.json) و[بصمات أدلة الجولة](../reviews/evidence/post28/2940c2ac20cebb4c45941ed0d48093976b059198/branch-consolidation/evidence-index.json) يحفظان الرؤوس والفحوص ونطاقها. إثبات ancestry النهائي يتحقق أيضًا بعد commit التسليم، قبل الدفع.

## نقطة الاستكمال

1. استكمل من فرع العمل الموحد، وحدّثه من رأسه البعيد قبل أي دفعة جديدة. لا تستأنف كتابة مستقلة على فروع التسليم القديمة.
2. R05: القرار الفني محسوم بتفويض المالك الأحدث. استكمل من منفذ المعالجة المثبت وأدلته على 6dc7786 وتحصين d5ea087، مع مراجعة التنفيذ النهائي قبل الترقية ثم فحوص 109→110 والعميل السابق والقفل والانقطاع. لا تعِد طلب قرارات Assets/Student/Audit المفوضة ولا تحولها وحدها إلى قبول R05 شامل.
3. R06: مرشح NULL جاهز للمراجعة بوصفه حزمة محددة مثبتة مختبريًا؛ يلزم اعتماد دمجه في مسار migrations وفحص التكرارات وآثار FK ونافذة القفل وتحديث invariant الفهرس قبل تطبيقه. بقية الأعمال المستقلة ترتب حسب سلامة البيانات والخصوصية والأموال ثم التشغيل، مع إبقاء الاستثناءات المؤجلة صريحة.
4. R07–R09: استخدم أدلة التشغيل القائمة. ابنِ مرشحًا جديدًا معلوم SHA عندما يُختار للتسليم، وأعد فقط ما تأثر أو يلزم لإثبات الميزة المراد تفعيلها؛ لا تحول نجاح المسار الأساسي إلى قبول شامل أو تشغيل تلقائي للعمال والمزودين.
5. جهز طلب دمج إلى main بعد استقرار النسخة ومراجعة نطاقها وفحوصها وإعدادات release المرتبطة به. لا يلزم ادعاء اكتمال جميع المراحل، لكن يجب إبقاء الوظائف المحجوبة وبواباتها واضحة ومحمية. لا merge/main أو إنتاج أو Neon أو نشر أو دفع خارجي ضمن تفويض التجميع الحالي.


## تحديث إغلاق R05 المحلي — 2026-10-19

أغلقت R05 محليًا على المصدر `dd1b122a6aad078c62b88fb5dffec7d1b0f9b91c` والتشغيل `6788aa7c-ecd9-4735-b262-05b4d7995891` بالأدلة المرتبطة في تقرير الإغلاق. تقارير R05 الأقدم وحالة BLOCKED في تفويض R06 التاريخي محفوظة كما لوحظت آنذاك؛ المرجع الحالي هو `latestClosure`. يبدأ الاستئناف الآن من متبقي R06 المحدد في فهرس العمل، ثم مرشح R07. لم يتغير قبول R06/R07 أو main أو الإنتاج.


تحديث R06: أُغلق النطاق الأساسي على `d1770592c2ec171b14b6e755b3e138dfa2beed4a` بعد تطبيق111 في المختبر والتحقق من البيانات والفهرس والنسخ والتزامن. المرجع الحالي تقرير الإغلاق الأساسي، أما تسليم R06/R07 الأقدم فيحفظ حالة ملاحظته التاريخية. الاستئناف من R07؛ لا قبول شامل أو إنتاجي مستنتج.

## متابعة بوابات R07

التحديث الحالي: نجحت المهام الست في التشغيل `39315368366` على `1349371f29902857be7444cf89457e90a1d4b25d`، بما فيها الحزم الجديدة واسترجاعها وصورة Linux x64 وPostgreSQL 16 ومسار المستخدم الحقيقي في المتصفح. ونجحت فحوص PR الثمانية وجميع check runs الثلاثة والعشرين، بما فيها النتيجة المستقلة لـCodeQL بلا تنبيهات جديدة. المرجع [إثبات Linux](POST28_R07_LINUX_REVIEW_PROOF_2026-10-19.md). لا يُنسب هذا الإثبات إلى commit التوثيق اللاحق. اكتمل نطاق R07 التشخيصي المتفق عليه؛ يبقى القبول الرسمي للإصدار ومراجعة التنبيهات الأمنية السابقة مفتوحين.

سابقًا نجحت جميع مهام الدفع الست وفحوص PR الثمانية على `5879c61`، ونجحت مهام الدفع الست على `6f9cae7` بعد إيقاف معاينة Vercel القديمة لهذا الفرع بإقرار المالك أنها لم تعد مستخدمة. كشف فحص CodeQL المستقل ثمانية تنبيهات: أصلحت ثلاثة مواضع ReDoS بالكود، ووثقت تصنيف الخمسة الأخرى وأغلقتها فرديًا بأسبابها المثبتة. نجح التحليل النهائي على `1349371` بعد إعادة مهمة CodeQL الفاشلة وحدها مرة واحدة لمعالجة توقف رفع النتيجة؛ لم تُعد مهام الأمان الناجحة. التفاصيل في [المراجعة الأمنية](POST28_R07_CODEQL_REVIEW_2026-10-19.md). تعديلات R08 الثلاثة غير المكتملة محفوظة خارج هذه commits، ونقطة الاستئناف العملية هي استكمالها وفحوص الأثر المتبقية.

### سجل سابق — تجاوزته النتيجة أعلاه

نجحت حالات symlink الأربع على Linux، وأُصلحت عوائق CI المثبتة دون تغيير سلوك التطبيق أو إعادة فحوص المختبر والمتصفح. جُهز هدف Linux x64 / Node 22 / PostgreSQL 16 للمراجعة حسب اختيار المالك. التفاصيل والأدلة في [تقرير البوابات](POST28_R07_RELEASE_GATES_2026-10-19.md).

مرشح التنفيذ `8be720a65678d61eb8076f08177c5dc911c54c6d`؛ نقطة الاستئناف هي تشغيل GitHub Actions القائم `39278772529`، الذي شوهد في الطابور دون مشغّل. استرجاع حزم الإصدار وفحص صورة Linux مبرمجان ولم ينفذا بعد؛ القبول الرسمي لـR07 مفتوح. حفظ التقرير والأدلة فقط باستخدام `[skip ci]` يمنع تكرار التشغيل نفسه؛ لا ينسب إثباتًا جديدًا إلى commit التوثيق. حالة R05 وR06 السابقة محفوظة.

## بدء R08 الفعلي

التحديث الأحدث: **R08 مغلقة ضمن النطاق العملي المتفق عليه، ونقطة الاستئناف R09**. مصدر التنفيذ `cbb99ac63bb4497df9c07cf3e16611d27bcd3396` اجتاز مهام الدفع الست وجميع check runs الثلاثة والعشرين، بما فيها نتيجة CodeQL بعد المراجعة المحددة للتنبيه 160. نجح تشغيل نسختي API مع الحزم المسترجعة وPG16 وRedis وHTTPS، مع رفض الدخول عند انقطاع Redis وإيقاف سليم. [قرار الإغلاق والاستثناءات](POST28_R08_PRACTICAL_CLOSE_2026-10-20.md). السجلات التالية تاريخية بمصادرها؛ لا تغير حالات R05/R06/R07 ولا تمنح قبول إنتاج.

بدأ R09 تدريجيًا: أُصلح التحقق من وجهة العودة بعد الدخول على `2141eb2` وثبتت ثلاث حالات مستهدفة، مع بقاء إثبات المتصفح والمصفوفة مفتوحين. [الدفعة الأولى ونقطة الاستئناف](POST28_R09_FIRST_SLICE_2026-10-20.md).

تحديث R09 في 2026-10-20: نجح المرشح `ce0690c36759fc73ac202a679f905054b7a4607b` في جميع فحوص GitHub الـ23، وتجربة طالبين فعلية من حزم API/Web/Admin على Linux وPG16 وHTTPS: عودة للرابط العربي، تسجيل في الدورة، تقدم 50 محفوظ بعد reload مقابل صفر للطالب الثاني، ورفض إدارة الدورات. أُصلح إذن جدول تقدم الدرس في المختبر فقط، وأُضيف تعقيم CMS مع أربعة فحوص Chromium فعلية. الحالة `IN_PROGRESS_LEARNER_AND_CMS_BROWSER_VERIFIED`؛ لا قبول شامل لـR09 أو لأي حالة كاملة من المصفوفة. [الإصلاحات والفشل السابق والأدلة والمتبقي](POST28_R09_LEARNER_JOURNEY_2026-10-20.md). التالي: canary محدود للقراءة العامة ومطابقته بالمالك ومنع ظهور غير المنشور، مع استكمال الأدوار والعلاقات حسب المخاطر.

التحديث الحالي بتاريخ 2026-10-20: أُصلح سباق تجديد الجلسة المثبت بـP2034 ونجحت الحالات الخمس الفعلية، وأُثبت ترتيب حدثي المالك المتأخرين، ومصالحة تحصيل صناعي فقد الرد دون تكرار القيد أو الإيصال، واسترجاع عملية استيراد canonical مقتولة بعد commit، وwebhook موقّع عبر عمليتين وRedis. حُفظت نتائج الفشل والإصلاح ولقطات الآثار والledger/receipts ومصادرها الدقيقة في [تقرير R08 الحالي](POST28_R08_FAULT_RECOVERY_2026-10-20.md). جميع التعديلات الثلاثة التي كانت معلقة في بداية الدفعة صارت محفوظة ومرفوعة. المرشح المرفوع 4f95733؛ قبول R08 الشامل مفتوح، ونقطة الاستئناف تكامل API المبني مع TLS وRedis وبقية مصفوفة المزودين. إثباتات R07 السابقة محفوظة على مصدرها.

### السجل السابق — لا يصف الحالة الحالية

أُثبتت سلسلة Outbox إلى Inbox ومساحة الطالب بعمليات حقيقية: التنافس، التعطل قبل وبعد الأثر، والاستنفاد. نتائج أربع حالات على 865dfac، ثم حالة Audit المقواة وحدها على 770d787، محفوظة بمصادرها. R08 مفتوحة للنطاق الكامل؛ التالي drain/freshness ثم Redis والمزودون. [التقرير ونقطة الاستئناف](POST28_R08_OUTBOX_PROCESS_CHAIN_2026-10-19.md).


متابعة R08: أُصلح بدء خطوات عامل جديدة بعد stop وسباق initial tick، وفُرض خروج بالرمز 1 عند مهلة الإيقاف المطلقة حتى مع تعليق flush. [التقرير والأدلة](POST28_R08_SHUTDOWN_2026-10-19.md). مرشح التنفيذ 825a0b5 وتشغيله 39285187356؛ Linux SIGTERM وRedis وبقية النطاق غير مقبولة بعد.


متابعة R08 على 26fe899: نجحت SIGTERM ومهلة15 ثانية على Linux فعليًا، وRedis الحقيقي بمحدد معدل عبر عمليتين وعزل namespace/revision ورفض stale/outage وصلاحيات ACL محدودة وتنظيف مثبت. [التقرير والأدلة](POST28_R08_LINUX_REDIS_2026-10-19.md). R07 لم تكتمل؛ التشغيل39287364100 تجاوز أعطال inventory/Vercel السابقة إلى lint. بقيت جلسات API الموزعة وبقية سلاسل R08 والإصدار الشامل.


نتيجة لاحقة للتشغيل39287364100: R07 فشلت في11 حالة unit عبر5 ملفات بعد نجاح lint/build؛ لا artifacts أو قبول إصدار. R08 Linux/Redis مثبتة مستقلًا. تفاصيل الملفات الفاشلة في تقرير R08/Linux/Redis أعلاه، ونقطة الاستئناف الحالية جلسات API وسلاسل R08 حسب توجيه المالك.


متابعة R08 وإلغاء Studio: أُلغيت launchers وCI وiframe/cookie profile الخاصة بالمنصة. نجحت4 حالات جلسات فعلية بين عمليتيHTTP وPostgreSQL16 على6e42d92، ثم إقلاع المتصفح مع CSS nonce للتطوير فقط على ملفات المرشحbe5407e. [التقرير والأدلة](POST28_R08_SESSIONS_AND_STANDARD_RUNTIME_2026-10-19.md). التشغيل القياسي عبر npm run dev وnpm run dev:admin؛ جرد البيئة العام318 اسمًا محفوظ. R07 مفتوحة ولا تُحل إخفاقاتها الـ11 المستقلة بحذف Studio. نقطة الاستئناف: concurrency/unknown outcomes وبقية سلاسل R08.


تحديث التسليم R09 في 2026-10-20: اكتملت المسارات العملية المحددة بالأدلة على `819216e` مع فحوص GitHub الناجحة، وبقيت تجربة الطالب السابقة على `ce0690c` بمصدرها. **R09 ليست مغلقة رسميًا**؛ E01–E05 متطلبات إلزامية مفتوحة، ولا تختزل إلى مرور عينة. [الحالة والأدلة ونقطة الاستئناف](POST28_R09_PRACTICAL_HANDOFF_2026-10-20.md). لا تغيير لحالات R05–R08 أو قبول إنتاج.

### R09 — تحديث 2026-10-20: المجموعة المشتركة

نجحت خمسة سيناريوهات جديدة معًا على قاعدة PostgreSQL 16 صناعية واحدة وLinux عند `b94ecd49d03463ea89ba26e510ba2ca7f87597a5`، ونجحت فحوص GitHub الـ23. تشمل الأدلة العزل ودورة CMS والشهادة الواحدة والأثر المالي الواحد وعلاقات ثلاثة أنواع من الملاك عبر الصفحات. [التقرير وحدود القبول](POST28_R09_WORKFLOW_PROGRESS_2026-10-20.md). القبول الرسمي لجميع سلاسل R09 وصفوفها ما زال مفتوحًا؛ لا إعادة نسبة للأدلة التاريخية ولا تغيير لقبول المراحل الأخرى.

متابعة لاحقة: أُصلح زر سحب المنشور مع وجود مسودة بديلة، وأُثبت توليد ملفات الشهادة الثلاثة وربطها وإعادة التنفيذ دون أثر إضافي. [تقرير التوليد والسحب وحدود التسليم](POST28_R09_RENDER_WITHDRAWAL_2026-10-20.md). المصدر الجديد `d4ffe62`؛ لا تنطبق عليه تلقائيًا نتيجة CI السابقة.

R10 — تحديث 2026-10-21: أُصلحت بوابة أهداف التعافي لتمنع القيم النصية والسالبة وnull، وتحققت قراءة النسخة المحفوظة كاملةً دون قاعدة، ومطابقة 69 ملف دليل و6 أصول. نجح CI الإصلاح d83ee3e في المهام الست. القياسات التشغيلية السابقة مثبتة بمصدرها؛ ضوابط المزود غير مجهزة. [المراجعة الحالية والاستثناءات](POST28_R10_CURRENT_REVIEW_2026-10-21.md). التسليم البنيوي الأقدم محفوظ في [تقريره](POST28_R10_LOCAL_RESTORE_2026-10-20.md).

R10 operational continuation: actual API/Web/Admin recovery on restored DB verified at 978a0db; local RTO17s and two-probe RPO3.443s with one actual lost post-backup event. AWS design selected, not provisioned; production/provider gates remain open. See POST28_R10_OPERATIONAL_RECOVERY_2026-10-20.md.

R10 delivery update: all 23 check runs passed at c8afe5f (push 39451932873, PR 39451943225), including artifact retrieval and actual Linux runtime. The majors warning was independently verified fixed in the browser; original RTO/RPO were not repeated. Evidence-only followup retains exact source attribution. Actual provider controls remain unprovisioned.

R11 preparation: corrected load evidence acceptance for missing/nonfinite duration, invalid fixture identity and conflicting duplicate categories. Seven workload categories and outstanding budget/dataset requirements are recorded in POST28_R11_PREPARATION_2026-10-20.md. No load or SLO acceptance claimed; R10 provider controls remain open.

R11: actual bounded API read diagnostics completed: public search 60 samples and scholarship text filtering 30 samples. Raw rate-limit aborts retained, existing limiter unchanged, all new labs stopped. Small synthetic data and five remaining categories prevent full SLO acceptance. See POST28_R11_LOCAL_READ_DIAGNOSTIC_2026-10-20.md.

R11 follow-up: five additional bounded scenario diagnostics completed; 30 operations each for student HTTP writes, support read model, import identity receipts, local finance commands and inert outbox delivery. Previous reads were not repeated. Seven local diagnostic categories recorded with explicit partial coverage; full SLO and production acceptance remain open. See POST28_R11_LOCAL_SCENARIO_DIAGNOSTIC_2026-10-20.md.

R11 follow-up: fixed actual Admin login bootstrap cancellation, verified built Admin + MFA login/replay/logout in an isolated synthetic lab. Admin alone rebuilt; API/Web c8afe5f retained with independent source labels, not a unified release candidate. Linux contention/PG measurement added to CI; source guard corrected, actual Linux result pending. See POST28_R11_LINUX_ADMIN_FOLLOWUP_2026-10-20.md.

R11 MFA enrollment: real built Admin UI enrollment, invalid password/code denial, encrypted pending credential, confirmation/session revocation, next-code login and enabled-state rendering verified. Mixed source local diagnostic; formal load acceptance remains open. See POST28_R11_MFA_ENROLLMENT_2026-10-20.md.

R11 wire contract correction at 0402c97f6b5e93e7810a1053c6a43f0d410961f5: match canonical Problem Details code/status; targeted regression and real mapper pass. Native follow-up incomplete (fixture role first, then API unready with PostgreSQL already exited); no HTTP/Linux pass claimed after the fix.

R11 Linux push 39475394144 at 4b8e22f4cad6c5cdca384cf3e273c6d5cf97d61b: complete runtime and contention diagnostic verified from digest-matched artifact; 10 winners, 10 expected version conflicts, durable replay, zero unexpected errors and confirmed cleanup. Full SLO acceptance remains open.

R11 practical diagnostic scope closed with documented exceptions at validated candidate 4b8e22f4cad6c5cdca384cf3e273c6d5cf97d61b. Push 39475394144 succeeded; all 23 observed check runs succeeded; Linux contention and cleanup verified from digest-matched artifacts. Formal SLO and production acceptance remain OPEN. See POST28_R11_PRACTICAL_CLOSEOUT_2026-10-20.md and .json.

R11 — مراجعة 2026-10-21: أصلح 2934821 بدء عملية بعد استنفاد المدة أثناء انتظار مراقب الموارد، ومنع استبدال زمن الاستجابة المقاس بقيمة السيناريو. نجحت الحالات الخمس المتأثرة، وطابقت 30 ملف دليل سابق دون إعادة الحمل. CI الإصلاح 39514942840 جارٍ؛ E1–E5 والقبول الشامل مفتوحان. [المراجعة والأدلة الحالية](POST28_R11_CURRENT_REVIEW_2026-10-21.md).

R12 started: rollback evidence gate now requires previous API compatibility, identified prior source and API/worker digests, a real incident-owner string and a bounded approved canary record. Previous API/worker source is unchanged between c8afe5f and 4b8e22f; previous Admin excluded. Current artifact transfer failed through two channels; no runtime or database action taken. See POST28_R12_PREPARATION_2026-10-20.md.

R12 API rehearsal executed: exact current/previous archives verified, stop/start without overlap, real HTTPS session/CSRF continuity and durable replay, financial/history preservation and loopback-only listeners. Windows dependency layer reused with exact lock/schema; no distinct API implementation rollback claimed. Old worker/drain/lease and production canary remain OPEN. See POST28_R12_API_REHEARSAL_2026-10-20.md.

R12 practical local diagnostic scope complete with documented release blockers: built prior StudentWorkspace worker receipt replay and real in-flight database-lock drain passed; stale lease CAS passed on PostgreSQL16; frozen prior/current asset source contracts preserved bytes and rejected corrupt/retired delivery. Windows IPC is not Linux OS signal proof; real provider HTTP/grants, complete worker inventory and formal canary remain OPEN. No formal rollback PASS or production acceptance. See POST28_R12_PRACTICAL_CLOSEOUT_2026-10-20.md and .json.

R12 — مراجعة 2026-10-21: طابقت 48 ملف دليل و29 ملف مصدر أصل وحزم المرشحين الست وSBOM، دون إعادة بروفة. لم يتغير مصدر API أو الحراس أو حدود السياسة المحمية. يبقى التوافق محدودًا بعامل StudentWorkspace، وR12-E01…E04 مفتوحة. CI إصلاح R11 ما زال جاريًا. [المراجعة الحالية](POST28_R12_CURRENT_REVIEW_2026-10-21.md).

R13 review packet prepared at 56e14b1ef0aad35d48a67299feb3481233ae230f: Windows evidence-verifier silent CLI no-op fixed and targeted checks passed; real verifier rejected SHA mismatch and missing signed bundle. Indexed 27 sections, 77 relationships, 42 cases with 26 historical progress links, 24 FSA requirements and the existing 54-finding register. Verified 60 referenced evidence file digests without runtime repetition. Final C2, section27 source acceptance, independent evidence and validation/staging remain BLOCKED. See POST28_R13_REVIEW_PREPARATION_2026-10-20.md.

R13 section27 curation: matched all38 task IDs against master/ledger/release inventory, linked60 implementation files and related tests, with focused source reviews of XMI-021/029/033 and35 reference-only tasks still needing review. sectionClosed remainsfalse. CI68bb180 failed only source preflight due to stale SOURCE_SHA inventory test-reference link; regenerated that one link and affected inventory check passed. New CI unverified; Windows promotion CLI entry issue recorded without executing promotion. See POST28_R13_SECTION27_SOURCE_CURATION_2026-10-20.md.

R13 follow-up7877604: corrected the Windows promotion entry predicate, verified native-path/import selection and inert import (2 tests), retained synthetic bounded-reconciliation behavior (2 tests), and verified its authorization/evidence body unchanged. Promotion CLI and real controller were not invoked. Both SOURCE_SHA and PATH source-reference rows regenerated; affected inventory check passed. New CI unverified.

R13 practical isolated review scope complete: all38 section27 tasks risk-reviewed with explicit limits, no new critical/high defect confirmed by this review; source ledgers unchanged. CI39493746596 on92eb66e succeeded in all6 jobs, artifact retrieval and actual fresh Linux/Node22/PG16 HTTPS API/Web/Admin and browser/contention/workflow diagnostics verified from matching artifact digests, cleanup proved. Formal R13 and validation/staging/production remain BLOCKED by R13-E01…E05. Source review is not independent signing or full acceptance. See POST28_R13_PRACTICAL_CLOSEOUT_2026-10-20.md.

R13 — مراجعة2026-10-21: أُصلح قبول قياسات التعافي غير الرقمية في cbe2ff2، ونجحت ثلاث حالات جديدة واختبارا R12 المرتبطان. طابقت63 ملف دليل و60 ملف تنفيذ للمهام38. CI إصلاح R11 نجح في المهام الست؛ CI الإصلاح الجديد39516645007 جارٍ. R13-E01…E05 وقرار BLOCKED باقيان. [المراجعة الحالية](POST28_R13_CURRENT_REVIEW_2026-10-21.md).

R14 — مذكرة تجهيز2026-10-21: NO_GO للإنتاج مع خمسة عوائق إصدار قائمة. لا قبول رسمي أو ترقية؛ التالي الوظيفي رحلة Admin كاملة مع MFA في مختبر صناعي. [المذكرة وقائمة العمل](POST28_R14_NO_GO_PREPARATION_2026-10-21.md).

## تحديث رحلة Admin وCI — 2026-10-21

اكتملت رحلة CMS العربية من Admin المبني مع MFA وثلاثة أدوار، وظهور المنشور وبقاء النسخة العامة أثناء تعديل المسودة واختفائها بعد السحب. النطاق Windows محلي بمصادر حزم متعددة معلومة؛ لا قبول Linux موحد أو الإنجليزية أو الحمل الشامل. CI على cbe2ff2 اكتمل بنجاح بست مهام. التفاصيل وحدود Consent والمحاولات المحفوظة في [الدليل الجديد](POST28_ADMIN_CMS_MFA_JOURNEY_2026-10-21.md). هذا التحديث يحل انتظار CI وفجوة الرحلة المحلية في النص السابق، مع بقاء القبول الرسمي وNO_GO وبوابات الإصدار الأخرى. التالي: التسليم الخاص للوثائق والشهادات.

## تحديث أصل الطالب الخاص — 2026-10-21

أُصلح تجاوز انتهاء الاحتفاظ ومنع سباق السحب أثناء منح الرابط على6fa9054، ونجح فحص API المبني على PostgreSQL16 ومزود HTTPS صناعي. لا يعمم على الشهادة أو بث وثيقة المراجع أو إبطال رابط موزع سابقًا فورًا؛ تبقى هذه نواقص نشر واضحة. [التنفيذ والحدود ونتيجة CI المعلقة](POST28_PRIVATE_ASSET_RETENTION_2026-10-21.md). لا تغيير في القبول الرسمي أو NO_GO.

## تحديث بث المراجع وCI — 2026-10-21

ثبت بث وثيقة المراجع من API المبني مع MFA وسحب الموافقة أثناء التخزين والانتهاء ورفض الطالب الآخر والبايتات المحرّفة. اكتمل CI على6fa9054 بست وظائف ناجحة. [الدليل وحدوده](POST28_REVIEWER_DELIVERY_2026-10-21.md). لا قبول شامل أو إنتاج؛ الخطوة التالية تسليم الشهادة.

## تحديث تسليم الشهادة — 2026-10-21

نجح تسليم PDF وpreview موقّعين للمالك عبر API المبني ورفض الطالب الآخر والمنح الجديدة بعد السحب. رابط مزود صدر قبل السحب ظل200 ضمن TTL؛ R14-DELIVERY-01 مفتوحة ولا قبول للإبطال الفوري أو الإنتاج. [الأدلة والأثر والتوصية](POST28_CERTIFICATE_DELIVERY_2026-10-21.md).
