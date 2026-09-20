# WP1-E Delivery Reality Report

Status: `SOURCE CLASSIFIED / RUNTIME VALIDATION PENDING`

| Capability | Classification | Evidence / limitation |
|---|---|---|
| GitHub CI configuration | `IMPLEMENTED` | `ci.yml` defines install, typecheck, lint, build, test, E2E, and Compose validation |
| CI execution result | `RUNTIME_VALIDATION_REQUIRED` | No current workflow run was verified |
| Test/typecheck automation | `IMPLEMENTED` | Root scripts and CI stages exist; success is not claimed |
| Prisma generation | `IMPLEMENTED` | `postinstall` is the single automatic trigger; `db:generate` remains manual |
| Local dependency Compose | `IMPLEMENTED` | Postgres and Redis only |
| Local Compose execution | `RUNTIME_VALIDATION_REQUIRED` | No Docker command was executed |
| API/Web/Admin images | `DEFERRED` | No Dockerfiles exist |
| Production containerization | `DEFERRED` | No production image or entrypoint exists |
| Deployment automation | `DEFERRED` | No release/deploy scripts or target pipeline exists |
| Environment validation | `IMPLEMENTED` | Production startup validation exists in source |
| Deployment migrations | `DEFERRED` | No migration-on-deploy automation |
| Deployment readiness gate | `DESIGNED` | Health endpoints exist; no deployment pipeline consumes them |
| Git hooks | `STALE/BROKEN` removed | Hooks referenced absent `scripts/git/*` |

Before, CI could invoke Prisma generation through `postinstall`, an explicit CI step, `pretypecheck`, `prebuild`, and `pretest`. After remediation, installation invokes `postinstall` once. Playwright installation remains because E2E requires its browser binary.

The devcontainer `postCreateCommand` and root `bootstrap` remain distinct explicit setup entry points. Compose previously referenced three missing application Dockerfiles and carried obsolete demo Admin settings. Those broken services were removed; Compose now states its actual local dependency scope.
