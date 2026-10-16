# R08/R09 — تجهيز العمال والمتصفح وتصحيح تصنيف الدليل

R08: `PREPARED_RUNTIME_NOT_EXECUTED`. R09: `SOURCE_GUARDS_FIXED_BUILT_BROWSER_NOT_EXECUTED`. لا CLOSED أو PASS للمرحلتين.

الفرع `fix/post28-ci-environment-inventory-20261016`. مرشح تجهيز R06/R07 وفحوصه: `70e22445f95f2c86bb8155f80ad1aea3fce41982`. [سجل الأوامر والوقت والنتائج والـhashes](../reviews/evidence/post28/70e22445f95f2c86bb8155f80ad1aea3fce41982/R06-R09-preparation/summary.json)، [فهرس التغطية](../reviews/evidence/post28/70e22445f95f2c86bb8155f80ad1aea3fce41982/R06-R09-preparation/R06-R09-preparation.json). تصحيح تقارير WP-IC-10 اللاحق: `328535ffa80e6a2a9e819100f546424d525b5833`،[أدلته المنفصلة](../reviews/evidence/post28/328535ffa80e6a2a9e819100f546424d525b5833/R09-playwright-contracts/summary.json). لا يعاد وسم بناء المرشح الأول باسم الثاني؛التغيير اللاحق يخص wrapper تشخيص HTTP وليس مخرجات الوحدات المبنية. كلا الجولتين على مصدر نظيف وNode22.16.0.

## R08: الشروط والحدود

الخطة تثبت DB-E/DB-T مستقلة،عاملين حقيقيين وlease fencing/retry/reorder/crash-restart وSIGTERM budgets وRedis namespace وprovider stubs فقط. لم تُقلع API أوworkers أوRedis،ولم تُنفذ اختبارات provider أوإرسال أوأموال. اختبارات shutdown/lifecycle السابقة تعتمد موارد معزولة؛لم تُكرر في هذه الجولة ولا تُعتبر قبول تأثيرات PostgreSQL/Redis. يلزم R06/R07 الفعليان ولقطات ledger/receipt/delivery ومراقبةfreshness بعدجهوزية القاعدة والخدمات.

## R09: ما أُصلح وما أُثبت

- كان wrapper القديم يكتب browser-e2e pass بعد3 اختبارات HTTP علىdev server؛لا يستخدم page/browser. صار يصدر `IMPORTED_COURSE_HTTP_BOUNDARY_DIAGNOSTIC` معpass=false وbuiltBrowserVerified=false وruntimeAcceptance=false حتى لو نجحت اختباراتHTTP. finalizer الذي يتطلبbrowserE2E يظلBLOCKED.
- أضيف Playwright JSON discovery قبل التشغيل ومقارنة file/id/project بالضبط بعده،ورفضempty/missing/extra/duplicate/skip/flaky/retry/expected-failure. يجب تنفيذ الحالات الثلاث المعلنة،ولا تُستعمل نتيجة قديمة أوoutput داخلGit.
-20/20 اختبار عقد ناجحة على `328535ffa80e6a2a9e819100f546424d525b5833`،صفر فشل/تخطٍّ/إلغاء؛تتضمن12 اختبارًا للفاحص الجديد و8 للـfinalizer. واحد منهايشغل Playwright فعليًا لحالة inert بلاbrowser/webServer/DB لإثبات تطابق صيغةlist/run؛ليس تشغيل متصفح. ESLint وarchitecture وجرد البيئة وsecret scan ناجحة علىالمرشح نفسه.
- فهرس77 علاقة/42 حالة ومصفوفة26 مجالًا بأبعادهاالخمسة محفوظ في الحزمة. لا تصبحprofile محدودة أوsample أوHTTP interception تغطية كاملة.

## المتبقي للقبول

Built API/Web/Admin وTLS وDB-E وowner fixtures وpermission/owner negatives وlifecycle/locale/deep links،وتغطية كلصف mandatory وFG-024 وقراراتالسوق ولغةالتدريس وDEC وأدواتeffects الفعلية. لا تنفيذ dev wrapper أوbrowserمتكامل في هذهالجولة؛الجميع ينتظرNeon والخدماتالمعزولة ومتطلباتالمراحل السابقة. لاload أوrestore أوrealproviders ولاproduction acceptance.
