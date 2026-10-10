# تقرير تنفيذ خطة الشهادات — 2026-10-10

الفرع: `codex/section-13-certificates`، الأساس: `1819c97577ad33961517eedf77bef8d97a9b31f6`.
الشهادات هي **القسم 14 في الملف المرفق** و**القسم 13 في تسمية الفرع والتقارير السابقة**.

**الحالة: SOURCE_REPAIRS_APPLIED — PRODUCTION_BLOCKED — RUNTIME_PENDING.** لا يُعد هذا التقرير إغلاقًا تشغيليًا أو إقرارًا بجاهزية الإنتاج. بقي ربط مزوّد التوقيع المعتمد وإثبات التشغيل؛ المصدر يحظر الإنتاج عند غيابه.

استُخدم الملف الأصلي المرفق فعليًا لهذه الجولة، بما فيه مهام `CERT-ADM-001…033` و`FGA-14-001/002` وسياسة الاختبارات الخفيفة. SHA256 للملف: `0f884e43b790a656534a31bb4a45a3cd2b23f43e4c5e4443697c50629d624d02`. العبارة في تقرير الجولة السابقة عن عدم توفر المرفق تخص تلك الجولة وحدها، ويحل هذا الربط محلها بالنسبة للعمل الحالي.

## مصفوفة المهام (35)

`SOURCE_IMPLEMENTED` يعني وجود ضابط مصدر قابل للفحص؛ لا يعني إثبات قبول PostgreSQL/EAP/KMS أو المتصفح الفعلي. نطاق المصدر يشمل أيضًا إصلاحات الجولة السابقة التي راجعناها وحافظنا عليها.

