# مراجعة واستكمال مصدر القسمين 08 و09 — 13 أكتوبر 2026

الأساس: `main@cc2a583ffd81388737e3a9dbefa762427e39210f` بعد دمج إصلاحات القسمين 06/07 في PR #29.
الفرع: `fix/sections-8-9-source-completion-20261013`؛ المصدر المرجعي: `MANARATAK_ADMIN_REVIEW_CODEX.md` وسياسة فصل إصلاح المصدر عن قبول التشغيل. هذه الدفعة تُدفع للفرع ولا تُدمج تلقائيًا.

## القسم 08 — P9

أُعيد فحص تنفيذ snapshot النشر، CAS/lifecycle، ملكية الأب للأبناء، public allowlist، مصدر/موافقة/blocks، AR/EN، الفلاتر وfreshness، الاستخدام الجامعي، وقراءات history/provider/version المحدودة. النواقص الثلاثة FGA-08-001/002/003 لها مسارات مصدر حالية؛ لا يُعاد اعتبار سجل 7 أكتوبر وصفًا للكود الحالي.

فحص closeout الحالي: **32/32 PASS**؛ إخفاقات 10 أكتوبر المصححة لا تبقى نتائج نهائية فاشلة، ولا تتحول سجلاتها التاريخية إلى فحوص تشغيل. أضيف key=هوية الاختبار إلى workspace لمنع حمل state من اختبار إلى آخر عند تغير المسار. لم تُراجع خدمات المصدر عبر شبكة أو مزود حي. المصدر الحالي لا يثبت أن جدول snapshots/attestations أو صلاحيات التشغيل تم تفعيلها.

## القسم 09 — النواقص التي عولجت

