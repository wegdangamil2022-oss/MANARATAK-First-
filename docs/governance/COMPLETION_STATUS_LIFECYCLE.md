# MANARATAK Completion Status Lifecycle

**Status:** ACTIVE GOVERNANCE AUTHORITY  
**Effective date:** 2026-09-07  
**Scope:** all active architecture, phase, implementation, remediation, release and operational documents.

## Purpose

MANARATAK separates source completion from runtime and production certification. Documentation must never use `Production Ready` as a synonym for design approval, implementation completion, or source-closure success.

## Canonical lifecycle

| Status | Meaning | Minimum evidence |
| --- | --- | --- |
| `DRAFT` | Work is incomplete or under review. | Authoring evidence only. |
| `BASELINED` | Architecture/domain contract is approved as the current source requirement. | Governance approval and current ownership. |
| `SOURCE_COMPLETE` | Required source implementation, migrations/configuration, source guards and source tests for the stated scope are implemented and pass. | Executable source evidence. External DB/provider/browser evidence may remain explicitly pending. |
| `RUNTIME_VERIFIED` | The source-complete capability has been exercised in an authorized disposable or target runtime with required DB/provider/browser evidence. | Runtime logs/artifacts bound to the exact source/release artifact. |
| `PRODUCTION_READY` | Runtime verification, operational controls, recovery, observability, security, release/promotion and production handoff criteria are all satisfied for the target environment. | Production-readiness decision bound to immutable release evidence. |

## Mandatory terminology rules

1. `BASELINED` or `Approved for Baseline` does not imply runtime readiness.
2. `SOURCE_COMPLETE` is the highest status that may be asserted using source-only evidence.
3. Runtime-dependent evidence must be recorded as `RUNTIME_EVIDENCE_PENDING`, `PENDING_NON_BLOCKING`, or a more specific pending label; it must never be converted into a fabricated PASS.
4. `PRODUCTION_READY` may appear in requirements as a future target, but an active **Status**, **Current Status**, **Decision**, or closure field may use it only after actual runtime/production certification exists.
5. Historical claims may remain only in clearly marked historical/legacy sections and cannot be used as current authority.
6. Release/deployment source code can be `SOURCE_COMPLETE` while provider-side promotion, smoke, rollback, backup/restore, telemetry export and browser E2E remain runtime evidence.

## Current repository decision

As of 2026-09-07 remediation W7, the repository uses `SOURCE_COMPLETE` / `SOURCE_REBASELINED` for source-closed scopes and keeps DB/provider/deployment/browser evidence explicitly pending. No W7 source document is permitted to certify the whole platform as `PRODUCTION_READY`.
