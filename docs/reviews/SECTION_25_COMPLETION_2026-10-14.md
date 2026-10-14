# Section 25 — current Health & Readiness source completion

Date: 2026-10-14. Base: `122f321a2af25eba19979aadee6c884b639b5cf4`.
Verdict: **CODE_CLOSED — RUNTIME_DEFERRED**, within the supported evidence contracts. Scope: HR-ADM-001–027 and HR-FG-028–029. This is not a live health certificate or production GO.

The prior [implementation report](section-25-implementation.md) maps the readiness graph, owner capability checks, privacy, worker evidence, UI and history contracts to all 29 source items. This continuation reviews the current code, repairs additional evidence consistency/access gaps and verifies the previously corrected source tests under Node 22.

## Additional code corrections

| Plan items | Current follow-up |
| --- | --- |
| HR-ADM-001, 018, 021, 023 | Consumer v2 parsing rejects releaseReady when the owner report is not ready, reports blockers or required coverage is incomplete. Expected/monitored/missing/extra/unverified identities must be unique and correspond to actual components; counts and the summary's monitored/missing counts must agree. A false releaseReady does not exempt malformed coverage from rejection. |
| HR-ADM-019, 023; HR-FG-028 | History response parsing is extracted into a bounded contract that validates total/cursor/availability and the requested 1h/24h/7d window. A page from another window cannot be appended under the current label. |
| HR-FG-028 | Server history rejects invalid/future/expired timestamps, malformed or duplicated component identities and invalid status samples. Timestamps are normalized before storage; reads return detached snapshots so modifying a consumer response cannot rewrite previous evidence. Existing seven-day, 10,000-sample and 30-second limits remain. |
| HR-ADM-002–003, 019 | Authorized diagnostic refresh clears overview/history/selection on 401/403 instead of retaining last-good diagnostics after access loss. Ordinary availability failure keeps the visibly stale snapshot. History authorization failure also clears old history. |
| HR-ADM-026–027 | Current synthetic source/security and UI tests pass; prior corrected-but-unexecuted harness failures remain recorded as historical checkpoints rather than a final failed-current disposition. |

## Lightweight verification

- Baseline source-closure checker: **4 files / 71 tests passed**.
- Final `node scripts/verify-health-readiness-source-closure.mjs`: **4 files / 79 tests passed**, Node 22. Eight added cases cover report/coverage contradictions, immutable history, invalid observations, duplicates, selected windows and bounded pages. Provider/worker dependencies are synthetic doubles.
- Isolated React health UI: **2/2 tests passed**, one worker; session loss clears diagnostics and ordinary failure preserves explicitly stale evidence.
- `tsc -b packages/infrastructure apps/api apps/admin --pretty false`: passed.
- ESLint on six changed source/test files: **0 errors / 18 warnings**. Not a warning-free result.
- `git diff --check`: passed.

Logs and hashes: [verification.json](evidence/section-25-completion-20261014/verification.json).

## Operational limits retained

No live health graph, database, provider handshake, message/payment, worker activation, migration, heavy suite/build, browser E2E or deployment was performed. Required evidence still fails closed; production eligibility and operational approval cannot be inferred from configuration or from these synthetic tests.

History remains **PROCESS_LOCAL_SESSION / PARTIAL_OBSERVATIONS**, with bounded actual captured samples. It is not continuous cluster incident history. Database migration history remains history-only rather than schema parity proof; unimplemented provider handshakes and missing worker/export observations stay unverified. The explicit owner limits in the prior task mapping remain unchanged. Actual deployment acceptance, Redis freshness, role isolation, provider support, browser accessibility and locale evidence remain after section 28.
