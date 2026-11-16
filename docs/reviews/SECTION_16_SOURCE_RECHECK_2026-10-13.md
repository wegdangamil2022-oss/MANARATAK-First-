# إعادة مراجعة مصدر القسم 16 — إدارة المحتوى وتجربة الموقع

- المصدر المفحوص: `main@4974846f48810d89efb1856c655289b4e54827fb` بعد fetch؛ مساحة العمل كانت نظيفة.
- المرجع: القسم `16` و`16.FG` في `MANARATAK_ADMIN_REVIEW_CODEX.md`، مع تقارير التنفيذ/الإغلاق السابقة للاستدلال فقط.
- النطاق: source/API/Admin/public/worker/schema/migration definitions؛ **صفر اختبارات أو build أو تشغيل فعلي** في هذه الجولة.
- النتيجة: **SOURCE_GAPS_FOUND**؛ 5 ملاحظات مستقلة تمس 8 معرّفات. من32 متطلبًا: 23 منفذًا في المصدر ولم يُختبر هنا، 8 جزئية، ومتطلب تشغيل واحد مؤجل.

## النواقص المثبتة بالقراءة

### S16-01 — P1 — تبديل مخطط كتلة موجودة يتحقق من مخطط ولا يحفظه

المتطلبات: `CMS-ADM-016/017`.

`apps/admin/src/features/cms/CmsBlockEditor.tsx:294-305` يسمح تغيير `schemaId` لكتلة موجودة ويعيد بناء payload لذلك المخطط. `PrismaCmsRepository.saveBlock:2040-2045` يتحقق من `data.schemaId` والحقول/الأصول التابعة له، لكن update فرع existing `:2056-2065` يحفظ name/payload/status فقط، ولا يحفظ schemaId ولا يرفض تغييره. فرع create وحده يحفظه `:2072`؛ سجل الحدث `:2085` يذكر مخطط الطلب رغم أن الصف يحتفظ بالمخطط القديم. `publishBlock:1976` يتحقق لاحقًا وفق `existing.schemaId` القديم.

الأثر: حفظ ناجح ظاهريًا لمحتوى تحت مخطط آخر ثم خطأ نشر أو تفسير مختلف عن المراجعة. المطلوب: إما منع تبديل مخطط كتلة موجودة في API/repository/UI، أو انتقال مصدر صريح/versioned يحفظ علاقة المخطط وpayload/audit معًا ويحافظ على النسخة العامة السابقة. لا تعديل مخطط منشور بلا مراجعة.

### S16-02 — P1 — حقوق النشر العامة لا تُفحص في مسار المجدول والكتل

المتطلبات: `CMS-ADM-008/017`.

النشر اليدوي للمقال يمر بـ`AdminCmsUseCases.assertPublishingMedia` الذي يستدعي `AssetReferencePolicy` مع `publicPublication:true`، ويفحص `assertAssetPublicRights`.

لكن `PrismaCmsRepository.processDueSchedules:2480-2489` يستدعي repository.publish مباشرة؛ `verifyPublishedAssets/verifyAssetIds:2689-2715` يفحص وجود الأصل وPUBLIC و`record.assertCanDeliver()` فقط. `assertCanDeliver` في `packages/domain/src/asset-platform/aggregates/AssetRecord.ts:434-442` يفحص ACTIVE/CLEAN/scanner evidence، وليس حقوق النشر العامة. `saveBlock/publishBlock` يستخدمان verifyAssetIds نفسه دون فحص حقوق النشر.

لذلك تغيير حقوق أصل إلى منع الاستخدام العام بعد اعتماد المقال وقبل تنفيذ الجدولة لا يُرفض في هذا الحد، وقد تقبل الكتلة أصلًا عامًا دون حق النشر اللازم. هذه فجوة في قرار المصدر، ولا ندعي أن المزود قدم بايتات ممنوعة فعلًا.

المطلوب: public-rights gate مشترك عند كل قرار نشر، بما في ذلك scheduled publication والكتل، مع عدم اعتبار classification PUBLIC إذن حقوق. الحفاظ على nested asset extraction وfail-closed عند تعذر EAP؛ تحديد قيود ownership/purpose/MIME/size المطلوبة للحقول بدل اختراعها من التصنيف.

### S16-03 — P1 — الإعلان العام لا يمكن أرشفته بعد بدء مسودة تعديل

المتطلبات: `CMS-ADM-004/022`.

`PrismaCmsRepository.saveAnnouncement:2155-2206` يحتفظ بالنسخة العامة في snapshot، ويحوّل صف التحرير إلى DRAFT. هذا يحافظ على last-known-good كما تتطلب الخطة.

