# تجهيز Neon ومراحل R04/R05 وما بعدها

> تحديث أحدث بتوجيه المستخدم: سُجلت مراجعة R05 منتهية مع عوائق دون PASS، ثم نُفذت49 حالة PostgreSQL على DB-T مستقلة ضمن R06 المحدودة. التفاصيل والأدلة والاستثناء المحلي في [تقرير R05/R06](../remediation/POST28_R05_DISPOSITION_R06_RUNTIME_2026-10-16.md). المتن التالي يسجل الحالة السابقة ولا يلغي نتائج التشغيل أو يمنح قبولًا شاملًا.


> أحدث حالة R05 المحلية: [تشغيل46 fixture وbackup والاستعادة وقياس بوابة110](../remediation/POST28_R05_HISTORICAL_EXECUTION_2026-10-16.md). البوابة محجوبة عند orphan صناعي مقصود واحد. لا ينسب ذلك إلى Neon أو قبول R05 الكامل.


> تحديث محلي 2026-10-16: أُغلقت R04 محليًا وفق [تقريرها](../remediation/POST28_R04_LOCAL_CLOSURE_2026-10-16.md). اختير predecessor109، ونُفذ baseline وbackup والتحقق البنيوي على U/V منفصلتين وفق [تقرير R05](../remediation/POST28_R05_BASELINE_BACKUP_EXECUTION_2026-10-16.md). قبول R05 الكامل ما زال BLOCKED لبوابات البيانات التاريخية والترقية. ما يلي سجل تجهيز سابق؛ فقرات «لا يوجد predecessor» و«التحقق الحي لم ينفذ» تصف زمنه، ولا تلغي الأدلة المحلية اللاحقة أو تثبت قبول Neon.

هذا دليل تجهيز قبل الاتصال. إنشاء الحساب/المشروع وإضافة الاتصال لا يعنيان نجاح R03 أو R04. لا يطبق هذا الدليل migration أو seed أو restore أو إرسال بريد/دفع. تعليمات المستخدم الحالية تسمح بالتجهيز والفحوص المستقلة، بينما إنشاء قاعدة Neon سيبدأه المستخدم.

## عند إنشاء المشروع

1. أنشئ مشروعًا تجريبيًا مستقلًا وفارغًا، دون بيانات أشخاص أو استنساخ إنتاج. PostgreSQL16 هو خط التجربة المحلي الحالي؛ اختره إن كان متاحًا، أو سجّل الإصدار الفعلي قبل فحص التوافق، ولا تُنسب له موافقة إنتاج. سجّل أيضًا المنطقة وUTC/extensions/pooling وحدود الاتصالات ومساحة التخزين وتكلفة الخطة.
2. احتفظ بالفرع الافتراضي فارغًا ومحميًا. خصص أهدافًا مستقلة بالأغراض الآتية؛ يمكن إنشاؤها بالتتابع لتقليل الموارد، مع هوية/run جديدين وعدم تداخل التشغيل. فرع Neon المستنسخ قد ينسخ البيانات والأدوار؛ لا تفترض أنه فارغ أو معزول بمجرد اختلاف اسمه.

   | الهدف | الغرض |
   |---|---|
   | DB-G | قاعدة فارغة لإعادة الترحيلات؛ لا fixtures أو seed قبل قبول البنية |
   | DB-S | shadow منفصل لـPrisma؛ قد تُعاد تهيئته، فلا يحتفظ بأي بيانات |
   | DB-U | predecessor معروف وبيانات صناعية قديمة لترقية R05 |
   | DB-T | المعاملات والتزامن والفشل والاختبارات المدمرة |
   | DB-E | API والمتصفح والعمال؛ لا تنظيف متزامن من DB-T |
   | DB-R | مرجع الاستعادة فقط؛ لا suites مدمرة أو greenfield عليه |
   | DB-L | الحمل ببيانات وميزانية معتمدتين |

