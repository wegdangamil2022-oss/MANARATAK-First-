# R10 independent technical review — initial disposition

- Reviewer: delegated technical reviewer `/root/r10_independent_review`, separately assigned by the implementation agent after the owner's explicit authorization in this conversation. This is an AI technical review, not a human signature or a production authority attestation.
- Reviewed source: `1442a3c397b675f2d0947ef7333e53c2e1ba957b`, branch `feat/post28-r07-artifact-preparation`.
- Review method: source and contract inspection; retained preparation evidence inspection; offline pure-function probe. No database connection, restore, migration, or external provider operation was performed by this reviewer.
- Disposition: **REQUEST CHANGES BEFORE RESTORE**. The read-only verifier is a material improvement. Three identified authorization/transport/privilege issues must be resolved for the proposed local drill. No claim of a completed restore or R10 acceptance is made.

## Findings

### R10-IR-01 — P1: existing production-shaped authorization cannot be populated honestly from local evidence

`scripts/recovery/RecoveryPreflight.mjs:31–40` requires production database fingerprint, production hosts, and production server identity as well as the disposable target. The retained `restore-target-preparation.json` explicitly has `productionIdentityConfigured=false` and `authorizationSigned=false`. The contract cannot be satisfied by substituting random fingerprints, invented production server IDs, or test fixture hosts. The owner delegated project authority; this does not turn fabricated identities into evidence.

Required resolution: either provide genuine independently trusted deny identities for the existing contract, or introduce a separately identified, tightly bounded **local synthetic** contract. Keep the existing production-shaped validation intact; a local success must retain `productionAcceptance=false` and `formalR10Acceptance=false`.

The proposed separate scope `LOCAL_SYNTHETIC_LOOPBACK` is acceptable in principle only with all of these conditions:

1. An exact loopback address, freshly created disposable PostgreSQL cluster, known creation producer/run identity, actual server system identifier, resolved data-directory identity, exact source and target database names/fingerprints, and proof that those databases belong to this new run. A submitted manifest alone cannot establish these facts.
2. Source and target databases must differ; restore role must have access only to the intended disposable namespace. No existing database, arbitrary remote host, Neon, or production connection is admitted.
3. Authorization must bind exact source SHA, dump hash, asset-manifest hash, snapshot identity, expiry, local scope, target identity, and actual independent approval references. The local authority key must be pinned outside the submitted assertion. One signing authority may attest both actual approvals if the contract expressly defines that trust model; do not represent two strings as two cryptographic signers.
4. The actual owner authorization and this independent review must be distinguishable. This initial review does **not** approve unknown future code or authorize restoration before a final review disposition.
5. All input/hash/containment/freshness checks precede even sentinel SQL. Sentinel identity, role limits, and trusted TLS are checked before mutation and again after restoration. No automatic TLS downgrade or production-mode fallback.

### R10-IR-02 — P1: Prisma verification does not inherit the strict libpq connection contract

`run-whole-platform-restore-drill.mjs:87–96` supplies `PGSSLMODE=verify-full` to `psql` and `pg_restore`. However, line 142 constructs Prisma directly from `input.databaseUrl`; `RecoveryPreflight.mjs:8` rejects all URL query parameters and no Prisma TLS options or explicit SSL session check are supplied. The code therefore does not establish equivalent certificate and hostname verification for post-restore database reads. A server accepting plain connections can admit an unverified verification connection; a TLS-required server may instead reject the verification after mutation.

Required resolution: create a validated Prisma connection configuration with trusted CA and strict certificate/hostname checks, bound to the already authorized target. Do not permit arbitrary query parameters to bypass the identity contract. Prove successful verified TLS and failure for untrusted CA/wrong hostname in the local harness. Keep secrets and private keys out of evidence.

### R10-IR-03 — P1: sentinel privilege checks omit TRUNCATE and elevated role attributes

