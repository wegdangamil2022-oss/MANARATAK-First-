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
