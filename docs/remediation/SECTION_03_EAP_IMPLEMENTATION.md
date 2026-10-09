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

## Patch D — Regression/security contract tests (pending execution)

- `apps/api/tests/presentation/api/router/AssetReuseRouter.spec.ts`: verifies IAM permission denial, server-enforced `reuseOnly` scope, sanitized projection, no destructive routes, rejection of confidential assets, required audit fail-closed and short-lived grant.
- `packages/infrastructure/tests/asset-platform/PrismaAssetReuseQuery.spec.ts`: ensures Prisma predicates actually include state=ACTIVE, classification in PUBLIC/INTERNAL, CLEAN locator, scan success and verified upload.
- Runtime tests still not executed; source-only assertions do not establish IAM migration or production safety.

## Patch E — Asset usage impact inventory

- أضيف `GET /admin/assets/:assetId/usages` ضمن مسار `admin:assets:manage` القائم ويستخدم `IAssetUsageRegistryGateway.findUsages` الحقيقي، 404 لملف غير موجود و503 عند غياب registry، ولا يفترض أن الغياب يعني صفر ارتباطات.
- أضيف لصفحة `AssetAdminPage` زر عرض الارتباطات وملخص تأثير للإجراء قبل أي حذف أو أرشفة؛ لا توجد في هذه الدفعة أزرار حذف جديدة أو عمليات تدميرية.
- هذا **قراءة فقط**؛ التحقق الفعلي عند mutation يبقى داخل `ProcessAssetLifecycleUseCase.assertNotInUse`. لا يدّعي هذا حل السباقات concurrent أو إثبات coverage كل relation بالبيانات الفعلية.

## واجهة اختيار الأصول — منع خلط نتائج البحث

- `AssetPicker` يستعمل `queryGeneration` لحجب نتائج صفحات جرى طلبها قبل تغيير الفلتر أو البحث؛ يمنع أن تؤدي استجابات الشبكة الخارجة عن الترتيب لخلط assets من استعلامين.
- بقاء `AssetReferencePolicy` لدى الدومين هو السلطة النهائية عند الحفظ؛ client-side selection audit مجرد طبقة تحكم قبل تعديل اختيار النموذج، وليس دليلًا كافيًا لنقل المرجع إلى domain storage.

## Source verification pipeline scoped to Section 03

- أضيفت `.github/workflows/eap-section-03-source.yml` على فرع الإصلاحات فقط حتى يمكن فحص TypeScript وVitest دون الدمج في main.
- `permissions: contents: read` فقط؛ لا أسرار أو نشر أو Database URL أو migrations. `npm run db:generate` يولد Prisma Client محليًا داخل runner ولا يطبّق schema على أي قاعدة بيانات.
- وظيفتان مستقلتان: `typecheck` على مراجع المشروع؛ و`eap-tests` على domain/application/infrastructure/API اختبارات القسم.
- **لا تعتبر الإضافة دليل نجاح حتى تظهر نتائج فعلية مكتملة من GitHub Actions.** CI السابقة كانت مقيّدة بــ main/develop، ولهذا لم تظهر تشغيلات تلقائية على فرع العمل.

## CI run 37859104913 — discovered blockers and remediation

- فشلت وظيفة EAP tests أولًا لأن workspace packages تحتاج build قبل Vitest لحل entry `@manaratak/domain`؛ أضيف الآن بناء TypeScript لمشاريع core/domain/shared/application/infrastructure داخل test job.
- نجح `npm ci` و`db:generate` في runner.
- اختباران في `AssetValidator.spec.ts` كشفا أن التحقق من MIME نفذ قبل فحص path traversal/null byte؛ عُدّل validator ليمنع المسارات والـNUL أولًا، مع بقاء منع executable وMIME mismatch.
- هذه **نتائج سلبية حقيقية** وليست CI PASS. أُضيفت التعديلات لإعادة التشغيل على commit أحدث.

## CI run 37859221618 — 52 passing tests + missing workspace dependency