Both sentinel SQL expressions (`run-whole-platform-restore-drill.mjs:109,147`) test only `rolsuper`, `rolcreaterole`, `rolcreatedb`, and `has_table_privilege(...,'INSERT,UPDATE,DELETE')`. They do not reject `rolbypassrls`, replication privileges, inherited/membership paths to elevated execution, or sentinel `TRUNCATE`. A restore role able to truncate the independently owned sentinel violates the plan's requirement that it cannot write that sentinel, even when INSERT/UPDATE/DELETE are absent.

Required resolution: read and reject these actual effective privileges before restoration. Include `TRUNCATE` in sentinel immutability, reject BYPASSRLS/replication, and prevent role-membership escalation (or prove the isolated role has no such memberships). Retain a separately owned control schema and table; do not grant runner ownership or broad server administrative roles to make system-identity reads work.

Offline probe: the current exported `databaseSentinel` accepted an otherwise valid object with `bypassRls=true` and `sentinelTruncatableByRestoreRole=true`; these attributes are ignored. This probe called no SQL. One initial command-line quoting attempt failed to parse; the corrected stdin probe succeeded. No test assertion or implementation was modified for the probe.

## Positive evidence and bounded conclusions

- `DatabaseSnapshot.mjs:15–38` takes a read-only RepeatableRead measurement, sorts canonical row representations using C collation, hashes contents as well as counts, and includes columns, constraints, indexes, and sequence definitions/state. The table identifiers are quoted with embedded quote escaping. It does not delete or seed application data.
- `DatabaseSnapshot.mjs:42–52` compares actual database-derived identity and ACTIVE asset IDs/locators/checksums against the signed manifest. This replaces destructive suites and a fixture-only snapshot claim. Real preparation reports a 282-table/175-row synthetic snapshot, read-only-role write denial, and digest-change rejection with unchanged counts.
- I independently verified byte counts and SHA-256 for all **11** entries in the retained preparation `evidence-index.json` at source `b53ce95404a96ab1fbcb45d08cdb11aacfc7a9ee`. This verifies retained file integrity, not the result of a restore that has not happened.
- TOC filtering in `scripts/database/post28-backup-contract.mjs` preserves preprovisioned public schema and pg_trgm and rejects unexpected schema/extension declarations. It is not an SQL sandbox for arbitrary archive code. Use only the inspected, signed dump of the fresh synthetic source; do not generalize this permission to untrusted archives.
- CLI requires a data-derived snapshot before SQL and rechecks the independent sentinel after pg_restore. These are appropriate safeguards, subject to the findings above.
- Backup age above five minutes is rejected by `executeRestore` before restore. Resume must generate a **new actual** consistent backup and snapshot as required; do not relabel the old backup capture timestamp to make freshness pass.

## Explicit remaining limits

1. Source and target currently share one disposable cluster. The drill can demonstrate local database restoration; it cannot demonstrate server/region loss isolation.
2. Full row/table parity is not exhaustive SQL object parity: trigger/function/RLS policy definitions, grants, and non-public application schemas are outside the snapshot catalog identity. The current manifest openly scopes itself to public application tables. Do not call it complete security-policy recovery proof.
3. Sequence values are not a transactional event watermark; the source must be quiescent or be captured under an explicitly consistent dump/snapshot protocol. Retained before/after source identity is useful for this quiescent synthetic drill.
4. The file is an inert synthetic asset. Hash/reference parity does not prove PDF generation, EAP acceptance, protected delivery, or a provider object-store restore. A file already in the supplied directory is not by itself evidence of copying from an independent backup location.
5. `rpoMeasurementBasis=BACKUP_CAPTURE_TIMESTAMP_PROXY_NOT_RECOVERED_EVENT_WATERMARK` and `integratedServiceRtoMeasured=false` correctly preserve the distinction between structural restore and actual operational RPO/RTO. A structural PASS must not close RPO≤5m, integrated RTO≤60m, PITR30d, KMS/WORM/audit, or cross-region provider controls.

## Next independent review

