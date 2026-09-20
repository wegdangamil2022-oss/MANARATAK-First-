# WP1 RBAC Bootstrap and Health Source Preparation

Status date: 2026-08-13

## Admin Bootstrap and Persisted RBAC

- Added a read-only `AdminBootstrapVerifier` backed only by persisted Prisma delegates.
- It verifies administrative roles, required permission coverage, role assignments, and active/non-deleted identities.
- It returns `READY`, `DEGRADED`, or `UNAVAILABLE`; missing persistence never returns success.
- Identity IDs are not returned. Reports contain only 16-character SHA-256 fingerprints for correlation.
- The protected endpoint is `GET /api/v1/admin/authorization/bootstrap-verification`.
- The endpoint performs no bootstrap, role creation, assignment, credential access, or database mutation.

## DB and Redis Health

- Readiness with zero registered indicators now returns `DOWN` with `NOT_CONFIGURED` instead of `UP`.
- Database `UP` still requires a successful real query. Database errors redact credentials and do not repeat raw URLs in details.
- Redis `UP` requires a real `PING` response equal to `PONG`; any other response is `DEGRADED`.
- Redis details expose `AVAILABLE` or `UNAVAILABLE` capability status.
- Redis is required in both Production and Staging composition; Development may report it as optional/degraded.
- Liveness remains process-only and intentionally does not claim dependency readiness.

## Verification

| Check | Result |
|---|---|
| TypeScript | PASS |
| RBAC/bootstrap/health focused tests | 38/38 PASS |
| Local missing Redis readiness behavior | HTTP 503, not false `UP` |
| Database connection by remediation | NONE |
| Database writes | 0 |
| Credentials exposed | 0 |

Final persisted owner access and allowed/denied behavior remain target-runtime evidence tasks.
