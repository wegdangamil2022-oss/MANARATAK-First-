# W6 Runtime Evidence — PENDING_NON_BLOCKING

**Wave:** W6 — Tests / Reliability / DevOps  
**Source decision:** Source implementation is complete; the checks below require an external database, provider, deployment control plane, or browser runtime.  
**Policy:** These checks are explicitly `PENDING_NON_BLOCKING` and do not reopen source remediation.

| Area | Status | Runtime command / evidence required |
|---|---|---|
| Disposable PostgreSQL integration | `PENDING_NON_BLOCKING` | `MANARATAK_DATABASE_INTEGRATION_ENABLED=true DATABASE_URL=<disposable-postgres> npm run test:database` |
| OTLP telemetry export + provider alert backend | `PENDING_NON_BLOCKING` | Run API against configured `OTEL_EXPORTER_OTLP_ENDPOINT`; verify metrics/traces, worker/outbox health and alert delivery in the selected provider. |
| Production backup readiness | `PENDING_NON_BLOCKING` | Supply `RECOVERY_POSTGRES_READINESS_JSON` and `RECOVERY_ASSET_READINESS_JSON`, then run `npm run recovery:runtime:readiness`. |
| Whole-platform restore drill | `PENDING_NON_BLOCKING` | Supply a disposable PostgreSQL target, backup artifact and asset backup/manifest; run `npm run recovery:restore:drill`. |
| Validation → staging → production promotion | `PENDING_NON_BLOCKING` | Execute `.github/workflows/release-promotion.yml` with the deployment control-plane secrets/environments and retain immutable evidence. |
| Post-deploy smoke / rollback rehearsal | `PENDING_NON_BLOCKING` | Run release smoke against real validation/staging/production endpoints and exercise rollback through the deployment control plane. |
| Browser E2E | `PENDING_NON_BLOCKING` | Execute the browser E2E suite against a live composed deployment. |

## Closure rule

A runtime row becomes PASS only when its external evidence is captured. Missing external infrastructure is not converted into a fabricated PASS and does not block **W6 SOURCE CLOSED**.
