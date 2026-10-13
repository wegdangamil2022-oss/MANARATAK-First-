# القسم 15 — إصلاح نواقص إعادة مراجعة المصدر

- الفرع: `codex/fix-section-15-source-20261013` من أحدث `origin/main@4974846f48810d89efb1856c655289b4e54827fb`؛ fetch ناجح ومساحة العمل نظيفة قبل إنشاء الفرع.
- كوميت المصدر النهائي: `09159436f37056ac1ef6d83d13f26985f7944e3b`.
- المرجع: القسم15 و15.FG في الخطة، وتقرير `SECTION_15_SOURCE_RECHECK_2026-10-13.md` الموجود على فرع المراجعة بالكوميت `9cd4886466d06d4b037126d79bc52cc266e24cae`.
- النتيجة: **SOURCE_FIXES_IMPLEMENTED — VERIFICATION_PARTIAL**. النواقص الأربع عولجت في المصدر؛ لا ادعاء نجاح جميع الاختبارات أو إغلاق القسم تشغيليًا.
- القسم16 لم يتغير. لا merge إلى main ولا نشر ولا بيانات تشغيل ولا مزوّد أو إشعار حقيقي.

## الإصلاحات وربطها بالخطة

| الملاحظة / المتطلبات | الإصلاح النهائي | دليل التحقق وحدوده |
|---|---|---|
| S15-01؛ STU-ADM-007/008/009/015 | `apps/api/src/infrastructure/workers/PollingWorkerRuntime.ts`، المستخدم فعلًا في server، يشغّل catch-up والشهادات وreplay والتذكيرات ومواءمة حقائق tracker، إضافة إلى الهوية والدور والتعلّم. بقي منع تداخل iterations وdrain عند الإيقاف. | أضيف اختباران بساعة وهمية للتركيب الفعلي والترتيب والإيقاف وdrain؛ لم يظهر إخفاق لهذا الملف في التشغيل الوحيد. لا worker حقيقي أو dispatch إلى provider. |
| S15-02؛ STU-ADM-007 | `PrismaStudentWorkspaceRepository.projectIntegrationEvent` يبحث عن receipt مكتمل وناجح لأحداث P14 replacement، scoped للطالب والأصل. إذا سبق البديل إصدار الأصل، ينشأ الأصل REISSUED. يبقى receipt مرجع ترتيب الأصل حتى لا يستبدله حدث قديم. لا phantom أصل أو جدول شهادات موازٍ. | اختبارات فعلية للعقد بواسطة repository mocks: renewal/reissue قبل الأصل، duplicate event، receipt لطالب آخر. نجحت النسخة الأولى؛ تقوية sourceEventId وإضافة assertion لها بعد التشغيل لم يُعاد اختبارهما. لا SQL concurrency proof. |
| S15-03؛ STU-ADM-021 | `StudentSupportAdminPage.resetLayout` يفحص رسالة خطأ API الفعلية `[409]`/code، ويجلب الحالة بـno-store ويحدّث النسخة ثم ينتظر تأكيدًا جديدًا، مع إبقاء السبب. النسخة المحدثة غير ACTIVE لا تسمح بإعادة الإرسال. | قراءة مسار الخطأ والعقد الحالي لـadminApiClient وAPI409. اختبارات SSR الموجودة نجحت؛ ليست إثبات interaction/browser لمسار التعارض، ولم ندع ذلك. |
| S15-04؛ FGA-15-002 | domain/API/repository/UI تضيف status/from/to، تربطها بالcursor، وتطبق الفلاتر قبل total/paging. owner-degraded يتطلب source grant ونافذة صريحة ويقرأ آخر authorized owner observation فقط. P20 يبقى مصدر حالة الدفع؛ read-only owner join يطبق حالة workspace والزمن قبل DISTINCT/count/paging. | regressions لعزل الأذونات، نافذة غير صالحة، cursor scope، تطابق filters/total، وتنقية health DTO، ومعالجة نجاح قراءة أحدث بعد فشل. نجحت النسخة الأولى؛ إضافة عرض observedAt وتوسيع audit scope بعد التشغيل غير معاد التحقق. |

