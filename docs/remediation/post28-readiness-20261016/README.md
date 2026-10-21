# POST28 acceptance inventory — 2026-10-16

Baseline: `d82ff2e3b23152025a001f529a0d4abd5d160bfa`. This is a preparation catalog, not runtime evidence or owner approval.

- `relationships.json`: all 77 R/X rows, original source statuses and accountable architecture roles retained, linked to the exact plan's cases. Source status never becomes runtime PASS.
- `cases.json`: all 42 acceptance scenarios and their specified assertions; runtime counts are zero, unknown required counts remain null. Decision dependencies are conservative initial links, not a substitute for owner review.
- `fixtures.json`: 13 fixture specifications copied from the authoritative plan; no records were created and no owner commands are claimed.
- `tasks.json`: 679 section-qualified heading candidates. Repeated IDs in different sections remain distinct. No candidate was deleted or counted as a defect or completed task. Actual task/owner/evidence curation is pending.
- `decisions.json`: all seven owner decisions, accountable roles, impacts, and unapproved fields. No policy/schema choice is inferred.

Plan and matrix SHA-256 digests bind the inputs. All rows require a reviewed suite/command, measured target fingerprint, source SHA, exact executed counts and evidence hashes before runtime acceptance. Fields containing null mark missing proof, never successful evidence.

Owner names, mandatory/optional market scope, accepted teaching-language identity, performance/fault budgets and independent source/runtime/approval and recovery authorities are still pending. The user explicitly deferred database creation and Neon connection to the next day; no database action is authorized by this catalog. Translation infrastructure and deferred advising remain within existing documented boundaries, with no feature activation.

Producer readiness:

| Area | Existing entry point | Current boundary / missing proof |
|---|---|---|
| Database | `scripts/database/run-post28-suite.mjs` | Runnable after DB-T identity/catalog/mutation gates; exact runtime discovery/result comparison covered by real inert subprocess tests. Actual DB execution deferred. |
| Greenfield | `scripts/database/verify-greenfield-migration-parity.sh` | Pair/empty identity guard and zero-invalid catalog gate exist. FK orphan audit + reviewed validation procedure and actual replay remain pending; historical SQL unchanged. |
| Built browser | `scripts/wp-ic-10-browser-e2e.mjs` | Existing narrow imported-course wrapper is insufficient for three built units, trusted TLS, lifecycle/cleanup and exact mandatory coverage. Intercepted sections123 browser tests cannot establish DB/API integration. |
| Workers | existing W3 source/runtime tests | No complete measured multi-unit effects producer accepted for this candidate. |
| Restore | `scripts/recovery/run-whole-platform-restore-drill.mjs` | Independent approvals and non-destructive snapshot/asset measurement remain missing; destructive DB-T suites must never validate DB-R. |
| Load / rollback | release acceptance contracts | No accepted measured producer, dataset or owner budgets; contract validation alone is insufficient. |
| FG-024 | `scripts/release/lib/AcceptanceContracts.mjs` | Evidence contract exists; canonical owner teaching-language/query/UI and approved markets remain pending DEC-07. |
| Signatures | `config/release/source-release-policy.json` | Authority remains PENDING_SIGNED_OWNER_APPROVAL; no keys/bindings or independent signers provisioned. |

R02-core and R02-coverage are separate and neither is declared CLOSED. R03 was not started. Production remains NO_GO.

Traceability discrepancy found: CD-020 declares R-007/R-011/R-062 in the case table but is absent from the plan's reverse relationship index. The catalog preserves both authorities, derives accountable roles from case-side references, and records `traceabilityGap` explicitly. This does not change scope or invent owner approval.

Validate catalog structure with `node scripts/testing/verify-post28-readiness-inventory.mjs`. A successful structure check continues to emit `stageVerdict=BLOCKED_PENDING_ACCEPTANCE_REQUIREMENTS` and `runtimeExecuted=false`.
