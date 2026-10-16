# Post28 — تسجيل عوائق R05 وتشغيل R06 على PostgreSQL فعلي

التاريخ: 2026-10-16. الفرع: `fix/post28-ci-environment-inventory-20261016`.

## قرار النطاق والحالة

وجّه المستخدم باستكمال الفحوص المفيدة، وتسجيل عائق R05 إن بقي، ثم متابعة العمل نحو التشغيل الفعلي. سُجل التوجيه في `config/testing/post28-stage-disposition.json`:

- **R05 review: REVIEW_COMPLETE_WITH_RECORDED_BLOCKERS؛ runtime: BLOCKED؛ acceptance=false.** لم نغيّر دليل اليتيم، ولم ننفذ109→110 على DB-U السابقة، ولم نعتبر الترقية ناجحة.
- **R06: PARTIAL_SCOPED_RUNTIME_PASSED.** بدأ التنفيذ الفعلي على DB-T جديدة ومستقلة. هذا استثناء محلي محدود من اشتراط نجاح R05 لكل تشغيل R06، بتوجيه المستخدم الحالي؛ لا يعطل حراس الاتصال أو العزل أو صلاحيات الأدوار، ولا يمنح قبول R06 الكامل أو نشرًا.
- R04 المحلية المقبولة ما زالت المرجع للبنية. يشترط المشغّل تطابق schema/chain الحاليين مع أدلتها قبل تجهيز T أو تشغيل suites.

عوائق R05 محفوظة في [تقريرها](POST28_R05_HISTORICAL_EXECUTION_2026-10-16.md) و[مقترح المعالجة](POST28_R05_SYNTHETIC_ORPHAN_REMEDIATION_REVIEW_2026-10-16.md): معالجة orphan صناعي بمصدر موثق، الترقية109→110 وحفظ البيانات، توافق العميل السابق بعد الترقية، الأقفال/المهلات والانقطاع الآمن والاستئناف وإعادة التشغيل. لا تعديل لقرارات DEC ولا توقيع مالك مختلق.

## ما جرى تشغيله

| SHA مفحوص | المختبر/profile | ناجح | فاشل | متخطى |
|---|---|---:|---:|---:|
|`853fe76646c018e1fd9955034cd155311760856f`|leases: عامل المهام وtransactional outbox|2|0|0|
|نفس SHA|core-transactions: معاملات وصلاحيات وFK وقفل الوثائق|8|0|0|
|`e5369c6030cda109e6e72bc5105681135639f398`|assets: دورتا الأصول وCAS وحواجز الاستعادة والمرجع|39|0|0|
|**مجموع حالات DB المختلفة المنفذة**||**49**|**0**|**0**|

لم تُجمع إعادات التشغيل كحالات مستقلة. كل profile خضع لجمع Vitest فعلي، ثم مطابقة أسماء الملفات وهوية جميع الحالات بين discovery والتقرير؛ أي skip/zero/missing/failed كان سيُرفض. لم يُخفض minimumCases أو يتغير توقع نجاح اختبار قائم.

لم تُعد الاختبارات العامة ذات الآلاف أو R04 أو كامل Neon. استغرقت suites نفسها، شاملة المشغّل والهوية والجمع، نحو6s للـleases و1.4s للمعاملات و15.6s للأصول. لم نُسقط حالات إلزامية من داخل هذه profiles تحت عنوان الأداء. المجموعات الأخرى غير المنفذة لا تُحسب PASS أو skipped tests؛ هي تغطية لاحقة غير منجزة.

### ما تثبته الحالات

- **leases2:** تنافس المطالبين، استعادة lease منتهية، token جديد، منع complete/markProcessed/markFailed بالمالك القديم، heartbeat والمالك الحالي، وحفظ سجل تنفيذ المهام.
- **core8:** اتصالان بbackend PID مختلفين؛ التطبيق ليس superuser ولا مالك قاعدة ولا يملك CREATE؛ رفض DDL وكتابة ledger؛ rollback للفاتورة والإيصال وoutbox بعد فشل قبلcommit؛ commit الثلاثة ورفض receipt مكرر؛ حفظ مبلغ نصي `900719925474099312345` دون Number؛ رفض payment سالب وinvoice FK مفقود؛ ترتيب owner-first وlifecycle-first للوثيقة/الأصل، مع مراقبة `pg_blocking_pids` فعليًا وحواجز محدودة وانعدام binding جزئي عند الرفض.
- **assets39:** CAS وrevision/version history، retention/legal hold/claim، كتابة PURGED قبل cleanup وإعادة المحاولة، serialization للأصل/المرجع في الاتجاهين، rollback عند فشل المعاملة، حواجز archive/restore وlease expiry والاستئناف بعد failure ومقاومة takeover. آثار object storage/provider ممثلة بمحولات اختبار داخل هذه الحالات؛ لا يُدعى أنها فحص مخزن سحابي أو مزود حقيقي.

