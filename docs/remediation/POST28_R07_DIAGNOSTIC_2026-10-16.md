# R07 — البناء والتغليف التشخيصي

الحالة `DIAGNOSTIC_BUILD_INSPECTED_RUNTIME_BOOT_PENDING`،لا CLOSED أوartifact-boot قبول.

الفرع `fix/post28-ci-environment-inventory-20261016`. مرشح تجهيز R06/R07 وفحوصه: `70e22445f95f2c86bb8155f80ad1aea3fce41982`. [سجل الأوامر والوقت والنتائج والـhashes](../reviews/evidence/post28/70e22445f95f2c86bb8155f80ad1aea3fce41982/R06-R09-preparation/summary.json)، [فهرس التغطية](../reviews/evidence/post28/70e22445f95f2c86bb8155f80ad1aea3fce41982/R06-R09-preparation/R06-R09-preparation.json). تصحيح تقارير WP-IC-10 اللاحق: `328535ffa80e6a2a9e819100f546424d525b5833`،[أدلته المنفصلة](../reviews/evidence/post28/328535ffa80e6a2a9e819100f546424d525b5833/R09-playwright-contracts/summary.json). لا يعاد وسم بناء المرشح الأول باسم الثاني؛التغيير اللاحق يخص wrapper تشخيص HTTP وليس مخرجات الوحدات المبنية. كلا الجولتين على مصدر نظيف وNode22.16.0.

## شروط القبول والمنجز والمتبقي

| الشرط | المنجز المثبت | المتبقي |
|---|---|---|
| بناء مصدر معلوم | Prisma generate ثم build للوحدات مرة واحدة على `70e22445f95f2c86bb8155f80ad1aea3fce41982`،lock/schema/client digests محفوظة. | CI خارجي وتوقيع مصدر وruntime layer معتمدة. |
| ثلاث حزم وSBOM | API/Web/Admin مع tar digests وSBOM وmanifest متحقق. أضيف output جديد ورفض untracked source ومدخلاتsymlink/special files. | artifact store محمي وruntime image/native dependencies؛لا رفع tar إلىGit. |
| فك جديد بلا checkout | فُكت الثلاث حزم خارج المستودع،وفُحص API server.cjs وstatic JS للواجهتين وعدم وجود root .git أوnode_modules موروثة في النسخ. | boot منartifact+runtime layer فقط وتحميل external modules وPrisma engines فعليًا. |
| BUILT وsmoke صحيحان | يشترط JS محليًا موجودًا وغير فارغ ودونsymlink/traversal؛smoke يطلب JS ويرفض redirect/404/MIME غيرJS أوHTML fallback ولو mislabeled. | تشغيل ثلاث وحدات علىTLS/CORS/cookies/base paths معتمدة وreadiness protocol2/exact200/SHA/freshness. |

## الأعداد والأدلة

85/85 اختبارًا متأثرًا،صفر فشل/تخطٍّ/إلغاء. preflight36/36،ESLint للأدوات وquality/organization/secrets ناجحة (exit0). لم يُعد الاختبار العام5076/648،ولا build شامل لكل تصحيح صغير؛تم بناء تشخيصي واحد فقط ثم تصحيح wrapper HTTP مستقل لاحقًا بلا إعادة نسب البناء إلى SHA جديد.

[نتيجة البناء والمخرجات الثلاث](../reviews/evidence/post28/70e22445f95f2c86bb8155f80ad1aea3fce41982/R06-R09-preparation/diagnostic-build/summary.json)،[تفصيل أوامر البناء](../reviews/evidence/post28/70e22445f95f2c86bb8155f80ad1aea3fce41982/R06-R09-preparation/diagnostic-build/checks.json)،[manifest](../reviews/evidence/post28/70e22445f95f2c86bb8155f80ad1aea3fce41982/R06-R09-preparation/diagnostic-build/release-manifest.json)،[SBOM](../reviews/evidence/post28/70e22445f95f2c86bb8155f80ad1aea3fce41982/R06-R09-preparation/diagnostic-build/release-sbom.cdx.json).

أحجام tar المقاسة:API29573120،Web11304960،Admin8038400 بايت. الحزم والنسخ المفكوكة محفوظة محليًا في المسار الخاص المسجل بالسجلات،ولا تُفترض قابلة للاسترجاع من جلسة جديدة؛الأدلة النصية وdigests محفوظة فيGit. يلزم artifact store أوتوليد جديد عند تغيير المرشح/فقد البيئة.

**صفر processes أُقلعت،صفر DB connections.** runtimeBootVerified=false وstageAccepted=false وpromotionAuthorized=false. static presence ليست API boot أومتصفحًا متكاملًا. لم تُدمج main ولم يحدث نشر.
