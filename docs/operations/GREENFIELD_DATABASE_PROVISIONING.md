# MANARATAK — Greenfield Database Provisioning and Mutation Safety

**Status:** ACTIVE OPERATIONAL AUTHORITY  
**Effective date:** 2026-09-06  
**Supersedes:** recovery-era assumptions that require an “Original Development Database” or `WP1_RECOVERY_GATE`.  
**Scope:** PostgreSQL provisioning, migrations, seeds, imports, backfills, and maintenance mutations.

## 1. Authority

MANARATAK does not require an historical/original development database in order to begin runtime closure. The supported lifecycle is:

1. Source-complete working tree.
2. Provision or select a clean PostgreSQL target.
3. Verify the exact target identity and runtime environment.
4. Authorize one explicit mutation purpose.
5. Apply reviewed migrations/bootstrap/seeds/imports.
6. Capture before/after evidence, integrity checks, and rollback/recovery artifacts.
7. Revoke mutation authorization immediately after the operation.

This replaces the obsolete recovery-specific safety model without weakening write protection.

## 2. Canonical mutation gate

Every source-controlled mutation command that uses the shared gate must satisfy all of the following:

- `DATABASE_PROVISIONING_GATE=APPROVED`
- `ALLOW_DATABASE_MUTATIONS=YES`
- `DATABASE_MUTATION_ENVIRONMENT=<development|test|staging|production>` and it must match `NODE_ENV`
- `DATABASE_MUTATION_PURPOSE=<provision|migrate|seed|import|backfill|maintenance>`
- `DATABASE_MUTATION_TARGET=<host:port/database>` and it must exactly match the non-secret target identity derived from `DATABASE_URL`

Production has two additional mandatory controls:

- `ALLOW_PRODUCTION_DATABASE_MUTATIONS=YES`
- `DATABASE_PRODUCTION_CHANGE_ID=<approved change identifier>`

Production/staging mutation approval may not target a loopback database.

The implementation is `scripts/lib/database-mutation-gate.mjs`. A failed or incomplete declaration fails closed.

## 3. Provisioning versus later changes

`DATABASE_MUTATION_PURPOSE` prevents a generic write token from silently authorizing every kind of database operation.

| Purpose | Intended use |
| --- | --- |
| `provision` | First controlled schema deployment to a new/clean target. |
| `migrate` | Applying reviewed migrations to an existing target. |
| `seed` | Canonical/bootstrap seed data. |
| `import` | Controlled data import. |
| `backfill` | Relationship/data correction or migration backfill. |
| `maintenance` | Explicit operational mutations such as publication state changes. |

Commands must declare the purposes they accept. A `seed` approval cannot be reused to run the migration deploy command, and vice versa.

## 4. Safe greenfield sequence

Read-only steps may run before mutation approval:

```bash
npm run db:remediation:plan
npm run db:remediation:status
npm run db:remediation:baseline
npm run db:remediation:dry-run
npm run db:remediation:rollback-plan
```

For a new development database whose URL is `postgresql://...@localhost:5432/manaratak_dev`, the operator must explicitly set the target identity and purpose before deploy:

```bash
export NODE_ENV=development
export DATABASE_PROVISIONING_GATE=APPROVED
export ALLOW_DATABASE_MUTATIONS=YES
export DATABASE_MUTATION_ENVIRONMENT=development
export DATABASE_MUTATION_PURPOSE=provision
export DATABASE_MUTATION_TARGET=localhost:5432/manaratak_dev
npm run db:remediation:deploy
```

Immediately after the controlled mutation, unset or revert the approval variables.

## 5. Production policy

Source presence of the production flags is **not** authorization to deploy. A production mutation is valid only inside the approved release/change process and must have rollback/recovery evidence appropriate to the migration. The mutation gate is a final source-side guardrail, not a substitute for release governance.

No runbook should instruct an operator to disable this gate, bypass it with direct Prisma mutation commands, or reuse a production change ID for unrelated work.

## 6. Evidence required for closure

For each database-affecting remediation item, record:

- target identity without credentials;
- environment and mutation purpose;
- migration/schema checksum or artifact identifier;
- pre-operation counters/integrity checks when applicable;
- command result;
- post-operation counters/integrity checks;
- rollback/recovery artifact and rehearsal result where required;
- associated commit/PR and CI evidence.

A source-only review may mark a card `SOURCE_VERIFIED` or `RUNTIME_PENDING`; it must not claim runtime/database closure without the corresponding target evidence.

## 7. Historical recovery documents

Older remediation reports may retain their original recovery terminology as historical evidence. If they remain in the active documentation tree, they must carry a clear supersession notice pointing to this document. Historical wording is not operational authority.
