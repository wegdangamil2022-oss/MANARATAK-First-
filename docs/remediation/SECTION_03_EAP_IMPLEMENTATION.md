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
