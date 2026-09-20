# MANARATAK Current-State Manifest

> **Operational supersession notice (2026-09-06):** Recovery-era database instructions in this historical artifact are superseded by [`docs/operations/GREENFIELD_DATABASE_PROVISIONING.md`](../../operations/GREENFIELD_DATABASE_PROVISIONING.md). This file remains evidence/history and is not current database-operation authority.

Snapshot date: 2026-08-12

Status: `CURRENT MANARATAK SOURCE OF TRUTH LOCKED`

## Source Identity

- Project path: `C:\Users\HP\Documents\Codex\2026-08-12\new-chat\MANARATAK_CURRENT_2026-08-12`
- ZIP source: `C:\Users\HP\Downloads\manaratak (3).zip`
- ZIP SHA-256: `C44D19D0C35C9A7D3A3C10AD3502339D30C2C283827F58FBE99CDBCD94EF3B39`
- Project folder: `MANARATAK_CURRENT_2026-08-12`
- Git branch reference: `refs/heads/main`
- HEAD reference: `4276f01bb8e0e20bc363be9429e37c321d6054eb`
- Git integrity: `ARCHIVE GIT METADATA INCOMPLETE`
- Git note: the archive contains an unusable pack index (`.idx.bak`), so `git status` and commit object verification are unavailable. Git was not repaired or replaced.

## Authoritative Hashes

All hashes use SHA-256 and were captured before security containment edits.

| Artifact | SHA-256 |
|---|---|
| `packages/infrastructure/prisma/schema.prisma` | `33FFC508687FA39BDC471E038930EC7B4AB13229D1C5E73171081AEF3D895AEF` |
| `package-lock.json` | `C20DA6FE1C965FB43C2B8EC4D29CC3F9D98FB655E989A420C94C4087863E50D5` |
| `package.json` | `1C82E654D53C75AAC7EED81F8D779AFBE2D41E39222632EC400E986CBB4F1970` |

## Prisma Migration Inventory

1. `20260806172001_init_schema`
2. `20260809161800_add_administrative_region`
3. `20260810000000_add_degree_level`
4. `20260811191618_init_session_model`
5. `20260811210000_add_credential_model`

Migration files present: **5**.

Migration application status: `DATABASE RECOVERY POINT BLOCKED BY ENVIRONMENT`.
No database connection was available, so applied/pending status was not claimed.

## Source Baseline

| Counter | Value | Basis |
|---|---:|---|
| Prisma models | 63 | `schema.prisma` model declarations |
| Test files | 165 | `*.spec.ts` and `*.test.ts` under `apps/` and `packages/` |
| API source files | 66 | `apps/api/src` |
| Admin source files | 36 | `apps/admin/src` |
| Web source files | 98 | `apps/web/src` |
| MJR identities | 843 | Unique source IDs under `workspace/` |
| MAS identities | 1,116 | Unique source IDs under `workspace/` |
| DOC identities | 1,114 | Unique source IDs under `workspace/` |
| FEL identities | 329 | Unique source IDs under `workspace/` |
| International test source files | 56 | `workspace/import-sources/international-tests/unified-56` |

Database entity counters were not collected because no Development/Remediation database was available.

## Important Runtime Paths

- API composition: `apps/api/src/app.ts`
- Dependency registration: `apps/api/src/infrastructure/di/container.ts`
- Admin security middleware: `apps/api/src/presentation/security/SecurityMiddlewareFactory.ts`
- Authentication API: `apps/api/src/presentation/api/router/AuthRouter.ts`
- Authentication service: `packages/application/src/auth/AuthService.ts`
- Persisted authorization evaluator: `packages/domain/src/authorization/services/AuthorizationEvaluatorService.ts`
- Web login: `apps/web/src/features/auth/LoginPage.tsx`
- Web routing: `apps/web/src/router/index.tsx`
- Admin application gate: `apps/admin/src/App.tsx`
- Admin API client: `apps/admin/src/api/client.ts`
- Admin bootstrap: `scripts/bootstrap-admin.ts`
- Prisma schema: `packages/infrastructure/prisma/schema.prisma`

