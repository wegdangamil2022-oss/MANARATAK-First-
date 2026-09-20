# MANARATAK WP-1 Execution Report

Execution date: 2026-08-12

Scope: Work Package -1 only.

## Current State

- Manifest: `docs/remediation/wp-minus-1/CURRENT_STATE_MANIFEST.md`
- Source identity: `CURRENT MANARATAK SOURCE OF TRUTH LOCKED`
- Git integrity: `ARCHIVE GIT METADATA INCOMPLETE`
- Prisma schema SHA-256: `33FFC508687FA39BDC471E038930EC7B4AB13229D1C5E73171081AEF3D895AEF`
- `package-lock.json` SHA-256: `C20DA6FE1C965FB43C2B8EC4D29CC3F9D98FB655E989A420C94C4087863E50D5`
- `package.json` SHA-256: `1C82E654D53C75AAC7EED81F8D779AFBE2D41E39222632EC400E986CBB4F1970`
- Database backup: `DATABASE RECOVERY POINT BLOCKED BY ENVIRONMENT`
- Schema snapshot: `DATABASE RECOVERY POINT BLOCKED BY ENVIRONMENT`
- Migration application status: `DATABASE RECOVERY POINT BLOCKED BY ENVIRONMENT`
- Database restore smoke test: `DATABASE RECOVERY POINT BLOCKED BY ENVIRONMENT`
- Recovery point: received ZIP plus manifest hashes.

Reason: no `DATABASE_URL`, `pg_dump`, `psql`, or installed project dependencies were available. No database or tooling was created.

## Security Containment

| Control | Before | After |
|---|---|---|
| Demo Admin bypass | Runtime accepted demo flags and a local shortcut | No runtime demo bypass remains |
| Automatic Admin principal | Unauthenticated fallback could create `admin-root` | Removed; a verified access-token identity is required |
| `/auth/me` permission integrity | Role names could synthesize `admin:*` | Effective permissions come only from persisted role permissions |
| Login credentials | Quick-fill included hardcoded email/password values | Empty fields and a non-sensitive placeholder only |
| Admin client authority | Local/static/environment bearer fallbacks | Current authenticated access token only |
| Owner routing | Role names and silent `/auth/me` failure could influence routing | Successful `/auth/me` plus effective Admin permission is required |
| Unauthenticated Admin request | Could pass through the demo guard | `401 ADMIN_AUTH_REQUIRED` |
| Authenticated principal without permission | Permission guard applies persisted RBAC | `403 ADMIN_PERMISSION_DENIED` |

Project Owner persisted RBAC status: `DATABASE RECOVERY POINT BLOCKED BY ENVIRONMENT`.

The source path `Identity -> RoleAssignment -> Role -> Permissions` is now the only authority path. Database availability is required to prove or bootstrap the Owner assignment; no principal was fabricated.

## Security Exposure Check

Values were not printed.

| Check | Result |
|---|---|
| Runtime hardcoded login credentials | `NOT FOUND` |
| Runtime demo bypass flags | `NOT FOUND` |
| Runtime static Admin bearer fallback | `NOT FOUND` |
| Actual `.env` files | `NOT FOUND` |
| Credential-like service URL literals | `FOUND` / `REDACTED` |
| Credential-bearing runtime logs | `NOT FOUND` |

The URL literals are existing local/sample fallbacks and import-script configuration. No evidence established that they are live secrets, so they were recorded and left for their owning package rather than expanded beyond WP-1.

## Changes

| File | Change | Reason |
|---|---|---|
| `apps/api/src/presentation/security/SecurityMiddlewareFactory.ts` | Removed demo/static bearer identity paths; require verified token identity | Prevent unauthenticated Admin authority |
| `apps/api/src/app.ts` | Inject token provider into every Admin identity guard | Bind Admin identity to authenticated sessions |
| `apps/api/src/presentation/api/router/AuthRouter.ts` | Removed static token identity and role-name permission synthesis | Preserve persisted RBAC integrity |
| `packages/config/src/AppConfig.ts` | Made strict Admin auth the only accepted mode; removed static bearer setting | Fail closed in every environment |
| `packages/config/src/ProductionReadinessValidator.ts` | Removed static Admin bearer readiness contract | Match session and RBAC authority |
| `.env.example`, `apps/api/.env.example` | Removed demo/static bearer guidance | Prevent insecure configuration reuse |
| `apps/web/src/features/auth/LoginPage.tsx` | Removed registration, role selection, quick-fill credentials, and silent Student fallback | Provide minimum secure Owner Admin access |
| `apps/web/src/router/index.tsx` | Require effective Admin permissions and remove automatic demo bridge | Enforce backend authority in routing |
| `apps/web/src/api/client.ts` | Removed Admin bearer fallback | Use the authenticated session token |
| `apps/web/src/features/admin-preview/*` | Removed demo/local bearer authority checks | Eliminate frontend bypass flags |
| `apps/admin/src/App.tsx` | Replaced code/bearer gate with login plus `/auth/me` permission verification | Enforce persisted Admin authority |
| `apps/admin/src/api/client.ts` | Removed placeholder, environment, and local bearer fallbacks | Use server-issued access tokens only |
| Focused security/config tests | Replaced demo/static bearer expectations with strict token and RBAC cases | Preserve negative coverage |

## Test Evidence

`TEST EXECUTION BLOCKED - DEPENDENCIES NOT PRESENT`

`node_modules` is absent. Per instruction, no package installation, internet access, or Docker pull was attempted. Focused tests were updated but could not be executed locally.

## Deferred Findings

- Prisma infrastructure stubs: deferred to owning later package.
- Redis runtime availability and session rollout: deferred.
- Rate-limit and monitoring redesign: deferred.
- Transactional Outbox and publication readiness: deferred.
- CI, containerization, Phase 6+, and Majors architecture: deferred.
- Credential-like local/sample URL literals in scripts and runtime defaults: deferred for environment-hardening ownership.

## Resource Report

| Resource | Activity |
|---|---|
| Internet activity | `NONE` |
| Downloads | `NONE` |
| Package installs | `NONE` |
| Docker pulls | `NONE` |
| Old MANARATAK copies touched | `NO` |

## Final Verdict

`WP-1 PASS - CURRENT STATE LOCKED AND URGENT SECURITY CONTAINED`

Stop point: WP0 and WP1 were not started.