المرجع source-only لبقية متطلبات القسم هو مصفوفة إعادة المراجعة السابقة، وليس تحويلًا تلقائيًا لأدلتها إلى نجاح تشغيل جديد. STU-ADM-026 وإثباتات ما بعد28 تبقى مؤجلة.

## عقد تشخيص القراءة

- `StudentSupportOwnerReadObservation` يحفظ **صفًا حاليًا واحدًا لكل student/domain**: المعرّف، المجال، AVAILABLE/DEGRADED، checkedAt. لا owner payload أو exception أو contact أو notes أو ملفات أو secrets.
- القراءة لا تسجل observation إلا بعد grant مستقل وrequired privacy-minimal view audit. حفظ الحالة يتم تحت workspace row lock، مع audit/outbox SYSTEM ذريين. فشل الحفظ لا يحول owner read الناجحة إلى فشل، بل يرجع `NOT_RECORDED` ويظهر warning؛ triage قد يكون غير مكتمل.
- القراءة الأقدم لا تزيل نجاحًا أحدث؛ نجاح أحدث يمحو DEGRADED. الحساب ARCHIVED لا يسجل ملاحظة جديدة. الحذف canonical للworkspace يحذف صفوف الرصد بـFK cascade؛ لا ننشئ دفتر تاريخ خاص أو retention policy موازية.
- `OWNER_DEGRADED` يصرح بـ`coverage: OBSERVED_OWNER_READS` ومجال المصدر ووقت آخر قراءة. غياب صف/انقضاء نافذة المستخدم ليس HEALTHY أو صفرًا مؤكدًا لكل الطلاب؛ لا إجراء مسح لكل ملفات الطلاب أو نداء لكل owners من صفحة triage.
- time filters: inbox.receivedAt للمزامنة، tracker.updatedAt للمتابعات المتأخرة، observation.checkedAt لقراءة المجالات، ServiceRequestRecord.updatedAt للدفع. حالة الدفع من P20 وحالة workspace من P15؛ لا نقل ملكية الحقائق.
- فلاتر الزمن/الحالة/المجال تبطل نتيجة UI والcursor القديم؛ unknown owner لا يحول إلى success؛ malformed windows/cursor ترفض دون محاولة كتابة بيانات الطالب.

## الترحيل — تعريف مصدر فقط

الملف: `packages/infrastructure/prisma/migrations/20261013210000_student_support_owner_read_health/migration.sql`؛ جدول آخر حالة رصد مع enum CHECKs وFK/index. **MIGRATIONS_APPLIED=0**.

قبل تفعيل owner-health triage يلزم schema متوافق وPrisma Client مولّد. الجدول غير المجهز يمنع الاستعلام من النجاح؛ owner tabs تعرض warning عند تعذر حفظ observation. لا ندعي أن قاعدة قائمة أصبحت متوافقة. لا migrate/db push/seed/reset/backfill أو SQL اتصال نفّذ في هذه الجولة.

أي rehearsal لاحق يبدأ ببيئة معزولة وبيانات تجريبية، بأمر يعرض للمستخدم قبل تنفيذه. لا يُطبق الترحيل على قاعدة قائمة ضمن التفويض الحالي. الرجوع عن source: إعادة الإصدار السابق قبل تفعيل ميزة الرصد؛ في fixture disposable فقط يمكن إزالة الجدول بعد إيقاف الكتابة إليه. لا يحتاج backfill، ولا حذف تاريخ الموافقات أو inbox أو بيانات الشهادات.

## الأوامر والنتائج الفعلية

جميع الفحوص نفذت **مرة واحدة** على working tree مبني على `4974846f`، قبل بعض الإصلاحات الأخيرة وقبل commit المصدر. `09159436` ليس كوميتًا اجتاز فحوصًا لاحقة؛ طلب المستخدم يمنع إعادة الاختبار بعد الإصلاح، ولذلك هذا القيد صريح.

