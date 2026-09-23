# M4 IAM source closure

Baseline: `8260aa34438280013d22043d6b65c36b819b801c`.

## Authentication and credentials

All personas share Identity, password credentials, session storage and `/auth` endpoints.
`POST /auth/change-password` accepts only currentPassword/newPassword, checks the persisted
session and lifecycle, applies the existing 8–128 character policy and scrypt hasher, and
revokes **all** sessions. The response requires a new login. Cookie writes require CSRF;
change attempts are rate limited. Password replacement uses an expected-hash condition
inside a serializable transaction with session revocation and audit.

`POST /auth/credentials/:identityId/disable` requires `admin:credentials:manage`, an active
session, CSRF for cookie authentication, and a changeId. The credential is retained and
marked disabled, sessions revoked, and audit written in the same transaction. Password
reset cannot re-enable it. There is no public credential-create or re-enable endpoint.
Disabled credentials are also rejected by the shared principal validator during refresh
and access validation. Refresh rotation uses serializable isolation; conflicts fail closed.

## Personas and routing

The server guards Student Workspace and student learning routes with the canonical
`student` role. Administrator/Staff roles alone do not grant Student access.
Registration writes the Student role and existing `RoleAssignmentCreated` event atomically.
The Student outbox worker consumes that event and checks current owner identity and role
before provisioning through the existing idempotent inbox. `IdentityCreated.v1` alone no
longer provisions a Student Workspace. Lifecycle events received before provisioning are
retryable; late events project current owner lifecycle. Revoked role access is denied even
if the historical workspace is retained. Existing incorrectly provisioned workspaces are
not deleted by source work; runtime review belongs to later gated maintenance.

The public login uses `/auth/login` then `/auth/me`. Role/permission data returned by the
server determines the destination, never email. Admin uses the same API and cookies;
unauthenticated entry redirects to the public `/login`, while authenticated accounts without
admin permissions see denial. Staff with admin permissions can access only their permitted
admin routes; staff without an available authorized surface are denied. Configure
`VITE_PUBLIC_WEB_URL` for a separately hosted Admin application and `VITE_ADMIN_URL` for
the public app. Both applications must use the same canonical API origin/session authority.

## Controlled first administrator

The development/test `scripts/bootstrap-admin.ts` remains prohibited in staging/production.
The separate operator command is `node scripts/first-admin-bootstrap.mjs`; it is **not**
invoked by installation, API startup or deployment. It requires the normal Database Mutation
Gate for maintenance, confirmed target/environment, production approval when applicable,
and these explicit operator inputs:

- FIRST_ADMIN_CONFIRM = PROMOTE_EXISTING_VERIFIED_IDENTITY_ONCE
- FIRST_ADMIN_IDENTITY_ID: existing ACTIVE, verified identity with enabled password credential
- FIRST_ADMIN_ROLE_ID: an existing administrative role granting authorization management
- FIRST_ADMIN_ACTOR_ID and FIRST_ADMIN_APPROVER_ID: distinct operator identifiers
- DATABASE_PRODUCTION_CHANGE_ID: the approved change reference (also required for staging)

The adapter adds a role assignment to an existing identity; it never creates a password,
marks email verified, or creates a separate administrator authentication store. A serializable
transaction rejects existing administrator assignments and the permanent unique audit
reference FIRST_ADMIN_BOOTSTRAP_ONCE prevents a second bootstrap even after role removal.
Approval identities are operator change-management assertions, not an API header bypass.
Actual operator execution and infrastructure verification remain for M8/M14.

## Prisma and runtime boundary

Email is trimmed/lowercased in the canonical ContactRegistry and registration persistence;
primaryEmail is unique. Credential and role assignments have composite uniqueness. Role
assignment and token identity relations use Restrict deletion to retain security history.
Refresh hashes and token hashes remain unique; existing identity/family/expiry indexes are
retained. Token reads use tokenHash or identityId; no unneeded expiry-scan index is added.
The persistence ownership manifest includes both token models under identity ownership.

Schema validation/generation are source-only. Applying constraints, checking old email
duplicates and orphaned assignments/tokens, and creating the canonical Student/Admin roles
are deferred to M7's approved migration/provisioning process. No migration, database/Redis
connection, seed, import, real email delivery or deployment is part of this source closure.
Captured email delivery remains a test/source boundary. Full regression is deferred to later closure.

## Verification and deferred findings

General TypeScript, workspace build, Prisma validate/generate, architecture guards,
persistence ownership, DI reachability and the W3 outbox source verifier passed. IAM/Auth
verification includes existing credential/session/RBAC/CSRF suites and new change-password,
credential-disable, persona, first-admin, schema and race tests. All runtime dependencies in
these tests are doubles or in-memory stores; the API bootstrap smoke test explicitly disables
external connections. Its missing-Redis-configuration log is expected, not a Redis connection.

An additional general source-quality scan reports two pre-existing, unchanged keyboard
accessibility findings outside IAM: `CourseStudyRoomView.tsx:1382` and `Header.tsx:56` under
`apps/web/src/features/public-template/components/`. These remain deferred; M4 passing
does not claim that unrelated source-quality gate or all GitHub workflows pass.
The frontend build also retains its existing large-chunk warning.
