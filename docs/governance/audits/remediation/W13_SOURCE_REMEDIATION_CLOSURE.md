# W13 Source Remediation Closure — Student Tools / Public Tool Platform

**Wave:** W13
**Owner:** Phase 18 — Student Tools / Public Tool Platform
**Findings:** 8 (4 HIGH, 4 MEDIUM)
**Source state:** CLOSED_AFTER_REMEDIATION
**Runtime/DB state:** PENDING_GOOGLE_STUDIO

## Closed findings

- `P18-VERSION-004` — immutable tool-version snapshots + execution FK to exact version.
- `P18-PUBLIC-005` — one public discoverability policy across list/detail/availability/execute.
- `P18-HEALTH-008` — Phase 18 health delegates to Phase 17's real routing eligibility.
- `P18-RATE-001` — signed, network-bound anonymous sessions + network abuse bucket.
- `P18-RECO-002` — scholarship candidate scanning traverses every published result page or fails explicitly.
- `P18-SAVE-003` — save uses the server-recovered result bound by digest; caller result bodies are rejected by contract removal.
- `P18-IDEMP-007` — concurrent duplicates use insert-or-load-winner semantics.
- `P18-IDEMP-006` — completed replays recover the encrypted short-lived original result.

## Historical data boundary

Pre-W13 tool-version rows cannot be given invented historical contracts. The migration records a `LEGACY_RECONSTRUCTED_AT_W13_MIGRATION` snapshot from the current projection and preserves that provenance. It fails closed if any historical execution cannot be bound to a version. Exact runtime reconciliation remains `PENDING_GOOGLE_STUDIO`.

## Runtime proof still required

- Apply migration only through the Google Studio remediation runbook.
- Verify every historical execution obtains a `versionId` with zero silent remapping.
- Configure and rotate `STUDENT_TOOL_RESULT_KEY` and `STUDENT_TOOL_ANONYMOUS_SESSION_SECRET` outside source control.
- Prove Redis/distributed rate-limit behavior and trusted-proxy IP derivation in the deployed topology.
- Prove encrypted transient results expire/are purged and cannot be recovered after TTL.
- Re-run Phase17→Phase18 readiness against live provider adapters/circuit state.
