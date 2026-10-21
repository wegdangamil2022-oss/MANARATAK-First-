# POST28 R03 — Neon G/S provisioning checkpoint (2026-10-16)

**Scope:** Provisioned database resources, privilege introspection, non-destructive reads only. **NOT** R03 acceptance or R04 migration authorization.

## Verified target identities (non-secret)

- Neon project: `lively-feather-03681988`, `manaratak-testing`, Frankfurt `aws-eu-central-1`, PostgreSQL 16.15.
- Frozen parent/reference: `post28-validation` / `br-patient-recipe-bahs1ix7`; **untouched**.
- **DB-G:** branch `post28-r03-db-g-20261016` / `br-raspy-shadow-ba33tmh3`, endpoint `ep-red-king-baoyw96q`, direct hostname `ep-red-king-baoyw96q.c-8.eu-central-1.aws.neon.tech`, separate database `manaratak_post28_greenfield_test`. Status `ready`.
- **DB-S:** branch `post28-r03-db-s-20261016` / `br-round-dew-bahzpr4x`, endpoint `ep-tiny-recipe-ba15g3br`, direct hostname `ep-tiny-recipe-ba15g3br.c-8.eu-central-1.aws.neon.tech`, separate database `manaratak_post28_shadow_test`. Status `ready`.
- Read-only SQL on both new targets: application public table count **0**, PostgreSQL **16.15**, separate branch IDs, endpoints, and database names.

## Roles

API-created roles `post28_migrator`, `post28_app` (DB-G branch), and `post28_shadow` (DB-S branch) **ARE UNSAFE**: Neon API initialized them with `CREATEDB`, `CREATEROLE`, `REPLICATION`, `BYPASSRLS`, and `neon_superuser` membership. Attempts to revoke that membership and to set `NOLOGIN` with the available SQL owner session failed with permission denied. **Never use or store credentials for these roles.** They require independent console/provider-admin remediation/removal before R03 final approval.

SQL-created role substitutes, independently verified:
- DB-G: `post28_g_migrate_limited` (`LOGIN`, `NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT`), `CONNECT` on DB-G; `USAGE, CREATE` on its `public` schema; not DB owner and no `CREATE` on database.
- DB-G: `post28_g_app_limited` (same negative global flags), `CONNECT` on DB-G; `USAGE` on schema but **no `CREATE`**. No app table privileges yet because no tables exist.
- DB-S: `post28_s_shadow_limited` (same negative flags), `CONNECT` on DB-S, `USAGE, CREATE` on schema.
- All three limited roles verified with `rolcreatedb=false`, `rolbypassrls=false`, `pg_has_role(role,'neon_superuser','member')=false`, and scoped schema privilege checks.
- These SQL-created LOGIN roles have **not** been provisioned with user-managed passwords/secret injection or tested as independent authenticated clients. Do not treat owner-session `has_*_privilege` lookups as a genuine direct-role/TLS connection test.

## Unfinished gates

1. Securely establish password authentication/Neon API credentials for only the limited roles without exposing secrets, and grant precise TCP egress to both **direct** hosts in the Codex execution environment.
2. Run provider-attested branch/endpoint/DB/role/UUID/source-SHA identity read-only preflights using authenticated limited role sessions and **verified TLS**; reject all aliases, privileged roles and baseline.
3. Remediate the three overprivileged API-created roles through an authorized Neon administrative interface. Confirm they cannot be used, or have been deleted safely, before R03 acceptance.
4. Verify required DB-G/DB-S target declarations, no shadow alias, source and migration digests, Prisma direct URL semantics and roles/default privileges/ACL negatives. Existing remote mutation block remains in force.
5. Other R03 dependencies (Redis/storage/provider stubs/approved resources) and R00/R01/R02 decisions remain separate. Approve R04 explicitly before any migration.

**No** Prisma migration, seed, tables, runtime DB suite, destructive SQL, production access or main merge was performed. `R03=PARTIALLY_PROVISIONED/BLOCKED`, `R04=NOT_EXECUTED`, `production=NO_GO`.
