# Section 06 checks / execution exclusions

Date: 2026-10-10. Commit baseline `7231f2c53b307cb5f98e3af0083285322802603a`.
**All checks below are source-side**; no DB, migrations, actual import, browser, provider or E2E test was executed.

| Check | One-time outcome | Notes |
|---|---|---|
| Executable multilingual Unicode identity normalization (10 languages/script samples + NFKC/Arabic marks) | **PASS** | Actual source function body was extracted from `ReferenceIdentityNormalization.ts` and executed once via isolated JavaScript; this is **not** TypeScript compilation or repository Vitest. |
| Four disabled legacy city/region importer entrypoints (source gate before importer body) | **PASS 4/4** | One targeted source-security inspection. Disabled scripts retain source, but all entrypoints have an unconditional blocking function. No importer was invoked. |
| Aggregated source/contract assertions across 26 paths | **INTERRUPTED; NO RESULT** | Single attempt exceeded remote connector's tool-call limit. No pass/fail assertions were produced. **Not rerun**. |
| University-city JSONL integrity reparse via connected file-content endpoint | **INTERRUPTED; NO RESULT** | Single attempt received an incomplete/truncated large-file response and `JSON.parse` threw `Unexpected end of JSON input`. This does **not** prove any source artifact is malformed. **Not rerun**. |
| Four newly added unit-test specification files | **NOT RUN** | Present in Domain/Application tests, but no checkout/runtime available. Writing a test file is not running a test. |
| TypeScript compile / old suite compatibility / DB / CI | **NOT RUN** | Do not assume source changes compile or pass prior contracts until a controlled follow-up run. |

The two interrupted checks are not successes and do not count toward acceptance; any code edits after these attempts were not checked again. They are not evidence that P7 is functionally complete.

## Fix and review notes

- After code review the city validation key now gracefully avoids computing a canonical key for invalid ISO2, and a concurrent attempt to create a duplicate city raises an explicit collision instead of silently updating a foreign UUID. **These changes have not been rerun through a typecheck/unit suite.**
- Unresolved university geography source `universities-geography.jsonl` covers **3,549 held rows**, not the full university catalog or DB state. Case counts are from the single source-preparation pass; full integrity verification of the uploaded 1.98MB report was not completed.
- All commits use `[skip ci]`. No branch merge, publish, deploy, migration, seed, backfill or live import was triggered.

Closure: **NOT CLOSED**. See `SECTION_06_ITEM_MATRIX.md` and `workspace/reports/section-06/` for non-test implementation blockers and source-only city decisions.

## Continuation after baseline — 2026-10-10

New code/specs cover P6->P7 SCREENING_ONLY, governed alias/provider mapping review, explicit atomic owner-key transfer and replay guard, quality/impact owner reads, ISO639/BCP47 separation, and disabling unreceipted SeedApply. Focused spec files were added but **NOT RUN**. No new TypeScript/Vitest/DB/E2E/CI run, database writes, migrations, seeds, backfill or imports occurred. Earlier INTERRUPTED checks remain INTERRUPTED and were not rerun. All commits use [skip ci]. Source closure remains PARTIAL.

### Focused source-invariant inspection (one execution)

- 14 remote source files inspected with 11 narrowly scoped structural assertions: **11/11 PASS**.
- Coverage: Unicode city scope, batch duplicate quarantine, disabled unsafe SeedApply, screening-only registration, owner mapping locks/CAS/replay+audit/outbox, admin reconciliation, owner impact and quality reads, non-active filtering, malformed source quarantine.
- This is **not** Vitest, TypeScript compilation, a runtime test, a database test or an execution of data changes.
- The source check ran before the later admin country/currency/city metadata and Region URL enhancements and provider-replay actor binding; those subsequent commits were **not rerun through this source check**.

### Further P7 source-only remediation (2026-10-10)

- One static source-inspection pass of 9 revised files with 10 limited assertions: **10/10 PASS**. Focus: terminal lifecycle owner gate, audited CAS country-link repair with scope validation, effective governed version snapshots, batched alias ambiguity, complementary non-active filters, UTC/ICU timezone policy, iterative DAG traversal, evidence-status UI.
- This **is not a type-check, Vitest suite, runtime/DB integration test or certificate of correctness**. New test files are present but not executed, and no checks were rerun to chase green.
- No database connected, no migrations applied, no seed/backfill and no CI invoked. All commits remain [skip ci].

### P7 screening + canonical-identity review continuation (2026-10-10)

- One static source audit: **13/13 PASS** across **11** source files. Checked durable receipt requirement, source SHA256/artifact evidence, warning propagation, disabled seed approval/apply, duplicate quarantine including invalid rows, city/region scoped resolvers, owner-scoped alias ambiguity, read-only paginated admin inbox and terminal region guard.
- This is **static contract evidence only**. No TypeScript type-check, Vitest, browser, DB, migrations, seed, import apply or CI was run. New test files remain unexecuted; their presence is not a passed test.
- P7 owner atomic reviewed apply, official authority snapshots and full downstream lifecycle impact are OPEN implementation requirements, not deferred verification.
