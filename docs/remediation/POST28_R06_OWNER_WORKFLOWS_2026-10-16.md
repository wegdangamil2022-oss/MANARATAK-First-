# R06 — تشغيل أوامر الطالب والمالية على PostgreSQL فعلي

التاريخ2026-10-16؛ الفرع `fix/post28-ci-environment-inventory-20261016`.

## النتيجة والحالة

**19/19 حالة DB ناجحة،0 فشل،0 تخطٍّ؛67/67 حالة مصدرية ناجحة.**
SHA التشغيل النهائي: `3625cfedd5eac19c31866616e65bc34a1a08783c`. تقرير الأدلة commit لاحق لا يعيد نسبة التشغيل إليه.

**R06: PARTIAL_OWNER_WORKFLOWS_PASSED؛ ليست CLOSED.** بقي R05 بمراجعة منتهية مع عوائق دون قبول الترقية، والاستمرار المحلي المحدود في R06 بتوجيه المستخدم كما هو مسجل في [تقرير القرار السابق](POST28_R05_DISPOSITION_R06_RUNTIME_2026-10-16.md) و`post28-stage-disposition.json`. لا تغيير DEC أو قبول سحابي/إنتاجي أو تصريح نشر.

الحالات الجديدة مختلفة عن الـ49 السابقة. أصبح مجموع الحالات المختلفة المنفذة في R06 **68=49+19**، على SHAs مستقلة موثقة. جولة أولية على `b180c75713b7967716a23dd859bc27eeaaecefc3` نجحت14 حالة، ثم أضيفت5 حالات اعتماد؛ الـ14 داخلة في19 ولا تُجمع مرة أخرى. لم نعد assets39 أو leases2 أو core8 غير المتأثرة.

## الاختبارات الفعلية

أضيف profile `owner-workflows` ويجمع19 حالة بالهوية الفعلية ثم يطابقها مع نتائج Vitest؛ أي zero/skip/missing/failed يمنع نجاح المجموعة. استعمل التنفيذ Node22.16.0 وPrisma5.22.0 وPostgreSQL16.15، ومشغّل DB-T المحروس. لم تُستخدم mocks لمستودع Prisma أو `$transaction` أو سجل التدقيق أو outbox أو مرجع العملة.

### الطالب —8 حالات

1. رفض actor طالب آخر لتغيير الموافقة ورفض purpose أبيض، دون تغيير النسخة أو إنشاء decision/audit/outbox.
2. تنفيذ `StudentWorkspaceUseCases.updatePrivacyConsent` وكتابة privacy/version وdecision وaudit وoutbox معًا.
3. سحب الموافقة ثم منع كتابة تاريخ البحث والتحليلات اللاحقة بقراءة الحالة canonical من DB؛ التاريخ السابق يبقى دليلًا ولا يُحذف لإظهار نجاح.
4. طلبان عبر اتصالين مستقلين بالنسخة نفسها: ينجح كاتب واحد، ويرفض الآخر بـVERSION_CONFLICT، مع قرار وتدقيق وoutbox واحد فقط.
5. خطأ PostgreSQL قبل حفظ outbox يعيد workspace/version/preferences وdecision/audit إلى الحالة السابقة.
6. تشفير نتيجة خاصة بواسطة `StudentPrivateResultProtector` الحقيقي، ونجاح قراءة مالكها ورفض الطالب الآخر حتى مع savedReference الصحيح؛ ciphertext لا يحتوي القيمة الأصلية.
7. رفض النتيجة المنتهية ومسح envelope المنتهي، ثم رفض القراءة بعد تعليق مساحة الطالب استنادًا إلى الحالة الحالية في DB.
8. رفض تعديل وحذف collection لطالب آخر؛ تبقى بياناتها كما هي، وينجح تعديل المالك الصحيح مع تدقيقه.

لا تساوي هذه الحالات فحص HTTP/JWT أو graph أو تنزيل وثيقة؛ معرف الطالب في use case يمثل principal موثوقًا يمرره التطبيق، وربطه بالمستخدم المصادق يحتاج اختبار API مستقلًا. موافقة البحث/التحليلات ليست موافقة مراجعة الوثائق، ولم ندّعِ أنها تغطي تلك الحالة.

### المالية —6 حالات أوامر فواتير

