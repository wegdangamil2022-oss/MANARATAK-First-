# POST28 R02-core: local database guards and discovery

Parent source: `15cf903313fe6f4702e183702c03a00dc09bae2e`. R01's frozen local 33-source-gate run and exact test evidence remain under that SHA; they are not relabeled as results for this change.

The user authorized continuing checks and fixes without model handoffs, and clarified that the future database is external to Google AI Studio, with Vercel/Render application deployment. This work prepares an isolated PostgreSQL 16 rehearsal. It does not provision external hosting or approve production compatibility.

Implemented:

- Source-SHA-bound local target declarations; distinct target/shadow by physical identity and normalized loopback/database identity; independent live server system identifier, DB OID, bootstrap-owned comment nonce, authenticated/session role and UTC/version checks. Elevated role flags, privileged memberships, global writes and database ownership/create privilege are refused. Application schema DDL is refused. Identity SQL runs in a READ ONLY transaction, which is checked from PostgreSQL itself.
- A labelled, fresh Docker PG16 lab creator with an internal network, loopback-only port, private random credentials, new volume, limited migration/shadow/application roles and distinct DB-G/DB-S. It refuses dirty source, missing explicit local-creation flag and production/staging mode. Creation does not apply application migrations or seeds. Credentials are written outside the checkout with restrictive permissions and are never printed.
- Explicit assets/leases/persistence/sections123 suite profiles. Static discovery does not import modules or execute DB hooks. Runtime execution requires DB-T identity and validated catalog, gathers expanded cases before execution, then requires the identical file/case set with zero missing/pending/skipped/todo/failed outcomes and positive counts. Reports use fresh directories.
- A global guard on both DB configurations rejects production/live/restore targets and DB-R before test-module imports. A real inert Vitest subprocess regression proves that a protected target prevents even importing the fixture module. The old whole-platform harness now requires localhost AND a disposable name. Source unit discovery excludes real DB suites explicitly and cannot pass with zero tests.
- Greenfield replay now calls the shared pair/empty-target preflight. Both DATABASE_URL and DIRECT_URL are set to the approved DB-G target. Prisma diff receives authenticated URLs through private JS argv/Schema Engine RPC instead of OS arguments; an actual child-process regression proves the URL appears only in JS argv. Catalog psql reads receive credentials through environment and use read-only transactions; stale libpq service/address settings are removed.

The source-only tests exercise rejection before connections, alias detection, role/identity changes, read-only probes, NOT VALID/invalid-index refusal, case-count/skip forgery and lab authorization. Final evidence is recorded under the resulting commit's `R02-core-final/` directory in workspace scratch. Static definitions are assets32, leases2, persistence4 and sections12312; parameterized runtime cases are deliberately not presented as executed database tests.

Remaining boundaries:

- R04 still must execute migration replay, ledger/checksums, catalog and schema diff against the real isolated targets. A NOT VALID constraint remains a real blocker until its orphan audit and reviewed validation; no exception or historical migration edit was added here.
- The recovery CLI still needs a non-destructive data-derived snapshot/asset verifier for R10. Its legacy destructive DB suite now fails before importing tests on DB-R; no restore was run and no restoration acceptance is claimed.
- R02-coverage, canonical teaching-language/market decisions, browser/worker/load/recovery producers, independent signing/recovery authority and full remote CI remain open. R03 may prepare the initial DB-G/DB-S targets; it does not close all of R02 or grant promotion eligibility.

Operational usage: [local validation runbook](../operations/POST28_LOCAL_DATABASE_VALIDATION.md).
