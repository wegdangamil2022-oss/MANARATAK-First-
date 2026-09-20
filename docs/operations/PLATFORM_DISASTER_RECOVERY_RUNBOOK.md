# MANARATAK Platform Disaster Recovery Runbook

## Authority and objectives
The machine-readable authority is `config/recovery/production-recovery-contract.json`. The current architecture target is regional-loss **RPO <= 5 minutes**, **RTO <= 60 minutes**, with PostgreSQL PITR available for at least 30 days. Source implementation is complete in W6; provider/database execution evidence is `PENDING_NON_BLOCKING` until the production provider and isolated restore environment are connected.

## Durable-state ownership
- PostgreSQL: Platform/SRE owns continuous PITR, daily snapshots, distinct backup KMS custody, access audit, and immutable WORM copies in a separate security boundary.
- Asset/object storage: Platform/SRE owns versioning, cross-region backup, immutable WORM retention and checksum manifests.
- Release/recovery evidence and provider configuration manifests are retained with the corresponding release/audit evidence.

## Point-in-time restore
1. Freeze writes/traffic using the deployment control plane.
2. Select the newest valid recovery point before the incident within the 30-day PITR window.
3. Restore into an isolated disposable target first; never restore destructively over the only surviving copy.
4. Run `npm run recovery:restore:drill` with `MANARATAK_DATABASE_INTEGRATION_ENABLED=true`. The drill validates every persisted P07-P21 owner, PostgreSQL constraints/transactions, outbox/idempotency/job primitives, and object checksum integrity.
5. Record the measured RPO/RTO and immutable evidence. Unmet objectives are an operations/release finding.

## Regional failover / traffic cutover
Restore/verify core state in the standby region, validate readiness and telemetry, deploy the exact already-approved immutable artifact digests, run post-deploy smoke checks, then switch traffic through the approved control plane. Do not rebuild from an unreviewed branch during an incident.

## Rollback
Application rollback re-promotes the previous approved artifact digests. Schema rollback follows the migration recovery manifest and forward-fix policy; destructive reset is forbidden. Data rollback uses PITR only after preserving incident evidence and validating the target in isolation.

## Scheduled restore audit
`.github/workflows/recovery-restore-audit.yml` is the weekly execution authority. It fails when required provider secrets/snapshot inputs are absent in that environment; absence is not treated as successful evidence.