Review the final implementation SHA and exact local authorization/harness evidence, including TLS and least-privilege negative cases, before approving the local restore. If the findings are corrected, the new target and fresh input files are positively identified, and the two actual approvals are recorded without invented authority, a local synthetic restore can proceed while production recovery remains unapproved.

## Follow-up source review — `15ed3d6e71bb7ce1ffbc9d3fe5663775d2fd7a26`

The initial REQUEST CHANGES above remains the historical disposition on `1442a3c`.

- **IR-01 addressed in source for the separate local scope.** `LocalRecoveryTarget.mjs` validates a signed, exact-SHA local assertion and separately pinned signed bootstrap creation assertion; requires `127.0.0.1`, the known source database, a distinct constrained restore namespace, producer/binary hashes, actual native-lab state/hash, resolved data-directory identity, server identifier, run ID, CA hash, and two distinct recorded approval roles. The existing production-shaped `recoveryTarget` remains in place. `POST28_R10_LOCAL_AUTHORITY_2026-10-20.md` accurately distinguishes actual owner delegation, independent reviewer, and a local authority attesting those decisions from fabricated human signatures.
- **IR-02 addressed in source.** `RecoveryConnection.mjs` pins the root certificate hash before SQL, constructs explicit Prisma `sslmode=require`, `sslaccept=strict`, and `sslcert` parameters for the previously validated target, and uses libpq `verify-full` with the same root. It removes inherited PG-prefixed connection redirects/options. `RecoveryPreflight.recoveryInputs` validates the signed CA hash before sentinel access; runtime does not permit caller-supplied URL query overrides.
- **IR-03 addressed in source.** The shared sentinel SQL now includes BYPASSRLS, replication, any other role membership, effective CONNECT access to other databases, TRUNCATE/TRIGGER/REFERENCES plus mutation grants, and CREATE permission on the independently owned control schema. `databaseSentinel` fails closed unless every unsafe flag is explicitly false.
- I reviewed the new focused unit cases without re-running unaffected suites. String/URL construction assertions alone do not establish a live TLS handshake or exact target privileges.

**Follow-up disposition: source changes acceptable for the stated local-only model; execution approval is still PENDING exact-target preparation evidence.** No new large source-level defect was identified. Before approval, the reviewer must inspect the actual fresh target, creation/producer evidence, real TLS positive and wrong-CA/wrong-host rejection results for both client paths, actual role/sentinel denial checks, and actual input/approval bindings. No database was accessed by this reviewer. Fresh backup capture must occur close enough to invocation to meet the unchanged backup-age guard; do not use a fabricated timestamp or broaden that guard.

## Final local disposition — 2026-10-20T14:47:42Z

**APPROVE_LOCAL_SYNTHETIC_RESTORE** for the exact target and source below, subject to the existing signed input and runtime guards. This is the independent technical decision requested by the owner delegate; it does not alter the initial rejected source disposition, approve production, or claim that a restore has already happened.

| Identity | Approved value |
| --- | --- |
| Reviewed execution source SHA | `bb86c6539dd28a7c7d24fc87076686e3259db8a3` |
| Scope | `LOCAL_SYNTHETIC_LOOPBACK` |
| Host and port | `127.0.0.1:49806` |
| Target database | `manaratak_restore_25b1069f5c519af8ec4bb1e054c8df56` |
| Target role | `manaratak_restore_runner` |
| Target fingerprint | `8193f68f7333dd6bb92177f5af2899b9bf2a4359c750e8cc50bc3512b2d64600` |
| Source database fingerprint | `4adf23274da63e2b4f8bdd431d8bc0021df74b5dcc5e4ebe618726659d870623` |
| PostgreSQL system identifier | `7698757869367514992` |
| Creator run ID | `71469a1e-b64a-45f6-8164-82cdb114cabd` |
| Lab directory | `C:/Users/HP/Documents/Codex/2026-10-17/files-pasted-by-the-user-17/work/native-pg16-JTNxRe` |
| TLS root certificate SHA-256 | `3f2b80d674cf10dbfdc993f775434d80b2b3e0722bba06fe2ed1b4c015f9ab91` |
| Pinned bootstrap public-key file SHA-256 | `2a13de46f6b07b293c5e4884437fe2f759af27d996d4659241af0cc4922851bd` |

