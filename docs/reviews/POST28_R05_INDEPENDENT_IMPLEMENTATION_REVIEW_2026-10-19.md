# R05 — Independent implementation review

Date: 2026-10-19, Asia/Aden. Reviewer: a separate technical assistant explicitly commissioned by the owner in this conversation. This is an independent source/evidence review, not an owner signature, production approval, or a claim of independently operating PostgreSQL or the PDF providers.

## Decision

**CONDITIONALLY APPROVED FOR THE ISOLATED SYNTHETIC LAB ONLY.** The implementation addresses the source/design blockers in the 2026-10-17 review. I found no additional source defect requiring a code change before the narrowly scoped local rehearsal. The independent implementation-review requirement is satisfied for the source named below. The operator must still satisfy the concrete pre-apply gates below; this report does not mark those future executions PASS. **R05 acceptance remains pending.**

No Neon, production, existing database, main merge, historical migration edit, constraint bypass, new consent, financial mutation, or external provider authorization is granted. The owner has already delegated the Assets/Student/Audit decisions; this review does not request those decisions again.

## Reviewed source and evidence

- Source: `966fa067397073a7c67ec5f938284c6913f97515`, branch `feat/post28-r07-artifact-preparation`. The implementation is in `scripts/database/post28-r05-staging.mjs`, `scripts/database/remediate-post28-known-source.mjs`, and `PrismaAssetRecordRepository.saveInTransaction`.
- Actual successful PostgreSQL/PDF evidence belongs to `6dc778605d1344b99011b3074ee2b2648d182550`, run `186b4fc2-d77a-45ab-8e97-0c3aabef0a20`. It does not demonstrate runtime behavior of later changes.
- `d5ea087e894281b95c9b263ea97ce0278697d26f` replaces snapshot-digest CAS with Audit sequence CAS. The source diff is two corresponding reads/comparisons. Its targeted test explicitly covers an intervening save with identical snapshot bytes; PostgreSQL execution of that fence is still required.
- Read the previous independent source review, delegated technical decision and remediation handoff; followed the Ingest/Lifecycle/domain/storage contracts, Audit repository/sanitizer, migration109 reference/lifecycle triggers, migration110 transactional/audit/timeout entry, and strict upgrade-preservation comparator.
- Independently ran the existing read-only evidence-index verifier against **HEAD Git blobs**: **40 entries matched their recorded byte length and SHA256**. Independently recomputed canonical snapshot hashes and checked all **7** recorded Audit sequences, predecessor hashes, target/correlation identities and final completion action. These are checks of archived data, not live DB execution.
- The first inline Node archive-check command failed at JavaScript parsing because Windows argument handling removed quotes; the corrected stdin invocation passed. Neither invocation opened a DB connection. No runtime tests were repeated during this review.

## Contract findings

1. **Historical identity and triggers are preserved.** Migration109 prevents a referenced Asset from transitioning through inactive processing states. Audit-backed preparation avoids creating such intermediate Asset rows. The target UUID becomes an Asset only after the canonical lifecycle establishes ACTIVE/CLEAN. No binding rewrite, direct SQL Asset insertion, disabled trigger, altered FK, or replacement consent appears in the executor.
2. **The final write is atomic.** `complete` takes an advisory transaction lock, checks the latest durable stage and current Asset, rechecks history and actual stored bytes, and inserts Asset plus Audit using the same Serializable Prisma transaction. The canonical repository uses the supplied transaction client. The executor injects failure after both writes; archived evidence records both rolled back, with the durable ACTIVE stage retained. Every retry restores a fresh aggregate, avoiding reuse of repository snapshots captured before rollback.
3. **Concurrency fencing is appropriate to the scoped operation.** Stage writers rehydrate, compare the observed sequence while holding the operation lock, and use unique Audit references. The later sequence fix rejects a stale writer even when bytes did not change. `latest` verifies operation identity, fixed decision and snapshot hash. The archived seven-record predecessor chain was independently verified. This is scoped remediation bookkeeping in the existing Audit contract, not a new general runtime repository.
4. **Retention is deliberately distinct from the binding.** The initial decision anchors expiry to packet creation and an earlier document `expiresAt`, if present; retry uses the durable operation decision. It does not copy the binding's distant retention date, extend 180 days on retry, create a hold, or assign a made-up Audit retention policy. Audit's recorded `UNCONFIGURED_RETAIN` remains a real policy state, not an invented temporary retention promise.
5. **Trust is more than FK satisfaction.** The executor invokes real upload verification, scan, raster reconstruction, post-scan, promotion and storage readback. Raw and sanitized digests remain separate. The trust guard requires ACTIVE/CLEAN, owner, fixed expiry, sanitization/scan evidence, completed digest-bound activation, matching provider proof and unchanged historical rows. Archived evidence reports source636/output10234 bytes and different digests, with preserved rendered pixels.
6. **Privacy and money remain separate.** No Student consent/binding mutation is present. The target's LEGACY attestation is not upgraded into review eligibility. Historical row equality is checked inside finalization, and the published delta independently covers the wider tables/catalog. All 280 unaffected tables and pre-existing Asset rows are reported unchanged. The ordinary application principal has no recorded DDL, ledger-read, Asset/Audit UPDATE or binding UPDATE privilege. No new financial or Student event is justified by this operation.
7. **Audit without an Asset Outbox is consistent with this scope.** Domain Asset events explicitly lack a published integration/outbox contract; the delegated decision selects existing append-only Audit. Nothing reviewed establishes a mandatory consumer that this remediation silently bypasses. The existing Student outbox remains unchanged because Student history is unchanged.
8. **Recovery design is plausible; the new executor still needs its own proof.** Canonical activation records PREPARED intent before provider movement, and local storage recovers a missing quarantine source only when the deterministic clean destination matches the expected digest. Staging durably records that intent. A completed marker still triggers historical/readback verification on replay. Prior generic lifecycle tests cannot replace an injected provider failure in this executor.

