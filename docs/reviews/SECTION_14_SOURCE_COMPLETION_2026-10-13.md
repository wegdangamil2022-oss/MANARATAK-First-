# تنفيذ نواقص القسم 14 — الأكواد والواجهات فقط

التاريخ: 2026-10-13. الفرع: `codex/complete-section-14-source-20261013`.

قاعدة العمل: آخر `main` وقت البداية `2d31d7ed60c24df137294496423b7f6136ee2a5d`، بعد fetch وشجرة نظيفة. **كوميت المصدر: `63b4aa5b70a4260bcdd0ae60d7a6a57e07e8e065`**. تقرير المقارنة السابق محفوظ في [SECTION_14_VERIFICATION_2026-10-13.md](SECTION_14_VERIFICATION_2026-10-13.md) عند قاعدته الأصلية؛ لا يعد وصفه للنواقص وصفًا للكود المعدل هنا.

## النتيجة وحدود الإغلاق

نفذت تغييرات المصدر والواجهات للنواقص الـ12 المحددة في التقرير السابق. التصنيف الحالي لهذه التغييرات **IMPLEMENTED — VERIFICATION DEFERRED**، وليس PASS ولا Runtime Certified. لم أعد تدقيق بقية أقسام الخطة، ولم أدمج أعمال القسم 13 الموجودة على فرع آخر أو أعدل فروع المدن. لا يعني هذا إغلاق جميع متطلبات القسم 14 أو جاهزية الإنتاج.

**عدد الاختبارات المشغلة في الجولة: 0.** لم أشغل Vitest/TypeScript build/Prisma generate/DB/E2E، ولم أكرر اختبارات سابقة أو أعتمد نتائجها للكوميت الجديد. طلب المستخدم صريح: إصلاح المصدر الآن وتأجيل إثبات التشغيل. قرأت الكود ونسقت المصدر فقط؛ اكتُشف خطأ تركيب JSX أثناء التنسيق وأُصلح. التنسيق لا يثبت صحة الأنواع أو التشغيل أو الترحيل.

## المتطلبات وربطها بالمصدر

