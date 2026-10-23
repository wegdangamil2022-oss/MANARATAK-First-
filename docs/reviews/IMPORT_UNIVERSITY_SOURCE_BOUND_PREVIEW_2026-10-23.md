# معاينة خطة الجامعة من إيصالات الفحص الفعلية

أضيف عقد planUniversityScreenedSources وبوابة previewScreenedSources وCLI `scripts/university-screening-preview.ts`. يُدخل المشغل اختيارًا من 1–5 إيصالات بمعرف المصدر/الإيصال وrequestHash ومعرف الأصل وبصمته؛ تقرأ البوابة السجلات الفعلية داخل RepeatableRead/READ ONLY بعد التحقق من الهوية والصلاحيتين القائمتين، دون أقفال كتابة أو إنشاء مراجعة أو جامعة.

يلزم إيصال UNIVERSITY/UNIVERSITIES مطابق، وأصل INTERNAL/ACTIVE ببصمة SHA256 مطابقة وغير منتهٍ أو محذوف، وتطابق رابط الأصل بالبصمة في evidence. يلزم STAGED_COMPLETE مع VALID وMANUAL_REVIEW_REQUIRED وautomatic/publication=false؛ INCOMPLETE أو duplicate يرفض ولا يتحول إلى قبول. تُحفظ هوية المصنف ورقم صفه وبصمته الأصلية من metadata، مع حل هوية الجامعة الحالية من القاعدة، وتُقسم الخطط حسب المصنف. تدخل screeningBindings في بصمة الخطة؛ تبديل requestHash يكسر الختم.

الناتج معاينة **OWNER_REVIEW_REQUIRED/readyToWrite=false/databaseWrites=0**، وفي كل خطة validationIssue ثابت UNIVERSITY_SOURCE_OWNER_REVIEW_REQUIRED. لا يجيز المصدر المفحوص نفسه الكتابة، ولا يمكن تمرير الخطة الناتجة إلى executor لتجاوز مراجعة المالك. يلزم لاحقًا عقد مراجعة صريح وحل الجغرافيا الفعلي؛ لا نضيف اعتمادًا وهميًا أو migration أو نظام approval بديلًا.

التشغيل بـNode22/tsx مع NODE_ENV=development أو test، وDATABASE_URL وUNIVERSITY_IMPORT_ACTOR_ID لهوية مخولة فعلية، ثم CLI بملف JSON الاختيار وملف ناتج جديد. لا طباعة بيانات اتصال أو payload كامل عند الخطأ. actorId نصي لا يكفي: البوابة تقرأ Identity/User/Account والأدوار والسياسات. هذا لا ينشئ حساب المالك المؤجل.

نجحت 10 حالات عقد المصدر و1 حالة بوابة مركزة للقراءة فقط والتفويض قبل قراءة الأدلة. بُنيت application/infrastructure وlint للملفات الجديدة/المتأثرة بلا أخطاء، وجرد البيئة الحالي 329 اسمًا متحقق. لم تُعد حالات الاستيراد أو التعويض السابقة غير المتأثرة. تجربة PostgreSQL التالية لها إيصال منفصل؛ لا ادعاء قبول مصدر مدار أو إغلاق P10.