اختبارات core للفاتورة/receipt/outbox تقيس **ذرية SQL وقيوده** مباشرة. لا تساوي تشغيل أوامر مالك المالية أو بوابات الدفع/الاسترداد وdouble posting كاملة.

## المختبران وصلاحياتهما

كل مختبر أنشئ بموارد جديدة وصورة PostgreSQL16.15 المثبتة وNode22.16.0 وPrisma5.22.0. فُصلت أدوار bootstrap للإنشاء و`post28_tx_migrator` للترحيلات و`post28_app` للاختبارات. لم تُستخدم G/S/U/R كـT، ولم تُغيّر بيانات المختبرات السابقة.

| الإعداد | DB-T الأولى | DB-T للأصول |
|---|---|---|
|Run|`1e11952d-1ccc-4f54-9d31-1a3a87d0258e`|`c1fe555a-b68c-48d5-bedb-9b00b6972335`|
|Loopback port|15442|15443|
|Server identity|`7697304472899915822`|`7697305190137151531`|
|Database|`manaratak_post28_transactions_test`|الاسم نفسه على server مختلف مستقل|
|OID|16386|16386؛ OID نفسه ليس هوية server نفسها|
|المصدر|853fe766|e5369c60|

أثبت preflight فراغ الهدف قبل الترحيلات، وهويته وrun/SHA والـmarker والـrole وUTC والأدوار المحدودة. ثم نجحت validate/deploy/status/diff: **110 migrations/110 checksum matches،0 partial/rollback،282 جدولًا،0 NOT VALID و0 invalid indexes،schema diff exit0**. مصدر schema وسلسلة migrations لم يتغير عن قبول R04؛ لا حاجة لإعادة shadow replay المقبول سابقًا.

دور التطبيق يستطيع SELECT على قائمة281 application tables المحددة من schema المقبولة، وDML على whitelist محددة فقط:11 جدولًا في التجهيز الأول، و13 بعد إضافة جدولَي CMS اللازمين لاختبارات serialization. لا ledger أو sequences أو default/broad database grants أو CREATE أو ملكية قاعدة للتطبيق. هذه صلاحيات مختبر صناعي وليست توصية grants للإنتاج. فحوص الرفض الفعلية أثبتت منع DDL وledger writes؛ لا ترث عمليات Vitest سر دور إعداد schema.

الأسرار والعقود والسجلات الخام خارج Git في `/workspace/scratch/post28/labs/lab-VI9X4S/` و`/workspace/scratch/post28/labs/lab-AqEUS8/`. المختبرات مؤقتة وعقودها مرتبطة بمصدرها؛ بيئة أخرى تنشئ مختبرًا جديدًا ولا تعيد ربط العقد بـSHA جديد. لا تنسب نجاح loopback هذا إلى TLS سحابي أو Neon.

## الأخطاء/النواقص التقنية المعالجة

1. لم تكن أداة المختبر تدعم DB-T محدودة التطبيق مع principal منفصل للترحيلات. أضيف profile `transactions` وdeclared provisioning principal على هوية T نفسها، وفحوص role/identity/empty مستقلة قبل DDL. لم يُرخّص DB-T بدور MIGRATION في حارس الاختبارات؛ بقيت APPLICATION فقط.
2. كان شرط R04/R05 في runner تعليقًا دون فحص أدلة. أضيف ربط فعلي بأدلة R04 ومطابقة schema/chain، وتسجيل صريح لاستثناء المستخدم المحلي مع إبقاء R05 BLOCKED وfullR06Acceptance=false.
3. كانت مجموعتا الأصول مقيدتين بعنوان CI ثابت، فلا يمكن تشغيلهما على مختبر رسمي جديد ذي port/role مختلفين. أضيف فرع Post28 يفرض preflight حقيقيًا للـDB-T وmarker/SHA/catalog بدل الثابت. بقيت فحوص CI السابقة كما هي، وأضيف regression test يرفض مجرد flags أو label خاطئ.
4. جرى تحديد read/DML grants بقوائم reviewed وإخراج setup secret من بيئة اختبار التطبيق. أصبحت أدلة suites افتراضيًا خارج Git مع رفض output داخل checkout.

