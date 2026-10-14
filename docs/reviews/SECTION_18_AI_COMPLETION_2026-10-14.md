# القسم 18 — إكمال مصدر منصة الذكاء الاصطناعي (P17)

- المستودع: `wegdangamil2022-oss/MANARATAK-First-`.
- الأساس: `main@78bb73f7f2150ebd15d538a13fb10144f3d114ed`، بعد إكمال القسم17 الخاص بالترجمة.
- المرجع: **18 و18.FG — AI-ADM-001…030 وFGA-18-001/002** من `MANARATAK_ADMIN_REVIEW_CODEX.md`.
- الترقيم: القسم18 هو AI/P17؛ تقارير `section-17-implementation.md` القديمة تخص هذه المنصة. القسم19/Student Tools/P18 ليس نطاق هذه الجولة.
- القرار: **CODE_CLOSED — RUNTIME_DEFERRED** للمصدر المدعوم؛ AI-ADM-030 وكل إثباتات SQL/provider/billing/worker/browser الحية مؤجلة بعد28.

## المالك والمخطط قبل الإصلاح

فُحصت contracts/use cases وPrisma repository/schema الفعلية: AIRegistryRecord وسياسات المراجعة والتفعيل، PromptVersion/EvaluationRun fingerprints، Execution/QuotaReservation/AsyncJob records، protected results/chunks/checkpoints وowner source gateway، والworkflow execution plan/requester. هذه موجودة أصلًا على main، ولا استنتاج لها من تصميم الواجهة. إصلاحات سابقة مثل `0086949f` و`c6000174` مثبتة فيه.

الاختبارات الأولى على المصدر الموروث نجحت:11 ملفات/146 اختبارًا. هذا أثبت regression suite الموروثة، لكنه لم يثبت سلامة الربط الفعلي للشاشات أو read eligibility الجديدة؛ لذلك أُكملت النواقص التالية بدل إغلاق البنود من الوثائق وحدها.

## النواقص والإصلاحات الحالية

| المتطلبات | نقص المصدر | الإصلاح واختباره |
|---|---|---|
| AI-ADM-006/007/022/024 | readSource لا يعيد فحص ACTIVE/index sourceDomains ولا exact owner type/reference/locale، ويمكنه فك chunk بعد تعطيل الفهرس أو تجاهل تبدل محتوى له version نفسه. | current index gate قبل owner lookup؛ owner identity/locale/reader scope/classification قبل chunks؛ sourceChecksum مقابل current canonical content قبل فك التشفير. provenance mismatch لا يزيل projection غير مرتبطة؛ withdrawal canonical PUBLIC فقط يعطل مصدر CMS المطابق. |
| AI-ADM-007 | expiry تفحص قبل فك التشفير فقط. | لا ترجع chunk انتهت صلاحيتها أثناء التحقق/فك التشفير؛ expired-at-entry لا تفك أصلًا. tests بساعة وهمية، دون انتظار أو provider. |
| AI-ADM-008/024 | owner response يمكن أن يسمي محتوى خاصًا PUBLIC-reader scoped، أو يرجع identity/locale مختلفة في إعادة الفحص بعد embedding latency. | PRIVATE/CONFIDENTIAL مع PUBLIC reader scope ترفض قبل provider dispatch؛ index publication يعيد مطابقة type/reference/locale بعد latency، إضافة إلى version/hash/classification/scope. تغيير authority لا يستبدل prior projection، ولا يخفي usage التي حصلت من mock embedding. |
| AI-ADM-013 | job COMPLETED كان يكفي لاسترجاع artifact رغم Execution BLOCKED/FAILED/RUNNING/CANCELLED/REVIEW_REQUIRED. | execution نفسه يجب أن يكون COMPLETED قبل فك النتيجة. requester mismatch يبقى مرفوضًا قبل execution lookup؛ completed owner result ما زال يعمل. HTTP unavailable404 وnot-ready409 مع no-store. |
| AI-ADM-009/029 | AIGateway error handler يكرر raw Error.message في HTTP. | code تشغيلي bounded فقط؛ unknown provider/persistence errors تتحول إلى AI_EXECUTION_FAILED500. suffix/private text لا يرسل؛ configured-business codes تبقى مستقرة وNOT_CONFIGURED503 محفوظة. |
| AI-ADM-014…016/026، FGA-18-002 | WorkflowsPanel الفعلية كانت لوحة async queue، ومسار async-queue غائب من SectionKey/sections. SSR القديم فحص اللغة فقط، لذلك fallback Overview اجتاز باسم queue. | async-queue مسار وقائمة مستقلان يركبان AsyncQueuePanel؛ workflows يعرض registry definitions + governed run panel الموجود أصلًا. لا نظام workflow جديد أو تغيير صلاحيات backend. React interaction يثبت GETs الصحيحة، viewer لا POST، ونقل job→execution/trace بلا intent أو provider call جديد. |
| FGA-18-001/002 | timer البحث يمحو deep-link execution عند أول mount حتى إن لم يتغير البحث؛ local facets تكتب فوق URL جديد عند navigation/back. | URL يملك facets والselected execution؛ debounce فقط عند تغير search الفعلي. filter/reset تغير URL مرة وتحذف selection عند تغير الفلتر؛ external navigation يحترم execution/consumer الجديدين. tests للتأخير الوهمي، facet GET/reset وjob investigation/read-only. |

