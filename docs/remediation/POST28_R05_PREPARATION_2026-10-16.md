# R05 — تجهيز ترقية baseline وحفظ العلاقات

الحالة: `PREPARED_PREDECESSOR_AND_DATA_REQUIRED`؛لم يبدأ upgrade ولا قبول تشغيل. يعتمد R05 على نجاح R04 الفعلي، لا مجرد تجهيز الكود.

مرشح المصدر المفحوص: `3deef4557f181d6d7a3fd05e959990ac1bbfd36a`، الفرع `fix/post28-ci-environment-inventory-20261016`، شجرة نظيفة عند الفحوص. [الأوامر وSHA والتوقيت وexit codes وبصمات السجلات](../reviews/evidence/post28/3deef4557f181d6d7a3fd05e959990ac1bbfd36a/R04-R05-preparation/summary.json)، [حزمة التجهيز](../reviews/evidence/post28/3deef4557f181d6d7a3fd05e959990ac1bbfd36a/R04-R05-preparation/acceptance-preparation.json). الاختبارات الجديدة تخص المنطق والأدوات، وليست تنفيذ PostgreSQL. commit الأدلة اللاحق لا يعيد نسب هذه النتائج إلى SHA آخر.

## شروط القبول والأدلة والمتبقي

| الشرط | ما جهز | المتبقي |
|---|---|---|
| predecessor معروف | العقد يرفض SHA سابقًا مفقودًا؛الحزمة تبقي predecessorSha=null وrunId غير معتمد. | اختيار predecessor حقيقي وclient/migration prefix مطابقين، دون افتراض baseline قاعدة المستخدم. |
| بيانات قديمة صناعية | دليل يحدد actor NULL وconsent وorphan/document/publication/translation وinvoice/hold/receipt والعلاقات canonical. فهرس13 FX باقٍ دون نتيجة مزروعة. | أوامر مالك fixtures فعلية، وتثبيت صلاحية ونسخة البيانات على DB-U منفصل؛لا نسخ بيانات حقيقية. |
| حفظ الصفوف والدليل | مقارن صارم لكل281 model key في العقد،وبصمات8 مجموعات:immutableReceipts،financialLedger،studentConsent،assetBindings،universityPrograms،scholarshipTargets،courseProjections،publishedVersions. يرفض فقد/استبدال مفاتيح حتى إن تطابق العدد. | producer لقطات DB حقيقية وبصمات measured قبل/بعد؛مقارنة fixture لا تثبت SQL أو سلامة البيانات. |
| المالية | أعداد وأرصدة صحيحة نصية،account/currency/scale group مطابق؛اختبارات تتجاوزJS safe integer وتكشف تغير وحدة واحدة أو duplicate group. | ledger/balance proofs حقيقية وowner rules؛لا سماح delta افتراضي يخفي backfill غير مراجع. |
| الهوية والحماية | نفس run وDB-U physical fingerprint،sourceSha قبل/بعد،schema/chain hashes،session_replication_role=origin؛رفض DB-R وtarget/SHA drift. | live identity وrole/grants فعلان على Neon أو المختبر المصرح. |
| الترقية والتعافي | تسلسل تحضير backup متحقق وrestore أولي مستقل وbounded locks/timeouts وقطع آمن ثمresume وclient compatibility. | الأدوات والميزانيات والسلطات وقياس التشغيل؛لم ينفذ backup أو restore أو migration. |
| العلاقات وقرارات المالك |77 علاقة/42 حالة ترتبط بالمراجع الحالية؛DEC-01…07 غير معتمدة،لا تعديل تلقائي للاقتران أوالجغرافيا أوالمجانية أوnullable uniqueness. | قرارات المالك وقيود/معاملات/اتصالان حقيقيان حيث يلزم،ثم R06/R09. |

## النتائج وحدودها

تشارك هذه المرحلة نفس الجولة الموجهة83/83 وpreflight36/36؛لا تجمعها مرة أخرى كاختبارات مستقلة. `compare-post28-upgrade.mjs` يقارن الأدلة فقط ويعيد runtimeAcceptance=false دائمًا. لا يدعي وجود منتج قياس أو اعتماد ملف مصنوع يدويًا. حزمة التجهيز تربط R06–R14 بالأهداف والبوابات والمخرجات المطلوبة،وجميعها NOT_EXECUTED.

الخطوة التالية: إنشاء مشروع Neon التجريبي الفارغ بواسطة المستخدم،ووضع Direct URLs في أسرار البيئة،ثم مراجعة الهوية وTLS والأدوار والشبكة لاستكمال R03. يبقى R05 منتظرًا predecessor وبياناته ونجاح R04. لا تنفيذ على القاعدة أو نشر تلقائيًا.