3. استعمل اتصال **Direct** للترحيلات والهوية وshadow وفحوص الأقفال؛ لا endpoint مجمّعًا للاتصالات لهذه العمليات. استعمال pooling للتطبيق قرار مستقل لاختبارات التوافق لاحقًا.
4. افصل bootstrap/owner عن migrator وعن application/test وعن inspection وrestore. مستخدم Neon الافتراضي/المالك ليس هو app role. يلزم إثبات grants فعليًا؛ لا تمنح التطبيق CREATE أو ملكية قاعدة أو صلاحيات تجاوز triggers/RLS. لا تمنح الوصول إلى مشروع/فرع آخر لمجرد تشابه الأسماء.
5. احفظ الروابط المصادقة وكلمات المرور في أسرار بيئة العمل فقط، خارج Git وGitHub secrets والدردشة، وفق توجيه المستخدم. لا تلصق الرابط هنا ولا تمرره في command arguments. سجل غير الأسرار فقط: معرفات المشروع/الفرع/endpoint، الإصدار، الأسماء والأغراض والأدوار. لا تعيد استخدام أسرار المشروع الحقيقي. يمكن حجز روابط Direct في أسرار باسم POST28_NEON_DB_G_DIRECT_URL وPOST28_NEON_DB_S_DIRECT_URL وPOST28_NEON_DB_U_DIRECT_URL؛هذه أسماء حفظ مخصصة للتجهيز،لا يقرأها runner الحالي ولا تشغّل شيئًا تلقائيًا. لا تستبدل DATABASE_URL العام باتصال Neon قبل تجهيز مساره المحروس.
6. PostgreSQL يحتاج TCP، وسياسة HTTPS المفتوحة لا تثبت السماح به. أضف **اسم Direct endpoint المحدد** إلى صلاحيات اتصال TCP عبر إعداد البيئة المدعوم، ثم أعد فحص الجاهزية. لا تعطل proxy/CA أو TLS لتجاوز المنع. استخدم التحقق الصارم للشهادة واسم المضيف وفق دعم العميل (مثل verify-full في libpq)، وأثبت إعداد Prisma5.22 المتوافق قبل التشغيل.

## تحديث تجهيز القراءة فقط

أضيف مسار تحقق Neon بالقراءة فقط عبر `post28-preflight.mjs` كما يوضح [دليله](POST28_NEON_READ_ONLY_PREFLIGHT.md). يربط تصريح SHA/run بالسجل ومطابقة Neon API قبل وبعد SQL، ويفرض TLS وأدوارًا محدودة. لا يفتح مسار ترحيلات Neon: verifier وPrisma diff ومشغلات الاختبارات ما زالت ترفض التنفيذ البعيد صراحةً. الفقرات الآتية تصف قيود مسار التنفيذ المحلي وتاريخ التجهيز، ولا تعني إلغاء المسار الجديد للقراءة فقط.

## شرط مهم قبل أي تشغيل على Neon

الحارس الحالي `post28-isolation.mjs` **محلي فقط**؛ و`post28-psql.mjs` يستعمل SSL disable للـloopback المحلي. لا تمرر Neon إلى هذين المسارين ولا تعدل hostname أو تفتح allowlist عامة لتجاوز الرفض.

أضيف `post28-neon-policy.mjs` لفحص التصريح فقط: Direct endpoint محدد، TLS صارم لـPrisma، أدوار محدودة، ورفض aliases لنفس branch/database. لا يفتح اتصالًا، ويعيد دائمًا liveIdentityVerified=false وruntimeExecutionAuthorized=false. لا يثبت هذا أن المشروع أو الفرع أو TLS متاح فعليًا.

تكييف التشغيل الحي على Neon ما زال متطلبًا قبل R03: عقد remote target صريح ومرتبط بـSHA/run/project/branch/endpoint/database/role، وإثبات هوية مستقلة عن URL والاسم، والتحقق من TLS والـroles والـschema والـshadow وعدم تداخل الأهداف. الاعتماد المحلي على `pg_control_system()`/database comment يحتاج إثبات توفر وصلاحيات على Neon أو بديل provider-attested مراجع؛ رفض الدالة ليس تصريحًا بإسقاط اختبار الهوية. لا تُغيّر user schemas أو exceptions أو public grants تلقائيًا لإرضاء المنصة. تبقى الحالة BLOCKED إلى أن يُنفذ هذا التكييف ويُختبر منفيًا.

## حزمة R04 الجاهزة للمصدر

من Node22.16، يمكن توليد حزمة **بلا اتصال** على SHA نظيف، إلى اسم ملف جديد خارج المستودع؛ يجب أن يوجد parent directory مسبقًا:

```bash
node scripts/database/prepare-post28-acceptance.mjs /absolute/private/directory/acceptance-preparation.json
```

المخرجات: SHA/tree، بصمات schema وسلسلة الترحيلات، جميع أسماء/checksums الترحيلات الفعلية، مرشحات NOT VALID المصدرية، فهرس77 علاقة/42 حالة/13 FX، وخطة المراحل R04–R14. `runtimeExecuted=false` و`runtimeAcceptance=false` دائمًا. فحص أسماء SQL بالأسطر قائمة مراجعة مصدرية؛ لا يحل محل parser PostgreSQL أو live catalog. الحزمة لا تؤكد وجود حساب أو اتصال Neon، ولا تعيد استخدام مخرجات قديمة أو تكتب داخل Git.

عند استيفاء R02/R03 في الهدف المدعوم:

