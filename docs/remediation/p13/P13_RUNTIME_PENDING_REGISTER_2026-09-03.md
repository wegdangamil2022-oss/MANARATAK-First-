# P13 Runtime Pending Register — 2026-09-03

**Status:** FROZEN FOR FINAL SOURCE CLOSURE  
**Authority:** Roadmap v6.0 + Cross-Phase Relationship Closure Matrix v2.0.0  
**Scope rule:** Items below require a deployed environment, database, external provider, browser runtime, or locked dependency execution. They are not source-code gaps and are not silently treated as passed.

## Runtime / environment proof still required

1. **Locked dependency CI execution** — run `npm ci` and the complete `ci:source:full` chain on the authoritative repository runner, including TypeScript typecheck, lint, application/package builds, unit/contract tests, Prisma validate and Prisma generate.
2. **Database migration rehearsal** — validate all pending Prisma migrations/backfills against a disposable PostgreSQL database, including rollback/recovery evidence where the migration policy requires it.
3. **Database integration tests** — execute DB-backed repository/integration specifications that are intentionally excluded from the no-DB source-unit suite.
4. **Authenticated browser E2E** — prove login, `/auth/me`, session expiry/unauthorized behavior, logout, protected Student Workspace routes, and cross-device persisted student state in a deployed browser environment.
5. **P15 owner-read hydration runtime** — prove Major/University/Scholarship saved-item hydration, P13 learning reads, and P14 certificate reads against migrated persisted data.
6. **P13 completion → P14 certificate runtime delivery** — run the configured transactional outbox worker/inbox idempotency path against a real database and worker runtime.
7. **Public/Admin E2E** — prove P23 canonical authoring and P24 published-only connected graph navigation against real persisted records in Arabic/English routes.
8. **External integrations** — validate configured AI provider calls through P17 only, P19 payment gateways, email/notification providers, object storage/assets, and other external credentials in the target environment.
9. **Certificate signing/verification operations** — validate production signing/KMS or equivalent key custody, QR/verification assets, revoke/reissue flows, and public verification against the deployed trust configuration.
10. **Operational readiness** — confirm secrets, observability, backups, queue/worker health, rate limits, domain/TLS, and production environment variables before launch.

## Explicitly not pending

The ownership model, canonical relationship contracts, P23 owner-API authoring, P24 live-vs-prototype separation, P15 session/API source-of-truth wiring, architecture guards, and the source CI contract are source-closed. Runtime execution may reveal implementation defects, but it must not require redesigning those relationships.
