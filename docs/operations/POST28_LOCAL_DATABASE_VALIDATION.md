# POST28 local database validation

Database hosting is independent of Google AI Studio. Application deployment on Vercel/Render will use an external PostgreSQL connection. The current rehearsal selects PostgreSQL 16 on disposable localhost infrastructure; it does not provision a cloud service or establish production compatibility.

## Order and isolation

1. Finish R01 source checks on a frozen commit.
2. R02-core: validate target declarations, suite discovery and negative guards.
3. R03: bootstrap separate DB-G/DB-S databases and limited roles on a fresh isolated instance. The bootstrap identity owns each database and its comment marker; migration/shadow roles must not own the database, inherit a privileged role, have global-write privilege or be server administrators. Public schema DDL is limited to the migration/shadow role. Application roles cannot create schemas or own the database.
4. Write a private, untracked environment file and a non-secret target contract outside the checkout. Each target records database name/OID, server system identifier, role/kind, host `127.0.0.1`, port, nonce, run UUID and source SHA. Set a bootstrap-owned database comment `POST28_DISPOSABLE:<runId>:<DB-label>:<nonce>`; do not add an auxiliary application table that causes Prisma parity drift.
5. Run `node scripts/database/post28-preflight.mjs --pair --require-empty` with the declared environment. All static declarations are validated before any connection. Identity queries use a READ ONLY transaction; target/server/role/marker checks must pass independently for DB-G and DB-S.
6. Only then execute R04 replay/catalog/parity. Do not apply on an existing user database or a restore reference. A NOT VALID constraint is a blocker until the specific orphan audit and separately reviewed validation have succeeded; no global catalog exception is introduced.

The env file supplies `NODE_ENV=test`, `POST28_ISOLATED_EXECUTION=YES`, `DATABASE_TARGET_CLASS=DISPOSABLE`, `POST28_TARGET_CONTRACT_FILE`, `GREENFIELD_DATABASE_URL`, `GREENFIELD_SHADOW_DATABASE_URL`, and the two `GREENFIELD_*_DATABASE_IS_DISPOSABLE=true` flags. Authenticated URLs belong only in the private env file. Source commands and evidence do not print them. A contract is local lab input, never production/recovery authorization.

The existing database mutation gate must also approve purpose `migrate` for the declared DB-G target (and `maintenance` for a DB-T suite). The greenfield script sets both DATABASE_URL and DIRECT_URL to the approved DB-G URL, preventing a stale direct connection from reaching another service. Prisma diff receives URLs through private Node argv / Schema Engine RPC, not OS command arguments. Catalog psql calls use environment credentials and default read-only transactions; stale libpq service/address settings are removed.

## Suite discovery and execution

`node scripts/database/post28-suite-discovery.mjs <assets|leases|persistence|sections123>` uses Vitest static discovery without importing test modules or running hooks. Its counts are source definitions, not expanded parameterized cases or runtime passes. The explicit config is `config/testing/post28-database-vitest.config.ts`; unknown profiles and zero/missing definitions fail.

After R04/R05 schema proof, create a separate DB-T contract/role and use `node scripts/database/run-post28-suite.mjs <profile>`. The runner verifies live identity and validated catalog before collection, supplies each suite's real opt-in environment, collects the actual expanded cases, then requires the exact same file/case set to pass with zero pending/skipped/todo/fail outcomes. Output directories are unique; no old result is reused. Legacy asset/section123 fixtures currently require the exact local `manaratak_eap_ci_test` database and `eap_ci` test connection; do not change their guard or point them at a different target to force execution.

Both the legacy DB config and the POST28 config install a global guard before test-module imports. DB-R, restore-named databases, production/live-named databases and restore-runner credentials are rejected, including alternate W3/DIRECT aliases. The legacy whole-platform harness now requires localhost AND a disposable name, and rejects restore/protected names. The restore CLI's old invocation of the destructive database suite therefore cannot validate a reference snapshot: a separate non-destructive measured verifier remains required for R10. No restore has been performed.

R02-coverage remains separate: launch markets, canonical teaching languages, DEC decisions, producers for browser/worker/load/recovery evidence and independent signing/recovery authorities require their planned work. Neither static discovery nor local target preflight closes those gates.

Create only new local resources with `NODE_ENV=test POST28_LOCAL_LAB_CREATE=YES node scripts/database/create-post28-lab.mjs` on clean committed source. The emitted state contains file paths and non-secret identities; load the private env file without printing it.

## Internal Docker network and loopback access

The lab keeps an internal Docker network with no external routing. Because Docker may ignore published ports on an internal network, the official creator starts `post28-local-forwarder.mjs`. It binds only `127.0.0.1`, resolves PostgreSQL port5432 from the exact new container ID, and checks the run/scope labels, running state, internal network membership and private address. It rechecks identity every5 seconds and stops on drift or after3 hours. No host networking, external endpoint, DNS alias, Docker policy change or database guard exception is used.

The private lab directory records its PID/config/log. Stop only that lab's forwarder when finished; preserve its database/evidence if a gate fails. A source fix requires a new frozen SHA and a new lab, rather than relabelling a previous target contract. The local preflight still authenticates migration/shadow roles through localhost and checks the live system identifier, OID and marker; forwarding does not grant database privileges.

The DB-G application role receives CONNECT/USAGE for read-only identity/grant inspection, with no blanket default table or sequence grants. Otherwise it would inherit DML on Prisma's migration ledger. Actual application fixtures belong on independent DB-T/E targets, with an explicit reviewed table grant list excluding the ledger; never use DB-G as a substitute.

## Scoped regression after a recorded failure

The official runner also accepts `run-post28-suite.mjs <profile> --case-exact '<suite > case>'`.
It still performs DB-T identity/catalog checks and full mandatory profile discovery, then
requires exactly one matching case identity. Vitest's skipped assertion results (counted as pending in its JSON totals) for the explicitly
unselected cases are checked against the complete discovery and recorded as exclusions,
not as executed successes. The selected case must pass with no skip/failure. This scoped
result never accepts the whole profile or R06. Freeze source and create a new SHA/run
contract after fixing code or a fixture; preserve the original failed report.

## Memory-backed R06 transaction lab

When persistent storage has no free space, the official creator accepts
`POST28_LOCAL_LAB_STORAGE=tmpfs` only with `POST28_LOCAL_LAB_PROFILE=transactions`.
It creates a new isolated PostgreSQL16 container with a bounded768MiB tmpfs data
mount, the same2GiB container limit, identities, limited roles, loopback forwarding
and target guards. The default remains a labelled persistent volume. Invalid
storage values and memory-backed upgrade/greenfield profiles fail before resource
creation. The lab state records `storage: tmpfs` and `volume: null`.

This is an ephemeral real PostgreSQL transaction test target. Container termination
loses the database; save safe runtime evidence first and do not use this mode to
claim R05 backup/restore, crash durability, R10 recovery or production storage
acceptance. Existing containers, databases and volumes are not removed to free
space. Private contracts/logs remain outside Git.
