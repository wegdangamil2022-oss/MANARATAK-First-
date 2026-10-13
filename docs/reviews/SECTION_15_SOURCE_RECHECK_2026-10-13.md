# إعادة مراجعة مصدر القسم 15 — دعم الطلاب ومساحة الطالب

- المصدر المفحوص: `main@4974846f48810d89efb1856c655289b4e54827fb` بعد `git fetch origin`؛ مساحة العمل كانت نظيفة.
- الطلب: مراجعة نواقص الأكواد والواجهات حسب القسم `15` و`15.FG`، دون تنفيذ إصلاحات أو إثبات تشغيل.
- الاختبارات المنفذة في هذه الجولة: **صفر**. لا build/typecheck/verifier أو اتصال بقاعدة أو مزوّد أو تشغيل عامل أو ترحيل.
- تقارير 11 أكتوبر السابقة قرئت للاستدلال، ثم راجعنا المصدر الحالي. نجاحاتها التاريخية لا تُنسب إلى هذه الجولة أو هذا الكوميت.
- النتيجة: **SOURCE_GAPS_FOUND**؛ 4 ملاحظات مستقلة تمس 6 معرّفات. من 28 متطلبًا: 21 منفذ في المصدر ولم يُختبر هنا، 6 جزئية، ومتطلب تشغيل واحد مؤجل.

## النواقص المثبتة بالقراءة

### S15-01 — P1 — العامل المركّب في الخادم لا يشغّل خمسة مسارات P15

المتطلبات: `STU-ADM-007/008/009/015`.

`apps/api/src/server.ts:7,63` يستورد ويشغّل `infrastructure/workers/PollingWorkerRuntime.ts`. حلقة الطالب في ذلك الملف `:73-88` تستدعي الهوية والدور والتعلّم فقط. لا تستدعي `runCatchupOnce`, `runCertificatesOnce`, `runReplayOnce`, `runRemindersOnce`, `runTrackerOwnersOnce`.

المسارات الخمسة موجودة في `packages/application/src/students/use-cases/StudentWorkspaceOutboxWorker.ts` ومركبة في النسخة الأخرى `apps/api/src/infrastructure/runtime/PollingWorkerBootstrapper.ts:76-83`، لكن `app.ts` لا يستدعي نسخة bootstrap تلك؛ وجود import لا يشغّلها. لذلك تمكين العلم الحالي في الخادم لا يكفي لتوصيل الشهادات، استمرار catch-up، استعادة الأحداث الموقوفة، تذكيرات tracker، أو مواءمة حقائق المنح. هذه فجوة تركيب **كود**، وليست طلب إثبات نشر.

المطلوب: تركيب هذه المسارات في دورة العامل المستخدمة فعلًا مع الحفاظ على عدم تداخل الدورات وdrain، أو توحيد الـbootstrap على تنفيذ واحد. لاحقًا اختبار خفيف بساعة وهمية للتركيب الفعلي؛ اختبارات methods وحدها لا تثبت أن الخادم يستدعيها.

### S15-02 — P1 — حدث التجديد قبل إصدار الشهادة الأصلية يفقد حالة سلفها

المتطلب: `STU-ADM-007`.

`PrismaStudentWorkspaceRepository.ts:1050-1129` ينشئ إسقاط البديل، ثم يغيّر الأصل إلى `REISSUED` عبر `updateMany` فقط `:1124-1128`. إذا لم يصل حدث إصدار الأصل بعد، لا يوجد صف لتحديثه ولا تُحفظ علامة بديلة تحول دون إحيائه. عندما يصل `CertificateIssued` القديم لاحقًا، مسار create ينشئ الأصل `ACTIVE`؛ حماية terminal/order تطبق فقط حين يوجد `current` أصلًا.

سيناريو المصدر: إسقاط فارغ → `CertificateRenewed(B, replaces=A)` → `CertificateIssued(A)`؛ ينتهي الفرع بصف A نشط بدل معاد الإصدار. لا ندعي تنفيذ السيناريو على SQL. P14 نفسه يغيّر الأصل إلى `REISSUED` في `PrismaCertificateRepository.ts:497`.

