# API Runtime Resource Lifecycle

**Authority:** active W1/W2 runtime lifecycle contract after `MNT-AUD-0040` remediation.

## Ownership

Each API process owns exactly one `RuntimeResourceRegistry`. The registry is the only active API source allowed to construct:

- the canonical Prisma client/pool used by repositories, database health and migration-history probes;
- the canonical general-purpose Redis command client used by distributed rate limiting, Redis health, Student Workspace delivery cache and CMS delivery cache.

A feature module must not construct a Prisma or Redis client directly. A future transport that technically requires a dedicated connection (for example a blocking BullMQ worker connection) must be explicitly registered in this lifecycle and documented as a justified separate resource.

## Startup

1. Normalize and validate `AppConfig`.
2. Construct logging.
3. Construct the process `RuntimeResourceRegistry`.
4. Resolve shared Redis for production distributed security controls.
5. Register DI repositories/caches against the same registry.
6. Connect/check the registry-owned Prisma client and Redis client.
7. Publish readiness only after required indicators are healthy.

## Shutdown

`SIGTERM` and `SIGINT` use one idempotent shutdown promise:

1. `runtimeResources.beginShutdown()` immediately makes the non-optional `runtime-lifecycle` readiness indicator report DOWN.
2. Stop recurring certificate worker scheduling.
3. Stop accepting new HTTP work (`closeIdleConnections()` + `server.close()`) while active requests drain.
4. Await any in-flight certificate completion worker iteration inside the same bounded drain window.
5. After the bounded drain, close Redis with `quit()` and Prisma with `$disconnect()` through `runtimeResources.closeAll()`.
6. A 15-second terminal timeout force-closes remaining HTTP connections and proceeds to resource cleanup instead of leaving shutdown blocked indefinitely.

Repeated signals/callbacks do not close shared infrastructure more than once.

## Vercel HTTP runtime

### Provisioning Preview boundary

While services are being provisioned, `VERCEL=1` AND `VERCEL_ENV=preview` selects
an isolated Express availability surface. `/` reports the provisioning mode,
liveness is UP, and readiness/health return 503 DOWN. Every business route and
every mutation method returns 503. There is no database connection, SQL, worker,
demo authentication or local-storage fallback. No configuration values are exposed.
This is NOT a functioning business API and must not be promoted as production-ready.
Production, staging outside Vercel Preview and traditional server.ts retain their
existing strict configuration/security/DI lifecycle. Replacing this provisioning
surface with authenticated business routes requires a separate, tested enablement
change after credentials/services are configured; setting values alone does not enable it.

Vercel's Express project uses `apps/api` as its root and discovers `src/app.ts`.
Its default export is a request adapter around `createApiApp()`, not the traditional
`src/server.ts` process. Concurrent requests share initialization; failed startup
closes partially initialized resources and returns a sanitized 503. Security and
production-readiness gates remain fail-closed. Liveness reports the HTTP process,
not dependency readiness; readiness must not be inferred from liveness or a Ready deployment.

`server.ts` remains the persistent host for polling workers, recurring-job registration,
port ownership and signal-driven shutdown. Do not import it into a Function. Worker
enablement flags do not cause the Vercel adapter to start these workers. Provision
their persistent host separately; HTTP readiness is not proof of worker availability.

On Vercel, telemetry has no periodic export timer: the adapter awaits a bounded
export after the response. Pools are reused within the warm instance, not closed
after each request. The traditional process keeps its periodic export and shutdown.

Run `npm run build -w @manaratak/api` then `npm run runtime:verify -w @manaratak/api`
to exercise the emitted Node ESM entrypoint, export contract, concurrent bootstrap,
real local HTTP requests, workspace/Prisma loading and failure handling without
external connections or SQL. This is not a replacement for deployment runtime tests.

The administrative catalog/dossier import routes still require explicit workspace
files on a persistent host (`process.cwd()/workspace/...`). They are not part of
HTTP bootstrap and must not be assumed available in a traced Function bundle.
