# MANARATAK — Codex Exact-Artifact Verification Handoff — 2026-09-07

Use the reconciled ZIP/SHA produced from this source tree. Do not substitute an older W7/W6 archive.

## 1. Dependency-complete source CI

Run from repository root on Node 22.16.0:

```bash
npm ci
DATABASE_MUTATIONS_ALLOWED=false DATABASE_ENVIRONMENT=source npm run ci:closure:manifest
npm run db:source:verify
npm run typecheck
npm run lint
npm run build
npm run test:unit
npm run release:artifacts
npm run release:verify
```

Required result: all commands exit 0. Do not mark the artifact Source CI Verified if any registered SOURCE gate is skipped or returns non-zero.

The canonical closure manifest includes Translation. `translation:ci` must execute its schema, source-quality and Vitest behavior regressions with the database mutation guards above.

## 2. Runtime/database verification

Only against an authorized disposable environment:

```bash
MANARATAK_DATABASE_INTEGRATION_ENABLED=true DATABASE_URL=<disposable-postgres> npm run test:database
```

Never point database integration/recovery rehearsal at an unapproved production database.

## 3. Browser verification

Against a live composed/deployed target:

```bash
npm run e2e
```

Capture Admin, Public, Student, learner, Services and Certificates journey evidence plus deployed locale/SEO/accessibility behavior as required by the runtime register.

## 4. Recovery/provider/deployment evidence

Follow `docs/remediation/W7_RUNTIME_PENDING_CHECKS.md` and `docs/remediation/W6_RUNTIME_PENDING_CHECKS.md` for:

- OTLP collector/provider proof;
- PostgreSQL + asset backup readiness;
- PITR/whole-platform restore drill;
- measured RPO/RTO;
- validation → staging → production immutable artifact promotion;
- post-deploy smoke and rollback rehearsal;
- provider sandboxes and external integrations.

## 5. Repository governance evidence

Capture separately:

- `main` branch protection/ruleset state;
- required CI checks;
- force-push/delete restrictions;
- merged commit/PR identity;
- independent review attestation.

## Release decision

Source reconciliation alone is not a Production Ready certificate. Promote only after the exact artifact passes the dependency-complete and required runtime/governance evidence gates.
