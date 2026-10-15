# تسليم متطلبات التشغيل — بعد تنفيذ B00–B14 بالمصدر

هذا سجل متبقٍ، لا أوامر تشغيل منفذة ولا موافقة نشر. مصدر الحقيقة [سجل التنفيذ](ARCHITECTURAL_SECURITY_EXECUTION_STATUS_2026-10-15.json) والتقارير المرتبطة به. نجاح فواحص المصدر لا يثبت SQL أو المتصفح أو تشغيل مزود. البيئة المحلية Node 24؛ قبول Node 22 المعلن للمشروع ما زال مطلوبًا.

| المجال | الإثبات المعزول المتبقي | مرجع النطاق |
| --- | --- | --- |
| البحث والجلسة | ترحيل actor boundary، HTTPS/origin/cookie/CSRF، refresh/revoke، rate limit موزع، بريد auth معتمد دون captured SMTP في الإنتاج | B01/B02 |
| الملكية والأصول/DB | inventory/checksum/catalog وorphans للقاعدة المقصودة، FK وPrisma، تطبيق توسعات B01/B05 بعد مراجعة، رابط/حذف/purge متزامن وrollback واستعادة | B04/B05 |
| المنح والتنقل والعرض العام | أدوار وpickers canonical، URL/basename والمالك الصحيح، مصدر منشور وlocale وصفحات وwithdrawal وسلوك المتصفح | B03/B06/B07/B08 |
| العمال | PostgreSQL claim/reclaim/lease وسباق عاملين، SIGTERM/الاستنزاف، persistent host، Redis namespace/freshness، idempotency/abort للمالكين | B09 |
| التأليف | browser→API→DB للدraft/review/approval/publication/unpublish، versions/locks وaudit/outbox rollback، لقطات البرامج/الزمالة ومسارات التعلم والبيانات القديمة | B10a–B10d |
| الترجمة | نسخة المصدر والقبول وreceipt في معاملة واحدة، عزل draft/locale، handover التخصص والقراء المنشورون وانسحاب المنشور | B11؛ يبقى INFRASTRUCTURE_ONLY |
| الخريجون | صحة SQL ومصدر/تاريخ الموافقة ولقطة الصفحة والعدد في PostgreSQL، سحب/قراءة متزامنان، البيانات القديمة والأدوار | B12؛ حجز الجلسات خارج الإصدار صراحة |
| المالية | تكرار نفس الطلب وسباقات مفاتيح/إصدارات، المبلغ/العملة والحجز والالتزام، ledger/receipt/approval/audit/outbox rollback، عكس واحد append-only، maker/checker، واجهة ومتصفح ومزود اختبار معزول | B13 وتقارير section20؛ FINANCE_RUNTIME_APPROVED لم يتغير |
| التكامل والإصدار | لا يُستبدل section27/section28 بدليل B14؛ أصل CI/signing/browser/artifact/DB/runtime/الموافقات الخارجية وفق سجلاتهما | section27 غير مغلق؛ section28 NO_GO |

التصحيحان النهائيان في HTTP B13 لم يُعاد فحصهما بطلب المستخدم: غياب إصدار capture وغياب/طول مفتاح الطلب أصبحا validation 400. المخرجات الأصلية 22 PASS و2 FAIL محفوظة؛ لا توصف الحالتان كنجاح. فحص V8 للائتمان ما زالت له حدود موثقة بعد تصحيح تجهيز enum دون إعادة. لا يزيل هذا السجل تلك الحدود.

لا يُرسل بريد أو يُلتقط مبلغ أو يُطبق ترحيل تاريخي من أجل إغلاق مستند. التراجع يحفظ الالتزامات والقيود الأصلية؛ أي تصحيح مالي بقيد معاكس مدقق، وأي بيانات قديمة غير مفهومة تبقى للمراجعة دون IDs أو قواعد موافقة مخمنة. تبقى أدوار B owners وP phases ومصفوفة العلاقات المرجع للعزل.

لا توجد B15 في الخطة المعتمدة؛ إضافة حزمة مستقبلية تحتاج تعريف نطاق ومعايير قبول. لا يغيّر ذلك مرحلة P15 أو وثائقها القائمة.

متابعة ما بعد الدمج: [إصلاحات المقارنة](../reviews/POST_CLOSURE_PLAN_SOURCE_REVIEW_2026-10-15.md) و[قائمة الفحوص المتبقية المحدثة](ARCHITECTURAL_SECURITY_REMAINING_VALIDATION_2026-10-15.md). نجح فحص الأنواع للمصدر الحالي و10 حالات جديدة؛ لا يعني ذلك إعادة حالتي HTTP أو إغلاق SQL/runtime.
