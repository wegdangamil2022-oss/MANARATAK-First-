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

Validation: final build, type checks, unit suites, lint and source contracts are being
run against the reconciled tree. Results will be recorded after completion. The local
Nginx contract requires a Linux/POSIX Nginx executable unavailable on this Windows host;
that gate remains enabled for the CI environment.
