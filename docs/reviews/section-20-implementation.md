# Section 20 / P19 — finance source remediation

Scope: the supplied `MANARATAK_ADMIN_REVIEW_CODEX.md`, section 20, FIN-ADM-001–029 and FGA-20-001–002. Base main: `f8efbc52`; branch: `fix/codex-section-20-finance`. Section 21 is not started.

Source changes implement the financial safety and admin contracts below. **Runtime verification remains deferred after section 28. The migration is unapplied: NOT_RUNTIME_SAFE for deployment until the migration and legacy-state review are completed.** No production data, paid provider, database migration, backfill, browser E2E, load test or deployment was executed. Local concurrency tests use a deterministic transactional fake; they do not prove PostgreSQL isolation or a provider's idempotency implementation.

## Task mapping

| Plan task | Source implementation and reviewable evidence |
|---|---|
| FIN-ADM-001 | Positive bounded canonical minor units at Domain/API/repository; CHECK source for holds and financial postings; grouped wallet projection rejects invalid persisted holds. Invalid-unit and no-write regressions. |
| FIN-ADM-002 | Serializable invoice-owned outstanding reservation before provider dispatch; invoice CAS; durable separate authorization/capture claims; immutable payment provider keys; existing attempts reserve funds while outcome is uncertain. Parallel reservation, dispatch, capture and immediate COMPLETED regressions. |
| FIN-ADM-003 | Approved transfer is claimed as PROCESSING/UNKNOWN_OUTCOME before submit, with immutable transfer-owned provider key; timeout cannot reopen submission. Recovery polls the known receipt or immutable transfer reference. Bank claim/timeout and stale-version regressions. Signed bank receipts also bind the transfer, beneficiary and exact source/target/fee snapshot before posting or releasing funds. |
| FIN-ADM-004 | Finite action catalog, server-owned TWO_CHECKERS_V2 quorum, bounded expiry and action-specific checker capability; central IAM catalog includes every finance action explicitly, without granting them through coarse manage. Legacy weaker approvals are not executable. |
| FIN-ADM-005 | Canonical ledger replay comparison covers ordered accounts/directions/exact money/business origin/reversal. Exact replay precedes approval consumption; mismatches cannot consume approval. |
| FIN-ADM-006 | Hold replay compares wallet, amount/currency/scale and obligation; duplicate active obligation is excluded by migration source and invoice serialization. |
| FIN-ADM-007 | Transfer replay binds source wallet, beneficiary, denomination, amount, provider and maker. Destination/key mismatch regression. |
| FIN-ADM-008 | Persistent actor-scoped command fingerprint/response for invoice item edit, issue and void; client-read version required; exact lost-response retry returns the original response without new audit. |
| FIN-ADM-009 | Provider capture/refund attestations require exact money, merchant, capture reference, timestamp and HMAC; verified proof is stored inside Finance custody, not consumer DTOs. Wrong money/signature never posts settlement. |
| FIN-ADM-010 | Refund ambiguity enters UNKNOWN_OUTCOME, retains the consumed approval and reservation, and queues status polling with backoff; no new refund dispatch while unknown. Aging exception is visible. |
| FIN-ADM-011 | Earliest due unresolved attempts across PENDING/AUTHORIZED, stable ID tie-breaker, persisted next check/backoff; one capture claim can resume confirmed authorization without a duplicate dispatch. |
| FIN-ADM-012 | Repository selects bounded candidates for each provider class with transactional leases; does not load entire refunds/transfers to slice in application memory. |
| FIN-ADM-013 | GET reads the scan snapshot only. Explicit POST advances a local scan; separate provider reconciliation operation requires its own capability, returns correlated counters and records transactional audit/outbox. |
| FIN-ADM-014 | Persisted bounded scan checkpoints and exceptions; overview uses aggregate counts and freshness-aware snapshot. Report uses exact SQL aggregation, with no per-wallet history loading on GET. |
| FIN-ADM-015 | Holds bind to the issued invoice's payer, denomination and exact outstanding obligation; owner must initiate explicit consent through the authenticated invoice wallet-payment endpoint; active holds block competing provider payments. Capture rechecks the obligation and updates invoice due atomically. Admin authority cannot fabricate payer consent. |
| FIN-ADM-016 | Explicit NET_CAPTURE_CLAWBACK_V1 policy accrues from net captured funds. Accrual posts expense/payable ledger entries; refunds adjust eligible unpaid accruals and ledger exactly once, or put unsupported/settled obligations into DISPUTED review. |
| FIN-ADM-017 | Trusted configured corridor, exact quote precision, 15-minute freshness/one-minute clock skew, independent baseline and maximum 5% deviation. Missing baseline or anomaly does not activate a quote. |
| FIN-ADM-018 | Serializable approval rejects overlapping manual windows. Transfer stores immutable numerator/denominator/margin snapshots and target amount; reconciliation validates the pinned calculation. |
| FIN-ADM-019 | Distinct gross collections, net collections after refunds and recognized REVENUE-ledger totals; report labels are AR/EN and retain exact minor units. |
| FIN-ADM-020 | Manual postings require a Finance-owned adjustment case, finite reason, a usable EAP document owned by the maker, case-owned non-system accounts and two checkers. Arbitrary PAYMENT/TRANSFER postings and manual reversal of owner-managed journals are denied. Case creation has transactional replay/audit. |
| FIN-ADM-021 | One Finance Serializable transaction checks effective origin/student obligations; no offset pagination walk. An older paid invoice cannot mask new outstanding debt. |
| FIN-ADM-022 | Client expected version checked before stateful admin actions, provider dispatch and approval consumption. Invoice, transfer, approval, FX, hold and refund projections carry versions. Invoice UI pins the exact uncertain command/key/version for retry. |
| FIN-ADM-023 | Server pages all secondary finance lists with bounded filters for status, owner, provider, dates, currency and exact minor-unit range. Count/page share a transaction; numeric range SQL uses finite identifiers and bound parameters. |
| FIN-ADM-024 | Finite safe error/status codes and unique correlation references; database/provider exception text is not returned. Negative permission, input and secret-reflection tests. |
| FIN-ADM-025 | Overview has exact per-currency outstanding aggregates and bounded recent histories. Separate owner-scoped wallet/transfer pages; student projections omit internal evidence and provider receipts. Existing student IDOR checks retained. |
| FIN-ADM-026 | Incremental checks include ledger balance, invoice paid/credit/refund equation, refund amount/evidence/posting, transfer immutable FX snapshot, wallet invariants, aged provider outcomes and current approval policy. Partial/stale scans are UNKNOWN; coverage explicitly says provider proofs NOT_EVALUATED. |
| FIN-ADM-028 | Focused unit/API/negative regressions and AR/EN server render. Real PostgreSQL contention, provider sandbox and browser journeys remain in the runtime appendix. |
| FIN-ADM-027 | All operator copy is in semantic owner i18n keys, RTL/LTR follows the shell, and money formatting never converts exact units to floating point. |
| FIN-ADM-029 | Runtime collection requires explicit approved runtime configuration; transport alone leaves payment/bank capability RUNTIME_PENDING. The operational release checklist below remains unfulfilled until independent evidence exists. |
| FGA-20-001 | Invoice filters bind student/payer/origin owner references; payment filters bind canonical invoice/provider. URL query state and reset preserve server paging. |
| FGA-20-002 | Protected minimal read details and supported invoice/payment/refund/transfer links. Verified service-request deep link is retained. A COURSE_ENROLLMENT ID is not represented as a course ID: unavailable source detail is explicit. Opening details causes no provider call or financial mutation. |