المطلوب: حفظ علاقة استبدال/علامة سلف مؤجلة موثوقة، أو استشارة snapshot المالك قبل إنشاء أصل وصل متأخرًا؛ الحفاظ على عدم إحياء الأصل وعلى عزل الطالب. إعداد regression لهذا الترتيب بالإضافة إلى ترتيب الإصدار الطبيعي.

### S15-03 — P2 — مسار معالجة تعارض Reset Layout لا يفحص الخطأ

المتطلب: `STU-ADM-021`.

في `apps/admin/src/pages/StudentSupportAdminPage.tsx:624-639`، `catch(cause)` ينشئ `message = t('stu_support_reset_error')` ثم يبحث فيه عن `STUDENT_WORKSPACE_VERSION_CONFLICT` أو النص «تغيرت بيانات الطالب». القيم الحالية في `i18n/ar.ts:1283` و`en.ts:1285` لا تتضمن أيًا منهما. لذلك فرع fetch النسخة المحدثة وإعادة التأكيد لا يُختار بسبب تعارض API الحقيقي، ويبقى `resetTarget` قديمًا مع رسالة عامة.

المطلوب: التعامل مع status/code من الخطأ الفعلي، تحديث النسخة وإلزام تأكيد جديد مع الاحتفاظ بالسبب. اختبار حدث واجهة فعلي للـ409؛ SSR للنصوص لا يكشف هذا الخطأ.

### S15-04 — P2 — فلاتر triage المطلوبة لم تكتمل

المتطلب: `FGA-15-002`.

`StudentSupportAdminRouter.ts:139-143` يدعم `SYNC_FAILED/SYNC_PENDING/APPLICATION_OVERDUE`، وله مسار P20 مستقل لـ`SERVICE_AWAITING_PAYMENT` بفحص صلاحية مالكه. هذا تنفيذ موجود يُحافظ عليه.

لكن عقد triage وقائمة العمل في `PrismaStudentWorkspaceRepository.ts:115-147` لا يتيحان نافذة زمنية أو فلتر حالة الطالب، ولا توجد قراءة triage مصدرية لحالة owner المتدهورة. الواجهة `StudentSupportAdminPage.tsx:760-798` تعرض الفئات الحالية فقط. لا يمكن تنفيذ مثال الخطة «الطلاب النشطون» مع الحالات المتدهورة/المعلقة ضمن نافذة صريحة من الخادم. لا تُعد حالات inbox الفاشلة دليلًا على أن owner read نفسه DEGRADED.

المطلوب: فلاتر حالة/وقت محددة النطاق ومربوطة بالـcursor، وحالة تدهور مع مصدر/حداثة لا تُستنتج من فشل لحظي ولا من تحميل كل ملفات الطلاب؛ إبقاء طلبات الدفع تحت P20 وأذوناته. ليست مطالبة بإنشاء مالك خدمات جديد.

## مصفوفة المتطلبات

«منفذ» هنا تعني أن مسار المصدر موجود وقرأناه، **غير متحقق بالتشغيل في هذه الجولة**. «جزئي» تربط النقص أعلاه؛ لا توجد نتائج اختبار جديدة PASS.