## مطابقة باقي بنود الخطة

مصفوفة الـ31 بندًا المصدرية المفصلة في `section-17-implementation.md` محفوظة كتاريخ. التحقق الحالي يعيد تشغيل فحوص الحدود المرتبطة كلها؛ لا يعيد نسب اختباراتها القديمة إلى source الحالي دون تنفيذ.

- AI-ADM-001/002/004/005/017/018/019/028: prompt/editor/checker/deployer separation، immutable evaluation/config revisions، staged activation/rollback، conditional updates، incident transitions وHTTP granular deny matrix. Policy roles/real principals تبقى تشغيلًا مؤجلًا.
- AI-ADM-003/010/011/012/020/021/023: queue intent/admission reservation، lost-ack replay/unknown charge holds، due-before-limit query، requester budgets، price/currency decisions، lease fencing/cancellation. عدم اليقين لا يتحول إلى refund أو dispatch مدفوع جديد.
- AI-ADM-006/007/008/009/022/024/027: canonical public CMS owner adapter، encrypted scoped chunks/physical cleanup، classification/resource bounds، revision swap. مصدر خاص أو owner adapter غير متوفر يفشل مغلقًا؛ لا نسخ CV/هوية طالب أو embedding حي.
- AI-ADM-013…016: requester-owned protected results، frozen workflow bindings/budget/checkpoints وoutput hash/expiry. المصدر الحالي ينشئ تشغيلًا فقط عبر owner-governed port وصلاحياته، لا عبر فتح شاشة التحقيق.
- AI-ADM-025/026/029: attemptability مقابل model/capability health proof ذو TTL، AR/EN rendering/RTL/LTR، bounded provider response/schema/PII matching. لا نجاح probe حي أو جاهزية مزوّد مستنتجة من secrets أو credentials.
- FGA-18-001/002: facets/count/page الخادمية، linked job/execution/trace/cost timestamp، UNKNOWN cost محفوظة لا zero وهمي؛ تقوية interaction الحالية موضحة أعلاه.

## التحقق الفعلي

Node **22.23.3**؛ dependencies/client المحلية الموجودة من الجولات السابقة. لا مكتبة أو migration جديد.

| الفحص | النتيجة النهائية |
|---|---|
| `vitest run --config .section18-ai-vitest.config.ts` | **13 ملفًا/178 اختبارًا، كلها نجحت**؛9.09 ثانية إجمالية،1.49 ثانية test execution؛maxWorkers=2. |
| اختبارات جديدة | **32** ضمن178:22 read/result boundaries،3 owner identity بعد embedding latency،5 React interaction،2 HTTP privacy/result responses. mocks/fake clocks فقط؛ لا تجمع أعداد الجولات. |
| `tsc -b packages/infrastructure apps/api apps/admin --pretty false` | نجاحexit0 على المصدر النهائي. |
| ESLint المستهدف | نجاحexit0؛0 errors،73 warnings موثقة، تشمل any في fixtures وتحذيرات type-style القائمة؛ لا ادعاء إغلاقها. |
| `verify-phase17-source.mjs` | نجاح؛PHASE17_SOURCE_READY=YES مع LIVE_AI_PROVIDER_CALLS=0 وLIVE_PAID_INFERENCE=0 وRUNTIME_PROOF=PENDING؛ assertion مصدرية فقط. |
| `git diff --check` | نجاح. |

الـ146 اختبارًا الموروثة والـ178 الحالية غير مجمّعة؛ المجموعة الحالية تشمل السابقة. لم يشغّل build/suite عامة أو E2E أو SQL integration أو تحميل ثقيل. Logs وSHA256 في `evidence/section-18-ai-completion-20261014/verification.json`.

## حدود التوافق والتشغيل والتراجع

**MIGRATIONS_APPLIED=0**؛ مخطط AI/workflow وmigration recovery السابقان محفوظان. هذه الجولة لا تطبق migration أو provision roles أو تضبط secrets أو تشغّل worker/provider أو ترسل طلبًا مدفوعًا أو تنشر تطبيقًا.

قراءة المعرفة الآن تحتاج metadata.sourceChecksum التي كتبها مسار indexing الحالي أصلًا. projection تاريخية تفتقد proof، أو تختلف عن current owner content، تفشل مغلقة وتحتاج owner-governed reindex لاحقًا؛ لا reindex أو تغيير بيانات يحدث أثناء القراءة هنا. source content read محدود256KB، وTTL الحالي محفوظ. الـprivate-owner adapters غير المتاحة لا تصبح متاحة بهذه التعديلات.

عند توافق كود/client لاحق، protected result الذي ليس executionCOMPLETED لا يعود صالحًا ولو بقي artifact؛ 404/409 الجديدة تعبر عن ذلك دون كشف نص. الرجوع عن إصلاحات المصدر هو revert للكوميت، مع الاحتفاظ بـusage/reservations/audit/outbox؛ لا حذف ledger أو إعادة طلب paid output لاستعادة إجابة مفقودة.

AI-ADM-030 ومصفوفة `section-17-closure-gates.md` و`section-17-migration-recovery.md` تبقي SQL locks/multi-worker/external billing/CDN/actual principal/browser proofs **UNRUN**. الدفع إلىmain بـ`[skip ci]` حسب طلب الاختبارات الخفيفة فقط؛ نجاح المصدر ليس شهادة إنتاج أو تفعيلًا لـAI.