لم تظهر إخفاقات حالات DB في الجولة النهائية. لا تغييرات في SQL التاريخي أو product logic أو حراس TLS، ولا db push/reset أو حذف قواعد قديمة.

## الملفات والفحوص المصدرية

- `post28-lab-profile.mjs` و`create-post28-lab.mjs`: profile T وbootstrap schema principal منفصل.
- `post28-transaction-provisioning.mjs` و`initialize-post28-transactions.mjs`: حراس dual-role/preflight/empty، الترحيلات، ledger/diff، grants.
- `post28-r06-authorization.mjs` و`post28-stage-disposition.json`: توثيق وتقييد الاستمرار مع عائق R05؛ لا autorun نشر.
- `run-post28-suite.mjs` وcatalog/config: تنفيذ core8 وفصل الأسرار وإثبات النتائج وموقع الأدلة، وإبعاد ملفات DB عن source-only unit discovery.
- `post28-runtime-target.mjs/.d.mts` واختبارا الأصول: ربط suites بهوية Post28 الفعلية مع إبقاء CI.
- source guards/classification/environment inventory307 اسمًا، واختبار provisioning/authorization جديد واختبارات core PostgreSQL.

النتائج المصدرية النهائية على SHAe5369c60: **66 PASS /0 FAIL /0 SKIP** في3 ملفات، وتشمل الحالات65 السابقة وحالة adapter جديدة؛ لا تجمع65+66. architecture/source quality/secrets/environment inventory/repository organization/diff check ناجحة. ESLint:0 errors و25 تحذيرany سابقة في ملفي الأصول؛ لم تضف التعديلات أي any أو suppressions جديدة.

## أدلة قابلة للتدقيق

- [تجهيز و10 حالات DB على853fe766](../reviews/evidence/post28/853fe76646c018e1fd9955034cd155311760856f/r06-runtime/status.json).
- [تجهيز و39 حالة assets علىe5369c60](../reviews/evidence/post28/e5369c6030cda109e6e72bc5105681135639f398/r06-runtime/status.json).
- discovery وVitest assertion identities وsummary وchecks/timestamps/log hashes بجوار كل status؛ السجلات الخام الخاصة والعقود غير منشورة.
- [مصفوفة حالات R06 الـ26 المتبقية](../reviews/evidence/post28/e5369c6030cda109e6e72bc5105681135639f398/r06-runtime/required-case-status.json): لا نعلن اجتياز سيناريو كامل من مجرد نجاح foundation قريب منه.

## ما بقي ونقطة الاستئناف

R06 تملك الآن دليل PostgreSQL فعليًا لكنها ليست CLOSED. تبقى سيناريوهات المالكين: صلاحيات/consent الطالب وسحب الوصول عبر use cases، الماليات replay/parallel approvals/double posting، علاقات university/program/test/major/scholarship، course projection invalidation، والعقود ذات DEC غير المعتمدة. الحالات CD-035/CD-036 وغيرها لها أدلة جزئية محددة، لا قبول شامل. لا يفيد تكرار suites49 نفسها دون تعديل متأثر.

**التالي:** إضافة اختبارات runtime صغيرة للسيناريوهات غير المعتمدة على DEC، بدءًا بعزل الطالب/سحب consent وذرية أوامر المالية الحقيقية، مع grants محددة جديدة عند الحاجة وعلى مختبر جديد مرتبط بـSHA الاختبارات. حالات DEC تسجل BLOCKED لحين القرار؛ لا نخترع business policy لتنجح.

الخطوة نحو تشغيل المنصة بعد ذلك هي تجهيز DB-E وخدمات runtime المطلوبة، وتشغيل API/Web/Admin من artifacts والتحقق من health/auth/قراءة وكتابة فعلية قبل نشر Vercel/Render وشراء الدومين. لم نبدأ R07 أو boot للمنصة أو نشرًا في هذه الجولة، ولم نتصل بـNeon أو إنتاج أو ندمج main.
