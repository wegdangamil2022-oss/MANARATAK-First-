# Final Handoff Manifest

Status: `SOURCE REMEDIATION IN PROGRESS / DB AND RUNTIME EVIDENCE PENDING`

## Canonical Root

The checked-out MANARATAK repository root. Historical machine-specific paths are not operational authority.

## Source Tree

- Applications: `apps/api`, `apps/web`, `apps/admin`.
- Architecture packages: `packages/domain`, `packages/application`, `packages/infrastructure` plus shared foundation/UI/config packages.
- Operational and verification tooling: `scripts`; archived one-offs are under `scripts/archive`.
- Data/import sources: `workspace`; these are not runtime TypeScript source.
- Architecture, operations, phase history, and remediation evidence: `docs`.

## Runtime Prerequisites

- Node.js 22.16.0 (supported range `>=22.16.0 <23`) and npm `>=10.9.0 <11`.
- Dependencies restored from `package-lock.json` using `npm ci` in the approved environment.
- A clean or explicitly selected PostgreSQL target supplied securely in the controlled runtime environment.
- Redis when required by the selected runtime composition.
- Environment values based on `.env.example`; no real credentials are included.

## Current Gates

- Database-operation authority: [Greenfield Database Provisioning and Mutation Safety](../../operations/GREENFIELD_DATABASE_PROVISIONING.md).
- Tracked Google Studio closure groups: 96.
- Database runtime evidence: pending against a verified clean/selected PostgreSQL target; no historical/original database is required.
- Full build/tests: require a complete dependency installation and controlled runtime; source-only checks do not certify runtime closure.
- Phase 10: source freeze prepared, final freeze pending DB/runtime.
- Phase 11: contracts prepared, bulk import blocked.

## University Stage 1

- Canonical source location: `workspace/import-sources/universities/stage-1`.
- Workbooks: 6; rows: 10,723.
- Duplicate/invalid `INS-*`: 0; IDs changed: 0.
- Imported Universities: 0; database writes: 0.
- Evidence: [Phase 1 source Dry Run](../wp10/PHASE_1_UNIVERSITY_SOURCE_DRY_RUN_REPORT.md).

## Handoff Exclusions

Exclude from the final ZIP:

- `.git` because its object database/refs are invalid and it is not required to run the source.
- `node_modules`, `dist`, `build`, `coverage`, `.cache`, `.turbo`, `.vite`, Playwright/test reports, logs, PID files, temp directories, and local `.env*` except `.env.example`.
- Conversation `work/` and `outputs/` directories outside the canonical project root.

Retain `workspace/reports/remediation-history` as historical evidence; it is not runtime input unless an explicit document says otherwise.

## Critical SHA-256

| Artifact | SHA-256 |
|---|---|
| Original recovery ZIP `manaratak (3).zip` | `C44D19D0C35C9A7D3A3C10AD3502339D30C2C283827F58FBE99CDBCD94EF3B39` |
| `package-lock.json` | `C20DA6FE1C965FB43C2B8EC4D29CC3F9D98FB655E989A420C94C4087863E50D5` |
| `package.json` | `203D1C376EF1F60CE1AAE679C34BE0BA34848ADA6C2210D7C45E165F6D187CFB` |
| `README.md` | `BFB94260161E71D6C12B69027D7C7B067ACF184B833675EAF2BB53E735EDA9F8` |
| Prisma schema | `33FFC508687FA39BDC471E038930EC7B4AB13229D1C5E73171081AEF3D895AEF` |
| Google Studio master register | `7918C7014044B0487D45756670E5CF473A713ADE28AC4BC73D0C390C19CB6DDB` |
| University Stage 1 Dry Run report | `3CCBF9125C565A39A49D681C1DFADEA154B9D6470B3205EF9DCC062134DEA923` |

University workbook fingerprints are recorded in the Dry Run report and were verified against the unchanged Downloads originals after copying.

## Handoff Rule

Do not start schema/data mutations merely because the source handoff is organized. Follow `docs/operations/GREENFIELD_DATABASE_PROVISIONING.md`: verify the exact target, explicitly authorize one mutation purpose, capture before/after and referential evidence, retain rollback/recovery artifacts, and record executable build/test output.
