# Section 05 — Session 1/3 source verification

Baseline: `63b600e18090ecda5c2c651dcc95cb1ffa5ca373`; branch `codex/section-01-iam-rbac`.

| Check | Command | Result |
| --- | --- | --- |
| Focused contracts/security | Exact 24 Vitest files from `.github/workflows/import-section-05-source.yml`, `npx --no-install vitest run --config vitest.config.ts ...` | PASS: 187 tests, 24 files, 15.35 seconds; 60-second command budget |
| TypeScript | `npm run typecheck` | PASS |
| Quality | `npm run quality:source` | PASS |
| Audit source inventory | `npm run audit:coverage:verify` | PASS: 321 handlers / 320 endpoints |
| Scoped lint | `npx --no-install eslint` on changed TS/TSX files | PASS: 0 errors, 151 warnings (existing and touched-file `any` warnings) |
| Secret scan | `npm run security:secrets` | PASS; scanned again after staging new files |
| W2 source guard | `npm run w2:verify` | 82/84: both P6 lease guards now PASS; two inherited non-P6 failures remain |
| Persistence ownership | `npm run architecture:persistence:verify` | FAIL: 18 inherited migration-metadata violations across six preexisting Section 03/04 migrations; no new migration or cross-owner write introduced |
| Whitespace | `git diff --check` | PASS |

Baseline comparison was executed against an isolated detached worktree at `63b600e`. Baseline W2 was 80/84 (including two obsolete P6 text guards); baseline persistence produced the identical 18 violations. Current non-P6 W2 failures are MNT-AUD-0050 asset purge usage evidence and MNT-AUD-0079 migration recovery authority. They remain blockers for an unconditional repository-wide release claim; they are not classified as slow tests or waived.

The failure-rollback regression uses an in-memory transaction simulation. It is source composition evidence only, not proof of real PostgreSQL rollback or lock contention. No migrations, DB connection, provider request, live browser flow or deployment were performed. Runtime/E2E/load and recovery verification are deferred to post-28. No focused test exceeded its time budget in this session.