| الأمر | النتيجة المسجلة |
|---|---|
| `node_modules/.bin/vitest run --config .section15-source-recheck-vitest.config.ts` | exit1؛ **24 ملفًا /173 اختبارًا:167 ناجح،6 فاشلة**؛9.03 ثانية. mocks/HTTP local/SSR/fake timers فقط. |
| `node_modules/.bin/tsc -b packages/domain packages/application packages/infrastructure apps/api apps/admin --pretty false` | exit2؛ أخطاء مشتركة موضحة أدناه. لم يُعد الأمر بعد إصلاحها. |
| `DATABASE_URL=postgresql://fixture:fixture@127.0.0.1:5432/source_only DIRECT_URL=postgresql://fixture:fixture@127.0.0.1:5432/source_only node_modules/.bin/prisma generate --schema packages/infrastructure/prisma/schema.prisma` | exit0؛ local client generation1.90 ثانية فقط، دون قاعدة بيانات أو تنفيذ ترحيل. |
| Prettier لملف إعداد الاختبار وملف regressions الجديد | تنسيق المصدر فقط، ليس اختبارًا أو نجاحًا تشغيليًا. |

إعداد Vitest الأول استخدم mergeConfig، فجمع include القائمة السابقة مع قائمة هذه الجولة بدل استبدالها، وشغّل24 ملفًا خفيفًا بدل7 المقصودة. صحح الإعداد النهائي ليضع include مستقلًا. **لم يُعد تشغيله**. لا اختبار ثقيل أو E2E أو SQL حقيقي؛ الخطأ في اتساع القائمة موثق ولا يُخفى.

أسباب الإخفاقات الستة والإصلاحات دون rerun:

1. `StudentApplicationReminderDeliveryPolicy.spec.ts`: حالتان لم تزودا owner scholarship reader الذي أصبح مطلوبًا؛ أضيف fixture مطابق للمنحة والموعد، دون إضعاف production fail-closed.
2. `StudentWorkspaceOutboxDeliveryGateway.spec.ts`:3 توقعات counts لم تشمل StudentIdentityActivated الفعلي بعد role event؛ صححت counts مع assertion صريح لحدث التفعيل ومعرّفه، مع الإبقاء على اختبارات page bounds/tail/continuation.
3. `StudentWorkspaceUseCases.spec.ts`: حفظ المفضلة اختُبر دون canonical saved-owner gateway؛ أضيف owner fixture واختبار canonical name/slug/ref في طلب repository، دون حذف owner validation.

أخطاء TypeScript: Prisma Client المحلي كان أقدم من schema الجامعة الحالية؛ جُدد محليًا دون تغيير مصدر الجامعات أو الاتصال بDB. ثلاثة أخطاء مصدر مشتركة من القسم14 أصلحت بأقل تغيير: narrowed access لـartifacts.verifiedAt، حقن pollingWorkerRuntimeRegistry المفقود في artifact probe، وfallback لنص signingKeyReference الاختياري في UI. هذه إصلاحات compile مشتركة، وليست إعادة مراجعة للقسم14 أو16. نجاح TypeScript بعد الإصلاح **غير مثبت** لأن الفحص لم يُعد.

## الأدلة والمتبقي

Logs: `docs/reviews/evidence/section-15-source-recheck-20261013/`.

- vitest SHA256: `6f214187e79c0842201cf3cbb9cff427f57c3326bcc0ef967e5ac2c30f8882a6`.
- typecheck SHA256: `e8ef0c84904500c1acb74054cecd7dfbb68334cd87a9bb203d46a7deb02c9dde`.
- local Prisma generate SHA256: `d81cddaa290a4c705e7fb22c6101611a646d43fa48367bef482c1856807114ba`.

المتبقي إثبات إعادة التحقق من final source/fixtures عندما يطلب المستخدم، ثم المتصفح الحقيقي وSQL concurrency/worker/replay/reminder/role/owner-query plans في بيئة معزولة. لم تُكرر الاختبارات، ولم يُختبر القسم24–28، ولم تُعد مراجعة المخالفات المشتركة الـ15 أو تُدّع تسويتها. هذه ليست شهادة إنتاج أو تصريح نشر.