| المعرف | التصنيف | دليل المصدر الحالي / النقص |
|---|---|---|
| STU-ADM-001 | منفذ | `PrismaStudentWorkspaceRepository.updatePrivacyConsent/appendOutbox`: تاريخ الموافقة canonical؛ payload المنقول decision/fields/version دون before/after. |
| STU-ADM-002 | منفذ | `StudentSupportAdminRouter` owner tabs بأذونات P13/P14/P20؛ `StudentDashboardHydrationService.getSupportDetail` افتراضيًا يمنع owner lists/counts. |
| STU-ADM-003 | منفذ | Router يمرر support actor/reason/correlation؛ `resetLayout` يسجل audit/outbox في transaction المالك. |
| STU-ADM-004 | منفذ | `requireWritable/casWorkspaceUpdate`: row lock وversion/status predicate، مع audit ذري. |
| STU-ADM-005 | منفذ | consent CAS قبل صف القرار وaudit/outbox في transaction واحدة. |
| STU-ADM-006 | منفذ | `StudentWorkspaceRouter.workspaceSchema` version إلزامي؛ use case/repository يرفضان غيابه؛ صفحة الطالب تمرره. |
| STU-ADM-007 | جزئي | gateway/worker/projection موجودة؛ S15-01 وS15-02 تمنعان إغلاق التدفق والترتيب. |
| STU-ADM-008 | جزئي | gateway catch-up أربع صفحات ×50 مع continuation دائم؛ S15-01: استمرار tail غير مركب في الخادم. |
| STU-ADM-009 | جزئي | repository active-only replay وclaim/quarantine/archive retirement؛ S15-01: replay غير مركب. |
| STU-ADM-010 | منفذ | `StudentIntegrationEventPolicy` typed allowlist/ref/date/size؛ gateway producer provenance؛ لا HTTP ingest. |
| STU-ADM-011 | منفذ | `StudentWorkspaceUseCases.mutate` لا يحول cache outage لفشل committed write؛ dashboard يقرأ canonical دون تقديم cache قديم. |
| STU-ADM-012 | منفذ | Router required privacy-minimized audit قبل disclosure؛ scope/purpose محدد وأذونات مستقلة. |
| STU-ADM-013 | منفذ | hydration owner pages بحد12؛ totals غير المكتملة null؛ paging لكل tab. |
| STU-ADM-014 | منفذ | provenance source/queriedAt/coverage؛ unknown sync time؛ RESTRICTED/TRUNCATED/DEGRADED منفصلة. |
| STU-ADM-015 | جزئي | tracker transactional reminder intents وdelivery eligibility موجودان؛ S15-01: reconciliation dispatcher لا يبدأ من العامل الفعلي. |
| STU-ADM-016 | منفذ | `PrismaStudentApplicationTrackerRepository.cas` version/student/status؛ checklist وversion في نفس transaction. |
| STU-ADM-017 | منفذ | checklist/update تمنع ARCHIVED؛ archive/remove تنتجان reminder reconciliation intent. |
| STU-ADM-018 | منفذ | read-only exact identity diagnostic مستقل عن وجود workspace؛ لا provisioning عند GET. |
| STU-ADM-019 | منفذ | support detail failure allowlist وإرجاع `STUDENT_SYNC_FAILURE` لباقي النصوص. |
| STU-ADM-020 | منفذ | `StudentSupportCursorCodec` HMAC/scope/expiry/size/canonical timestamp؛ Router400. |
| STU-ADM-021 | جزئي | S15-03؛ ترجمة الرسائل موجودة لكن فرع conflict غير موصول بالخطأ الفعلي. |
| STU-ADM-022 | منفذ | صفحة الدعم clear selection عند تغير الفلاتر، request sequence لمنع استجابة الطالب القديم. |
| STU-ADM-023 | منفذ | shared AR/EN translation/date/direction/status copy؛ لا browser proof هنا. |
| STU-ADM-024 | منفذ | router/application/repository/admin test files موجودة؛ لم تنفذ. يلزم إضافة regressions للنواقص الجديدة، لا إعادة suite هنا. |
| STU-ADM-025 | منفذ | base detail P15-only وowner tab endpoints مستقلة ومحدودة ومحمية. |
| STU-ADM-026 | مؤجل | تشغيل SQL/worker/Redis/provider/browser حسب الملحق؛ مستبعد من نواقص الأكواد أعلاه. |
| FGA-15-001 | منفذ | purpose-audited tracker/history pages وتوقيع cursor، projection محدود دون notes/documents. |
| FGA-15-002 | جزئي | S15-04؛ triage وبعض paging/RBAC موجودة، فلاتر ومصادر التشخيص المطلوبة ناقصة. |

## التسليم وحدود الجولة

أوامر الجولة كانت fetch/status/rg/sed وقراءة المصادر والتقارير وكتابة هذا التقرير؛ لا أوامر اختبارات. لا تعديل مصدر تطبيق، لا merge، لا نشر، ولا ترحيلات/بيانات/إشعارات. خطوتها التالية، عند طلب التنفيذ، إصلاح S15-01 ثم ترتيب الشهادات وواجهة التعارض وفلاتر triage. لا تُسحب أحكام runtime المؤجلة إلى هذه المراجعة.
