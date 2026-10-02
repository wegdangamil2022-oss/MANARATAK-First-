# M10-12 / M10-13 / M10-14 — source execution

Authority: revised activation plan v2, sections 21 / 28 / 30 and capability register v2. Dependencies M0–M9 are accepted for planning; no DB audit or Google AI Studio connection was requested or performed.

| Task | Implemented source behavior | Remaining acceptance |
| --- | --- | --- |
| M10-12 | Reproducible geography correction/ambiguity/territory queues, immutable provenance, explicit scoped canonical review contract, Stage 3/4 quarantine with distinct ID union, commit blocking for invalid payloads, pending city publication guard. | Human evidence for 63 city choices / 8 territory policies and missing city corrections; current canonical UUIDs/region ownership in the connected environment. **Source implemented; semantic/runtime acceptance pending.** |
| M10-13 | All 514 sections reconciled into disjoint dispositions; raw section hash; 349 explicit candidates held for university/program/degree/test reviews; no ten guessed records or status promotion; conflicting markers/duplicate IDs fail closed. | Explain/correct 359 upstream using identifiable source evidence; approve canonical choices and program owner; live owner validation/audit. **Source implemented; canonical/runtime acceptance pending.** |
| M10-14 | Three artifact-bound duplicate decisions; separate language edition; unknown collision blocking; exact provider alias/domain, language/taxonomy proposal queues; stable provider/URL/language fallback identity proposals; missing history annotation; per-term and resolved-language publication gate, separate External/Native/Paid policies. | Review stored/native identities and canonical choices; supply missing old master or formally retain the missing-history limitation; live official URL checks and owner audit. **Source implemented; identity/link/runtime acceptance pending.** |

Detailed reproducible counts, source differences and review policies: `workspace/import-sources/reconciliation/m10-12-14/README.md`. The generator writes only governed derived files; raw sources and historical migration SQL/checksums were not changed.

## Behavior tests

- Scoped canonical selection vs ambiguity; missing/foreign/inactive targets; stale source/snapshot; required actor/reason/evidence; program university owner; INS identity requirement; no fuzzy name link.
- Invalid stage payload rejected before gateway; overlapping errors counted once; missing stage and duplicate stage IDs; malformed collections/non-finite fees; ambiguous city and territory holds; publication cannot promote pending/raw city mappings.
- Original scholarship bytes retained; explicit vs unknown markers; conflicting markers and duplicate source identities rejected; 349/359 difference produces no invented candidate.
- Known URL duplicate retains both sources; changed hash/new collision rejected; distinct language edition retained; foreign provider host unresolved; source proposals remain unapproved.
- Course publication rejects a second unresolved topic, proposed language with stored ID, missing relationship evidence, broken/unverified official link and ineligible external certificate. Native/Paid policy remains separate. Explicit reviewed term exclusion is supported alongside approved taxonomy.
- Actual offline input files regenerate governed queues; source hashes unchanged; `check` detects tampered output without overwriting it.

## Verification evidence

- **216 tests in 33 files passed**: import-source readers/QC preparation, university source/change plans, course use cases/relationships and university publication policy. Includes actual local artifacts and mocks/in-memory gateways; no DB-backed integration.
- Root referenced TypeScript build, strict standalone compilation of new scripts/tests and Vercel API/Admin/Web TypeScript contexts passed.
- API and Admin builds passed. Admin reports its existing bundle-size advisory; no build failure.
- Scoped ESLint passed with zero errors; the existing Prisma course repository has 13 pre-existing `any` warnings. New files have no lint warnings.
- Source quality/cycle/accessibility, persistence ownership, 28 registered source-closure gates, secret scan, environment inventory and Git whitespace checks passed locally. The final chat result identifies applicable GitHub checks and the merged commit.
- Initial clean CI exposed missing compiled Shared artifacts before the newly registered QC gate. The gate now builds Application and its referenced Core/Domain/Shared packages first, then invokes the unchanged read-only source verifier and behavior tests. No check is skipped or weakened.

Source results do not prove Runtime/E2E success.

## Connected environment acceptance — prepared, not executed

1. Pull the verified `main` commit. On a clean checkout run `npm run build -w @manaratak/application`, then `npm run imports:qc:verify` and `npm run imports:qc:test` from repository root. These commands are offline and do not consume DB credentials.
2. Ensure the existing controlled M10-07 schema-parity/recovery procedure has been completed by the environment operator before affected API paths. This task applies no migrations.
3. Export or inspect current canonical rows in that environment: stable IDs, lifecycle, country/region chain, University INS, program owning university, DegreeLevel and InternationalTest. Do not send connection strings, passwords or identity data to chat. Use verified account identity and current admin permission checks.
4. For one ambiguous city, one unknown territory, one missing city and one quarantined Stage 3/4 item: verify they stay Draft/held; wrong country/region or non-finite fee fails before persistence. Choose a legitimate existing scoped city with documented evidence; current API must revalidate it. Do not infer territory parent or create guessed references.
5. For an explicit scholarship candidate: choose verified INS and a program from the same owner; wrong-owner program, name-only university and unmarked/duplicate guide section must not promote. Record evidence before accepting non-university or no-test semantics. Do not manufacture ten rows from the summary.
6. For an external course: review native key vs current provider/URL/language identity, resolve each topic and language, verify official URL health. A proposed language, unresolved second topic, foreign host or source-only fallback key must not satisfy publication evidence. Verify paid/native flows keep their own policy.
7. Exercise permission-denied and stale decision cases, then inspect the owner operation's audit/outbox evidence and transaction consistency when an authorized reviewed change is actually applied under the existing recovery gate. No pilot/import is initiated by this checklist; subsequent M10 tasks require their own controlled execution.

Every step needing live records, transactions or HTTP results is **RUNTIME_UNTESTED** here. Do not declare M10 closed based on these source tests.
