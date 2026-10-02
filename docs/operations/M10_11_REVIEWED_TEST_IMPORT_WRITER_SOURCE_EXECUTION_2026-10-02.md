# M10-11 — Governed International Tests writer

Date: 2026-10-02. Base: `main` / `780e6ae69328c21dc2a01ecd4be7b3f0b207755c`.
Branch: `fix/m10-tests-import-writer`.
Authority: revised activation plan v2, sections 21, 28, 30, row M10-11.

## Acceptance boundary

**SOURCE_IMPLEMENTED / SOURCE_TESTED. Connected acceptance: RUNTIME_UNTESTED.**
M0–M9 are accepted for planning. No database connection, import, migration, seed,
deployment or Google AI Studio access was performed during this implementation.
M10 is not closed. This source change equips the operator to test a reviewed
pilot of **1–5 Tests**, after the connected prerequisites have passed.

This writer creates/updates reviewed core draft fields and appends a version
containing exact raw source and numbered sections marked NEEDS_REVIEW. It does
not infer semantic fees, scores, requirements or cross-domain relationships from
free text, publish a Test, or claim that its content is mapped or verified.
The existing content/relationship review and publication workflows own that work.

## Implemented behavior

- Replaced the former parser/report `--execute` simulation with six explicit
  operations: `prepare`, `inspect`, `dry-run`, `approved-write`, `reconcile`,
  `rollback`. Unknown flags fail; no database-error simulator success fallback.
- `prepare` and `inspect` are offline. They verify the locked matching manifest,
  source classification, original source hash and real filesystem containment.
  A symlink/junction cannot escape the approved source tree. Plans include raw
  content, explicit canonical UUIDs, cycle, reviewer reason/evidence, manifest
  hash, source hash and a canonical JSON plan hash. Existing output files are
  not overwritten. Inputs are strict; batches outside 1–5 and duplicate
  source/target/publicId/slug/canonical name+provider mappings are rejected.
- NEW_TEST requires APPROVE_CREATE, REPLACE_EXISTING requires APPROVE_UPDATE.
  REVIEW_REQUIRED has no automatic promotion: it needs an explicit reviewed
  CREATE/UPDATE resolution and evidence. Legacy manifest `old_id`/`old_slug`
  values are never treated as database UUIDs. Current target/provider/family IDs
  must be supplied from reviewed canonical records; missing/mismatched owners,
  canonical collisions, missing providers and incompatible families block writes.
- `dry-run` and `reconcile` use a PostgreSQL READ ONLY transaction with a
  RepeatableRead snapshot, without audit/outbox appends. Reconcile returns FAIL
  before a receipt exists, or after source/version/root/dependency drift.
- Approval binds the plan hash and preview hash. Mutation/recovery approvals are
  checked before constructing Prisma. The existing database mutation gate still
  applies, including target/environment/purpose and production requirements.
  Recovery token/evidence presence is checked; a genuine backup/restore drill
  and approval authenticity must still be proven by the connected operator.
- The stable actor ID is checked in the database: active, not deleted, verified
  user, active account and persisted permissions `admin:imports:manage` plus
  `admin:international-tests:manage`. Existing role/policy evaluation applies;
  email text and emergency bypasses do not grant this writer access. Identity,
  account, user, assignment, role and policy rows are locked during mutation.
- Serializable transactions and an importer advisory lock govern writes.
  Existing owners are locked; provider/family references are locked. Published,
  archived, rejected, merged and superseded roots are immutable here. UPDATE
  preserves canonical identity and existing unrelated fields/relations/versions.
  It touches display/localized names, abbreviation when supplied and source
  provenance only. CREATE is hidden and NEEDS_REVIEW; version is DRAFT.
- Existing `createImportDraftVersion` retains the complete raw source plus all
  detected sections. Durable change-set receipts live in version metadata and
  capture before-fields, operation, hashes, actor and evidence. Root/version
  fingerprints include child counts; version receipt metadata and updatedAt are
  excluded from its own fingerprint to avoid a recursive receipt hash.
- Business writes, receipt, AuditRecord and Outbox append share one transaction.
  Failed audit/outbox aborts everything. Recovery token and connection details
  are not logged. CLI errors redact arbitrary Prisma/FS/source error messages.
  `databaseWrites` reports logical inserted/updated records including nested
  content blocks, receipt updates and audit/outbox, not SQL statement counts.
- Retry of the same APPLIED change-set checks all receipts and fingerprints and
  writes zero records, without a second audit/outbox event. A duplicate active
  source hash+cycle on the same owner under a fresh change-set is blocked.
  Serialization/connection failures exit without automatic mutation retries;
  reconcile before retrying the same sealed plan in case its commit succeeded.
- Rollback is **compensating, not deletion**: restore the touched UPDATE fields,
  or archive a newly created root; mark the imported draft SUPERSEDED while
  retaining its raw source and receipt. Publication, drift and new dependencies
  block rollback. Its audit/outbox is atomic too. Repeated rollback writes zero.
  A rolled-back change-set cannot be reapplied; an archived CREATE target still
  requires a separate reviewed recovery decision. No blind restore/upsert exists.

### Persistence contract

ADR-028 scoped read approval is registered for the Tests gateway to read Identity
for actor lifecycle/verification only. Role and policy checks use their existing
identity-owned repositories. All business ORM mutations remain Tests-owned;
Audit/Outbox use their owner adapters and the existing atomic coordinator.
No schema, historical migration SQL/checksum, seed or DI registration is changed.

## Files

- Application: `InternationalTestImportChangeSet.ts` and its use-case export.
- Infrastructure: `PrismaInternationalTestImportChangeGateway.ts`, its export
  and the persistence read-approval manifest.
