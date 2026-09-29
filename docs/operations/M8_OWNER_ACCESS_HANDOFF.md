# M8 owner access handoff

`/auth/me` now reports only roles and permissions assigned to the stable `IdentityRecord.id`. An email address or a browser token never grants administrative access.

Before deploying this change against the Google AI Studio database, set `FIRST_ADMIN_IDENTITY_ID` to the existing owner's stable identity ID and `FIRST_ADMIN_VERIFIED_EMAIL` to that same account's confirmed primary email. Run `npm run auth:owner:preflight` in the connected runtime. It performs reads only and reports role IDs without printing the email or connection string.

- `READY`: a persisted administrative assignment exists. Keep it; deploy and confirm `/auth/me` returns its permission.
- `NEEDS_CONTROLLED_BOOTSTRAP`: the identity and confirmed email match, but no administrative assignment exists. Ensure the canonical `administrator` role exists, then use `scripts/first-admin-bootstrap.mjs` with `FIRST_ADMIN_ROLE_ID=administrator`, distinct `FIRST_ADMIN_ACTOR_ID` and `FIRST_ADMIN_APPROVER_ID`, `FIRST_ADMIN_CONFIRM=PROMOTE_EXISTING_VERIFIED_IDENTITY_ONCE`, and all database mutation gate variables. Run the preflight again before deploying.
- `BLOCKED_IDENTITY_MISMATCH`, `BLOCKED_REVIEW_PARTIAL_AUTHORITY`, `BLOCKED_REVIEW_OTHER_ADMIN_ASSIGNMENTS`, or `BLOCKED_REVIEW_EXISTING_BOOTSTRAP`: stop and review the identity, partial role, other administrator assignments, or prior audit. Do not guess a new identity or revoke an existing role.

The bootstrap transaction checks the identity ID, active account, verified primary email, active password credential, existing administrative assignments and one-time audit marker before creating a role assignment and audit entry together. The obsolete `promote-wegdan-admin.ts` script was removed because it used a hardcoded identity and bypassed the mutation gate.

After deployment, verify with a real student and one-section employee account that `/auth/me` shows only persisted permissions, a student receives 403 from a protected `/api/v1/admin/*` request, and role grants and revocations produce `ROLE_ASSIGNED` and `ROLE_ASSIGNMENT_REVOKED` audit events. These checks require the connected runtime and are not performed by source tests.
