# MANARATAK 2.0 GitHub vs Studio File Tree Report

## Required Root Files
- `pnpm-workspace.yaml`: **Missing**
- `tsconfig.json`: **Missing**
- `tsconfig.base.json`: **Present**
- `vitest.config.ts`: **Missing**
- `vitest.workspace.ts`: **Missing**
- `package.json`: **Present**
- `package-lock.json`: **Present**
- `.env.example`: **Present**
- `README.md`: **Present**

## Required Folders
- `apps/`: **Present**
- `packages/`: **Present**
- `docs/`: **Present**
- `scripts/`: **Present**
- `tests/`: **Missing**

## Intentionally Absent or Required Folders
- `assets/`: **Missing**
- `tools/`: **Missing**
- `download_server/`: **Missing**

## Unexpected Temporary Files Present at Root
- `collect-stubs.cjs`
- `i18n_transform.js`
- `i18n_transform.ts`
- `merge_dicts.cjs`
- `merge.cjs`
- `result.md`
- `build.log`
*(Additional temporary script and log files found: `override-tests.js`, `rewrite.js`, `update-schol.js`, `update-univ.cjs`, `test-results.log`)*

## Impact of Missing Files
- **`tsconfig.json`**: Its absence can break TypeScript project references, IDE type-checking, and cross-workspace compilation.
- **`vitest.config.ts` & `vitest.workspace.ts`**: The absence of these files breaks the test runner at the root level. Tools like `vitest` rely on the workspace configuration to execute tests across the monorepo successfully.
- **`pnpm-workspace.yaml`**: Missing, but since `package-lock.json` is present, the project is currently using npm workspaces. This shouldn't break the build if `package.json` has a `workspaces` array, but it deviates from the expected GitHub source (which apparently used pnpm).
- **`tests/` folder**: If root-level tests are missing, we lose coverage for integrations or end-to-end setups located there.
- **`assets/`, `tools/`, `download_server/`**: These folders can generally be safely ignored for compilation unless there are hardcoded build scripts or runtime paths depending on them.

## Recommended Safe Cleanup and Recovery Steps
1. **Remove Temporary Files:** Safely delete the unexpected `.cjs`, `.js`, `.ts` scripts generated for ad-hoc tasks, as well as logs and markdown results (`rm *.cjs override-tests.js rewrite.js update-*.js i18n_transform.* result.md build.log test-results.log`).
2. **Restore Build Configuration:** Retrieve and place `tsconfig.json`, `vitest.workspace.ts`, and `vitest.config.ts` from the GitHub repository into the root to restore testing and TS workspace integrity.
3. **Check Test Suites:** Assess if the `tests/` folder is necessary for local verification and restore it if required.
