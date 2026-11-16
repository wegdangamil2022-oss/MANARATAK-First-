# Remaining branch integration — 2026-11-17

Integration base: main bffb89d3405542173f18a04ebd48e48100e4c69f.

Merged the remaining course admissions, independent source review, provider continuation,
certificate replacement, geography reconciliation, source governance and CI dependency
branches. Preserved newer main implementations where historical branches overlapped:
canonical country/city paging, frozen language fields, atomic audit/outbox mutation,
permission checks and version preconditions.

Excluded by user request: feat/course-arabic-translation-workspace-20261110 and the
historical handoff/absheer-clean-base-2026-10-19 branch. No translation workspace
feature commits from that branch are included.

Integration repairs include API ESM imports, current administration panel wiring,
public course source approval enforcement before pagination, admission event projection,
historical learning path policy validation and server-owned evidence timestamp retention.
Updated historical contract fixtures and source checks against the retained main contracts.
Reviewed and regenerated audit, DI, persistence and offline geography reconciliation inventories.

Five newly introduced migrations were assigned forward dates 20261117000100 through
20261117000500, preserving the existing main migration prefix. Original branch SQL is
archived verbatim under evidence/main-integration-20261117/branch-migrations.
No database migration, seed, restore or production mutation was executed.

Validation (Node 22.16.0 / npm 10.9.2):

- All workspace production builds passed, including API native ESM validation.
- Full ESLint passed with zero errors (4746 warnings).
- Vercel TypeScript contexts passed with zero diagnostics.
- Source preflight passed (40 regression tests); Prisma validate/generate passed without a DB connection.
- Full Vitest: 904 files, 901 passed, one skipped; four failures in two files were
  resolved and those files rerun successfully. The focused rerun passed 25 tests,
  including three admission-event bridge contracts. No known source-unit failure remains;
  three pre-existing skipped tests remain skipped.
- Node unit runner: 1158 tests, 1157 initially passed. Fixed the remaining evidence-writer
  path error and reran the full affected section28 file: 66/66 passed.
- All 33 registered SOURCE gates were executed. Remediation and destination gate
  integration errors were fixed; reruns passed 17/17 verifiers and 116/116 checks.
  The other 30 SOURCE gates passed initially. Linux/POSIX Nginx is unavailable on
  this Windows host; its local contract is unverified here and remains enabled
  in CI, whose workflow installs Nginx explicitly. Two RUNTIME gates remain
  pending under the existing manifest policy.
- Secret scan passed. All local/remote branch tips are ancestors except the two
  explicitly excluded branches above. Remote main remained at the integration base.

No database, provider, production deployment or browser E2E runtime acceptance is claimed.