## Application State Before WP-1 Containment

- API: source present; dependencies absent; build/tests not run.
- Web: source present; contained hardcoded credential prefill and demo Admin bridge paths.
- Admin: source present; accepted `admin-demo`, `demo-unlocked`, and local bearer-token UI authority.
- Admin API: persisted permission guards were wired, but the default demo guard could create `admin-root` without authentication.
- `/auth/me`: returned persisted roles/permissions but also synthesized `admin:*` from role names.
- Project Owner routing: could silently route a successfully authenticated owner to a Student path when `/auth/me` failed.

## Recovery Status

- `DATABASE_URL`: not present in the current environment.
- `pg_dump`: not present.
- `psql`: not present.
- `node_modules`: not present.
- Database backup: `DATABASE RECOVERY POINT BLOCKED BY ENVIRONMENT`.
- Schema dump: `DATABASE RECOVERY POINT BLOCKED BY ENVIRONMENT`.
- Database migration status: `DATABASE RECOVERY POINT BLOCKED BY ENVIRONMENT`.
- Database restore smoke test: `DATABASE RECOVERY POINT BLOCKED BY ENVIRONMENT`.
- Source recovery point: the received ZIP plus the hashes in this manifest.

No database was created, reset, migrated, or modified while producing this manifest.

## WP-1 Containment State

- Admin runtime authentication mode: `strict` in every environment.
- Admin identity source: verified access-token identity only.
- Admin authorization source: persisted role assignments and persisted role permissions only.
- Unauthenticated Admin result: `401`.
- Authenticated principal without the required persisted permission: `403`.
- Demo Admin bypass: removed from API, Web, and Admin runtime paths.
- Automatic `admin-root` fallback: removed.
- Synthetic `/auth/me` permission grants based on role names: removed.
- Login credential prefill and quick-fill credentials: removed.
- Owner routing: requires a successful `/auth/me` response with an effective Admin permission; failures remain denied and visible.
- Owner RBAC database state: `DATABASE RECOVERY POINT BLOCKED BY ENVIRONMENT`; no owner record was created or changed.
- Focused test execution: `TEST EXECUTION BLOCKED - DEPENDENCIES NOT PRESENT`.

## Conditional Transition Exception

- WP-1 source state: `CLOSED`.
- WP-1 security containment: `CLOSED`.
- WP-1 database recovery evidence: `DEFERRED - EXTERNAL RUNTIME DEPENDENCY`.
- The original Development Database cannot be accessed from the current local Codex environment.
- The original Development Database exists in the external Google Studio environment and will become available only after the current source has progressed far enough to run there.
- The current source ZIP is locked as the recovery source, and its SHA-256 fingerprint is recorded in this manifest.
- Security containment is closed with no known runtime demo Admin bypass remaining.
- Conditional progression is authorized for `WP0 ONLY`.
- Prisma migration application, destructive schema changes, data backfill, data cleanup, canonical ID regeneration, relationship migration, database reset, bulk data transformation, and every operation requiring rollback of real data remain prohibited.
- Before the first work package that requires an actual Schema or Data Migration, execution must stop and the `WP-1 DATABASE RECOVERY GATE` must be closed against the original Development Database.
- This exception is not a full WP-1 pass.

## WP0 Closure and WP1 Source-Only Transition

- `WP0 SOURCE REMEDIATION = CLOSED`
- `WP0 RUNTIME VALIDATION = DEFERRED - GOOGLE STUDIO RUNTIME REQUIRED`
- `WP1 SOURCE-ONLY WORK = ALLOWED`
- `DATABASE MUTATIONS = BLOCKED UNTIL WP-1 DATABASE RECOVERY GATE IS CLOSED`

The deferred WP0 runtime validation must be repeated in Google Studio against its real runtime configuration. This includes the authenticated Admin payload and cache checks, network-request and duplicate-request measurements, route/chunk loading behavior, API health/readiness behavior, and regression checks for the WP0 source remediations. This transition authorizes source inspection and reversible source-only remediation in WP1; it does not authorize Prisma migration application, schema mutation, data migration, backfill, cleanup, reset, or bulk data transformation.