Independent verification performed offline:

- Confirmed that execution SHA differs from the source-reviewed `15ed3d6` only in this review document; no execution code changed.
- Read the actual preparation harness `work/prepare-r10-reviewed-lab.mjs`, including fresh creator invocation, narrowly checked same-lab resumes, role provisioning, actual SQL used for role observations, positive TLS and negative CA/hostname/plaintext paths, asset copying, snapshot capture, and PID/binary-checked shutdown. Initialization failures and their targeted harness corrections do not constitute a successful restore and are not presented as one.
- Verified the creation envelope's Ed25519 signature against the separately read bootstrap public key; matched envelope payload to the target preparation, state-file hash, known producer hash, actual PostgreSQL binary hash, resolved data-directory identity, and TLS certificate hash. The envelope was unexpired at review (`checkedAt=14:37:27Z`, `expiresAt=15:37:27Z`).
- Validated the 282-table database snapshot identity and six physical backup asset hashes. Snapshot identity: `f45e87b1361b3291f07074fcd57b31c07e2e1bd85f8b4fbe3ca14c137daa2c39`.
- Inspected actual preparation results and their producing assertions: TLS enabled (`TLSv1.2`) through Prisma and verified libpq; wrong CA and wrong hostname rejected by each; plaintext rejected by PostgreSQL. These are harness-observed runtime results, not an independent new database connection by this reviewer.
- Passed the recorded actual role result through the corrected `databaseSentinel` function offline. All prohibited attributes, memberships, cross-database CONNECT access, and sentinel mutation flags are false. The preparation explicitly states these checks were observed by `post28_bootstrap`; the restore role has not yet queried the target. Actual restore-role sentinel checks remain mandatory before and after mutation.
- Verified recorded cleanup is stopped and restore was not executed. Source facts include certificate=1, certificate ledger=3, paid invoice=1, transactions=5, ledger entries=10, withdrawn CMS snapshots=2, document binding=1, outbox=49, and active assets=6. Their relevance is representative restored-state parity, not exhaustive workflow acceptance.

Reviewed safe evidence file hashes:

| File in the exact lab directory | SHA-256 |
| --- | --- |
| `reviewed-target.json` | `bbec28d258f6cb4c3a3ac09600581852d894f4a9e10321d5453e501363b3aba2` |
| `creation-envelope.json` | `06fc0de447fbac34c9d4e24acc602238cdcf1ed358c75a409306438ed9eaaef6` |
| `reviewed-cleanup.json` | `296eabeb237ee1196cf15d9364cf10819d3f5cea95548e9a8751e1e0273bc69e` |
| `source-files.json` | `08e487d5dbbfb24f171de55b434102833afa6a2cb8ad96df309933a75bb851f7` |
| `source-snapshot.json` | `1f5d5b7526c492f30518b7442bcf470847e1bb3df9acefb3fc41c28fedc1afef` |

Execution conditions: restore only into this target; first verify the same real lab/server identity when restarting it. If restart changes the state-file hash or the envelope expires, the bootstrap authority must recheck and attest the same actual identity with a fresh check/expiry; it must preserve the original creation history. Take an actual fresh consistent dump and manifest, bind their hashes and this approval's recorded hash into the local authorization, and leave the backup-age, source-SHA, TLS, file-containment, role, and sentinel checks enabled. Any different target, execution-code change, or newly failed guard requires renewed review rather than reusing this approval. No synthetic replacement production identity, invented human signature, or manually written successful restore receipt is authorized.