1. `FinancePlatformUseCases` يحسب المبلغ server-side من البنود، ويستعمل `PrismaFinanceCurrencyReferenceGateway` الحقيقي، ثم يحفظ draft/audit/outbox دون ترحيل مالي مبكر.
2. تكرار إنشاء الفاتورة بالطلب نفسه يعيد نفس الفاتورة؛ تغيير الطلب بنفس المفتاح يرفض، دون تضاعف الفاتورة أو التدقيق أو outbox.
3. تعديل draft بنسخة متوقعة، ثم replay عبر `FinanceCommandRecord` الحقيقي؛ الطلب المختلف بالمفتاح نفسه يرفض، ولا تزيد النسخة أو الأدلة مرة أخرى.
4. إصدار الفاتورة ثم إعادة الأمر: معاملة مالية واحدة، قيدان متوازنان، إيصال واحد، تدقيق واحد وoutbox واحد. المبلغ `2702159776422297937035` (3×وحدة سعر كبيرة) محفوظ كنص صحيح، ومجموع DEBIT−CREDIT بواسطةBigInt يساوي0.
5. طلبا إصدار متزامنان على اتصالين مستقلين ينجحان بإعادة نفس الأثر؛ نسخة فاتورة واحدة وledger/receipt/audit/outbox غير مكررة.
6. خطأ PostgreSQL قبل outbox أثناء الإصدار يعيد الفاتورة إلىDRAFT/version1، ولا يبقي transaction أو entries أو receipt أو audit للإصدار.

### الاعتماد المالي —5 حالات

1. رفض اعتماد المنشئ لطلبه ورفض استبدال checkerId بهوية لا تطابق actor، دون قرار أو زيادة نسخة.
2. تطبيق سياسة المصدر القائمة: معتمدان مختلفان؛ بعد الأولPENDING وبعد الثانيAPPROVED. إعادة قرار الأول لا تكرر الأدلة، ولا يُستهلك الاعتماد دون أمر تنفيذي.
3. طلبان متزامنان من المعتمد نفسه وبنفس مفتاح الأمر: قرار واحد وreceipt واحد ونسخة واحدة زائدة، والحالةPENDING لأن المعتمد الثاني لم يقرر.
4. معتمدان مختلفان يتنافسان علىexpectedVersion1: ينجح واحد ويرفض الآخر stale؛ لا قرار جزئي أو quorum كاذب.
5. فشل PostgreSQL عند آخر حد قبل outbox يعيد approval/version وdecision وreceipt وaudit إلى ما قبل القرار.

سياسة المعتمدين مأخوذة من `financeApprovalPolicy` القائمة؛ لم نعتمد سياسة تجارية أو DEC جديدة. seeded OPEN adjustment case fixture تستخدم معرف وثيقة صناعيًا لتجربة **إنشاء قرار الاعتماد فقط**؛ لا تثبت سلامة وثيقة مصدر أو دورة الأصول أو manual ledger posting/consumption. سجلات الدفع/البنك/FX الخارجية لم تُستدعَ؛ registries فارغة وFX غير مهيأ. سياسة fee المنشأة لاستيفاء constructor غير مستخدمة في هذه الحالات ولا تعد قرار رسوم.

## كيف اختُبر التراجع والتزامن

الفشل يُحقن عند حد `transactionalOutboxRecord.create` عبر غلاف test client ينفذ `SELECT1/0` داخل **معاملة PostgreSQL الحقيقية نفسها**؛ ينتج SQLSTATE22012. يظل مسار owner والكتابات السابقة والتدقيق وrollback في DB حقيقيًا. لا نستبدل `$transaction` بنتيجة مصطنعة؛ assertions تقرأ من DB بعد التراجع. ليس هذا فصل شبكة أو crash للعميل/الخادم؛ لا يحل محل اختبارات انقطاع R05.

أُنشئ PrismaClientان مستقلان وأُثبت اختلاف backend PID ودور `post28_app` لكل منهما. حالات التنافس تطلق أوامر المالك بـPromise.allSettled وتفحص الأثر النهائي والـCAS/idempotency. لا تُعلن هذه الجولة أعداد retries أو lock-wait timings داخل معاملات المالية؛ أدلة blocking الحقيقية الخاصة بترتيبي الوثيقة/الأصل موجودة ضمن core8 السابقة. لا stress/load أو آلاف إعادات عشوائية.

## المختبر والقيود والصلاحيات

