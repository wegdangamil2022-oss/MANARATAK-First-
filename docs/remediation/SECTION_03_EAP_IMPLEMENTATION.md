# القسم 03 — الأصول والملفات: سجل التنفيذ وإعادة التحقق

## Continuation — durable restore safety barrier (2026-10-09)

Original 03/P1-12/P1-13/P1-01/P1-02. Restore now persists a typed PREPARED operation and exact lease before effects, persists RESTORING before contacting storage, verifies bytes, renews the exact owned lease and commits ACTIVE/COMPLETED together. The existing operational JSON is used; no canonical relation, new table or backfill is introduced. Pending operations block Domain delivery/lifecycle and are rehydrated/validated strictly.

A new DB trigger keeps PREPARED/RESTORING/RECOVERY_REQUIRED intents blocking claim replacement, physical deletion and competing lifecycle transitions even after time-based lease expiry or process restart. Only the original pre-provider intent can cancel; a started operation cannot cancel or clear itself after uncertainty. Exact owned renewal may extend an expired lease because the durable barrier has prevented takeover. Destructive owner-reference protection remains enabled alongside this trigger.

Automatic compensation archive/release after provider effects is removed. A timeout, failed verification or failed commit becomes RECOVERY_REQUIRED (or remains durable RESTORING if DB revision/unavailability prevents the marker). No second provider attempt is inferred. DELETED stays inaccessible; a pending operation survives failures without archiving a competitor. Successful commit ends the operation; verified pre-provider cancellation permits a fresh restore.

Retention excludes pending restore operations at database query level, while the DB trigger independently rejects claim takeover. Admin has a validated RESTORE_RECOVERY queue, safe phase/time projection, recovery notice and suppressed lifecycle controls. No provider coordinates or journal proof envelope reach the UI. No operator-clear/retry endpoint is invented: ambiguous operations require provider reconciliation/fencing before a separate repair.

Local TypeScript PASS; initial focused suite 71 PASS (19.03s); complete local suite found one stale select assertion (281 PASS/1 FAIL/34 DB skipped), corrected to require journal retrieval and expanded with expired-pending cases; focused correction suite 70 PASS (8.29s). Source quality PASS, selected lint 0 errors/43 warnings, 15 owner guards PASS. Matching CI pending; local/CI scopes overlap and are not summed.

Operational limits: target migrations are not applied; real provider verification is deferred by the user. Recovery holds favor safety over automatic availability. Full provider reconciliation/immutable fencing and coordination with already in-flight legacy archive/provider requests remain unverified/incomplete; drain and provider quiescence are rollout requirements. This source safety batch does not close every P1-13/workspace/global gate or assert whole-section CLOSED/GO.


## Verified resolution — link versus delete race (2026-10-09)

