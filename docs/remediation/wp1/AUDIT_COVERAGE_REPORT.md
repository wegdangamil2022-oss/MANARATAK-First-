# WP1-D Audit Coverage Report

Status: `SOURCE IMPLEMENTED / RUNTIME VALIDATION PENDING`

The inventory covers active Phase 2-10 mutation surfaces only. GET routes and lazy Phase 11+ routers are excluded. There are 97 mutation handler definitions and 104 mounted endpoint surfaces because the seven Identity handlers are mounted under both `/admin/identities` and `/identities`.

| Router area | Definitions | Mounted surfaces | Classification | Reason |
|---|---:|---:|---|---|
| Authentication | 3 | 3 | Critical | Credential/session state |
| Identity | 7 | 14 | Critical | Identity/account lifecycle |
| Authorization admin/runtime | 3 | 3 | 2 critical / 1 excluded | RBAC writes vs read-only evaluation |
| Settings | 3 | 3 | Critical | Runtime/security configuration |
| Import control | 19 | 19 | 11 critical / 2 standard / 6 excluded | Commit/control vs workspace/preview/disabled |
| Reference Data | 4 | 4 | Critical | Canonical reference mutation |
| Academic Taxonomy | 11 | 11 | 9 critical / 1 standard / 1 excluded | Canonical graph vs handoff/validation |
| International Tests | 23 | 23 | Critical | Canonical content/publication |
| Majors | 7 | 7 | Critical | Canonical content/publication |
| Universities | 7 | 7 | Critical | Canonical content/publication |
| Assets | 10 | 10 | Critical | Security/destructive lifecycle |
| **Total** | **97** | **104** | **93 critical / 3 standard / 8 excluded** | |

All 93 critical surfaces pass through `MutationAuditMiddleware`. They require a Prisma-backed mutation-intent record before the business handler; persistence failure is fail-closed. The three standard routes use documented best-effort audit. The eight excluded surfaces are authorization evaluation, four previews, two disabled transfer endpoints, and taxonomy validation; they do not commit state.

Outcome records carry principal, action, route target, HTTP result, correlation ID, timestamp, classification, and bounded metadata. Actor identity is no longer accepted from `x-actor-id`, `authorId`, or `actorId` request input. Persistence sanitizes secret-bearing metadata.

Required intent is fail-closed. Outcome audit and existing router-level outcome hooks are best-effort secondary records. Atomic `business mutation + audit record` persistence is not claimed because the repositories do not expose one shared transaction boundary. This remains `REQUIRES_DATABASE_RECOVERY / WP1-F OR FINAL DB VALIDATION`.
