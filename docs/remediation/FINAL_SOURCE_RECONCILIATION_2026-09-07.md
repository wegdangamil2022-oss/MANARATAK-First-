# MANARATAK — Final Source Reconciliation — 2026-09-07

**Authority:** superseding source-evidence addendum after the independent W7 review  
**Baseline:** `MANARATAK_FINAL_W7_SOURCE_CLOSED_2026-09-07.zip`  
**Scope:** source defects, contracts, verifier drift, closure governance and machine-verifiable evidence  
**Runtime policy:** external DB/provider/browser/deployment evidence remains governed by `W7_RUNTIME_PENDING_CHECKS.md`

## Decision

`SOURCE_CONTRACT_RECONCILIATION = CLOSED`

This reconciliation does **not** certify Production Ready. It closes the source/contracts/evidence defects found by the independent post-W7 review while preserving dependency-backed and runtime verification for the exact repaired artifact.

## Reopened findings reconciled

### Environment / observability contract

- Added `OTEL_EXPORTER_OTLP_ENDPOINT` to both canonical environment templates:
  - `.env.example`
  - `apps/api/.env.example`
- `W1_SOURCE_VERIFIER = PASS 136/136` after the repair.
- This re-closes the source intent of `MNT-AUD-0043`.

### Canonical closure / false-green governance

- `verify-w16-final-closure.mjs` now **executes** W0–W15 verifiers and requires every one to return zero; file existence alone is no longer sufficient.
- W16 now reports `all_w0_w15_verifiers_execute_green=PASS`.
- The source-closure manifest registers the live DI reachability gate.
- W6 plan verification accepts the final successor runtime-pending authority (W7) without hard-coding an obsolete W6-only filename.
- P12/P13 verifiers now validate the manifest-driven CI and the current source-rebaselined relationship matrix rather than historical literal workflow/matrix shapes.

### DI reachability evidence

- Live DI graph: **322 registrations**.
- Reachable: **322**.
- Unreachable: **0**.
- `DI_RUNTIME_REACHABILITY_MANIFEST.json` was regenerated from the live graph.
- `architecture:di:verify = PASS`.

### Current architecture verifier reconciliation

The following verifiers were rebaselined to the current implementation **without weakening their semantic intent**:

- P9/P10/P11 relationship matrix authority and current live data composition;
- P12 manifest-driven source CI and dynamic runtime-pending evidence authority;
- P13 current 69-row source-rebaselined relationship matrix while retaining historical P13 provenance;
- Courses cursor paging;
- Certificates governed `AssetPicker` authoring;
- Jobs bounded cursor paging;
- AI canonical CORS/admin redirect/theme-token architecture;
- Academic Settings canonical admin redirect after legacy preview removal;
- W13 versioned student-tool availability validation through `StrictControlPlaneSchemas`.

### Public UI typography drift

- Removed the two live `font-black` violations and replaced them with the governed weight.
- `PUBLIC_UI_SOURCE_CLOSURE = PASS 154/154`.

## Independent executable source evidence after reconciliation

The following were executed successfully in the reconciliation workspace:

- W0 through W15: PASS individually.
- W16 final closure: **PASS 30/30**, including execution of W0–W15.
- `remediation:verify`: **PASS 17/17**.
- P10: **96/96 PASS**.
- P11: **119/119 PASS**.
- P12: **195/195 PASS**.
- P13: **169/169 PASS**.
- Academic Settings: **79/79 PASS**.
- AI Tools: **64/64 PASS**.
- Certificates: **94/94 PASS**.
- Jobs: **68/68 PASS**.
- Public UI: **154/154 PASS**.
- Health: **69/69 PASS**.
- DI reachability: **322/322 reachable, 0 unreachable**.
- Source closure manifest structure: **PASS — 27 gates / 52 registered verifiers**.
- GitHub Actions immutable pin gate: **PASS — 33 refs**.
- Source Architecture Guard: PASS.
- Source Quality / cycles: PASS.
- Recovery source contract: PASS.

Every executable manifest SOURCE gate that does not require the installed npm dependency tree passed in this workspace.

## Translation source-contract check

The dependency tree was intentionally not fabricated. Even without `tsx`, Node 22 type stripping was used as an additional source-contract inspection only:

- translation schema source: PASS;
- translation quality source: PASS with `DATABASE_MUTATIONS_ALLOWED=false` and `DATABASE_ENVIRONMENT=source`;
- Arabic semantic copy: PASS, findings=0.

The canonical `translation:ci` still includes the Vitest regression suite and therefore remains a **dependency-backed Codex/CI execution requirement**. Its gate was not weakened or removed.

## Not claimed here

The following are **not** certified by this source reconciliation:

- fresh `npm ci` on a dependency-complete runner;
- full TypeScript typecheck;
- ESLint;
- all workspace builds;
- full Vitest unit/source integration suite;
- canonical `translation:ci` including Vitest;
- Prisma CLI source validate/generate with installed Prisma;
- database integration;
- browser E2E;
- provider/runtime/restore/deployment evidence;
- GitHub repository-side branch protection/PR attestation.

Those checks are delegated to the exact-artifact Codex/CI handoff and to `W7_RUNTIME_PENDING_CHECKS.md` as applicable.

## Final source status

`SOURCE_ERRORS_FOUND_BY_POST_W7_REVIEW = RESOLVED`  
`SOURCE_CONTRACTS = RECONCILED`  
`NODE_ONLY_SOURCE_GATES = GREEN`  
`DEPENDENCY_BACKED_VERIFICATION = CODEX_CI_PENDING`  
`RUNTIME_VERIFIED = NO`  
`PRODUCTION_READY = NO`
