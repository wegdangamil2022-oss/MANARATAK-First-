# Section 21 / P20 — current Services source completion

Date: 2026-10-14. Base: `5f291dee987829725ed5fd1f7353e82f821503e1`.
Verdict: **CODE_CLOSED — RUNTIME_DEFERRED**, within the implemented owner contracts. This is not deployment or production acceptance.

The current user request authorizes completing section 21 and continuing the established main-push workflow with lightweight checks. The prior report's restriction against repeating checks or merging without new authorization describes its historical session. This follow-up verifies the corrected source and extends its previous SVC-ADM-001–028 / SVC-FG-029–030 scope to **SVC-FG-031** from the supplied plan.

## Follow-up fixes and evidence

| Plan items | Current follow-up |
| --- | --- |
| SVC-FG-031 | Admin HTTP accepts bounded country/language owner-reference filters. Application resolves both through the existing P7 canonical service-reference gateway, rejecting unavailable references before listing. Existing repository relations apply both filters with AND semantics before pagination. Admin catalog exposes paged canonical pickers, preserves filters in the URL and resets the page on picker changes. These filters concern service eligibility, not provider country. Existing Public reviewed-snapshot filtering is retained. |
| SVC-ADM-026; SVC-FG-029–031 | Catalog rows and count now use the same RepeatableRead transaction with the same predicate and deterministic updatedAt/id order. UI clears previous catalog data and total before a new filtered read; failed requests leave no stale count presented as current. |
| SVC-ADM-015–017 | Pricing, discount and promotion windows explicitly reject nonfinite dates; availability slots reject invalid starts/ends as well as reversed windows. No operation write is made for those invalid inputs. Existing exact-money, provider accreditation, capacity, coupon and approval controls remain intact. |
| SVC-ADM-028 | Current Node 22 tests and compilation succeed, addressing the previous report's missing final verification. The existing 18-case closure script now passes all cases, including the previously corrected coupon-release assertion. |

The prior task mapping and review remain in [section-21-implementation.md](section-21-implementation.md). Its historical validation statements are preserved rather than rewritten as results from this run.

## Current lightweight validation

- Baseline: **6 files / 33 Vitest tests passed**.
- Current isolated Services suite: **9 files / 49 tests passed** under Node 22, one worker; **16 added tests** cover HTTP/app owner-filter composition and denial, identical count/page query predicates and read isolation, invalid operational dates, URL/picker composition, page reset and failed-read counts.
- `node scripts/services-platform/section21-closure-regressions.cjs`: **18/18 cases passed**, isolated owner mocks, no database or provider.
- `tsc -b packages/infrastructure apps/api apps/admin --pretty false`: passed.
- ESLint on nine changed source/test files: **0 errors / 57 warnings** (existing/test-double type warnings). Not a warning-free lint result.
- `git diff --check`: passed.

Logs, scope and hashes: [verification.json](evidence/section-21-completion-20261014/verification.json).

## Runtime boundary

No heavy suite/build, real database, migration, backfill, provider call, financial mutation against live systems, worker execution, EAP delivery grant, browser E2E or deployment was run. Existing section-21 migrations remain source-only and unapplied; maintenance remains disabled by default. Mocked tests do not prove actual PostgreSQL isolation, slot/coupon contention, outbox rollback or real Finance/EAP integration.

After section 28, perform the existing migration/recovery and runtime checklist: actual role scoping, request/invoice intent recovery, canonical reference lifecycle behavior, provider qualification, booking/discount holds, Finance settlement/cancellation, EAP custody/grants, retention, enabled maintenance and bilingual browser flows. See [migration/recovery](section-21-migration-recovery.md). Source closure does not authorize production activation.