- CLI/source loader: `scripts/import_unified_tests_v2.ts`,
  `scripts/import/reviewed-test-import-source.ts`.
- Tests: application contract, shared fixture, infrastructure writer and
  `tests/import/reviewed-test-import-source.spec.ts`.
- This execution record.

## Executed verification

- Vitest: **9 files / 113 tests PASS**, including existing Test parser, import
  promotion, public/admin use cases and repository tests. New coverage includes
  CREATE/UPDATE, prior-version preservation, zero-write retry, reconciliation,
  compensating rollback, stale approval, duplicate source/cycle, source path/hash
  attacks, student/single-permission/unverified/inactive/policy denial, canonical
  conflicts and multi-entry/audit/outbox transaction failure.
- Root TypeScript build PASS; strict standalone CLI/source-loader and new-test
  compilation PASS; Vercel TypeScript contexts PASS, zero diagnostics.
- API and Admin production builds PASS (existing Admin bundle-size advisory);
  exact-head GitHub CI must pass before merge and records full workspace build.
- Complete registered source-closure manifest PASS with `--source-only`.
- Source quality PASS, zero cycles/accessibility findings. Persistence ownership
  PASS, 246/246 models, zero direct cross-context ORM mutations. Scoped lint and
  whitespace PASS. Secret scan and exact-head GitHub results are recorded in PR.
- In-memory delegates execute the real gateway, draft-version repository,
  authorization evaluator and atomic audit/outbox adapters. They simulate
  transaction rollback; they cannot prove PostgreSQL SQL syntax, locks,
  isolation, constraints, real permissions/receipts or consumer processing.

## Connected operator procedure — RUNTIME_UNTESTED

Use the configured secrets within the connected environment; never put a password,
database URL, approval token or other connection credential in chat or reports.
Pull the merged main before running. Follow the existing M10-07/M10-08 controlled
schema activation and recovery prerequisites before starting the full API;
this task introduces no additional migration. Do not replay M9 or import in bulk.

1. Select a pilot of 1–5 reviewed source files. Inspect the matching manifest and
   original files. Resolve the current provider/family UUIDs and, for UPDATE,
   the current Test UUID in a read-only database session. Do not derive any UUID
   from legacy slugs or email. Obtain `TEST_IMPORT_ACTOR_ID` from the verified
   account's persisted identity, with both required permissions.
2. Write an operator-owned review JSON (outside tracked source) with
   `schemaVersion: 1`, a fresh `changeSetId` UUID, `sourceManifestHash`, `entries`.
   Each entry has `sourceKey` (`folder/filename.md`), exact `sourceClassification`,
   `resolution`, `reviewReason`, `evidenceReference`, explicit `targetId`,
   `sourceCycle`, original UTF-8 `sourceHash`, optional `sourceUri`, and `core`:
   `publicId`, `slug`, `canonicalName`, `displayName`, valid domain `testCategory`,
   canonical `providerId`, optional `familyId`, localized names and abbreviation.
   Do not include rawContent: prepare reads it from the locked source. Preserve
   existing immutable identity for UPDATE; allocate an explicitly reviewed fresh
   UUID/identity for CREATE. Use SHA-256 of the actual UTF-8 manifest/source bytes.
3. From repository root, run offline:

   ```sh
   npx --no-install tsx scripts/import_unified_tests_v2.ts prepare review.json plan.json
   npx --no-install tsx scripts/import_unified_tests_v2.ts inspect plan.json
   ```

4. With configured DATABASE_URL and TEST_IMPORT_ACTOR_ID in the environment,
   run `dry-run plan.json preview-before.json`. It must return READY with no
   issues. Review the proposed CREATE/UPDATE and source/identity hashes.
   A BLOCKED result is not an approval. Use a new output filename on every run.
5. After a real backup/restore drill and operator approval, set the existing
   database mutation gate fields (APPROVED/YES, matching environment/target,
   purpose `import`, extra production approval/change ID if applicable), plus:
   `TEST_IMPORT_APPROVAL=APPROVE_WRITE`,
   `TEST_IMPORT_APPROVAL_PLAN_HASH=<planHash>`,
   `TEST_IMPORT_APPROVAL_PREVIEW_HASH=<previewHash>`,
   `DATABASE_RECOVERY_GATE_TOKEN` and `TEST_IMPORT_RECOVERY_EVIDENCE`.
   Run `approved-write plan.json`, then `reconcile plan.json`.
6. In the approved pilot environment, repeat the same approved-write; expect
   replayed=true, zero writes and no duplicate version/audit/outbox. Verify raw
   source, sections, actor, evidence and unchanged existing relationships in the
   database and owner UI. Test missing permissions/approval, source/cycle
   duplication, stale preview and publication restrictions with separate fixtures.
7. To prove rollback, first `dry-run plan.json preview-after.json`, bind its
   current previewHash and `TEST_IMPORT_APPROVAL=APPROVE_ROLLBACK`, keep matching
   plan/recovery/mutation gates, then `rollback plan.json` and `reconcile plan.json`.
   Check UPDATE restoration or CREATE archival and retained superseded evidence.
   Repeat rollback and confirm zero writes. A downstream dependency or content
   edit must block rollback; follow reviewed recovery rather than forcing it.
8. Prove PostgreSQL advisory/row locks, concurrent identity/role revocation,
   Serializable collision behavior, injected transaction failure and worker
   Outbox processing in an approved disposable environment. Sanitize evidence.

Unproven acceptance: real insert/update/retry/rollback and SQL/locking semantics,
DB-backed orphan/provenance checks, read-after-write UI, backup recovery and Outbox
delivery. Next separate source task: M10-12, University QC/mapping queue.
