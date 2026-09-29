# Single-Role Credential Rotation Runbook (manaratak_application)

This runbook defines the controlled procedure for rotating the password of the single existing PostgreSQL role `manaratak_application` without affecting `manaratak_probe`, `manaratak_migration`, or table schemas/data.

---

## 1. Safety Invariants
- **Scope Isolation:** Affects ONLY `manaratak_application`.
- **Zero RBAC / Schema Mutations:** NEVER invokes `scripts/database/provision-roles.mjs`. Modifies no tables, grants, sequences, or schemas.
- **Approval Governance:** Supports explicit Dual-Control Approval (`ROTATION_ACTOR_ID` !== `ROTATION_APPROVER_ID`) OR Solo Project Owner Governance (`PROJECT_OWNER_POLICY=SOLO_OWNER` with verified `ROTATION_OWNER_ID`).
- **Gate Contract:** Mutation gate purpose must be exactly `maintenance`.
- **Secret Handoff & Zero-Disk Storage:** Supports direct handoff from persistent server-side secret `DB_APPLICATION_PASSWORD` without writing passwords to ephemeral `.env` or modifying `/app/.dev.env.json`.
- **Strict Path Isolation & Anti-Symlink Defense:** Refuses pre-existing staging files, journals, or symlinks.
- **Orphan Prevention & Journaling:** Never destroys candidate credentials or unlinks journal on uncertain outcomes (`UNCERTAIN_MUTATION_STATE`).

---

## 2. Gate Configuration & Prerequisites

### Mode A: Solo Project Owner Policy (Google AI Studio Secret Handoff)
Set the persistent secret `DB_APPLICATION_PASSWORD` via Google AI Studio's Secrets panel. Then export gate variables:
```bash
export DATABASE_PROVISIONING_GATE=APPROVED
export ALLOW_DATABASE_MUTATIONS=YES
export DATABASE_MUTATION_ENVIRONMENT=development
export DATABASE_MUTATION_PURPOSE=maintenance
export DATABASE_MUTATION_TARGET="localhost:5432/cloud_sql_development_database" # Must match DATABASE_URL target identity
export APPLICATION_ROLE_ROTATION_CONFIRM=ROTATE_APPLICATION_ROLE_CREDENTIAL
export PROJECT_OWNER_POLICY=SOLO_OWNER
export ROTATION_OWNER_ID="<real-owner-id>"
export ROTATION_CHANGE_ID="<change-id-min-6-chars>"
```

### Mode B: Dual-Control Approval (File-Based Staging)
```bash
export DATABASE_PROVISIONING_GATE=APPROVED
export ALLOW_DATABASE_MUTATIONS=YES
export DATABASE_MUTATION_ENVIRONMENT=development
export DATABASE_MUTATION_PURPOSE=maintenance
export DATABASE_MUTATION_TARGET="localhost:5432/cloud_sql_development_database" # Must match DATABASE_URL target identity
export APPLICATION_ROLE_ROTATION_CONFIRM=ROTATE_APPLICATION_ROLE_CREDENTIAL
export ROTATION_ACTOR_ID="<operator-id>"
export ROTATION_APPROVER_ID="<approver-id>" # Must be distinct from ROTATION_ACTOR_ID
export ROTATION_CHANGE_ID="<change-id-min-6-chars>"
```

Ensure administrative direct access is defined in `ORIGINAL_ADMIN_DIRECT_URL` (or `DIRECT_URL`).

---

## 3. Execution Invocation
Execute the rotation runner:
```bash
node scripts/rotate-application-role.mjs
```

### Expected Output on Clean Success
```json
{
  "status": "SUCCESS",
  "role": "manaratak_application",
  "databaseMutated": true,
  "configUpdated": true
}
```

---

## 4. Failure Recovery Matrix

| Boundary / Failure Point | State | Automated Behavior | Operator Recovery Action |
|---|---|---|---|
| **Before SQL Dispatch** (Validation error, Gate rejection, psql spawn failure) | DB password unchanged; `.env` unchanged. | Temporary files and journal are unlinked automatically. | Fix environment variables and retry. |
| **Uncertain Outcome: Post-Dispatch** (psql network drop, PostgreSQL server restart, command timeout) | UNCERTAIN: PostgreSQL may have applied the `ALTER ROLE` before connection dropped. | Staged file is preserved as `.env.unconfirmed.rotation` (mode `0600`); journal records `UNCERTAIN_MUTATION_STATE`. Original `.env` is NOT overwritten. | Follow Section 5: Unconfirmed Credential Verification without exposing secret. |
| **After Confirmed DB Success, Before Config Activation** (Process crash during file rename) | Confirmed: DB password changed; `.env` not yet renamed. | Runner maintains `.env.tmp.rotation` and `.rotation.journal.json` (Stage: `DATABASE_ALTERED`). | Run: `mv .env.tmp.rotation .env && rm -f .rotation.journal.json`. |
| **After Config Activation, Before App Verification** (Verification probe fails) | DB password changed; `.env` updated. | New credential is persisted in `.env`. | Verify network/proxy status. Re-test application connection. |

