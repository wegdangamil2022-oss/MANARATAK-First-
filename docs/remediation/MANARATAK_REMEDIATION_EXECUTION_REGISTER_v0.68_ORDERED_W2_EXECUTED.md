# MANARATAK — سجل تنفيذ الإصلاحات المرتّب v0.68

**تاريخ التنظيم:** 2026-09-06  
**المدخل المعتمد:** v0.67 المرفق من المستخدم؛ لا تعتمد النسخ السابقة عند التعارض.  
**نطاق هذه النسخة:** تنظيم التنفيذ وإضافة نتيجة مصدرية جديدة؛ لم تُنفّذ إصلاحات برمجية أو تغييرات GitHub/DB.  
**Commit المرجعي:** 0931c5664cf274cb2b8f4cb250dd09ebf2e9a77f — لا تمثل هذه الخطة ادعاءً بفحص أحدث HEAD على GitHub.  
**الحالة الحالية:** SOURCE_NOT_COMPLETE — REMEDIATION_REQUIRED؛ RUNTIME_VERIFIED=NO؛ PRODUCTION_READY=NO.

## 1. ملخص القرار التنفيذي

العدد الحالي **109 مشكلات فريدة: P1=76، P2=32، P3=1**. عدد المعرّفات 113، منها أربعة aliases لا تُنفذ كمهام مستقلة: 0038→0011، 0039→0012، 0053→0002، 0082→0005.

أُضيفت 0113 (P2) بعد تتبع limiter الطالب من DI إلى use case. كل الأرقام السابقة محفوظة. ترقية 0005 إلى P1 كما في v0.67 نافذة في الجدول الحالي، وإن بقي الوصف القديم في الملحق التاريخي.

**هذه النسخة هي مرجع ترتيب الإصلاحات.** البطاقات أدناه مرتبة للتنفيذ، والملحق الأخير يحفظ ملف v0.67 كاملًا حرفيًا؛ أعداده وقراراته تاريخية عند التعارض مع هذا الملخص.

## 2. قواعد التنفيذ والصلاحيات

- نبدأ W0 ثم W1 إلى W7. داخل الموجة: P1 ثم P2 ثم P3، لكن التبعية التقنية تتقدم على شدة المشكلة. مثلًا 0100 (pagination، P2) قبل 0025 (P1)، و0014 قبل 0069.
- W0/W7 لا تعني تأجيل إصلاح الخطورة: W0 يثبت سلطة القرار أولًا؛ تصحيح ادعاءات CLOSED يبدأ فورًا ولا ينتظر الصياغة النهائية W7.
- لكل بطاقة مالك مسؤول وظيفيًا؛ هذه أدوار مقترحة وليست تكليفًا لأشخاص أو ادعاء موافقتهم. لا مواعيد مختلقة دون تقدير الفريق.
- التبعيات المحددة أدناه شروط إغلاق مقترحة من مدير المشروع، لا ادعاء بأن المصدر يحتوي dependency graph مماثلًا. يجوز بدء التصميم قبلها؛ لا تغلق تابعًا دون إثبات العقد المتفق عليه.
- تبدأ اختبارات كل إصلاح معه؛ W6 إعادة تحقق متكاملة وليست أول وقت لكتابة الاختبارات. إصلاح CI مكسور يمنع تنفيذ حزمة حالية يُقدّم معها دون انتظار W6، وتبقى بطاقته هناك لملكية التحقق النهائي.
- بوابة الموجة تعني اعتماد مخرجاتها اللازمة لبدء التابعة، لا اشتراط VERIFIED_CLOSED لكل بطاقة؛ بعض إثباتات W1/W2 تعتمد على تشغيل المزوّدين في W3 واختبارات W6. أبقها SOURCE_VERIFIED/RUNTIME_PENDING حتى ذلك الوقت، ولا تتجاوزها إلى إصدار إنتاجي.
- مهمة 0005 تُنفّذ بحماية ومراجعات صالحة أولًا؛ توسيع required checks مرتبط بإصلاح verifiers في 0048، ولا تُفعّل أسماء checks غير موجودة أو تلغِ الحماية لتجاوز فشلها.
- مصدر/وثائق التعديل فقط ضمن العمل القادم. تشغيل migrations أو الاستعادة أو تغيير حماية GitHub أو نشر إصدار يحتاج طلب تنفيذ واضح وتأكيد الهدف والصلاحيات.
- لا يُحذف كود orphan لمجرد غياب نتيجة بحث؛ أثبت مراجع imports وDI وCLI وworkers وdynamic imports ثم قرر REMOVE أو IMPLEMENT أو FORMALLY_DEFERRED.
- لا تُعد مخالفة وثيقة مساوية تلقائيًا لاستغلال أمني. راجع ADR الأحدث وسياق النشر قبل اعتماد الحل النهائي؛ لا تُغلق النتيجة بتغيير الوثيقة لمجرد إخفاء نقص الوظيفة.

## 3. حدود الدليل والإغلاق

فحص هذه الجولة: اتساق 112 سجلًا سابقًا، التكرار والشدة، ترتيب التبعيات، ومراجعة مركزة لمحدد Student Tools. ليست إعادة اختبار شاملة للمنصة. لم تُشغّل اختبارات DB أو اختبار أمني على نشر حي.

عبارة Remaining unexplored audit axes = 0 في v0.67 تعني إغلاق تغطية الاكتشاف المعلنة لذلك snapshot، **ولا تثبت غياب جميع الأخطاء**. نتيجة 0113 ملاحظة جديدة في مراجعة التسليم؛ العدد الحالي قابل للزيادة بالدليل أثناء الإصلاح.

الحالات: OPEN → READY (تبعيات وخطة واختبار مقبول) → IN_PROGRESS → SOURCE_VERIFIED → RUNTIME_PENDING عند الحاجة → VERIFIED_CLOSED. BLOCKED يذكر السبب والمسؤول. لا تحويل آلي إلى CLOSED عند merge.

شروط الإغلاق لكل بطاقة: commit/PR + اختبار فشل قبل الإصلاح ونجاح بعده + اختبار أمان/تراجع مناسب + دليل CI محدد + توثيق API/DB عند التغير + مراجعة مستقلة. إثبات المصدر لا يحل محل اختبار runtime/مزوّد/DB المطلوب.

## 4. موجات الإصلاح والمالكون

| الموجة | النطاق | P1 | P2 | P3 | الإجمالي | المالك المقترح |
|---|---|---:|---:|---:|---:|---|
| W0 | سلطة المشروع وبوابات التغيير | 4 | 2 | 0 | 6 | مدير المشروع + مسؤول المستودع/CI |
| W1 | الأمن وهوية المستخدم وحدود التشغيل | 13 | 8 | 0 | 21 | Backend Security + Platform |
| W2 | الدومين وقاعدة البيانات وسلامة العقود | 13 | 6 | 0 | 19 | Domain Backend + Database |
| W3 | المزوّدون والأحداث والعمال والتكامل | 17 | 0 | 0 | 17 | Platform Workers + Integration + Domain Backend |
| W4 | عقود API ولوحة المدير والمنصة العامة | 15 | 8 | 0 | 23 | API + Admin/Web Frontend |
| W5 | رحلة الطالب من الواجهة إلى البيانات | 6 | 1 | 0 | 7 | Product Frontend + Student/Learning Backend + QA |
| W6 | التحقق والإصدار والمراقبة والتعافي | 8 | 2 | 0 | 10 | QA + DevOps/SRE + Security |
| W7 | الوثائق والأدلة والإغلاق النهائي | 0 | 5 | 1 | 6 | مدير المشروع + مالكو الدومينات + QA |

## 5. قائمة التنفيذ المرجعية — مهمة واحدة لكل جذر

### W0 — سلطة المشروع وبوابات التغيير

**بوابة الخروج:** اعتماد مرجع المراحل والعقود؛ حماية الفرع؛ تحديد تهيئة قاعدة جديدة مقابل الاستعادة دون إزالة حماية الكتابة.

| الترتيب | المشكلة | الشدة | المطلوب / عنوان الدليل | تبعيات إضافية قبل الإغلاق | الحالة |
|---:|---|---|---|---|---|
| 1 | [MNT-AUD-0005](#fix-0005) | P1 | `main` Branch Has No Enforced Protection / Required CI Status Checks | بوابة الموجة السابقة؛ لا تبعية خاصة مثبتة | OPEN |
| 2 | [MNT-AUD-0001](#fix-0001) | P1 | Obsolete Original-Database Recovery Assumption Is Embedded in Active Source Gates | بوابة الموجة السابقة؛ لا تبعية خاصة مثبتة | OPEN |
| 3 | [MNT-AUD-0031](#fix-0031) | P1 | Active Cross-Phase Closure Matrix Is Incomplete and Its Final-Closure Claim Is Stale | بوابة الموجة السابقة؛ لا تبعية خاصة مثبتة | OPEN |
| 4 | [MNT-AUD-0045](#fix-0045) | P1 | Active P23/P24 Architecture Specifications Remain “Baselined & Approved” Despite Proven Source Divergence | بوابة الموجة السابقة؛ لا تبعية خاصة مثبتة | OPEN |
| 5 | [MNT-AUD-0002](#fix-0002) | P2 | Canonical Node Runtime Version Is Inconsistent Across Active Documentation and Source Configuration | بوابة الموجة السابقة؛ لا تبعية خاصة مثبتة | OPEN |
| 6 | [MNT-AUD-0006](#fix-0006) | P2 | Canonical `.env.example` Omits Environment Variables Required by Active Database Mutation Gate Code | بوابة الموجة السابقة؛ لا تبعية خاصة مثبتة | OPEN |

### W1 — الأمن وهوية المستخدم وحدود التشغيل

**بوابة الخروج:** اختبارات رفض المصادقة/الصلاحيات، سلامة التدقيق append-only، فشل مغلق عند فقد التبعيات، وعدم استخدام قدرات تطوير في production.

| الترتيب | المشكلة | الشدة | المطلوب / عنوان الدليل | تبعيات إضافية قبل الإغلاق | الحالة |
|---:|---|---|---|---|---|
| 7 | [MNT-AUD-0105](#fix-0105) | P1 | The Canonical Token Provider Violates the Approved JWT Trust and Lifecycle Model: HS256, One-Hour Access Tokens and JWT Refresh Tokens | بوابة الموجة السابقة؛ لا تبعية خاصة مثبتة | OPEN |
| 8 | [MNT-AUD-0071](#fix-0071) | P1 | Refresh-Token Rotation Is Non-Atomic, Allowing Concurrent Reuse of One Refresh Token to Mint Multiple Valid Sessions | [MNT-AUD-0105](#fix-0105) | OPEN |
| 9 | [MNT-AUD-0076](#fix-0076) | P1 | Suspending or Archiving an Identity Does Not Revoke Existing Sessions, While Normal User Authentication Does Not Re-check Identity Lifecycle State | [MNT-AUD-0071](#fix-0071) | OPEN |
| 10 | [MNT-AUD-0065](#fix-0065) | P1 | Non-`/admin` Control-Plane Routes Authenticate Without Session-Revocation or Active-Identity Validation | [MNT-AUD-0076](#fix-0076) | OPEN |
| 11 | [MNT-AUD-0062](#fix-0062) | P1 | Privileged Phase 17 `/api/v1/ai` Gateway Is Mounted Behind Permission Evaluation Without an Authentication Guard and Is Unreachable in Real App Composition | [MNT-AUD-0065](#fix-0065) | OPEN |
| 12 | [MNT-AUD-0110](#fix-0110) | P1 | Audit Records Are Not Append-Only: Privileged HTTP Clients Can Supply Security-Critical Audit Fields and Overwrite Existing Rows Through Repository `upsert` | بوابة الموجة السابقة؛ لا تبعية خاصة مثبتة | OPEN |
| 13 | [MNT-AUD-0106](#fix-0106) | P1 | Central and Authorization Audit Paths Lose the Authenticated Principal and Attribute Admin Mutations to `ANONYMOUS` or `SYSTEM` | [MNT-AUD-0110](#fix-0110) | OPEN |
| 14 | [MNT-AUD-0084](#fix-0084) | P1 | Phase 11+ Admin Mutations Fall Through `MutationAuditPolicy` to `NO_AUDIT_REQUIRED` | [MNT-AUD-0106](#fix-0106) | OPEN |
| 15 | [MNT-AUD-0111](#fix-0111) | P1 | The Central DTO Validation Middleware Is Instantiated but Never Composed, Leaving Privileged Legacy Routers Outside Strict Edge Validation | بوابة الموجة السابقة؛ لا تبعية خاصة مثبتة | OPEN |
| 16 | [MNT-AUD-0101](#fix-0101) | P1 | The Approved Frontend CSP/Clickjacking Boundary Is Not Source-Enforced; CSP Is Attached Only to API Responses and Still Allows `unsafe-inline` | بوابة الموجة السابقة؛ لا تبعية خاصة مثبتة | OPEN |
| 17 | [MNT-AUD-0043](#fix-0043) | P1 | Production Environment Contract Is Internally Contradictory and Omits Startup-Blocking Variables | بوابة الموجة السابقة؛ لا تبعية خاصة مثبتة | OPEN |
| 18 | [MNT-AUD-0040](#fix-0040) | P1 | API Runtime Creates Multiple Independent Prisma/Redis Clients and Has No Graceful Resource Shutdown Lifecycle | بوابة الموجة السابقة؛ لا تبعية خاصة مثبتة | OPEN |
| 19 | [MNT-AUD-0063](#fix-0063) | P1 | Readiness Semantics Force Redis to Optional Even When Production Registration Marks It Required, Allowing a Runtime Redis Outage to Report Overall READY | بوابة الموجة السابقة؛ لا تبعية خاصة مثبتة | OPEN |
| 20 | [MNT-AUD-0072](#fix-0072) | P2 | Login Verification Has a Measurable Account-Existence Timing Split and Uses Synchronous scrypt on the Node Event Loop | بوابة الموجة السابقة؛ لا تبعية خاصة مثبتة | OPEN |
| 21 | [MNT-AUD-0102](#fix-0102) | P2 | Cookie/CSRF Production Configuration Passes Readiness While Diverging from the Approved `SameSite=Strict` and Secret-Ownership Contract | بوابة الموجة السابقة؛ لا تبعية خاصة مثبتة | OPEN |
| 22 | [MNT-AUD-0103](#fix-0103) | P2 | Fixed CORS Preflight Policy Omits Required Mutation and Correlation Headers Used by the Canonical Admin Client | بوابة الموجة السابقة؛ لا تبعية خاصة مثبتة | OPEN |
| 23 | [MNT-AUD-0104](#fix-0104) | P2 | Local Compose Publishes Weakly Credentialed PostgreSQL and Unauthenticated Redis on All Host Interfaces Without a Safety Profile | بوابة الموجة السابقة؛ لا تبعية خاصة مثبتة | OPEN |
| 24 | [MNT-AUD-0067](#fix-0067) | P2 | Canonical Admin `VITE_LOCAL_ADMIN_READ_ONLY` Mode Bypasses Frontend Authentication but Does Not Enforce a Read-Only Transport Boundary | بوابة الموجة السابقة؛ لا تبعية خاصة مثبتة | OPEN |
| 25 | [MNT-AUD-0070](#fix-0070) | P2 | Public Prototype Data Mode Is Explicit but Not Forbidden in Production Builds | بوابة الموجة السابقة؛ لا تبعية خاصة مثبتة | OPEN |
| 26 | [MNT-AUD-0108](#fix-0108) | P2 | Legacy File Activation Lets the JSON Body Override the Path Resource Identifier and Lacks Edge Schema Validation | [MNT-AUD-0111](#fix-0111) | OPEN |
| 27 | [MNT-AUD-0113](#fix-0113) | P2 | Student Tools Quotas Use a Process-Local Limiter Outside the Distributed Production Rate-Limit Boundary | [MNT-AUD-0040](#fix-0040) | OPEN |

### W2 — الدومين وقاعدة البيانات وسلامة العقود

**بوابة الخروج:** عقود حقيقية غير dummy؛ migration chain على قاعدة مؤقتة معزولة؛ bootstrap آمن؛ قيود العلاقات والتزامن والاحتفاظ مثبتة.

| الترتيب | المشكلة | الشدة | المطلوب / عنوان الدليل | تبعيات إضافية قبل الإغلاق | الحالة |
|---:|---|---|---|---|---|
| 28 | [MNT-AUD-0095](#fix-0095) | P1 | The Production Domain Barrel Still Exports `generated/dummy.ts`, and Active Use Cases Compile Against Dummy `any` Contracts | بوابة الموجة السابقة؛ لا تبعية خاصة مثبتة | SOURCE_VERIFIED |
| 29 | [MNT-AUD-0056](#fix-0056) | P1 | Active Identity Provisioning and DTO Mapping Bypass TypeScript Verification with `@ts-nocheck` | بوابة الموجة السابقة؛ لا تبعية خاصة مثبتة | SOURCE_VERIFIED |
| 30 | [MNT-AUD-0088](#fix-0088) | P1 | Canonical Prisma Persistence Collapses Approved Bounded Contexts into One PostgreSQL Schema Instead of the Mandated Logical/Physical Schema Isolation | بوابة الموجة السابقة؛ لا تبعية خاصة مثبتة | SOURCE_VERIFIED_REVIEW_PENDING |
| 31 | [MNT-AUD-0041](#fix-0041) | P1 | Prisma Source Gate Does Not Prove Migration-Chain-to-Schema Parity for a Greenfield Database | [MNT-AUD-0088](#fix-0088) | SOURCE_VERIFIED_DB_RUNTIME_PENDING |
| 32 | [MNT-AUD-0083](#fix-0083) | P1 | Governed Database Baseline Can Silently Lose Migration-Ledger Evidence and Continue with Partial/Unavailable Domain Counters | [MNT-AUD-0041](#fix-0041) | SOURCE_VERIFIED_DB_RUNTIME_PENDING |
| 33 | [MNT-AUD-0035](#fix-0035) | P1 | No Canonical Greenfield Database Seed/Bootstrap Orchestrator Exists | [MNT-AUD-0041](#fix-0041)، [MNT-AUD-0083](#fix-0083) | SOURCE_IMPLEMENTED_REFERENCE_DATA_BLOCKED |
| 34 | [MNT-AUD-0013](#fix-0013) | P1 | Phase 07 Canonical Reference Lifecycle, Versioning, Supersession, and Alias Contract Is Not Implemented by the Current Runtime Data Model | [MNT-AUD-0035](#fix-0035) | SOURCE_VERIFIED_DB_RUNTIME_PENDING |
| 35 | [MNT-AUD-0030](#fix-0030) | P1 | Asset Reference Integrity Is Not Enforced Consistently Across Consumer Phases | [MNT-AUD-0013](#fix-0013) | SOURCE_VERIFIED |
| 36 | [MNT-AUD-0050](#fix-0050) | P1 | Active Asset Purge Route Cannot Enforce Usage Safety Because AssetUsageRegistry Is UNAVAILABLE | [MNT-AUD-0030](#fix-0030) | SOURCE_VERIFIED |
| 37 | [MNT-AUD-0049](#fix-0049) | P1 | Mounted Phase 05 Control-Plane APIs Depend on Repositories Registered as UNAVAILABLE | [MNT-AUD-0095](#fix-0095) | SOURCE_VERIFIED |
| 38 | [MNT-AUD-0091](#fix-0091) | P1 | Phase 20 Service and Phase 21 Career Canonicalization Is ASCII-Only, Breaking Arabic Identity, Deduplication and Slug Semantics | [MNT-AUD-0095](#fix-0095) | SOURCE_VERIFIED |
| 39 | [MNT-AUD-0058](#fix-0058) | P1 | Phase 20 Owner Source Implements Only Catalog + Service Requests While Canonical Phase Scope Requires Packages, Bookings, Scheduling, Providers, Pricing, Discounts, Promotions and Workflow/Delivery Engines | بوابة الموجة السابقة؛ لا تبعية خاصة مثبتة | OWNER_SOURCE_VERIFIED_LATER_WAVE_COMPOSITION |
| 40 | [MNT-AUD-0055](#fix-0055) | P1 | Phase 21 Career & Alumni Source Implements Employer/Job Posting Slice but Omits Core Applications, CV, Alumni and Career-Profile Scope | بوابة الموجة السابقة؛ لا تبعية خاصة مثبتة | OWNER_SOURCE_VERIFIED_LATER_WAVE_COMPOSITION |
| 41 | [MNT-AUD-0075](#fix-0075) | P2 | Root Prisma Mutation Commands Bypass the Reviewed Database Remediation/Recovery Gate | بوابة الموجة السابقة؛ لا تبعية خاصة مثبتة | SOURCE_VERIFIED |
| 42 | [MNT-AUD-0079](#fix-0079) | P2 | Database Rollback-Plan Gate Does Not Require Rollback/Recovery Artifacts for the Migration Chain It Reports | بوابة الموجة السابقة؛ لا تبعية خاصة مثبتة | SOURCE_VERIFIED |
| 43 | [MNT-AUD-0057](#fix-0057) | P2 | Persisted Domain/Public Identifiers Still Use `Math.random()` Instead of a Governed Identifier Generator | بوابة الموجة السابقة؛ لا تبعية خاصة مثبتة | SOURCE_VERIFIED |
| 44 | [MNT-AUD-0096](#fix-0096) | P2 | Phase 20 Service and Phase 21 Career Mutable Records Have No Version-Based Concurrency/Fencing Against Lost Updates | [MNT-AUD-0058](#fix-0058)، [MNT-AUD-0055](#fix-0055) | SOURCE_VERIFIED |
| 45 | [MNT-AUD-0081](#fix-0081) | P2 | Retention Deadlines Are Persisted but Not Enforced by a Canonical Retention Lifecycle Across Import, Audit and Asset Data | بوابة الموجة السابقة؛ لا تبعية خاصة مثبتة | SOURCE_VERIFIED_W3_SCHEDULER_PENDING |
| 46 | [MNT-AUD-0109](#fix-0109) | P2 | The Composition Root Retains Orphan Foundation Use Cases and Dead Shadow Implementations With No Executable Runtime Consumer | بوابة الموجة السابقة؛ لا تبعية خاصة مثبتة | SOURCE_VERIFIED |

### W3 — المزوّدون والأحداث والعمال والتكامل

**بوابة الخروج:** لكل حدث منتج/outbox/dispatcher/consumer/inbox؛ retry وDLQ وlease fencing؛ اختبارات مزوّد حقيقي في sandbox عند توفره.

| الترتيب | المشكلة | الشدة | المطلوب / عنوان الدليل | تبعيات إضافية قبل الإغلاق | الحالة |
|---:|---|---|---|---|---|
| 47 | [MNT-AUD-0007](#fix-0007) | P1 | Mandatory BullMQ / Background-Worker Architecture Is Declared but Not Implemented in Active Source | بوابة الموجة السابقة؛ لا تبعية خاصة مثبتة | OPEN |
| 48 | [MNT-AUD-0068](#fix-0068) | P1 | Transactional Outbox Lease Ownership Can Be Lost Mid-Delivery and Stale Workers Can Overwrite Final State | [MNT-AUD-0007](#fix-0007) | OPEN |
| 49 | [MNT-AUD-0011](#fix-0011) | P1 | Phase 05 Enterprise Asset Platform Has No Production-Capable Storage, Malware-Scanning, or Sanitization Adapters | [MNT-AUD-0043](#fix-0043) | OPEN |
| 50 | [MNT-AUD-0012](#fix-0012) | P1 | Phase 06 Import Foundation Lacks a Durable Production Raw-Snapshot Store Adapter and Defers Its Implementation to Runtime Closure | [MNT-AUD-0043](#fix-0043) | OPEN |
| 51 | [MNT-AUD-0018](#fix-0018) | P1 | Phase 19 Payment, FX, and Bank-Transfer Adapters Are Non-Functional Runtime-Pending Shells | [MNT-AUD-0043](#fix-0043) | OPEN |
| 52 | [MNT-AUD-0080](#fix-0080) | P1 | Core Aggregate Domain Events Are Not Reliably Published: Identity Events Are Persisted Without Dispatch and the In-Memory Dispatcher Has No Registered Handlers | [MNT-AUD-0007](#fix-0007)، [MNT-AUD-0068](#fix-0068) | OPEN |
| 53 | [MNT-AUD-0060](#fix-0060) | P1 | Phase 20 Domain Events Are Declared but Service Catalog/Request Mutations Do Not Publish Them Through the Transactional Outbox/Event Foundation | [MNT-AUD-0080](#fix-0080)، [MNT-AUD-0058](#fix-0058) | OPEN |
| 54 | [MNT-AUD-0089](#fix-0089) | P1 | Implemented Phase 21 Career Employer/Job Mutations Do Not Publish the Enterprise Career Events Declared by the Active Phase Contract | [MNT-AUD-0080](#fix-0080)، [MNT-AUD-0055](#fix-0055) | OPEN |
| 55 | [MNT-AUD-0093](#fix-0093) | P1 | Phase 13 Enrollment and Progress Mutations Do Not Publish the Learning Events Phase 15 Is Designed to Consume | [MNT-AUD-0080](#fix-0080) | OPEN |
| 56 | [MNT-AUD-0016](#fix-0016) | P1 | Phase 15 Student Workspace Auto-Provisioning Consumer Exists but Is Not Wired to a Real Identity Producer | [MNT-AUD-0080](#fix-0080) | OPEN |
| 57 | [MNT-AUD-0017](#fix-0017) | P1 | Phase 16 Scheduled CMS Publishing Has Processing Logic but No Automatic Production Scheduler/Worker | [MNT-AUD-0007](#fix-0007)، [MNT-AUD-0068](#fix-0068) | OPEN |
| 58 | [MNT-AUD-0034](#fix-0034) | P1 | Notification Foundation Remains Dummy/In-Memory and Has No Production/Admin Delivery Plane | [MNT-AUD-0007](#fix-0007)، [MNT-AUD-0068](#fix-0068) | OPEN |
| 59 | [MNT-AUD-0054](#fix-0054) | P1 | Phase 17 Durable AI Async Jobs Have No Runtime Worker/Scheduler to Execute Queued Jobs | [MNT-AUD-0007](#fix-0007)، [MNT-AUD-0068](#fix-0068) | OPEN |
| 60 | [MNT-AUD-0077](#fix-0077) | P1 | Phase 19 Reconciliation Is On-Demand/Internal-Ledger Only; No Scheduled Provider-State Recovery Exists for Ambiguous Payment/Transfer Outcomes | [MNT-AUD-0018](#fix-0018)، [MNT-AUD-0007](#fix-0007)، [MNT-AUD-0068](#fix-0068) | OPEN |
| 61 | [MNT-AUD-0086](#fix-0086) | P1 | Phase 06 Durable Import Queue Has Inline First-Attempt Execution but No Runtime Poller for Scheduled Retries or Reclaimed Jobs | [MNT-AUD-0012](#fix-0012)، [MNT-AUD-0007](#fix-0007)، [MNT-AUD-0068](#fix-0068) | OPEN |
| 62 | [MNT-AUD-0029](#fix-0029) | P1 | P24 Connected-Knowledge Contract Overstates Implemented Cross-Phase Relationships | [MNT-AUD-0016](#fix-0016)، [MNT-AUD-0060](#fix-0060)، [MNT-AUD-0089](#fix-0089)، [MNT-AUD-0093](#fix-0093) | OPEN |
| 63 | [MNT-AUD-0032](#fix-0032) | P1 | Certificate Completion Worker Requires Undocumented Hidden Runtime Flags | [MNT-AUD-0043](#fix-0043) | OPEN |

### W4 — عقود API ولوحة المدير والمنصة العامة

**بوابة الخروج:** صفحة/action حقيقية لكل وظيفة؛ permission وaudit لكل mutation؛ error/empty/deep-link؛ لا حقائق مصطنعة ولا عينات صامتة.

| الترتيب | المشكلة | الشدة | المطلوب / عنوان الدليل | تبعيات إضافية قبل الإغلاق | الحالة |
|---:|---|---|---|---|---|
| 64 | [MNT-AUD-0098](#fix-0098) | P1 | Approved API Idempotency Standard Is Implemented Selectively; Most POST/PUT Mutation Endpoints Have No Canonical Idempotency Enforcement | [MNT-AUD-0111](#fix-0111)، [MNT-AUD-0068](#fix-0068) | OPEN |
| 65 | [MNT-AUD-0020](#fix-0020) | P1 | Phase 23 Lacks IAM/RBAC Administration Workspaces Required by Its Own Governance Contract | [MNT-AUD-0065](#fix-0065)، [MNT-AUD-0106](#fix-0106) | OPEN |
| 66 | [MNT-AUD-0021](#fix-0021) | P1 | Phase 23 Mandates a Central Immutable Audit Activity View but Canonical Admin Has No Audit Center | [MNT-AUD-0110](#fix-0110)، [MNT-AUD-0084](#fix-0084) | OPEN |
| 67 | [MNT-AUD-0026](#fix-0026) | P1 | P05/P23 Asset Administration & Selection Control Plane Missing | [MNT-AUD-0011](#fix-0011)، [MNT-AUD-0050](#fix-0050) | OPEN |
| 68 | [MNT-AUD-0027](#fix-0027) | P1 | P23 Course Admin Cannot Create Native Courses Despite Existing Owner API | [MNT-AUD-0098](#fix-0098) | OPEN |
| 69 | [MNT-AUD-0033](#fix-0033) | P1 | P23→P24 Public Visibility/Composition Control Contract Has No Source Implementation | [MNT-AUD-0084](#fix-0084) | OPEN |
| 70 | [MNT-AUD-0036](#fix-0036) | P1 | P23 Student Administration/Support View Is Declared but Not Implemented | [MNT-AUD-0016](#fix-0016) | OPEN |
| 71 | [MNT-AUD-0037](#fix-0037) | P1 | Public Global Search Is Client-Side Over a Truncated Loaded Subset While the Canonical Search Foundation Is Unavailable | [MNT-AUD-0049](#fix-0049)، [MNT-AUD-0095](#fix-0095) | OPEN |
| 72 | [MNT-AUD-0046](#fix-0046) | P1 | P24 Flattens Distinct P16 CMS Content Types into the Articles Surface | [MNT-AUD-0017](#fix-0017) | OPEN |
| 73 | [MNT-AUD-0061](#fix-0061) | P1 | `/compare` Public Route Is Declared but Has No Phase 22/24 Comparison Experience Implementation | بوابة الموجة السابقة؛ لا تبعية خاصة مثبتة | OPEN |
| 74 | [MNT-AUD-0112](#fix-0112) | P1 | P23 Later-Domain Admin Pages Expose Only a Subset of Existing Owner-API Mutations, Leaving Important Administrative Actions Without UI Parity | [MNT-AUD-0055](#fix-0055)، [MNT-AUD-0058](#fix-0058) | OPEN |
| 75 | [MNT-AUD-0024](#fix-0024) | P1 | Phase 24 Live Projection Injects Synthetic/Unknown Values into User-Facing Facts and Filters | بوابة الموجة السابقة؛ لا تبعية خاصة مثبتة | OPEN |
| 76 | [MNT-AUD-0022](#fix-0022) | P1 | Phase 24 SEO Metadata Exists but Is Client-Injected; Crawlable SSR/Prerender Delivery Is Not Implemented | بوابة الموجة السابقة؛ لا تبعية خاصة مثبتة | OPEN |
| 77 | [MNT-AUD-0099](#fix-0099) | P2 | Approved RFC 7807 Error Contract Is Not Implemented Consistently Across the HTTP API | بوابة الموجة السابقة؛ لا تبعية خاصة مثبتة | OPEN |
| 78 | [MNT-AUD-0100](#fix-0100) | P2 | Large Catalog APIs Use Offset `page/pageSize` Pagination Instead of the Approved Cursor-Based API Standard | بوابة الموجة السابقة؛ لا تبعية خاصة مثبتة | OPEN |
| 79 | [MNT-AUD-0025](#fix-0025) | P1 | Phase 24 Public Catalogs and Global Search Silently Load Only the First Fixed API Page | [MNT-AUD-0100](#fix-0100) | OPEN |
| 80 | [MNT-AUD-0014](#fix-0014) | P2 | Phase 13 Public Course Contract Drifts Between Canonical Domain DTO and Web Client | بوابة الموجة السابقة؛ لا تبعية خاصة مثبتة | OPEN |
| 81 | [MNT-AUD-0069](#fix-0069) | P1 | Phase 24 Loads Canonical Native Courses but Routes/Maps Them as Imported Courses; Native Catalog Remains a Placeholder | [MNT-AUD-0014](#fix-0014) | OPEN |
| 82 | [MNT-AUD-0064](#fix-0064) | P2 | Phase 23 Admin SPA Grants the Entire Frontend Control Plane After Detecting Any `admin:*`-Scoped Permission and Does Not Make Navigation/Routes Permission-Aware | [MNT-AUD-0020](#fix-0020) | OPEN |
| 83 | [MNT-AUD-0044](#fix-0044) | P2 | P23 Unified Review Queue Is a Fixed Sample, Not an Exhaustive Operational Queue | بوابة الموجة السابقة؛ لا تبعية خاصة مثبتة | OPEN |
| 84 | [MNT-AUD-0059](#fix-0059) | P2 | Phase 20 Admin UI Uses Service Enums That Do Not Match the Domain/API Contract and Exposes Values the API Rejects | [MNT-AUD-0058](#fix-0058) | OPEN |
| 85 | [MNT-AUD-0028](#fix-0028) | P2 | P24 English Locale Route Exists but Main Public Composition Forces Arabic | بوابة الموجة السابقة؛ لا تبعية خاصة مثبتة | OPEN |
| 86 | [MNT-AUD-0090](#fix-0090) | P2 | Arabic Web/Admin Dictionaries Contain Untranslated Mixed-English Production Copy While the Translation Quality Gate Checks Structure, Not Target-Language Semantics | بوابة الموجة السابقة؛ لا تبعية خاصة مثبتة | OPEN |

### W5 — رحلة الطالب من الواجهة إلى البيانات

**بوابة الخروج:** تسجيل → دخول → التحاق → درس → تقدم → اختبار → إكمال → شهادة؛ حفظ العناصر وطلب الخدمة يثبتان عبر API وDB.

| الترتيب | المشكلة | الشدة | المطلوب / عنوان الدليل | تبعيات إضافية قبل الإغلاق | الحالة |
|---:|---|---|---|---|---|
| 87 | [MNT-AUD-0107](#fix-0107) | P1 | Student Tools Optional Authentication Is Never Composed, Breaking Authenticated Execution Ownership and the Public-to-Student Save Handoff | [MNT-AUD-0076](#fix-0076)، [MNT-AUD-0113](#fix-0113) | OPEN |
| 88 | [MNT-AUD-0092](#fix-0092) | P1 | Phase 13 Has a Real Authenticated Learner/LMS API but the Web Product Has No Enrollment or Learning-Workspace Composition | [MNT-AUD-0027](#fix-0027)، [MNT-AUD-0069](#fix-0069)، [MNT-AUD-0093](#fix-0093) | OPEN |
| 89 | [MNT-AUD-0015](#fix-0015) | P1 | Phase 14 Certificate Rendering Engine Is Missing; Source Only Supports Attaching Pre-Generated Artifacts | [MNT-AUD-0011](#fix-0011)، [MNT-AUD-0030](#fix-0030) | OPEN |
| 90 | [MNT-AUD-0073](#fix-0073) | P1 | Phase 22/24 Public “Save/Favorite” Journey Is UI-Local in Live Mode and Is Not Connected to Phase 15 Saved Items | [MNT-AUD-0016](#fix-0016)، [MNT-AUD-0107](#fix-0107) | OPEN |
| 91 | [MNT-AUD-0074](#fix-0074) | P1 | Public Scholarship Application Tracker Is Local/Prototype State and Has No Canonical Live Owner Persistence | [MNT-AUD-0016](#fix-0016)، [MNT-AUD-0098](#fix-0098) | OPEN |
| 92 | [MNT-AUD-0085](#fix-0085) | P1 | Public Services “Request Service” CTA Is a UI Notice and Does Not Invoke the Existing Student Service-Request API | [MNT-AUD-0058](#fix-0058)، [MNT-AUD-0060](#fix-0060)، [MNT-AUD-0098](#fix-0098) | OPEN |
| 93 | [MNT-AUD-0097](#fix-0097) | P2 | Student Workspace Certificate Quick Action Targets a Nonexistent `/certificates` Web Route | [MNT-AUD-0015](#fix-0015)، [MNT-AUD-0092](#fix-0092) | OPEN |

### W6 — التحقق والإصدار والمراقبة والتعافي

**بوابة الخروج:** CI يثبت السلوك لا وجود النصوص؛ artifact ثابت؛ staging smoke؛ restore/rollback rehearsal؛ metrics/traces/worker health.

| الترتيب | المشكلة | الشدة | المطلوب / عنوان الدليل | تبعيات إضافية قبل الإغلاق | الحالة |
|---:|---|---|---|---|---|
| 94 | [MNT-AUD-0009](#fix-0009) | P1 | Translation Quality Source Gate Uses Brittle Literal/Text Matching and Produces a False Enterprise-CI Failure Against the Current Safer Mapper | بوابة الموجة السابقة؛ لا تبعية خاصة مثبتة | OPEN |
| 95 | [MNT-AUD-0010](#fix-0010) | P1 | Imported-Courses Static Security Closure Gate References a Stale/Wrong Source File and Produces a False CI Failure | بوابة الموجة السابقة؛ لا تبعية خاصة مثبتة | OPEN |
| 96 | [MNT-AUD-0047](#fix-0047) | P1 | Phase 16 Source-Closure Verifier References a Deleted Public CMS Component | بوابة الموجة السابقة؛ لا تبعية خاصة مثبتة | OPEN |
| 97 | [MNT-AUD-0048](#fix-0048) | P1 | Canonical “Full Source Closure” CI Omits Active Current-Phase and Domain Closure Verifiers | [MNT-AUD-0009](#fix-0009)، [MNT-AUD-0010](#fix-0010)، [MNT-AUD-0047](#fix-0047) | OPEN |
| 98 | [MNT-AUD-0042](#fix-0042) | P1 | Real PostgreSQL Integration Validation Is Not Authored/Registered Across Persisted Domains | [MNT-AUD-0041](#fix-0041)، [MNT-AUD-0035](#fix-0035) | OPEN |
| 99 | [MNT-AUD-0078](#fix-0078) | P1 | Monitoring Foundation Has Health Probes but No Production Metrics/Tracing Provider; HTTP Monitoring Middleware Is a Compile-Only No-op | بوابة الموجة السابقة؛ لا تبعية خاصة مثبتة | OPEN |
| 100 | [MNT-AUD-0066](#fix-0066) | P1 | Production Disaster-Recovery / Backup Strategy Is Not Source-Implemented Beyond a Narrow Manual Imported-Course Rehearsal | [MNT-AUD-0079](#fix-0079)، [MNT-AUD-0083](#fix-0083) | OPEN |
| 101 | [MNT-AUD-0008](#fix-0008) | P2 | Architecture Guard Coverage Excludes Operational `scripts/**`, Allowing Direct Infrastructure Coupling Outside Enforced Boundaries | بوابة الموجة السابقة؛ لا تبعية خاصة مثبتة | OPEN |
| 102 | [MNT-AUD-0087](#fix-0087) | P2 | Security and Source-Closure Workflows Execute Third-Party/GitHub Actions Through Mutable Major Tags Instead of Immutable Commit SHAs | بوابة الموجة السابقة؛ لا تبعية خاصة مثبتة | OPEN |
| 103 | [MNT-AUD-0094](#fix-0094) | P1 | CI Verifies Source but No Executable Immutable-Artifact Release/Environment-Promotion Pipeline Exists | [MNT-AUD-0048](#fix-0048)، [MNT-AUD-0042](#fix-0042)، [MNT-AUD-0066](#fix-0066)، [MNT-AUD-0087](#fix-0087) | OPEN |

### W7 — الوثائق والأدلة والإغلاق النهائي

**بوابة الخروج:** وثيقة رسمية لكل Domain؛ لا CLOSED دون دليل؛ إعادة عدّ OPEN والتحقق من عدم خلط source وruntime وproduction.

| الترتيب | المشكلة | الشدة | المطلوب / عنوان الدليل | تبعيات إضافية قبل الإغلاق | الحالة |
|---:|---|---|---|---|---|
| 104 | [MNT-AUD-0003](#fix-0003) | P2 | `docs/README.md` Is Structurally Outdated Against the Current 24-Phase Repository | [MNT-AUD-0031](#fix-0031) | OPEN |
| 105 | [MNT-AUD-0019](#fix-0019) | P2 | Active Phase Documents Use `Production Ready` Terminology Before Runtime Verification Exists | [MNT-AUD-0094](#fix-0094) | OPEN |
| 106 | [MNT-AUD-0023](#fix-0023) | P2 | Phase 24 Visual-Identity Architecture Document Still Specifies the Superseded Emerald-Green Brand | بوابة الموجة السابقة؛ لا تبعية خاصة مثبتة | OPEN |
| 107 | [MNT-AUD-0051](#fix-0051) | P2 | Phase 05 Traceability Authority Is Stale Against Current Event/Outbox and DI Composition | [MNT-AUD-0080](#fix-0080) | OPEN |
| 108 | [MNT-AUD-0052](#fix-0052) | P2 | Operations Manual Describes a Container/CI Topology That Does Not Exist in Source | [MNT-AUD-0094](#fix-0094) | OPEN |
| 109 | [MNT-AUD-0004](#fix-0004) | P3 | Root README Repository Layout Contains a Nonexistent `packages/utils` Package | بوابة الموجة السابقة؛ لا تبعية خاصة مثبتة | OPEN |

## 6. سجل التحقق المطلوب عبر مراحل المنتج

| مجموعة المراحل | حزمة القبول | توقيت الإثبات |
|---|---|---|
| P1–P4 | authority وtyped contracts وCI وruntime config | W0–W2 ثم W6 |
| P5–P6 | audit append-only وassets/imports وraw snapshots وworker retry | W1–W3 ثم W6 |
| P7–P10 | reference lifecycle وtaxonomy والعلاقات وإتاحة البلد/الجامعة/التخصص | W2–W4 |
| P11–P12 | scholarship catalog/import/review وsaved/application handoff حسب المالك المعتمد | W3–W5 |
| P13–P15 | LMS → completion event → certificate → student workspace | W3–W5 واختبار DB في W6 |
| P16–P18 | CMS publish/schedule؛ AI queue؛ Student Tools quotas/auth/save | W1 وW3–W5 |
| P19–P21 | Finance provider/reconciliation؛ Services؛ Career، مع concurrency/audit | W2–W5 ثم provider sandbox في W6 |
| P22–P24 | graph/compare وAdmin action parity وpublic deep links/SEO/a11y | W4–W6 |

يظل roadmap/ADR الحالي في المستودع مرجع ملكية كل مرحلة؛ الجدول تجميع لا يعيد ترقيم المراحل أو يستبدل اعتماد نطاقها.

## 7. بطاقات الإصلاح — بالترتيب نفسه

النصوص التالية مستخرجة من أول مقطع كل Finding في v0.67؛ إضافات الأدلة والتصحيحات اللاحقة محفوظة كاملة في الملحق. يجب البحث عن رقم البطاقة في الملحق قبل التنفيذ، خصوصًا 0022 و0024 و0005. لا تتعامل مع عنوان قديم كقرار أعلى من addendum أحدث.

<a id="fix-0005"></a>

### مهمة 1 — MNT-AUD-0005 — W0 / P1

**المالك المقترح:** مدير المشروع + مسؤول المستودع/CI  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** بوابة الموجة السابقة؛ راجع التبعيات التاريخية أدناه قبل التنفيذ.

#### MNT-AUD-0005 — `main` Branch Has No Enforced Protection / Required CI Status Checks

- **Discovered:** 2026-09-06
- **Phase:** Cross-Cutting / Repository Governance
- **Subsystem:** Git/CI governance
- **Area:** GitHub branch configuration
- **Category:** `DEVOPS` / `SECURITY` / `QUALITY`
- **Severity:** **P1 — HIGH**
- **Scope:** SOURCE GOVERNANCE
- **Status:** OPEN
- **Evidence:** GitHub branch metadata reports `protected: false`; required status check enforcement is off.
- **Expected Behavior:** During remediation and before production handoff, protected main should prevent accidental direct/broken changes from bypassing source closure gates.
- **Impact:** A direct push can bypass PR review and required CI, undermining audit reproducibility.
- **Required Action:** Repository configuration change after audit workflow is established.
- **Recommended Remediation:** Require PR or equivalent controlled merge, required CI checks, and prevent force pushes/deletion on `main`; exact policy should not block the owner from emergency recovery.
- **Fix Wave:** W0/W6.

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0001"></a>

### مهمة 2 — MNT-AUD-0001 — W0 / P1

**المالك المقترح:** مدير المشروع + مسؤول المستودع/CI  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** بوابة الموجة السابقة؛ راجع التبعيات التاريخية أدناه قبل التنفيذ.

#### MNT-AUD-0001 — Obsolete Original-Database Recovery Assumption Is Embedded in Active Source Gates

- **Discovered:** 2026-09-06
- **Phase:** Cross-Cutting / W0-W2 / Database Operations
- **Subsystem:** Database safety, migration/bootstrap governance
- **Files/Areas:**
  - `README.md`
  - `docs/remediation/wp1/*`
  - `docs/remediation/wp3/*`
  - `docs/remediation/wp4/*`
  - `docs/remediation/wp5/*`
  - `docs/remediation/wp6/*`
  - `docs/remediation/wp7/*`
  - `docs/remediation/wp8/*`
  - `docs/remediation/wp10/*`
  - `scripts/db-remediation-gate.ts`
  - `scripts/lib/require-database-mutation-gate.ts`
  - database-mutating/import scripts using recovery tokens/gates
- **Category:** `ARCHITECTURE` / `CONFIG` / `DOCUMENTATION_DRIFT` / `MIGRATION`
- **Severity:** **P1 — HIGH**
- **Scope:** SOURCE
- **Status:** OPEN
- **Evidence:** Active source code requires `WP1_RECOVERY_GATE=CLOSED` plus `ALLOW_DATABASE_MUTATIONS=YES`; multiple active remediation documents assume an "Original Development Database" exists and must be recovered before any mutation.
- **Expected Behavior:** Project source should support the approved current lifecycle: Source Complete → provision a new clean PostgreSQL database → validate target → apply controlled migrations/bootstrap/seeds → runtime tests.
- **Actual State:** Safety model is semantically tied to recovery of an existing historical Development DB.
- **Root Cause:** Previous remediation program was designed around a presumed historical Development DB in Google Studio.
- **Impact:**
  - Incorrect operational model for the actual project.
  - Can block legitimate initial provisioning.
  - Can mislead future operators into searching for/restoring a DB that does not exist.
  - Can cause migration/bootstrap documentation and scripts to remain permanently "pending".
- **Required Action:** `REWRITE` + `DOCUMENT` + possible `RENAME`.
- **Recommended Remediation:**
  1. Preserve the two-step safety philosophy; do **not** weaken mutation protection.
  2. Replace recovery-specific semantics with a Greenfield Database Provisioning Gate, e.g. target identity + environment confirmation + explicit mutation authorization.
  3. Separate first-time provisioning from later migration/backfill safety.
  4. Archive or clearly mark recovery-era documents as historical where they are no longer authoritative.
  5. Rewrite root README/runtime handoff language.
  6. Update scripts, tests, env documentation and operational playbooks consistently.
- **Required Tests:**
  - mutation blocked without provisioning approval.
  - mutation blocked against production unless explicitly permitted by production deployment policy.
  - initial clean DB provisioning permitted only after target/environment validation.
  - repeated provisioning is idempotent or fails safely.
- **Dependencies Before Fix:** A4 data/migration architecture audit.
- **Regression Risk:** HIGH.
- **Fix Wave:** W0/W2.

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0031"></a>

### مهمة 3 — MNT-AUD-0031 — W0 / P1

**المالك المقترح:** مدير المشروع + مسؤول المستودع/CI  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** بوابة الموجة السابقة؛ راجع التبعيات التاريخية أدناه قبل التنفيذ.

#### MNT-AUD-0031 — P1 HIGH — Active Cross-Phase Closure Matrix Is Incomplete and Its Final-Closure Claim Is Stale
**Categories:** ARCHITECTURE / RELATIONSHIP / DOCUMENTATION_DRIFT / SOURCE_CLOSURE / CROSS_PHASE

**Evidence:**
- `docs/remediation/CROSS_PHASE_RELATIONSHIP_CLOSURE_MATRIX.md` calls itself the single active relationship closure matrix, declares `P13 FINAL SOURCE CLOSURE`, and states every R-001→R-068 row is Source Closed or Runtime Pending.
- Its explicit scope is P7–P24, excluding foundational P05/P06 relationships from the final cross-phase proof.
- Current forensic audit has proven source-level relationships outside that matrix that are not runtime-only, including Identity→P15 Student Workspace provisioning (`MNT-AUD-0016`) and P05 EAP→P23/consumer asset administration/integrity (`MNT-AUD-0026`, `MNT-AUD-0030`).
- The matrix source baseline references an earlier source package/commit, while this audit is frozen on `0931c5664cf274cb2b8f4cb250dd09ebf2e9a77f`.
- P24 architecture/source reconciliation has also reopened public relationship obligations (`MNT-AUD-0029`).

**Impact:** The repository currently contains an authoritative-looking document that can incorrectly certify cross-phase source closure while important source edges remain absent or incomplete.

**Required remediation:**
1. Replace the P7–P24-only final matrix with an enterprise dependency/relationship closure register covering all material P05–P24 edges (and P01–P04 governance/foundation dependencies where relevant).
2. Add Identity→Student provisioning, EAP→all AssetId consumers, Import→domain semantic handoffs, event/worker dependencies, Admin control-plane dependencies and Public composition dependencies.
3. Reopen affected `Runtime Pending/Px CLOSED` rows when source gaps are discovered; Runtime Pending must never conceal missing source wiring.
4. Rebaseline every row to the actual remediation commit and link it to executable evidence/tests.
5. Synchronize P23/P24 architecture docs and the matrix after remediation.

**Repair Wave:** W0 / W1 / W7
**Status:** OPEN — ACTIVE_MATRIX_MUST_BE_REBASELINED


#### Live Register Update — v0.9 (2026-09-06)
- Confirmed findings: **31**
- P0: 0 | P1: **22** | P2: 8 | P3: 1 | P4: 0
- `MNT-AUD-0031` reopens the active cross-phase closure matrix for enterprise-wide rebaseline.

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0045"></a>

### مهمة 4 — MNT-AUD-0045 — W0 / P1

**المالك المقترح:** مدير المشروع + مسؤول المستودع/CI  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** بوابة الموجة السابقة؛ راجع التبعيات التاريخية أدناه قبل التنفيذ.

#### MNT-AUD-0045 — P1 HIGH — Active P23/P24 Architecture Specifications Remain “Baselined & Approved” Despite Proven Source Divergence
**Categories:** ARCHITECTURE / DOCUMENTATION_DRIFT / GOVERNANCE / ADMIN / PUBLIC_UI / SOURCE_CLOSURE

**Evidence:**
- `phase-23-01-enterprise-administration-portal-architecture-specification.md` remains marked `Status: Baselined & Approved` and declares control-plane capabilities including RBAC Settings, Safe Operational & Audit Activity Log and unified review/control behavior.
- `phase-23-02-enterprise-administration-portal-structure-contracts.md` remains an active structural contract and declares views/boundaries that the current forensic audit has proven incomplete or absent, including IAM/users, Student administration/support, Notification administration and public-composition control dependencies.
- `phase-23-04-admin-preview-ui-design-and-action-backlog.md` is correctly marked historical/superseded and is therefore NOT the problem; the drift is in the still-active P23 authority set.
- `phase-24-01-enterprise-public-platform-architecture-specification.md` likewise remains `Baselined & Approved` while current findings prove divergences in locale availability, public relationship composition, visibility-control ownership, catalog/search completeness and SEO delivery architecture.
- P24 visual documentation also contains the superseded emerald palette (`MNT-AUD-0023`).
- Current implementation findings requiring these documents to change include at least `MNT-AUD-0020`, `0021`, `0022` (corrected), `0023`, `0025`, `0026`, `0028`, `0029`, `0033`, `0036`, `0037`, `0044` and related cross-phase corrections.

**Impact:**
- The declared architecture authority can tell a future implementer/reviewer that capabilities are approved/closed when the source either lacks them or now implements a different ownership model.
- Remediation performed only in code would recreate documentation drift immediately and make final Source Closure non-auditable.
- Google Studio/runtime handoff could follow obsolete P23/P24 assumptions about visibility, localization, SEO, Admin capabilities or cross-phase ownership.

**Required remediation:**
1. Treat P23-01/02/03 and P24-01/02/03/04 plus their active relationship/SEO/localization contracts as `REBASELINE_REQUIRED` until remediation completes.
2. Rewrite P23 around the actual canonical `apps/admin` control plane and domain-owner APIs, explicitly covering IAM/RBAC, Audit Center, Asset Center/Picker, Student Support, Notification Operations, exhaustive Review Queue, Course creation and the final P23↔P24 visibility/composition ownership decision.
3. Rewrite P24 around actual owner-read APIs, complete server pagination/search, current AR/EN availability policy, truthful relationship projections, SSR/SSG/prerender SEO delivery, current visual identity and canonical Admin separation.
4. Reconcile the Cross-Phase Relationship Closure Matrix with all newly proven foundational/Admin/Public edges before any row is relabeled Source Closed.
5. Add traceability tables from each active P23/P24 architectural requirement to concrete source file/API/test evidence or an explicit deferred-runtime validation ID.
6. Remove/mark superseded clauses rather than leaving contradictory requirements side by side.
7. Only restore `Baselined & Approved` after code, tests, matrices and docs agree at the frozen remediation commit.

**Repair Wave:** W0 / W5 / W7
**Status:** OPEN — P23_P24_ARCHITECTURE_REBASELINE_REQUIRED


#### Live Register Update — v0.24 (2026-09-06)
- Confirmed findings: **45**
- P0: 0 | P1: **35** | P2: 9 | P3: 1 | P4: 0
- Added `MNT-AUD-0045` — active P23/P24 architecture authorities require formal re-baselining against the remediated source.
- Historical P23-04 remains intentionally superseded and is not treated as an active-authority defect.

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0002"></a>

### مهمة 5 — MNT-AUD-0002 — W0 / P2

**المالك المقترح:** مدير المشروع + مسؤول المستودع/CI  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** بوابة الموجة السابقة؛ راجع التبعيات التاريخية أدناه قبل التنفيذ.

#### MNT-AUD-0002 — Canonical Node Runtime Version Is Inconsistent Across Active Documentation and Source Configuration

- **Discovered:** 2026-09-06
- **Phase:** Cross-Cutting / Repository Foundation
- **Subsystem:** Runtime/toolchain contract
- **Files:**
  - `README.md`
  - `docs/remediation/final-repository-organization/FINAL_HANDOFF_MANIFEST.md`
  - several phase implementation guides
  - `package.json`
  - `.nvmrc`
  - `.github/workflows/ci.yml`
  - `.devcontainer/devcontainer.json`
- **Category:** `CONFIG` / `DOCUMENTATION_DRIFT`
- **Severity:** **P2 — MEDIUM**
- **Scope:** SOURCE
- **Status:** OPEN
- **Expected Behavior:** One canonical supported Node version/range must be declared and referenced everywhere.
- **Actual State:** README/handoff/phase docs say Node 20+ while `package.json`, `.nvmrc`, and CI standardize on Node 22.16.x / Node 22.
- **Root Cause:** Documentation was not synchronized after runtime/toolchain upgrade.
- **Impact:** Clean installs may use unsupported Node 20 and fail or behave differently from CI.
- **Required Action:** `MODIFY` / `DOCUMENT`.
- **Recommended Remediation:** Treat `package.json` engines + `.nvmrc` + CI as current executable truth unless later architecture review determines otherwise; then synchronize all active docs to the chosen policy.
- **Fix Wave:** W0.

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0006"></a>

### مهمة 6 — MNT-AUD-0006 — W0 / P2

**المالك المقترح:** مدير المشروع + مسؤول المستودع/CI  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** بوابة الموجة السابقة؛ راجع التبعيات التاريخية أدناه قبل التنفيذ.

#### MNT-AUD-0006 — Canonical `.env.example` Omits Environment Variables Required by Active Database Mutation Gate Code

- **Discovered:** 2026-09-06
- **Phase:** Cross-Cutting / Configuration
- **Subsystem:** Environment contract / database safety
- **Files:**
  - `.env.example`
  - `scripts/lib/require-database-mutation-gate.ts`
- **Category:** `CONFIG` / `DEVOPS`
- **Severity:** **P2 — MEDIUM**
- **Scope:** SOURCE
- **Status:** OPEN
- **Evidence:** Active gate code reads `WP1_RECOVERY_GATE` and `ALLOW_DATABASE_MUTATIONS`; the canonical env template does not document those variables.
- **Expected Behavior:** Every active runtime/operational environment variable must be represented by the canonical environment contract, or the code must derive it from a typed configuration system.
- **Impact:** Operators cannot reliably know how to satisfy or intentionally keep the safety gate closed.
- **Required Action:** This finding must be resolved together with MNT-AUD-0001, likely by replacing recovery-specific variables with the final provisioning/mutation safety contract and documenting them in `.env.example` / config validation.
- **Fix Wave:** W0/W2.

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0105"></a>

### مهمة 7 — MNT-AUD-0105 — W1 / P1

**المالك المقترح:** Backend Security + Platform  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** بوابة الموجة السابقة؛ راجع التبعيات التاريخية أدناه قبل التنفيذ.

#### MNT-AUD-0105 — P1 HIGH — The Canonical Token Provider Violates the Approved JWT Trust and Lifecycle Model: HS256, One-Hour Access Tokens and JWT Refresh Tokens
**Categories:** SECURITY / AUTHENTICATION / JWT / TOKEN_LIFECYCLE / KEY_MANAGEMENT / CONFIGURATION / ARCHITECTURE_DRIFT / SOURCE_CLOSURE

**Evidence:**
- The approved Master Blueprint explicitly requires asymmetric JWT signing with RS256/ES256, forbids HS256 for tokens crossing the enterprise boundary, caps access-token TTL at 15 minutes, and defines refresh tokens as opaque single-use credentials.
- `packages/infrastructure/src/auth/JwtTokenProvider.ts` hard-codes `{ alg: 'HS256', typ: 'JWT' }` and signs/verifies both access and refresh tokens with HMAC-SHA256 and the same injected secret.
- `generateTokens(...)` invokes the same JWT signer for both `access` and `refresh`; the refresh credential is therefore a JWT rather than the approved opaque token.
- The active DI composition resolves a single `JWT_SECRET` and constructs this provider. No RS256/ES256 private/public key pair, JWKS publication, `kid`-based rotation or asymmetric verification boundary was found in executable source.
- `ACCESS_TOKEN_TTL_SECONDS` defaults to 3,600 seconds in both configuration and DI, while the approved maximum is 900 seconds. Production readiness validates secret strength and issuer/audience presence but does not reject an excessive access TTL or the forbidden algorithm/token form.
- The infrastructure tests positively assert issue/verify and tamper rejection for the HS256 implementation; they do not test the approved asymmetric algorithm, public-key verification, key rotation, opaque refresh tokens or the 15-minute maximum.
- Positive evidence retained: the current verifier checks token type, issuer, audience, `jti`, issued/expiry timestamps and constant-time signature comparison. Those controls do not resolve the prohibited trust model or lifecycle.

**Impact:**
- Every component capable of verifying a token must possess the same material capable of minting one, expanding signing authority beyond the approved asymmetric trust boundary.
- A one-hour stolen access token has four times the maximum approved exposure window.
- Treating the refresh credential as a self-describing JWT conflicts with the server-authoritative, opaque, single-use design and complicates safe key rotation and compromise containment.
- Production readiness can report authentication configuration healthy while the canonical provider remains non-compliant with the security authority.

**Required remediation:**
1. Replace HS256 with the approved RS256 or ES256 implementation and separate private signing custody from public verification.
2. Introduce stable key identifiers, a rotation/overlap policy and a canonical public-key/JWKS distribution contract where multiple verifiers exist.
3. Replace JWT refresh tokens with cryptographically random opaque credentials; persist only protected hashes and rotate them atomically under the remediation for `MNT-AUD-0071`.
4. Enforce `ACCESS_TOKEN_TTL_SECONDS <= 900` in the typed configuration and production-readiness gate.
5. Define emergency key/session revocation and prove that retired keys and reused refresh credentials fail closed.
6. Add algorithm-confusion, wrong-key, retired-key, TTL-boundary, refresh-replay and multi-verifier tests.
7. Remove `JWT_SECRET`-centric guidance after asymmetric key ownership is established and reconcile all authentication runbooks with the executable model.

**Repair Wave:** W0 / W1 / W4 / W6 / W7  
**Status:** OPEN — CANONICAL_TOKEN_PROVIDER_VIOLATES_APPROVED_ASYMMETRIC_AND_SHORT_LIVED_TOKEN_MODEL

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0071"></a>

### مهمة 8 — MNT-AUD-0071 — W1 / P1

**المالك المقترح:** Backend Security + Platform  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** MNT-AUD-0105.

#### MNT-AUD-0071 — P1 HIGH — Refresh-Token Rotation Is Non-Atomic, Allowing Concurrent Reuse of One Refresh Token to Mint Multiple Valid Sessions
**Categories:** AUTH / SESSION / REFRESH_TOKEN / REPLAY / CONCURRENCY / SECURITY / DATABASE / IDENTITY

**Evidence:**
- `AuthService.refreshTokens(refreshToken)` verifies the refresh token, calls `sessionManager.isValidSession(...)`, then separately calls `revokeSession(...)`, generates a new session ID/tokens, and finally calls `createSession(...)`.
- These are separate read/write operations with no database transaction, conditional consume primitive, lock, compare-and-set, rotation counter, or session-family replay contract.
- `PrismaSessionManager.isValidSession()` performs a read for an unrevoked/unexpired `SessionRecord`; `revokeSession()` later performs `updateMany` for the same token hash where `revokedAt=null`, but the affected-row count is discarded and not returned to `AuthService`.
- Therefore two concurrent refresh requests using the same still-valid refresh token can both pass `isValidSession()` before either revocation commits. Both then continue even if the second `revokeSession()` updates zero rows.
- Each request generates a different `sessionId` and a different new refresh token and inserts a distinct new session. The Prisma uniqueness constraint on `refreshTokenHash` protects only duplicate storage of the same token hash; it does not prevent two different descendant refresh tokens being minted from one concurrently reused parent token.
- Repository search found no concurrent refresh/replay integration test proving exactly-one-winner rotation semantics.
- Positive control: normal student workspace access uses `AuthMiddleware(tokenProvider, sessionManager)` and the DI container supplies a singleton `PrismaSessionManager`; the defect is specifically refresh-token consumption/rotation concurrency, not a blanket absence of session validation.

**Impact:**
- A copied/stolen refresh token raced against the legitimate user's refresh can create two independently valid descendant sessions instead of enforcing single-use rotation.
- Refresh-token replay detection is weakened: possession of one parent token can preserve both attacker and legitimate session branches after a concurrent race.
- Logout/revocation semantics become less predictable because the system has no explicit parent/child session family or replay response policy.
- Security claims that refresh rotation is single-use cannot be considered Source Complete under concurrent requests.

**Required remediation:**
1. Add an atomic `consumeAndRotateRefreshSession` operation at the session persistence boundary.
2. In one database transaction, conditionally consume/mark the parent session only when it is still active, unexpired and unrevoked; require exactly one successful row transition.
3. Create the child session only inside the same successful transaction/rotation unit; every competing reuse must fail closed.
4. Add session-family / parent-session linkage or an equivalent rotation lineage and define a replay policy; a confirmed replay should be capable of revoking the affected family when policy requires it.
5. Keep refresh-token hashes at rest and cryptographically random session IDs/tokens; these existing positive controls remain.
6. Add a database-backed concurrency integration test: two simultaneous refreshes with one token must result in exactly one success, one rejection, and exactly one child session.
7. Add post-rotation replay tests, logout/revoke-all tests and failure/transaction rollback tests.
8. Reconcile Admin and Student session validation so all access-token guards consume the same active-session semantics after rotation.

**Repair Wave:** W1 / W3 / W6 / W7  
**Status:** OPEN — REFRESH_TOKEN_ROTATION_NOT_ATOMIC

### P23 Privileged Route Matrix — Partial Reconciliation Result

- The canonical `/admin/*` tree is protected at the parent boundary by strict Admin authentication plus mutation audit middleware.
- Most domain Admin routers additionally receive a domain-specific permission at mount time (`admin:imports:manage`, `admin:universities:manage`, `admin:majors:manage`, `admin:courses:manage`, `admin:finance:manage`, etc.).
- `CertificateAdminRouter` was inspected separately because it intentionally has no single mount-level capability; its routes apply fine-grained `view`, template-author/checker, issuer and lifecycle permissions internally. No missing Certificate route permission was confirmed in this pass.
- Existing `MNT-AUD-0064` remains the UI-side root defect: the Admin SPA authorizes entry if the principal has any `admin:*`-prefixed permission and then exposes all navigation/routes rather than role-filtering them, while the backend remains granular.
- Existing `MNT-AUD-0065` remains the non-`/admin` compatibility/control-plane session-validation root defect.

**Audit decision:** `P23_PRIVILEGED_ROUTE_MATRIX = IN_PROGRESS / NO_DUPLICATE_BACKEND_PERMISSION_FINDING_ADDED_THIS_PASS`

### Live Register Update — v0.36 (2026-09-06)

- Registered finding IDs allocated: **71** (`MNT-AUD-0001` → `MNT-AUD-0071`).
- Duplicate/evidence-alias IDs excluded from canonical count: **3** (`0038`, `0039`, `0053`).
- **Canonical unique confirmed findings: 68**
- Severity (canonical unique): **P0: 0 | P1: 51 | P2: 16 | P3: 1 | P4: 0**
- New canonical finding in this continuation: `MNT-AUD-0071`.
- Student access-token active-session validation was positively verified in the canonical workspace composition; no false blanket session finding was added.
- Certificate Admin fine-grained permission guards were positively verified in this pass; no duplicate P23 backend RBAC finding was added.
- No source/code repair, migration, backfill, seed, database mutation or production runtime change has been executed.
- Frozen audit baseline remains `0931c5664cf274cb2b8f4cb250dd09ebf2e9a77f`.
- Project decision remains: **SOURCE_NOT_COMPLETE — AUDIT_IN_PROGRESS**.

### Next mandatory continuation after v0.36
1. Complete remaining P23 page/action ↔ backend permission ↔ audit ↔ owner-domain matrix, especially review/import/settings/platform operations not already covered by root findings.
2. Complete P24 public route/deep-link/accessibility/owner-DTO parity after the known Compare, search, locale, SEO, catalog pagination, prototype and course-origin findings.
3. Reconcile finance recovery/provider state and asynchronous reconciliation without duplicating the existing Phase 19 runtime-provider finding.
4. Complete migration/data-integrity source audit, including migration-chain authority, rollback artifacts, dangerous convenience commands and greenfield parity.
5. Complete CI/verifier truthfulness and documentation/source-authority reconciliation.
6. Perform final root-cause deduplication and closure matrix only after all axes are exhausted; remediation remains blocked until then.

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0076"></a>

### مهمة 9 — MNT-AUD-0076 — W1 / P1

**المالك المقترح:** Backend Security + Platform  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** MNT-AUD-0071.

#### MNT-AUD-0076 — P1 HIGH — Suspending or Archiving an Identity Does Not Revoke Existing Sessions, While Normal User Authentication Does Not Re-check Identity Lifecycle State
**Categories:** IDENTITY / AUTH / SESSION / REVOCATION / SUSPENSION / ARCHIVE / SECURITY / P05 / P15 / LEARNER_RUNTIME

**Evidence:**
- `packages/application/src/identity/SuspendIdentityUseCase.ts` loads the identity, calls `identity.suspend(...)`, then persists it through `identityRepository.save(identity)`; the use case has no `ISessionManager` dependency and does not revoke the subject's sessions.
- `packages/application/src/identity/ArchiveIdentityUseCase.ts` follows the same pattern for archive and likewise has no session-revocation action.
- `packages/infrastructure/src/auth/PrismaSessionManager.ts` already exposes `revokeAllSessions(userId)`, but repository search found no suspension/archive integration invoking it.
- `apps/api/src/presentation/middleware/AuthMiddleware.ts`, used by authenticated learner/student runtime routers, validates the access token and optionally calls `sessionManager.isSessionActive(userId, sessionId)`; it does not load the canonical Identity or Account lifecycle/access state.
- `packages/application/src/auth/AuthService.ts::refreshTokens()` validates refresh-token/session validity and does not re-check that the identity is still ACTIVE before rotating into a new session.
- The stronger `/admin` guard has an identity-repository lifecycle check, making the discrepancy explicit: lifecycle invalidation is enforced at the Admin boundary but not consistently at ordinary authenticated learner/runtime boundaries.
- Repository search found no `IdentitySuspended`/archive consumer that compensates by calling `revokeAllSessions`.

**Impact:**
- A user whose identity has been suspended or archived can keep using an already-active normal-user session until that session expires or is separately revoked.
- The same user can potentially rotate a still-valid refresh token into a fresh session because refresh does not re-check identity lifecycle state.
- Administrative suspension therefore does not provide an immediate platform-wide access cut-off.

**Required remediation:**
1. Make suspension/archive and any equivalent access-denying Account transition atomically or reliably trigger `revokeAllSessions(identityId)` through the canonical Identity/Auth boundary.
2. Define one authoritative principal lifecycle/access validation service and enforce it consistently for Admin and ordinary authenticated routes.
3. Make refresh-token rotation fail closed when the canonical identity/account is suspended, archived, purged, disabled or otherwise not permitted to authenticate.
4. If lifecycle→session revocation is event-driven, use durable transactional event/outbox delivery with an idempotent consumer.
5. Add integration tests proving previously valid access and refresh tokens stop working after suspension/archive and only resume through an approved reactivation flow.
6. Reconcile P05 Identity/Auth and P15 learner-session documentation with the implemented lifecycle semantics.

**Repair Wave:** W1 / W3 / W6  
**Status:** OPEN — IDENTITY_ACCESS_DENIAL_DOES_NOT_INVALIDATE_NORMAL_USER_SESSIONS

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0065"></a>

### مهمة 10 — MNT-AUD-0065 — W1 / P1

**المالك المقترح:** Backend Security + Platform  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** MNT-AUD-0076.

#### MNT-AUD-0065 — P1 HIGH — Non-`/admin` Control-Plane Routes Authenticate Without Session-Revocation or Active-Identity Validation
**Categories:** SECURITY / AUTHENTICATION / SESSION / REVOCATION / IDENTITY / CONTROL_PLANE / P05 / P23 / ROUTING

**Evidence:**
- `apps/api/src/app.ts` defines the shared `protectControlPlane(permission, routerName)` chain for privileged routes such as `/authorization`, `/settings`, `/files`, `/notifications`, `/cache`, `/background-jobs`, `/workflows`, `/api-services`, `/shared-components` and `/enterprise-events`.
- That helper invokes `SecurityMiddlewareFactory.createAdminGuard({ mode: adminAuthMode, tokenProvider: adminTokenProvider })` but does **not** pass the already-resolved `adminSessionManager` or `adminIdentityRepository`.
- The same composition root mounts canonical `/admin/*` with `createAdminGuard({ mode, tokenProvider, sessionManager, identityRepository })`, demonstrating that those two dependencies are available and are part of the intended strict boundary.
- `SecurityMiddlewareFactory.createAdminGuard()` accepts a verified access token when `!options.sessionManager` is true, so a token carrying a `sessionId` is not checked against `isSessionActive(...)` when the helper omits the session manager.
- The guard also performs lifecycle/access-state validation only when `options.identityRepository` is present; when omitted, suspended/archived/inactive identity/account state is not rechecked at the route boundary.
- Global CSRF protection remains present and correctly protects cookie-authenticated unsafe methods; this finding is specifically about session revocation and identity/account activity, not CSRF.

**Impact:**
- A cryptographically valid access token belonging to a server-revoked session can remain accepted on the affected control-plane routes until token expiry.
- Identity/account suspension or archival may not immediately cut off those routes when the token remains otherwise valid.
- Security semantics differ between `/admin/*` and compatibility/control-plane paths even though both expose privileged capabilities and are documented as belonging to one strict boundary.
- Mutation audit and RBAC do not compensate for stale authentication state; authorization is evaluated for a principal that should first have been rejected as inactive/revoked.

**Required remediation:**
1. Make `protectControlPlane()` pass the same `sessionManager` and `identityRepository` used by canonical `/admin/*`.
2. Prefer one reusable strict admin-authentication composition primitive so privileged mounts cannot accidentally omit session/identity validation.
3. Define a deliberate policy for bearer/service clients if stateless bearer access is still needed; do not obtain that behavior accidentally by omitting dependencies.
4. Add `createApiApp()` integration tests proving revoked sessions and inactive identities receive 401 on every protected compatibility/control-plane route.
5. Add a source guard that fails when `createAdminGuard()` is used for privileged routes without the canonical strict dependency set unless an explicit approved exception is declared.
6. Reconcile P05/P23 security documentation and route matrices with the final single authentication contract.

**Repair Wave:** W1 / W3 / W6 / W7  
**Status:** OPEN — CONTROL_PLANE_SKIPS_SESSION_AND_IDENTITY_REVALIDATION

### Security Deep-Audit Result — CSRF/CORS Baseline

No new CSRF/CORS finding was registered in this pass.

**Verified controls:**
- `createApiApp()` installs `SecurityMiddlewareFactory.createCsrfGuard(securityService)` globally before API routers.
- Unsafe cookie-authenticated requests require `x-csrf-token`; safe GET/HEAD/OPTIONS methods are exempt.
- Bearer-only requests are allowed without CSRF because they do not use ambient cookie credentials.
- Production/staging configuration rejects wildcard `CORS_ORIGIN='*'` and requires a specific HTTPS origin.

**Audit decision:** `CSRF_CORS_BASELINE = SOURCE_PRESENT / NO_NEW_FINDING`

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0062"></a>

### مهمة 11 — MNT-AUD-0062 — W1 / P1

**المالك المقترح:** Backend Security + Platform  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** MNT-AUD-0065.

#### MNT-AUD-0062 — P1 HIGH — Privileged Phase 17 `/api/v1/ai` Gateway Is Mounted Behind Permission Evaluation Without an Authentication Guard and Is Unreachable in Real App Composition
**Categories:** PHASE17 / P23 / SECURITY / AUTHENTICATION / AUTHORIZATION / API / ROUTING / TEST_GAP / SOURCE_CLOSURE

**Evidence:**
- `app.ts` mounts `/admin/*` under `createAdminGuard(...)`, which authenticates tokens/cookies and sets `req.authUserId` before permission evaluation.
- The separate privileged AI operator gateway is mounted as `v1Router.use('/ai', requireAdminPermission('admin:ai:manage'), lazyRouter('aiGatewayRouter'))` outside the `/admin` guard boundary.
- `createAdminPermissionGuard()` does not parse or verify an access token. It reads `req.authUserId` and immediately returns `401 ADMIN_AUTH_REQUIRED` if that value is absent.
- No global middleware before the `/ai` mount authenticates an admin access token into `req.authUserId`.
- `AIGatewayRouter` independently requires `req.authUserId` through its `actor(req)` helper, confirming that an authenticated principal is expected.
- `AIGatewayRouter.spec.ts` hides the composition defect by inserting a test-only middleware that directly sets `req.authUserId = 'admin-1'` before mounting the router.
- Therefore router-unit tests pass while the actual `createApiApp()` composition cannot establish the principal needed by the permission guard on `/api/v1/ai`.

**Impact:**
- The privileged AI operator execution/submission/read/cancel gateway is effectively inaccessible through the canonical application composition.
- Permission-only middleware is being used as if it were authentication middleware, violating the intended authn->authz ordering.
- Existing tests do not exercise the production route composition and therefore provide false confidence.

**Required remediation:**
1. Move the operator gateway under `/admin/ai/...` or explicitly compose `createAdminGuard()` before its permission guard.
2. Preserve strict persisted RBAC and active-session/identity validation consistent with other privileged control-plane routes.
3. Ensure Admin mutation audit covers AI execution/cancel operations where required by governance.
4. Add `createApiApp()` integration tests using real access-token/cookie middleware, covering unauthenticated 401, authenticated/unauthorized 403 and authorized success.
5. Remove test-only principal injection as the sole evidence for gateway accessibility.
6. Add an architecture/source guard that rejects privileged `requireAdminPermission(...)` mounts outside an authentication boundary unless an explicit authenticated upstream contract is proven.

**Repair Wave:** W1 / W3 / W6 / W7  
**Status:** OPEN — AI_PRIVILEGED_GATEWAY_MISSING_AUTHENTICATION_COMPOSITION

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0110"></a>

### مهمة 12 — MNT-AUD-0110 — W1 / P1

**المالك المقترح:** Backend Security + Platform  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** بوابة الموجة السابقة؛ راجع التبعيات التاريخية أدناه قبل التنفيذ.

#### MNT-AUD-0110 — P1 HIGH — Audit Records Are Not Append-Only: Privileged HTTP Clients Can Supply Security-Critical Audit Fields and Overwrite Existing Rows Through Repository `upsert`
**Categories:** SECURITY / AUDIT_INTEGRITY / NON_REPUDIATION / ADMIN / IMMUTABILITY / MASS_ASSIGNMENT / COMPLIANCE / DATA_INTEGRITY / SOURCE_CLOSURE

**Evidence:**
- `apps/api/src/app.ts` mounts the same `AuditRouter` at `/admin/audit` and `/audit` behind administrator authentication and `admin:audit:manage` permission.
- `AuditRouter` exposes `POST /records` and constructs its DTO primarily from `...req.body`; only `timestamp` is converted to `Date`, and the caller may still supply the timestamp value.
- `CreateAuditRecordDto` lets the HTTP caller provide `id`, `reference`, `action`, `category`, `severity`, `actorId`, `actorType`, `targetId`, `targetType`, `source`, `timestamp`, `contextMetadata`, regulatory tags, correlation/trace references, `chainReference` and retention controls.
- `ManageAuditRecordsUseCase.createAuditRecord(...)` performs no server-authoritative principal/source/timestamp/chain reconstruction; it directly persists `createAuditRecordFromDto(dto)`.
- `AuditRecordFactory` converts the caller-provided actor, source, timestamp, correlation, trace and chain values directly into domain value objects.
- `PrismaAuditRecordRepository.saveWithClient(...)` persists with `auditRecord.upsert({ where: { id }, update: data, create: data })` rather than insert-only semantics.
- Therefore an authorized caller that knows an existing audit `id` can submit that `id` to the POST endpoint and replace security-relevant fields of the existing row via the repository update branch. Even without targeting an existing row, the caller can append a fabricated record whose actor/source/time/chain appear authoritative.
- This directly conflicts with the Phase 23 requirement already captured in `MNT-AUD-0021` for a safe, read-only, non-deletable/immutable audit activity trail.
- This is distinct from `MNT-AUD-0106`: `0106` corrupts actor attribution produced by normal authenticated mutations; `0110` allows the audit-write API itself to accept caller-controlled audit authority and overwrite existing evidence.
- This is distinct from `MNT-AUD-0084`: `0084` is missing mutation-audit coverage. `0110` is integrity of records that do exist.

**Impact:**
- The audit store cannot currently be treated as immutable evidence for incident response, maker/checker review, privileged-access investigation or compliance reporting.
- A principal with audit-management permission can fabricate historical-looking records or alter an existing row by reusing its ID, undermining non-repudiation.
- Caller-controlled actor/source/timestamp/chain values can make synthetic records indistinguishable from platform-generated records at the data-model level.
- A central Audit Center built on top of this repository would present evidence whose provenance is not trustworthy even if its UI is read-only.

**Required remediation:**
1. Remove generic client-facing audit-record creation from the Admin/read-model surface unless a separately governed ingestion use case is explicitly required.
2. Make canonical security/business audit creation server-owned: derive actor/workload identity, source, timestamp, correlation/trace context and chain linkage from trusted execution context rather than request payload.
3. Replace audit persistence `upsert` with append-only insert semantics for canonical audit evidence; reject duplicate IDs/references instead of updating an existing record.
4. If archival/retention lifecycle changes are required, model them as separately authorized immutable events or narrowly scoped metadata transitions that cannot rewrite historical actor/action/source/payload evidence.
5. Enforce chain integrity and monotonic/provenance verification where chain references are part of the approved design.
6. Split read permission from any internal audit-ingestion permission. `admin:audit:manage` must not implicitly grant the ability to forge evidence.
7. Add integration tests proving existing audit rows cannot be altered through any HTTP or application path and that caller-supplied actor/source/time/chain fields are rejected.
8. Add tamper-detection/reconciliation checks before any production audit evidence is treated as authoritative.

**Repair Wave:** W1 / W2 / W4 / W6 / W7  
**Status:** OPEN — AUDIT_HTTP_INGRESS_AND_UPSERT_BREAK_APPEND_ONLY_EVIDENCE_INTEGRITY

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0106"></a>

### مهمة 13 — MNT-AUD-0106 — W1 / P1

**المالك المقترح:** Backend Security + Platform  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** MNT-AUD-0110.

#### MNT-AUD-0106 — P1 HIGH — Central and Authorization Audit Paths Lose the Authenticated Principal and Attribute Admin Mutations to `ANONYMOUS` or `SYSTEM`
**Categories:** SECURITY / AUDIT / AUTHENTICATION / ADMIN / RBAC / ATTRIBUTION / NON_REPUDIATION / COMPLIANCE / SOURCE_CLOSURE

**Evidence:**
- Both `AuthMiddleware` and `SecurityMiddlewareFactory.createAdminGuard(...)` establish the authenticated principal in `req.authUserId`; the permission guards also authorize from that field.
- `AuditHelper.recordMutation(...)`, used by the central `MutationAuditMiddleware`, does not read `req.authUserId`. It checks only `(req as any).user?.id` / `.identityId` and otherwise writes actor ID `ANONYMOUS` with actor type `IDENTITY`.
- The `/admin` composition runs the central mutation-audit middleware after the admin guard, so a successfully authenticated and authorized mutation still reaches the helper with its canonical identity in a field the helper ignores.
- `AuthorizationAdminRouter.mutationContext(...)` repeats the same incompatible `req.user` lookup and falls back to actor ID `SYSTEM`. Role creation and role assignment therefore pass a false system actor into their business/audit context even when initiated by an administrator.
- Failure auditing inside `AuthorizationAdminRouter` also calls `AuditHelper`, producing the `ANONYMOUS` fallback for authenticated failures.
- No source assignment from the inspected authentication guards populates `req.user`; repository search found the canonical identity contract is `authUserId`.
- Existing audit tests prove repository failure behavior but do not compose authentication → authorization → mutation audit and assert the persisted actor. This is distinct from `MNT-AUD-0084`, which concerns mutation-audit coverage/default classification; the present defect corrupts actor attribution where auditing is already installed.

**Impact:**
- Privileged changes can be accepted under a real RBAC principal while the central evidence says an anonymous or system actor performed them.
- Incident reconstruction, accountability, maker/checker review and non-repudiation are materially unreliable.
- A malicious or mistaken administrator cannot be reliably distinguished from automation using the primary audit trail.
- Closure reports can count an audit record as present even though its most important security attribute is false.

**Required remediation:**
1. Define one typed authenticated-principal contract on Express Request and use it consistently across authentication, authorization, business mutation context and audit code.
2. Make authenticated privileged audit fail closed when the principal is absent; never silently substitute `ANONYMOUS` or `SYSTEM` after an admin guard.
3. Reserve `SYSTEM` for separately authenticated worker/service identities with explicit source, workload identity and reason metadata.
4. Update `AuditHelper`, `AuthorizationAdminRouter` and any other `req.user` consumers to the canonical principal accessor.
5. Add end-to-end composition tests proving the exact identity that passes RBAC is persisted in intent, outcome and domain audit records for success and failure.
6. Add reconciliation checks detecting privileged records attributed to anonymous/system actors without a valid system execution context.
7. Link this repair to `MNT-AUD-0084` so coverage and attribution are both required before an Admin mutation is considered auditable.

**Repair Wave:** W0 / W1 / W4 / W6  
**Status:** OPEN — AUTHENTICATED_ADMIN_MUTATIONS_ARE_MISATTRIBUTED_IN_AUDIT_EVIDENCE

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0084"></a>

### مهمة 14 — MNT-AUD-0084 — W1 / P1

**المالك المقترح:** Backend Security + Platform  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** MNT-AUD-0106.

#### MNT-AUD-0084 — P1 HIGH — Phase 11+ Admin Mutations Fall Through `MutationAuditPolicy` to `NO_AUDIT_REQUIRED`
**Categories:** P23 / ADMIN / AUDIT / SECURITY / GOVERNANCE / MUTATION / ACCOUNTABILITY / CROSS_PHASE / FORENSICS

**Evidence:**
- `MutationAuditPolicy` recognizes POST/PUT/PATCH/DELETE as mutation methods but, for `ADMIN` scope, only treats a hard-coded set of prefixes as critical: identities, authorization, settings, imports, assets, reference-data, academic-taxonomy, international-tests, universities and majors.
- Every other `/admin/*` mutation falls through to `NO_AUDIT_REQUIRED` unless it matches the small `workspace` / taxonomy handoff standard-audit exceptions.
- `MutationAuditMiddleware.generate()` immediately calls `next()` for `NO_AUDIT_REQUIRED`, so neither mutation-intent nor mutation-outcome evidence is written by the central middleware.
- Newer owner-domain Admin routers contain many real mutations outside that hard-coded list. `CmsAdminRouter`, for example, exposes create/update/localization/domain-link/revision/workflow/publish/archive/schedule/category/tag/redirect/navigation/block mutations.
- The CMS application service carries actor IDs into owner methods, but that is not equivalent to the central cross-domain API mutation audit contract and does not prove a uniform immutable audit record for every privileged action.
- The historical Audit Coverage report was focused on earlier Phase 2–10 mutation surfaces; it does not prove full current P11–P24 mutation coverage.
- This is distinct from `MNT-AUD-0064`, which concerns permission-aware Admin UI routing/navigation. Here the backend mutation can be correctly authenticated/authorized yet still be classified as requiring **no central audit**.

**Impact:**
- Privileged changes in CMS and other later admin domains can execute without the platform-wide mutation audit trail expected for administrative accountability.
- Incident investigation cannot reliably reconstruct who attempted or completed every privileged change across the current Admin surface.
- “Middleware is mounted” can create false confidence because the policy intentionally no-ops on unlisted owner domains.
- Future admin domains inherit an unsafe default: adding a new route silently means no central audit unless someone also remembers to extend a hard-coded prefix list.

**Required remediation:**
1. Replace the hard-coded, default-no-audit model with an explicit route/action audit registry or fail-safe policy for every privileged mutation.
2. Default authenticated `/admin/*` mutations to at least `STANDARD_AUDIT_REQUIRED`; require an approved, documented exemption for `NO_AUDIT_REQUIRED`.
3. Classify high-risk publish, finance, identity/security, configuration, import/promotion, certificate, service-fulfillment and destructive actions as fail-closed critical audit mutations.
4. Build a route-tree coverage test that enumerates every Admin POST/PUT/PATCH/DELETE endpoint and fails if its audit classification is absent or unintentionally `NO_AUDIT_REQUIRED`.
5. Preserve owner-domain atomic business audit where required; central request audit must complement, not replace, transactionally coupled domain evidence.
6. Extend the active Audit Coverage report through all current owner domains and P23 composition routes.
7. Add regression tests proving intent/outcome evidence for representative Phase 11–24 mutations and explicit exemptions for safe preview/validation operations.

**Repair Wave:** W1 / W3 / W5 / W6 / W7  
**Status:** OPEN — ADMIN_MUTATION_AUDIT_POLICY_DOES_NOT_COVER_CURRENT_OWNER_DOMAINS

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0111"></a>

### مهمة 15 — MNT-AUD-0111 — W1 / P1

**المالك المقترح:** Backend Security + Platform  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** بوابة الموجة السابقة؛ راجع التبعيات التاريخية أدناه قبل التنفيذ.

#### MNT-AUD-0111 — P1 HIGH — The Central DTO Validation Middleware Is Instantiated but Never Composed, Leaving Privileged Legacy Routers Outside Strict Edge Validation
**Categories:** SECURITY / INPUT_VALIDATION / PRESENTATION_BOUNDARY / MASS_ASSIGNMENT / API_CONTRACT / ORPHAN_MIDDLEWARE / CONTROL_PLANE / SOURCE_CLOSURE

**Evidence:**
- `createApiApp()` bootstraps `ZodValidationProvider`, `DefaultSanitizer`, `ValidationService` and then constructs `const dtoValidationMiddleware = new DtoValidationMiddleware(validationService)`.
- The same `app.ts` then mounts security headers, CORS, logging, rate limiting, strict JSON parsing, CSRF and monitoring, but the constructed DTO validation middleware is not mounted globally or passed to the route composition shown in the canonical application bootstrap.
- Repository-wide search for `dtoValidationMiddleware`, `validateBody`, `validateQuery` and `validateParams` found the middleware definition and bootstrap construction but no active router composition using those validation methods in the inspected source.
- Several privileged legacy routers therefore implement their own inconsistent boundary handling instead of the declared centralized validation layer:
  - `WorkflowRouter` forwards raw `req.body` to `createWorkflow(...)` and reads `req.body.toState` directly.
  - `ApiFoundationRouter` forwards raw create payloads and manually copies version-publication fields without a runtime schema.
  - `SharedComponentRouter` forwards raw create/version payloads and collapses all exceptions into a generic 400 response.
  - `NotificationRouter` accepts an `any` cradle and forwards raw template/intent payloads, performing only date conversion.
  - `CacheRouter` performs presence checks but does not enforce a closed runtime schema or unknown-field rejection.
  - `BackgroundJobRouter` manually coerces fields such as priority/timeout/maxAttempts and accepts arbitrary job parameters without a strict edge schema.
  - `AuditRouter` accepts caller-controlled audit DTO fields, producing the independent integrity failure recorded as `MNT-AUD-0110`.
- Modern owner-domain routers such as CMS, AI, Career, Finance and Services use explicit Zod parsing, demonstrating that strict validation is achievable but not uniformly governed.
- `MNT-AUD-0108` remains a separately testable file-target authority defect. `0111` is the systemic composition failure that allows multiple legacy privileged surfaces to bypass the platform's declared central edge-validation mechanism.

**Impact:**
- Strict input-validation behavior depends on which historical router owns the route rather than one enforceable platform contract.
- Unknown fields, type coercion, oversized/nested business payload shapes and mass-assignment opportunities can reach legacy use cases inconsistently.
- Security and API-governance verifiers can report a validation subsystem as present even though it is orphaned from the actual HTTP boundary.
- Adding new fields to TypeScript interfaces does not protect runtime JSON, so source type safety can create false confidence for privileged operations.

**Required remediation:**
1. Choose one enforceable presentation-boundary validation contract: either compose the central `DtoValidationMiddleware` per route with explicit schemas or formally retire it and require a standard route-local schema mechanism.
2. Define strict path/query/body schemas for every privileged legacy control-plane route and reject unknown properties by default.
3. Prohibit forwarding raw `req.body` into application use cases for privileged mutations.
4. Separate transport coercion from business DTOs and prohibit client control of server-owned fields such as actor, owner, source, lifecycle authority or canonical target identifiers.
5. Add an architecture/source verifier that fails privileged routers lacking an approved runtime validation schema.
6. Add negative integration tests for unknown fields, wrong types, oversized nested values, conflicting resource identifiers and malformed lifecycle commands.
7. Reconcile Phase 4 validation documentation so it describes the mechanism actually composed in production source.

**Repair Wave:** W0 / W1 / W4 / W6 / W7  
**Status:** OPEN — CENTRAL_DTO_VALIDATION_IS_ORPHANED_AND_LEGACY_PRIVILEGED_ROUTES_BYPASS_STRICT_EDGE_SCHEMAS

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0101"></a>

### مهمة 16 — MNT-AUD-0101 — W1 / P1

**المالك المقترح:** Backend Security + Platform  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** بوابة الموجة السابقة؛ راجع التبعيات التاريخية أدناه قبل التنفيذ.

#### MNT-AUD-0101 — P1 HIGH — The Approved Frontend CSP/Clickjacking Boundary Is Not Source-Enforced; CSP Is Attached Only to API Responses and Still Allows `unsafe-inline`
**Categories:** SECURITY / CSP / XSS / CLICKJACKING / WEB / ADMIN / EDGE / CONFIGURATION / SOURCE_CLOSURE

**Evidence:**
- The approved Master Blueprint requires a strict CSP on the **frontend application**, requires `X-Frame-Options: DENY` plus CSP `frame-ancestors 'none'` on HTML responses, and explicitly forbids both `unsafe-inline` and `unsafe-eval`.
- `SecurityMiddlewareFactory.createSecurityHeaders(...)` is installed only on the Express API application. The canonical public and Admin HTML documents are served by separate Vite applications, so the API response headers do not establish the browser policy for those HTML documents.
- No `_headers`, reverse-proxy/edge header policy, deploy manifest or HTML CSP meta policy was found under `apps/web` or `apps/admin`.
- The implemented API CSP includes `styleSrc: ["'self'", "'unsafe-inline'"]`, directly contradicting the approved no-`unsafe-inline` baseline.
- The implemented CSP does not declare `frameAncestors`; Helmet's `X-Frame-Options: DENY` is again emitted by the API middleware rather than proven on the Web/Admin HTML delivery boundary.
- `ProductionReadinessValidator` considers `SECURITY_CSP_ENABLED=true` sufficient to pass its CSP blocker even though it does not verify that Web/Admin HTML delivery applies the policy. The existing header unit test exercises a synthetic Express endpoint only.
- The implementation-status report claims “Production security headers (Helmet, strict CORS, CSP)” are fixed, which overstates the executable browser boundary.

**Impact:**
- A production deployment can pass API startup/readiness while the public and Admin documents are served without the mandatory CSP and clickjacking policy.
- Stored or DOM injection defects in CMS/Admin/Web lose the approved defense-in-depth layer at the only response where browser CSP enforcement matters.
- Allowing inline styles expands the permitted injection surface and contradicts the stated security authority.
- Current tests can be green while the real browser document remains unprotected.

**Required remediation:**
1. Define one source-controlled Web/Admin HTML security-header policy at the actual edge/static-hosting boundary.
2. Emit CSP with `frame-ancestors 'none'` and the approved restrictive directives on every public and Admin HTML response.
3. Remove `unsafe-inline`; if framework/style constraints require a transition, use nonces/hashes and record a time-bounded approved exception rather than silently weakening the baseline.
4. Keep API headers as defense in depth, but do not use them as evidence of frontend protection.
5. Make production readiness probe or verify the delivered Web/Admin headers, not only the configuration flag.
6. Add browser/deployed-artifact tests for CSP, clickjacking headers and prohibited directives on both HTML entry points.
7. Correct stale security-closure documentation until delivered-header evidence exists.

**Repair Wave:** W0 / W1 / W6 / W7  
**Status:** OPEN — FRONTEND_CSP_AND_CLICKJACKING_POLICY_NOT_ENFORCED_AT_HTML_BOUNDARY

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0043"></a>

### مهمة 17 — MNT-AUD-0043 — W1 / P1

**المالك المقترح:** Backend Security + Platform  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** بوابة الموجة السابقة؛ راجع التبعيات التاريخية أدناه قبل التنفيذ.

#### MNT-AUD-0043 — P1 HIGH — Production Environment Contract Is Internally Contradictory and Omits Startup-Blocking Variables
**Categories:** CONFIG / SECURITY / DEVOPS / DOCUMENTATION_DRIFT / SOURCE_CLOSURE

**Evidence:**
- `.env.example` states that `REDIS_URL` is optional in production/staging and claims an in-memory rate-limit/queue fallback is available when unset.
- `AppConfigSchema` and `ProductionReadinessValidator` instead require `REDIS_URL` in production/staging and treat its absence as a startup-blocking configuration error.
- `ProductionReadinessValidator` also treats all of the following as production requirements/blockers: `SECURE_COOKIE=true`, stable `JWT_ISSUER`, stable `JWT_AUDIENCE`, and bounded `TRUST_PROXY_HOPS` (1-3).
- Those production-blocking variables are not documented in the frozen `.env.example`.
- `.env.example` declares itself the place where all secrets/environment variables must be documented and is explicitly referenced by the deployment/Google Studio handoff.
- This is separate from `MNT-AUD-0032`, which covers the hidden P13→P14 certificate-worker flags, and from `MNT-AUD-0006`, which covers the historical DB mutation-gate variables.

**Impact:**
- A deployment following the repository's official environment example can be configured exactly as documented and still fail production readiness/startup.
- Operators may incorrectly omit Redis based on the documented fallback even though production code fails closed.
- Missing issuer/audience/proxy/cookie variables create deployment churn and make the runtime contract non-deterministic for Google Studio.
- Source Complete cannot be declared while the canonical runtime configuration contract contradicts executable validation.

**Required remediation:**
1. Define one canonical typed runtime configuration schema covering every active API/worker/web/admin/deployment variable.
2. Generate or mechanically validate `.env.example` against that schema so required variables cannot silently drift.
3. Correct Redis semantics: production/staging must explicitly require managed Redis if that remains the architecture decision; remove all contradictory fallback wording.
4. Document `SECURE_COOKIE`, `JWT_ISSUER`, `JWT_AUDIENCE`, `TRUST_PROXY_HOPS`, certificate worker flags, greenfield mutation/provisioning flags and every future production provider variable.
5. Ensure `ProductionReadinessValidator` consumes the same normalized config contract rather than independently imposing hidden requirements over raw `process.env`.
6. Add a CI test that instantiates a production-like environment from `.env.example` placeholders/required-key inventory and asserts configuration-contract completeness without accepting placeholder secrets as real values.
7. Update Google Studio/deployment runbooks to reference the canonical generated/validated environment contract.

**Repair Wave:** W0 / W1 / W6
**Status:** OPEN — PRODUCTION_ENVIRONMENT_CONTRACT_DRIFT


#### Live Register Update — v0.21 (2026-09-06)
- Confirmed findings: **43**
- P0: 0 | P1: **34** | P2: 8 | P3: 1 | P4: 0
- Added `MNT-AUD-0043` — documented production environment contract contradicts executable readiness requirements and omits blockers.
- Security least-privilege audit found strong route-level separation in Finance and Certificates; no false finding added there.

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0040"></a>

### مهمة 18 — MNT-AUD-0040 — W1 / P1

**المالك المقترح:** Backend Security + Platform  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** بوابة الموجة السابقة؛ راجع التبعيات التاريخية أدناه قبل التنفيذ.

#### MNT-AUD-0040 — P1 HIGH — API Runtime Creates Multiple Independent Prisma/Redis Clients and Has No Graceful Resource Shutdown Lifecycle
**Categories:** DEVOPS / DATABASE / PRISMA / REDIS / PERFORMANCE / RELIABILITY / OBSERVABILITY / SOURCE_CLOSURE

**Evidence:**
- `apps/api/src/infrastructure/di/container.ts` registers its own singleton `prisma` and constructs a `new PrismaClient({ datasources: { db: { url: currentUrl } } })` for repositories.
- `packages/infrastructure/src/index.ts` separately defines an active static `PrismaConnection` singleton whose `connect()` constructs another `PrismaClient`.
- `apps/api/src/app.ts` imports `PrismaConnection`, calls `PrismaConnection.connect(config, logger)` and uses that separate client for database health/migration probes instead of resolving the DI-owned Prisma client.
- Redis is similarly fragmented: production rate limiting creates a Redis client in `createRateLimiterForRuntime()`, `app.ts` creates another Redis client for health checks, and DI creates additional Redis clients for Student Workspace and CMS delivery caches.
- Repository-wide search found `.quit()` only in Redis tests, not in active API startup/shutdown code.
- No active `SIGTERM` or `SIGINT` handler was found in `apps/api`; `server.ts` only clears the certificate worker interval when the HTTP server emits `close`.
- The approved operational playbook explicitly states that API startup/shutdown must intercept `SIGTERM` and gracefully flush/close runtime resources.

**Impact:**
- A single API process can open multiple database and Redis connection pools for the same runtime, increasing connection pressure and complicating health semantics.
- Health may report through a different DB/Redis client than the repositories actually use, weakening readiness truth.
- Container restart/deployment can terminate without draining HTTP work or explicitly closing Prisma/Redis clients and workers.
- Under horizontal scaling, duplicate pools and unclosed resources can exhaust managed database/Redis limits and cause avoidable transient failures.

**Required remediation:**
1. Establish one authoritative runtime resource registry/lifecycle owned by composition root.
2. Create exactly one application Prisma client/pool per process (unless a separately justified connection class is documented); inject that same client into repositories and DB health/migration checks.
3. Consolidate Redis clients where safe or explicitly document intentional separate connections; all must be centrally tracked and closable.
4. Add `SIGTERM`/`SIGINT` graceful shutdown: stop accepting traffic, mark readiness down, stop worker polling/timers, drain bounded in-flight work, close Redis clients, `$disconnect()` Prisma, then close the HTTP server with a hard timeout fallback.
5. Ensure certificate/outbox/BullMQ workers participate in the same lifecycle after queue remediation.
6. Add lifecycle tests proving resources close exactly once and readiness becomes unavailable during shutdown.
7. Update `std-ops-002`, deployment runbooks and Google Studio handoff to match the implemented lifecycle.

**Repair Wave:** W1 / W2 / W6
**Status:** OPEN — RUNTIME_RESOURCE_LIFECYCLE_FRAGMENTED


#### Live Register Update — v0.18 (2026-09-06)
- Confirmed findings: **40**
- P0: 0 | P1: **31** | P2: 8 | P3: 1 | P4: 0
- Added `MNT-AUD-0040` — duplicate DB/Redis runtime clients and graceful shutdown lifecycle gap.
- Security/Auth/Admin authorization and Prisma migration parity audit continue.

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0063"></a>

### مهمة 19 — MNT-AUD-0063 — W1 / P1

**المالك المقترح:** Backend Security + Platform  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** بوابة الموجة السابقة؛ راجع التبعيات التاريخية أدناه قبل التنفيذ.

#### MNT-AUD-0063 — P1 HIGH — Readiness Semantics Force Redis to Optional Even When Production Registration Marks It Required, Allowing a Runtime Redis Outage to Report Overall READY
**Categories:** OBSERVABILITY / READINESS / REDIS / RELIABILITY / OPERATIONS / CI / FALSE_CLOSURE

**Evidence:**
- In production/staging, `app.ts` registers the Redis health indicator with `isOptional: !isProductionOrStaging`, which evaluates to `false`; the application bootstrap also treats Redis initialization failure as fatal in production-like runtime.
- `MonitoringService.getReadiness()` overrides the indicator contract with `const isOptional = indicator.isOptional || name === 'redis' || name === 'cache'`.
- Consequently an indicator named `redis` is always considered optional even when it was explicitly registered as required.
- When an optional indicator returns `DOWN`, `getReadiness()` rewrites the detail to `DEGRADED` and does not change `overallStatus` from `UP`.
- The final health/readiness source-closure document claims `HEALTH_READINESS_SOURCE_CLOSURE = 63/63 PASS`.
- `verify-health-readiness-source-closure.mjs` checks that a Redis probe exists, but does not test or statically assert that production-required Redis failure drives overall readiness to `DOWN`.

**Impact:**
- A production instance that started successfully can lose Redis later and continue returning overall readiness `UP` despite the runtime contract treating Redis as required.
- Load balancers/orchestrators can continue routing traffic to a node whose queue/distributed-state dependency is unavailable.
- The repository's 63/63 health source-closure claim does not prove readiness semantics, only probe/route/source presence for this case.

**Required remediation:**
1. Remove hard-coded name-based optionality from `MonitoringService`; respect the registered `indicator.isOptional` policy.
2. Define environment/runtime-specific dependency criticality in one canonical composition policy.
3. In production-like mode, make loss of required Redis return readiness `DOWN` / HTTP 503 while liveness remains independently evaluated.
4. Apply the same semantic review to background-jobs, notification, payment and other probes so required capabilities cannot remain optional by accident.
5. Add regression tests for production Redis `UP -> DOWN` transition and overall readiness response.
6. Extend `verify-health-readiness-source-closure.mjs` to verify semantic criticality rather than probe name presence only.
7. Amend the health closure report until the runtime behavior is proven.

**Repair Wave:** W3 / W4 / W6 / W7  
**Status:** OPEN — READINESS_MASKS_REQUIRED_REDIS_FAILURE

### Phase Classification Update — v0.30

| Phase / Cross-Cutting Area | Updated Audit Classification | Primary evidence |
|---|---|---|
| P17 Enterprise AI Platform | **PARTIAL** | `MNT-AUD-0054`, `MNT-AUD-0062` |
| P20 Enterprise Services | **PARTIAL** | `MNT-AUD-0058`, `MNT-AUD-0059`, `MNT-AUD-0060` |
| P21 Career & Alumni | **PARTIAL** | `MNT-AUD-0055` |
| P22 Enterprise Product Experience | **PARTIAL** | `MNT-AUD-0061` plus delegated-phase findings |
| P23 Administration Portal | **IN_AUDIT / PARTIAL EVIDENCE** | Existing IAM/Audit/Review findings + `MNT-AUD-0059`, `MNT-AUD-0062` |
| P24 Enterprise Public Platform | **PARTIAL** | Existing P24 findings + `MNT-AUD-0061` |
| Health / Readiness | **PARTIAL** | `MNT-AUD-0063` |

### Live Register Update — v0.30 (2026-09-06)

- Registered finding IDs allocated: **63** (`MNT-AUD-0001` → `MNT-AUD-0063`).
- Duplicate/evidence-alias IDs excluded from canonical count: **3** (`0038`, `0039`, `0053`).
- **Canonical unique confirmed findings: 60**
- Severity (canonical unique): **P0: 0 | P1: 46 | P2: 13 | P3: 1 | P4: 0**
- New canonical findings in this pass: `MNT-AUD-0058` through `MNT-AUD-0063`.
- No source/code repair, migration, backfill, seed, database mutation or production runtime change has been executed.
- Frozen audit baseline remains `0931c5664cf274cb2b8f4cb250dd09ebf2e9a77f`.
- Project decision remains: **SOURCE_NOT_COMPLETE — AUDIT_IN_PROGRESS**.

### Next mandatory continuation after v0.30
1. Finish P23 every-page/every-route capability matrix, including frontend permission visibility vs backend RBAC, mutation audit and owner-domain parity.
2. Finish P24 every-route matrix beyond Compare: deep links, owner DTOs, pagination, filters, locale, SEO, canonical relationships, unavailable/empty behavior and accessibility.
3. Finish cross-cutting Security deep audit: auth/session/refresh/logout/revocation, CSRF/CORS, SSRF/import fetch, upload/content handling, secrets, privileged operations and rate limiting.
4. Finish Prisma schema/migration/repository parity and greenfield migration replay proof.
5. Finish Events/Outbox/Workers/Notifications across every owner domain, not only P17/P20.
6. Finish Search/index lifecycle, refresh ownership, consistency and multi-instance/failure semantics.
7. Finish Asset/media usage-registry, purge, versioning, consumer integrity and lifecycle semantics.
8. Finish Observability/Deployment/DR/backup-restore, including all readiness criticality semantics and graceful shutdown.
9. Finish tests/CI/verifier truthfulness, stale path/reference and integration-composition gaps.
10. Finish documentation authority + file-by-file source inventory, then final duplicate/root-cause reconciliation before remediation begins.

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0072"></a>

### مهمة 20 — MNT-AUD-0072 — W1 / P2

**المالك المقترح:** Backend Security + Platform  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** بوابة الموجة السابقة؛ راجع التبعيات التاريخية أدناه قبل التنفيذ.

#### MNT-AUD-0072 — P2 MEDIUM — Login Verification Has a Measurable Account-Existence Timing Split and Uses Synchronous scrypt on the Node Event Loop
**Categories:** AUTH / PASSWORD / ACCOUNT_ENUMERATION / TIMING / AVAILABILITY / RATE_LIMIT / SECURITY

**Evidence:**
- `AuthRouter POST /login` performs `identityRepository.findByEmail(email)` and returns the generic 401 response immediately when no identity exists.
- Only after a matching identity exists does `AuthService.login()` call `PrismaCredentialVerifier.verify(...)`.
- `PrismaCredentialVerifier` then performs password verification through `PasswordHasher.verify(...)` only for an existing active identity with a password credential.
- `PasswordHasher.verify()` uses `scryptSync(...)`, while unknown identities never execute an equivalent dummy KDF path.
- Therefore the response cost for a nonexistent email is materially different from an existing account with a wrong password even though the response body is intentionally generic.
- `scryptSync` executes CPU/memory-hard work synchronously on the Node.js event loop. Existing authentication-specific rate limits (account and account+IP) are a positive mitigation, but they do not make the path constant-cost and do not prevent distributed attempts against many accounts/IPs from consuming event-loop time.
- Repository search found no dummy-hash/equalized-cost login path or timing regression test.

**Impact:**
- Remote timing analysis can increase confidence about whether an email/account exists, especially over repeated samples.
- Repeated wrong-password attempts against real accounts impose synchronous KDF work on the API event loop and can degrade latency for unrelated requests.
- The current implementation correctly uses salted scrypt and timing-safe hash comparison; this finding concerns request-level timing/even-loop behavior, not weak password hashing.

**Required remediation:**
1. Use asynchronous `crypto.scrypt` (or an approved async password-KDF implementation) so expensive password verification does not block the Node event loop.
2. Execute an equivalent dummy password verification path for nonexistent identities and other early credential-missing cases so authentication failure cost is substantially equalized.
3. Preserve generic authentication error responses and the existing account/account+IP rate limits.
4. Add bounded login concurrency/backpressure appropriate to the selected KDF cost.
5. Add timing-oriented tests/benchmarks that compare nonexistent-account and wrong-password paths within an approved tolerance rather than asserting only response text/status.
6. Document and benchmark KDF parameters as an operational security setting so increases do not accidentally create an availability regression.

**Repair Wave:** W1 / W3 / W6  
**Status:** OPEN — LOGIN_KDF_TIMING_AND_EVENT_LOOP_COST_NOT_HARDENED

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0102"></a>

### مهمة 21 — MNT-AUD-0102 — W1 / P2

**المالك المقترح:** Backend Security + Platform  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** بوابة الموجة السابقة؛ راجع التبعيات التاريخية أدناه قبل التنفيذ.

#### MNT-AUD-0102 — P2 MEDIUM — Cookie/CSRF Production Configuration Passes Readiness While Diverging from the Approved `SameSite=Strict` and Secret-Ownership Contract
**Categories:** SECURITY / AUTH / SESSION / COOKIE / CSRF / CONFIGURATION / DOCUMENTATION_DRIFT / SOURCE_CLOSURE

**Evidence:**
- The approved Master Blueprint mandates `SameSite=Strict` for browser cookies and a synchronizer-token pattern for every state-changing mutation.
- `HttpOnlyAuthCookies.cookieOptions(...)` hard-codes both access and refresh cookies to `sameSite: 'lax'` in every environment. Production-like mode changes only the `secure` flag.
- `AppConfigSchema`, `ProductionReadinessValidator`, `.env.example` and production guardrail tests require strong `SESSION_SECRET` and `CSRF_SECRET` values before production startup.
- Repository-wide executable-source search found neither secret consumed by the session or CSRF implementations. `SecurityService` signs each CSRF token with the refresh token itself, while `PrismaSessionManager` stores a SHA-256 refresh-token hash; rotating `CSRF_SECRET` or `SESSION_SECRET` therefore changes no active browser-security behavior.
- `ProductionReadinessValidator` can consequently report these secret controls satisfied even though the mandatory values are readiness-only configuration with no cryptographic owner.
- Positive evidence is retained: cookies are `HttpOnly`, production cookies are forced `Secure`, refresh-token-backed sessions are persisted, and the global guard rejects cookie-authenticated mutations lacking a valid header token. This finding is the remaining authority/configuration mismatch, not a claim that CSRF checking is wholly absent.

**Impact:**
- Production can be declared compliant while the actual cookie policy is weaker than the approved baseline.
- Operators may rotate incident-response secrets believing sessions/CSRF tokens were invalidated when those variables have no effect.
- Duplicate, unused security secrets create false assurance and make key ownership, rotation and compromise response ambiguous.

**Required remediation:**
1. Set the canonical production cookie policy to `SameSite=Strict`, or obtain an explicit architecture/security approval for a narrowly documented exception required by a real cross-site flow.
2. Decide and document the canonical CSRF construction: a true server-owned synchronizer-token store or a reviewed signed/double-submit design with explicit threat model and key ownership.
3. Wire `CSRF_SECRET`/`SESSION_SECRET` to their defined cryptographic responsibilities, or remove the unused variables and all readiness claims that they protect active behavior.
4. Add tests that inspect production `Set-Cookie` attributes and prove secret rotation/revocation semantics.
5. Extend `MNT-AUD-0043` remediation so the typed environment contract rejects required-but-unused security variables.

**Repair Wave:** W0 / W1 / W6  
**Status:** OPEN — COOKIE_CSRF_POLICY_AND_SECRET_CONTRACT_DIVERGE_FROM_APPROVED_BASELINE

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0103"></a>

### مهمة 22 — MNT-AUD-0103 — W1 / P2

**المالك المقترح:** Backend Security + Platform  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** بوابة الموجة السابقة؛ راجع التبعيات التاريخية أدناه قبل التنفيذ.

#### MNT-AUD-0103 — P2 MEDIUM — Fixed CORS Preflight Policy Omits Required Mutation and Correlation Headers Used by the Canonical Admin Client
**Categories:** SECURITY / CORS / API_CONTRACT / ADMIN / FINANCE / IDEMPOTENCY / CORRELATION / INTEGRATION / SOURCE_CLOSURE

**Evidence:**
- `SecurityMiddlewareFactory.createCors(...)` fixes `allowedHeaders` to Content-Type, Authorization, X-Requested-With, Accept, Origin, CSRF and Student-Tools session headers.
- The list omits `Idempotency-Key`, `X-Correlation-ID` and `X-Request-ID`.
- Finance APIs explicitly require/read `Idempotency-Key`, and multiple routers consume correlation/request IDs.
- Canonical Admin Finance clients send both `Idempotency-Key` and `X-Correlation-Id` for mutation commands.
- The repository supports a distinct Admin origin (`apps/admin` uses its own Vite server and `.env.example` declares a separate Admin URL), while production CORS is configured for an exact frontend origin. A browser cross-origin mutation using the canonical headers therefore preflights against a response that does not authorize those headers.
- Existing router tests set the headers directly through Supertest and no CORS integration test exercises the real browser preflight, so the mismatch is not detected.
- This strengthens `MNT-AUD-0098` but is not the same root cause: `0098` is missing server-side idempotency enforcement across mutations; this finding is the transport policy blocking already-approved headers where they are implemented.

**Impact:**
- Admin Finance and future standards-compliant browser clients can be rejected by the browser before the request reaches authenticated API logic.
- Teams may remove idempotency/correlation headers to make UI calls work, weakening retry safety and traceability.
- Same-origin preview tests can remain green while the approved separated-origin deployment fails.

**Required remediation:**
1. Define CORS allowed headers from the canonical API header contract rather than maintaining an unrelated fixed list.
2. Authorize `Idempotency-Key`, `X-Correlation-ID` and `X-Request-ID` with normalized case handling, while retaining the CSRF header.
3. Add preflight integration tests for Web/Admin origins covering authenticated Finance and representative admin/student mutations.
4. Add a source guard comparing headers consumed by routers/clients with the CORS allowlist.
5. Reconcile the final Admin/Web/API origin topology with the release/deployment work under `MNT-AUD-0094`.

**Repair Wave:** W1 / W4 / W6 / W7  
**Status:** OPEN — CORS_PREFLIGHT_BLOCKS_CANONICAL_MUTATION_HEADERS

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0104"></a>

### مهمة 23 — MNT-AUD-0104 — W1 / P2

**المالك المقترح:** Backend Security + Platform  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** بوابة الموجة السابقة؛ راجع التبعيات التاريخية أدناه قبل التنفيذ.

#### MNT-AUD-0104 — P2 MEDIUM — Local Compose Publishes Weakly Credentialed PostgreSQL and Unauthenticated Redis on All Host Interfaces Without a Safety Profile
**Categories:** SECURITY / CONFIGURATION / DOCKER / DATABASE / REDIS / INSECURE_DEFAULT / LOCAL_DEVELOPMENT / SOURCE_CLOSURE

**Evidence:**
- Root `docker-compose.yml` hard-codes PostgreSQL credentials as `root` / `password`.
- PostgreSQL is published as `5432:5432`, which binds the container port on all host interfaces by default rather than loopback-only.
- Redis is published as `6379:6379` with no password/ACL/TLS configuration and likewise no loopback-only binding.
- The compose file has no explicit development-only profile, no environment assertion and no production-start refusal marker.
- The operations manual instructs developers to bring this compose topology up and repeats the weak database URL; it labels cloud deployment pending, but that prose does not technically prevent use on a shared workstation, LAN or misclassified deployment host.
- Production API validators correctly reject local/placeholder service URLs, but they do not protect the database/Redis containers themselves from network exposure when compose is started.

**Impact:**
- Starting the documented local stack on a reachable developer or CI host can expose a password-known PostgreSQL instance and unauthenticated Redis to adjacent networks.
- Redis compromise can affect rate-limit state and other runtime caches/coordination if the local stack is used for shared testing.
- The repository contains an avoidable insecure default even though production application startup otherwise attempts to fail closed.

**Required remediation:**
1. Bind development dependency ports to loopback explicitly (`127.0.0.1`) unless a documented isolated network requires otherwise.
2. Source local credentials from a non-tracked development environment file and generate non-default values; do not embed `root/password`.
3. Enable Redis authentication/ACL for any host-published configuration, or avoid publishing Redis when only compose-network consumers need it.
4. Add a clearly named development profile and a technical guard preventing production/staging use of the local compose topology.
5. Add a compose security test checking host binds, default credentials, Redis authentication and development-only classification.

**Repair Wave:** W0 / W1 / W6  
**Status:** OPEN — LOCAL_COMPOSE_EXPOSES_INSECURE_DATABASE_AND_REDIS_DEFAULTS

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0067"></a>

### مهمة 24 — MNT-AUD-0067 — W1 / P2

**المالك المقترح:** Backend Security + Platform  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** بوابة الموجة السابقة؛ راجع التبعيات التاريخية أدناه قبل التنفيذ.

#### MNT-AUD-0067 — P2 MEDIUM — Canonical Admin `VITE_LOCAL_ADMIN_READ_ONLY` Mode Bypasses Frontend Authentication but Does Not Enforce a Read-Only Transport Boundary
**Categories:** P23 / ADMIN / LOCAL_PREVIEW / SAFETY / CONFIG / ROUTING / DOCUMENTATION_DRIFT / DEFENSE_IN_DEPTH

**Evidence:**
- `apps/admin/src/App.tsx` sets `adminAccess` directly to `authorized` whenever `VITE_LOCAL_ADMIN_READ_ONLY === 'true'`, bypassing `verifyAdminSession()` and the Admin login gate in the SPA.
- The root `.env.example` describes this switch as a local-only Admin preview and states that the Vite API bridge blocks non-read requests.
- The write-blocking Vite middleware actually exists in `apps/web/vite.config.ts`, where non-GET/HEAD/OPTIONS `/api` requests return 423 when the flag is true.
- The canonical Admin application is `apps/admin`, whose `apps/admin/vite.config.ts` contains no corresponding read-only API middleware/proxy guard.
- `apps/admin/src/api/client.ts` sends normal credentialed requests, including POST/PATCH mutation methods, to `VITE_API_BASE_URL || '/api/v1'`; the client itself does not enforce local read-only mode.
- Repository search shows only a small subset of Admin pages explicitly consult `VITE_LOCAL_ADMIN_READ_ONLY`; most canonical Admin workspaces do not consume that flag.
- Backend authentication/RBAC/CSRF still remain the authoritative security controls, so this does not create an unauthenticated production write bypass by itself. The defect is that the advertised local read-only safety contract is not actually enforced by the canonical Admin application.

**Impact:**
- A developer/operator can enable a mode labelled “read-only” while canonical Admin mutation controls remain capable of issuing writes whenever a valid backend session/API endpoint is available.
- The frontend login bypass and missing transport-level write block create misleading safety expectations during demos, local inspection and connected development environments.
- Safety behavior differs between the legacy/public Vite bridge and the actual Admin app, contradicting the stated single canonical Admin UI model.

**Required remediation:**
1. Decide whether local read-only preview remains a supported capability; if not, remove the switch from canonical Admin source and documentation.
2. If retained, enforce read-only at the canonical `apps/admin` transport/client boundary, not page-by-page UI conventions.
3. Reject all unsafe methods in local read-only mode before network transmission and show an explicit read-only state in mutation controls.
4. Never let this flag weaken backend authentication/RBAC; production/staging builds must fail or ignore the local-preview bypass.
5. Add tests proving every Admin mutation is blocked in local read-only mode while permitted safe reads behave as intentionally designed.
6. Reconcile `.env.example`, Admin Vite configuration and public/admin closure verifiers.

**Repair Wave:** W1 / W5 / W7  
**Status:** OPEN — CANONICAL_ADMIN_LOCAL_READONLY_NOT_ENFORCED

### Live Register Update — v0.32 (2026-09-06)

- Registered finding IDs allocated: **67** (`MNT-AUD-0001` → `MNT-AUD-0067`).
- Duplicate/evidence-alias IDs excluded from canonical count: **3** (`0038`, `0039`, `0053`).
- **Canonical unique confirmed findings: 64**
- Severity (canonical unique): **P0: 0 | P1: 48 | P2: 15 | P3: 1 | P4: 0**
- New canonical findings in this continuation: `MNT-AUD-0065`, `MNT-AUD-0066`, `MNT-AUD-0067`.
- CSRF/CORS controls were positively verified; no false security finding was added.
- Events/Outbox was reconciled against existing root-cause findings; no duplicate broad finding was added.
- No source/code repair, migration, backfill, seed, database mutation or production runtime change has been executed.
- Frozen audit baseline remains `0931c5664cf274cb2b8f4cb250dd09ebf2e9a77f`.
- Project decision remains: **SOURCE_NOT_COMPLETE — AUDIT_IN_PROGRESS**.

### Next mandatory continuation after v0.32
1. Finish P23 route/action matrix: every page/action ↔ backend permission ↔ auth/session boundary ↔ mutation audit ↔ owner domain.
2. Finish P24 route-by-route deep links, unavailable/empty/error behavior, locale, SEO, filtering/pagination and accessibility beyond known Compare/Search issues.
3. Finish transactional outbox/event producer-consumer matrix and prove no declared event is orphaned beyond already-open findings.
4. Finish production runtime lifecycle beyond existing `MNT-AUD-0040`: readiness drain ordering, worker lease/multi-instance behavior and startup/shutdown failure handling.
5. Finish DR source closure: backup scope, asset recovery, PITR, encryption/retention, restore evidence and RPO/RTO gates.
6. Finish CI/verifier truthfulness and file-by-file source/document authority reconciliation.
7. Perform final duplicate/root-cause reconciliation only after all audit axes are closed; remediation remains blocked until then.

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0070"></a>

### مهمة 25 — MNT-AUD-0070 — W1 / P2

**المالك المقترح:** Backend Security + Platform  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** بوابة الموجة السابقة؛ راجع التبعيات التاريخية أدناه قبل التنفيذ.

#### MNT-AUD-0070 — P2 MEDIUM — Public Prototype Data Mode Is Explicit but Not Forbidden in Production Builds
**Categories:** P24 / PUBLIC_WEB / CONFIGURATION / PROTOTYPE_DATA / PRODUCTION_SAFETY / BUILD_GUARD / DATA_TRUST

**Evidence:**
- `resolvePublicTemplateDataMode(value)` correctly defaults unknown/unset values to `api` and enables prototype mode only when the value is exactly `prototype`.
- `usePublicLiveData()` dynamically imports `publicPrototypeDataSource` whenever that resolved mode is `prototype`.
- `PublicTemplateApp` passes `import.meta.env.VITE_PUBLIC_TEMPLATE_DATA_MODE` directly into the loader.
- Repository search found no production/staging build guard, Vite configuration assertion, environment-schema rule or CI check rejecting `VITE_PUBLIC_TEMPLATE_DATA_MODE=prototype` for a production build.
- The prototype module comment claims “Production/live composition never imports it,” but source behavior contradicts that absolute claim: an explicitly misconfigured production build can load the fixture adapter.
- Existing P10 source verifier proves the production app does not statically import the prototype adapter and that fixtures are isolated behind the explicit module; it does not prove production builds cannot set the enabling environment value.

**Impact:**
- A deployment/build configuration error can publish fixture/mock scholarships, universities, courses, countries, exams, articles or services through the real public UI.
- Because prototype data is intentionally shaped like live data, the resulting site can look healthy while presenting non-authoritative records.
- Backend production-readiness validation cannot protect this compile-time frontend `VITE_*` value after the web bundle has been built.

**Required remediation:**
1. Make production/staging web builds fail if `VITE_PUBLIC_TEMPLATE_DATA_MODE=prototype`.
2. Prefer compile-time elimination of prototype capability from production bundles where practical.
3. Add a Vite/web environment validator with an explicit environment-tier contract.
4. Add CI tests for production-mode configuration proving prototype mode is rejected.
5. Keep prototype mode available only for local/test/demo contexts with an unmistakable visual indicator when enabled.
6. Correct comments/source-closure documentation so “production never imports prototype” is asserted only when enforced by code/build gates.

**Repair Wave:** W3 / W5 / W7  
**Status:** OPEN — PRODUCTION_BUILD_CAN_ENABLE_PUBLIC_PROTOTYPE_DATA

### Live Register Update — v0.35 (2026-09-06)

- Registered finding IDs allocated: **70** (`MNT-AUD-0001` → `MNT-AUD-0070`).
- Duplicate/evidence-alias IDs excluded from canonical count: **3** (`0038`, `0039`, `0053`).
- **Canonical unique confirmed findings: 67**
- Severity (canonical unique): **P0: 0 | P1: 50 | P2: 16 | P3: 1 | P4: 0**
- New canonical finding in this continuation: `MNT-AUD-0070`.
- Prototype mode remains explicit and is not an automatic live-data fallback; the finding is specifically the missing production-build prohibition.
- No source/code repair, migration, backfill, seed, database mutation or production runtime change has been executed.
- Frozen audit baseline remains `0931c5664cf274cb2b8f4cb250dd09ebf2e9a77f`.
- Project decision remains: **SOURCE_NOT_COMPLETE — AUDIT_IN_PROGRESS**.

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0108"></a>

### مهمة 26 — MNT-AUD-0108 — W1 / P2

**المالك المقترح:** Backend Security + Platform  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** MNT-AUD-0111.

#### MNT-AUD-0108 — P2 MEDIUM — Legacy File Activation Lets the JSON Body Override the Path Resource Identifier and Lacks Edge Schema Validation
**Categories:** SECURITY / INPUT_VALIDATION / MASS_ASSIGNMENT / BOLA / FILES / DATA_INTEGRITY / AUDIT / API_CONTRACT / SOURCE_CLOSURE

**Evidence:**
- The approved API/security standard requires strict schema validation at the system edge and rejection of unknown fields before business logic.
- The mounted legacy `FileManagementRouter` accepts raw `req.body` for upload-locator generation and file registration with no runtime schema.
- Its activation handler constructs `activateFile({ fileId: req.params.fileId, ...req.body })`. Because the body spread occurs last, a caller can supply a second `fileId` that silently overrides the path parameter.
- `ManageFilesUseCase.activateFile(...)` treats the resulting `input.fileId` as authoritative, looks up that record and activates it. It does not compare it with the route resource.
- Thus `POST /files/A/activate` with body `{ "fileId": "B", ...checksum }` mutates B while the requested URI identifies A. The control-plane permission limits callers to asset administrators, but it does not restore target integrity or trustworthy request/audit semantics.
- The other file commands use the path ID without a body override, showing that this is not an intentional dual-identifier contract.
- `RegisterFileInput` and `ActivateFileInput` are TypeScript interfaces only; Express JSON is not runtime-validated by those interfaces. No router test was found for unknown-field rejection or conflicting path/body identifiers.
- This is narrower than `MNT-AUD-0065` (incomplete session/identity validation on legacy control-plane mounts) and remains exploitable as a target-confusion/integrity defect after that guard is repaired.

**Impact:**
- A privileged request can mutate a different file from the one named in the URL, defeating resource-target review and making logs, approvals and incident evidence ambiguous.
- Unknown/malformed file metadata reaches business/domain constructors instead of being rejected consistently at the edge.
- Client bugs or malicious payloads can create action/target disagreement that automated policy and audit tooling may not detect.

**Required remediation:**
1. Define strict runtime schemas for every File Management path, query and body contract and reject unknown properties.
2. Remove `fileId` from activation body input entirely; construct the command as `{ ...validatedChecksum, fileId: validatedPathId }` with the path authority applied last.
3. If dual identifiers must temporarily be supported, require exact equality and return a stable 400/409 error on conflict.
4. Pass the resolved canonical target explicitly to mutation/audit context so URI, authorized resource and persisted record cannot diverge.
5. Add conflict, unknown-field, malformed checksum, unauthorized, and exact-target mutation tests at the fully composed route.
6. Extend the same strict-edge review across the remaining legacy control-plane routers that currently forward raw `req.body`.

**Repair Wave:** W1 / W2 / W4 / W6  
**Status:** OPEN — FILE_ACTIVATION_PATH_TARGET_CAN_BE_OVERRIDDEN_BY_UNVALIDATED_BODY

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0113"></a>

### مهمة 27 — MNT-AUD-0113 — W1 / P2

**المالك المقترح:** Backend Security + Platform  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** MNT-AUD-0040.

#### MNT-AUD-0113 — P2 MEDIUM — Student Tools Quotas Use a Process-Local Limiter Outside the Distributed Production Rate-Limit Boundary

**Status:** OPEN — STATIC_SOURCE_CONFIRMED; multi-instance runtime test pending.
**Scope:** P18 Student Tools / Security / DI / multi-instance safety.

**Evidence (frozen commit 0931c5664cf274cb2b8f4cb250dd09ebf2e9a77f):**
- apps/api/src/infrastructure/di/container.ts:8226 registers studentToolRateLimiter with asClass(DefaultRateLimiter).singleton(), without an environment switch. Line 8227 injects it into StudentToolRateLimitGateway.
- packages/infrastructure/src/security/DefaultRateLimiter.ts:8-13 declares isProductionReady=false, kind=process-local, capabilityStatus=DEVELOPMENT_ONLY, and stores counters in a local Map.
- packages/infrastructure/src/student-tools/StudentToolGateways.ts:258-263 delegates consume directly to that limiter.
- packages/application/src/student-tools/use-cases/StudentToolExecutionUseCases.ts:89-109 consumes per-tool principal and anonymous-network limits through this gateway.
- packages/application/src/student-tools/OfficialStudentToolRegistry.ts:293-299 defines distinct tool quotas, including 2 anonymous requests/minute for AI_DELEGATED tools, and 6 authenticated requests/minute for AI/hybrid tools.
- apps/api/src/infrastructure/di/RuntimeDependencyPolicy.ts:createRateLimiterForRuntime selects Redis for the global production/staging limiter, but the Student Tools registration does not reuse this selection.

**Impact and limits:** Counters reset with process restart and are independent across replicas; aggregate allowance can exceed a tool's configured quota, subject to the separate global limiter and any AI-provider controls. The global Redis/IP limit is positive evidence, but is not an equivalent per-tool/per-principal quota. This is not a claim that an already deployed production service was exploited: current production asset guardrails separately block startup (0011). Repairing those guardrails must not expose this latent composition defect. The finding is independent of 0107 (optional authentication), 0063 (readiness) and 0109 (dead registrations): this limiter is actively consumed.

**Required remediation:**
1. Inject a distributed limiter for Student Tools in production/staging using the same managed Redis lifecycle, with a separate namespace and atomic increment/expiry behavior.
2. Preserve tool, principal and anonymous-network key dimensions and the configured quotas; do not replace them with the broader global IP quota.
3. Fail closed for expensive execution when the quota store is unavailable; report capability health and a stable service-unavailable response.
4. Add a composition test rejecting DEVELOPMENT_ONLY limiters in every production consumer, not only the global HTTP middleware.
5. Add two-instance shared-store tests: combined N requests allowed, N+1 rejected; restart cannot reset the shared window; Redis failure denies execution without fake success.

**Priority rationale:** P2: narrower quota/cost-abuse boundary, existing global distributed limiting remains. No remote exploit or runtime load test was performed.
**Repair Wave:** W1; verification repeated W6.


**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0095"></a>

### مهمة 28 — MNT-AUD-0095 — W2 / P1

**المالك المقترح:** Domain Backend + Database  
**حالة التنفيذ:** SOURCE_VERIFIED — راجع دليل W2 المضاف بتاريخ 2026-09-06.
**التبعيات:** بوابة الموجة السابقة؛ راجع التبعيات التاريخية أدناه قبل التنفيذ.

#### MNT-AUD-0095 — P1 HIGH — The Production Domain Barrel Still Exports `generated/dummy.ts`, and Active Use Cases Compile Against Dummy `any` Contracts
**Categories:** DOMAIN / TYPE_SAFETY / STUBS / LEGACY / SOURCE_TRUTH / WORKFLOW / LOCALIZATION / GOVERNANCE / SOURCE_CLOSURE

**Evidence:**
- `packages/domain/src/index.ts`, the production `@manaratak/domain` barrel, still executes `export * from './generated/dummy';`.
- `packages/domain/src/generated/dummy.ts` is not a harmless empty compatibility shim: it defines broad domain classes/interfaces/enums with permissive `[key: string]: any`, `constructor(..._args: any[])`, dynamic static keys and `DUMMY` enum values across Integration, Localization, Logging, Monitoring, Notifications, Membership/Organization, Search, Security Policy, Shared Components, Workflow and other capabilities.
- Active production application code imports those symbols through `@manaratak/domain`. `ManageWorkflowsUseCase` imports `IWorkflowRepository`, `Workflow`, and related workflow symbols; `ManageLocalizationsUseCase` imports `ILocalizationRepository` and localization lifecycle/contracts that currently resolve from the dummy authority.
- The active Phase 05 traceability matrix itself identifies Workflow and Localization repository authority as `packages/domain/src/generated/dummy.ts (Dummy generated)`.
- Historical Sprint 2.2 documentation records that `dummy.ts` was intentionally created to bridge compilation gaps and inventories hundreds of temporary stubs that were required to be replaced in later sprints.
- Current source verifiers contain targeted assertions that selected later domains such as Scholarships/Services no longer depend on generated/dummy authority, but there is no repository-wide guard preventing the root production domain barrel from continuing to expose the legacy dummy surface.
- This is distinct from `MNT-AUD-0049`: `0049` concerns mounted control-plane routes resolving to `UNAVAILABLE` persistence. Replacing those repositories alone would not restore type-safe domain contracts while the global dummy barrel remains active; conversely removing dummy exports alone would not implement the missing persistence.

**Impact:**
- Typecheck/build success can be obtained against structurally meaningless `any` contracts rather than the approved domain invariants, creating false source-closure evidence.
- Refactors can silently compile despite missing methods, invalid lifecycle states or incompatible DTO shapes because dummy interfaces/classes accept arbitrary keys and constructor arguments.
- Multiple foundation capabilities have two competing narratives: baseline documentation says real domain files/contracts exist while the canonical barrel continues to expose generated stubs.
- The dummy authority can mask dead/orphan implementations and makes dependency, API and event contract audits materially less trustworthy.

**Required remediation:**
1. Inventory every export in `generated/dummy.ts` and classify it as REQUIRED_NOW, FORMALLY_DEFERRED, HISTORICAL_COMPATIBILITY or REMOVE.
2. For every required capability, create/restore the real typed domain aggregate/value-object/interface/event files and update production imports to those canonical modules.
3. For deferred capabilities, remove production barrel exposure and ensure no mounted route/use case claims an operational contract that exists only as a dummy symbol.
4. Remove `export * from './generated/dummy'` from the production domain barrel once all required dependencies are migrated; if a temporary compatibility module must remain, isolate it outside production exports and forbid use from runtime roots.
5. Add a repository-wide architecture/source-quality guard that fails on production imports/exports of `generated/dummy`, permissive stub signatures and `DUMMY` lifecycle values.
6. Reconcile Phase 05 traceability and implementation baselines with the final real file paths and ownership contracts.
7. Re-run typecheck, source closure, API contract and event/worker audits after dummy removal because previously accepted compilation may reveal concealed missing contracts.

**Repair Wave:** W0 / W1 / W3 / W6 / W7  
**Status:** OPEN — GENERATED_DUMMY_REMAINS_ACTIVE_PRODUCTION_DOMAIN_AUTHORITY

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0056"></a>

### مهمة 29 — MNT-AUD-0056 — W2 / P1

**المالك المقترح:** Domain Backend + Database  
**حالة التنفيذ:** SOURCE_VERIFIED — راجع دليل W2 المضاف بتاريخ 2026-09-06.
**التبعيات:** بوابة الموجة السابقة؛ راجع التبعيات التاريخية أدناه قبل التنفيذ.

#### MNT-AUD-0056 — P1 HIGH — Active Identity Provisioning and DTO Mapping Bypass TypeScript Verification with `@ts-nocheck`
**Categories:** IDENTITY / TYPE_SAFETY / QUALITY / SOURCE_CLOSURE / TEST

**Evidence:**
- `packages/application/src/identity/ProvisionIdentityUseCase.ts` begins with `// @ts-nocheck`.
- `packages/application/src/identity/mapper.ts` also begins with `// @ts-nocheck`.
- The provisioning use case is not dead/legacy source: it is exported from the application package, composed in the API DI container, consumed by `IdentityRouter`, and exercised by identity/admin audit tests.
- The Phase 05 source already documents removal of `@ts-nocheck` as the expected type-safety direction for application-layer slices, yet the Identity critical path remains excluded.
- Canonical CI typecheck therefore cannot prove the correctness of this active identity provisioning/mapping path.

**Impact:**
- Type drift between Identity domain aggregates, repository contracts, DTO mapping and API composition can remain hidden while repository-wide typecheck reports success.
- A critical account/identity creation path sits outside the static verification contract used as Source Closure evidence.
- Refactors to Identity/User/Profile/ContactRegistry can break runtime behavior without a TypeScript compile failure in these files.

**Required remediation:**
1. Remove `@ts-nocheck` from both Identity application files.
2. Correct all resulting type errors at the actual contract boundary rather than replacing the suppression with `any`/`@ts-ignore`.
3. Make DTO mapping exhaustive and strictly typed for human/non-human Identity variants.
4. Add a source guard that rejects `@ts-nocheck` under active `apps/**` and `packages/**` except explicitly governed generated code.
5. Add compile-contract/unit tests for provisioning + mapping + repository save behavior and preserve current admin mutation audit coverage.

**Repair Wave:** W1 / W6 / W7  
**Status:** OPEN — IDENTITY_CRITICAL_PATH_TYPECHECK_BYPASS

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0088"></a>

### مهمة 30 — MNT-AUD-0088 — W2 / P1

**المالك المقترح:** Domain Backend + Database  
**حالة التنفيذ:** SOURCE_VERIFIED_REVIEW_PENDING — راجع دليل W2 المضاف بتاريخ 2026-09-06.
**التبعيات:** بوابة الموجة السابقة؛ راجع التبعيات التاريخية أدناه قبل التنفيذ.

#### MNT-AUD-0088 — P1 HIGH — Canonical Prisma Persistence Collapses Approved Bounded Contexts into One PostgreSQL Schema Instead of the Mandated Logical/Physical Schema Isolation
**Categories:** ARCHITECTURE / DATABASE / PRISMA / BOUNDED_CONTEXT / MODULAR_MONOLITH / SCHEMA_ISOLATION / MIGRATION / DATA_INTEGRITY / SOURCE_CLOSURE

**Evidence:**
- The approved Phase 02 bounded-context design makes database isolation an explicit acceptance criterion: each core Bounded Context must use a separate physical or logical database schema, and cross-database queries/foreign-key constraints are prohibited.
- Multiple active phase implementation guides preserve that architecture concretely with Prisma `@@schema(...)` mappings, including Majors (`majors`), Scholarships (`scholarships`), Learning (`learning_platform`), Universities (`universities`) and Tests (`tests`).
- The Phase 13 implementation guide explicitly shows a PostgreSQL datasource with `schemas = ["learning_platform"]` and states that the relational model is logically isolated through `@@schema("learning_platform")`.
- The actual canonical `packages/infrastructure/prisma/schema.prisma` datasource declares only `provider = "postgresql"` and `url = env("DATABASE_URL")`; it does not declare Prisma multi-schema `schemas = [...]`.
- The active canonical Prisma models likewise do not use the phase-level `@@schema(...)` mappings shown in the approved implementation guides; current migrations create domain tables in the default database schema.
- The late-domain migration `20260903210000_p8_late_domain_integrations` additionally creates Phase 20 Service and Phase 21 Career persistence in the same migration/default namespace, reinforcing that the source implementation has converged on a single shared physical schema without a recorded architecture supersession found by this audit.
- Repository search did not identify a current ADR formally replacing the approved schema-isolation rule with a single-schema persistence model plus equivalent boundary controls.

**Impact:**
- The physical persistence model no longer matches the approved bounded-context isolation contract even though documentation and phase guides still describe that isolation as authoritative.
- Table ownership, migration ownership and future extraction boundaries are materially weaker because domain persistence is co-located in one schema namespace.
- Accidental cross-domain coupling and direct relational access become easier to introduce and harder to detect.
- Greenfield migration/recovery evidence can validate the current Prisma schema while still violating the architecture it is supposed to implement.
- The platform cannot claim architecture/source parity until this decision is reconciled explicitly.

**Required remediation:**
1. Submit this divergence to the Architecture Review Board before implementation remediation begins.
2. Choose and document one canonical persistence strategy: (a) implement logical schema isolation with Prisma multi-schema/context-owned migrations, or (b) formally supersede the Phase 02/phase-guide requirement and define equivalent enforceable module/database-boundary controls.
3. If multi-schema remains authoritative, map every owner-domain model to its context schema, define permitted reference/shared schemas, and sequence migration/backfill work through the database recovery gate.
4. Prohibit direct cross-context ORM access through architecture/source guards; cross-context reads/writes must use owner contracts/read models/events as approved.
5. Add a machine-readable persistence ownership manifest and a source verifier that fails when a model is placed outside its owner schema or a migration mixes forbidden owners.
6. Add disposable-PostgreSQL greenfield migration tests proving schema creation, permissions, FK policy and migration ordering.
7. Reconcile all phase implementation guides, Prisma source and recovery documentation so only one database-boundary authority remains.

**Repair Wave:** W0 / W1 / W2 / W6 / W7  
**Status:** OPEN — PRISMA_PERSISTENCE_DOES_NOT_IMPLEMENT_APPROVED_BOUNDED_CONTEXT_SCHEMA_ISOLATION

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0041"></a>

### مهمة 31 — MNT-AUD-0041 — W2 / P1

**المالك المقترح:** Domain Backend + Database  
**حالة التنفيذ:** SOURCE_VERIFIED_DB_RUNTIME_PENDING — راجع دليل W2 المضاف بتاريخ 2026-09-06.
**التبعيات:** MNT-AUD-0088.

#### MNT-AUD-0041 — P1 HIGH — Prisma Source Gate Does Not Prove Migration-Chain-to-Schema Parity for a Greenfield Database
**Categories:** PRISMA / MIGRATION / DATA_MODEL / TEST / DEVOPS / SOURCE_CLOSURE

**Evidence:**
- `scripts/ci/prisma-source-gate.mjs` runs only `prisma validate` and `prisma generate` against `schema.prisma`; it explicitly performs no database connection and no migration replay/diff.
- Repository search found no `prisma migrate diff --from-migrations ...` / equivalent authoritative migration-parity gate.
- `scripts/wp-ic-10-db-rehearsal.sh` applies `prisma migrate deploy` and runs `prisma migrate status` on a disposable PostgreSQL database, but it does not compare the resulting database schema against the canonical `schema.prisma` after replay.
- `migrate status` proves ledger/application status, not that the full replayed relational shape (tables, columns, enums, FKs, indexes, defaults and constraints) is equivalent to the current Prisma schema.
- The project is explicitly greenfield for the future runtime database; therefore migration replay from empty is the only acceptable production provisioning path, not `db push`.

**Impact:**
- A schema model/field/relation can compile and generate a client while being absent or divergent in the migration history.
- Google Studio could successfully run `migrate deploy` yet produce a database that does not match the source contracts, causing runtime failures only after connection.
- Current Source Closure cannot prove that the checked-in migration ledger is a complete executable representation of the canonical data model.

**Required remediation:**
1. Add an authoritative greenfield migration-parity verifier that replays all checked-in migrations onto a disposable PostgreSQL database.
2. Compare the replayed database to canonical `schema.prisma` using Prisma-supported schema diff/introspection plus explicit checks for SQL-only constraints/indexes not represented by Prisma.
3. Fail on drift: missing/extra tables, columns, enums, FKs, indexes, uniqueness, defaults or incompatible nullability/cascade semantics.
4. Make the verifier part of the post-connect/disposable-DB validation register and CI whenever a PostgreSQL service is available; source must contain the script/test before DB provisioning.
5. Add a documented `db:greenfield:verify`/equivalent command used by Google Studio handoff before seed/bootstrap.
6. Keep `db push` prohibited for staging/production and document migration ledger ownership.

**Repair Wave:** W2 / W6
**Status:** OPEN — GREENFIELD_MIGRATION_PARITY_UNPROVEN


#### Live Register Update — v0.19 (2026-09-06)
- Confirmed findings: **41**
- P0: 0 | P1: **32** | P2: 8 | P3: 1 | P4: 0
- Added `MNT-AUD-0041` — no authoritative migration-chain ↔ canonical Prisma schema parity gate.
- Real-database coverage per domain is now under audit.

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0083"></a>

### مهمة 32 — MNT-AUD-0083 — W2 / P1

**المالك المقترح:** Domain Backend + Database  
**حالة التنفيذ:** SOURCE_VERIFIED_DB_RUNTIME_PENDING — راجع دليل W2 المضاف بتاريخ 2026-09-06.
**التبعيات:** MNT-AUD-0041.

#### MNT-AUD-0083 — P1 HIGH — Governed Database Baseline Can Silently Lose Migration-Ledger Evidence and Continue with Partial/Unavailable Domain Counters
**Categories:** DATABASE / MIGRATIONS / DATA_INTEGRITY / RECOVERY / BASELINE / GOVERNANCE / FALSE_GREEN / DEPLOYMENT / PRISMA

**Evidence:**
- `scripts/db-remediation-gate.ts` implements `db:remediation:baseline` as the read-only pre/post recovery evidence command.
- The `_prisma_migrations` query explicitly appends `.catch(() => [])`; inability to read the Prisma migration ledger is therefore normalized to an empty migrations array instead of failing the baseline.
- Per-table `count(...)` also catches every query failure and returns the string `UNAVAILABLE` rather than propagating the failure.
- The outer baseline still prints a normal `READ_ONLY_BASELINE` JSON object after those swallowed failures; only an uncaught outer error produces `status: 'UNAVAILABLE'` and a failing process exit code.
- The counter inventory covers only `ReferenceCountry`, `AdministrativeRegion`, `ReferenceCity`, `InternationalTest`, `Major`, `University`, `Scholarship`, `ImportBatch`, `ImportRecord` and `AuditRecord`.
- Persisted platform domains added later — including learning/courses, certificates, student workspace, CMS, AI, finance, services, careers and other owner-domain records — are not represented in the baseline counter set.
- This is distinct from `MNT-AUD-0041` (schema↔migration parity), `MNT-AUD-0042` (real PostgreSQL validation coverage), `MNT-AUD-0066` (DR/backup source closure) and `MNT-AUD-0079` (rollback artifact gate). The defect here is the **truthfulness and completeness of the baseline evidence itself**.

**Impact:**
- A recovery or migration window can capture a baseline that appears structurally valid while the authoritative migration ledger was unreadable.
- `UNAVAILABLE` counters can be mistaken for acceptable evidence instead of a baseline failure.
- Before/after data-preservation proof is incomplete for large parts of the persisted platform, so a deployment/recovery decision can be made from a partial snapshot.
- The current command cannot be treated as a fail-closed recovery evidence gate.

**Required remediation:**
1. Fail closed if `_prisma_migrations` cannot be read or parsed; never reinterpret a ledger error as “zero migrations”.
2. Define an authoritative baseline counter/consistency manifest covering every persisted owner domain that matters to recovery and launch safety.
3. Fail the baseline if any required counter/integrity probe is `UNAVAILABLE`; allow optional probes only through explicit classification.
4. Include database identity, timestamp, schema hash, migration-chain hash and command/version metadata in the baseline artifact.
5. Add before/after comparison logic with explicit tolerances and expected mutation declarations rather than comparing raw output manually.
6. Add tests for missing `_prisma_migrations`, permission denial, missing tables, partial-schema databases and unavailable counters.
7. Reconcile the recovery/DR runbooks so the strengthened baseline is mandatory before and after migration/restore operations.

**Repair Wave:** W0 / W1 / W6 / W7  
**Status:** OPEN — DATABASE_BASELINE_EVIDENCE_IS_NOT_FAIL_CLOSED_OR_PLATFORM_COMPLETE

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0035"></a>

### مهمة 33 — MNT-AUD-0035 — W2 / P1

**المالك المقترح:** Domain Backend + Database  
**حالة التنفيذ:** SOURCE_IMPLEMENTED_REFERENCE_DATA_BLOCKED — راجع دليل W2 المضاف بتاريخ 2026-09-06.
**التبعيات:** MNT-AUD-0041، MNT-AUD-0083.

#### MNT-AUD-0035 — P1 HIGH — No Canonical Greenfield Database Seed/Bootstrap Orchestrator Exists
**Categories:** DATA_MODEL / PRISMA / CONFIG / DEVOPS / MISSING_IMPLEMENTATION / DOCUMENTATION_DRIFT / SOURCE_CLOSURE

**Evidence:**
- The repository contains a substantial ordered Prisma migration history and runtime runbooks correctly reference `prisma migrate deploy` for target environments.
- Root `package.json` exposes Prisma generate/push/migrate-dev/studio and many domain-specific dry-run/verification commands, but no canonical `db:seed`, `db:bootstrap`, or greenfield provisioning/initialization command.
- `packages/infrastructure/prisma/` contains `schema.prisma`, `schema_full.sql`, and migrations, but no canonical Prisma `seed.ts` entry point.
- Seed operations exist as disconnected scripts/capabilities such as `scripts/seed-taxonomy.ts`, `scripts/seed-degree-levels.ts`, `scripts/seed-external-course-providers.ts`, reference-data seed application services, and provider seed migrations.
- Active architecture script-organization documentation gives `/scripts/db/seed-database.ts` and a `db:seed` package script as the standard example, but that canonical source path/script is not present.
- The approved project lifecycle requires a newly provisioned database to be connected only after Source Complete, with migrations/seeds already authored and executable without Google Studio developing missing logic.

**Impact:**
- A brand-new PostgreSQL instance cannot be deterministically initialized from one authoritative source contract.
- Required seed ordering, idempotency, mandatory vs optional seeds, reference/taxonomy/bootstrap prerequisites, failure/retry semantics and completion evidence are ambiguous.
- Google Studio/runtime provisioning could produce a schema-valid but semantically unusable database, or require manual ad-hoc commands/knowledge, violating the source-first lifecycle.

**Required remediation:**
1. Define a canonical `db:provision` / `db:seed` orchestration contract for a NEW database, distinct from later migrations/backfills/recovery.
2. Orchestrator must run only after reviewed `prisma migrate deploy`, under the new greenfield mutation/provisioning gate that replaces MNT-AUD-0001 recovery semantics.
3. Declare an explicit ordered seed manifest covering mandatory platform bootstrap data: reference standards, degree/taxonomy baselines, required provider registries, default governed configuration/roles where appropriate, and every domain prerequisite approved for launch.
4. Every seed must be deterministic, idempotent, versioned/provenanced and safe to re-run; large catalog imports remain separate controlled import workflows rather than being hidden inside schema seeding.
5. Add validation/reconciliation output proving expected mandatory seed sets/counts/versions and zero unresolved prerequisite failures.
6. Add root package commands with unambiguous names (`db:migrate:deploy`, `db:seed`, `db:provision:verify`) and keep destructive/dev commands explicitly development-scoped.
7. Add Google Studio greenfield runbook sequence and source tests for the manifest/order/gates.
8. Retire or correct documentation pointing to nonexistent seed paths.

**Repair Wave:** W0 / W2 / W6 / W7
**Status:** OPEN — GREENFIELD_PROVISIONING_SOURCE_INCOMPLETE


#### Live Register Update — v0.13 (2026-09-06)
- Confirmed findings: **35**
- P0: 0 | P1: **26** | P2: 8 | P3: 1 | P4: 0
- Added `MNT-AUD-0035` — canonical greenfield seed/bootstrap orchestration is missing.
- A4 Data Architecture / greenfield provisioning audit is now active.

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0013"></a>

### مهمة 34 — MNT-AUD-0013 — W2 / P1

**المالك المقترح:** Domain Backend + Database  
**حالة التنفيذ:** SOURCE_VERIFIED_DB_RUNTIME_PENDING — راجع دليل W2 المضاف بتاريخ 2026-09-06.
**التبعيات:** MNT-AUD-0035.

#### MNT-AUD-0013 — Phase 07 Canonical Reference Lifecycle, Versioning, Supersession, and Alias Contract Is Not Implemented by the Current Runtime Data Model

- **Discovered:** 2026-09-06
- **Phase:** P07 Global Reference Data
- **Subsystem:** Canonical Reference Governance
- **Category:** `DOMAIN_MODEL` / `DATA_MODEL` / `RELATIONSHIP` / `DOCUMENTATION_DRIFT`
- **Severity:** **P1 — HIGH**
- **Scope:** SOURCE
- **Status:** OPEN
- **Evidence:** P07 authoritative domain/architecture documents define explicit lifecycle state, aliases, supersession and version/effective-history semantics. Current `ReferenceDataContracts.ts` exposes `isActive` plus opaque `metadata`; the Prisma repository performs direct upserts and resolves aliases/provider mappings from metadata JSON. No active `ReferenceCountryVersion` / `ReferenceCurrencyVersion` / `ReferenceLanguageVersion` / `ReferenceCityVersion` source model was found.
- **Expected Behavior:** Canonical reference records must preserve governed lifecycle and immutable history rather than collapse lifecycle to a boolean and hide identity mappings in opaque metadata.
- **Impact:** All downstream domains consume P07 identity. Missing supersession/version history makes canonical changes, historical resolution, merge/deprecation and audit-safe imports structurally incomplete.
- **Required Action:** Reconcile the active P07 model with the approved contract: typed lifecycle state, supersession/merge semantics, explicit alias/provider mapping ownership, version/effective history, migration strategy, API/Admin behavior and tests.
- **Fix Wave:** W2/W4 (Reference first).

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0030"></a>

### مهمة 35 — MNT-AUD-0030 — W2 / P1

**المالك المقترح:** Domain Backend + Database  
**حالة التنفيذ:** SOURCE_VERIFIED — راجع دليل W2 المضاف بتاريخ 2026-09-06.
**التبعيات:** MNT-AUD-0013.

#### MNT-AUD-0030 — P1 HIGH — Asset Reference Integrity Is Not Enforced Consistently Across Consumer Phases
**Categories:** ASSET / RELATIONSHIP / SECURITY / CROSS_PHASE / BUSINESS_LOGIC

**Evidence:**
- P13 Course curriculum resolves the referenced Asset through the P05 repository and requires an `ACTIVE` lifecycle state before attachment.
- P16 CMS `ensureAssetHandles()` only invokes `CmsPublishingPolicy.assertAssetHandle`, which rejects raw URL/path shapes but does not resolve the Asset or verify lifecycle/state/ownership.
- P15 Student Workspace similarly rejects raw avatar URLs but has no P05 Asset lookup dependency and does not verify that `avatarAssetId` exists or is ACTIVE.
- P23 currently accepts those IDs as manually typed values (see MNT-AUD-0026).

**Impact:** A syntactically valid but nonexistent, quarantined, malware-failed, archived, deleted or unauthorized AssetId can be persisted by some consumer domains. This can create broken public/private media references and bypass the intended EAP trust boundary.

**Required remediation:**
1. Define one canonical P05 `AssetReferenceResolver/Policy` contract for consuming phases.
2. Require existence + allowed lifecycle + security classification + intended owner/role checks at authoring/publish/use boundaries.
3. Apply consistently to P15 avatars, P16 featured/attachment/OG assets, P14 rendered artifacts, P11 university media, P12 documents/media, P21 portfolio/resume media and every other AssetId consumer found by the final sweep.
4. Preserve loose cross-domain coupling through a gateway/read contract rather than direct Prisma access.
5. Add invalid/nonexistent/quarantined/deleted/ownership-mismatch tests.

**Repair Wave:** W3 / W4 / W5
**Status:** OPEN — REQUIRES_ENTERPRISE_ASSET_REFERENCE_SWEEP


#### Live Register Update — v0.8 (2026-09-06)
- Confirmed findings: **30**
- P0: 0 | P1: **21** | P2: 8 | P3: 1 | P4: 0
- Added `MNT-AUD-0030` enterprise AssetId integrity finding.
- Cross-phase Asset/EAP sweep remains in progress.

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0050"></a>

### مهمة 36 — MNT-AUD-0050 — W2 / P1

**المالك المقترح:** Domain Backend + Database  
**حالة التنفيذ:** SOURCE_VERIFIED — راجع دليل W2 المضاف بتاريخ 2026-09-06.
**التبعيات:** MNT-AUD-0030.

#### MNT-AUD-0050 — P1 HIGH — Active Asset Purge Route Cannot Enforce Usage Safety Because AssetUsageRegistry Is UNAVAILABLE
**Categories:** ASSET / DATA_INTEGRITY / DELETION / RELATIONSHIP / PHASE05 / SOURCE_CLOSURE

**Evidence:**
- `ProcessAssetLifecycleUseCase.purgeAsset()` requires `IAssetUsageRegistryGateway.isAssetInUse(assetId)` before physical deletion and permanent purge.
- `AssetPlatformRouter` exposes and invokes the purge lifecycle operation and records a `PURGE_ASSET` audit mutation.
- Active DI registers `assetUsageRegistryGateway` as `createUnavailableCapability('assetUsageRegistry')`.
- The domain/application contract therefore requires a cross-domain usage check that the production-like composition cannot perform.
- This is distinct from `MNT-AUD-0030` (consumers inconsistently validate asset references) and `MNT-AUD-0038` (production storage/scanning/sanitization providers missing): this finding concerns the destructive-delete reference-protection boundary itself.

**Impact:**
- Governed purge is non-operational in production-like composition and cannot prove referential safety.
- If a future adapter bypasses fail-closed behavior without a complete registry, physical asset deletion could orphan consumer references.
- Admin/API lifecycle completeness is overstated while the central destructive invariant is unavailable.

**Required remediation:**
1. Implement a canonical durable asset-usage registry or an owner-query aggregation that covers every AssetId-consuming domain.
2. Register/unregister usage transactionally with consumer lifecycle mutations, or derive usage from authoritative relational references where appropriate.
3. Keep purge fail-closed when usage authority is unavailable or incomplete.
4. Add cross-domain tests proving an in-use asset cannot be purged and an unused eligible asset can be purged safely.
5. Reconcile all consumer domains discovered under `MNT-AUD-0030` with the purge registry coverage matrix.
6. Add a launch gate for Asset usage-registry completeness before enabling permanent purge in production.

**Repair Wave:** W3 / W5 / W6  
**Status:** OPEN — ASSET_PURGE_USAGE_AUTHORITY_UNAVAILABLE

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0049"></a>

### مهمة 37 — MNT-AUD-0049 — W2 / P1

**المالك المقترح:** Domain Backend + Database  
**حالة التنفيذ:** SOURCE_VERIFIED — راجع دليل W2 المضاف بتاريخ 2026-09-06.
**التبعيات:** MNT-AUD-0095.

#### MNT-AUD-0049 — P1 HIGH — Mounted Phase 05 Control-Plane APIs Depend on Repositories Registered as UNAVAILABLE
**Categories:** PHASE05 / API / WORKFLOW / SHARED_COMPONENTS / CONTROL_PLANE / PERSISTENCE / SOURCE_CLOSURE

**Evidence:**
- The live application mounts protected `/workflows`, `/api-services` and `/shared-components` control-plane routes.
- `WorkflowRouter` invokes `ManageWorkflowsUseCase`; `ApiFoundationRouter` exposes create/list/get/activate/deprecate/archive/publish-version operations; `SharedComponentRouter` exposes create/activate/version/deprecate/archive operations.
- The active DI composition registers `workflowRepo` as `createUnavailableCapability('workflowPersistence')`, `apiServiceRepo` as `createUnavailableCapability('apiServicePersistence')`, and `sharedComponentRepo` as `createUnavailableCapability('sharedComponentPersistence')`.
- Those unavailable repositories are injected directly into the mounted use cases.
- Phase 05 historical traceability describes these systems as in-memory/dummy/deferred; current composition has moved to explicit fail-closed UNAVAILABLE rather than providing durable production persistence.

**Impact:**
- Protected routes are structurally present but their core business operations cannot provide an operational production-like control plane.
- Admin/API route existence can be mistaken for implemented capability even though the persistence authority is absent.
- Workflow/API Foundation/Shared Components lifecycle operations cannot satisfy source-complete behavior in production-like composition.

**Required remediation:**
1. Decide per capability whether it is required for the current launch baseline or formally deferred and unmounted.
2. For required capabilities, implement durable owner repositories and production-safe gateways, wire them in DI, migrations and tests.
3. For deferred capabilities, remove/disable mounted operational routes and admin affordances or expose an explicit capability-unavailable contract rather than presenting mutable CRUD endpoints.
4. Replace generated/dummy domain authority for required capabilities with real owner-domain contracts.
5. Add integration/source composition tests proving every mounted mutating control-plane route resolves to an operational durable dependency in production-like mode.
6. Reconcile Phase 05 traceability, P23 control-plane documentation and launch-readiness matrices.

**Repair Wave:** W1 / W3 / W5 / W6  
**Status:** OPEN — MOUNTED_CONTROL_PLANE_DEPENDS_ON_UNAVAILABLE_PERSISTENCE

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0091"></a>

### مهمة 38 — MNT-AUD-0091 — W2 / P1

**المالك المقترح:** Domain Backend + Database  
**حالة التنفيذ:** SOURCE_VERIFIED — راجع دليل W2 المضاف بتاريخ 2026-09-06.
**التبعيات:** MNT-AUD-0095.

#### MNT-AUD-0091 — P1 HIGH — Phase 20 Service and Phase 21 Career Canonicalization Is ASCII-Only, Breaking Arabic Identity, Deduplication and Slug Semantics
**Categories:** P20 / P21 / ARABIC / UNICODE / NORMALIZATION / DEDUPLICATION / SLUG / DATA_INTEGRITY / I18N / SOURCE_CLOSURE

**Evidence:**
- `AdminServiceCatalogUseCases.normalizeServiceName()` removes every character outside `[a-z0-9\\s]` after lower-casing and marketing-word removal.
- `CareerAdminUseCases.normalizeText()` uses the same ASCII-only character class.
- For an Arabic-only Phase 20 service name, `canonicalName` therefore becomes an empty string. The service is not rejected; its dedup key becomes effectively `|serviceCategory|fulfillmentType|deliveryMode`, and `slugify()` falls back to `service` before appending the hash.
- Consequently two different Arabic service names with the same category/fulfillment/delivery tuple can collapse onto the same canonical dedup identity and be treated as duplicates.
- For an Arabic-only Career employer, `createEmployer()` computes the empty canonical name and then throws `Employer displayName is required` even though the submitted Arabic `displayName` is non-empty.
- For Arabic-only Career job titles, `canonicalTitle` becomes empty and the dedup key loses the title dimension; `slugify()` falls back to `career`.
- The existing Career unit tests use English employer/job names (`Tech Company`, `Software Engineer`, etc.) and do not exercise Arabic or general Unicode canonicalization.
- Repository search for this ASCII-only normalization pattern found it in the Phase 20 Service and Phase 21 Career use cases, making this a cross-late-domain implementation defect rather than an isolated UI-copy issue.

**Impact:**
- Arabic employer records can be impossible to create through the canonical Career application service.
- Distinct Arabic job opportunities can collide because their title identity is erased before deduplication.
- Distinct Arabic service names can collide and be rejected as duplicates based only on non-name dimensions.
- Canonical names/slugs become semantically meaningless for the platform's primary Arabic language and can damage deep links, search, imports and cross-domain references.
- This is a data-integrity defect: once incorrect canonical/dedup keys are persisted, later remediation may require controlled re-key/backfill and collision resolution.

**Required remediation:**
1. Replace ASCII-only normalization with a shared Unicode-aware canonicalization service using explicit normalization form (for example NFKC/NFC as approved), Unicode letter/number classes and locale-independent case handling.
2. Define Arabic normalization rules deliberately: whitespace, tatweel/diacritics policy, Arabic letter variants and punctuation must be decided by the Reference/i18n architecture rather than stripped implicitly.
3. Separate human-readable slug generation from dedup identity; use stable public IDs and a Unicode/transliteration slug policy that cannot erase the entire name.
4. Add Arabic and multilingual unit/property tests for Service and Career create/update/dedup flows, including two distinct Arabic names under identical non-name dimensions.
5. Audit already staged/persisted records after the database recovery gate for empty/degenerate `canonicalName`, `canonicalTitle`, dedup keys and fallback-only slugs.
6. Build a collision-safe remediation/backfill plan before changing canonical keys on any existing database.
7. Add a source guard prohibiting ad-hoc ASCII-only identity normalizers in owner domains.

**Repair Wave:** W0 / W2 / W4 / W6 / W7  
**Status:** OPEN — ASCII_ONLY_CANONICALIZATION_BREAKS_ARABIC_SERVICE_AND_CAREER_IDENTITY

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0058"></a>

### مهمة 39 — MNT-AUD-0058 — W2 / P1

**المالك المقترح:** Domain Backend + Database  
**حالة التنفيذ:** OWNER_SOURCE_VERIFIED_LATER_WAVE_COMPOSITION — راجع دليل W2 المضاف بتاريخ 2026-09-06.
**التبعيات:** بوابة الموجة السابقة؛ راجع التبعيات التاريخية أدناه قبل التنفيذ.

#### MNT-AUD-0058 — P1 HIGH — Phase 20 Owner Source Implements Only Catalog + Service Requests While Canonical Phase Scope Requires Packages, Bookings, Scheduling, Providers, Pricing, Discounts, Promotions and Workflow/Delivery Engines
**Categories:** PHASE20 / SERVICES / MISSING_IMPLEMENTATION / DOMAIN / APPLICATION / PERSISTENCE / WORKFLOW / BOOKING / PROVIDER / PRICING / SOURCE_CLOSURE

**Evidence:**
- Active Phase 20 domain contracts explicitly assign Phase 20 ownership of Services, Service Packages, Bookings, Scheduling, Providers, Pricing, Discounts, Promotions and Service Workflows.
- The active Phase 20 implementation blueprint specifies modules/repositories/application services for Package, Booking, Scheduling, Pricing, Discount, Promotion, Provider and Workflow, plus background workers for SLA monitoring, reminders and escalations.
- `packages/domain/src/services-platform/index.ts` currently exposes only the service catalog, service requests, reference gateway and finance gateway as the material owner-domain contract.
- `packages/application/src/services-platform/use-cases/` contains only Admin Catalog, Public Catalog and Service Request/Fulfillment use cases.
- `packages/infrastructure/src/services-platform/` contains only `PrismaServicePlatformRepository.ts`, `ServicePlatformGateways.ts` and the index barrel.
- Repository-wide searches for the canonical `IServiceBooking` and `IServiceProvider` owner contracts find them in Phase 20 documentation but not in active owner implementation.
- The live request flow stores `providerReferenceId` as an unconstrained reference string, but no Phase 20 provider aggregate/repository exists to implement provider qualification, availability, capacity or assignment accountability defined by the phase.
- The current repository can transition a request through a small fixed status graph and link a Phase 19 invoice, but there is no configurable workflow engine, booking collision engine, package child-order orchestration, discount/promotion engine or delivery-quality acceptance model matching the active phase baseline.

**Impact:**
- Phase 20 cannot be classified source-complete against its own approved bounded-context contract.
- Published services can exist and requests can be created, but multiple core fulfillment capabilities promised by the phase are structurally absent rather than merely runtime-unverified.
- Provider accountability, immutable pricing, booking collision prevention, package fulfillment and workflow/SLA behavior cannot be guaranteed by the current owner source.
- P23/P24 may expose a partial Services experience while governance documents describe a complete Enterprise Services Platform.

**Required remediation:**
1. Reconcile the exact Phase 20 launch scope against the canonical architecture/domain/implementation documents.
2. If the documented scope remains authoritative, implement first-class aggregates/contracts for Package, Booking/Scheduling, Provider, Pricing/Discount/Promotion and Workflow/Execution/Delivery.
3. Add corresponding Prisma models/migrations/repositories and governed application services.
4. Enforce provider qualification/capacity/availability, booking collision/timezone rules, pricing immutability and package parent-child fulfillment invariants.
5. Integrate delivery artifacts exclusively through Phase 05 EAP `assetId` handles and usage registration.
6. Add SLA workers/escalations and health/readiness ownership for all asynchronous fulfillment functions.
7. Add Admin/Public/Student flows only through Phase 20 owner APIs; do not create UI-local shadow business models.
8. Expand source and real-DB/E2E closure gates to cover every retained in-scope sub-capability.
9. If capabilities are formally deferred, downgrade/rewrite Phase 20 canonical documentation and status reports so they no longer claim them as implemented Production Ready scope.

**Repair Wave:** W1 / W2 / W3 / W4 / W5 / W6 / W7  
**Status:** OPEN — PHASE20_OWNER_SCOPE_MATERIALLY_PARTIAL

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0055"></a>

### مهمة 40 — MNT-AUD-0055 — W2 / P1

**المالك المقترح:** Domain Backend + Database  
**حالة التنفيذ:** OWNER_SOURCE_VERIFIED_LATER_WAVE_COMPOSITION — راجع دليل W2 المضاف بتاريخ 2026-09-06.
**التبعيات:** بوابة الموجة السابقة؛ راجع التبعيات التاريخية أدناه قبل التنفيذ.

#### MNT-AUD-0055 — P1 HIGH — Phase 21 Career & Alumni Source Implements Employer/Job Posting Slice but Omits Core Applications, CV, Alumni and Career-Profile Scope
**Categories:** PHASE21 / CAREER / ALUMNI / APPLICATIONS / ASSET / STUDENT / ADMIN / PUBLIC / MISSING_IMPLEMENTATION / SOURCE_CLOSURE

**Evidence:**
- The authoritative audit scope for Phase 21 includes profiles, opportunities, alumni/career relations, permissions, workflows and integrations.
- The active `ICareerRepository` contract contains only employer and job-posting operations: employer CRUD/list, job CRUD/status/list/published-list.
- `PrismaCareerRepository` likewise persists only employer and job-posting records.
- Phase 21 domain/implementation documentation defines job applications with a submitted Phase 05 EAP resume/CV asset handle and an application service for submitting applications and changing application status.
- Phase 21 implementation documentation also specifies career-profile updates, resume updates, application snapshots and recruitment workflow state changes.
- The Phase 21/P23 alignment report claims a complete/verified workspace including applications/CVs, alumni profiles and related analytics/workflows, but the active owner-domain repository has no corresponding application/alumni/profile persistence contract.
- Repository search for active career-application implementation does not reveal an owner-domain application repository/model/use-case equivalent; the current jobs source-closure verifier concentrates on employer/job-posting behavior.
- Legacy careers preview components named by older alignment documentation have already been intentionally removed by the current jobs source verifier, confirming that the historical UI report is not current operational evidence.

**Impact:**
- Phase 21 is not source-complete against its documented bounded-context scope.
- A student can browse published career opportunities, but the owner-domain source does not provide the documented end-to-end application/CV/alumni/profile lifecycle.
- P23 cannot truthfully provide applications/alumni administration backed by Phase 21 ownership for functionality that is absent from the owner contract.
- The Phase 05 Asset relationship for submitted CVs and the Phase 15 Student relationship for candidate/profile ownership are not source-closed for these missing flows.
- Existing `PASS_WITH_FINDINGS` wording understated the degree of missing implementation.

**Required remediation:**
1. Reconcile the exact launch scope for Phase 21 against the canonical roadmap/phase specifications; do not rely on historical preview reports.
2. If applications/alumni/profile capabilities remain in scope, implement first-class domain entities/contracts for career profiles, job applications and alumni visibility/profile state.
3. Add Prisma schema/migrations/repositories and governed use cases for submit/withdraw/review/shortlist/reject/accept lifecycle as applicable.
4. Integrate submitted CV/resume through Phase 05 EAP AssetId handles with reference validation and usage-registry participation; no raw file URLs.
5. Bind applicant/profile ownership to Phase 15/Identity through explicit owner gateways and enforce privacy/consent for alumni visibility.
6. Add P23 Admin queues/detail actions and P24/Student flows only through Phase 21 owner APIs; no shadow storage.
7. Add audit/event/idempotency semantics and real DB/E2E coverage for application lifecycle and privacy boundaries.
8. Expand the Phase 21 verifier to cover every in-scope sub-capability, not only employers/jobs.
9. If any capability is formally deferred, update the canonical roadmap, Phase 21 docs, P23 contracts and implementation-status reports so they do not claim completion.

**Repair Wave:** W1 / W2 / W3 / W5 / W6 / W7  
**Status:** OPEN — PHASE21_CORE_SCOPE_PARTIALLY_MISSING

### Evidence Addendum — Existing MNT-AUD-0043 Environment Contract Drift Extends to P17/P18 Runtime Secrets
This batch does **not** create another duplicate finding for the same root cause. The following evidence is attached to `MNT-AUD-0043`:
- Phase 17 async payload protection is wired to `AI_ASYNC_PAYLOAD_KEY`.
- Phase 18 transient result protection is wired to `STUDENT_TOOL_RESULT_KEY`.
- Phase 18 anonymous tool-session integrity is wired to `STUDENT_TOOL_ANONYMOUS_SESSION_SECRET`.
- Current source/governance documents identify these as runtime requirements; they must be reconciled into one canonical environment/schema/runbook/readiness contract under the existing configuration-drift remediation.

#### Live Register Update — v0.28 (2026-09-06)
- Confirmed findings: **55**
- P0: 0 | P1: **42** | P2: **12** | P3: 1 | P4: 0
- Added `MNT-AUD-0054` and `MNT-AUD-0055`.
- Extended evidence for existing `MNT-AUD-0043`; no duplicate finding created.
- Corrected the Phase 22 continuation scope to **Enterprise Product Experience** rather than analytics ownership.
- No source implementation repairs were executed.
- Project decision remains: **SOURCE_NOT_COMPLETE — AUDIT_IN_PROGRESS**.

### Updated continuation sequence before remediation
1. Phase 18: finish all 83 registry-entry scope reconciliation, four executable tools, anonymous/requester security, result retention/encryption and dependency-readiness boundaries.
2. Phase 19: finish finance transport/webhook/reconciliation/refund/ledger/config forensic pass without duplicating existing provider-transport finding.
3. Phase 20: verify service request lifecycle, owner permissions, Phase 19 invoice/payment clearance boundary, canonical references and Admin/Public/Student flows.
4. Phase 21: after `MNT-AUD-0055`, inventory every missing application/alumni/profile source artifact and reconcile exact launch scope.
5. Phase 22 Product Experience: navigation, personalization, progressive access, design-system consistency, accessibility, SEO/performance and cross-product experience.
6. P23/P24: route-by-route Admin/Public capability, truthfulness, SEO/i18n/search and owner-domain enforcement.
7. Security: Authentication/Authorization/CSRF/SSRF/files/secrets/injection/rate limits/PII/privileged operations.
8. Prisma/migrations: schema↔migration parity, FK/unique/index/delete/default/nullability/enums/recovery.
9. Events/workers/jobs: all producers/consumers/schedulers/retries/leases/DLQ/shutdown/multi-instance behavior, including Phase 17 async execution.
10. File-by-file closure: active vs historical docs/scripts, broken paths, generated/dummy authority, dead/orphan code, TODO/FIXME/HACK, duplicates.
11. Final reconciliation: merge duplicate root causes, freeze the final finding count/repair dependency graph and only then transition to remediation.

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0075"></a>

### مهمة 41 — MNT-AUD-0075 — W2 / P2

**المالك المقترح:** Domain Backend + Database  
**حالة التنفيذ:** SOURCE_VERIFIED — راجع دليل W2 المضاف بتاريخ 2026-09-06.
**التبعيات:** بوابة الموجة السابقة؛ راجع التبعيات التاريخية أدناه قبل التنفيذ.

#### MNT-AUD-0075 — P2 MEDIUM — Root Prisma Mutation Commands Bypass the Reviewed Database Remediation/Recovery Gate
**Categories:** DATABASE / PRISMA / MIGRATIONS / OPERATIONS / SAFETY / RECOVERY / GOVERNANCE / SCHEMA_DRIFT

**Evidence:**
- The repository contains a reviewed remediation gate (`scripts/db-remediation-gate.ts`) whose mutation path requires both `WP1_RECOVERY_GATE=CLOSED` and `ALLOW_DATABASE_MUTATIONS=YES` before deployment.
- CI/source Prisma validation intentionally runs only `validate` and `generate` with database mutations disabled.
- Root `package.json` nevertheless exposes `db:push` as direct `prisma db push --schema=...` and `db:migrate` as direct `prisma migrate dev --schema=...`.
- Those commands do not call the remediation gate, do not require the recovery flags, do not establish backup/restore evidence, and do not distinguish disposable development databases from staging/production targets.
- `prisma db push` can alter a target schema without creating/reconciling migration history, while `prisma migrate dev` is a development workflow rather than the controlled deployment path already authored for remediation.
- Existing source verifiers correctly prove CI does not run these commands; that does not prevent an operator/automation from invoking the unguarded root scripts directly against an externally supplied `DATABASE_URL`.

**Impact:**
- A high-privilege operator or accidental automation can bypass the project’s own Recovery Gate and mutate a database outside the reviewed migration/rollback evidence chain.
- `db:push` can create schema ↔ migration-history drift that later undermines greenfield parity, rollback and incident recovery.
- The existence of both a strict gate and unrestricted convenience commands creates contradictory operational authority.

**Required remediation:**
1. Remove or rename direct root mutation commands so their development/disposable-only purpose is explicit.
2. Wrap any retained `db:push` / `migrate dev` convenience command in a target guard that refuses production/staging and requires an unmistakable disposable/local database classification.
3. Make the reviewed deployment gate the sole supported path for controlled shared/staging/production migration execution.
4. Require pre-mutation backup/recovery evidence and post-migration status/parity evidence in the governed deploy path.
5. Add CI/source guards rejecting newly introduced unguarded root Prisma mutation commands.
6. Document the distinction between schema validation/generation, disposable developer migration generation and controlled deployment.
7. Reconcile this safety finding with `MNT-AUD-0041` (migration-chain parity) without merging the distinct root causes.

**Repair Wave:** W0 / W1 / W6 / W7  
**Status:** OPEN — UNGUARDED_ROOT_PRISMA_MUTATION_COMMANDS_BYPASS_RECOVERY_GATE

### Live Register Update — v0.38 (2026-09-06)

- Registered finding IDs allocated: **75** (`MNT-AUD-0001` → `MNT-AUD-0075`).
- Duplicate/evidence-alias IDs excluded from canonical count: **3** (`0038`, `0039`, `0053`).
- **Canonical unique confirmed findings: 72**
- Severity (canonical unique): **P0: 0 | P1: 53 | P2: 18 | P3: 1 | P4: 0**
- Findings incorporated since the previous numbered live register: `MNT-AUD-0072`, `MNT-AUD-0073`, `MNT-AUD-0074`, `MNT-AUD-0075`.
- Authentication-specific account/account+IP rate limiting, salted scrypt verification, JWT algorithm/type/issuer/audience validation, global CSRF, production CORS/proxy guardrails and cookie flags were positively verified; no blanket duplicate security finding was added.
- Phase 15 Student Workspace active-session validation is wired to `PrismaSessionManager`; `MNT-AUD-0071` remains specifically refresh-token rotation concurrency.
- Prisma source CI remains non-mutating (`validate`/`generate` only); `MNT-AUD-0075` concerns the contradictory unguarded operator commands in the root manifest.
- No source/code repair, migration, backfill, seed, database mutation or production runtime change has been executed.
- Frozen audit baseline remains `0931c5664cf274cb2b8f4cb250dd09ebf2e9a77f`.
- Project decision remains: **SOURCE_NOT_COMPLETE — AUDIT_IN_PROGRESS**.

### Next mandatory continuation after v0.38
1. Complete P23 Admin page/action → backend permission → audit → owner-domain parity for review/import/settings/platform operations.
2. Complete P24 route/deep-link/action parity beyond Compare, course origin, prototype mode, Saved Items and application tracking.
3. Complete observability/logging/metrics/health truthfulness and graceful drain/startup reconciliation without duplicating existing lifecycle findings.
4. Complete migration/data-integrity review: migration ordering, rollback artifacts, destructive SQL, constraints/indexes, greenfield parity and data-retention jobs.
5. Complete event producer/consumer orphan matrix and scheduler/worker matrix across all phases.
6. Complete CI/verifier/source-authority and documentation reconciliation, then perform final root-cause deduplication before any remediation begins.

## Repository Completion Audit — Identity Lifecycle Session Invalidation + Finance Recovery Reconciliation (v0.39 — 2026-09-06)

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0079"></a>

### مهمة 42 — MNT-AUD-0079 — W2 / P2

**المالك المقترح:** Domain Backend + Database  
**حالة التنفيذ:** SOURCE_VERIFIED — راجع دليل W2 المضاف بتاريخ 2026-09-06.
**التبعيات:** بوابة الموجة السابقة؛ راجع التبعيات التاريخية أدناه قبل التنفيذ.

#### MNT-AUD-0079 — P2 MEDIUM — Database Rollback-Plan Gate Does Not Require Rollback/Recovery Artifacts for the Migration Chain It Reports
**Categories:** DATABASE / MIGRATIONS / ROLLBACK / RECOVERY / GOVERNANCE / DEPLOYMENT / SAFETY / FALSE_GATE

**Evidence:**
- `scripts/db-remediation-gate.ts` inventories every Prisma migration and records whether a sibling `rollback.sql` exists.
- In `rollback-plan` mode, however, the status condition is `migrations.every(item => item.rollback || !item.id.includes('transactional_outbox'))`.
- That condition requires an explicit rollback artifact only for migration IDs containing `transactional_outbox`; any differently named migration satisfies the expression even when `rollback` is null.
- The plan can therefore return `REVIEW_REQUIRED` instead of `ROLLBACK_ARTIFACT_MISSING` while migration entries outside that one filename pattern have no reverse/recovery artifact.
- Repository search surfaced explicit rollback SQL for transactional-outbox and enterprise-event durability migrations while the Prisma migration inventory contains many additional domain migrations.
- The project's deployment/recovery governance requires deterministic rollback compatibility or an explicitly reviewed backup/forward-fix recovery strategy; the current rollback-plan status does not prove either across the candidate chain.

**Impact:**
- Operators/reviewers can receive a misleading rollback-plan result that does not establish recoverability for the actual set of migrations being deployed.
- A migration may be reviewed under a nominal rollback gate without reverse SQL, forward-fix classification, or backup/restore recovery instructions.
- This is distinct from `MNT-AUD-0041` (greenfield migration-chain/schema parity), `MNT-AUD-0066` (production backup/DR execution) and `MNT-AUD-0075` (unguarded root mutation commands).

**Required remediation:**
1. Define a recovery class for every migration: reversible SQL, forward-fix-only with compatibility contract, or non-reversible/data migration requiring backup/restore recovery.
2. Make `rollback-plan` validate every migration in the candidate deployment window rather than a hard-coded filename substring.
3. Fail closed when a required rollback/recovery artifact or classification is absent.
4. Include migration hash, rollback/recovery artifact hash, compatibility class and reviewer decision in deployment evidence.
5. Add tests using multiple migration names proving missing artifacts cannot be reported as review-ready.
6. Keep destructive rollback rehearsal restricted to disposable/restored copies and never execute it automatically against production.
7. Reconcile active deployment-strategy rollback claims with the actual Prisma migration governance model.

**Repair Wave:** W0 / W1 / W6 / W7  
**Status:** OPEN — ROLLBACK_PLAN_GATE_DOES_NOT_VALIDATE_FULL_MIGRATION_CHAIN

### Audit Register Reconciliation — v0.41 (2026-09-06)

- During continuation, a temporary numbering collision was detected before finalization: the repository audit had already advanced through `MNT-AUD-0078` while a newly drafted telemetry finding reused an older number.
- The duplicate telemetry draft was removed because its root cause is already canonically represented by `MNT-AUD-0078`.
- The genuinely new rollback-gate finding was renumbered to `MNT-AUD-0079`.
- Registered finding IDs allocated: **79** (`MNT-AUD-0001` → `MNT-AUD-0079`).
- Duplicate/evidence-alias IDs excluded from canonical count remain: **3** (`MNT-AUD-0038`, `MNT-AUD-0039`, `MNT-AUD-0053`).
- **Canonical unique confirmed findings: 76**.
- Severity (canonical unique): **P0: 0 | P1: 56 | P2: 19 | P3: 1 | P4: 0**.
- No source/code repair, migration, rollback, database mutation or production runtime change has been executed.
- Frozen audit baseline remains `0931c5664cf274cb2b8f4cb250dd09ebf2e9a77f`.
- Project decision remains: **SOURCE_NOT_COMPLETE — AUDIT_IN_PROGRESS**.

### Next mandatory continuation after v0.41
1. Complete event producer/consumer/scheduler/worker orphan matrix across all phases.
2. Complete remaining P23/P24 action/owner parity after Saved Items, application tracker, Compare and course-origin findings.
3. Complete data-integrity/retention review beyond migration safety and greenfield parity.
4. Complete CI/verifier/document-authority reconciliation and stale/superseded artifact classification.
5. Perform final root-cause deduplication and completion matrix only after every axis is exhausted; remediation remains blocked until then.

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0057"></a>

### مهمة 43 — MNT-AUD-0057 — W2 / P2

**المالك المقترح:** Domain Backend + Database  
**حالة التنفيذ:** SOURCE_VERIFIED — راجع دليل W2 المضاف بتاريخ 2026-09-06.
**التبعيات:** بوابة الموجة السابقة؛ راجع التبعيات التاريخية أدناه قبل التنفيذ.

#### MNT-AUD-0057 — P2 MEDIUM — Persisted Domain/Public Identifiers Still Use `Math.random()` Instead of a Governed Identifier Generator
**Categories:** IDENTITY / DOMAIN_MODEL / DATA_INTEGRITY / IDENTIFIER / QUALITY

**Evidence:**
- `packages/core/src/domain/Entity.ts` creates default entity IDs from `Math.random().toString(36).substring(...)`.
- Active Identity provisioning constructs `User` and related entities without injecting governed IDs, so the default generator participates in real persisted identity graphs.
- The Identity aggregate also contains `Math.random()`-based identifier generation.
- Additional active business code, including scholarship public-ID creation, also uses `Date.now()` + `Math.random()` patterns, showing this is not isolated test-only behavior.
- The database uses application-provided string IDs for these records rather than supplying a universal database UUID default.

**Impact:**
- Persisted identifiers have weaker and inconsistent entropy/format guarantees than UUID/ULID/CSPRNG-based identifiers.
- Collision behavior and identifier predictability are not governed uniformly across domains.
- Cross-domain references, auditability and future sharding/import/reconciliation become harder when identifier semantics vary by implementation.

**Required remediation:**
1. Establish one canonical ID generation contract for persisted entities/public IDs (for example UUIDv4/UUIDv7 or an approved ULID strategy using cryptographic randomness).
2. Inject/centralize the generator at the Core/Domain boundary; do not use `Math.random()` for persisted IDs.
3. Classify which public IDs require opaque/unpredictable values versus stable human-readable references.
4. Preserve existing IDs; migration should change generation for new records without rewriting historical foreign keys unless explicitly required.
5. Add format/uniqueness/property tests and a source guard against `Math.random()` in persisted-ID constructors/commands.

**Repair Wave:** W1 / W2 / W6  
**Status:** OPEN — UNGOVERNED_NON_CRYPTO_PERSISTED_IDENTIFIER_GENERATION

### Live Register Update — v0.29 (2026-09-06)

- Registered finding IDs allocated: **57** (`MNT-AUD-0001` → `MNT-AUD-0057`).
- Duplicate/evidence-alias IDs excluded from canonical count: **3** (`0038`, `0039`, `0053`).
- **Canonical unique confirmed findings: 54**
- Severity (canonical unique): **P0: 0 | P1: 41 | P2: 12 | P3: 1 | P4: 0**
- New canonical findings in this pass: `MNT-AUD-0056`, `MNT-AUD-0057`.
- No source/code repair has been executed.
- GitHub repository modification was attempted only through an isolated audit branch, but branch creation was denied by the connected GitHub integration (`403 Resource not accessible by integration`); the repository therefore remains unchanged.
- The authoritative working audit register is updated independently and preserves the frozen commit baseline.

### Audit continuation state after v0.29

Completed/extended in this continuation:
- Phase 17 asynchronous execution ownership forensic pass.
- Phase 18 executable registry/runtime boundary spot-check and hidden runtime contract evidence.
- Phase 19 provider reality check against existing finance finding.
- Phase 21 Career/Alumni scope-to-source forensic comparison.
- Admin authentication/AI privileged gateway route guard check.
- P05 Identity type-safety and identifier-generation forensic pass.
- Duplicate-finding reconciliation for three confirmed duplicate root causes.

Still mandatory before remediation begins:
1. Finish P20 service lifecycle route-by-route parity against Phase 20 canonical contracts.
2. Finish P22 Product Experience source/UI/accessibility/SEO/performance parity.
3. Finish P23 Admin every-route/every-capability matrix and mutation/audit/permission coverage.
4. Finish P24 public every-route/data-source/pagination/filter/locale/SEO relationship matrix.
5. Finish cross-cutting Security deep audit (auth/session/cookies/CSRF/CORS/SSRF/uploads/secrets/webhooks/rate-limits).
6. Finish Prisma schema/migration/repository parity and greenfield migration-chain audit.
7. Finish Events/Outbox/Workers/Notifications/Async ownership and graceful-shutdown audit.
8. Finish Search/indexing consistency, refresh ownership and failure-mode audit.
9. Finish assets/media lifecycle + usage-registry cross-domain audit.
10. Finish Observability/Health/Readiness/Deployment/DR/backup-restore audit.
11. Finish tests/CI/verifier truthfulness and stale-reference sweep.
12. Finish documentation authority/reconciliation and file-by-file source inventory coverage.
13. Run final duplicate/root-cause reconciliation and only then freeze the remediation waves.

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0096"></a>

### مهمة 44 — MNT-AUD-0096 — W2 / P2

**المالك المقترح:** Domain Backend + Database  
**حالة التنفيذ:** SOURCE_VERIFIED — راجع دليل W2 المضاف بتاريخ 2026-09-06.
**التبعيات:** MNT-AUD-0058، MNT-AUD-0055.

#### MNT-AUD-0096 — P2 MEDIUM — Phase 20 Service and Phase 21 Career Mutable Records Have No Version-Based Concurrency/Fencing Against Lost Updates
**Categories:** DATABASE / CONCURRENCY / DATA_INTEGRITY / P20 / P21 / ADMIN / OPTIMISTIC_LOCKING / SOURCE_CLOSURE

**Evidence:**
- The approved and baselined Phase 3.5 Database Foundation requires version-based concurrency control for shared resources: persistence adapters must detect intervening modification and prevent concurrent stale overrides.
- The Phase 20 `ServiceCatalogRecord` / `ServiceRequestRecord` DDL and current Prisma persistence do not carry a `version`/revision field used for optimistic concurrency.
- `PrismaServicePlatformRepository.update(...)`, `updateStatus(...)`, `updateRequestStatus(...)`, `linkFinanceInvoice(...)` and `assignProvider(...)` update rows with `where: { id }` only; there is no expected-version predicate or compare-and-set failure path.
- Phase 20 Admin mutation DTOs/routes likewise do not carry `expectedVersion`/ETag/revision preconditions for editing or lifecycle transitions.
- Phase 21 `PrismaCareerRepository.updateEmployer(...)`, `updateJob(...)` and `updateJobStatus(...)` also update with `where: { id }` only, and the late-domain Career persistence records have no version/fencing field.
- These are shared admin-managed records with multiple lifecycle/editor mutations, so the approved concurrency requirement is applicable rather than theoretical.
- Other current platform areas demonstrate the intended pattern: Student Workspace uses `version`/`expectedVersion`, and Finance performs version-constrained mutations; the omission is therefore specific to late-domain implementation rather than an absent project-wide design.

**Impact:**
- Two administrators or concurrent workflows can read the same Service/Career state and overwrite each other without detecting a stale edit.
- Lifecycle transitions can race with metadata edits or provider/finance updates, causing lost updates and state/data combinations that passed validation independently but were never reviewed together.
- Audit logs may record both commands while the persistence layer silently preserves only the last writer, reducing operational traceability.
- Google Studio/database provisioning cannot add correct concurrency semantics by configuration; version fields, API preconditions and repository compare-and-set behavior must exist in source/migrations.

**Required remediation:**
1. Add explicit monotonic `version`/revision fields to mutable Service and Career aggregate persistence models through controlled migrations.
2. Include the current version in Admin/read DTOs and require `expectedVersion` (or an approved ETag/If-Match equivalent) on state-changing administrative commands.
3. Change repository mutations to compare-and-set on `{ id, version: expectedVersion }` and atomically increment the version; zero-row updates must surface a stable conflict error.
4. Ensure multi-step Service request operations such as provider assignment, invoice linking and status transitions use the same concurrency/fencing authority and do not bypass aggregate state validation.
5. Add concurrent-update tests proving one of two stale writers is rejected rather than silently overwriting the other.
6. Add Admin UI conflict handling that reloads current owner state and requires an explicit re-review/retry instead of automatic last-write-wins.
7. Extend late-domain source-closure verifiers to assert versioned mutation contracts for shared mutable records.

**Repair Wave:** W2 / W4 / W5 / W6  
**Status:** OPEN — LATE_DOMAIN_MUTATIONS_ALLOW_SILENT_LAST_WRITE_WINS

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0081"></a>

### مهمة 45 — MNT-AUD-0081 — W2 / P2

**المالك المقترح:** Domain Backend + Database  
**حالة التنفيذ:** SOURCE_VERIFIED_W3_SCHEDULER_PENDING — راجع دليل W2 المضاف بتاريخ 2026-09-06.
**التبعيات:** بوابة الموجة السابقة؛ راجع التبعيات التاريخية أدناه قبل التنفيذ.

#### MNT-AUD-0081 — P2 MEDIUM — Retention Deadlines Are Persisted but Not Enforced by a Canonical Retention Lifecycle Across Import, Audit and Asset Data
**Categories:** RETENTION / DATA_LIFECYCLE / IMPORT / AUDIT / ASSETS / PURGE / COMPLIANCE / JOBS / GOVERNANCE

**Evidence:**
- `ImportRecord`, `AuditRecord` and `AssetRecord` persistence contain retention metadata such as `retentionExpiresAt`; Import also indexes the expiration field.
- `PrismaImportRepository` persists `retentionExpiresAt`, but repository search found no canonical query/sweeper that selects expired rows (`retentionExpiresAt <= now`) and applies a governed purge/archive action.
- `PrismaAuditRecordRepository` persists audit retention metadata but no expiry-enforcement service/job was found.
- `ProcessAssetLifecycleUseCase` provides explicit manual archive/soft-delete/purge operations and correctly checks the Asset Usage Registry before purge, but it does not evaluate `retentionExpiresAt` or schedule policy-driven lifecycle transitions.
- Phase 06 retention requirements explicitly state that staging-data retention/purging must be driven by explicit policies, while the current source implements the metadata but not enforcement.
- This is distinct from `MNT-AUD-0007` (general worker runtime gap) and `MNT-AUD-0050` (Asset Usage Registry runtime availability/purge safety): the missing root cause here is the policy engine/sweeper that turns retained metadata into lifecycle action.

**Impact:** expired staging/raw/audit/asset data can remain indefinitely, producing storage growth and compliance/data-minimization drift; conversely, implementing ad-hoc deletion later without owner-specific legal-hold/archive semantics could destroy required evidence.

**Required remediation:**
1. Define canonical retention classifications and owner-specific disposition (`PURGE`, `ARCHIVE`, `KEEP`, legal hold) rather than treating every expiry alike.
2. Implement a durable idempotent retention scheduler/sweeper on the final background-job foundation.
3. For Imports, purge only eligible staging/raw material while preserving required provenance/evidence and DLQ policy.
4. For Audit, preserve immutable/compliance evidence according to policy and archive rather than destructively delete where required.
5. For Assets, route expiry through the existing lifecycle + usage-safety boundary; never bypass `IAssetUsageRegistryGateway`.
6. Emit audit evidence and metrics for every policy decision, skipped legal hold, failure and purge/archive result.
7. Add boundary tests for expiration, retry/idempotency, legal hold, in-use assets, and policy changes.
8. Reconcile stale Phase 06 documentation that still describes schema fields already present as future work.

**Repair Wave:** W2 / W3 / W6 / W7  
**Status:** OPEN — RETENTION_METADATA_EXISTS_WITHOUT_POLICY_ENFORCEMENT

### Live Register Update — v0.43 (2026-09-06)
- Registered finding IDs allocated: **81** (`MNT-AUD-0001` → `MNT-AUD-0081`).
- Duplicate/evidence-alias IDs excluded: **3** (`0038`, `0039`, `0053`).
- **Canonical unique confirmed findings: 78**.
- Severity: **P0: 0 | P1: 57 | P2: 20 | P3: 1 | P4: 0**.
- No code, DB, repository setting or runtime change was executed.
- Project decision remains: **SOURCE_NOT_COMPLETE — AUDIT_IN_PROGRESS**.

### Next mandatory continuation after v0.43
1. Finish migration/data-integrity constraints, orphan/reference and deployment-order review.
2. Finish P23 Admin route/action/permission/audit/owner parity.
3. Finish P24 route/deep-link/live-action/data-origin parity.
4. Finish event producer/consumer and scheduler/worker matrix.
5. Finish CI/verifier/document-authority/release-governance reconciliation and final root-cause deduplication.

## Repository Completion Audit — Repository Boundary Change Control (v0.44 — 2026-09-06)

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0109"></a>

### مهمة 46 — MNT-AUD-0109 — W2 / P2

**المالك المقترح:** Domain Backend + Database  
**حالة التنفيذ:** SOURCE_VERIFIED — راجع دليل W2 المضاف بتاريخ 2026-09-06.
**التبعيات:** بوابة الموجة السابقة؛ راجع التبعيات التاريخية أدناه قبل التنفيذ.

#### MNT-AUD-0109 — P2 MEDIUM — The Composition Root Retains Orphan Foundation Use Cases and Dead Shadow Implementations With No Executable Runtime Consumer
**Categories:** DEAD_CODE / ORPHAN_COMPOSITION / DI / FOUNDATION_CAPABILITIES / SHADOW_IMPLEMENTATION / DOCUMENTATION_DRIFT / SOURCE_CLOSURE

**Evidence:**
- Repository-wide reachability checks for the older foundation use cases found `ManageMonitorsUseCase`, `ManageLogsUseCase`, `ManageSecurityPoliciesUseCase`, `ManageConfigurationsUseCase`, `ManageIntegrationsUseCase` and `ManageLocalizationsUseCase` in their implementation files, the application barrel, DI registration and architecture/baseline documents, but no executable HTTP router, worker, scheduler, event subscriber or other runtime caller was found for those registered instances in the current source pass.
- `apps/api/src/infrastructure/di/container.ts` still constructs these use cases as scoped registrations even when several of their repositories/gateways resolve to explicitly unavailable capabilities such as `monitorPersistence`, `monitoringExecution`, `securityPolicyPersistence`, `configurationPersistence`, `integrationPersistence` and `localizationPersistence`.
- This is distinct from `MNT-AUD-0049`: `0049` covers mounted control-plane capabilities such as Workflow/API Foundation/Shared Components whose runtime dependencies are unavailable. The present finding covers composition objects that are registered and documented but do not have a proven executable consumer at all.
- This is also distinct from `MNT-AUD-0095`: `0095` covers permissive `generated/dummy.ts` domain authority. The present finding concerns unreachable runtime composition and retained shadow implementations.
- `createInMemoryPrismaClient()` remains as a large implementation inside `apps/api/src/infrastructure/di/container.ts`, but the active `prisma` registration no longer selects it when Prisma is unavailable; it now returns `createUnavailableCapability('database')`. The in-memory Prisma implementation is therefore retained as a shadow/dead runtime path in the inspected canonical composition.
- Historical implementation-status documents still describe the in-memory Prisma fallback as an active preview/runtime behavior, creating documentation-to-source drift.
- `scripts/inspect_legacy.ts` contains direct diagnostic database access and `$queryRawUnsafe(...)`, but no root `package.json` command or runtime/CI caller was found in this pass. It is therefore classified here as stale/dead diagnostic source, not counted as an independently reachable production SQL-injection finding.

**Impact:**
- The DI graph advertises capabilities that cannot be reached through any proven production entry point, making source-completeness and dependency reports materially misleading.
- Unavailable dependencies can remain hidden because no runtime path forces their resolution until a future caller is added.
- Dead/shadow implementations increase maintenance ambiguity and make architecture documents, tests and remediation decisions prone to targeting code that is no longer authoritative.
- A future router or worker can accidentally revive an obsolete or non-production implementation simply because it still exists in the canonical composition source.

**Required remediation:**
1. Build a machine-verifiable registration-to-consumer graph for every DI registration and classify each as `RUNTIME_REACHABLE`, `TEST_ONLY`, `FORMALLY_DEFERRED` or `REMOVE`.
2. For required foundation capabilities, add the intended runtime entry point and real production persistence/execution adapters before claiming closure.
3. Remove DI registrations for capabilities that are intentionally not part of the current executable platform, or place them behind an explicit deferred-module boundary that cannot be mistaken for production readiness.
4. Delete or move `createInMemoryPrismaClient()` to test-only infrastructure if it is no longer an approved runtime path; do not leave two competing database authority models in the production composition root.
5. Quarantine/remove obsolete diagnostic scripts such as `inspect_legacy.ts` or place them under a clearly non-production operational tooling boundary with parameterized SQL if still required.
6. Reconcile stale implementation-status and Phase 5 traceability documents with the final executable graph.
7. Add a closure verifier that fails when production DI registrations have no runtime consumer unless an explicit approved-deferred manifest entry exists.

**Repair Wave:** W0 / W3 / W6 / W7  
**Status:** OPEN — ORPHAN_DI_REGISTRATIONS_AND_DEAD_SHADOW_IMPLEMENTATIONS_REMAIN_IN_CANONICAL_SOURCE

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0007"></a>

### مهمة 47 — MNT-AUD-0007 — W3 / P1

**المالك المقترح:** Platform Workers + Integration + Domain Backend  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** بوابة الموجة السابقة؛ راجع التبعيات التاريخية أدناه قبل التنفيذ.

#### MNT-AUD-0007 — Mandatory BullMQ / Background-Worker Architecture Is Declared but Not Implemented in Active Source

- **Discovered:** 2026-09-06
- **Phase:** P1–P5 Enterprise Foundation / Cross-Cutting
- **Subsystem:** Background Jobs / Async Processing
- **Category:** `MISSING_IMPLEMENTATION` / `ARCHITECTURE` / `DEVOPS`
- **Severity:** **P1 — HIGH**
- **Scope:** SOURCE
- **Status:** OPEN
- **Evidence:** Authoritative architecture/roadmap declares background-job / BullMQ capability, while active package manifests and root dependencies do not include BullMQ and no production BullMQ implementation was found in the active source baseline.
- **Expected Behavior:** A declared mandatory enterprise background-job capability must have source-complete queue/worker contracts, production adapter, composition, retry/idempotency semantics, observability, and tests before Source Complete 100%.
- **Impact:** Domains that depend on durable asynchronous execution cannot be honestly source-closed.
- **Required Action:** Implement or formally supersede the BullMQ/background-worker architecture through an approved ADR. Do not leave the architecture contract ahead of implementation.
- **Fix Wave:** W1/W3/W6.

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0068"></a>

### مهمة 48 — MNT-AUD-0068 — W3 / P1

**المالك المقترح:** Platform Workers + Integration + Domain Backend  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** MNT-AUD-0007.

#### MNT-AUD-0068 — P1 HIGH — Transactional Outbox Lease Ownership Can Be Lost Mid-Delivery and Stale Workers Can Overwrite Final State
**Categories:** EVENT_FOUNDATION / OUTBOX / CONCURRENCY / MULTI_INSTANCE / LEASE / IDEMPOTENCY / RELIABILITY / P05 / P14 / RUNTIME

**Evidence:**
- `PrismaTransactionalOutboxStore.claimPendingBatch()` leases records by setting `state=PROCESSING`, `claimedBy=workerId` and `claimUntil`, but no lease-renewal/heartbeat contract exists in the store or dispatcher.
- `TransactionalOutboxDispatcher.dispatchBatch()` computes one fixed lease end at claim time (`startedAt + claimDurationMs`) and then delivers the claimed entries sequentially. It never extends the lease while a long-running delivery is in progress.
- `CertificateCompletionOutboxWorker` uses a default `claimDurationMs` of only 30 seconds and can claim up to 25 records in one batch, creating a realistic path for later records in a batch—or slow downstream work—to cross the original lease deadline.
- Once the lease expires, another worker is allowed to reclaim the same record because the claim query explicitly accepts records whose `claimUntil < now`.
- `PrismaTransactionalOutboxStore.markProcessed(id, ...)` and `markFailed(id, ...)` update by record `id` only. They do not require the caller's `workerId`, do not check current `claimedBy`, and do not assert that the caller still owns an unexpired lease.
- Therefore a stale worker can mark a record `PROCESSED` or `FAILED` after another worker has already reclaimed it; conversely, a second worker that races a durable idempotent consumer can fail on a uniqueness/idempotency race and then unconditionally move an already-successful outbox record back to `FAILED`.
- The certificate consumer adds durable idempotency using `sourceEventId` / issuance inbox uniqueness, which reduces duplicate business issuance, but it does not protect the outbox row itself from stale-worker state corruption. The outbox abstraction is cross-cutting and cannot rely on every consumer implementing an identical race-safe inbox.
- Existing `TransactionalOutboxDispatcher.spec.ts` tests stable idempotency keys, backoff and max-attempt parking only. No source test covers concurrent workers, lease expiry during delivery, stale-owner completion/failure, lease renewal or compare-and-set ownership transitions. No dedicated `PrismaTransactionalOutboxStore` concurrency specification was found.

**Impact:**
- Multi-instance deployments can redeliver the same event after a lease expires while the original delivery is still active.
- Outbox state can be corrupted by a stale worker after ownership has moved, causing processed events to re-enter retry state or newer worker decisions to be overwritten.
- Retry counts and exhaustion state can become inaccurate, potentially parking successfully delivered events or creating repeated delivery loops.
- Consumer-level idempotency may prevent duplicate side effects for some consumers, but the event foundation itself does not currently provide a correct lease-ownership state machine for all domains.
- This blocks a reliable production claim for horizontally scaled workers and directly affects exactly-once-effect / at-least-once-delivery correctness guarantees.

**Required remediation:**
1. Make `markProcessed` / `markFailed` ownership-aware compare-and-set operations requiring `workerId` (and preferably lease/version) and reject stale owners.
2. Add an explicit lease-renewal/heartbeat operation for work that can exceed the claim duration, or claim/process bounded units whose maximum execution time is proven below the lease window.
3. Recheck ownership immediately before final state transition; never update a row solely by `id` from a worker context.
4. Define behavior when ownership is lost mid-delivery: the stale worker must not mutate durable outbox state after the loss is detected.
5. Add real PostgreSQL concurrency tests with two workers racing claim, lease expiry, reclaim, success and failure paths.
6. Add regression tests proving a stale worker cannot convert another worker's `PROCESSED` record to `FAILED`, cannot clear a newer lease, and cannot increment attempts after ownership loss.
7. Keep consumer idempotency/inbox constraints, but treat them as a second safety layer rather than a substitute for correct outbox leasing.
8. Reconcile the Event Foundation operational contract and any horizontal-scaling/runbook claims with the final lease semantics.

**Repair Wave:** W1 / W3 / W6 / W7  
**Status:** OPEN — OUTBOX_LEASE_OWNERSHIP_AND_STALE_WORKER_TRANSITIONS_UNSAFE

### Live Register Update — v0.33 (2026-09-06)

- Registered finding IDs allocated: **68** (`MNT-AUD-0001` → `MNT-AUD-0068`).
- Duplicate/evidence-alias IDs excluded from canonical count: **3** (`0038`, `0039`, `0053`).
- **Canonical unique confirmed findings: 65**
- Severity (canonical unique): **P0: 0 | P1: 49 | P2: 15 | P3: 1 | P4: 0**
- New canonical finding in this continuation: `MNT-AUD-0068`.
- Consumer-level certificate idempotency was verified as a positive control, but it does not close the shared outbox lease-ownership race.
- No source/code repair, migration, backfill, seed, database mutation or production runtime change has been executed.
- Frozen audit baseline remains `0931c5664cf274cb2b8f4cb250dd09ebf2e9a77f`.
- Project decision remains: **SOURCE_NOT_COMPLETE — AUDIT_IN_PROGRESS**.

### Next mandatory continuation after v0.33
1. Complete P23 page/action-to-permission/auth/audit matrix and identify any privileged surface whose UI or route composition diverges from its owner-domain contract.
2. Complete P24 route matrix for locale, deep-link, SEO, pagination/filtering, empty/error/unavailable states and accessibility.
3. Reconcile readiness/drain ordering and startup failure semantics without duplicating `MNT-AUD-0040`.
4. Complete event producer/consumer orphan check across all domain events after the shared outbox correctness finding is now separated.
5. Complete final CI/verifier and documentation/source-authority reconciliation.

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0011"></a>

### مهمة 49 — MNT-AUD-0011 — W3 / P1

**المالك المقترح:** Platform Workers + Integration + Domain Backend  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** MNT-AUD-0043.

#### MNT-AUD-0011 — Phase 05 Enterprise Asset Platform Has No Production-Capable Storage, Malware-Scanning, or Sanitization Adapters

- **Discovered:** 2026-09-06
- **Phase:** P05 Enterprise Foundation — Enterprise Asset Platform
- **Subsystem:** Secure Asset Ingestion / Storage
- **Category:** `MISSING_IMPLEMENTATION` / `ASSET` / `SECURITY` / `INFRASTRUCTURE`
- **Severity:** **P1 — HIGH**
- **Scope:** SOURCE
- **Status:** OPEN
- **Evidence:** The EAP domain/application contracts are implemented, but active infrastructure provides `LocalAssetStorageGateway` for development and Noop malware/sanitization gateways with unavailable capability status. `RuntimeDependencyPolicy` returns an unavailable storage capability for production/staging and explicitly fails closed if production-capable storage/scanner/sanitizer providers are absent.
- **Expected Behavior:** Because P05 EAP is the mandatory security boundary for files/media across later domains, production-capable storage, malware scanning, sanitization/metadata stripping, secure delivery and configuration adapters must already exist in source. Runtime may inject credentials/configuration only.
- **Impact:** P11 Universities, P12 Scholarships, P15 Student Platform, P16 CMS, P18 Student Tools and any upload/media path cannot be Source Complete 100%.
- **Required Action:** Implement production-capable provider adapters and composition now; preserve fail-closed runtime policy and add provider-contract/security tests.
- **Fix Wave:** W1/W3.

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0012"></a>

### مهمة 50 — MNT-AUD-0012 — W3 / P1

**المالك المقترح:** Platform Workers + Integration + Domain Backend  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** MNT-AUD-0043.

#### MNT-AUD-0012 — Phase 06 Import Foundation Lacks a Durable Production Raw-Snapshot Store Adapter and Defers Its Implementation to Runtime Closure

- **Discovered:** 2026-09-06
- **Phase:** P06 Universal Import Infrastructure
- **Subsystem:** Raw provenance snapshot storage
- **Category:** `MISSING_IMPLEMENTATION` / `IMPORT` / `ASSET` / `DEVOPS`
- **Severity:** **P1 — HIGH**
- **Scope:** SOURCE
- **Status:** OPEN
- **Evidence:** `IImportRawSnapshotStore` exists, but active implementations are in-memory or `LocalImportRawSnapshotStore` classified `DEVELOPMENT_ONLY`. In production/staging `RuntimeDependencyPolicy` returns an unavailable `durableImportRawSnapshotStore` and comments that a durable provider adapter will be injected during runtime closure.
- **Expected Behavior:** Under the approved greenfield lifecycle, runtime provisioning may inject provider configuration/credentials but may not implement a missing adapter. Durable immutable provenance storage must be source-complete before handoff.
- **Impact:** Production import provenance, replay, forensic traceability, and raw-artifact retention remain nonfunctional.
- **Required Action:** Implement a durable production adapter (preferably aligned with the EAP/object-storage abstraction), fail closed on missing configuration, and test content hashes, immutability, retention and retrieval semantics.
- **Fix Wave:** W2/W3.

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0018"></a>

### مهمة 51 — MNT-AUD-0018 — W3 / P1

**المالك المقترح:** Platform Workers + Integration + Domain Backend  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** MNT-AUD-0043.

#### MNT-AUD-0018 — Phase 19 Payment, FX, and Bank-Transfer Adapters Are Non-Functional Runtime-Pending Shells

- **Discovered:** 2026-09-06
- **Phase:** P19 Enterprise Finance & Payments
- **Subsystem:** External financial provider transports
- **File:** `packages/infrastructure/src/finance-platform/ProviderNeutralFinanceGateways.ts`
- **Category:** `MISSING_IMPLEMENTATION` / `FINANCE` / `INTEGRATION` / `SECURITY`
- **Severity:** **P1 — HIGH**
- **Scope:** SOURCE
- **Status:** OPEN
- **Evidence:** `EnvironmentPaymentGatewayAdapter`, `EnvironmentFxRateProviderAdapter`, and `EnvironmentBankTransferGatewayAdapter` expose provider-neutral contracts and secret references, but even when configured they throw that the provider `runtime transport is pending`. `authorize`, `capture`, `refund`, FX `fetchRate`, bank `submit`, `getStatus`, and `reverse` therefore have no executable provider transport.
- **Expected Behavior:** Source Complete requires at least one production-capable implementation strategy for each declared mandatory external finance capability, with configuration/credentials injected at runtime. Google Studio may provide secrets/endpoints but must not have to implement HTTP/provider transports.
- **Impact:** Payments, refunds, FX conversion, and bank-transfer execution cannot function after database provisioning by configuration alone. Phase 19 is structurally partial.
- **Required Action:** Implement provider-neutral HTTP/SDK transport adapters with strict signing/webhook verification, idempotency, timeout/retry policy, reconciliation, failure mapping, redacted observability and provider contract tests. Keep secrets environment-referenced only.
- **Fix Wave:** W1/W4/W6.

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0080"></a>

### مهمة 52 — MNT-AUD-0080 — W3 / P1

**المالك المقترح:** Platform Workers + Integration + Domain Backend  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** MNT-AUD-0007، MNT-AUD-0068.

#### MNT-AUD-0080 — P1 HIGH — Core Aggregate Domain Events Are Not Reliably Published: Identity Events Are Persisted Without Dispatch and the In-Memory Dispatcher Has No Registered Handlers
**Categories:** EVENT_FOUNDATION / DOMAIN_EVENTS / IDENTITY / SETTINGS / OUTBOX / INTEGRATION / P05 / CROSS_PHASE / SOURCE_CLOSURE

**Evidence:**
- The canonical `Identity` aggregate calls `addDomainEvent(...)` for `IdentityCreatedEvent`, `IdentityActivatedEvent`, `IdentityStatusChangedEvent` and `IdentityContactUpdatedEvent`.
- `PrismaIdentityRepository.save(...)` persists the aggregate state but never reads/dispatches/clears `identity.domainEvents`, never appends those events to the transactional outbox, and never bridges them into the newer Enterprise Event foundation.
- Repository-wide search found no Identity application use case invoking `DomainEvents.dispatchEventsForAggregate(...)` after save.
- The core `DomainEvents` dispatcher is an in-process static handlers map; repository-wide search found no active `DomainEvents.register(...)` call, so its handler registry is never populated in the canonical composition.
- `ManageSettingsUseCase` explicitly calls `DomainEvents.markAggregateForDispatch(...)` and `dispatchEventsForAggregate(...)` after settings mutations, but with no registered handlers this dispatch has no observable downstream effect.
- Active P05 Identity architecture documentation states that Identity domain events are published after transaction completion and names downstream consumers such as Authentication/Audit; current source does not provide that delivery path.
- The project also has a newer durable Enterprise Event / transactional-outbox foundation, but the legacy/core aggregate event mechanism is not consistently adapted into it.

**Impact:**
- Domain state can commit while declared Identity/Settings side effects and integrations never observe the corresponding event.
- Event contracts give a false impression of decoupled behavior even though the canonical runtime either never dispatches them or dispatches into an empty in-memory registry.
- Existing cross-phase gaps such as `MNT-AUD-0016` (Identity → Student Workspace) and `MNT-AUD-0076` (identity lifecycle session invalidation) are concrete downstream manifestations, but fixing those individual consumers would still leave the general publication boundary undefined.
- In-process `DomainEvents` also cannot provide durability, retry, multi-instance delivery or crash recovery even if handlers are later registered.

**Required remediation:**
1. Choose one canonical post-commit event model for production: durable transactional outbox/integration events, not an ungoverned static in-memory registry.
2. Adapt Identity and Settings aggregate events into the transactional mutation/outbox boundary in the same database transaction as the authoritative state mutation.
3. Define explicit event schemas/versioning for Created/Activated/StatusChanged/ContactUpdated and Settings changes, with owner-domain source of truth.
4. Register idempotent consumers for required downstream effects (student workspace provisioning, session/access invalidation where event-driven, audit/read-model updates, notifications only where approved).
5. Remove or quarantine the legacy `DomainEvents` mechanism from production paths once migration is complete; prevent silent dispatch into an empty handler map.
6. Add crash-window and multi-instance integration tests proving state+event atomicity, replay idempotency, retry/DLQ and consumer recovery.
7. Reconcile P05 Identity/Settings/Event Foundation documentation and the cross-phase relationship matrix with the actual durable publication route.

**Repair Wave:** W1 / W3 / W4 / W6 / W7  
**Status:** OPEN — CORE_DOMAIN_EVENTS_NOT_CONNECTED_TO_DURABLE_PRODUCTION_EVENT_PIPELINE

### Live Register Update — v0.42 (2026-09-06)
- Registered finding IDs allocated: **80** (`MNT-AUD-0001` → `MNT-AUD-0080`).
- Duplicate/evidence-alias IDs excluded from canonical count: **3** (`MNT-AUD-0038`, `MNT-AUD-0039`, `MNT-AUD-0053`).
- **Canonical unique confirmed findings: 77**.
- Severity (canonical unique): **P0: 0 | P1: 57 | P2: 19 | P3: 1 | P4: 0**.
- New canonical finding: `MNT-AUD-0080`.
- Existing `MNT-AUD-0016` and `MNT-AUD-0076` remain separate end-to-end behavioral gaps; they are linked as downstream manifestations rather than counted as duplicates of the publication-foundation defect.
- Newer transactional-outbox infrastructure was positively verified as real source; this finding concerns aggregates still stranded on the disconnected legacy/core event mechanism.
- No source/code repair or runtime/database mutation has been executed.
- Frozen audit baseline remains `0931c5664cf274cb2b8f4cb250dd09ebf2e9a77f`.
- Project decision remains: **SOURCE_NOT_COMPLETE — AUDIT_IN_PROGRESS**.

## Repository Completion Audit — Retention / Purge Policy Enforcement (v0.43 — 2026-09-06)

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0060"></a>

### مهمة 53 — MNT-AUD-0060 — W3 / P1

**المالك المقترح:** Platform Workers + Integration + Domain Backend  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** MNT-AUD-0080، MNT-AUD-0058.

#### MNT-AUD-0060 — P1 HIGH — Phase 20 Domain Events Are Declared but Service Catalog/Request Mutations Do Not Publish Them Through the Transactional Outbox/Event Foundation
**Categories:** PHASE20 / EVENTS / OUTBOX / INTEGRATION / NOTIFICATIONS / AUDIT / RELIABILITY / SOURCE_CLOSURE

**Evidence:**
- The active Phase 20 source declares event contracts such as `ServiceRequestedEvent`, `ServiceFulfillmentStatusChangedEvent`, `ServiceProviderAssignedEvent` and `ServiceFinanceInvoiceLinkedEvent`.
- Repository-wide searches for these event names find their declarations but no runtime producer/dispatcher usage outside the domain definition.
- `StudentServiceRequestUseCases` and `AdminServiceFulfillmentUseCases` call the service repository directly for request creation, status transition, provider assignment and finance-invoice linkage.
- `PrismaServicePlatformRepository` writes catalog/request state directly through Prisma and contains no transactional outbox append/event persistence for those mutations.
- Phase 20 documentation requires domain events for booking/assignment/execution/delivery and states that customer notifications, read models and operational consumers are driven from service state transitions.
- The repository already contains a Core Enterprise Event / Transactional Outbox foundation, so the absence is not an architectural inability; it is missing Phase 20 producer wiring.

**Impact:**
- Phase 20 state can change without a durable integration event describing the change.
- Notifications, customer-engagement projections, SLA/escalation consumers and cross-phase integrations cannot depend on a guaranteed event stream.
- A database write may succeed while downstream consumers permanently miss the transition.
- Declaring event interfaces gives false source-closure confidence without transactional publication semantics.

**Required remediation:**
1. Define the canonical Phase 20 event catalog and map every material state mutation to an event.
2. Persist state mutation + outbox event atomically in one database transaction.
3. Use stable event IDs, aggregate/version metadata, correlation/causation IDs and governed payload versions.
4. Add idempotent consumers/retry/DLQ semantics for notification/read-model/integration consumers.
5. Verify provider assignment, financial clearance, workflow progression, delivery and cancellation events end-to-end.
6. Add real PostgreSQL tests proving rollback atomicity and outbox delivery behavior.
7. Extend source-closure and CI gates to fail when event declarations have no producer wiring.

**Repair Wave:** W2 / W3 / W4 / W6 / W7  
**Status:** OPEN — PHASE20_EVENTS_DECLARED_WITHOUT_DURABLE_PRODUCERS

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0089"></a>

### مهمة 54 — MNT-AUD-0089 — W3 / P1

**المالك المقترح:** Platform Workers + Integration + Domain Backend  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** MNT-AUD-0080، MNT-AUD-0055.

#### MNT-AUD-0089 — P1 HIGH — Implemented Phase 21 Career Employer/Job Mutations Do Not Publish the Enterprise Career Events Declared by the Active Phase Contract
**Categories:** P21 / CAREER / EVENTS / OUTBOX / INTEGRATION / SEARCH / NOTIFICATIONS / ANALYTICS / P23 / P24 / SOURCE_CLOSURE

**Evidence:**
- The active Phase 21 domain/application contract states that Career application services orchestrate multi-aggregate workflows and dispatch events when jobs are published or applications are submitted.
- The Phase 21 event contract declares enterprise facts including `ProfileCreatedEvent`, `ProfileUpdatedEvent`, `JobPostedEvent`, `JobClosedEvent` and `ApplicationSubmittedEvent`, intended for enterprise consumers such as P23/P24 and downstream systems.
- The currently implemented Phase 21 slice contains real employer/job lifecycle operations: employer creation/status review, job creation/update, readiness transition, publish and archive.
- `CareerAdminUseCases` mutates the `ICareerRepository` directly. `publish()` validates lifecycle/employer/deadline conditions and then calls `repository.updateJobStatus(..., PUBLISHED)`; `archive()` similarly writes `ARCHIVED` directly.
- The use case has only `ICareerRepository` and `ICareerReferenceGateway` dependencies; it has no enterprise event publisher, transactional outbox coordinator or event factory dependency.
- Repository searches for the declared Career event names did not find an active producer implementation corresponding to job publish/archive or employer lifecycle mutations.
- The shared enterprise event/outbox foundation exists elsewhere in the repository, so this is a producer-integration gap inside the implemented Career slice rather than absence of the global event foundation.
- This is distinct from `MNT-AUD-0055` (large portions of Phase 21 are structurally missing) and `MNT-AUD-0080` (core aggregate event dispatch defect): this finding concerns event publication for the **implemented** Career employer/job owner workflow.

**Impact:**
- Publishing or closing a job does not reliably emit the enterprise fact that downstream consumers are contractually expected to consume.
- Search indexing, notifications, analytics, activity feeds and future P23/P24 projections must poll or couple synchronously instead of reacting to owner-domain facts.
- External/future extracted services cannot depend on the Phase 21 event contract even though the documentation presents it as part of the bounded-context interface.
- A repository transaction can commit the job status while no corresponding event exists, causing permanent integration divergence.

**Required remediation:**
1. Define executable Phase 21 event types/versioned payload contracts for the currently implemented employer/job slice.
2. Publish `JobPosted`/`JobClosed` (and approved employer lifecycle events) atomically with owner-state mutation through the transactional outbox/event foundation.
3. Carry stable event ID, aggregate ID/public ID, correlation/causation metadata, actor/source and schema version.
4. Add idempotent downstream consumers or read-model/index adapters where the active roadmap requires them.
5. Add transaction-failure tests proving state cannot commit without its outbox fact and replay tests proving duplicate delivery is safe.
6. Add Phase 21 producers/consumers to the enterprise Event/Worker matrix and current source-closure verifier.
7. Reconcile the event-contract documentation with the actually implemented Phase 21 scope; do not claim application/profile events until those owner slices exist under `MNT-AUD-0055`.

**Repair Wave:** W2 / W3 / W5 / W6 / W7  
**Status:** OPEN — PHASE21_IMPLEMENTED_CAREER_MUTATIONS_DO_NOT_PUBLISH_DECLARED_ENTERPRISE_EVENTS

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0093"></a>

### مهمة 55 — MNT-AUD-0093 — W3 / P1

**المالك المقترح:** Platform Workers + Integration + Domain Backend  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** MNT-AUD-0080.

#### MNT-AUD-0093 — P1 HIGH — Phase 13 Enrollment and Progress Mutations Do Not Publish the Learning Events Phase 15 Is Designed to Consume
**Categories:** P13 / P15 / EVENT_FOUNDATION / OUTBOX / LEARNING / ENROLLMENT / PROGRESS / INTEGRATION / CONTRACT_DRIFT / SOURCE_CLOSURE

**Evidence:**
- `CourseProgressUseCases.completeCourse(...)` uses `AtomicDomainMutationCoordinator` and appends the durable `CourseCompleted` event to the transactional outbox in the same mutation as completion persistence.
- In the same use case, `enroll(...)` persists enrollment through `progressRepository.enrollWithCapacity(...)` and returns the snapshot without appending an enrollment integration event.
- `markLessonProgress(...)` persists lesson progress and recalculates enrollment progress without appending a `CourseProgressUpdated` integration event.
- The Phase 15 repository explicitly contains projection logic for learning events including `CourseEnrolled`, `CourseProgressUpdated` and `CourseCompleted`.
- The Phase 15 architecture states that Student Workspace timeline/read models synchronize from `CourseEnrolled`/course-progress/completion ecosystem events.
- The current Phase 15 source-closure/runbook explicitly lists the first learning events that must be connected as `CourseEnrollmentCreated`, `CourseProgressUpdated` and `CourseCompleted`, but repository search finds `CourseEnrollmentCreated` only in that runbook while the actual P15 projection checks `CourseEnrolled` — an unresolved event-name/schema contract mismatch exists before transport is even enabled.
- `CourseCompleted` is therefore materially different from enrollment/progress: completion has a real atomic outbox producer, while enrollment/progress currently have consumers/documented expectations but no corresponding owner producer path.
- This is distinct from `MNT-AUD-0016` (Identity -> P15 provisioning consumer wiring) and `MNT-AUD-0080` (legacy/core Identity/Settings event publication foundation). The defect here is specifically the newer Phase 13 learning mutation/event contract: two real owner mutations never create the integration events expected by P15.

**Impact:**
- Student Workspace can remain stale after enrollment or ongoing lesson progress even if a future P15 event worker is enabled correctly.
- Timeline, “continue learning”, learning statistics and cross-device progress projections cannot be event-consistent because the authoritative owner never emits the required change signals.
- Runtime configuration cannot repair this: there is no queued message to consume for enrollment/progress mutations.
- The event-name mismatch (`CourseEnrollmentCreated` vs `CourseEnrolled`) creates an additional interoperability hazard even if a producer is later added ad hoc.

**Required remediation:**
1. Define one versioned canonical learning integration-event contract for enrollment and progress, including the exact event names and payload schemas consumed by Phase 15.
2. Publish enrollment and meaningful progress mutations through the same governed transactional outbox/atomic mutation boundary already used successfully for `CourseCompleted`.
3. Include stable `courseId`, `studentReferenceId`, enrollment ID, progress/version/timestamp and correlation metadata needed by downstream projections without leaking owner-internal mutable state.
4. Make P15 ingestion idempotent against the canonical event IDs and versions; remove alternate event-name assumptions.
5. Add contract tests proving every successful owner mutation commits state + event atomically, while failed mutations publish nothing.
6. Add cross-phase tests proving enrollment/progress events update the P15 learning projection exactly once under duplicate delivery/replay.
7. Update the Enterprise Event Catalog, Phase 15 runbook, cross-phase matrix and source verifiers to the single canonical names and ownership rules.
8. Link worker/transport deployment to the existing global Event/Worker findings, but do not treat runtime workers as a substitute for missing producers.

**Repair Wave:** W1 / W3 / W4 / W6 / W7  
**Status:** OPEN — LEARNING_ENROLLMENT_AND_PROGRESS_EVENTS_HAVE_NO_OWNER_OUTBOX_PRODUCERS

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0016"></a>

### مهمة 56 — MNT-AUD-0016 — W3 / P1

**المالك المقترح:** Platform Workers + Integration + Domain Backend  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** MNT-AUD-0080.

#### MNT-AUD-0016 — Phase 15 Student Workspace Auto-Provisioning Consumer Exists but Is Not Wired to a Real Identity Producer

- **Discovered:** 2026-09-06
- **Phase:** P15 Enterprise Student Platform
- **Subsystem:** Identity → Student Workspace integration
- **Files:**
  - `packages/application/src/students/use-cases/StudentWorkspaceUseCases.ts`
  - `packages/infrastructure/src/students/PrismaStudentWorkspaceRepository.ts`
  - Identity domain event sources
- **Category:** `EVENT` / `WORKFLOW` / `RELATIONSHIP` / `MISSING_IMPLEMENTATION`
- **Severity:** **P1 — HIGH**
- **Scope:** SOURCE / CROSS-PHASE
- **Status:** OPEN
- **Evidence:** `StudentWorkspaceUseCases.consumeIntegrationEvent(...)` and repository handling for `StudentIdentityCreated` exist, including idempotent workspace initialization logic, but no production caller/wiring was found for the consumer. `StudentIdentityCreated` appears in tests and Phase 15 documentation, while the active Identity domain currently exposes `IdentityCreatedEvent(identityId, identityType)` rather than a demonstrated integration-event bridge producing the Phase 15 event contract.
- **Expected Behavior:** Creating/activating a student identity must deterministically emit or transform into the canonical integration event consumed by P15, through an outbox/event delivery path that is present in source before runtime handoff.
- **Impact:** A valid student can exist without a provisioned workspace and remain stuck behind `STUDENT_WORKSPACE_PROVISIONING_PENDING`; the Student Platform is not end-to-end integrated with Identity.
- **Required Action:** Implement the canonical Identity → StudentWorkspace integration event bridge, event mapping/versioning, outbox publication, consumer registration, idempotency, retry/dead-letter behavior, audit/observability, and cross-phase tests.
- **Fix Wave:** W1/W3/W4.

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0017"></a>

### مهمة 57 — MNT-AUD-0017 — W3 / P1

**المالك المقترح:** Platform Workers + Integration + Domain Backend  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** MNT-AUD-0007، MNT-AUD-0068.

#### MNT-AUD-0017 — Phase 16 Scheduled CMS Publishing Has Processing Logic but No Automatic Production Scheduler/Worker

- **Discovered:** 2026-09-06
- **Phase:** P16 Enterprise CMS
- **Subsystem:** Scheduled publication
- **Files:**
  - `packages/application/src/cms/use-cases/CmsUseCases.ts`
  - `packages/infrastructure/src/cms/PrismaCmsRepository.ts`
  - `apps/api/src/presentation/api/router/CmsAdminRouter.ts`
- **Category:** `MISSING_IMPLEMENTATION` / `WORKFLOW` / `EVENT` / `CMS`
- **Severity:** **P1 — HIGH**
- **Scope:** SOURCE
- **Status:** OPEN
- **Evidence:** CMS supports authoring a future schedule and implements `processDueSchedules(...)` with repository-side leasing/processing. However, the only discovered invocation path is the manual admin endpoint `/operations/process-due-schedules`; no production scheduler/worker automatically invokes the due-schedule processor.
- **Expected Behavior:** Once content is placed in `SCHEDULED`, the platform must source-contain the runner that automatically executes due publications with retry/idempotency/concurrency controls. Runtime may start/configure that runner, not implement it.
- **Impact:** Scheduled content will not publish automatically in production without manual operator action, making a declared CMS capability functionally incomplete.
- **Required Action:** Wire `processDueSchedules` into the governed background-job infrastructure, add cadence/lease/retry/dead-letter/observability semantics, and test concurrent execution and exactly-once publication effects.
- **Fix Wave:** W3/W4/W6. Root dependency: MNT-AUD-0007.

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0034"></a>

### مهمة 58 — MNT-AUD-0034 — W3 / P1

**المالك المقترح:** Platform Workers + Integration + Domain Backend  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** MNT-AUD-0007، MNT-AUD-0068.

#### MNT-AUD-0034 — P1 HIGH — Notification Foundation Remains Dummy/In-Memory and Has No Production/Admin Delivery Plane
**Categories:** MISSING_IMPLEMENTATION / EVENT / WORKFLOW / NOTIFICATION / ADMIN / ARCHITECTURE / DEAD_CODE

**Evidence:**
- P23 Structure Contracts declare an `INotificationAdminView`, while the canonical Admin application has no Notifications workspace.
- P05 Notification application use cases exist (`ManageNotificationIntentsUseCase`, `ManageNotificationTemplatesUseCase`).
- The contracts/entities those use cases consume (`INotificationIntentRepository`, `INotificationTemplateRepository`, `INotificationPreferenceGateway`, `NotificationIntent`, `NotificationTemplate`, etc.) are currently exported from `packages/domain/src/generated/dummy.ts` with permissive `any` placeholders.
- The active Phase 05 traceability matrix explicitly records Notifications as `Dummy generated` with `InMemoryNotificationIntentRepository`, `InMemoryNotificationTemplateRepository` and `MockNotificationPreferenceGateway`, and in-memory-only testing.
- No Prisma Notification repository, production delivery adapter/provider, or Notification API/Admin router was found in the current source search.
- Enterprise event documentation nevertheless names the Notification Platform as a consumer of meaningful domain events.

**Impact:**
- Important domain events cannot reliably create, persist, govern and deliver notifications through a production-capable source path.
- Notification preferences/templates/intents cannot be operated from P23 as documented.
- A runtime database/provider cannot activate this capability automatically because its production persistence/delivery source is missing.
- Dummy domain exports weaken type safety and can conceal incomplete architecture behind compiling application use cases.

**Required remediation:**
1. Replace all Notification dummy contracts/entities with real typed P05 domain source and remove their generated-dummy exports.
2. Implement durable Prisma repositories for notification intents/templates/preferences/delivery receipts as appropriate.
3. Define provider-neutral delivery gateways (email/in-app/push/SMS only where approved), retries/idempotency, delivery status, rate/abuse controls and observability; integrate with the final queue/worker architecture under MNT-AUD-0007.
4. Wire approved enterprise/domain events to notification intents through explicit consumers/outbox delivery rather than informal calls.
5. Build P23 Notification Operations workspace for templates, delivery health/failures, retries, governed operational actions and audit — without exposing secrets/PII unnecessarily.
6. Add student/user preference integration where P15 owns personal preferences; Notification Foundation must consume that contract rather than duplicate it.
7. Add source/unit/integration tests plus post-connect provider/DB delivery validation.
8. Update P05, P23, Event Catalog, Dependency Graph and Cross-Phase Closure Matrix so their notification claims match the implementation.

**Repair Wave:** W1 / W3 / W5 / W6
**Status:** OPEN — SOURCE_IMPLEMENTATION_REQUIRED


#### Live Register Update — v0.12 (2026-09-06)
- Confirmed findings: **34**
- P0: 0 | P1: **25** | P2: 8 | P3: 1 | P4: 0
- Added `MNT-AUD-0034` — Notification Foundation is still dummy/in-memory and lacks production/Admin delivery plane.
- P05 and P23 remain `PARTIAL`; cross-phase/event audit continues.

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0054"></a>

### مهمة 59 — MNT-AUD-0054 — W3 / P1

**المالك المقترح:** Platform Workers + Integration + Domain Backend  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** MNT-AUD-0007، MNT-AUD-0068.

#### MNT-AUD-0054 — P1 HIGH — Phase 17 Durable AI Async Jobs Have No Runtime Worker/Scheduler to Execute Queued Jobs
**Categories:** AI / ASYNC / WORKER / JOBS / OPERATIONS / RELIABILITY / SOURCE_CLOSURE

**Evidence:**
- `AIExecutionOrchestrator.submitAsync()` persists protected async jobs and the live AI gateway exposes async submission through the execution API.
- `AIExecutionOrchestrator.processAsync(publicId, workerId)` contains the claim/decrypt/execute/retry/dead-letter lifecycle and the repository implements durable claim/lease behavior.
- Repository-wide search for `processAsync(` finds the method implementation and tests but no runtime worker, scheduler, queue consumer or bootstrap that discovers queued AI jobs and invokes the processor.
- Search for `claimAsyncJob` similarly finds the domain contract, Prisma repository, source verifier, application use case and tests, but no executable runtime consumer.
- The Phase 17 verifier proves source invariants inside the orchestrator/repository but does not prove ownership/startup of an async worker.

**Impact:**
- The public/admin API can accept an asynchronous AI request and persist it as `QUEUED`, while no source-wired runtime component is responsible for progressing that job.
- Queued work can remain indefinitely pending despite durable lease/retry/dead-letter primitives existing in the codebase.
- Phase 17 cannot be considered end-to-end source-complete for asynchronous execution.
- Health/readiness can describe AI dependencies without proving that the queue consumer itself is alive.

**Required remediation:**
1. Add a canonical Phase 17 AI async worker entry point owned by the AI platform/runtime composition.
2. Discover eligible queued/stale jobs, call `processAsync(publicId, workerId)`, respect leases/max-attempts/dead-letter behavior and support bounded concurrency.
3. Implement graceful shutdown, multi-instance safety, lease renewal/reclaim policy and deterministic worker identity.
4. Surface worker enabled/running state, queue depth, oldest queued age, lease conflicts, retries and dead-letter counts through Health/Readiness and Admin governance.
5. Add explicit worker configuration to the canonical environment contract; production-like runtime must not silently accept async work when the worker is disabled.
6. Add source composition tests and real runtime/database E2E proving `QUEUED -> RUNNING -> SUCCEEDED/FAILED/DEAD_LETTER`.
7. Extend `verify-phase17-source.mjs` and canonical CI source-closure aggregation to assert the worker bootstrap exists and is wired.

**Repair Wave:** W3 / W4 / W6 / W7  
**Status:** OPEN — AI_ASYNC_QUEUE_HAS_NO_RUNTIME_CONSUMER

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0077"></a>

### مهمة 60 — MNT-AUD-0077 — W3 / P1

**المالك المقترح:** Platform Workers + Integration + Domain Backend  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** MNT-AUD-0018، MNT-AUD-0007، MNT-AUD-0068.

#### MNT-AUD-0077 — P1 HIGH — Phase 19 Reconciliation Is On-Demand/Internal-Ledger Only; No Scheduled Provider-State Recovery Exists for Ambiguous Payment/Transfer Outcomes
**Categories:** P19 / FINANCE / PAYMENTS / TRANSFERS / RECONCILIATION / RECOVERY / WORKER / PROVIDER / RELIABILITY / OBSERVABILITY

**Evidence:**
- The active Phase 19 implementation blueprint specifies BullMQ/Redis background settlements/reconciliation, a worker class for transfer processing, gateway/webhook anomaly monitoring, and alerting from background reconciliation workers.
- `FinancePlatformUseCases.capturePayment()` intentionally preserves ambiguous provider/network outcomes as `PENDING` or `AUTHORIZED` and relies on a later retry with the same idempotency key. This is correct fail-closed command behavior, but recovery is requester-driven rather than autonomous.
- Transfer settlement/failure is advanced by explicit transition commands that query bank-provider status; no recurring worker was found that scans `PROCESSING` transfers and resolves them from provider truth.
- `FinanceAdminRouter` exposes reconciliation as an operator-invoked capability protected by `admin:finance:reconciliation:run`.
- Current repository reconciliation checks focus on internal invariants such as `LEDGER_IMBALANCE` and `CAPTURE_WITHOUT_POSTING`.
- Repository-wide searches found no `FinanceReconciliationWorker`, scheduled finance reconciliation job, pending/authorized payment recovery worker, or processing-transfer settlement worker.
- `FinancePlatformUseCases.runtimeReadiness()` truthfully marks production provider/webhook capabilities unavailable. This finding is separate from `MNT-AUD-0018`: `0018` is missing production provider transport; `0077` is missing durable asynchronous convergence/recovery orchestration around the provider-state model.

**Impact:**
- After crashes, timeouts or ambiguous external responses, financial records can remain indefinitely `PENDING`, `AUTHORIZED` or `PROCESSING` until a user/admin manually retries or inspects them.
- Provider truth and MANARATAK financial state can drift without a bounded automatic detection/recovery window.
- Internal ledger checks alone cannot prove convergence with external payment/bank/refund state.

**Required remediation:**
1. Implement a durable finance reconciliation scheduler/worker using the approved queue/job foundation after global background-job remediation.
2. Define bounded scans/leases for stale `PENDING`/`AUTHORIZED` payments, `PROCESSING` transfers, processing refunds and other provider-dependent intermediate states.
3. Query provider truth using stable provider references/idempotency keys and apply only evidence-backed idempotent state transitions through Phase 19 owner APIs.
4. Add signed webhook ingestion as a complementary signal while preserving scheduled reconciliation for missed/delayed webhooks and ambiguous failures.
5. Emit metrics/alerts for aging intermediate states, reconciliation failures, provider divergence, ledger imbalance and retry exhaustion.
6. Add crash-window tests covering authorize-before-persist, capture-before-ledger-commit, transfer-submit-before-state-commit, refund ambiguity and missed-webhook recovery.
7. Upgrade the Phase 19 source-closure verifier to prove a mounted/scheduled recovery worker rather than only static reconciliation marker strings.

**Repair Wave:** W2 / W3 / W6  
**Status:** OPEN — FINANCE_PROVIDER_STATE_RECOVERY_NOT_AUTOMATED

### Reconciliation Notes — v0.39
- Re-checking `apps/api/src/server.ts` confirmed the absence of explicit `SIGTERM`/`SIGINT` graceful shutdown, but no new ID was created because this root cause is already included in `MNT-AUD-0040`.
- P24 accessibility spot checks positively verified dialog semantics, focus trapping, Escape handling, background `inert`, focus restoration, semantic buttons and accessible labels; absence of an axe package alone is not registered as a defect.
- Phase 19's existing fail-closed/idempotent synchronous payment behavior remains positive evidence; `MNT-AUD-0077` is specifically the missing autonomous provider-state convergence mechanism.

### Live Register Update — v0.39 (2026-09-06)
- Registered finding IDs allocated: **77** (`MNT-AUD-0001` → `MNT-AUD-0077`).
- Duplicate/evidence-alias IDs excluded from canonical count: **3** (`MNT-AUD-0038`, `MNT-AUD-0039`, `MNT-AUD-0053`).
- **Canonical unique confirmed findings: 74**.
- Severity (canonical unique): **P0: 0 | P1: 55 | P2: 18 | P3: 1 | P4: 0**.
- New canonical findings in this continuation: `MNT-AUD-0076`, `MNT-AUD-0077`.
- No source/code repair, migration, backfill, seed, database mutation or production runtime change has been executed.
- Frozen audit baseline remains `0931c5664cf274cb2b8f4cb250dd09ebf2e9a77f`.
- Project decision remains: **SOURCE_NOT_COMPLETE — AUDIT_IN_PROGRESS**.

### Next mandatory continuation after v0.39
1. Finish P23 Admin page/action → backend permission → audit → owner-domain parity for review/import/settings/platform operations.
2. Finish P24 route/deep-link/action/accessibility parity beyond known Compare, course-origin, prototype, Saved Items and application-tracker findings.
3. Complete migration/data-integrity review: migration ordering, rollback semantics, destructive SQL, constraints/indexes, greenfield parity and retention jobs without duplicating `MNT-AUD-0041/0042/0075`.
4. Complete observability/logging/metrics/tracing/alert-delivery and readiness-truth review.
5. Complete event producer/consumer orphan matrix and scheduler/worker matrix across all phases.
6. Complete CI/verifier/source-authority and documentation reconciliation, then perform final root-cause deduplication before remediation.

## Repository Completion Audit — Production Telemetry / Monitoring Foundation Reality (v0.40 — 2026-09-06)

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0086"></a>

### مهمة 61 — MNT-AUD-0086 — W3 / P1

**المالك المقترح:** Platform Workers + Integration + Domain Backend  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** MNT-AUD-0012، MNT-AUD-0007، MNT-AUD-0068.

#### MNT-AUD-0086 — P1 HIGH — Phase 06 Durable Import Queue Has Inline First-Attempt Execution but No Runtime Poller for Scheduled Retries or Reclaimed Jobs
**Categories:** P06 / IMPORT / QUEUE / WORKER / RETRY / DLQ / RECOVERY / SCHEDULER / DURABILITY / CROSS_PHASE

**Evidence:**
- The durable import application exposes `ImportAdminUseCases.processNextQueuedBatch(workerId)` and documents it as “Intended for worker/scheduler composition”.
- `ImportWorkerProtocol` and the Prisma queue gateway implement real lease, heartbeat, completion, retry and recovery primitives; this is therefore not an in-memory-placeholder finding.
- Repository search finds `processNextQueuedBatch(...)` in its declaration and integration tests, but no active production runtime caller.
- A repository-wide search for `setInterval(...)` identifies the API server interval used for the certificate-completion outbox worker.
- `apps/api/src/server.ts` confirms that interval runs only `certificateCompletionOutboxWorker.runOnce(workerId)` behind certificate worker flags; it does not poll the Phase 06 import queue.
- Therefore the initial request can execute work inline, but a retry scheduled for a later `availableAt`, an abandoned lease after process death, or a queued replay has no autonomous production consumer.
- This was previously discovered in a non-canonical draft that accidentally reused `MNT-AUD-0081`; this clean continuation preserves the finding under the non-conflicting ID `MNT-AUD-0086`.
- This is more specific than `MNT-AUD-0007` (global background-job runtime gap): Phase 06 already has durable queue semantics whose **recovery path has no runtime caller**.

**Impact:**
- Transient failures can remain `RETRY_SCHEDULED` indefinitely after the initiating API request ends.
- Jobs abandoned by process crash/lease expiry are reclaimable in persistence but may never be reclaimed automatically.
- DLQ/replay and retry durability exist as storage/protocol concepts without complete production execution semantics.
- Phase 06 cannot claim resilient end-to-end asynchronous recovery despite having strong underlying queue primitives.

**Required remediation:**
1. Run the Phase 06 import worker through the approved global background-job architecture selected under `MNT-AUD-0007`.
2. Poll only due/reclaimable jobs; enforce bounded concurrency, stable worker identity, lease renewal, lease-loss fencing and graceful drain.
3. Honor `availableAt` and retry/backoff policy; expose controlled DLQ inspection/replay without requiring the original request process.
4. Add crash/restart and lease-expiry tests proving a later worker reclaims interrupted work and retries transient failures after backoff.
5. Add queue depth, oldest-due age, retries, lease loss, throughput and DLQ metrics under `MNT-AUD-0078`.
6. Decide explicitly whether first-attempt inline execution remains an optimization; it must not be the sole durable queue consumer.
7. Strengthen the Phase 06 source-closure verifier to require an actual runtime worker caller and lifecycle configuration.

**Repair Wave:** W1 / W3 / W6 / W7  
**Status:** OPEN — IMPORT_DURABLE_QUEUE_HAS_NO_AUTONOMOUS_RETRY_RECOVERY_WORKER

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0029"></a>

### مهمة 62 — MNT-AUD-0029 — W3 / P1

**المالك المقترح:** Platform Workers + Integration + Domain Backend  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** MNT-AUD-0016، MNT-AUD-0060، MNT-AUD-0089، MNT-AUD-0093.

#### MNT-AUD-0029 — P1 HIGH — P24 Connected-Knowledge Contract Overstates Implemented Cross-Phase Relationships
**Categories:** ARCHITECTURE / RELATIONSHIP / PUBLIC_UI / DOCUMENTATION_DRIFT / CROSS_PHASE

**Evidence:**
- P24 Structure Contracts declare `CoreRelationships` including Scholarship→Major, Major→University, Major→Course, **Course→Educational Service**, and **Educational Service→Educational Tool**.
- The same contract states educational terminology inside public content automatically renders contextual semantic links.
- Current source has a real owner-backed public relationship graph for Major/University/Scholarship/Country.
- Current P10 public-graph closure explicitly states the source does **not invent Course→Service or Service→Tool relations when no owning read-model edge exists**.
- No semantic-linking implementation that automatically transforms editorial educational terms into canonical entity links was found in the live public composition.

**Impact:** The active P24 architecture promises cross-phase navigation that the source intentionally does not provide. This creates an authority contradiction and leaves the intended educational graph incompletely specified/implemented.

**Required remediation:**
1. ARB decision per unsupported edge: either implement a canonical owner-backed relationship contract/read model in the owning phases, or remove/downgrade the edge from mandatory P24 CoreRelationships.
2. Never infer/invent business relationships inside P24.
3. Define semantic-link ownership: explicit CMS canonical domain links, an approved resolver/read model, or remove the automatic-link promise.
4. Update P24 Part A/B/C and the active Cross-Phase Relationship Closure Matrix together.
5. Add source tests proving every documented public edge has an owner, API/read model, canonical identity, lifecycle filter and rendered navigation path.

**Repair Wave:** W1 / W4 / W5
**Status:** OPEN — REQUIRES_CROSS_PHASE_RECONCILIATION


#### Live Register Update — v0.7 (2026-09-06)
- Confirmed findings: **29**
- P0: 0 | P1: **20** | P2: **8** | P3: 1 | P4: 0
- Added `MNT-AUD-0027` through `MNT-AUD-0029`.
- P23 and P24 remain `PARTIAL`; cross-phase reconciliation is actively in progress.
- Source decision remains `SOURCE_NOT_COMPLETE`.

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0032"></a>

### مهمة 63 — MNT-AUD-0032 — W3 / P1

**المالك المقترح:** Platform Workers + Integration + Domain Backend  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** MNT-AUD-0043.

#### MNT-AUD-0032 — P1 HIGH — Certificate Completion Worker Requires Undocumented Hidden Runtime Flags
**Categories:** CONFIG / CERTIFICATE / EVENT / WORKFLOW / DEVOPS / DOCUMENTATION_DRIFT

**Evidence:**
- `apps/api/src/server.ts` starts the P13→P14 certificate completion delivery worker only when `CERTIFICATE_COMPLETION_WORKER_ENABLED === 'true'`; interval is controlled by `CERTIFICATE_COMPLETION_WORKER_INTERVAL_MS`.
- The worker bootstrap is otherwise real and source-wired, so this is not a missing-consumer finding.
- Repository search finds the flags in server/remediation/verifier source but not in root/app `.env.example` configuration contracts or the Google Studio runtime handoff searched for this capability.

**Impact:** A correctly provisioned database/runtime can still start with automatic course/learning-path certificate issuance silently disabled because the required enabling configuration is not part of the canonical environment contract.

**Required remediation:**
1. Add worker enable/interval variables to the canonical config schema, root/app `.env.example`, Google Studio/runtime runbook and Health/Readiness report.
2. Decide production default explicitly: enabled by required config or fail startup/readiness when certificate issuance is expected but disabled.
3. Surface worker state/last success/last failure/lag in Admin Health & Readiness.
4. Add source configuration tests and post-connect event-delivery E2E.
5. Reconcile with the final BullMQ/worker architecture under MNT-AUD-0007.

**Repair Wave:** W3 / W6 / W7
**Status:** OPEN — READY_FOR_REMEDIATION


#### Live Register Update — v0.10 (2026-09-06)
- Confirmed findings: **32**
- P0: 0 | P1: **23** | P2: 8 | P3: 1 | P4: 0
- `MNT-AUD-0032` records the hidden certificate-worker configuration contract.

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0098"></a>

### مهمة 64 — MNT-AUD-0098 — W4 / P1

**المالك المقترح:** API + Admin/Web Frontend  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** MNT-AUD-0111، MNT-AUD-0068.

#### MNT-AUD-0098 — P1 HIGH — Approved API Idempotency Standard Is Implemented Selectively; Most POST/PUT Mutation Endpoints Have No Canonical Idempotency Enforcement
**Categories:** API / IDEMPOTENCY / RELIABILITY / DATA_INTEGRITY / RETRY_SAFETY / P05_P23 / SOURCE_CLOSURE

**Evidence:**
- Approved standard `STD-API-001` explicitly requires an `Idempotency-Key` header for **all `POST` and `PUT` mutation endpoints**.
- Repository-wide search shows explicit idempotency-key handling in Finance command paths and Finance-related Student Workspace payment paths, but no shared/global idempotency middleware or request-deduplication layer for the rest of the API.
- `ServiceAdminRouter` exposes numerous POST mutations (service creation, request transitions, provider assignment, invoice handoff, publish/unpublish/reject/archive lifecycle commands) without an idempotency-key contract.
- `CareerAdminRouter` exposes POST creation/lifecycle mutations for employers and jobs without idempotency enforcement.
- `StudentWorkspaceRouter` exposes `POST /services/requests`; `StudentServiceRequestUseCases.createRequest(...)` generates a fresh `svc_req_${randomUUID()}` on every successful call and persists it without a request fingerprint/idempotency key. A network/client retry can therefore create a second logically identical service request.
- Finance demonstrates a positive domain-specific pattern: its routers read `Idempotency-Key`, and repository/application logic persists/compares idempotency fingerprints. The gap is therefore selective enforcement, not absence of project knowledge.
- This is distinct from `MNT-AUD-0096`: `0096` protects against stale concurrent writers; this finding protects command identity/retry replay and duplicate creation.

**Impact:**
- Retries after timeout, mobile reconnection, reverse-proxy replay or double-submit can duplicate state-creating commands such as service requests and other POST mutations.
- Lifecycle commands may be executed more than once with no stable command identity, producing duplicate audit/outbox/provider side effects where handlers are not naturally idempotent.
- API behavior is inconsistent across domains: Finance is retry-safe by explicit contract while other enterprise owner APIs are not.
- The approved interface standard cannot be considered source-complete while compliance depends on each router implementing ad hoc behavior.

**Required remediation:**
1. Implement one canonical API idempotency layer for approved POST/PUT mutation endpoints, scoped by principal, method, normalized route/resource and idempotency key.
2. Persist a request fingerprint and terminal response/result reference in a durable deduplication store with an approved retention window.
3. On key replay with the same fingerprint, return/reconstruct the original semantic result; reject reuse of the same key with a different payload/resource.
4. Keep domain-specific safety such as Finance idempotency as defense in depth, but integrate it with the shared command identity instead of maintaining incompatible mechanisms.
5. Ensure clients reuse the same key for retries of the same command rather than generating a new key per retry attempt.
6. Apply the mechanism first to state-creating/high-side-effect routes: service requests, admin create/publish commands, imports, jobs, certificates, AI/tool execution where applicable.
7. Add a source guard that inventories POST/PUT mutation routes and fails when a mutation has neither canonical idempotency middleware nor an approved documented exemption.
8. Add replay/concurrency tests proving duplicate delivery does not create duplicate rows, outbox messages or external side effects.

**Repair Wave:** W0 / W2 / W3 / W5 / W6  
**Status:** OPEN — APPROVED_IDEMPOTENCY_STANDARD_NOT_ENFORCED_ACROSS_MUTATION_API

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0020"></a>

### مهمة 65 — MNT-AUD-0020 — W4 / P1

**المالك المقترح:** API + Admin/Web Frontend  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** MNT-AUD-0065، MNT-AUD-0106.

#### MNT-AUD-0020 — Phase 23 Lacks IAM/RBAC Administration Workspaces Required by Its Own Governance Contract

- **Discovered:** 2026-09-06
- **Phase:** P23 Enterprise Administration Portal / P05 IAM & Authorization
- **Subsystem:** Admin users / roles / permissions / delegated access / break-glass governance
- **Files / Evidence:**
  - `docs/phases/phase-23-enterprise-administration-portal/phase-23-01-enterprise-administration-portal-architecture-specification.md`
  - `apps/admin/src/App.tsx`
  - `apps/admin/src/components/AdminNavigation.tsx`
  - `apps/admin/src/pages/SettingsAdminPage.tsx`
  - `packages/infrastructure/src/authorization/AdminBootstrapVerifier.ts`
- **Category:** `ADMIN` / `AUTH` / `RBAC` / `SECURITY` / `MISSING_IMPLEMENTATION`
- **Severity:** **P1 — HIGH**
- **Scope:** SOURCE / CROSS-PHASE
- **Status:** OPEN
- **Evidence:** P23 explicitly defines System Owner, Backup Administrator/break-glass access, delegated administrative roles, least-privilege RBAC/ABAC and a dashboard shortcut to RBAC settings. The authorization backend has persisted role/assignment/identity structures and an `admin:authorization:manage` bootstrap verifier, but the canonical Admin application exposes no user/identity/role/permission administration routes or pages. `SettingsAdminPage` explicitly states that users, roles and permissions belong to separate IAM/Authorization boundaries but provides no navigation to an implemented IAM workspace.
- **Expected Behavior:** The single canonical Phase 23 Admin portal must provide governed control surfaces for administrator identities, roles, permissions, assignments, delegated scopes, emergency/break-glass access state and access-policy review, while dispatching mutations to P05 IAM/Authorization APIs rather than owning IAM data.
- **Impact:** Administrators cannot operationally manage authorization policy from the declared single control plane. Role changes, delegated access and emergency-access governance are source-incomplete even though backend primitives exist.
- **Required Action:** Implement P05-owned IAM/Authorization Admin API commands/read models where missing; add Phase 23 Admin workspaces for identities, roles, permission matrices, assignments, access review and break-glass lifecycle; enforce maker-checker/high-risk controls, audit every mutation, and add RBAC/E2E authorization tests.
- **Fix Wave:** W1/W5/W6.

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0021"></a>

### مهمة 66 — MNT-AUD-0021 — W4 / P1

**المالك المقترح:** API + Admin/Web Frontend  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** MNT-AUD-0110، MNT-AUD-0084.

#### MNT-AUD-0021 — Phase 23 Mandates a Central Immutable Audit Activity View but Canonical Admin Has No Audit Center

- **Discovered:** 2026-09-06
- **Phase:** P23 Administration Portal / P05 Audit Foundation
- **Subsystem:** Operational audit visibility
- **Files / Evidence:**
  - `docs/phases/phase-23-enterprise-administration-portal/phase-23-01-enterprise-administration-portal-architecture-specification.md`
  - `apps/admin/src/App.tsx`
  - `apps/admin/src/components/AdminNavigation.tsx`
  - `apps/admin/src/pages/AdminDashboardPage.tsx`
- **Category:** `ADMIN` / `AUDIT` / `SECURITY` / `OBSERVABILITY` / `MISSING_IMPLEMENTATION`
- **Severity:** **P1 — HIGH**
- **Scope:** SOURCE / CROSS-PHASE
- **Status:** OPEN
- **Evidence:** P23 requires a “Safe Operational & Audit Activity Log” exposing read-only, non-deletable admin action trails. The canonical Admin route/navigation set contains dashboard, review queue, imports, domain workspaces, health/readiness and settings, but no central Audit route/page was found. The Dashboard aggregates operational counts and health, not an immutable cross-domain audit event stream.
- **Expected Behavior:** Phase 23 must compose a central read-only audit workspace backed by P05/domain audit records, with actor/action/domain/entity/time/correlation filtering, drill-down, export policy and no destructive delete operation.
- **Impact:** Security investigations, privilege review, operational traceability and maker-checker oversight cannot be performed from the declared unified admin control plane.
- **Required Action:** Define the canonical audit read-model/API, normalize cross-domain audit projection fields, implement Admin Audit Center and filters, protect audit visibility by explicit permission, and register runtime retention/integrity validation.
- **Fix Wave:** W1/W5/W6.

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0026"></a>

### مهمة 67 — MNT-AUD-0026 — W4 / P1

**المالك المقترح:** API + Admin/Web Frontend  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** MNT-AUD-0011، MNT-AUD-0050.

#### MNT-AUD-0026 — P1 HIGH — P05/P23 Asset Administration & Selection Control Plane Missing
**Categories:** ADMIN / ASSET / CROSS_PHASE / MISSING_IMPLEMENTATION / SECURITY

**Evidence:**
- Phase 05 EAP has domain/application lifecycle source and `AssetPlatformRouter` mutation endpoints for upload locator, quarantine registration, validate, sanitize, activate, archive/delete/restore/purge.
- The current EAP router exposes no canonical GET/list/search/detail query surface suitable for an Admin asset library.
- `apps/admin` has no Asset Center/Asset Library/Asset Picker page or shared asset selection control.
- `CourseDetailPage.tsx` attaches lesson assets by manually typed `assetId`.
- `CmsAdminPage.tsx` accepts manually typed `featuredAssetId`, comma-separated `attachmentAssetIds`, and `openGraphAssetId`.
- Phase 23 architecture explicitly requires uploads/select/link operations through Phase 05 EAP controls rather than raw storage/path handling.

**Impact:**
- Administrators cannot discover, inspect, select, upload, or safely reuse governed ACTIVE assets from the canonical Admin application.
- Manual AssetId entry is error-prone and weakens the P05→P23 operational boundary.
- It prevents complete source closure for course media, CMS media, certificates and other asset-backed domains.

**Required remediation:**
1. Add P05 EAP read/query contracts and APIs: list/search/detail/filter by state/classification/owner/MIME/date, with pagination.
2. Add canonical P23 Asset Center and reusable `AssetPicker`/upload flow.
3. Picker must expose only permitted/clean lifecycle states and enforce domain-specific MIME/role constraints.
4. Provide governed preview/download using signed/temporary delivery contracts; never raw physical paths.
5. Wire Course, CMS, Certificate and Student avatar/media workflows to the shared picker.
6. Audit all asset mutations and selections; add RBAC permissions and tests.
7. Coordinate with MNT-AUD-0011 because production storage/malware/sanitization adapters must also be completed.

**Repair Wave:** W3 / W5
**Status:** OPEN — READY_FOR_REMEDIATION_AFTER_ASSET_CROSS_PHASE_SWEEP


#### Live Register Update — v0.6 (2026-09-06)
- Confirmed findings: **26**
- P0: 0 | P1: **18** | P2: 7 | P3: 1 | P4: 0
- Latest finding: `MNT-AUD-0026` — P05/P23 Asset Administration & Selection Control Plane Missing.
- P23 remains `PARTIAL`; P24 remains `PARTIAL`.
- Source decision remains `SOURCE_NOT_COMPLETE`.

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0027"></a>

### مهمة 68 — MNT-AUD-0027 — W4 / P1

**المالك المقترح:** API + Admin/Web Frontend  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** MNT-AUD-0098.

#### MNT-AUD-0027 — P1 HIGH — P23 Course Admin Cannot Create Native Courses Despite Existing Owner API
**Categories:** ADMIN / MISSING_IMPLEMENTATION / API / CROSS_PHASE

**Evidence:**
- `CourseAdminRouter` exposes `POST /admin/courses` and delegates to `NativeCourseUseCases.create(...)`.
- Phase 23 architecture explicitly requires an **Add new course** workflow.
- Canonical `apps/admin/src/pages/CourseListPage.tsx` only lists, filters, paginates and opens existing courses; no Add/Create action or POST call exists.

**Impact:** Native course authoring cannot start from the canonical Admin Portal even though the owner-domain application/API contract is already available. This leaves P13↔P23 operational coverage incomplete.

**Required remediation:**
1. Add canonical Create Native Course flow to P23 with Phase 13 validation/contracts.
2. Include origin/access/language/category/difficulty and required initial metadata without duplicating domain rules.
3. Route immediately into the authoritative course detail/curriculum editor after creation.
4. Add RBAC, audit, validation/error/loading states and Admin E2E/source tests.

**Repair Wave:** W5
**Status:** OPEN — READY_FOR_REMEDIATION

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0033"></a>

### مهمة 69 — MNT-AUD-0033 — W4 / P1

**المالك المقترح:** API + Admin/Web Frontend  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** MNT-AUD-0084.

#### MNT-AUD-0033 — P1 HIGH — P23→P24 Public Visibility/Composition Control Contract Has No Source Implementation
**Categories:** ADMIN / PUBLIC_UI / RELATIONSHIP / ARCHITECTURE / MISSING_IMPLEMENTATION / DOCUMENTATION_DRIFT

**Evidence:**
- P24 Structure Contracts define `IPublicVisibilityControl` with Phase 23 as command source and explicit controls for visible/hidden pages, homepage sections, section ordering, published content and service availability.
- Repository search finds these controls only in the P24 documentation; no canonical P23 Admin workspace/API/settings contract implements them.
- Current P23 navigation has no Public Experience/Visibility workspace.
- Current P24 public composition is source-defined/static by route/component plus owner publication states; no P23 visibility command/read-model is consumed.

**Impact:** A documented Admin→Public control relationship is absent. Operators cannot govern homepage composition/page visibility from the canonical Admin as promised, and the architecture does not accurately describe how public visibility is actually determined.

**Required remediation:**
1. ARB decision: either implement a governed Public Composition configuration owned by P23/P16/P24 boundaries, or revise P24 to state that visibility derives only from owner publication lifecycle + CMS navigation/block configuration.
2. If implemented, define canonical configuration schema, versioning, preview, maker-checker approval, audit, rollback and cache invalidation.
3. P24 must consume the approved read model/configuration without owning business truth.
4. Add Admin preview/publish controls and Public integration tests.
5. Update P23 Part A/B/C, P24 Part A/B/C and cross-phase matrix together.

**Repair Wave:** W1 / W5 / W7
**Status:** OPEN — REQUIRES_P23_P24_COMPOSITION_DECISION


#### Live Register Update — v0.11 (2026-09-06)
- Confirmed findings: **33**
- P0: 0 | P1: **24** | P2: 8 | P3: 1 | P4: 0
- Added P23→P24 Public Visibility/Composition contract gap.

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0036"></a>

### مهمة 70 — MNT-AUD-0036 — W4 / P1

**المالك المقترح:** API + Admin/Web Frontend  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** MNT-AUD-0016.

#### MNT-AUD-0036 — P1 HIGH — P23 Student Administration/Support View Is Declared but Not Implemented
**Categories:** ADMIN / STUDENT / RELATIONSHIP / MISSING_IMPLEMENTATION / PRIVACY / CROSS_PHASE

**Evidence:**
- Active P23 Structure Contracts explicitly declare `IStudentsAdminView` as a canonical Administration Portal surface.
- Canonical `apps/admin/src/App.tsx` and `AdminNavigation.tsx` contain no Students/Student Support route or workspace.
- Repository search found no `StudentAdminRouter`, `/admin/students` API, or equivalent governed administrative read/command surface.
- P15 `StudentWorkspaceRouter` is correctly self-service oriented: authenticated ownership is derived from the session and legacy `:studentReferenceId` routes reject mismatched users.
- P15 lifecycle includes INITIALIZING/ACTIVE/SUSPENDED/ARCHIVED and consumes identity lifecycle events, but P23 has no operational surface to inspect provisioning failures, workspace state, consent/support context, event projection status or governed support actions.

**Impact:**
- The documented P23↔P15 administration relationship is incomplete.
- Operators have no canonical support path for students stuck in provisioning, lifecycle/event synchronization issues, or account/workspace incidents.
- Implementing ad-hoc DB access later would risk violating P15 privacy and ownership boundaries.

**Required remediation:**
1. Define P15-owned Admin Support contracts rather than allowing P23 direct Prisma access.
2. Provide privacy-minimized student search/detail/support read models: identity reference, workspace lifecycle, provisioning/event projection health, relevant support-safe metadata, consent/audit status and linked domain summaries only as authorized.
3. Separate support/read permissions from privileged lifecycle/security actions; identity suspension/archive remains owned by the Identity/IAM boundary and must flow to P15 through governed events.
4. Require explicit RBAC, reason codes, maker-checker where appropriate, immutable audit and PII minimization/redaction.
5. Build canonical P23 Student Support workspace using those APIs with no impersonation-by-default and no ability to edit private saved/search/history state arbitrarily.
6. Add ownership/IDOR/privacy tests plus post-connect event/provisioning support scenarios.
7. Update P15/P23 architecture and Cross-Phase Relationship Matrix with the final support boundary.

**Repair Wave:** W1 / W4 / W5
**Status:** OPEN — P15_P23_SUPPORT_BOUNDARY_REQUIRED


#### Live Register Update — v0.14 (2026-09-06)
- Confirmed findings: **36**
- P0: 0 | P1: **27** | P2: 8 | P3: 1 | P4: 0
- Added `MNT-AUD-0036` — P23 Student Administration/Support surface is declared but absent.
- P23 remains `PARTIAL`; P15 remains `PARTIAL` pending provisioning and support closure.

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0037"></a>

### مهمة 71 — MNT-AUD-0037 — W4 / P1

**المالك المقترح:** API + Admin/Web Frontend  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** MNT-AUD-0049، MNT-AUD-0095.

#### MNT-AUD-0037 — P1 HIGH — Public Global Search Is Client-Side Over a Truncated Loaded Subset While the Canonical Search Foundation Is Unavailable
**Categories:** SEARCH / PUBLIC_UI / ARCHITECTURE / MISSING_IMPLEMENTATION / RELATIONSHIP / PERFORMANCE / SOURCE_CLOSURE

**Evidence:**
- Current P24 `GlobalSearchPage.tsx` constructs search documents in the browser with `buildGlobalSearchDocuments(...)` from the already-loaded arrays for scholarships, universities, majors, countries, courses, exams, articles, services, tools and careers, then ranks them locally.
- `globalSearchIndex.ts` is therefore an in-memory client index, not a query against the complete published owner-domain catalog.
- This compounds `MNT-AUD-0025`: several P24 live loaders cap source data to the first 50/100 records, so records outside the loaded subset are invisible to global search even when they exist and are published.
- The canonical P05 Search use case/API still exists, but current DI wires both `searchRequestRepo` and `searchEngineGateway` to explicit `createUnavailableCapability(...)` implementations; it cannot provide a production search backend.
- The active Search domain contract is also still represented through generated/dummy source for some core search types, while P24 and older information-architecture documents promise platform-wide discovery.

**Impact:**
- Global search can return false negatives and cannot guarantee discovery across the full published catalog.
- Search relevance, pagination, filtering, multilingual analysis, indexing freshness and cross-domain consistency are bounded by whatever data P24 happened to preload into the browser.
- Large catalogs create unnecessary client memory/CPU pressure if the current design is expanded by simply loading more records.
- The P05↔P24 Search relationship is not source-closed.

**Required remediation:**
1. Make P05 Search a real typed platform capability, removing remaining dummy authority for active search contracts.
2. Implement a production search read/index strategy appropriate to launch scale (PostgreSQL FTS/trigram is acceptable initially if architecturally sufficient; Elasticsearch/OpenSearch is not mandatory merely for branding) behind `ISearchEngineGateway`.
3. Index only canonical published owner-domain read models; define domain index projections, stable IDs/slugs, locale fields, lifecycle visibility and freshness/update contracts.
4. Provide server-side global search API with query, type filters, locale, pagination/cursor, deterministic ranking contract and bounded result sizes.
5. P24 must query that API instead of building its authority from preloaded arrays; client-side indexing may remain only for tiny local suggestion caches, never as complete search truth.
6. Integrate publication/update/archive events or an idempotent reconciliation/index job so search cannot drift silently from owner truth.
7. Add Arabic/English normalization/relevance tests, lifecycle visibility tests, full-catalog pagination tests and post-connect search/index reconciliation validation.
8. Update P05 Search docs, P24 architecture/UX docs and the cross-phase matrix.

**Repair Wave:** W1 / W3 / W5 / W6
**Status:** OPEN — P05_P24_SEARCH_SOURCE_INCOMPLETE


#### Live Register Update — v0.15 (2026-09-06)
- Confirmed findings: **37**
- P0: 0 | P1: **28** | P2: 8 | P3: 1 | P4: 0
- Added `MNT-AUD-0037` — global public search is client-side over a truncated loaded subset while canonical search is unavailable.
- Security forensic + A4 Data Architecture audit continue.

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0046"></a>

### مهمة 72 — MNT-AUD-0046 — W4 / P1

**المالك المقترح:** API + Admin/Web Frontend  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** MNT-AUD-0017.

#### MNT-AUD-0046 — P1 HIGH — P24 Flattens Distinct P16 CMS Content Types into the Articles Surface
**Categories:** CMS / PUBLIC_UI / RELATIONSHIP / DOMAIN_MODEL / BUSINESS_LOGIC / SOURCE_CLOSURE

**Evidence:**
- P16 domain enum `CmsContentType` owns distinct semantic types including `ARTICLE`, `STUDY_GUIDE`, `NEWS`, `FAQ`, `CHECKLIST` and `STATIC_PAGE`.
- `CmsPublicRouter` correctly exposes a generic `/public/cms/content` query with an optional `contentType` filter and owner-owned slug delivery.
- P24 `loadPublishedArticles(locale)` calls `ApiClient.getCmsContent({ locale, page: 1, pageSize: 50 })` without filtering the content type, so every published editorial content type enters the public `articles` collection.
- `mapArticle()` recognizes NEWS/GUIDE/CHECKLIST but falls back to `ARTICLE` for the remaining types; therefore FAQ and STATIC_PAGE are semantically relabeled as articles.
- P24 router defines `/articles` and `/articles/:slug` but no canonical public FAQ/static-page/study-guide/news route family that preserves the P16 content-type identity.
- This is independent of the fixed 50-record pagination issue already tracked in `MNT-AUD-0025`.

**Impact:**
- P16 owner-domain semantics are lost at the P24 composition boundary.
- FAQs/static pages can appear in the wrong public catalog/detail template and acquire the wrong URL/SEO/content behavior.
- CMS navigation and redirects cannot reliably target canonical type-specific public routes if P24 collapses all editorial content into Articles.
- Future translation/SEO/search projections can index the wrong content class even though the P16 source record is correct.

**Required remediation:**
1. Preserve `CmsContentType` through the P16 public DTO and P24 public composition without relabeling.
2. Define canonical P24 rendering/routing policy per publishable CMS type: Articles, News, Study Guides, FAQs, Checklists and Static Pages (or an explicitly approved generic CMS route model that still preserves type semantics).
3. Make list loaders query the intended type(s) explicitly instead of loading all CMS content into `articles`.
4. Ensure navigation links, redirects, related-content projections, sitemap/SEO metadata and search documents use the canonical type-aware public URL.
5. Add negative tests proving FAQ/STATIC_PAGE cannot be rendered/indexed as ARTICLE unless an explicit editorial migration changes their owner type.
6. Update P16↔P24 relationship rows and P24 architecture/detail-route documentation.

**Repair Wave:** W4 / W5 / W6
**Status:** OPEN — CMS_PUBLIC_CONTENT_TYPE_SEMANTICS_COLLAPSED


#### Live Register Update — v0.25 (2026-09-06)
- Confirmed findings: **46**
- P0: 0 | P1: **36** | P2: 9 | P3: 1 | P4: 0
- Added `MNT-AUD-0046` — P24 collapses multiple P16 CMS content types into the Articles public surface.

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0061"></a>

### مهمة 73 — MNT-AUD-0061 — W4 / P1

**المالك المقترح:** API + Admin/Web Frontend  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** بوابة الموجة السابقة؛ راجع التبعيات التاريخية أدناه قبل التنفيذ.

#### MNT-AUD-0061 — P1 HIGH — `/compare` Public Route Is Declared but Has No Phase 22/24 Comparison Experience Implementation
**Categories:** PHASE22 / PHASE24 / PRODUCT_EXPERIENCE / PUBLIC / ROUTING / COMPARE / MISSING_IMPLEMENTATION / SOURCE_CLOSURE

**Evidence:**
- Phase 22 defines `Compare Opportunities` as a core user objective.
- Phase 22's mandatory Educational Discovery Journey explicitly requires `Discover -> Browse -> Search -> Filter -> Compare -> View Details -> Save -> Continue`.
- The Search Journey also specifies comparison as a comparative decision-support matrix.
- `apps/web/src/router/index.tsx` declares `path: 'compare'` and renders `PublicTemplateApp` for it; public route tests also expect the route to exist.
- `PublicTemplateApp.tsx` has direct route hydration branches for login, student, search, scholarships, universities, majors, courses, articles, services, international tests, countries, careers and tools, but no branch for `section === 'compare'`.
- Searching the full active `PublicTemplateApp.tsx` source for `compare` returns no match, and repository search finds no `ComparePage` implementation.
- Unknown public sections are intentionally left untouched by `PublicTemplateApp`, so `/compare` is a declared shell route without the required comparison state/composition.

**Impact:**
- A core Phase 22 decision-support objective is not implemented in the public product experience.
- The canonical `/compare` URL can resolve at the React router level while failing to produce a comparison experience.
- Route-presence tests can pass despite missing route behavior, creating a false-positive source-closure signal.
- Phase 22 and Phase 24 must be classified PARTIAL until the compare journey is implemented or formally removed from scope.

**Required remediation:**
1. Define the canonical comparison scope: supported entity types, maximum items, comparable attributes, locale behavior and stable URL/query-state contract.
2. Implement a Phase 24 public Compare composition consuming only owner-domain public DTOs/read models.
3. Preserve context from search/detail pages and support add/remove/share/deep-link behavior without synthetic facts.
4. Add loading/empty/unavailable/error states and mobile/RTL/accessibility behavior.
5. Add router integration/E2E tests proving `/ar/compare` and `/en/compare` hydrate the intended experience, not merely match a route.
6. Add Phase 22 journey acceptance tests covering Search -> Compare -> Detail -> return-context continuity.

**Repair Wave:** W5 / W6 / W7  
**Status:** OPEN — DECLARED_COMPARE_ROUTE_HAS_NO_PRODUCT_EXPERIENCE

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0112"></a>

### مهمة 74 — MNT-AUD-0112 — W4 / P1

**المالك المقترح:** API + Admin/Web Frontend  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** MNT-AUD-0055، MNT-AUD-0058.

#### MNT-AUD-0112 — P1 HIGH — P23 Later-Domain Admin Pages Expose Only a Subset of Existing Owner-API Mutations, Leaving Important Administrative Actions Without UI Parity
**Categories:** P23 / ADMIN / UI_API_PARITY / CAREERS / STUDENT_TOOLS / CONTROL_PLANE / MISSING_ACTION / SOURCE_CLOSURE

**Evidence:**
- `CareerAdminRouter.ts` exposes a real `PATCH /jobs/:id` owner mutation through `CareerAdminUseCases.updateJob(...)` in addition to create/list/detail/lifecycle commands.
- `CareerAdminPage.tsx` loads and creates jobs and exposes lifecycle actions such as mark-publishable, publish and archive, but the inspected page has no corresponding `PATCH`/`updateJob` mutation path for editing an existing job.
- `StudentToolsAdminRouter.ts` exposes administrative mutations for:
  - `PATCH /:toolKey/metadata`
  - `PATCH /:toolKey/availability`
  - `PATCH /:toolKey/flags`
  - `POST /:toolKey/lifecycle/:action` with `activate`, `testing`, `deprecate`, and `retire`
  - `POST /:toolKey/test`
- `StudentToolsAdminPage.tsx` was positively verified to call `PATCH /flags` and `POST /lifecycle/activate`, but no page call was found for `/metadata`, `/availability` or `/test`, and no UI call was found for the `testing`, `deprecate` or `retire` lifecycle commands.
- CMS and Services were inspected as counterexamples: their Admin pages expose substantial real owner-API create/edit/lifecycle workflows, so the defect is not that the whole P23 portal is a shell. The defect is incomplete action parity in later-domain workspaces.
- This is distinct from `MNT-AUD-0064`, which concerns permission-aware visibility/navigation, and from `MNT-AUD-0084`, which concerns central mutation-audit classification. Fixing either of those does not add the missing UI actions.
- It is also distinct from `MNT-AUD-0055`, which captures the larger missing Career/Alumni owner-domain scope; `0112` concerns administrative actions for owner APIs that **already exist**.

**Impact:**
- An administrator can reach a domain workspace yet still be unable to perform owner-supported administrative operations from the canonical Admin product.
- Operations may be forced to use direct API calls or ad-hoc tooling, weakening P23's role as the canonical control plane and increasing governance/audit inconsistency.
- Route/page-presence verifiers can pass while business-action parity remains incomplete.
- Student Tools governance cannot fully manage versioned availability, metadata, test execution or retirement/deprecation from the canonical UI despite the backend exposing those commands.
- Career administrators cannot reliably edit an existing implemented job record through the canonical UI even though the owner API supports the mutation.

**Required remediation:**
1. Create an executable P23 action-parity manifest: `Admin page/action -> owner API method/path -> backend permission -> auth/session/identity guard -> business/central audit -> validation -> result/error/empty state`.
2. Wire Career job edit/update to the existing owner mutation, preserving canonical references and any required version/concurrency contract.
3. Wire Student Tools metadata, versioned availability, test execution, testing/deprecate/retire lifecycle controls and appropriate confirmations/readiness constraints.
4. Make every control permission-aware under the final `0064` remediation and ensure every mutation receives the final `0084` audit policy.
5. Add deep-link and negative-state tests for missing permission, stale state, validation failure and owner-domain rejection.
6. Extend P23 closure verification to test action wiring, not merely page/file/route existence.

**Repair Wave:** W4 / W5 / W6 / W7  
**Status:** OPEN — P23_LATER_DOMAIN_ADMIN_ACTION_PARITY_INCOMPLETE

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0024"></a>

### مهمة 75 — MNT-AUD-0024 — W4 / P1

**المالك المقترح:** API + Admin/Web Frontend  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** بوابة الموجة السابقة؛ راجع التبعيات التاريخية أدناه قبل التنفيذ.

#### MNT-AUD-0024 — Phase 24 Live Projection Injects Synthetic/Unknown Values into User-Facing Facts and Filters

- **Discovered:** 2026-09-06
- **Phase:** P24 Public Platform with P10/P11/P12/P13 owner domains
- **Subsystem:** Public DTO adaptation / data integrity / trust
- **Files / Evidence:**
  - `apps/web/src/features/public-template/publicLiveDataSource.ts`
  - `apps/web/src/features/public-template/publicScholarshipDataSource.ts`
  - `apps/web/src/features/public-template/components/UniversitiesList.tsx`
  - `apps/web/src/features/public-template/types.ts`
- **Category:** `PUBLIC_UI` / `BUSINESS_LOGIC` / `QUALITY` / `RELATIONSHIP`
- **Severity:** **P1 — HIGH**
- **Scope:** SOURCE / CROSS-PHASE
- **Status:** OPEN
- **Evidence:** Live owner DTOs are adapted into presentation models by injecting values that are not owner facts. Examples include University `scholarshipCount: 0`, `acceptanceRate: ''` and blank image values; the University list then renders `0 منحة معتمدة` and an empty acceptance-rate label. Major mapping forces `futureDemand: 'متوسط'` and `averageScholarships: 0`. Scholarship mapping forces `withoutIelts: false`, while the public navigation exposes an `onlyWithoutIelts` filter, making the filter semantically incorrect when the owner DTO does not prove that field.
- **Expected Behavior:** P24 must never invent business facts. Missing owner data must be represented explicitly as unavailable/unknown or be obtained through a governed cross-domain read model. Derived facts must be deterministic and traceable to canonical source fields.
- **Impact:** Public users can receive misleading facts and incorrect filter results, directly violating P24 Trust/Accuracy principles.
- **Required Action:** Audit every public mapper field; classify each as owner-derived, deterministic-derived, presentation-only, or unsupported. Remove synthetic business defaults, introduce nullable/unknown UI states, add required owner read-model fields/relationship aggregations, and add contract tests rejecting fabricated live values.
- **Fix Wave:** W3/W4/W5/W6.

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0022"></a>

### مهمة 76 — MNT-AUD-0022 — W4 / P1

**المالك المقترح:** API + Admin/Web Frontend  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** بوابة الموجة السابقة؛ راجع التبعيات التاريخية أدناه قبل التنفيذ.

#### MNT-AUD-0022 — Phase 24 SEO Metadata Exists but Is Client-Injected; Crawlable SSR/Prerender Delivery Is Not Implemented

- **Discovered:** 2026-09-06
- **Corrected:** 2026-09-06 after deeper source inspection
- **Phase:** P24 Enterprise Public Platform
- **Subsystem:** SEO / server rendering / metadata / discoverability
- **Files / Evidence:**
  - `docs/phases/phase-24-enterprise-public-platform/phase-24-01-enterprise-public-platform-architecture-specification.md`
  - `apps/web/package.json`
  - `apps/web/src/components/Seo.tsx`
  - `scripts/generate-localized-public-sitemap.ts`
  - `tests/translation/localized-sitemap.spec.ts`
  - `apps/web/index.html`
- **Category:** `PUBLIC_UI` / `SEO` / `MISSING_IMPLEMENTATION` / `ARCHITECTURE`
- **Severity:** **P1 — HIGH**
- **Scope:** SOURCE
- **Status:** OPEN
- **Corrected Evidence:** The frozen source DOES contain route-aware SEO infrastructure: `Seo.tsx` creates canonical and locale-alternate/hreflang links, and `generate-localized-public-sitemap.ts` emits localized sitemap entries with `ar`, `en` and `x-default`; sitemap/locale tests also exist. The earlier statement that canonical/hreflang/sitemap were absent was therefore too broad and is superseded by this corrected finding. The remaining source defect is rendering architecture: `Seo.tsx` mutates `document.head` in the browser, while the web app remains a client Vite SPA using browser routing; no SSR/SSG/prerender entry was found that emits route-specific metadata/content in the initial HTML response. Structured-data/JSON-LD coverage also remains unproven in the inspected public source.
- **Expected Behavior:** Every canonical public entity/detail route must deliver crawlable route-specific title/description/canonical/hreflang/OpenGraph and applicable structured data in the initial rendered document or deterministic prerendered artifact. Localized sitemap/robots/indexability policy must be generated from the same canonical route/read-model contract.
- **Impact:** The project has useful client-side SEO metadata and localized sitemap infrastructure, but crawlers/social agents that do not execute the SPA reliably can still receive generic initial HTML metadata/content. P24's declared SEO rendering ownership therefore remains only partially source-closed.
- **Required Action:** Preserve the existing `Seo.tsx`/localized sitemap contracts, choose and implement SSR/SSG/prerender delivery for canonical public routes, add route-level JSON-LD where applicable, ensure canonical/hreflang parity between initial HTML and client navigation, add robots/indexability governance, and test raw HTML responses/prerender artifacts rather than only browser-side DOM mutation.
- **Fix Wave:** W3/W5/W6.

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0099"></a>

### مهمة 77 — MNT-AUD-0099 — W4 / P2

**المالك المقترح:** API + Admin/Web Frontend  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** بوابة الموجة السابقة؛ راجع التبعيات التاريخية أدناه قبل التنفيذ.

#### MNT-AUD-0099 — P2 MEDIUM — Approved RFC 7807 Error Contract Is Not Implemented Consistently Across the HTTP API
**Categories:** API / ERROR_CONTRACT / RFC7807 / CLIENT_COMPATIBILITY / OBSERVABILITY / GOVERNANCE / SOURCE_CLOSURE

**Evidence:**
- Approved `STD-API-001` requires RFC 7807 Problem Details for HTTP API errors.
- The global `GlobalExceptionHandler` serializes unhandled errors through `PresentationErrorTranslator`, which returns the project envelope `{ data: null, error: { code, message, details, traceId }, meta: ... }`, not an RFC 7807 Problem Details document.
- No `application/problem+json` implementation marker was found in the repository.
- Many routers install local error middleware that intercepts failures before the global handler and returns still different shapes, e.g. `{ error: 'Validation Error', details: [...] }`, `{ error: err.message }`, or domain-specific additions.
- Confirmed examples include Service Admin, Career Admin, Asset, Academic Taxonomy, Study Destination, Finance, University, Course and Scholarship routes.
- Thus the API currently has at least two non-RFC error families: the global MANARATAK envelope and router-local ad hoc JSON errors.

**Impact:**
- Clients cannot rely on one canonical machine-readable failure shape, status taxonomy or media type across domains.
- Error parsing, localization, retry classification and observability correlation require route-specific branching.
- Local handlers can bypass trace IDs and structured serialization available in the global handler, reducing diagnostic consistency.
- The approved API standard is contradicted by executable presentation code even when business logic itself is correct.

**Required remediation:**
1. Define the canonical RFC 7807 profile for MANARATAK (`type`, `title`, `status`, `detail`, `instance`) with approved extensions such as stable `code`, `traceId`, validation issues and correlation metadata.
2. Make the global exception boundary emit `application/problem+json` and the canonical Problem Details object.
3. Remove/normalize router-local generic error middleware so errors flow through the shared translator; retain local translation only where it maps typed domain errors to status/code before the canonical formatter.
4. Convert Zod validation failures into the same Problem Details contract rather than a separate `{error,details}` family.
5. Add contract tests across public/admin/student/auth routes asserting media type, mandatory fields, stable codes and trace IDs.
6. Update Web/Admin API clients to parse the canonical contract and eliminate legacy shape fallbacks after migration.
7. Add an architecture/source guard preventing direct ad hoc `res.status(...).json({ error: ... })` error envelopes outside approved low-level boundaries.

**Repair Wave:** W1 / W4 / W5 / W7  
**Status:** OPEN — HTTP_ERROR_SURFACES_DIVERGE_FROM_APPROVED_RFC7807_CONTRACT

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0100"></a>

### مهمة 78 — MNT-AUD-0100 — W4 / P2

**المالك المقترح:** API + Admin/Web Frontend  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** بوابة الموجة السابقة؛ راجع التبعيات التاريخية أدناه قبل التنفيذ.

#### MNT-AUD-0100 — P2 MEDIUM — Large Catalog APIs Use Offset `page/pageSize` Pagination Instead of the Approved Cursor-Based API Standard
**Categories:** API / PAGINATION / CURSOR / SCALABILITY / DATA_CONSISTENCY / P07_P24 / SOURCE_CLOSURE

**Evidence:**
- Approved `STD-API-001` requires **cursor-based pagination for large datasets**.
- Repository search found no canonical `cursor` / `nextCursor` API contract or pagination implementation across the major catalog surfaces.
- Large owner/public catalogs use offset-style `page` and `pageSize`, including Universities, Courses, Majors, Careers and Services; admin/import/test surfaces use the same general pattern.
- These domains are explicitly expected to grow to large cardinalities, making the approved cursor rule applicable rather than merely stylistic.
- This is distinct from `MNT-AUD-0025`: `0025` is a P24 product-composition defect where the Web loads only fixed initial pages and searches an incomplete browser snapshot. Even if P24 looped every offset page, the API would still violate the approved cursor contract; conversely adding cursor APIs alone would not fix P24 if the Web still stops after the first page.

**Impact:**
- Offset pagination can skip or repeat rows under concurrent inserts/updates and becomes progressively more expensive at deep offsets.
- API clients cannot use stable continuation tokens across changing catalogs as required by the approved interface standard.
- Public search/discovery and admin review flows inherit weaker traversal guarantees at scale.
- API contract drift increases the cost of later migration because DTOs, clients, tests and UI state are currently shaped around page numbers.

**Required remediation:**
1. Define one shared cursor pagination contract (`items/data`, opaque `nextCursor`, optional `hasMore`, bounded `limit`) with deterministic sort/tie-break keys.
2. Migrate large catalog owner APIs to stable keyset/cursor queries; use immutable or monotonic tie-breakers such as `(updatedAt,id)` or domain-appropriate publication keys.
3. Keep offset pagination only for explicitly approved small/reporting surfaces where stable continuation is not required, documenting exemptions.
4. Update Web/Admin clients and P24 global discovery flows to consume cursors until the requested result window is satisfied rather than materializing arbitrary first pages.
5. Add mutation-during-pagination tests proving no duplicate/omitted traversal for the selected ordering contract.
6. Add source/API-contract guards preventing new large catalog endpoints from introducing page-number pagination.

**Repair Wave:** W2 / W4 / W6 / W7  
**Status:** OPEN — LARGE_DATASET_API_PAGINATION_DIVERGES_FROM_APPROVED_CURSOR_STANDARD

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0025"></a>

### مهمة 79 — MNT-AUD-0025 — W4 / P1

**المالك المقترح:** API + Admin/Web Frontend  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** MNT-AUD-0100.

#### MNT-AUD-0025 — Phase 24 Public Catalogs and Global Search Silently Load Only the First Fixed API Page

- **Discovered:** 2026-09-06
- **Phase:** P24 Public Platform
- **Subsystem:** Catalog pagination / search completeness / discovery
- **Files / Evidence:**
  - `apps/web/src/features/public-template/publicLiveDataSource.ts`
  - `apps/web/src/features/public-template/publicScholarshipDataSource.ts`
  - `apps/web/src/features/public-template/PublicTemplateApp.tsx`
- **Category:** `PUBLIC_UI` / `SEARCH` / `PERFORMANCE` / `MISSING_IMPLEMENTATION`
- **Severity:** **P1 — HIGH**
- **Scope:** SOURCE / CROSS-PHASE
- **Status:** OPEN
- **Evidence:** Live public loaders request only fixed first pages, e.g. Scholarships `page:1,pageSize:50`, Universities `50`, Majors `50`, International Tests `50`, Courses `50`, Countries `100`. The loader returns only `result.data` and discards total/totalPages. Public search/filtering operates over the resulting client snapshot; no public global-search API invocation or continuation/pagination loop was found. Direct detail routes can fetch a missed item by slug, but catalog/search discovery cannot surface records beyond the first loaded page.
- **Expected Behavior:** Public catalogs must support complete server-driven pagination/cursoring and search/filter queries across all published records. Global search must query authoritative owner/search infrastructure rather than only an arbitrary initial client snapshot.
- **Impact:** Once a domain exceeds 50/100 published records, most content silently disappears from browsing/search despite existing in owner domains. This is a direct completeness failure for MANARATAK's catalogs.
- **Required Action:** Replace snapshot-only catalog loading with paginated/cursor domain adapters and a governed global-search/read-model service; preserve query/filter state in canonical URLs; expose total/next-page state; add large-catalog tests proving records beyond the first page are discoverable.
- **Fix Wave:** W3/W5/W6.

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0014"></a>

### مهمة 80 — MNT-AUD-0014 — W4 / P2

**المالك المقترح:** API + Admin/Web Frontend  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** بوابة الموجة السابقة؛ راجع التبعيات التاريخية أدناه قبل التنفيذ.

#### MNT-AUD-0014 — Phase 13 Public Course Contract Drifts Between Canonical Domain DTO and Web Client

- **Discovered:** 2026-09-06
- **Phase:** P13 Learning Platform
- **Subsystem:** Public Course API contract / Web composition
- **Files:**
  - `packages/domain/src/courses/entities/PublicCourseDto.ts`
  - `apps/web/src/api/client.ts`
- **Category:** `API` / `DOMAIN_MODEL` / `PUBLIC_UI` / `DOCUMENTATION_DRIFT`
- **Severity:** **P2 — MEDIUM**
- **Scope:** SOURCE
- **Status:** OPEN
- **Evidence:** The canonical domain `PublicCourseDto` requires `ownerId` as part of the Phase 13 public identity contract, while the Web API client declares the same field as optional (`ownerId?: string`).
- **Expected Behavior:** Consumer-facing TypeScript contracts must remain structurally aligned with the canonical API/domain contract; required canonical ownership/identity fields must not become optional in downstream clients.
- **Impact:** Type-level drift allows downstream UI code to accept payload shapes that violate the Phase 13 public contract, weakening compile-time detection of API regressions.
- **Required Action:** Establish one generated/shared public API contract source or synchronize the Web client type with the canonical DTO; add contract tests/schema generation so this drift cannot recur.
- **Fix Wave:** W3/W5/W6.

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0069"></a>

### مهمة 81 — MNT-AUD-0069 — W4 / P1

**المالك المقترح:** API + Admin/Web Frontend  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** MNT-AUD-0014.

#### MNT-AUD-0069 — P1 HIGH — Phase 24 Loads Canonical Native Courses but Routes/Maps Them as Imported Courses; Native Catalog Remains a Placeholder
**Categories:** P24 / P13 / PUBLIC_WEB / COURSES / ROUTING / READ_MODEL / ORIGIN_TYPE / CATALOG_ISOLATION / DEEP_LINK

**Evidence:**
- Phase 24 Part C explicitly requires three visually and semantically isolated course catalogs: `Manaratak Courses`, `Global Free Courses`, and paid auxiliary courses/services; it also requires Phase 24 to compose those surfaces from Phase 13 owner read models without redefining course ownership.
- The public live data source calls the canonical `ApiClient.getCourses` endpoint and maps every returned `PublicCourseDto`, proving Phase 13 published course data is already available to the public composition layer.
- `PublicCourseDto` includes `originType` and `accessType`, so the public client has the owner-domain information required to distinguish `NATIVE_MANARATAK_COURSE` from external/imported records and paid offerings.
- `mapCourse(dto)` creates both a generic `Course` and an `ImportedCourse` representation for every DTO, but does not use `dto.originType` to guard creation of the imported representation or select the correct catalog.
- `CoursesSearchPage` declares a `courses?: Course[]` prop but the component implementation destructures/uses only `importedCourses`; the live native `courses` collection is therefore not rendered by that catalog surface.
- `PublicTemplateApp` sends the `imported` track to the real `CoursesSearchPage`, while `native` and `paid` are sent to `CourseTrackPreview`.
- `CourseTrackPreview` is explicitly an empty-state placeholder that states native/paid tracks are “waiting for data linkage,” despite the public live source already loading canonical Phase 13 course DTOs.
- Deep-link handling for `/courses/:slug` calls `ApiClient.getCourseBySlug(key)`, then forces `selectedCourseTrack: 'imported'` and stores `mapCourse(...).imported`. It does not branch on owner `originType`.
- Therefore a canonical native course can be transformed and presented using the imported-course view path, while the actual native-course track remains unavailable.

**Impact:**
- The public platform violates the Phase 24 course-catalog isolation contract and can misclassify owner-native courses as imported/external courses.
- Native MANARATAK courses fetched from Phase 13 are effectively discarded from the native catalog UI.
- Direct links to native courses can land in the wrong presentation semantics, including provider/direct-link/certificate assumptions designed for imported courses.
- Public user trust and course-origin semantics become unreliable; a visitor cannot reliably distinguish MANARATAK-owned learning from an external provider course.
- The current source cannot claim P13→P24 public native-course closure even though the owner API already supplies the required discriminator.

**Required remediation:**
1. Preserve and use `PublicCourseDto.originType` as the authoritative discriminator in Phase 24 composition.
2. Map native, external/imported and paid offerings into separate presentation models without synthesizing an `ImportedCourse` for native owner records.
3. Render the existing live `courses` collection in the `Manaratak Courses` track and bind the paid track to its authoritative owner DTOs when available.
4. Make `/courses/:slug` resolve the record's actual origin/access type before choosing the detail component/track.
5. Ensure native-course detail pages render Phase 13 curriculum/preview owner fields, while external courses retain direct provider landing URLs and imported provenance semantics.
6. Add route tests for at least one native, one imported/free and one paid course proving stable deep links and correct track classification.
7. Add a source verifier that fails if `originType` is ignored by public course mapping/routing.
8. Reconcile Phase 24 course-catalog acceptance claims and P13 public source-closure documentation with the corrected end-to-end behavior.

**Repair Wave:** W4 / W5 / W6 / W7  
**Status:** OPEN — P24_NATIVE_COURSE_CATALOG_AND_DEEP_LINK_ORIGIN_MISCLASSIFIED

### Live Register Update — v0.34 (2026-09-06)

- Registered finding IDs allocated: **69** (`MNT-AUD-0001` → `MNT-AUD-0069`).
- Duplicate/evidence-alias IDs excluded from canonical count: **3** (`0038`, `0039`, `0053`).
- **Canonical unique confirmed findings: 66**
- Severity (canonical unique): **P0: 0 | P1: 50 | P2: 15 | P3: 1 | P4: 0**
- New canonical finding in this continuation: `MNT-AUD-0069`.
- P24 generic data `empty/unavailable/error/retry` handling was positively verified; no broad duplicate error-state finding was added.
- No source/code repair, migration, backfill, seed, database mutation or production runtime change has been executed.
- Frozen audit baseline remains `0931c5664cf274cb2b8f4cb250dd09ebf2e9a77f`.
- Project decision remains: **SOURCE_NOT_COMPLETE — AUDIT_IN_PROGRESS**.

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0064"></a>

### مهمة 82 — MNT-AUD-0064 — W4 / P2

**المالك المقترح:** API + Admin/Web Frontend  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** MNT-AUD-0020.

#### MNT-AUD-0064 — P2 MEDIUM — Phase 23 Admin SPA Grants the Entire Frontend Control Plane After Detecting Any `admin:*`-Scoped Permission and Does Not Make Navigation/Routes Permission-Aware
**Categories:** PHASE23 / ADMIN / RBAC / LEAST_PRIVILEGE / FRONTEND_AUTHORIZATION / UX / ROUTING / TEST_GAP

**Evidence:**
- `apps/admin/src/App.tsx` calls `/auth/me` and considers the session authorized when `effectivePermissions` contains `*`, `admin:*`, or merely any permission whose value starts with `admin:`.
- After that single boolean gate succeeds, `AdminLayout` renders the full `<AdminNavigation />` and the complete route set for scholarships, universities, majors, courses, certificates, CMS, services, finance, careers, AI, student tools, settings, taxonomy, imports and health/readiness without a per-route permission check.
- `apps/admin/src/components/AdminNavigation.tsx` defines navigation items with only route/label/icon metadata; it has no required-permission field and renders every group/item unconditionally.
- The backend is materially stricter: privileged domain routers are composed with granular `requireAdminPermission(...)` checks. Therefore backend authorization remains the authority, but the canonical Phase 23 UI does not reflect the same least-privilege model.
- This is distinct from `MNT-AUD-0020` (missing IAM/RBAC management workspaces): the defect here is permission-aware consumption of existing RBAC in the canonical Admin SPA.

**Impact:**
- An operator who legitimately owns one narrow administrative permission can see navigation and controls for unrelated privileged domains and then encounter backend 403 responses.
- The UI violates least-privilege expectations and makes role design operationally confusing even where the backend correctly rejects unauthorized mutations.
- Frontend route discovery exposes the full control-plane information architecture to every authenticated admin-scoped principal instead of presenting only authorized workspaces.
- There is no frontend role/permission matrix regression evidence proving that distinct operators receive distinct navigation/action surfaces.

**Required remediation:**
1. Persist the `/auth/me` effective permission set in a canonical Admin auth/session context rather than collapsing it to a single `authorized` boolean.
2. Define a required-permission contract for every Phase 23 navigation item, route and privileged action, aligned with the backend route permission.
3. Filter or disable navigation/actions by effective permission and add direct-route guards so manual URL entry receives a clear access-denied state.
4. Keep backend RBAC as the authoritative security boundary; frontend filtering is defense-in-depth and correct operator UX, not a replacement for server authorization.
5. Add role-matrix E2E/integration tests covering at least read-only reviewers, domain editors, publishers, platform operators and super-admin behavior.
6. Add a verifier that detects Admin routes/navigation entries without an explicit frontend permission contract unless the route is intentionally common to all admins.

**Repair Wave:** W1 / W6 / W7  
**Status:** OPEN — P23_ADMIN_UI_NOT_PERMISSION_AWARE

### Security Deep-Audit Result — Phase 06 SSRF / Source Acquisition

No new finding was registered for SSRF/source acquisition in this pass.

**Verified source controls:**
- `NodeSafeSourceHttpTransport` is a real network transport, not a documentation-only contract.
- Source network access is HTTPS-only and blocks embedded URL credentials.
- `SourceNetworkSecurityPolicy` constrains requests to source-owned allowed origins/path prefixes and supports controlled subdomain policy.
- Hostnames are DNS-resolved and every resolved address must pass `PublicNetworkAddressPolicy`; private/non-public address resolution is rejected.
- The request executor pins the validated address while preserving the hostname for TLS SNI, mitigating DNS rebinding between validation and connection.
- Redirect targets are reconstructed and revalidated through the same security policy before the next request.
- Response size, redirect count and timeout are bounded by hard limits.

**Audit decision:** `SSRF_SOURCE_ACQUISITION_CONTROL = SOURCE_PRESENT / NO_NEW_FINDING`

### Phase 18 Student Tools Reconciliation

No new Phase 18 scope finding was registered in this pass.

**Verified scope truthfulness:**
- The Phase 18 source-closure report explicitly states that the official registry contains 83 definitions but only four are implemented/executable.
- The remaining definitions are explicitly planned/admin-only and cannot execute; the closure report does not falsely claim that all 83 tools are runnable.
- The implementation guide defines priority-based onboarding (`P1_CORE_LAUNCH`, then expansion priorities), supporting incremental tool delivery rather than silently treating planned entries as implemented functionality.
- Runtime/Google Studio evidence remains explicitly pending and therefore must not be upgraded to production/runtime closure during final reconciliation.

**Audit decision:** `P18_PLATFORM_SOURCE_SCOPE = NO_NEW_SOURCE_FINDING; RUNTIME_PROOF_STILL_PENDING`

### Live Register Update — v0.31 (2026-09-06)

- Registered finding IDs allocated: **64** (`MNT-AUD-0001` → `MNT-AUD-0064`).
- Duplicate/evidence-alias IDs excluded from canonical count: **3** (`0038`, `0039`, `0053`).
- **Canonical unique confirmed findings: 61**
- Severity (canonical unique): **P0: 0 | P1: 46 | P2: 14 | P3: 1 | P4: 0**
- New canonical finding in this continuation: `MNT-AUD-0064`.
- Phase 06 SSRF/source-acquisition controls were positively verified; no security finding was manufactured where source controls exist.
- Phase 18 incremental tool scope was reconciled against its source-closure report; no additional scope finding was added in this pass.
- No source/code repair, migration, backfill, seed, database mutation or production runtime change has been executed.
- Frozen audit baseline remains `0931c5664cf274cb2b8f4cb250dd09ebf2e9a77f`.
- Project decision remains: **SOURCE_NOT_COMPLETE — AUDIT_IN_PROGRESS**.

### Next mandatory continuation after v0.31
1. Complete remaining P23 route/action matrix, especially mutation-audit coverage and missing owner-domain administrative surfaces.
2. Complete P24 route-by-route deep-link/locale/SEO/filter/pagination/accessibility matrix beyond already-proven Compare and search defects.
3. Reconcile every transactional-outbox producer/consumer pair and runtime scheduler across domain phases.
4. Complete observability/deployment/graceful-shutdown and multi-instance failure semantics without duplicating `MNT-AUD-0040`/`0063`.
5. Complete CI/verifier truthfulness and final file-by-file documentation/source authority reconciliation.

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0044"></a>

### مهمة 83 — MNT-AUD-0044 — W4 / P2

**المالك المقترح:** API + Admin/Web Frontend  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** بوابة الموجة السابقة؛ راجع التبعيات التاريخية أدناه قبل التنفيذ.

#### MNT-AUD-0044 — P2 MEDIUM — P23 Unified Review Queue Is a Fixed Sample, Not an Exhaustive Operational Queue
**Categories:** ADMIN / WORKFLOW / PAGINATION / REVIEW / QUALITY / DOCUMENTATION_DRIFT

**Evidence:**
- `AdminReviewQueuePage.tsx` calculates several summary totals using `pageSize=1` responses and returned `total`, so the aggregate counters can reflect the full domain backlog.
- The actual actionable list is different: `loadFromQueries()` fetches only `page=1&pageSize=20` for each review reason.
- Scholarship import review fetches only `page=1&pageSize=40`.
- Imported-course verification scans only a `page=1&pageSize=50` window.
- The resulting sampled arrays are then merged and filtered/sorted/paginated locally by the Admin UI; no server cursor/continuation loop is used to make the unified queue exhaustive.
- Therefore saved views such as urgent, overdue, translation, source-verification and duplicates can omit valid older/past-first-page work while counters still indicate a larger backlog.

**Impact:**
- Administrators cannot rely on the Unified Review Queue as a complete work queue.
- High-priority or overdue records can remain unreachable from the aggregate page if they fall outside the first sampled windows.
- P23's operational-control promise is weaker than its UI naming/contracts imply, even though domain-specific workspaces may still contain the records.

**Required remediation:**
1. Replace fixed sampling with a server-side unified review read model/query API or cursor-based fan-out that supports exhaustive pagination.
2. Make filtering/sorting/SLA/priority evaluation server-side (or over a complete bounded result set), not over first-page samples.
3. Return total, cursor/next-page, source-domain and reason metadata with stable ordering.
4. Ensure urgent/overdue/duplicate/translation/source-verification saved views cannot silently omit records.
5. If a deliberately sampled “recent items” widget remains, label it explicitly as a sample and keep it separate from the authoritative queue.
6. Add contract tests with >1 page per domain/reason proving older high-priority work remains reachable.
7. Update P23 review-queue contracts/workflows to match the final implementation.

**Repair Wave:** W5 / W6
**Status:** OPEN — UNIFIED_REVIEW_QUEUE_NOT_EXHAUSTIVE


#### Live Register Update — v0.22 (2026-09-06)
- Confirmed findings: **44**
- P0: 0 | P1: 34 | P2: **9** | P3: 1 | P4: 0
- Added `MNT-AUD-0044` — P23 Unified Review Queue uses fixed first-page samples and can omit actionable backlog.


#### Live Register Correction — v0.23 (2026-09-06)
- `MNT-AUD-0022` corrected after deeper source inspection: canonical/hreflang and localized sitemap infrastructure DO exist.
- Remaining P1 issue is the lack of crawlable SSR/SSG/prerender delivery and unproven structured-data coverage, not total SEO absence.
- Finding count/severity totals unchanged by this correction.

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0059"></a>

### مهمة 84 — MNT-AUD-0059 — W4 / P2

**المالك المقترح:** API + Admin/Web Frontend  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** MNT-AUD-0058.

#### MNT-AUD-0059 — P2 MEDIUM — Phase 20 Admin UI Uses Service Enums That Do Not Match the Domain/API Contract and Exposes Values the API Rejects
**Categories:** PHASE20 / P23 / ADMIN / CONTRACT_DRIFT / ENUM / API / UX / TEST

**Evidence:**
- `ServicesAdminPage.tsx` defines category values including `AUXILIARY_PROFESSIONAL_SERVICES` and `ENTERPRISE_OPERATIONAL_SERVICES`, while the owner-domain `ServiceCategory` enum defines `PROFESSIONAL_SERVICES` and `ENTERPRISE_SERVICES`.
- The Admin page defines fulfillment values including `BOOKING_OR_APPOINTMENT`, `DIGITAL_DELIVERABLE`, `MANUAL_FULFILLMENT` and `HYBRID_WORKFLOW`; the owner-domain enum instead defines `BOOKING`, `APPLICATION_SUPPORT` and `MANAGED_SERVICE` in addition to Consultation/Document Processing.
- The Admin page includes availability/status values such as `COMING_SOON`, `LIMITED` and `IMPORTED` that do not match the active owner-domain enums.
- `ServiceAdminRouter` validates request/query payloads with `z.nativeEnum(ServiceCategory)`, `z.nativeEnum(ServiceFulfillmentType)`, `z.nativeEnum(ServiceAvailabilityStatus)` and `z.nativeEnum(ServiceStatus)` from `@manaratak/domain`.
- Therefore the Admin form can offer values that are invalid at the authoritative API boundary and will fail validation when submitted.
- No source-level Admin/API contract test was found that imports the domain enums into the Admin page or checks every selectable value against the API schema.

**Impact:**
- Administrators can select legitimate-looking options in the canonical Admin UI that the API rejects with validation errors.
- Existing records using owner-domain values can be displayed through a UI whose local type union does not faithfully model the returned contract.
- P23 is not contract-safe for Phase 20 management even within the currently implemented subset.

**Required remediation:**
1. Remove duplicated local enum/type definitions from `ServicesAdminPage.tsx`.
2. Consume shared generated/API contracts or a stable shared presentation DTO derived from the Phase 20 owner contract.
3. Add explicit mapping only where presentation labels differ from domain values; never invent alternate API enum values in the UI.
4. Add Admin integration tests that iterate every selectable category/fulfillment/availability/status value and prove API acceptance.
5. Add a source contract guard preventing Phase 20 Admin enum drift.

**Repair Wave:** W5 / W6 / W7  
**Status:** OPEN — PHASE20_ADMIN_API_ENUM_CONTRACT_DRIFT

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0028"></a>

### مهمة 85 — MNT-AUD-0028 — W4 / P2

**المالك المقترح:** API + Admin/Web Frontend  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** بوابة الموجة السابقة؛ راجع التبعيات التاريخية أدناه قبل التنفيذ.

#### MNT-AUD-0028 — P2 MEDIUM — P24 English Locale Route Exists but Main Public Composition Forces Arabic
**Categories:** PUBLIC_UI / LOCALIZATION / DOCUMENTATION_DRIFT / API

**Evidence:**
- `apps/web/src/router/index.tsx` exposes locale-aware `/:locale?` routes and synchronizes the route locale with the i18n provider.
- P24 structure contracts include a bilingual Arabic/English platform identity.
- `PublicTemplateApp.tsx` hard-codes `const language: Language = 'ar'` and explicitly states English presentation is unavailable.
- That forced value is passed into owner API loaders and public composition even for `/en/...` routes.

**Impact:** `/en` is a misleading locale contract: the route exists but the primary public composition remains Arabic. Locale-aware owner APIs and navigation therefore cannot provide real English parity.

**Required remediation:**
1. Decide and document the source-closure language contract explicitly.
2. If `/en` remains an active public route, consume the actual i18n route locale throughout PublicTemplateApp and all loaders/components.
3. Complete missing English presentation copy or remove/redirect unsupported locale routes until parity is source-complete.
4. Add AR/EN route, layout, content and canonical-identity parity tests.
5. Synchronize P24 architecture/UX docs with the final decision.

**Repair Wave:** W5 / W7
**Status:** OPEN — REQUIRES_P24_LOCALIZATION_DECISION

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0090"></a>

### مهمة 86 — MNT-AUD-0090 — W4 / P2

**المالك المقترح:** API + Admin/Web Frontend  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** بوابة الموجة السابقة؛ راجع التبعيات التاريخية أدناه قبل التنفيذ.

#### MNT-AUD-0090 — P2 MEDIUM — Arabic Web/Admin Dictionaries Contain Untranslated Mixed-English Production Copy While the Translation Quality Gate Checks Structure, Not Target-Language Semantics
**Categories:** I18N / L10N / ARABIC / CONTENT_QUALITY / UI / P23 / P24 / CI / VERIFIER_TRUTH / SOURCE_CLOSURE

**Evidence:**
- Both `apps/admin/src/i18n/ar.ts` and `apps/web/src/i18n/ar.ts` contain Arabic dictionary entries with untranslated English copy, for example `"view_service": "عرض service"`.
- The same Arabic dictionaries contain a long mixed-language value beginning `"استكشاف MANARATAK student, document, visa, travel, academic, and auxiliary support services."`.
- `scripts/verify-translation-quality-source.ts` checks AR/EN key parity, empty values, literal translation-key coverage, provider direction/lang wiring, locale contracts, source-shape clauses, projection/import contracts and SEO contracts.
- The gate does not perform target-language semantic validation, untranslated-token detection, mixed-language ratio checks, human-review status checks or an allow-listed proper-name/technical-term policy.
- The gate can therefore eventually report `TRANSLATION_SOURCE_QUALITY_GATE = PASS` while user-visible Arabic dictionary values still contain accidental English prose.
- This is distinct from `MNT-AUD-0009`, which records that the current translation gate itself can fail because of brittle literal/source-shape assertions. `0090` records the opposite blind spot: semantic Arabic defects are outside what the gate proves.

**Impact:**
- Arabic-first Admin/Public surfaces can visibly leak untranslated English phrases and inconsistent terminology.
- “Translation quality PASS” is not sufficient evidence that the Arabic presentation copy is actually Arabic or publication-ready.
- Duplicated Web/Admin dictionary defects can propagate consistently across both products while still passing structural parity checks.

**Required remediation:**
1. Correct all Arabic dictionary values containing accidental English prose, preserving explicitly approved brands/acronyms/technical terms only.
2. Add a Unicode/script-aware semantic localization lint that flags suspicious Latin-word sequences in Arabic values with an explicit allow-list.
3. Distinguish approved mixed technical labels from untranslated prose through metadata or lint exceptions that require review justification.
4. Add representative tests for Arabic presentation copy, especially service/career/finance/admin operational terminology.
5. Reconcile Web/Admin dictionary ownership to reduce duplicated copy drift where a shared translation catalog is appropriate.
6. Keep this semantic quality check separate from the infrastructure-only domain-content translation policy.

**Repair Wave:** W4 / W5 / W6 / W7  
**Status:** OPEN — ARABIC_DICTIONARY_SEMANTIC_QUALITY_NOT_COVERED_BY_TRANSLATION_GATE

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0107"></a>

### مهمة 87 — MNT-AUD-0107 — W5 / P1

**المالك المقترح:** Product Frontend + Student/Learning Backend + QA  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** MNT-AUD-0076، MNT-AUD-0113.

#### MNT-AUD-0107 — P1 HIGH — Student Tools Optional Authentication Is Never Composed, Breaking Authenticated Execution Ownership and the Public-to-Student Save Handoff
**Categories:** SECURITY / OPTIONAL_AUTH / P18 / P24 / STUDENT_JOURNEY / IDENTITY / OWNERSHIP / WEB_API_PARITY / SOURCE_CLOSURE

**Evidence:**
- `StudentToolsPublicRouter` explicitly supports two requester modes. It selects `AUTHENTICATED_STUDENT` when `req.authUserId` exists, binds executions to that student, and requires the field for `POST /executions/:executionId/save`.
- The canonical application mounts the router directly at `/api/v1/public/student-tools` through `lazyRouter('studentToolsPublicRouter')` with no authentication or optional-auth middleware before it.
- The only discovered `AuthMiddleware` runtime mounts are inside `StudentWorkspaceRouter` and `CourseLearnerRouter`; there is no global or optional parser that populates `req.authUserId` for public Student Tools requests.
- The Web client sends browser credentials through `apiFetch` for execution and save requests. A valid access cookie/Bearer token therefore arrives at a route that never verifies it.
- Consequently `execute` and execution lookup always classify canonical requests as anonymous, while `save` always returns `401 TOOL_AUTH_REQUIRED`, including for a logged-in student with a valid session.
- Router tests mount `StudentToolsPublicRouter` directly and cover anonymous execution and unauthenticated save rejection; no composition test proves a valid student token produces authenticated ownership and a successful save.
- Positive evidence retained: the use case's requester lookup checks authenticated or anonymous ownership. The defect is missing identity composition, not evidence of a bypass inside that ownership comparison.

**Impact:**
- The advertised authenticated Student Tool journey cannot complete from Web to API: results cannot be saved to the student's workspace through the canonical route.
- Logged-in activity is stored/classified as anonymous, fragmenting history and retention semantics and preventing reliable student ownership.
- The public → login → student handoff required by P24 is false-green in isolated UI/router tests.

**Required remediation:**
1. Implement a canonical optional-auth middleware that validates access cookie/Bearer credentials and active session/identity state when present, while allowing a truly credential-free request to proceed anonymously.
2. Fail closed on malformed, expired, revoked or suspended credentials rather than silently downgrading them to anonymous.
3. Mount optional auth before `StudentToolsPublicRouter` and reuse the same typed principal contract required by `MNT-AUD-0106`.
4. Define an explicit claim/adoption flow if pre-login anonymous executions are intended to become student-owned after login; do not infer ownership from an untrusted client identifier.
5. Add Web→API integration tests for anonymous execute/read, authenticated execute/read/save, login handoff, cross-requester denial and revoked/suspended sessions.
6. Ensure analytics, audit and retention records preserve the correct consumer type and identity transition.

**Repair Wave:** W1 / W3 / W4 / W5 / W6  
**Status:** OPEN — STUDENT_TOOLS_AUTHENTICATED_MODE_AND_SAVE_HANDOFF_ARE_UNREACHABLE

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0092"></a>

### مهمة 88 — MNT-AUD-0092 — W5 / P1

**المالك المقترح:** Product Frontend + Student/Learning Backend + QA  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** MNT-AUD-0027، MNT-AUD-0069، MNT-AUD-0093.

#### MNT-AUD-0092 — P1 HIGH — Phase 13 Has a Real Authenticated Learner/LMS API but the Web Product Has No Enrollment or Learning-Workspace Composition
**Categories:** P13 / P15 / P24 / LEARNING / LMS / ENROLLMENT / LEARNER_UX / ROUTING / API / AUTH_HANDOFF / SOURCE_CLOSURE

**Evidence:**
- `CourseLearnerRouter` is a real authenticated owner-domain API. It exposes native-learning commands and reads under `/student/courses`, including course enrollment, learning-path enrollment, learner workspace, progress, lesson progress, quiz attempts/submission and course completion.
- The API composition mounts this learner router beneath the authenticated student surface; therefore the backend capability is not a prototype-only contract.
- Repository-wide search of `apps/web/src` found no call to `/student/courses` and no client method composing the learner API.
- The web API client retrieves courses through the public owner read path (`/public/courses/:slug`) rather than exposing the authenticated learner commands/workspace.
- `apps/web/src/router/index.tsx` exposes public `/courses` and `/courses/:slug` plus the generic `/student` workspace, but no authenticated course-learning/workspace route.
- The live `StudentWorkspacePage` hydrates dashboard, finance, snapshots and saved items; it does not compose Phase 13 enrollment, learner workspace, lessons, quizzes or progress commands.
- Phase 24's approved UX contract correctly states that public course pages are presentation/read-model composition only and that authenticated course progress/lesson behavior belongs to Phase 13 LMS execution plus the authenticated student experience. The missing defect is therefore the absent handoff/composition layer, not a request for Phase 24 to own LMS state.
- `verify-p13-final-source-closure.mjs` checks that the live Student Workspace and owner-read hydration exist, but it does not require a web caller/route for `CourseLearnerRouter`; it can therefore classify P13 source closure without proving that a learner can reach the implemented LMS runtime from the product UI.
- This finding is distinct from `MNT-AUD-0069`: `0069` concerns public course origin/catalog misclassification. Even after correcting native/imported presentation, the authenticated native-learning runtime would still be headless.

**Impact:**
- A published native MANARATAK course can have curriculum, enrollment policy, progress, quizzes and completion logic in source while a real user has no web journey to enroll and consume it.
- The product can advertise native/internal courses but stop at discovery/detail rather than transition into the internal LMS.
- End-to-end P13/P15 learner acceptance cannot be claimed from the current web source even though the backend owner API is substantial.
- Course completion/certificate paths can be technically implemented but practically unreachable through the canonical web product.

**Required remediation:**
1. Add authenticated Web API client methods for the owner `/student/courses` endpoints without duplicating Phase 13 business rules in the client.
2. Implement canonical learner routes/components for enrollment, native-course workspace, modules/lessons, progress, quiz attempts and completion.
3. Add the public-to-authenticated handoff: a native course action should authenticate when necessary and then route to the authoritative learner workspace using stable owner IDs.
4. Preserve external/imported behavior: external linked courses must continue to use their approved provider/direct-course URL and must never enter MANARATAK local progress tracking.
5. Surface enrollment-policy outcomes such as approval required, prerequisites, capacity/waitlist and Finance clearance using owner errors/read models.
6. Integrate the live Student Workspace's learning cards/actions with the same Phase 13 learner routes rather than a parallel client-side state model.
7. Add browser E2E covering login -> native course -> enroll -> lesson/progress -> quiz -> completion -> dashboard/certificate handoff.
8. Extend P13/P15/P24 source verifiers so source closure requires a reachable authenticated learner journey, not merely backend route existence and dashboard read hydration.

**Repair Wave:** W4 / W5 / W6 / W7  
**Status:** OPEN — AUTHENTICATED_COURSE_LEARNER_RUNTIME_HAS_NO_WEB_PRODUCT_COMPOSITION

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0015"></a>

### مهمة 89 — MNT-AUD-0015 — W5 / P1

**المالك المقترح:** Product Frontend + Student/Learning Backend + QA  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** MNT-AUD-0011، MNT-AUD-0030.

#### MNT-AUD-0015 — Phase 14 Certificate Rendering Engine Is Missing; Source Only Supports Attaching Pre-Generated Artifacts

- **Discovered:** 2026-09-06
- **Phase:** P14 Enterprise Certificates
- **Subsystem:** Certificate rendering / PDF / Preview / QR artifact production
- **Category:** `MISSING_IMPLEMENTATION` / `CERTIFICATE` / `ASSET` / `WORKFLOW`
- **Severity:** **P1 — HIGH**
- **Scope:** SOURCE
- **Status:** OPEN
- **Evidence:** Phase 14 contracts define a rendering boundary such as `IPdfRenderingService.renderCertificateToStorage(...)`, but no production implementation of the certificate renderer was found. Current source can attach certificate PDF/preview/QR AssetIds after artifacts exist, but does not itself generate the governed certificate document artifact.
- **Expected Behavior:** The certificate engine must be Source Complete before DB/runtime provisioning. The final visual template may remain a versioned injectable asset, but the rendering pipeline itself must exist in source and be capable of consuming a template/version plus certificate data and producing governed artifacts.
- **Impact:** The critical chain `Completion → Certificate Eligibility → Certificate Issue → Rendered Certificate → QR → Public Verification` is not end-to-end source-complete. Runtime configuration alone cannot make certificate documents appear.
- **Required Action:** Implement a provider-neutral certificate rendering service, template/version contract, PDF generation, preview/QR artifact generation, EAP storage integration, deterministic rendering/version metadata, failure handling, idempotency, and tests. Do not hard-code the future visual design into business logic.
- **Fix Wave:** W3/W4/W5.

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0073"></a>

### مهمة 90 — MNT-AUD-0073 — W5 / P1

**المالك المقترح:** Product Frontend + Student/Learning Backend + QA  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** MNT-AUD-0016، MNT-AUD-0107.

#### MNT-AUD-0073 — P1 HIGH — Phase 22/24 Public “Save/Favorite” Journey Is UI-Local in Live Mode and Is Not Connected to Phase 15 Saved Items
**Categories:** P22 / P24 / P15 / PUBLIC_WEB / STUDENT / SAVED_ITEMS / BOOKMARK / JOURNEY / CROSS_DEVICE / SOURCE_CLOSURE

**Evidence:**
- The approved discovery/user-journey documents require users to save/bookmark scholarships, universities, articles and other opportunities and continue those saved items later.
- Phase 15 has a real persisted Saved Items model/API, including authenticated student Saved Item operations, hydrated Saved Items and collection management.
- `apps/web/src/api/client.ts` contains authenticated Student Workspace Saved Item/collection read and management calls, proving the owner API is available to the web application.
- In `PublicTemplateApp`, `favoriteKeys` is initialized to an empty array whenever `publicDataMode !== 'prototype'`.
- `handleToggleFavorite(kind,id)` only mutates local React state through `setFavoriteKeys(...)`; it does not call Phase 15 Student Workspace APIs, does not authenticate/redirect an anonymous user into a save continuation flow, and does not reconcile owner Saved Item IDs.
- Persistence of `manaratak_favorites_v2` to browser storage is explicitly guarded by `publicDataMode === 'prototype'`; live/API mode therefore loses these UI favorites on reload/navigation lifecycle and never creates the canonical Phase 15 Saved Item.
- Public scholarship, major, article, service, exam, career and global-search components expose `onToggleFavorite`/Bookmark behavior, so the disconnected state is visible as a real product action rather than an unused prototype helper.
- The Student Workspace can list/move/manage hydrated owner Saved Items, but a favorite clicked in the live public discovery experience does not enter that workspace because the two surfaces are not connected.

**Impact:**
- The core `Discover → Save → Continue` product journey is not end-to-end Source Complete.
- Users can receive visual confirmation that an item was saved while the canonical student record remains unchanged.
- Saved state does not survive refresh/device change and cannot reliably appear in the Student Workspace, collections, notifications or later personalization flows.
- Public favorites and Phase 15 Saved Items can diverge into two independent concepts, violating the intended single owner for student saved state.

**Required remediation:**
1. Make Phase 15 Student Saved Items the sole authoritative live-mode persistence for public bookmarks/favorites.
2. Add explicit web client methods for create/remove/toggle Saved Item operations where missing, using canonical owner entity type + stable owner/public ID/slug semantics.
3. Hydrate favorite state from the authenticated student's Saved Items rather than a separate live React-only list.
4. For anonymous users, define a deterministic auth handoff: preserve the requested save intent, authenticate, then complete or clearly cancel the save after login.
5. Keep localStorage-only favorites strictly prototype/demo-only and visually distinguish that mode.
6. Add integration/E2E tests: save from public scholarship/university/major/article/service/course → refresh → Student Workspace → second session/device simulation → remove/collection update.
7. Ensure Saved Item hydration and owner lifecycle changes handle archived/unpublished entities without inventing stale public facts.
8. Reconcile P22 journeys, P15 Saved Item contracts and P24 public action acceptance criteria.

**Repair Wave:** W4 / W5 / W6 / W7  
**Status:** OPEN — PUBLIC_SAVE_JOURNEY_NOT_CONNECTED_TO_P15_SAVED_ITEMS

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0074"></a>

### مهمة 91 — MNT-AUD-0074 — W5 / P1

**المالك المقترح:** Product Frontend + Student/Learning Backend + QA  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** MNT-AUD-0016، MNT-AUD-0098.

#### MNT-AUD-0074 — P1 HIGH — Public Scholarship Application Tracker Is Local/Prototype State and Has No Canonical Live Owner Persistence
**Categories:** P22 / P24 / P15 / P12 / STUDENT / SCHOLARSHIP / APPLICATION_TRACKER / CHECKLIST / DEADLINES / NOTIFICATIONS / JOURNEY

**Evidence:**
- `PublicTemplateApp` exposes a learner application-tracking journey through `ApplicationMilestone`, the Tracker tab and `handleAddToTracker(...)`.
- In live/API mode the `milestones` state initializes to an empty array. Reading/writing `manaratak_milestones` is explicitly limited to `publicDataMode === 'prototype'`.
- `handleAddToTracker(...)` constructs application stages/checklist items entirely in browser memory using `Date.now()`-derived IDs, calls only `setMilestones(...)`, and emits a local UI notification through `triggerInstantPush(...)`.
- The same component performs local three-day deadline checks over these milestones only in prototype mode.
- Repository searches found no canonical Student/Scholarship application-tracker aggregate, API, repository or integration contract persisting scholarship application stages, checklist completion and deadline tracking for the authenticated student.
- Phase 15 is already the owner of private authenticated student workspace state/history, while Phase 12 owns scholarship facts; therefore the missing implementation is a private student-state composition over stable scholarship references, not a reason to move scholarship ownership into P15.

**Impact:**
- The visible `Add to Tracker` / application-progress journey is not durable in the real product.
- Application stages, checklist completion and deadline tracking disappear across live refresh/session/device boundaries and cannot be trusted as a student record.
- The UI can present progress and reminder semantics that are not backed by the Notification platform or a canonical private-state owner.
- The public-to-student journey can therefore appear more complete than the source actually is.

**Required remediation:**
1. Define a canonical private Student Application Tracker aggregate/read model under P15 (or an explicitly approved adjacent student-private-state owner) referencing P12 scholarship IDs/slugs without copying scholarship ownership.
2. Persist application tracker, stage, checklist, notes, deadlines and version/concurrency state in Prisma with stable IDs.
3. Add authenticated owner APIs for create/read/update/archive/remove and checklist/stage transitions.
4. Replace the live `PublicTemplateApp` local tracker with owner API commands and hydration; keep local tracker fixtures prototype-only.
5. Convert deadline reminders into governed Notification intents/events with idempotency, scheduling, retry and user preferences rather than browser timers.
6. Preserve auth intent for anonymous `Add to Tracker` actions and complete/cancel deterministically after login.
7. Add cross-session/device E2E tests and owner-lifecycle tests for scholarship archival/deadline changes.
8. Reconcile P22/P24 journey acceptance and P15 student workspace documentation after implementation.

**Repair Wave:** W3 / W4 / W5 / W6 / W7  
**Status:** OPEN — LIVE_APPLICATION_TRACKER_HAS_NO_CANONICAL_OWNER_PERSISTENCE

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0085"></a>

### مهمة 92 — MNT-AUD-0085 — W5 / P1

**المالك المقترح:** Product Frontend + Student/Learning Backend + QA  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** MNT-AUD-0058، MNT-AUD-0060، MNT-AUD-0098.

#### MNT-AUD-0085 — P1 HIGH — Public Services “Request Service” CTA Is a UI Notice and Does Not Invoke the Existing Student Service-Request API
**Categories:** P24 / P20 / P15 / PUBLIC_WEB / SERVICES / LIVE_ACTION / AUTH_HANDOFF / STUDENT_WORKSPACE / E2E / SOURCE_CLOSURE

**Evidence:**
- `ServiceDetail.tsx` renders the visible `اطلب الخدمة` action, but its click handler only sets local `showRequestNotice` state.
- The resulting message explicitly says no request was sent and that sending requires a user session / runtime request-route linkage.
- The owner/student source path is already materially implemented: `StudentWorkspaceRouter` is protected by `AuthMiddleware` and exposes authenticated `POST /student/services/requests`.
- That endpoint validates `serviceId` plus optional `requestParameters` and calls `StudentServiceRequestUseCases.createRequest(...)` with the authenticated student identity.
- The same router provides request list/detail endpoints, so the missing behavior is not merely an absent backend CRUD foundation.
- `MNT-AUD-0058` remains the broader Phase 20 missing-scope finding (packages/bookings/providers/pricing/workflows, etc.). This finding is narrower and end-to-end: a currently implemented owner request capability is **not connected to the public service CTA**.

**Impact:**
- A visitor can browse a real service detail and press the primary request action, but no service request is created.
- The UI frames a source-integration omission as something deferred to runtime, even though the authenticated request API and application use case already exist in source.
- Public → login/session → student request → request detail continuity is incomplete, so the Services journey cannot be considered source-complete.

**Required remediation:**
1. Define the P24→P15/P20 service-request handoff contract using stable canonical `serviceId` from the owner DTO.
2. For authenticated students, render/validate the required request parameters and call `POST /api/v1/student/services/requests`.
3. For anonymous users, preserve the selected service and request intent across login, then resume the request flow using trusted server identity.
4. After successful creation, navigate to the canonical Student Workspace request/detail surface and show the created request ID/status.
5. Provide deterministic auth-required, validation, unavailable, duplicate/retry and API-error states; never display a success-like notice when no mutation occurred.
6. Add E2E coverage: direct service deep link → request CTA → authentication if needed → create request → view request detail.
7. Extend `public-ui:source:closure` beyond component/token presence so it verifies the real live-action handoff.

**Repair Wave:** W4 / W5 / W6 / W7  
**Status:** OPEN — PUBLIC_SERVICE_REQUEST_CTA_NOT_CONNECTED_TO_EXISTING_OWNER_REQUEST_FLOW

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0097"></a>

### مهمة 93 — MNT-AUD-0097 — W5 / P2

**المالك المقترح:** Product Frontend + Student/Learning Backend + QA  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** MNT-AUD-0015، MNT-AUD-0092.

#### MNT-AUD-0097 — P2 MEDIUM — Student Workspace Certificate Quick Action Targets a Nonexistent `/certificates` Web Route
**Categories:** P14 / P15 / P24 / ROUTING / STUDENT_WORKSPACE / CERTIFICATES / HANDOFF / UX / SOURCE_CLOSURE

**Evidence:**
- `PrismaStudentWorkspaceRepository.quickActions(...)` emits a certificate action with `id: 'view-certificates'`, label `عرض شهاداتي`, and `href: '/certificates'` whenever certificate projections are present.
- The canonical Web router does not define a `/certificates` page. It defines certificate verification routes only: `certificates/verify` and `verify-certificate`.
- The public-route contract test likewise enumerates `certificates/verify` but no `/certificates` route.
- The live Student Workspace does render individual certificate projections and can link each one to `/certificates/verify?code=...`, so this defect is not missing certificate data; it is a broken generated navigation target from the student dashboard.
- Repository search found no redirect or canonical authenticated certificate-list route that resolves `/certificates`.
- This is distinct from `MNT-AUD-0015` (certificate rendering/PDF generation) and `MNT-AUD-0092` (missing authenticated course learner journey).

**Impact:**
- A student with certificates can receive a high-priority dashboard action that navigates to an undefined route instead of the certificate vault/read surface.
- The broken link interrupts the P15→P14 learner handoff even though certificate projections are already available in the workspace.
- Browser route tests currently validate the verification route but do not protect the generated quick-action destinations.

**Required remediation:**
1. Define the canonical student certificate destination: either a dedicated authenticated certificate-list route or an explicit in-workspace Vault/Certificate section.
2. Change `quickActions(...)` to emit a locale-aware canonical route that is guaranteed by the Web route registry.
3. If a dedicated route is implemented, hydrate it from P14 owner-read models/P15 projections without creating a duplicate certificate authority.
4. Add a route-contract test that validates every generated Student Workspace quick-action `href` against the canonical Web router.
5. Add browser E2E for dashboard → certificates → verification/detail handoff.

**Repair Wave:** W4 / W5 / W7  
**Status:** OPEN — STUDENT_CERTIFICATE_QUICK_ACTION_POINTS_TO_UNDEFINED_ROUTE

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0009"></a>

### مهمة 94 — MNT-AUD-0009 — W6 / P1

**المالك المقترح:** QA + DevOps/SRE + Security  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** بوابة الموجة السابقة؛ راجع التبعيات التاريخية أدناه قبل التنفيذ.

#### MNT-AUD-0009 — Translation Quality Source Gate Uses Brittle Literal/Text Matching and Produces a False Enterprise-CI Failure Against the Current Safer Mapper

- **Discovered:** 2026-09-06
- **Phase:** Cross-Cutting Localization / CI
- **Subsystem:** Translation source-closure verifier
- **Files:**
  - `scripts/verify-translation-quality-source.ts`
  - current public-course localization/mapping source
- **Category:** `TEST` / `QUALITY` / `DOCUMENTATION_DRIFT`
- **Severity:** **P1 — HIGH**
- **Scope:** SOURCE / CI
- **Status:** OPEN
- **Evidence:** Enterprise CI translation closure is red because the verifier expects obsolete source text/literal structure rather than validating current semantic behavior; the current mapper has already moved to a safer implementation shape.
- **Expected Behavior:** Source-closure gates must validate behavior/contracts or stable AST/semantic invariants, not incidental source formatting.
- **Impact:** Enterprise CI cannot be treated as reliable source-closure evidence while a stale verifier can fail correct code after refactoring.
- **Required Action:** Rewrite the verifier around stable semantics and add regression coverage that allows safe refactors without weakening localization requirements.
- **Fix Wave:** W6/W7.

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0010"></a>

### مهمة 95 — MNT-AUD-0010 — W6 / P1

**المالك المقترح:** QA + DevOps/SRE + Security  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** بوابة الموجة السابقة؛ راجع التبعيات التاريخية أدناه قبل التنفيذ.

#### MNT-AUD-0010 — Imported-Courses Static Security Closure Gate References a Stale/Wrong Source File and Produces a False CI Failure

- **Discovered:** 2026-09-06
- **Phase:** P13 Learning / Cross-Cutting Import Security CI
- **Subsystem:** Imported Courses source closure
- **Files:**
  - `.github/workflows/imported-courses-runtime-closure.yml`
  - `scripts/wp-ic-10-runtime-closure.mjs`
  - `scripts/wp-ic-10-runtime-lib.mjs`
  - `packages/application/src/courses/use-cases/CourseProviderContinuationUseCases.ts`
  - `packages/application/src/courses/use-cases/CourseImportOperationsUseCases.ts`
- **Category:** `TEST` / `QUALITY` / `SECURITY`
- **Severity:** **P1 — HIGH**
- **Scope:** SOURCE / CI
- **Status:** OPEN
- **Evidence:** On the frozen commit, Prisma validate/generate, typecheck, lint, build, unit tests, and pure-node imported-course closure tests pass. The workflow fails specifically at `Imported-course static security invariants`. The verifier requires `analyzeBatch(batchId, { force: true })` inside `CourseProviderContinuationUseCases.ts`, but the canonical force-reanalysis implementation currently resides in `CourseImportOperationsUseCases.ts` and delegates to identity-diff with `{ force: true }`.
- **Expected Behavior:** The security closure gate must follow the canonical owner of the behavior rather than hard-code an obsolete file location.
- **Impact:** A false-red security gate prevents reliable source closure and obscures real security failures.
- **Required Action:** Rebase the invariant on the canonical operation/contract (prefer semantic/AST or executable contract testing), retain the force-reanalysis security requirement, and add a regression test for refactors.
- **Fix Wave:** W6.

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0047"></a>

### مهمة 96 — MNT-AUD-0047 — W6 / P1

**المالك المقترح:** QA + DevOps/SRE + Security  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** بوابة الموجة السابقة؛ راجع التبعيات التاريخية أدناه قبل التنفيذ.

#### MNT-AUD-0047 — P1 HIGH — Phase 16 Source-Closure Verifier References a Deleted Public CMS Component
**Categories:** TEST / CMS / PUBLIC_UI / DEVOPS / SOURCE_CLOSURE / STALE / QUALITY

**Evidence:**
- `scripts/verify-phase16-source.mjs` is an active package-level source verifier and includes a mandatory check named `public canonical rendering`.
- That check executes `readFileSync('apps/web/src/features/cms/CmsContentDetail.tsx', 'utf8')` and expects the token `canonicalUrl`.
- The frozen commit tree contains no `apps/web/src/features/cms/CmsContentDetail.tsx`; an exact frozen-commit fetch returns 404 and the frozen recursive tree has no match.
- The live public router instead routes CMS detail traffic through `PublicTemplateApp` / `ApiClient.getCmsContentBySlug`.
- Therefore the Phase 16 verifier is stale against the actual P24 composition and can fail with a missing-file error before it even evaluates the intended rendering invariant.
- This is distinct from `MNT-AUD-0009`, which covers the stale translation-quality verifier.

**Impact:**
- `npm run phase16:verify` cannot serve as valid Phase 16 Source Closure evidence on the frozen source.
- The verifier is checking an obsolete architecture rather than the current P16↔P24 integration path.
- Existing documentation/status claiming Phase 16 source closure can be stronger than the executable proof that exists today.
- A deleted/orphaned component path can mask real public CMS defects such as the content-type flattening in `MNT-AUD-0046`.

**Required remediation:**
1. Rewrite the P16 verifier against the canonical runtime path (`CmsPublicRouter` → public API client → P24 type-aware route/render composition).
2. Replace raw file-existence/token checks with behavioral/contract tests wherever possible.
3. Verify canonical URL/SEO, type preservation, slug redirects, navigation, announcements, related-content links and published-only visibility through the actual mounted P24 routes.
4. Add a source test that ensures every file path referenced by closure scripts exists at the audited commit.
5. Remove obsolete references to the deleted `features/cms/CmsContentDetail.tsx` architecture or formally restore it only if P24 re-baselining chooses that component as canonical.
6. Re-run and reissue P16 Source Closure evidence only after the corrected verifier passes.

**Repair Wave:** W5 / W6 / W7
**Status:** OPEN — PHASE16_SOURCE_VERIFIER_STALE_AND_BROKEN


#### Live Register Update — v0.26 (2026-09-06)
- Confirmed findings: **47**
- P0: 0 | P1: **37** | P2: 9 | P3: 1 | P4: 0
- Added `MNT-AUD-0047` — active P16 closure verifier references a deleted public CMS component and is not valid current-source evidence.

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0048"></a>

### مهمة 97 — MNT-AUD-0048 — W6 / P1

**المالك المقترح:** QA + DevOps/SRE + Security  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** MNT-AUD-0009، MNT-AUD-0010، MNT-AUD-0047.

#### MNT-AUD-0048 — P1 HIGH — Canonical “Full Source Closure” CI Omits Active Current-Phase and Domain Closure Verifiers
**Categories:** CI / DEVOPS / TEST / SOURCE_CLOSURE / GOVERNANCE / FALSE_GREEN

**Evidence:**
- Root `package.json` exposes active verifiers for Phase 15, 16, 17, 18 and 19 plus current domain closures such as certificates, health/readiness, finance, jobs, public UI, courses, tests and imports.
- `.github/workflows/ci.yml` labels its primary job `Full source closure gates`, but executes W0-W16 remediation verification, P7-P13 plan/source gates, Prisma source verification, typecheck/lint/build/unit tests and source evidence only.
- The workflow does not execute `phase15:verify`, `phase16:verify`, `phase17:verify`, `phase18:verify`, `phase19:verify`, `certificates:source:closure`, `health:source:closure`, `finance:source:closure`, `jobs:source:closure`, `public-ui:source:closure`, or the other current owner-domain closure scripts.
- `scripts/run-remediation-verifiers.mjs`, which backs `npm run remediation:verify`, only runs `verify-w0-source.mjs` through `verify-w15-source.mjs` plus `verify-w16-final-closure.mjs`; it is not a manifest of the current active phase/domain closure surface.
- `MNT-AUD-0047` already proves an active Phase 16 verifier is stale/broken, yet the canonical CI can avoid executing it and therefore can still appear green with invalid P16 closure evidence.
- The operations manual states the CI runs E2E Playwright, while the actual canonical CI workflow contains no E2E step.

**Impact:**
- A green canonical CI run cannot prove the current repository-wide Source Closure claim.
- New regressions in P15-P19 or owner-domain closure scripts can bypass the main gate.
- Broken/stale verifier scripts can remain undetected because the gate that claims full closure never invokes them.
- Audit evidence and CI status can diverge, creating false confidence before remediation or launch-readiness decisions.

**Required remediation:**
1. Define one authoritative machine-readable verifier manifest covering every active source-closure verifier.
2. Make canonical CI execute that manifest and fail on any non-zero result.
3. Add a guard that fails when a new active `verify-*-source*.mjs` / owner closure verifier exists but is not registered in the manifest, unless explicitly classified historical/runtime-only.
4. Include Phase 15-19, certificates, health/readiness, finance, jobs, public UI, AI tools, courses, tests/imports and future owner-domain closure gates under the same authority model.
5. Separate source-only gates from runtime/database/browser gates explicitly instead of silently omitting them.
6. Make source evidence record commit SHA, verifier manifest version, exact verifier list, pass/fail status and intentionally deferred runtime checks.
7. Correct `docs/operations/containerization-and-ci.md` so its CI stage list matches the executable workflow.

**Repair Wave:** W0 / W6 / W7  
**Status:** OPEN — CANONICAL_CI_SOURCE_CLOSURE_COVERAGE_INCOMPLETE

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0042"></a>

### مهمة 98 — MNT-AUD-0042 — W6 / P1

**المالك المقترح:** QA + DevOps/SRE + Security  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** MNT-AUD-0041، MNT-AUD-0035.

#### MNT-AUD-0042 — P1 HIGH — Real PostgreSQL Integration Validation Is Not Authored/Registered Across Persisted Domains
**Categories:** TEST / DATABASE / PRISMA / RELATIONSHIP / TRANSACTION / DEVOPS / SOURCE_CLOSURE

**Evidence:**
- `vitest.database.config.ts` is the canonical real-database test configuration, but its include list is limited to Major Import DB E2E, DB connectivity/auth integration, and Course/Imported-Course persistence tests.
- The registered suite contains no real PostgreSQL tests for major persisted bounded contexts such as Scholarships, Universities, Reference Data, Certificates, Student Workspace, CMS, Finance, Services, Career/Alumni, AI governance or the Asset Platform.
- Direct repository searches found no `PrismaUniversityRepository.integration`, `PrismaCertificateRepository.integration` or `PrismaStudentWorkspaceRepository.integration` suites; equivalent Scholarship integration search also produced no registered real-DB suite.
- Mocked Prisma repository tests and source verifiers exist for several of these domains, but they cannot prove PostgreSQL FK/unique/index/nullability/cascade semantics, transaction behavior, locking/concurrency or migration-backed persistence.
- The project intentionally has no database today; that is not itself a defect. The source-closure defect is that the complete post-connect database validation suite is not already authored and registered before runtime provisioning.

**Impact:**
- After Google Studio connects PostgreSQL, the project has no single comprehensive command capable of proving that every persisted phase behaves correctly against the real database engine.
- Cross-phase canonical IDs and lifecycle constraints can pass unit/mock tests while failing under actual FK, unique, transaction or deletion semantics.
- Source Complete 100% cannot rely on future ad-hoc test authoring after database connection.

**Required remediation:**
1. Create a canonical disposable-PostgreSQL integration harness shared by every persisted bounded context.
2. Add real-DB suites for P07 Reference, P08 Taxonomy, P09 Tests, P10 Majors, P11 Universities/Programs, P12 Scholarships, P13 Learning, P14 Certificates, P15 Student, P16 CMS, P17 AI, P18 Tools, P19 Finance, P20 Services, P21 Career and all P01-P06 persisted foundations that require DB proof.
3. Per domain verify CRUD/lifecycle, FK ownership, unique/index behavior, nullability/defaults, cascade/restrict/set-null semantics, transactions, outbox/inbox/idempotency and concurrency where applicable.
4. Add explicit cross-domain DB tests for canonical relationship edges, including University↔Program↔Major/Test, Scholarship↔University/Major/Reference, Course↔Taxonomy/Major/Test/Reference, completion↔certificate, P15 hydration references and P20↔P19 handoff.
5. Register every real-DB suite in `vitest.database.config.ts` (or a clearly partitioned but authoritative DB test aggregator) so no domain can silently fall outside execution.
6. Mark the suite `READY_TO_RUN_AFTER_DB_CONNECT`; Google Studio must execute it after migrations/seeds, not create it.
7. Keep unit/mocked repository tests for fast feedback, but never count them as PostgreSQL verification.

**Repair Wave:** W2 / W6
**Status:** OPEN — POSTGRESQL_DOMAIN_VALIDATION_COVERAGE_INCOMPLETE


#### Live Register Update — v0.20 (2026-09-06)
- Confirmed findings: **42**
- P0: 0 | P1: **33** | P2: 8 | P3: 1 | P4: 0
- Added `MNT-AUD-0042` — comprehensive real-PostgreSQL validation is not authored/registered for persisted domains.
- Admin least-privilege and active runtime configuration-contract audit continue.

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0078"></a>

### مهمة 99 — MNT-AUD-0078 — W6 / P1

**المالك المقترح:** QA + DevOps/SRE + Security  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** بوابة الموجة السابقة؛ راجع التبعيات التاريخية أدناه قبل التنفيذ.

#### MNT-AUD-0078 — P1 HIGH — Monitoring Foundation Has Health Probes but No Production Metrics/Tracing Provider; HTTP Monitoring Middleware Is a Compile-Only No-op
**Categories:** OBSERVABILITY / MONITORING / METRICS / TRACING / TELEMETRY / HTTP / P04 / P05 / P19 / PRODUCTION_READINESS / DOCUMENTATION_DRIFT

**Evidence:**
- `packages/infrastructure/src/monitoring/MonitoringService.ts` accepts an optional `IMonitoringProvider`. When none is provided, `getMetrics()` returns no-op `incrementCounter`, `recordHistogram` and `setGauge` functions with `capabilityStatus: 'NOT_CONFIGURED'` and `scope: 'PROCESS_LOCAL'`.
- `apps/api/src/app.ts` constructs the normal monitoring service as `new AppMonitoringService(undefined)` unless a test/explicit caller injects a provider, so the canonical runtime composition has no metrics provider.
- `apps/api/src/presentation/monitoring/MonitoringMiddleware.ts::generate()` contains only the comment `Basic implementation that satisfies compilation` and immediately calls `next()`; it does not record request count, latency, status class, route, in-flight requests or errors.
- Repository searches for OpenTelemetry/OTEL, Prometheus and telemetry exporters returned no production provider/exporter implementation; root dependencies likewise do not contain an OpenTelemetry/Prometheus telemetry stack.
- Health/readiness indicators are real and valuable, and Pino structured logging/redaction tests exist; this finding does **not** claim observability is entirely absent.
- The active Phase 04 Monitoring Foundation report states that the infrastructure provides application metrics and that a generic monitoring middleware automatically generates HTTP request metrics. That active claim does not match the canonical runtime source.
- Phase 19's active blueprint additionally specifies OpenTelemetry and real-time financial/payment/reconciliation monitoring/alerts, which cannot be satisfied by the current no-op metrics path.

**Impact:**
- Production request/application metrics are silently discarded even though instrumentation contracts exist.
- There is no source-complete distributed tracing/export path to correlate API, jobs, outbox and external-provider operations end-to-end.
- SLO/error-rate/latency/saturation alerts cannot be driven from a canonical application telemetry stream.
- Health endpoints can answer current probe state but cannot replace historical metrics, traces, alerting or trend analysis.
- Active monitoring documentation overstates implemented source capability.

**Required remediation:**
1. Implement and register a production-capable `IMonitoringProvider` in the composition root using the approved telemetry stack (OpenTelemetry/Prometheus/vendor-neutral exporter strategy).
2. Replace the compile-only MonitoringMiddleware with bounded HTTP metrics/tracing instrumentation: route template, method, status class, latency, in-flight count and correlation/trace context without high-cardinality PII.
3. Instrument background jobs/outbox/imports/finance/provider calls and critical domain workflows with the same correlation/trace model.
4. Define exporter configuration, sampling, resource/service identity and production failure behavior in the typed environment contract.
5. Add alert delivery/runbook mappings for readiness failures, error-rate/latency SLO breaches, queue/outbox lag, finance reconciliation drift and critical security/runtime conditions.
6. Add source/unit/integration tests proving metrics are emitted through a real provider and that request middleware is not a pass-through no-op.
7. Rebaseline the Phase 04 Monitoring Foundation and all later phase observability claims against the implemented telemetry topology.

**Repair Wave:** W1 / W2 / W6 / W7  
**Status:** OPEN — PRODUCTION_TELEMETRY_PROVIDER_AND_HTTP_INSTRUMENTATION_MISSING

### Live Register Update — v0.40 (2026-09-06)
- Registered finding IDs allocated: **78** (`MNT-AUD-0001` → `MNT-AUD-0078`).
- Duplicate/evidence-alias IDs excluded from canonical count: **3** (`MNT-AUD-0038`, `MNT-AUD-0039`, `MNT-AUD-0053`).
- **Canonical unique confirmed findings: 75**.
- Severity (canonical unique): **P0: 0 | P1: 56 | P2: 18 | P3: 1 | P4: 0**.
- New canonical finding in this continuation: `MNT-AUD-0078`.
- Positive evidence retained: structured Pino logging/redaction and multiple health/readiness indicators exist; the finding is specifically missing metrics/tracing/export/HTTP instrumentation.
- No source/code repair or runtime/database mutation has been executed.
- Frozen audit baseline remains `0931c5664cf274cb2b8f4cb250dd09ebf2e9a77f`.
- Project decision remains: **SOURCE_NOT_COMPLETE — AUDIT_IN_PROGRESS**.

### Next mandatory continuation after v0.40
1. Complete remaining observability review for log correlation/redaction, alert routing and job/outbox telemetry without duplicating `MNT-AUD-0078`.
2. Complete event producer/consumer orphan matrix and scheduler/worker matrix.
3. Complete migration/data-integrity and retention source audit.
4. Complete P23/P24 remaining route/action/owner parity.
5. Complete CI/verifier/document authority reconciliation, then final deduplication.

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0066"></a>

### مهمة 100 — MNT-AUD-0066 — W6 / P1

**المالك المقترح:** QA + DevOps/SRE + Security  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** MNT-AUD-0079، MNT-AUD-0083.

#### MNT-AUD-0066 — P1 HIGH — Production Disaster-Recovery / Backup Strategy Is Not Source-Implemented Beyond a Narrow Manual Imported-Course Rehearsal
**Categories:** DEVOPS / DISASTER_RECOVERY / BACKUP / RESTORE / RPO / RTO / DATABASE / ASSETS / OPERATIONS / SOURCE_CLOSURE

**Evidence:**
- The active deployment strategy requires hourly transaction-log protection, daily full backups, weekly/monthly archives, encryption at rest, one-year archive retention, and automated weekly restoration audits; it also declares RPO/RTO targets.
- Repository workflow inventory under `.github/workflows` contains CI, imported-course source closure, security and architecture-guard workflows only; no scheduled backup or restore-audit workflow/source entry exists.
- `scripts/wp-ic-10-db-backup-restore.sh` provides a guarded PostgreSQL dump/restore rehearsal, but it is designed for disposable/test-looking databases and is scoped to the imported-course closure path.
- `docs/operations/postgresql-backup-restore-runbook.md` is explicitly an Imported Courses runbook. It requires an operator to store the backup in an approved encrypted location but does not implement or configure that encrypted storage, retention, rotation or scheduling.
- The runbook's restore verification compares a narrow imported-course set (`_prisma_migrations`, provider/course/import tables), not all persisted MANARATAK bounded contexts.
- The imported-course GitHub workflow explicitly states database integration, backup/restore and runtime smoke are not executed there and remain deferred to a future runtime environment.
- No source evidence was found for coordinated backup of Asset Platform binaries/media, configuration/state required for recovery, cross-domain consistency points, point-in-time recovery orchestration, automated restore drills, RPO/RTO measurement or failover rehearsal.

**Impact:**
- The repository cannot currently demonstrate recoverability of the whole platform from a production data-loss incident.
- A PostgreSQL-only imported-course rehearsal does not protect or restore the complete relational domain model, media assets or other required durable state.
- RPO/RTO values are architecture assertions rather than executable/rehearsed operational guarantees.
- Source Complete / Production Ready cannot be declared while backup generation, retention, encryption, restoration validation and recovery objectives depend on unspecified future infrastructure implementation.

**Required remediation:**
1. Define the authoritative production backup ownership model for PostgreSQL, asset/object storage and any additional durable state.
2. Implement provider-neutral source/configuration for scheduled backups or formal managed-provider backup contracts with verifiable configuration/readiness checks.
3. Define retention tiers, encryption/KMS ownership, immutable/offline protection where appropriate, access audit and deletion policy.
4. Implement a whole-platform disposable restore drill that replays database state and validates every persisted bounded context plus asset/reference integrity, not only imported courses.
5. Add automated scheduled restore-audit execution in the chosen infrastructure layer and store immutable evidence of each drill.
6. Measure and verify declared RPO/RTO; make unmet objectives a release/operations finding rather than documentation-only targets.
7. Add incident runbooks for point-in-time restore, regional failover, traffic cutover and rollback, with no destructive reset path.
8. Reconcile Phase 2 deployment strategy, operations runbooks, production-readiness gates and Google Studio/runtime handoff.

**Repair Wave:** W2 / W3 / W6 / W7  
**Status:** OPEN — PLATFORM_DR_BACKUP_RESTORE_AUTOMATION_NOT_SOURCE_COMPLETE

### Events / Outbox Reconciliation Result — This Pass

No generic duplicate finding was added for Events/Outbox in this pass.

**Reason:**
- Certificate completion has an explicit `CertificateCompletionOutboxWorker`, DI registration and opt-in scheduler in `server.ts`.
- Existing findings already capture the material unresolved async/event roots: BullMQ/background-worker architecture (`MNT-AUD-0007`), Notifications (`MNT-AUD-0034`), AI async execution (`MNT-AUD-0054`) and Services event publication (`MNT-AUD-0060`).
- Final event reconciliation must still prove every producer/consumer pair, but repeating those known root causes as one broad finding would inflate the register.

**Audit decision:** `EVENT_OUTBOX_GLOBAL_RECONCILIATION = IN_PROGRESS / NO_DUPLICATE_FINDING_ADDED`

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0008"></a>

### مهمة 101 — MNT-AUD-0008 — W6 / P2

**المالك المقترح:** QA + DevOps/SRE + Security  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** بوابة الموجة السابقة؛ راجع التبعيات التاريخية أدناه قبل التنفيذ.

#### MNT-AUD-0008 — Architecture Guard Coverage Excludes Operational `scripts/**`, Allowing Direct Infrastructure Coupling Outside Enforced Boundaries

- **Discovered:** 2026-09-06
- **Phase:** A2 Enterprise Architecture / Cross-Cutting
- **Subsystem:** Dependency-rule enforcement
- **Category:** `ARCHITECTURE` / `QUALITY` / `TEST`
- **Severity:** **P2 — MEDIUM**
- **Scope:** SOURCE
- **Status:** OPEN
- **Evidence:** Current architecture boundary enforcement is package/application focused while active operational scripts remain outside equivalent dependency controls; scripts directly participate in Prisma, remediation, import and closure operations.
- **Expected Behavior:** Every active production/operational source surface that can mutate or coordinate platform state must be covered by explicit architectural dependency rules or deliberately classified as infrastructure-only tooling.
- **Impact:** Operational code can bypass the same inward-dependency / ownership rules enforced on application packages.
- **Required Action:** Extend guard coverage or define a separately governed operational-tooling boundary with explicit permitted dependencies and source checks.
- **Fix Wave:** W1/W6.

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0087"></a>

### مهمة 102 — MNT-AUD-0087 — W6 / P2

**المالك المقترح:** QA + DevOps/SRE + Security  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** بوابة الموجة السابقة؛ راجع التبعيات التاريخية أدناه قبل التنفيذ.

#### MNT-AUD-0087 — P2 MEDIUM — Security and Source-Closure Workflows Execute Third-Party/GitHub Actions Through Mutable Major Tags Instead of Immutable Commit SHAs
**Categories:** GITHUB_ACTIONS / SUPPLY_CHAIN / CI / SECURITY / REPRODUCIBILITY / GOVERNANCE / RELEASE

**Evidence:**
- `.github/workflows/ci.yml` uses actions such as `actions/checkout@v4`, `actions/setup-node@v4` and `actions/upload-artifact@v4`.
- `.github/workflows/security.yml` uses `actions/checkout@v4`, `actions/setup-node@v4`, `actions/dependency-review-action@v4` and `github/codeql-action/*@v3`.
- Additional source-architecture/runtime-closure workflows also reference actions through mutable major-version tags.
- The security workflow does correctly establish explicit token permissions (`contents: read`, with scoped `security-events: write` for CodeQL); the finding is therefore specifically about **action provenance/reproducibility**, not a blanket token-permission defect.
- Repository audit search found no canonical policy requiring workflow `uses:` references to immutable commit SHAs.
- This is distinct from `MNT-AUD-0048` (canonical CI omits active verifiers) and `MNT-AUD-0082` (branch protection/status enforcement absent).

**Impact:**
- A future movement/compromise of a referenced major tag changes executable CI/security code without changing this repository commit.
- The exact code that produced a historical security/source-closure result is not fully reproducible from the audited repository SHA alone.
- Security gates themselves remain exposed to avoidable third-party action supply-chain drift.

**Required remediation:**
1. Pin every external GitHub Action to a full immutable commit SHA and retain a human-readable release/version comment.
2. Automate reviewed action updates through Dependabot/Renovate or an equivalent controlled process.
3. Add a source guard that rejects non-SHA external `uses:` references except explicitly approved local actions.
4. Review action publishers and minimize permissions/credentials per job; retain the existing least-privilege permissions where already correct.
5. Include action-ref hashes in release/source-closure evidence for reproducibility.

**Repair Wave:** W0 / W6 / W7  
**Status:** OPEN — GITHUB_ACTIONS_EXTERNAL_REFS_NOT_IMMUTABLY_PINNED

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0094"></a>

### مهمة 103 — MNT-AUD-0094 — W6 / P1

**المالك المقترح:** QA + DevOps/SRE + Security  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** MNT-AUD-0048، MNT-AUD-0042، MNT-AUD-0066، MNT-AUD-0087.

#### MNT-AUD-0094 — P1 HIGH — CI Verifies Source but No Executable Immutable-Artifact Release/Environment-Promotion Pipeline Exists
**Categories:** CI_CD / RELEASE / DEPLOYMENT / ARTIFACT / PROMOTION / GOVERNANCE / TRACEABILITY / SOURCE_CLOSURE

**Evidence:**
- The approved and baselined Phase 3.16 CI/CD Foundation requires separation of integration and delivery, generation of one versioned immutable verified deliverable, promotion of that same artifact through validation environments, auditable approval checkpoints, declarative version-controlled delivery workflows, and traceability from deployed artifact back to the source change.
- The frozen repository contains only four GitHub Actions workflows: `ci.yml`, `imported-courses-runtime-closure.yml`, `security.yml`, and `source-architecture-guards.yml`.
- Those workflows perform source/build/security/runtime-closure verification; none defines application artifact packaging/publication, an artifact registry handoff, staged environment promotion, production approval, deployment orchestration, post-deploy verification, or release rollback/provenance.
- Root `package.json` contains build/test/source-verifier commands and database-remediation commands, including `db:remediation:deploy`, but no application release/package/publish/promote/deploy workflow that creates and advances an immutable API/Web/Admin deliverable.
- Current governance/reality documents independently acknowledge that application Dockerfiles/images and production containerization/deployment automation are deferred; therefore this is not merely missing runtime evidence for an implemented pipeline.
- This is distinct from `MNT-AUD-0048` (the canonical CI omits active source verifiers), `MNT-AUD-0052` (operations documentation describes nonexistent topology), `MNT-AUD-0082` (branch protection/required checks), and `MNT-AUD-0087` (mutable third-party Action tags). Even with all four fixed, the source would still lack a delivery/promotion implementation.

**Impact:**
- A green source build cannot be converted through repository-defined mechanics into the governed immutable deliverable described by the approved architecture.
- Deployment to Google Studio or another target would require an operator to invent packaging, release, environment promotion and approval mechanics outside the audited source.
- There is no executable chain-of-custody proving that staging and production run the exact artifact that passed source/security checks.
- Rollback, promotion approvals and post-deployment evidence cannot be enforced as part of a single canonical release authority.

**Required remediation:**
1. Define the canonical deployable units for API, Web and Admin and implement deterministic packaging for each (container image or another explicitly approved immutable artifact format).
2. Add a version-controlled delivery workflow that publishes artifacts to an approved registry using immutable digest/version references.
3. Separate CI verification from CD promotion while binding promotion to the exact verified commit/artifact digest.
4. Implement sequential validation/staging/production promotion with auditable approval/environment controls for critical environments.
5. Integrate database migration/remediation gates so application promotion cannot silently bypass migration baseline, dry-run, backup/rollback and runtime-validation requirements.
6. Add post-deployment health/smoke verification, explicit rollback procedure and immutable release evidence containing source SHA, artifact digests, environment, approvals and deployment result.
7. Add provenance/SBOM/signing or equivalent supply-chain evidence according to the final release-governance standard.
8. Reconcile Phase 3.16, containerization/deployment docs and handoff runbooks against the executable delivery workflow; no conceptual blueprint may be counted as physical source closure.

**Repair Wave:** W0 / W6 / W7  
**Status:** OPEN — SOURCE_HAS_CI_VERIFICATION_BUT_NO_CANONICAL_RELEASE_PROMOTION_PIPELINE

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0003"></a>

### مهمة 104 — MNT-AUD-0003 — W7 / P2

**المالك المقترح:** مدير المشروع + مالكو الدومينات + QA  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** MNT-AUD-0031.

#### MNT-AUD-0003 — `docs/README.md` Is Structurally Outdated Against the Current 24-Phase Repository

- **Discovered:** 2026-09-06
- **Phase:** Governance / Documentation
- **Subsystem:** Documentation navigation
- **File:** `docs/README.md`
- **Category:** `DOCUMENTATION_DRIFT`
- **Severity:** **P2 — MEDIUM**
- **Scope:** SOURCE
- **Status:** OPEN
- **Evidence:** The file describes phase progression primarily through Phase 09 and presents a simplified four-pillar structure, while current `docs/` includes active phase roots through Phase 24 plus additional operational/remediation/status/import domains.
- **Expected Behavior:** Documentation entrypoint must accurately route a reviewer/developer to the current authoritative 24-phase structure and distinguish active, operational, remediation, and legacy evidence.
- **Impact:** High risk of reviewers or future developers reading incomplete/outdated paths and treating old phase limits as current.
- **Required Action:** `REWRITE`.
- **Fix Wave:** W0/W7.

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0019"></a>

### مهمة 105 — MNT-AUD-0019 — W7 / P2

**المالك المقترح:** مدير المشروع + مالكو الدومينات + QA  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** MNT-AUD-0094.

#### MNT-AUD-0019 — Active Phase Documents Use `Production Ready` Terminology Before Runtime Verification Exists

- **Discovered:** 2026-09-06
- **Phase:** Governance / Multiple P05–P22 documents
- **Subsystem:** Lifecycle terminology / completion truth
- **Category:** `DOCUMENTATION_DRIFT` / `ROADMAP` / `GOVERNANCE`
- **Severity:** **P2 — MEDIUM**
- **Scope:** SOURCE DOCUMENTATION
- **Status:** OPEN
- **Evidence:** Multiple active phase architecture/domain documents use labels such as `Baselined / Production Ready` or `Approved ... / Production Ready` even though no production database/runtime verification has occurred. Examples include active documents in P07, P08, P10, P15, P16, P17, P20 and P22.
- **Expected Behavior:** Repository terminology must follow the approved completion lifecycle: `SOURCE_COMPLETE` may be declared before database provisioning only when source gates are met; `RUNTIME VERIFIED` and `PRODUCTION READY` require actual runtime/DB/provider verification.
- **Impact:** Governance documents overstate readiness, create contradictory authority, and can cause deployment/management decisions based on false completion claims.
- **Required Action:** Normalize active phase status wording across the repository, reserve `Production Ready` for post-runtime certification, and mark older status claims as historical where appropriate.
- **Fix Wave:** W0/W7.

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0023"></a>

### مهمة 106 — MNT-AUD-0023 — W7 / P2

**المالك المقترح:** مدير المشروع + مالكو الدومينات + QA  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** بوابة الموجة السابقة؛ راجع التبعيات التاريخية أدناه قبل التنفيذ.

#### MNT-AUD-0023 — Phase 24 Visual-Identity Architecture Document Still Specifies the Superseded Emerald-Green Brand

- **Discovered:** 2026-09-06
- **Phase:** P24 Enterprise Public Platform
- **Subsystem:** Architecture documentation / visual identity
- **Files / Evidence:**
  - `docs/phases/phase-24-enterprise-public-platform/phase-24-03-enterprise-public-platform-public-pages-user-experience.md`
  - `apps/web/src/features/public-template/template.css`
- **Category:** `DOCUMENTATION_DRIFT` / `PUBLIC_UI` / `NAMING`
- **Severity:** **P2 — MEDIUM**
- **Scope:** SOURCE DOCUMENTATION
- **Status:** OPEN
- **Evidence:** P24 Part C still mandates “Emerald Green” as the primary public brand anchor. The current implemented public semantic tokens use the approved MANARATAK identity: primary `#142B5F`, secondary `#0E7C86`, digital accent `#21A7B4`, gold `#D6A43B`, highlight `#F2CD78`, etc. The active document therefore contradicts current source and approved brand governance.
- **Expected Behavior:** P23/P24 architecture documents must describe the current approved visual identity and reference shared semantic tokens rather than obsolete color names.
- **Impact:** Future UI work can regress to the retired palette and architecture reviewers can approve changes against the wrong visual contract.
- **Required Action:** Rewrite the P24 visual-identity section around the current semantic token system; cross-reference the canonical brand/design-token authority; review P23/P22 visual wording for the same drift and mark superseded palette guidance historical.
- **Fix Wave:** W0/W5/W7.

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0051"></a>

### مهمة 107 — MNT-AUD-0051 — W7 / P2

**المالك المقترح:** مدير المشروع + مالكو الدومينات + QA  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** MNT-AUD-0080.

#### MNT-AUD-0051 — P2 MEDIUM — Phase 05 Traceability Authority Is Stale Against Current Event/Outbox and DI Composition
**Categories:** DOCUMENTATION / PHASE05 / TRACEABILITY / EVENTING / GOVERNANCE / SOURCE_TRUTH

**Evidence:**
- `docs/phases/phase-05-core-implementation/phase-05-traceability-matrix.md` is marked `Approved & Baselined` and presents itself as the exact implementation-status mapping for all 20 Phase 05 foundations.
- The matrix still describes Enterprise Events / Outbox as in-memory only and explicitly states that no transactional outbox table exists.
- Current source contains `PrismaEnterpriseEventRepository`, `PrismaEventPublishingGateway`, an `EnterpriseEventRecord` schema/migration and transactional outbox append behavior verified by `verify-w2-source.mjs`.
- Other matrix rows still describe in-memory implementations while current DI has intentionally replaced several of those paths with explicit `UNAVAILABLE` capabilities.
- The document carries a superseding notice, but the detailed rows and summary sections remain materially contradictory to current source and therefore are unsafe as an implementation-status authority.

**Impact:**
- Engineers/auditors can make wrong architecture and remediation decisions from a document labeled approved/baselined.
- Durable versus unavailable versus deferred boundaries are obscured.
- Cross-phase dependency planning can target obsolete adapters or miss current fail-closed behavior.

**Required remediation:**
1. Rebuild the matrix from the frozen/current composition root and owner repositories.
2. Classify every foundation as `DURABLE`, `DEVELOPMENT_ONLY`, `UNAVAILABLE_FAIL_CLOSED`, `DEFERRED_UNMOUNTED`, or `RUNTIME_PROOF_PENDING`.
3. Remove historical claims from active status cells; preserve them only in explicitly historical appendices.
4. Add a generated/source-checked traceability assertion for critical DI bindings.
5. Re-baseline only after the matrix matches code, migrations, routes and tests.

**Repair Wave:** W0 / W7  
**Status:** OPEN — PHASE05_TRACEABILITY_STATUS_STALE

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0052"></a>

### مهمة 108 — MNT-AUD-0052 — W7 / P2

**المالك المقترح:** مدير المشروع + مالكو الدومينات + QA  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** MNT-AUD-0094.

#### MNT-AUD-0052 — P2 MEDIUM — Operations Manual Describes a Container/CI Topology That Does Not Exist in Source
**Categories:** OPERATIONS / DEVOPS / DOCUMENTATION / DOCKER / CI / HANDOFF

**Evidence:**
- `docs/operations/containerization-and-ci.md` states that local Docker Compose contains `postgres`, `redis`, `api`, `web` and `admin` services and provides `./scripts/deploy/local-compose-up.sh` / `local-compose-down.sh` as startup commands.
- Actual `docker-compose.yml` defines only `postgres` and `redis` plus their volumes.
- Repository code search finds `local-compose-up.sh` only inside the manual; the documented script is not present as an operational entry point.
- The same manual states `.github/workflows/ci.yml` installs/runs Playwright E2E; the current CI workflow does not contain an E2E browser stage.
- `docs/remediation/wp1/DELIVERY_REALITY_REPORT.md` separately records that API/Web/Admin images are deferred, no Dockerfiles exist, and production containerization/deployment automation is deferred.

**Impact:**
- Handoff/deployment operators can execute nonexistent commands and expect nonexistent application containers.
- The manual overstates local environment parity and CI coverage.
- Runtime validation and incident reproduction procedures become unreliable.

**Required remediation:**
1. Rewrite the operations manual to describe the actual dependency-only Compose topology today.
2. Either create validated app Dockerfiles/scripts in a later approved remediation wave or remove all claims that they already exist.
3. Align documented CI stages exactly with executable workflows and explicitly mark E2E/runtime stages as pending where applicable.
4. Add documentation link checks for operational script/file paths and a source guard for compose service claims.
5. Reconcile the manual with `DELIVERY_REALITY_REPORT.md` and the final deployment/readiness report.

**Repair Wave:** W0 / W7  
**Status:** OPEN — OPERATIONS_MANUAL_TOPOLOGY_DRIFT

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

<a id="fix-0004"></a>

### مهمة 109 — MNT-AUD-0004 — W7 / P3

**المالك المقترح:** مدير المشروع + مالكو الدومينات + QA  
**حالة التنفيذ:** OPEN — لم يبدأ الإصلاح.  
**التبعيات:** بوابة الموجة السابقة؛ راجع التبعيات التاريخية أدناه قبل التنفيذ.

#### MNT-AUD-0004 — Root README Repository Layout Contains a Nonexistent `packages/utils` Package

- **Discovered:** 2026-09-06
- **Phase:** Repository Foundation
- **Subsystem:** Repository navigation / handoff
- **File:** `README.md`
- **Category:** `DOCUMENTATION_DRIFT`
- **Severity:** **P3 — LOW**
- **Scope:** SOURCE
- **Status:** OPEN
- **Evidence:** Root README lists `packages/utils` among shared foundations; the current `packages/` directory contains application, config, core, domain, infrastructure, shared, types, and ui, with no utils root.
- **Expected Behavior:** Root layout must match the repository exactly.
- **Required Action:** Determine whether `packages/utils` was intentionally merged/removed. Then either remove the stale README reference or restore the package only if architecture requires it.
- **Fix Wave:** W0/W7.

**دليل التنفيذ — يعبأ عند العمل، وليس دليلًا حاليًا:**

- [ ] تثبيت الحالة على commit الإصلاح ومراجعة addenda لهذا الرقم.
- [ ] إنجاز Required remediation / Recommended Remediation أعلاه أو بديل معتمد بالدليل.
- [ ] اختبار سلبي/تراجع ناجح وتسجيل الأمر والنتيجة.
- [ ] commit/PR: غير مسجل؛ مراجعة مستقلة: غير منفذة.
- [ ] runtime/provider/DB evidence إن لزم: غير منفذ؛ قرار الإغلاق: OPEN.

---

## 8. تحقق سلامة الترتيب

- 113 معرّفًا، أربعة aliases، 109 مهام تنفيذ فريدة، بلا إسقاط أو تكرار.
- مجموع الشدة: 76+32+1=109.
- جميع التبعيات المقترحة تشير إلى مهام سابقة في الترتيب؛ لا دورات في الجدول التنفيذي.
- SHA-256 لملف v0.67 المحفوظ في الملحق: 5467f194939fc08ecf0ff3ede7785dcc1b95cc14f8deb90c79ddf362f5fc0410.
- سجلات W0–W7 السابقة داخل الملحق تخطيط تاريخي؛ موجة الملكية الأساسية لهذه النسخة هي الموجودة في قائمة التنفيذ أعلاه.

# الملحق A — ملف v0.67 الأصلي كاملًا دون تعديل

<!-- ORIGINAL_V067_BEGIN -->
# MANARATAK — MASTER COMPLETION AUDIT PLAN & LIVING REGISTER
## خطة المراجعة الشاملة وسجل الإكمال الحي لمنصة منارتك

**File Status:** MASTER LIVING DOCUMENT  
**Current Audit Revision:** v0.67 (2026-09-06)  
**Project:** MANARATAK 2.0  
**Repository:** `wegdangamil2022-oss/MANARATAK_FINAL`  
**Audit Mode:** SOURCE-FIRST / DATABASE-INDEPENDENT  
**Primary Goal:** الوصول إلى **SOURCE COMPLETE 100%** قبل ربط قاعدة البيانات وتشغيل المشروع في Google Studio.  
**Runtime Goal After Source Closure:** ربط قاعدة البيانات، تطبيق migrations/seeds، تشغيل الاختبارات التشغيلية، ثم إعلان Runtime/Production Readiness.

---

# 1. القرار الإداري الأساسي

هذه المراجعة لا تفترض وجود قاعدة بيانات حالية.

القاعدة التي سنعمل عليها هي:

> **Google Studio لن يكمل أي منطق أو معمارية أو علاقة أو كود ناقص.**
> يجب أن يكون المستودع نفسه جاهزًا بالكامل قبل التشغيل.

بالتالي، قبل الانتقال إلى Google Studio يجب أن تكون الأمور التالية مجهزة من المصدر نفسه:

- جميع المراحل المطلوبة في خارطة المشروع.
- جميع Domain Models والعقود.
- جميع العلاقات بين الكيانات والمراحل.
- Prisma schema كامل ومتسق.
- جميع العلاقات والمفاتيح والقيود والفهارس المطلوبة.
- migrations المطلوبة ومهيأة للمسار الصحيح.
- seed/reference initialization إن كان مطلوبًا.
- APIs.
- Application services/use cases.
- repositories/adapters.
- events/workflows.
- import contracts/pipelines.
- RBAC/Auth rules.
- Admin Portal.
- Public Platform.
- Learning/Tests/Certificates flows.
- CMS.
- AI integration boundaries.
- Finance/services/career/tools إن كانت ضمن النطاق المعتمد.
- configuration contracts.
- env template.
- background jobs/queues.
- logging/audit/observability hooks.
- security controls.
- tests.
- CI/CD and deployment source configuration.
- documentation synchronized with actual code.

عدم وجود قاعدة بيانات الآن **ليس مبررًا لترك منطق أو علاقات أو schema أو migrations غير مكتملة**.

---

# 2. تعريف "100%" بدقة

سيتم الفصل بين ثلاث حالات حتى لا نعطي حكمًا غير دقيق.

## 2.1 SOURCE COMPLETE 100%

يمكن إعلان هذه الحالة قبل وجود قاعدة البيانات عندما:

- لا توجد مرحلة ضمن النطاق المعتمد ناقصة Source Implementation.
- لا توجد علاقة Domain/Cross-Phase معروفة غير منفذة.
- Prisma schema يغطي النموذج المستهدف كاملًا.
- migrations/source initialization مجهزة.
- جميع APIs/contracts/workflows مطابقة للمعمارية.
- Admin/Public source flows مكتملة.
- لا توجد ثغرات Source-level حرجة مفتوحة.
- لا توجد placeholders/mocks في production path.
- لا توجد TODOs وظيفية غير محسومة ضمن النطاق.
- جميع الوثائق الفعالة تطابق التنفيذ.
- build/typecheck/lint/unit/contract tests التي لا تحتاج DB قابلة للتنفيذ والنجاح.
- كل Runtime dependency غير الممكن إثباته بدون DB مسجل بوضوح كـ `POST-CONNECT VALIDATION` وليس كعمل تطوير ناقص.

## 2.2 RUNTIME VERIFIED

تتحقق بعد:

- ربط PostgreSQL.
- تطبيق migrations.
- تنفيذ seeds.
- تشغيل API/Admin/Web.
- تشغيل integration/database/E2E tests.
- التحقق من queues/cache/storage/external providers.
- التحقق من flows الحقيقية على قاعدة البيانات.

## 2.3 PRODUCTION READY

لا تُعلن إلا بعد Runtime Verified + security/performance/backup/rollback/monitoring/deployment validation.

**الهدف الحالي لهذا الملف هو الوصول إلى SOURCE COMPLETE 100%.**

---

# 3. وظيفة هذا الملف

هذا الملف ليس خطة مؤقتة.

هو **السجل الرئيسي الوحيد للمراجعة من أول يوم حتى الإغلاق النهائي**.

سيحتوي على:

1. خطة المراجعة.
2. حالة كل مرحلة.
3. حالة كل subsystem.
4. حالة كل مجموعة ملفات.
5. كل Finding.
6. كل تعارض بين وثيقة وكود.
7. كل علاقة ناقصة.
8. كل كود ناقص أو مكرر أو ميت.
9. كل ثغرة.
10. كل ملف يجب حذفه أو نقله أو دمجه أو إعادة تسميته.
11. كل قرار معماري يتم اتخاذه.
12. كل مشكلة تحتاج إضافة ملف جديد.
13. كل مشكلة تحتاج تعديل schema.
14. كل مشكلة تحتاج tests.
15. ترتيب الإصلاح النهائي.
16. حالة كل إصلاح.
17. Evidence الإغلاق.
18. الحكم النهائي.

---

# 4. قواعد المراجعة الإلزامية

## R-01 — لا ثقة عمياء في كلمة "Complete"

أي وثيقة تقول:

- Complete
- Final
- Closed
- Verified
- Production Ready
- Certified

لا تعتبر دليلًا بحد ذاتها.

يجب إثباتها من:

`Architecture → Contract → Code → Schema → API → UI → Tests → Integration`

---

## R-02 — الكود لا يتغلب تلقائيًا على الوثيقة، والوثيقة لا تتغلب تلقائيًا على الكود

عند التعارض نحدد:

- ما المرجع الأعلى Authority؟
- هل الوثيقة قديمة؟
- هل الكود انحرف؟
- هل الـRoadmap تغير؟
- هل ADR superseded قرارًا سابقًا؟

ثم نسجل قرارًا رسميًا.

---

## R-03 — لا إصلاح أثناء مرحلة الاكتشاف إلا إذا كان مانعًا للمراجعة نفسها

المراجعة تنقسم إلى:

### AUDIT
اكتشاف كامل.

ثم:

### REMEDIATION
إصلاح حسب dependency priority.

السبب:
إصلاح مشكلة قبل فهم سببها الجذري قد يخلق إعادة عمل أو يعالج symptom بدل root cause.

---

## R-04 — لا حذف صامت

أي ملف يراد حذفه يجب أن يسجل في:

`Deletion / Merge / Archive Register`

مع:

- السبب.
- البديل.
- references المتأثرة.
- risk.
- verification.

---

## R-05 — كل ملف Active يجب أن يصل إلى حالة REVIEWED

الاستثناءات فقط:

- generated artifacts.
- binaries غير المتعلقة بالمصدر.
- archived historical artifacts بعد التأكد من أنها ليست active authority.

---

## R-06 — لا نعتمد على وجود اسم مرحلة أو folder كدليل على تنفيذها

المرحلة تعتبر Source Complete فقط إذا كانت الوظيفة متكاملة.

---

## R-07 — العلاقات أهم من وجود الوحدات منفردة

وجود Course + Certificate لا يعني أن الشهادات تعمل.

يجب إثبات:

`completion → eligibility → issuance → QR → verification → revoke/status`

---

## R-08 — Google Studio ليس مالكًا لأي Development Gap

أي شيء يحتاج "Google Studio ليكتبه أو يكمله" يعتبر نقصًا في Source Readiness.

Google Studio لاحقًا دوره:

- install/run.
- provision/connect DB.
- inject environment.
- execute migrations.
- run validation.

---

# 5. مصادر السلطة المعمارية

يبدأ التدقيق من أعلى Authority وليس من README فقط.

الترتيب المبدئي:

1. Master Blueprint.
2. Official Roadmap.
3. ADRs.
4. Architecture Standards.
5. Enterprise Architecture Governance Index.
6. Active Phase Specifications.
7. Active contracts.
8. Active implementation.
9. current tests/verifiers.
10. remediation/history only as evidence, not authority unless explicitly active.
11. legacy = historical only.

خلال المراجعة سيتم بناء:

`DOCUMENT_AUTHORITY_MATRIX`

لكل وثيقة:

- path
- role
- authority level
- active/superseded/legacy
- conflicts
- action

---

# 6. الخطة التنفيذية للمراجعة

# AUDIT STAGE A0 — Repository Freeze & Inventory

## الهدف

تحديد الشيء الذي نراجعه بالضبط.

## الأعمال

- تسجيل branch/commit/hash.
- إنشاء شجرة كاملة للمستودع.
- إحصاء الملفات حسب النوع.
- تحديد:
  - apps
  - packages
  - scripts
  - tests
  - docs
  - workspace/data
  - Prisma
  - migrations
  - GitHub workflows
  - Docker
  - config
  - env templates
- اكتشاف:
  - duplicate files
  - backup files
  - old copies
  - generated outputs
  - hidden config
  - archived code
  - dead folders
- بناء File Coverage Register.

## Gate A0

لا ننتقل قبل أن نعرف كامل سطح المشروع.

---

# AUDIT STAGE A1 — Governance, Blueprint, Roadmap & Authority Audit

## الهدف

معرفة "ما هو المشروع رسميًا؟"

## الأعمال

- مراجعة Master Blueprint.
- مراجعة Roadmap الحالية.
- مراجعة ADRs.
- مراجعة Architecture Governance.
- تحديد عدد المراحل الرسمي.
- تحديد ownership لكل مرحلة.
- تحديد cross-phase dependencies.
- اكتشاف phase-number drift.
- اكتشاف docs التي تشير إلى خارطة قديمة.
- اكتشاف أسماء مراحل قديمة.
- اكتشاف عقود superseded ما زالت مستخدمة.

## المخرجات

- `Canonical Phase Map`
- `Authority Matrix`
- `Superseded Documentation Register`
- `Architecture Conflict Register`

---

# AUDIT STAGE A2 — Enterprise Architecture Audit

## الهدف

إثبات أن الهيكل العام للمشروع صحيح قبل الدخول في التفاصيل.

## المراجعة

- Modular Monolith boundaries.
- DDD boundaries.
- dependency direction.
- application/domain/infrastructure separation.
- API composition root.
- shared kernel limits.
- event boundaries.
- CQRS readiness.
- background jobs.
- cache boundaries.
- asset/file platform.
- search.
- notifications.
- audit logging.
- workflow.
- localization/i18n.
- configuration.
- observability.
- error handling.
- security architecture.
- integration boundaries.

## أسئلة إلزامية

- هل Domain يستورد Infrastructure؟
- هل Web/Admin يخترقان Domain مباشرة؟
- هل business rules موجودة في controllers/UI؟
- هل repositories contracts منفصلة عن adapters؟
- هل shared package تحول إلى God Package؟
- هل هناك circular dependencies؟
- هل الأحداث لها owner واضح؟
- هل كل module يمكن معرفة مدخلاته ومخرجاته؟

---

# AUDIT STAGE A3 — Repository Foundation & Build Contract

## النطاق

- root package files.
- workspace configuration.
- tsconfig.
- eslint/prettier.
- test configs.
- Docker.
- devcontainer.
- GitHub Actions.
- env.
- scripts.
- package lock.
- Node/npm version policy.

## نتحقق من

- package manager واحد.
- runtime version واحدة واضحة.
- لا تعارض docs/config.
- no stale scripts.
- no broken workspace references.
- no missing package manifests.
- no invalid aliases.
- no duplicate commands.
- install/build flow منطقي.
- clean-room bootstrap قابل للتعريف.

---

# AUDIT STAGE A4 — Data Architecture Without a Live Database

هذه مرحلة شديدة الأهمية لأن قاعدة البيانات غير موجودة الآن.

## الهدف

جعل كل شيء جاهزًا بحيث تكون قاعدة البيانات لاحقًا مجرد تنفيذ للنموذج، لا مكانًا لاكتشاف التصميم.

## المراجعة

### Prisma Schema
- كل model.
- كل enum.
- كل relation.
- one-to-one.
- one-to-many.
- many-to-many.
- optionality.
- cardinality.
- IDs.
- FK strategy.
- unique constraints.
- compound unique.
- indexes.
- timestamps.
- soft delete.
- versioning.
- status lifecycle.
- tenant/organization boundaries إن وجدت.
- audit fields.
- source/provider identity.
- translations/localized entities.
- asset references.
- search/read model identities.
- event/outbox tables إن كانت جزءًا من التصميم.

### Migration Architecture
- migration history/source.
- initial migration strategy.
- safe changes.
- no destructive default path.
- rollback plan.
- seed order.
- dependency order.

### Seed / Reference Initialization
- countries.
- languages.
- currencies.
- academic reference data.
- roles/permissions.
- system settings.
- certificate configuration.
- required bootstrap data.

## Gate A4

يجب أن يكون لدينا جواب دقيق:

> إذا أنشأنا PostgreSQL فارغة الآن، ما السلسلة التي تحولها إلى قاعدة MANARATAK صحيحة؟

---

# AUDIT STAGE A5 — Phases 1–5 Enterprise Foundation

كل Phase/Capability تراجع عبر Full Vertical Audit وليس عبر الملفات فقط.

المجالات المحتملة تشمل حسب الـBlueprint/Roadmap:

- identity.
- auth.
- RBAC.
- organization/core.
- settings/config.
- assets/files.
- notification.
- audit.
- search foundation.
- cache.
- background jobs.
- events/outbox.
- workflow.
- API/shared components.
- monitoring/logging.
- security.
- integration.
- localization/i18n.

لكل Capability:
`Docs → Contract → Domain → Application → Infrastructure → API → Test → Integration`

---

# AUDIT STAGE A6 — Phase 6 Universal Import

## نراجع

- provider input boundary.
- raw payload preservation.
- normalize.
- validate.
- map.
- anti-corruption layer.
- duplicate hooks.
- domain handoff.
- idempotency.
- retry.
- status lifecycle.
- change sets.
- rollback.
- import audit.
- SSRF controls.
- CSV/JSON/manual imports.
- translation hooks.
- asset imports.
- no direct spreadsheet-to-DB bypass.
- no domain ownership leakage into generic import.

## End-to-End Source Flow

`Source → Parse → Raw → Normalize → Validate → Map → Match → Review → Domain Handoff → Persist Contract → Audit`

---

# AUDIT STAGE A7 — Phase-by-Phase Domain Audit

المراحل الرسمية الحالية ستراجع واحدة واحدة، لكن بالترتيب المعتمد على dependencies.

## Phase 7 — Global Reference Data
- countries
- cities/regions
- continents
- languages
- currencies
- nationalities
- education levels
- degree types
- study modes
- standards/aliases/lifecycle

## Phase 8 — Academic Taxonomy
- hierarchy
- classifications
- taxonomies
- canonical IDs
- aliases
- translation
- dependency to majors/tests/universities

## Phase 9 — International Tests Platform
- tests
- sections
- scores
- providers
- validity
- requirements
- mappings
- public/admin/read contracts

## Phase 10 — Majors & Disciplines
- bachelor/master/doctoral/etc.
- taxonomy linkage
- localized titles
- hierarchy
- relationships to university programs/scholarships/courses

## Phase 11 — Universities & Institutions
- institution
- campus
- faculty
- program
- tuition
- accreditation
- ranking
- research
- media
- locations
- academic relationships
- import contracts
- admin/public contracts

## Phase 12 — Scholarships
- funding
- eligibility
- deadlines
- countries
- institutions
- majors
- degree levels
- documents
- sponsor
- application links
- trust/source data
- lifecycle

## Phase 13 — Learning Platform
- provider
- course
- curriculum
- modules/lessons
- enrollment
- progress
- assessment
- completion
- learning paths
- free certificate eligibility where applicable
- source provider URL integrity

## Phase 14 — Certificates
- certificate templates/config.
- eligibility.
- issuance.
- unique identity.
- QR payload.
- verification.
- public verification endpoint/page contract.
- revocation.
- reissue.
- audit.
- learning completion events.

## Phase 15 — Student Platform
- profile.
- preferences.
- saved opportunities.
- progress.
- certificates history.
- application/workspace.
- privacy.
- asset ownership.
- notification preferences.

## Phase 16 — CMS
- articles.
- pages.
- editorial content.
- SEO.
- localization.
- publishing workflow.
- revisions.
- media/asset references.
- roles.

## Phase 17 — AI
- secure proxy.
- provider abstraction.
- prompt/config ownership.
- quotas.
- abuse prevention.
- PII boundaries.
- fallback/degradation.
- logging without secret leakage.
- translation/advisory flows.

## Phase 18 — Student Tools
- كل tool محدد بالـRoadmap/Specs.
- ownership.
- input validation.
- history if required.
- saved outputs.
- file assets.
- AI dependency boundaries.

## Phase 19 — Finance & Payments
- scope verification first.
- money model.
- currency.
- transaction states.
- provider abstractions.
- idempotency.
- reconciliation.
- audit.
- security.
- ensure architecture does not contradict project's out-of-scope rules.

## Phase 20 — Enterprise Services
يتم تحديد الموجود فعليًا ثم:
- contracts.
- source implementation.
- admin/public flows.
- dependencies.

## Phase 21 — Career & Alumni
يتم تحديد الموجود فعليًا ثم:
- profiles.
- opportunities.
- alumni/career relations.
- permissions.
- workflows.
- integrations.

## Phase 22 — Product Experience
- navigation.
- personalization.
- design system.
- experience orchestration.
- accessibility.
- SEO/performance.
- cross-product consistency.

## Phase 23 — Administration Portal
تراجع كمنصة شاملة لكل domains، وليس مجرد صفحات.

## Phase 24 — Public Platform
تراجع كتركيب نهائي لكل public domains.

**أي مرحلة 20–24 موجودة جزئيًا ستصنف `PARTIAL`.  
أي مرحلة غير منفذة ستصنف `MISSING`.  
ثم تدخل لاحقًا في remediation/build scope قبل Source Complete.**

---

# 7. Full Vertical Audit Template لكل مرحلة

لا تغلق أي مرحلة إلا بعد مراجعة البنود التالية:

## Gate 1 — Purpose & Ownership
- الهدف واضح؟
- owner واضح؟
- boundaries صحيحة؟

## Gate 2 — Documentation
- spec موجود؟
- contract موجود؟
- implementation guide مطابق؟
- لا تعارض مع roadmap/ADR؟

## Gate 3 — Domain Model
- entities/value objects/invariants.
- lifecycle.
- IDs.
- business rules.
- translations.

## Gate 4 — Application Layer
- use cases.
- commands/queries.
- validation.
- authorization decisions.
- transaction boundaries.

## Gate 5 — Persistence Contract
- repository interface.
- schema mapping.
- relations.
- constraints.
- queries.

## Gate 6 — API
- route.
- request schema.
- auth.
- authorization.
- validation.
- response contract.
- errors.
- pagination.

## Gate 7 — Events & Workflows
- emitted events.
- consumed events.
- retries.
- idempotency.
- state transitions.

## Gate 8 — Admin
- create.
- view.
- edit.
- publish/approve.
- archive/restore.
- search/filter.
- bulk actions where required.
- permissions.
- audit trail.

## Gate 9 — Public/Student
- page/read API.
- filtering.
- language.
- SEO.
- access.
- privacy.

## Gate 10 — Security
- authentication.
- authorization.
- object ownership.
- input/output safety.
- abuse limits.
- sensitive data.

## Gate 11 — Tests
- unit.
- contract.
- integration source.
- negative cases.
- permission cases.
- edge cases.

## Gate 12 — Cross-Phase Integration
- upstream dependencies.
- downstream consumers.
- relation IDs.
- events.
- imports.
- assets.
- localization.
- search.

### Phase Status Values

- `NOT_STARTED`
- `IN_AUDIT`
- `PASS`
- `PASS_WITH_FINDINGS`
- `PARTIAL`
- `MISSING`
- `BLOCKED_BY_SOURCE_DEFECT`
- `READY_FOR_REMEDIATION`
- `REMEDIATED`
- `SOURCE_CLOSED`

---

# 8. Cross-Phase Integration Audit

بعد مراجعة كل مرحلة منفردة نراجع "الحواف" بين المراحل.

## نبني Cross-Phase Matrix

مثال:

| Producer | Contract/Event/Relation | Consumer | Required | Implemented | Tested | Status |
|---|---|---|---|---|---|---|
| P7 Reference | CountryId | P11 University | Yes | TBD | TBD | TBD |
| P8 Taxonomy | TaxonomyNodeId | P10 Major | Yes | TBD | TBD | TBD |
| P10 Major | MajorId | P11 Program | Yes | TBD | TBD | TBD |
| P11 University | UniversityId | P12 Scholarship | Yes | TBD | TBD | TBD |
| P13 Learning | CourseCompleted | P14 Certificate | Yes | TBD | TBD | TBD |
| P14 Certificate | CertificateIssued | P15 Student | Yes | TBD | TBD | TBD |

## العلاقات الحرجة التي سنثبتها

- Reference ↔ every domain.
- Taxonomy ↔ majors.
- Majors ↔ programs.
- Universities ↔ scholarships.
- Universities ↔ learning.
- Scholarships ↔ students.
- Learning ↔ assessments.
- Learning completion ↔ certificate eligibility.
- Certificate ↔ QR verification.
- Certificate ↔ student profile.
- CMS ↔ public composition.
- Assets ↔ all media/file domains.
- Import ↔ every importable domain.
- Search ↔ public catalogs.
- Admin ↔ every manageable domain.
- Public Platform ↔ all publishable domains.
- Audit log ↔ every privileged mutation.
- Notifications ↔ meaningful events.
- localization ↔ all user-facing entities.

---

# 9. Certificate/QR Critical Chain

هذه سلسلة خاصة لن تعتبر مكتملة بمجرد وجود ملفات الشهادات.

يجب إثبات المصدر الكامل:

`Course`
→ `Enrollment`
→ `Progress`
→ `Assessment`
→ `Pass/Completion`
→ `Completion Event`
→ `Certificate Eligibility`
→ `Certificate Issue`
→ `Certificate Number`
→ `QR Payload`
→ `Verification Token/URL`
→ `Public Verification`
→ `Status`
→ `Revocation/Reissue`
→ `Audit`
→ `Student History`

إذا القالب البصري لم يُصمم بعد، يجب فصل:

- **Certificate Engine** = يجب أن يكون Source Complete.
- **Visual Template Asset** = يمكن إضافته لاحقًا بشرط أن engine يدعم template injection/versioning ولا يعتمد على hardcoded layout.

---

# 10. Admin Portal Comprehensive Audit

لوحة التحكم لن تراجع صفحة صفحة بصريًا فقط.

سيتم إنشاء:

`ADMIN_DOMAIN_COVERAGE_MATRIX`

لكل Domain:

- route موجود.
- list.
- details.
- create.
- edit.
- status transitions.
- archive.
- restore.
- delete policy.
- search.
- filter.
- pagination.
- import.
- review.
- approval.
- bulk action.
- role permission.
- audit.
- validation.
- error state.
- empty state.
- loading state.
- localization.
- API wiring.

أي Entity موجود في backend ولا يمكن إدارته حسب الحاجة من Admin = Finding.

---

# 11. Public Platform Comprehensive Audit

سنراجع:

- all public routes.
- entity detail pages.
- catalog/list pages.
- search.
- filters.
- pagination.
- SEO metadata.
- canonical URLs.
- sitemap.
- structured data.
- Arabic/English parity.
- RTL/LTR.
- accessibility.
- responsive behavior.
- empty/error/loading states.
- authentication boundaries.
- student actions.
- real API wiring vs static mocks.
- duplicate page composition.
- stale placeholders.

---

# 12. Security Forensic Audit

المراجعة الأمنية ستكون مستقلة عن مراجعة المراحل.

## Areas

- secret leakage.
- `.env`.
- hardcoded tokens.
- JWT/session.
- password policy.
- RBAC.
- permission bypass.
- IDOR/BOLA.
- mass assignment.
- injection.
- XSS.
- CSRF where relevant.
- CORS.
- SSRF.
- open redirects.
- file upload.
- MIME validation.
- asset access.
- path traversal.
- rate limiting.
- brute force.
- reset/recovery flows.
- logging sensitive data.
- PII.
- admin privilege escalation.
- AI prompt/provider abuse.
- payment/webhook validation if applicable.
- dependency/supply-chain exposure.
- unsafe deserialization.
- unsafe dynamic code execution.
- insecure defaults.

### Security Status

- `CRITICAL`
- `HIGH`
- `MEDIUM`
- `LOW`
- `HARDENING`

---

# 13. Source Quality / Code Forensic Sweep

سيتم البحث عن:

- duplicate implementations.
- dead code.
- unreachable code.
- unused modules.
- stale compatibility code.
- legacy imports.
- TODO.
- FIXME.
- HACK.
- placeholder.
- mock in production path.
- fake data.
- commented-out business logic.
- `any` in core business logic.
- `@ts-ignore`.
- silent catches.
- raw console logging.
- weak error handling.
- duplicated validators.
- duplicated enums.
- duplicated types.
- circular imports.
- cross-layer violations.
- inconsistent naming.
- giant files/classes.
- God services.
- hardcoded IDs.
- hardcoded URLs.
- magic numbers.
- unbounded queries.
- missing pagination.
- N+1 patterns detectable from source.
- missing transaction boundaries.
- race/idempotency risks.

---

# 14. Test Architecture Audit

لا يكفي عدد الاختبارات.

سنربط كل Critical Capability باختبار.

## Test Coverage Matrix

- business invariant.
- use case.
- API contract.
- authorization.
- invalid input.
- not found.
- duplicate.
- concurrency-sensitive flow.
- idempotency.
- event emission.
- event duplicate.
- certificate eligibility.
- import duplicate resolution.
- admin permission.
- public visibility.
- localization fallback.
- security negative cases.

## Runtime-dependent Tests

الاختبارات التي تتطلب DB حقيقية ستجهز Source-side الآن، ثم تصنف:

`READY_TO_RUN_AFTER_DB_CONNECT`

بدل تركها غير مكتوبة.

---

# 15. DevOps / Operational Source Readiness

حتى قبل التشغيل نراجع:

- clean install contract.
- Node/npm versions.
- package lock.
- Docker.
- compose.
- env schema/template.
- CI.
- build.
- lint.
- test.
- migration command.
- seed command.
- rollback command.
- health endpoints.
- readiness endpoints.
- logging config.
- cache/queue config.
- storage config.
- deployment env mapping.
- secrets contract.
- production-safe defaults.

---

# 16. Final File-by-File Sweep

هذه المرحلة تأتي **بعد فهم النظام والمراحل** وليس في البداية.

السبب:
قراءة كل ملف بلا سياق قد تكشف syntax/style issues لكنها تفشل في اكتشاف أن الوظيفة نفسها ناقصة.

## لكل ملف Active

نسجل:

- path.
- category.
- owning phase/domain.
- purpose.
- imports/dependencies.
- reviewed.
- findings.
- action.

## File Classification

- `ACTIVE_VALID`
- `ACTIVE_NEEDS_FIX`
- `DUPLICATE`
- `DEAD`
- `STALE`
- `LEGACY`
- `GENERATED`
- `MISPLACED`
- `SECURITY_RISK`
- `MERGE_CANDIDATE`
- `DELETE_CANDIDATE`

---

# 17. سجل المشاكل — FINDINGS REGISTER

## المعرفات

كل Finding يأخذ ID ثابت:

`MNT-AUD-0001`
`MNT-AUD-0002`
`MNT-AUD-0003`

ولا يعاد استخدام الرقم حتى لو أغلقت المشكلة.

## Findings Master Table

| ID | Phase | Area | File/Path | Type | Severity | Source/Runtime | Status | Fix Wave |
|---|---|---|---|---|---|---|---|---|
| — | — | — | — | — | — | — | — | — |

## Detailed Finding Template

### MNT-AUD-XXXX — [Title]

- **Discovered:** YYYY-MM-DD
- **Phase:** PXX / Cross-Cutting
- **Subsystem:**
- **File(s):**
- **Line/Symbol:**
- **Category:**
- **Severity:**
- **Scope:** SOURCE / POST-CONNECT-RUNTIME
- **Status:** OPEN
- **Evidence:**
- **Expected Behavior:**
- **Actual Behavior/State:**
- **Root Cause:**
- **Impact:**
- **Affected Upstream:**
- **Affected Downstream:**
- **Security Impact:**
- **Data Impact:**
- **Required Action:** MODIFY / ADD / DELETE / MOVE / MERGE / REWRITE / DOCUMENT
- **Recommended Remediation:**
- **Required Tests:**
- **Dependencies Before Fix:**
- **Regression Risk:**
- **Fix Wave:**
- **Fix Commit/Artifact:**
- **Verification Evidence:**
- **Closure Decision:**

---

# 18. أنواع Findings

- `ARCHITECTURE`
- `ROADMAP`
- `DOCUMENTATION_DRIFT`
- `MISSING_IMPLEMENTATION`
- `PARTIAL_IMPLEMENTATION`
- `BUSINESS_LOGIC`
- `DOMAIN_MODEL`
- `DATA_MODEL`
- `RELATIONSHIP`
- `PRISMA`
- `MIGRATION`
- `API`
- `ADMIN`
- `PUBLIC_UI`
- `AUTH`
- `RBAC`
- `SECURITY`
- `IMPORT`
- `EVENT`
- `WORKFLOW`
- `CERTIFICATE`
- `SEARCH`
- `LOCALIZATION`
- `ASSET`
- `AI`
- `FINANCE`
- `CONFIG`
- `DEVOPS`
- `TEST`
- `PERFORMANCE`
- `OBSERVABILITY`
- `DEAD_CODE`
- `DUPLICATION`
- `LEGACY`
- `NAMING`
- `QUALITY`

---

# 19. Severity

## P0 — CRITICAL BLOCKER

مثال:
- architecture invalidates core system.
- authorization bypass.
- destructive data design.
- core phase entirely absent.
- broken canonical identity model.
- source cannot build structurally.

## P1 — HIGH

- major feature incomplete.
- critical cross-phase relation missing.
- admin cannot manage core domain.
- certificate chain incomplete.
- import violates domain ownership.
- high security weakness.

## P2 — MEDIUM

- incorrect edge behavior.
- missing validation.
- inconsistent API contract.
- weak test coverage on important flow.

## P3 — LOW

- maintainability.
- minor duplication.
- documentation gaps with no behavior impact.

## P4 — IMPROVEMENT

- optimization.
- optional refactor.
- enhancement outside required closure.

---

# 20. ترتيب الإصلاح لا يعتمد على Severity فقط

بعد انتهاء Audit Discovery، سنرتب الإصلاح حسب dependency graph.

## W0 — Authority & Repository Truth

- roadmap conflicts.
- active/legacy confusion.
- package/runtime contract.
- broken build structure.
- invalid source references.

## W1 — Architecture / Security Foundations

- layer violations.
- auth/RBAC.
- config/security.
- event foundation.
- asset foundation.

## W2 — Data Model & Persistence Contract

- Prisma.
- IDs.
- relations.
- constraints.
- migrations.
- seed/bootstrap.

## W3 — Core Shared Capabilities

- import.
- reference.
- taxonomy.
- search.
- workflow.
- audit.
- localization.

## W4 — Core Business Domains

Dependency order:

Reference
→ Taxonomy
→ Tests/Majors
→ Universities
→ Scholarships
→ Learning
→ Certificates
→ Student
→ CMS
→ AI
→ Tools
→ Finance
→ Services
→ Career

## W5 — Admin & Public Composition

- Admin.
- Public.
- Product Experience.
- cross-domain pages.

## W6 — Tests / Reliability / DevOps

- missing tests.
- CI.
- health/readiness.
- operational source.

## W7 — Cleanup / Documentation / Polish

- dead files.
- docs normalization.
- naming.
- optional refactors.

---

# 21. Phase Master Status Matrix

| Phase | Official Name | Docs | Domain | App | Prisma | API | Events | Admin | Public | Tests | Cross-Phase | Overall |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| P01 | Architecture Constitution / Foundation | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | NOT_AUDITED |
| P02 | Foundation | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | NOT_AUDITED |
| P03 | Foundation | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | NOT_AUDITED |
| P04 | Foundation | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | NOT_AUDITED |
| P05 | Foundation / Asset Platform | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | NOT_AUDITED |
| P06 | Universal Import | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | NOT_AUDITED |
| P07 | Global Reference Data | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | NOT_AUDITED |
| P08 | Academic Taxonomy | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | NOT_AUDITED |
| P09 | International Tests | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | NOT_AUDITED |
| P10 | Majors & Disciplines | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | NOT_AUDITED |
| P11 | Universities & Institutions | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | NOT_AUDITED |
| P12 | Scholarships | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | NOT_AUDITED |
| P13 | Learning | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | NOT_AUDITED |
| P14 | Certificates | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | NOT_AUDITED |
| P15 | Student Platform | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | NOT_AUDITED |
| P16 | CMS | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | NOT_AUDITED |
| P17 | AI | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | NOT_AUDITED |
| P18 | Student Tools | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | NOT_AUDITED |
| P19 | Finance & Payments | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | NOT_AUDITED |
| P20 | Enterprise Services | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | NOT_AUDITED |
| P21 | Career & Alumni | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | NOT_AUDITED |
| P22 | Product Experience | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | NOT_AUDITED |
| P23 | Administration Portal | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | NOT_AUDITED |
| P24 | Public Platform | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | NOT_AUDITED |

**ملاحظة:** أسماء/حدود P1–P5 ستثبت حرفيًا من الـRoadmap/Blueprint/phase docs أثناء A1 بدل افتراض تقسيم غير موثق.

---

# 22. File Coverage Register

| Scope | Total Files | Reviewed | Exempt/Generated | Findings | Status |
|---|---:|---:|---:|---:|---|
| Root | TBD | 0 | 0 | 0 | NOT_STARTED |
| apps/api | TBD | 0 | 0 | 0 | NOT_STARTED |
| apps/admin | TBD | 0 | 0 | 0 | NOT_STARTED |
| apps/web | TBD | 0 | 0 | 0 | NOT_STARTED |
| packages/domain | TBD | 0 | 0 | 0 | NOT_STARTED |
| packages/application | TBD | 0 | 0 | 0 | NOT_STARTED |
| packages/infrastructure | TBD | 0 | 0 | 0 | NOT_STARTED |
| packages/core | TBD | 0 | 0 | 0 | NOT_STARTED |
| packages/shared | TBD | 0 | 0 | 0 | NOT_STARTED |
| packages/config | TBD | 0 | 0 | 0 | NOT_STARTED |
| packages/types | TBD | 0 | 0 | 0 | NOT_STARTED |
| packages/ui | TBD | 0 | 0 | 0 | NOT_STARTED |
| packages/utils | TBD | 0 | 0 | 0 | NOT_STARTED |
| scripts | TBD | 0 | 0 | 0 | NOT_STARTED |
| tests | TBD | 0 | 0 | 0 | NOT_STARTED |
| docs | TBD | 0 | 0 | 0 | NOT_STARTED |
| workspace | TBD | 0 | 0 | 0 | NOT_STARTED |
| .github | TBD | 0 | 0 | 0 | NOT_STARTED |

---

# 23. Deletion / Move / Merge Register

| ID | Path | Action | Reason | Replacement | References Checked | Risk | Status |
|---|---|---|---|---|---|---|---|
| — | — | — | — | — | — | — | — |

---

# 24. Architecture Decision Register During Audit

إذا اكتشفنا أن الوضع الحالي يحتاج قرارًا، لا نعدل بصمت.

| Decision ID | Topic | Current State | Options | Decision | Impacted Files/Phases | ADR Needed | Status |
|---|---|---|---|---|---|---|---|
| MNT-DEC-0001 | — | — | — | — | — | — | — |

---

# 25. Runtime-Deferred Validation Register

هذا القسم يمنع خلط "لا توجد DB" مع "الكود ناقص".

| ID | Capability | Source Prepared? | Why Runtime Needed | Exact Post-Connect Test | Source Blocker? |
|---|---|---|---|---|---|
| RT-001 | Prisma migration execution | TBD | PostgreSQL required | Apply migrations to clean DB | No if source complete |
| RT-002 | Referential DB enforcement | TBD | PostgreSQL required | Create invalid/valid relations | No if source contract complete |
| RT-003 | DB-backed E2E | TBD | DB required | Run E2E suite | No if tests are already authored |
| RT-004 | Concurrency/transaction proof | TBD | real DB required | parallel mutation test | No if transaction design complete |

أي بند هنا يجب أن يحتوي **اختبارًا محددًا جاهزًا للتنفيذ لاحقًا**.

---

# 26. Source Closure Gates

لن نعلن SOURCE COMPLETE 100% إلا إذا تحقق كل التالي:

## Governance
- [ ] Roadmap واحدة فعالة.
- [ ] Blueprint synchronized.
- [ ] ADRs active/superseded واضح.
- [ ] no contradictory active docs.

## Architecture
- [ ] boundaries سليمة.
- [ ] dependency rules سليمة.
- [ ] no unresolved critical architecture finding.

## Phases
- [ ] P1 closed.
- [ ] P2 closed.
- [ ] P3 closed.
- [ ] P4 closed.
- [ ] P5 closed.
- [ ] P6 closed.
- [ ] P7 closed.
- [ ] P8 closed.
- [ ] P9 closed.
- [ ] P10 closed.
- [ ] P11 closed.
- [ ] P12 closed.
- [ ] P13 closed.
- [ ] P14 closed.
- [ ] P15 closed.
- [ ] P16 closed.
- [ ] P17 closed.
- [ ] P18 closed.
- [ ] P19 closed.
- [ ] P20 closed.
- [ ] P21 closed.
- [ ] P22 closed.
- [ ] P23 closed.
- [ ] P24 closed.

## Data
- [ ] Prisma complete.
- [ ] relations complete.
- [ ] constraints/indexes complete.
- [ ] migration strategy complete.
- [ ] bootstrap/seed strategy complete.

## Integration
- [ ] all mandatory cross-phase edges verified in source.
- [ ] no orphan domain.
- [ ] no UI-only fake relationships.

## Security
- [ ] P0 = 0.
- [ ] P1 = 0.
- [ ] no known exploitable source-level security defect.

## Code
- [ ] active files reviewed.
- [ ] dead/duplicate/legacy active conflicts resolved.
- [ ] no production placeholders.

## Admin
- [ ] domain coverage complete.

## Public
- [ ] required public composition complete.

## Tests
- [ ] source-runnable tests passing.
- [ ] runtime-dependent tests authored and registered.

## Documentation
- [ ] docs match implementation.
- [ ] README reflects actual state.
- [ ] no false "complete" claims.

---

# 27. Prioritization After Audit

بعد إكمال discovery لن نبدأ عشوائيًا.

سيتم إنتاج ترتيب بهذا الشكل:

### BLOCKING ROOT CAUSES
1. authority/roadmap.
2. architecture.
3. schema/data model.
4. core security.
5. shared contracts.

### DEPENDENCY FOUNDATION
6. reference.
7. taxonomy.
8. import.
9. event/workflow/assets/search.

### BUSINESS DOMAINS
10. tests/majors.
11. universities.
12. scholarships.
13. learning.
14. certificates.
15. student.
16. CMS.
17. AI/tools.
18. finance/services/career.

### COMPOSITION
19. admin.
20. public/product experience.

### CLOSURE
21. tests.
22. cleanup.
23. docs.
24. final regression/source closure.

كل Finding سيحصل على Fix Wave بدل الاعتماد على رقم Severity فقط.

---

# 28. طريقة العمل الفعلية عند استلام نسخة المشروع للمراجعة

## Audit Pass 1 — Map
لا تعديل.
نبني inventory + authority + dependencies.

## Audit Pass 2 — Architecture
لا تعديل إلا إن كان الملف يمنع القراءة/التحليل.
نسجل findings.

## Audit Pass 3 — Phase Deep Audit
مرحلة مرحلة.
كل Finding يدخل نفس هذا الملف فور اكتشافه.

## Audit Pass 4 — Cross-System
نراجع العلاقات التي لا يمكن إثباتها داخل phase واحدة.

## Audit Pass 5 — Security
مراجعة مستقلة كاملة.

## Audit Pass 6 — Admin/Public
مراجعة شاملة.

## Audit Pass 7 — File-by-File
آخر sweep لضمان عدم سقوط ملف.

## Audit Pass 8 — Reconciliation
نراجع findings ونزيل duplicates ونربط الأسباب الجذرية.

## Audit Pass 9 — Prioritization
نبني remediation waves.

بعدها فقط ننتقل إلى **الإصلاح**.

---

# 29. Remediation Workflow

لكل Finding:

1. فهم root cause.
2. تحديد files affected.
3. تحديد upstream/downstream.
4. اتخاذ architecture decision إن لزم.
5. تعديل الكود.
6. تعديل schema.
7. تعديل docs.
8. إضافة/تعديل tests.
9. تشغيل source verification.
10. تحديث Finding إلى `REMEDIATED`.
11. عمل regression حوله.
12. تحويله إلى `CLOSED`.

لا يغلق Finding بمجرد تعديل ملف.

---

# 30. Final Regression

بعد إغلاق كل Findings:

نعيد المشروع مرة أخرى من أعلى لأسفل:

- roadmap.
- architecture.
- packages.
- phases.
- relations.
- schema.
- APIs.
- admin.
- public.
- security.
- tests.
- docs.
- file coverage.

الهدف:
التأكد أن الإصلاحات نفسها لم تخلق drift جديدًا.

---

# 31. Final Management Decision

الحكم النهائي سيكون واحدًا من:

## `SOURCE_NOT_COMPLETE`
هناك Development work مفتوح.

## `SOURCE_COMPLETE_WITH_KNOWN_NONBLOCKING_DEFERRED_RUNTIME_VALIDATIONS`
كل التطوير المطلوب مكتمل، والمتبقي فقط اختبارات تحتاج DB/runtime فعلي.

## `SOURCE_COMPLETE_100_PERCENT_READY_FOR_RUNTIME_PROVISIONING`
هذه هي الحالة المستهدفة قبل Google Studio.

بعدها يبدأ ملف تشغيل منفصل Runtime Validation، وليس Development Remediation.

---

# 32. ملاحظات أولية من المستودع الحالي — ليست Findings نهائية بعد

هذه إشارات فقط وسيتم تأكيدها أثناء Audit:

1. الـRoadmap الحالية تعرف 24 مرحلة.
2. الوثيقة الحالية تقول إن Source Implementation كان موجودًا حتى Phase 19 وقت baseline، بينما 20–24 لم تكن تعتبر مكتملة.
3. هذا لا يعني أننا سنترك 20–24؛ بالعكس، سنراجعها ونعتبر أي نقص منها Development Gap يجب إغلاقه قبل هدفك النهائي.
4. README الحالي ما زال يتحدث عن DB recovery/Google Studio من سياق سابق؛ بما أنك أكدت أنه لا توجد قاعدة بيانات أصلًا، يجب تدقيق هذه اللغة وقد تحتاج إعادة كتابة حتى تعكس الحقيقة الحالية.
5. هناك اختلاف يحتاج تحقق بين runtime requirement المكتوب في README وبين `package.json`; سيدخل كـFinding فقط بعد فحص جميع runtime/version authorities.
6. وجود عدد كبير من verifier/closure scripts مفيد، لكن كل verifier نفسه سيخضع للمراجعة؛ نجاح script لا يكفي إذا كان script يتحقق من أشياء ناقصة أو سطحية.

---

# 33. قاعدة المدير للمشروع

الهدف ليس أن يصبح المستودع "يمر الاختبارات الحالية".

الهدف:

> **أن يصبح تصميم MANARATAK وتنفيذه ووثائقه وعلاقاته متسقة بحيث لو أعطينا المشروع غدًا لمهندس جديد مع PostgreSQL فارغة، يستطيع وفق الوثائق والأوامر الموجودة أن ينشئ النظام، يشغله، ويفهم كل علاقة بدون الحاجة لاختراع أي جزء ناقص.**

هذا هو معيار الإغلاق الحقيقي.

---

# 34. Current Audit Dashboard

**Audit Status:** PLAN_PREPARED  
**Discovery Started:** NO  
**Repository Frozen:** NO  
**Total Files:** TBD  
**Files Reviewed:** 0  
**Phases Audited:** 0 / 24  
**Findings:** 0 formal findings  
**P0:** 0  
**P1:** 0  
**P2:** 0  
**P3:** 0  
**P4:** 0  
**Remediation Started:** NO  
**Source Completion:** NOT ASSESSED  
**Runtime Validation:** NOT IN CURRENT SCOPE

---

# 35. Change Log for This Master File

| Version | Date | Change |
|---|---|---|
| 0.1 | 2026-09-06 | Initial master audit plan created. |

---

# 36. LIVE AUDIT — BATCH 001 — A0/A1 BASELINE & GOVERNANCE

**Audit Date:** 2026-09-06  
**Repository:** `wegdangamil2022-oss/MANARATAK_FINAL`  
**Branch:** `main`  
**Frozen Audit Commit:** `0931c5664cf274cb2b8f4cb250dd09ebf2e9a77f`  
**Commit Message:** `feat: integrate public UI and official admin handoff`  
**Batch Status:** `COMPLETED_WITH_FINDINGS`  
**Audit Stages Covered:** A0 partial inventory + A1 authority/governance baseline  

## 36.1 Baseline Facts Confirmed

- The repository is an npm workspaces monorepo.
- Application roots confirmed:
  - `apps/api`
  - `apps/web`
  - `apps/admin`
- Package roots confirmed:
  - `packages/application`
  - `packages/config`
  - `packages/core`
  - `packages/domain`
  - `packages/infrastructure`
  - `packages/shared`
  - `packages/types`
  - `packages/ui`
- `packages/utils` is **not present** in the current `packages/` root despite being named in the root README.
- Active documentation authority model confirmed:
  1. Master Blueprint / Architecture Constitution.
  2. Roadmap v6.0 for phase numbering/sequencing/dependencies.
  3. ADRs.
  4. Domain/Phase specifications.
  5. Governance Index is navigational only.
- Roadmap v4.1 and v5.0 are retained but explicitly marked historical/superseded; no finding is raised merely for their presence.
- Roadmap v6.0 defines 24 phases.
- `docs/phases` contains phase documentation roots through Phase 24.
- Current Roadmap baseline states source implementation through P19 and does not claim P20–P24 complete.
- Project Director decision for this audit: all P1–P24 are mandatory Source Completion scope before runtime provisioning.
- Canonical runtime evidence in source configuration points to Node `22.16.0`:
  - `.nvmrc` = `22.16.0`.
  - `package.json` engines = `>=22.16.0 <23`.
  - CI uses `22.16.0`.
- Root `main` branch is currently not protected and has no required status checks enforced by branch protection.

---

# 37. FORMAL FINDINGS — BATCH 001

## MNT-AUD-0001 — Obsolete Original-Database Recovery Assumption Is Embedded in Active Source Gates

- **Discovered:** 2026-09-06
- **Phase:** Cross-Cutting / W0-W2 / Database Operations
- **Subsystem:** Database safety, migration/bootstrap governance
- **Files/Areas:**
  - `README.md`
  - `docs/remediation/wp1/*`
  - `docs/remediation/wp3/*`
  - `docs/remediation/wp4/*`
  - `docs/remediation/wp5/*`
  - `docs/remediation/wp6/*`
  - `docs/remediation/wp7/*`
  - `docs/remediation/wp8/*`
  - `docs/remediation/wp10/*`
  - `scripts/db-remediation-gate.ts`
  - `scripts/lib/require-database-mutation-gate.ts`
  - database-mutating/import scripts using recovery tokens/gates
- **Category:** `ARCHITECTURE` / `CONFIG` / `DOCUMENTATION_DRIFT` / `MIGRATION`
- **Severity:** **P1 — HIGH**
- **Scope:** SOURCE
- **Status:** OPEN
- **Evidence:** Active source code requires `WP1_RECOVERY_GATE=CLOSED` plus `ALLOW_DATABASE_MUTATIONS=YES`; multiple active remediation documents assume an "Original Development Database" exists and must be recovered before any mutation.
- **Expected Behavior:** Project source should support the approved current lifecycle: Source Complete → provision a new clean PostgreSQL database → validate target → apply controlled migrations/bootstrap/seeds → runtime tests.
- **Actual State:** Safety model is semantically tied to recovery of an existing historical Development DB.
- **Root Cause:** Previous remediation program was designed around a presumed historical Development DB in Google Studio.
- **Impact:**
  - Incorrect operational model for the actual project.
  - Can block legitimate initial provisioning.
  - Can mislead future operators into searching for/restoring a DB that does not exist.
  - Can cause migration/bootstrap documentation and scripts to remain permanently "pending".
- **Required Action:** `REWRITE` + `DOCUMENT` + possible `RENAME`.
- **Recommended Remediation:**
  1. Preserve the two-step safety philosophy; do **not** weaken mutation protection.
  2. Replace recovery-specific semantics with a Greenfield Database Provisioning Gate, e.g. target identity + environment confirmation + explicit mutation authorization.
  3. Separate first-time provisioning from later migration/backfill safety.
  4. Archive or clearly mark recovery-era documents as historical where they are no longer authoritative.
  5. Rewrite root README/runtime handoff language.
  6. Update scripts, tests, env documentation and operational playbooks consistently.
- **Required Tests:**
  - mutation blocked without provisioning approval.
  - mutation blocked against production unless explicitly permitted by production deployment policy.
  - initial clean DB provisioning permitted only after target/environment validation.
  - repeated provisioning is idempotent or fails safely.
- **Dependencies Before Fix:** A4 data/migration architecture audit.
- **Regression Risk:** HIGH.
- **Fix Wave:** W0/W2.

---

## MNT-AUD-0002 — Canonical Node Runtime Version Is Inconsistent Across Active Documentation and Source Configuration

- **Discovered:** 2026-09-06
- **Phase:** Cross-Cutting / Repository Foundation
- **Subsystem:** Runtime/toolchain contract
- **Files:**
  - `README.md`
  - `docs/remediation/final-repository-organization/FINAL_HANDOFF_MANIFEST.md`
  - several phase implementation guides
  - `package.json`
  - `.nvmrc`
  - `.github/workflows/ci.yml`
  - `.devcontainer/devcontainer.json`
- **Category:** `CONFIG` / `DOCUMENTATION_DRIFT`
- **Severity:** **P2 — MEDIUM**
- **Scope:** SOURCE
- **Status:** OPEN
- **Expected Behavior:** One canonical supported Node version/range must be declared and referenced everywhere.
- **Actual State:** README/handoff/phase docs say Node 20+ while `package.json`, `.nvmrc`, and CI standardize on Node 22.16.x / Node 22.
- **Root Cause:** Documentation was not synchronized after runtime/toolchain upgrade.
- **Impact:** Clean installs may use unsupported Node 20 and fail or behave differently from CI.
- **Required Action:** `MODIFY` / `DOCUMENT`.
- **Recommended Remediation:** Treat `package.json` engines + `.nvmrc` + CI as current executable truth unless later architecture review determines otherwise; then synchronize all active docs to the chosen policy.
- **Fix Wave:** W0.

---

## MNT-AUD-0003 — `docs/README.md` Is Structurally Outdated Against the Current 24-Phase Repository

- **Discovered:** 2026-09-06
- **Phase:** Governance / Documentation
- **Subsystem:** Documentation navigation
- **File:** `docs/README.md`
- **Category:** `DOCUMENTATION_DRIFT`
- **Severity:** **P2 — MEDIUM**
- **Scope:** SOURCE
- **Status:** OPEN
- **Evidence:** The file describes phase progression primarily through Phase 09 and presents a simplified four-pillar structure, while current `docs/` includes active phase roots through Phase 24 plus additional operational/remediation/status/import domains.
- **Expected Behavior:** Documentation entrypoint must accurately route a reviewer/developer to the current authoritative 24-phase structure and distinguish active, operational, remediation, and legacy evidence.
- **Impact:** High risk of reviewers or future developers reading incomplete/outdated paths and treating old phase limits as current.
- **Required Action:** `REWRITE`.
- **Fix Wave:** W0/W7.

---

## MNT-AUD-0004 — Root README Repository Layout Contains a Nonexistent `packages/utils` Package

- **Discovered:** 2026-09-06
- **Phase:** Repository Foundation
- **Subsystem:** Repository navigation / handoff
- **File:** `README.md`
- **Category:** `DOCUMENTATION_DRIFT`
- **Severity:** **P3 — LOW**
- **Scope:** SOURCE
- **Status:** OPEN
- **Evidence:** Root README lists `packages/utils` among shared foundations; the current `packages/` directory contains application, config, core, domain, infrastructure, shared, types, and ui, with no utils root.
- **Expected Behavior:** Root layout must match the repository exactly.
- **Required Action:** Determine whether `packages/utils` was intentionally merged/removed. Then either remove the stale README reference or restore the package only if architecture requires it.
- **Fix Wave:** W0/W7.

---

## MNT-AUD-0005 — `main` Branch Has No Enforced Protection / Required CI Status Checks

- **Discovered:** 2026-09-06
- **Phase:** Cross-Cutting / Repository Governance
- **Subsystem:** Git/CI governance
- **Area:** GitHub branch configuration
- **Category:** `DEVOPS` / `SECURITY` / `QUALITY`
- **Severity:** **P1 — HIGH**
- **Scope:** SOURCE GOVERNANCE
- **Status:** OPEN
- **Evidence:** GitHub branch metadata reports `protected: false`; required status check enforcement is off.
- **Expected Behavior:** During remediation and before production handoff, protected main should prevent accidental direct/broken changes from bypassing source closure gates.
- **Impact:** A direct push can bypass PR review and required CI, undermining audit reproducibility.
- **Required Action:** Repository configuration change after audit workflow is established.
- **Recommended Remediation:** Require PR or equivalent controlled merge, required CI checks, and prevent force pushes/deletion on `main`; exact policy should not block the owner from emergency recovery.
- **Fix Wave:** W0/W6.

---

## MNT-AUD-0006 — Canonical `.env.example` Omits Environment Variables Required by Active Database Mutation Gate Code

- **Discovered:** 2026-09-06
- **Phase:** Cross-Cutting / Configuration
- **Subsystem:** Environment contract / database safety
- **Files:**
  - `.env.example`
  - `scripts/lib/require-database-mutation-gate.ts`
- **Category:** `CONFIG` / `DEVOPS`
- **Severity:** **P2 — MEDIUM**
- **Scope:** SOURCE
- **Status:** OPEN
- **Evidence:** Active gate code reads `WP1_RECOVERY_GATE` and `ALLOW_DATABASE_MUTATIONS`; the canonical env template does not document those variables.
- **Expected Behavior:** Every active runtime/operational environment variable must be represented by the canonical environment contract, or the code must derive it from a typed configuration system.
- **Impact:** Operators cannot reliably know how to satisfy or intentionally keep the safety gate closed.
- **Required Action:** This finding must be resolved together with MNT-AUD-0001, likely by replacing recovery-specific variables with the final provisioning/mutation safety contract and documenting them in `.env.example` / config validation.
- **Fix Wave:** W0/W2.

---

# 38. ARCHITECTURE / MANAGEMENT DECISIONS OPENED

## MNT-DEC-0001 — Promote P20–P24 Into Mandatory Source Completion Scope

- **Date:** 2026-09-06
- **Topic:** Roadmap execution scope
- **Current Repository State:** Roadmap v6.0 identifies 24 phases but historical source status only claims implementation through P19; P20–P24 were treated as future scope.
- **Project Director Decision:** The audit target is the entire platform, therefore P20–P24 must be audited and any missing implementation must be completed before Source Complete 100%.
- **Required Governance Action:** After discovery confirms exact scope and boundaries, publish a synchronized roadmap/status update (version to be decided) rather than silently editing historical status claims.
- **Status:** APPROVED FOR AUDIT SCOPE / DOCUMENT UPDATE PENDING.

## MNT-DEC-0002 — Replace Historical DB Recovery Lifecycle With Greenfield Provisioning Lifecycle

- **Date:** 2026-09-06
- **Topic:** Database lifecycle and mutation safety
- **Current Repository State:** Recovery-gate model assumes an existing Development DB.
- **Approved Direction:** No historical database exists. The future DB will be newly provisioned after Source Complete.
- **Non-Negotiable Constraint:** Database safety gates remain; only their semantics change from recovery to verified provisioning/mutation approval.
- **Status:** APPROVED DIRECTION / IMPLEMENTATION DESIGN PENDING A4.

---

# 39. BATCH 001 RECONCILIATION

## Findings Summary

- **Total formal findings:** 6
- **P0:** 0
- **P1:** 1
- **P2:** 4
- **P3:** 1
- **P4:** 0
- **Closed:** 0
- **Open:** 6

## Stage Status

- **A0 Repository Freeze:** COMPLETE for branch/commit baseline; recursive file-level inventory remains IN PROGRESS.
- **A1 Governance/Authority Audit:** IN PROGRESS; highest authority chain confirmed, historical roadmap versions correctly marked superseded.
- **A2 Enterprise Architecture Audit:** NOT STARTED.
- **A3 Repository Foundation:** PARTIALLY STARTED due to runtime/config findings.
- **A4 Data Architecture:** NOT STARTED.

## Audit Dashboard Update

**Audit Status:** ACTIVE  
**Frozen Commit:** `0931c5664cf274cb2b8f4cb250dd09ebf2e9a77f`  
**Phases Audited Deeply:** 0 / 24  
**Governance Baseline:** PARTIAL  
**Findings:** 6  
**Remediation Started:** NO  
**Source Completion:** NOT ASSESSED  

---

# 40. Change Log Update

| Version | Date | Change |
|---|---|---|
| 0.2 | 2026-09-06 | Batch 001 audit added: repository baseline, governance facts, six formal findings, two management decisions. |

---

# 41. LIVE AUDIT — BATCH 002 — A2/A3/A4 ENTRY + PHASES 05–10

**Audit Date:** 2026-09-06  
**Frozen Commit:** `0931c5664cf274cb2b8f4cb250dd09ebf2e9a77f`  
**Batch Status:** IN PROGRESS — PHASE AUDIT ACTIVE

This batch reconciles findings discovered after Batch 001 and records the transition from governance/foundation review into phase-by-phase source auditing.

## MNT-AUD-0007 — Mandatory BullMQ / Background-Worker Architecture Is Declared but Not Implemented in Active Source

- **Discovered:** 2026-09-06
- **Phase:** P1–P5 Enterprise Foundation / Cross-Cutting
- **Subsystem:** Background Jobs / Async Processing
- **Category:** `MISSING_IMPLEMENTATION` / `ARCHITECTURE` / `DEVOPS`
- **Severity:** **P1 — HIGH**
- **Scope:** SOURCE
- **Status:** OPEN
- **Evidence:** Authoritative architecture/roadmap declares background-job / BullMQ capability, while active package manifests and root dependencies do not include BullMQ and no production BullMQ implementation was found in the active source baseline.
- **Expected Behavior:** A declared mandatory enterprise background-job capability must have source-complete queue/worker contracts, production adapter, composition, retry/idempotency semantics, observability, and tests before Source Complete 100%.
- **Impact:** Domains that depend on durable asynchronous execution cannot be honestly source-closed.
- **Required Action:** Implement or formally supersede the BullMQ/background-worker architecture through an approved ADR. Do not leave the architecture contract ahead of implementation.
- **Fix Wave:** W1/W3/W6.

---

## MNT-AUD-0008 — Architecture Guard Coverage Excludes Operational `scripts/**`, Allowing Direct Infrastructure Coupling Outside Enforced Boundaries

- **Discovered:** 2026-09-06
- **Phase:** A2 Enterprise Architecture / Cross-Cutting
- **Subsystem:** Dependency-rule enforcement
- **Category:** `ARCHITECTURE` / `QUALITY` / `TEST`
- **Severity:** **P2 — MEDIUM**
- **Scope:** SOURCE
- **Status:** OPEN
- **Evidence:** Current architecture boundary enforcement is package/application focused while active operational scripts remain outside equivalent dependency controls; scripts directly participate in Prisma, remediation, import and closure operations.
- **Expected Behavior:** Every active production/operational source surface that can mutate or coordinate platform state must be covered by explicit architectural dependency rules or deliberately classified as infrastructure-only tooling.
- **Impact:** Operational code can bypass the same inward-dependency / ownership rules enforced on application packages.
- **Required Action:** Extend guard coverage or define a separately governed operational-tooling boundary with explicit permitted dependencies and source checks.
- **Fix Wave:** W1/W6.

---

## MNT-AUD-0009 — Translation Quality Source Gate Uses Brittle Literal/Text Matching and Produces a False Enterprise-CI Failure Against the Current Safer Mapper

- **Discovered:** 2026-09-06
- **Phase:** Cross-Cutting Localization / CI
- **Subsystem:** Translation source-closure verifier
- **Files:**
  - `scripts/verify-translation-quality-source.ts`
  - current public-course localization/mapping source
- **Category:** `TEST` / `QUALITY` / `DOCUMENTATION_DRIFT`
- **Severity:** **P1 — HIGH**
- **Scope:** SOURCE / CI
- **Status:** OPEN
- **Evidence:** Enterprise CI translation closure is red because the verifier expects obsolete source text/literal structure rather than validating current semantic behavior; the current mapper has already moved to a safer implementation shape.
- **Expected Behavior:** Source-closure gates must validate behavior/contracts or stable AST/semantic invariants, not incidental source formatting.
- **Impact:** Enterprise CI cannot be treated as reliable source-closure evidence while a stale verifier can fail correct code after refactoring.
- **Required Action:** Rewrite the verifier around stable semantics and add regression coverage that allows safe refactors without weakening localization requirements.
- **Fix Wave:** W6/W7.

---

## MNT-AUD-0010 — Imported-Courses Static Security Closure Gate References a Stale/Wrong Source File and Produces a False CI Failure

- **Discovered:** 2026-09-06
- **Phase:** P13 Learning / Cross-Cutting Import Security CI
- **Subsystem:** Imported Courses source closure
- **Files:**
  - `.github/workflows/imported-courses-runtime-closure.yml`
  - `scripts/wp-ic-10-runtime-closure.mjs`
  - `scripts/wp-ic-10-runtime-lib.mjs`
  - `packages/application/src/courses/use-cases/CourseProviderContinuationUseCases.ts`
  - `packages/application/src/courses/use-cases/CourseImportOperationsUseCases.ts`
- **Category:** `TEST` / `QUALITY` / `SECURITY`
- **Severity:** **P1 — HIGH**
- **Scope:** SOURCE / CI
- **Status:** OPEN
- **Evidence:** On the frozen commit, Prisma validate/generate, typecheck, lint, build, unit tests, and pure-node imported-course closure tests pass. The workflow fails specifically at `Imported-course static security invariants`. The verifier requires `analyzeBatch(batchId, { force: true })` inside `CourseProviderContinuationUseCases.ts`, but the canonical force-reanalysis implementation currently resides in `CourseImportOperationsUseCases.ts` and delegates to identity-diff with `{ force: true }`.
- **Expected Behavior:** The security closure gate must follow the canonical owner of the behavior rather than hard-code an obsolete file location.
- **Impact:** A false-red security gate prevents reliable source closure and obscures real security failures.
- **Required Action:** Rebase the invariant on the canonical operation/contract (prefer semantic/AST or executable contract testing), retain the force-reanalysis security requirement, and add a regression test for refactors.
- **Fix Wave:** W6.

---

## MNT-AUD-0011 — Phase 05 Enterprise Asset Platform Has No Production-Capable Storage, Malware-Scanning, or Sanitization Adapters

- **Discovered:** 2026-09-06
- **Phase:** P05 Enterprise Foundation — Enterprise Asset Platform
- **Subsystem:** Secure Asset Ingestion / Storage
- **Category:** `MISSING_IMPLEMENTATION` / `ASSET` / `SECURITY` / `INFRASTRUCTURE`
- **Severity:** **P1 — HIGH**
- **Scope:** SOURCE
- **Status:** OPEN
- **Evidence:** The EAP domain/application contracts are implemented, but active infrastructure provides `LocalAssetStorageGateway` for development and Noop malware/sanitization gateways with unavailable capability status. `RuntimeDependencyPolicy` returns an unavailable storage capability for production/staging and explicitly fails closed if production-capable storage/scanner/sanitizer providers are absent.
- **Expected Behavior:** Because P05 EAP is the mandatory security boundary for files/media across later domains, production-capable storage, malware scanning, sanitization/metadata stripping, secure delivery and configuration adapters must already exist in source. Runtime may inject credentials/configuration only.
- **Impact:** P11 Universities, P12 Scholarships, P15 Student Platform, P16 CMS, P18 Student Tools and any upload/media path cannot be Source Complete 100%.
- **Required Action:** Implement production-capable provider adapters and composition now; preserve fail-closed runtime policy and add provider-contract/security tests.
- **Fix Wave:** W1/W3.

---

## MNT-AUD-0012 — Phase 06 Import Foundation Lacks a Durable Production Raw-Snapshot Store Adapter and Defers Its Implementation to Runtime Closure

- **Discovered:** 2026-09-06
- **Phase:** P06 Universal Import Infrastructure
- **Subsystem:** Raw provenance snapshot storage
- **Category:** `MISSING_IMPLEMENTATION` / `IMPORT` / `ASSET` / `DEVOPS`
- **Severity:** **P1 — HIGH**
- **Scope:** SOURCE
- **Status:** OPEN
- **Evidence:** `IImportRawSnapshotStore` exists, but active implementations are in-memory or `LocalImportRawSnapshotStore` classified `DEVELOPMENT_ONLY`. In production/staging `RuntimeDependencyPolicy` returns an unavailable `durableImportRawSnapshotStore` and comments that a durable provider adapter will be injected during runtime closure.
- **Expected Behavior:** Under the approved greenfield lifecycle, runtime provisioning may inject provider configuration/credentials but may not implement a missing adapter. Durable immutable provenance storage must be source-complete before handoff.
- **Impact:** Production import provenance, replay, forensic traceability, and raw-artifact retention remain nonfunctional.
- **Required Action:** Implement a durable production adapter (preferably aligned with the EAP/object-storage abstraction), fail closed on missing configuration, and test content hashes, immutability, retention and retrieval semantics.
- **Fix Wave:** W2/W3.

---

## MNT-AUD-0013 — Phase 07 Canonical Reference Lifecycle, Versioning, Supersession, and Alias Contract Is Not Implemented by the Current Runtime Data Model

- **Discovered:** 2026-09-06
- **Phase:** P07 Global Reference Data
- **Subsystem:** Canonical Reference Governance
- **Category:** `DOMAIN_MODEL` / `DATA_MODEL` / `RELATIONSHIP` / `DOCUMENTATION_DRIFT`
- **Severity:** **P1 — HIGH**
- **Scope:** SOURCE
- **Status:** OPEN
- **Evidence:** P07 authoritative domain/architecture documents define explicit lifecycle state, aliases, supersession and version/effective-history semantics. Current `ReferenceDataContracts.ts` exposes `isActive` plus opaque `metadata`; the Prisma repository performs direct upserts and resolves aliases/provider mappings from metadata JSON. No active `ReferenceCountryVersion` / `ReferenceCurrencyVersion` / `ReferenceLanguageVersion` / `ReferenceCityVersion` source model was found.
- **Expected Behavior:** Canonical reference records must preserve governed lifecycle and immutable history rather than collapse lifecycle to a boolean and hide identity mappings in opaque metadata.
- **Impact:** All downstream domains consume P07 identity. Missing supersession/version history makes canonical changes, historical resolution, merge/deprecation and audit-safe imports structurally incomplete.
- **Required Action:** Reconcile the active P07 model with the approved contract: typed lifecycle state, supersession/merge semantics, explicit alias/provider mapping ownership, version/effective history, migration strategy, API/Admin behavior and tests.
- **Fix Wave:** W2/W4 (Reference first).

---

# 42. PHASE AUDIT STATUS — BATCH 002 CHECKPOINT

| Phase | Current Audit Status | Current Conclusion |
|---|---|---|
| P01–P04 Enterprise Foundation Architecture | IN_AUDIT | Core architecture/docs present; package dependency direction preliminarily consistent; cross-cutting findings 0007/0008 remain. |
| P05 Enterprise Asset Platform | PARTIAL | Domain/application/Prisma/API slices exist; production security/storage providers missing — Finding 0011. |
| P06 Universal Import Infrastructure | PARTIAL | Generic import contracts/parsers/operations substantial; durable production raw snapshot adapter missing — Finding 0012. |
| P07 Global Reference Data | PARTIAL | Domain/app/Prisma/API/Admin present, but canonical lifecycle/versioning/supersession contract diverges from runtime model — Finding 0013. |
| P08 Academic Taxonomy | PASS_WITH_FINDINGS | Own aliases/mappings/DAG validation and serializable graph mutation found; inherits unresolved P06/P07 foundation dependencies. |
| P09 International Tests | PASS_WITH_FINDINGS | Domain/repository/Admin/Public and canonical reference relationships found; inherits unresolved P07 lifecycle foundation. |
| P10 Majors & Disciplines | IN_AUDIT | Canonical ownership/source-freeze contracts and Prisma repository confirmed; documentation is split across two Phase-10 roots and requires authority reconciliation before final status. |
| P11–P24 | NOT_YET_DEEPLY_AUDITED | Mandatory audit scope remains. |

## Batch 002 Running Finding Totals

- **Total formal findings:** 13
- **P0:** 0
- **P1:** 8
- **P2:** 4
- **P3:** 1
- **P4:** 0
- **Closed:** 0
- **Open:** 13

## Current Source Completion Decision

**SOURCE_NOT_COMPLETE**

Blocking source reasons already proven include missing P05 production asset-security providers, missing P06 durable raw-snapshot adapter, missing P07 canonical lifecycle/versioning implementation, missing declared background-worker architecture, and unreliable source-closure CI gates.

---

# 43. Change Log Update

| Version | Date | Change |
|---|---|---|
| 0.3 | 2026-09-06 | Reconciled findings 0007–0013; entered phase-by-phase audit through P10; recorded first phase-source blockers for P05/P06/P07 and CI closure defects. |

---

# 44. LIVE AUDIT — BATCH 003 — PHASES 13–23 FINDINGS RECONCILIATION

**Audit Date:** 2026-09-06  
**Frozen Commit:** `0931c5664cf274cb2b8f4cb250dd09ebf2e9a77f`  
**Batch Status:** IN PROGRESS — PHASE AUDIT ADVANCED THROUGH P23

This batch records every formal finding proven while continuing the phase-by-phase audit beyond the Batch 002 checkpoint. These findings are part of the same mandatory Source Completion register and supersede any chat-only interim notes.

## MNT-AUD-0014 — Phase 13 Public Course Contract Drifts Between Canonical Domain DTO and Web Client

- **Discovered:** 2026-09-06
- **Phase:** P13 Learning Platform
- **Subsystem:** Public Course API contract / Web composition
- **Files:**
  - `packages/domain/src/courses/entities/PublicCourseDto.ts`
  - `apps/web/src/api/client.ts`
- **Category:** `API` / `DOMAIN_MODEL` / `PUBLIC_UI` / `DOCUMENTATION_DRIFT`
- **Severity:** **P2 — MEDIUM**
- **Scope:** SOURCE
- **Status:** OPEN
- **Evidence:** The canonical domain `PublicCourseDto` requires `ownerId` as part of the Phase 13 public identity contract, while the Web API client declares the same field as optional (`ownerId?: string`).
- **Expected Behavior:** Consumer-facing TypeScript contracts must remain structurally aligned with the canonical API/domain contract; required canonical ownership/identity fields must not become optional in downstream clients.
- **Impact:** Type-level drift allows downstream UI code to accept payload shapes that violate the Phase 13 public contract, weakening compile-time detection of API regressions.
- **Required Action:** Establish one generated/shared public API contract source or synchronize the Web client type with the canonical DTO; add contract tests/schema generation so this drift cannot recur.
- **Fix Wave:** W3/W5/W6.

---

## MNT-AUD-0015 — Phase 14 Certificate Rendering Engine Is Missing; Source Only Supports Attaching Pre-Generated Artifacts

- **Discovered:** 2026-09-06
- **Phase:** P14 Enterprise Certificates
- **Subsystem:** Certificate rendering / PDF / Preview / QR artifact production
- **Category:** `MISSING_IMPLEMENTATION` / `CERTIFICATE` / `ASSET` / `WORKFLOW`
- **Severity:** **P1 — HIGH**
- **Scope:** SOURCE
- **Status:** OPEN
- **Evidence:** Phase 14 contracts define a rendering boundary such as `IPdfRenderingService.renderCertificateToStorage(...)`, but no production implementation of the certificate renderer was found. Current source can attach certificate PDF/preview/QR AssetIds after artifacts exist, but does not itself generate the governed certificate document artifact.
- **Expected Behavior:** The certificate engine must be Source Complete before DB/runtime provisioning. The final visual template may remain a versioned injectable asset, but the rendering pipeline itself must exist in source and be capable of consuming a template/version plus certificate data and producing governed artifacts.
- **Impact:** The critical chain `Completion → Certificate Eligibility → Certificate Issue → Rendered Certificate → QR → Public Verification` is not end-to-end source-complete. Runtime configuration alone cannot make certificate documents appear.
- **Required Action:** Implement a provider-neutral certificate rendering service, template/version contract, PDF generation, preview/QR artifact generation, EAP storage integration, deterministic rendering/version metadata, failure handling, idempotency, and tests. Do not hard-code the future visual design into business logic.
- **Fix Wave:** W3/W4/W5.

---

## MNT-AUD-0016 — Phase 15 Student Workspace Auto-Provisioning Consumer Exists but Is Not Wired to a Real Identity Producer

- **Discovered:** 2026-09-06
- **Phase:** P15 Enterprise Student Platform
- **Subsystem:** Identity → Student Workspace integration
- **Files:**
  - `packages/application/src/students/use-cases/StudentWorkspaceUseCases.ts`
  - `packages/infrastructure/src/students/PrismaStudentWorkspaceRepository.ts`
  - Identity domain event sources
- **Category:** `EVENT` / `WORKFLOW` / `RELATIONSHIP` / `MISSING_IMPLEMENTATION`
- **Severity:** **P1 — HIGH**
- **Scope:** SOURCE / CROSS-PHASE
- **Status:** OPEN
- **Evidence:** `StudentWorkspaceUseCases.consumeIntegrationEvent(...)` and repository handling for `StudentIdentityCreated` exist, including idempotent workspace initialization logic, but no production caller/wiring was found for the consumer. `StudentIdentityCreated` appears in tests and Phase 15 documentation, while the active Identity domain currently exposes `IdentityCreatedEvent(identityId, identityType)` rather than a demonstrated integration-event bridge producing the Phase 15 event contract.
- **Expected Behavior:** Creating/activating a student identity must deterministically emit or transform into the canonical integration event consumed by P15, through an outbox/event delivery path that is present in source before runtime handoff.
- **Impact:** A valid student can exist without a provisioned workspace and remain stuck behind `STUDENT_WORKSPACE_PROVISIONING_PENDING`; the Student Platform is not end-to-end integrated with Identity.
- **Required Action:** Implement the canonical Identity → StudentWorkspace integration event bridge, event mapping/versioning, outbox publication, consumer registration, idempotency, retry/dead-letter behavior, audit/observability, and cross-phase tests.
- **Fix Wave:** W1/W3/W4.

---

## MNT-AUD-0017 — Phase 16 Scheduled CMS Publishing Has Processing Logic but No Automatic Production Scheduler/Worker

- **Discovered:** 2026-09-06
- **Phase:** P16 Enterprise CMS
- **Subsystem:** Scheduled publication
- **Files:**
  - `packages/application/src/cms/use-cases/CmsUseCases.ts`
  - `packages/infrastructure/src/cms/PrismaCmsRepository.ts`
  - `apps/api/src/presentation/api/router/CmsAdminRouter.ts`
- **Category:** `MISSING_IMPLEMENTATION` / `WORKFLOW` / `EVENT` / `CMS`
- **Severity:** **P1 — HIGH**
- **Scope:** SOURCE
- **Status:** OPEN
- **Evidence:** CMS supports authoring a future schedule and implements `processDueSchedules(...)` with repository-side leasing/processing. However, the only discovered invocation path is the manual admin endpoint `/operations/process-due-schedules`; no production scheduler/worker automatically invokes the due-schedule processor.
- **Expected Behavior:** Once content is placed in `SCHEDULED`, the platform must source-contain the runner that automatically executes due publications with retry/idempotency/concurrency controls. Runtime may start/configure that runner, not implement it.
- **Impact:** Scheduled content will not publish automatically in production without manual operator action, making a declared CMS capability functionally incomplete.
- **Required Action:** Wire `processDueSchedules` into the governed background-job infrastructure, add cadence/lease/retry/dead-letter/observability semantics, and test concurrent execution and exactly-once publication effects.
- **Fix Wave:** W3/W4/W6. Root dependency: MNT-AUD-0007.

---

## MNT-AUD-0018 — Phase 19 Payment, FX, and Bank-Transfer Adapters Are Non-Functional Runtime-Pending Shells

- **Discovered:** 2026-09-06
- **Phase:** P19 Enterprise Finance & Payments
- **Subsystem:** External financial provider transports
- **File:** `packages/infrastructure/src/finance-platform/ProviderNeutralFinanceGateways.ts`
- **Category:** `MISSING_IMPLEMENTATION` / `FINANCE` / `INTEGRATION` / `SECURITY`
- **Severity:** **P1 — HIGH**
- **Scope:** SOURCE
- **Status:** OPEN
- **Evidence:** `EnvironmentPaymentGatewayAdapter`, `EnvironmentFxRateProviderAdapter`, and `EnvironmentBankTransferGatewayAdapter` expose provider-neutral contracts and secret references, but even when configured they throw that the provider `runtime transport is pending`. `authorize`, `capture`, `refund`, FX `fetchRate`, bank `submit`, `getStatus`, and `reverse` therefore have no executable provider transport.
- **Expected Behavior:** Source Complete requires at least one production-capable implementation strategy for each declared mandatory external finance capability, with configuration/credentials injected at runtime. Google Studio may provide secrets/endpoints but must not have to implement HTTP/provider transports.
- **Impact:** Payments, refunds, FX conversion, and bank-transfer execution cannot function after database provisioning by configuration alone. Phase 19 is structurally partial.
- **Required Action:** Implement provider-neutral HTTP/SDK transport adapters with strict signing/webhook verification, idempotency, timeout/retry policy, reconciliation, failure mapping, redacted observability and provider contract tests. Keep secrets environment-referenced only.
- **Fix Wave:** W1/W4/W6.

---

## MNT-AUD-0019 — Active Phase Documents Use `Production Ready` Terminology Before Runtime Verification Exists

- **Discovered:** 2026-09-06
- **Phase:** Governance / Multiple P05–P22 documents
- **Subsystem:** Lifecycle terminology / completion truth
- **Category:** `DOCUMENTATION_DRIFT` / `ROADMAP` / `GOVERNANCE`
- **Severity:** **P2 — MEDIUM**
- **Scope:** SOURCE DOCUMENTATION
- **Status:** OPEN
- **Evidence:** Multiple active phase architecture/domain documents use labels such as `Baselined / Production Ready` or `Approved ... / Production Ready` even though no production database/runtime verification has occurred. Examples include active documents in P07, P08, P10, P15, P16, P17, P20 and P22.
- **Expected Behavior:** Repository terminology must follow the approved completion lifecycle: `SOURCE_COMPLETE` may be declared before database provisioning only when source gates are met; `RUNTIME VERIFIED` and `PRODUCTION READY` require actual runtime/DB/provider verification.
- **Impact:** Governance documents overstate readiness, create contradictory authority, and can cause deployment/management decisions based on false completion claims.
- **Required Action:** Normalize active phase status wording across the repository, reserve `Production Ready` for post-runtime certification, and mark older status claims as historical where appropriate.
- **Fix Wave:** W0/W7.

---

# 45. PHASE AUDIT STATUS — BATCH 003 CHECKPOINT

| Phase | Current Audit Status | Current Conclusion |
|---|---|---|
| P01–P04 Enterprise Foundation Architecture | IN_AUDIT | Core architecture and package dependency direction remain generally consistent; async/guard/governance findings remain open. |
| P05 Enterprise Asset Platform | PARTIAL | Production storage/malware/sanitization adapters missing — MNT-AUD-0011. |
| P06 Universal Import Infrastructure | PARTIAL | Durable production raw-snapshot adapter missing — MNT-AUD-0012. |
| P07 Global Reference Data | PARTIAL | Canonical lifecycle/versioning/supersession implementation incomplete — MNT-AUD-0013. |
| P08 Academic Taxonomy | PASS_WITH_FINDINGS | DAG/alias/mapping implementation materially present; inherits P06/P07 dependencies and governance terminology issue. |
| P09 International Tests | PASS_WITH_FINDINGS | Domain/Prisma/Admin/Public/canonical country linkage materially present; inherits P07 dependency. |
| P10 Majors & Disciplines | PASS_WITH_FINDINGS | Canonical source and Prisma implementation present; duplicate/split Phase-10 documentation roots still require reconciliation. |
| P11 Universities & Institutions | PASS_WITH_FINDINGS | Canonical Major/DegreeLevel links and public filtering found; inherits P05/P06/P07 blockers. |
| P12 Scholarships | PASS_WITH_FINDINGS | Versioning, sponsor context, application cycles, canonical targets and publication readiness materially present; inherits P05/P06/P07 blockers. |
| P13 Learning | PASS_WITH_FINDINGS | Learning/curriculum/EAP checks materially present; public contract drift recorded as MNT-AUD-0014; imported-course CI verifier issue MNT-AUD-0010 remains. |
| P14 Certificates | PARTIAL | Verification, QR trust/lifecycle, revoke/reissue/renew materially present; renderer missing — MNT-AUD-0015. |
| P15 Student Platform | PARTIAL | Workspace/persistence/privacy/state logic present; Identity→Workspace auto-provisioning wiring missing — MNT-AUD-0016. |
| P16 CMS | PARTIAL | Editorial workflow, revisions, navigation, SEO and scheduling logic present; automatic scheduler/worker missing — MNT-AUD-0017. |
| P17 AI Platform | PASS_WITH_FINDINGS | Real provider-neutral OpenAI-compatible/Anthropic/Google adapters and governance contracts found; runtime provider calls remain deferred validation. |
| P18 Student Tools | PASS_WITH_FINDINGS | Four declared executable tools are source-wired; remaining registry entries are explicitly non-executable roadmap records pending final scope reconciliation. |
| P19 Finance & Payments | PARTIAL | Domain/repository/registries exist, but real payment/FX/bank transports are missing — MNT-AUD-0018. |
| P20 Enterprise Services | PASS_WITH_FINDINGS | Real Prisma repository and Admin/Public composition found; active docs included in readiness terminology cleanup — MNT-AUD-0019. |
| P21 Career & Alumni | PASS_WITH_FINDINGS | Real Prisma repository and Admin/Public source wiring found; deeper security/admin/public sweep still pending. |
| P22 Product Experience | PASS_WITH_FINDINGS | Correctly governance/UX-owned rather than backend-owned; implementation delegated to owning phases; terminology cleanup applies. |
| P23 Administration Portal | IN_AUDIT | Broad control-plane routes confirmed; full identity/admin/RBAC/audit/domain-coverage matrix audit is still in progress. |
| P24 Public Platform | NOT_YET_DEEPLY_AUDITED | Mandatory next phase before phase-pass completion. |

## Batch 003 Running Finding Totals

- **Total formal findings:** 19
- **P0:** 0
- **P1:** 12
- **P2:** 6
- **P3:** 1
- **P4:** 0
- **Closed:** 0
- **Open:** 19

## Current Source Completion Decision

**SOURCE_NOT_COMPLETE**

Current proven source blockers include: background-job infrastructure, P05 production asset-security adapters, P06 durable raw-snapshot storage, P07 lifecycle/versioning, P14 certificate rendering, P15 identity/workspace event wiring, P16 automatic scheduled publishing, and P19 production financial transports. CI closure reliability defects also remain open.

---

# 46. Change Log Update

| Version | Date | Change |
|---|---|---|
| 0.4 | 2026-09-06 | Added formal findings MNT-AUD-0014 through MNT-AUD-0019; reconciled phase audit status through P23; updated authoritative running totals to 19 findings. |

---

# 47. LIVE AUDIT — BATCH 004 — PHASE 23/24 CONTROL-PLANE & PUBLIC-COMPOSITION FINDINGS

**Audit Date:** 2026-09-06  
**Frozen Commit:** `0931c5664cf274cb2b8f4cb250dd09ebf2e9a77f`  
**Batch Status:** IN PROGRESS — P23/P24 DEEP AUDIT

## MNT-AUD-0020 — Phase 23 Lacks IAM/RBAC Administration Workspaces Required by Its Own Governance Contract

- **Discovered:** 2026-09-06
- **Phase:** P23 Enterprise Administration Portal / P05 IAM & Authorization
- **Subsystem:** Admin users / roles / permissions / delegated access / break-glass governance
- **Files / Evidence:**
  - `docs/phases/phase-23-enterprise-administration-portal/phase-23-01-enterprise-administration-portal-architecture-specification.md`
  - `apps/admin/src/App.tsx`
  - `apps/admin/src/components/AdminNavigation.tsx`
  - `apps/admin/src/pages/SettingsAdminPage.tsx`
  - `packages/infrastructure/src/authorization/AdminBootstrapVerifier.ts`
- **Category:** `ADMIN` / `AUTH` / `RBAC` / `SECURITY` / `MISSING_IMPLEMENTATION`
- **Severity:** **P1 — HIGH**
- **Scope:** SOURCE / CROSS-PHASE
- **Status:** OPEN
- **Evidence:** P23 explicitly defines System Owner, Backup Administrator/break-glass access, delegated administrative roles, least-privilege RBAC/ABAC and a dashboard shortcut to RBAC settings. The authorization backend has persisted role/assignment/identity structures and an `admin:authorization:manage` bootstrap verifier, but the canonical Admin application exposes no user/identity/role/permission administration routes or pages. `SettingsAdminPage` explicitly states that users, roles and permissions belong to separate IAM/Authorization boundaries but provides no navigation to an implemented IAM workspace.
- **Expected Behavior:** The single canonical Phase 23 Admin portal must provide governed control surfaces for administrator identities, roles, permissions, assignments, delegated scopes, emergency/break-glass access state and access-policy review, while dispatching mutations to P05 IAM/Authorization APIs rather than owning IAM data.
- **Impact:** Administrators cannot operationally manage authorization policy from the declared single control plane. Role changes, delegated access and emergency-access governance are source-incomplete even though backend primitives exist.
- **Required Action:** Implement P05-owned IAM/Authorization Admin API commands/read models where missing; add Phase 23 Admin workspaces for identities, roles, permission matrices, assignments, access review and break-glass lifecycle; enforce maker-checker/high-risk controls, audit every mutation, and add RBAC/E2E authorization tests.
- **Fix Wave:** W1/W5/W6.

---

## MNT-AUD-0021 — Phase 23 Mandates a Central Immutable Audit Activity View but Canonical Admin Has No Audit Center

- **Discovered:** 2026-09-06
- **Phase:** P23 Administration Portal / P05 Audit Foundation
- **Subsystem:** Operational audit visibility
- **Files / Evidence:**
  - `docs/phases/phase-23-enterprise-administration-portal/phase-23-01-enterprise-administration-portal-architecture-specification.md`
  - `apps/admin/src/App.tsx`
  - `apps/admin/src/components/AdminNavigation.tsx`
  - `apps/admin/src/pages/AdminDashboardPage.tsx`
- **Category:** `ADMIN` / `AUDIT` / `SECURITY` / `OBSERVABILITY` / `MISSING_IMPLEMENTATION`
- **Severity:** **P1 — HIGH**
- **Scope:** SOURCE / CROSS-PHASE
- **Status:** OPEN
- **Evidence:** P23 requires a “Safe Operational & Audit Activity Log” exposing read-only, non-deletable admin action trails. The canonical Admin route/navigation set contains dashboard, review queue, imports, domain workspaces, health/readiness and settings, but no central Audit route/page was found. The Dashboard aggregates operational counts and health, not an immutable cross-domain audit event stream.
- **Expected Behavior:** Phase 23 must compose a central read-only audit workspace backed by P05/domain audit records, with actor/action/domain/entity/time/correlation filtering, drill-down, export policy and no destructive delete operation.
- **Impact:** Security investigations, privilege review, operational traceability and maker-checker oversight cannot be performed from the declared unified admin control plane.
- **Required Action:** Define the canonical audit read-model/API, normalize cross-domain audit projection fields, implement Admin Audit Center and filters, protect audit visibility by explicit permission, and register runtime retention/integrity validation.
- **Fix Wave:** W1/W5/W6.

---

## MNT-AUD-0022 — Phase 24 SEO Metadata Exists but Is Client-Injected; Crawlable SSR/Prerender Delivery Is Not Implemented

- **Discovered:** 2026-09-06
- **Corrected:** 2026-09-06 after deeper source inspection
- **Phase:** P24 Enterprise Public Platform
- **Subsystem:** SEO / server rendering / metadata / discoverability
- **Files / Evidence:**
  - `docs/phases/phase-24-enterprise-public-platform/phase-24-01-enterprise-public-platform-architecture-specification.md`
  - `apps/web/package.json`
  - `apps/web/src/components/Seo.tsx`
  - `scripts/generate-localized-public-sitemap.ts`
  - `tests/translation/localized-sitemap.spec.ts`
  - `apps/web/index.html`
- **Category:** `PUBLIC_UI` / `SEO` / `MISSING_IMPLEMENTATION` / `ARCHITECTURE`
- **Severity:** **P1 — HIGH**
- **Scope:** SOURCE
- **Status:** OPEN
- **Corrected Evidence:** The frozen source DOES contain route-aware SEO infrastructure: `Seo.tsx` creates canonical and locale-alternate/hreflang links, and `generate-localized-public-sitemap.ts` emits localized sitemap entries with `ar`, `en` and `x-default`; sitemap/locale tests also exist. The earlier statement that canonical/hreflang/sitemap were absent was therefore too broad and is superseded by this corrected finding. The remaining source defect is rendering architecture: `Seo.tsx` mutates `document.head` in the browser, while the web app remains a client Vite SPA using browser routing; no SSR/SSG/prerender entry was found that emits route-specific metadata/content in the initial HTML response. Structured-data/JSON-LD coverage also remains unproven in the inspected public source.
- **Expected Behavior:** Every canonical public entity/detail route must deliver crawlable route-specific title/description/canonical/hreflang/OpenGraph and applicable structured data in the initial rendered document or deterministic prerendered artifact. Localized sitemap/robots/indexability policy must be generated from the same canonical route/read-model contract.
- **Impact:** The project has useful client-side SEO metadata and localized sitemap infrastructure, but crawlers/social agents that do not execute the SPA reliably can still receive generic initial HTML metadata/content. P24's declared SEO rendering ownership therefore remains only partially source-closed.
- **Required Action:** Preserve the existing `Seo.tsx`/localized sitemap contracts, choose and implement SSR/SSG/prerender delivery for canonical public routes, add route-level JSON-LD where applicable, ensure canonical/hreflang parity between initial HTML and client navigation, add robots/indexability governance, and test raw HTML responses/prerender artifacts rather than only browser-side DOM mutation.
- **Fix Wave:** W3/W5/W6.

---

## MNT-AUD-0023 — Phase 24 Visual-Identity Architecture Document Still Specifies the Superseded Emerald-Green Brand

- **Discovered:** 2026-09-06
- **Phase:** P24 Enterprise Public Platform
- **Subsystem:** Architecture documentation / visual identity
- **Files / Evidence:**
  - `docs/phases/phase-24-enterprise-public-platform/phase-24-03-enterprise-public-platform-public-pages-user-experience.md`
  - `apps/web/src/features/public-template/template.css`
- **Category:** `DOCUMENTATION_DRIFT` / `PUBLIC_UI` / `NAMING`
- **Severity:** **P2 — MEDIUM**
- **Scope:** SOURCE DOCUMENTATION
- **Status:** OPEN
- **Evidence:** P24 Part C still mandates “Emerald Green” as the primary public brand anchor. The current implemented public semantic tokens use the approved MANARATAK identity: primary `#142B5F`, secondary `#0E7C86`, digital accent `#21A7B4`, gold `#D6A43B`, highlight `#F2CD78`, etc. The active document therefore contradicts current source and approved brand governance.
- **Expected Behavior:** P23/P24 architecture documents must describe the current approved visual identity and reference shared semantic tokens rather than obsolete color names.
- **Impact:** Future UI work can regress to the retired palette and architecture reviewers can approve changes against the wrong visual contract.
- **Required Action:** Rewrite the P24 visual-identity section around the current semantic token system; cross-reference the canonical brand/design-token authority; review P23/P22 visual wording for the same drift and mark superseded palette guidance historical.
- **Fix Wave:** W0/W5/W7.

---

## MNT-AUD-0024 — Phase 24 Live Projection Injects Synthetic/Unknown Values into User-Facing Facts and Filters

- **Discovered:** 2026-09-06
- **Phase:** P24 Public Platform with P10/P11/P12/P13 owner domains
- **Subsystem:** Public DTO adaptation / data integrity / trust
- **Files / Evidence:**
  - `apps/web/src/features/public-template/publicLiveDataSource.ts`
  - `apps/web/src/features/public-template/publicScholarshipDataSource.ts`
  - `apps/web/src/features/public-template/components/UniversitiesList.tsx`
  - `apps/web/src/features/public-template/types.ts`
- **Category:** `PUBLIC_UI` / `BUSINESS_LOGIC` / `QUALITY` / `RELATIONSHIP`
- **Severity:** **P1 — HIGH**
- **Scope:** SOURCE / CROSS-PHASE
- **Status:** OPEN
- **Evidence:** Live owner DTOs are adapted into presentation models by injecting values that are not owner facts. Examples include University `scholarshipCount: 0`, `acceptanceRate: ''` and blank image values; the University list then renders `0 منحة معتمدة` and an empty acceptance-rate label. Major mapping forces `futureDemand: 'متوسط'` and `averageScholarships: 0`. Scholarship mapping forces `withoutIelts: false`, while the public navigation exposes an `onlyWithoutIelts` filter, making the filter semantically incorrect when the owner DTO does not prove that field.
- **Expected Behavior:** P24 must never invent business facts. Missing owner data must be represented explicitly as unavailable/unknown or be obtained through a governed cross-domain read model. Derived facts must be deterministic and traceable to canonical source fields.
- **Impact:** Public users can receive misleading facts and incorrect filter results, directly violating P24 Trust/Accuracy principles.
- **Required Action:** Audit every public mapper field; classify each as owner-derived, deterministic-derived, presentation-only, or unsupported. Remove synthetic business defaults, introduce nullable/unknown UI states, add required owner read-model fields/relationship aggregations, and add contract tests rejecting fabricated live values.
- **Fix Wave:** W3/W4/W5/W6.

---

## MNT-AUD-0025 — Phase 24 Public Catalogs and Global Search Silently Load Only the First Fixed API Page

- **Discovered:** 2026-09-06
- **Phase:** P24 Public Platform
- **Subsystem:** Catalog pagination / search completeness / discovery
- **Files / Evidence:**
  - `apps/web/src/features/public-template/publicLiveDataSource.ts`
  - `apps/web/src/features/public-template/publicScholarshipDataSource.ts`
  - `apps/web/src/features/public-template/PublicTemplateApp.tsx`
- **Category:** `PUBLIC_UI` / `SEARCH` / `PERFORMANCE` / `MISSING_IMPLEMENTATION`
- **Severity:** **P1 — HIGH**
- **Scope:** SOURCE / CROSS-PHASE
- **Status:** OPEN
- **Evidence:** Live public loaders request only fixed first pages, e.g. Scholarships `page:1,pageSize:50`, Universities `50`, Majors `50`, International Tests `50`, Courses `50`, Countries `100`. The loader returns only `result.data` and discards total/totalPages. Public search/filtering operates over the resulting client snapshot; no public global-search API invocation or continuation/pagination loop was found. Direct detail routes can fetch a missed item by slug, but catalog/search discovery cannot surface records beyond the first loaded page.
- **Expected Behavior:** Public catalogs must support complete server-driven pagination/cursoring and search/filter queries across all published records. Global search must query authoritative owner/search infrastructure rather than only an arbitrary initial client snapshot.
- **Impact:** Once a domain exceeds 50/100 published records, most content silently disappears from browsing/search despite existing in owner domains. This is a direct completeness failure for MANARATAK's catalogs.
- **Required Action:** Replace snapshot-only catalog loading with paginated/cursor domain adapters and a governed global-search/read-model service; preserve query/filter state in canonical URLs; expose total/next-page state; add large-catalog tests proving records beyond the first page are discoverable.
- **Fix Wave:** W3/W5/W6.

---

# 48. PHASE AUDIT STATUS — BATCH 004 CHECKPOINT

| Phase | Current Audit Status | Current Conclusion |
|---|---|---|
| P23 Administration Portal | PARTIAL | Broad domain control plane exists, but IAM/RBAC administration and central Audit Center are missing — MNT-AUD-0020/0021. Detailed per-domain Admin coverage and cross-phase command audit continues. |
| P24 Public Platform | PARTIAL | Live owner APIs and several relationship graphs are wired, but SEO rendering, truthful projection semantics and complete catalog/search pagination are not Source Complete — MNT-AUD-0022/0024/0025. P24 visual documentation also uses the superseded palette — MNT-AUD-0023. |

## Batch 004 Running Finding Totals

- **Total formal findings:** 25
- **P0:** 0
- **P1:** 17
- **P2:** 7
- **P3:** 1
- **P4:** 0
- **Closed:** 0
- **Open:** 25

## Current Source Completion Decision

**SOURCE_NOT_COMPLETE**

The full 24-phase pass has now reached P24, but P23/P24 remain open for deeper Admin/Public/security/cross-phase coverage. No phase is considered finally closed until relationship, security, tests, documentation and composition reconciliation are complete.

---

# 49. Change Log Update

| Version | Date | Change |
|---|---|---|
| 0.5 | 2026-09-06 | Added MNT-AUD-0020 through MNT-AUD-0025; entered deep P23/P24 audit; recorded IAM/RBAC/Audit Admin gaps, public SEO gap, current-brand documentation drift, live projection integrity defects and public catalog/search truncation. |


### MNT-AUD-0026 — P1 HIGH — P05/P23 Asset Administration & Selection Control Plane Missing
**Categories:** ADMIN / ASSET / CROSS_PHASE / MISSING_IMPLEMENTATION / SECURITY

**Evidence:**
- Phase 05 EAP has domain/application lifecycle source and `AssetPlatformRouter` mutation endpoints for upload locator, quarantine registration, validate, sanitize, activate, archive/delete/restore/purge.
- The current EAP router exposes no canonical GET/list/search/detail query surface suitable for an Admin asset library.
- `apps/admin` has no Asset Center/Asset Library/Asset Picker page or shared asset selection control.
- `CourseDetailPage.tsx` attaches lesson assets by manually typed `assetId`.
- `CmsAdminPage.tsx` accepts manually typed `featuredAssetId`, comma-separated `attachmentAssetIds`, and `openGraphAssetId`.
- Phase 23 architecture explicitly requires uploads/select/link operations through Phase 05 EAP controls rather than raw storage/path handling.

**Impact:**
- Administrators cannot discover, inspect, select, upload, or safely reuse governed ACTIVE assets from the canonical Admin application.
- Manual AssetId entry is error-prone and weakens the P05→P23 operational boundary.
- It prevents complete source closure for course media, CMS media, certificates and other asset-backed domains.

**Required remediation:**
1. Add P05 EAP read/query contracts and APIs: list/search/detail/filter by state/classification/owner/MIME/date, with pagination.
2. Add canonical P23 Asset Center and reusable `AssetPicker`/upload flow.
3. Picker must expose only permitted/clean lifecycle states and enforce domain-specific MIME/role constraints.
4. Provide governed preview/download using signed/temporary delivery contracts; never raw physical paths.
5. Wire Course, CMS, Certificate and Student avatar/media workflows to the shared picker.
6. Audit all asset mutations and selections; add RBAC permissions and tests.
7. Coordinate with MNT-AUD-0011 because production storage/malware/sanitization adapters must also be completed.

**Repair Wave:** W3 / W5
**Status:** OPEN — READY_FOR_REMEDIATION_AFTER_ASSET_CROSS_PHASE_SWEEP


#### Live Register Update — v0.6 (2026-09-06)
- Confirmed findings: **26**
- P0: 0 | P1: **18** | P2: 7 | P3: 1 | P4: 0
- Latest finding: `MNT-AUD-0026` — P05/P23 Asset Administration & Selection Control Plane Missing.
- P23 remains `PARTIAL`; P24 remains `PARTIAL`.
- Source decision remains `SOURCE_NOT_COMPLETE`.


### MNT-AUD-0027 — P1 HIGH — P23 Course Admin Cannot Create Native Courses Despite Existing Owner API
**Categories:** ADMIN / MISSING_IMPLEMENTATION / API / CROSS_PHASE

**Evidence:**
- `CourseAdminRouter` exposes `POST /admin/courses` and delegates to `NativeCourseUseCases.create(...)`.
- Phase 23 architecture explicitly requires an **Add new course** workflow.
- Canonical `apps/admin/src/pages/CourseListPage.tsx` only lists, filters, paginates and opens existing courses; no Add/Create action or POST call exists.

**Impact:** Native course authoring cannot start from the canonical Admin Portal even though the owner-domain application/API contract is already available. This leaves P13↔P23 operational coverage incomplete.

**Required remediation:**
1. Add canonical Create Native Course flow to P23 with Phase 13 validation/contracts.
2. Include origin/access/language/category/difficulty and required initial metadata without duplicating domain rules.
3. Route immediately into the authoritative course detail/curriculum editor after creation.
4. Add RBAC, audit, validation/error/loading states and Admin E2E/source tests.

**Repair Wave:** W5
**Status:** OPEN — READY_FOR_REMEDIATION


### MNT-AUD-0028 — P2 MEDIUM — P24 English Locale Route Exists but Main Public Composition Forces Arabic
**Categories:** PUBLIC_UI / LOCALIZATION / DOCUMENTATION_DRIFT / API

**Evidence:**
- `apps/web/src/router/index.tsx` exposes locale-aware `/:locale?` routes and synchronizes the route locale with the i18n provider.
- P24 structure contracts include a bilingual Arabic/English platform identity.
- `PublicTemplateApp.tsx` hard-codes `const language: Language = 'ar'` and explicitly states English presentation is unavailable.
- That forced value is passed into owner API loaders and public composition even for `/en/...` routes.

**Impact:** `/en` is a misleading locale contract: the route exists but the primary public composition remains Arabic. Locale-aware owner APIs and navigation therefore cannot provide real English parity.

**Required remediation:**
1. Decide and document the source-closure language contract explicitly.
2. If `/en` remains an active public route, consume the actual i18n route locale throughout PublicTemplateApp and all loaders/components.
3. Complete missing English presentation copy or remove/redirect unsupported locale routes until parity is source-complete.
4. Add AR/EN route, layout, content and canonical-identity parity tests.
5. Synchronize P24 architecture/UX docs with the final decision.

**Repair Wave:** W5 / W7
**Status:** OPEN — REQUIRES_P24_LOCALIZATION_DECISION


### MNT-AUD-0029 — P1 HIGH — P24 Connected-Knowledge Contract Overstates Implemented Cross-Phase Relationships
**Categories:** ARCHITECTURE / RELATIONSHIP / PUBLIC_UI / DOCUMENTATION_DRIFT / CROSS_PHASE

**Evidence:**
- P24 Structure Contracts declare `CoreRelationships` including Scholarship→Major, Major→University, Major→Course, **Course→Educational Service**, and **Educational Service→Educational Tool**.
- The same contract states educational terminology inside public content automatically renders contextual semantic links.
- Current source has a real owner-backed public relationship graph for Major/University/Scholarship/Country.
- Current P10 public-graph closure explicitly states the source does **not invent Course→Service or Service→Tool relations when no owning read-model edge exists**.
- No semantic-linking implementation that automatically transforms editorial educational terms into canonical entity links was found in the live public composition.

**Impact:** The active P24 architecture promises cross-phase navigation that the source intentionally does not provide. This creates an authority contradiction and leaves the intended educational graph incompletely specified/implemented.

**Required remediation:**
1. ARB decision per unsupported edge: either implement a canonical owner-backed relationship contract/read model in the owning phases, or remove/downgrade the edge from mandatory P24 CoreRelationships.
2. Never infer/invent business relationships inside P24.
3. Define semantic-link ownership: explicit CMS canonical domain links, an approved resolver/read model, or remove the automatic-link promise.
4. Update P24 Part A/B/C and the active Cross-Phase Relationship Closure Matrix together.
5. Add source tests proving every documented public edge has an owner, API/read model, canonical identity, lifecycle filter and rendered navigation path.

**Repair Wave:** W1 / W4 / W5
**Status:** OPEN — REQUIRES_CROSS_PHASE_RECONCILIATION


#### Live Register Update — v0.7 (2026-09-06)
- Confirmed findings: **29**
- P0: 0 | P1: **20** | P2: **8** | P3: 1 | P4: 0
- Added `MNT-AUD-0027` through `MNT-AUD-0029`.
- P23 and P24 remain `PARTIAL`; cross-phase reconciliation is actively in progress.
- Source decision remains `SOURCE_NOT_COMPLETE`.


### MNT-AUD-0030 — P1 HIGH — Asset Reference Integrity Is Not Enforced Consistently Across Consumer Phases
**Categories:** ASSET / RELATIONSHIP / SECURITY / CROSS_PHASE / BUSINESS_LOGIC

**Evidence:**
- P13 Course curriculum resolves the referenced Asset through the P05 repository and requires an `ACTIVE` lifecycle state before attachment.
- P16 CMS `ensureAssetHandles()` only invokes `CmsPublishingPolicy.assertAssetHandle`, which rejects raw URL/path shapes but does not resolve the Asset or verify lifecycle/state/ownership.
- P15 Student Workspace similarly rejects raw avatar URLs but has no P05 Asset lookup dependency and does not verify that `avatarAssetId` exists or is ACTIVE.
- P23 currently accepts those IDs as manually typed values (see MNT-AUD-0026).

**Impact:** A syntactically valid but nonexistent, quarantined, malware-failed, archived, deleted or unauthorized AssetId can be persisted by some consumer domains. This can create broken public/private media references and bypass the intended EAP trust boundary.

**Required remediation:**
1. Define one canonical P05 `AssetReferenceResolver/Policy` contract for consuming phases.
2. Require existence + allowed lifecycle + security classification + intended owner/role checks at authoring/publish/use boundaries.
3. Apply consistently to P15 avatars, P16 featured/attachment/OG assets, P14 rendered artifacts, P11 university media, P12 documents/media, P21 portfolio/resume media and every other AssetId consumer found by the final sweep.
4. Preserve loose cross-domain coupling through a gateway/read contract rather than direct Prisma access.
5. Add invalid/nonexistent/quarantined/deleted/ownership-mismatch tests.

**Repair Wave:** W3 / W4 / W5
**Status:** OPEN — REQUIRES_ENTERPRISE_ASSET_REFERENCE_SWEEP


#### Live Register Update — v0.8 (2026-09-06)
- Confirmed findings: **30**
- P0: 0 | P1: **21** | P2: 8 | P3: 1 | P4: 0
- Added `MNT-AUD-0030` enterprise AssetId integrity finding.
- Cross-phase Asset/EAP sweep remains in progress.


### MNT-AUD-0031 — P1 HIGH — Active Cross-Phase Closure Matrix Is Incomplete and Its Final-Closure Claim Is Stale
**Categories:** ARCHITECTURE / RELATIONSHIP / DOCUMENTATION_DRIFT / SOURCE_CLOSURE / CROSS_PHASE

**Evidence:**
- `docs/remediation/CROSS_PHASE_RELATIONSHIP_CLOSURE_MATRIX.md` calls itself the single active relationship closure matrix, declares `P13 FINAL SOURCE CLOSURE`, and states every R-001→R-068 row is Source Closed or Runtime Pending.
- Its explicit scope is P7–P24, excluding foundational P05/P06 relationships from the final cross-phase proof.
- Current forensic audit has proven source-level relationships outside that matrix that are not runtime-only, including Identity→P15 Student Workspace provisioning (`MNT-AUD-0016`) and P05 EAP→P23/consumer asset administration/integrity (`MNT-AUD-0026`, `MNT-AUD-0030`).
- The matrix source baseline references an earlier source package/commit, while this audit is frozen on `0931c5664cf274cb2b8f4cb250dd09ebf2e9a77f`.
- P24 architecture/source reconciliation has also reopened public relationship obligations (`MNT-AUD-0029`).

**Impact:** The repository currently contains an authoritative-looking document that can incorrectly certify cross-phase source closure while important source edges remain absent or incomplete.

**Required remediation:**
1. Replace the P7–P24-only final matrix with an enterprise dependency/relationship closure register covering all material P05–P24 edges (and P01–P04 governance/foundation dependencies where relevant).
2. Add Identity→Student provisioning, EAP→all AssetId consumers, Import→domain semantic handoffs, event/worker dependencies, Admin control-plane dependencies and Public composition dependencies.
3. Reopen affected `Runtime Pending/Px CLOSED` rows when source gaps are discovered; Runtime Pending must never conceal missing source wiring.
4. Rebaseline every row to the actual remediation commit and link it to executable evidence/tests.
5. Synchronize P23/P24 architecture docs and the matrix after remediation.

**Repair Wave:** W0 / W1 / W7
**Status:** OPEN — ACTIVE_MATRIX_MUST_BE_REBASELINED


#### Live Register Update — v0.9 (2026-09-06)
- Confirmed findings: **31**
- P0: 0 | P1: **22** | P2: 8 | P3: 1 | P4: 0
- `MNT-AUD-0031` reopens the active cross-phase closure matrix for enterprise-wide rebaseline.


### MNT-AUD-0032 — P1 HIGH — Certificate Completion Worker Requires Undocumented Hidden Runtime Flags
**Categories:** CONFIG / CERTIFICATE / EVENT / WORKFLOW / DEVOPS / DOCUMENTATION_DRIFT

**Evidence:**
- `apps/api/src/server.ts` starts the P13→P14 certificate completion delivery worker only when `CERTIFICATE_COMPLETION_WORKER_ENABLED === 'true'`; interval is controlled by `CERTIFICATE_COMPLETION_WORKER_INTERVAL_MS`.
- The worker bootstrap is otherwise real and source-wired, so this is not a missing-consumer finding.
- Repository search finds the flags in server/remediation/verifier source but not in root/app `.env.example` configuration contracts or the Google Studio runtime handoff searched for this capability.

**Impact:** A correctly provisioned database/runtime can still start with automatic course/learning-path certificate issuance silently disabled because the required enabling configuration is not part of the canonical environment contract.

**Required remediation:**
1. Add worker enable/interval variables to the canonical config schema, root/app `.env.example`, Google Studio/runtime runbook and Health/Readiness report.
2. Decide production default explicitly: enabled by required config or fail startup/readiness when certificate issuance is expected but disabled.
3. Surface worker state/last success/last failure/lag in Admin Health & Readiness.
4. Add source configuration tests and post-connect event-delivery E2E.
5. Reconcile with the final BullMQ/worker architecture under MNT-AUD-0007.

**Repair Wave:** W3 / W6 / W7
**Status:** OPEN — READY_FOR_REMEDIATION


#### Live Register Update — v0.10 (2026-09-06)
- Confirmed findings: **32**
- P0: 0 | P1: **23** | P2: 8 | P3: 1 | P4: 0
- `MNT-AUD-0032` records the hidden certificate-worker configuration contract.


### MNT-AUD-0033 — P1 HIGH — P23→P24 Public Visibility/Composition Control Contract Has No Source Implementation
**Categories:** ADMIN / PUBLIC_UI / RELATIONSHIP / ARCHITECTURE / MISSING_IMPLEMENTATION / DOCUMENTATION_DRIFT

**Evidence:**
- P24 Structure Contracts define `IPublicVisibilityControl` with Phase 23 as command source and explicit controls for visible/hidden pages, homepage sections, section ordering, published content and service availability.
- Repository search finds these controls only in the P24 documentation; no canonical P23 Admin workspace/API/settings contract implements them.
- Current P23 navigation has no Public Experience/Visibility workspace.
- Current P24 public composition is source-defined/static by route/component plus owner publication states; no P23 visibility command/read-model is consumed.

**Impact:** A documented Admin→Public control relationship is absent. Operators cannot govern homepage composition/page visibility from the canonical Admin as promised, and the architecture does not accurately describe how public visibility is actually determined.

**Required remediation:**
1. ARB decision: either implement a governed Public Composition configuration owned by P23/P16/P24 boundaries, or revise P24 to state that visibility derives only from owner publication lifecycle + CMS navigation/block configuration.
2. If implemented, define canonical configuration schema, versioning, preview, maker-checker approval, audit, rollback and cache invalidation.
3. P24 must consume the approved read model/configuration without owning business truth.
4. Add Admin preview/publish controls and Public integration tests.
5. Update P23 Part A/B/C, P24 Part A/B/C and cross-phase matrix together.

**Repair Wave:** W1 / W5 / W7
**Status:** OPEN — REQUIRES_P23_P24_COMPOSITION_DECISION


#### Live Register Update — v0.11 (2026-09-06)
- Confirmed findings: **33**
- P0: 0 | P1: **24** | P2: 8 | P3: 1 | P4: 0
- Added P23→P24 Public Visibility/Composition contract gap.

### MNT-AUD-0034 — P1 HIGH — Notification Foundation Remains Dummy/In-Memory and Has No Production/Admin Delivery Plane
**Categories:** MISSING_IMPLEMENTATION / EVENT / WORKFLOW / NOTIFICATION / ADMIN / ARCHITECTURE / DEAD_CODE

**Evidence:**
- P23 Structure Contracts declare an `INotificationAdminView`, while the canonical Admin application has no Notifications workspace.
- P05 Notification application use cases exist (`ManageNotificationIntentsUseCase`, `ManageNotificationTemplatesUseCase`).
- The contracts/entities those use cases consume (`INotificationIntentRepository`, `INotificationTemplateRepository`, `INotificationPreferenceGateway`, `NotificationIntent`, `NotificationTemplate`, etc.) are currently exported from `packages/domain/src/generated/dummy.ts` with permissive `any` placeholders.
- The active Phase 05 traceability matrix explicitly records Notifications as `Dummy generated` with `InMemoryNotificationIntentRepository`, `InMemoryNotificationTemplateRepository` and `MockNotificationPreferenceGateway`, and in-memory-only testing.
- No Prisma Notification repository, production delivery adapter/provider, or Notification API/Admin router was found in the current source search.
- Enterprise event documentation nevertheless names the Notification Platform as a consumer of meaningful domain events.

**Impact:**
- Important domain events cannot reliably create, persist, govern and deliver notifications through a production-capable source path.
- Notification preferences/templates/intents cannot be operated from P23 as documented.
- A runtime database/provider cannot activate this capability automatically because its production persistence/delivery source is missing.
- Dummy domain exports weaken type safety and can conceal incomplete architecture behind compiling application use cases.

**Required remediation:**
1. Replace all Notification dummy contracts/entities with real typed P05 domain source and remove their generated-dummy exports.
2. Implement durable Prisma repositories for notification intents/templates/preferences/delivery receipts as appropriate.
3. Define provider-neutral delivery gateways (email/in-app/push/SMS only where approved), retries/idempotency, delivery status, rate/abuse controls and observability; integrate with the final queue/worker architecture under MNT-AUD-0007.
4. Wire approved enterprise/domain events to notification intents through explicit consumers/outbox delivery rather than informal calls.
5. Build P23 Notification Operations workspace for templates, delivery health/failures, retries, governed operational actions and audit — without exposing secrets/PII unnecessarily.
6. Add student/user preference integration where P15 owns personal preferences; Notification Foundation must consume that contract rather than duplicate it.
7. Add source/unit/integration tests plus post-connect provider/DB delivery validation.
8. Update P05, P23, Event Catalog, Dependency Graph and Cross-Phase Closure Matrix so their notification claims match the implementation.

**Repair Wave:** W1 / W3 / W5 / W6
**Status:** OPEN — SOURCE_IMPLEMENTATION_REQUIRED


#### Live Register Update — v0.12 (2026-09-06)
- Confirmed findings: **34**
- P0: 0 | P1: **25** | P2: 8 | P3: 1 | P4: 0
- Added `MNT-AUD-0034` — Notification Foundation is still dummy/in-memory and lacks production/Admin delivery plane.
- P05 and P23 remain `PARTIAL`; cross-phase/event audit continues.

### MNT-AUD-0035 — P1 HIGH — No Canonical Greenfield Database Seed/Bootstrap Orchestrator Exists
**Categories:** DATA_MODEL / PRISMA / CONFIG / DEVOPS / MISSING_IMPLEMENTATION / DOCUMENTATION_DRIFT / SOURCE_CLOSURE

**Evidence:**
- The repository contains a substantial ordered Prisma migration history and runtime runbooks correctly reference `prisma migrate deploy` for target environments.
- Root `package.json` exposes Prisma generate/push/migrate-dev/studio and many domain-specific dry-run/verification commands, but no canonical `db:seed`, `db:bootstrap`, or greenfield provisioning/initialization command.
- `packages/infrastructure/prisma/` contains `schema.prisma`, `schema_full.sql`, and migrations, but no canonical Prisma `seed.ts` entry point.
- Seed operations exist as disconnected scripts/capabilities such as `scripts/seed-taxonomy.ts`, `scripts/seed-degree-levels.ts`, `scripts/seed-external-course-providers.ts`, reference-data seed application services, and provider seed migrations.
- Active architecture script-organization documentation gives `/scripts/db/seed-database.ts` and a `db:seed` package script as the standard example, but that canonical source path/script is not present.
- The approved project lifecycle requires a newly provisioned database to be connected only after Source Complete, with migrations/seeds already authored and executable without Google Studio developing missing logic.

**Impact:**
- A brand-new PostgreSQL instance cannot be deterministically initialized from one authoritative source contract.
- Required seed ordering, idempotency, mandatory vs optional seeds, reference/taxonomy/bootstrap prerequisites, failure/retry semantics and completion evidence are ambiguous.
- Google Studio/runtime provisioning could produce a schema-valid but semantically unusable database, or require manual ad-hoc commands/knowledge, violating the source-first lifecycle.

**Required remediation:**
1. Define a canonical `db:provision` / `db:seed` orchestration contract for a NEW database, distinct from later migrations/backfills/recovery.
2. Orchestrator must run only after reviewed `prisma migrate deploy`, under the new greenfield mutation/provisioning gate that replaces MNT-AUD-0001 recovery semantics.
3. Declare an explicit ordered seed manifest covering mandatory platform bootstrap data: reference standards, degree/taxonomy baselines, required provider registries, default governed configuration/roles where appropriate, and every domain prerequisite approved for launch.
4. Every seed must be deterministic, idempotent, versioned/provenanced and safe to re-run; large catalog imports remain separate controlled import workflows rather than being hidden inside schema seeding.
5. Add validation/reconciliation output proving expected mandatory seed sets/counts/versions and zero unresolved prerequisite failures.
6. Add root package commands with unambiguous names (`db:migrate:deploy`, `db:seed`, `db:provision:verify`) and keep destructive/dev commands explicitly development-scoped.
7. Add Google Studio greenfield runbook sequence and source tests for the manifest/order/gates.
8. Retire or correct documentation pointing to nonexistent seed paths.

**Repair Wave:** W0 / W2 / W6 / W7
**Status:** OPEN — GREENFIELD_PROVISIONING_SOURCE_INCOMPLETE


#### Live Register Update — v0.13 (2026-09-06)
- Confirmed findings: **35**
- P0: 0 | P1: **26** | P2: 8 | P3: 1 | P4: 0
- Added `MNT-AUD-0035` — canonical greenfield seed/bootstrap orchestration is missing.
- A4 Data Architecture / greenfield provisioning audit is now active.

### MNT-AUD-0036 — P1 HIGH — P23 Student Administration/Support View Is Declared but Not Implemented
**Categories:** ADMIN / STUDENT / RELATIONSHIP / MISSING_IMPLEMENTATION / PRIVACY / CROSS_PHASE

**Evidence:**
- Active P23 Structure Contracts explicitly declare `IStudentsAdminView` as a canonical Administration Portal surface.
- Canonical `apps/admin/src/App.tsx` and `AdminNavigation.tsx` contain no Students/Student Support route or workspace.
- Repository search found no `StudentAdminRouter`, `/admin/students` API, or equivalent governed administrative read/command surface.
- P15 `StudentWorkspaceRouter` is correctly self-service oriented: authenticated ownership is derived from the session and legacy `:studentReferenceId` routes reject mismatched users.
- P15 lifecycle includes INITIALIZING/ACTIVE/SUSPENDED/ARCHIVED and consumes identity lifecycle events, but P23 has no operational surface to inspect provisioning failures, workspace state, consent/support context, event projection status or governed support actions.

**Impact:**
- The documented P23↔P15 administration relationship is incomplete.
- Operators have no canonical support path for students stuck in provisioning, lifecycle/event synchronization issues, or account/workspace incidents.
- Implementing ad-hoc DB access later would risk violating P15 privacy and ownership boundaries.

**Required remediation:**
1. Define P15-owned Admin Support contracts rather than allowing P23 direct Prisma access.
2. Provide privacy-minimized student search/detail/support read models: identity reference, workspace lifecycle, provisioning/event projection health, relevant support-safe metadata, consent/audit status and linked domain summaries only as authorized.
3. Separate support/read permissions from privileged lifecycle/security actions; identity suspension/archive remains owned by the Identity/IAM boundary and must flow to P15 through governed events.
4. Require explicit RBAC, reason codes, maker-checker where appropriate, immutable audit and PII minimization/redaction.
5. Build canonical P23 Student Support workspace using those APIs with no impersonation-by-default and no ability to edit private saved/search/history state arbitrarily.
6. Add ownership/IDOR/privacy tests plus post-connect event/provisioning support scenarios.
7. Update P15/P23 architecture and Cross-Phase Relationship Matrix with the final support boundary.

**Repair Wave:** W1 / W4 / W5
**Status:** OPEN — P15_P23_SUPPORT_BOUNDARY_REQUIRED


#### Live Register Update — v0.14 (2026-09-06)
- Confirmed findings: **36**
- P0: 0 | P1: **27** | P2: 8 | P3: 1 | P4: 0
- Added `MNT-AUD-0036` — P23 Student Administration/Support surface is declared but absent.
- P23 remains `PARTIAL`; P15 remains `PARTIAL` pending provisioning and support closure.

### MNT-AUD-0037 — P1 HIGH — Public Global Search Is Client-Side Over a Truncated Loaded Subset While the Canonical Search Foundation Is Unavailable
**Categories:** SEARCH / PUBLIC_UI / ARCHITECTURE / MISSING_IMPLEMENTATION / RELATIONSHIP / PERFORMANCE / SOURCE_CLOSURE

**Evidence:**
- Current P24 `GlobalSearchPage.tsx` constructs search documents in the browser with `buildGlobalSearchDocuments(...)` from the already-loaded arrays for scholarships, universities, majors, countries, courses, exams, articles, services, tools and careers, then ranks them locally.
- `globalSearchIndex.ts` is therefore an in-memory client index, not a query against the complete published owner-domain catalog.
- This compounds `MNT-AUD-0025`: several P24 live loaders cap source data to the first 50/100 records, so records outside the loaded subset are invisible to global search even when they exist and are published.
- The canonical P05 Search use case/API still exists, but current DI wires both `searchRequestRepo` and `searchEngineGateway` to explicit `createUnavailableCapability(...)` implementations; it cannot provide a production search backend.
- The active Search domain contract is also still represented through generated/dummy source for some core search types, while P24 and older information-architecture documents promise platform-wide discovery.

**Impact:**
- Global search can return false negatives and cannot guarantee discovery across the full published catalog.
- Search relevance, pagination, filtering, multilingual analysis, indexing freshness and cross-domain consistency are bounded by whatever data P24 happened to preload into the browser.
- Large catalogs create unnecessary client memory/CPU pressure if the current design is expanded by simply loading more records.
- The P05↔P24 Search relationship is not source-closed.

**Required remediation:**
1. Make P05 Search a real typed platform capability, removing remaining dummy authority for active search contracts.
2. Implement a production search read/index strategy appropriate to launch scale (PostgreSQL FTS/trigram is acceptable initially if architecturally sufficient; Elasticsearch/OpenSearch is not mandatory merely for branding) behind `ISearchEngineGateway`.
3. Index only canonical published owner-domain read models; define domain index projections, stable IDs/slugs, locale fields, lifecycle visibility and freshness/update contracts.
4. Provide server-side global search API with query, type filters, locale, pagination/cursor, deterministic ranking contract and bounded result sizes.
5. P24 must query that API instead of building its authority from preloaded arrays; client-side indexing may remain only for tiny local suggestion caches, never as complete search truth.
6. Integrate publication/update/archive events or an idempotent reconciliation/index job so search cannot drift silently from owner truth.
7. Add Arabic/English normalization/relevance tests, lifecycle visibility tests, full-catalog pagination tests and post-connect search/index reconciliation validation.
8. Update P05 Search docs, P24 architecture/UX docs and the cross-phase matrix.

**Repair Wave:** W1 / W3 / W5 / W6
**Status:** OPEN — P05_P24_SEARCH_SOURCE_INCOMPLETE


#### Live Register Update — v0.15 (2026-09-06)
- Confirmed findings: **37**
- P0: 0 | P1: **28** | P2: 8 | P3: 1 | P4: 0
- Added `MNT-AUD-0037` — global public search is client-side over a truncated loaded subset while canonical search is unavailable.
- Security forensic + A4 Data Architecture audit continue.

### MNT-AUD-0038 — P1 HIGH — P05 Asset Platform Has No Production Storage/Malware/Sanitization Provider Implementation
**Categories:** ASSET / SECURITY / INFRASTRUCTURE / CONFIG / MISSING_IMPLEMENTATION / DEVOPS / SOURCE_CLOSURE

**Evidence:**
- `createAssetStorageGatewayForRuntime()` returns an explicit `UNAVAILABLE` capability for production/staging; only development receives `LocalAssetStorageGateway`.
- Current DI registers `NoopAssetMalwareScannerGateway` and `NoopAssetSanitizationGateway`.
- The malware adapter explicitly exposes `capabilityStatus = 'UNAVAILABLE'` and throws `ASSET_MALWARE_SCANNING_UNAVAILABLE` on scan rather than providing a production scanner.
- `assertAssetSecurityProvidersForRuntime()` deliberately aborts production/staging startup when storage, malware scanning or sanitization is not production-capable.
- Repository searches did not find an S3/GCS/other production Asset storage adapter or a production malware/sanitization adapter on the frozen source.
- This is separate from `MNT-AUD-0026` (Admin Asset Center) and `MNT-AUD-0030` (cross-phase AssetId validation): even correctly governed Asset references cannot become operational in production without the underlying secure asset provider plane.

**Impact:**
- Production/staging cannot start with the Asset capability source as currently composed, or Asset functionality must remain unavailable.
- P11/P12/P13/P14/P15/P16/P21 and any future media/document consumers cannot rely on a production-capable EAP binary lifecycle.
- Google Studio cannot merely provision/configure the platform; it would need source development or an undocumented external injection to supply required adapters, violating the agreed source-first lifecycle.

**Required remediation:**
1. Select an approved production object-storage boundary and implement at least one production `IAssetStorageGateway` adapter in source (provider-neutral contract retained; GCS is a natural option for Google-hosted runtime, but architecture must not hardwire business logic to a vendor).
2. Implement production malware scanning and sanitization adapters or an explicitly approved security service integration; scanning/sanitization results must be verifiable and fail closed.
3. Define quarantine→scan→sanitize→promote→serve/archive/delete lifecycle, signed-read URL policy, content-type/magic-byte validation, size limits, filename/path isolation and retention controls.
4. Add runtime configuration schema/env contracts and readiness checks for provider credentials/endpoints without exposing secrets to Admin/browser.
5. Add test adapters, contract tests and post-connect/storage-provider E2E validation.
6. Build P23 Asset Operations under `MNT-AUD-0026` only on top of these owner APIs.
7. Update P05 EAP docs, P23 docs, deployment/Google Studio runbook and cross-phase matrix.

**Repair Wave:** W1 / W3 / W6
**Status:** OPEN — PRODUCTION_ASSET_PROVIDER_SOURCE_MISSING


#### Live Register Update — v0.16 (2026-09-06)
- Confirmed findings: **38**
- P0: 0 | P1: **29** | P2: 8 | P3: 1 | P4: 0
- Added `MNT-AUD-0038` — P05 secure production Asset provider plane is missing.

### MNT-AUD-0039 — P1 HIGH — P06 Production Import Raw-Snapshot/Provenance Store Is Intentionally Unavailable and Deferred to Runtime Injection
**Categories:** IMPORT / DATA_MODEL / PROVENANCE / INFRASTRUCTURE / CONFIG / MISSING_IMPLEMENTATION / SOURCE_CLOSURE

**Evidence:**
- `createImportRawSnapshotStoreForRuntime()` returns `createUnavailableCapability('durableImportRawSnapshotStore')` for production/staging.
- The source comment explicitly states that a durable provider adapter “is injected during runtime closure; until then fail closed.”
- Development can use `LocalImportRawSnapshotStore`, but production deliberately refuses node-local ephemeral storage.
- DI wires `AcquireImportSourceUseCase` to this runtime-selected store, so production source acquisition depends on the missing adapter.
- No production durable raw-snapshot storage adapter was found in the frozen source.
- The project operating model requires import mechanics, provenance retention and runtime adapters to be authored before Google Studio connects infrastructure.

**Impact:**
- P06 source acquisition/provenance cannot operate in production from the repository alone.
- Official-source evidence, raw acquisition snapshots, replay/reconciliation and auditability can fail closed after deployment even with PostgreSQL/Redis configured correctly.
- Google Studio would need to implement or externally inject source code/configuration not represented by the repository, contradicting Source Complete 100%.

**Required remediation:**
1. Implement a provider-neutral durable production `IImportRawSnapshotStore` adapter in source using approved object storage/blob storage.
2. Store immutable raw payload/evidence with source ID, acquisition timestamp, content hash, media type, final URL, connector/version, ETag/Last-Modified and retention metadata.
3. Define encryption/access/retention/deletion policy, integrity verification and tamper-evident reconciliation where required.
4. Ensure retries/replays reuse provenance safely and cannot overwrite historical evidence silently.
5. Add configuration/readiness contracts plus post-connect/provider E2E tests.
6. Document which imports require raw retention and which data must never be stored due to privacy/licensing/security rules.
7. Update P06 architecture, Google Studio handoff and cross-phase closure matrix.

**Repair Wave:** W1 / W3 / W6
**Status:** OPEN — DURABLE_IMPORT_PROVENANCE_PROVIDER_MISSING


#### Live Register Update — v0.17 (2026-09-06)
- Confirmed findings: **39**
- P0: 0 | P1: **30** | P2: 8 | P3: 1 | P4: 0
- Added `MNT-AUD-0039` — P06 durable production raw-snapshot/provenance store is missing.
- Security/provider boundary sweep continues.

### MNT-AUD-0040 — P1 HIGH — API Runtime Creates Multiple Independent Prisma/Redis Clients and Has No Graceful Resource Shutdown Lifecycle
**Categories:** DEVOPS / DATABASE / PRISMA / REDIS / PERFORMANCE / RELIABILITY / OBSERVABILITY / SOURCE_CLOSURE

**Evidence:**
- `apps/api/src/infrastructure/di/container.ts` registers its own singleton `prisma` and constructs a `new PrismaClient({ datasources: { db: { url: currentUrl } } })` for repositories.
- `packages/infrastructure/src/index.ts` separately defines an active static `PrismaConnection` singleton whose `connect()` constructs another `PrismaClient`.
- `apps/api/src/app.ts` imports `PrismaConnection`, calls `PrismaConnection.connect(config, logger)` and uses that separate client for database health/migration probes instead of resolving the DI-owned Prisma client.
- Redis is similarly fragmented: production rate limiting creates a Redis client in `createRateLimiterForRuntime()`, `app.ts` creates another Redis client for health checks, and DI creates additional Redis clients for Student Workspace and CMS delivery caches.
- Repository-wide search found `.quit()` only in Redis tests, not in active API startup/shutdown code.
- No active `SIGTERM` or `SIGINT` handler was found in `apps/api`; `server.ts` only clears the certificate worker interval when the HTTP server emits `close`.
- The approved operational playbook explicitly states that API startup/shutdown must intercept `SIGTERM` and gracefully flush/close runtime resources.

**Impact:**
- A single API process can open multiple database and Redis connection pools for the same runtime, increasing connection pressure and complicating health semantics.
- Health may report through a different DB/Redis client than the repositories actually use, weakening readiness truth.
- Container restart/deployment can terminate without draining HTTP work or explicitly closing Prisma/Redis clients and workers.
- Under horizontal scaling, duplicate pools and unclosed resources can exhaust managed database/Redis limits and cause avoidable transient failures.

**Required remediation:**
1. Establish one authoritative runtime resource registry/lifecycle owned by composition root.
2. Create exactly one application Prisma client/pool per process (unless a separately justified connection class is documented); inject that same client into repositories and DB health/migration checks.
3. Consolidate Redis clients where safe or explicitly document intentional separate connections; all must be centrally tracked and closable.
4. Add `SIGTERM`/`SIGINT` graceful shutdown: stop accepting traffic, mark readiness down, stop worker polling/timers, drain bounded in-flight work, close Redis clients, `$disconnect()` Prisma, then close the HTTP server with a hard timeout fallback.
5. Ensure certificate/outbox/BullMQ workers participate in the same lifecycle after queue remediation.
6. Add lifecycle tests proving resources close exactly once and readiness becomes unavailable during shutdown.
7. Update `std-ops-002`, deployment runbooks and Google Studio handoff to match the implemented lifecycle.

**Repair Wave:** W1 / W2 / W6
**Status:** OPEN — RUNTIME_RESOURCE_LIFECYCLE_FRAGMENTED


#### Live Register Update — v0.18 (2026-09-06)
- Confirmed findings: **40**
- P0: 0 | P1: **31** | P2: 8 | P3: 1 | P4: 0
- Added `MNT-AUD-0040` — duplicate DB/Redis runtime clients and graceful shutdown lifecycle gap.
- Security/Auth/Admin authorization and Prisma migration parity audit continue.

### MNT-AUD-0041 — P1 HIGH — Prisma Source Gate Does Not Prove Migration-Chain-to-Schema Parity for a Greenfield Database
**Categories:** PRISMA / MIGRATION / DATA_MODEL / TEST / DEVOPS / SOURCE_CLOSURE

**Evidence:**
- `scripts/ci/prisma-source-gate.mjs` runs only `prisma validate` and `prisma generate` against `schema.prisma`; it explicitly performs no database connection and no migration replay/diff.
- Repository search found no `prisma migrate diff --from-migrations ...` / equivalent authoritative migration-parity gate.
- `scripts/wp-ic-10-db-rehearsal.sh` applies `prisma migrate deploy` and runs `prisma migrate status` on a disposable PostgreSQL database, but it does not compare the resulting database schema against the canonical `schema.prisma` after replay.
- `migrate status` proves ledger/application status, not that the full replayed relational shape (tables, columns, enums, FKs, indexes, defaults and constraints) is equivalent to the current Prisma schema.
- The project is explicitly greenfield for the future runtime database; therefore migration replay from empty is the only acceptable production provisioning path, not `db push`.

**Impact:**
- A schema model/field/relation can compile and generate a client while being absent or divergent in the migration history.
- Google Studio could successfully run `migrate deploy` yet produce a database that does not match the source contracts, causing runtime failures only after connection.
- Current Source Closure cannot prove that the checked-in migration ledger is a complete executable representation of the canonical data model.

**Required remediation:**
1. Add an authoritative greenfield migration-parity verifier that replays all checked-in migrations onto a disposable PostgreSQL database.
2. Compare the replayed database to canonical `schema.prisma` using Prisma-supported schema diff/introspection plus explicit checks for SQL-only constraints/indexes not represented by Prisma.
3. Fail on drift: missing/extra tables, columns, enums, FKs, indexes, uniqueness, defaults or incompatible nullability/cascade semantics.
4. Make the verifier part of the post-connect/disposable-DB validation register and CI whenever a PostgreSQL service is available; source must contain the script/test before DB provisioning.
5. Add a documented `db:greenfield:verify`/equivalent command used by Google Studio handoff before seed/bootstrap.
6. Keep `db push` prohibited for staging/production and document migration ledger ownership.

**Repair Wave:** W2 / W6
**Status:** OPEN — GREENFIELD_MIGRATION_PARITY_UNPROVEN


#### Live Register Update — v0.19 (2026-09-06)
- Confirmed findings: **41**
- P0: 0 | P1: **32** | P2: 8 | P3: 1 | P4: 0
- Added `MNT-AUD-0041` — no authoritative migration-chain ↔ canonical Prisma schema parity gate.
- Real-database coverage per domain is now under audit.

### MNT-AUD-0042 — P1 HIGH — Real PostgreSQL Integration Validation Is Not Authored/Registered Across Persisted Domains
**Categories:** TEST / DATABASE / PRISMA / RELATIONSHIP / TRANSACTION / DEVOPS / SOURCE_CLOSURE

**Evidence:**
- `vitest.database.config.ts` is the canonical real-database test configuration, but its include list is limited to Major Import DB E2E, DB connectivity/auth integration, and Course/Imported-Course persistence tests.
- The registered suite contains no real PostgreSQL tests for major persisted bounded contexts such as Scholarships, Universities, Reference Data, Certificates, Student Workspace, CMS, Finance, Services, Career/Alumni, AI governance or the Asset Platform.
- Direct repository searches found no `PrismaUniversityRepository.integration`, `PrismaCertificateRepository.integration` or `PrismaStudentWorkspaceRepository.integration` suites; equivalent Scholarship integration search also produced no registered real-DB suite.
- Mocked Prisma repository tests and source verifiers exist for several of these domains, but they cannot prove PostgreSQL FK/unique/index/nullability/cascade semantics, transaction behavior, locking/concurrency or migration-backed persistence.
- The project intentionally has no database today; that is not itself a defect. The source-closure defect is that the complete post-connect database validation suite is not already authored and registered before runtime provisioning.

**Impact:**
- After Google Studio connects PostgreSQL, the project has no single comprehensive command capable of proving that every persisted phase behaves correctly against the real database engine.
- Cross-phase canonical IDs and lifecycle constraints can pass unit/mock tests while failing under actual FK, unique, transaction or deletion semantics.
- Source Complete 100% cannot rely on future ad-hoc test authoring after database connection.

**Required remediation:**
1. Create a canonical disposable-PostgreSQL integration harness shared by every persisted bounded context.
2. Add real-DB suites for P07 Reference, P08 Taxonomy, P09 Tests, P10 Majors, P11 Universities/Programs, P12 Scholarships, P13 Learning, P14 Certificates, P15 Student, P16 CMS, P17 AI, P18 Tools, P19 Finance, P20 Services, P21 Career and all P01-P06 persisted foundations that require DB proof.
3. Per domain verify CRUD/lifecycle, FK ownership, unique/index behavior, nullability/defaults, cascade/restrict/set-null semantics, transactions, outbox/inbox/idempotency and concurrency where applicable.
4. Add explicit cross-domain DB tests for canonical relationship edges, including University↔Program↔Major/Test, Scholarship↔University/Major/Reference, Course↔Taxonomy/Major/Test/Reference, completion↔certificate, P15 hydration references and P20↔P19 handoff.
5. Register every real-DB suite in `vitest.database.config.ts` (or a clearly partitioned but authoritative DB test aggregator) so no domain can silently fall outside execution.
6. Mark the suite `READY_TO_RUN_AFTER_DB_CONNECT`; Google Studio must execute it after migrations/seeds, not create it.
7. Keep unit/mocked repository tests for fast feedback, but never count them as PostgreSQL verification.

**Repair Wave:** W2 / W6
**Status:** OPEN — POSTGRESQL_DOMAIN_VALIDATION_COVERAGE_INCOMPLETE


#### Live Register Update — v0.20 (2026-09-06)
- Confirmed findings: **42**
- P0: 0 | P1: **33** | P2: 8 | P3: 1 | P4: 0
- Added `MNT-AUD-0042` — comprehensive real-PostgreSQL validation is not authored/registered for persisted domains.
- Admin least-privilege and active runtime configuration-contract audit continue.

### MNT-AUD-0043 — P1 HIGH — Production Environment Contract Is Internally Contradictory and Omits Startup-Blocking Variables
**Categories:** CONFIG / SECURITY / DEVOPS / DOCUMENTATION_DRIFT / SOURCE_CLOSURE

**Evidence:**
- `.env.example` states that `REDIS_URL` is optional in production/staging and claims an in-memory rate-limit/queue fallback is available when unset.
- `AppConfigSchema` and `ProductionReadinessValidator` instead require `REDIS_URL` in production/staging and treat its absence as a startup-blocking configuration error.
- `ProductionReadinessValidator` also treats all of the following as production requirements/blockers: `SECURE_COOKIE=true`, stable `JWT_ISSUER`, stable `JWT_AUDIENCE`, and bounded `TRUST_PROXY_HOPS` (1-3).
- Those production-blocking variables are not documented in the frozen `.env.example`.
- `.env.example` declares itself the place where all secrets/environment variables must be documented and is explicitly referenced by the deployment/Google Studio handoff.
- This is separate from `MNT-AUD-0032`, which covers the hidden P13→P14 certificate-worker flags, and from `MNT-AUD-0006`, which covers the historical DB mutation-gate variables.

**Impact:**
- A deployment following the repository's official environment example can be configured exactly as documented and still fail production readiness/startup.
- Operators may incorrectly omit Redis based on the documented fallback even though production code fails closed.
- Missing issuer/audience/proxy/cookie variables create deployment churn and make the runtime contract non-deterministic for Google Studio.
- Source Complete cannot be declared while the canonical runtime configuration contract contradicts executable validation.

**Required remediation:**
1. Define one canonical typed runtime configuration schema covering every active API/worker/web/admin/deployment variable.
2. Generate or mechanically validate `.env.example` against that schema so required variables cannot silently drift.
3. Correct Redis semantics: production/staging must explicitly require managed Redis if that remains the architecture decision; remove all contradictory fallback wording.
4. Document `SECURE_COOKIE`, `JWT_ISSUER`, `JWT_AUDIENCE`, `TRUST_PROXY_HOPS`, certificate worker flags, greenfield mutation/provisioning flags and every future production provider variable.
5. Ensure `ProductionReadinessValidator` consumes the same normalized config contract rather than independently imposing hidden requirements over raw `process.env`.
6. Add a CI test that instantiates a production-like environment from `.env.example` placeholders/required-key inventory and asserts configuration-contract completeness without accepting placeholder secrets as real values.
7. Update Google Studio/deployment runbooks to reference the canonical generated/validated environment contract.

**Repair Wave:** W0 / W1 / W6
**Status:** OPEN — PRODUCTION_ENVIRONMENT_CONTRACT_DRIFT


#### Live Register Update — v0.21 (2026-09-06)
- Confirmed findings: **43**
- P0: 0 | P1: **34** | P2: 8 | P3: 1 | P4: 0
- Added `MNT-AUD-0043` — documented production environment contract contradicts executable readiness requirements and omits blockers.
- Security least-privilege audit found strong route-level separation in Finance and Certificates; no false finding added there.

### MNT-AUD-0044 — P2 MEDIUM — P23 Unified Review Queue Is a Fixed Sample, Not an Exhaustive Operational Queue
**Categories:** ADMIN / WORKFLOW / PAGINATION / REVIEW / QUALITY / DOCUMENTATION_DRIFT

**Evidence:**
- `AdminReviewQueuePage.tsx` calculates several summary totals using `pageSize=1` responses and returned `total`, so the aggregate counters can reflect the full domain backlog.
- The actual actionable list is different: `loadFromQueries()` fetches only `page=1&pageSize=20` for each review reason.
- Scholarship import review fetches only `page=1&pageSize=40`.
- Imported-course verification scans only a `page=1&pageSize=50` window.
- The resulting sampled arrays are then merged and filtered/sorted/paginated locally by the Admin UI; no server cursor/continuation loop is used to make the unified queue exhaustive.
- Therefore saved views such as urgent, overdue, translation, source-verification and duplicates can omit valid older/past-first-page work while counters still indicate a larger backlog.

**Impact:**
- Administrators cannot rely on the Unified Review Queue as a complete work queue.
- High-priority or overdue records can remain unreachable from the aggregate page if they fall outside the first sampled windows.
- P23's operational-control promise is weaker than its UI naming/contracts imply, even though domain-specific workspaces may still contain the records.

**Required remediation:**
1. Replace fixed sampling with a server-side unified review read model/query API or cursor-based fan-out that supports exhaustive pagination.
2. Make filtering/sorting/SLA/priority evaluation server-side (or over a complete bounded result set), not over first-page samples.
3. Return total, cursor/next-page, source-domain and reason metadata with stable ordering.
4. Ensure urgent/overdue/duplicate/translation/source-verification saved views cannot silently omit records.
5. If a deliberately sampled “recent items” widget remains, label it explicitly as a sample and keep it separate from the authoritative queue.
6. Add contract tests with >1 page per domain/reason proving older high-priority work remains reachable.
7. Update P23 review-queue contracts/workflows to match the final implementation.

**Repair Wave:** W5 / W6
**Status:** OPEN — UNIFIED_REVIEW_QUEUE_NOT_EXHAUSTIVE


#### Live Register Update — v0.22 (2026-09-06)
- Confirmed findings: **44**
- P0: 0 | P1: 34 | P2: **9** | P3: 1 | P4: 0
- Added `MNT-AUD-0044` — P23 Unified Review Queue uses fixed first-page samples and can omit actionable backlog.


#### Live Register Correction — v0.23 (2026-09-06)
- `MNT-AUD-0022` corrected after deeper source inspection: canonical/hreflang and localized sitemap infrastructure DO exist.
- Remaining P1 issue is the lack of crawlable SSR/SSG/prerender delivery and unproven structured-data coverage, not total SEO absence.
- Finding count/severity totals unchanged by this correction.

### MNT-AUD-0045 — P1 HIGH — Active P23/P24 Architecture Specifications Remain “Baselined & Approved” Despite Proven Source Divergence
**Categories:** ARCHITECTURE / DOCUMENTATION_DRIFT / GOVERNANCE / ADMIN / PUBLIC_UI / SOURCE_CLOSURE

**Evidence:**
- `phase-23-01-enterprise-administration-portal-architecture-specification.md` remains marked `Status: Baselined & Approved` and declares control-plane capabilities including RBAC Settings, Safe Operational & Audit Activity Log and unified review/control behavior.
- `phase-23-02-enterprise-administration-portal-structure-contracts.md` remains an active structural contract and declares views/boundaries that the current forensic audit has proven incomplete or absent, including IAM/users, Student administration/support, Notification administration and public-composition control dependencies.
- `phase-23-04-admin-preview-ui-design-and-action-backlog.md` is correctly marked historical/superseded and is therefore NOT the problem; the drift is in the still-active P23 authority set.
- `phase-24-01-enterprise-public-platform-architecture-specification.md` likewise remains `Baselined & Approved` while current findings prove divergences in locale availability, public relationship composition, visibility-control ownership, catalog/search completeness and SEO delivery architecture.
- P24 visual documentation also contains the superseded emerald palette (`MNT-AUD-0023`).
- Current implementation findings requiring these documents to change include at least `MNT-AUD-0020`, `0021`, `0022` (corrected), `0023`, `0025`, `0026`, `0028`, `0029`, `0033`, `0036`, `0037`, `0044` and related cross-phase corrections.

**Impact:**
- The declared architecture authority can tell a future implementer/reviewer that capabilities are approved/closed when the source either lacks them or now implements a different ownership model.
- Remediation performed only in code would recreate documentation drift immediately and make final Source Closure non-auditable.
- Google Studio/runtime handoff could follow obsolete P23/P24 assumptions about visibility, localization, SEO, Admin capabilities or cross-phase ownership.

**Required remediation:**
1. Treat P23-01/02/03 and P24-01/02/03/04 plus their active relationship/SEO/localization contracts as `REBASELINE_REQUIRED` until remediation completes.
2. Rewrite P23 around the actual canonical `apps/admin` control plane and domain-owner APIs, explicitly covering IAM/RBAC, Audit Center, Asset Center/Picker, Student Support, Notification Operations, exhaustive Review Queue, Course creation and the final P23↔P24 visibility/composition ownership decision.
3. Rewrite P24 around actual owner-read APIs, complete server pagination/search, current AR/EN availability policy, truthful relationship projections, SSR/SSG/prerender SEO delivery, current visual identity and canonical Admin separation.
4. Reconcile the Cross-Phase Relationship Closure Matrix with all newly proven foundational/Admin/Public edges before any row is relabeled Source Closed.
5. Add traceability tables from each active P23/P24 architectural requirement to concrete source file/API/test evidence or an explicit deferred-runtime validation ID.
6. Remove/mark superseded clauses rather than leaving contradictory requirements side by side.
7. Only restore `Baselined & Approved` after code, tests, matrices and docs agree at the frozen remediation commit.

**Repair Wave:** W0 / W5 / W7
**Status:** OPEN — P23_P24_ARCHITECTURE_REBASELINE_REQUIRED


#### Live Register Update — v0.24 (2026-09-06)
- Confirmed findings: **45**
- P0: 0 | P1: **35** | P2: 9 | P3: 1 | P4: 0
- Added `MNT-AUD-0045` — active P23/P24 architecture authorities require formal re-baselining against the remediated source.
- Historical P23-04 remains intentionally superseded and is not treated as an active-authority defect.

### MNT-AUD-0046 — P1 HIGH — P24 Flattens Distinct P16 CMS Content Types into the Articles Surface
**Categories:** CMS / PUBLIC_UI / RELATIONSHIP / DOMAIN_MODEL / BUSINESS_LOGIC / SOURCE_CLOSURE

**Evidence:**
- P16 domain enum `CmsContentType` owns distinct semantic types including `ARTICLE`, `STUDY_GUIDE`, `NEWS`, `FAQ`, `CHECKLIST` and `STATIC_PAGE`.
- `CmsPublicRouter` correctly exposes a generic `/public/cms/content` query with an optional `contentType` filter and owner-owned slug delivery.
- P24 `loadPublishedArticles(locale)` calls `ApiClient.getCmsContent({ locale, page: 1, pageSize: 50 })` without filtering the content type, so every published editorial content type enters the public `articles` collection.
- `mapArticle()` recognizes NEWS/GUIDE/CHECKLIST but falls back to `ARTICLE` for the remaining types; therefore FAQ and STATIC_PAGE are semantically relabeled as articles.
- P24 router defines `/articles` and `/articles/:slug` but no canonical public FAQ/static-page/study-guide/news route family that preserves the P16 content-type identity.
- This is independent of the fixed 50-record pagination issue already tracked in `MNT-AUD-0025`.

**Impact:**
- P16 owner-domain semantics are lost at the P24 composition boundary.
- FAQs/static pages can appear in the wrong public catalog/detail template and acquire the wrong URL/SEO/content behavior.
- CMS navigation and redirects cannot reliably target canonical type-specific public routes if P24 collapses all editorial content into Articles.
- Future translation/SEO/search projections can index the wrong content class even though the P16 source record is correct.

**Required remediation:**
1. Preserve `CmsContentType` through the P16 public DTO and P24 public composition without relabeling.
2. Define canonical P24 rendering/routing policy per publishable CMS type: Articles, News, Study Guides, FAQs, Checklists and Static Pages (or an explicitly approved generic CMS route model that still preserves type semantics).
3. Make list loaders query the intended type(s) explicitly instead of loading all CMS content into `articles`.
4. Ensure navigation links, redirects, related-content projections, sitemap/SEO metadata and search documents use the canonical type-aware public URL.
5. Add negative tests proving FAQ/STATIC_PAGE cannot be rendered/indexed as ARTICLE unless an explicit editorial migration changes their owner type.
6. Update P16↔P24 relationship rows and P24 architecture/detail-route documentation.

**Repair Wave:** W4 / W5 / W6
**Status:** OPEN — CMS_PUBLIC_CONTENT_TYPE_SEMANTICS_COLLAPSED


#### Live Register Update — v0.25 (2026-09-06)
- Confirmed findings: **46**
- P0: 0 | P1: **36** | P2: 9 | P3: 1 | P4: 0
- Added `MNT-AUD-0046` — P24 collapses multiple P16 CMS content types into the Articles public surface.

### MNT-AUD-0047 — P1 HIGH — Phase 16 Source-Closure Verifier References a Deleted Public CMS Component
**Categories:** TEST / CMS / PUBLIC_UI / DEVOPS / SOURCE_CLOSURE / STALE / QUALITY

**Evidence:**
- `scripts/verify-phase16-source.mjs` is an active package-level source verifier and includes a mandatory check named `public canonical rendering`.
- That check executes `readFileSync('apps/web/src/features/cms/CmsContentDetail.tsx', 'utf8')` and expects the token `canonicalUrl`.
- The frozen commit tree contains no `apps/web/src/features/cms/CmsContentDetail.tsx`; an exact frozen-commit fetch returns 404 and the frozen recursive tree has no match.
- The live public router instead routes CMS detail traffic through `PublicTemplateApp` / `ApiClient.getCmsContentBySlug`.
- Therefore the Phase 16 verifier is stale against the actual P24 composition and can fail with a missing-file error before it even evaluates the intended rendering invariant.
- This is distinct from `MNT-AUD-0009`, which covers the stale translation-quality verifier.

**Impact:**
- `npm run phase16:verify` cannot serve as valid Phase 16 Source Closure evidence on the frozen source.
- The verifier is checking an obsolete architecture rather than the current P16↔P24 integration path.
- Existing documentation/status claiming Phase 16 source closure can be stronger than the executable proof that exists today.
- A deleted/orphaned component path can mask real public CMS defects such as the content-type flattening in `MNT-AUD-0046`.

**Required remediation:**
1. Rewrite the P16 verifier against the canonical runtime path (`CmsPublicRouter` → public API client → P24 type-aware route/render composition).
2. Replace raw file-existence/token checks with behavioral/contract tests wherever possible.
3. Verify canonical URL/SEO, type preservation, slug redirects, navigation, announcements, related-content links and published-only visibility through the actual mounted P24 routes.
4. Add a source test that ensures every file path referenced by closure scripts exists at the audited commit.
5. Remove obsolete references to the deleted `features/cms/CmsContentDetail.tsx` architecture or formally restore it only if P24 re-baselining chooses that component as canonical.
6. Re-run and reissue P16 Source Closure evidence only after the corrected verifier passes.

**Repair Wave:** W5 / W6 / W7
**Status:** OPEN — PHASE16_SOURCE_VERIFIER_STALE_AND_BROKEN


#### Live Register Update — v0.26 (2026-09-06)
- Confirmed findings: **47**
- P0: 0 | P1: **37** | P2: 9 | P3: 1 | P4: 0
- Added `MNT-AUD-0047` — active P16 closure verifier references a deleted public CMS component and is not valid current-source evidence.

---

## Repository Deep Audit Continuation — Batch 005 (2026-09-06)

**Audit baseline:** `main@0931c5664cf274cb2b8f4cb250dd09ebf2e9a77f`  
**Mode:** READ-ONLY SOURCE AUDIT — NO IMPLEMENTATION REMEDIATION EXECUTED  
**Continuation rule:** Continue from the forensic/cross-phase pass after `MNT-AUD-0047`; do not restart the 24-phase inventory pass.  
**Decision:** `SOURCE_NOT_COMPLETE — AUDIT_IN_PROGRESS`

### Coverage executed in this continuation
- Reconciled root CI workflow against root `package.json` source/closure scripts.
- Reconciled `remediation:verify` manifest against active phase/domain verifiers.
- Re-inspected Phase 05 live DI composition for explicit `UNAVAILABLE` dependencies and verified whether affected routers are mounted.
- Re-inspected Asset Platform destructive lifecycle (`purgeAsset`) against the live usage-registry composition.
- Reconciled Phase 05 traceability authority against current durable event/outbox source.
- Reconciled operations/containerization documentation against actual `docker-compose.yml`, repository scripts, and CI workflow.
- Reconciled runtime version documentation against `.nvmrc`, root engines, and CI Node pin.
- Spot-checked Phase 17/18/19 verifier scope to ensure the next pass starts from current verifier reality rather than historical closure labels.

### MNT-AUD-0048 — P1 HIGH — Canonical “Full Source Closure” CI Omits Active Current-Phase and Domain Closure Verifiers
**Categories:** CI / DEVOPS / TEST / SOURCE_CLOSURE / GOVERNANCE / FALSE_GREEN

**Evidence:**
- Root `package.json` exposes active verifiers for Phase 15, 16, 17, 18 and 19 plus current domain closures such as certificates, health/readiness, finance, jobs, public UI, courses, tests and imports.
- `.github/workflows/ci.yml` labels its primary job `Full source closure gates`, but executes W0-W16 remediation verification, P7-P13 plan/source gates, Prisma source verification, typecheck/lint/build/unit tests and source evidence only.
- The workflow does not execute `phase15:verify`, `phase16:verify`, `phase17:verify`, `phase18:verify`, `phase19:verify`, `certificates:source:closure`, `health:source:closure`, `finance:source:closure`, `jobs:source:closure`, `public-ui:source:closure`, or the other current owner-domain closure scripts.
- `scripts/run-remediation-verifiers.mjs`, which backs `npm run remediation:verify`, only runs `verify-w0-source.mjs` through `verify-w15-source.mjs` plus `verify-w16-final-closure.mjs`; it is not a manifest of the current active phase/domain closure surface.
- `MNT-AUD-0047` already proves an active Phase 16 verifier is stale/broken, yet the canonical CI can avoid executing it and therefore can still appear green with invalid P16 closure evidence.
- The operations manual states the CI runs E2E Playwright, while the actual canonical CI workflow contains no E2E step.

**Impact:**
- A green canonical CI run cannot prove the current repository-wide Source Closure claim.
- New regressions in P15-P19 or owner-domain closure scripts can bypass the main gate.
- Broken/stale verifier scripts can remain undetected because the gate that claims full closure never invokes them.
- Audit evidence and CI status can diverge, creating false confidence before remediation or launch-readiness decisions.

**Required remediation:**
1. Define one authoritative machine-readable verifier manifest covering every active source-closure verifier.
2. Make canonical CI execute that manifest and fail on any non-zero result.
3. Add a guard that fails when a new active `verify-*-source*.mjs` / owner closure verifier exists but is not registered in the manifest, unless explicitly classified historical/runtime-only.
4. Include Phase 15-19, certificates, health/readiness, finance, jobs, public UI, AI tools, courses, tests/imports and future owner-domain closure gates under the same authority model.
5. Separate source-only gates from runtime/database/browser gates explicitly instead of silently omitting them.
6. Make source evidence record commit SHA, verifier manifest version, exact verifier list, pass/fail status and intentionally deferred runtime checks.
7. Correct `docs/operations/containerization-and-ci.md` so its CI stage list matches the executable workflow.

**Repair Wave:** W0 / W6 / W7  
**Status:** OPEN — CANONICAL_CI_SOURCE_CLOSURE_COVERAGE_INCOMPLETE

### MNT-AUD-0049 — P1 HIGH — Mounted Phase 05 Control-Plane APIs Depend on Repositories Registered as UNAVAILABLE
**Categories:** PHASE05 / API / WORKFLOW / SHARED_COMPONENTS / CONTROL_PLANE / PERSISTENCE / SOURCE_CLOSURE

**Evidence:**
- The live application mounts protected `/workflows`, `/api-services` and `/shared-components` control-plane routes.
- `WorkflowRouter` invokes `ManageWorkflowsUseCase`; `ApiFoundationRouter` exposes create/list/get/activate/deprecate/archive/publish-version operations; `SharedComponentRouter` exposes create/activate/version/deprecate/archive operations.
- The active DI composition registers `workflowRepo` as `createUnavailableCapability('workflowPersistence')`, `apiServiceRepo` as `createUnavailableCapability('apiServicePersistence')`, and `sharedComponentRepo` as `createUnavailableCapability('sharedComponentPersistence')`.
- Those unavailable repositories are injected directly into the mounted use cases.
- Phase 05 historical traceability describes these systems as in-memory/dummy/deferred; current composition has moved to explicit fail-closed UNAVAILABLE rather than providing durable production persistence.

**Impact:**
- Protected routes are structurally present but their core business operations cannot provide an operational production-like control plane.
- Admin/API route existence can be mistaken for implemented capability even though the persistence authority is absent.
- Workflow/API Foundation/Shared Components lifecycle operations cannot satisfy source-complete behavior in production-like composition.

**Required remediation:**
1. Decide per capability whether it is required for the current launch baseline or formally deferred and unmounted.
2. For required capabilities, implement durable owner repositories and production-safe gateways, wire them in DI, migrations and tests.
3. For deferred capabilities, remove/disable mounted operational routes and admin affordances or expose an explicit capability-unavailable contract rather than presenting mutable CRUD endpoints.
4. Replace generated/dummy domain authority for required capabilities with real owner-domain contracts.
5. Add integration/source composition tests proving every mounted mutating control-plane route resolves to an operational durable dependency in production-like mode.
6. Reconcile Phase 05 traceability, P23 control-plane documentation and launch-readiness matrices.

**Repair Wave:** W1 / W3 / W5 / W6  
**Status:** OPEN — MOUNTED_CONTROL_PLANE_DEPENDS_ON_UNAVAILABLE_PERSISTENCE

### MNT-AUD-0050 — P1 HIGH — Active Asset Purge Route Cannot Enforce Usage Safety Because AssetUsageRegistry Is UNAVAILABLE
**Categories:** ASSET / DATA_INTEGRITY / DELETION / RELATIONSHIP / PHASE05 / SOURCE_CLOSURE

**Evidence:**
- `ProcessAssetLifecycleUseCase.purgeAsset()` requires `IAssetUsageRegistryGateway.isAssetInUse(assetId)` before physical deletion and permanent purge.
- `AssetPlatformRouter` exposes and invokes the purge lifecycle operation and records a `PURGE_ASSET` audit mutation.
- Active DI registers `assetUsageRegistryGateway` as `createUnavailableCapability('assetUsageRegistry')`.
- The domain/application contract therefore requires a cross-domain usage check that the production-like composition cannot perform.
- This is distinct from `MNT-AUD-0030` (consumers inconsistently validate asset references) and `MNT-AUD-0038` (production storage/scanning/sanitization providers missing): this finding concerns the destructive-delete reference-protection boundary itself.

**Impact:**
- Governed purge is non-operational in production-like composition and cannot prove referential safety.
- If a future adapter bypasses fail-closed behavior without a complete registry, physical asset deletion could orphan consumer references.
- Admin/API lifecycle completeness is overstated while the central destructive invariant is unavailable.

**Required remediation:**
1. Implement a canonical durable asset-usage registry or an owner-query aggregation that covers every AssetId-consuming domain.
2. Register/unregister usage transactionally with consumer lifecycle mutations, or derive usage from authoritative relational references where appropriate.
3. Keep purge fail-closed when usage authority is unavailable or incomplete.
4. Add cross-domain tests proving an in-use asset cannot be purged and an unused eligible asset can be purged safely.
5. Reconcile all consumer domains discovered under `MNT-AUD-0030` with the purge registry coverage matrix.
6. Add a launch gate for Asset usage-registry completeness before enabling permanent purge in production.

**Repair Wave:** W3 / W5 / W6  
**Status:** OPEN — ASSET_PURGE_USAGE_AUTHORITY_UNAVAILABLE

### MNT-AUD-0051 — P2 MEDIUM — Phase 05 Traceability Authority Is Stale Against Current Event/Outbox and DI Composition
**Categories:** DOCUMENTATION / PHASE05 / TRACEABILITY / EVENTING / GOVERNANCE / SOURCE_TRUTH

**Evidence:**
- `docs/phases/phase-05-core-implementation/phase-05-traceability-matrix.md` is marked `Approved & Baselined` and presents itself as the exact implementation-status mapping for all 20 Phase 05 foundations.
- The matrix still describes Enterprise Events / Outbox as in-memory only and explicitly states that no transactional outbox table exists.
- Current source contains `PrismaEnterpriseEventRepository`, `PrismaEventPublishingGateway`, an `EnterpriseEventRecord` schema/migration and transactional outbox append behavior verified by `verify-w2-source.mjs`.
- Other matrix rows still describe in-memory implementations while current DI has intentionally replaced several of those paths with explicit `UNAVAILABLE` capabilities.
- The document carries a superseding notice, but the detailed rows and summary sections remain materially contradictory to current source and therefore are unsafe as an implementation-status authority.

**Impact:**
- Engineers/auditors can make wrong architecture and remediation decisions from a document labeled approved/baselined.
- Durable versus unavailable versus deferred boundaries are obscured.
- Cross-phase dependency planning can target obsolete adapters or miss current fail-closed behavior.

**Required remediation:**
1. Rebuild the matrix from the frozen/current composition root and owner repositories.
2. Classify every foundation as `DURABLE`, `DEVELOPMENT_ONLY`, `UNAVAILABLE_FAIL_CLOSED`, `DEFERRED_UNMOUNTED`, or `RUNTIME_PROOF_PENDING`.
3. Remove historical claims from active status cells; preserve them only in explicitly historical appendices.
4. Add a generated/source-checked traceability assertion for critical DI bindings.
5. Re-baseline only after the matrix matches code, migrations, routes and tests.

**Repair Wave:** W0 / W7  
**Status:** OPEN — PHASE05_TRACEABILITY_STATUS_STALE

### MNT-AUD-0052 — P2 MEDIUM — Operations Manual Describes a Container/CI Topology That Does Not Exist in Source
**Categories:** OPERATIONS / DEVOPS / DOCUMENTATION / DOCKER / CI / HANDOFF

**Evidence:**
- `docs/operations/containerization-and-ci.md` states that local Docker Compose contains `postgres`, `redis`, `api`, `web` and `admin` services and provides `./scripts/deploy/local-compose-up.sh` / `local-compose-down.sh` as startup commands.
- Actual `docker-compose.yml` defines only `postgres` and `redis` plus their volumes.
- Repository code search finds `local-compose-up.sh` only inside the manual; the documented script is not present as an operational entry point.
- The same manual states `.github/workflows/ci.yml` installs/runs Playwright E2E; the current CI workflow does not contain an E2E browser stage.
- `docs/remediation/wp1/DELIVERY_REALITY_REPORT.md` separately records that API/Web/Admin images are deferred, no Dockerfiles exist, and production containerization/deployment automation is deferred.

**Impact:**
- Handoff/deployment operators can execute nonexistent commands and expect nonexistent application containers.
- The manual overstates local environment parity and CI coverage.
- Runtime validation and incident reproduction procedures become unreliable.

**Required remediation:**
1. Rewrite the operations manual to describe the actual dependency-only Compose topology today.
2. Either create validated app Dockerfiles/scripts in a later approved remediation wave or remove all claims that they already exist.
3. Align documented CI stages exactly with executable workflows and explicitly mark E2E/runtime stages as pending where applicable.
4. Add documentation link checks for operational script/file paths and a source guard for compose service claims.
5. Reconcile the manual with `DELIVERY_REALITY_REPORT.md` and the final deployment/readiness report.

**Repair Wave:** W0 / W7  
**Status:** OPEN — OPERATIONS_MANUAL_TOPOLOGY_DRIFT

### MNT-AUD-0053 — P2 MEDIUM — README Runtime Requirement Contradicts the Enforced Node Runtime Baseline
**Categories:** DOCUMENTATION / RUNTIME / NODE / BUILD / HANDOFF

**Evidence:**
- Root `README.md` states the runtime requirement is `Node.js 20+ and npm 10+`.
- Root `package.json` enforces `node: >=22.16.0 <23` and `npm: >=10.9.0 <11`.
- `.nvmrc` pins `22.16.0` and canonical CI uses Node `22.16.0`.
- Phase 03 environment documentation and W0 source verifier also treat Node 22.16.0 as the governed baseline.

**Impact:**
- A handoff operator following README can use Node 20/21 or a future unsupported major and encounter build/runtime behavior outside the audited baseline.
- The first-line repository documentation contradicts executable engine constraints.

**Required remediation:**
1. Change README runtime requirements to the exact governed range/pin.
2. State the difference between minimum engine range and recommended exact `.nvmrc` version.
3. Add a documentation guard that compares README/runtime docs against root engines and `.nvmrc`.

**Repair Wave:** W0 / W7  
**Status:** OPEN — README_NODE_RUNTIME_BASELINE_DRIFT

#### Live Register Update — v0.27 (2026-09-06)
- Confirmed findings: **53**
- P0: 0 | P1: **40** | P2: **12** | P3: 1 | P4: 0
- Added `MNT-AUD-0048` through `MNT-AUD-0053`.
- No production/source implementation repairs were executed in this audit batch.
- Frozen audit baseline remains `0931c5664cf274cb2b8f4cb250dd09ebf2e9a77f`.
- Project decision remains: **SOURCE_NOT_COMPLETE — AUDIT_IN_PROGRESS**.

### Next mandatory audit sequence before remediation begins
1. Complete Phase 17 AI forensic pass: provider runtime contract, async worker ownership, quota/accounting, prompt/version lifecycle, PII/data-classification and incident/kill-switch behavior.
2. Complete Phase 18 Student Tools forensic pass across all 83 registry entries, four executable tools, dependency health, requester-owned receipts and AI boundary.
3. Complete Phase 19 Finance forensic pass: provider transport reality, webhook authenticity/idempotency, reconciliation, refunds, ledger invariants and runtime configuration.
4. Complete Phase 20 Services and Phase 21 Careers/Alumni end-to-end owner/admin/public/asset/finance relationships.
5. Complete Phase 22 Product Experience pass: navigation, personalization, design system, experience orchestration, accessibility, SEO/performance and cross-product consistency.
6. Deep P23 Admin route-by-route capability audit and P24 public route-by-route content/SEO/i18n/search audit.
7. Security sweep: authentication, authorization, CSRF, SSRF, file ingestion, secret handling, injection, rate limiting, PII exposure and privileged operations.
8. Prisma/migration sweep: schema↔migration parity, constraints, unique/index/FK coverage, delete behaviors, enums, nullable semantics and recovery assumptions.
9. Events/workers/jobs sweep: outbox consumers, schedulers, retries, idempotency, dead-letter, leases, graceful shutdown and multi-instance behavior.
10. File-by-file closure sweep: orphaned/stale files, active scripts, broken path references, generated/dummy authority, TODO/FIXME/HACK, dead code, duplicate logic and historical-vs-authoritative docs.
11. Reconciliation: merge duplicates/root causes, assign final repair waves/dependencies, establish final finding count, then and only then switch project state from AUDIT to REMEDIATION.

---

## Audit Continuation Batch 006 — Phase 17 Async Runtime + Phase 21 Scope Reconciliation (2026-09-06)

**Audit baseline:** `0931c5664cf274cb2b8f4cb250dd09ebf2e9a77f`  
**Execution mode:** Source/repository audit only — no implementation repairs, migrations, backfills, database mutations or production runtime changes.  
**Project state:** `AUDIT_IN_PROGRESS`

### MNT-AUD-0054 — P1 HIGH — Phase 17 Durable AI Async Jobs Have No Runtime Worker/Scheduler to Execute Queued Jobs
**Categories:** AI / ASYNC / WORKER / JOBS / OPERATIONS / RELIABILITY / SOURCE_CLOSURE

**Evidence:**
- `AIExecutionOrchestrator.submitAsync()` persists protected async jobs and the live AI gateway exposes async submission through the execution API.
- `AIExecutionOrchestrator.processAsync(publicId, workerId)` contains the claim/decrypt/execute/retry/dead-letter lifecycle and the repository implements durable claim/lease behavior.
- Repository-wide search for `processAsync(` finds the method implementation and tests but no runtime worker, scheduler, queue consumer or bootstrap that discovers queued AI jobs and invokes the processor.
- Search for `claimAsyncJob` similarly finds the domain contract, Prisma repository, source verifier, application use case and tests, but no executable runtime consumer.
- The Phase 17 verifier proves source invariants inside the orchestrator/repository but does not prove ownership/startup of an async worker.

**Impact:**
- The public/admin API can accept an asynchronous AI request and persist it as `QUEUED`, while no source-wired runtime component is responsible for progressing that job.
- Queued work can remain indefinitely pending despite durable lease/retry/dead-letter primitives existing in the codebase.
- Phase 17 cannot be considered end-to-end source-complete for asynchronous execution.
- Health/readiness can describe AI dependencies without proving that the queue consumer itself is alive.

**Required remediation:**
1. Add a canonical Phase 17 AI async worker entry point owned by the AI platform/runtime composition.
2. Discover eligible queued/stale jobs, call `processAsync(publicId, workerId)`, respect leases/max-attempts/dead-letter behavior and support bounded concurrency.
3. Implement graceful shutdown, multi-instance safety, lease renewal/reclaim policy and deterministic worker identity.
4. Surface worker enabled/running state, queue depth, oldest queued age, lease conflicts, retries and dead-letter counts through Health/Readiness and Admin governance.
5. Add explicit worker configuration to the canonical environment contract; production-like runtime must not silently accept async work when the worker is disabled.
6. Add source composition tests and real runtime/database E2E proving `QUEUED -> RUNNING -> SUCCEEDED/FAILED/DEAD_LETTER`.
7. Extend `verify-phase17-source.mjs` and canonical CI source-closure aggregation to assert the worker bootstrap exists and is wired.

**Repair Wave:** W3 / W4 / W6 / W7  
**Status:** OPEN — AI_ASYNC_QUEUE_HAS_NO_RUNTIME_CONSUMER

### MNT-AUD-0055 — P1 HIGH — Phase 21 Career & Alumni Source Implements Employer/Job Posting Slice but Omits Core Applications, CV, Alumni and Career-Profile Scope
**Categories:** PHASE21 / CAREER / ALUMNI / APPLICATIONS / ASSET / STUDENT / ADMIN / PUBLIC / MISSING_IMPLEMENTATION / SOURCE_CLOSURE

**Evidence:**
- The authoritative audit scope for Phase 21 includes profiles, opportunities, alumni/career relations, permissions, workflows and integrations.
- The active `ICareerRepository` contract contains only employer and job-posting operations: employer CRUD/list, job CRUD/status/list/published-list.
- `PrismaCareerRepository` likewise persists only employer and job-posting records.
- Phase 21 domain/implementation documentation defines job applications with a submitted Phase 05 EAP resume/CV asset handle and an application service for submitting applications and changing application status.
- Phase 21 implementation documentation also specifies career-profile updates, resume updates, application snapshots and recruitment workflow state changes.
- The Phase 21/P23 alignment report claims a complete/verified workspace including applications/CVs, alumni profiles and related analytics/workflows, but the active owner-domain repository has no corresponding application/alumni/profile persistence contract.
- Repository search for active career-application implementation does not reveal an owner-domain application repository/model/use-case equivalent; the current jobs source-closure verifier concentrates on employer/job-posting behavior.
- Legacy careers preview components named by older alignment documentation have already been intentionally removed by the current jobs source verifier, confirming that the historical UI report is not current operational evidence.

**Impact:**
- Phase 21 is not source-complete against its documented bounded-context scope.
- A student can browse published career opportunities, but the owner-domain source does not provide the documented end-to-end application/CV/alumni/profile lifecycle.
- P23 cannot truthfully provide applications/alumni administration backed by Phase 21 ownership for functionality that is absent from the owner contract.
- The Phase 05 Asset relationship for submitted CVs and the Phase 15 Student relationship for candidate/profile ownership are not source-closed for these missing flows.
- Existing `PASS_WITH_FINDINGS` wording understated the degree of missing implementation.

**Required remediation:**
1. Reconcile the exact launch scope for Phase 21 against the canonical roadmap/phase specifications; do not rely on historical preview reports.
2. If applications/alumni/profile capabilities remain in scope, implement first-class domain entities/contracts for career profiles, job applications and alumni visibility/profile state.
3. Add Prisma schema/migrations/repositories and governed use cases for submit/withdraw/review/shortlist/reject/accept lifecycle as applicable.
4. Integrate submitted CV/resume through Phase 05 EAP AssetId handles with reference validation and usage-registry participation; no raw file URLs.
5. Bind applicant/profile ownership to Phase 15/Identity through explicit owner gateways and enforce privacy/consent for alumni visibility.
6. Add P23 Admin queues/detail actions and P24/Student flows only through Phase 21 owner APIs; no shadow storage.
7. Add audit/event/idempotency semantics and real DB/E2E coverage for application lifecycle and privacy boundaries.
8. Expand the Phase 21 verifier to cover every in-scope sub-capability, not only employers/jobs.
9. If any capability is formally deferred, update the canonical roadmap, Phase 21 docs, P23 contracts and implementation-status reports so they do not claim completion.

**Repair Wave:** W1 / W2 / W3 / W5 / W6 / W7  
**Status:** OPEN — PHASE21_CORE_SCOPE_PARTIALLY_MISSING

### Evidence Addendum — Existing MNT-AUD-0043 Environment Contract Drift Extends to P17/P18 Runtime Secrets
This batch does **not** create another duplicate finding for the same root cause. The following evidence is attached to `MNT-AUD-0043`:
- Phase 17 async payload protection is wired to `AI_ASYNC_PAYLOAD_KEY`.
- Phase 18 transient result protection is wired to `STUDENT_TOOL_RESULT_KEY`.
- Phase 18 anonymous tool-session integrity is wired to `STUDENT_TOOL_ANONYMOUS_SESSION_SECRET`.
- Current source/governance documents identify these as runtime requirements; they must be reconciled into one canonical environment/schema/runbook/readiness contract under the existing configuration-drift remediation.

#### Live Register Update — v0.28 (2026-09-06)
- Confirmed findings: **55**
- P0: 0 | P1: **42** | P2: **12** | P3: 1 | P4: 0
- Added `MNT-AUD-0054` and `MNT-AUD-0055`.
- Extended evidence for existing `MNT-AUD-0043`; no duplicate finding created.
- Corrected the Phase 22 continuation scope to **Enterprise Product Experience** rather than analytics ownership.
- No source implementation repairs were executed.
- Project decision remains: **SOURCE_NOT_COMPLETE — AUDIT_IN_PROGRESS**.

### Updated continuation sequence before remediation
1. Phase 18: finish all 83 registry-entry scope reconciliation, four executable tools, anonymous/requester security, result retention/encryption and dependency-readiness boundaries.
2. Phase 19: finish finance transport/webhook/reconciliation/refund/ledger/config forensic pass without duplicating existing provider-transport finding.
3. Phase 20: verify service request lifecycle, owner permissions, Phase 19 invoice/payment clearance boundary, canonical references and Admin/Public/Student flows.
4. Phase 21: after `MNT-AUD-0055`, inventory every missing application/alumni/profile source artifact and reconcile exact launch scope.
5. Phase 22 Product Experience: navigation, personalization, progressive access, design-system consistency, accessibility, SEO/performance and cross-product experience.
6. P23/P24: route-by-route Admin/Public capability, truthfulness, SEO/i18n/search and owner-domain enforcement.
7. Security: Authentication/Authorization/CSRF/SSRF/files/secrets/injection/rate limits/PII/privileged operations.
8. Prisma/migrations: schema↔migration parity, FK/unique/index/delete/default/nullability/enums/recovery.
9. Events/workers/jobs: all producers/consumers/schedulers/retries/leases/DLQ/shutdown/multi-instance behavior, including Phase 17 async execution.
10. File-by-file closure: active vs historical docs/scripts, broken paths, generated/dummy authority, dead/orphan code, TODO/FIXME/HACK, duplicates.
11. Final reconciliation: merge duplicate root causes, freeze the final finding count/repair dependency graph and only then transition to remediation.

---

## Repository Completion Audit — Reconciliation + Identity Foundation Forensic Pass (v0.29 — 2026-09-06)

**Frozen repository baseline:** `0931c5664cf274cb2b8f4cb250dd09ebf2e9a77f`  
**Audit mode:** READ-ONLY SOURCE AUDIT — no production/source repair executed.  
**Decision:** `SOURCE_NOT_COMPLETE — AUDIT_IN_PROGRESS`

### Duplicate-Finding Reconciliation

The audit register preserves discovery history, but confirmed-finding totals must count root findings only once. The following later IDs are retained as evidence aliases/addenda and are **not independently counted**:

- `MNT-AUD-0038` → duplicate/root-equivalent of `MNT-AUD-0011` (P05 production Asset storage/malware/sanitization provider plane missing).
- `MNT-AUD-0039` → duplicate/root-equivalent of `MNT-AUD-0012` (P06 durable production raw-snapshot/provenance store missing).
- `MNT-AUD-0053` → duplicate/evidence addendum to `MNT-AUD-0002` (Node runtime baseline documentation drift).

These IDs are not deleted so the forensic discovery trail remains auditable. Remediation and closure must be recorded against the canonical root IDs above.

### MNT-AUD-0056 — P1 HIGH — Active Identity Provisioning and DTO Mapping Bypass TypeScript Verification with `@ts-nocheck`
**Categories:** IDENTITY / TYPE_SAFETY / QUALITY / SOURCE_CLOSURE / TEST

**Evidence:**
- `packages/application/src/identity/ProvisionIdentityUseCase.ts` begins with `// @ts-nocheck`.
- `packages/application/src/identity/mapper.ts` also begins with `// @ts-nocheck`.
- The provisioning use case is not dead/legacy source: it is exported from the application package, composed in the API DI container, consumed by `IdentityRouter`, and exercised by identity/admin audit tests.
- The Phase 05 source already documents removal of `@ts-nocheck` as the expected type-safety direction for application-layer slices, yet the Identity critical path remains excluded.
- Canonical CI typecheck therefore cannot prove the correctness of this active identity provisioning/mapping path.

**Impact:**
- Type drift between Identity domain aggregates, repository contracts, DTO mapping and API composition can remain hidden while repository-wide typecheck reports success.
- A critical account/identity creation path sits outside the static verification contract used as Source Closure evidence.
- Refactors to Identity/User/Profile/ContactRegistry can break runtime behavior without a TypeScript compile failure in these files.

**Required remediation:**
1. Remove `@ts-nocheck` from both Identity application files.
2. Correct all resulting type errors at the actual contract boundary rather than replacing the suppression with `any`/`@ts-ignore`.
3. Make DTO mapping exhaustive and strictly typed for human/non-human Identity variants.
4. Add a source guard that rejects `@ts-nocheck` under active `apps/**` and `packages/**` except explicitly governed generated code.
5. Add compile-contract/unit tests for provisioning + mapping + repository save behavior and preserve current admin mutation audit coverage.

**Repair Wave:** W1 / W6 / W7  
**Status:** OPEN — IDENTITY_CRITICAL_PATH_TYPECHECK_BYPASS

### MNT-AUD-0057 — P2 MEDIUM — Persisted Domain/Public Identifiers Still Use `Math.random()` Instead of a Governed Identifier Generator
**Categories:** IDENTITY / DOMAIN_MODEL / DATA_INTEGRITY / IDENTIFIER / QUALITY

**Evidence:**
- `packages/core/src/domain/Entity.ts` creates default entity IDs from `Math.random().toString(36).substring(...)`.
- Active Identity provisioning constructs `User` and related entities without injecting governed IDs, so the default generator participates in real persisted identity graphs.
- The Identity aggregate also contains `Math.random()`-based identifier generation.
- Additional active business code, including scholarship public-ID creation, also uses `Date.now()` + `Math.random()` patterns, showing this is not isolated test-only behavior.
- The database uses application-provided string IDs for these records rather than supplying a universal database UUID default.

**Impact:**
- Persisted identifiers have weaker and inconsistent entropy/format guarantees than UUID/ULID/CSPRNG-based identifiers.
- Collision behavior and identifier predictability are not governed uniformly across domains.
- Cross-domain references, auditability and future sharding/import/reconciliation become harder when identifier semantics vary by implementation.

**Required remediation:**
1. Establish one canonical ID generation contract for persisted entities/public IDs (for example UUIDv4/UUIDv7 or an approved ULID strategy using cryptographic randomness).
2. Inject/centralize the generator at the Core/Domain boundary; do not use `Math.random()` for persisted IDs.
3. Classify which public IDs require opaque/unpredictable values versus stable human-readable references.
4. Preserve existing IDs; migration should change generation for new records without rewriting historical foreign keys unless explicitly required.
5. Add format/uniqueness/property tests and a source guard against `Math.random()` in persisted-ID constructors/commands.

**Repair Wave:** W1 / W2 / W6  
**Status:** OPEN — UNGOVERNED_NON_CRYPTO_PERSISTED_IDENTIFIER_GENERATION

### Live Register Update — v0.29 (2026-09-06)

- Registered finding IDs allocated: **57** (`MNT-AUD-0001` → `MNT-AUD-0057`).
- Duplicate/evidence-alias IDs excluded from canonical count: **3** (`0038`, `0039`, `0053`).
- **Canonical unique confirmed findings: 54**
- Severity (canonical unique): **P0: 0 | P1: 41 | P2: 12 | P3: 1 | P4: 0**
- New canonical findings in this pass: `MNT-AUD-0056`, `MNT-AUD-0057`.
- No source/code repair has been executed.
- GitHub repository modification was attempted only through an isolated audit branch, but branch creation was denied by the connected GitHub integration (`403 Resource not accessible by integration`); the repository therefore remains unchanged.
- The authoritative working audit register is updated independently and preserves the frozen commit baseline.

### Audit continuation state after v0.29

Completed/extended in this continuation:
- Phase 17 asynchronous execution ownership forensic pass.
- Phase 18 executable registry/runtime boundary spot-check and hidden runtime contract evidence.
- Phase 19 provider reality check against existing finance finding.
- Phase 21 Career/Alumni scope-to-source forensic comparison.
- Admin authentication/AI privileged gateway route guard check.
- P05 Identity type-safety and identifier-generation forensic pass.
- Duplicate-finding reconciliation for three confirmed duplicate root causes.

Still mandatory before remediation begins:
1. Finish P20 service lifecycle route-by-route parity against Phase 20 canonical contracts.
2. Finish P22 Product Experience source/UI/accessibility/SEO/performance parity.
3. Finish P23 Admin every-route/every-capability matrix and mutation/audit/permission coverage.
4. Finish P24 public every-route/data-source/pagination/filter/locale/SEO relationship matrix.
5. Finish cross-cutting Security deep audit (auth/session/cookies/CSRF/CORS/SSRF/uploads/secrets/webhooks/rate-limits).
6. Finish Prisma schema/migration/repository parity and greenfield migration-chain audit.
7. Finish Events/Outbox/Workers/Notifications/Async ownership and graceful-shutdown audit.
8. Finish Search/indexing consistency, refresh ownership and failure-mode audit.
9. Finish assets/media lifecycle + usage-registry cross-domain audit.
10. Finish Observability/Health/Readiness/Deployment/DR/backup-restore audit.
11. Finish tests/CI/verifier truthfulness and stale-reference sweep.
12. Finish documentation authority/reconciliation and file-by-file source inventory coverage.
13. Run final duplicate/root-cause reconciliation and only then freeze the remediation waves.


---

## Repository Completion Audit — P20/P22/P23/P24 + Runtime Readiness Forensic Pass (v0.30 — 2026-09-06)

**Frozen repository baseline:** `0931c5664cf274cb2b8f4cb250dd09ebf2e9a77f`  
**Audit mode:** READ-ONLY SOURCE AUDIT — no production/source repair executed.  
**Decision:** `SOURCE_NOT_COMPLETE — AUDIT_IN_PROGRESS`

### MNT-AUD-0058 — P1 HIGH — Phase 20 Owner Source Implements Only Catalog + Service Requests While Canonical Phase Scope Requires Packages, Bookings, Scheduling, Providers, Pricing, Discounts, Promotions and Workflow/Delivery Engines
**Categories:** PHASE20 / SERVICES / MISSING_IMPLEMENTATION / DOMAIN / APPLICATION / PERSISTENCE / WORKFLOW / BOOKING / PROVIDER / PRICING / SOURCE_CLOSURE

**Evidence:**
- Active Phase 20 domain contracts explicitly assign Phase 20 ownership of Services, Service Packages, Bookings, Scheduling, Providers, Pricing, Discounts, Promotions and Service Workflows.
- The active Phase 20 implementation blueprint specifies modules/repositories/application services for Package, Booking, Scheduling, Pricing, Discount, Promotion, Provider and Workflow, plus background workers for SLA monitoring, reminders and escalations.
- `packages/domain/src/services-platform/index.ts` currently exposes only the service catalog, service requests, reference gateway and finance gateway as the material owner-domain contract.
- `packages/application/src/services-platform/use-cases/` contains only Admin Catalog, Public Catalog and Service Request/Fulfillment use cases.
- `packages/infrastructure/src/services-platform/` contains only `PrismaServicePlatformRepository.ts`, `ServicePlatformGateways.ts` and the index barrel.
- Repository-wide searches for the canonical `IServiceBooking` and `IServiceProvider` owner contracts find them in Phase 20 documentation but not in active owner implementation.
- The live request flow stores `providerReferenceId` as an unconstrained reference string, but no Phase 20 provider aggregate/repository exists to implement provider qualification, availability, capacity or assignment accountability defined by the phase.
- The current repository can transition a request through a small fixed status graph and link a Phase 19 invoice, but there is no configurable workflow engine, booking collision engine, package child-order orchestration, discount/promotion engine or delivery-quality acceptance model matching the active phase baseline.

**Impact:**
- Phase 20 cannot be classified source-complete against its own approved bounded-context contract.
- Published services can exist and requests can be created, but multiple core fulfillment capabilities promised by the phase are structurally absent rather than merely runtime-unverified.
- Provider accountability, immutable pricing, booking collision prevention, package fulfillment and workflow/SLA behavior cannot be guaranteed by the current owner source.
- P23/P24 may expose a partial Services experience while governance documents describe a complete Enterprise Services Platform.

**Required remediation:**
1. Reconcile the exact Phase 20 launch scope against the canonical architecture/domain/implementation documents.
2. If the documented scope remains authoritative, implement first-class aggregates/contracts for Package, Booking/Scheduling, Provider, Pricing/Discount/Promotion and Workflow/Execution/Delivery.
3. Add corresponding Prisma models/migrations/repositories and governed application services.
4. Enforce provider qualification/capacity/availability, booking collision/timezone rules, pricing immutability and package parent-child fulfillment invariants.
5. Integrate delivery artifacts exclusively through Phase 05 EAP `assetId` handles and usage registration.
6. Add SLA workers/escalations and health/readiness ownership for all asynchronous fulfillment functions.
7. Add Admin/Public/Student flows only through Phase 20 owner APIs; do not create UI-local shadow business models.
8. Expand source and real-DB/E2E closure gates to cover every retained in-scope sub-capability.
9. If capabilities are formally deferred, downgrade/rewrite Phase 20 canonical documentation and status reports so they no longer claim them as implemented Production Ready scope.

**Repair Wave:** W1 / W2 / W3 / W4 / W5 / W6 / W7  
**Status:** OPEN — PHASE20_OWNER_SCOPE_MATERIALLY_PARTIAL

### MNT-AUD-0059 — P2 MEDIUM — Phase 20 Admin UI Uses Service Enums That Do Not Match the Domain/API Contract and Exposes Values the API Rejects
**Categories:** PHASE20 / P23 / ADMIN / CONTRACT_DRIFT / ENUM / API / UX / TEST

**Evidence:**
- `ServicesAdminPage.tsx` defines category values including `AUXILIARY_PROFESSIONAL_SERVICES` and `ENTERPRISE_OPERATIONAL_SERVICES`, while the owner-domain `ServiceCategory` enum defines `PROFESSIONAL_SERVICES` and `ENTERPRISE_SERVICES`.
- The Admin page defines fulfillment values including `BOOKING_OR_APPOINTMENT`, `DIGITAL_DELIVERABLE`, `MANUAL_FULFILLMENT` and `HYBRID_WORKFLOW`; the owner-domain enum instead defines `BOOKING`, `APPLICATION_SUPPORT` and `MANAGED_SERVICE` in addition to Consultation/Document Processing.
- The Admin page includes availability/status values such as `COMING_SOON`, `LIMITED` and `IMPORTED` that do not match the active owner-domain enums.
- `ServiceAdminRouter` validates request/query payloads with `z.nativeEnum(ServiceCategory)`, `z.nativeEnum(ServiceFulfillmentType)`, `z.nativeEnum(ServiceAvailabilityStatus)` and `z.nativeEnum(ServiceStatus)` from `@manaratak/domain`.
- Therefore the Admin form can offer values that are invalid at the authoritative API boundary and will fail validation when submitted.
- No source-level Admin/API contract test was found that imports the domain enums into the Admin page or checks every selectable value against the API schema.

**Impact:**
- Administrators can select legitimate-looking options in the canonical Admin UI that the API rejects with validation errors.
- Existing records using owner-domain values can be displayed through a UI whose local type union does not faithfully model the returned contract.
- P23 is not contract-safe for Phase 20 management even within the currently implemented subset.

**Required remediation:**
1. Remove duplicated local enum/type definitions from `ServicesAdminPage.tsx`.
2. Consume shared generated/API contracts or a stable shared presentation DTO derived from the Phase 20 owner contract.
3. Add explicit mapping only where presentation labels differ from domain values; never invent alternate API enum values in the UI.
4. Add Admin integration tests that iterate every selectable category/fulfillment/availability/status value and prove API acceptance.
5. Add a source contract guard preventing Phase 20 Admin enum drift.

**Repair Wave:** W5 / W6 / W7  
**Status:** OPEN — PHASE20_ADMIN_API_ENUM_CONTRACT_DRIFT

### MNT-AUD-0060 — P1 HIGH — Phase 20 Domain Events Are Declared but Service Catalog/Request Mutations Do Not Publish Them Through the Transactional Outbox/Event Foundation
**Categories:** PHASE20 / EVENTS / OUTBOX / INTEGRATION / NOTIFICATIONS / AUDIT / RELIABILITY / SOURCE_CLOSURE

**Evidence:**
- The active Phase 20 source declares event contracts such as `ServiceRequestedEvent`, `ServiceFulfillmentStatusChangedEvent`, `ServiceProviderAssignedEvent` and `ServiceFinanceInvoiceLinkedEvent`.
- Repository-wide searches for these event names find their declarations but no runtime producer/dispatcher usage outside the domain definition.
- `StudentServiceRequestUseCases` and `AdminServiceFulfillmentUseCases` call the service repository directly for request creation, status transition, provider assignment and finance-invoice linkage.
- `PrismaServicePlatformRepository` writes catalog/request state directly through Prisma and contains no transactional outbox append/event persistence for those mutations.
- Phase 20 documentation requires domain events for booking/assignment/execution/delivery and states that customer notifications, read models and operational consumers are driven from service state transitions.
- The repository already contains a Core Enterprise Event / Transactional Outbox foundation, so the absence is not an architectural inability; it is missing Phase 20 producer wiring.

**Impact:**
- Phase 20 state can change without a durable integration event describing the change.
- Notifications, customer-engagement projections, SLA/escalation consumers and cross-phase integrations cannot depend on a guaranteed event stream.
- A database write may succeed while downstream consumers permanently miss the transition.
- Declaring event interfaces gives false source-closure confidence without transactional publication semantics.

**Required remediation:**
1. Define the canonical Phase 20 event catalog and map every material state mutation to an event.
2. Persist state mutation + outbox event atomically in one database transaction.
3. Use stable event IDs, aggregate/version metadata, correlation/causation IDs and governed payload versions.
4. Add idempotent consumers/retry/DLQ semantics for notification/read-model/integration consumers.
5. Verify provider assignment, financial clearance, workflow progression, delivery and cancellation events end-to-end.
6. Add real PostgreSQL tests proving rollback atomicity and outbox delivery behavior.
7. Extend source-closure and CI gates to fail when event declarations have no producer wiring.

**Repair Wave:** W2 / W3 / W4 / W6 / W7  
**Status:** OPEN — PHASE20_EVENTS_DECLARED_WITHOUT_DURABLE_PRODUCERS

### MNT-AUD-0061 — P1 HIGH — `/compare` Public Route Is Declared but Has No Phase 22/24 Comparison Experience Implementation
**Categories:** PHASE22 / PHASE24 / PRODUCT_EXPERIENCE / PUBLIC / ROUTING / COMPARE / MISSING_IMPLEMENTATION / SOURCE_CLOSURE

**Evidence:**
- Phase 22 defines `Compare Opportunities` as a core user objective.
- Phase 22's mandatory Educational Discovery Journey explicitly requires `Discover -> Browse -> Search -> Filter -> Compare -> View Details -> Save -> Continue`.
- The Search Journey also specifies comparison as a comparative decision-support matrix.
- `apps/web/src/router/index.tsx` declares `path: 'compare'` and renders `PublicTemplateApp` for it; public route tests also expect the route to exist.
- `PublicTemplateApp.tsx` has direct route hydration branches for login, student, search, scholarships, universities, majors, courses, articles, services, international tests, countries, careers and tools, but no branch for `section === 'compare'`.
- Searching the full active `PublicTemplateApp.tsx` source for `compare` returns no match, and repository search finds no `ComparePage` implementation.
- Unknown public sections are intentionally left untouched by `PublicTemplateApp`, so `/compare` is a declared shell route without the required comparison state/composition.

**Impact:**
- A core Phase 22 decision-support objective is not implemented in the public product experience.
- The canonical `/compare` URL can resolve at the React router level while failing to produce a comparison experience.
- Route-presence tests can pass despite missing route behavior, creating a false-positive source-closure signal.
- Phase 22 and Phase 24 must be classified PARTIAL until the compare journey is implemented or formally removed from scope.

**Required remediation:**
1. Define the canonical comparison scope: supported entity types, maximum items, comparable attributes, locale behavior and stable URL/query-state contract.
2. Implement a Phase 24 public Compare composition consuming only owner-domain public DTOs/read models.
3. Preserve context from search/detail pages and support add/remove/share/deep-link behavior without synthetic facts.
4. Add loading/empty/unavailable/error states and mobile/RTL/accessibility behavior.
5. Add router integration/E2E tests proving `/ar/compare` and `/en/compare` hydrate the intended experience, not merely match a route.
6. Add Phase 22 journey acceptance tests covering Search -> Compare -> Detail -> return-context continuity.

**Repair Wave:** W5 / W6 / W7  
**Status:** OPEN — DECLARED_COMPARE_ROUTE_HAS_NO_PRODUCT_EXPERIENCE

### MNT-AUD-0062 — P1 HIGH — Privileged Phase 17 `/api/v1/ai` Gateway Is Mounted Behind Permission Evaluation Without an Authentication Guard and Is Unreachable in Real App Composition
**Categories:** PHASE17 / P23 / SECURITY / AUTHENTICATION / AUTHORIZATION / API / ROUTING / TEST_GAP / SOURCE_CLOSURE

**Evidence:**
- `app.ts` mounts `/admin/*` under `createAdminGuard(...)`, which authenticates tokens/cookies and sets `req.authUserId` before permission evaluation.
- The separate privileged AI operator gateway is mounted as `v1Router.use('/ai', requireAdminPermission('admin:ai:manage'), lazyRouter('aiGatewayRouter'))` outside the `/admin` guard boundary.
- `createAdminPermissionGuard()` does not parse or verify an access token. It reads `req.authUserId` and immediately returns `401 ADMIN_AUTH_REQUIRED` if that value is absent.
- No global middleware before the `/ai` mount authenticates an admin access token into `req.authUserId`.
- `AIGatewayRouter` independently requires `req.authUserId` through its `actor(req)` helper, confirming that an authenticated principal is expected.
- `AIGatewayRouter.spec.ts` hides the composition defect by inserting a test-only middleware that directly sets `req.authUserId = 'admin-1'` before mounting the router.
- Therefore router-unit tests pass while the actual `createApiApp()` composition cannot establish the principal needed by the permission guard on `/api/v1/ai`.

**Impact:**
- The privileged AI operator execution/submission/read/cancel gateway is effectively inaccessible through the canonical application composition.
- Permission-only middleware is being used as if it were authentication middleware, violating the intended authn->authz ordering.
- Existing tests do not exercise the production route composition and therefore provide false confidence.

**Required remediation:**
1. Move the operator gateway under `/admin/ai/...` or explicitly compose `createAdminGuard()` before its permission guard.
2. Preserve strict persisted RBAC and active-session/identity validation consistent with other privileged control-plane routes.
3. Ensure Admin mutation audit covers AI execution/cancel operations where required by governance.
4. Add `createApiApp()` integration tests using real access-token/cookie middleware, covering unauthenticated 401, authenticated/unauthorized 403 and authorized success.
5. Remove test-only principal injection as the sole evidence for gateway accessibility.
6. Add an architecture/source guard that rejects privileged `requireAdminPermission(...)` mounts outside an authentication boundary unless an explicit authenticated upstream contract is proven.

**Repair Wave:** W1 / W3 / W6 / W7  
**Status:** OPEN — AI_PRIVILEGED_GATEWAY_MISSING_AUTHENTICATION_COMPOSITION

### MNT-AUD-0063 — P1 HIGH — Readiness Semantics Force Redis to Optional Even When Production Registration Marks It Required, Allowing a Runtime Redis Outage to Report Overall READY
**Categories:** OBSERVABILITY / READINESS / REDIS / RELIABILITY / OPERATIONS / CI / FALSE_CLOSURE

**Evidence:**
- In production/staging, `app.ts` registers the Redis health indicator with `isOptional: !isProductionOrStaging`, which evaluates to `false`; the application bootstrap also treats Redis initialization failure as fatal in production-like runtime.
- `MonitoringService.getReadiness()` overrides the indicator contract with `const isOptional = indicator.isOptional || name === 'redis' || name === 'cache'`.
- Consequently an indicator named `redis` is always considered optional even when it was explicitly registered as required.
- When an optional indicator returns `DOWN`, `getReadiness()` rewrites the detail to `DEGRADED` and does not change `overallStatus` from `UP`.
- The final health/readiness source-closure document claims `HEALTH_READINESS_SOURCE_CLOSURE = 63/63 PASS`.
- `verify-health-readiness-source-closure.mjs` checks that a Redis probe exists, but does not test or statically assert that production-required Redis failure drives overall readiness to `DOWN`.

**Impact:**
- A production instance that started successfully can lose Redis later and continue returning overall readiness `UP` despite the runtime contract treating Redis as required.
- Load balancers/orchestrators can continue routing traffic to a node whose queue/distributed-state dependency is unavailable.
- The repository's 63/63 health source-closure claim does not prove readiness semantics, only probe/route/source presence for this case.

**Required remediation:**
1. Remove hard-coded name-based optionality from `MonitoringService`; respect the registered `indicator.isOptional` policy.
2. Define environment/runtime-specific dependency criticality in one canonical composition policy.
3. In production-like mode, make loss of required Redis return readiness `DOWN` / HTTP 503 while liveness remains independently evaluated.
4. Apply the same semantic review to background-jobs, notification, payment and other probes so required capabilities cannot remain optional by accident.
5. Add regression tests for production Redis `UP -> DOWN` transition and overall readiness response.
6. Extend `verify-health-readiness-source-closure.mjs` to verify semantic criticality rather than probe name presence only.
7. Amend the health closure report until the runtime behavior is proven.

**Repair Wave:** W3 / W4 / W6 / W7  
**Status:** OPEN — READINESS_MASKS_REQUIRED_REDIS_FAILURE

### Phase Classification Update — v0.30

| Phase / Cross-Cutting Area | Updated Audit Classification | Primary evidence |
|---|---|---|
| P17 Enterprise AI Platform | **PARTIAL** | `MNT-AUD-0054`, `MNT-AUD-0062` |
| P20 Enterprise Services | **PARTIAL** | `MNT-AUD-0058`, `MNT-AUD-0059`, `MNT-AUD-0060` |
| P21 Career & Alumni | **PARTIAL** | `MNT-AUD-0055` |
| P22 Enterprise Product Experience | **PARTIAL** | `MNT-AUD-0061` plus delegated-phase findings |
| P23 Administration Portal | **IN_AUDIT / PARTIAL EVIDENCE** | Existing IAM/Audit/Review findings + `MNT-AUD-0059`, `MNT-AUD-0062` |
| P24 Enterprise Public Platform | **PARTIAL** | Existing P24 findings + `MNT-AUD-0061` |
| Health / Readiness | **PARTIAL** | `MNT-AUD-0063` |

### Live Register Update — v0.30 (2026-09-06)

- Registered finding IDs allocated: **63** (`MNT-AUD-0001` → `MNT-AUD-0063`).
- Duplicate/evidence-alias IDs excluded from canonical count: **3** (`0038`, `0039`, `0053`).
- **Canonical unique confirmed findings: 60**
- Severity (canonical unique): **P0: 0 | P1: 46 | P2: 13 | P3: 1 | P4: 0**
- New canonical findings in this pass: `MNT-AUD-0058` through `MNT-AUD-0063`.
- No source/code repair, migration, backfill, seed, database mutation or production runtime change has been executed.
- Frozen audit baseline remains `0931c5664cf274cb2b8f4cb250dd09ebf2e9a77f`.
- Project decision remains: **SOURCE_NOT_COMPLETE — AUDIT_IN_PROGRESS**.

### Next mandatory continuation after v0.30
1. Finish P23 every-page/every-route capability matrix, including frontend permission visibility vs backend RBAC, mutation audit and owner-domain parity.
2. Finish P24 every-route matrix beyond Compare: deep links, owner DTOs, pagination, filters, locale, SEO, canonical relationships, unavailable/empty behavior and accessibility.
3. Finish cross-cutting Security deep audit: auth/session/refresh/logout/revocation, CSRF/CORS, SSRF/import fetch, upload/content handling, secrets, privileged operations and rate limiting.
4. Finish Prisma schema/migration/repository parity and greenfield migration replay proof.
5. Finish Events/Outbox/Workers/Notifications across every owner domain, not only P17/P20.
6. Finish Search/index lifecycle, refresh ownership, consistency and multi-instance/failure semantics.
7. Finish Asset/media usage-registry, purge, versioning, consumer integrity and lifecycle semantics.
8. Finish Observability/Deployment/DR/backup-restore, including all readiness criticality semantics and graceful shutdown.
9. Finish tests/CI/verifier truthfulness, stale path/reference and integration-composition gaps.
10. Finish documentation authority + file-by-file source inventory, then final duplicate/root-cause reconciliation before remediation begins.

---

## Repository Completion Audit — P23 Permission-Aware UI + Security/P18 Reconciliation (v0.31 — 2026-09-06)

### MNT-AUD-0064 — P2 MEDIUM — Phase 23 Admin SPA Grants the Entire Frontend Control Plane After Detecting Any `admin:*`-Scoped Permission and Does Not Make Navigation/Routes Permission-Aware
**Categories:** PHASE23 / ADMIN / RBAC / LEAST_PRIVILEGE / FRONTEND_AUTHORIZATION / UX / ROUTING / TEST_GAP

**Evidence:**
- `apps/admin/src/App.tsx` calls `/auth/me` and considers the session authorized when `effectivePermissions` contains `*`, `admin:*`, or merely any permission whose value starts with `admin:`.
- After that single boolean gate succeeds, `AdminLayout` renders the full `<AdminNavigation />` and the complete route set for scholarships, universities, majors, courses, certificates, CMS, services, finance, careers, AI, student tools, settings, taxonomy, imports and health/readiness without a per-route permission check.
- `apps/admin/src/components/AdminNavigation.tsx` defines navigation items with only route/label/icon metadata; it has no required-permission field and renders every group/item unconditionally.
- The backend is materially stricter: privileged domain routers are composed with granular `requireAdminPermission(...)` checks. Therefore backend authorization remains the authority, but the canonical Phase 23 UI does not reflect the same least-privilege model.
- This is distinct from `MNT-AUD-0020` (missing IAM/RBAC management workspaces): the defect here is permission-aware consumption of existing RBAC in the canonical Admin SPA.

**Impact:**
- An operator who legitimately owns one narrow administrative permission can see navigation and controls for unrelated privileged domains and then encounter backend 403 responses.
- The UI violates least-privilege expectations and makes role design operationally confusing even where the backend correctly rejects unauthorized mutations.
- Frontend route discovery exposes the full control-plane information architecture to every authenticated admin-scoped principal instead of presenting only authorized workspaces.
- There is no frontend role/permission matrix regression evidence proving that distinct operators receive distinct navigation/action surfaces.

**Required remediation:**
1. Persist the `/auth/me` effective permission set in a canonical Admin auth/session context rather than collapsing it to a single `authorized` boolean.
2. Define a required-permission contract for every Phase 23 navigation item, route and privileged action, aligned with the backend route permission.
3. Filter or disable navigation/actions by effective permission and add direct-route guards so manual URL entry receives a clear access-denied state.
4. Keep backend RBAC as the authoritative security boundary; frontend filtering is defense-in-depth and correct operator UX, not a replacement for server authorization.
5. Add role-matrix E2E/integration tests covering at least read-only reviewers, domain editors, publishers, platform operators and super-admin behavior.
6. Add a verifier that detects Admin routes/navigation entries without an explicit frontend permission contract unless the route is intentionally common to all admins.

**Repair Wave:** W1 / W6 / W7  
**Status:** OPEN — P23_ADMIN_UI_NOT_PERMISSION_AWARE

### Security Deep-Audit Result — Phase 06 SSRF / Source Acquisition

No new finding was registered for SSRF/source acquisition in this pass.

**Verified source controls:**
- `NodeSafeSourceHttpTransport` is a real network transport, not a documentation-only contract.
- Source network access is HTTPS-only and blocks embedded URL credentials.
- `SourceNetworkSecurityPolicy` constrains requests to source-owned allowed origins/path prefixes and supports controlled subdomain policy.
- Hostnames are DNS-resolved and every resolved address must pass `PublicNetworkAddressPolicy`; private/non-public address resolution is rejected.
- The request executor pins the validated address while preserving the hostname for TLS SNI, mitigating DNS rebinding between validation and connection.
- Redirect targets are reconstructed and revalidated through the same security policy before the next request.
- Response size, redirect count and timeout are bounded by hard limits.

**Audit decision:** `SSRF_SOURCE_ACQUISITION_CONTROL = SOURCE_PRESENT / NO_NEW_FINDING`

### Phase 18 Student Tools Reconciliation

No new Phase 18 scope finding was registered in this pass.

**Verified scope truthfulness:**
- The Phase 18 source-closure report explicitly states that the official registry contains 83 definitions but only four are implemented/executable.
- The remaining definitions are explicitly planned/admin-only and cannot execute; the closure report does not falsely claim that all 83 tools are runnable.
- The implementation guide defines priority-based onboarding (`P1_CORE_LAUNCH`, then expansion priorities), supporting incremental tool delivery rather than silently treating planned entries as implemented functionality.
- Runtime/Google Studio evidence remains explicitly pending and therefore must not be upgraded to production/runtime closure during final reconciliation.

**Audit decision:** `P18_PLATFORM_SOURCE_SCOPE = NO_NEW_SOURCE_FINDING; RUNTIME_PROOF_STILL_PENDING`

### Live Register Update — v0.31 (2026-09-06)

- Registered finding IDs allocated: **64** (`MNT-AUD-0001` → `MNT-AUD-0064`).
- Duplicate/evidence-alias IDs excluded from canonical count: **3** (`0038`, `0039`, `0053`).
- **Canonical unique confirmed findings: 61**
- Severity (canonical unique): **P0: 0 | P1: 46 | P2: 14 | P3: 1 | P4: 0**
- New canonical finding in this continuation: `MNT-AUD-0064`.
- Phase 06 SSRF/source-acquisition controls were positively verified; no security finding was manufactured where source controls exist.
- Phase 18 incremental tool scope was reconciled against its source-closure report; no additional scope finding was added in this pass.
- No source/code repair, migration, backfill, seed, database mutation or production runtime change has been executed.
- Frozen audit baseline remains `0931c5664cf274cb2b8f4cb250dd09ebf2e9a77f`.
- Project decision remains: **SOURCE_NOT_COMPLETE — AUDIT_IN_PROGRESS**.

### Next mandatory continuation after v0.31
1. Complete remaining P23 route/action matrix, especially mutation-audit coverage and missing owner-domain administrative surfaces.
2. Complete P24 route-by-route deep-link/locale/SEO/filter/pagination/accessibility matrix beyond already-proven Compare and search defects.
3. Reconcile every transactional-outbox producer/consumer pair and runtime scheduler across domain phases.
4. Complete observability/deployment/graceful-shutdown and multi-instance failure semantics without duplicating `MNT-AUD-0040`/`0063`.
5. Complete CI/verifier truthfulness and final file-by-file documentation/source authority reconciliation.

---

## Repository Completion Audit — Control-Plane Session Integrity + DR/Backup + Local Admin Safety (v0.32 — 2026-09-06)

### MNT-AUD-0065 — P1 HIGH — Non-`/admin` Control-Plane Routes Authenticate Without Session-Revocation or Active-Identity Validation
**Categories:** SECURITY / AUTHENTICATION / SESSION / REVOCATION / IDENTITY / CONTROL_PLANE / P05 / P23 / ROUTING

**Evidence:**
- `apps/api/src/app.ts` defines the shared `protectControlPlane(permission, routerName)` chain for privileged routes such as `/authorization`, `/settings`, `/files`, `/notifications`, `/cache`, `/background-jobs`, `/workflows`, `/api-services`, `/shared-components` and `/enterprise-events`.
- That helper invokes `SecurityMiddlewareFactory.createAdminGuard({ mode: adminAuthMode, tokenProvider: adminTokenProvider })` but does **not** pass the already-resolved `adminSessionManager` or `adminIdentityRepository`.
- The same composition root mounts canonical `/admin/*` with `createAdminGuard({ mode, tokenProvider, sessionManager, identityRepository })`, demonstrating that those two dependencies are available and are part of the intended strict boundary.
- `SecurityMiddlewareFactory.createAdminGuard()` accepts a verified access token when `!options.sessionManager` is true, so a token carrying a `sessionId` is not checked against `isSessionActive(...)` when the helper omits the session manager.
- The guard also performs lifecycle/access-state validation only when `options.identityRepository` is present; when omitted, suspended/archived/inactive identity/account state is not rechecked at the route boundary.
- Global CSRF protection remains present and correctly protects cookie-authenticated unsafe methods; this finding is specifically about session revocation and identity/account activity, not CSRF.

**Impact:**
- A cryptographically valid access token belonging to a server-revoked session can remain accepted on the affected control-plane routes until token expiry.
- Identity/account suspension or archival may not immediately cut off those routes when the token remains otherwise valid.
- Security semantics differ between `/admin/*` and compatibility/control-plane paths even though both expose privileged capabilities and are documented as belonging to one strict boundary.
- Mutation audit and RBAC do not compensate for stale authentication state; authorization is evaluated for a principal that should first have been rejected as inactive/revoked.

**Required remediation:**
1. Make `protectControlPlane()` pass the same `sessionManager` and `identityRepository` used by canonical `/admin/*`.
2. Prefer one reusable strict admin-authentication composition primitive so privileged mounts cannot accidentally omit session/identity validation.
3. Define a deliberate policy for bearer/service clients if stateless bearer access is still needed; do not obtain that behavior accidentally by omitting dependencies.
4. Add `createApiApp()` integration tests proving revoked sessions and inactive identities receive 401 on every protected compatibility/control-plane route.
5. Add a source guard that fails when `createAdminGuard()` is used for privileged routes without the canonical strict dependency set unless an explicit approved exception is declared.
6. Reconcile P05/P23 security documentation and route matrices with the final single authentication contract.

**Repair Wave:** W1 / W3 / W6 / W7  
**Status:** OPEN — CONTROL_PLANE_SKIPS_SESSION_AND_IDENTITY_REVALIDATION

### Security Deep-Audit Result — CSRF/CORS Baseline

No new CSRF/CORS finding was registered in this pass.

**Verified controls:**
- `createApiApp()` installs `SecurityMiddlewareFactory.createCsrfGuard(securityService)` globally before API routers.
- Unsafe cookie-authenticated requests require `x-csrf-token`; safe GET/HEAD/OPTIONS methods are exempt.
- Bearer-only requests are allowed without CSRF because they do not use ambient cookie credentials.
- Production/staging configuration rejects wildcard `CORS_ORIGIN='*'` and requires a specific HTTPS origin.

**Audit decision:** `CSRF_CORS_BASELINE = SOURCE_PRESENT / NO_NEW_FINDING`

### MNT-AUD-0066 — P1 HIGH — Production Disaster-Recovery / Backup Strategy Is Not Source-Implemented Beyond a Narrow Manual Imported-Course Rehearsal
**Categories:** DEVOPS / DISASTER_RECOVERY / BACKUP / RESTORE / RPO / RTO / DATABASE / ASSETS / OPERATIONS / SOURCE_CLOSURE

**Evidence:**
- The active deployment strategy requires hourly transaction-log protection, daily full backups, weekly/monthly archives, encryption at rest, one-year archive retention, and automated weekly restoration audits; it also declares RPO/RTO targets.
- Repository workflow inventory under `.github/workflows` contains CI, imported-course source closure, security and architecture-guard workflows only; no scheduled backup or restore-audit workflow/source entry exists.
- `scripts/wp-ic-10-db-backup-restore.sh` provides a guarded PostgreSQL dump/restore rehearsal, but it is designed for disposable/test-looking databases and is scoped to the imported-course closure path.
- `docs/operations/postgresql-backup-restore-runbook.md` is explicitly an Imported Courses runbook. It requires an operator to store the backup in an approved encrypted location but does not implement or configure that encrypted storage, retention, rotation or scheduling.
- The runbook's restore verification compares a narrow imported-course set (`_prisma_migrations`, provider/course/import tables), not all persisted MANARATAK bounded contexts.
- The imported-course GitHub workflow explicitly states database integration, backup/restore and runtime smoke are not executed there and remain deferred to a future runtime environment.
- No source evidence was found for coordinated backup of Asset Platform binaries/media, configuration/state required for recovery, cross-domain consistency points, point-in-time recovery orchestration, automated restore drills, RPO/RTO measurement or failover rehearsal.

**Impact:**
- The repository cannot currently demonstrate recoverability of the whole platform from a production data-loss incident.
- A PostgreSQL-only imported-course rehearsal does not protect or restore the complete relational domain model, media assets or other required durable state.
- RPO/RTO values are architecture assertions rather than executable/rehearsed operational guarantees.
- Source Complete / Production Ready cannot be declared while backup generation, retention, encryption, restoration validation and recovery objectives depend on unspecified future infrastructure implementation.

**Required remediation:**
1. Define the authoritative production backup ownership model for PostgreSQL, asset/object storage and any additional durable state.
2. Implement provider-neutral source/configuration for scheduled backups or formal managed-provider backup contracts with verifiable configuration/readiness checks.
3. Define retention tiers, encryption/KMS ownership, immutable/offline protection where appropriate, access audit and deletion policy.
4. Implement a whole-platform disposable restore drill that replays database state and validates every persisted bounded context plus asset/reference integrity, not only imported courses.
5. Add automated scheduled restore-audit execution in the chosen infrastructure layer and store immutable evidence of each drill.
6. Measure and verify declared RPO/RTO; make unmet objectives a release/operations finding rather than documentation-only targets.
7. Add incident runbooks for point-in-time restore, regional failover, traffic cutover and rollback, with no destructive reset path.
8. Reconcile Phase 2 deployment strategy, operations runbooks, production-readiness gates and Google Studio/runtime handoff.

**Repair Wave:** W2 / W3 / W6 / W7  
**Status:** OPEN — PLATFORM_DR_BACKUP_RESTORE_AUTOMATION_NOT_SOURCE_COMPLETE

### Events / Outbox Reconciliation Result — This Pass

No generic duplicate finding was added for Events/Outbox in this pass.

**Reason:**
- Certificate completion has an explicit `CertificateCompletionOutboxWorker`, DI registration and opt-in scheduler in `server.ts`.
- Existing findings already capture the material unresolved async/event roots: BullMQ/background-worker architecture (`MNT-AUD-0007`), Notifications (`MNT-AUD-0034`), AI async execution (`MNT-AUD-0054`) and Services event publication (`MNT-AUD-0060`).
- Final event reconciliation must still prove every producer/consumer pair, but repeating those known root causes as one broad finding would inflate the register.

**Audit decision:** `EVENT_OUTBOX_GLOBAL_RECONCILIATION = IN_PROGRESS / NO_DUPLICATE_FINDING_ADDED`

### MNT-AUD-0067 — P2 MEDIUM — Canonical Admin `VITE_LOCAL_ADMIN_READ_ONLY` Mode Bypasses Frontend Authentication but Does Not Enforce a Read-Only Transport Boundary
**Categories:** P23 / ADMIN / LOCAL_PREVIEW / SAFETY / CONFIG / ROUTING / DOCUMENTATION_DRIFT / DEFENSE_IN_DEPTH

**Evidence:**
- `apps/admin/src/App.tsx` sets `adminAccess` directly to `authorized` whenever `VITE_LOCAL_ADMIN_READ_ONLY === 'true'`, bypassing `verifyAdminSession()` and the Admin login gate in the SPA.
- The root `.env.example` describes this switch as a local-only Admin preview and states that the Vite API bridge blocks non-read requests.
- The write-blocking Vite middleware actually exists in `apps/web/vite.config.ts`, where non-GET/HEAD/OPTIONS `/api` requests return 423 when the flag is true.
- The canonical Admin application is `apps/admin`, whose `apps/admin/vite.config.ts` contains no corresponding read-only API middleware/proxy guard.
- `apps/admin/src/api/client.ts` sends normal credentialed requests, including POST/PATCH mutation methods, to `VITE_API_BASE_URL || '/api/v1'`; the client itself does not enforce local read-only mode.
- Repository search shows only a small subset of Admin pages explicitly consult `VITE_LOCAL_ADMIN_READ_ONLY`; most canonical Admin workspaces do not consume that flag.
- Backend authentication/RBAC/CSRF still remain the authoritative security controls, so this does not create an unauthenticated production write bypass by itself. The defect is that the advertised local read-only safety contract is not actually enforced by the canonical Admin application.

**Impact:**
- A developer/operator can enable a mode labelled “read-only” while canonical Admin mutation controls remain capable of issuing writes whenever a valid backend session/API endpoint is available.
- The frontend login bypass and missing transport-level write block create misleading safety expectations during demos, local inspection and connected development environments.
- Safety behavior differs between the legacy/public Vite bridge and the actual Admin app, contradicting the stated single canonical Admin UI model.

**Required remediation:**
1. Decide whether local read-only preview remains a supported capability; if not, remove the switch from canonical Admin source and documentation.
2. If retained, enforce read-only at the canonical `apps/admin` transport/client boundary, not page-by-page UI conventions.
3. Reject all unsafe methods in local read-only mode before network transmission and show an explicit read-only state in mutation controls.
4. Never let this flag weaken backend authentication/RBAC; production/staging builds must fail or ignore the local-preview bypass.
5. Add tests proving every Admin mutation is blocked in local read-only mode while permitted safe reads behave as intentionally designed.
6. Reconcile `.env.example`, Admin Vite configuration and public/admin closure verifiers.

**Repair Wave:** W1 / W5 / W7  
**Status:** OPEN — CANONICAL_ADMIN_LOCAL_READONLY_NOT_ENFORCED

### Live Register Update — v0.32 (2026-09-06)

- Registered finding IDs allocated: **67** (`MNT-AUD-0001` → `MNT-AUD-0067`).
- Duplicate/evidence-alias IDs excluded from canonical count: **3** (`0038`, `0039`, `0053`).
- **Canonical unique confirmed findings: 64**
- Severity (canonical unique): **P0: 0 | P1: 48 | P2: 15 | P3: 1 | P4: 0**
- New canonical findings in this continuation: `MNT-AUD-0065`, `MNT-AUD-0066`, `MNT-AUD-0067`.
- CSRF/CORS controls were positively verified; no false security finding was added.
- Events/Outbox was reconciled against existing root-cause findings; no duplicate broad finding was added.
- No source/code repair, migration, backfill, seed, database mutation or production runtime change has been executed.
- Frozen audit baseline remains `0931c5664cf274cb2b8f4cb250dd09ebf2e9a77f`.
- Project decision remains: **SOURCE_NOT_COMPLETE — AUDIT_IN_PROGRESS**.

### Next mandatory continuation after v0.32
1. Finish P23 route/action matrix: every page/action ↔ backend permission ↔ auth/session boundary ↔ mutation audit ↔ owner domain.
2. Finish P24 route-by-route deep links, unavailable/empty/error behavior, locale, SEO, filtering/pagination and accessibility beyond known Compare/Search issues.
3. Finish transactional outbox/event producer-consumer matrix and prove no declared event is orphaned beyond already-open findings.
4. Finish production runtime lifecycle beyond existing `MNT-AUD-0040`: readiness drain ordering, worker lease/multi-instance behavior and startup/shutdown failure handling.
5. Finish DR source closure: backup scope, asset recovery, PITR, encryption/retention, restore evidence and RPO/RTO gates.
6. Finish CI/verifier truthfulness and file-by-file source/document authority reconciliation.
7. Perform final duplicate/root-cause reconciliation only after all audit axes are closed; remediation remains blocked until then.

---

## Repository Completion Audit — Multi-Instance Outbox Lease Correctness (v0.33 — 2026-09-06)

### MNT-AUD-0068 — P1 HIGH — Transactional Outbox Lease Ownership Can Be Lost Mid-Delivery and Stale Workers Can Overwrite Final State
**Categories:** EVENT_FOUNDATION / OUTBOX / CONCURRENCY / MULTI_INSTANCE / LEASE / IDEMPOTENCY / RELIABILITY / P05 / P14 / RUNTIME

**Evidence:**
- `PrismaTransactionalOutboxStore.claimPendingBatch()` leases records by setting `state=PROCESSING`, `claimedBy=workerId` and `claimUntil`, but no lease-renewal/heartbeat contract exists in the store or dispatcher.
- `TransactionalOutboxDispatcher.dispatchBatch()` computes one fixed lease end at claim time (`startedAt + claimDurationMs`) and then delivers the claimed entries sequentially. It never extends the lease while a long-running delivery is in progress.
- `CertificateCompletionOutboxWorker` uses a default `claimDurationMs` of only 30 seconds and can claim up to 25 records in one batch, creating a realistic path for later records in a batch—or slow downstream work—to cross the original lease deadline.
- Once the lease expires, another worker is allowed to reclaim the same record because the claim query explicitly accepts records whose `claimUntil < now`.
- `PrismaTransactionalOutboxStore.markProcessed(id, ...)` and `markFailed(id, ...)` update by record `id` only. They do not require the caller's `workerId`, do not check current `claimedBy`, and do not assert that the caller still owns an unexpired lease.
- Therefore a stale worker can mark a record `PROCESSED` or `FAILED` after another worker has already reclaimed it; conversely, a second worker that races a durable idempotent consumer can fail on a uniqueness/idempotency race and then unconditionally move an already-successful outbox record back to `FAILED`.
- The certificate consumer adds durable idempotency using `sourceEventId` / issuance inbox uniqueness, which reduces duplicate business issuance, but it does not protect the outbox row itself from stale-worker state corruption. The outbox abstraction is cross-cutting and cannot rely on every consumer implementing an identical race-safe inbox.
- Existing `TransactionalOutboxDispatcher.spec.ts` tests stable idempotency keys, backoff and max-attempt parking only. No source test covers concurrent workers, lease expiry during delivery, stale-owner completion/failure, lease renewal or compare-and-set ownership transitions. No dedicated `PrismaTransactionalOutboxStore` concurrency specification was found.

**Impact:**
- Multi-instance deployments can redeliver the same event after a lease expires while the original delivery is still active.
- Outbox state can be corrupted by a stale worker after ownership has moved, causing processed events to re-enter retry state or newer worker decisions to be overwritten.
- Retry counts and exhaustion state can become inaccurate, potentially parking successfully delivered events or creating repeated delivery loops.
- Consumer-level idempotency may prevent duplicate side effects for some consumers, but the event foundation itself does not currently provide a correct lease-ownership state machine for all domains.
- This blocks a reliable production claim for horizontally scaled workers and directly affects exactly-once-effect / at-least-once-delivery correctness guarantees.

**Required remediation:**
1. Make `markProcessed` / `markFailed` ownership-aware compare-and-set operations requiring `workerId` (and preferably lease/version) and reject stale owners.
2. Add an explicit lease-renewal/heartbeat operation for work that can exceed the claim duration, or claim/process bounded units whose maximum execution time is proven below the lease window.
3. Recheck ownership immediately before final state transition; never update a row solely by `id` from a worker context.
4. Define behavior when ownership is lost mid-delivery: the stale worker must not mutate durable outbox state after the loss is detected.
5. Add real PostgreSQL concurrency tests with two workers racing claim, lease expiry, reclaim, success and failure paths.
6. Add regression tests proving a stale worker cannot convert another worker's `PROCESSED` record to `FAILED`, cannot clear a newer lease, and cannot increment attempts after ownership loss.
7. Keep consumer idempotency/inbox constraints, but treat them as a second safety layer rather than a substitute for correct outbox leasing.
8. Reconcile the Event Foundation operational contract and any horizontal-scaling/runbook claims with the final lease semantics.

**Repair Wave:** W1 / W3 / W6 / W7  
**Status:** OPEN — OUTBOX_LEASE_OWNERSHIP_AND_STALE_WORKER_TRANSITIONS_UNSAFE

### Live Register Update — v0.33 (2026-09-06)

- Registered finding IDs allocated: **68** (`MNT-AUD-0001` → `MNT-AUD-0068`).
- Duplicate/evidence-alias IDs excluded from canonical count: **3** (`0038`, `0039`, `0053`).
- **Canonical unique confirmed findings: 65**
- Severity (canonical unique): **P0: 0 | P1: 49 | P2: 15 | P3: 1 | P4: 0**
- New canonical finding in this continuation: `MNT-AUD-0068`.
- Consumer-level certificate idempotency was verified as a positive control, but it does not close the shared outbox lease-ownership race.
- No source/code repair, migration, backfill, seed, database mutation or production runtime change has been executed.
- Frozen audit baseline remains `0931c5664cf274cb2b8f4cb250dd09ebf2e9a77f`.
- Project decision remains: **SOURCE_NOT_COMPLETE — AUDIT_IN_PROGRESS**.

### Next mandatory continuation after v0.33
1. Complete P23 page/action-to-permission/auth/audit matrix and identify any privileged surface whose UI or route composition diverges from its owner-domain contract.
2. Complete P24 route matrix for locale, deep-link, SEO, pagination/filtering, empty/error/unavailable states and accessibility.
3. Reconcile readiness/drain ordering and startup failure semantics without duplicating `MNT-AUD-0040`.
4. Complete event producer/consumer orphan check across all domain events after the shared outbox correctness finding is now separated.
5. Complete final CI/verifier and documentation/source-authority reconciliation.

---

## Repository Completion Audit — P24 Course Catalog Ownership/Presentation Parity (v0.34 — 2026-09-06)

### MNT-AUD-0069 — P1 HIGH — Phase 24 Loads Canonical Native Courses but Routes/Maps Them as Imported Courses; Native Catalog Remains a Placeholder
**Categories:** P24 / P13 / PUBLIC_WEB / COURSES / ROUTING / READ_MODEL / ORIGIN_TYPE / CATALOG_ISOLATION / DEEP_LINK

**Evidence:**
- Phase 24 Part C explicitly requires three visually and semantically isolated course catalogs: `Manaratak Courses`, `Global Free Courses`, and paid auxiliary courses/services; it also requires Phase 24 to compose those surfaces from Phase 13 owner read models without redefining course ownership.
- The public live data source calls the canonical `ApiClient.getCourses` endpoint and maps every returned `PublicCourseDto`, proving Phase 13 published course data is already available to the public composition layer.
- `PublicCourseDto` includes `originType` and `accessType`, so the public client has the owner-domain information required to distinguish `NATIVE_MANARATAK_COURSE` from external/imported records and paid offerings.
- `mapCourse(dto)` creates both a generic `Course` and an `ImportedCourse` representation for every DTO, but does not use `dto.originType` to guard creation of the imported representation or select the correct catalog.
- `CoursesSearchPage` declares a `courses?: Course[]` prop but the component implementation destructures/uses only `importedCourses`; the live native `courses` collection is therefore not rendered by that catalog surface.
- `PublicTemplateApp` sends the `imported` track to the real `CoursesSearchPage`, while `native` and `paid` are sent to `CourseTrackPreview`.
- `CourseTrackPreview` is explicitly an empty-state placeholder that states native/paid tracks are “waiting for data linkage,” despite the public live source already loading canonical Phase 13 course DTOs.
- Deep-link handling for `/courses/:slug` calls `ApiClient.getCourseBySlug(key)`, then forces `selectedCourseTrack: 'imported'` and stores `mapCourse(...).imported`. It does not branch on owner `originType`.
- Therefore a canonical native course can be transformed and presented using the imported-course view path, while the actual native-course track remains unavailable.

**Impact:**
- The public platform violates the Phase 24 course-catalog isolation contract and can misclassify owner-native courses as imported/external courses.
- Native MANARATAK courses fetched from Phase 13 are effectively discarded from the native catalog UI.
- Direct links to native courses can land in the wrong presentation semantics, including provider/direct-link/certificate assumptions designed for imported courses.
- Public user trust and course-origin semantics become unreliable; a visitor cannot reliably distinguish MANARATAK-owned learning from an external provider course.
- The current source cannot claim P13→P24 public native-course closure even though the owner API already supplies the required discriminator.

**Required remediation:**
1. Preserve and use `PublicCourseDto.originType` as the authoritative discriminator in Phase 24 composition.
2. Map native, external/imported and paid offerings into separate presentation models without synthesizing an `ImportedCourse` for native owner records.
3. Render the existing live `courses` collection in the `Manaratak Courses` track and bind the paid track to its authoritative owner DTOs when available.
4. Make `/courses/:slug` resolve the record's actual origin/access type before choosing the detail component/track.
5. Ensure native-course detail pages render Phase 13 curriculum/preview owner fields, while external courses retain direct provider landing URLs and imported provenance semantics.
6. Add route tests for at least one native, one imported/free and one paid course proving stable deep links and correct track classification.
7. Add a source verifier that fails if `originType` is ignored by public course mapping/routing.
8. Reconcile Phase 24 course-catalog acceptance claims and P13 public source-closure documentation with the corrected end-to-end behavior.

**Repair Wave:** W4 / W5 / W6 / W7  
**Status:** OPEN — P24_NATIVE_COURSE_CATALOG_AND_DEEP_LINK_ORIGIN_MISCLASSIFIED

### Live Register Update — v0.34 (2026-09-06)

- Registered finding IDs allocated: **69** (`MNT-AUD-0001` → `MNT-AUD-0069`).
- Duplicate/evidence-alias IDs excluded from canonical count: **3** (`0038`, `0039`, `0053`).
- **Canonical unique confirmed findings: 66**
- Severity (canonical unique): **P0: 0 | P1: 50 | P2: 15 | P3: 1 | P4: 0**
- New canonical finding in this continuation: `MNT-AUD-0069`.
- P24 generic data `empty/unavailable/error/retry` handling was positively verified; no broad duplicate error-state finding was added.
- No source/code repair, migration, backfill, seed, database mutation or production runtime change has been executed.
- Frozen audit baseline remains `0931c5664cf274cb2b8f4cb250dd09ebf2e9a77f`.
- Project decision remains: **SOURCE_NOT_COMPLETE — AUDIT_IN_PROGRESS**.

### MNT-AUD-0070 — P2 MEDIUM — Public Prototype Data Mode Is Explicit but Not Forbidden in Production Builds
**Categories:** P24 / PUBLIC_WEB / CONFIGURATION / PROTOTYPE_DATA / PRODUCTION_SAFETY / BUILD_GUARD / DATA_TRUST

**Evidence:**
- `resolvePublicTemplateDataMode(value)` correctly defaults unknown/unset values to `api` and enables prototype mode only when the value is exactly `prototype`.
- `usePublicLiveData()` dynamically imports `publicPrototypeDataSource` whenever that resolved mode is `prototype`.
- `PublicTemplateApp` passes `import.meta.env.VITE_PUBLIC_TEMPLATE_DATA_MODE` directly into the loader.
- Repository search found no production/staging build guard, Vite configuration assertion, environment-schema rule or CI check rejecting `VITE_PUBLIC_TEMPLATE_DATA_MODE=prototype` for a production build.
- The prototype module comment claims “Production/live composition never imports it,” but source behavior contradicts that absolute claim: an explicitly misconfigured production build can load the fixture adapter.
- Existing P10 source verifier proves the production app does not statically import the prototype adapter and that fixtures are isolated behind the explicit module; it does not prove production builds cannot set the enabling environment value.

**Impact:**
- A deployment/build configuration error can publish fixture/mock scholarships, universities, courses, countries, exams, articles or services through the real public UI.
- Because prototype data is intentionally shaped like live data, the resulting site can look healthy while presenting non-authoritative records.
- Backend production-readiness validation cannot protect this compile-time frontend `VITE_*` value after the web bundle has been built.

**Required remediation:**
1. Make production/staging web builds fail if `VITE_PUBLIC_TEMPLATE_DATA_MODE=prototype`.
2. Prefer compile-time elimination of prototype capability from production bundles where practical.
3. Add a Vite/web environment validator with an explicit environment-tier contract.
4. Add CI tests for production-mode configuration proving prototype mode is rejected.
5. Keep prototype mode available only for local/test/demo contexts with an unmistakable visual indicator when enabled.
6. Correct comments/source-closure documentation so “production never imports prototype” is asserted only when enforced by code/build gates.

**Repair Wave:** W3 / W5 / W7  
**Status:** OPEN — PRODUCTION_BUILD_CAN_ENABLE_PUBLIC_PROTOTYPE_DATA

### Live Register Update — v0.35 (2026-09-06)

- Registered finding IDs allocated: **70** (`MNT-AUD-0001` → `MNT-AUD-0070`).
- Duplicate/evidence-alias IDs excluded from canonical count: **3** (`0038`, `0039`, `0053`).
- **Canonical unique confirmed findings: 67**
- Severity (canonical unique): **P0: 0 | P1: 50 | P2: 16 | P3: 1 | P4: 0**
- New canonical finding in this continuation: `MNT-AUD-0070`.
- Prototype mode remains explicit and is not an automatic live-data fallback; the finding is specifically the missing production-build prohibition.
- No source/code repair, migration, backfill, seed, database mutation or production runtime change has been executed.
- Frozen audit baseline remains `0931c5664cf274cb2b8f4cb250dd09ebf2e9a77f`.
- Project decision remains: **SOURCE_NOT_COMPLETE — AUDIT_IN_PROGRESS**.

---

## Repository Completion Audit — Refresh-Token Rotation Concurrency (v0.36 — 2026-09-06)

### MNT-AUD-0071 — P1 HIGH — Refresh-Token Rotation Is Non-Atomic, Allowing Concurrent Reuse of One Refresh Token to Mint Multiple Valid Sessions
**Categories:** AUTH / SESSION / REFRESH_TOKEN / REPLAY / CONCURRENCY / SECURITY / DATABASE / IDENTITY

**Evidence:**
- `AuthService.refreshTokens(refreshToken)` verifies the refresh token, calls `sessionManager.isValidSession(...)`, then separately calls `revokeSession(...)`, generates a new session ID/tokens, and finally calls `createSession(...)`.
- These are separate read/write operations with no database transaction, conditional consume primitive, lock, compare-and-set, rotation counter, or session-family replay contract.
- `PrismaSessionManager.isValidSession()` performs a read for an unrevoked/unexpired `SessionRecord`; `revokeSession()` later performs `updateMany` for the same token hash where `revokedAt=null`, but the affected-row count is discarded and not returned to `AuthService`.
- Therefore two concurrent refresh requests using the same still-valid refresh token can both pass `isValidSession()` before either revocation commits. Both then continue even if the second `revokeSession()` updates zero rows.
- Each request generates a different `sessionId` and a different new refresh token and inserts a distinct new session. The Prisma uniqueness constraint on `refreshTokenHash` protects only duplicate storage of the same token hash; it does not prevent two different descendant refresh tokens being minted from one concurrently reused parent token.
- Repository search found no concurrent refresh/replay integration test proving exactly-one-winner rotation semantics.
- Positive control: normal student workspace access uses `AuthMiddleware(tokenProvider, sessionManager)` and the DI container supplies a singleton `PrismaSessionManager`; the defect is specifically refresh-token consumption/rotation concurrency, not a blanket absence of session validation.

**Impact:**
- A copied/stolen refresh token raced against the legitimate user's refresh can create two independently valid descendant sessions instead of enforcing single-use rotation.
- Refresh-token replay detection is weakened: possession of one parent token can preserve both attacker and legitimate session branches after a concurrent race.
- Logout/revocation semantics become less predictable because the system has no explicit parent/child session family or replay response policy.
- Security claims that refresh rotation is single-use cannot be considered Source Complete under concurrent requests.

**Required remediation:**
1. Add an atomic `consumeAndRotateRefreshSession` operation at the session persistence boundary.
2. In one database transaction, conditionally consume/mark the parent session only when it is still active, unexpired and unrevoked; require exactly one successful row transition.
3. Create the child session only inside the same successful transaction/rotation unit; every competing reuse must fail closed.
4. Add session-family / parent-session linkage or an equivalent rotation lineage and define a replay policy; a confirmed replay should be capable of revoking the affected family when policy requires it.
5. Keep refresh-token hashes at rest and cryptographically random session IDs/tokens; these existing positive controls remain.
6. Add a database-backed concurrency integration test: two simultaneous refreshes with one token must result in exactly one success, one rejection, and exactly one child session.
7. Add post-rotation replay tests, logout/revoke-all tests and failure/transaction rollback tests.
8. Reconcile Admin and Student session validation so all access-token guards consume the same active-session semantics after rotation.

**Repair Wave:** W1 / W3 / W6 / W7  
**Status:** OPEN — REFRESH_TOKEN_ROTATION_NOT_ATOMIC

### P23 Privileged Route Matrix — Partial Reconciliation Result

- The canonical `/admin/*` tree is protected at the parent boundary by strict Admin authentication plus mutation audit middleware.
- Most domain Admin routers additionally receive a domain-specific permission at mount time (`admin:imports:manage`, `admin:universities:manage`, `admin:majors:manage`, `admin:courses:manage`, `admin:finance:manage`, etc.).
- `CertificateAdminRouter` was inspected separately because it intentionally has no single mount-level capability; its routes apply fine-grained `view`, template-author/checker, issuer and lifecycle permissions internally. No missing Certificate route permission was confirmed in this pass.
- Existing `MNT-AUD-0064` remains the UI-side root defect: the Admin SPA authorizes entry if the principal has any `admin:*`-prefixed permission and then exposes all navigation/routes rather than role-filtering them, while the backend remains granular.
- Existing `MNT-AUD-0065` remains the non-`/admin` compatibility/control-plane session-validation root defect.

**Audit decision:** `P23_PRIVILEGED_ROUTE_MATRIX = IN_PROGRESS / NO_DUPLICATE_BACKEND_PERMISSION_FINDING_ADDED_THIS_PASS`

### Live Register Update — v0.36 (2026-09-06)

- Registered finding IDs allocated: **71** (`MNT-AUD-0001` → `MNT-AUD-0071`).
- Duplicate/evidence-alias IDs excluded from canonical count: **3** (`0038`, `0039`, `0053`).
- **Canonical unique confirmed findings: 68**
- Severity (canonical unique): **P0: 0 | P1: 51 | P2: 16 | P3: 1 | P4: 0**
- New canonical finding in this continuation: `MNT-AUD-0071`.
- Student access-token active-session validation was positively verified in the canonical workspace composition; no false blanket session finding was added.
- Certificate Admin fine-grained permission guards were positively verified in this pass; no duplicate P23 backend RBAC finding was added.
- No source/code repair, migration, backfill, seed, database mutation or production runtime change has been executed.
- Frozen audit baseline remains `0931c5664cf274cb2b8f4cb250dd09ebf2e9a77f`.
- Project decision remains: **SOURCE_NOT_COMPLETE — AUDIT_IN_PROGRESS**.

### Next mandatory continuation after v0.36
1. Complete remaining P23 page/action ↔ backend permission ↔ audit ↔ owner-domain matrix, especially review/import/settings/platform operations not already covered by root findings.
2. Complete P24 public route/deep-link/accessibility/owner-DTO parity after the known Compare, search, locale, SEO, catalog pagination, prototype and course-origin findings.
3. Reconcile finance recovery/provider state and asynchronous reconciliation without duplicating the existing Phase 19 runtime-provider finding.
4. Complete migration/data-integrity source audit, including migration-chain authority, rollback artifacts, dangerous convenience commands and greenfield parity.
5. Complete CI/verifier truthfulness and documentation/source-authority reconciliation.
6. Perform final root-cause deduplication and closure matrix only after all axes are exhausted; remediation remains blocked until then.

### MNT-AUD-0072 — P2 MEDIUM — Login Verification Has a Measurable Account-Existence Timing Split and Uses Synchronous scrypt on the Node Event Loop
**Categories:** AUTH / PASSWORD / ACCOUNT_ENUMERATION / TIMING / AVAILABILITY / RATE_LIMIT / SECURITY

**Evidence:**
- `AuthRouter POST /login` performs `identityRepository.findByEmail(email)` and returns the generic 401 response immediately when no identity exists.
- Only after a matching identity exists does `AuthService.login()` call `PrismaCredentialVerifier.verify(...)`.
- `PrismaCredentialVerifier` then performs password verification through `PasswordHasher.verify(...)` only for an existing active identity with a password credential.
- `PasswordHasher.verify()` uses `scryptSync(...)`, while unknown identities never execute an equivalent dummy KDF path.
- Therefore the response cost for a nonexistent email is materially different from an existing account with a wrong password even though the response body is intentionally generic.
- `scryptSync` executes CPU/memory-hard work synchronously on the Node.js event loop. Existing authentication-specific rate limits (account and account+IP) are a positive mitigation, but they do not make the path constant-cost and do not prevent distributed attempts against many accounts/IPs from consuming event-loop time.
- Repository search found no dummy-hash/equalized-cost login path or timing regression test.

**Impact:**
- Remote timing analysis can increase confidence about whether an email/account exists, especially over repeated samples.
- Repeated wrong-password attempts against real accounts impose synchronous KDF work on the API event loop and can degrade latency for unrelated requests.
- The current implementation correctly uses salted scrypt and timing-safe hash comparison; this finding concerns request-level timing/even-loop behavior, not weak password hashing.

**Required remediation:**
1. Use asynchronous `crypto.scrypt` (or an approved async password-KDF implementation) so expensive password verification does not block the Node event loop.
2. Execute an equivalent dummy password verification path for nonexistent identities and other early credential-missing cases so authentication failure cost is substantially equalized.
3. Preserve generic authentication error responses and the existing account/account+IP rate limits.
4. Add bounded login concurrency/backpressure appropriate to the selected KDF cost.
5. Add timing-oriented tests/benchmarks that compare nonexistent-account and wrong-password paths within an approved tolerance rather than asserting only response text/status.
6. Document and benchmark KDF parameters as an operational security setting so increases do not accidentally create an availability regression.

**Repair Wave:** W1 / W3 / W6  
**Status:** OPEN — LOGIN_KDF_TIMING_AND_EVENT_LOOP_COST_NOT_HARDENED

### MNT-AUD-0073 — P1 HIGH — Phase 22/24 Public “Save/Favorite” Journey Is UI-Local in Live Mode and Is Not Connected to Phase 15 Saved Items
**Categories:** P22 / P24 / P15 / PUBLIC_WEB / STUDENT / SAVED_ITEMS / BOOKMARK / JOURNEY / CROSS_DEVICE / SOURCE_CLOSURE

**Evidence:**
- The approved discovery/user-journey documents require users to save/bookmark scholarships, universities, articles and other opportunities and continue those saved items later.
- Phase 15 has a real persisted Saved Items model/API, including authenticated student Saved Item operations, hydrated Saved Items and collection management.
- `apps/web/src/api/client.ts` contains authenticated Student Workspace Saved Item/collection read and management calls, proving the owner API is available to the web application.
- In `PublicTemplateApp`, `favoriteKeys` is initialized to an empty array whenever `publicDataMode !== 'prototype'`.
- `handleToggleFavorite(kind,id)` only mutates local React state through `setFavoriteKeys(...)`; it does not call Phase 15 Student Workspace APIs, does not authenticate/redirect an anonymous user into a save continuation flow, and does not reconcile owner Saved Item IDs.
- Persistence of `manaratak_favorites_v2` to browser storage is explicitly guarded by `publicDataMode === 'prototype'`; live/API mode therefore loses these UI favorites on reload/navigation lifecycle and never creates the canonical Phase 15 Saved Item.
- Public scholarship, major, article, service, exam, career and global-search components expose `onToggleFavorite`/Bookmark behavior, so the disconnected state is visible as a real product action rather than an unused prototype helper.
- The Student Workspace can list/move/manage hydrated owner Saved Items, but a favorite clicked in the live public discovery experience does not enter that workspace because the two surfaces are not connected.

**Impact:**
- The core `Discover → Save → Continue` product journey is not end-to-end Source Complete.
- Users can receive visual confirmation that an item was saved while the canonical student record remains unchanged.
- Saved state does not survive refresh/device change and cannot reliably appear in the Student Workspace, collections, notifications or later personalization flows.
- Public favorites and Phase 15 Saved Items can diverge into two independent concepts, violating the intended single owner for student saved state.

**Required remediation:**
1. Make Phase 15 Student Saved Items the sole authoritative live-mode persistence for public bookmarks/favorites.
2. Add explicit web client methods for create/remove/toggle Saved Item operations where missing, using canonical owner entity type + stable owner/public ID/slug semantics.
3. Hydrate favorite state from the authenticated student's Saved Items rather than a separate live React-only list.
4. For anonymous users, define a deterministic auth handoff: preserve the requested save intent, authenticate, then complete or clearly cancel the save after login.
5. Keep localStorage-only favorites strictly prototype/demo-only and visually distinguish that mode.
6. Add integration/E2E tests: save from public scholarship/university/major/article/service/course → refresh → Student Workspace → second session/device simulation → remove/collection update.
7. Ensure Saved Item hydration and owner lifecycle changes handle archived/unpublished entities without inventing stale public facts.
8. Reconcile P22 journeys, P15 Saved Item contracts and P24 public action acceptance criteria.

**Repair Wave:** W4 / W5 / W6 / W7  
**Status:** OPEN — PUBLIC_SAVE_JOURNEY_NOT_CONNECTED_TO_P15_SAVED_ITEMS

---

## Repository Completion Audit — Live Student Application Tracking + Database Mutation Safety (v0.38 — 2026-09-06)

### MNT-AUD-0074 — P1 HIGH — Public Scholarship Application Tracker Is Local/Prototype State and Has No Canonical Live Owner Persistence
**Categories:** P22 / P24 / P15 / P12 / STUDENT / SCHOLARSHIP / APPLICATION_TRACKER / CHECKLIST / DEADLINES / NOTIFICATIONS / JOURNEY

**Evidence:**
- `PublicTemplateApp` exposes a learner application-tracking journey through `ApplicationMilestone`, the Tracker tab and `handleAddToTracker(...)`.
- In live/API mode the `milestones` state initializes to an empty array. Reading/writing `manaratak_milestones` is explicitly limited to `publicDataMode === 'prototype'`.
- `handleAddToTracker(...)` constructs application stages/checklist items entirely in browser memory using `Date.now()`-derived IDs, calls only `setMilestones(...)`, and emits a local UI notification through `triggerInstantPush(...)`.
- The same component performs local three-day deadline checks over these milestones only in prototype mode.
- Repository searches found no canonical Student/Scholarship application-tracker aggregate, API, repository or integration contract persisting scholarship application stages, checklist completion and deadline tracking for the authenticated student.
- Phase 15 is already the owner of private authenticated student workspace state/history, while Phase 12 owns scholarship facts; therefore the missing implementation is a private student-state composition over stable scholarship references, not a reason to move scholarship ownership into P15.

**Impact:**
- The visible `Add to Tracker` / application-progress journey is not durable in the real product.
- Application stages, checklist completion and deadline tracking disappear across live refresh/session/device boundaries and cannot be trusted as a student record.
- The UI can present progress and reminder semantics that are not backed by the Notification platform or a canonical private-state owner.
- The public-to-student journey can therefore appear more complete than the source actually is.

**Required remediation:**
1. Define a canonical private Student Application Tracker aggregate/read model under P15 (or an explicitly approved adjacent student-private-state owner) referencing P12 scholarship IDs/slugs without copying scholarship ownership.
2. Persist application tracker, stage, checklist, notes, deadlines and version/concurrency state in Prisma with stable IDs.
3. Add authenticated owner APIs for create/read/update/archive/remove and checklist/stage transitions.
4. Replace the live `PublicTemplateApp` local tracker with owner API commands and hydration; keep local tracker fixtures prototype-only.
5. Convert deadline reminders into governed Notification intents/events with idempotency, scheduling, retry and user preferences rather than browser timers.
6. Preserve auth intent for anonymous `Add to Tracker` actions and complete/cancel deterministically after login.
7. Add cross-session/device E2E tests and owner-lifecycle tests for scholarship archival/deadline changes.
8. Reconcile P22/P24 journey acceptance and P15 student workspace documentation after implementation.

**Repair Wave:** W3 / W4 / W5 / W6 / W7  
**Status:** OPEN — LIVE_APPLICATION_TRACKER_HAS_NO_CANONICAL_OWNER_PERSISTENCE

### MNT-AUD-0075 — P2 MEDIUM — Root Prisma Mutation Commands Bypass the Reviewed Database Remediation/Recovery Gate
**Categories:** DATABASE / PRISMA / MIGRATIONS / OPERATIONS / SAFETY / RECOVERY / GOVERNANCE / SCHEMA_DRIFT

**Evidence:**
- The repository contains a reviewed remediation gate (`scripts/db-remediation-gate.ts`) whose mutation path requires both `WP1_RECOVERY_GATE=CLOSED` and `ALLOW_DATABASE_MUTATIONS=YES` before deployment.
- CI/source Prisma validation intentionally runs only `validate` and `generate` with database mutations disabled.
- Root `package.json` nevertheless exposes `db:push` as direct `prisma db push --schema=...` and `db:migrate` as direct `prisma migrate dev --schema=...`.
- Those commands do not call the remediation gate, do not require the recovery flags, do not establish backup/restore evidence, and do not distinguish disposable development databases from staging/production targets.
- `prisma db push` can alter a target schema without creating/reconciling migration history, while `prisma migrate dev` is a development workflow rather than the controlled deployment path already authored for remediation.
- Existing source verifiers correctly prove CI does not run these commands; that does not prevent an operator/automation from invoking the unguarded root scripts directly against an externally supplied `DATABASE_URL`.

**Impact:**
- A high-privilege operator or accidental automation can bypass the project’s own Recovery Gate and mutate a database outside the reviewed migration/rollback evidence chain.
- `db:push` can create schema ↔ migration-history drift that later undermines greenfield parity, rollback and incident recovery.
- The existence of both a strict gate and unrestricted convenience commands creates contradictory operational authority.

**Required remediation:**
1. Remove or rename direct root mutation commands so their development/disposable-only purpose is explicit.
2. Wrap any retained `db:push` / `migrate dev` convenience command in a target guard that refuses production/staging and requires an unmistakable disposable/local database classification.
3. Make the reviewed deployment gate the sole supported path for controlled shared/staging/production migration execution.
4. Require pre-mutation backup/recovery evidence and post-migration status/parity evidence in the governed deploy path.
5. Add CI/source guards rejecting newly introduced unguarded root Prisma mutation commands.
6. Document the distinction between schema validation/generation, disposable developer migration generation and controlled deployment.
7. Reconcile this safety finding with `MNT-AUD-0041` (migration-chain parity) without merging the distinct root causes.

**Repair Wave:** W0 / W1 / W6 / W7  
**Status:** OPEN — UNGUARDED_ROOT_PRISMA_MUTATION_COMMANDS_BYPASS_RECOVERY_GATE

### Live Register Update — v0.38 (2026-09-06)

- Registered finding IDs allocated: **75** (`MNT-AUD-0001` → `MNT-AUD-0075`).
- Duplicate/evidence-alias IDs excluded from canonical count: **3** (`0038`, `0039`, `0053`).
- **Canonical unique confirmed findings: 72**
- Severity (canonical unique): **P0: 0 | P1: 53 | P2: 18 | P3: 1 | P4: 0**
- Findings incorporated since the previous numbered live register: `MNT-AUD-0072`, `MNT-AUD-0073`, `MNT-AUD-0074`, `MNT-AUD-0075`.
- Authentication-specific account/account+IP rate limiting, salted scrypt verification, JWT algorithm/type/issuer/audience validation, global CSRF, production CORS/proxy guardrails and cookie flags were positively verified; no blanket duplicate security finding was added.
- Phase 15 Student Workspace active-session validation is wired to `PrismaSessionManager`; `MNT-AUD-0071` remains specifically refresh-token rotation concurrency.
- Prisma source CI remains non-mutating (`validate`/`generate` only); `MNT-AUD-0075` concerns the contradictory unguarded operator commands in the root manifest.
- No source/code repair, migration, backfill, seed, database mutation or production runtime change has been executed.
- Frozen audit baseline remains `0931c5664cf274cb2b8f4cb250dd09ebf2e9a77f`.
- Project decision remains: **SOURCE_NOT_COMPLETE — AUDIT_IN_PROGRESS**.

### Next mandatory continuation after v0.38
1. Complete P23 Admin page/action → backend permission → audit → owner-domain parity for review/import/settings/platform operations.
2. Complete P24 route/deep-link/action parity beyond Compare, course origin, prototype mode, Saved Items and application tracking.
3. Complete observability/logging/metrics/health truthfulness and graceful drain/startup reconciliation without duplicating existing lifecycle findings.
4. Complete migration/data-integrity review: migration ordering, rollback artifacts, destructive SQL, constraints/indexes, greenfield parity and data-retention jobs.
5. Complete event producer/consumer orphan matrix and scheduler/worker matrix across all phases.
6. Complete CI/verifier/source-authority and documentation reconciliation, then perform final root-cause deduplication before any remediation begins.

## Repository Completion Audit — Identity Lifecycle Session Invalidation + Finance Recovery Reconciliation (v0.39 — 2026-09-06)

### MNT-AUD-0076 — P1 HIGH — Suspending or Archiving an Identity Does Not Revoke Existing Sessions, While Normal User Authentication Does Not Re-check Identity Lifecycle State
**Categories:** IDENTITY / AUTH / SESSION / REVOCATION / SUSPENSION / ARCHIVE / SECURITY / P05 / P15 / LEARNER_RUNTIME

**Evidence:**
- `packages/application/src/identity/SuspendIdentityUseCase.ts` loads the identity, calls `identity.suspend(...)`, then persists it through `identityRepository.save(identity)`; the use case has no `ISessionManager` dependency and does not revoke the subject's sessions.
- `packages/application/src/identity/ArchiveIdentityUseCase.ts` follows the same pattern for archive and likewise has no session-revocation action.
- `packages/infrastructure/src/auth/PrismaSessionManager.ts` already exposes `revokeAllSessions(userId)`, but repository search found no suspension/archive integration invoking it.
- `apps/api/src/presentation/middleware/AuthMiddleware.ts`, used by authenticated learner/student runtime routers, validates the access token and optionally calls `sessionManager.isSessionActive(userId, sessionId)`; it does not load the canonical Identity or Account lifecycle/access state.
- `packages/application/src/auth/AuthService.ts::refreshTokens()` validates refresh-token/session validity and does not re-check that the identity is still ACTIVE before rotating into a new session.
- The stronger `/admin` guard has an identity-repository lifecycle check, making the discrepancy explicit: lifecycle invalidation is enforced at the Admin boundary but not consistently at ordinary authenticated learner/runtime boundaries.
- Repository search found no `IdentitySuspended`/archive consumer that compensates by calling `revokeAllSessions`.

**Impact:**
- A user whose identity has been suspended or archived can keep using an already-active normal-user session until that session expires or is separately revoked.
- The same user can potentially rotate a still-valid refresh token into a fresh session because refresh does not re-check identity lifecycle state.
- Administrative suspension therefore does not provide an immediate platform-wide access cut-off.

**Required remediation:**
1. Make suspension/archive and any equivalent access-denying Account transition atomically or reliably trigger `revokeAllSessions(identityId)` through the canonical Identity/Auth boundary.
2. Define one authoritative principal lifecycle/access validation service and enforce it consistently for Admin and ordinary authenticated routes.
3. Make refresh-token rotation fail closed when the canonical identity/account is suspended, archived, purged, disabled or otherwise not permitted to authenticate.
4. If lifecycle→session revocation is event-driven, use durable transactional event/outbox delivery with an idempotent consumer.
5. Add integration tests proving previously valid access and refresh tokens stop working after suspension/archive and only resume through an approved reactivation flow.
6. Reconcile P05 Identity/Auth and P15 learner-session documentation with the implemented lifecycle semantics.

**Repair Wave:** W1 / W3 / W6  
**Status:** OPEN — IDENTITY_ACCESS_DENIAL_DOES_NOT_INVALIDATE_NORMAL_USER_SESSIONS

### MNT-AUD-0077 — P1 HIGH — Phase 19 Reconciliation Is On-Demand/Internal-Ledger Only; No Scheduled Provider-State Recovery Exists for Ambiguous Payment/Transfer Outcomes
**Categories:** P19 / FINANCE / PAYMENTS / TRANSFERS / RECONCILIATION / RECOVERY / WORKER / PROVIDER / RELIABILITY / OBSERVABILITY

**Evidence:**
- The active Phase 19 implementation blueprint specifies BullMQ/Redis background settlements/reconciliation, a worker class for transfer processing, gateway/webhook anomaly monitoring, and alerting from background reconciliation workers.
- `FinancePlatformUseCases.capturePayment()` intentionally preserves ambiguous provider/network outcomes as `PENDING` or `AUTHORIZED` and relies on a later retry with the same idempotency key. This is correct fail-closed command behavior, but recovery is requester-driven rather than autonomous.
- Transfer settlement/failure is advanced by explicit transition commands that query bank-provider status; no recurring worker was found that scans `PROCESSING` transfers and resolves them from provider truth.
- `FinanceAdminRouter` exposes reconciliation as an operator-invoked capability protected by `admin:finance:reconciliation:run`.
- Current repository reconciliation checks focus on internal invariants such as `LEDGER_IMBALANCE` and `CAPTURE_WITHOUT_POSTING`.
- Repository-wide searches found no `FinanceReconciliationWorker`, scheduled finance reconciliation job, pending/authorized payment recovery worker, or processing-transfer settlement worker.
- `FinancePlatformUseCases.runtimeReadiness()` truthfully marks production provider/webhook capabilities unavailable. This finding is separate from `MNT-AUD-0018`: `0018` is missing production provider transport; `0077` is missing durable asynchronous convergence/recovery orchestration around the provider-state model.

**Impact:**
- After crashes, timeouts or ambiguous external responses, financial records can remain indefinitely `PENDING`, `AUTHORIZED` or `PROCESSING` until a user/admin manually retries or inspects them.
- Provider truth and MANARATAK financial state can drift without a bounded automatic detection/recovery window.
- Internal ledger checks alone cannot prove convergence with external payment/bank/refund state.

**Required remediation:**
1. Implement a durable finance reconciliation scheduler/worker using the approved queue/job foundation after global background-job remediation.
2. Define bounded scans/leases for stale `PENDING`/`AUTHORIZED` payments, `PROCESSING` transfers, processing refunds and other provider-dependent intermediate states.
3. Query provider truth using stable provider references/idempotency keys and apply only evidence-backed idempotent state transitions through Phase 19 owner APIs.
4. Add signed webhook ingestion as a complementary signal while preserving scheduled reconciliation for missed/delayed webhooks and ambiguous failures.
5. Emit metrics/alerts for aging intermediate states, reconciliation failures, provider divergence, ledger imbalance and retry exhaustion.
6. Add crash-window tests covering authorize-before-persist, capture-before-ledger-commit, transfer-submit-before-state-commit, refund ambiguity and missed-webhook recovery.
7. Upgrade the Phase 19 source-closure verifier to prove a mounted/scheduled recovery worker rather than only static reconciliation marker strings.

**Repair Wave:** W2 / W3 / W6  
**Status:** OPEN — FINANCE_PROVIDER_STATE_RECOVERY_NOT_AUTOMATED

### Reconciliation Notes — v0.39
- Re-checking `apps/api/src/server.ts` confirmed the absence of explicit `SIGTERM`/`SIGINT` graceful shutdown, but no new ID was created because this root cause is already included in `MNT-AUD-0040`.
- P24 accessibility spot checks positively verified dialog semantics, focus trapping, Escape handling, background `inert`, focus restoration, semantic buttons and accessible labels; absence of an axe package alone is not registered as a defect.
- Phase 19's existing fail-closed/idempotent synchronous payment behavior remains positive evidence; `MNT-AUD-0077` is specifically the missing autonomous provider-state convergence mechanism.

### Live Register Update — v0.39 (2026-09-06)
- Registered finding IDs allocated: **77** (`MNT-AUD-0001` → `MNT-AUD-0077`).
- Duplicate/evidence-alias IDs excluded from canonical count: **3** (`MNT-AUD-0038`, `MNT-AUD-0039`, `MNT-AUD-0053`).
- **Canonical unique confirmed findings: 74**.
- Severity (canonical unique): **P0: 0 | P1: 55 | P2: 18 | P3: 1 | P4: 0**.
- New canonical findings in this continuation: `MNT-AUD-0076`, `MNT-AUD-0077`.
- No source/code repair, migration, backfill, seed, database mutation or production runtime change has been executed.
- Frozen audit baseline remains `0931c5664cf274cb2b8f4cb250dd09ebf2e9a77f`.
- Project decision remains: **SOURCE_NOT_COMPLETE — AUDIT_IN_PROGRESS**.

### Next mandatory continuation after v0.39
1. Finish P23 Admin page/action → backend permission → audit → owner-domain parity for review/import/settings/platform operations.
2. Finish P24 route/deep-link/action/accessibility parity beyond known Compare, course-origin, prototype, Saved Items and application-tracker findings.
3. Complete migration/data-integrity review: migration ordering, rollback semantics, destructive SQL, constraints/indexes, greenfield parity and retention jobs without duplicating `MNT-AUD-0041/0042/0075`.
4. Complete observability/logging/metrics/tracing/alert-delivery and readiness-truth review.
5. Complete event producer/consumer orphan matrix and scheduler/worker matrix across all phases.
6. Complete CI/verifier/source-authority and documentation reconciliation, then perform final root-cause deduplication before remediation.

## Repository Completion Audit — Production Telemetry / Monitoring Foundation Reality (v0.40 — 2026-09-06)

### MNT-AUD-0078 — P1 HIGH — Monitoring Foundation Has Health Probes but No Production Metrics/Tracing Provider; HTTP Monitoring Middleware Is a Compile-Only No-op
**Categories:** OBSERVABILITY / MONITORING / METRICS / TRACING / TELEMETRY / HTTP / P04 / P05 / P19 / PRODUCTION_READINESS / DOCUMENTATION_DRIFT

**Evidence:**
- `packages/infrastructure/src/monitoring/MonitoringService.ts` accepts an optional `IMonitoringProvider`. When none is provided, `getMetrics()` returns no-op `incrementCounter`, `recordHistogram` and `setGauge` functions with `capabilityStatus: 'NOT_CONFIGURED'` and `scope: 'PROCESS_LOCAL'`.
- `apps/api/src/app.ts` constructs the normal monitoring service as `new AppMonitoringService(undefined)` unless a test/explicit caller injects a provider, so the canonical runtime composition has no metrics provider.
- `apps/api/src/presentation/monitoring/MonitoringMiddleware.ts::generate()` contains only the comment `Basic implementation that satisfies compilation` and immediately calls `next()`; it does not record request count, latency, status class, route, in-flight requests or errors.
- Repository searches for OpenTelemetry/OTEL, Prometheus and telemetry exporters returned no production provider/exporter implementation; root dependencies likewise do not contain an OpenTelemetry/Prometheus telemetry stack.
- Health/readiness indicators are real and valuable, and Pino structured logging/redaction tests exist; this finding does **not** claim observability is entirely absent.
- The active Phase 04 Monitoring Foundation report states that the infrastructure provides application metrics and that a generic monitoring middleware automatically generates HTTP request metrics. That active claim does not match the canonical runtime source.
- Phase 19's active blueprint additionally specifies OpenTelemetry and real-time financial/payment/reconciliation monitoring/alerts, which cannot be satisfied by the current no-op metrics path.

**Impact:**
- Production request/application metrics are silently discarded even though instrumentation contracts exist.
- There is no source-complete distributed tracing/export path to correlate API, jobs, outbox and external-provider operations end-to-end.
- SLO/error-rate/latency/saturation alerts cannot be driven from a canonical application telemetry stream.
- Health endpoints can answer current probe state but cannot replace historical metrics, traces, alerting or trend analysis.
- Active monitoring documentation overstates implemented source capability.

**Required remediation:**
1. Implement and register a production-capable `IMonitoringProvider` in the composition root using the approved telemetry stack (OpenTelemetry/Prometheus/vendor-neutral exporter strategy).
2. Replace the compile-only MonitoringMiddleware with bounded HTTP metrics/tracing instrumentation: route template, method, status class, latency, in-flight count and correlation/trace context without high-cardinality PII.
3. Instrument background jobs/outbox/imports/finance/provider calls and critical domain workflows with the same correlation/trace model.
4. Define exporter configuration, sampling, resource/service identity and production failure behavior in the typed environment contract.
5. Add alert delivery/runbook mappings for readiness failures, error-rate/latency SLO breaches, queue/outbox lag, finance reconciliation drift and critical security/runtime conditions.
6. Add source/unit/integration tests proving metrics are emitted through a real provider and that request middleware is not a pass-through no-op.
7. Rebaseline the Phase 04 Monitoring Foundation and all later phase observability claims against the implemented telemetry topology.

**Repair Wave:** W1 / W2 / W6 / W7  
**Status:** OPEN — PRODUCTION_TELEMETRY_PROVIDER_AND_HTTP_INSTRUMENTATION_MISSING

### Live Register Update — v0.40 (2026-09-06)
- Registered finding IDs allocated: **78** (`MNT-AUD-0001` → `MNT-AUD-0078`).
- Duplicate/evidence-alias IDs excluded from canonical count: **3** (`MNT-AUD-0038`, `MNT-AUD-0039`, `MNT-AUD-0053`).
- **Canonical unique confirmed findings: 75**.
- Severity (canonical unique): **P0: 0 | P1: 56 | P2: 18 | P3: 1 | P4: 0**.
- New canonical finding in this continuation: `MNT-AUD-0078`.
- Positive evidence retained: structured Pino logging/redaction and multiple health/readiness indicators exist; the finding is specifically missing metrics/tracing/export/HTTP instrumentation.
- No source/code repair or runtime/database mutation has been executed.
- Frozen audit baseline remains `0931c5664cf274cb2b8f4cb250dd09ebf2e9a77f`.
- Project decision remains: **SOURCE_NOT_COMPLETE — AUDIT_IN_PROGRESS**.

### Next mandatory continuation after v0.40
1. Complete remaining observability review for log correlation/redaction, alert routing and job/outbox telemetry without duplicating `MNT-AUD-0078`.
2. Complete event producer/consumer orphan matrix and scheduler/worker matrix.
3. Complete migration/data-integrity and retention source audit.
4. Complete P23/P24 remaining route/action/owner parity.
5. Complete CI/verifier/document authority reconciliation, then final deduplication.

---

## Repository Completion Audit — Migration Rollback-Gate Reconciliation (v0.41 — 2026-09-06)

### MNT-AUD-0079 — P2 MEDIUM — Database Rollback-Plan Gate Does Not Require Rollback/Recovery Artifacts for the Migration Chain It Reports
**Categories:** DATABASE / MIGRATIONS / ROLLBACK / RECOVERY / GOVERNANCE / DEPLOYMENT / SAFETY / FALSE_GATE

**Evidence:**
- `scripts/db-remediation-gate.ts` inventories every Prisma migration and records whether a sibling `rollback.sql` exists.
- In `rollback-plan` mode, however, the status condition is `migrations.every(item => item.rollback || !item.id.includes('transactional_outbox'))`.
- That condition requires an explicit rollback artifact only for migration IDs containing `transactional_outbox`; any differently named migration satisfies the expression even when `rollback` is null.
- The plan can therefore return `REVIEW_REQUIRED` instead of `ROLLBACK_ARTIFACT_MISSING` while migration entries outside that one filename pattern have no reverse/recovery artifact.
- Repository search surfaced explicit rollback SQL for transactional-outbox and enterprise-event durability migrations while the Prisma migration inventory contains many additional domain migrations.
- The project's deployment/recovery governance requires deterministic rollback compatibility or an explicitly reviewed backup/forward-fix recovery strategy; the current rollback-plan status does not prove either across the candidate chain.

**Impact:**
- Operators/reviewers can receive a misleading rollback-plan result that does not establish recoverability for the actual set of migrations being deployed.
- A migration may be reviewed under a nominal rollback gate without reverse SQL, forward-fix classification, or backup/restore recovery instructions.
- This is distinct from `MNT-AUD-0041` (greenfield migration-chain/schema parity), `MNT-AUD-0066` (production backup/DR execution) and `MNT-AUD-0075` (unguarded root mutation commands).

**Required remediation:**
1. Define a recovery class for every migration: reversible SQL, forward-fix-only with compatibility contract, or non-reversible/data migration requiring backup/restore recovery.
2. Make `rollback-plan` validate every migration in the candidate deployment window rather than a hard-coded filename substring.
3. Fail closed when a required rollback/recovery artifact or classification is absent.
4. Include migration hash, rollback/recovery artifact hash, compatibility class and reviewer decision in deployment evidence.
5. Add tests using multiple migration names proving missing artifacts cannot be reported as review-ready.
6. Keep destructive rollback rehearsal restricted to disposable/restored copies and never execute it automatically against production.
7. Reconcile active deployment-strategy rollback claims with the actual Prisma migration governance model.

**Repair Wave:** W0 / W1 / W6 / W7  
**Status:** OPEN — ROLLBACK_PLAN_GATE_DOES_NOT_VALIDATE_FULL_MIGRATION_CHAIN

### Audit Register Reconciliation — v0.41 (2026-09-06)

- During continuation, a temporary numbering collision was detected before finalization: the repository audit had already advanced through `MNT-AUD-0078` while a newly drafted telemetry finding reused an older number.
- The duplicate telemetry draft was removed because its root cause is already canonically represented by `MNT-AUD-0078`.
- The genuinely new rollback-gate finding was renumbered to `MNT-AUD-0079`.
- Registered finding IDs allocated: **79** (`MNT-AUD-0001` → `MNT-AUD-0079`).
- Duplicate/evidence-alias IDs excluded from canonical count remain: **3** (`MNT-AUD-0038`, `MNT-AUD-0039`, `MNT-AUD-0053`).
- **Canonical unique confirmed findings: 76**.
- Severity (canonical unique): **P0: 0 | P1: 56 | P2: 19 | P3: 1 | P4: 0**.
- No source/code repair, migration, rollback, database mutation or production runtime change has been executed.
- Frozen audit baseline remains `0931c5664cf274cb2b8f4cb250dd09ebf2e9a77f`.
- Project decision remains: **SOURCE_NOT_COMPLETE — AUDIT_IN_PROGRESS**.

### Next mandatory continuation after v0.41
1. Complete event producer/consumer/scheduler/worker orphan matrix across all phases.
2. Complete remaining P23/P24 action/owner parity after Saved Items, application tracker, Compare and course-origin findings.
3. Complete data-integrity/retention review beyond migration safety and greenfield parity.
4. Complete CI/verifier/document-authority reconciliation and stale/superseded artifact classification.
5. Perform final root-cause deduplication and completion matrix only after every axis is exhausted; remediation remains blocked until then.

---

## Repository Completion Audit — Legacy/Core Domain Event Dispatch Reality (v0.42 — 2026-09-06)

### MNT-AUD-0080 — P1 HIGH — Core Aggregate Domain Events Are Not Reliably Published: Identity Events Are Persisted Without Dispatch and the In-Memory Dispatcher Has No Registered Handlers
**Categories:** EVENT_FOUNDATION / DOMAIN_EVENTS / IDENTITY / SETTINGS / OUTBOX / INTEGRATION / P05 / CROSS_PHASE / SOURCE_CLOSURE

**Evidence:**
- The canonical `Identity` aggregate calls `addDomainEvent(...)` for `IdentityCreatedEvent`, `IdentityActivatedEvent`, `IdentityStatusChangedEvent` and `IdentityContactUpdatedEvent`.
- `PrismaIdentityRepository.save(...)` persists the aggregate state but never reads/dispatches/clears `identity.domainEvents`, never appends those events to the transactional outbox, and never bridges them into the newer Enterprise Event foundation.
- Repository-wide search found no Identity application use case invoking `DomainEvents.dispatchEventsForAggregate(...)` after save.
- The core `DomainEvents` dispatcher is an in-process static handlers map; repository-wide search found no active `DomainEvents.register(...)` call, so its handler registry is never populated in the canonical composition.
- `ManageSettingsUseCase` explicitly calls `DomainEvents.markAggregateForDispatch(...)` and `dispatchEventsForAggregate(...)` after settings mutations, but with no registered handlers this dispatch has no observable downstream effect.
- Active P05 Identity architecture documentation states that Identity domain events are published after transaction completion and names downstream consumers such as Authentication/Audit; current source does not provide that delivery path.
- The project also has a newer durable Enterprise Event / transactional-outbox foundation, but the legacy/core aggregate event mechanism is not consistently adapted into it.

**Impact:**
- Domain state can commit while declared Identity/Settings side effects and integrations never observe the corresponding event.
- Event contracts give a false impression of decoupled behavior even though the canonical runtime either never dispatches them or dispatches into an empty in-memory registry.
- Existing cross-phase gaps such as `MNT-AUD-0016` (Identity → Student Workspace) and `MNT-AUD-0076` (identity lifecycle session invalidation) are concrete downstream manifestations, but fixing those individual consumers would still leave the general publication boundary undefined.
- In-process `DomainEvents` also cannot provide durability, retry, multi-instance delivery or crash recovery even if handlers are later registered.

**Required remediation:**
1. Choose one canonical post-commit event model for production: durable transactional outbox/integration events, not an ungoverned static in-memory registry.
2. Adapt Identity and Settings aggregate events into the transactional mutation/outbox boundary in the same database transaction as the authoritative state mutation.
3. Define explicit event schemas/versioning for Created/Activated/StatusChanged/ContactUpdated and Settings changes, with owner-domain source of truth.
4. Register idempotent consumers for required downstream effects (student workspace provisioning, session/access invalidation where event-driven, audit/read-model updates, notifications only where approved).
5. Remove or quarantine the legacy `DomainEvents` mechanism from production paths once migration is complete; prevent silent dispatch into an empty handler map.
6. Add crash-window and multi-instance integration tests proving state+event atomicity, replay idempotency, retry/DLQ and consumer recovery.
7. Reconcile P05 Identity/Settings/Event Foundation documentation and the cross-phase relationship matrix with the actual durable publication route.

**Repair Wave:** W1 / W3 / W4 / W6 / W7  
**Status:** OPEN — CORE_DOMAIN_EVENTS_NOT_CONNECTED_TO_DURABLE_PRODUCTION_EVENT_PIPELINE

### Live Register Update — v0.42 (2026-09-06)
- Registered finding IDs allocated: **80** (`MNT-AUD-0001` → `MNT-AUD-0080`).
- Duplicate/evidence-alias IDs excluded from canonical count: **3** (`MNT-AUD-0038`, `MNT-AUD-0039`, `MNT-AUD-0053`).
- **Canonical unique confirmed findings: 77**.
- Severity (canonical unique): **P0: 0 | P1: 57 | P2: 19 | P3: 1 | P4: 0**.
- New canonical finding: `MNT-AUD-0080`.
- Existing `MNT-AUD-0016` and `MNT-AUD-0076` remain separate end-to-end behavioral gaps; they are linked as downstream manifestations rather than counted as duplicates of the publication-foundation defect.
- Newer transactional-outbox infrastructure was positively verified as real source; this finding concerns aggregates still stranded on the disconnected legacy/core event mechanism.
- No source/code repair or runtime/database mutation has been executed.
- Frozen audit baseline remains `0931c5664cf274cb2b8f4cb250dd09ebf2e9a77f`.
- Project decision remains: **SOURCE_NOT_COMPLETE — AUDIT_IN_PROGRESS**.

## Repository Completion Audit — Retention / Purge Policy Enforcement (v0.43 — 2026-09-06)

### MNT-AUD-0081 — P2 MEDIUM — Retention Deadlines Are Persisted but Not Enforced by a Canonical Retention Lifecycle Across Import, Audit and Asset Data
**Categories:** RETENTION / DATA_LIFECYCLE / IMPORT / AUDIT / ASSETS / PURGE / COMPLIANCE / JOBS / GOVERNANCE

**Evidence:**
- `ImportRecord`, `AuditRecord` and `AssetRecord` persistence contain retention metadata such as `retentionExpiresAt`; Import also indexes the expiration field.
- `PrismaImportRepository` persists `retentionExpiresAt`, but repository search found no canonical query/sweeper that selects expired rows (`retentionExpiresAt <= now`) and applies a governed purge/archive action.
- `PrismaAuditRecordRepository` persists audit retention metadata but no expiry-enforcement service/job was found.
- `ProcessAssetLifecycleUseCase` provides explicit manual archive/soft-delete/purge operations and correctly checks the Asset Usage Registry before purge, but it does not evaluate `retentionExpiresAt` or schedule policy-driven lifecycle transitions.
- Phase 06 retention requirements explicitly state that staging-data retention/purging must be driven by explicit policies, while the current source implements the metadata but not enforcement.
- This is distinct from `MNT-AUD-0007` (general worker runtime gap) and `MNT-AUD-0050` (Asset Usage Registry runtime availability/purge safety): the missing root cause here is the policy engine/sweeper that turns retained metadata into lifecycle action.

**Impact:** expired staging/raw/audit/asset data can remain indefinitely, producing storage growth and compliance/data-minimization drift; conversely, implementing ad-hoc deletion later without owner-specific legal-hold/archive semantics could destroy required evidence.

**Required remediation:**
1. Define canonical retention classifications and owner-specific disposition (`PURGE`, `ARCHIVE`, `KEEP`, legal hold) rather than treating every expiry alike.
2. Implement a durable idempotent retention scheduler/sweeper on the final background-job foundation.
3. For Imports, purge only eligible staging/raw material while preserving required provenance/evidence and DLQ policy.
4. For Audit, preserve immutable/compliance evidence according to policy and archive rather than destructively delete where required.
5. For Assets, route expiry through the existing lifecycle + usage-safety boundary; never bypass `IAssetUsageRegistryGateway`.
6. Emit audit evidence and metrics for every policy decision, skipped legal hold, failure and purge/archive result.
7. Add boundary tests for expiration, retry/idempotency, legal hold, in-use assets, and policy changes.
8. Reconcile stale Phase 06 documentation that still describes schema fields already present as future work.

**Repair Wave:** W2 / W3 / W6 / W7  
**Status:** OPEN — RETENTION_METADATA_EXISTS_WITHOUT_POLICY_ENFORCEMENT

### Live Register Update — v0.43 (2026-09-06)
- Registered finding IDs allocated: **81** (`MNT-AUD-0001` → `MNT-AUD-0081`).
- Duplicate/evidence-alias IDs excluded: **3** (`0038`, `0039`, `0053`).
- **Canonical unique confirmed findings: 78**.
- Severity: **P0: 0 | P1: 57 | P2: 20 | P3: 1 | P4: 0**.
- No code, DB, repository setting or runtime change was executed.
- Project decision remains: **SOURCE_NOT_COMPLETE — AUDIT_IN_PROGRESS**.

### Next mandatory continuation after v0.43
1. Finish migration/data-integrity constraints, orphan/reference and deployment-order review.
2. Finish P23 Admin route/action/permission/audit/owner parity.
3. Finish P24 route/deep-link/live-action/data-origin parity.
4. Finish event producer/consumer and scheduler/worker matrix.
5. Finish CI/verifier/document-authority/release-governance reconciliation and final root-cause deduplication.

## Repository Completion Audit — Repository Boundary Change Control (v0.44 — 2026-09-06)

### MNT-AUD-0082 — P1 HIGH — `main` Is Unprotected and Required CI/Review Gates Are Not Enforced at the Repository Boundary
**Categories:** GITHUB / SOURCE_CONTROL / GOVERNANCE / CI / BRANCH_PROTECTION / CHANGE_CONTROL / RELEASE_SAFETY / SUPPLY_CHAIN

**Evidence:**
- GitHub branch metadata for canonical `main` at the frozen audit baseline reports `protected: false`.
- Required status-check enforcement is off and no required check contexts are configured at the branch boundary.
- `.github/` contains workflow definitions, but workflow presence does not prevent an authorized direct push from bypassing PR/review/status-gate policy when server-side protection/rulesets are absent.
- No canonical `.github/CODEOWNERS` file was found; this is supporting governance evidence, not the primary defect.
- The condition was already recorded as a Batch 001 baseline fact but had not been promoted into the numbered Findings Register.
- This is distinct from `MNT-AUD-0048`: `0048` concerns incomplete CI coverage; `0082` concerns absence of server-side enforcement even after CI itself is corrected.

**Impact:** canonical source can be changed without mandatory review/status evidence, weakening provenance and allowing accidental, compromised or emergency direct writes to bypass architecture/security/database closure gates.

**Required remediation:**
1. Protect `main` using GitHub Rulesets/branch protection.
2. Require pull-request based changes except a documented audited break-glass path.
3. Require the corrected source-closure/security/architecture/database checks after `MNT-AUD-0048` remediation.
4. Block force pushes and branch deletion; define stale-review/merge-freshness policy.
5. Add CODEOWNERS/reviewer coverage for auth/security, Prisma migrations, CI/workflows, finance and deployment-critical paths.
6. Record and periodically audit any bypass/break-glass use.

**Repair Wave:** W0 / W6 / W7  
**Status:** OPEN — MAIN_BRANCH_CHANGE_GATES_NOT_ENFORCED

### Live Register Update — v0.44 (2026-09-06)
- Registered finding IDs allocated: **82** (`MNT-AUD-0001` → `MNT-AUD-0082`).
- Duplicate/evidence-alias IDs excluded: **3** (`0038`, `0039`, `0053`).
- **Canonical unique confirmed findings: 79**.
- Severity: **P0: 0 | P1: 58 | P2: 20 | P3: 1 | P4: 0**.
- `MNT-AUD-0080` remains the Core Domain Events publication finding; `MNT-AUD-0081` is retention-policy enforcement; no ID collision remains in this continuation.
- Current `main` remains frozen at `0931c5664cf274cb2b8f4cb250dd09ebf2e9a77f`.
- No repository setting was changed during audit.
- Project decision remains: **SOURCE_NOT_COMPLETE — AUDIT_IN_PROGRESS**.



---

## Audit Register Numbering Integrity Correction — Clean Continuation After v0.44

The canonical numbering authority is preserved as follows:

- `MNT-AUD-0081` remains the **Retention / Purge Policy Enforcement** finding recorded in v0.43.
- `MNT-AUD-0082` remains the **Repository Boundary Change Control / unprotected main** finding recorded in v0.44.
- A later non-canonical draft had accidentally reused `MNT-AUD-0081` for the Phase 06 durable import worker gap. That duplicate-number draft is removed from this clean continuation; the underlying valid worker finding is preserved below as `MNT-AUD-0086`.
- No canonical finding is deleted or silently merged by this correction.

**Frozen repository baseline:** `main @ 0931c5664cf274cb2b8f4cb250dd09ebf2e9a77f`  
**Audit mode:** READ-ONLY SOURCE AUDIT  
**Repository / database / runtime mutations in this continuation:** **NONE**

---

## Repository Completion Audit — Migration / Data-Integrity Baseline Truthfulness (v0.45 — 2026-09-06)

### MNT-AUD-0083 — P1 HIGH — Governed Database Baseline Can Silently Lose Migration-Ledger Evidence and Continue with Partial/Unavailable Domain Counters
**Categories:** DATABASE / MIGRATIONS / DATA_INTEGRITY / RECOVERY / BASELINE / GOVERNANCE / FALSE_GREEN / DEPLOYMENT / PRISMA

**Evidence:**
- `scripts/db-remediation-gate.ts` implements `db:remediation:baseline` as the read-only pre/post recovery evidence command.
- The `_prisma_migrations` query explicitly appends `.catch(() => [])`; inability to read the Prisma migration ledger is therefore normalized to an empty migrations array instead of failing the baseline.
- Per-table `count(...)` also catches every query failure and returns the string `UNAVAILABLE` rather than propagating the failure.
- The outer baseline still prints a normal `READ_ONLY_BASELINE` JSON object after those swallowed failures; only an uncaught outer error produces `status: 'UNAVAILABLE'` and a failing process exit code.
- The counter inventory covers only `ReferenceCountry`, `AdministrativeRegion`, `ReferenceCity`, `InternationalTest`, `Major`, `University`, `Scholarship`, `ImportBatch`, `ImportRecord` and `AuditRecord`.
- Persisted platform domains added later — including learning/courses, certificates, student workspace, CMS, AI, finance, services, careers and other owner-domain records — are not represented in the baseline counter set.
- This is distinct from `MNT-AUD-0041` (schema↔migration parity), `MNT-AUD-0042` (real PostgreSQL validation coverage), `MNT-AUD-0066` (DR/backup source closure) and `MNT-AUD-0079` (rollback artifact gate). The defect here is the **truthfulness and completeness of the baseline evidence itself**.

**Impact:**
- A recovery or migration window can capture a baseline that appears structurally valid while the authoritative migration ledger was unreadable.
- `UNAVAILABLE` counters can be mistaken for acceptable evidence instead of a baseline failure.
- Before/after data-preservation proof is incomplete for large parts of the persisted platform, so a deployment/recovery decision can be made from a partial snapshot.
- The current command cannot be treated as a fail-closed recovery evidence gate.

**Required remediation:**
1. Fail closed if `_prisma_migrations` cannot be read or parsed; never reinterpret a ledger error as “zero migrations”.
2. Define an authoritative baseline counter/consistency manifest covering every persisted owner domain that matters to recovery and launch safety.
3. Fail the baseline if any required counter/integrity probe is `UNAVAILABLE`; allow optional probes only through explicit classification.
4. Include database identity, timestamp, schema hash, migration-chain hash and command/version metadata in the baseline artifact.
5. Add before/after comparison logic with explicit tolerances and expected mutation declarations rather than comparing raw output manually.
6. Add tests for missing `_prisma_migrations`, permission denial, missing tables, partial-schema databases and unavailable counters.
7. Reconcile the recovery/DR runbooks so the strengthened baseline is mandatory before and after migration/restore operations.

**Repair Wave:** W0 / W1 / W6 / W7  
**Status:** OPEN — DATABASE_BASELINE_EVIDENCE_IS_NOT_FAIL_CLOSED_OR_PLATFORM_COMPLETE

---

## Repository Completion Audit — P23 Admin Mutation Audit Parity (v0.46 — 2026-09-06)

### MNT-AUD-0084 — P1 HIGH — Phase 11+ Admin Mutations Fall Through `MutationAuditPolicy` to `NO_AUDIT_REQUIRED`
**Categories:** P23 / ADMIN / AUDIT / SECURITY / GOVERNANCE / MUTATION / ACCOUNTABILITY / CROSS_PHASE / FORENSICS

**Evidence:**
- `MutationAuditPolicy` recognizes POST/PUT/PATCH/DELETE as mutation methods but, for `ADMIN` scope, only treats a hard-coded set of prefixes as critical: identities, authorization, settings, imports, assets, reference-data, academic-taxonomy, international-tests, universities and majors.
- Every other `/admin/*` mutation falls through to `NO_AUDIT_REQUIRED` unless it matches the small `workspace` / taxonomy handoff standard-audit exceptions.
- `MutationAuditMiddleware.generate()` immediately calls `next()` for `NO_AUDIT_REQUIRED`, so neither mutation-intent nor mutation-outcome evidence is written by the central middleware.
- Newer owner-domain Admin routers contain many real mutations outside that hard-coded list. `CmsAdminRouter`, for example, exposes create/update/localization/domain-link/revision/workflow/publish/archive/schedule/category/tag/redirect/navigation/block mutations.
- The CMS application service carries actor IDs into owner methods, but that is not equivalent to the central cross-domain API mutation audit contract and does not prove a uniform immutable audit record for every privileged action.
- The historical Audit Coverage report was focused on earlier Phase 2–10 mutation surfaces; it does not prove full current P11–P24 mutation coverage.
- This is distinct from `MNT-AUD-0064`, which concerns permission-aware Admin UI routing/navigation. Here the backend mutation can be correctly authenticated/authorized yet still be classified as requiring **no central audit**.

**Impact:**
- Privileged changes in CMS and other later admin domains can execute without the platform-wide mutation audit trail expected for administrative accountability.
- Incident investigation cannot reliably reconstruct who attempted or completed every privileged change across the current Admin surface.
- “Middleware is mounted” can create false confidence because the policy intentionally no-ops on unlisted owner domains.
- Future admin domains inherit an unsafe default: adding a new route silently means no central audit unless someone also remembers to extend a hard-coded prefix list.

**Required remediation:**
1. Replace the hard-coded, default-no-audit model with an explicit route/action audit registry or fail-safe policy for every privileged mutation.
2. Default authenticated `/admin/*` mutations to at least `STANDARD_AUDIT_REQUIRED`; require an approved, documented exemption for `NO_AUDIT_REQUIRED`.
3. Classify high-risk publish, finance, identity/security, configuration, import/promotion, certificate, service-fulfillment and destructive actions as fail-closed critical audit mutations.
4. Build a route-tree coverage test that enumerates every Admin POST/PUT/PATCH/DELETE endpoint and fails if its audit classification is absent or unintentionally `NO_AUDIT_REQUIRED`.
5. Preserve owner-domain atomic business audit where required; central request audit must complement, not replace, transactionally coupled domain evidence.
6. Extend the active Audit Coverage report through all current owner domains and P23 composition routes.
7. Add regression tests proving intent/outcome evidence for representative Phase 11–24 mutations and explicit exemptions for safe preview/validation operations.

**Repair Wave:** W1 / W3 / W5 / W6 / W7  
**Status:** OPEN — ADMIN_MUTATION_AUDIT_POLICY_DOES_NOT_COVER_CURRENT_OWNER_DOMAINS

---

## Repository Completion Audit — P24 Public Services Live-Action Parity (v0.47 — 2026-09-06)

### MNT-AUD-0085 — P1 HIGH — Public Services “Request Service” CTA Is a UI Notice and Does Not Invoke the Existing Student Service-Request API
**Categories:** P24 / P20 / P15 / PUBLIC_WEB / SERVICES / LIVE_ACTION / AUTH_HANDOFF / STUDENT_WORKSPACE / E2E / SOURCE_CLOSURE

**Evidence:**
- `ServiceDetail.tsx` renders the visible `اطلب الخدمة` action, but its click handler only sets local `showRequestNotice` state.
- The resulting message explicitly says no request was sent and that sending requires a user session / runtime request-route linkage.
- The owner/student source path is already materially implemented: `StudentWorkspaceRouter` is protected by `AuthMiddleware` and exposes authenticated `POST /student/services/requests`.
- That endpoint validates `serviceId` plus optional `requestParameters` and calls `StudentServiceRequestUseCases.createRequest(...)` with the authenticated student identity.
- The same router provides request list/detail endpoints, so the missing behavior is not merely an absent backend CRUD foundation.
- `MNT-AUD-0058` remains the broader Phase 20 missing-scope finding (packages/bookings/providers/pricing/workflows, etc.). This finding is narrower and end-to-end: a currently implemented owner request capability is **not connected to the public service CTA**.

**Impact:**
- A visitor can browse a real service detail and press the primary request action, but no service request is created.
- The UI frames a source-integration omission as something deferred to runtime, even though the authenticated request API and application use case already exist in source.
- Public → login/session → student request → request detail continuity is incomplete, so the Services journey cannot be considered source-complete.

**Required remediation:**
1. Define the P24→P15/P20 service-request handoff contract using stable canonical `serviceId` from the owner DTO.
2. For authenticated students, render/validate the required request parameters and call `POST /api/v1/student/services/requests`.
3. For anonymous users, preserve the selected service and request intent across login, then resume the request flow using trusted server identity.
4. After successful creation, navigate to the canonical Student Workspace request/detail surface and show the created request ID/status.
5. Provide deterministic auth-required, validation, unavailable, duplicate/retry and API-error states; never display a success-like notice when no mutation occurred.
6. Add E2E coverage: direct service deep link → request CTA → authentication if needed → create request → view request detail.
7. Extend `public-ui:source:closure` beyond component/token presence so it verifies the real live-action handoff.

**Repair Wave:** W4 / W5 / W6 / W7  
**Status:** OPEN — PUBLIC_SERVICE_REQUEST_CTA_NOT_CONNECTED_TO_EXISTING_OWNER_REQUEST_FLOW

---

## Repository Completion Audit — Phase 06 Durable Import Recovery Worker (v0.48 — 2026-09-06)

### MNT-AUD-0086 — P1 HIGH — Phase 06 Durable Import Queue Has Inline First-Attempt Execution but No Runtime Poller for Scheduled Retries or Reclaimed Jobs
**Categories:** P06 / IMPORT / QUEUE / WORKER / RETRY / DLQ / RECOVERY / SCHEDULER / DURABILITY / CROSS_PHASE

**Evidence:**
- The durable import application exposes `ImportAdminUseCases.processNextQueuedBatch(workerId)` and documents it as “Intended for worker/scheduler composition”.
- `ImportWorkerProtocol` and the Prisma queue gateway implement real lease, heartbeat, completion, retry and recovery primitives; this is therefore not an in-memory-placeholder finding.
- Repository search finds `processNextQueuedBatch(...)` in its declaration and integration tests, but no active production runtime caller.
- A repository-wide search for `setInterval(...)` identifies the API server interval used for the certificate-completion outbox worker.
- `apps/api/src/server.ts` confirms that interval runs only `certificateCompletionOutboxWorker.runOnce(workerId)` behind certificate worker flags; it does not poll the Phase 06 import queue.
- Therefore the initial request can execute work inline, but a retry scheduled for a later `availableAt`, an abandoned lease after process death, or a queued replay has no autonomous production consumer.
- This was previously discovered in a non-canonical draft that accidentally reused `MNT-AUD-0081`; this clean continuation preserves the finding under the non-conflicting ID `MNT-AUD-0086`.
- This is more specific than `MNT-AUD-0007` (global background-job runtime gap): Phase 06 already has durable queue semantics whose **recovery path has no runtime caller**.

**Impact:**
- Transient failures can remain `RETRY_SCHEDULED` indefinitely after the initiating API request ends.
- Jobs abandoned by process crash/lease expiry are reclaimable in persistence but may never be reclaimed automatically.
- DLQ/replay and retry durability exist as storage/protocol concepts without complete production execution semantics.
- Phase 06 cannot claim resilient end-to-end asynchronous recovery despite having strong underlying queue primitives.

**Required remediation:**
1. Run the Phase 06 import worker through the approved global background-job architecture selected under `MNT-AUD-0007`.
2. Poll only due/reclaimable jobs; enforce bounded concurrency, stable worker identity, lease renewal, lease-loss fencing and graceful drain.
3. Honor `availableAt` and retry/backoff policy; expose controlled DLQ inspection/replay without requiring the original request process.
4. Add crash/restart and lease-expiry tests proving a later worker reclaims interrupted work and retries transient failures after backoff.
5. Add queue depth, oldest-due age, retries, lease loss, throughput and DLQ metrics under `MNT-AUD-0078`.
6. Decide explicitly whether first-attempt inline execution remains an optimization; it must not be the sole durable queue consumer.
7. Strengthen the Phase 06 source-closure verifier to require an actual runtime worker caller and lifecycle configuration.

**Repair Wave:** W1 / W3 / W6 / W7  
**Status:** OPEN — IMPORT_DURABLE_QUEUE_HAS_NO_AUTONOMOUS_RETRY_RECOVERY_WORKER

---

## Repository Completion Audit — GitHub Actions Supply-Chain Reproducibility (v0.49 — 2026-09-06)

### MNT-AUD-0087 — P2 MEDIUM — Security and Source-Closure Workflows Execute Third-Party/GitHub Actions Through Mutable Major Tags Instead of Immutable Commit SHAs
**Categories:** GITHUB_ACTIONS / SUPPLY_CHAIN / CI / SECURITY / REPRODUCIBILITY / GOVERNANCE / RELEASE

**Evidence:**
- `.github/workflows/ci.yml` uses actions such as `actions/checkout@v4`, `actions/setup-node@v4` and `actions/upload-artifact@v4`.
- `.github/workflows/security.yml` uses `actions/checkout@v4`, `actions/setup-node@v4`, `actions/dependency-review-action@v4` and `github/codeql-action/*@v3`.
- Additional source-architecture/runtime-closure workflows also reference actions through mutable major-version tags.
- The security workflow does correctly establish explicit token permissions (`contents: read`, with scoped `security-events: write` for CodeQL); the finding is therefore specifically about **action provenance/reproducibility**, not a blanket token-permission defect.
- Repository audit search found no canonical policy requiring workflow `uses:` references to immutable commit SHAs.
- This is distinct from `MNT-AUD-0048` (canonical CI omits active verifiers) and `MNT-AUD-0082` (branch protection/status enforcement absent).

**Impact:**
- A future movement/compromise of a referenced major tag changes executable CI/security code without changing this repository commit.
- The exact code that produced a historical security/source-closure result is not fully reproducible from the audited repository SHA alone.
- Security gates themselves remain exposed to avoidable third-party action supply-chain drift.

**Required remediation:**
1. Pin every external GitHub Action to a full immutable commit SHA and retain a human-readable release/version comment.
2. Automate reviewed action updates through Dependabot/Renovate or an equivalent controlled process.
3. Add a source guard that rejects non-SHA external `uses:` references except explicitly approved local actions.
4. Review action publishers and minimize permissions/credentials per job; retain the existing least-privilege permissions where already correct.
5. Include action-ref hashes in release/source-closure evidence for reproducibility.

**Repair Wave:** W0 / W6 / W7  
**Status:** OPEN — GITHUB_ACTIONS_EXTERNAL_REFS_NOT_IMMUTABLY_PINNED

---

### Live Register Update — v0.49 (2026-09-06)

- Registered finding IDs allocated: **87** (`MNT-AUD-0001` → `MNT-AUD-0087`).
- Duplicate/evidence-alias IDs excluded from canonical count remain: **3** (`MNT-AUD-0038`, `MNT-AUD-0039`, `MNT-AUD-0053`).
- **Canonical unique confirmed findings: 84**.
- Severity (canonical unique): **P0: 0 | P1: 62 | P2: 21 | P3: 1 | P4: 0**.
- Findings added/normalized in this continuation:
  - `MNT-AUD-0082` — repository boundary / unprotected `main` (retained from valid v0.44 continuation).
  - `MNT-AUD-0083` — database baseline evidence is not fail-closed/platform-complete.
  - `MNT-AUD-0084` — P11+ Admin mutations can default to no central mutation audit.
  - `MNT-AUD-0085` — Public Services request CTA is not wired to the existing Student Service Request API.
  - `MNT-AUD-0086` — Phase 06 durable import retry/recovery queue has no autonomous runtime poller.
  - `MNT-AUD-0087` — external GitHub Actions are not immutable-SHA pinned.
- The accidental second use of `MNT-AUD-0081` was removed from this clean continuation; canonical `0081` remains the Retention/Purge finding.
- No repository source, database, GitHub setting or production runtime was modified during this audit continuation.
- Frozen audit baseline remains `0931c5664cf274cb2b8f4cb250dd09ebf2e9a77f`.
- Project decision remains: **SOURCE_NOT_COMPLETE — AUDIT_IN_PROGRESS**.

### Audit Axis Checkpoint After v0.49

| Axis | Current checkpoint | Status |
|---|---|---|
| Migration / Data Integrity | `0083` added; existing `0041/0042/0066/0075/0079/0081` retained | **IN AUDIT** — remaining FK/orphan/reference/deployment-order sweep not yet exhausted |
| P23 Admin parity | `0084` added; existing `0044/0059/0062/0064/0065` retained | **IN AUDIT** — remaining route/action/permission/owner matrix still open |
| P24 Public parity | `0085` added; existing Compare/Search/Course/Saved/Application gaps retained | **IN AUDIT** — remaining live actions/deep links/data-origin/accessibility parity still open |
| Event / Worker matrix | `0086` normalized; existing `0007/0017/0034/0054/0058/0068/0077/0080` retained | **IN AUDIT** — remaining producer/consumer/orphan/scheduler matrix still open |
| CI / Release governance | `0082`, `0087`; existing `0048` and verifier drift retained | **IN AUDIT** — final verifier/document authority and release proof still open |
| Final deduplication | Numbering collision corrected; aliases unchanged | **PENDING** until remaining axes are exhausted |

### Next Mandatory Continuation After v0.49

1. Finish migration/data-integrity **FK/orphan/reference/delete-rule/index/default/nullability/deployment-order** sweep without duplicating existing migration findings.
2. Finish P23 every route/action ↔ permission ↔ authentication/session ↔ audit ↔ owner-domain matrix, including later owner domains.
3. Finish P24 every route/deep-link/live-action ↔ owner DTO ↔ data origin ↔ auth handoff ↔ error/empty/accessibility matrix.
4. Complete the event producer/consumer/outbox/scheduler/worker matrix across all phases and classify every orphan or runtime-only consumer.
5. Reconcile every active CI/verifier/workflow/document authority, then run final root-cause deduplication and freeze the remediation dependency graph.
6. Only after the audit axes are exhausted should source remediation begin; database/runtime mutation remains blocked until the approved recovery/runtime gates.


---

## Repository Completion Audit — Persistence Boundary / Unicode Identity / Career Events / Translation Semantics (v0.53 — 2026-09-06)

### MNT-AUD-0088 — P1 HIGH — Canonical Prisma Persistence Collapses Approved Bounded Contexts into One PostgreSQL Schema Instead of the Mandated Logical/Physical Schema Isolation
**Categories:** ARCHITECTURE / DATABASE / PRISMA / BOUNDED_CONTEXT / MODULAR_MONOLITH / SCHEMA_ISOLATION / MIGRATION / DATA_INTEGRITY / SOURCE_CLOSURE

**Evidence:**
- The approved Phase 02 bounded-context design makes database isolation an explicit acceptance criterion: each core Bounded Context must use a separate physical or logical database schema, and cross-database queries/foreign-key constraints are prohibited.
- Multiple active phase implementation guides preserve that architecture concretely with Prisma `@@schema(...)` mappings, including Majors (`majors`), Scholarships (`scholarships`), Learning (`learning_platform`), Universities (`universities`) and Tests (`tests`).
- The Phase 13 implementation guide explicitly shows a PostgreSQL datasource with `schemas = ["learning_platform"]` and states that the relational model is logically isolated through `@@schema("learning_platform")`.
- The actual canonical `packages/infrastructure/prisma/schema.prisma` datasource declares only `provider = "postgresql"` and `url = env("DATABASE_URL")`; it does not declare Prisma multi-schema `schemas = [...]`.
- The active canonical Prisma models likewise do not use the phase-level `@@schema(...)` mappings shown in the approved implementation guides; current migrations create domain tables in the default database schema.
- The late-domain migration `20260903210000_p8_late_domain_integrations` additionally creates Phase 20 Service and Phase 21 Career persistence in the same migration/default namespace, reinforcing that the source implementation has converged on a single shared physical schema without a recorded architecture supersession found by this audit.
- Repository search did not identify a current ADR formally replacing the approved schema-isolation rule with a single-schema persistence model plus equivalent boundary controls.

**Impact:**
- The physical persistence model no longer matches the approved bounded-context isolation contract even though documentation and phase guides still describe that isolation as authoritative.
- Table ownership, migration ownership and future extraction boundaries are materially weaker because domain persistence is co-located in one schema namespace.
- Accidental cross-domain coupling and direct relational access become easier to introduce and harder to detect.
- Greenfield migration/recovery evidence can validate the current Prisma schema while still violating the architecture it is supposed to implement.
- The platform cannot claim architecture/source parity until this decision is reconciled explicitly.

**Required remediation:**
1. Submit this divergence to the Architecture Review Board before implementation remediation begins.
2. Choose and document one canonical persistence strategy: (a) implement logical schema isolation with Prisma multi-schema/context-owned migrations, or (b) formally supersede the Phase 02/phase-guide requirement and define equivalent enforceable module/database-boundary controls.
3. If multi-schema remains authoritative, map every owner-domain model to its context schema, define permitted reference/shared schemas, and sequence migration/backfill work through the database recovery gate.
4. Prohibit direct cross-context ORM access through architecture/source guards; cross-context reads/writes must use owner contracts/read models/events as approved.
5. Add a machine-readable persistence ownership manifest and a source verifier that fails when a model is placed outside its owner schema or a migration mixes forbidden owners.
6. Add disposable-PostgreSQL greenfield migration tests proving schema creation, permissions, FK policy and migration ordering.
7. Reconcile all phase implementation guides, Prisma source and recovery documentation so only one database-boundary authority remains.

**Repair Wave:** W0 / W1 / W2 / W6 / W7  
**Status:** OPEN — PRISMA_PERSISTENCE_DOES_NOT_IMPLEMENT_APPROVED_BOUNDED_CONTEXT_SCHEMA_ISOLATION

---

### MNT-AUD-0089 — P1 HIGH — Implemented Phase 21 Career Employer/Job Mutations Do Not Publish the Enterprise Career Events Declared by the Active Phase Contract
**Categories:** P21 / CAREER / EVENTS / OUTBOX / INTEGRATION / SEARCH / NOTIFICATIONS / ANALYTICS / P23 / P24 / SOURCE_CLOSURE

**Evidence:**
- The active Phase 21 domain/application contract states that Career application services orchestrate multi-aggregate workflows and dispatch events when jobs are published or applications are submitted.
- The Phase 21 event contract declares enterprise facts including `ProfileCreatedEvent`, `ProfileUpdatedEvent`, `JobPostedEvent`, `JobClosedEvent` and `ApplicationSubmittedEvent`, intended for enterprise consumers such as P23/P24 and downstream systems.
- The currently implemented Phase 21 slice contains real employer/job lifecycle operations: employer creation/status review, job creation/update, readiness transition, publish and archive.
- `CareerAdminUseCases` mutates the `ICareerRepository` directly. `publish()` validates lifecycle/employer/deadline conditions and then calls `repository.updateJobStatus(..., PUBLISHED)`; `archive()` similarly writes `ARCHIVED` directly.
- The use case has only `ICareerRepository` and `ICareerReferenceGateway` dependencies; it has no enterprise event publisher, transactional outbox coordinator or event factory dependency.
- Repository searches for the declared Career event names did not find an active producer implementation corresponding to job publish/archive or employer lifecycle mutations.
- The shared enterprise event/outbox foundation exists elsewhere in the repository, so this is a producer-integration gap inside the implemented Career slice rather than absence of the global event foundation.
- This is distinct from `MNT-AUD-0055` (large portions of Phase 21 are structurally missing) and `MNT-AUD-0080` (core aggregate event dispatch defect): this finding concerns event publication for the **implemented** Career employer/job owner workflow.

**Impact:**
- Publishing or closing a job does not reliably emit the enterprise fact that downstream consumers are contractually expected to consume.
- Search indexing, notifications, analytics, activity feeds and future P23/P24 projections must poll or couple synchronously instead of reacting to owner-domain facts.
- External/future extracted services cannot depend on the Phase 21 event contract even though the documentation presents it as part of the bounded-context interface.
- A repository transaction can commit the job status while no corresponding event exists, causing permanent integration divergence.

**Required remediation:**
1. Define executable Phase 21 event types/versioned payload contracts for the currently implemented employer/job slice.
2. Publish `JobPosted`/`JobClosed` (and approved employer lifecycle events) atomically with owner-state mutation through the transactional outbox/event foundation.
3. Carry stable event ID, aggregate ID/public ID, correlation/causation metadata, actor/source and schema version.
4. Add idempotent downstream consumers or read-model/index adapters where the active roadmap requires them.
5. Add transaction-failure tests proving state cannot commit without its outbox fact and replay tests proving duplicate delivery is safe.
6. Add Phase 21 producers/consumers to the enterprise Event/Worker matrix and current source-closure verifier.
7. Reconcile the event-contract documentation with the actually implemented Phase 21 scope; do not claim application/profile events until those owner slices exist under `MNT-AUD-0055`.

**Repair Wave:** W2 / W3 / W5 / W6 / W7  
**Status:** OPEN — PHASE21_IMPLEMENTED_CAREER_MUTATIONS_DO_NOT_PUBLISH_DECLARED_ENTERPRISE_EVENTS

---

### MNT-AUD-0090 — P2 MEDIUM — Arabic Web/Admin Dictionaries Contain Untranslated Mixed-English Production Copy While the Translation Quality Gate Checks Structure, Not Target-Language Semantics
**Categories:** I18N / L10N / ARABIC / CONTENT_QUALITY / UI / P23 / P24 / CI / VERIFIER_TRUTH / SOURCE_CLOSURE

**Evidence:**
- Both `apps/admin/src/i18n/ar.ts` and `apps/web/src/i18n/ar.ts` contain Arabic dictionary entries with untranslated English copy, for example `"view_service": "عرض service"`.
- The same Arabic dictionaries contain a long mixed-language value beginning `"استكشاف MANARATAK student, document, visa, travel, academic, and auxiliary support services."`.
- `scripts/verify-translation-quality-source.ts` checks AR/EN key parity, empty values, literal translation-key coverage, provider direction/lang wiring, locale contracts, source-shape clauses, projection/import contracts and SEO contracts.
- The gate does not perform target-language semantic validation, untranslated-token detection, mixed-language ratio checks, human-review status checks or an allow-listed proper-name/technical-term policy.
- The gate can therefore eventually report `TRANSLATION_SOURCE_QUALITY_GATE = PASS` while user-visible Arabic dictionary values still contain accidental English prose.
- This is distinct from `MNT-AUD-0009`, which records that the current translation gate itself can fail because of brittle literal/source-shape assertions. `0090` records the opposite blind spot: semantic Arabic defects are outside what the gate proves.

**Impact:**
- Arabic-first Admin/Public surfaces can visibly leak untranslated English phrases and inconsistent terminology.
- “Translation quality PASS” is not sufficient evidence that the Arabic presentation copy is actually Arabic or publication-ready.
- Duplicated Web/Admin dictionary defects can propagate consistently across both products while still passing structural parity checks.

**Required remediation:**
1. Correct all Arabic dictionary values containing accidental English prose, preserving explicitly approved brands/acronyms/technical terms only.
2. Add a Unicode/script-aware semantic localization lint that flags suspicious Latin-word sequences in Arabic values with an explicit allow-list.
3. Distinguish approved mixed technical labels from untranslated prose through metadata or lint exceptions that require review justification.
4. Add representative tests for Arabic presentation copy, especially service/career/finance/admin operational terminology.
5. Reconcile Web/Admin dictionary ownership to reduce duplicated copy drift where a shared translation catalog is appropriate.
6. Keep this semantic quality check separate from the infrastructure-only domain-content translation policy.

**Repair Wave:** W4 / W5 / W6 / W7  
**Status:** OPEN — ARABIC_DICTIONARY_SEMANTIC_QUALITY_NOT_COVERED_BY_TRANSLATION_GATE

---

### MNT-AUD-0091 — P1 HIGH — Phase 20 Service and Phase 21 Career Canonicalization Is ASCII-Only, Breaking Arabic Identity, Deduplication and Slug Semantics
**Categories:** P20 / P21 / ARABIC / UNICODE / NORMALIZATION / DEDUPLICATION / SLUG / DATA_INTEGRITY / I18N / SOURCE_CLOSURE

**Evidence:**
- `AdminServiceCatalogUseCases.normalizeServiceName()` removes every character outside `[a-z0-9\\s]` after lower-casing and marketing-word removal.
- `CareerAdminUseCases.normalizeText()` uses the same ASCII-only character class.
- For an Arabic-only Phase 20 service name, `canonicalName` therefore becomes an empty string. The service is not rejected; its dedup key becomes effectively `|serviceCategory|fulfillmentType|deliveryMode`, and `slugify()` falls back to `service` before appending the hash.
- Consequently two different Arabic service names with the same category/fulfillment/delivery tuple can collapse onto the same canonical dedup identity and be treated as duplicates.
- For an Arabic-only Career employer, `createEmployer()` computes the empty canonical name and then throws `Employer displayName is required` even though the submitted Arabic `displayName` is non-empty.
- For Arabic-only Career job titles, `canonicalTitle` becomes empty and the dedup key loses the title dimension; `slugify()` falls back to `career`.
- The existing Career unit tests use English employer/job names (`Tech Company`, `Software Engineer`, etc.) and do not exercise Arabic or general Unicode canonicalization.
- Repository search for this ASCII-only normalization pattern found it in the Phase 20 Service and Phase 21 Career use cases, making this a cross-late-domain implementation defect rather than an isolated UI-copy issue.

**Impact:**
- Arabic employer records can be impossible to create through the canonical Career application service.
- Distinct Arabic job opportunities can collide because their title identity is erased before deduplication.
- Distinct Arabic service names can collide and be rejected as duplicates based only on non-name dimensions.
- Canonical names/slugs become semantically meaningless for the platform's primary Arabic language and can damage deep links, search, imports and cross-domain references.
- This is a data-integrity defect: once incorrect canonical/dedup keys are persisted, later remediation may require controlled re-key/backfill and collision resolution.

**Required remediation:**
1. Replace ASCII-only normalization with a shared Unicode-aware canonicalization service using explicit normalization form (for example NFKC/NFC as approved), Unicode letter/number classes and locale-independent case handling.
2. Define Arabic normalization rules deliberately: whitespace, tatweel/diacritics policy, Arabic letter variants and punctuation must be decided by the Reference/i18n architecture rather than stripped implicitly.
3. Separate human-readable slug generation from dedup identity; use stable public IDs and a Unicode/transliteration slug policy that cannot erase the entire name.
4. Add Arabic and multilingual unit/property tests for Service and Career create/update/dedup flows, including two distinct Arabic names under identical non-name dimensions.
5. Audit already staged/persisted records after the database recovery gate for empty/degenerate `canonicalName`, `canonicalTitle`, dedup keys and fallback-only slugs.
6. Build a collision-safe remediation/backfill plan before changing canonical keys on any existing database.
7. Add a source guard prohibiting ad-hoc ASCII-only identity normalizers in owner domains.

**Repair Wave:** W0 / W2 / W4 / W6 / W7  
**Status:** OPEN — ASCII_ONLY_CANONICALIZATION_BREAKS_ARABIC_SERVICE_AND_CAREER_IDENTITY

---

### Live Runtime/CI Reconciliation Checkpoint — v0.53 (2026-09-06)

- The frozen repository baseline is unchanged at `0931c5664cf274cb2b8f4cb250dd09ebf2e9a77f`.
- GitHub Actions history for that exact SHA confirms four workflow runs were created.
- `Source Architecture Guards` succeeded and `Security Gates` succeeded.
- `Enterprise CI Pipeline` failed because the `Translation quality gates` job failed, while its `Full source closure gates` job itself completed successfully.
- `Imported Courses Source Closure` failed specifically at `Imported-course static security invariants`; its later memory rehearsal, production dependency audit and aggregate closure steps were skipped.
- This runtime CI evidence strengthens existing `MNT-AUD-0009`, `MNT-AUD-0010`, `MNT-AUD-0048` and `MNT-AUD-0082`; no duplicate CI finding was created in this continuation.
- The Phase 20/21 Unicode canonicalization defect (`0091`) is not exposed by the current green typecheck/lint/unit portion of the Full Source Closure job because existing tests do not exercise Arabic identity normalization.

### Live Register Update — v0.53 (2026-09-06)

- Registered finding IDs allocated: **91** (`MNT-AUD-0001` → `MNT-AUD-0091`).
- Duplicate/evidence-alias IDs excluded from canonical count remain: **3** (`MNT-AUD-0038`, `MNT-AUD-0039`, `MNT-AUD-0053`).
- **Canonical unique confirmed findings: 88**.
- Severity (canonical unique): **P0: 0 | P1: 65 | P2: 22 | P3: 1 | P4: 0**.
- New canonical findings in this deep sweep:
  - `MNT-AUD-0088` — canonical Prisma persistence does not implement approved bounded-context database schema isolation.
  - `MNT-AUD-0089` — implemented Phase 21 Career mutations do not publish declared enterprise Career events.
  - `MNT-AUD-0090` — Arabic dictionaries contain mixed-English copy outside the semantic coverage of Translation Quality gates.
  - `MNT-AUD-0091` — ASCII-only Service/Career canonicalization breaks Arabic identities, deduplication and slugs.
- No source, database, GitHub setting or production runtime mutation has been executed.
- Project decision remains: **SOURCE_NOT_COMPLETE — AUDIT_IN_PROGRESS**.

### Audit Axis Checkpoint After v0.53

| Axis | Deep-sweep result | Status |
|---|---|---|
| Migration / Data Integrity | `0088` schema-isolation drift + `0091` Unicode identity corruption risk; prior migration/recovery findings retained | **IN AUDIT** — final enum/check/index/orphan/deployment-order reconciliation remains |
| P23 Admin parity | No duplicate added; `0084` remains the broad later-domain mutation-audit root cause | **IN AUDIT** — final every-action matrix remains |
| P24 Public parity | `0090` Arabic semantic copy defect; `0085` request CTA remains open | **IN AUDIT** — remaining actions/accessibility/data-origin reconciliation remains |
| Event / Worker matrix | `0089` adds Phase 21 producer gap; prior missing workers/outbox defects retained | **IN AUDIT** — final producer/consumer orphan classification remains |
| CI / Release governance | Exact-SHA live workflow state reconciled: overall CI and Imported Courses closure are red | **IN AUDIT** — release/document authority proof remains |
| Final deduplication | Four findings passed root-cause separation against existing register | **PENDING** until all axes are exhausted |

### Next Mandatory Continuation After v0.53

1. Complete the remaining Prisma integrity sweep for lifecycle-value enforcement, unique/index coverage, nullability/default consistency, orphan/reference handling and migration dependency order.
2. Finish P23 route/action permission/auth/session/audit/owner matrix, with special attention to later domains whose mutations now fall under `MNT-AUD-0084`.
3. Finish P24 route/deep-link/live-action/accessibility and public-auth handoff matrix beyond the already recorded Service/Compare/Course/Saved/Application issues.
4. Complete event/outbox producer-consumer matrix across CMS, Finance, Career, Services, AI, Notifications, Learning/Certificates and Import; classify every declared event as produced/consumed/runtime-pending/orphaned.
5. Reconcile release/deployment authority, active workflow coverage and document authority; existing conceptual deployment documentation must not be treated as physical production proof.
6. Perform final root-cause deduplication and freeze the remediation dependency graph only after these axes are exhausted.

---

## Repository Completion Audit — Learner Delivery Handoff + Learning Event Continuity (v0.55 — 2026-09-06)

### MNT-AUD-0092 — P1 HIGH — Phase 13 Has a Real Authenticated Learner/LMS API but the Web Product Has No Enrollment or Learning-Workspace Composition
**Categories:** P13 / P15 / P24 / LEARNING / LMS / ENROLLMENT / LEARNER_UX / ROUTING / API / AUTH_HANDOFF / SOURCE_CLOSURE

**Evidence:**
- `CourseLearnerRouter` is a real authenticated owner-domain API. It exposes native-learning commands and reads under `/student/courses`, including course enrollment, learning-path enrollment, learner workspace, progress, lesson progress, quiz attempts/submission and course completion.
- The API composition mounts this learner router beneath the authenticated student surface; therefore the backend capability is not a prototype-only contract.
- Repository-wide search of `apps/web/src` found no call to `/student/courses` and no client method composing the learner API.
- The web API client retrieves courses through the public owner read path (`/public/courses/:slug`) rather than exposing the authenticated learner commands/workspace.
- `apps/web/src/router/index.tsx` exposes public `/courses` and `/courses/:slug` plus the generic `/student` workspace, but no authenticated course-learning/workspace route.
- The live `StudentWorkspacePage` hydrates dashboard, finance, snapshots and saved items; it does not compose Phase 13 enrollment, learner workspace, lessons, quizzes or progress commands.
- Phase 24's approved UX contract correctly states that public course pages are presentation/read-model composition only and that authenticated course progress/lesson behavior belongs to Phase 13 LMS execution plus the authenticated student experience. The missing defect is therefore the absent handoff/composition layer, not a request for Phase 24 to own LMS state.
- `verify-p13-final-source-closure.mjs` checks that the live Student Workspace and owner-read hydration exist, but it does not require a web caller/route for `CourseLearnerRouter`; it can therefore classify P13 source closure without proving that a learner can reach the implemented LMS runtime from the product UI.
- This finding is distinct from `MNT-AUD-0069`: `0069` concerns public course origin/catalog misclassification. Even after correcting native/imported presentation, the authenticated native-learning runtime would still be headless.

**Impact:**
- A published native MANARATAK course can have curriculum, enrollment policy, progress, quizzes and completion logic in source while a real user has no web journey to enroll and consume it.
- The product can advertise native/internal courses but stop at discovery/detail rather than transition into the internal LMS.
- End-to-end P13/P15 learner acceptance cannot be claimed from the current web source even though the backend owner API is substantial.
- Course completion/certificate paths can be technically implemented but practically unreachable through the canonical web product.

**Required remediation:**
1. Add authenticated Web API client methods for the owner `/student/courses` endpoints without duplicating Phase 13 business rules in the client.
2. Implement canonical learner routes/components for enrollment, native-course workspace, modules/lessons, progress, quiz attempts and completion.
3. Add the public-to-authenticated handoff: a native course action should authenticate when necessary and then route to the authoritative learner workspace using stable owner IDs.
4. Preserve external/imported behavior: external linked courses must continue to use their approved provider/direct-course URL and must never enter MANARATAK local progress tracking.
5. Surface enrollment-policy outcomes such as approval required, prerequisites, capacity/waitlist and Finance clearance using owner errors/read models.
6. Integrate the live Student Workspace's learning cards/actions with the same Phase 13 learner routes rather than a parallel client-side state model.
7. Add browser E2E covering login -> native course -> enroll -> lesson/progress -> quiz -> completion -> dashboard/certificate handoff.
8. Extend P13/P15/P24 source verifiers so source closure requires a reachable authenticated learner journey, not merely backend route existence and dashboard read hydration.

**Repair Wave:** W4 / W5 / W6 / W7  
**Status:** OPEN — AUTHENTICATED_COURSE_LEARNER_RUNTIME_HAS_NO_WEB_PRODUCT_COMPOSITION

---

### MNT-AUD-0093 — P1 HIGH — Phase 13 Enrollment and Progress Mutations Do Not Publish the Learning Events Phase 15 Is Designed to Consume
**Categories:** P13 / P15 / EVENT_FOUNDATION / OUTBOX / LEARNING / ENROLLMENT / PROGRESS / INTEGRATION / CONTRACT_DRIFT / SOURCE_CLOSURE

**Evidence:**
- `CourseProgressUseCases.completeCourse(...)` uses `AtomicDomainMutationCoordinator` and appends the durable `CourseCompleted` event to the transactional outbox in the same mutation as completion persistence.
- In the same use case, `enroll(...)` persists enrollment through `progressRepository.enrollWithCapacity(...)` and returns the snapshot without appending an enrollment integration event.
- `markLessonProgress(...)` persists lesson progress and recalculates enrollment progress without appending a `CourseProgressUpdated` integration event.
- The Phase 15 repository explicitly contains projection logic for learning events including `CourseEnrolled`, `CourseProgressUpdated` and `CourseCompleted`.
- The Phase 15 architecture states that Student Workspace timeline/read models synchronize from `CourseEnrolled`/course-progress/completion ecosystem events.
- The current Phase 15 source-closure/runbook explicitly lists the first learning events that must be connected as `CourseEnrollmentCreated`, `CourseProgressUpdated` and `CourseCompleted`, but repository search finds `CourseEnrollmentCreated` only in that runbook while the actual P15 projection checks `CourseEnrolled` — an unresolved event-name/schema contract mismatch exists before transport is even enabled.
- `CourseCompleted` is therefore materially different from enrollment/progress: completion has a real atomic outbox producer, while enrollment/progress currently have consumers/documented expectations but no corresponding owner producer path.
- This is distinct from `MNT-AUD-0016` (Identity -> P15 provisioning consumer wiring) and `MNT-AUD-0080` (legacy/core Identity/Settings event publication foundation). The defect here is specifically the newer Phase 13 learning mutation/event contract: two real owner mutations never create the integration events expected by P15.

**Impact:**
- Student Workspace can remain stale after enrollment or ongoing lesson progress even if a future P15 event worker is enabled correctly.
- Timeline, “continue learning”, learning statistics and cross-device progress projections cannot be event-consistent because the authoritative owner never emits the required change signals.
- Runtime configuration cannot repair this: there is no queued message to consume for enrollment/progress mutations.
- The event-name mismatch (`CourseEnrollmentCreated` vs `CourseEnrolled`) creates an additional interoperability hazard even if a producer is later added ad hoc.

**Required remediation:**
1. Define one versioned canonical learning integration-event contract for enrollment and progress, including the exact event names and payload schemas consumed by Phase 15.
2. Publish enrollment and meaningful progress mutations through the same governed transactional outbox/atomic mutation boundary already used successfully for `CourseCompleted`.
3. Include stable `courseId`, `studentReferenceId`, enrollment ID, progress/version/timestamp and correlation metadata needed by downstream projections without leaking owner-internal mutable state.
4. Make P15 ingestion idempotent against the canonical event IDs and versions; remove alternate event-name assumptions.
5. Add contract tests proving every successful owner mutation commits state + event atomically, while failed mutations publish nothing.
6. Add cross-phase tests proving enrollment/progress events update the P15 learning projection exactly once under duplicate delivery/replay.
7. Update the Enterprise Event Catalog, Phase 15 runbook, cross-phase matrix and source verifiers to the single canonical names and ownership rules.
8. Link worker/transport deployment to the existing global Event/Worker findings, but do not treat runtime workers as a substitute for missing producers.

**Repair Wave:** W1 / W3 / W4 / W6 / W7  
**Status:** OPEN — LEARNING_ENROLLMENT_AND_PROGRESS_EVENTS_HAVE_NO_OWNER_OUTBOX_PRODUCERS

---

### Live Register Update — v0.55 (2026-09-06)

- Registered finding IDs allocated: **93** (`MNT-AUD-0001` → `MNT-AUD-0093`).
- Duplicate/evidence-alias IDs excluded from canonical count remain: **3** (`MNT-AUD-0038`, `MNT-AUD-0039`, `MNT-AUD-0053`).
- **Canonical unique confirmed findings: 90**.
- Severity (canonical unique): **P0: 0 | P1: 67 | P2: 22 | P3: 1 | P4: 0**.
- New findings in this continuation:
  - `MNT-AUD-0092` — authenticated Phase 13 LMS/learner backend exists but has no canonical Web enrollment/learning-workspace journey.
  - `MNT-AUD-0093` — Phase 13 enrollment/progress mutations do not produce the learning integration events expected by Phase 15; enrollment event naming is also inconsistent.
- Positive evidence retained: `CourseCompleted` already uses the atomic mutation + transactional-outbox pattern, providing a concrete implementation baseline for repairing `0093`.
- `MNT-AUD-0016`, `0069`, `0080` and `0093` remain separate root causes after deduplication: provisioning consumer wiring, public course-origin composition, legacy/core event publication, and Phase 13 learning event production respectively.
- No source, database, GitHub setting or production runtime mutation has been executed.
- Frozen baseline remains `0931c5664cf274cb2b8f4cb250dd09ebf2e9a77f`.
- Project decision remains: **SOURCE_NOT_COMPLETE — AUDIT_IN_PROGRESS**.

### Deep-Sweep Axis Checkpoint After v0.55

| Axis | Result | Status |
|---|---|---|
| Migration / Data Integrity | `0088`, `0091` plus prior recovery/migration findings; physical-design timestamp/index rules identified for authority reconciliation | **IN AUDIT** — do not promote Draft-only physical rules to defects until authority is reconciled |
| P23 Admin parity | No duplicate added in this slice; Services→Finance handoff is owner-application mediated and remains under the broader permission/audit matrix | **IN AUDIT** |
| P24 / Product handoff | `0092` adds the missing authenticated learner transition behind native-course discovery; `0069` remains public origin classification | **IN AUDIT** |
| Event / Worker matrix | `0093` adds missing P13 enrollment/progress producers; `CourseCompleted` positive path verified | **IN AUDIT** — remaining P15/Certificate/Finance/CMS/Notifications consumers still require final classification |
| CI / verifier truth | P13 final verifier does not prove reachability of learner runtime; linked to `0092` and existing `0048` rather than counted separately | **IN AUDIT** |
| Final deduplication | IDs through `0093` root-separated; aliases unchanged | **PENDING** |

### Next Mandatory Continuation After v0.55

1. Finish the Event/Worker producer-consumer table and explicitly classify every P15 expected event (`Identity`, Learning, Certificate, Finance, Notifications) as produced, consumed, transport-wired or orphaned.
2. Finish P23 every-action authorization and central/business-audit parity, especially cross-owner commands that delegate into Finance/Assets/Imports.
3. Finish P24/public + authenticated handoff paths for courses, services, scholarships, tools and careers, including unavailable/error/auth-required outcomes.
4. Reconcile database physical-design authority before creating any additional schema/index/timestamp findings; only Approved/Baselined requirements or executable invariants should become canonical defects.
5. Finish active verifier/release/document-authority reconciliation and perform final file-by-file stale/dead/orphan source scan.
6. Only after all axes are exhausted freeze the final remediation dependency graph and begin source repair.

---

## Repository Completion Audit — Delivery Pipeline + Legacy Dummy Authority + Late-Domain Concurrency (v0.58 — 2026-09-06)

### MNT-AUD-0094 — P1 HIGH — CI Verifies Source but No Executable Immutable-Artifact Release/Environment-Promotion Pipeline Exists
**Categories:** CI_CD / RELEASE / DEPLOYMENT / ARTIFACT / PROMOTION / GOVERNANCE / TRACEABILITY / SOURCE_CLOSURE

**Evidence:**
- The approved and baselined Phase 3.16 CI/CD Foundation requires separation of integration and delivery, generation of one versioned immutable verified deliverable, promotion of that same artifact through validation environments, auditable approval checkpoints, declarative version-controlled delivery workflows, and traceability from deployed artifact back to the source change.
- The frozen repository contains only four GitHub Actions workflows: `ci.yml`, `imported-courses-runtime-closure.yml`, `security.yml`, and `source-architecture-guards.yml`.
- Those workflows perform source/build/security/runtime-closure verification; none defines application artifact packaging/publication, an artifact registry handoff, staged environment promotion, production approval, deployment orchestration, post-deploy verification, or release rollback/provenance.
- Root `package.json` contains build/test/source-verifier commands and database-remediation commands, including `db:remediation:deploy`, but no application release/package/publish/promote/deploy workflow that creates and advances an immutable API/Web/Admin deliverable.
- Current governance/reality documents independently acknowledge that application Dockerfiles/images and production containerization/deployment automation are deferred; therefore this is not merely missing runtime evidence for an implemented pipeline.
- This is distinct from `MNT-AUD-0048` (the canonical CI omits active source verifiers), `MNT-AUD-0052` (operations documentation describes nonexistent topology), `MNT-AUD-0082` (branch protection/required checks), and `MNT-AUD-0087` (mutable third-party Action tags). Even with all four fixed, the source would still lack a delivery/promotion implementation.

**Impact:**
- A green source build cannot be converted through repository-defined mechanics into the governed immutable deliverable described by the approved architecture.
- Deployment to Google Studio or another target would require an operator to invent packaging, release, environment promotion and approval mechanics outside the audited source.
- There is no executable chain-of-custody proving that staging and production run the exact artifact that passed source/security checks.
- Rollback, promotion approvals and post-deployment evidence cannot be enforced as part of a single canonical release authority.

**Required remediation:**
1. Define the canonical deployable units for API, Web and Admin and implement deterministic packaging for each (container image or another explicitly approved immutable artifact format).
2. Add a version-controlled delivery workflow that publishes artifacts to an approved registry using immutable digest/version references.
3. Separate CI verification from CD promotion while binding promotion to the exact verified commit/artifact digest.
4. Implement sequential validation/staging/production promotion with auditable approval/environment controls for critical environments.
5. Integrate database migration/remediation gates so application promotion cannot silently bypass migration baseline, dry-run, backup/rollback and runtime-validation requirements.
6. Add post-deployment health/smoke verification, explicit rollback procedure and immutable release evidence containing source SHA, artifact digests, environment, approvals and deployment result.
7. Add provenance/SBOM/signing or equivalent supply-chain evidence according to the final release-governance standard.
8. Reconcile Phase 3.16, containerization/deployment docs and handoff runbooks against the executable delivery workflow; no conceptual blueprint may be counted as physical source closure.

**Repair Wave:** W0 / W6 / W7  
**Status:** OPEN — SOURCE_HAS_CI_VERIFICATION_BUT_NO_CANONICAL_RELEASE_PROMOTION_PIPELINE

---

### MNT-AUD-0095 — P1 HIGH — The Production Domain Barrel Still Exports `generated/dummy.ts`, and Active Use Cases Compile Against Dummy `any` Contracts
**Categories:** DOMAIN / TYPE_SAFETY / STUBS / LEGACY / SOURCE_TRUTH / WORKFLOW / LOCALIZATION / GOVERNANCE / SOURCE_CLOSURE

**Evidence:**
- `packages/domain/src/index.ts`, the production `@manaratak/domain` barrel, still executes `export * from './generated/dummy';`.
- `packages/domain/src/generated/dummy.ts` is not a harmless empty compatibility shim: it defines broad domain classes/interfaces/enums with permissive `[key: string]: any`, `constructor(..._args: any[])`, dynamic static keys and `DUMMY` enum values across Integration, Localization, Logging, Monitoring, Notifications, Membership/Organization, Search, Security Policy, Shared Components, Workflow and other capabilities.
- Active production application code imports those symbols through `@manaratak/domain`. `ManageWorkflowsUseCase` imports `IWorkflowRepository`, `Workflow`, and related workflow symbols; `ManageLocalizationsUseCase` imports `ILocalizationRepository` and localization lifecycle/contracts that currently resolve from the dummy authority.
- The active Phase 05 traceability matrix itself identifies Workflow and Localization repository authority as `packages/domain/src/generated/dummy.ts (Dummy generated)`.
- Historical Sprint 2.2 documentation records that `dummy.ts` was intentionally created to bridge compilation gaps and inventories hundreds of temporary stubs that were required to be replaced in later sprints.
- Current source verifiers contain targeted assertions that selected later domains such as Scholarships/Services no longer depend on generated/dummy authority, but there is no repository-wide guard preventing the root production domain barrel from continuing to expose the legacy dummy surface.
- This is distinct from `MNT-AUD-0049`: `0049` concerns mounted control-plane routes resolving to `UNAVAILABLE` persistence. Replacing those repositories alone would not restore type-safe domain contracts while the global dummy barrel remains active; conversely removing dummy exports alone would not implement the missing persistence.

**Impact:**
- Typecheck/build success can be obtained against structurally meaningless `any` contracts rather than the approved domain invariants, creating false source-closure evidence.
- Refactors can silently compile despite missing methods, invalid lifecycle states or incompatible DTO shapes because dummy interfaces/classes accept arbitrary keys and constructor arguments.
- Multiple foundation capabilities have two competing narratives: baseline documentation says real domain files/contracts exist while the canonical barrel continues to expose generated stubs.
- The dummy authority can mask dead/orphan implementations and makes dependency, API and event contract audits materially less trustworthy.

**Required remediation:**
1. Inventory every export in `generated/dummy.ts` and classify it as REQUIRED_NOW, FORMALLY_DEFERRED, HISTORICAL_COMPATIBILITY or REMOVE.
2. For every required capability, create/restore the real typed domain aggregate/value-object/interface/event files and update production imports to those canonical modules.
3. For deferred capabilities, remove production barrel exposure and ensure no mounted route/use case claims an operational contract that exists only as a dummy symbol.
4. Remove `export * from './generated/dummy'` from the production domain barrel once all required dependencies are migrated; if a temporary compatibility module must remain, isolate it outside production exports and forbid use from runtime roots.
5. Add a repository-wide architecture/source-quality guard that fails on production imports/exports of `generated/dummy`, permissive stub signatures and `DUMMY` lifecycle values.
6. Reconcile Phase 05 traceability and implementation baselines with the final real file paths and ownership contracts.
7. Re-run typecheck, source closure, API contract and event/worker audits after dummy removal because previously accepted compilation may reveal concealed missing contracts.

**Repair Wave:** W0 / W1 / W3 / W6 / W7  
**Status:** OPEN — GENERATED_DUMMY_REMAINS_ACTIVE_PRODUCTION_DOMAIN_AUTHORITY

---

### MNT-AUD-0096 — P2 MEDIUM — Phase 20 Service and Phase 21 Career Mutable Records Have No Version-Based Concurrency/Fencing Against Lost Updates
**Categories:** DATABASE / CONCURRENCY / DATA_INTEGRITY / P20 / P21 / ADMIN / OPTIMISTIC_LOCKING / SOURCE_CLOSURE

**Evidence:**
- The approved and baselined Phase 3.5 Database Foundation requires version-based concurrency control for shared resources: persistence adapters must detect intervening modification and prevent concurrent stale overrides.
- The Phase 20 `ServiceCatalogRecord` / `ServiceRequestRecord` DDL and current Prisma persistence do not carry a `version`/revision field used for optimistic concurrency.
- `PrismaServicePlatformRepository.update(...)`, `updateStatus(...)`, `updateRequestStatus(...)`, `linkFinanceInvoice(...)` and `assignProvider(...)` update rows with `where: { id }` only; there is no expected-version predicate or compare-and-set failure path.
- Phase 20 Admin mutation DTOs/routes likewise do not carry `expectedVersion`/ETag/revision preconditions for editing or lifecycle transitions.
- Phase 21 `PrismaCareerRepository.updateEmployer(...)`, `updateJob(...)` and `updateJobStatus(...)` also update with `where: { id }` only, and the late-domain Career persistence records have no version/fencing field.
- These are shared admin-managed records with multiple lifecycle/editor mutations, so the approved concurrency requirement is applicable rather than theoretical.
- Other current platform areas demonstrate the intended pattern: Student Workspace uses `version`/`expectedVersion`, and Finance performs version-constrained mutations; the omission is therefore specific to late-domain implementation rather than an absent project-wide design.

**Impact:**
- Two administrators or concurrent workflows can read the same Service/Career state and overwrite each other without detecting a stale edit.
- Lifecycle transitions can race with metadata edits or provider/finance updates, causing lost updates and state/data combinations that passed validation independently but were never reviewed together.
- Audit logs may record both commands while the persistence layer silently preserves only the last writer, reducing operational traceability.
- Google Studio/database provisioning cannot add correct concurrency semantics by configuration; version fields, API preconditions and repository compare-and-set behavior must exist in source/migrations.

**Required remediation:**
1. Add explicit monotonic `version`/revision fields to mutable Service and Career aggregate persistence models through controlled migrations.
2. Include the current version in Admin/read DTOs and require `expectedVersion` (or an approved ETag/If-Match equivalent) on state-changing administrative commands.
3. Change repository mutations to compare-and-set on `{ id, version: expectedVersion }` and atomically increment the version; zero-row updates must surface a stable conflict error.
4. Ensure multi-step Service request operations such as provider assignment, invoice linking and status transitions use the same concurrency/fencing authority and do not bypass aggregate state validation.
5. Add concurrent-update tests proving one of two stale writers is rejected rather than silently overwriting the other.
6. Add Admin UI conflict handling that reloads current owner state and requires an explicit re-review/retry instead of automatic last-write-wins.
7. Extend late-domain source-closure verifiers to assert versioned mutation contracts for shared mutable records.

**Repair Wave:** W2 / W4 / W5 / W6  
**Status:** OPEN — LATE_DOMAIN_MUTATIONS_ALLOW_SILENT_LAST_WRITE_WINS

---

### Database-Authority Reconciliation Note — v0.58

- Phase 2.6 Database Physical Design was inspected for `TIMESTAMPTZ`, explicit-per-FK indexing, audit-column and physical naming rules, but that document is marked `Draft for Official Architecture Review`.
- Therefore no canonical Finding was created solely from its `TIMESTAMPTZ` or every-FK-index rules in this batch.
- The approved/baselined Phase 3.5 Database Foundation remains authoritative for findings based on bounded-context isolation, traceable/reversible migrations, data integrity, logical deletion, uniqueness, transaction boundaries and version-based concurrency.
- `MNT-AUD-0088` already captures the approved bounded-context database isolation violation, so no duplicate cross-context/schema finding was created here.

### Event/Worker Deduplication Note — v0.58

- A repository-wide search confirmed the only executable `TransactionalOutboxDispatcher.dispatchBatch(...)` call is the certificate-completion worker, filtered to the `COURSES` domain and `CourseCompleted` / `LearningPathCompleted` event types, while multiple owner domains append rows to the shared transactional outbox.
- This evidence strengthens existing `MNT-AUD-0007` (mandatory background/worker architecture not implemented) and related event-specific findings; it was intentionally **not** assigned a duplicate new ID.
- `StudentWorkspaceUseCases.consumeIntegrationEvent(...)` still has no discovered production caller; Identity-specific bridging remains `MNT-AUD-0016`, and missing Phase 13 enrollment/progress producers remain `MNT-AUD-0093`.

### Live Register Update — v0.58 (2026-09-06)

- Registered finding IDs allocated: **96** (`MNT-AUD-0001` → `MNT-AUD-0096`).
- Duplicate/evidence-alias IDs excluded from canonical count remain: **3** (`MNT-AUD-0038`, `MNT-AUD-0039`, `MNT-AUD-0053`).
- **Canonical unique confirmed findings: 93**.
- Severity (canonical unique): **P0: 0 | P1: 69 | P2: 23 | P3: 1 | P4: 0**.
- New canonical findings in this continuation:
  - `MNT-AUD-0094` — no executable immutable-artifact release/environment-promotion pipeline exists behind the approved CI/CD architecture.
  - `MNT-AUD-0095` — the production Domain barrel still globally exports generated dummy contracts actively consumed by runtime use cases.
  - `MNT-AUD-0096` — Service/Career mutable owner records use last-write-wins updates with no approved version-based concurrency/fencing.
- Draft-only Phase 2.6 timestamp/FK-index rules were **not** promoted to canonical defects without approved authority.
- The general outbox-dispatch gap was deduplicated into `MNT-AUD-0007` rather than inflating the register.
- No source, database, GitHub setting or production runtime mutation has been executed.
- Frozen baseline remains `0931c5664cf274cb2b8f4cb250dd09ebf2e9a77f`.
- Project decision remains: **SOURCE_NOT_COMPLETE — AUDIT_IN_PROGRESS**.

### Next Mandatory Continuation After v0.58

1. Finish approved Phase 3.5 data-integrity checks: uniqueness, logical-deletion behavior, transaction boundaries and stale-write protection across remaining mutable owner domains.
2. Finish the event producer/consumer classification for Certificate, Finance, CMS, Notifications, Identity and Student Workspace without duplicating the existing worker/event root causes.
3. Complete P23 every-action route/UI/RBAC/audit parity and P24 public/authenticated handoff matrix.
4. Reconcile release authority with Phase 4 governance/current delivery-reality documents and final launch requirements.
5. Continue file-by-file dead/orphan/stub scan after `generated/dummy`, including unavailable capabilities, stale barrels, historical imports and shadow implementations.
6. Perform final deduplication only after all above axes are exhausted.


---

## Repository Completion Audit — API Contract + Student Certificate Handoff Deep Sweep (v0.62 — 2026-09-06)

### MNT-AUD-0097 — P2 MEDIUM — Student Workspace Certificate Quick Action Targets a Nonexistent `/certificates` Web Route
**Categories:** P14 / P15 / P24 / ROUTING / STUDENT_WORKSPACE / CERTIFICATES / HANDOFF / UX / SOURCE_CLOSURE

**Evidence:**
- `PrismaStudentWorkspaceRepository.quickActions(...)` emits a certificate action with `id: 'view-certificates'`, label `عرض شهاداتي`, and `href: '/certificates'` whenever certificate projections are present.
- The canonical Web router does not define a `/certificates` page. It defines certificate verification routes only: `certificates/verify` and `verify-certificate`.
- The public-route contract test likewise enumerates `certificates/verify` but no `/certificates` route.
- The live Student Workspace does render individual certificate projections and can link each one to `/certificates/verify?code=...`, so this defect is not missing certificate data; it is a broken generated navigation target from the student dashboard.
- Repository search found no redirect or canonical authenticated certificate-list route that resolves `/certificates`.
- This is distinct from `MNT-AUD-0015` (certificate rendering/PDF generation) and `MNT-AUD-0092` (missing authenticated course learner journey).

**Impact:**
- A student with certificates can receive a high-priority dashboard action that navigates to an undefined route instead of the certificate vault/read surface.
- The broken link interrupts the P15→P14 learner handoff even though certificate projections are already available in the workspace.
- Browser route tests currently validate the verification route but do not protect the generated quick-action destinations.

**Required remediation:**
1. Define the canonical student certificate destination: either a dedicated authenticated certificate-list route or an explicit in-workspace Vault/Certificate section.
2. Change `quickActions(...)` to emit a locale-aware canonical route that is guaranteed by the Web route registry.
3. If a dedicated route is implemented, hydrate it from P14 owner-read models/P15 projections without creating a duplicate certificate authority.
4. Add a route-contract test that validates every generated Student Workspace quick-action `href` against the canonical Web router.
5. Add browser E2E for dashboard → certificates → verification/detail handoff.

**Repair Wave:** W4 / W5 / W7  
**Status:** OPEN — STUDENT_CERTIFICATE_QUICK_ACTION_POINTS_TO_UNDEFINED_ROUTE

---

### MNT-AUD-0098 — P1 HIGH — Approved API Idempotency Standard Is Implemented Selectively; Most POST/PUT Mutation Endpoints Have No Canonical Idempotency Enforcement
**Categories:** API / IDEMPOTENCY / RELIABILITY / DATA_INTEGRITY / RETRY_SAFETY / P05_P23 / SOURCE_CLOSURE

**Evidence:**
- Approved standard `STD-API-001` explicitly requires an `Idempotency-Key` header for **all `POST` and `PUT` mutation endpoints**.
- Repository-wide search shows explicit idempotency-key handling in Finance command paths and Finance-related Student Workspace payment paths, but no shared/global idempotency middleware or request-deduplication layer for the rest of the API.
- `ServiceAdminRouter` exposes numerous POST mutations (service creation, request transitions, provider assignment, invoice handoff, publish/unpublish/reject/archive lifecycle commands) without an idempotency-key contract.
- `CareerAdminRouter` exposes POST creation/lifecycle mutations for employers and jobs without idempotency enforcement.
- `StudentWorkspaceRouter` exposes `POST /services/requests`; `StudentServiceRequestUseCases.createRequest(...)` generates a fresh `svc_req_${randomUUID()}` on every successful call and persists it without a request fingerprint/idempotency key. A network/client retry can therefore create a second logically identical service request.
- Finance demonstrates a positive domain-specific pattern: its routers read `Idempotency-Key`, and repository/application logic persists/compares idempotency fingerprints. The gap is therefore selective enforcement, not absence of project knowledge.
- This is distinct from `MNT-AUD-0096`: `0096` protects against stale concurrent writers; this finding protects command identity/retry replay and duplicate creation.

**Impact:**
- Retries after timeout, mobile reconnection, reverse-proxy replay or double-submit can duplicate state-creating commands such as service requests and other POST mutations.
- Lifecycle commands may be executed more than once with no stable command identity, producing duplicate audit/outbox/provider side effects where handlers are not naturally idempotent.
- API behavior is inconsistent across domains: Finance is retry-safe by explicit contract while other enterprise owner APIs are not.
- The approved interface standard cannot be considered source-complete while compliance depends on each router implementing ad hoc behavior.

**Required remediation:**
1. Implement one canonical API idempotency layer for approved POST/PUT mutation endpoints, scoped by principal, method, normalized route/resource and idempotency key.
2. Persist a request fingerprint and terminal response/result reference in a durable deduplication store with an approved retention window.
3. On key replay with the same fingerprint, return/reconstruct the original semantic result; reject reuse of the same key with a different payload/resource.
4. Keep domain-specific safety such as Finance idempotency as defense in depth, but integrate it with the shared command identity instead of maintaining incompatible mechanisms.
5. Ensure clients reuse the same key for retries of the same command rather than generating a new key per retry attempt.
6. Apply the mechanism first to state-creating/high-side-effect routes: service requests, admin create/publish commands, imports, jobs, certificates, AI/tool execution where applicable.
7. Add a source guard that inventories POST/PUT mutation routes and fails when a mutation has neither canonical idempotency middleware nor an approved documented exemption.
8. Add replay/concurrency tests proving duplicate delivery does not create duplicate rows, outbox messages or external side effects.

**Repair Wave:** W0 / W2 / W3 / W5 / W6  
**Status:** OPEN — APPROVED_IDEMPOTENCY_STANDARD_NOT_ENFORCED_ACROSS_MUTATION_API

---

### MNT-AUD-0099 — P2 MEDIUM — Approved RFC 7807 Error Contract Is Not Implemented Consistently Across the HTTP API
**Categories:** API / ERROR_CONTRACT / RFC7807 / CLIENT_COMPATIBILITY / OBSERVABILITY / GOVERNANCE / SOURCE_CLOSURE

**Evidence:**
- Approved `STD-API-001` requires RFC 7807 Problem Details for HTTP API errors.
- The global `GlobalExceptionHandler` serializes unhandled errors through `PresentationErrorTranslator`, which returns the project envelope `{ data: null, error: { code, message, details, traceId }, meta: ... }`, not an RFC 7807 Problem Details document.
- No `application/problem+json` implementation marker was found in the repository.
- Many routers install local error middleware that intercepts failures before the global handler and returns still different shapes, e.g. `{ error: 'Validation Error', details: [...] }`, `{ error: err.message }`, or domain-specific additions.
- Confirmed examples include Service Admin, Career Admin, Asset, Academic Taxonomy, Study Destination, Finance, University, Course and Scholarship routes.
- Thus the API currently has at least two non-RFC error families: the global MANARATAK envelope and router-local ad hoc JSON errors.

**Impact:**
- Clients cannot rely on one canonical machine-readable failure shape, status taxonomy or media type across domains.
- Error parsing, localization, retry classification and observability correlation require route-specific branching.
- Local handlers can bypass trace IDs and structured serialization available in the global handler, reducing diagnostic consistency.
- The approved API standard is contradicted by executable presentation code even when business logic itself is correct.

**Required remediation:**
1. Define the canonical RFC 7807 profile for MANARATAK (`type`, `title`, `status`, `detail`, `instance`) with approved extensions such as stable `code`, `traceId`, validation issues and correlation metadata.
2. Make the global exception boundary emit `application/problem+json` and the canonical Problem Details object.
3. Remove/normalize router-local generic error middleware so errors flow through the shared translator; retain local translation only where it maps typed domain errors to status/code before the canonical formatter.
4. Convert Zod validation failures into the same Problem Details contract rather than a separate `{error,details}` family.
5. Add contract tests across public/admin/student/auth routes asserting media type, mandatory fields, stable codes and trace IDs.
6. Update Web/Admin API clients to parse the canonical contract and eliminate legacy shape fallbacks after migration.
7. Add an architecture/source guard preventing direct ad hoc `res.status(...).json({ error: ... })` error envelopes outside approved low-level boundaries.

**Repair Wave:** W1 / W4 / W5 / W7  
**Status:** OPEN — HTTP_ERROR_SURFACES_DIVERGE_FROM_APPROVED_RFC7807_CONTRACT

---

### MNT-AUD-0100 — P2 MEDIUM — Large Catalog APIs Use Offset `page/pageSize` Pagination Instead of the Approved Cursor-Based API Standard
**Categories:** API / PAGINATION / CURSOR / SCALABILITY / DATA_CONSISTENCY / P07_P24 / SOURCE_CLOSURE

**Evidence:**
- Approved `STD-API-001` requires **cursor-based pagination for large datasets**.
- Repository search found no canonical `cursor` / `nextCursor` API contract or pagination implementation across the major catalog surfaces.
- Large owner/public catalogs use offset-style `page` and `pageSize`, including Universities, Courses, Majors, Careers and Services; admin/import/test surfaces use the same general pattern.
- These domains are explicitly expected to grow to large cardinalities, making the approved cursor rule applicable rather than merely stylistic.
- This is distinct from `MNT-AUD-0025`: `0025` is a P24 product-composition defect where the Web loads only fixed initial pages and searches an incomplete browser snapshot. Even if P24 looped every offset page, the API would still violate the approved cursor contract; conversely adding cursor APIs alone would not fix P24 if the Web still stops after the first page.

**Impact:**
- Offset pagination can skip or repeat rows under concurrent inserts/updates and becomes progressively more expensive at deep offsets.
- API clients cannot use stable continuation tokens across changing catalogs as required by the approved interface standard.
- Public search/discovery and admin review flows inherit weaker traversal guarantees at scale.
- API contract drift increases the cost of later migration because DTOs, clients, tests and UI state are currently shaped around page numbers.

**Required remediation:**
1. Define one shared cursor pagination contract (`items/data`, opaque `nextCursor`, optional `hasMore`, bounded `limit`) with deterministic sort/tie-break keys.
2. Migrate large catalog owner APIs to stable keyset/cursor queries; use immutable or monotonic tie-breakers such as `(updatedAt,id)` or domain-appropriate publication keys.
3. Keep offset pagination only for explicitly approved small/reporting surfaces where stable continuation is not required, documenting exemptions.
4. Update Web/Admin clients and P24 global discovery flows to consume cursors until the requested result window is satisfied rather than materializing arbitrary first pages.
5. Add mutation-during-pagination tests proving no duplicate/omitted traversal for the selected ordering contract.
6. Add source/API-contract guards preventing new large catalog endpoints from introducing page-number pagination.

**Repair Wave:** W2 / W4 / W6 / W7  
**Status:** OPEN — LARGE_DATASET_API_PAGINATION_DIVERGES_FROM_APPROVED_CURSOR_STANDARD

---

### Evidence Addenda — Existing Findings Strengthened in v0.62

#### `MNT-AUD-0022` — P24 SEO/indexability
- The localized sitemap generator currently enumerates only static collection paths (`/`, scholarships, universities, majors, courses, international-tests, articles, services, tools).
- It omits at least `/countries`, `/careers` and all dynamic entity detail URLs from its canonical static indexable path list.
- This evidence is appended to `0022` rather than creating a duplicate SEO finding because `0022` already owns canonical route/read-model indexability and SSR/prerender delivery.

#### `MNT-AUD-0024` — P24 synthetic live facts
- The live `ScholarshipDetailModal` contains hard-coded benefit claims (stipend ranges, free housing/insurance/language year/visa-residency waiver) and hard-coded major labels/IDs including `mjr-demo-*` values rather than rendering only owner-published scholarship facts/relationships.
- This evidence is appended to `0024`; no duplicate ID is created because the root cause remains the same live projection injecting synthetic/unknown facts.

### Live Register Update — v0.62 (2026-09-06)

- Registered finding IDs allocated: **100** (`MNT-AUD-0001` → `MNT-AUD-0100`).
- Duplicate/evidence-alias IDs excluded from canonical count remain: **3** (`MNT-AUD-0038`, `MNT-AUD-0039`, `MNT-AUD-0053`).
- **Canonical unique confirmed findings: 97**.
- Severity (canonical unique): **P0: 0 | P1: 70 | P2: 26 | P3: 1 | P4: 0**.
- New canonical findings in this continuation:
  - `MNT-AUD-0097` — Student Workspace certificate quick action points to nonexistent `/certificates` route.
  - `MNT-AUD-0098` — approved API idempotency standard is only selectively implemented.
  - `MNT-AUD-0099` — HTTP errors diverge from approved RFC 7807 Problem Details contract.
  - `MNT-AUD-0100` — large catalog APIs use offset pagination instead of approved cursor-based pagination.
- `MNT-AUD-0022` and `MNT-AUD-0024` received new evidence without count inflation.
- No source, database, GitHub setting or production runtime mutation has been executed.
- Frozen baseline remains `0931c5664cf274cb2b8f4cb250dd09ebf2e9a77f`.
- Project decision remains: **SOURCE_NOT_COMPLETE — AUDIT_IN_PROGRESS**.

### Next Mandatory Continuation After v0.62

1. Finish Security/configuration sweep for canonical production fail-closed behavior, especially auth/session, CORS/CSRF, proxy/IP, upload/asset and privileged non-admin mounts.
2. Finish dead/orphan/stub inventory beyond `generated/dummy`, including production barrels, inactive adapters, unreachable routes/use cases and obsolete implementation-status claims.
3. Finish P23 every-action UI/RBAC/audit parity and P24 all-route/authenticated handoff/accessibility matrix.
4. Reconcile the approved API standards against executable routing one final time for naming/versioning/contract exceptions without duplicating the idempotency/error/pagination findings above.
5. Complete final Event/Worker producer-consumer table and then perform repository-wide canonical deduplication before declaring the discovery phase closed.

---

## Repository Completion Audit — Security / Configuration Final Sweep, Batch 1 (v0.63 — 2026-09-06)

### MNT-AUD-0101 — P1 HIGH — The Approved Frontend CSP/Clickjacking Boundary Is Not Source-Enforced; CSP Is Attached Only to API Responses and Still Allows `unsafe-inline`
**Categories:** SECURITY / CSP / XSS / CLICKJACKING / WEB / ADMIN / EDGE / CONFIGURATION / SOURCE_CLOSURE

**Evidence:**
- The approved Master Blueprint requires a strict CSP on the **frontend application**, requires `X-Frame-Options: DENY` plus CSP `frame-ancestors 'none'` on HTML responses, and explicitly forbids both `unsafe-inline` and `unsafe-eval`.
- `SecurityMiddlewareFactory.createSecurityHeaders(...)` is installed only on the Express API application. The canonical public and Admin HTML documents are served by separate Vite applications, so the API response headers do not establish the browser policy for those HTML documents.
- No `_headers`, reverse-proxy/edge header policy, deploy manifest or HTML CSP meta policy was found under `apps/web` or `apps/admin`.
- The implemented API CSP includes `styleSrc: ["'self'", "'unsafe-inline'"]`, directly contradicting the approved no-`unsafe-inline` baseline.
- The implemented CSP does not declare `frameAncestors`; Helmet's `X-Frame-Options: DENY` is again emitted by the API middleware rather than proven on the Web/Admin HTML delivery boundary.
- `ProductionReadinessValidator` considers `SECURITY_CSP_ENABLED=true` sufficient to pass its CSP blocker even though it does not verify that Web/Admin HTML delivery applies the policy. The existing header unit test exercises a synthetic Express endpoint only.
- The implementation-status report claims “Production security headers (Helmet, strict CORS, CSP)” are fixed, which overstates the executable browser boundary.

**Impact:**
- A production deployment can pass API startup/readiness while the public and Admin documents are served without the mandatory CSP and clickjacking policy.
- Stored or DOM injection defects in CMS/Admin/Web lose the approved defense-in-depth layer at the only response where browser CSP enforcement matters.
- Allowing inline styles expands the permitted injection surface and contradicts the stated security authority.
- Current tests can be green while the real browser document remains unprotected.

**Required remediation:**
1. Define one source-controlled Web/Admin HTML security-header policy at the actual edge/static-hosting boundary.
2. Emit CSP with `frame-ancestors 'none'` and the approved restrictive directives on every public and Admin HTML response.
3. Remove `unsafe-inline`; if framework/style constraints require a transition, use nonces/hashes and record a time-bounded approved exception rather than silently weakening the baseline.
4. Keep API headers as defense in depth, but do not use them as evidence of frontend protection.
5. Make production readiness probe or verify the delivered Web/Admin headers, not only the configuration flag.
6. Add browser/deployed-artifact tests for CSP, clickjacking headers and prohibited directives on both HTML entry points.
7. Correct stale security-closure documentation until delivered-header evidence exists.

**Repair Wave:** W0 / W1 / W6 / W7  
**Status:** OPEN — FRONTEND_CSP_AND_CLICKJACKING_POLICY_NOT_ENFORCED_AT_HTML_BOUNDARY

---

### MNT-AUD-0102 — P2 MEDIUM — Cookie/CSRF Production Configuration Passes Readiness While Diverging from the Approved `SameSite=Strict` and Secret-Ownership Contract
**Categories:** SECURITY / AUTH / SESSION / COOKIE / CSRF / CONFIGURATION / DOCUMENTATION_DRIFT / SOURCE_CLOSURE

**Evidence:**
- The approved Master Blueprint mandates `SameSite=Strict` for browser cookies and a synchronizer-token pattern for every state-changing mutation.
- `HttpOnlyAuthCookies.cookieOptions(...)` hard-codes both access and refresh cookies to `sameSite: 'lax'` in every environment. Production-like mode changes only the `secure` flag.
- `AppConfigSchema`, `ProductionReadinessValidator`, `.env.example` and production guardrail tests require strong `SESSION_SECRET` and `CSRF_SECRET` values before production startup.
- Repository-wide executable-source search found neither secret consumed by the session or CSRF implementations. `SecurityService` signs each CSRF token with the refresh token itself, while `PrismaSessionManager` stores a SHA-256 refresh-token hash; rotating `CSRF_SECRET` or `SESSION_SECRET` therefore changes no active browser-security behavior.
- `ProductionReadinessValidator` can consequently report these secret controls satisfied even though the mandatory values are readiness-only configuration with no cryptographic owner.
- Positive evidence is retained: cookies are `HttpOnly`, production cookies are forced `Secure`, refresh-token-backed sessions are persisted, and the global guard rejects cookie-authenticated mutations lacking a valid header token. This finding is the remaining authority/configuration mismatch, not a claim that CSRF checking is wholly absent.

**Impact:**
- Production can be declared compliant while the actual cookie policy is weaker than the approved baseline.
- Operators may rotate incident-response secrets believing sessions/CSRF tokens were invalidated when those variables have no effect.
- Duplicate, unused security secrets create false assurance and make key ownership, rotation and compromise response ambiguous.

**Required remediation:**
1. Set the canonical production cookie policy to `SameSite=Strict`, or obtain an explicit architecture/security approval for a narrowly documented exception required by a real cross-site flow.
2. Decide and document the canonical CSRF construction: a true server-owned synchronizer-token store or a reviewed signed/double-submit design with explicit threat model and key ownership.
3. Wire `CSRF_SECRET`/`SESSION_SECRET` to their defined cryptographic responsibilities, or remove the unused variables and all readiness claims that they protect active behavior.
4. Add tests that inspect production `Set-Cookie` attributes and prove secret rotation/revocation semantics.
5. Extend `MNT-AUD-0043` remediation so the typed environment contract rejects required-but-unused security variables.

**Repair Wave:** W0 / W1 / W6  
**Status:** OPEN — COOKIE_CSRF_POLICY_AND_SECRET_CONTRACT_DIVERGE_FROM_APPROVED_BASELINE

---

### MNT-AUD-0103 — P2 MEDIUM — Fixed CORS Preflight Policy Omits Required Mutation and Correlation Headers Used by the Canonical Admin Client
**Categories:** SECURITY / CORS / API_CONTRACT / ADMIN / FINANCE / IDEMPOTENCY / CORRELATION / INTEGRATION / SOURCE_CLOSURE

**Evidence:**
- `SecurityMiddlewareFactory.createCors(...)` fixes `allowedHeaders` to Content-Type, Authorization, X-Requested-With, Accept, Origin, CSRF and Student-Tools session headers.
- The list omits `Idempotency-Key`, `X-Correlation-ID` and `X-Request-ID`.
- Finance APIs explicitly require/read `Idempotency-Key`, and multiple routers consume correlation/request IDs.
- Canonical Admin Finance clients send both `Idempotency-Key` and `X-Correlation-Id` for mutation commands.
- The repository supports a distinct Admin origin (`apps/admin` uses its own Vite server and `.env.example` declares a separate Admin URL), while production CORS is configured for an exact frontend origin. A browser cross-origin mutation using the canonical headers therefore preflights against a response that does not authorize those headers.
- Existing router tests set the headers directly through Supertest and no CORS integration test exercises the real browser preflight, so the mismatch is not detected.
- This strengthens `MNT-AUD-0098` but is not the same root cause: `0098` is missing server-side idempotency enforcement across mutations; this finding is the transport policy blocking already-approved headers where they are implemented.

**Impact:**
- Admin Finance and future standards-compliant browser clients can be rejected by the browser before the request reaches authenticated API logic.
- Teams may remove idempotency/correlation headers to make UI calls work, weakening retry safety and traceability.
- Same-origin preview tests can remain green while the approved separated-origin deployment fails.

**Required remediation:**
1. Define CORS allowed headers from the canonical API header contract rather than maintaining an unrelated fixed list.
2. Authorize `Idempotency-Key`, `X-Correlation-ID` and `X-Request-ID` with normalized case handling, while retaining the CSRF header.
3. Add preflight integration tests for Web/Admin origins covering authenticated Finance and representative admin/student mutations.
4. Add a source guard comparing headers consumed by routers/clients with the CORS allowlist.
5. Reconcile the final Admin/Web/API origin topology with the release/deployment work under `MNT-AUD-0094`.

**Repair Wave:** W1 / W4 / W6 / W7  
**Status:** OPEN — CORS_PREFLIGHT_BLOCKS_CANONICAL_MUTATION_HEADERS

---

### MNT-AUD-0104 — P2 MEDIUM — Local Compose Publishes Weakly Credentialed PostgreSQL and Unauthenticated Redis on All Host Interfaces Without a Safety Profile
**Categories:** SECURITY / CONFIGURATION / DOCKER / DATABASE / REDIS / INSECURE_DEFAULT / LOCAL_DEVELOPMENT / SOURCE_CLOSURE

**Evidence:**
- Root `docker-compose.yml` hard-codes PostgreSQL credentials as `root` / `password`.
- PostgreSQL is published as `5432:5432`, which binds the container port on all host interfaces by default rather than loopback-only.
- Redis is published as `6379:6379` with no password/ACL/TLS configuration and likewise no loopback-only binding.
- The compose file has no explicit development-only profile, no environment assertion and no production-start refusal marker.
- The operations manual instructs developers to bring this compose topology up and repeats the weak database URL; it labels cloud deployment pending, but that prose does not technically prevent use on a shared workstation, LAN or misclassified deployment host.
- Production API validators correctly reject local/placeholder service URLs, but they do not protect the database/Redis containers themselves from network exposure when compose is started.

**Impact:**
- Starting the documented local stack on a reachable developer or CI host can expose a password-known PostgreSQL instance and unauthenticated Redis to adjacent networks.
- Redis compromise can affect rate-limit state and other runtime caches/coordination if the local stack is used for shared testing.
- The repository contains an avoidable insecure default even though production application startup otherwise attempts to fail closed.

**Required remediation:**
1. Bind development dependency ports to loopback explicitly (`127.0.0.1`) unless a documented isolated network requires otherwise.
2. Source local credentials from a non-tracked development environment file and generate non-default values; do not embed `root/password`.
3. Enable Redis authentication/ACL for any host-published configuration, or avoid publishing Redis when only compose-network consumers need it.
4. Add a clearly named development profile and a technical guard preventing production/staging use of the local compose topology.
5. Add a compose security test checking host binds, default credentials, Redis authentication and development-only classification.

**Repair Wave:** W0 / W1 / W6  
**Status:** OPEN — LOCAL_COMPOSE_EXPOSES_INSECURE_DATABASE_AND_REDIS_DEFAULTS

---

### Evidence Addenda — Existing Findings Strengthened in v0.63

#### `MNT-AUD-0043` — Production environment contract drift
- `SESSION_SECRET` and `CSRF_SECRET` are production-start requirements and are described as session/CSRF signing controls, but no executable session/CSRF implementation consumes either variable. The canonical typed environment contract must reject required-but-unused security configuration, not merely missing configuration.

#### `MNT-AUD-0098` — API idempotency standard
- The CORS policy does not authorize the `Idempotency-Key` request header already required by Finance. Server-side idempotency remediation must include browser transport/preflight parity; otherwise compliant cross-origin clients cannot use the contract.

#### `MNT-AUD-0008` — Operational scripts outside architecture/security guards
- `scripts/inspect_legacy.ts` constructs a `$queryRawUnsafe` SQL statement by interpolating `id` directly into the query string. This file was not promoted to a separate canonical vulnerability because its current reachability/operational status belongs to the pending dead/orphan/stub sweep, but it is concrete evidence that excluding `scripts/**` from enforced guards permits unsafe SQL patterns.

### Positive Security Evidence — v0.63 Batch 1

- Phase 06 source acquisition retains allowlisted origins/path prefixes, DNS/IP-range controls, redirect revalidation, timeouts and byte limits; no new SSRF finding was created.
- Production/staging startup requires a Redis-backed distributed rate limiter and fails closed when Redis configuration is absent.
- Login has both account and account+IP rate-limit keys; the known timing/event-loop issue remains separately registered as `MNT-AUD-0072`.
- Access and refresh cookies are `HttpOnly`, production-like cookies are forced `Secure`, and cookie-authenticated mutations are rejected without the CSRF header token.
- The current tracked-file secret scanner passed (`SECRET_SCAN_PASS=YES`, 2,738 tracked files), and a high-confidence scan across the available 111-commit history found no private-key, AWS access-key, GitHub token or OpenAI-style secret signature. This is positive evidence only and does not replace provider-side secret scanning.
- Local asset storage resolves and checks paths under its configured bucket root; traversal attempts are rejected. Production asset providers remain unavailable under existing `MNT-AUD-0011` and fail closed at startup.

### Live Register Update — v0.63 (2026-09-06)

- Registered finding IDs allocated: **104** (`MNT-AUD-0001` → `MNT-AUD-0104`).
- Duplicate/evidence-alias IDs excluded from canonical count remain: **3** (`MNT-AUD-0038`, `MNT-AUD-0039`, `MNT-AUD-0053`).
- **Canonical unique confirmed findings: 101**.
- Severity (canonical unique): **P0: 0 | P1: 71 | P2: 29 | P3: 1 | P4: 0**.
- New canonical findings in this continuation:
  - `MNT-AUD-0101` — frontend CSP/clickjacking controls are not enforced at the Web/Admin HTML delivery boundary and the configured policy still permits `unsafe-inline`.
  - `MNT-AUD-0102` — cookie/CSRF behavior and required security secrets diverge from the approved production contract.
  - `MNT-AUD-0103` — CORS preflight blocks canonical idempotency/correlation headers used by the Admin client.
  - `MNT-AUD-0104` — local compose publishes weakly credentialed PostgreSQL and unauthenticated Redis on all host interfaces.
- Existing `MNT-AUD-0043`, `MNT-AUD-0098` and `MNT-AUD-0008` received evidence addenda without count inflation.
- No application source, database, GitHub setting or production runtime mutation has been executed.
- Frozen baseline remains `0931c5664cf274cb2b8f4cb250dd09ebf2e9a77f`.
- Project decision remains: **SOURCE_NOT_COMPLETE — AUDIT_IN_PROGRESS**.

### Security / Configuration Axis Status After v0.63 Batch 1

| Sub-axis | Result | Closure state |
| --- | --- | --- |
| CORS / CSP / CSRF | New `0101`-`0103`; positive CSRF enforcement retained | **IN AUDIT** |
| Auth / session / tokens | Existing `0065`, `0071`, `0072`, `0076`; cookie/config drift `0102` | **IN AUDIT** — final privileged/public optional-auth matrix remains |
| RBAC / IDOR | Existing `0020`, `0062`, `0064`, `0065`; student ownership guards positively observed | **IN AUDIT** |
| Rate limiting | Redis fail-closed and login-specific controls positively observed | **PASS_WITH_EXISTING_FINDINGS** — operational behavior post-connect remains |
| Secrets / production env | Tracked/history scan positive; `0043` addendum and `0102` remain | **IN AUDIT** |
| File upload / SSRF | SSRF and local traversal controls positive; production EAP gaps remain `0011/0050` | **PASS_WITH_EXISTING_FINDINGS** |
| Fail-open / insecure defaults | `0104` added; runtime dependency policies otherwise fail closed in inspected paths | **IN AUDIT** |
| Production-only guardrails | CSP readiness false-green `0101`; prototype/admin/runtime guards retain earlier findings | **IN AUDIT** |

### Next Mandatory Continuation After v0.63

1. Finish the Security/configuration route matrix for optional-auth public routes, webhook/provider signature boundaries, privileged non-`/admin` mounts, mass-assignment and IDOR/BOLA without duplicating `0062/0065/0076`.
2. Start the file-by-file Dead / Orphan / Stub sweep: router registration, DI reachability, use-case callers, production barrels, dummy/no-op/in-memory composition, archived/obsolete scripts and shadow implementations.
3. Continue P23 every-action UI/RBAC/audit parity and P24 route/deep-link/live-action/auth-handoff matrix.
4. Complete Event/Outbox/Inbox and Worker/Scheduler producer-consumer-runtime tables.
5. Perform final repository-wide canonical deduplication only after remaining audit axes reach zero.

---

## Repository Completion Audit — Security / Configuration Final Sweep, Batch 2 (v0.64 — 2026-09-06)

### MNT-AUD-0105 — P1 HIGH — The Canonical Token Provider Violates the Approved JWT Trust and Lifecycle Model: HS256, One-Hour Access Tokens and JWT Refresh Tokens
**Categories:** SECURITY / AUTHENTICATION / JWT / TOKEN_LIFECYCLE / KEY_MANAGEMENT / CONFIGURATION / ARCHITECTURE_DRIFT / SOURCE_CLOSURE

**Evidence:**
- The approved Master Blueprint explicitly requires asymmetric JWT signing with RS256/ES256, forbids HS256 for tokens crossing the enterprise boundary, caps access-token TTL at 15 minutes, and defines refresh tokens as opaque single-use credentials.
- `packages/infrastructure/src/auth/JwtTokenProvider.ts` hard-codes `{ alg: 'HS256', typ: 'JWT' }` and signs/verifies both access and refresh tokens with HMAC-SHA256 and the same injected secret.
- `generateTokens(...)` invokes the same JWT signer for both `access` and `refresh`; the refresh credential is therefore a JWT rather than the approved opaque token.
- The active DI composition resolves a single `JWT_SECRET` and constructs this provider. No RS256/ES256 private/public key pair, JWKS publication, `kid`-based rotation or asymmetric verification boundary was found in executable source.
- `ACCESS_TOKEN_TTL_SECONDS` defaults to 3,600 seconds in both configuration and DI, while the approved maximum is 900 seconds. Production readiness validates secret strength and issuer/audience presence but does not reject an excessive access TTL or the forbidden algorithm/token form.
- The infrastructure tests positively assert issue/verify and tamper rejection for the HS256 implementation; they do not test the approved asymmetric algorithm, public-key verification, key rotation, opaque refresh tokens or the 15-minute maximum.
- Positive evidence retained: the current verifier checks token type, issuer, audience, `jti`, issued/expiry timestamps and constant-time signature comparison. Those controls do not resolve the prohibited trust model or lifecycle.

**Impact:**
- Every component capable of verifying a token must possess the same material capable of minting one, expanding signing authority beyond the approved asymmetric trust boundary.
- A one-hour stolen access token has four times the maximum approved exposure window.
- Treating the refresh credential as a self-describing JWT conflicts with the server-authoritative, opaque, single-use design and complicates safe key rotation and compromise containment.
- Production readiness can report authentication configuration healthy while the canonical provider remains non-compliant with the security authority.

**Required remediation:**
1. Replace HS256 with the approved RS256 or ES256 implementation and separate private signing custody from public verification.
2. Introduce stable key identifiers, a rotation/overlap policy and a canonical public-key/JWKS distribution contract where multiple verifiers exist.
3. Replace JWT refresh tokens with cryptographically random opaque credentials; persist only protected hashes and rotate them atomically under the remediation for `MNT-AUD-0071`.
4. Enforce `ACCESS_TOKEN_TTL_SECONDS <= 900` in the typed configuration and production-readiness gate.
5. Define emergency key/session revocation and prove that retired keys and reused refresh credentials fail closed.
6. Add algorithm-confusion, wrong-key, retired-key, TTL-boundary, refresh-replay and multi-verifier tests.
7. Remove `JWT_SECRET`-centric guidance after asymmetric key ownership is established and reconcile all authentication runbooks with the executable model.

**Repair Wave:** W0 / W1 / W4 / W6 / W7  
**Status:** OPEN — CANONICAL_TOKEN_PROVIDER_VIOLATES_APPROVED_ASYMMETRIC_AND_SHORT_LIVED_TOKEN_MODEL

---

### MNT-AUD-0106 — P1 HIGH — Central and Authorization Audit Paths Lose the Authenticated Principal and Attribute Admin Mutations to `ANONYMOUS` or `SYSTEM`
**Categories:** SECURITY / AUDIT / AUTHENTICATION / ADMIN / RBAC / ATTRIBUTION / NON_REPUDIATION / COMPLIANCE / SOURCE_CLOSURE

**Evidence:**
- Both `AuthMiddleware` and `SecurityMiddlewareFactory.createAdminGuard(...)` establish the authenticated principal in `req.authUserId`; the permission guards also authorize from that field.
- `AuditHelper.recordMutation(...)`, used by the central `MutationAuditMiddleware`, does not read `req.authUserId`. It checks only `(req as any).user?.id` / `.identityId` and otherwise writes actor ID `ANONYMOUS` with actor type `IDENTITY`.
- The `/admin` composition runs the central mutation-audit middleware after the admin guard, so a successfully authenticated and authorized mutation still reaches the helper with its canonical identity in a field the helper ignores.
- `AuthorizationAdminRouter.mutationContext(...)` repeats the same incompatible `req.user` lookup and falls back to actor ID `SYSTEM`. Role creation and role assignment therefore pass a false system actor into their business/audit context even when initiated by an administrator.
- Failure auditing inside `AuthorizationAdminRouter` also calls `AuditHelper`, producing the `ANONYMOUS` fallback for authenticated failures.
- No source assignment from the inspected authentication guards populates `req.user`; repository search found the canonical identity contract is `authUserId`.
- Existing audit tests prove repository failure behavior but do not compose authentication → authorization → mutation audit and assert the persisted actor. This is distinct from `MNT-AUD-0084`, which concerns mutation-audit coverage/default classification; the present defect corrupts actor attribution where auditing is already installed.

**Impact:**
- Privileged changes can be accepted under a real RBAC principal while the central evidence says an anonymous or system actor performed them.
- Incident reconstruction, accountability, maker/checker review and non-repudiation are materially unreliable.
- A malicious or mistaken administrator cannot be reliably distinguished from automation using the primary audit trail.
- Closure reports can count an audit record as present even though its most important security attribute is false.

**Required remediation:**
1. Define one typed authenticated-principal contract on Express Request and use it consistently across authentication, authorization, business mutation context and audit code.
2. Make authenticated privileged audit fail closed when the principal is absent; never silently substitute `ANONYMOUS` or `SYSTEM` after an admin guard.
3. Reserve `SYSTEM` for separately authenticated worker/service identities with explicit source, workload identity and reason metadata.
4. Update `AuditHelper`, `AuthorizationAdminRouter` and any other `req.user` consumers to the canonical principal accessor.
5. Add end-to-end composition tests proving the exact identity that passes RBAC is persisted in intent, outcome and domain audit records for success and failure.
6. Add reconciliation checks detecting privileged records attributed to anonymous/system actors without a valid system execution context.
7. Link this repair to `MNT-AUD-0084` so coverage and attribution are both required before an Admin mutation is considered auditable.

**Repair Wave:** W0 / W1 / W4 / W6  
**Status:** OPEN — AUTHENTICATED_ADMIN_MUTATIONS_ARE_MISATTRIBUTED_IN_AUDIT_EVIDENCE

---

### MNT-AUD-0107 — P1 HIGH — Student Tools Optional Authentication Is Never Composed, Breaking Authenticated Execution Ownership and the Public-to-Student Save Handoff
**Categories:** SECURITY / OPTIONAL_AUTH / P18 / P24 / STUDENT_JOURNEY / IDENTITY / OWNERSHIP / WEB_API_PARITY / SOURCE_CLOSURE

**Evidence:**
- `StudentToolsPublicRouter` explicitly supports two requester modes. It selects `AUTHENTICATED_STUDENT` when `req.authUserId` exists, binds executions to that student, and requires the field for `POST /executions/:executionId/save`.
- The canonical application mounts the router directly at `/api/v1/public/student-tools` through `lazyRouter('studentToolsPublicRouter')` with no authentication or optional-auth middleware before it.
- The only discovered `AuthMiddleware` runtime mounts are inside `StudentWorkspaceRouter` and `CourseLearnerRouter`; there is no global or optional parser that populates `req.authUserId` for public Student Tools requests.
- The Web client sends browser credentials through `apiFetch` for execution and save requests. A valid access cookie/Bearer token therefore arrives at a route that never verifies it.
- Consequently `execute` and execution lookup always classify canonical requests as anonymous, while `save` always returns `401 TOOL_AUTH_REQUIRED`, including for a logged-in student with a valid session.
- Router tests mount `StudentToolsPublicRouter` directly and cover anonymous execution and unauthenticated save rejection; no composition test proves a valid student token produces authenticated ownership and a successful save.
- Positive evidence retained: the use case's requester lookup checks authenticated or anonymous ownership. The defect is missing identity composition, not evidence of a bypass inside that ownership comparison.

**Impact:**
- The advertised authenticated Student Tool journey cannot complete from Web to API: results cannot be saved to the student's workspace through the canonical route.
- Logged-in activity is stored/classified as anonymous, fragmenting history and retention semantics and preventing reliable student ownership.
- The public → login → student handoff required by P24 is false-green in isolated UI/router tests.

**Required remediation:**
1. Implement a canonical optional-auth middleware that validates access cookie/Bearer credentials and active session/identity state when present, while allowing a truly credential-free request to proceed anonymously.
2. Fail closed on malformed, expired, revoked or suspended credentials rather than silently downgrading them to anonymous.
3. Mount optional auth before `StudentToolsPublicRouter` and reuse the same typed principal contract required by `MNT-AUD-0106`.
4. Define an explicit claim/adoption flow if pre-login anonymous executions are intended to become student-owned after login; do not infer ownership from an untrusted client identifier.
5. Add Web→API integration tests for anonymous execute/read, authenticated execute/read/save, login handoff, cross-requester denial and revoked/suspended sessions.
6. Ensure analytics, audit and retention records preserve the correct consumer type and identity transition.

**Repair Wave:** W1 / W3 / W4 / W5 / W6  
**Status:** OPEN — STUDENT_TOOLS_AUTHENTICATED_MODE_AND_SAVE_HANDOFF_ARE_UNREACHABLE

---

### MNT-AUD-0108 — P2 MEDIUM — Legacy File Activation Lets the JSON Body Override the Path Resource Identifier and Lacks Edge Schema Validation
**Categories:** SECURITY / INPUT_VALIDATION / MASS_ASSIGNMENT / BOLA / FILES / DATA_INTEGRITY / AUDIT / API_CONTRACT / SOURCE_CLOSURE

**Evidence:**
- The approved API/security standard requires strict schema validation at the system edge and rejection of unknown fields before business logic.
- The mounted legacy `FileManagementRouter` accepts raw `req.body` for upload-locator generation and file registration with no runtime schema.
- Its activation handler constructs `activateFile({ fileId: req.params.fileId, ...req.body })`. Because the body spread occurs last, a caller can supply a second `fileId` that silently overrides the path parameter.
- `ManageFilesUseCase.activateFile(...)` treats the resulting `input.fileId` as authoritative, looks up that record and activates it. It does not compare it with the route resource.
- Thus `POST /files/A/activate` with body `{ "fileId": "B", ...checksum }` mutates B while the requested URI identifies A. The control-plane permission limits callers to asset administrators, but it does not restore target integrity or trustworthy request/audit semantics.
- The other file commands use the path ID without a body override, showing that this is not an intentional dual-identifier contract.
- `RegisterFileInput` and `ActivateFileInput` are TypeScript interfaces only; Express JSON is not runtime-validated by those interfaces. No router test was found for unknown-field rejection or conflicting path/body identifiers.
- This is narrower than `MNT-AUD-0065` (incomplete session/identity validation on legacy control-plane mounts) and remains exploitable as a target-confusion/integrity defect after that guard is repaired.

**Impact:**
- A privileged request can mutate a different file from the one named in the URL, defeating resource-target review and making logs, approvals and incident evidence ambiguous.
- Unknown/malformed file metadata reaches business/domain constructors instead of being rejected consistently at the edge.
- Client bugs or malicious payloads can create action/target disagreement that automated policy and audit tooling may not detect.

**Required remediation:**
1. Define strict runtime schemas for every File Management path, query and body contract and reject unknown properties.
2. Remove `fileId` from activation body input entirely; construct the command as `{ ...validatedChecksum, fileId: validatedPathId }` with the path authority applied last.
3. If dual identifiers must temporarily be supported, require exact equality and return a stable 400/409 error on conflict.
4. Pass the resolved canonical target explicitly to mutation/audit context so URI, authorized resource and persisted record cannot diverge.
5. Add conflict, unknown-field, malformed checksum, unauthorized, and exact-target mutation tests at the fully composed route.
6. Extend the same strict-edge review across the remaining legacy control-plane routers that currently forward raw `req.body`.

**Repair Wave:** W1 / W2 / W4 / W6  
**Status:** OPEN — FILE_ACTIVATION_PATH_TARGET_CAN_BE_OVERRIDDEN_BY_UNVALIDATED_BODY

---

### Evidence Addenda — Existing Findings Strengthened in v0.64

#### `MNT-AUD-0095` — Generated dummy remains production authority
- The mounted public Search route imports `SearchRequest`, `SearchRequestId`, `SearchReference`, `SearchScope`, criteria/filter/pagination/sorting types and `SearchRequestSpecification` through `@manaratak/domain`, while the discovered production definitions remain the permissive `generated/dummy.ts` classes. `ManageSearchUseCase` calls static factories and instance methods that the emitted dummy classes do not implement. The unauthenticated `/search/history/:reference` privacy/ownership design therefore must be reassessed after the Search domain is restored; no separate IDOR finding is counted while the capability itself lacks a real executable domain authority.

#### `MNT-AUD-0018` / `MNT-AUD-0077` — Finance provider transport and reconciliation runtime
- A repository-wide router/transport search found references to Finance webhook reconciliation semantics but no mounted provider webhook/callback ingress, signature/timestamp/replay verifier or provider-event idempotency boundary. This remains evidence of the already registered missing provider transport/reconciliation worker roots, not a duplicate webhook finding.

#### `MNT-AUD-0084` — Mutation audit coverage/default classification
- Audit presence is insufficient for closure: the central middleware currently persists the wrong actor through `AuditHelper`. Remediation acceptance must require both every-mutation coverage (`0084`) and exact authenticated-principal attribution (`0106`).

#### `MNT-AUD-0065` — Legacy control-plane identity/session enforcement
- The same `protectControlPlane(...)` routes include raw-body legacy controllers; repairing their missing session/identity repository checks does not repair strict input validation or path/body target authority. File activation is separated as `0108` because it is an independently testable target-integrity defect.

### Positive Security Evidence — v0.64 Batch 2

- Student Workspace and Course Learner routers do mount mandatory `AuthMiddleware` with the persisted session manager; the optional-auth defect is scoped to the public Student Tools composition discovered in this batch.
- Student Tool use cases compare requester ownership for execution retrieval; no direct cross-student read bypass was established in that use case.
- JWT verification rejects malformed encodings, algorithm-header substitution, wrong token type, issuer/audience mismatch, expired tokens and invalid signatures. These positive checks are retained while the higher-level algorithm, TTL and refresh-token architecture remains non-compliant.
- Search request bodies use a strict Zod schema at the router edge. No separate Search-history IDOR is counted in this batch because the active Search domain still resolves through the non-executable dummy authority already captured by `0095`.

### Live Register Update — v0.64 (2026-09-06)

- Registered finding IDs allocated: **108** (`MNT-AUD-0001` → `MNT-AUD-0108`).
- Duplicate/evidence-alias IDs excluded from canonical count remain: **3** (`MNT-AUD-0038`, `MNT-AUD-0039`, `MNT-AUD-0053`).
- **Canonical unique confirmed findings: 105**.
- Severity (canonical unique): **P0: 0 | P1: 74 | P2: 30 | P3: 1 | P4: 0**.
- New canonical findings in this continuation:
  - `MNT-AUD-0105` — the canonical token provider uses forbidden HS256, a one-hour default access TTL and JWT refresh tokens instead of the approved asymmetric/short-lived/opaque model.
  - `MNT-AUD-0106` — authenticated Admin mutations are centrally attributed to `ANONYMOUS` or `SYSTEM` because audit code reads a different principal field from authentication/RBAC.
  - `MNT-AUD-0107` — public Student Tools never composes optional authentication, so authenticated ownership and save-to-student handoff are unreachable.
  - `MNT-AUD-0108` — File activation permits the body to override the path resource ID and legacy File Management lacks strict runtime body schemas.
- Search dummy/runtime and missing Finance webhook ingress evidence was deduplicated into existing root findings rather than inflating the register.
- No application source, database, GitHub setting or production runtime mutation has been executed.
- Frozen baseline remains `0931c5664cf274cb2b8f4cb250dd09ebf2e9a77f`.
- Project decision remains: **SOURCE_NOT_COMPLETE — AUDIT_IN_PROGRESS**.

### Security / Configuration Axis Status After v0.64 Batch 2

| Sub-axis | Result | Closure state |
| --- | --- | --- |
| Auth / session / token handling | New `0105` and existing `0071`/`0072`/`0076`; mandatory student session checks positive | **IN AUDIT** |
| RBAC / audit attribution | New `0106`; permission evaluation reads canonical principal but audit does not | **IN AUDIT** |
| Optional auth / public handoff | New `0107`; Student Tools authenticated mode unreachable | **IN AUDIT** |
| IDOR / BOLA / mass assignment | Student Tool ownership positive; File target confusion `0108`; Search deferred under `0095` | **IN AUDIT** |
| Webhooks / provider callbacks | No executable Finance ingress/signature boundary found; deduplicated to `0018/0077` | **PASS_WITH_EXISTING_FINDINGS** |
| Token/config guardrails | Production readiness misses forbidden algorithm/form and 15-minute TTL maximum | **IN AUDIT** |

### Next Mandatory Continuation After v0.64

1. Finish the remaining privileged-route and identity-lifecycle matrix, including service/worker authentication boundaries and every raw-body control-plane router.
2. Execute the Dead / Orphan / Stub sweep from router registration through DI construction and real callers, beginning with dummy-backed Search/Workflow/Localization and unavailable adapters.
3. Continue P23 route/action/permission/business-audit/UI parity and P24 detail/deep-link/CTA/login-handoff/SEO/accessibility parity.
4. Complete Event/Outbox/Inbox and Worker/Scheduler matrices, retaining producer/consumer/runtime separation and deduplicating already known missing transports.
5. Do not declare the discovery phase closed until every audit axis has an explicit PASS, PASS_WITH_FINDINGS or registered root cause and `Remaining unexplored audit axes = 0`.


---

## Repository Completion Audit — Dead / Orphan / Stub + Audit Integrity Continuation (v0.65 — 2026-09-06)

### MNT-AUD-0109 — P2 MEDIUM — The Composition Root Retains Orphan Foundation Use Cases and Dead Shadow Implementations With No Executable Runtime Consumer
**Categories:** DEAD_CODE / ORPHAN_COMPOSITION / DI / FOUNDATION_CAPABILITIES / SHADOW_IMPLEMENTATION / DOCUMENTATION_DRIFT / SOURCE_CLOSURE

**Evidence:**
- Repository-wide reachability checks for the older foundation use cases found `ManageMonitorsUseCase`, `ManageLogsUseCase`, `ManageSecurityPoliciesUseCase`, `ManageConfigurationsUseCase`, `ManageIntegrationsUseCase` and `ManageLocalizationsUseCase` in their implementation files, the application barrel, DI registration and architecture/baseline documents, but no executable HTTP router, worker, scheduler, event subscriber or other runtime caller was found for those registered instances in the current source pass.
- `apps/api/src/infrastructure/di/container.ts` still constructs these use cases as scoped registrations even when several of their repositories/gateways resolve to explicitly unavailable capabilities such as `monitorPersistence`, `monitoringExecution`, `securityPolicyPersistence`, `configurationPersistence`, `integrationPersistence` and `localizationPersistence`.
- This is distinct from `MNT-AUD-0049`: `0049` covers mounted control-plane capabilities such as Workflow/API Foundation/Shared Components whose runtime dependencies are unavailable. The present finding covers composition objects that are registered and documented but do not have a proven executable consumer at all.
- This is also distinct from `MNT-AUD-0095`: `0095` covers permissive `generated/dummy.ts` domain authority. The present finding concerns unreachable runtime composition and retained shadow implementations.
- `createInMemoryPrismaClient()` remains as a large implementation inside `apps/api/src/infrastructure/di/container.ts`, but the active `prisma` registration no longer selects it when Prisma is unavailable; it now returns `createUnavailableCapability('database')`. The in-memory Prisma implementation is therefore retained as a shadow/dead runtime path in the inspected canonical composition.
- Historical implementation-status documents still describe the in-memory Prisma fallback as an active preview/runtime behavior, creating documentation-to-source drift.
- `scripts/inspect_legacy.ts` contains direct diagnostic database access and `$queryRawUnsafe(...)`, but no root `package.json` command or runtime/CI caller was found in this pass. It is therefore classified here as stale/dead diagnostic source, not counted as an independently reachable production SQL-injection finding.

**Impact:**
- The DI graph advertises capabilities that cannot be reached through any proven production entry point, making source-completeness and dependency reports materially misleading.
- Unavailable dependencies can remain hidden because no runtime path forces their resolution until a future caller is added.
- Dead/shadow implementations increase maintenance ambiguity and make architecture documents, tests and remediation decisions prone to targeting code that is no longer authoritative.
- A future router or worker can accidentally revive an obsolete or non-production implementation simply because it still exists in the canonical composition source.

**Required remediation:**
1. Build a machine-verifiable registration-to-consumer graph for every DI registration and classify each as `RUNTIME_REACHABLE`, `TEST_ONLY`, `FORMALLY_DEFERRED` or `REMOVE`.
2. For required foundation capabilities, add the intended runtime entry point and real production persistence/execution adapters before claiming closure.
3. Remove DI registrations for capabilities that are intentionally not part of the current executable platform, or place them behind an explicit deferred-module boundary that cannot be mistaken for production readiness.
4. Delete or move `createInMemoryPrismaClient()` to test-only infrastructure if it is no longer an approved runtime path; do not leave two competing database authority models in the production composition root.
5. Quarantine/remove obsolete diagnostic scripts such as `inspect_legacy.ts` or place them under a clearly non-production operational tooling boundary with parameterized SQL if still required.
6. Reconcile stale implementation-status and Phase 5 traceability documents with the final executable graph.
7. Add a closure verifier that fails when production DI registrations have no runtime consumer unless an explicit approved-deferred manifest entry exists.

**Repair Wave:** W0 / W3 / W6 / W7  
**Status:** OPEN — ORPHAN_DI_REGISTRATIONS_AND_DEAD_SHADOW_IMPLEMENTATIONS_REMAIN_IN_CANONICAL_SOURCE

---

### MNT-AUD-0110 — P1 HIGH — Audit Records Are Not Append-Only: Privileged HTTP Clients Can Supply Security-Critical Audit Fields and Overwrite Existing Rows Through Repository `upsert`
**Categories:** SECURITY / AUDIT_INTEGRITY / NON_REPUDIATION / ADMIN / IMMUTABILITY / MASS_ASSIGNMENT / COMPLIANCE / DATA_INTEGRITY / SOURCE_CLOSURE

**Evidence:**
- `apps/api/src/app.ts` mounts the same `AuditRouter` at `/admin/audit` and `/audit` behind administrator authentication and `admin:audit:manage` permission.
- `AuditRouter` exposes `POST /records` and constructs its DTO primarily from `...req.body`; only `timestamp` is converted to `Date`, and the caller may still supply the timestamp value.
- `CreateAuditRecordDto` lets the HTTP caller provide `id`, `reference`, `action`, `category`, `severity`, `actorId`, `actorType`, `targetId`, `targetType`, `source`, `timestamp`, `contextMetadata`, regulatory tags, correlation/trace references, `chainReference` and retention controls.
- `ManageAuditRecordsUseCase.createAuditRecord(...)` performs no server-authoritative principal/source/timestamp/chain reconstruction; it directly persists `createAuditRecordFromDto(dto)`.
- `AuditRecordFactory` converts the caller-provided actor, source, timestamp, correlation, trace and chain values directly into domain value objects.
- `PrismaAuditRecordRepository.saveWithClient(...)` persists with `auditRecord.upsert({ where: { id }, update: data, create: data })` rather than insert-only semantics.
- Therefore an authorized caller that knows an existing audit `id` can submit that `id` to the POST endpoint and replace security-relevant fields of the existing row via the repository update branch. Even without targeting an existing row, the caller can append a fabricated record whose actor/source/time/chain appear authoritative.
- This directly conflicts with the Phase 23 requirement already captured in `MNT-AUD-0021` for a safe, read-only, non-deletable/immutable audit activity trail.
- This is distinct from `MNT-AUD-0106`: `0106` corrupts actor attribution produced by normal authenticated mutations; `0110` allows the audit-write API itself to accept caller-controlled audit authority and overwrite existing evidence.
- This is distinct from `MNT-AUD-0084`: `0084` is missing mutation-audit coverage. `0110` is integrity of records that do exist.

**Impact:**
- The audit store cannot currently be treated as immutable evidence for incident response, maker/checker review, privileged-access investigation or compliance reporting.
- A principal with audit-management permission can fabricate historical-looking records or alter an existing row by reusing its ID, undermining non-repudiation.
- Caller-controlled actor/source/timestamp/chain values can make synthetic records indistinguishable from platform-generated records at the data-model level.
- A central Audit Center built on top of this repository would present evidence whose provenance is not trustworthy even if its UI is read-only.

**Required remediation:**
1. Remove generic client-facing audit-record creation from the Admin/read-model surface unless a separately governed ingestion use case is explicitly required.
2. Make canonical security/business audit creation server-owned: derive actor/workload identity, source, timestamp, correlation/trace context and chain linkage from trusted execution context rather than request payload.
3. Replace audit persistence `upsert` with append-only insert semantics for canonical audit evidence; reject duplicate IDs/references instead of updating an existing record.
4. If archival/retention lifecycle changes are required, model them as separately authorized immutable events or narrowly scoped metadata transitions that cannot rewrite historical actor/action/source/payload evidence.
5. Enforce chain integrity and monotonic/provenance verification where chain references are part of the approved design.
6. Split read permission from any internal audit-ingestion permission. `admin:audit:manage` must not implicitly grant the ability to forge evidence.
7. Add integration tests proving existing audit rows cannot be altered through any HTTP or application path and that caller-supplied actor/source/time/chain fields are rejected.
8. Add tamper-detection/reconciliation checks before any production audit evidence is treated as authoritative.

**Repair Wave:** W1 / W2 / W4 / W6 / W7  
**Status:** OPEN — AUDIT_HTTP_INGRESS_AND_UPSERT_BREAK_APPEND_ONLY_EVIDENCE_INTEGRITY

---

### MNT-AUD-0111 — P1 HIGH — The Central DTO Validation Middleware Is Instantiated but Never Composed, Leaving Privileged Legacy Routers Outside Strict Edge Validation
**Categories:** SECURITY / INPUT_VALIDATION / PRESENTATION_BOUNDARY / MASS_ASSIGNMENT / API_CONTRACT / ORPHAN_MIDDLEWARE / CONTROL_PLANE / SOURCE_CLOSURE

**Evidence:**
- `createApiApp()` bootstraps `ZodValidationProvider`, `DefaultSanitizer`, `ValidationService` and then constructs `const dtoValidationMiddleware = new DtoValidationMiddleware(validationService)`.
- The same `app.ts` then mounts security headers, CORS, logging, rate limiting, strict JSON parsing, CSRF and monitoring, but the constructed DTO validation middleware is not mounted globally or passed to the route composition shown in the canonical application bootstrap.
- Repository-wide search for `dtoValidationMiddleware`, `validateBody`, `validateQuery` and `validateParams` found the middleware definition and bootstrap construction but no active router composition using those validation methods in the inspected source.
- Several privileged legacy routers therefore implement their own inconsistent boundary handling instead of the declared centralized validation layer:
  - `WorkflowRouter` forwards raw `req.body` to `createWorkflow(...)` and reads `req.body.toState` directly.
  - `ApiFoundationRouter` forwards raw create payloads and manually copies version-publication fields without a runtime schema.
  - `SharedComponentRouter` forwards raw create/version payloads and collapses all exceptions into a generic 400 response.
  - `NotificationRouter` accepts an `any` cradle and forwards raw template/intent payloads, performing only date conversion.
  - `CacheRouter` performs presence checks but does not enforce a closed runtime schema or unknown-field rejection.
  - `BackgroundJobRouter` manually coerces fields such as priority/timeout/maxAttempts and accepts arbitrary job parameters without a strict edge schema.
  - `AuditRouter` accepts caller-controlled audit DTO fields, producing the independent integrity failure recorded as `MNT-AUD-0110`.
- Modern owner-domain routers such as CMS, AI, Career, Finance and Services use explicit Zod parsing, demonstrating that strict validation is achievable but not uniformly governed.
- `MNT-AUD-0108` remains a separately testable file-target authority defect. `0111` is the systemic composition failure that allows multiple legacy privileged surfaces to bypass the platform's declared central edge-validation mechanism.

**Impact:**
- Strict input-validation behavior depends on which historical router owns the route rather than one enforceable platform contract.
- Unknown fields, type coercion, oversized/nested business payload shapes and mass-assignment opportunities can reach legacy use cases inconsistently.
- Security and API-governance verifiers can report a validation subsystem as present even though it is orphaned from the actual HTTP boundary.
- Adding new fields to TypeScript interfaces does not protect runtime JSON, so source type safety can create false confidence for privileged operations.

**Required remediation:**
1. Choose one enforceable presentation-boundary validation contract: either compose the central `DtoValidationMiddleware` per route with explicit schemas or formally retire it and require a standard route-local schema mechanism.
2. Define strict path/query/body schemas for every privileged legacy control-plane route and reject unknown properties by default.
3. Prohibit forwarding raw `req.body` into application use cases for privileged mutations.
4. Separate transport coercion from business DTOs and prohibit client control of server-owned fields such as actor, owner, source, lifecycle authority or canonical target identifiers.
5. Add an architecture/source verifier that fails privileged routers lacking an approved runtime validation schema.
6. Add negative integration tests for unknown fields, wrong types, oversized nested values, conflicting resource identifiers and malformed lifecycle commands.
7. Reconcile Phase 4 validation documentation so it describes the mechanism actually composed in production source.

**Repair Wave:** W0 / W1 / W4 / W6 / W7  
**Status:** OPEN — CENTRAL_DTO_VALIDATION_IS_ORPHANED_AND_LEGACY_PRIVILEGED_ROUTES_BYPASS_STRICT_EDGE_SCHEMAS

---

### Evidence Addenda — Existing Findings Strengthened in v0.65

#### `MNT-AUD-0049` — Mounted unavailable control-plane persistence remains separate from orphan composition
- Workflow/API Foundation/Shared Components remain mounted runtime surfaces with unavailable persistence and therefore stay under `0049`. They are not recounted under `0109`, whose scope is registrations with no proven executable consumer and dead/shadow implementations.

#### `MNT-AUD-0095` — Dummy domain authority remains separate from reachability
- Generated dummy contracts are still a production-authority problem independent of whether a particular use case/router is reachable. `0109` does not replace or duplicate `0095`.

#### `MNT-AUD-0108` — File activation target confusion remains independently testable
- The broader orphaned-validation finding `0111` strengthens the reason legacy File Management lacks uniform edge validation, but `0108` retains a concrete path/body target-override defect with its own acceptance test. Final repository-wide root-cause deduplication may reassess parent/child grouping after the full legacy-router matrix is complete.

### Positive / Non-Finding Evidence — v0.65

- The current canonical `prisma` registration fails closed to `createUnavailableCapability('database')` rather than selecting the retained in-memory Prisma implementation when the production database authority is absent. The remaining concern is dead/shadow code and stale documentation, not an observed active production fallback in the current composition.
- The current Dead/Stub search did not establish a new production TODO/FIXME execution defect. Existing source-verification scripts explicitly scan for production TODO/FIXME markers; the broader dead/orphan sweep remains open because unreachable composition and unavailable/dummy implementations are the material gaps.
- `scripts/inspect_legacy.ts` was not found in the root npm command surface or a runtime caller during this pass. Its unsafe raw SQL remains maintenance debt/stale tooling evidence under `0109`, not a counted runtime exploit without reachability proof.

### Live Register Update — v0.65 (2026-09-06)

- Registered finding IDs allocated: **111** (`MNT-AUD-0001` → `MNT-AUD-0111`).
- Duplicate/evidence-alias IDs excluded from canonical count remain: **3** (`MNT-AUD-0038`, `MNT-AUD-0039`, `MNT-AUD-0053`).
- **Canonical unique confirmed findings: 108**.
- Severity (canonical unique): **P0: 0 | P1: 76 | P2: 31 | P3: 1 | P4: 0**.
- New canonical findings in this continuation:
  - `MNT-AUD-0109` — orphan foundation use-case registrations and dead/shadow implementations remain in the canonical composition source without a proven runtime consumer.
  - `MNT-AUD-0110` — the audit HTTP API accepts caller-controlled evidence fields and the Prisma repository uses `upsert`, allowing fabricated records and overwrite of an existing audit row by ID.
  - `MNT-AUD-0111` — the central DTO validation middleware is constructed but not composed; multiple privileged legacy routers bypass strict runtime edge schemas.
- `MNT-AUD-0049`, `MNT-AUD-0095` and `MNT-AUD-0108` received evidence/dedup addenda without duplicate recounting.
- No application source, database, migration, GitHub setting or production runtime mutation has been executed.
- Frozen audit baseline remains `0931c5664cf274cb2b8f4cb250dd09ebf2e9a77f`.
- Project decision remains: **SOURCE_NOT_COMPLETE — AUDIT_IN_PROGRESS**.

### Dead / Orphan / Stub Axis Status After v0.65

| Sub-axis | Result | Closure state |
| --- | --- | --- |
| Unmounted / unreachable use cases | `0109` confirms multiple foundation use cases registered without a proven runtime consumer | **IN AUDIT** |
| Mounted routers with unavailable dependencies | Existing `0049`, `0050` and related runtime-capability findings remain | **PASS_WITH_EXISTING_FINDINGS / matrix still expanding** |
| Generated / dummy authority | Existing `0095` remains canonical | **PASS_WITH_EXISTING_FINDINGS** |
| In-memory / mock / no-op production paths | Current Prisma registration fails closed; retained in-memory Prisma implementation is dead/shadow evidence under `0109` | **IN AUDIT** |
| TODO / FIXME / placeholder / prototype / demo | No new reachable production TODO/FIXME root established in this pass | **IN AUDIT** |
| Duplicate / shadow implementations | `0109` confirms stale/shadow in-memory DB authority and stale docs | **IN AUDIT** |
| Orphan cross-cutting middleware | `0111` confirms DTO validation is constructed but not composed | **IN AUDIT** |
| Obsolete diagnostic scripts | `inspect_legacy.ts` currently classified stale/unreachable; no runtime exploit counted without reachability proof | **IN AUDIT** |

### Security / Audit Integrity Axis Status After v0.65

| Sub-axis | Result | Closure state |
| --- | --- | --- |
| Audit immutability / provenance | New `0110`: caller-controlled audit evidence + repository upsert | **IN AUDIT** |
| Strict edge validation / mass assignment | New `0111`; specific File target confusion remains `0108` | **IN AUDIT** |
| Authenticated actor attribution | Existing `0106` remains | **IN AUDIT** |
| Audit coverage | Existing `0084` remains | **IN AUDIT** |
| Admin Audit Center | Existing `0021`; future UI must consume trustworthy read-only evidence | **IN AUDIT** |

### Next Mandatory Continuation After v0.65

1. Finish the Dead / Orphan / Stub reachability matrix across all DI registrations, routers, workers, event subscribers, schedulers and package exports; classify every orphan as required-now, test-only, formally deferred or removable.
2. Complete the remaining privileged-route and identity/service-worker authentication matrix, including strict schemas for every raw-body control-plane router and workload/system identity boundaries.
3. Continue P23 route/action/permission/business-audit/UI parity, with the Audit surface treated as read-only until `0110` is remediated.
4. Continue P24 route/detail/deep-link/CTA/login-handoff/SEO/accessibility parity and the full Student/Learning Web→API→DB journey.
5. Complete Event/Outbox/Inbox and Worker/Scheduler matrices, keeping declaration, producer, durable publication, runtime dispatcher, consumer, inbox/idempotency and retry/DLQ evidence separate.
6. Complete DB/Data Integrity, API Contract Governance, CI/Release, Observability/Operations and Documentation Authority passes.
7. Perform final `MNT-AUD-0001` → last-ID root-cause deduplication only after all axes are explicit PASS / PASS_WITH_FINDINGS / registered root cause.
8. Do not freeze the final issue count or begin remediation until `Remaining unexplored audit axes = 0`.

---

## Repository Completion Audit — Rapid Final Forensic Closure Sweep (v0.66 — 2026-09-06)

### Sweep Method
This continuation intentionally used a **root-cause-first rapid closure pass** across the remaining audit axes. The purpose was to finish discovery without re-auditing every previously proven symptom. Existing canonical findings were reused whenever the newly inspected evidence was already explained by the same root cause. A new finding was allocated only where the defect was independently testable and not repaired by an existing finding.

The frozen source authority remains:
- Repository: `wegdangamil2022-oss/MANARATAK_FINAL`
- Branch: `main`
- Frozen commit: `0931c5664cf274cb2b8f4cb250dd09ebf2e9a77f`

No application source, database, migration, GitHub setting, release environment or production runtime mutation was executed during this pass.

### MNT-AUD-0112 — P1 HIGH — P23 Later-Domain Admin Pages Expose Only a Subset of Existing Owner-API Mutations, Leaving Important Administrative Actions Without UI Parity
**Categories:** P23 / ADMIN / UI_API_PARITY / CAREERS / STUDENT_TOOLS / CONTROL_PLANE / MISSING_ACTION / SOURCE_CLOSURE

**Evidence:**
- `CareerAdminRouter.ts` exposes a real `PATCH /jobs/:id` owner mutation through `CareerAdminUseCases.updateJob(...)` in addition to create/list/detail/lifecycle commands.
- `CareerAdminPage.tsx` loads and creates jobs and exposes lifecycle actions such as mark-publishable, publish and archive, but the inspected page has no corresponding `PATCH`/`updateJob` mutation path for editing an existing job.
- `StudentToolsAdminRouter.ts` exposes administrative mutations for:
  - `PATCH /:toolKey/metadata`
  - `PATCH /:toolKey/availability`
  - `PATCH /:toolKey/flags`
  - `POST /:toolKey/lifecycle/:action` with `activate`, `testing`, `deprecate`, and `retire`
  - `POST /:toolKey/test`
- `StudentToolsAdminPage.tsx` was positively verified to call `PATCH /flags` and `POST /lifecycle/activate`, but no page call was found for `/metadata`, `/availability` or `/test`, and no UI call was found for the `testing`, `deprecate` or `retire` lifecycle commands.
- CMS and Services were inspected as counterexamples: their Admin pages expose substantial real owner-API create/edit/lifecycle workflows, so the defect is not that the whole P23 portal is a shell. The defect is incomplete action parity in later-domain workspaces.
- This is distinct from `MNT-AUD-0064`, which concerns permission-aware visibility/navigation, and from `MNT-AUD-0084`, which concerns central mutation-audit classification. Fixing either of those does not add the missing UI actions.
- It is also distinct from `MNT-AUD-0055`, which captures the larger missing Career/Alumni owner-domain scope; `0112` concerns administrative actions for owner APIs that **already exist**.

**Impact:**
- An administrator can reach a domain workspace yet still be unable to perform owner-supported administrative operations from the canonical Admin product.
- Operations may be forced to use direct API calls or ad-hoc tooling, weakening P23's role as the canonical control plane and increasing governance/audit inconsistency.
- Route/page-presence verifiers can pass while business-action parity remains incomplete.
- Student Tools governance cannot fully manage versioned availability, metadata, test execution or retirement/deprecation from the canonical UI despite the backend exposing those commands.
- Career administrators cannot reliably edit an existing implemented job record through the canonical UI even though the owner API supports the mutation.

**Required remediation:**
1. Create an executable P23 action-parity manifest: `Admin page/action -> owner API method/path -> backend permission -> auth/session/identity guard -> business/central audit -> validation -> result/error/empty state`.
2. Wire Career job edit/update to the existing owner mutation, preserving canonical references and any required version/concurrency contract.
3. Wire Student Tools metadata, versioned availability, test execution, testing/deprecate/retire lifecycle controls and appropriate confirmations/readiness constraints.
4. Make every control permission-aware under the final `0064` remediation and ensure every mutation receives the final `0084` audit policy.
5. Add deep-link and negative-state tests for missing permission, stale state, validation failure and owner-domain rejection.
6. Extend P23 closure verification to test action wiring, not merely page/file/route existence.

**Repair Wave:** W4 / W5 / W6 / W7  
**Status:** OPEN — P23_LATER_DOMAIN_ADMIN_ACTION_PARITY_INCOMPLETE

---

### Evidence Addenda — Existing Findings Strengthened in v0.66

#### `MNT-AUD-0031` / `MNT-AUD-0048` — Closure gates can remain green while runtime/source gaps are explicitly pending
- `W16_FINAL_SOURCE_CLOSURE_AND_RUNTIME_HANDOFF.md` declares `FINAL_SOURCE_GATE = PASS` and `SOURCE_REMEDIATION = CLOSED` while separately declaring database/runtime closure pending.
- Current forensic findings through `0112` prove that source-level gaps remain despite those historical closure claims.
- Phase-plan/remediation documents also contain explicit `Runtime Pending` entries for later-domain relationships while their source/plan verifiers can still report verified/closed states.
- This is additional evidence for the existing false-green/incomplete-closure-gate roots; no duplicate canonical finding is added.

#### `MNT-AUD-0045` — Active P23/P24 authority requires re-baselining against the actual canonical products
- The current Admin application contains substantial real CMS/Services/Finance/Careers/Student Tools workspaces, but the rapid action-parity pass proves that file/page presence does not imply complete administrative capability parity.
- Final P23 authority must therefore enumerate business actions and ownership, not only pages/routes.

#### `MNT-AUD-0055` — Career/Alumni scope remains broader than the implemented employer/job slice
- The rapid P23 pass positively confirms real employer/job administration, but that positive evidence does not repair the already registered absence of the wider applications/CV/alumni/profile owner scope.
- `0112` is limited to missing UI parity for already-existing owner commands; `0055` remains the canonical missing-owner-scope root.

#### `MNT-AUD-0111` — Strict-edge validation addendum
- `StudentToolsAdminRouter` uses Zod for several admin payloads but its `/test` command reads execution input/locale directly from `req.body`. This reinforces the rule that every privileged mutation requires an explicit closed runtime schema; it does not create another validation finding.

#### `MNT-AUD-0029` / `MNT-AUD-0034` — Worker lifecycle/configuration addendum
- The certificate-completion outbox worker has a real opt-in scheduler loop and overlap guard in `server.ts`; therefore no duplicate “all workers missing” finding is valid.
- Its interval is cleared on HTTP-server `close`, while process-level graceful termination orchestration remains governed by the existing shutdown finding.
- Worker enable/polling environment ownership remains governed by the existing canonical environment-documentation finding.

### Positive / Non-Finding Evidence — Rapid Final Sweep

- **CMS Admin:** real create/edit/localized-content/review/approve/reject/publish/archive/schedule flows with explicit Zod validation are present. No generic “CMS Admin missing” finding is valid.
- **Services Admin:** real create/update and lifecycle controls are wired to owner APIs, including canonical country/language references. No generic “Services Admin missing” finding is valid.
- **Finance Admin:** the canonical Admin UI and owner API exist; the backend uses granular finance permissions and strict validation for critical commands. Remaining permission/audit/release concerns stay under existing root findings rather than a fabricated “Finance UI absent” issue.
- **Public deep links:** the canonical Web router declares list/detail paths for scholarships, universities, countries, majors, courses, articles, services, tests and careers, and `PublicTemplateApp` contains owner-API hydration paths for those detail URLs in API mode.
- **Compare:** `/compare` remains a declared shell without implemented comparison composition; this is already canonical `MNT-AUD-0061` and is not recounted.
- **Student Tools planned entries:** registry entries marked `PLANNED` are treated as explicit roadmap state rather than automatically as defects. Only contractually active/implemented behavior is evaluated as executable scope.
- **Certificate completion worker:** a real scheduler/caller exists. Worker-axis findings are therefore scoped to the specific missing/unsafe runtimes already registered, not to the entire background-processing subsystem.
- **Legacy diagnostic SQL:** `scripts/inspect_legacy.ts` remains unproven as a runtime/CI caller and is retained as dead/stale-tooling evidence under `0109`, not promoted to a runtime SQL-injection finding.

### Final Rapid Axis Disposition — Discovery Coverage

| # | Audit axis | Final discovery disposition | Canonical roots / notes |
|---|---|---|---|
| 1 | Security / Configuration | **PASS_WITH_FINDINGS** | `0101–0111` plus existing auth/session/RBAC/config/webhook/file/security roots; no unexplored security sub-axis retained after rapid closure pass |
| 2 | Dead / Orphan / Stub | **PASS_WITH_FINDINGS** | `0049`, `0050`, `0095`, `0109`, `0111`; dead diagnostic/in-memory shadow evidence deduplicated |
| 3 | P23 Admin Portal Final Parity | **PASS_WITH_FINDINGS** | existing `0020`, `0021`, `0044`, `0055`, `0059`, `0064`, `0065`, `0084` + new `0112` |
| 4 | P24 Public Platform Final Parity | **PASS_WITH_FINDINGS** | `0022`, `0024`, `0025`, `0061`, `0069`, `0085`, `0090`, `0091`, `0092`; deep-link owner hydration positively verified for major domains |
| 5 | Student / Learning Journey | **PASS_WITH_FINDINGS** | `0092`, `0093`, `0097`, `0107` capture missing Web/LMS composition, event continuity, certificate link and optional-auth handoff |
| 6 | Event / Outbox / Inbox Matrix | **PASS_WITH_FINDINGS** | `0060`, `0068`, `0080`, `0089`, `0093` and related registered producer/transport roots; no duplicate cross-domain event root added |
| 7 | Workers / Schedulers | **PASS_WITH_FINDINGS** | `0017`, `0029`, `0034`, `0054`, `0068`, `0086`; certificate worker positively has a scheduler, preventing overbroad classification |
| 8 | DB / Data Integrity | **PASS_WITH_FINDINGS** | `0083`, `0088`, `0096` plus already registered migration/recovery/integrity findings; `db-remediation-gate.ts` provides positive guarded recovery mechanics but does not close runtime evidence |
| 9 | API Contract Governance | **PASS_WITH_FINDINGS** | `0098`, `0099`, `0100`, `0108`, `0111`; no new independent contract-governance root in rapid pass |
| 10 | CI / GitHub / Release | **PASS_WITH_FINDINGS** | `0031`, `0048`, `0082`, `0087`, `0094`; false-green closure evidence strengthened |
| 11 | Observability / Operations | **PASS_WITH_FINDINGS** | `0078`, `0029`, worker-health/runtime findings; structured logging and health/readiness remain positive evidence |
| 12 | Documentation Authority | **PASS_WITH_FINDINGS** | `0031`, `0045` plus v0.66 W16/Runtime-Pending evidence addenda |
| 13 | Final Repository-Wide Deduplication | **PASS** | existing aliases `0038`, `0039`, `0053` remain excluded; v0.66 evidence was attached to existing roots where applicable; `0112` is independent of `0064/0084/0055` |
| 14 | Closure Gate | **PASS — DISCOVERY ONLY** | every required axis now has an explicit disposition; source remediation has **not** started |

### Final Discovery Gate — v0.66

- **Remaining unexplored audit axes = 0**.
- This statement closes **audit discovery**, not source remediation and not runtime/production readiness.
- The repository remains **SOURCE_NOT_COMPLETE** because canonical OPEN findings remain unresolved.
- The issue register is now frozen for remediation planning at the current frozen commit. New IDs after this point require genuinely new evidence discovered during repair/verification, not re-counting known symptoms.

### Live Register Update — v0.66 (2026-09-06)

- Registered finding IDs allocated: **112** (`MNT-AUD-0001` → `MNT-AUD-0112`).
- Duplicate/evidence-alias IDs excluded from canonical count: **3** (`MNT-AUD-0038`, `MNT-AUD-0039`, `MNT-AUD-0053`).
- **Canonical unique confirmed findings: 109**.
- Severity (canonical unique): **P0: 0 | P1: 77 | P2: 31 | P3: 1 | P4: 0**.
- New canonical finding in v0.66:
  - `MNT-AUD-0112` — P23 later-domain Admin action parity is incomplete despite existing owner APIs; confirmed in Career job editing and multiple Student Tools administrative commands.
- Evidence-only addenda were attached to `0031/0048`, `0045`, `0055`, `0111`, `0029/0034`; these do not increase the canonical count.
- Frozen baseline remains `0931c5664cf274cb2b8f4cb250dd09ebf2e9a77f`.
- **Audit discovery decision:** `DISCOVERY_COMPLETE — REMAINING_UNEXPLORED_AUDIT_AXES_0`.
- **Source decision:** `SOURCE_NOT_COMPLETE — REMEDIATION_REQUIRED`.
- **Runtime decision:** `NOT_READY_FOR_RUNTIME_CLOSURE`.

### Remediation Handoff Rule

Discovery is now closed for this frozen baseline. The next managerial activity is to organize the 109 canonical findings into dependency-safe repair waves, preserving the established ordering principle:

`W0 authority/closure -> W1 security/runtime foundations -> W2 DB/domain invariants -> W3 events/workers/integrations -> W4 API/Admin/Public -> W5 end-to-end journeys -> W6 tests/CI/security/observability -> W7 documentation/evidence/closure`.

Within each wave, execute `P1 -> P2 -> P3` unless a lower-severity prerequisite is technically required to repair a higher-severity dependent finding safely.

---

## Repository Completion Audit — Final Root-Cause Deduplication & Discovery Freeze (v0.67 — 2026-09-06)

### Purpose
This reconciliation supersedes the **current-count / dedup assertions** in v0.66 while preserving every historical discovery entry for forensic traceability. No finding text is silently deleted. The final pass compared all allocated IDs `MNT-AUD-0001` → `MNT-AUD-0112` by root cause, affected boundary, remediation acceptance test and whether fixing one finding necessarily closes the other.

### Newly Confirmed Duplicate / Evidence Alias

#### `MNT-AUD-0082` → canonical root `MNT-AUD-0005`
`MNT-AUD-0082` is not an independent root cause. Both findings establish the same repository-boundary defect:

- canonical `main` is unprotected;
- required status checks/review gates are not server-side enforced;
- direct changes can bypass CI/review closure controls;
- remediation is GitHub branch protection/rulesets + required checks + controlled bypass policy.

`0082` adds stronger evidence (CODEOWNERS/review/change-control detail) and therefore remains in the document as an **evidence alias/addendum**, but remediation and closure must be recorded against `0005`.

### Severity Reconciliation

`MNT-AUD-0005` is promoted from **P2 MEDIUM → P1 HIGH** using the expanded evidence recorded under alias `0082`. The defect is not merely repository hygiene: it permits canonical source changes to bypass mandatory review/status evidence at the repository boundary and therefore directly undermines release/source-closure governance.

No other severity is changed by this v0.67 reconciliation.

### Final Duplicate / Evidence-Alias Set

The following allocated IDs remain preserved but are excluded from the canonical unique finding count:

1. `MNT-AUD-0038` → `MNT-AUD-0011` — production Asset storage/malware/sanitization provider plane.
2. `MNT-AUD-0039` → `MNT-AUD-0012` — durable production Import raw-snapshot/provenance store.
3. `MNT-AUD-0053` → `MNT-AUD-0002` — Node runtime baseline documentation/configuration drift.
4. `MNT-AUD-0082` → `MNT-AUD-0005` — unprotected `main` / missing required repository change gates.

### Explicit Non-Duplicate Decisions From the Final Pass

The following high-similarity pairs were reviewed and **remain independent canonical findings** because they have different closure tests and one repair does not necessarily close the other:

- `0025` vs `0037`: public catalog first-page truncation vs canonical Search capability/backend + P24 global-search architecture.
- `0031` vs `0048`: stale/incomplete cross-phase closure authority vs canonical CI omitting active verifiers.
- `0041` vs `0083`: migration-chain↔schema parity proof vs fail-open/incomplete database baseline evidence.
- `0064` vs `0112`: permission-unaware Admin navigation/control visibility vs existing backend mutations that have no corresponding Admin UI action.
- `0084` vs `0106` vs `0110`: audit coverage vs authenticated actor attribution vs append-only/audit-evidence integrity.
- `0108` vs `0111`: concrete File activation path/body target-confusion defect vs systemic orphaned transport-validation boundary.
- `0065` vs `0076`: compatibility/control-plane guards omitting session/identity revalidation vs identity lifecycle changes failing to invalidate/reject already-issued sessions.
- `0018` vs `0077`: missing/non-functional finance provider adapters vs absence of autonomous provider-state reconciliation for ambiguous outcomes.

### Canonical Register — Final Discovery Count

- Allocated finding IDs: **112** (`MNT-AUD-0001` → `MNT-AUD-0112`).
- Evidence/duplicate aliases excluded: **4** (`0038`, `0039`, `0053`, `0082`).
- **Canonical unique confirmed findings: 108**.
- Canonical severity after reconciliation:
  - **P0: 0**
  - **P1: 76**
  - **P2: 31**
  - **P3: 1**
  - **P4: 0**
- Canonical total check: `76 + 31 + 1 = 108`.

Historical version checkpoints inside this living register are retained as the counts reported at those moments. **v0.67 is the superseding current register truth for remediation planning.**

### Audit-Axis Closure Check

All 14 mandatory final-audit axes now have an explicit disposition:

1. Security / Configuration — `PASS_WITH_FINDINGS`
2. Dead / Orphan / Stub — `PASS_WITH_FINDINGS`
3. P23 Admin Portal Final Parity — `PASS_WITH_FINDINGS`
4. P24 Public Platform Final Parity — `PASS_WITH_FINDINGS`
5. Student / Learning Journey — `PASS_WITH_FINDINGS`
6. Event / Outbox / Inbox Matrix — `PASS_WITH_FINDINGS`
7. Workers / Schedulers — `PASS_WITH_FINDINGS`
8. DB / Data Integrity — `PASS_WITH_FINDINGS`
9. API Contract Governance — `PASS_WITH_FINDINGS`
10. CI / GitHub / Release — `PASS_WITH_FINDINGS`
11. Observability / Operations — `PASS_WITH_FINDINGS`
12. Documentation Authority — `PASS_WITH_FINDINGS`
13. Final Repository-Wide Deduplication — **PASS**
14. Closure Gate — **PASS — DISCOVERY ONLY**

**Remaining unexplored audit axes = 0**.

### Frozen Discovery Decision

- `AUDIT_DISCOVERY = COMPLETE`
- `REMAINING_UNEXPLORED_AUDIT_AXES = 0`
- `CANONICAL_FINDINGS_FROZEN_FOR_REMEDIATION_PLANNING = 108`
- `SOURCE_COMPLETE = NO`
- `SOURCE_STATUS = SOURCE_NOT_COMPLETE — REMEDIATION_REQUIRED`
- `RUNTIME_VERIFIED = NO`
- `PRODUCTION_READY = NO`
- Frozen source baseline remains: `0931c5664cf274cb2b8f4cb250dd09ebf2e9a77f`.
- No application source, database, migration, GitHub setting, release environment or production runtime mutation was executed during discovery/dedup.

### Next Authorized Activity

Discovery is closed for this frozen baseline. The next activity is **remediation planning**, not more exploratory audit and not ad-hoc source edits.

Repair ordering remains dependency-safe:

`W0 Authority/Repository Truth → W1 Security/Runtime Foundations → W2 DB/Domain Invariants → W3 Events/Workers/Integrations → W4 API/Admin/Public → W5 End-to-End Journeys → W6 Tests/CI/Security/Observability → W7 Documentation/Evidence/Closure`.

Within each wave, execute **P1 → P2 → P3**, except where a lower-severity technical prerequisite must be repaired first to safely close a higher-severity dependent finding.


<!-- ORIGINAL_V067_END -->


---

# W2 Execution Addendum — 2026-09-06

**Wave decision:** `W2_SOURCE_COMPLETE = PASS`  
**Full database exit gate:** `DB_RUNTIME_EVIDENCE_PENDING`

Evidence is packaged inside the repository at `docs/remediation/W2_SOURCE_CLOSURE_2026-09-06.md` and `docs/remediation/evidence/w2/`.

- W2 source verifier: **84/84 PASS**
- W2 Node remediation test files: **15/15 PASS**
- Persistence ownership: **233/233** models
- Cross-context ORM writes: **0**
- Asset reference coverage: **28 direct + 4 JSON**
- Production DI reachability: **280/280; orphan = 0**
- Source quality: **PASS**
- DB runtime replay is not claimed because PostgreSQL/Docker tooling is absent in this execution environment.
- Greenfield seed remains fail-closed because P7 countries are unreviewed and currency/language authoritative seed datasets are not yet present.

No W2 item is represented as production/runtime closed when its required external database evidence is unavailable.
