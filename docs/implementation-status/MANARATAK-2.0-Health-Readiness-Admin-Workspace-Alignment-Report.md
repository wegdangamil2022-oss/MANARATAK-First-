# MANARATAK 2.0 — Health & Readiness Admin Workspace Alignment

**Current interface review:** 2026-10-27
**Admin route:** `/health-readiness`  
**Admin API:** `/api/v1/admin/monitoring/overview`  
**Public monitoring:** `/api/v1/monitoring/health`, `/health/liveness`, `/health/readiness`  
**Status:** SOURCE-CLOSED; runtime results remain environment-dependent.

## Ownership

Health & Readiness is a **read-only control-plane workspace**. It does not repair data, restart queues, mutate finance, rotate secrets, or alter domain records. It only reads sanitized operational probes and the production configuration validator, then links the operator to the owning admin section.

## Security boundary

The detailed diagnostic overview and production-readiness report are admin-only and require the `admin:platform:manage` capability. Public monitoring exposes only the conventional health/liveness/readiness contracts. Diagnostic payloads sanitize secrets, credentials, connection strings, tokens and URL-bearing detail fields.

## Release gate

`releaseReady` is deliberately stricter than configuration validation alone. It is true only when all four server conditions hold:

1. **Environment Eligible** — the server identifies an eligible production environment.
2. **Configuration Ready** — `ProductionReadinessValidator` has no blockers.
3. **Runtime Ready** — required dependencies meet the server's runtime evidence policy.
4. **Monitoring Complete** — expected probes and required operational evidence satisfy the server policy.

This prevents a green release signal when the database/runtime is down or a launch-critical probe is absent.

## Expected operational probes

- database
- database-schema (read-only applied migration-history check; not a Prisma drift claim)
- redis
- asset-platform
- import-foundation
- admin-auth
- ai-providers
- payment-gateway
- notifications
- background-jobs
- public-web

`database-schema` checks only the database's **applied migration history** for unfinished entries. Full source-vs-database schema drift still belongs to deployment CI/Prisma tooling and is not falsely claimed by this page.

`public-web` performs a bounded, read-only reachability probe against `PUBLIC_WEB_URL` (falling back to `CORS_ORIGIN`). It does not accept a user-supplied URL.

## UI

The workspace follows the reference-data/certificate identity: navy `#142B5F`, gold active icons `#F0CE7E`, Cairo typography, 22px page titles, 16px section titles, 14px primary navigation, and compact 12–13px supporting text. Green/amber/red still describe diagnostic states. Changes are scoped to health; other admin sections keep their existing presentation.

Five primary destinations remain: overview, services, current issues, release readiness, and monitoring/reports. Monitoring/reports retains three secondary destinations: observations, coverage, and reports. Both navigation levels use equal grid cells, navy selected backgrounds, gold selected icons, visible keyboard focus, and responsive rows. The content has consistent spacing and action links use the same button shape as native buttons.

Each of the four release conditions links to its actual evidence: environment report, configuration findings, required services, or probe coverage. Source filtering and local text search make configuration and coverage drill-downs usable without extra API calls. Finding filters survive entry into a detail and its return link. Reporting navigation keeps the service and observation window; unknown report sections safely select observations.

Coverage links to unverified required services and coverage findings. The existing cross-module integrity section is linked only with `admin:platform:manage`. Student-tools ownership uses the actual `admin:student-tools:view` route permission instead of the obsolete manage permission. No operational writes, provider activation or database changes were added.

## Validation

The three health suites pass 30 tests, including source/search filtering, release evidence routes, report navigation context, independent owner permissions, stale evidence, incompatible contracts, pagination and access revocation. Admin TypeScript and lint checks pass. Authenticated browser inspection remains separate from component and HTTP asset verification; no visual acceptance or external monitoring readiness is implied by these tests.

## Runtime caveat

Source closure does not mean a deployment is healthy. Database, Redis, external storage, public-web reachability, payment transport, notifications, AI providers, secrets, and other probes report the truth of the environment in which the API is actually running.
