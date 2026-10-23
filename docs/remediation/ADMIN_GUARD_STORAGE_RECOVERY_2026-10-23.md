# Admin session storage failure recovery

The local runtime stopped after an unhandled Prisma P2024 connection-pool timeout in `createAdminGuard`, while revoking sessions for a principal that could not be authenticated. Express 4 does not automatically handle rejected promises from asynchronous middleware.

The guard now catches failures in the principal lookup and inactive-account revocation branch. It returns HTTP 503 with `ADMIN_AUTH_UNAVAILABLE`, without granting access or exposing the underlying storage error. When storage is available, inactive accounts still receive HTTP 401 and their sessions are revoked as before.

Validation: the two focused failure cases rejected before the change. All three cases in `apps/api/tests/presentation/security/AdminGuardStorageFailure.spec.ts` pass after the change, including an Express request followed by a successful liveness request and normal inactive-account rejection.

This fixes the observed process crash; it does not claim to remove database connection pressure or guarantee service availability. No schema, migration, database role, credential, or permission contract is changed.
