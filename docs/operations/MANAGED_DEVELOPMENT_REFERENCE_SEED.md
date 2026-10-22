# Managed development reference bootstrap

This profile prepares and applies only the reviewed currency, language and country
sources in `greenfield-seed.manifest.json` (168 / 260 / 194). It does not complete
the full required seed set, import scholarship catalogs, bootstrap an administrator,
authorize production, or change the local R04 profile.

## Boundaries and authorization

The operator records the project owner's delegated development-bootstrap authority
in a private configuration, bound to the exact clean source SHA, schema SHA256,
manifest SHA256, all three source hashes, a UUID run ID, and a maximum three-hour
expiry. `approval.kind` is `MANAGED_DEVELOPMENT_REFERENCE_SEED`, environment is
`development`, authorization is `DELEGATED_PROJECT_OWNER_REFERENCE_BOOTSTRAP`, and
`independent` must be true. `target` pins projectId, branchId, host, database, role,
and databaseOid from the independently provisioned target. This configuration is an
operator authorization record; it is not an independent review or a P7 receipt.

The old Neon project is explicitly excluded. The direct endpoint must match the
approved target, use strict TLS and the restricted application role. Read-only
live identity checks reject DDL privileges, relation ownership, privileged role
membership, invalid indexes, unvalidated constraints and migration-ledger access.
A retained passing read-only schema comparison must bind the same project/branch
and unchanged schema/migration files in source history. Project/branch identity
comes from the prior provisioning evidence; this command does not claim a new
provider API identity check.

Neon's proxy can terminate TLS before the PostgreSQL backend. Preserve the actual
`pg_stat_ssl` values in the identity receipt; do not relabel them. Independently
negotiate PostgreSQL SSLRequest with the exact approved endpoint and require a
trusted certificate/hostname and TLS 1.2 or 1.3. Retain that transport receipt,
while the Prisma URI must still enforce strict TLS. The wire request follows
[PostgreSQL 16 SSLRequest](https://www.postgresql.org/docs/16/protocol-message-formats.html#PROTOCOL-MESSAGE-FORMATS-SSLREQUEST).

## Private configuration and execution

Set `MANAGED_REFERENCE_SEED_CONFIG` to an absolute private JSON file outside the
checkout. It contains `approval`, `schemaProof` (absolute path to that comparison
receipt), and `scanner: { executable, sha256 }`. On Windows its parent directory
must have protected ACL inheritance with only the current user and optionally
LocalSystem allowed. POSIX modes must exclude group/other access.

The current adapter requires Windows, a hash-pinned Microsoft-signed Defender
binary, an enabled engine and signatures no older than 72 hours. It performs
bounded custom file scans with remediation disabled; a zero exit status alone
does not mean clean. Source bytes must remain unchanged. JSON must be canonical
UTF-8, an array of at most 1000 rows and at most 10 MiB. Bucket/path containment
rejects traversal and symbolic links/junctions. No installation or protection
settings are changed.

Use Node 22 and the restricted application `DATABASE_URL`, with
`sslmode=require&sslaccept=strict` and a trusted CA file through `sslcert` where
needed. The command rejects other environments, TLS overrides and duplicate or
unknown connection options. Keep all credentials outside Git and terminal output.
An optional `pool_timeout=30` allows a bounded 30 seconds for pool acquisition;
zero, unbounded or other values are rejected. The operator eagerly connects before
its first privilege query and obtains fresh transport evidence afterward. This
separates initial connection setup from Prisma's lazy first-query pool acquisition,
which was observed failing at its default 10 seconds before any write.

1. `npm run db:seed:managed-references -- preflight` performs only file scans and
   database reads, and retains identity/scan evidence in the private directory.
2. Review that evidence and the current source. For `apply`, also set the standard
   database mutation gate to the exact development target and purpose `seed`.
3. `npm run db:seed:managed-references -- apply` checks preflight again before any
   database write. Only initially empty reference targets are accepted.
4. Remove write-gate variables after the operation. Retain the configuration,
   active source assets, scanner evidence and state together; do not delete them
   while their database references remain in use.

## Durable owner workflow and recovery

Actual canonical packets enter the existing Assets lifecycle: verified upload,
pre/post malware scanning, JSON sanitation and checksum-bound ACTIVE/CLEAN
promotion. Reference source artifacts are INTERNAL/PERMANENT retained provenance;
this classification does not apply to student PDFs. Local storage is private and
development-only; it does not establish durable production storage or backup.

Every row uses the real P6 dispatcher-created screening receipt and P7 owner
preview, review and apply. Canonical mutations, review state, Audit and Outbox
remain atomic through existing application services. Reviewed language aliases
use the existing separate audited owner command. No direct canonical upsert or
fabricated receipt/approval row bypasses these services.

Successful completion requires exact reference counts, 622 APPLIED reviews,
matching expected Audit/Outbox counts, actual scanner receipts, and unchanged
student/certificate/financial/payment/wallet/ledger table fingerprints. Checkpoints
are fsynced after every row and each source. An interrupted or previously
started run fails closed on the next `apply`: inspect the private state and real
database receipts before preparing an explicit recovery change. Never clear the
state file, change the run ID, truncate reference tables, or rerun blindly.

For an interrupted run, refresh the delegated authorization against the new clean
SHA with the **same run ID**, retaining the old authorization. `inspect-recovery`
only reads the database and writes a private recovery candidate containing the
checkpoint hash and live reference/asset/receipt/review/Audit/Outbox fingerprints.
Review the actual partial state, then copy that candidate to `config.recovery`
with kind `DELEGATED_REVIEWED_SAME_RUN_RECOVERY`. `resume` requires the normal
mutation gate, unchanged live fingerprints and protected rows, and source ancestry.
It retains the previous checkpoint in an exclusive recovery-start receipt and
takes an exclusive operator lock. Existing ACTIVE assets must still match their
owner, reference and actual bytes and pass a fresh scan. Existing owner approvals
and APPLIED reviews retain their original reviewer/reason; the owner services
replay applied work without new Audit/Outbox effects. Pending non-ACTIVE assets
remain blocked for a separate lifecycle recovery. Private failure receipts retain
redacted error details; console output never prints database errors or credentials.

The managed operator client allows 10 seconds to acquire a transaction and a
30-second interactive transaction budget. Actual Neon execution exposed Prisma
`P2028` at its default 5-second budget (5321 ms during owner screening verification).
This setting is scoped to this bootstrap client; it does not change application
defaults, remove locks, weaken assertions, retry failed transactions automatically,
or move canonical/Audit/Outbox writes outside their atomic boundary.
The existing unit of work also sets transaction-local server bounds before owner
commands: 10-second statements, 3-second lock waits and 30-second idle transactions.
These settings protect advisory locks if the client connection stalls; they are
not a claim that an intermittent network pause has been resolved. A separate
read-only 12-query probe measured 167–581 ms per warmed round trip, while a failed
owner transaction reported a 90-second elapsed gap. Preserve such failures and
inspect committed receipts before any reviewed recovery attempt.

Other required seeds (degree levels, academic taxonomy, provider registry and
student tools), administrator bootstrap, restore rehearsal, private student asset
storage and API/Web/Admin verification remain separate work. A passing reference
bootstrap is not production readiness or full R04/R06/R07 acceptance.
