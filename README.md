# MANARATAK 2.0

The official repository is **wegdangamil2022-oss/MANARATAK-First-**.
It contains the complete API/Web/Admin monorepo.
From the repository root, run `npm ci` then `npm run dev` (Public Web, port 3000).
Admin: `npm run dev:admin`. Configure backend capabilities explicitly for an isolated runtime.
See [local development](docs/operations/LOCAL_DEVELOPMENT.md)
and the [environment inventory](docs/operations/ENVIRONMENT_INVENTORY.md).
The former MANARATAK_FINAL and Manaratal-Final repositories are historical references only; do not push changes to them.
See [repository adoption and restoration](docs/operations/OFFICIAL_REPOSITORY.md).

MANARATAK is an npm-workspaces monorepo containing the public web application, API, Admin application, domain packages, import foundation, source datasets, and architecture/remediation evidence.

## Current Status

`main` contains the consolidated API, public/student application and dedicated Admin application. The [repository quality follow-up](docs/reviews/REPOSITORY_QUALITY_FOLLOWUP_2026-11-04.md) records the latest source review, validation results and remaining warnings.

Earlier implementation and environment evidence remains in the [historical work index](docs/remediation/POST28_UNIFIED_WORK_INDEX_2026-10-19.md). Historical import counts and branch-specific acceptance results are not live database status. A successful source build does not establish production readiness.

Database operations are governed by `docs/operations/GREENFIELD_DATABASE_PROVISIONING.md`; remediation state is tracked separately from runtime/database evidence.

## Repository Layout

- `apps/api`: Express API and composition root.
- `apps/web`: Public web application and same-origin readiness previews.
- `apps/admin`: Dedicated Admin application.
- `packages/domain`: Domain contracts, policies, and invariants.
- `packages/application`: Application use cases and domain adapters.
- `packages/infrastructure`: Prisma and external infrastructure adapters.
- `packages/core`, `packages/shared`, `packages/config`, `packages/types`, `packages/ui`: shared foundations.
- `scripts`: operational, import, database, and source-verification scripts. One-off patch scripts have been removed; reusable runtime checks live under `scripts/testing`.
- `workspace`: source datasets, import artifacts, catalog indexes, reconciliation evidence, and generated reports. It is not application source.
- `docs`: architecture, phase specifications, operations, implementation history, and remediation evidence.
- `tests`: repository-level test entry points.

## Package Manager

The canonical package manager is **npm**.

- Lockfile: `package-lock.json`
- Workspaces: `apps/*`, `packages/*`
- Runtime requirement: Node.js 22.16.0 (supported range `>=22.16.0 <23`) and npm `>=10.9.0 <11`

Historical import and validation evidence under `workspace` is inert and does not select a package manager.

## Commands

```bash
npm ci
npm run db:generate
npm run typecheck
npm run lint
npm run build
npm run test
npm run e2e
```

Development entry points:

```bash
npm run dev
npm run dev:admin
npm run start
```

`npm start` serves built Web/Admin static assets only; API requests require the API service or an explicitly configured reverse proxy. It is not the original-database launcher used by the local owner environment.

Dependencies are not included in the handoff. Build and test results must be established in a controlled runtime environment; source-only verification is not runtime certification.

## Database Safety

The Prisma schema is `packages/infrastructure/prisma/schema.prisma`. Database writes are governed by the Greenfield Database Mutation Gate in `docs/operations/GREENFIELD_DATABASE_PROVISIONING.md`. The gate requires explicit provisioning approval, mutation authorization, environment/purpose declaration, and exact non-secret target confirmation. Production mutations require a separate production authorization and change identifier.

Do not bypass the mutation gate with direct Prisma/SQL commands. Do not run database reset, unapproved migrations, backfills, canonical ID regeneration, or bulk imports outside the reviewed operation-specific flow.

## Import Platform

Generic imports flow through Phase 6 `UniversalImportHandoff`; each owning domain decides matching, duplicate resolution, validation, promotion, and persistence.

Source datasets live under `workspace`. A file is inert until explicitly selected with its import type and target domain. Direct spreadsheet-to-Prisma/SQL imports and automatic root-folder imports are prohibited.

University Stage 1 evidence is documented in `docs/remediation/wp10/PHASE_1_UNIVERSITY_SOURCE_DRY_RUN_REPORT.md`.

## Environment

Use `.env.example` as the variable-name template. It contains no usable credentials. Keep real secrets outside source control and use strict authentication in deployed environments.

## Repository hygiene

The active applications are `apps/web` (students/public), `apps/admin` (the only Admin UI), and `apps/api`. Legacy administrative URLs in Web redirect to Admin.

Section-specific test profiles live under `config/testing/review`; the root `vitest.config.ts` is the unit-test entry point. Google Studio launchers and export metadata are not supported. Historical migration SQL and signed/source-specific evidence remain unchanged.

`npm run clean` removes generated `dist` and TypeScript build-state files across workspaces. Preview its targets with `node scripts/maintenance/clean-build-output.mjs --dry-run`. Dependencies and local runtime storage are retained.

See [the quality follow-up](docs/reviews/REPOSITORY_QUALITY_FOLLOWUP_2026-11-04.md), [the deep-cleanup review](docs/reviews/REPOSITORY_DEEP_CLEANUP_2026-11-04.md) and [the initial cleanup inventory](docs/reviews/REPOSITORY_CLEANUP_2026-11-04.md) for removal rationale and verification results.
