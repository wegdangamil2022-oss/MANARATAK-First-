# Final Repository Organization Report

Status: `COMPLETE — BUILD/TEST RUNTIME VALIDATION PENDING GOOGLE STUDIO`

Date: 2026-08-12

## Scope and Safety

The repository was organized without database access, migrations, schema edits, ID regeneration, relationship remapping, downloads, installs, or University import. Every moved active artifact had its consumers updated first. Ambiguous one-off tools were archived rather than deleted.

## Root Before

Directories:

`.devcontainer`, `.git`, `.github`, `.husky`, `apps`, `docs`, `MANARATAK_International_Tests_56_Unified`, `packages`, `scripts`, `tests`, `workspace`.

Files:

`.dockerignore`, `.editorconfig`, `.env.example`, `.gitignore`, `.nvmrc`, `.prettierrc`, `build_check.log`, `bun.lock`, `docker-compose.yml`, `eslint.config.js`, `extract_constants.py`, `final-validation-all.ts`, `final_matching_data.json`, `find_blob.py`, `fix-cards.cjs`, `fix-cards2.cjs`, `fix-list-cities.cjs`, `fix-tests.cjs`, `fix_app.cjs`, `fix_app.js`, `fix_app2.cjs`, `fix_ielts.py`, `full_matching_analysis.json`, `generate-uni-page.js`, `generate_analysis.py`, `import-masters-range.ts`, `import_continents.log`, `import_majors.log`, `LICENSE`, `list_filenames.py`, `MANARATAK_Americas_Admin_Regions.csv`, `MANARATAK_Americas_Cities_All_Combined.csv`, `manifest_56.json`, `mapping_results.json`, `match_tests.py`, `metadata.json`, `old_49.json`, `out.json`, `package-lock.json`, `package.json`, `parse_old_49.py`, `patch-seed.ts`, `patch.cjs`, `patch_script.cjs`, `patch_script.js`, `patch_script2.cjs`, `print_tables.py`, `query.ts`, `README.md`, `run_build_check.sh`, `run_mocked.ts`, `schema_new.prisma`, `schema_old.prisma`, `schema_old_clean.prisma`, `server.log`, `server.pid`, `snapshot-500.json`, `step4_report.md`, `step8_3_report.md`, `step8_4_report.md`, `step_IT_MIG_1_report.md`, `test-disconnect.ts`, `test-html.js`, `test_redis.js`, `test_redis.ts`, `test_session_manager.ts`, `tsconfig.base.json`, `tsconfig.json`, `turbo.json`, `update_login.patch`, `verify_complete_matching.py`, `vitest.config.ts`, `vitest.workspace.ts`.

## Root After

Directories:

`.devcontainer`, `.git`, `.github`, `.husky`, `apps`, `docs`, `packages`, `scripts`, `tests`, `workspace`.

Files:

`.dockerignore`, `.editorconfig`, `.env.example`, `.gitignore`, `.nvmrc`, `.prettierrc`, `docker-compose.yml`, `eslint.config.js`, `LICENSE`, `package-lock.json`, `package.json`, `README.md`, `tsconfig.base.json`, `tsconfig.json`, `turbo.json`, `vitest.config.ts`, `vitest.workspace.ts`.

Every remaining root file is repository configuration, package metadata, environment template, license, or primary documentation.

## Classification and Actions

| Category | Before action | Final action |
|---|---|---|
| Repository/config files | `KEEP_IN_ROOT` | Retained |
| `package-lock.json` | `KEEP_IN_ROOT` | Canonical npm lockfile retained |
| `bun.lock` | `ARCHIVE` | Moved to `workspace/reports/remediation-history/lockfiles/bun.lock.legacy` |
| Active root CLI scripts | `MOVE` | Moved to `scripts/verify` and `scripts/import`; test imports updated |
| International Test content/reconciliation | `MOVE` | Moved to `workspace/import-sources/international-tests` |
| Americas Reference Data | `MOVE` | Moved to `workspace/reference-data/{regions,cities}/americas` |
| Schema comparisons and step reports | `ARCHIVE` | Moved under `workspace/reports/remediation-history` |
| One-off fix/generator/query scripts | `ARCHIVE` | Moved to `scripts/archive/remediation-root` |
| Patch artifacts | `ARCHIVE` | Moved to `workspace/reports/remediation-history/archive/patches` |
| Logs and PID | `DELETE_CANDIDATE` | Deleted after zero-consumer check |
| University Stage 1 workbooks | External source | Copied byte-for-byte to `workspace/import-sources/universities/stage-1` |

