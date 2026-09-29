# Canonical RBAC Baseline Provisioning Runbook

## 1. Overview and Purpose

This runbook describes the controlled, idempotent, production-safe procedure for provisioning the foundational Role-Based Access Control (RBAC) baseline records in the database.

The RBAC baseline is required by:
1. **Public Student Registration** (`RegisterUserUseCase`), which strictly requires `RoleRecord` with `id="student"`.
2. **First Admin Bootstrap** (`ControlledFirstAdminBootstrap`), which strictly requires a pre-existing administrator role (`id="administrator"` with `permissions=["admin:*"]`).

---

## 2. Scope & Canonical Role Definitions

The provisioner (`scripts/rbac-baseline-provision.mjs` and `ControlledRbacBaselineProvisioner`) provisions **ONLY** the following two canonical roles:

### A. Student Role
- **ID:** `student`
- **Name:** `Student`
- **Description:** `Default authenticated student persona`
- **Permissions:** `[]` (Empty JSON array; persona-based access is validated through `roleId === "student"`)
- **Policy IDs:** `[]`

### B. Administrator Role
- **ID:** `administrator`
- **Name:** `Administrator`
- **Description:** `Full administrative authority`
- **Permissions:** `["admin:*"]` (Wildcard administrative capability)
- **Policy IDs:** `[]`

### Non-Creation Invariants
This procedure **NEVER** creates or mutates:
- No `IdentityRecord`
- No `UserRecord`
- No `AccountRecord`
- No `CredentialRecord`
- No `RoleAssignmentRecord` (Roles are not assigned to any user during this step)
- No Auth Tokens or Sessions

---

## 3. Security Requirements & Gate Prerequisites

Execution is guarded by the **Database Mutation Gate** (`scripts/lib/database-mutation-gate.mjs`) and requires strict two-person approval. All checks execute before Prisma connects to the database.

### Required Environment Variables (Names Only)
- `DATABASE_URL`: PostgreSQL connection string (never logged or printed).
- `DATABASE_PROVISIONING_GATE`: Must equal `APPROVED`.
- `ALLOW_DATABASE_MUTATIONS`: Must equal `YES`.
- `DATABASE_MUTATION_ENVIRONMENT`: Target environment (`development`, `test`, `staging`, `production`). Must match `NODE_ENV`.
- `DATABASE_MUTATION_PURPOSE`: Must equal `provision`.
- `DATABASE_MUTATION_TARGET`: Non-secret host:port/database identifier matching `DATABASE_URL`.
- `RBAC_BASELINE_CONFIRM`: Must equal `PROVISION_CANONICAL_RBAC_BASELINE`.
- `RBAC_BASELINE_ACTOR_ID`: Unique identifier of the initiating operator (e.g., `operator-uid`).
- `RBAC_BASELINE_APPROVER_ID`: Unique identifier of the peer approver (e.g., `security-lead-uid`). **Must be distinct from ACTOR_ID**.
- `RBAC_BASELINE_CHANGE_ID` (or `DATABASE_PRODUCTION_CHANGE_ID` in production): Governed ticket/change ID (minimum 6 characters).

### Additional Production Constraints
- For `staging` and `production`, loopback (`localhost`, `127.0.0.1`) databases are prohibited.
- For `production`, `ALLOW_PRODUCTION_DATABASE_MUTATIONS=YES` and `DATABASE_PRODUCTION_CHANGE_ID` are required.

---

## 4. Execution Invocation

Build the TypeScript artifacts first:
```bash
npm run build
```

Run the provisioner via the governed package command:
```bash
npm run rbac:baseline:provision
```

### Expected Success Output
```json
{
  "status": "SUCCESS",
  "operation": "RBAC_BASELINE_PROVISIONED",
  "provisionedRoles": ["student", "administrator"],
  "existingRoles": [],
  "auditRecorded": true,
  "timestamp": "2026-09-25T17:40:00.000Z"
}
```

---

## 5. Conflict and Failure Handling

- **Idempotency:** If the exact canonical roles already exist, the operation succeeds safely with `provisionedRoles: []` and `existingRoles: ["student", "administrator"]`.
- **Conflict Fail-Closed:** If a role with `id="student"` or `id="administrator"` exists with different names, descriptions, permissions, or policy IDs, the transaction aborts with `RBAC_BASELINE_CONFLICT`. The provisioner **will not** overwrite existing data.
- **Audit Evidence:** The transaction creates a permanent `AuditRecord` with reference `RBAC_BASELINE_PROVISION_V1` and severity `CRITICAL`.

---

## 6. Post-Execution Verification (Read-Only)

Verify that the roles exist without mutating data:
```bash
node -e '
import("@prisma/client").then(async ({ PrismaClient }) => {
  const p = new PrismaClient();
  const roles = await p.roleRecord.findMany({ where: { id: { in: ["student", "administrator"] } } });
  console.log("Roles found:", roles.map(r => ({ id: r.id, name: r.name, perms: r.permissions })));
  const assignments = await p.roleAssignmentRecord.count();
  console.log("Total Role Assignments in DB:", assignments);
  await p.$disconnect();
});
'
```
Expected:
- `student` with permissions `[]`.
- `administrator` with permissions `["admin:*"]`.
- No new `RoleAssignmentRecord` created by this step.

---

## 7. Development vs. Production Separation

- `scripts/bootstrap-admin.ts` is a development/remediation-only script that creates mock identities and passwords directly. It is **strictly prohibited in staging and production**.
- `scripts/rbac-baseline-provision.mjs` is the **only approved production-safe method** to provision the RBAC baseline schema.
