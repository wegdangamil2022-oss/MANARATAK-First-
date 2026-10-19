# R08 — جلسات بين عمليتين وإلغاء تشغيل Google AI Studio

بتوجيه المالك أُلغي تشغيل Google AI Studio؛ المصدر الأساسي للإزالة وإثبات الجلسات هو `6e42d922c79053b67107cd8722390bff1f273986`. مرشح التطوير المصحح لاحقًا هو `be5407e6c9a63f9633019c22a79b6990ca0d3a1d` على الفرع الموحد. **R08 متقدمة بأدلة جديدة، وليست مقبولة بالكامل. R07 ما زالت مفتوحة.**

## ما أُلغي وما حل محله

- حُذفت مهمة Studio من CI وأوامر dev/build/verify الخاصة بها، والـlauncher وruntime defaults وعزل محمل Studio وplugin iframe. حُذفت أدوات Nginx التي كانت تتعامل مع جسر المصادقة الخاص به؛ لم تُشغّل على جهاز أو خادم.
- صار `npm run dev` يشغّل workspace Web، و`npm run dev:admin` يشغّل Admin. لا ملف بيئة Studio أو سلوك يحقن إعدادات Backend أو يبدأ Redis تلقائيًا من launcher.
- أُزيل اختيار كوكيز SameSite=None/Partitioned الخاص بـiframe. تبقى الكوكيز HttpOnly وSameSite=Strict، وSecure مطلوبًا في staging/production. trust proxy صار صريحًا دون افتراض Studio.
- نُقل جرد البيئة العام إلى `scripts/config/environment-inventory.mjs` و`docs/operations/ENVIRONMENT_INVENTORY.md` و`.env.runtime.example`. احتُفظ ببوابة الجرد في CI؛ 318 اسمًا، دون قراءة قيم أسرار. عادت سياسة npm إلى10.9.x وengine-strict=true، ولم تتغير إصدارات dependencies في lockfile.
- الوثائق الحالية تستخدم [التطوير المحلي](../operations/LOCAL_DEVELOPMENT.md) وإدارة الأسرار المعتمدة. مسارات الوثائق القديمة صارت إشعارات إلغاء تحافظ على الروابط التاريخية؛ لم تُمح أدلة المراجعات أو تاريخ Git، ولم تُلغ حواجز البيانات أو اختبارات الميزات الأخرى. حُذفت اختبارات المنصة الملغاة فقط، وأضيفت عقود التشغيل القياسي.

## جلسات R08 الفعلية

شُغلت **عمليتا HTTP مستقلتان** على loopback، بمفاتيح JWT وCSRF صناعية مشتركة عبر IPC فقط، وPostgreSQL16.15 جديد معزول. استُعملت AuthRouter وAuthService وPrismaCredentialVerifier وPasswordHasher وJwtTokenProvider وPrismaSessionManager وPrismaIdentityRepository وIdentityPrincipalAccessValidator وAuthMiddleware الفعلية. لا استبدال للمصادقة أو الجلسات بـmocks. forgot/reset خارج النطاق يرفضان الاستدعاء، ومحدد المعدل هنا محلي؛ دليل Redis الموزع السابق مستقل.

| الحالة الجديدة | النتيجة |
|---|---|
| دخول على A، قراءة على B، وتجديد على B | نجاح؛ access القديم مرفوض على A والجديد مقبول |
| logout على A | الجلسة مرفوضة على B، ولا جلسة نشطة متبقية |
| replay لـrefresh الأب على العملية الأخرى | رفض401 وإلغاء السليل الذي سبق تدويره والعائلة النشطة |
| تعليق الهوية وCSRF/origin | التعليق يظهر على العملية الأخرى؛ bootstrap قديم مرفوض؛ missing CSRF وorigin أجنبي يعيدان403 دون تعديل جلسة صحيحة |

هذه أربع حالات إلزامية في profile `r08-session-processes`، نجحت **4/4 بلا تخطٍّ**. تخزين refresh hash فقط مُثبت داخل الحالة الأولى. خيار تجهيز `--r08-session-fixtures` يضيف DML على CredentialRecord فقط في قاعدة جديدة، لتجهيز كلمة مرور صناعية؛ دور الاختبار post28_app لا يملك DDL أو ledger. لم تتغير schema أو migrations أو Consent/Binding. أُوقف المختبر بعد التنفيذ. [الأدلة الخام والاكتشاف والتجهيز والإيقاف](../reviews/evidence/post28/6e42d922c79053b67107cd8722390bff1f273986/r08-shared-sessions/evidence-index.json).