- freeze نظيف ثم preflight فارغ لـDB-G/DB-S، وتحديد output directory جديد مطلق خارج Git.
- deploy؛ مطابقة ledger بالاسم/checksum والترتيب والوقت وfinished/rollback/steps لكل سجل. العدد وحده غير كافٍ. الأمر `verify-post28-migration-ledger.mjs` يقارن JSON المقاس بالشجرة الحالية، لكنه لا يصدق ملفًا صناعيًا كقبول تشغيل.
- deploy مرة ثانية، مع ledger مطابق بايتيًا، دون آثار مكررة؛ لا تستخدم migrate resolve لإخفاء فشل.
- تدقيق كل FK/CHECK/index/trigger اليدوي والعلاقات وأدوار التطبيق وsession_replication_role=origin. مرشحات NOT VALID تشمل عدة CHECKs مالية وservice وFK وثيقة الطالب؛ لا تعتمد الإحصاء المصدري كحالة catalog فعلية.
- orphan/data audit ثم إجراء VALIDATE محدد ومراجع. لا تعديل migration تاريخية، ولا إعفاء شامل، ولا حذف بيانات أو تصحيح علاقات بالاسم. لن يمر الفاحص مع قيد غير متحقق أو index غير صالح.
- Prisma schema/migration-directory diff مع exit-code الصحيح، دون تنفيذ diff SQL؛ seed required-only لاحقًا مع dry-run/reconciliation وإعادة apply. لا db push/reset أو db:provision كسلسلة عمياء.

يتوقف المسار الحالي إذا كانت NOT VALID باقية؛ **إجراء التحقق والقبول الحي لم يُنفّذ بعد**. مطابقة ledger وإعادة deploy أصبحتا في verifier المحلي، بينما القياس والتوافق والتوقيعات وseed acceptance ما زالت مطلوبة.

## تجهيز R05 والعلاقات

R05 لا يبدأ تنفيذًا قبل R04. لا يوجد predecessor مختار؛ يلزم SHA وترتيب migrations وPrisma client مطابقان وخطة بيانات صناعية يقرها أصحابها. إنشاء DB-G فارغة لا يوفر baseline ترقية.

تُجهّز FX عبر أوامر المالكين، مع حالات تاريخية مقصودة: actor NULL، وثيقة مرتبطة/غير مرتبطة وasset orphan، consent ناقص/whitespace/مسحوب/مستقبلي، نشر/ترجمة قديمان، invoice/hold/receipt قائمة، وعلاقات canonical غير صالحة حيث يسمح predecessor بتركيبها دون تجاوز حراس. لا تُستخدم البيانات الصناعية كقرار DEC أو نتيجة PASS.

الحزمة تدرج جميع281 model counter و8 مجموعات بصمات مطلوبة: receipts،ledger،consent،asset bindings،university programs،scholarship targets،course projections،published versions. هذا **عقد تجهيز**؛ producer المقاسات الحقيقية لم يُنجز بعد. تحتفظ اللقطات الخاصة بهويات مختصرة/صناعية وبصمات دون بيانات طالب أو URLs مصادقة في التقارير.

المقارن المتاح:

```bash
node scripts/database/compare-post28-upgrade.mjs /private/upgrade-plan.json /private/before.json /private/after.json
```

يتطلب run واحدًا وDB-U بالهوية نفسها وSHA قبل/بعد محددين وschema/chain hashes، وبنود counts/invariants مطابقة تمامًا للعقد. يتحقق من الأرصدة بوحدات صحيحة نصية مع currency/scale وaccount group، دون تقريب Number. يرفض فقد صف أو relation/receipt أو تغيير أموال أو هوية/نسخة أو bypass للـtriggers. لا توجد سماحات delta افتراضية؛ تحول schema أو backfill المبرر يحتاج عقدًا مراجعًا مستقلًا. لا تُفسَّر نتيجة المقارنة كقياس DB أو توقيع قبول.

تظل مطلوبة: backup صناعي متحقق واستعادة أولية على هدف مستقل، فحص locks/timeouts بميزانية، انقطاع آمن ثم resume/idempotency، تشغيل client السابق، ledger/catalog كاملان بعد الترقية، معالجة owner-reviewed للأيتام. لا restore الآن ولا down migration مدمر.

## المراحل اللاحقة

الحزمة تربط R06 بالمعاملات الحقيقية واتصالين، R07 بالوحدات الثلاث المبنية، R08 بالعمال وRedis/storage/stubs، R09 بالمتصفح وTLS وعلاقات77/CD42 وFG-024، R10 باستعادة DB-R بموافقات مستقلة، R11 بالحمل وميزانيته، R12 بتوافق التراجع، R13 بالأدلة والتوقيعات وR14 بقرار المالك. كلها NOT_EXECUTED؛ قرارات DEC-01…07 والأسواق واللغات والسلطات لا تُفترض. وجود هذا الربط لا ينشئ أدوات قياس كاملة أو يغلق بوابات سابقة.