**Race defect: FIXED AND VERIFIED in source and disposable PostgreSQL.** Source `0345ddc3ffc5ae0737c40dda77db61779c20a363`: [CI 37936012373](https://github.com/wegdangamil2022-oss/MANARATAK-First-/actions/runs/37936012373) SUCCESS: 276 source tests plus 30 disposable PostgreSQL tests. Fourteen new PostgreSQL cases passed in 445ms; both real lock orderings, all destructive actions, JSON references, unlinking, identity protection, precheck-to-save provider prevention and snapshot isolation rejection passed. The existing 16 DB cases also passed with the new triggers installed. Counts overlap local tests and are not added.

| Current gate | Result |
| --- | --- |
| 03/P0-07 consumer/lifecycle concurrency | Implementation and real-DB regression verified; all registered references are protected when migration is installed. Earlier statements that serialization source is absent are superseded. Existing application usage check/UI confirmation retained. |
| 03/P1-11 registry | Canonical owner data remains the source of truth, with schema/inventory/trigger coverage checks; no central registry or new data table. Broader architecture/performance reconciliation remains partial. |
| Target environment installation | PENDING: migration not applied to real DB. API fails startup if connected DB lacks complete guards. Deployment must drain old processes and apply reviewed schema before restarting. |
| Real provider verification | DEFERRED_BY_USER, not passed; user plans a later environment. |
| Other section acceptance | Restore compensation journal/provider fencing/heartbeat, remaining workspace functions and global readiness checks remain open. Provider verification deferral alone does not close those source obligations. |

Whole-section status remains NOT CLOSED / NO-GO. This evidence closes the identified concurrency defect in the implementation; it does not falsely close every section task or claim protection is deployed. Evidence-only follow-up changes no tested code. No real database/provider write, main merge or production configuration change. Original attachment remains unchanged.


## Continuation — canonical link versus lifecycle serialization (2026-10-09)

Original scope 03/P0-07, P1-11 and P1-12. Added a schema-only migration for existing tables: owner INSERT/reference-column UPDATE locks newly added canonical AssetRecord IDs FOR SHARE until the owner transaction commits; absent/non-ACTIVE IDs reject the owner write. All 28 direct fields, CMS published attachment array and three SEO references are covered. No central registry/table, backfill or data-ownership transfer.

AssetRecord UPDATE/DELETE obtains a conflicting tuple lock and checks the same canonical references before a non-ACTIVE transition, identity change or physical delete. Its dependency reads require READ COMMITTED; destructive RepeatableRead/Serializable transactions reject rather than trusting stale snapshots. Existing owner Serializable transactions retain their normal locking/snapshot-error semantics. Removing references and unrelated owner edits remain possible. The existing fail-closed usage scanner and UI impact confirmation are retained as early diagnostics; they are no longer the only concurrency barrier.

Added read-only startup/readiness verification of every enabled trigger, function binding, event/column set, arguments and origin replication mode. Connected API startup fails when guards are absent; source-only disconnected API tests remain possible. No installer is called from application startup.

Migration application is prepared only for the already authorized disposable GitHub Actions database, guarded by exact URL/role/database, CI identity and mutation flags. No real database migration, seed/reset, production setting or provider write has occurred. Operational rollout must drain old API/workers, apply this migration separately and pass startup/readiness before reopening writes. User explicitly defers real provider verification to a later environment; this is a deferred gate, not a passing provider test.

Local incremental TypeScript PASS; 36 focused source tests PASS (9.07s), clean bootstrap rerun 4 PASS (8.76s); owner Node guards 15 PASS; lint 0 errors/74 existing warnings; source quality PASS. Fourteen new disposable PostgreSQL cases exercise both lock orderings for archive/delete/purge/physical deletion, precheck-to-save provider prevention, unlinking, CMS JSON, identity changes and isolation rejection. Matching CI pending; no race success claimed before observing those cases.

P1-11 remains derived-registry architecture/performance reconciliation; no central-registry implementation claimed. P1-13 restore compensation/provider fencing and other prior open acceptance remain unchanged. Whole section NOT CLOSED until remaining acceptance is met; real provider gate DEFERRED_BY_USER.


## Verified consistent reuse-trust CI

Source `b06d65e30a7027ea2a742fd8fc99b1e86a98f736`: [CI 37934030180](https://github.com/wegdangamil2022-oss/MANARATAK-First-/actions/runs/37934030180) SUCCESS: 261 source tests plus 16 disposable PostgreSQL tests. The new real-DB case proves rejection of a tampered ACTIVE row and cursor continuation to a trusted row, without changing that rejected row. TypeScript, quality, owner guards, audit and provider-transport checks passed. Evidence-only follow-up changes no source. No overlapping counts added. Whole section NOT CLOSED / NO-GO; cross-owner serialization, provider/lease fencing, restore recovery, remaining workspace functions and real provider acceptance remain open.


## Continuation — consistent reusable asset trust (2026-10-09)

Original scope 03/P0-01, P0-06, P1-03 and P1-06. Confirmed follow-on defect: picker detail/selection used a hand-written weaker proof check, and SQL list filters checked only PASSED/signature/CLEAN presence. Both now use the existing Domain delivery-trust gate: repository validates each bounded scanned row; router validates the real aggregate. No N+1 queries or new owner authority. Malformed/untrusted rows are omitted from reuse, not repaired or published.

Keyset cursor advances by the scanned page boundary, including rejected rows, so an empty safe page still permits fetching later valid assets. API regressions exercise real aggregates and deny detail/selection/preview before delivery/audit effects. Repository regressions cover mismatched proof and cursor continuation. Added one guarded disposable PostgreSQL test proving empty-page continuation after metadata tampering; no local or production DB write.

Local TypeScript PASS; 33 targeted tests PASS (8.31s); 15 owner/control-plane guards PASS; source quality PASS; selected lint 0 errors/31 warnings. Matching CI pending. This closes the weaker reuse-trust source path only; original tasks and whole section retain their existing partial status. Consumer insertion versus lifecycle changes, lease/provider fencing, durable restore compensation and real provider workflow acceptance remain OPEN. NOT CLOSED / NO-GO.


## Verified owner-reference trust CI

Source `c6fecfe6f658df6f1255151d80657384257d9be1`: [CI 37933260168](https://github.com/wegdangamil2022-oss/MANARATAK-First-/actions/runs/37933260168) SUCCESS. 252 source tests and 15 disposable PostgreSQL tests passed, including owner-reference guards, TypeScript, quality and audit/provider checks. Local and CI counts overlap and are not added. Evidence-only follow-up changes no tested source. Original review attachment SHA256 remains `9de7c781eb82cd490fc85386267d7e9e3fe2b2028803f9ecd0351531e2cd11fc`. NOT CLOSED / NO-GO for the section; remaining gates below are unchanged.


## Continuation — owner reference trust gate (2026-10-09)

Scope: original 03/P0-01 clean trust, P0-06 governed reuse and P0-07/P1-11 owner-reference integrity. Confirmed source gap: AssetReferencePolicy accepted persisted ACTIVE plus owner/classification/MIME without Domain upload/scan/sanitization proof. It now invokes AssetRecord.assertCanDeliver before returning a reference; explicit state allowlists cannot bypass trust.

The shared Domain gate additionally requires valid proof dates, positive safe-integer metadata size matching observed upload, matching MIME, SHA-256 algorithm and a 64-hex digest. No historical metadata or proof is backfilled; unsupported/untrusted records fail closed. Existing owner checks and Domain ownership remain unchanged.

Twelve real-aggregate application regressions cover valid evidence, missing/mismatched evidence, invalid dates/digest, lifecycle override, and the real Course update use case refusing a repository write. Fifteen isolated Node owner/control-plane guards pass; valid mocks expose the trust method only to isolate their other checks. Two stale source assertions now track the dedicated server-governed reuse route and whitespace-insensitive native-course POST, without weakening endpoint/state requirements. CI now includes these guards.

Incremental TypeScript PASS; focused 60 tests PASS (7.92s); selected source lint 0 errors; quality PASS (0 cycles/a11y). Complete scoped source suite: 252 PASS /15 disposable DB cases intentionally skipped locally (48.33s). Matching pushed CI pending. Evidence files: owner-trust-*. This check-before-write is not transactional serialization: consumer insertion versus archive/delete/purge, provider fencing/lease heartbeat, restore compensation recovery and real provider acceptance remain open. Section NOT CLOSED / NO-GO.


## Continuation — 03/P1-13 durable activation recovery worker (2026-10-09)

- Added bounded pending-intent discovery in the EAP repository and RecoverAssetActivationsUseCase, registered handler `assets.activation.recovery` in the existing durable background worker. Existing activation intent/digest/CAS owner path is reused; no new activation is inferred from QUARANTINED/DELETED/ACTIVE rows.
- Added optional disabled-by-default source configuration and recurring-job bootstrap. Explicit enablement requires the durable worker and a schedule. Execution itself checks enablement so older persisted schedules cannot perform recovery after disabling. No runtime config, seed or real DB/provider write performed.
- Added system Audit INTENT before provider work and outcome afterward with the existing factory/retention resolver. Audit unavailable fails before effects; completed state plus failed outcome audit stays a failed job, not a claimed atomic transaction. Queue diagnostics use safe constant error codes.
- Tests cover cancellation, invalid payload/limits, stale identity/state, audit failure before/after effects, safe diagnostics, real worker registry dispatch and disabled persisted jobs. Prisma query regression checks bounded discovery; one new disposable PG case checks age/state exclusion.
- Local incremental TypeScript PASS; 43 focused tests in three files PASS in 3.04s; five existing durable-worker/lease guards PASS; selected lint 0 errors/38 warnings; quality 0 cycles/a11y PASS. Matching pushed CI pending at source commit creation. Existing source/CI counts overlap and are not added.
- P1-13 remains PARTIALLY_IMPLEMENTED: automatic activation retry source is wired but not enabled or verified with a real provider; restore compensation journal, asset lease heartbeat/provider fencing and fleet/audit-receipt reconciliation remain incomplete. Section NOT CLOSED / NO-GO.


## Cumulative corrections to earlier task snapshot

The Arabic table further below is an earlier snapshot and is preserved for review history. Current deltas supersede these statements:

- P1-01 now includes legal-hold view, persisted version history, metadata/timestamps, latest processing proof timeline and copy/supported owner navigation. Full AR/EN, owner flows and real preview/provider E2E remain unverified.
- P1-02 now includes retention/checksum, malware result, file family and processing queues. In-use/unused global facet and owner presets remain open.
- P1-10 restore preserves original policy; it no longer unconditionally restores PERMANENT. Historical unknown/expired policy fails closed. No retention-duration policy inferred.
- P0-02/P1-13 now have durable manual activation intent/retry. Automatic reconciliation, monitoring and durable compensation recovery remain open.
- P1-12 now additionally checks restore lease ownership before compensation; provider fencing/expiry-during-call and heartbeat remain open.
- P1-14 has a documented local non-dispatched event contract; no outbox was added and no delivered integration event is claimed.
- Workspace CI `2632dde` PASS: 209 source +13 disposable DB tests. Subsequent restore delta: 49 focused tests PASS in 8.28s and TypeScript PASS; its final matching CI is pending. Expanded six-source-file lint: 0 errors/53 warnings.

No section/task CLOSED or production GO is inferred from these deltas.


## Additional same-operation safety fix — 03/P1-12 and P1-13

Restore now verifies the exact live DB-owned lease before provider restoration and before compensating a failed operation. Known lost ownership (expiry, replaced token, competing ACTIVE commit) or unavailable DB prevents archive/release by a stale attempt and reports safe ASSET_RESTORE_RECOVERY_REQUIRED. One application regression covers lost ownership after failed save; a disposable PostgreSQL case covers expired/ACTIVE ownership rejection. Provider atomic fencing, heartbeat and durable compensation recovery remain OPEN: this point-in-time check is a mitigation, not a closed concurrency guarantee.


## Broad workspace and version-preservation continuation — 2026-10-09

Scope: original 03/P1-01, P1-02, P1-03, P1-08, P1-10, P1-15 and §03.10 Patch I. Prior findings and IDs are retained below; no separate replacement plan.

| Original task / capability | Implemented in this batch | Remaining acceptance |
| --- | --- | --- |
| P1-01 / Patch I version history | Rehydrate stored `{versions:[...]}` into real AssetVersion objects and serialize explicitly on save. Fixes confirmed loss: prior mapToDomain unconditionally set versionChain undefined and save wrote null. Invalid/unsupported history fails closed before provider mutations. Read-only version numbers/dates/checksums exposed; storage coordinates stay private. | Real provider native versioning, creating new versions, and other legacy formats are not inferred or backfilled. |
| P1-01 governance/detail | One DB snapshot supplies aggregate and created/updated/archive/delete/purge/legal-hold dates. Observed future transitions stamp their existing date columns; historical dates are not fabricated. Admin displays metadata dimensions/duration, latest proof timestamps, operation identity and version history. | This is latest evidence, not a complete immutable security-event timeline. Legal-hold editing remains unimplemented. |
| P1-01 owner/copy | Clipboard copy with explicit failure handling; navigation only to existing COURSE/UNIVERSITY owner routes with encoded IDs. Other owner types display unavailable; destination authorization remains enforced by existing route guards. | All owner types are not guessed from free-text IDs. |
| P1-02 | Validated PASSED/FAILED scan selectors, IMAGE/VIDEO/AUDIO/PDF families, upload/quarantine/processing/failure/activation-recovery queues. Each predicate intersects existing lifecycle/search/cursor constraints; queue cannot override security state. | In-use/unused global filtering and canonical owner presets remain open; avoid N+1 usage queries or a misleading current-page filter. |
| P1-03 | Clear old items/cursor on reset; failed new query cannot reuse stale results under newly applied filters. Pending filter and loading/error states explicit; stale detail results cannot reopen a closed drawer. | Realistic production-scale paging still unverified. |
| P1-15 | List response now projects known metadata fields instead of returning arbitrary owner/operational JSON. Detail versions/proofs never expose locators or provider paths. | Existing provider/browser acceptance still required. |

Validation: incremental TypeScript Admin/API/infrastructure PASS; 209 EAP source tests PASS in 32.35s with 13 isolated-DB tests intentionally skipped locally; 13 security/audit/provider-transport guards PASS; quality PASS (0 cycles/a11y); selected source lint 0 errors/51 warnings. Chromium real Admin with intercepted API PASS including detail governance/history, all new facets retained through paging/reset, and failed reload cannot retain old rows/cursor. Test-only CSP bypass remains; not actual API/DB/provider E2E.

Added two disposable PostgreSQL regression cases: version history survives lifecycle persistence; JSON workspace facets compose with cursor/family. CI evidence will be recorded separately after the pushed commit completes. No production DB/provider operations, migration, seed, reset, policy backfill or retention sweep.

**NOT CLOSED**: completed source capabilities above do not resolve usage-vs-lifecycle serialization, lease-expiry/provider fencing, automatic reconciliation/monitoring, all owner flows, or real upload/scanner/sanitizer/provider acceptance. FGA-03-001/002 remain optional proposed enhancements, not quietly implemented or CLOSED.


## Fast verification and closure review — 2026-10-09

Source `ac3624c`: 193 scoped EAP tests PASS in 36.70s, TypeScript PASS, 13 security guards PASS. CI run 37921628504 SUCCESS with 193 source + 11 disposable PostgreSQL tests. Updated Chromium test confirms retention/checksum selectors survive applied pagination and reset clears both/cursor. HTTP remains intercepted; no real provider proof. See current closure register for unresolved task IDs. Verdict remains NOT CLOSED; no production GO or invented task closure.


## Continuation — 03/P1-02 retention and checksum facets (2026-10-09)

- Canonical retention selector and PRESENT/MISSING checksum selector now flow from Admin draft/applied filters through strict API validation to the existing EAP read model. Filters compose with MIME, search and cursor through AND; reuseOnly security restrictions remain intact.
- PRESENT requires non-null, non-empty algorithm and hash. MISSING includes partial evidence. Neither implies verified content or permission to deliver. No schema, retention policy, lifecycle mutation, seed or production data change.
- Targeted validation: TypeScript build for Admin/API/infrastructure PASS; 46 tests in three API/query/reuse files PASS (8.94s); selected source lint 0 errors / 49 warnings. API rejects unknown and repeated facet values before repository access. Repository tests assert predicate composition with search/cursor; database and browser execution for these new facets remain unverified.
- P1-02 remains PARTIALLY_IMPLEMENTED: processing/security, in-use, file-family and owner presets remain open; no task/section CLOSED or production GO.
- Evidence: `evidence/section-03/facets-{types,tests,lint}.log`. Original review file preserved unchanged.


## أحدث متابعة — التعافي وسياسة الاستعادة (2026-10-09)

تستكمل هذه الدفعة `12f05da` وتحافظ على جميع المعرفات والملاحظات السابقة. هذا الحكم الأحدث يحدّث الأجزاء المنفذة أدناه، ولا يحوّل الأقسام السابقة إلى CLOSED.

| المهمة | التنفيذ المتحقق منه في المصدر | الحد المتبقي |
| --- | --- | --- |
| P0-02 / P1-13 | PREPARED intent محفوظ بـCAS قبل provider promotion؛ COMPLETED وACTIVE معًا. إعادة المحاولة تستعمل نفس source+digest ونفس operation identity؛ خطأ حفظ بعد move يبقي intent ولا يسمح delivery. لا provider call إذا فشل حفظ النية. | automatic reconciliation/monitoring، تعويض restore الفاشل، وضمان provider durable replay/immutable version ما زالت مفتوحة. |
| P1-12 | stale mutations تفقد CAS بعد حفظ النية؛ Aggregate يمنع الحذف وتغيير scan/sanitization أثناء PREPARED. منافس أكمل نفس التفعيل يُقرأ كنجاح مطابق بدل أرشفة الملف الذي صار مستخدمًا. | provider multi-replica/races خارج DB وسباق إضافة usage يحتاجان تحققًا/عقدًا مشتركًا. |
| P1-10 | حفظ PERMANENT/TEMPORARY والـexpiry الأصليين قبل archive/delete داخل typed owner snapshot؛ restore لا يحوّل TEMPORARY إلى PERMANENT. سياسة مجهولة/منتهية/غير صالحة تفشل قبل storage restore. | لا backfill ولا تخمين لسياسة تاريخية؛ السجلات القديمة المجهولة تحتاج قرار owner موثق. |
| P1-14 | البحث في المصدر أثبت أن events تُولد محليًا ولا dispatch/outbox أو consumer لها في EAP. وُثّق العقد المحلي غير المنشور صراحةً، وأشير إليه في getUncommittedEvents. لا notifications وهمية. | أي تبنٍ كـintegration contract يحتاج transactional outbox وتصميم owner واختبارات جديدة؛ لا ادعاء أنه نُفّذ. |
| P1-01 / P1-08 | phase آمنة في detail، منع delete أثناء pending recovery، واستثناءات recovery/retention تعاد 409 آمنًا. عند HTTP failure نهائي تستخدم محاولة التعافي الصريحة مفتاح HTTP جديدًا؛ network/in-progress retry يحتفظ بالمفتاح. | facets/translation/full workspace والـbrowser/provider acceptance لا تزال كما في السجل السابق. |
| P1-16 | Local promotion يتحقق من existing CLEAN digest عند retry؛ sanitized paths انتقلت إلى clean/ بدل البقاء في نفس المسار الفيزيائي. | local dev فقط؛ ليس دليل provider atomic object version، ولا يعطل Noop scanner security. |

تفاصيل العقد في [ASSET_LIFECYCLE_RECOVERY.md](../operations/ASSET_LIFECYCLE_RECOVERY.md). النية التشغيلية تحفظ داخل `malwareScanStatus.activationOperation` الموجود؛ سياسة الاستعادة داخل `metadata.lifecycleRetention`. كلاهما typed EAP-owned envelope، ليس علاقات مرجعية جديدة أو JSON مرسلًا من العميل. AssetId والـownership يبقيان في الأعمدة الأصلية. لا schema/migration ولا تشغيل sweep أو تعديل سجلات تاريخية.

الـoperation ID الخادمي يظهر في projection آمنة وفي Audit نجاح التفعيل دون source locator؛ idempotency مزود HTTP بقي مشتقًا من source+digest. فشل حفظ نتيجة بعد provider move لا يطلق compensation مدمّرًا على أصل ربما أكمله منافس. استدعاء التفعيل مرة أخرى هو مسار recovery اليدوي الحالي؛ لا worker آلي مخترع.

الاختبارات الجديدة تشمل DB-failure-after-move، intent-CAS rejection، reload of PREPARED، نفس operation ID عند retry، منع mutations أثناء recovery، retry بعد فقد استجابة النجاح، local digest recovery، والحفاظ على TEMPORARY ورفض سياسة قديمة مجهولة/منتهية. اختبار PostgreSQL جديد للنية المحفوظة يعمل داخل CI disposable فقط؛ لا يُحتسب PASS محليًا عند skip.

**NOT CLOSED / NO-GO**: تقدّم المصدر موثق؛ provider sandbox، التشغيل، بقية workspace capabilities، وسباقات usage/restore تبقى مفتوحة. لا نجاح test أو CI محدود يغلق هذه الاعتماديات.

---

## التحقق الحالي — متابعة 2026-10-09

**هذا القسم يحدّث الحكم الحالي؛ الفقرات اللاحقة سجل تاريخي للدفعات ولا تعني أن عبارة «لم تُشغّل الاختبارات» ما زالت تنطبق.** استؤنف العمل من `1482556`، لا من main أو snapshot قديم. ملف الخطة المعتمد لم يتغير.

### ما أُكمل في المتابعة

- إعادة توصيل إجراءات Finalize/Validate/Sanitize/Activate/Archive/Soft Delete/Restore بالـAPI الموجود، وفق حالة الأصل ودليل الفحص والتنظيف. لا زر purge نهائي. الأرشفة والحذف المنطقي يحتاجان قراءة impact وتأكيدًا صريحًا؛ إخفاق القراءة أو وجود استخدام يمنع التنفيذ في الواجهة، وفحص owner الخادمي محفوظ.
- ملخص security evidence من GET detail بدون locator؛ الحالة والـchecksum لا يُعرضان كبديل عن إثبات security policy. صلاحية المسار ما زالت `admin:assets:manage`، وإعادة الاستخدام مستقلة `admin:assets:reuse`.
- فلاتر lifecycle/classification من enums الفعلية، مع الإبقاء على ownerType كقاموس مفتوح دون اختراع enum. البحث المتقدم بالفئات/استخدام الأصل/النسخ ليس مكتملًا.
- تقوية إعادة التحقق قبل scan/promotion، وبعد rescanning: signature، الحجم، MIME، وقت الدليل، والبصمة جميعًا مطلوبة؛ لا بصمة مطابقة وحدها تسمح بدليل نوع مزور.
- منع manual malware-failed من إعادة INITIATED/DELETED/PURGED/ARCHIVED إلى حالة معالجة. التغييرات تستمر داخل Aggregate، لا UI فقط.
- HTTP projection يخفي `storageLocator/storageZone/bucketName/pathKey` من ردود إنشاء الرفع والتسجيل ودورة الحياة، ويحافظ على handle/grant المؤقت. DTO الداخلي للـEAP لا يزال يملك coordinates عند الحاجة؛ لم تُغيّر ملكية البيانات.
- حذف bucket/path الوهميين من `RegisterQuarantinedAssetDto` وتوثيق route كعقد allocation قديم متوافق، لا تسجيل object مؤكد؛ حالة INITIATED والتأكيد اللاحق محفوظان.
- تصحيح error mapping للـmetadata إلى 422، ولتغير الدليل/حالة التسليم إلى 409، وخدمة التسليم غير المهيأة إلى 503، دون رسائل SQL/provider خام.
- روابط الرفع/المعاينة ترفض credentials في URL وHTTP غير المحلي؛ HTTP المحلي مقصور على dev، وانتهاء grant غير الصالح لا يُقبل.
- إصلاح حارس جرد التدقيق: dependencies داخل Router.create لم تعد تمحو owner الصحيح عند container.resolve(repository). اختبار جديد يحفظ fail-closed للمسارات غير المعروفة. راجعت العمليات الثلاث الجديدة وأُضيفت للجرد بإبقاء atomic owner/outbox pending؛ صار الجرد 319 handler/318 endpoint.
- CI يتضمن اختبار API lifecycle الأصلي الذي كشف توقع 400 قديمًا؛ صُحح إلى 409 Problem Details وعدم تسريب سبب الاستخدام. أضيفت اختبارات أوامر الواجهة وحارس التدقيق ومسارات workflow للمكونات والـretention gateway.

### حالة المهام الأصلية — دون إعلان CLOSED

| المعرف | نتيجة التحقق الحالية | دليل المصدر / المتبقي |
| --- | --- | --- |
| P0-01 | PARTIALLY_IMPLEMENTED | دليل upload/scan/sanitize محفوظ، promotion يفشل مغلقًا؛ attestation/scanner version وربط immutable provider object ما زالا مطلوبين. |
| P0-02 | PARTIALLY_IMPLEMENTED | precondition قبل move مثبت؛ نجاح move ثم فشل CAS ما زال يحتاج durable reconciliation (P1-13). |
| P0-03 | PARTIALLY_IMPLEMENTED | INITIATED ثم finalize خادمي قبل scan؛ upload grant الحقيقي وobject version fencing لم يتحققا هنا. |
| P0-04 | ALREADY_IMPLEMENTED | semantic asset identity موجودة في provider keys مع اختبارات؛ retry عبر replicas يحتاج provider sandbox. |
| P0-05 | PARTIALLY_IMPLEMENTED | executable مستبعد وverified MIME/hash بوابات خادمية؛ Local محدود وprovider الحقيقي غير مثبت. |
| P0-06 | PARTIALLY_IMPLEMENTED | reuse permission/router/picker مستقلة بلا destructive capabilities؛ role provisioning وowner/public flow يحتاجان تحققًا تشغيليًا. |
| P0-07 | PARTIALLY_IMPLEMENTED | استخدام يُفحص قبل archive/delete/purge؛ consumer insert المتزامن بعد الفحص ليس محميًا بعقد مشترك مكتمل. |
| P1-01 | PARTIALLY_IMPLEMENTED | upload/detail/preview/usage/actions/security summary موجودة؛ timeline/versions/legal-hold view والترجمة الكاملة ليست مكتملة. |
| P1-02 | PARTIALLY_IMPLEMENTED | selectors للحالة/الأمان؛ retention/processing/in-use/file-family/checksum facets تبقى مفتوحة. |
| P1-03 | ALREADY_IMPLEMENTED | draft/applied وstale-generation guard موجودة؛ Chromium المعزول أثبت تعطيل pagination مع draft وتثبيت q+cursor وdedupe. |
| P1-04 | ALREADY_IMPLEMENTED | Prisma AND يجمع q وcursor؛ اختبار query mock موجود. قياس pagination الواقعي لم يُجرَ. |
| P1-05 | ALREADY_IMPLEMENTED | strict canonical cursor و400 آمن، API tests؛ لا ادعاء أداء dataset كبير. |
| P1-06 | PARTIALLY_IMPLEMENTED | picker async search/paging/rehydration؛ browser editor-use end-to-end ما زال غير مثبت. |
| P1-07 | ALREADY_IMPLEMENTED | audit قبل onChange، وصلاحية reuse؛ owner AssetReferencePolicy يبقى السلطة النهائية وليس selection audit. |
| P1-08 | PARTIALLY_IMPLEMENTED | mapping معروف وآمن للـ400/404/409/422/502/503/500 اختُبر؛ typed exhaustive domain error contract تحسين لاحق. |
| P1-09 | PARTIALLY_IMPLEMENTED | DTO والـallocation semantics موثقان بلا bucket/path وهمي؛ route القديم متوافق وليس verify-existing-object capability. |
| P1-10 | PARTIALLY_IMPLEMENTED | ingress/expiry/categories fail-closed؛ restore يعيد PERMANENT ولا يحفظ policy history كاملًا، اعتمادية سياسة مفتوحة. |
| P1-11 | PARTIALLY_IMPLEMENTED | derived scanner ومخطط consumer guard مثبتان؛ لا central registry ولا ADR معتمد أو ضمان سباق الاستخدام. |
| P1-12 | PARTIALLY_IMPLEMENTED | CAS monotonic وrestore lease؛ 10 اختبارات PostgreSQL سابقة مثبتة في CI، لكن provider fencing/expired-lease heartbeat لا يزالان مفتوحين. |
| P1-13 | PARTIALLY_IMPLEMENTED | archive state-first/purge tombstone retries/restore compensation موجودة؛ activate recovery والـjournal الدائم والـheartbeat غير مكتملة. مانع إغلاق مصدرّي. |
| P1-14 | CONFIRMED_FUNCTIONAL_GAP | events تتولد في Aggregate؛ لا dispatch/outbox مثبت في owner mutations الحالية. لا اعتبارها production notifications أو عقودًا منشورة. |
| P1-15 | ALREADY_IMPLEMENTED | HTTP grants/handles وprojection آمن دون coordinates؛ DTO الداخلي يبقى لدى EAP. |
| P1-16 | PARTIALLY_IMPLEMENTED | Wizard موجود؛ Local adapter لا يولد grant وNoop scanning لا يصبح success. يلزم provider متوافق للتطوير وفق docs/operations/ASSET_PROVIDER_RUNTIME.md، لا fallback غير آمن. |
| FGA-03-001 | PROPOSED_ENHANCEMENT | rights/license register وسياسة mandatory/advisory ودمج publication غير منفذة؛ لا افتراض أن الأصل مرخص. |
| FGA-03-002 | PROPOSED_ENHANCEMENT | rendition inventory/provider pipeline غير منفذة؛ لا thumbnails/variants وهمية. |

العدد: 7 P0 و16 P1 وإضافتان FGA = **25 مهمة ذات معرف**؛ الفجوات الثماني في §03.6 ليست ثمانية معرفات إضافية مخترعة. قائمة القدرات المؤجلة في closure register محفوظة. المهام ALREADY_IMPLEMENTED أعلاه لا تعني إغلاق أدلة Runtime.

### أدلة الفحص والحكم

- 220 اختبارًا ناجحًا /23 ملفًا، 10 DB tests متخطاة محليًا عمدًا. آخر تعديل UI guard أعيد فحصه ضمن delta tests.
- TypeScript والجودة و13 source guards ناجحة؛ lint المختار 0 errors/18 warnings. git diff --check ناجح.
- Chromium حقيقي مع HTTP معترض: دورة الأزرار ومنع in-use وimpact confirmation وpaging نجحت؛ **ليس** provider/API/DB كاملًا. استُخدم bypassCSP في سياق الاختبار لأن React refresh preamble في dev يتعارض مع CSP الحالي، وتعطيل HMR منع خطأ WebSocket؛ سياسة الإنتاج لم تتغير ويظل deployed CSP pending.
- تحققت من run 37869788764 عند commit 8eb794b: success و120 source tests و10 disposable PostgreSQL tests. لا يُنقل النجاح تلقائيًا إلى commit المتابعة.
- ci:source:contracts ما زال يفشل في العلاقات الثلاث السابقة خارج EAP؛ guard التدقيق الجديد ينجح. لا GO.
- [الأوامر والأدلة](evidence/section-03/README.md).

**الحكم: NOT CLOSED.** توجد عوائق مصدرية P1-13/P1-14 وسياسة restore/registry، بجانب أدلة provider/runtime. طلب الإغلاق لا يجيز تغيير هذه الأدلة إلى PASS. لا migrations أو seed أو sweep أو حذف objects حقيقية نُفذت محليًا. لا يُنقل العمل إلى القسم 04 على أساس إغلاق غير مثبت.

---

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

## Restore API failure semantics

- `ASSET_RESTORE_CONTENT_VERIFICATION_FAILED` and malformed restore evidence are returned as sanitized 409 state conflicts.
- Missing CLEAN verification capability and failed archive compensation return sanitized 503, preserving an actionable failure code without exposing provider details.
- API contract regression tests cover each branch; latest run pending on combined updates.

## Patch L — DB-backed restore lease fences concurrent retention and purge

- Acquire a unique 10-minute RESTORE lease using existing `AssetRecord.retentionClaimToken/Until` **before** any provider restore; the conditional `updateMany` checks DELETED, prior revision and absence of a live claim. Lease acquisition also bumps `updatedAt` monotonically, so purge commands hydrated earlier cannot later commit a stale PURGED transition.
- `PrismaAssetRecordRepository.save` now refuses DELETED→ACTIVE without its owned lease. It atomically compares the claim token and unexpired lease while committing ACTIVE and clearing claim fields; overwritten/expired leases fail closed.
- On failed restore/verify/CAS, the use case attempts archive compensation and releases only its own lease. A failed compensation or lease release is explicitly surfaced; the provider restore itself is included in the compensation boundary to cover partial failures.
- This avoids the earlier purge-vs-restore preflight race *within a live lease*. **Still open:** a stalled provider action exceeding 10 minutes can lose its lease; production should add heartbeat/operation journal and provider-side immutable version fencing before declaring fully safe.
- No Prisma migration or production database mutation; pending CI integration tests.

## Patch L — Restore lease API error contracts and negative application test

- EAP Problem Details returns sanitized 409 for lease conflict/invalid transition, 503 for missing lease capability or unsuccessful lease release; never sends provider/storage exceptions verbatim.
- Additional negative application regression proves a failed restore lease prevents any provider-side restore and leaves the DB record DELETED.
- Postgres lease race regression is separate and runs only against disposable localhost.

## CI performance — single-build verification pipeline

- Consolidated three independent EAP jobs into one verification job sharing one ephemeral PostgreSQL service. TypeScript references are compiled **once** rather than three times; `npm ci` installs dependencies once and runs Prisma generate through the existing `postinstall`, rather than executing another redundant generate in each job.
- Kept all original gates: TypeScript, `quality:source`, EAP domain/application/infrastructure/API Vitest, legacy W3 provider checks, and disposable PostgreSQL integration.
- DB changes are only permitted in the two isolated PostgreSQL steps. Before the test schema is created, the job checks exact localhost-only `DATABASE_URL` and `DIRECT_URL`. No production DB environment or secrets are used.
- Retained `cancel-in-progress` for superseded branch pushes; henceforth prefer batched edits per commit/CI cycle to reduce cancelled redundant runs. Job-name consolidation may require adjusting optional GitHub branch-protection required-check configuration if enabled.
- No tests omitted. Performance improvement is structural; the updated workflow's CI outcome must be verified before claiming success.
