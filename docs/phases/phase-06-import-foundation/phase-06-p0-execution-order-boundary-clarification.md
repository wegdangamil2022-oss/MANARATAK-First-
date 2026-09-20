# Phase 06 P0: Execution Order and Boundary Clarification

## Purpose
This document clarifies the execution boundaries and establishes a locked execution order for Phase 06 (Intelligent Import Platform) based on architectural reviews and system requirements.

## Files Reviewed
- `docs/phases/phase-06-import-foundation/phase-06-production-intelligent-import-roadmap-ar.md`
- `docs/phases/phase-06-import-foundation/phase-06-import-boundary-runtime-cleanup.md`
- `docs/phases/phase-06-import-foundation/reviews/phase-06-12-architecture-review.md`
- `docs/phases/phase-06-import-foundation/deliverables/phase-06-12-verification-report.md`

## Key Finding About Contradictory Phase 06 Documentation
Earlier documentation contained contradictions regarding the scope of Phase 06, specifically around AI capabilities, auto-publishing, and domain logic ownership. The scope has now been strictly bounded.

## The Correct Interpretation
- **Existing structural contracts are partial and useful.**
- **Production runtime is not complete** (current implementations have risks like memory-only parsing).
- **Phase 06 owns generic import mechanics** (acquisition, artifacts, parsing, queues, staging, provenance, evidence).
- **Downstream phases own domain meaning and publication** (canonical identity, completeness rules, merge policies, final publication).

## Locked Execution Order P0 Through P7
- **P0**: Documentation/contracts/boundary corrections
- **P1**: Current runtime risk fixes
- **P2**: Job state machine, queue, retries, checkpoints, dead-letter
- **P3**: Streaming parsers, bulk staging, and non-functional tests
- **P4**: Source registry, connectors, compliant acquisition, and drift detection
- **P5**: AI extraction, provenance, evidence, and confidence scoring
- **P6**: Domain handoff through match/merge proposals
- **P7**: Admin operations and production readiness

## Next Required Slice
Phase 06 P1A: Current Runtime Risk Audit and Narrow Fix Plan

## Final Classification
PHASE_06_P0_EXECUTION_ORDER_BOUNDARY_CLARIFIED
