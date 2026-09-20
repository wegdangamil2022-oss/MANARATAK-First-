> **Authentication authority (2026-09-06):** `docs/operations/AUTH_TOKEN_KEY_ROTATION.md` is the active token/key-rotation runbook.

# Containerization, CI and Release Operations Manual

**Status:** SOURCE_COMPLETE — RUNTIME_EVIDENCE_PENDING  
**Updated:** 2026-09-07

This manual describes the executable repository today. It does not claim application Docker images, deployed environments, browser E2E, provider runtime, or production readiness unless those artifacts actually exist and are verified.

## 1. Local dependency topology

`docker-compose.yml` is a **development dependency topology only**. It contains exactly:

- `development-safety-gate`
- `postgres`
- `redis`

There are no `api`, `web`, or `admin` Compose services and no application Dockerfiles are claimed by this manual. Application processes run through their normal npm workspace commands outside Compose.

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

`.github/workflows/ci.yml` contains three jobs:

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
3. **Deployment configuration**
   - `docker compose config` only; it validates the dependency Compose file and does not build application containers.

The canonical CI does **not** claim a Playwright browser-E2E job. Browser E2E remains runtime evidence unless a dedicated executable workflow is added and verified.

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

W7 verifies that every script/workflow/file path named as executable in this manual exists and that Compose service claims equal the actual `docker-compose.yml` service keys. A documentation change that reintroduces nonexistent deployment wrappers, application Compose services, or browser-E2E claims inside the canonical CI workflow must fail source verification.