| المهمة       | حالة المصدر                       | التنفيذ وحدوده                                                                                                                                                                     |
| ------------ | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CERT-ADM-001 | SOURCE_IMPLEMENTED                | تصنيف خاص، وفحص المالك والصلاحية قبل التسليم؛ احتواء الأصول القديمة في التشغيل.                                                                                                    |
| CERT-ADM-002 | SOURCE_IMPLEMENTED                | Pending + دليل خاص + مراجع مستقل؛ ربط الجامعة بمالك P11. بقية المؤسسات محظورة حتى توفير resolver معتمد.                                                                            |
| CERT-ADM-003 | SOURCE_IMPLEMENTED                | قفل الأصل، ومقارنة دلالة الطلب عند إعادة المحاولة؛ اختبار التنافس الحقيقي مؤجل.                                                                                                    |
| CERT-ADM-004 | SOURCE_IMPLEMENTED                | نتيجة عامة مقتضبة عند فشل التوقيع، وإخفاء ادعاءات الواجهة.                                                                                                                         |
| CERT-ADM-005 | SOURCE_IMPLEMENTED                | ميزانية IP/code محلية محدودة، وعينة مشتركة مقفلة في DB، واحتفاظ 30 يومًا؛ اختبار الحمل مؤجل.                                                                                       |
| CERT-ADM-006 | SOURCE_GUARDED / PROVIDER_PENDING | أُلغي fallback الثابت وHMAC الإنتاج؛ منفذ signer معتمَد وتحقق تاريخي للتطوير. موصل KMS/HSM الإنتاج لم يُربط.                                                                       |
| CERT-ADM-007 | SOURCE_IMPLEMENTED                | الحقول القانونية ومفتاح الجهة النشطة ثابتة؛ تعديل السلطة يعيد المراجعة.                                                                                                            |
| CERT-ADM-008 | SOURCE_IMPLEMENTED                | قفل الجهة وإعادة فحص SHA256 وحالة الأصول داخل معاملة التفعيل والإصدار.                                                                                                             |
| CERT-ADM-009 | SOURCE_IMPLEMENTED                | حارس التوقيع ومطابقة الهوية قبل إنشاء الملفات أو إعادة ملفات موجودة.                                                                                                               |
| CERT-ADM-010 | SOURCE_IMPLEMENTED                | سجل renderJob دائم لكل ملف، وأوامر RenderRequested ذرية للإصدار/البديل/اعتماد إعادة التحقق، واستئناف الملفات المعروفة، وحد 8 محاولات؛ سجلات EAP غير المكتملة تتطلب reconciliation. |
| CERT-ADM-011 | SOURCE_IMPLEMENTED                | فحص lifecycle والمالك وMIME والتصنيف وثبات الإرفاق داخل معاملة repository.                                                                                                         |
| CERT-ADM-012 | SOURCE_IMPLEMENTED                | مسار تحقق تشفيري للإدارة وعرض نتيجته بدل وجود hash فقط.                                                                                                                            |
| CERT-ADM-013 | SOURCE_IMPLEMENTED                | قراءة النسخة التاريخية بواسطة templateVersionId.                                                                                                                                   |
| CERT-ADM-014 | SOURCE_IMPLEMENTED                | expireDue محدود ومقفَل داخل دورة العامل، وتدقيق/outbox؛ جدولة التشغيل تحتاج تفعيلًا.                                                                                               |
| CERT-ADM-015 | SOURCE_IMPLEMENTED                | قراءة learningVersion التاريخية الموثوقة؛ يظل الاستيراد غير المؤهل محظورًا.                                                                                                        |
| CERT-ADM-016 | SOURCE_IMPLEMENTED                | مخطط نص مشترك، AR+EN، خط عربي مرخّص مضمّن، التفاف ورفض overflow؛ قبول بصري نهائي مؤجل.                                                                                             |
| CERT-ADM-017 | SOURCE_IMPLEMENTED                | قراءة الشهادة بمالكها ثم فحص التوقيع والصلاحية وخصوصية الملف قبل grant.                                                                                                            |
| CERT-ADM-018 | SOURCE_IMPLEMENTED                | طلب تصحيح + اعتماد مستقل + دليل خاص + اسم مطابق لمالك Identity + CAS.                                                                                                              |
| CERT-ADM-019 | SOURCE_IMPLEMENTED                | فحص تطابق payload عند تصادم event أو completion.                                                                                                                                   |
| CERT-ADM-020 | SOURCE_IMPLEMENTED                | تنقل صفحات، total من الخادم، وحفظ الفلاتر في URL.                                                                                                                                  |
| CERT-ADM-021 | SOURCE_IMPLEMENTED                | تحرير وتعليق واعتماد الجهة حسب الصلاحية، وحجب مرجع المفتاح عن العرض غير المختص.                                                                                                    |
| CERT-ADM-022 | SOURCE_IMPLEMENTED                | زر PDF يتصل بمسار grant المحمي وبصلاحية تنزيل منفصلة.                                                                                                                              |
| CERT-ADM-023 | SOURCE_IMPLEMENTED                | عقد query صارم ومحدود، وUUID وتاريخ وترتيب نطاق.                                                                                                                                   |
| CERT-ADM-024 | SOURCE_IMPLEMENTED                | نصوص وحالات وتواريخ AR/EN واتجاه الواجهات؛ حماية نتائج الطلبات المتأخرة.                                                                                                           |
| CERT-ADM-025 | SOURCE_IMPLEMENTED                | اختبارات مركزة وتجميع حقيقي وworkflow source؛ لا دليل runtime أو CI بعيد ناجح بعد.                                                                                                 |
| CERT-ADM-026 | SOURCE_IMPLEMENTED                | requiresRevalidation يلزم دليلًا واعتمادًا محدد المدة قبل verify/render/download.                                                                                                  |
| CERT-ADM-027 | SOURCE_IMPLEMENTED                | lifecycleStatus وtemporalStatus مستقلان، وأولوية revoked/reissued محفوظة.                                                                                                          |
| CERT-ADM-028 | SOURCE_IMPLEMENTED                | رمز فريد MNR-SIGNATURE وجهة MANARATAK؛ لا اختيار بالاسم.                                                                                                                           |
| CERT-ADM-029 | SOURCE_IMPLEMENTED                | readiness يقرأ حالة العامل الفعلية، ولا يحوّل التهيئة وحدها إلى READY.                                                                                                             |
| CERT-ADM-030 | SOURCE_IMPLEMENTED                | If-Match للنسخة/الحالة وقفل/CAS ومراجع مستقل كما في الإصلاح السابق.                                                                                                                |
| CERT-ADM-031 | SOURCE_IMPLEMENTED                | timingSafeEqual وhex validation؛ أسرار التطوير لا تُستخدم لتوقيع الإنتاج.                                                                                                          |
| CERT-ADM-032 | SOURCE_IMPLEMENTED                | قراءة تسليم مباشرة، وحدود واستقرار القوائم وcursor خاص بالمالك؛ indexes source.                                                                                                    |
| CERT-ADM-033 | SOURCE_IMPLEMENTED                | صور PNG/JPEG مثبتة بـSHA256 في PDF/SVG، وحد بايتات وأبعاد، ورفض SVG المصدر؛ فحص بصري في التشغيل.                                                                                   |
| FGA-14-001   | SOURCE_IMPLEMENTED                | محرر الجهة ↔ PATCH، If-Match، reason، ومراجعة وتعليق حسب الصلاحية.                                                                                                                 |
| FGA-14-002   | SOURCE_IMPLEMENTED                | فلاتر الجهة والمستفيد والقالب والنسخة والتاريخ، URL state، predicates وindexes.                                                                                                    |

