# القسم 03 — EAP / تنفيذ الدفعة الأمنية الأولى (غير مغلق)

- **مرجع وحيد:** `MANARATAK_ADMIN_REVIEW_CODEX.md`، SHA-256: `9de7c781eb82cd490fc85386267d7e9e3fe2b2028803f9ecd0351531e2cd11fc`.
- **فرع العمل:** `codex/section-01-iam-rbac`، انطلاقًا من `fea237f16a11bbc1e27e4773eba1ac88d21ec668`.
- **نطاق الدفعة:** تغييرات مصدر واختبارات انحدار فقط. لا migrations، ولا seed، ولا production writes، ولا تغيير main، ولا تصريح إطلاق.
- **حالة الأدلة:** source changes authored and reviewed syntactically for expected source matches. **Not executed**: TypeScript/Vitest/CI/DB/browser/provider integration. هذا ليس `CLOSED`.

## مصفوفة التنفيذ والحدود

| المهمة الأصلية | ما عولج في الدفعة | ما بقي مفتوحًا |
| --- | --- | --- |
| 03/P0-01 | حفظ حالة scanner PASSED/FAILED مع توقيتها وlocator في `malwareScanStatus` الموجود أصلًا؛ منع sanitize/activate بلا دليل، والمفقود التاريخي fail-closed | ضمان وجود binary وverified MIME/checksum وscanner attestation/version؛ اختبارات DB فعلية وتزامن |
| 03/P0-02 | `assertCanActivate` قبل استدعاء provider move-to-clean، وإعادة التحقق داخل Aggregate | تعويض أو reconciliation إذا نجح move وفشل حفظ DB |
| 03/P0-04 | الهوية المستقرة للـasset تدخل idempotency-key للرفع/locator في مسار Ingest؛ اتصالات gateway غير المعرّفة تحصل UUID مستقلًا | distributed retry عبر replicas/provider ومعالجة persistence المتنافس |
| 03/P0-05 | حذف exe من السماح الافتراضي، وربط declared MIME بالامتداد والاسم | Magic-byte/content signature verification في provider/source |
| 03/P0-07 | رفض archive وsoft delete وpurge عند وجود استخدامات مع fail-closed لأخطاء Registry | Central usage registry، اختبارات التزامن وسياسة archive/delivery |
| 03/P1-04 | ضم شرط البحث وشرط cursor بــAND بدلاً من OR متنافسة | PostgreSQL pagination queries/performance |
| 03/P1-05 | رفض cursor غير canonical أو غير صالح قبل Prisma | HTTP ProblemDetails mapping/400 داخل API |

## الحواجز المتبقية

- **P0-03** لم يتحقق بعد إثبات upload completion ولا content hash/byte size قبل validation؛ لا تدّعي إصلاحه.
- **P0-05** فحص MIME الفعلي وليس metadata المعلنة يحتاج provider-owned signature.
- **P0-06** Least Privilege بين AssetPicker وIAM يحتاج عقد استخدام/عرض مستقل؛ لا تمنح `admin:assets:manage` للمحررين كحل.
- **P1-11/12/13/14** Usage Registry وCAS وStorage/DB side-effect reconciliation وdomain event/outbox ما زالت مفتوحة.
- القسمان 01 و02 باقيان NOT CLOSED؛ لا تفترض اكتمال اعتماد SoD أو مدد الاحتفاظ. لم تغيّر هذه الدفعة سياسة retention.
- `ci:source:contracts` كان يفشل سابقًا في ثلاثة ملفات لعلاقات معتمدة على الأسماء، ولا تعتبر الدفعة معالجة لهذا الفشل.

## فحوص يجب تنفيذها قبل الإغلاق

```bash
node_modules/.bin/tsc -b
node_modules/.bin/vitest run packages/domain/tests/asset-platform packages/application/tests/asset-platform packages/infrastructure/tests/asset-platform
npm run quality:source
npm run ci:source:contracts
```

بعد تجهيز Worktree مطابق لــ HEAD، يجب تشغيلها داخل بيئة معزولة وتسجيل المخرجات الحقيقية، ثم التحقق من Provider وPostgreSQL وBrowser وفق §03.11–03.16 قبل أي CLOSED.

## الدفعة التالية — Upload verification gate قبل Malware Scan

