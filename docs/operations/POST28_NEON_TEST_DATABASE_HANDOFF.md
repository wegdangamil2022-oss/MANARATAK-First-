# MANARATAK 2.0 — Post28 Neon testing environment handoff (NON-SECRET)

**Checkpoint:** 2026-10-16  
**Scope:** TESTING ONLY — provisioned metadata and read-only connectivity; no migrations, import, application runtime, database test execution, or production approval.  
**Source of truth for IDs:** `config/testing/post28-neon-target.json` on the Git branch named below.

## Current continuation — R02-core / R03

The 2026-10-16 continuation implements a **read-only** Neon adapter, with source tests, at [POST28_NEON_READ_ONLY_PREFLIGHT.md](POST28_NEON_READ_ONLY_PREFLIGHT.md). Earlier statements below that remote guard adaptation is NOT IMPLEMENTED describe the original setup checkpoint. Remote **mutations remain blocked**, including with legacy CI flags. Codex secrets/TCP access remain unconfigured; the owner role is privileged and unsuitable for runtime suites. MCP read-only SQL succeeds, but its SQL session reports TLS=false and does not establish direct Prisma TLS. R02-core is PARTIAL; R03 is BLOCKED.

The current user instruction authorizes scoped repairs and targeted tests; it supersedes the old Luna/manual-model-switch protocol quoted below. No additional infrastructure, migration, seed, destructive suite or deployment is authorized by this continuation.

## 1. Stable repository-to-database mapping

| Item | Verified value |
| --- | --- |
| GitHub repository | `wegdangamil2022-oss/MANARATAK-First-` |
| Git work branch | `fix/post28-ci-environment-inventory-20261016` |
| Neon project | `manaratak-testing` |
| Neon project ID | `lively-feather-03681988` |
| Neon validation branch | `post28-validation` |
| Neon branch ID | `br-patient-recipe-bahs1ix7` |
| Database | `manaratak_test` |
| PostgreSQL | 16 (server returned 16.15 at setup) |
| Neon region | `aws-eu-central-1` — Frankfurt |
| Parent Neon branch | `main`, blank test project; **not a MANARATAK production database** |
| Authentication/authorization | **NOT CONFIGURED in Codex** |
| Migrations, seed, source parity, application runtime | **NOT RUN** |

A read-only query, pinned explicitly to the Neon project ID, database branch ID, and database name, returned `current_database() = manaratak_test` and zero application tables in `public` on 2026-10-16. This does **not** prove that Codex has network access or credentials, nor that PostgreSQL migrations are safe to run.

**Do not confuse Git branches and Neon branches.** Changing Git branch does not change the Postgres connection automatically. The mapping is discoverable by reading this file and the JSON registry; the real connection and permissions must be provisioned separately.

## 2. New ChatGPT/Codex session: one-branch handoff

Provide the Git branch name `fix/post28-ci-environment-inventory-20261016` and repository `wegdangamil2022-oss/MANARATAK-First-`. Then the operator/assistant MUST:
1. Fetch that exact Git ref and inspect `config/testing/post28-neon-target.json` and this handoff before choosing a DB target.
2. Reconfirm Neon project/branch IDs and database name **with authorized access**, never select a default project/branch implicitly.
3. Verify safe Cloud environment credentials and egress/connection capabilities without printing the connection string.
4. Respect the current Post28 acceptance plan R00–R14 and its scope, evidence policy, identity guards, and source SHA.
5. If credentials are unavailable or any identity/safety check fails, return `BLOCKED`. Do not guess connection strings or substitute localhost/another database.

When using another email/ChatGPT account, that account also needs explicit repository access, an authorized Neon project grant/connection, and its own Codex environment setup or legitimately shared environment. A branch name is a **locator, not authentication**. Do not send passwords, tokens, or DB URLs in chat, Git, reports, or email.

