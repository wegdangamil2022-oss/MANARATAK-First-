> **Authentication authority (2026-09-06):** `docs/operations/AUTH_TOKEN_KEY_ROTATION.md` is the active token/key-rotation runbook.

# Containerization, CI and Release Operations Manual

**Status:** SOURCE_COMPLETE — RUNTIME_EVIDENCE_PENDING  
**Updated:** 2026-10-19

This manual describes the executable repository today. It does not claim application Docker images, deployed environments, browser E2E, provider runtime, or production readiness unless those artifacts actually exist and are verified.

## 1. Local dependency topology

`docker-compose.yml` is a **development dependency topology only**. It contains exactly:

- `development-safety-gate`
- `postgres`
- `redis`
- `mailpit`

There are no `api`, `web`, or `admin` Compose services. Application processes run through their normal npm workspace commands outside Compose. A separate Linux review image is built by the isolated CI diagnostic described below; this does not turn the development Compose file into a deployment topology.

Generate guarded local credentials:

```bash
npm run compose:init
```

Start/stop dependency services only through:

```bash
npm run compose:up
npm run compose:down
```

These commands execute `scripts/dev/init-compose-env.mjs` and `scripts/dev/compose-safe.mjs`. The wrapper refuses staging/production-like use, requires a development environment, validates non-weak credentials, and Compose binds published PostgreSQL/Redis ports to `127.0.0.1`.

## 2. Local repository verification

`npm run verify:local` is the developer convenience aggregate and currently expands to source quality, typecheck, lint, build, repository tests and browser E2E. It therefore requires the full dependency/browser runtime and is **not** a zero-dependency verifier.

For source-only closure without DB/provider/browser runtime, use the registered source gates relevant to the change, including:

```bash
npm run quality:source
npm run ci:closure:manifest
npm run recovery:source:verify
```

A source-only PASS is not runtime certification.

## 3. Canonical CI workflow

`.github/workflows/ci.yml` contains six jobs:

1. **Full source closure gates**
   - checkout and Node 22.16.0 setup;
   - `npm ci`;
   - branch/commit governance checks;
   - source quality;
   - registered source-closure manifest;
   - Prisma source validation/client generation;
   - typecheck, lint, build and unit/source-integration tests;
   - deterministic immutable release artifact + checksum/SBOM/provenance generation and verification;
   - artifact/evidence upload.
2. **Translation quality gates**
   - dependency install;
   - source translation and semantic Arabic-copy verification.
3. **R08 isolated Redis and Linux worker shutdown**
   - provisions a new restricted Redis lab and exercises real Linux shutdown signals;
   - does not contact an existing Redis or database.
4. **Retrieve and verify immutable artifacts from Actions storage**
   - retrieves this run's exact-SHA API/Web/Admin units and verifies the independently retained manifest digest, unit hashes and SBOM.
5. **Linux x64 review image and native runtime**
   - depends on source closure and artifact retrieval;
   - prepares a fresh locked Linux runtime and non-root image, then checks native dependencies;
   - the explicitly authorized diagnostic provisions a new synthetic PostgreSQL16 lab and exercises the image and HTTPS student browser journey; workers and external providers remain disabled;
   - source presence is preparation only: acceptance requires the actual run receipt, cleanup and matching source SHA.
6. **Deployment configuration**
   - `docker compose config` only; it validates the dependency Compose file and does not build application containers.

General source jobs do not execute browser E2E. Playwright is restricted to the dependency-gated Linux review lab with its explicit authorization flag. That limited journey does not establish full browser acceptance or production readiness. Google AI Studio execution and its preview job have been retired.

## 4. Immutable release and environment promotion

W6 added `.github/workflows/release-promotion.yml` and the source commands:

```bash
npm run release:artifacts
npm run release:verify
npm run release:promote -- validation
npm run release:smoke -- validation
```

The workflow promotes the same source-bound artifact through `validation` → `staging` → `production` with environment approvals, checksum/SBOM/provenance verification, recovery preflight and post-deploy smoke hooks.

**Important:** workflow/source presence is `SOURCE_COMPLETE`; provider/control-plane execution, environment approvals, deployed smoke results and rollback rehearsal remain `PENDING_NON_BLOCKING` until actually executed.

## 5. Recovery and observability

- Recovery authority: `docs/operations/PLATFORM_DISASTER_RECOVERY_RUNBOOK.md` and `.github/workflows/recovery-restore-audit.yml`.
- Observability authority: `docs/operations/OBSERVABILITY_RUNBOOK.md` plus W6 OTLP/HTTP source configuration.

Production backup readiness, whole-platform restore rehearsal, telemetry export, alert delivery and measured RPO/RTO require real runtime/provider evidence.

## 6. Runtime evidence currently pending

The following are not converted into source PASS results:

- disposable PostgreSQL migration/integration/recovery execution;
- application/container deployment on a selected platform;
- validation/staging/production control-plane promotion evidence;
- browser E2E against deployed Web/Admin/API;
- real OTLP collector export and alert delivery;
- provider-specific notification/asset/finance/AI integrations where configured;
- whole-platform backup/restore drill and measured RPO/RTO.

## 7. Source-checked operational paths

W7 verifies that every script/workflow/file path named as executable in this manual exists and that Compose service claims equal the actual `docker-compose.yml` service keys. Nonexistent deployment wrappers, application Compose service claims, and browser execution outside the explicitly authorized Linux review boundary fail source verification.