## Mandatory gates before local apply

The independent source review itself is no longer the missing gate. The operator may prepare and execute the following proofs in a new isolated synthetic lab, under existing owner authorization:

1. Pin a clean candidate SHA, run/manifest, server/database identities, restricted application role and native binary/provider identities. Any functional source change beyond the reviewed sequence fence requires a review addendum; documentation/evidence additions alone do not require rerunning successful unrelated suites.
2. Demonstrate the current sequence stale-writer fence against actual PostgreSQL. Inject a promotion failure around the real move/intent boundary, prove no Asset or completion is accepted early, then resume with identical intent/digest and one final Asset/completion. Preserve the failed-attempt evidence.
3. Retain the original negative orphan case and the prior archived evidence unchanged. Verify new-case source bytes and provenance, fixed decision, final ACTIVE/CLEAN trust, exact allowed Asset/Audit delta, protected history, and all nine pre-upgrade audits zero. Do not turn the old missing file into a claim of recovered original bytes.
4. Capture a strict **after-remediation / before-upgrade** preservation baseline. Take and structurally restore a matching new backup into a fresh empty verification database, including table-content/catalog comparisons. Do not rewrite the original pre-remediation baseline or loosen the comparator to hide authorized remediation delta.

Only after these gates pass is this review's conditional permission to rehearse migration110 effective. Reconfirm them immediately before apply; a stale report is not a substitute for live identity/preflight.

## Required acceptance evidence after apply

- Preserve all historical migration names/checksums; verify the actual resulting ledger, schema/catalog and constraints. Respect migration110 lock/statement timeouts and record blockers/timing.
- Prove unchanged required281 counts,8 invariants, relationship/history fields and exact integer financial totals from the post-remediation baseline. Compare existing-row table content with explicit allowance only for migration110's reviewed schema effects and ledger.
- Run the previous Prisma5.22 client against actual upgraded data and all declared historical fixture fields; pre110 compatibility is insufficient.
- Prove safe cancellation before apply and cancellation/timeout while waiting for a lock using catalog, transaction and ledger observations. Rehearsing rollback on a fresh verification target is acceptable if identity and source are explicit. Do not infer rollback from process exit alone, pollute the acceptance ledger, hide a failed migration with resolve/reset, or accept duplicate effects on redeploy.
- Recheck trust/readback and zero audits after apply, rerun deploy to prove no duplicate migration/effect, seal evidence and state accurately whether R05's complete acceptance conditions passed.

## Limits and non-blocking observations

The PDF adapters are synthetic Windows lab tools only. The helper verifies the configured MuPDF entry module and Defender executable hashes; that is not a complete transitive dependency, engine/signature-database attestation, licensing review or production sanitizer certification. Rasterization intentionally discards searchable text, forms and signatures under the delegated lab decision. This does not block the fixed636-byte synthetic case and does not authorize general document processing.

The whole-database preservation and restored-archive results were inspected as sealed evidence, not recreated by this reviewer. Authorization and runtime acceptance remain separate from a pure trust predicate returning `ownerAuthorizationVerified:false` and `upgradeAuthorized:false`; those fields should not be flipped merely to satisfy a report. Record the actual delegation and this independent review alongside the measured runtime results instead.

**Final assessment:** implementation source review complete, conditionally acceptable for the local synthetic upgrade rehearsal after the listed measured gates; no claim that migration110 ran or that R05 is closed at the time of this report.
