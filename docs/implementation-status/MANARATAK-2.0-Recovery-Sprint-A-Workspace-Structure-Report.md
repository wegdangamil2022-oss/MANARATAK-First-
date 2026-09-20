# MANARATAK 2.0 - Recovery Sprint A - Workspace Structure Report

## Summary
The goal of this sprint was to recover the workspace structure to match the intended MANARATAK 2.0 monorepo baseline and resolve build issues without modifying business logic.

## Files Restored
The following essential workspace configuration files were recreated:
- `pnpm-workspace.yaml`
- `tsconfig.json`
- `vitest.config.ts`
- `vitest.workspace.ts`

*Note: Minor fix applied to `packages/application/src/courses/index.ts` to export `EnterpriseCourseCompletionEventPublisher` which unblocked the build script.*

## Files Archived
All identified ad-hoc root scripts and logs were moved to `tools/archive/google-studio-temp/`:
- `collect-stubs.cjs`
- `i18n_transform.js`, `i18n_transform.ts`
- `merge_dicts.cjs`, `merge.cjs`
- `result.md`
- `build.log`
- `test-results.log`
- `override-tests.js`
- `rewrite.js`
- `update-schol.js`
- `update-univ.cjs`

## Package Manager Decision
**NPM** was selected as the local execution strategy. 
Since `package-lock.json` was present in the root and actively tracking dependencies, replacing it with `pnpm` might introduce discrepancies. A basic `pnpm-workspace.yaml` was re-created merely as metadata to reflect original GitHub configurations without breaking current npm resolution.

## Verification Results
- **`npm run build`**: ✅ Passed. (The API build was successfully unblocked).
- **`npm run lint`**: ✅ Passed.
- **`npm run test`**: ❌ Failed (5 test cases failed).

## Remaining Blockers
There are currently **5 failing tests** regarding `UniversityImportPromotionUseCase`, `AdminUniversityUseCases`, and `MajorImportPromotionUseCase` inside `packages/application/tests/`.
These failures appear to be caused by mismatching mock expectations versus the actual implementation (such as incomplete logic for fields like `city` and `country` parsing).

## Next Steps
**Recovery Sprint B CAN BEGIN.** 
However, Sprint B must immediately address the failing tests by fixing the business logic/domain implementation within `packages/application` and `packages/domain` to clear the remaining blocker.
