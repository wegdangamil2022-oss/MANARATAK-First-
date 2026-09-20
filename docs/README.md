# MANARATAK 2.0 Documentation Index

**Status:** ACTIVE / SOURCE-ALIGNED  
**Updated:** 2026-09-07  
**Repository phase coverage:** Phase 02 through Phase 24, including the two current Phase 10 documentation roots.

This file is the navigation entrypoint for the current `docs/` tree. It does not certify runtime or production readiness. Completion terminology is governed by [`governance/COMPLETION_STATUS_LIFECYCLE.md`](./governance/COMPLETION_STATUS_LIFECYCLE.md).

## Authority order

1. [`governance/blueprint/MANARATAK-2.0-Master-Blueprint.md`](./governance/blueprint/MANARATAK-2.0-Master-Blueprint.md) — project constitution.
2. [`governance/roadmap/MANARATAK-2.0-Roadmap-v6.0.md`](./governance/roadmap/MANARATAK-2.0-Roadmap-v6.0.md) — current phase ownership and sequence.
3. [`architecture/Enterprise-Architecture-Governance-Index.md`](./architecture/Enterprise-Architecture-Governance-Index.md) and active ADRs/standards — cross-cutting architecture authority.
4. `phases/` — phase architecture/domain/implementation requirements.
5. `operations/` — executable operational runbooks and runtime handoff contracts.
6. `remediation/` — remediation register, source-closure evidence, runtime-pending evidence and final rebaseline records.
7. `implementation-status/`, `imports/`, `standards/` — specialized active evidence and standards.
8. `legacy/` — historical/superseded material only; never current authority.

## Current top-level documentation domains

| Path | Purpose |
| --- | --- |
| `architecture/` | Enterprise architecture, ADRs, lifecycle/security/data standards and shared models. |
| `governance/` | Blueprint, roadmap, audits and completion-status governance. |
| `phases/` | Phase 02–24 specifications and implementation baselines. |
| `operations/` | Database, CI/CD, recovery, keys/tokens, observability and runtime procedures. |
| `remediation/` | Ordered remediation evidence, cross-phase traceability and wave closure records. |
| `implementation-status/` | Current implementation-status evidence. |
| `imports/` | Import-domain documentation and source/data evidence. |
| `standards/` | Shared repository/documentation standards. |
| `legacy/` | Superseded historical artifacts only. |
| root `*_FINAL_CLOSURE_*.md` files | Domain-specific closure artifacts retained at `docs/` root for compatibility; consult remediation/governance authority before treating them as current runtime evidence. |

## Active phase roots

The repository currently contains these phase roots:

- `phase-02-solution-architecture`
- `phase-03-enterprise-design`
- `phase-04-architecture-governance`
- `phase-05-core-implementation`
- `phase-06-import-foundation`
- `phase-07-enterprise-reference-data`
- `phase-08-academic-taxonomy`
- `phase-09-tests-platform`
- `phase-10-major-platform`
- `phase-10-majors`
- `phase-11-universities-institutions`
- `phase-12-scholarships`
- `phase-13-learning-platform`
- `phase-14-enterprise-certificates-platform`
- `phase-15-enterprise-student-platform`
- `phase-16-enterprise-cms`
- `phase-17-enterprise-ai-platform`
- `phase-18-enterprise-student-tools-platform`
- `phase-19-enterprise-finance-payments-platform`
- `phase-20-enterprise-services-platform`
- `phase-21-enterprise-career-alumni-platform`
- `phase-22-enterprise-product-experience`
- `phase-23-enterprise-administration-portal`
- `phase-24-enterprise-public-platform`

`phase-10-major-platform` and `phase-10-majors` both exist and must not be silently merged by navigation tooling; their authority must be interpreted through Roadmap v6.0 and the phase documents themselves.

## Remediation and closure navigation

For the current remediation chain, read in this order:

- `remediation/MANARATAK_REMEDIATION_EXECUTION_REGISTER_v0.68_ORDERED_W2_EXECUTED.md` — preserved ordered register copy/evidence baseline.
- `remediation/CROSS_PHASE_RELATIONSHIP_CLOSURE_MATRIX.md` — active source-rebaselined cross-phase relationship authority.
- `remediation/P23_P24_REBASELINE_TRACEABILITY.md` — P23/P24 source rebaseline and runtime-pending boundary.
- `remediation/W2_SOURCE_CLOSURE_2026-09-06.md` through the latest `W*_CLOSED_*.md` wave closure records.

A `CLOSED_SOURCE`, `SOURCE_COMPLETE`, or `SOURCE_REBASELINED` result does not imply DB/provider/deployment/browser verification. The applicable closure record must list pending runtime evidence explicitly.

## Contributor rules

- Link to existing authority instead of duplicating policy.
- Keep paths executable and source-checked; do not document nonexistent scripts/services.
- Update this index when a top-level documentation domain or phase root changes.
- Do not restore `Production Ready` to an active status field without the runtime/production evidence required by the completion lifecycle.
- Keep historical claims quarantined under `legacy/` or clearly labeled historical appendices.