| المتطلب | تنفيذ المصدر | الأدلة |
| --- | --- | --- |
| CERT-ADM-002 | دليل تفويض داخلي مملوك لـP14: مرجع جامعة P11 أو هوية السجل القانوني للمؤسسة، وثيقة خاصة وبصمتها، نطاق إصدار/مفتاح/مدة صريحة، مراجع مستقل، وسحب التفويض. يعاد فحصه قبل إصدار جديد. موصل HTTP اختياري؛ الجامعة المنشورة وحدها لا تمنح التفويض. | `packages/infrastructure/src/certificates/PrismaCertificateAuthorityDirectory.ts؛ apps/admin/src/components/certificates/CertificateAuthorityDelegations.tsx` |
| CERT-ADM-005 | مدة الاحتفاظ من Settings في نطاق certificates أو GLOBAL؛ لا حذف تلقائي دون مدة صريحة. حدّا IP/code قابلان للإعداد، مع Redis مشترك في الإنتاج ورفض الخدمة إذا غاب أو فشل. قراءة السياسة مؤقتة 5 ثوانٍ لمنع ضغط DB. واجهة تهيئة التعريفات تعرض القيم وتوجّه إلى إعدادات المالك. | `packages/infrastructure/src/certificates/CertificateVerificationPolicy.ts؛ apps/api/src/presentation/api/router/CertificatePublicRouter.ts؛ apps/admin/src/components/certificates/CertificateVerificationPolicyPanel.tsx` |
| CERT-ADM-006 | موصل Vault Transit فعلي عبر HTTPS، فحص exportable/allow_plaintext_backup/supports_signing، خريطة issuerCode/keyName/version موثوقة، مفاتيح تاريخية verify-only ومنع aliases/التوقيع بالمفتاح المتقاعد. أضيف await لكل مسارات الإصدار والتحقق؛ HMAC يبقى للتطوير فقط. DI يقرأ الإعدادات بدل null الثابت. | `packages/infrastructure/src/certificates/VaultTransitCertificateSignatureService.ts؛ packages/application/src/certificates/services/CertificateTrustPolicy.ts؛ apps/api/src/infrastructure/di/container.ts` |
| CERT-ADM-007 | رقم authorityVersion وتدقيق atomic قبل/بعد مع actor/reason والوثيقة/binding؛ سجل إدارة paginated. يدخل رقم السلطة وبصمة وثيقة التفويض في الظرف الموقّع الجديد؛ Repository يرفض تغير الرقم بين إعداد التوقيع والإصدار. تاريخ الصفوف القديمة لا يعاد اختراعه. | `packages/infrastructure/src/certificates/PrismaCertificateRepository.ts؛ packages/application/src/certificates/use-cases/CertificateUseCases.ts؛ apps/admin/src/components/certificates/CertificateIssuerHistory.tsx` |
| CERT-ADM-010 | استئناف سجل الرفع INITIATED بنفس asset/reference/locator، وتجديد grant، ثم finalize/scan/sanitize/activate عبر EAP. فحص checksum قبل التعقيم وإبقاء checkpoints المكتملة؛ retry إداري محمي بالنسخة/البصمة والحالة والتوقيع والسبب بعد استنفاد المحاولات. sweep محدود يلغي الأصول غير المرتبطة لشهادات مسحوبة/منتهية عبر P3، ويحفظ عمليات activation المعلقة. | `packages/infrastructure/src/certificates/EapCertificateArtifactStore.ts؛ packages/application/src/asset-platform/use-cases/IngestAssetUseCase.ts؛ packages/infrastructure/src/certificates/CertificateArtifactRecovery.ts` |
| CERT-ADM-014 | قراءات الإدارة والطلاب وعداد active تستعمل effective expiry، مع إبقاء الحالة المخزنة لإجراءات المالك والـledger. تاريخ موحد لكل قائمة/عداد. expiry worker والقفل السابقان محفوظان. | `packages/infrastructure/src/certificates/PrismaCertificateRepository.ts؛ apps/api/src/presentation/api/router/CertificateAdminRouter.ts` |
| CERT-ADM-021 | حجب signingKeyReference وmetadata من قائمة الجهات لغير manage؛ حجب المرجع المتداخل في قراءات الشهادات كذلك. محرر الجهة وتعليقها ومراجعتها محفوظة، مع سجل تغيير وتفويض/وثيقة يمكن للمراجع المخول تنزيلها واستعمالها في الاعتماد. | `apps/api/src/presentation/api/router/CertificateAdminRouter.ts؛ apps/admin/src/pages/CertificateAdminPage.tsx` |
| CERT-ADM-024 | ترجمة labels/أنواع الجهات، وعرض أسماء القوالب حسب locale، ومقارنة القالب وسجل السلطة والتفويض والسياسة ورسائل الأخطاء الجديدة AR/EN؛ لا تحول أسباب المستخدم الحرة إلى نص مفترض. | `packages/shared/src/localization/certificateCopy.ts؛ apps/admin/src/components/certificates؛ apps/admin/src/pages/CertificateDetailPage.tsx` |
| CERT-ADM-025 | تعريف CI يدوي فقط بقاعدة PostgreSQL جديدة، حارس يرفض قاعدة غير فارغة أو غير loopback، ونتائج JSON مرتبطة بـgithub.sha. أضيفت 7 حالات مؤجلة: سباق عميلين/expiry+ownership pagination، بروتوكول signer/retirement/custody/delegation، وصور/PDF حقيقي/حد الأبعاد. لا تشغيل تلقائي للملفات الجديدة ضمن suite المصدر، ولا اعتبار SKIP أو غياب الدليل PASS. | ` .github/workflows/certificates-isolated-runtime.yml؛ scripts/certificates/verify-isolated-runtime.mjs؛ .certificates-isolated-vitest.config.ts` |
| CERT-ADM-029 | probe قراءة وتسليم فعلي لملف PDF تجريبي غير شخصي، خاص، ACTIVE، مملوك لـCertificateRuntimeProbe، وبصمة مضبوطة. يتحقق من grant والبايتات والحجم و%PDF وحداثة worker، ثم فقط READY+verifiedAt؛ الباقي PENDING/DEGRADED. readiness التوقيع يفحص المفتاح فعليًا ويطابق القالب الافتراضي/جهته. | `packages/infrastructure/src/certificates/CertificateArtifactReadinessProbe.ts؛ packages/application/src/certificates/use-cases/CertificateUseCases.ts` |
| CERT-ADM-030 | snapshot مراجعة ثابت ومعاملة قراءة RepeatableRead، نسخة سابقة مربوطة عند إنشاء version جديدة، ومقارنة الحقول قبل/بعد في UI قبل الاعتماد/التفعيل. reason إلزامي للمراجع وIf-Match/Maker-checker محفوظان. | `packages/infrastructure/src/certificates/PrismaCertificateRepository.ts؛ apps/admin/src/components/certificates/CertificateTemplateReview.tsx` |
| CERT-ADM-033 | فحص magic/MIME وأبعاد PNG/IHDR وJPEG/SOF قبل decoder؛ سقف 4096 لكل بعد و16 مليون بكسل و2MiB. يطبق في resolver والrenderer مع checksum/provenance، ويبقى SVG الخارجي مرفوضًا. | `packages/infrastructure/src/certificates/CertificateVisualImagePolicy.ts؛ packages/infrastructure/src/certificates/EapCertificateVisualAssetResolver.ts` |

