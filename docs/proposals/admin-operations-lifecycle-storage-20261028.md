# Additive support and staff lifecycle storage — operator review

This is a prepared change, not authorization to modify the original database.

Apply only these two source migrations, in this order, after explicit approval:

1. `20261028000200_student_support_cases`: eight `StudentSupport*Record` tables for cases, messages, immutable events, teams, team membership, SLA policy, saved replies and same-student case links. Includes append-only history and same-student link guards.
2. `20261028000300_staff_lifecycle`: four tables: `StaffInvitationRecord`, `StaffChangeRequestRecord`, `StaffAdminAccessRecord`, `StaffGrantSourceRecord`.

No existing account, credential, user, role or assignment is backfilled or changed. The existing four staff draft/organization tables are prerequisites, not reapplied. New tables reference canonical identities and student workspaces. Neither migration enables workers, sends notifications, creates example data, activates staff or changes MFA. No destructive rollback is to be executed against the original database; the previous application build remains the operational rollback.

Grant the existing application role SELECT/INSERT/UPDATE only on new mutable owner tables, SELECT/INSERT only on support messages/events/links. Do not grant DELETE, TRUNCATE, schema CREATE, role management, table ownership or migration-ledger access. Record only these migrations and their exact SHA-256 in Prisma's ledger using the existing migration role, within the same reviewed transaction.

Before commit: verify the original database identity and migration role; require all twelve tables absent and both migrations unapplied; capture original schema and canonical account/role data fingerprints. After DDL and grants, require unchanged pre-existing schema/data fingerprints and unchanged application-role privilege envelope. Failure rolls the whole transaction back. Preserve private preflight/verification evidence; never print connection strings or secrets.

Isolated verification uses only attested native PostgreSQL laboratory scripts. Support persistence, immutable history, ownership, replay and rollback are checked by `scripts/database/verify-support-storage.mjs`. Staff invitation ownership/single use, independent approval, mandatory-audit rollback, admin-only fencing, exact grant provenance, preservation of student access and recovery-admin protection are checked by `scripts/database/verify-staff-lifecycle-storage.mjs`.