## Validation boundary

See `section-20-validation.json`. Focused tests cover source behavior against deterministic fake persistence/provider boundaries; API tests enforce deny behavior and error minimization. Static source guards were updated to check the new paginated/localized controls, aggregate wallet projection and governed net commissions. Guard checks are not runtime finance certification.

Node in this workspace is 24.19.0; the repository declares Node 22. Final Node-22 CI validation is independent. Existing repository lint warnings are recorded, not called a warning-free result. No full unit suite or E2E was requested or run.

## Runtime/release appendix after section 28

- Approve disposable migration rehearsal, backup/restore and rollback; review invalid/duplicate active holds before creating the unique index, then validate the NOT VALID monetary constraints.
- Review legacy unresolved payment dispatches and old approval policies. The migration source quarantines existing PENDING/AUTHORIZED attempts from automatic redispatch; status attestation/reconciliation is required. Null legacy command actors do not grant replay rights.
- Review/backfill or quarantine transfers lacking immutable FX snapshots. Never reconstruct a historical charged rate from today's quote.
- Provision explicit financial IAM roles and two independent checkers; review correction-case EAP custody and payer authorization.
- Implement the provider attestation contract: HMAC over gateway reference, result status, immutable operation reference, merchant, capture reference, currency, scale, minor units and timestamp joined with newlines. Bank HMAC binds provider reference, status, transfer reference, beneficiary and exact source/target/fee amounts and timestamp. Rehearse wrong amount/currency/merchant/signature and key rotation without live money.
- Prove PostgreSQL reservation/lease/CAS races, interrupted authorize/capture/bank submit/refund, same/different-key retries and recovery of unknown outcomes with redacted receipts.
- Prove refund-before/after-accrual, ledger adjustment/clawback, paid-invoice reopening and origin clearance under concurrent issue/credit/payment.
- Verify AR/EN browser edits, repeated/lost-response intents, filters/pages/detail navigation, student ownership and no evidence leakage.
- Verify real webhook signature/replay store, retention, worker backoff, aging alerts and scan/report performance; skipped provider checks cannot be called healthy.
- Bind signed deployment commit, migration status/hash, sandbox provider receipts, reviewers, reconciliation and restore artifacts to the release. Keep FINANCE_RUNTIME_APPROVED unset/false until these proofs and the independent production approval exist. This source commit does not authorize production activation.
