# R11 — إغلاق النطاق العملي مع استثناءات موثقة

**اكتمل النطاق التشخيصي العملي. القبول الرسمي الشامل للأداء وSLO ما زال معلقًا، ولا يوجد اعتماد إنتاج.** هذه حالتان منفصلتان. يتبع هذا التسليم توجيه المالك باستكمال العمل الوظيفي وتأجيل التغطية الأقل أولوية مع إظهار أثرها. لا تُستنتج خلو البرمجيات كلها من العيوب من الفحوص المحدودة.

المرشح المثبت **4b8e22f4cad6c5cdca384cf3e273c6d5cf97d61b**. نجح [تشغيل push 39475394144](https://github.com/wegdangamil2022-oss/MANARATAK-First-/actions/runs/39475394144)، وجميع فحوص check-runs الـ23 المرصودة للمصدر نفسه مكتملة وناجحة. لا يُستخدم نجاح pull_request مع خطوات متخطاة بديلًا عن تشغيل الفرع. commit التوثيق اللاحق له حالته المنفصلة ولا يعاد وسم الحزم القديمة باسمه.

## ما ثبت فعليًا

- بناء الحزم الثلاث واسترجاعها من Actions والتحقق من manifest، ثم إقلاع API من صورة Linux x64/Node22 غير جذرية وربط PostgreSQL16 صناعية بدور تطبيق عادي. استضافت بوابة HTTPS حزمتَي Web/Admin من المصدر نفسه، ونجحت readiness وبصمة المصدر والمسار العام في المتصفح. لا ادعاء بأن كل واجهات Admin جُربت على Linux.
- 10 أزواج من الكتابات المتزامنة خلال دقيقة: كتابة محفوظة واحدة وتعارض إصدار متوقع واحد لكل زوج، وإعادة الفائز دون إصدار جديد. صفر أخطاء غير متوقعة؛ أُلغي الدخول بنجاح وأصبح عدد الجلسات النشطة صفرًا. p50 لإتمام الزوج 31.52ms، وp95/p99 159.51ms من عشر عينات فقط؛ ليست أهداف أداء للإطلاق.
- رُصدت موارد API/PostgreSQL واتصالات التطبيق ضمن حدود التشخيص المحددة قبل التشغيل، وحُفظ EXPLAIN ANALYZE BUFFERS للاستعلام المحدد وإحصاء قاعدة البيانات. queryRoundTripMs منفصل عن pool wait غير المقاس. أُغلقت الحاويتان والشبكة؛ لا قواعد سابقة متأثرة.
- أعيد استخدام أدلة الفئات السبع السابقة، مع مطابقة 82 ملفًا لبصماتها دون إعادة السيناريوهات. القياسات صغيرة وبمصادرها الأصلية؛ مدة التشخيص المالي 59.9998578 ثانية تبقى كما هي ولا تُقرب لإظهار استيفاء حد القبول الرسمي 60 ثانية.
- تفعيل MFA من Admin المبني مثبت محليًا: رفض كلمة مرور/رمز خاطئين، اعتماد مشفر، إلغاء جلسة التفعيل، دخول برمز جديد، اختفاء السر بعد التحميل، وخروج يلغي الجلسة. هذا الدليل المحلي بمصادره المنفصلة المعلنة؛ لا يُنسب تلقائيًا إلى مرشح Linux الموحد.
- نجحت الحالات الخمس لملف R09 داخل CI نفسه مع ملاحظاتها: مراجعة CMS بأدوار منفصلة وسحب المحتوى العام، شهادة واحدة وإعادة دون أثر جديد، خصوصية مستندات/مال الطالب، والصفوف الأخرى المسجلة في الأثر الخام. هذا ملف تكامل محدد وليس تغييرًا لحالة القبول الرسمي للمراحل السابقة.

## الإصلاحات والاختبارات

أُصلحت بوابة قبول أدلة SLO الناقصة/المكررة، وسباق تهيئة جلسة دخول الإدارة، وتداخل ميزانية الطلبات في مشغل Linux، ثم قراءة الحقل القديم error بدل Problem Details code/status. لم تُخفض حدود الموارد أو معدل التطبيق ولم يُضعف التحقق من تعارض الإصدار وفقد التحديث.

لم تُعد قياسات الفئات السبع. بعد إصلاح عقد الخطأ، أُعيد اختباره المباشر وحده وفُحص محول Problem Details الفعلي؛ شغّل CI فحوصه المطلوبة للمصدر الجديد مرة واحدة لكل حدث push/pull_request. حفظت المحاولات السابقة الفاشلة دون تحويلها إلى نجاح. أثبت تشغيل Linux الناجح الحالي تجاوز العائقين السابقين.

## الاستثناءات المفتوحة للقبول الرسمي

| البند | ما لم يُنفذ | الأثر | يمنع التشخيص المحلي | يمنع اعتماد الإنتاج للنطاق المعني | المطلوب |
|---|---|---|---|---|---|
| E1 | Representative launch dataset, approved per-category SLO and representative concurrent load | Small synthetic diagnostics cannot establish production capacity or tail latency | لا | نعم | Establish launch volume and category budgets before preparing a representative dataset and running the scoped load profile |
| E2 | Driver pool checkout wait measurement | queryRoundTripMs and active connections do not measure pool wait; poolWaitMs remains null | لا | نعم | Instrument supported pool checkout timing and measure under the agreed workload |
| E3 | Complete built Admin CMS author/review/publish/withdraw browser journey | Current API workflow with distinct actors and public browser checks passed; entire Admin journey remains unverified | لا | نعم | Execute only the remaining Admin UI workflow with separate synthetic actors and actual MFA |
| E4 | Complete import review/publication pipeline under load | Only canonical source identities and initial receipts were measured; full pipeline throughput remains unknown | لا | نعم | Run one inert-file import through actual review/publication and measure with the scoped workload |
| E5 | All real outbox consumers under representative load | Claim/renew/complete and inert audit delivery are proven; this does not certify every consumer or provider | لا | نعم | Exercise required real consumers with synthetic effects, scoped budgets and approved provider boundaries |

لا تمنع هذه البنود استكمال التشخيص المحلي المحدود المثبت؛ تمنع تحويله إلى شهادة أداء أو اعتماد إنتاج. ضوابط النسخ لدى مزود R10 ما زالت خارج هذا الإغلاق لغياب حساب استضافة معتمد. لم تُغير موافقات R05 أو حالات القبول السابقة أو migrations أو main أو Neon. لم يُشغّل دفع أو مزود خارجي مؤثر.

[الأدلة وبصمات الأرشيفات والملفات](../reviews/evidence/post28/4b8e22f4cad6c5cdca384cf3e273c6d5cf97d61b/r11-linux/evidence-index.json) · [حالة الإغلاق والاستثناءات القابلة للقراءة الآلية](POST28_R11_PRACTICAL_CLOSEOUT_2026-10-20.json). تبقى بوابة load-slo الأصلية والحقول غير المقاسة وapproval=null كما هي؛ لا توقيع أو اعتماد تقني مختلق. نقطة الاستئناف للأداء الشامل: E1 ثم E2، وبعدهما القياسات التي تشمل E3–E5 بحسب نطاق الإطلاق.
