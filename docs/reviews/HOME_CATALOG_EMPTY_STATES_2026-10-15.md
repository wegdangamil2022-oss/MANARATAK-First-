# الصفحة الرئيسية — بطاقات الجامعات والدورات في جميع حالات البيانات

الأساس: `525be0e327d1c3e0c43cce5d7b96e623c935e3ab`. الفرع: `fix/home-catalog-empty-states-20261015`.
طلب التسليم PR مستقل للمراجعة؛ لا دمج أو نشر أو تغيير قاعدة بيانات.

## السبب المثبت

1. `FeaturedUniversities` كان يستخدم `topRanked.map` فقط؛ عند الفراغ يختفي جسم القسم رغم بقاء الإطار والعنوان والزر.
2. `FeaturedCourses` كان يستبدل قائمة البطاقات برسالة واحدة، ولا يستقبل حالة التحميل/التعذر من الأب.
3. الأب كان يمرر `data.courses` فقط؛ هذه القائمة للمحلي، بينما الخارجي في `importedCourses` والمدفوع في `paidCourses`. تقسيم أول صفحة مختلطة محليًا لا يثبت أن التبويب الآخر فارغ.
4. `mapCourse` و`mapPublicUniversityDto` كانا يضعان `imageUrl=''`. استجابات القراءة تحمل asset IDs دون رابط صورة عام؛ fallback الدورة كان يبدل الخطأ بصورة stock ثابتة.

لم نحتج إلى إنشاء PostgreSQL أو إدخال محتوى لتصحيح هذه الحدود.

## قبل وبعد

| الحالة | الجامعات | الدورات |
|---|---|---|
| loading | ثلاث Skeleton slots داخل الإطار نفسه | ثلاث Skeleton slots، والتبويبان والزر باقون |
| empty | ثلاث بطاقات حالة محايدة «لم تُنشر جامعات بعد»، دون صور/أسماء/تصنيفات أو فتح تفاصيل | ثلاث بطاقات حالة داخل التبويب الفارغ، دون تحويلها إلى دورات منشورة |
| ready | بطاقات DTO المنشور، مع ترتيب ranking الموجود فقط؛ لا رقم #1 مصطنع لجامعة بلا ترتيب | بطاقات خارجية/محلية/مدفوعة حسب originType وaccessType الرسميين |
| unavailable | ثلاث خانات ورسالة مختلفة عن empty وزر إعادة محاولة | تعذر كل تبويب مستقل؛ نجاح التبويب الآخر لا يضيع. عند تعذر أحد جزأي المحلي مع نجاح الآخر تبقى السجلات الناجحة ورسالة partial صريحة |

الإطارات والعناوين والهوية البصرية والتبويبات وأزرار عرض الكل من المكوّنات الأصلية نفسها.
الخانات عناصر عرض لا تحمل domain IDs أو صورًا أو handlers أو tabindex. يوجد status accessible وaria-busy وmotion-reduce في التحميل، وaria-pressed لأزرار التبديل.

## البيانات المستقبلية وصلاحية النشر

- مصدر المحتوى هو endpoints العامة القائمة. لا fallback إلى prototype ولا اعتماد provider name لتصنيف API.
- تحميل الدورات: ثلاثة طلبات متوازية bounded `limit=3` لـ`EXTERNAL_LINKED_COURSE` و`NATIVE_MANARATAK_COURSE` و`PAID_COURSE`، وحالات نتائج مستقلة. لا تنزيل كتالوج كامل أو مسح صفحات للوصول لتبويب آخر.
- تصفح الكتالوج الكامل يستمر عبر صفحات المالك الحالية. callbacks التفاصيل تستخدم slug/owner بيانات الاستجابة؛ تحقق المتصفح من university/course detail وكذلك زرّي عرض الكل.
- نشر محتوى جديد أو سحبه ينعكس بعد إعادة تحميل بيانات الـAPI: retry أو focus/visibility أو دورة التحديث القائمة 180 ثانية. لا وعد بوصول لحظي بمجرد كتابة DB؛ لم يتغير cache SLA.
- اسم الجامعة المعروض يأخذ `displayName` الذي أسقطه المالك باللغة المطلوبة بدل إعادة فرض الاسم العربي من حقول داخلية.

