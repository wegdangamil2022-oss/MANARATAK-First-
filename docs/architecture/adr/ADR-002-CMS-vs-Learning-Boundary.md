# ADR-002

Title: Separation of Ownership Between Enterprise CMS and Learning Platform

Status:
Accepted

Priority:
P1-7

Category:
Architecture Governance

Date:
2026-07-21

---

Context
--------------------------------------------------

The MANARATAK enterprise architecture includes two content-related domains:

- Learning Platform (introduced in Phase 13)
- Enterprise CMS (planned for Phase 16)

Both domains manage different categories of content.

Without explicit ownership boundaries, future implementation may introduce:

- Overlapping responsibilities
- Duplicate business logic
- Conflicting ownership
- Increased architectural complexity
- Violations of Domain-Driven Design principles

This decision establishes governance rules before implementation of Phase 16.

---

Decision
--------------------------------------------------

The enterprise shall maintain strict ownership separation between the Learning Platform and the Enterprise CMS.

The Learning Platform shall exclusively own educational content and learning workflows.

The Enterprise CMS shall exclusively own non-educational website content.

Each business capability must have exactly one owner.

No capability may be jointly owned.

---

Governance Rules
--------------------------------------------------

1. Educational content belongs only to the Learning Platform.

2. General website content belongs only to the Enterprise CMS.

3. Educational entities must never be moved into the Enterprise CMS.

4. Website content must never be managed by the Learning Platform.

5. Cross-domain communication must occur only through public APIs or domain events.

6. No shared ownership of business logic.

7. No shared ownership of persistence.

8. Each bounded context owns its own repositories, services, workflows, and data model.

9. This decision is strictly governed by the **Enterprise Content Ownership Model**.

---

Implementation Impact
--------------------------------------------------

This ADR does not require any implementation changes.

Phase 13 remains unchanged.

Phase 14 remains unchanged.

This ADR becomes a mandatory architectural constraint for the future implementation of Phase 16.

---

Consequences
--------------------------------------------------

Benefits

- Clear ownership boundaries
- Better scalability
- Reduced coupling
- Easier maintenance
- Better DDD compliance
- Future modular extraction becomes simpler

Risks

None.

This decision only establishes governance and does not affect existing implementations.