## التحقق

- **165 اختبارًا ناجحًا في 19 ملفًا** (بما فيها regressions لـlearning/majors وpermission catalog)، بلا إخفاقات. سجل الاختبارات النهائي: `evidence/section-13-plan/tests.log`؛ Vitest موجه إلى مصدر الحزم، دون DB أو مزوّد خارجي.
- التجميع: `tsc -b apps/api apps/admin apps/web` نجح، ويشمل الحزم التابعة. توليد Prisma client و`prisma validate` نجحا؛ validation استخدم عنوان localhost:1 وهميًا، ولا يفتح اتصال DB.
- quality source: صفر package/file cycles وصفر نتائج a11y؛ فحص تدقيق **15 مسار كتابة للشهادات** والحدود العامة auth/idempotency/audit نجح.
- ESLint للنطاق المعدل: صفر أخطاء، 57 تحذيرًا أغلبها `any` في حدود persistence الموجودة. لا يُدّعى خلو المصدر من التحذيرات.
- فحص التدقيق العام للمستودع لا يزال FAIL على عقود وأسماء مسارات في الأقسام السابقة. أُضيفت مسارات الشهادات فقط إلى inventory؛ لم نغيّر baseline لبقية الأقسام أو نُضعف الفاحص العام. التفاصيل في `global-audit-inherited-failures.log`، والفحص المحدد للشهادات واضح النطاق.
- كان في المصدر السابق `await` داخل `mutate` غير async في majors، ومنع التجميع؛ عُدلت الكلمة `async` فقط. اختبارات majors القديمة افترضت الكتابة دون canonical owner؛ حُدّثت لتثبت الرفض الآمن، وأُدرجت اختبارات `MajorGovernanceCloseout` لتثبت مسار النجاح والتراجع وCAS. أُعيد كذلك اختبار learning version الذي كان له إخفاق موثق سابقًا.
- بيئة الاختبار المحلية Node 24.19.0؛ workflow الجديد مثبت على إصدار المستودع Node 22.16.0. لا دليل نجاح workflow البعيد حتى تشغيله.

## تشغيل مؤجل ومحدد

