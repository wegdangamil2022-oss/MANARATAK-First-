> **Authentication authority (2026-09-06):** `docs/operations/AUTH_TOKEN_KEY_ROTATION.md` is the active token/key-rotation runbook.

# Google Studio Handoff — Imported Courses

## Deployment model for this handoff

WP-IC-10R1 closes the **code/contracts/source-CI** side only. No PostgreSQL instance is required or contacted while this repair is authored, reviewed, or accepted by Codex. Database integration, backup/restore, browser E2E, and runtime smoke are implemented and remain pending until Google Studio supplies the runtime/database environment.

Google Studio is the runtime integrator after code closure. Its job is to configure environment variables, connect the selected PostgreSQL database, apply only reviewed repository migrations, start API/web services, connect the already-implemented import workflows, and run smoke verification. It must not invent a second import architecture, dedup engine, persistence contract, or migration workaround.


Google Studio is the runtime/deployment consumer after WP-IC-10. It should not invent or replace the imported-course architecture.

## Google Studio responsibilities
1. Configure environment variables using the canonical repository `.env.example` and deployment secret manager; run `node scripts/config/verify-environment-contract.mjs` before deployment.
2. Connect PostgreSQL using `DATABASE_URL`.
3. Connect Redis when required by the target environment.
4. Run reviewed Prisma migrations with `prisma migrate deploy`.
5. Start API and web services using the repository commands.
6. Run liveness/readiness and WP-IC-10 runtime smoke.
7. Display/use the existing Course Import Center and provider continuation workflows.

## Required production/staging configuration
At minimum validate real, non-placeholder values for:
- `JWT_ACTIVE_KEY_ID`, `JWT_PRIVATE_KEY_PEM`, `JWT_PUBLIC_KEY_PEM`, `JWT_ISSUER`, `JWT_AUDIENCE`
- `CSRF_SECRET`, `SECURE_COOKIE=true`
- `ADMIN_AUTH_MODE=strict`, `TRUST_PROXY_HOPS`
- `DATABASE_URL`, managed `REDIS_URL`
- `API_BASE_URL`, `PUBLIC_WEB_URL`, `ADMIN_WEB_URL`, `CORS_ORIGIN`
- `LOG_LEVEL`, `SECURITY_CSP_ENABLED=true`
- `SECURITY_RATE_LIMIT_MAX`, `SECURITY_RATE_LIMIT_WINDOW_MS`
- `CERTIFICATE_COMPLETION_WORKER_ENABLED=true`, `CERTIFICATE_COMPLETION_WORKER_INTERVAL_MS`

Frontend deployment must also provide the reviewed `VITE_*` settings appropriate to the deployment topology.

## Deployment sequence
```text
Configure secrets/env
      ↓
Connect PostgreSQL
      ↓
Restore/rehearse backup where required
      ↓
prisma migrate deploy
      ↓
Start API/web
      ↓
Liveness + readiness
      ↓
WP-IC-10 runtime smoke
      ↓
Open Course Import Center
```

## Explicit non-responsibilities
Google Studio must not:
- create a new Course import schema;
- bypass Asset/Phase 06 staging;
- perform direct canonical Course seed writes;
- replace provider/source identity logic with URL identity;
- auto-publish imported courses;
- add a generic uncontrolled crawler;
- invent new migrations to make an environment-specific failure disappear.

A failed migration, smoke, or runtime-closure gate must return to repository/Codex remediation instead of being patched ad hoc in Google Studio.
