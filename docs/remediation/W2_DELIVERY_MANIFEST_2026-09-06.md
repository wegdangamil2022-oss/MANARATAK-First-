# MANARATAK W2 Delivery Manifest — 2026-09-06

## Delivered scope

This package contains the complete MANARATAK source workspace after W0/W1 remediation work and W2 source completion, including applications, packages, Prisma schema and migrations, tests, scripts, architecture/remediation documentation, workspace source data, CI configuration and lockfiles.

## Intentional package exclusions

- `.git/` — excluded because the local Git baseline in this execution environment is not the canonical GitHub history and must not be delivered as repository authority.
- `node_modules/` — excluded because dependencies are reproducible through `package-lock.json`; the local cache is incomplete and is the reason full `tsc`/Prisma CLI execution is unavailable here.
- transient OS/cache artifacts only.

## W2 evidence summary

- `W2_SOURCE_VERIFIER = PASS 84/84`
- W2 remediation test files = `PASS 15/15`
- Persistence boundary = `PASS`, `233/233` models, `0` direct cross-context writes
- Asset reference integrity = `PASS`, `28` direct + `4` JSON references
- DI reachability = `PASS`, `280/280` registrations reachable, `0` orphan registrations
- Source quality = `PASS`
- Modified TypeScript/TSX syntax-transpile = `PASS 157/157`

## Explicit pending external evidence

W2 is source-complete but the final database exit evidence is still pending because this environment has no PostgreSQL/Docker tooling. The greenfield seed orchestrator also blocks before mutation until P7 country review and authoritative currency/language datasets are supplied. See `W2_SOURCE_CLOSURE_2026-09-06.md`.
