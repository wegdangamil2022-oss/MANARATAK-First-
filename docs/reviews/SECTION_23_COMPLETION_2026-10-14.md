# Section 23 — current Notification code completion

Date: 2026-10-14. Base: `e8db6ea78b4752b46e7d3095a846ae8ed7780414`.
Verdict: **CODE_CLOSED — RUNTIME_DEFERRED**, within the supported notification owner contracts. Scope: NTF-ADM-001–027 and NTF-FG-028–029.

The previous [implementation report](section-23-implementation.md) maps the existing recipient eligibility, preference, custody, channel checkpoint, provider-key, governance and template work to the plan. This follow-up reviews current code and closes additional operator-read and template-definition gaps.

## Additional code corrections

| Plan items | Follow-up behavior |
| --- | --- |
| NTF-ADM-015; NTF-FG-028 | Template authoring rejects duplicated locales and required variables before persistence, alongside existing duplicate-channel and bounded-content guards. Unique AR/EN definitions remain accepted. |
| NTF-FG-029 | Preview data is invalidated when template, sample variables or locale changes. Late response/error from the preceding preview is ignored; loading disables preview and old output is cleared before a new read. Preview remains the existing read-only, non-sending owner endpoint. |
| NTF-ADM-019–022, 024 | List refresh clears old page and receipt data. Receipt requests are independently fenced so selecting another intent or changing the list scope cannot display an earlier intent's late channel result. Summary refresh clears prior summary while reading; recipient search clears old options/cursor before lookup and uses a stable derived capability dependency. No change to immutable send intent keys or delivered/accepted cancellation rules. |
| NTF-ADM-025 | New real React interaction regressions verify changed-preview samples, out-of-order receipt selection and leaving the receipt scope; template regressions cover duplicate rejection and valid bilingual persistence. Existing source/security tests retain recipient/opt-out/channel/replay/authorization coverage. |

## Current lightweight verification

- Baseline: **45 tests passed**.
- Final isolated notification suite: **3 files / 51 tests passed**, Node 22, one worker; six new tests.
- `tsc -b packages/infrastructure apps/api apps/admin --pretty false`: passed.
- ESLint on four changed source/test files: **0 errors / 6 warnings**. Not a warning-free lint result.
- `git diff --check`: passed.

Outputs and hashes: [verification.json](evidence/section-23-completion-20261014/verification.json).

## Operational boundary

No real message, database, migration/backfill, provider call, delivery worker, heavy suite/build, browser E2E or deployment was run. Existing source-only migration and key provisioning remain operational work. Synthetic channel/provider doubles do not prove transport delivery or actual PostgreSQL cap/lease races.

The prior source mapping's bounded event matrix and disabled broadcast/promotional capability remain intact. This work does not infer personal recipients for owner events lacking an approved recipient contract or invent a tenant model. Actual provider reconciliation/key retention, encryption key rotation, historical payload retirement, real role/consent races, notification consumption and bilingual browser delivery remain after section 28. The historical unrelated global audit-inventory limitation is preserved in the prior report and is not claimed resolved by these targeted checks.
