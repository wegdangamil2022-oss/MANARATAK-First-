# Enterprise Governance Repository

This directory contains the central, program-level governance, roadmaps, master blueprints, and consistency audits for **MANARATAK 2.0**. These documents represent the authoritative source for overall enterprise strategy, phase sequencing, dependencies, and alignment baselines that bind all domain implementations together.

---

## 1. Governance Overview

The governance layer establishes the strategic mandate, scope boundaries, and chronological timelines of the enterprise. Rather than specifying how to build individual services or modules, this layer defines:

- **Strategic Direction:** Defining core goals and the overarching platform constitution.
- **Milestones & Chronology:** Establishing phase boundaries, dependencies, and timelines.
- **Alignment Baselines:** Reviewing, auditing, and remediating implementation divergence or structural inconsistency.

This directory is strictly separated from standard implementation specifications (located in `/docs/phases/`) and global architectural guidelines (located in `/docs/architecture/`).

---

## 2. Governance Documentation Flow

Enterprise governance documents flow in a structured, sequential pipeline to ensure that strategic updates are carefully evaluated, propagated, and verified before they affect production implementations:

```text
Enterprise Master Blueprint (Constitution)
                  ↓
      Official Enterprise Roadmap (Milestones)
                  ↓
      Roadmap Impact Analysis (Change Impact)
                  ↓
       Propagation Reports (Doc Sync)
                  ↓
   Enterprise Consistency Audit (Verification)
                  ↓
        Architecture Remediation (Resolution)
```

Each document in this pipeline serves a distinct purpose in verifying and maintaining the integrity of our enterprise architecture.

---

## 3. Governance Documents

The following table organizes the governance files and directories by their functional purpose:

| Directory / Path | Document Name                                                                                                         | Purpose                                                                                                                                                                        |
| :--------------- | :-------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`blueprint/`** | [MANARATAK-2.0-Master-Blueprint.md](./blueprint/MANARATAK-2.0-Master-Blueprint.md)                                    | **Enterprise Constitution:** The highest-level standard specifying project taxonomy, core domains, and non-negotiable architectures.                                           |
| **`roadmap/`**   | [MANARATAK-2.0-Roadmap-v6.0.md](./roadmap/MANARATAK-2.0-Roadmap-v6.0.md)                                              | **Active Roadmap:** The current, approved sequence of phase delivery, priorities, and cross-phase dependencies.                                                                |
| **`roadmap/`**   | [MANARATAK-2.0-Roadmap-v4.1.md](./roadmap/MANARATAK-2.0-Roadmap-v4.1.md)                                              | **Superseded Roadmap:** Historical roadmap archive kept for regression traceability.                                                                                           |
| **`roadmap/`**   | [Roadmap-v5.0-Impact-Report.md](../reports/legacy/Roadmap-v5.0-Impact-Report.md)                                      | **Impact Analysis:** Detailed risk and dependency analysis when transitioning from Roadmap v4.1 to v5.0.                                                                       |
| **`roadmap/`**   | [Propagation-Report-v5.0.md](../reports/legacy/Propagation-Report-v5.0.md)                                            | **Propagation Log:** Verification that roadmap changes have been accurately pushed to all downstream documents.                                                                |
| **`audits/`**    | [Enterprise-Consistency-Audit-Final.md](./audits/Enterprise-Consistency-Audit-Final.md)                               | **Consistency Audit:** Formal validation checking compliance across all active domains and directories.                                                                        |
| **`audits/`**    | [Enterprise-Remediation-Summary.md](./audits/Enterprise-Remediation-Summary.md)                                       | **Remediation Summary:** Actionable resolutions and verify-off summaries for inconsistencies found during the audit.                                                           |
| **`audits/`**    | [WP-08-Master-Blueprint-Synchronization-Report.md](./audits/WP-08-Master-Blueprint-Synchronization-Report.md)         | **WP-08 Synchronization Report:** Complete review showing realignment of the Master Blueprint with ADR-024 and Phase 05.                                                       |
| **`audits/`**    | [WP-09-Domain-Documentation-Synchronization-Report.md](./audits/WP-09-Domain-Documentation-Synchronization-Report.md) | **WP-09 Domain Documentation Synchronization:** Governance report showing the full delegation of binary responsibilities to EAP across all domains.                            |
| **`audits/`**    | [WP-10-Repository-Synchronization-Report.md](./audits/WP-10-Repository-Synchronization-Report.md)                     | **WP-10 Historical Documentation & Repository Synchronization:** Comprehensive audit and historical traceability synchronization of all repository files with EAP and ADR-024. |
| **`audits/`**    | [WP-11-Executive-Repository-Validation-Report.md](./audits/WP-11-Executive-Repository-Validation-Report.md)           | **WP-11 Executive Repository Validation & Program Closure:** Authoritative final repository verification and programmatic closure of Stage 2 synchronization.                  |