---

## 5. Operator Recovery from Uncertain Outcome (`UNCERTAIN_MUTATION_STATE`)

When an unexpected timeout or network partition occurs during rotation:
- In **Secret Handoff Mode**, `.rotation.journal.json` records `stage: "UNCERTAIN_MUTATION_STATE"` with `secretSource: "DB_APPLICATION_PASSWORD"`. The candidate credential is the value persisted in Google AI Studio's Secrets panel.
- In **File Staging Mode**, `.env.unconfirmed.rotation` holds the candidate credential while `.env` remains untouched.

**Do NOT display or print the secret.** Test whether PostgreSQL applied the change using the candidate credential:

```bash
# In Secret Handoff Mode: Test connection using the persistent secret:
node -e '
import { PrismaClient } from "@prisma/client";
const password = process.env.DB_APPLICATION_PASSWORD;
if (!password) throw new Error("DB_APPLICATION_PASSWORD not set");
const url = `postgresql://manaratak_application:${encodeURIComponent(password)}@localhost/${process.env.SQL_DB_NAME}?host=${encodeURIComponent(process.env.SQL_HOST)}`;
const prisma = new PrismaClient({ datasources: { db: { url } } });
prisma.$connect()
  .then(() => {
    console.log("CANDIDATE_CREDENTIAL_AUTHENTICATED=PASS");
    console.log("ACTION_REQUIRED: Remove journal: rm -f .rotation.journal.json");
  })
  .catch((err) => {
    console.error("CANDIDATE_CREDENTIAL_AUTHENTICATED=FAIL (Change was not applied by server or server unreachable)");
    console.error("Inspect database status before taking further action.");
  })
  .finally(() => prisma.$disconnect());
'
```

- If `CANDIDATE_CREDENTIAL_AUTHENTICATED=PASS`:
  The change was committed in PostgreSQL. Clean up the journal:
  ```bash
  rm -f .rotation.journal.json
  ```
- If PostgreSQL connectivity was down and server rebooted without applying:
  The candidate secret was not applied. Resolve network issues and retry once connectivity is restored.

---

### File Staging Mode Recovery
If file staging mode was used:
```bash
# Test connection with unconfirmed credentials safely using Prisma without revealing the URL:
node -e '
import fs from "node:fs";
import { PrismaClient } from "@prisma/client";

const unconfirmed = fs.readFileSync(".env.unconfirmed.rotation", "utf8");
const match = unconfirmed.match(/^DATABASE_URL=(.+)$/m);
if (!match) throw new Error("DATABASE_URL not found in unconfirmed artifact");

const prisma = new PrismaClient({ datasources: { db: { url: match[1].trim() } } });
prisma.$connect()
  .then(() => {
    console.log("CANDIDATE_CREDENTIAL_AUTHENTICATED=PASS");
    console.log("ACTION_REQUIRED: Run -> mv .env.unconfirmed.rotation .env && rm -f .rotation.journal.json");
  })
  .catch((err) => {
    console.error("CANDIDATE_CREDENTIAL_AUTHENTICATED=FAIL (Change was not applied by server or server unreachable)");
    console.error("Inspect database status before taking further action.");
  })
  .finally(() => prisma.$disconnect());
'
```

- If `CANDIDATE_CREDENTIAL_AUTHENTICATED=PASS`:
  Apply the configuration:
  ```bash
  mv .env.unconfirmed.rotation .env
  rm -f .rotation.journal.json
  ```
- If PostgreSQL connectivity was down and server rebooted without applying:
  The operator may safely discard `.env.unconfirmed.rotation` and retry once connectivity is restored.

---

## 6. Post-Rotation Read-Only Verification
Verify that `manaratak_application` can connect and has table write privileges:
```bash
node -e '
import("@prisma/client").then(async ({ PrismaClient }) => {
  const prisma = new PrismaClient();
  try {
    const user = await prisma.$queryRawUnsafe("SELECT current_user AS username");
    console.log("AUTHENTICATED_USER:", user[0].username);
    const priv = await prisma.$queryRawUnsafe("SELECT has_table_privilege(current_user, \x27\"RoleRecord\"\x27, \x27INSERT\x27) AS can_insert");
    console.log("CAN_INSERT_ROLE_RECORD:", priv[0].can_insert);
  } finally {
    await prisma.$disconnect();
  }
});
'
```

---

## 7. Teardown
Close the mutation gate immediately:
```bash
export DATABASE_MUTATION_GATE=CLOSED
export ALLOW_DATABASE_MUTATIONS=NO
```
