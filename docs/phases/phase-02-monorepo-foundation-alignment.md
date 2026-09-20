# Phase 02: Monorepo Foundation Alignment

## Package Manager
- `npm` is the canonical package manager for MANARATAK 2.0.
- `bun.lock` and `pnpm-workspace.yaml` lockfiles are not canonical and have been removed.

## CI & Quality Gates
- CI currently verifies `npm run build` and `npm run test`.
- Stricter lint/typecheck gates (`eslint`, `tsc -b`) are deferred to Phase 04 if not fully configured yet.

## Scripts
- The `npm run verify:local` command currently tests build and test commands.
- Husky's `pre-commit` hook runs `npm run verify:local`.

## Tsconfig Alignment
- All package tsconfig references (`packages/ui`, `packages/shared`, `packages/types`) have been aligned with the project's base tsconfig to ensure composite builds work properly.

## Dependencies
- `zod` has been declared as a direct API dependency in `apps/api/package.json` to reflect its usage in API routes.