No production data/host, existing unrelated database, provider effect, migration-history change, deployment, or main merge is approved. Structural local success must keep `productionAcceptance=false`, `formalR10Acceptance=false`, and the previously stated RPO/RTO/PITR/provider limitations. This reviewer has read no private/env key files, made no database connection, and executed no restore.

## Post-restore evidence review — approved local execution completed

The implementation agent executed the authorized local drill at `bb86c6539dd28a7c7d24fc87076686e3259db8a3` on the exact approved target. I reviewed its results offline, including `work/execute-r10-reviewed-restore.mjs`; I did not execute the harness, repeat tests, connect to PostgreSQL, or read private keys/env files.

**Disposition: LOCAL STRUCTURAL RESTORE VERIFIED IN THE RECORDED SCOPE.** The evidence supports recording the local structural portion of R10 as completed. It supports no production recovery or operational SLO acceptance.

- Actual CLI result: `PASS`, `structuralRestorability=true`, `scope=LOCAL_SYNTHETIC_LOOPBACK`; start `2026-10-20T14:50:46.525Z`, completion `2026-10-20T14:50:53.657Z`.
- Verified the actual restore authorization Ed25519 signature with the retained public key, dump and manifest file hashes, independent decision hash binding, snapshot identity, and snapshot/source SHA consistency. No dump or manifest was accepted merely from a claimed ID.
- The database parity result includes **282 public tables** with original snapshot digest `f45e87b1361b3291f07074fcd57b31c07e2e1bd85f8b4fbe3ca14c137daa2c39`; all **six physically copied restored asset files** match their manifest hashes. I independently rehashed the retained dump, manifest, and restored asset files offline.
- Source and restored facts match: certificate=1; certificate ledger=3; paid invoice=1; transactions=5; ledger entries=10; withdrawn CMS snapshots=2; document binding=1; outbox=49; ACTIVE assets=6. The full row snapshot parity, rather than these counts alone, is the stronger preservation evidence. The source remained unchanged before/after dump and after restore according to the harness's actual snapshot assertions.
- The actual restore-role sentinel result retains the exact server/database/fingerprint/run identity and has every excessive privilege flag false. The harness repeats corrected sentinel checks after restoration; no destructive application suite was used to verify the restored snapshot.
- Six negative preflight probes reject remote target, privileged role, single approval, corrupt dump, corrupt asset, and wrong trust root with **zero SQL callbacks and zero mutations**. These are controlled callback-counted preflight probes, not six failed database restores.
- Restart evidence preserves original lab creation timestamp, matches actual system identifier/binary/data-directory/CA identities, and records that the existing creation attestation was still valid. Cleanup records a safely stopped lab, actual restore invocation, and no unrelated existing database touched.

| Retained evidence file | SHA-256 |
| --- | --- |
| `reviewed-restore-result.json` | `036495059cc7fa3f7b69de8aed4c9ff82fb2b397de29f16bed3abfbe8e4e5114` |
| `reviewed-restore-verification.json` | `17392f14c34a3a919fa117714dca3c45023dac821074356667b2996f613ab989` |
| `reviewed-preflight-negative.json` | `de96b3c6402712ef43387748b39198f1b86243265768934974b87973da8553aa` |
| `restart-identity-check.json` | `58b886dc5b415882c134e012c9eb8a023a0cc330bb1e2ef33dbbcc3ec5a3bbc5` |
| `reviewed-restore-cleanup.json` | `3bbcb6360c93cb03a8b266e69a89ecd5a4c7edd4aa159caea6be85bb77337e28` |

The reported **7.132 seconds** is database drill elapsed time; **1.665 seconds** is backup-capture-age proxy. Neither is integrated service RTO or recovered-event RPO. API/Web/Admin were not booted against the restored state in this drill; no fresh EAP scan, protected delivery test, PITR, managed provider retention, WORM/KMS/audit, or cross-region recovery was performed. The same-cluster source/target topology remains local structural evidence. `formalR10Acceptance=false` and `productionAcceptance=false` remain correct. This addendum does not modify the previously recorded approval JSON or retrospectively change its hash.