### لماذا تغيرت استجابة API؟

ثَبُت أن asset ID لا يصلح `<img src>` ولا توجد صورة عامة في القراءة الحالية. أُعلن السبب للمستخدم قبل التغيير. أُضيف فقط حقل قراءة `image: {url, expiresAt} | null` للقوائم والتفاصيل العامة للجامعات والدورات؛ الطرق والمسارات والمدخلات والصلاحيات وشروط النشر لم تتغير.

- يأتي المعرف من DTO المنشور بعد حالة استخدام المالك، وليس raw/draft input أو ID يقدمه زائر لمسار صور عام جديد.
- `PublishedCatalogImage` يستخدم `assetReferencePolicy` و`ProcessAssetLifecycleUseCase.requestDeliveryGrant` القائمتين: PUBLIC فقط، حقوق النشر وسلامة الأصل وحالته، وMIME من نوع image.
- رابط HTTPS دون userinfo أو headers خاصة، صلاحية لا تتجاوز 300 ثانية. الخطأ/الأصل الخاص/المفقود/المسحوب/مزود تسليم غير مجهز يعطي null دون إسقاط الكتالوج.
- `Cache-Control: no-store` على الاستجابات المثرية؛ snapshot الواجهة يعاد فحصه وفق 180 ثانية/focus/retry.
- لا raw locator أو metadata أو اعتماد خاص في الرد. عدم وجود رابط صالح يرسم رمزًا محايدًا؛ تجديد الرابط يقبل الصورة الجديدة بعد خطأ القديمة. لا طلب img فارغ أو fallback إلى stock.
- الصور الفعلية تحتاج أصلًا عامًا مؤهلًا ومرتبطًا بالسجل المنشور ومزود تسليم مهيأ؛ عدم وجود هذه الشروط يبقي الرمز، ولا يتجاوز سياسة الأصول.

لا Prisma Schema أو migrations أو FK أو إعداد PostgreSQL أو seed أو بيانات مستخدمين في هذه الدفعة.

## الملفات

- `PublicTemplateApp.tsx`: خمس أسطر تمرر status/retry/preview فقط؛ لم تُجرَ إعادة هيكلة للمسارات أو تخصيصات الصفحة.
- `FeaturedUniversities.tsx` و`FeaturedCourses.tsx`: إبقاء جسم القسم وحالاته، وربط الصور وإجراءات العرض القائمة.
- `FeaturedCatalogStateCards.tsx` و`FeaturedCatalogImage.tsx` و`homeCatalogState.ts`: فصل slots/Skeleton/image fallback وعقد حالة التبويب عن الملف المركزي.
- `publicLiveDataSource.ts` و`api/client.ts`: owner queries bounded وحالات التبويبات وصور القراءة واسم locale المرسل من المالك.
- قاموسا `ar.ts` و`en.ts`: نصوص الحالات، لا سجلات جامعات/دورات ثابتة.
- Router الجامعات وRouter الدورات و`presentation/media/PublishedCatalogImage.ts`: إثراء القراءة بصورة عامة مؤهلة فقط. DI manifest يعكس المستهلكين الفعليين دون إضافة registration جديدة.
- config الاختبارات وملفات HomeCatalog، واختبارات routers والصور، وbrowser smoke، وتحديث assertion القديم في B08 لثلاثة owner-filtered previews.

### ملاحظة الملف المركزي

حجمه قبل التعديل **2344 سطرًا**، وبعد تمرير الخصائص **2349**. الحجم ملاحظة صيانة تستحق تقسيمًا مدروسًا لاحقًا؛ سبب اختفاء البطاقات هو منطق الرسم وتمرير الحالة/المجموعات أعلاه. جرى عزل المنطق الجديد بدل نقل نظام التنقل والجلسات كاملًا ضمن إصلاح واجهة محدود.

