# ARB Review Report — Appendix B: Organizations & Employers Platform Exclusion

**Date:** 2026-07-24
**Review Finding:** "There is no Organizations & Employers Platform."

## Issue Status

Intentionally Rejected.

## Root Cause

An early architecture finding suggested creating a dedicated platform for Sponsors, Employers, Educational Partners, Recruitment Agencies, and Institutional Partners. However, the MANARATAK 2.0 enterprise architecture is now fully finalized (Phases 01 through 24). The proposed monolithic platform violates the principle of Bounded Contexts.

## Architecture Category

Enterprise Domain Boundaries / Platform Architecture

## Correct Architectural Owner

Architecture Review Board (ARB).

## Affected Documents

- `ADR-026-Organizations-Employers-Bounded-Context.md` (Superseded/Overturned)

## Recommended Resolution

Formally reject the creation of a monolithic Organizations & Employers Platform and generate a new Architecture Decision Record (ADR-027) to permanently close this finding.

## Architecture Impact Assessment

1. **Is this finding valid?**
   Intentionally Rejected. The architecture explicitly excludes a generic "Organizations" platform to prevent a monolithic, anemic domain model.

2. **Does the finalized architecture actually require an Organizations & Employers Platform?**
   No.

3. **Does this platform contribute meaningful enterprise value?**
   While the underlying business entities (employers, sponsors) are valuable, aggregating them into a single platform provides no cohesive business capability. A sponsor operates under different financial and legal contracts than an employer recruiting talent. Combining them erodes domain boundaries.

4. **Would introducing this platform today violate:**
   - **Product Vision:** Yes. The vision focuses on the student journey and specialized platforms.
   - **Domain Boundaries:** Yes. It mixes recruitment (Phase 21), financial sponsorship (Phases 12 & 19), and academic partnerships (Phase 11).
   - **Architecture Simplicity:** Yes.
   - **YAGNI (You Aren't Gonna Need It):** Yes. We do not need a generic organizational registry.
   - **Enterprise Scope:** Yes.
   - **Current Roadmap:** Yes, all 24 phases are finalized and Phase 18 is assigned to Enterprise Student Tools.

5. **Is there a legitimate business domain that cannot function without this platform?**
   No. Each domain independently handles its own specific organizational relationships (e.g., Career & Alumni platform handles Employers).

6. **Would this platform duplicate responsibilities already handled elsewhere?**
   Yes. Phase 11 (Universities & Institutions), Phase 21 (Career & Alumni), and Phase 19 (Finance) already manage these entities contextually.

7. **Should the architecture intentionally exclude this platform?**
   Yes.

## Final ARB Decision

APPROVED - Intentionally exclude the Organizations & Employers Platform. Generate ADR-027 to document this exclusion and supersede any previous conflicting decisions (e.g., ADR-026).

---

### Appendix Navigation

This document is **Appendix B** of the Phase 04 reports, representing active governance records maintained after formal sign-off. It is the final document of Phase 04.

- **Previous**: [Phase 4.22 — Appendix A: ARB Review Report (AI Governance)](phase-04-22-report.md)
- **Downstream Transition**: Proceed to **[Phase 05 — Core Implementation](../../phase-05-core-implementation/)** (`docs/phases/phase-05-core-implementation/`).