لكن `archiveAnnouncement:2294-2295` يرفض ما لم يكن صف التحرير PUBLISHED، وواجهة `CmsOperationsPanels.tsx:890` تخفي الأرشفة لصف DRAFT. لذلك إعلان له snapshot حي ومسودة تعديل لا يملك مسار إيقاف النسخة العامة الحالية دون نشر المسودة أولًا. المطلوب: السماح للناشر بأرشفة snapshot الحي مع version/سبب/تدقيق مستقل عن حالة draft، وواجهة تظهر حالتي التحرير والنشر بوضوح؛ لا حذف آخر نسخة عامة عند مجرد save.

### S16-04 — P1 — المجدول يسجل نجاحًا ويبقي المهمة PROCESSING عندما يجد المحتوى منشورًا

المتطلبات: `CMS-ADM-012/013`.

`processDueSchedules:2478-2505`: عندما يكون localized.state هو targetState=PUBLISHED، يتجاوز استدعاء publish. إتمام المهمة خارج publish محصور في non-PUBLISH jobs. ثم يزيد `result.published` رغم عدم إتمام مهمة PUBLISH التي حجزها؛ تبقى PROCESSING وتُعاد بعد انتهاء lease. المسار catch يفحص COMPLETED لكن هذا المسار لا يدخل catch أصلًا.

سيناريو قابل للاستنتاج من المصدر: نشر يدوي لمحتوى SCHEDULED حان موعده، دون scheduledJobId → يظل job غير مكتمل → sweep يحجزه ويرى PUBLISHED → يسجل success بلا completion. أو أي job قائم يشير بالفعل إلى نشر تمت مواءمته. لا نسميه اختبارًا منفذًا.

المطلوب: reconcile target/version/digest/job identity عند حالة «منشور بالفعل»، ثم إتمام/إلغاء المهمة بlease CAS وفق provenance. لا تُعد الحالة العامة وحدها إثبات نجاح المهمة، ولا تكرر revision/audit/outbox عند replay.

### S16-05 — P2 — فشل invalidation يبتلع دون إشارة أو إعادة معالجة موثقة

المتطلب: `CMS-ADM-011`.

`RedisCmsDeliveryCache.invalidateSite:29-35` يبتلع خطأ incr/publish دون metric/log/retry. توجد CMS mutation outbox events، لكن البحث في مصدر application/infrastructure/API لم يجد consumer لـ`CmsDeliveryInvalidated` أو `cms-events` يكمل invalidation/CDN أو يسجل فشله.

القراءات العامة canonical التي أضيفت تمنع الاعتماد على Redis snapshot قديم، وHTTP TTL=60 موثق في Router؛ لا نزعم أن المحتوى العام كله يعتمد على cache مكسور. النقص هو معيار الخطة الخاص بـobservable invalidation failure وربط التحديثات باستراتيجية freshness واضحة، وليس مطالبة بإثبات CDN حي الآن.

المطلوب: failure category/metric آمن واستراتيجية retry أو owner-derived generation/TTL معلنة لكل capability؛ إن كان الحل no-store/canonical فقط، يعكس ذلك العقد والتقرير بدل ادعاء purge/dispatcher غير موجود. لا cache purge حقيقي في المراجعة.

## مصفوفة المتطلبات

«منفذ» = مسار المصدر موجود وقرأناه، وليس PASS تشغيل جديد. الوظائف المتعلقة بالأصول والجدولة تعاد إلى جزئي بسبب النواقص أعلاه مهما كان تقرير 11 أكتوبر.