- TypeScript source pipeline: **PASS**، وتم توليد Prisma Client بنجاح.
- EAP targeted Vitest: 11/12 test files loaded, 52/52 executed tests passed; test file `AssetReuseRouter.spec.ts` failed to import before executing because `@manaratak/config` (transitive import of `SecurityMiddlewareFactory`) was not built by targeted tsc -b list.
- الإصلاح لخطوة EAP tests: استبدال بناء مجموعة Workspaces محدودة بـ`npm run typecheck` على كامل TypeScript project references قبل Vitest، لا تعديل API logic ولا schema.
- **عدم الإعلان عن نجاح EAP tests قبل إنجاز rerun**.

## Patch H — Sanitizer output provenance and double-check (source gate)

- EAP sanitizer output now **invalidates prior upload verification, scanner result and checksum**, including in-place sanitization.
- Resulting QUARANTINE object is re-verified by storage provider (actual MIME/size/SHA-256), rescanned for malware, and re-verified after the scanner. A detected threat blocks activation and persists `MALWARE_SCAN_FAILED`.
- `activateAsset` checks current quarantine digest against the recorded post-sanitization digest **before** external move-to-clean. Stale evidence or changed bytes fail closed.
- Post-sanitize actual object byte size updates `AssetMetadata.byteSize` to avoid trusting original upload byte size as the clean output size.
- Added domain and application regression tests for new locator, modified bytes, post-sanitizer infection and tampered content.
- **Important limitations:** verification before move is not an atomic provider compare-and-swap; without object version/ETag fencing and storage provider implementation, there remains a TOCTOU window. Real storage, concurrency and durability tests remain mandatory. No database schema changes or production operations.

## Patch H — Digest-fenced CLEAN promotion

- يمرر `activateAsset` الـSHA-256 المثبت للملف بعد التعقيم إلى `moveToCleanZone`، ولا يكتفي بالموافقة على الحالة فقط.
- محوّل HTTP يطلب `expectedSha256` ويرفض ردود المزود التي تفتقر إلى `verifiedSourceSha256` المطابق؛ المحوّلات القديمة تتوقف بأمان، ولا يسمح بالتراجع الصامت إلى النقل غير المشروط.
- اختبار مزود HTTP يثبت رفض الدليل المفقود، واختبار التخزين المحلي يتحقق من الرفض قبل نقل البايتات المتغيرة.
- **تحذير:** لا يثبت ترديد الـhash أن المزود طبّق مقارنة ذرية؛ يجب اعتماد العقد واختباره ضد المزود الفعلي مع object version/ETag وCAS. فحص التخزين المحلي قبل rename غير ذري ويخص التطوير فقط.

## Follow-up — CLI and CI validation evidence

- CI run `37859835231`: `tsc -b` PASSED; 62/63 EAP tests passed and one Prisma mock test was stale after new mandatory post-sanitizer evidence. Fixed mock to add `confirmSanitizedObject` and `passSanitizedMalwareScan` before saving.
- Added fail-closed delivery/restore for legacy ACTIVE/CLEAN records without signed malware/upload evidence, and a use-case test confirming no delivery provider call.
- Extended isolated CI typecheck job with `quality:source` (source-only checks; no DB mutation, deployment or production data).
- **Still pending:** atomic provider checksum enforcement and failure reconciliation, resource usage locking/transactional constraints, full integration/browser/DB tests and role provisioning. Section 03 remains NOT CLOSED.

## Patch I — Fail-closed retention/legal-hold purge preflight (source, not atomic)

- Added `IAssetRecordRepository.assertPurgeAllowed(id, at)` optional capability; the purge use case refuses irreversible deletion if the capability is unavailable.
- `PrismaAssetRecordRepository` checks DB-owned `lifecycleState=DELETED`, explicitly expired `retentionExpiresAt`, absence of a live `legalHoldUntil`, and absence of an active `retentionClaimUntil`. Null retention expiry is indefinite; never interpreted as safe to purge.
- Verification happens **before** external `storageGateway.delete`; in-memory tests cover indefinite retention and missing guard. Existing purge happy-path fixture now has explicit elapsed expiry.
- **Unresolved:** this check is *not atomic* with external deletion, nor with concurrent legal hold/usage insertion. Requires DB serialization/CAS claims, provider reconciliation and real PostgreSQL integration before P0 acceptance. No schema migration or production data updates.

## Patch J — Retention input validation before persistence