## Files Deleted

Only runtime artifacts were deleted: `build_check.log`, `import_continents.log`, `import_majors.log`, `server.log`, and `server.pid`.

No source, test, documentation, import dataset, reconciliation evidence, ID, or relationship was deleted.

## Paths Updated

- CLI tests now reference `scripts/verify/final-validation-all.ts` and `scripts/import/import-masters-range.ts`.
- Major validation reads `workspace/reconciliation/majors/snapshot-500.json`.
- International Test parser tests and importer use `workspace/import-sources/international-tests`.
- The WP-1 manifest records the canonical International Test source location.
- Broken API test imports were replaced with the public `@manaratak/application` boundary.
- Login CSRF uses the existing public `@manaratak/shared` boundary.
- Two incorrect WP8 register links were corrected to actual WP1/WP7 register names.

## Scripts

Active/gated scripts retained outside archive: 83.

- Active verification/diagnostic: 56.
- DB/import operations: 25; retained for Google Studio closure but not authorized locally.
- Source generator: 1.
- Other DB diagnostic: 1.
- One-off archived scripts: 35.

The active scripts remain mostly flat because many have root-relative imports. A mass folder move would change behavior and is therefore deferred rather than performed for appearance alone.

## Workspace Ownership

- `catalog-index`: generated Phase 10 lookup index.
- `phase-10-major-catalogs`: canonical Major source catalogs.
- `phase-10-major-detail-dossiers`: Major detail source artifacts.
- `reference-data`: Country/Region/City source datasets.
- `import-sources`: International Test and University immutable import sources plus reconciliation artifacts.
- `reconciliation`: source-side snapshots used by verification.
- `reports`: generated and historical evidence, not runtime application source.

There are no duplicate active International Test source locations and no University files in root.

## Package Manager

Canonical manager: `npm`. Evidence: npm workspaces in `package.json`, `package-lock.json`, CI `npm ci`, devcontainer `npm install`, and npm commands in operations documentation. Active lockfiles: `package-lock.json` only.

## Git Metadata

`.git` is incomplete. `HEAD`, `refs/heads/main`, and remote refs point to missing object `4276f01bb8e0e20bc363be9429e37c321d6054eb`; `git fsck` reports invalid SHA-1 pointers. It was not repaired. Exclude `.git` from the final handoff ZIP.

## Verification

- Unexpected root files/directories: 0.
- Temporary runtime artifacts: 0.
- Broken relative source imports found by static verifier: 0.
- Broken important README/remediation links: 0.
- Competing root lockfiles: 0.
- Duplicate active source locations: 0.
- Prisma schema SHA-256 unchanged: `33FFC508687FA39BDC471E038930EC7B4AB13229D1C5E73171081AEF3D895AEF`.
- Major identities: 3,402; duplicate/malformed: 0.
- International Tests: 56 active, 3 archived; duplicate IDs/slugs: 0.
- University source workbooks: six hash-matched copies; original files modified: 0.
- Build/tests: `BUILD/TEST RUNTIME VALIDATION PENDING GOOGLE STUDIO`.

## Size

- Before organization: 65,316,384 bytes, excluding `.git`, dependencies, caches, and build artifacts.
- After organization: 66,116,186 bytes under the same exclusions.
- Size change includes six intentionally added University Stage 1 source workbooks and the final handoff documentation.

## Unresolved Items

- Corrupt Git metadata requires independent reinitialization/attachment after handoff.
- Database recovery, migrations, build, tests, and runtime closure remain in Google Studio.
- DB/import scripts remain gated; their presence is not authorization to execute them.