- تمت إضافة `verifyUploadedObject` في عقد `IAssetStorageGateway` بنتيجة authoritative: actual size، verified MIME، SHA-256 ووقت التحقق و`signatureVerified`.
- `validateAsset()` يفشل مغلقًا عندما لا يملك storage gateway عملية تحقق، أو لا تثبت نتيجة المحتوى. لا يتم استدعاء Malware Scanner قبل هذا الفحص.
- `AssetRecord.confirmUploadedObject()` يربط evidence بالـlocator والحجم والنوع المعلن وchecksum؛ و`startValidation()` و`assertCanActivate()` يتحققان من evidence.
- الأدلة تُحفظ وتُعاد قراءتها داخل JSON `malwareScanStatus` الموجود مسبقًا، بلا تعديل schema ولا تشغيل migration.
- HTTP provider: contract جديد `POST /v1/assets/verify-upload` يتطلب تنفيذًا فعليًا لدى المزود، ويفشل مغلقًا حتى توفره. لا يمكن اعتبار التحقق cryptographic proof بدون attestation/version من provider.
- Local development: content signature محدود لــPDF/PNG/JPEG وUTF-8 text/JSON/CSV مع الحجم وchecksum؛ ويحتاج tests بملفات تجريبية فعلية.
- **الحالة: PARTIAL** لـ03/P0-01/03/05. مصدر الملف لم يعد يُرقّى قبل نتيجة التحقق، لكن `requestUploadLocator` ما يزال يسجل `QUARANTINED` قبل finalization؛ لا توجد بعد route منفصلة ولا CAS/object-version fencing تمنع الكتابة المتأخرة إلى object. هذه عقود مفتوحة ومانعة لـCLOSED.
- إضافات Unit tests للمسار السلبي. **لم يتم تشغيلها أو TypeScript أو CI** لعدم توفر checkout مع الاعتماديات؛ يلزم إثبات الفحوص قبل الدمج والإطلاق.

## متابعة التحقق المصدرّي بعد الدفعة

- أُصلح اختبار سلبي كان يتوقع أن يبدأ VALIDATING دون upload evidence؛ أصبح يختبر fail-closed قبل evidence ثم غياب scanner evidence بعد نجاح التحقق.
- أضيف اختبار LocalStorage بملف PDF تجريبي داخل دليل مؤقت مع تنظيفه، لا يمس المستخدم أو الإنتاج.
- أضيف اختبار Prisma Mock roundtrip يتأكد من حفظ upload+malware evidence وإعادة قراءتها من JSON. **هذا Mock، لا يثبت معاملة PostgreSQL أو سلامة provider.**
- الحالة ما زالت **NOT CLOSED** وCI غير مشغّل في بيئة العمل الحالية.

## PATCH G — Safe API errors and date-range validation (source only)

- أضيف Zod cross-field guard يمنع `createdTo < createdFrom`.
- استُبدل الرد العام `400 + err.message` باستجابات `application/problem+json`: أخطاء إدخال 400، غياب صلاحية خدمة 503، مزود التخزين 502، حالة تعارض 409، الأخطاء المجهولة 500، دون تسريب تفاصيل SQL أو أسرار.
- أُضيف اختبار مصدر بواسطة `supertest` لحالات التاريخ، cursor، 503، وإخفاء استثناء داخلي.
- **التحقق التشغيلي ما يزال غير منفذ**؛ اختبارات المصدر وCI مطلوبة، ويظل 03/P1-05 و03/P1-06 جزئيين لغياب التحقق من كامل المسارات.

## Patch D — Least-privilege Asset Reuse (source implementation; NOT CLOSED)

- **New permission:** `admin:assets:reuse` in central permission catalog (standard/delegable). No implicit assignment to Course/StudyDestination roles; IAM owner must approve and provision it. `admin:assets:manage` retains the full lifecycle surface.
- **New server router:** `/admin/asset-reuse` under existing /admin auth, idempotency and mutation audit, and explicit reuse permission guard. Only GET list, GET individual safe reference, POST selection-audit and POST short-lived delivery-grant; NO delete/purge/lifecycle/upload.
- **Read model:** repository uses a fixed `reuseOnly` predicate for ACTIVE, CLEAN, PUBLIC/INTERNAL, and existing `malwareScanStatus` PASSED + uploadVerification.signatureVerified. Query filters are server-owned and cannot be overwritten by client parameters. Page projection excludes locators/owner ID/sensitive metadata.
- **Specific item check:** `isAssetReusable` performs cross-check of active/clean/classification, scan/upload locator linkage and stored checksum before selection/preview.
- **Picker UI:** server-side debounced search, cursor pagination/load more, pinned selection fetch, and audit-before-onChange instead of optimistic selection. Preview operates only via independent reuse boundary.
- **Remaining risks:** IAM role grants awaiting explicit approval, no runtime role/supertest/browser evidence. Domain writes still must enforce AssetReferencePolicy. No binary object immutability/version fencing. No production migration executed. This is partial P0-06/P1-06/P1-07 evidence.