- Upload/ingest now rejects lifecycle-derived categories `ARCHIVED` and `SOFT_DELETED` supplied by clients; only `PERMANENT` and `TEMPORARY` are valid on creation.
- `TEMPORARY` requires explicit expiry. All specified expirations must be timezone-qualified ISO timestamps or valid Dates, and must be in the future. Invalid, ambiguous or elapsed input fails before generating a provider locator or saving a record.
- Regression tests cover forbidden input categories, missing/invalid/past temporary expiry. Existing purge happy-path test advances its isolated fake clock beyond an initially future, valid expiry.
- These rules cover request validation only. Actual retention workers, hold-vs-usage races and DB/provider reconciliation remain runtime pending.

## Patch I — Retention worker compatibility + claim ownership

- Review found that `PrismaAssetRetentionGateway.applyDecision` first acquires `retentionClaimToken/retentionClaimUntil` before invoking `purgeAsset`. An unconditional "active claim" guard would block the **legitimate worker itself**. Fixed the integration rather than weakening retention safety.
- `PurgeAssetDto` now accepts an internal-only `retentionClaimToken`. Retention worker forwards the exact DB-created UUID; API routes still build the DTO only from the asset path and accept no user-supplied token.
- Prisma purge preflight demands an active, unexpired lease with an **exact matching token** when the worker supplies one; callers with no token remain blocked by any active lease. Stale/wrong tokens fail closed.
- Worker now rechecks due expiration and no legal hold in the DB `updateMany` claim predicate for purge; a concurrently applied hold prevents the claim.
- Added mock regression tests for lease ownership, mismatching/expired tokens and worker claim acquisition.
- Still open: the lease expiration may occur while a provider delete is in progress, DB↔storage transactions remain non-atomic, and real PostgreSQL and provider integration are pending. This is not CLOSED.

## Patch E — Machine-verifiable asset consumer inventory

- Schema inspection found 29 persistent asset reference fields: 28 direct `String` references and one CMS `attachmentAssetIds` JSON array, all represented in the derived usage registry.
- A source-level Vitest guard parses the Prisma schema and central `PrismaAssetUsageRegistryGateway`; new/missing/stale direct reference mappings fail CI. Explicit checks cover CMS JSON attachments and SEO `openGraphAssetId` paths.
- This is schema-source evidence only; runtime database completeness, nonstandard JSON metadata and concurrent writes remain unverified.
- Previous completed CI run: `37861733848`: TypeScript/quality passed, 82/82 target tests passed.

## Patch C — Revision-gated Prisma asset record writes (source-level CAS)

- Replaced `assetRecord.upsert()` for application EAP saves: fresh aggregates use `create()` (concurrent duplicate IDs cannot overwrite existing assets); aggregates loaded from Prisma carry a repository-local `WeakMap` snapshot of `updatedAt` + original `lifecycleState`.
- Updates now use conditional `updateMany({ where: { id, updatedAt: captured, lifecycleState: captured } })`; count != 1 fails as `ASSET_RECORD_CONCURRENT_MODIFICATION` and must be retried only after rehydration.
- Existing `AssetRecord.updatedAt` column is reused; **no Prisma migration/schema change**. A second update to the same in-memory snapshot intentionally fails; fresh reads are required.
- This provides source-level optimistic compare-and-swap **at DB save time**. It does **not** protect provider side effects performed *before* CAS, and timestamp granularity/DB isolation must be tested under real concurrency. Provider reconciliation, durable transition journal/outbox, and real PostgreSQL tests remain open.

## Patch B — Explicit upload finalization before malware scanner

- Added explicit application/API `POST /admin/assets/:assetId/finalize-upload` step. It obtains provider-observed size, MIME, digest and evidence for a quarantined upload, then persists this through revision-gated repository save.
- `validateAsset` rejects uploads without **persisted** finalization evidence (`ASSET_UPLOAD_FINALIZATION_REQUIRED`) and re-verifies observed bytes/checksum before invoking scanner. It rejects files modified after finalization (`ASSET_UPLOAD_CHANGED_AFTER_FINALIZATION`).
- Added audit records for successful/failed finalizations and negative regression tests (no scan pre-finalization, tampered digest, provider unavailable).
- **Remaining P0 limitations:** direct-upload grant has no provider-native immutable object version/ETag acknowledgment; finalization and scan are not one atomic provider operation, and existing integrators must call finalize before validate. Finalization is distinct from the initial `QUARANTINED` metadata state; quarantine is not proof of completed upload.
- This entry reflects source changes only pending CI. No DB migration or production actions performed.

