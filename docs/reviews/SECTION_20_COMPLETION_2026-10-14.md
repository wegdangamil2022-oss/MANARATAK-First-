# Section 20 / P19 — finance source completion

Date: 2026-10-14. Base: `6be29e076d37ec42b402bd5347682a017ec53693`.
Verdict: **CODE_CLOSED — RUNTIME_DEFERRED**, within the current Finance source contracts. This is not production payment acceptance.

[The prior implementation report](section-20-implementation.md) maps FIN-ADM-001–029 and FGA-20-001–002 to existing source changes. This follow-up reviews the current code, adds the corrections below and verifies targeted financial regressions under Node 22. FIN-ADM-028 source/contract acceptance is covered by isolated tests; its real database/provider/browser acceptance and FIN-ADM-029 operational approval remain deferred after section 28.

## Additional corrections

| Plan tasks | Follow-up source behavior |
| --- | --- |
| FIN-ADM-004, 022 | Requested approval expiry rejects invalid dates. Persistence admits only the current server quorum/policy, PENDING state and a finite deadline within the policy's 24-hour bound. Decision/consumption reject missing, invalid or expired persisted deadlines; final conditional updates require expiry still in the future. Consumption counts distinct eligible checkers and rejects any recorded rejection. Invalid legacy approvals fail closed. |
| FIN-ADM-017, 018 | Manual FX ratios are canonical positive decimal strings of at most 30 digits at HTTP, application and repository boundaries. Invalid date windows and fractional/negative/over-10000 margins are rejected before a rate write. Existing exact BigInt arithmetic, historical transfer snapshots and overlap protection remain in place. |
| FIN-ADM-008, 022, 023; FGA-20-001 | Finance search input follows browser URL changes; the debounce no longer restores the previous search or page after navigation. Invoice refresh clears stale invoice/payment/draft data so a failed refresh leaves no editable obsolete invoice. Uncertain commands retain their exact key/body/version for retry. |
| FIN-ADM-028; FGA-20-002 | Interaction regressions prove identical uncertain-command retries and that late failure from an old invoice cannot restore that invoice's intent on a newly opened invoice. Read-only search/navigation does not issue financial mutations. |

## Verification

- Baseline isolated Finance suite: **10 files / 73 tests passed**.
- Current isolated Finance suite: **12 files / 100 tests passed** under Node 22, one worker; **27 added tests**. Existing transaction-focused fake tests cover ledger/hold/payment reservation, replay, transfer/refund uncertainty and attestation; new tests cover approval deadlines/quorum, exact FX boundaries and four real React interaction scenarios.
- `tsc -b packages/infrastructure apps/api apps/admin --pretty false`: passed.
- ESLint on eight changed source/test files: **0 errors / 100 warnings**, including existing source/test-double `any` warnings. This is not a warning-free verdict.
- `node scripts/verify-phase19-source.mjs`: **19/19 passed**. This is a static source guard.
- `git diff --check`: passed.

Outputs and hashes: [verification.json](evidence/section-20-completion-20261014/verification.json).

## Runtime boundary

No real database, migration, backfill, financial worker, live webhook, paid/provider payment/refund/transfer, browser E2E, heavy build/suite or deployment was run. Transactional fakes do not establish PostgreSQL isolation or provider idempotency.

The existing `20261011221500_section20_financial_safety` migration remains source-only and unapplied; review/rehearsal of legacy approvals, holds, unresolved attempts and FX snapshots is still required. Invalid/unbounded approvals are not silently repaired or extended. Keep collection capabilities RUNTIME_PENDING/NOT_CONFIGURED and `FINANCE_RUNTIME_APPROVED` unset/false until the post-section-28 evidence and independent approval exist. See [migration/recovery](section-20-migration-recovery.md) and the prior report's runtime checklist.