## إصلاح الربط مع EAP ضمن نفس المتطلبات

وجدت قراءة المصدر أن preview/QR يولدان SVG لكن validator الرفع العام يرفض SVG، وأن artifact store السابق يقفز من الرفع مباشرة إلى activation. أضفت مدخلًا **server-only** للملفات التي يولدها P14، ولا توجد route رفع عامة تستخدمه:

- فحص bytes/size/reference/fingerprint/kind والامتداد؛ رفض script/DOCTYPE/ENTITY/foreignObject وhref/url الخارجية؛ QR لا يقبل نصًا أو صورًا شخصية.
- PDF وpreview INTERNAL؛ QR وحده PUBLIC مع بيان حقوق الرسم الأصلي الذي يولده الخادم. preview ليس أصلًا عامًا.
- المدخل العام يبقى بقواعد MIME الأصلية؛ SVG الخارجي غير مسموح. الأصول المتولدة تمر بالتحقق والمسح والتعقيم وإعادة تحقق البايتات والترقية المعتادة في EAP.
- أضيفت وثيقة التفويض كمرجع EAP في usage registry وbatch/readiness، مع owner-reference trigger وحارس lifecycle يمنع حذف/تعطيل الوثيقة المرتبطة، حتى بعد سحب التفويض. الملفات التاريخية المرتبطة بالشهادة لا يحذفها orphan sweep.
- حدث retry هو أمر `CertificateRenderRequested` الموجود؛ لا إرسال إشعارات/مدفوعات أو drain لمزوّدات فعلية في هذه المهمة. أضيفت routes المراجعة/retry إلى سجل التدقيق المصدر دون إعادة فحص شامل أو الادعاء بزوال مخالفات مشتركة سابقة.

## التجهيز التشغيلي المؤجل

1. **قاعدة البيانات:** ترحيل المصدر الجديد [20261013200000_certificate_authority_delegations](../../packages/infrastructure/prisma/migrations/20261013200000_certificate_authority_delegations/migration.sql) يضيف جدول التفويض وحماية الوثيقة في EAP. **لم يطبّق على أي قاعدة**، ولا يتضمن تغيير صفوف الجهات القائمة. يلزم مراجعة rollout وتوليد Prisma client وتطبيقه في البيئة المعتمدة قبل تفعيل المسار الجديد. حارس EAP يفشل بأمان إذا لم تثبت triggers المطلوبة؛ لا تنشر الكود على مخطط قديم باعتباره متوافقًا تلقائيًا.
2. **الترقية/الرجوع:** أخذ نسخة وفحص الترحيلات في بيئة منفصلة عند طلب التشغيل؛ لا backfill أو حذف للتاريخ في هذه الجولة. الرجوع التشغيلي يبدأ بإيقاف المسارات الجديدة وإعادة إصدار التطبيق السابق مع حفظ جدول الأدلة؛ لا drop تلقائي لجدول تفويض ممتلئ أو إزالة حماية وثائق دون مراجعة منفصلة.
3. **التوقيع:** `CERTIFICATE_VAULT_BASE_URL` (HTTPS)، `CERTIFICATE_VAULT_TOKEN` من مزوّد أسرار، `CERTIFICATE_VAULT_TRANSIT_MOUNT` اختياري، `CERTIFICATE_VAULT_KEYS_JSON` غير سري يحوي لكل reference: `issuerCode/keyName/version/canSign`. `CERTIFICATE_SIGNING_KEY_REFERENCE` يجب أن يشير للمفتاح الحالي. لا أسرار/مفاتيح خاصة في Admin أو DB؛ التحقق القديم في production يحتاج provider/allowlist موثوقين، ولا نعيد توقيع أو تغيير سجلات قائمة تلقائيًا.
4. **الجهات:** الدليل الداخلي هو الافتراضي. سجل المؤسسة القانوني/هويتها يحتاج مراجعة وثيقة حقيقية بواسطة مراجع مستقل؛ لا تمنح واجهة checkbox وحدها سلطة بلا سجل خاص مربوط بالجهة/المفتاح/البصمة والمدة. موصل الدليل الخارجي اختياري عبر `CERTIFICATE_AUTHORITY_DIRECTORY_BASE_URL/TOKEN`؛ ليس شرطًا لعمل الدليل الداخلي.
5. **الأصول:** مزوّد sandbox يحتاج عقد تجديد grant `/v1/assets/upload-grants/refresh` لنفس locator، والتحقق/المسح/التعقيم والترقية والتسليم. مزوّد التجربة مطلوب لاحقًا؛ لم أختبر وجود هذه endpoints أو ACL في بيئة حية.
6. **readiness:** إعداد `CERTIFICATE_ARTIFACT_PROBE_ASSET_ID` و`CERTIFICATE_ARTIFACT_PROBE_SHA256` لملف PDF صغير غير شخصي مؤهل عبر EAP ومالك `CertificateRuntimeProbe`، وتشغيل العامل في sandbox. بدون دليل تسليم يبقى PENDING/DEGRADED؛ لا placeholder READY.
7. **Settings:** من مركز الشهادات/insights تهيئة تعريفات السياسة ثم تحديد Number في GLOBAL أو DOMAIN=`certificates`: `certificates.verification.retention_days`، `ip_per_minute`، `code_per_minute`. لا قيمة افتراضية لمدة الاحتفاظ؛ 60/120 هما حدّا المرور السابقان المحفوظان حتى تعديلهما. يلزم Redis للتحديد المشترك في production/staging.

