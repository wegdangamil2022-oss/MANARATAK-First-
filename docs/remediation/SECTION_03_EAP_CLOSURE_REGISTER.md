# Section 03 — EAP closure register

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


## Verified recovery-worker continuation

[CI run 37930553854](https://github.com/wegdangamil2022-oss/MANARATAK-First-/actions/runs/37930553854) SUCCESS at source `333ef99c5ad287f400e805217936a86300b19fd2`: **240 source/config tests and 15 disposable PostgreSQL tests PASS**. The new age/state pending-intent discovery DB case passed. Full TypeScript graph, quality and scoped security/audit checks passed. See `worker-ci.json` and `worker-ci-summary.txt`; the evidence-only follow-up modifies no tested code. Source count includes config tests newly included in EAP workflow and overlaps earlier local/CI suites.

Recovery worker is wired and opt-in, **not enabled**. No source runtime flags/secrets or production DB/provider objects were changed. Five existing worker/lease guards and 43 targeted local tests passed; local duration 3.04s. Audit outcomes remain non-atomic; provider object-version fencing, asset lease/restore-compensation recovery, cross-owner usage serialization and actual runtime/provider gates still block CLOSED/GO.


## Current continuation — bounded durable activation recovery

03/P1-13 now has an EAP-owned discovery/use-case/handler connected to the existing durable worker and opt-in recurring bootstrap. Disabled by default and enforced during execution, including old queued jobs. Source tests: 43 focused PASS (3.04s), TypeScript/quality PASS, five worker/lease guards PASS; matching new CI pending. Details and non-atomic audit/provider limitations: `docs/operations/ASSET_LIFECYCLE_RECOVERY.md`.

Older statements that automatic activation recovery source is entirely absent are superseded by this bounded implementation. No runtime enablement is claimed. Consumer/lifecycle serialization, provider fencing, restoration-compensation recovery and outstanding workspace/provider acceptance still prevent whole-section CLOSED/GO.


## Final verified status for this broad operation — 2026-10-09

**Verdict: NOT CLOSED / NO-GO.** Workspace/version preservation and restore-ownership mitigation are implemented and tested; whole-section acceptance remains incomplete.

Matching source SHA `1c4b92ce714d3cb0dcb8cf403a9d6d648e31ff3b`: [CI 37924185138](https://github.com/wegdangamil2022-oss/MANARATAK-First-/actions/runs/37924185138) **SUCCESS**, 211 source tests plus 14 disposable PostgreSQL tests. TypeScript, quality and security/audit checks passed in this scoped workflow. No overlapping local/CI test counts are summed. The subsequent evidence-only commit modifies no application/test source. Original review attachment hash remains `9de7c781eb82cd490fc85386267d7e9e3fe2b2028803f9ecd0351531e2cd11fc`.

| Gate | Verified current result | What prevents whole-section closure |
| --- | --- | --- |
| Workspace/data source | Version-history preservation, supported governance/detail/owner/copy, scan/family/processing facets, failed-reset cursor handling implemented; intercepted-API Chromium passed. | Global in-use/unused facet, complete owner workflows and actual browser/API/provider acceptance remain incomplete. |
| DB concurrency | 14 PostgreSQL tests PASS, including new chain persistence, facet composition, expired/ACTIVE restore-lease rejection. | P0-07/P1-11 consumer insertion vs lifecycle mutation is not serialized across owners. |
| Recovery | Durable manual activation retry; restore rejects compensation on known lost/unknown ownership. | P1-12/13 heartbeat/provider fencing, automatic reconciliation/monitoring and durable compensation journal remain absent; lease check is not atomic with provider archive. |
| Provider runtime | No safe sandbox/credentials configured in this managed environment; no external provider write performed. | P0-01/03/05 immutable version binding, real upload/scanner/sanitizer, idempotency/cache/fault-injection proofs remain pending. |
| Global source CI | Prior three unrelated name-based relationship violations were not changed or rerun in this scoped operation. | Dedicated EAP CI success does not clear the repository-wide gate. |

No schema migration, seed, reset, retention sweep, backfill, production DB/object-store write, main merge or deployment. No original task falsely marked CLOSED. Existing snapshots below are retained history and apply to their stated commits, not this final source SHA.


## Verified workspace CI and restore-delta checks

[Workspace CI 37923765109](https://github.com/wegdangamil2022-oss/MANARATAK-First-/actions/runs/37923765109) SUCCESS at `2632dde`: 209 source tests plus 13 disposable PostgreSQL tests. The two new DB cases for version preservation and facet composition passed. Restore ownership delta was added afterward: TypeScript PASS, 49 focused application/error tests PASS (8.28s). Latest expanded source lint covers six files: 0 errors /53 warnings. No overlapping counts added together. Matching delta CI remains pending until independently observed.


## Restore delta in broad batch — P1-12/P1-13

Blind compensation archive after a lost restore lease is replaced by a fail-closed ownership check. Expired/replaced lease or competing ACTIVE state blocks compensation and returns a safe recovery-needed result. External archive remains non-atomic with the lease check; heartbeat/provider fencing and durable recovery remain open. Source/DB CI on the matching final commit required; previous workspace CI does not validate this delta.


## Current broad-batch status — 2026-10-09

- SOURCE WORKSPACE: P1-01 detail governance/metadata/versions/copy and supported owner links, P1-02 security/family/processing queues, P1-03 stale reset prevention implemented; history-loss defect fixed by strict persisted-chain reconstruction.
- LOCAL: 209 source tests PASS /13 DB tests skipped; TypeScript PASS; 13 guards PASS; quality PASS; lint 0 errors/51 warnings; intercepted-API Chromium PASS. Evidence files `workspace-*` describe exact scopes. No runtime status inferred from mock/UI tests.
- Native version-chain reconstruction is implemented for the existing serialized domain shape. Native provider versioning/other legacy formats remain unverified; earlier OPEN capability entries below are historical and do not negate this bounded source fix.
- SOURCE CI for this batch: PENDING until matching pushed SHA finishes. Earlier runs below apply only to their own commits.
- Section remains **NOT CLOSED / NO-GO**. Remaining source gates include usage-vs-lifecycle serialization, expired lease fencing, automatic reconciliation/monitoring, complete owner/workspace flows; provider/browser real E2E gates also remain pending.


## Current closure decision — fast verification, 2026-10-09

**NOT CLOSED / NO-GO.** Request to close reviewed against existing acceptance criteria; fast tests pass but remaining functionality and cross-system safety are not proven complete.

- Tested application source: `ac3624c29610fd4969bc013432ae9c7757838e80`. Local TypeScript Admin/API/infrastructure PASS; 193 EAP source tests PASS (36.70s), 11 database tests skipped locally; 13 security/audit/provider-transport guards PASS (1.36s).
- [CI run 37921628504](https://github.com/wegdangamil2022-oss/MANARATAK-First-/actions/runs/37921628504) independently SUCCESS on that SHA: 193 source tests plus 11 disposable PostgreSQL tests PASS. Counts overlap local tests; do not add them.
- Real Chromium/Admin UI with intercepted API PASS: lifecycle flow, usage denial/confirmation, draft filters, pagination deduplication, retention/checksum facets carried with cursor, reset removes filters/cursor. Test-only CSP bypass and disabled HMR retained; no provider or actual API/DB/browser end-to-end claim.
- P1-02 facet slice verified locally; full task remains PARTIALLY_IMPLEMENTED (processing/security, in-use, family and owner presets). No original task marked CLOSED merely from scoped tests.
- Closure blockers: P0-01/03/05 real immutable object/scan/upload evidence; P0-07/P1-11 usage-vs-lifecycle serialization; P1-12/13 lease-expiry fencing, automated reconciliation and monitoring; P1-01/02/06 remaining workspace and owner end-to-end acceptance. Local events P1-14 have an explicit non-dispatched contract, not an implemented integration outbox.
- No production DB/provider writes, migration, seed, reset, purge, main merge or deployment. Dev server stopped after browser check.
- Current evidence: `quick-tests.log`, `quick-guards.log`, `quick-browser.log`, `quick-ci-summary.txt` beside prior scoped evidence. These supersede the current source/browser gate snapshot below only; remaining gates remain PENDING.


## Latest bounded batch — 03/P1-02 facets

Retention/checksum selectors wired UI → validated API → EAP query. Scoped local checks: 46 tests PASS, TypeScript PASS, lint 0 errors / 49 warnings. No new real-DB/browser/provider acceptance claim. Source CI evidence below belongs to the preceding recovery commit; it is not evidence for this new batch. P1-02 PARTIALLY_IMPLEMENTED; section NOT CLOSED.


Canonical tasks: MANARATAK_ADMIN_REVIEW_CODEX.md §03.10–03.17.
This register is an evidence map, not an authorization to deploy or to mark runtime PASS.

## Latest recovery continuation (supersedes older source-blocker snapshots below)
- PREPARED activation intent now persists before any provider movement; recovery is source+digest idempotent and COMPLETE/ACTIVE is CAS-persisted. Manual recovery exists; no automatic reconciler is claimed.
- Retention policy is preserved for new archive/delete transitions; unknown/expired historical policies fail restore before external effects. No backfill/default duration.
- Local event artifacts are explicitly non-dispatched; see docs/operations/ASSET_LIFECYCLE_RECOVERY.md. Production outbox adoption remains a future consumer contract, not an implemented feature.
- Typed operational envelopes reuse existing EAP-owned JSON. No new schema, migration, production DB or external provider write was executed locally.
- Pending activation blocks deletion/evidence changes. Terminal HTTP errors start a fresh explicit HTTP attempt; ambiguous network/in-progress retries retain their key. The durable operation ID remains stable.
- CI proof: [run 37875453856](https://github.com/wegdangamil2022-oss/MANARATAK-First-/actions/runs/37875453856) SUCCESS at source commit `3be1ab7`; 190 source + 11 isolated PostgreSQL tests. Evidence-only follow-up does not modify source.
- Verdict: **NOT CLOSED / NO-GO**, pending provider, operational, usage race and remaining workspace acceptance gates.

## Gate status
- SOURCE: scoped verification SUCCESS at run 37875453856 / `3be1ab760bb346d6d1cf8c19b32f81c5c3572761`: 190 source tests and TypeScript/quality/guards PASS. Remaining workspace/owner contracts are not inferred complete.
- DISPOSABLE_DB: eleven PostgreSQL integration tests PASS in that run, including persisted activation intent recovery. Provider calls are mocked; no production DB was contacted.
- PROVIDER_SANDBOX: PENDING. Atomic object-version promotion, real upload grant, MIME/magic bytes, scanner, sanitizer, archive/restore/delete idempotency and failure injections require external provider evidence.
- BROWSER_E2E: PENDING. Upload-to-reuse workflow, lifecycle, permissions, Arabic/English and empty/error states not validated end to end.
- OPERATIONS: PENDING. Durable cross-system saga/reconciliation, alerting on compensation failure, expired lease heartbeat, real CDN expiry/cache, legal hold races and realistic pagination data.
- VERDICT: NOT CLOSED / NO-GO.

## Continuation review — 2026-10-09
- Source continuation based on branch commit `1482556`: 220 passing tests including selected IAM/Audit regressions; TypeScript and source quality PASS, 13 Node security guards PASS.
- Admin UI Chromium check PASS only with intercepted test API, dev HMR disabled and test-context CSP bypass. No production CSP/provider/browser end-to-end claim.
- Historical CI run 37869788764 at `8eb794b` confirmed success, including ten disposable PostgreSQL tests. This does not validate newer commits.
- Newly fixed: proof rechecks include signature/MIME/size/date; manual scan failure cannot resurrect deleted/purged assets; safe lifecycle actions mounted with usage confirmation; HTTP coordinates hidden; inventory guard understands inline router dependencies and tracks three reviewed asset additions.
- Source blockers remain: durable activation reconciliation/journal, event/outbox integration or approved non-contract ADR, usage-vs-lifecycle concurrent serialization, restoration of original retention policy. Provider and operations gates above remain open.
- Optional rights and renditions tasks FGA-03-001/002 remain PROPOSED_ENHANCEMENT, not CLOSED.
- Current CI run [37872775726](https://github.com/wegdangamil2022-oss/MANARATAK-First-/actions/runs/37872775726) at `6e60a15702ae3e0eec7246ed6d6f32a3f6ad7c53`: **SUCCESS**, 184 source tests + 10 disposable PostgreSQL tests; TypeScript/quality/audit guards PASS. The evidence-only follow-up changes no source. Global source contract failures remain separate.
- Verdict remains **NOT CLOSED / NO-GO**. See task-by-task current review in SECTION_03_EAP_IMPLEMENTATION.md and evidence/section-03/README.md.

## Completion criteria to check, never infer from source-only PASS
1. Upload remains INITIATED until provider confirms actual bytes; evidence persists.
2. Malware-failed or missing-scan assets never reach CLEAN/ACTIVE.
3. Verified signature, MIME, checksum and post-sanitizer scan bind to the same immutable provider object version.
4. Provider idempotency keys are derived from asset identity and operation identity and resist replay across replicas.
5. Asset reuse permits least-privileged editors without destructive management rights; owner saves revalidate.
6. Active consumer references prevent unsafe archive, delete and purge, including under concurrent writes.
7. Asset Center has complete upload, list/detail, secure preview, usage, state-aware actions, safe errors, audit and retry flow.
8. Search/cursor contract survives multiple pages, draft filter changes and duplicate requests.
9. Legal holds, retention expiry and worker claims are checked atomically in disposable DB and approved sandbox.
10. External storage success followed by DB failure is always recoverable without exposing infected or unintended content.
11. Restore-vs-purge and lease expiry races are fenced at both DB and provider object-version boundaries.
12. Domain events/outbox persistence and dispatch truthfulness have real owner-path acceptance evidence.
13. All source and runtime gates link to a commit SHA, execution result and operator/reviewer.

## Deferred EAP capability register (not a claim of implementation)
- Image variants, compression, WebP/AVIF conversion: OPEN.
- Video processing/transcoding: OPEN.
- OCR / document preview extraction: OPEN.
- Metadata extraction and EXIF validation: OPEN.
- Native object version-chain reconstruction: OPEN.
- CDN invalidation, signed URL expiration and caching: OPEN.
- Cross-provider reconciliation worker/operation journal: OPEN.
- Production-scale asset pagination and derived usage-registry performance: OPEN.

## Testing boundaries
No production migrations, seed, purge, retention sweeps or object-store mutations are authorized by this register.
Disposable PostgreSQL is allowed only inside the isolated CI environment and is not a substitute for provider/browser runtime evidence.

The Section 03 DoD requires **both source correctness and independently verified runtime behavior**. Source-only and mock tests must not be relabeled CLOSED.
