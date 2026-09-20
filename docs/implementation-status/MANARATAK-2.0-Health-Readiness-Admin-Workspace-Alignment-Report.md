# MANARATAK 2.0 — Health & Readiness Admin Workspace Alignment

**Current baseline:** 2026-09-05  
**Admin route:** `/health-readiness`  
**Admin API:** `/api/v1/admin/monitoring/overview`  
**Public monitoring:** `/api/v1/monitoring/health`, `/health/liveness`, `/health/readiness`  
**Status:** SOURCE-CLOSED; runtime results remain environment-dependent.

## Ownership

Health & Readiness is a **read-only control-plane workspace**. It does not repair data, restart queues, mutate finance, rotate secrets, or alter domain records. It only reads sanitized operational probes and the production configuration validator, then links the operator to the owning admin section.

## Security boundary

The detailed diagnostic overview and production-readiness report are admin-only and require the `admin:platform:manage` capability. Public monitoring exposes only the conventional health/liveness/readiness contracts. Diagnostic payloads sanitize secrets, credentials, connection strings, tokens and URL-bearing detail fields.

## Release gate

`releaseReady` is deliberately stricter than configuration validation alone. It is true only when all three conditions hold:

1. **Configuration Ready** — `ProductionReadinessValidator` has no blockers.
2. **Runtime Ready** — required runtime health probes are UP.
3. **Monitoring Complete** — every expected operational probe is registered.

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

The workspace uses the current MANARATAK control-plane identity: dark green `#044A37`, secondary green `#235D4E`, gold `#E3B04B`, Cairo typography, and semantic green/amber/red health states. The shared Admin shell/navigation was aligned to the same palette during this closure.

## Runtime caveat

Source closure does not mean a deployment is healthy. Database, Redis, external storage, public-web reachability, payment transport, notifications, AI providers, secrets, and other probes report the truth of the environment in which the API is actually running.
