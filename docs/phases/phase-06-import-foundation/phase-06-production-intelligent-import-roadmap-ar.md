# المرحلة السادسة: منصة الاستيراد الذكية - خارطة الطريق للإنتاج (Phase 06: Intelligent Import Platform - Production Roadmap)

**الحالة الحالية (Status):**
`PHASE_06_STRUCTURAL_FOUNDATION_PARTIAL_RUNTIME_NOT_PRODUCTION_READY`

## قاعدة التنفيذ الصارمة (Explicit Rule)
يتم رفض الطلبات العامة والواسعة مثل "Implement Phase 06" بشكل قاطع. يجب تنفيذ المرحلة السادسة فقط من خلال شرائح (Slices) ضيقة ومحددة، مع اتباع بروتوكول:
- تقرير قبل التنفيذ (report-before-implementation).
- تحقق بعد التنفيذ (verification-after-implementation).

## الترتيب الإلزامي للتنفيذ (Mandatory Execution Order)
1. **P0**: التوثيق، العقود، وتصحيح حدود الصلاحيات (Documentation/contracts/boundary corrections).
2. **P1**: إصلاحات مخاطر بيئة التشغيل الحالية (Current runtime risk fixes).
3. **P2**: آلة حالة الوظائف، قوائم الانتظار، إعادة المحاولة، نقاط الحفظ، والرسائل الميتة (Job state machine, queue, retries, checkpoints, dead-letter).
4. **P3**: المحللات المتدفقة، التخزين المؤقت المجمع، والاختبارات غير الوظيفية (Streaming parsers, bulk staging, and non-functional tests).
5. **P4**: سجل المصادر، الموصلات، الاستحواذ المتوافق مع اللوائح، واكتشاف الانحراف (Source registry, connectors, compliant acquisition, and drift detection).
6. **P5**: استخراج الذكاء الاصطناعي، المصدرية، الأدلة، وتقييم الثقة (AI extraction, provenance, evidence, and confidence scoring).
7. **P6**: التسليم للمجالات عبر مقترحات المطابقة والدمج (Domain handoff through match/merge proposals).
8. **P7**: عمليات الإدارة والجاهزية للإنتاج (Admin operations and production readiness).

## المشكلات الحالية التي يجب حلها أولاً (Current Problems to Solve First)
- مخاطر استيعاب `dataText JSON` (dataText JSON ingestion risk).
- تحليل JSON/CSV في الذاكرة بالكامل (full-memory JSON/CSV parsing).
- محلل CSV اليدوي الضعيف (weak manual CSV parser).
- حالة `COMPLETED` المبكرة للدفعة (premature batch COMPLETED status).
- الكتابة المتسلسلة للسجلات (sequential record writes).
- تراجع Prisma الصامت للذاكرة (silent Prisma fallback to memory).
- مفتاح `sourceDedupKey` ضعيف (weak sourceDedupKey).
- ادعاءات واجهة المستخدم الإدارية غير المدعومة بسلوك الواجهة الخلفية (admin UI claims not backed by backend behavior).
- غياب التقسيم في الصفحات/الفهرسة/الاختبارات غير الوظيفية (missing pagination/indexing/non-functional tests).

## حدود البنية التقنية (Architecture Boundaries)
**ما تملكه المرحلة السادسة (Phase 06 Owns):**
آليات الاستيراد العامة فقط: سجل المصادر، الموصلات، الاستحواذ المصرح به، القطع الأثرية (artifacts)، التحليل، قوائم الانتظار/العمال، إعادة المحاولة، نقاط الحفظ، التخزين المؤقت، المصدرية، الأدلة، نقل التحقق العام، التاريخ، قابلية الملاحظة، التسليم للمجال.

**ما تملكه المراحل اللاحقة (Downstream Phases Own):**
تعريفات حقول المجال، الهوية الأساسية (canonical identity)، قواعد الاكتمال، إزالة التكرار في المجال، سياسة الدمج، الجاهزية للنشر، والنشر النهائي.

## قواعد الامتثال (Compliance Rules)
- **لا توجد مرحلة 25 (No Phase 25).**
- لا يوجد نشر تلقائي (No auto-publish).
- لا توجد كتابة فوقية صامتة (No silent overwrite).
- يمنع تجاوز CAPTCHA، أو جدران الدفع، أو ملفات `robots.txt` (No CAPTCHA/paywall/robots bypass).
- يجب أن تنتقل المصادر المحمية أو المحظورة إلى واجهة برمجة تطبيقات رسمية، أو حساب مصرح به، أو اتفاقية بيانات، أو رفع يدوي.

## قواعد الذكاء الاصطناعي والجودة (AI and Quality Rules)
- **يُسمح للذكاء الاصطناعي (AI May):** باقتراح التعيينات، الاستخراج من المحتوى المصرح به باستخدام JSON Schema، تصنيف نوع المصدر/الصفحة، اقتراح الحقول المفقودة أو مرشحي المطابقة، وتوضيح أسباب انخفاض الثقة.
- **يُمنع على الذكاء الاصطناعي (AI Must Not):** اختراع قيم (الهلوسة)، تجاوز التحقق، النشر التلقائي، الدمج التلقائي، الكتابة الفوقية، أو حذف القيم المنشورة.
- **يجب أن يدعم كل حقل مستخرج الأدلة التالية (Every extracted field must support evidence):**
  - `fieldName`
  - `extractedValue`
  - `sourceUrl`
  - `sourceId`
  - `retrievedAt`
  - `contentHash`
  - `connectorVersion`
  - `extractorType`
  - `modelName`
  - `promptVersion`
  - `schemaVersion`
  - `selectorOrJsonPath`
  - `evidenceSnippet`
  - `confidenceScore`
  - `validationResults`
- يجب أن يكون مقطع الدليل `evidenceSnippet` قصيرًا وموجهًا للمراجعة البشرية.
- يجب ألا يكون `confidenceScore` كافيًا أبدًا للنشر أو الدمج التلقائي.

## قاعدة المطابقة والدمج (Matching/Merge Rule)
- لا تقرر المرحلة السادسة ما إذا كانت المنحة/الدورة/الجامعة موجودة بالفعل.
- ترسل المرحلة السادسة المرشحين إلى سياسة المجال المالك (owning domain policy).
- يعيد المجال المالك مرشحي المطابقة، تقرير الاكتمال، الفروق على مستوى الحقل، ومقترح الدمج.
- يمكن اقتراح تعبئة الحقول المفقودة فقط إذا كان مسموحًا بذلك وفقًا لسياسة المجال ومدعومًا بأدلة موثوقة.
- تُحال التعارضات (Conflicts) إلى المراجعة.
- الغياب في مصدر جديد لا يحذف أبدًا قيمة منشورة حالية.
