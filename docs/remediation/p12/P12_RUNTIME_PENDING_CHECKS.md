# P12 — Runtime Pending Checks

**Date:** 2026-09-03  
**Classification:** **RUNTIME / DATABASE / E2E ONLY**

P12 deliberately separates source gates from checks that require a real disposable environment. The items below are **not source skips** and must not be converted into green placeholders. They remain pending until the runtime/database handoff.

| Check | Command / Surface | Why it is Runtime Pending | Required runtime proof |
| --- | --- | --- | --- |
| PostgreSQL integration suite | `npm run test:database` | Opens Prisma connections and exercises database constraints/transactions | Disposable PostgreSQL with explicit mutation opt-in and test URLs |
| Major dataset DB E2E | `CheckDbE2E.spec.ts`, `MajorImportE2E.spec.ts` | Reads/writes actual persisted major/import data | Disposable seeded PostgreSQL |
| Auth credential DB integration | `PrismaCredentialIntegration.spec.ts`, `RealDatabaseIntegration.spec.ts` | Credential persistence and DB-backed verification | Disposable PostgreSQL and generated Prisma client |
| Imported-course persistence/runtime integration | tests listed by `vitest.database.config.ts` | Requires transaction, rollback, dedup and persistence proof | Dedicated disposable course databases and mutation opt-in |
| Browser E2E | `npm run e2e` | Requires running web/API/runtime dependencies and browser | Started runtime plus browser environment |
| Migration dry-run/deploy and recovery proof | `db:remediation:*` runtime commands | Requires actual database state and reversible migration evidence | Disposable/runtime database under remediation gate |
| Runtime smoke / external infrastructure | deployment/runtime workflows | Requires environment services such as PostgreSQL/Redis/provider endpoints | Target runtime environment |

## Source-suite boundary

`vitest.config.ts` excludes DB-specific specs instead of allowing them to appear as source-suite skips or graceful fallbacks. `vitest.database.config.ts` is the explicit runtime database suite. Prisma **schema validation and client generation** remain source gates because they do not connect to PostgreSQL; they run through `scripts/ci/prisma-source-gate.mjs` using a syntactically valid, non-connected placeholder datasource URL.

No database migration, seed, `db push`, DB integration suite, or browser E2E is executed as part of P12 source closure.