## API finalization contract tests

- Added `AssetFinalizationContract.spec.ts` for the canonical `POST /admin/assets/:assetId/finalize-upload` action: server-owned verification (empty request body), safe 400 on client-supplied proof, 409 on missing/stale finalization, and sanitized provider failures.
- EAP router Problem Details now classifies `ASSET_UPLOAD_FINALIZATION_REQUIRED`, `ASSET_UPLOAD_CHANGED_AFTER_FINALIZATION` and optimistic-save conflicts as 409 rather than 500.
- **No external proof is accepted from the browser**; the backend still requires provider observation before saving upload evidence.

## Patch F — Asset Center read-only detail panel

- Added an on-demand detail panel to the existing `AssetAdminPage` using the management-guarded `GET /admin/assets/:assetId` route.
- Displays identity, owner, lifecycle state, security classification, retention/expiry, MIME/size and SHA-256; action to check usage dependencies. The panel does **not** expose storage locators, raw upload URLs, private attachments or destructive controls.
- Remaining operational UI scope: real upload wizard, secure managed preview, tested recovery/timeline, and browser integration. Source TypeScript/quality will be checked on the next CI run.

## Patch J — Durable PURGED tombstone and retryable external deletion

- **Changed irreversible order**: EAP now conditionally persists `PURGED` via the existing revision/state CAS **before** calling provider `delete`. If CAS fails, the bytes are not deleted.
- `PURGED` is a durable *access-disabled cleanup intent* even if the external deletion fails. The existing retention worker now discovers expired `PURGED` records with `retentionProcessedAt=NULL` and retries provider cleanup under a fresh retention claim token, then marks processed only after successful deletion.
- A repeat purge of a `PURGED` asset is forbidden without a live, matching retention worker lease; the normal admin endpoint does not forward claim tokens.
- Added mock regression tests for CAS failure vs provider delete, provider outage/lease retry, persisted PURGED guard and worker sweep visibility.
- **Limitations:** deletion is intentionally asynchronous with respect to DB persistence after an error; a PURGED record may temporarily retain object bytes. Provider delete must be idempotent. Worker scheduling/availability and real PostgreSQL crash-recovery and concurrent legal hold tests still require integration validation; archive/restore/move-to-clean cross-system reconciliation remains open. No database migration or production data changes.

## Patch J — Disposable PostgreSQL integration CI (not production)

- Dedicated `eap-postgres` CI job runs `postgres:16` inside GitHub Actions on constant localhost-only `manaratak_eap_ci_test`; no secrets and no production connections.
- Job builds project references, runs `prisma db push` **only** against the fresh ephemeral test DB, then executes `PrismaAssetPostgres.database.spec.ts` behind the repository's existing `destructiveDatabaseTestsEnabled` guard and an extra EAP-specific flag/URL check.
- Three real-db regressions: two concurrent lifecycle writes with shared revision, retention/legal-hold/worker-lease enforcement, and PURGED-persisted-before-provider-delete with lease-protected retry.
- Database integration results are **PENDING CI** until this workflow runs; no database mutation was attempted against user-owned infrastructure.

## Patch K — Archive state-first and idempotent local storage recovery

- `archiveAsset` now commits `ARCHIVED` via optimistic CAS **before** the remote archive action. Storage failure leaves the persisted record in a non-deliverable state; a subsequent archive request retries provider archive without another domain transition.
- CAS failure blocks the external provider archive call, avoiding ACTIVE DB state with inaccessible storage.
- Development-only local adapter archive and restore operations are idempotent when the destination already contains the only copy, permit restoration of a soft-deleted asset that was never archived, and reject ambiguous source-plus-archive duplicates rather than overwriting data.
- Added negative app + real filesystem regression tests for CAS-failed archive, provider-failed archive with manual retry, no-archive restore, duplicate-copy ambiguity.
- **Remaining:** an automatic archive reconciliation worker and real provider idempotency/SLA; DB-and-provider split brain across activate/restore is still open. Source CI pending.

## Patch K — Archive recovery verification and provider contract alignment