لا يُقدم هذا كإثبات تطبيق API المبني كاملًا مع Web/Admin وRedis/TLS في نشر واحد أو كاختبار متصفح لكوكيز HTTP؛ هذه حدود عملية المصادقة المجمعة من مكوناتها الفعلية.

## إقلاع Web/Admin وCSP

نجحت44 حالة متأثرة مباشرة بالإزالة، وثمانية عقود CI، و77 بند W0، و36 فحص تجهيز، وTypeScript لـAPI وسياقات Vercel كلها. جرى إقلاع Vite على loopback لكل تطبيق واستلام HTML200 مع X-Frame-Options=DENY وframe-ancestors none. تكرر فحص HTML مرة واحدة لأن الحاضنة الأولى أغلقت Vite قبل انتهاء dependency scan؛ انتظرت الحاضنة المصححة اكتماله، وصار السجل بلا أخطاء الإلغاء.

فحص Edge الفعلي أظهر أن الصفحة تُرسم لكن حقن CSS الخاص بـVite محجوب بعد إزالة الاستثناء القديم. أضيف nonce عشوائي بعمر خادم التطوير إلى آلية Vite الرسمية لوسومه وCSS، مع HMR القياسي بدل المنفذ443 المفروض سابقًا. البناء وpreview وstaging/production لا يأخذون هذا nonce؛ static `_headers` والسياسة الإنتاجية لم يتغيرا، ولم يُفتح التضمين أو توليد الشيفرة الديناميكي.

بعد الإصلاح رُسم Web وAdmin في متصفح Edge معزول، دون page errors ودون حجب CSS. بقيت محاولة eval واحدة من zod.js في Admin مرفوضة بالسياسة كما كانت، دون خطأ JavaScript غير معالج؛ لم تُخف أو يُسمح بها لتصفير السجل. طلبات API اعترضت محليًا وطلبات الجهات الخارجية حُجبت، فلا قبول لمسار بيانات متكامل مستنتج من هذا الفحص.

اجتازت سياسة الواجهة المصدرية ثلاثة اختبارات، والحالة الجديدة للـnonce اختبارًا موجّهًا واحدًا. فحص أنواع ملفات Vite كشف مشكلتين في فحص الاختبار نفسه (استنتاج PluginOption العميق وhtml الاختيارية)؛ صُححتا واجتاز الفحص الموجّه دون تغيير assertions. [أدلة المتصفح وربط النسخة](../reviews/evidence/post28/be5407e6c9a63f9633019c22a79b6990ca0d3a1d/standard-runtime-retirement/evidence-index.json) توضّح أن after-browser شغّل ملفات nonce قبل commit وأن HEAD المسجل فيه هو أساس6e42، لا ادعاء اختبار نسخة نظيفة خاطئة. لم تُكرر اختبارات DB بعد تغييرات CSP غير المتصلة بها.

## حالة R07 والمتبقي

إزالة Studio لا تصلح تلقائيًا إخفاقات الوحدة الـ11 السابقة في ملفات البرامج والمنح وCMS وAsset evidence وقراءة وصف الدورة؛ لم تُحذف هذه الحالات ولم تُضعف حراسها. التشغيل39295249621 لم يتضمن مهمة Studio، ونجحت فيه مهمة R08/Linux/Redis، لكنه توقف عند inventory لأن ملف CSP صار يقرأ NODE_ENV. حُدث مرجع الجرد فقط في `810b3a9440fa64ad13258a17bcf86ffe0b7bb2e2`، دون تغيير runtime، واجتاز الجرد318 اسمًا. [CI المتابعة الحالي](https://github.com/wegdangamil2022-oss/MANARATAK-First-/actions/runs/39296347297) جارٍ عند حفظ التقرير. لا PASS لـCI الكامل أو لاسترجاع وحدات الإصدار أو صورة الاستضافة حتى ظهور أدلتها.

التالي في R08: concurrent refresh/unknown outcomes، تجميع API المبني مع Redis/TLS، وترتيب أحداث المالك وcanonical import وprovider stubs للتوقيع وreplay/reconciliation والسلاسل المالية. أدلة Linux/SIGTERM/Redis السابقة محفوظة على مصدر26fe899. حالات R05 وR06 لا تتغير. لا إنتاج أو Neon أو دمجmain أو نشر خارجي أو مزود مؤثر.