**Prompt for a future session:**  
> افتح مستودع `wegdangamil2022-oss/MANARATAK-First-` على الفرع `fix/post28-ci-environment-inventory-20261016`. اقرأ `config/testing/post28-neon-target.json` و`docs/operations/POST28_NEON_TEST_DATABASE_HANDOFF.md`. تحقق من اتصال Neon بشكل آمن ومن حواجز العزل، وابدأ من بوابة R00/R02 المصرح بها، ولا تشغّل أي ترحيل أو اختبار مدمر دون تحقق الهوية والموافقة. Luna للفحص فقط؛ عند أول خطأ توقّف حتى أنتقل يدويًا إلى Sol 6.1 Medium للإصلاح.

## 3. Mandatory setup still outstanding

- In Neon **Connect**, explicitly choose the project/branch/database listed above. Obtain the connection parameters privately. Do not paste them into conversations or commit them.
- Configure `DATABASE_URL` and `DIRECT_URL` as private secrets of the intended Codex execution environment. Prisma schema declares both. Verify which one is pooled vs direct under current migration tooling; never assume one URL is safe for every operation.
- If a different ChatGPT/Codex login will run tests, grant its user access with Neon project-level permissions or configure an authorized credential in *that* environment. GitHub access alone does not confer Neon access.
- Create separate non-privileged application/test/migration roles with narrow grants as required by R03 before any mutable operation. At initial setup only the database owner role existed.
- **Neon is remote.** `scripts/lib/disposable-database-target-guard.mjs` currently permits disposable mutations only on loopback, unless explicitly CI-remote-approved; existing DB mutation gates also demand precise target identity/authorizations. Do not change `CI` or set approval flags simply to bypass this. Propose and test an explicit Neon-specific, least-privilege safe-target proof before allowing remote writes. Failure to establish safe proof means `BLOCKED`.
- R03/R04 explicitly require isolation of target/shadow. A long-lived `post28-validation` branch is a **reference/baseline**, not blanket permission to run destructive tests on it. Create a separate, named, identity-verified disposable Neon test branch/database for each destructive DB-G/DB-S/DB-U/DB-T/DB-E/DB-R/DB-L role, where applicable. Never alias target and shadow, and never use the Neon default branch as the test target. The acceptance plan's restore role/sentinel and other isolation requirements still apply.
- Apply schema migrations, baseline seed, all test fixtures, and runtime/web/admin smoke only after their respective approved gates. `db:provision`, `db:greenfield:verify`, `prisma db push`, `migrate reset`, and restore/drill operations are **not** a connection check and must not be run merely because Neon reports READY.
- Before actual testing, establish the intended deployment region, external dependencies (Redis, object storage, stubbed email/payment etc.), performance/storage budgets, and a secure evidence destination. Creating Neon did not configure these.

## 4. Luna → Sol incident escalation policy

- **Luna** performs read-only inventory, capability checks, and authorized non-destructive tests. At the **first real error, missing permission, failed test or guard**, halt the current batch, save a minimal reproducible redacted error report and exact Git SHA, and mark `BLOCKED` or `FAIL` accurately. Luna does **not** modify guards, migrations, schema, repository code, permissions, or retry mutations.
- The human changes to **GPT-6.1 Sol Medium**. Sol diagnoses and fixes only the scoped issue on a safe work branch and runs targeted relevant tests after authorization; database destructive changes still require their own approvals. Every fix must be auditable.
- After the fix passes, the human switches back to **Luna** to resume the documented Rxx checkpoint. No model may declare a source test to be real PostgreSQL E2E evidence.

## 5. Audit / version-control governance

Persist only identifiers, branch names, regions, statuses, schema-version, and non-secret contract references here. Store connection strings/passwords/API keys only in secure environment credential controls; do not print, upload, or commit them. Keep credentials separate from public Git metadata.

Any future Neon project migration, branch deletion/replacement, role change, or host rotation must update this registry on the appropriate Git branch and be corroborated through Neon. Never mistake stale registry data for proof of database identity. The registry does not authorize data deletion or production deployment.

**Recorded status:** Neon project CREATED; branch CREATED and READY; read-only SQL VERIFIED; empty database observed; Codex secret injection NOT CONFIGURED; remote disposable guard adaptation NOT IMPLEMENTED; migrations/seed/runtime tests NOT EXECUTED.
