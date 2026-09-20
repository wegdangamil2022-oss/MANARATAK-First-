# MANARATAK 2.0 — W0 Authority & Quality-Gate Execution Report

**Wave:** W0 — Authority freeze + quality-gate readiness  
**Date:** 2026-08-25  
**Audited baseline:** `e57aad8c52a3ee6d686671870e0bf0392ba7417f`  
**Working copy:** `MANARATAK_FINAL-main.zip`  
**Database:** not connected; no migration/backfill/data mutation executed  
**Execution state:** `SOURCE_REMEDIATION_COMPLETE / FULL_DEPENDENCY_REGRESSION_GATE_PENDING`

## 1. Architectural decisions frozen by W0

1. **Physical deployment topology:** Enterprise Modular Monolith / modular monorepo. Microservice language is future extraction intent, not a current separate-process/database/network mandate.
2. **API namespace:** `/api/v1` is canonical, aligned with `STD-API-001` and the live Express API registry.
3. **Reference/data posture:** Phase 7 owns canonical reference identity. Explicit relational canonical IDs/FKs are preferred inside the current shared relational persistence boundary; compatibility strings cannot become a competing SSoT.
4. **Roadmap status:** the 24-phase model remains frozen; source implementation is present through Phase 19, while Phase 2–19 remediation and Google Studio runtime/database closure remain outstanding.
5. **Correctness-gate strategy:** deterministic full-repository correctness gates are authoritative. Turbo is optional cached acceleration, not closure truth.
6. **Node/npm baseline:** Node `22.16.0` is pinned for CI/devcontainer/.nvmrc; engine ranges are enforced by `.npmrc` with `engine-strict=true`.
7. **Git governance:** current enforcement is CI + maintained validators, not nonexistent historical Husky hooks.
8. **Testing foundation:** current root/package Vitest + source verifiers + Playwright supersede the removed historical `@manaratak/testing` workspace.
9. **Containerization:** remains `DEFERRED`; no historical claim may imply a current application image exists.

## 2. W0 finding disposition

| Finding | Source disposition | Resolution |
|---|---|---|
| `GOV-ROADMAP-001` | `SOURCE_REMEDIATED` | Roadmap metadata/status reconciled to v6.0 and source-through-Phase-19 reality. |
| `P2-ROADMAP-001` | `SOURCE_REMEDIATED` | Active Reference Data ownership normalized to Phase 7. |
| `P2-ARCH-001` | `SOURCE_REMEDIATED` | Phase 2 topology wording reconciled to current Modular Monolith + future extraction posture. |
| `P2-DATA-001` | `SOURCE_REMEDIATED` | Historical string-only/no-FK doctrine explicitly superseded by canonical relational integrity. |
| `P2-API-001` | `SOURCE_REMEDIATED` | Active Phase 2 REST namespace reconciled to `/api/v1`. |
| `P4-GOV-002` | `SOURCE_REMEDIATED` | Phase 4 reports 4.12/4.14/4.15/4.17/4.21 reconciled to current capability states. |
| `P3-QUALITY-001` | `SOURCE_REMEDIATED` | Executable source-quality gate added; new package/file cycles and covered TSX accessibility regressions are blocked. |
| `P3-BUILD-001` | `SOURCE_REMEDIATED` | Full-repo correctness gates made authoritative; Turbo retained as optional cached acceleration and updated to v2 `tasks` syntax. |
| `P4-TEST-001` | `SOURCE_REMEDIATED` | Removed `@manaratak/testing` package marked superseded; current test topology documented. |
| `P4-GIT-001` | `SOURCE_REMEDIATED` | Maintained commit/branch validators added and wired into CI. |
| `P3-ENV-001` | `SOURCE_REMEDIATED` | Node/npm ranges now strict; `.nvmrc`, `.npmrc`, CI and devcontainer aligned. |

## 3. New executable W0 guardrails

### 3.1 `scripts/quality/verify-source-quality.mjs`

The source-quality verifier uses only Node built-ins and therefore can run before project dependencies are installed. It currently checks:

- package-level `@manaratak/*` dependency cycles;
- relative-file dependency cycles;
- TSX `<img>` alternative text;
- TSX `<iframe>` titles;
- clickable anchor `href` presence;
- keyboard/role/tabIndex semantics for clickable non-interactive `div` / `span` elements.

The gate follows a **zero-new-debt** policy. Existing pre-W0 violations are fingerprinted in `scripts/quality/source-quality-baseline.json`; CI fails on any new fingerprint.

### 3.2 Explicit pre-existing debt currently baselined

The W0 baseline contains exactly **2** known items:

1. `package-cycle:@manaratak/application <-> @manaratak/infrastructure`
   - not created by W0;
   - must be revisited during the W1 composition/configuration repair chain.
2. `a11y-click-keyboard:apps/web/src/features/admin-preview/AdminScholarshipsPreviewPage.tsx:308`
   - not created by W0;
   - remains visible debt and cannot silently multiply.

Baselining does **not** declare these issues acceptable; it makes the gate adoptable now while preventing new debt and allows later waves to remove baseline entries as repairs land.

## 4. Verification evidence completed in this environment

- `node scripts/verify-w0-source.mjs` → **PASS 34/34**.
- `node scripts/quality/verify-source-quality.mjs` → **PASS**; 1 package cycle + 1 accessibility item both known/baselined; **0 new violations**.
- Git validator positive tests → **PASS**.
- Git validator negative tests → **PASS** (invalid branch/commit rejected).
- GitHub Actions YAML parsing → **PASS** for both workflow files.
- `package.json` ↔ `package-lock.json` dependency/devDependency/engine parity → **PASS**.
- No database or migration command was executed.

## 5. Full regression gate blocker

The mandatory dependency-backed gates (`npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:unit`) could not be executed because this clean ZIP contains no `node_modules` and the execution environment cannot fetch a complete npm dependency set.

Evidence:

- online `npm ci --ignore-scripts` timed out while resolving the registry;
- `npm ci --offline --ignore-scripts` failed with `ENOTCACHED` for `superagent-9.0.2.tgz`.

This is **not recorded as a source test failure** because no test/build assertion ran and failed. W0 is therefore source-remediated but remains `FULL_DEPENDENCY_REGRESSION_GATE_PENDING` until a connected environment runs:

```bash
npm ci
npm run quality:source
npm run typecheck
npm run lint
npm run build
npm run test:unit
npm run w0:verify
```

The Google Studio runtime phase remains separate and must still honor backup/recovery gates before any database mutation.

## 6. W0 → W1 transition rule

W1 may begin only after either:

- the dependency-backed W0 regression gate passes in a connected clean environment, or
- an explicitly documented engineering decision accepts continuation with the gate deferred, while preserving the requirement to run it before any runtime/database closure.

No W1 source change is included in this W0 package.