| المعرف | التصنيف | دليل المصدر / المتبقي |
|---|---|---|
| CMS-ADM-001 | منفذ | `CmsAdminRouter.requiredPermission` grants منفصلة view/author/review/publish/ops/navigation/schema/redirects؛ authenticated actor من الخادم. |
| CMS-ADM-002 | منفذ | `updateContent` يقيد root reviewed fields؛ effective fingerprint يغطي root/locale/relations؛ public snapshot منفصل. |
| CMS-ADM-003 | منفذ | publish upsert update يحدّث slug/canonical/type/site؛ change-slug يهيئ inactive redirect حتى إعادة النشر. |
| CMS-ADM-004 | جزئي | navigation/announcement immutable snapshots موجودة؛ S16-03 يترك gap إيقاف snapshot الإعلان أثناء تعديل draft. |
| CMS-ADM-005 | منفذ | approval fingerprint ومقارنة reviewer بالrequestor/local/root editors/author؛ final publish يعيد فحص hash. |
| CMS-ADM-006 | منفذ | root/workflow required versions؛ existing localization assertVersion؛ mutations serializable/CAS؛ optional version للإنشاء الجديد فقط. |
| CMS-ADM-007 | منفذ | full tags/attachments revision restore، asset preflight، rootFingerprint incompatible history يفشل صراحة؛ لا مزج صامت. |
| CMS-ADM-008 | جزئي | manual publishing media policy موجود؛ S16-02: scheduled final boundary لا يفحص public rights. |
| CMS-ADM-009 | منفذ | owner-backed domain link validation وroot version؛ reviewed/published link changes ترفض دون bypass. |
| CMS-ADM-010 | منفذ | `getPublishedBySlug` exact site/locale/slug فقط؛ لا hidden language fallback. |
| CMS-ADM-011 | جزئي | mutations invalidation وcanonical owner reads وHTTP TTL/no-store موجودة؛ S16-05: silent failures دون reconciliation/observability. |
| CMS-ADM-012 | جزئي | retry/backoff/failed schedule repair والساعة server-owned موجودة؛ S16-04 يمنع truthful recovery/closure في already-published branch. |
| CMS-ADM-013 | جزئي | publish مع job completes داخل serializable lease boundary؛ S16-04 يتجاوزه عندما يجد target منشورًا. |
| CMS-ADM-014 | منفذ | cancel/restore/change-slug cancels PENDING/PROCESSING، job identity binds locale version. |
| CMS-ADM-015 | منفذ | owner-resolved published navigation paths، current public read يحذف archived/orphan nodes ويفشل عند outage. |
| CMS-ADM-016 | جزئي | approved immutable schema/version وblock snapshot/public API/UI موجودة؛ S16-01: existing schema change غير متسق. |
| CMS-ADM-017 | جزئي | nested bounded asset paths وactive/public evidence موجودة؛ S16-01/02: schema association/public-rights final gate. |
| CMS-ADM-018 | منفذ | root mutation allowlist؛ owner/site/author لا تنتقل عبر generic PATCH. |
| CMS-ADM-019 | منفذ | PUBLIC audience/window/expired-publication guards؛ starts/expires form موجود. |
| CMS-ADM-020 | منفذ | public redirect destination/status DTO فقط؛ HTTP safe local redirect boundary. |
| CMS-ADM-021 | منفذ | related SQL ينفذ published site/locale filter قبل ordering/limit ويميز unique content. |
| CMS-ADM-022 | جزئي | nav/announcement publish وblock archive UI موجودة؛ S16-03: announcement snapshot archive unavailable during draft. |
| CMS-ADM-023 | منفذ | `CmsPublicRouter` owner HTML/redirect/status، `apps/web/nginx.conf` routing، published canonical/alternates/sitemap، stable app entry. |
| CMS-ADM-024 | منفذ | bounded q/page/pageSize وscoped compound/trigram migration source؛ SQL p95/EXPLAIN مؤجلة ولم تنفذ. |
| CMS-ADM-025 | منفذ | current-page/selected-locale queue/calendar labels؛ لا ادعاء global total أو تكرار مالك P24. |
| CMS-ADM-026 | منفذ | revision cursor summaries/lazy detail؛ bounded reviews وrelations؛ لا eager revision payload history. |
| CMS-ADM-027 | منفذ | per-panel allSettled/loading/error/refresh وsequence guards عند تبديل locale. |
| CMS-ADM-028 | منفذ | `cmsCopy/useTranslation`، interface locale منفصل عن content locale وAR/EN forms. |
| CMS-ADM-029 | منفذ | appendStandaloneMutation SYSTEM actor، scheduled job/lease/execution context وdurable handler job identity. |
| CMS-ADM-030 | مؤجل | migrations/CDN/provider/SQL/browser/RBAC deployment proof بعد28؛ مستبعد من أعداد نواقص المصدر. |
| FGA-16-001 | منفذ | searchable/paged redirect admin، versioned edit/disable/reason/audit وgraph safety؛ owned redirects تبقى تحت publisher workflow. |
| FGA-16-002 | منفذ | owner readiness/version/previewHash/required fields comparison AR/EN؛ لا فرض نشر اللغتين. |

## التسليم وحدود الجولة

هذه إعادة مراجعة فقط؛ لا إصلاح تطبيق أو merge أو deployment. الأوامر read-only fetch/status/rg/sed وكتابة التقرير؛ الاختبارات جميعها **NOT_RUN** في هذه الجولة. ملفات migration تمت قراءتها كتعريف مصدر ولم تُطبق. تقارير/اختبارات 11 أكتوبر التاريخية لا تثبت سلامة المسارات الخمسة التي اكتشفت هنا. يلزم إصلاحها قبل تحديث حكم اكتمال المصدر؛ إثبات التشغيل يبقى مؤجلًا كما طلب المستخدم.
