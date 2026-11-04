# Repository deep cleanup — 2026-11-04

Follow-up to [the first cleanup](REPOSITORY_CLEANUP_2026-11-04.md), based on `75e83145`. Code checkpoint: `db755484`. This review covers repository hygiene, source contracts and isolated tests; it does not certify every live user workflow or production provider.

## Removed and consolidated

- Retired 34 unreferenced one-off diagnostics for historical Asia reuse, phase-10 major catalog samples, individual major codes/countries/tests and old unauthenticated HTTP probes. Checked tracked application, package, script, test, workflow and operational references by filename and filename stem before deletion. These scripts were not executed. Current import commands, source datasets and governed administrative routes remain.
- Removed the corresponding 23 direct-Prisma classification entries, retaining the rule that missing/stale classifications and unreviewed database scripts fail the architecture guard.
- Removed 140 unused import bindings, 23 unused catch bindings and six unreachable local functions across 68 retained files. These include unused student metric/field components, an obsolete Admin-unavailable component and an unused security context reader. Sensitive-field omission, named DI dependencies and active route/permission contracts were preserved.
- Removed unused direct dependencies `clsx`, `tailwind-merge`, `ts-morph` and `autoprefixer`. This initial npm-generated lockfile cleanup removed nine entries without changing remaining package versions. Dependencies were then reconciled with `npm install --ignore-scripts`, pruning 43 obsolete installed packages without clearing the installation or running lifecycle/database scripts.
- Regenerated the source-only environment inventory after deletion: 363 variable names, with no environment values read or copied.

## Portable cleanup and security checks

- Replaced duplicated `rm -rf` cleanup commands with `scripts/maintenance/clean-build-output.mjs`. Root cleanup includes generated output for every npm workspace, including packages without their own build script. A workspace invocation stays within that package.
- Cleanup plans validate every workspace and output before deletion and reject linked outputs. Only `dist` and `tsconfig.tsbuildinfo` are targets. Source, dependencies, local configuration/private storage, import datasets and immutable release/evidence directories are retained. Generated outputs were cleaned and the entire project rebuilt successfully.
- Preview cleanup directly with `node scripts/maintenance/clean-build-output.mjs --dry-run`.
- Link rejection fixtures use real Unix symbolic links or real Windows directory junctions. Both must satisfy `lstat().isSymbolicLink()`; no test is skipped and no OS privilege is changed. Unix still exercises file links; Windows exercises native directory reparse points, including links at script/descriptor/artifact paths.
- Static descriptor/root links are rejected before reading linked metadata. A regression test verifies that the read is never attempted.
- The default Neon transport unit test now mocks the OS process boundary instead of relying on a Unix shebang executable. It still exercises the real default request builder and verifies credential placement on stdin, HTTPS/TLS/GET/no-redirect flags and exclusion of returned role passwords. No provider request is sent.
- The GNU tar test discovers Git's existing GNU tar on Windows instead of selecting incompatible BSD tar. The Node test runner uses two workers to bound process/resource contention.
- Updated the development linter's `minimatch` 10 dependency to **11.0.1** through a targeted override. Kept the legacy 3.x API required by ESLint intact. The [maintainer's advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249) identifies affected versions as `>=7.0.0 <11.0.1`; the [patched package](https://github.com/isaacs/minimatch/blob/v11.0.1/package.json) supports Node 22 and CommonJS/ESM. Verified the installed TypeScript-ESLint consumer resolves 11.0.1, checked its actual glob API and tested the amplification pattern at optimization level 2. The security update adds the upstream nonrecursive matcher dependency; no application dependency was upgraded.

## Validation

- Full npm-workspace build after generated-output cleanup: passed; repeated successfully after dependency pruning and the installed security update.
- Full workspace TypeScript after cleanup: passed.
- Complete Node suite on clean checkpoint `db755484`: **1,135 passed, zero failures, zero skips**. This resolves all seven Windows fixture failures recorded in the first cleanup.
- Repeated the entire Node suite after dependency reconciliation/security update on clean checkpoint `f53122ab`: **1,135 passed, zero failures, zero skips**.
- Cleanup safety regression tests: **3 passed**, including preservation of dependencies/private/storage/evidence and rejection of unknown or linked output locations.
- Full application Vitest: **843 files passed, 3 skipped; 6,272 tests passed, 8 existing skips; zero failures**. No skips were added by this cleanup.
- Final `ci:source:contracts`: passed, including architecture, authorization audit inventory, remediation and source plan closures; zero package/file dependency cycles.
- Full ESLint with the installed patched dependency: **zero errors, 4,860 warnings**, down from 5,061 at the previous cleanup. Existing explicit-`any`, effect-dependency and remaining unused-binding warnings remain visible; no lint rules were relaxed or warning baseline introduced.
- CI preflight: passed, including all 40 gate tests.
- Tracked-source secret signature scan: passed.
- Repository organization: passed; zero broken relative imports, important documentation links or evidence-integrity issues.
- Fresh production dependency audit (`npm audit --omit=dev`): **zero advisories**.

### Development audit discrepancy

The complete npm audit initially reported ten moderate entries from one `minimatch` advisory and its dependent linter packages. The affected installed 10.2.6 dependency was upgraded to 11.0.1. The final audit still exits nonzero with **nine moderate development-tool entries, zero high/critical**, all tracing to the three unchanged `minimatch` **3.1.5** copies used by ESLint.

The npm advisory payload reports `<11.0.1`, whereas the [maintainer-reviewed advisory updated November 4](https://github.com/advisories/GHSA-g3hv-75wg-m249) specifies **`>=7.0.0 <11.0.1`**. Those remaining 3.x copies are outside the stated affected range. This is documented as a registry/advisory range discrepancy; audit output was not suppressed or edited. A global replacement would break ESLint's legacy callable 3.x API, so the targeted override preserves it. The full development audit is not claimed as a zero-advisory pass.

No original-database connection, migration, seed, deletion, account/role/MFA change or external-provider activation was performed. Historical migration SQL, imported source datasets and signed/source-specific evidence remain unchanged. Local validation logs are outside the checkout in the owner's private `repository-deep-cleanup-20261104` directory.

The small temporary npm compatibility fixture in that private audit directory remains outside Git: automated safety review rejected its recursive removal with “blocked by policy” and supplied no detailed reason. No alternative deletion was attempted.