## أمر الإعداد والاختبار — معروض ولم ينفذ

تعريف CI الجديد `Certificates isolated runtime verification (manual)` بلا push/pull_request trigger، و`run_isolated_verification=false` افتراضيًا. يخدم PostgreSQL جديدًا ببيانات fixture فقط؛ لا credentials production ولا application bootstrap ولا dispatchers إشعارات/مدفوعات. يعرض الأمر الذي سيطبّق الترحيلات على **القاعدة الجديدة الفارغة فقط**:

```bash
npm run db:generate
CERTIFICATE_RUNTIME_ISOLATED=1 \
DATABASE_URL=postgresql://certificate_fixture:certificate_fixture_only@127.0.0.1:5432/manaratak_certificate_verification \
DIRECT_URL=postgresql://certificate_fixture:certificate_fixture_only@127.0.0.1:5432/manaratak_certificate_verification \
node scripts/certificates/verify-isolated-runtime.mjs
```

داخل السكربت، بعد رفض host/name غير المعزولين وأي قاعدة غير فارغة، الأمر المعلن هو:

```bash
node node_modules/prisma/build/index.js migrate deploy --schema packages/infrastructure/prisma/schema.prisma
node node_modules/vitest/vitest.mjs run --config .certificates-isolated-vitest.config.ts --reporter=default --reporter=json --outputFile.json=certificate-isolated-results.json
```

لم أبدأ PostgreSQL أو أنشئ قاعدة أو أنفذ أي سطر من الأوامر أعلاه. لا تعتمد على URL المثال لتحديد قاعدة موجودة؛ السكربت يرفضها حتى على localhost. ملفات provider تستخدم fetch doubles محصورة بـfixture domains ومفاتيح اصطناعية، وDB fixture لربط شعار ACTIVE هو anchor اصطناعي لا إثبات scanner/storage. PDF test يستخدم الخطوط والصورة المحلية الموجودة بالفعل. هذه التعريفات لا تستبدل إثبات موفر KMS/HSM معزول فعلي، ACL/EAP recovery، permission/maker-checker في البيئة، أو E2E عند طلبها لاحقًا.

## سجل العمل والنتائج

- `git fetch origin` و`git status --short --branch` ثم `git switch -c codex/complete-section-14-source-20261013 origin/main`: إنشاء فرع مستقل من آخر main وقت البداية، دون تغييرات محلية تحتاج stash.
- `rg --files` و`rg -n` وقراءة مقاطع الملفات: مقارنة owner/repository/DI/API/Admin/EAP/Prisma والخطة. لا تشغيل أو كتابة بيانات.
- نسّقت المصدر الجديد والمقاطع المتأثرة بمكتبة Prettier؛ أصلحت خطأ JSX الذي كشفه التنسيق. **ليس اختبارًا ولا typecheck**.
- عدلت fixture حارس EAP ليتضمن trigger المصدر الجديد، وكتبت ملفات فحص العزل المؤجلة؛ **لم أشغلها**.
- `git commit` ثم `git push` إلى الفرع المستقل فقط. كوميت التقرير قد يأتي بعد كوميت المصدر الموضح أعلاه؛ كود التطبيق الذي يوثقه هو نفسه.

**المتبقي بطلب المستخدم:** تهيئة البيئة والسياسات/الجهات/المفاتيح وfixture، مراجعة وتطبيق الترحيل في البيئة المناسبة، والتحقق من الأنواع والاختبارات الخفيفة/التكامل/التزامن/البايتات/E2E ذات الصلة عند طلب إثبات التشغيل. لا يوجد نجاح تشغيل مسجل لهذه الجولة، ولا إعادة فحص للأقسام 24–28.