## الفحص الفعلي وحدوده

أُنجز على Node **22.16.0**:

- **64/64 Vitest، 11 ملفًا** عبر `.home-catalog-vitest.config.ts`: الحالات/RTL-copy/التبويبات/الصور/روابط السياسة/mapper/snapshot/reload والـrouters، مع regression loading/cache والـproduction mode.
- **2/2 Node** لرفض prototype في production/staging وقدرة build.
- **11 سجل متصفح ناجحًا** في `home-catalog.smoke.mjs`: ثلاث حالات viewport عربية للصفحة المبنية (390/768/1440) مع loading/empty/unavailable/retry/independent tabs، ست معاينات مكوّنات AR/EN مع CSS الإنتاج، تحقق سياسة `/en` القائمة، وتفاصيل/تصفح المالك. صور فعلية محفوظة محليًا، ولا horizontal overflow أو JavaScript pageerror في انتقالات الصفحة العربية.
- route الإنجليزية العامة محجوبة **بسياسة الإصدار القائمة** `PUBLIC_ENGLISH_COPY_READY=false` وتحول إلى العربية؛ لم تُفعّل. فحص الإنجليزية هنا React/SSR للمكوّنات ولقطات layout مع CSS المبني، وليس ادعاء E2E لصفحة إنجليزية مفعلة.
- TypeScript web `tsc --noEmit -p apps/web/tsconfig.json`: PASS؛ API/Admin source config `.b10-typecheck.json`: PASS.
- Web production build: PASS. API esbuild bundle من المصدر مع `.b10-typecheck.json` وبنفس external modules القائمة: PASS؛ تجميع دون تشغيل خادم أو worker.
- ESLint المحدد: صفر أخطاء، **5 تحذيرات سابقة في الـrouters**. source quality: PASS، صفر cycles/a11y findings؛ source architecture: PASS؛ DI reachability: 424/424 PASS؛ diff check: PASS.
- فحص chunks البناء لم يجد تعريفات `MOCK_UNIVERSITIES/MOCK_COURSES/INITIAL_SCHOLARSHIPS/GOLDEN_IMPORTED_COURSES/MANARATAK_NATIVE_COURSES` أو محمل prototype. هذا مع اختبار runtime forcing API يؤكد عزل مصدر البيانات؛ لا يدعي إزالة كل نص معاينة مشروط تاريخي من كامل التطبيق.

محاولات التشخيص محفوظة محليًا: assertion أولي أخطأ باعتبار لون `#142B5F` رتبة `#1`، ثم assertion aria-hidden كان boolean بدل string؛ صُححا وأُعيدا بنجاح. اختبار router قديم كان يمنح ترجمة PUBLISHED دون `publicationSourceStatus=CURRENT` المطلوبة بعد B11؛ صُححت fixture وأعيد ناجحًا، دون تخفيف سياسة النشر. فحص API المباشر ضد dist المشتركة القديمة أظهر exports متقادمة؛ فحص المصدر بالـconfig الموجود في المشروع نجح. لا ادعاء بأن تلك dist القديمة أو بناء monorepo الكامل صار صالحًا.

التجربة الإنجليزية المبنية أولًا كشفت تحويل اللغة المعتمد، ومعاينة SSR الأولى لم تحمل CSS بسبب origin؛ عولج runner ليحافظ على السياسة ويختبر CSS فعلًا (`display:flex`) على origin محلي، وأُعيد بنجاح. لا حالات فشل نهائية غير مصححة في المجموعات المذكورة.

**لم يُنفذ:** اختبار PostgreSQL أو مزود تخزين/تسليم حقيقي، HTTP على موقع الإنتاج، login مستخدم حقيقي، full monorepo CI/build أو نشر/دمج. المتصفح يستخدم API fixtures معترضة، والـrouters تستخدم بدائل؛ لا يُسمى ذلك إثبات API→PostgreSQL فعليًا.

[ملخص الفحوص والأوامر](evidence/home-catalog-cards-2026-10-15/summary.json).
