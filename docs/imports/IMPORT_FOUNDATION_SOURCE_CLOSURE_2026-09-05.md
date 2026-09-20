# MANARATAK — Import Foundation Source Closure

**Date:** 2026-09-05  
**Mode:** SOURCE-ONLY / DATABASE-OFF

## Closure decision

Phase 06 Import Foundation is closed as a generic ingestion and staging platform. It owns source acquisition, raw artifact preservation, parsing, normalization, validation, deduplication, durable execution primitives, staging, provenance, retry/DLQ/checkpoint contracts, and a universal handoff envelope.

It does **not** own semantic merge, canonical creation/update, publication, or domain promotion. Those decisions remain with the owning domain.

## Changes in this closure

- Legacy `/admin/imports/**/promote` and `/transfer` compatibility endpoints are fail-closed and cannot mutate canonical domain records.
- Tests/Majors/Fellowships promotion use cases were removed from the generic Import Admin Router boundary.
- Scholarship Imports was removed as a duplicate permanent sidebar entry; its advanced workspace remains reachable from the central Imports Center/review flows.
- `CourseMasterArtifactParser` moved from `import-foundation` to the Courses application domain.
- Domain capabilities explicitly report `DOMAIN_HANDOFF_READY` or `STAGING_ONLY`; lack of a registered consumer is no longer presented as full integration.
- Current registered universal handoff consumers are Scholarships and Universities. Other domains remain honestly `STAGING_ONLY` until their owning domain supplies a consumer.

## Runtime status

- Database connected: **NO**
- Migrations applied: **0**
- Cloud SQL mutations: **0**
- Backfills/import execution against DB: **0**

Durable queue/checkpoint/DLQ/restart behavior still requires the later runtime/database closure gate. This does not reopen Phase 06 architecture.

## Source gate

Run:

```bash
npm run imports:source:verify
```

Expected: `IMPORT FOUNDATION SOURCE CLOSURE: PASS`.

## Verification evidence

- `node scripts/verify-import-foundation-source.mjs` → **PASS**
- `node scripts/quality/verify-source-quality.mjs` → **PASS**
- `node scripts/verify-w2-source.mjs` → **23/23 PASS**
- Modified TypeScript/TSX syntax transpilation → **9/9 PASS**
- Full `tsc -b` was not treated as a code failure because the isolated delivery workspace had an incomplete `npm ci --ignore-scripts` installation and reported only missing external type-definition packages (`TS2688`). No Prisma/postinstall/database operation was run.

## Final status

`IMPORT_FOUNDATION_SOURCE_STATUS = CLOSED`

`RUNTIME_DB_PROOF = DEFERRED_TO_RUNTIME_CLOSURE`