---

## 4. When to Read Each Document

To optimize review efficiency, developers and architects should reference these documents at specific stages of their workflow:

- **Read the Master Blueprint** when onboarding to the platform, defining new core domains, or seeking the fundamental principles of the MANARATAK 2.0 system.
- **Read the Roadmap** when planning new implementation phases, determining package dependencies, or verifying milestone scopes.
- **Read the Impact Report** after any major roadmap revisions or when analyzing migration pathways between versions.
- **Read the Propagation Report** to understand how updates to the roadmap synchronized with other downstream files.
- **Read the Consistency Audit** to identify any latent non-compliance, architectural divergence, or drift across phase implementations.
- **Read the Remediation Summary** to verify how audit-identified inconsistencies have been officially resolved.

---

## 5. Governance Lifecycle

Governance is not static; it is an active lifecycle ensuring continuous alignment:

```text
    Enterprise Vision (Core Strategy)
                   ↓
   Master Blueprint (Project Constitution)
                   ↓
         Roadmap (Release Baselines)
                   ↓
     Architecture Specifications (Standards)
                   ↓
       Architecture Reviews (Inspections)
                   ↓
     Consistency Audit (Verification Checks)
                   ↓
        Remediation (Resolution Syncing)
                   ↓
      Formal Baseline (Stable State Release)
```

As the platform expands, any deviations are continuously resolved in the audit and remediation phase to preserve the integrity of the stable baseline.

---

## 6. Governance Rules

To preserve structural clarity and the Single Source of Truth principle:

1. **Strategic Mandate:** Governance documents define the strategic direction of the enterprise. All architectural, domain, and implementation choices must align with this direction.
2. **Implementation Boundaries:** Governance documents must **never** contain concrete implementation details, C# code blocks, database scripts, or local class structures. These technical details are strictly deferred to `/docs/phases/` (Part C) or `/docs/architecture/`.
3. **No Redefinition of Governance:** Architectural or implementation-level documentation must never override, alter, or redefine the priorities, boundaries, or rules established in these governance documents.
4. **Single-Source Integrity:** If a conflict or overlap arises, the higher-level governance documents listed in this directory always prevail over downstream files.

---

## 7. Relationship with Other Documentation

- **Architecture Specifications (`/docs/architecture/`):** Translate the strategic mandates and standards established here into concrete, cross-cutting architectures (e.g., global caching strategies, soft-delete rules, and security baselines).
- **Phase Implementations (`/docs/phases/`):** Realize the architecture and governance on a phase-by-phase basis, containing detailed domain specifications (Part B) and implementation guides (Part C).
- **Historical Archives (`/docs/legacy/`):** Hold obsolete files and superseded versions, ensuring active folders remain unpolluted.

---

## 8. Contribution Rules

When modifying or introducing new governance files:

1. **Formal Approval:** Any change to the Master Blueprint, active Roadmap, or audit results requires formal approval and must follow the official change control process.
2. **Logical Subdirectories:** Save documents in their designated subdirectories (`blueprint/`, `roadmap/`, or `audits/`) to preserve folder taxonomy.
3. **Link Persistence:** Avoid duplicating statements across different files. Prefer referencing active sections in the Master Blueprint or Roadmap using clear, descriptive Markdown links.
4. **Synchronize downstream references:** When a governance document is updated, perform a repository-wide check to ensure that dependent architecture and phase documents remain fully synchronized and compile successfully.

---

## Final Source Closure (P13)

The active post-remediation source evidence is `docs/remediation/p13/P13_FINAL_SOURCE_CLOSURE_REPORT_2026-09-03.md`, with relationship-level status in `docs/remediation/CROSS_PHASE_RELATIONSHIP_CLOSURE_MATRIX.md` v2.0.0. Roadmap v6.0 remains the roadmap authority. The source closure does not certify database/runtime/E2E execution; those items are frozen in the P13 Runtime Pending Register.