| مرجع الخطة | النتيجة الحالية | حدودها |
| --- | --- | --- |
| MAJOR-ADM-005 | P6 يسجل MAJOR/MAJORS عبر screening consumer نقي مع receipt دائم؛ P10 لديه preview/refresh/review/apply، CAS، source/target digest، تحقق EAP/SHA256 وقفل الملف، source identity مستقلة، receipt replay، وbusiness/owner receipt/Audit/Outbox في المعاملة نفسها. التطبيق يستعمل خدمة P10 الحالية لإنشاء مسودة/نسخة عمل؛ لا نشر تلقائي. UI موصول برفع ملف P6 ثم review workspace. | جدول جديد source-only `MajorImportOwnerReview`؛ لا تشغيل على قاعدة تفتقده. receipts قديمة أو ناقصة وdry-run ترفض. Actual provider bytes والـconcurrency/delivery مؤجلة. |
| MAJOR-ADM-010 | إثراء كتالوج المصدر، إضافة الصفوف canonical غير الموجودة فيه، البحث/الفلاتر/count والصفحات تتم في SQL واحد؛ لا تنزيل كل profiles/legacy roots إلى التطبيق قبل paging. المصدر المحلي المعروف محدود إلى 5000 summary. | 100 صف أقصى/1000 صفحة؛ مصدر الملف ثابت ومعروض كدليل مصدر، لا شهادة قاعدة. مصدر غير متاح/DB غير متاحة يعطي خطأ؛ لا fallback نجاح وهمي. كود مصدر يطابق أكثر من profile يرفض بدل إسناد هوية غير حتمية. |
| MAJOR-ADM-012 | section state يستخدم ID أو زوج locale/sectionKey؛ API/application/repository يحملون locale. AR وEN لنفس المفتاح لا يطغى أحدهما على الآخر. owned ID يجب أن يطابق profile/version/key/locale؛ tuple upsert للغة الصحيحة. | لا ترجمة تلقائية ولا فتح تعديل أسماء canonical أو تغيير سياسة Translation freeze. لا تعديل نسخة عمل قديمة؛ تبقى versions المنشورة/المؤرشفة immutable. |
| MAJOR-ADM-018 وFGA-09-002 | picker حي قابل للبحث والصفحات؛ مقارنة قراءة فقط للاسم/aliases والدرجة والتصنيف والمصادر والحالة. الربط يشترط sourceDigest وtarget revision التي رآها المراجع؛ يقفل الأصل ويعيد فحص النسخة/الدرجة/الحالة قبل owner reconciliation. | التشابه النصي مجرد إشارة لا auto-match أو موافقة. لا اختراع تصنيف من أسماء برامج الجامعات. |
| MAJOR-ADM-020 | التحميل العام يبدأ بصفحة 20؛ البحث/الدرجة/المجال/cursor/locale تمر إلى owner API مع debounce وصفحة تالية، بدلاً من drain للكتالوج. فلاتر الدرجات لا تتوقف على أول صفحة، والمجال قابل للكتابة مع اقتراحات. API failure يظهر unavailable/retry. | الاختبارات وحدة/عقد، وليست تجربة متصفح أو تحميل كبير. الـcursor authority تبقى owner repository. |
| MAJOR-ADM-021 | أخطاء content/history لا تتحول إلى arrays ناجحة فارغة؛ أخطاء related panels تظهر مستقلة مع بقاء الأصل المتاح. read generations تمنع ردًا قديمًا من إسناد بيانات ملف آخر. حماية profile/tab/back/unload؛ حفظ قسم لا يمحو بقية المسودات، وrefresh لنفس النسخة يحتفظ بها، وتغير النسخة يظهر conflict. | browser/sidebar/navigation/keyboard acceptance مؤجل؛ لا ادعاء تغطية browser كاملة. |
| MAJOR-ADM-022 | FELLOWSHIP أو مستوى بلا template معتمد يظهر كأقسام غير مصنفة بترتيبها الأصلي؛ لا يستخدم قالب Bachelor تلقائيًا. | لا إضافة نموذج Fellowship مخترع أو إنشاء Fellowship من queue التخصصات. |
| FGA-09-001 وMAJOR-ADM-023 | قراءات P11/P12 مملوكة للجامعات والمنح، مع 25 صفًا وcount وسياق ALL/PUBLISHED وفلاتر degree/country. permissions لكل مالك منفصلة؛ panel الاستخدام يظهر قبل إجراءات التحرير/النشر، مع روابط إلى المالك. | الأعداد روابط صريحة وليست مؤسسات/أشخاصًا فريدين. unmatched labels والاستخدام الخارجي unknown، لا صفر كامل. القراءة لا تعدل admission أو scholarship rules. |
| MAJOR-ADM-024 | profile pointer هو سلطة الإصدار scoped؛ root pointer تمثيلي فقط. public snapshots السابقة وmulti-profile owner invariants موجودة بالمصدر، وusage لا يفسر root pointer كنسخة شاملة. | تأكيد استهلاك كل المسارات الخارجية على runtime يظل مؤجلًا؛ راجع وثيقة سلطة النشر الجديدة. |

بنود MAJOR-ADM-001/002/003/004/006/007/008/009/011/013/014/015/016/017 لها تنفيذ سابق في الأساس: PATCH metadata، فصل identity/profile، review/source-bound snapshots، public privacy، التزام سياسة الترجمة، pointer/history، عرض source-only، owner graph/CAS/audit والتعدادات. الفحص التاريخي للقسم 09 نجح الآن **32/32**. هذه الدفعة تستكمل النواقص المذكورة أعلاه ولا تعيد تصميم ملكية P10/P11/P12 أو إعادة كتابة البيانات التاريخية.

## التحقق الخفيف الحالي

Node 22.23.3، دون credentials/provider/DB مستخدم:

- `npx --no-install vitest run --config .sections08-09-completion-vitest.config.ts`: **18 ملفًا / 106 اختبارات PASS، 8.21 ثانية**؛ يشمل 64 closeout و42 حالة اختيار/مصدر/locale/ownership/paging. لا whole repository test أو browser/load suite.
- `npx --no-install tsc -b packages/infrastructure apps/api apps/admin apps/web --pretty false`: **PASS** بعد تصحيح diagnostics المرتبطة بأنواع blockers، imports، وnullable cursor. الفحص النهائي بعد تعديل grouping المحايد نجح أيضًا.
- Prisma validate: **PASS** باستخدام عناوين fixture محلية للتحقق فقط؛ لا اتصال، generate، migration أو seed لقاعدة المستخدم.
- SQL fixture صغيرة في PGlite/ذاكرة: **PASS** لبيانات source/canonical/supplemental/legacy، source identity/profile separation، filters/totals/empty pages/collision refusal، قراءة degree/country/publication للجامعات والمنح، وSQL CAS/approval constraints للسجل الجديد. استخدمت نفس SQL repository؛ ليست fake counts. المصدر: `evidence/sections-08-09-completion-20261013/major-sql-fixture.ts`. الحزمة المؤقتة ليست dependency جديدة للمشروع.
- Source quality: **PASS**؛ package/file cycles=0 وa11y source findings=0. React review شمل unconditional hooks، scopes/stale reads، typed DTO imports، AR/EN source preservation، labels/button types، loading/error/empty/paging، وحماية المسودات. لا شهادة accessibility browser.
- DI manifest/verify: **399 reachable/399 registrations، 0 unreachable**.
- Audit inventory/coverage: **PASS**؛ 426 handlers/425 unique endpoints. أضيفت أربعة owner import commands إلى inventory بعد مراجعة تدقيقها؛ preview يحفظ review plan في P10 ولذلك يظل audited mutation، لا read-only وهمي. OWNER_VERIFICATION_REQUIRED التاريخية لم تُحوّل إلى إثبات runtime.
- `git diff --check`: **PASS**.
- Persistence boundary: **FAIL، نفس 15 مخالفة أساس**: أربع models غير مسجلة سابقًا (271/267 بعد إضافة model الجديد المسجل)، قراءتان غير معتمدتين في ScholarshipRepository إلى UniversityAcademicProgram، و12 علامة migration metadata ناقصة للقسمين 02/03 والقسم 04 بتاريخ 12 أكتوبر. لا مخالفة جديدة للـmodel/migration/adapter في هذه الدفعة، ولم تُخفَ النتائج.

فشل fixture اللغة أولًا بسبب transactionBound/نداء findMany غير مجهزين؛ صُحح binding الجديد في gateway والfixture، وأضيف اختبار إيجابي لقفل target ضمن transaction. أعيدت المجموعة المستهدفة أعلاه ونجحت جميعها. اختبارات replay/Outbox failure تثبت boundary بعزل/mock؛ PGlite تختبر استعلامات صغيرة وقيود المصدر فقط، لا races متعددة الخدمات.

## الترحيل والقبول المؤجل

`20261013010000_major_import_owner_review` مجهز بالمصدر وmetadata ADR-028 وخطة recovery، **غير مطبق على قاعدة المستخدم**. حفظ payload/requestHash/receiptId ثابت؛ review version والحالة تتغير بـCAS. retain review/receipt/publication evidence، drain writers، ثم backup compatible/forward fix عند الحاجة؛ لا destructive down SQL.

ترحيل P9 السابق وMajorPublicationSnapshot/role assignments السابقة كذلك لا يثبت التقرير تفعيلها. قبل runtime يلزم تجهيز الجداول والأذونات وإعادة مراجعة/نشر legacy records بلا snapshot، ثم real P6 staging/EAP bytes، parent/root/reference locking والتعارضات، genuine rollback/audit/outbox delivery، UI AR/EN والمتصفح، مقاييس data/load/backup/restore وفق ملحق ما بعد 28.

الكتالوجات التاريخية 825/1116/1114 و329 Fellowship وتطابق البيانات الحقيقية/النسخ الاحتياطية ليست مُثبتة بهذه الدفعة. لا backfill أو purge أو real import أو إصدار إنتاج أو PRODUCTION_GO. المخالفات المشتركة الـ15 ما زالت FIXES_REQUIRED لأصحابها.

إعادة fixture: من جذر المستودع المجهز، انسخ الملف إلى مجلد مؤقت وثبّت فيه `@electric-sql/pglite`، ثم `node --import tsx <temporary-directory>/major-sql-fixture.ts`. تستخدم الذاكرة فقط وتغلق fixture الخاصة، دون DATABASE_URL للعميل.