1. ربط `certificateSignatureService` بمزوّد KMS/HSM معتمَد، مفاتيح لا تُصدّر، allowlist منفصلة لكل issuer، وسياسة sign-retirement/historical verification. تسجيله في DI بدل `null` جزء من التزويد التشغيلي المطلوب. مفتاح HMAC في env ليس بديل إنتاج. إثبات التدوير والعزل والتحقق التاريخي قبل فتح الإصدار.
2. توفير resolver معتمد لمالكي أنواع المؤسسات الأخرى؛ الجامعة مربوطة بـP11 والمراجع يثبت التفويض من وثيقة P05 خاصة. الأنواع غير المدعومة تبقى غير قابلة للاعتماد.
3. مراجعة preflight/rollback أدناه، ثم تطبيق الترحيل ضمن مسار DB المعتمد خارج هذه الجولة. لا تفعيل ولا اعتماد تلقائي للجهات الخارجية القديمة.
4. تدقيق ACL/روابط PDF/PREVIEW القديمة المصنفة PUBLIC واحتواؤها عبر P05 وصاحب التخزين، مع inventory وbackup وتسليم جديد خاص. رفض API إعادة استخدام الملف العام لا يسحب رابط تخزين قديمًا قائمًا.
5. أوامر التوليد لها dispatcher مخصص لنوع CertificateRenderRequested، منفصل عن completion fanout؛ طلب الإتمام المؤهل الذي يتطلب إعادة تحقق يُقرّ دون render/retry storm حتى اعتماد المراجع، ثم يُرسل أمر توليد دائم في نفس المعاملة. إثبات contention متعدد العمال على PostgreSQL قابل للرمي، atomic ledger/audit/outbox، أحداث learning التاريخية، expiry، وEAP upload/scan/grant وإعادة استئناف كل نقطة فشل. سجلات EAP غير ACTIVE تُرفض ولا تُحذف أو تُكرر عميانيًا؛ يُوفّر سجل `renderJob` وasset reference دليل المصالحة.
6. إثبات بصري لخط عربي وأسماء طويلة وAR/EN وportrait/landscape ومطابقة PDF/preview وQR في متصفح حقيقي، ثم موافقة القالب. SVG المستخدم كصورة تصميم لا يُدعم: يُحوّل إلى PNG/JPEG آمن بواسطة P05 قبل اختياره. لم يُنشأ تصميم بصري مخصص ولم تُعتمد هوية بصرية تلقائيًا.
7. تزويد permissions الجديدة للأدوار المختصة ضمن IAM، واختبار CSRF/session/ownership، وتحميل متخصص على budget العام؛ الميزانية داخل العملية، بينما sampling السجل مقفل ومشترك عبر DB. لا automatic role grant أو backfill.

## الترحيل المقترح — لم يُطبّق

`20261010180000_certificate_issuer_pending_default/migration.sql` يغيّر default إلى PENDING_APPROVAL، ويضيف indexes للجهة والطالب والدفتر، ويعيد الجهات الخارجية ACTIVE التي تفتقد اعتمادًا/دليلًا إلى PENDING_APPROVAL. بيانات الشهادات التاريخية لا تُعاد توقيعها.

قبل التفعيل: احفظ صفوف issuer المتأثرة وتواريخها وmetadata في snapshot محمي؛ طابق إحصاء الصفوف المتأثرة والـindex names مع المخطط الفعلي؛ راجع حجم الجداول ونافذة القفل لأن CREATE INDEX العادي قد يحجب الكتابة. اختبر الترحيل وخطة التراجع على قاعدة قابلة للرمي أولًا. راجع أيضًا أحداث الإتمام القديمة غير versioned وأصول القوالب التي تفتقد SHA256 provenance؛ لا تعيد ختم تاريخها تلقائيًا.

التراجع: أوقف إصدار الشهادات والعامل قبل تغيير التطبيق؛ حذف indexes الجديدة أو إعادة default ممكنان عبر ترحيل تعويضي معتمد. **لا تعكس UPDATE إلى ACTIVE جماعيًا**؛ استعادة السلطة فقط للصفوف المطابقة للـsnapshot وبعد مراجعة الاعتماد. لا تحذف certificate/ledger/outbox أثناء التراجع. أي EAP file غير ملحق يُصالح حسب الملكية والـreference والاحتفاظ، لا حذف عشوائي.

لم تُشغل migration/seed/backfill ولم تُعدّل DB أو ACL حقيقية، ولم يحدث main merge أو deployment. التغييرات على الفرع الحالي فقط.