- Added disposable PostgreSQL regression for `ARCHIVED` being committed **before** failing external archive, followed by idempotent recovery through a second archive request.
- Repaired pre-existing W3 static provider checks to match the checksum-fenced `moveToCleanZone(record.locator, record.checksum!.hash)` call. CI runs W3 legacy transport/security tests alongside EAP target tests to prevent silent drift.
- Updated `docs/operations/ASSET_PROVIDER_RUNTIME.md` with actual provider `verify-upload` endpoint, server-owned finalization, SHA-256 constrained promotion, provider idempotency, and unverified external CAS/ETag obligations.
- Automatic archive reconciliation and real external provider test remain required; pending CI verification on this commit.

## Patch C — Monotonic timestamp fencing for same-state concurrent writes

- Found an important CAS gap: two writes in the same millisecond that both keep `lifecycleState` unchanged could reuse the same `@updatedAt` value, allowing overwrites despite the `updatedAt + state` predicate.
- `PrismaAssetRecordRepository.save` now explicitly sets `updatedAt` to the later of current clock time and **captured revision + 1ms**. Each successful conditional update therefore advances the DB revision even when lifecycle state does not change.
- Extended unit assertions for strictly increasing revision and real disposable PostgreSQL regression with two concurrent writes of identical lifecycle state, requiring exactly one success.
- No schema migration or production data updates. Time-based versioning still requires benchmarking under real DB clocks/precision and heavier concurrent loads; a dedicated integer revision would be preferable during an approved migration.
- CI outcome for this commit pending.

## Patch B — Honest pending-upload lifecycle state

- Allocating a QUARANTINE locator/grant now stores `lifecycleState=INITIATED`, not `QUARANTINED`. The latter is reserved for provider-verified, persisted uploaded bytes after explicit `finalize-upload`.
- Moved `AssetQuarantinedEvent` to the first successful finalization, so listeners are not notified that an object has arrived merely when a locator was allocated.
- `startValidation` now requires `QUARANTINED`; unverified `INITIATED` objects cannot scan or activate, and reassigning an already verified locator is forbidden.
- Legacy pre-change unverified `QUARANTINED` rows may still finalize after provider verification, allowing non-disruptive migration without changing Prisma schema.
- Updated domain/application regressions for INITIATED-before-finalize and emitted event-after-proof; no production DB migration or data updates. CI pending.

## Patch B — Legacy upload completion and real-DB finalization proof

- Emitting `AssetQuarantinedEvent` now depends on absence of prior upload verification, including legacy unfinalized QUARANTINED records, not only whether the pre-confirmation state is INITIATED.
- Added real disposable PostgreSQL integration verifying a newly allocated INITIATED record has no checksum, then finalization persists QUARANTINED and associated proof/digest and rehydrates correctly.
- Existing historical rows can finalize without a breaking schema migration, and event subscribers receive one verified-quarantine transition.

## Patch K — Restore verification and best-effort compensation

- Restore now fails closed if storage cannot verify actual restored CLEAN bytes, rejecting the previous implicit assumption that historic malware/upload evidence proves present-day bytes.
- Added `verifyRestoredObject` to storage gateway: HTTP provider `POST /v1/assets/verify-clean` requires independently reported SHA-256, byte length, MIME and timestamp; local development adapter recomputes the actual hash from bytes.
- DB stays DELETED while provider restore + verification runs. If checksum verification or revision-gated persistence fails, the application attempts to archive the object back; any failed compensation reports explicit `ASSET_RESTORE_COMPENSATION_FAILED`.
- Added source regression tests for successful restoration, tampering, CAS failure, compensation failure, missing verification capability, real local bytes and invalid HTTP provider proof.
- **Not yet fully safe under concurrent purge**: provider archive compensation and deletion can race, and no durable recovery journal exists for failed compensation. Provider verify-clean and archive must be implemented, backed by object-version fencing and tested in a real sandbox. Source and disposable PostgreSQL CI pending.

## Patch K — Real PostgreSQL restore safety regressions

- Added two disposable PostgreSQL tests: ACTIVE state is not persisted until independent CLEAN verification finishes, and an intervening DB revision change triggers compensation while keeping the row DELETED.
- Updated application in-memory test repository to return independent rehydrated aggregates, matching Prisma semantics; direct object aliases had falsely shown a successful state transition after simulated save failure.
- Clean provider verification remains external and best-effort archive compensation requires operational alert/reconciliation on failure. CI status pending.
