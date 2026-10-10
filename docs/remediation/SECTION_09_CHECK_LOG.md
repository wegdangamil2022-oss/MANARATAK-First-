# Section 09 check register

Each check below ran once on 2026-10-10 in `manaratak-section-09`. Do not repeat after correcting findings under the current user instruction.

| ID | Command / scope | Observed result |
| --- | --- | --- |
| S09-TYPES-01 | timeout 60s node node_modules/typescript/bin/tsc -b packages/core packages/domain packages/shared packages/application packages/infrastructure apps/admin apps/api | 22 diagnostics. Corrected without rerun. |
| S09-UNIT-01 | timeout 60s node node_modules/vitest/vitest.mjs run --config .section09-vitest.config.ts | 30/32 passed. Two fixture assertion failures corrected without rerun. |
| S09-META-01 | validateMigrationMetadata for 20261010120000_major_review_governance only | PASS; no SQL execution. |
| S09-DIFF-01 | git diff --check | PASS; before final corrections/doc changes. |

Raw output is in `evidence/section-09/implementation/`. Final TypeScript and complete-test success are unconfirmed. New and older full-runtime/DB/browser/provider checks remain deferred. See `SECTION_09_MAJORS_IMPLEMENTATION.md` for exact behavior, activation prerequisites and acceptance limits.