- Run: `036909f0-5a81-47da-9756-235b8f9a6a29`؛ loopback port15444.
- DB: `manaratak_post28_transactions_test`؛ server identity `7697311221793009707`؛ OID16386؛ UTC.
- إنشاء موارد جديدة فقط بالأداة الرسمية؛ bootstrap للإنشاء، limited migrator للإعداد، وapplication role للاختبارات. لا إعادة استخدام U/G/S/R، ولا تغيير عقود SHAs القديمة أو بياناتها.
- طبقت110 migrations وتطابقت110 بصمات وأسماء وترتيب،0 partial/rolled-back. Prisma validate/deploy/status/diff ناجحة؛ diff exit0،282 جدولًا،0 NOT VALID و0 invalid indexes حسب preflight.
- بقي READ على قائمة281 application tables؛ صارت قائمةDML محددة27 جدولًا لدعم أوامر المالكين والـfixtures. لا ledger grants أوDDL أوdefault grants أوownership للتطبيق. setup secret لا يورث إلىVitest. صلاحيات المختبر الصناعي ليست وصفة grants للإنتاج.
- أُنشئت fixture USD في ReferenceCurrency لتشغيل مرجع العملة الحقيقي؛ لا بيانات إنتاج أو اعتماد P7/governance مستنتج منها.
- الأسرار والعقود وبيانات النتائج الخاصة والسجلات خارجGit في `/workspace/scratch/post28/labs/lab-0CHyaf/`؛ المفتاح الخاص بنتائج الطالب مولد عشوائيًا داخل الاختبار ولا يُطبع. المختبر مؤقت ومقيد بـSHA/run؛ دردشة في بيئة أخرى تنشئ مختبرًا جديدًا.

## الملفات والنتائج المصدرية

- `tests/database/post28-owner-workflows.database.spec.mjs`:19 حالة تستخدم application use cases وPrisma repositories وcrypto الحقيقيين.
- `config/testing/post28-database-suites.mjs`: تعريف profile وعدده الأدنى19 دون خفض حراس النتيجة.
- `post28-transaction-provisioning.mjs`: whitelist DML للأوامر والـfixtures المطلوبة فقط.
- `post28-transaction-provisioning.test.mjs`: regression لتغطيةprofile ورفض ledger grants وإبعاد ملفات DB عن مصدر-only discovery.
- جرد البيئة المتولد307 أسماء دون قيم؛ لا تغييرات في Prisma Schema أو migrations التاريخية أو product business logic.

النتائج النهائية: **67 source cases PASS /0 FAIL /0 SKIP**. architecture/source quality/ESLint/environment inventory/secrets/repository organization/diff check ناجحة. ESLint للملفات المتأثرة0 errors/0 warnings. مجموعة DB19 استغرقت نحو6.7s شاملة المشغّل والهوية والجمع والتشغيل. نجحت الجولة الأولى14 ثم امتدت إلى19؛ لم تظهر إخفاقات DB تستوجب إصلاح كود التطبيق في هذه الجولة.

الأدلة: [الحالة](../reviews/evidence/post28/3625cfedd5eac19c31866616e65bc34a1a08783c/r06-owner/status.json)، وبجوارها setup/ledger summary وchecks وdiscovery وVitest assertions وtimestamps/log hashes و[مصفوفة الحالات المتبقية](../reviews/evidence/post28/3625cfedd5eac19c31866616e65bc34a1a08783c/r06-owner/required-case-status.json). سجل البداية14 محفوظ منفصلًا ولا يزيد العدد التراكمي.

## المتبقي ونقطة الاستئناف

R06 ما زالت جزئية: سحب موافقة مراجعة الوثائق تحت تزامن منح الوصول، ربط HTTP principal والأدوار/عزل graph، financial approval consumption/payment/refund/settlement، وعلاقات الجامعة/البرنامج/الاختبار/التخصص/المنحة والدورة التي لم تنفذ كاملة، وقرارات DEC المعلقة. تقدم CD-026/029/030/036 موثق بدقة كأدلة جزئية؛ لا نعلن اجتياز كامل لسيناريو26 من جزئية قريبة منه.

**الخطوة التالية المحددة:** اختبار `StudentDocumentReviewUseCases` و`PrismaStudentApplicationTrackerRepository` لسحب review consent ومنع طلب الوصول اللاحق والتنافس، ثم فحوص علاقات مالكي الجامعة/الاختبار غير المعتمدة على DEC. احتفظ بنتائج68 ولا تكررها إلا إذا تأثرت بتعديل. R05 تظل بعائقها المسجل؛ لا إعلان نجاح لترقيتها.

لم يبدأ boot API/Web/Admin أوR07 أو نشر Vercel/Render أو شراء دومين، ولم يُمس Neon أو الإنتاج أوmain. هذه مراحل تشغيل لاحقة تتطلب الأدلة والخدمات وأهدافها المستقلة؛ نجاح هذه الجولة المحلية لا يستبدلها.
