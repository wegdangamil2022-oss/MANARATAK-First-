# Review workspace — section 02 execution

Status: implementation and isolated verification in progress; not accepted or deployed.

- User authority: implement section 02, especially 02.11–02.27; no production writes or main merge.
- Attached document labels itself cumulative 1.2, despite the requested v1.10 filename. Its complete section 02 requirements are preserved in `REVIEW_WORKSPACE_APPROVED_SPEC_2026-10-24.md`.
- Latest remote main fetched at start: `10179ab97eddba9b236238714dea1d68859f469e`.
- Branch: `feat/review-workspace-20261024`, stacked on the unmerged Dashboard delivery `91252edac55201bdaea6e2b586ecf253f6ac2ff1` to preserve current fixes. Dashboard runtime is not restarted or migrated by this work.

## Contract decisions

1. Existing ImportReviewAssignment is the import owner's lease/assignment. It is not generalized into an independent assignment to the same import record. Import cases retain evidence, diff, owner audit and handoff; their coordination stays with that owner.
2. New ReviewWorkCase/Event persist coordination and observation cycles, not owner content or owner approval decisions. ReviewOwnerProjection reads allowlisted fields from existing tables. Several reasons still produce one row/key per owner/profile/cycle.
3. Server-side filtering, Arabic normalization, deterministic keyset ordering and counts operate on the full permitted projection. A dataset fingerprint invalidates traversal explicitly when a concurrent modification changes its scope, instead of silently skipping/duplicating rows.
4. Source synchronization is an explicit, authorized command. One owner's failed transaction cannot close its cases. Timelines start at actual observation, never inferred owner modification dates. A case closes only when a successful owner read no longer yields a qualifying signal.
5. No default SLA is seeded. Explicitly approved, versioned policies specify elapsed 24/7 hours in UTC and warning hours. New cycles alone receive that policy. Existing deadlines retain their original policy reference.
6. Coordinator permission does not replace owner permissions. Mutations authorize the actor and recipient against the current resource before durable replay; optimistic versions and owner revision/locks protect updates. Notes are internal, bounded plaintext, not a repository for private student documents.
7. Search uses a narrowly identified read-only POST to avoid search text in URLs. It still requires CSRF, active principal and MFA-authenticated session; only the additional mutation step-up is unnecessary for this exact read route. Every coordination mutation retains step-up.
8. Assignment emits a durable, targeted notification outbox event once. Existing encrypted notification intents/IN_APP templates/delivery own notification processing. No worker or external email is started by this delivery.

## Acceptance ledger

- [ ] Real PostgreSQL full search beyond row 500, no browser full scan.
- [ ] Unique counts, all nine domains, import owner evidence and exclusion of TEST/DEMO.
- [ ] Stable pagination; explicit restart on changed source or permissions.
- [ ] Assignment persistence, current assignee permission, team membership, stale version, stale owner and replay protection.
- [ ] Internal notes, audit, targeted outbox, partial bulk outcomes.
- [ ] No fabricated SLA, approved policies and measured observation-only analytics.
- [ ] Existing source diff, audit pagination, safe URLs and owner handoff preserved.
- [ ] Three tabs, five metrics, central table, side preview, focus restoration, responsive list, Cairo measurements.
- [ ] Unit/API/database/UI/build/lint verification and desktop/mobile RTL/LTR evidence.

No application of the new migration to Neon/original or production has been authorized by this document. Evidence will name its actual isolated target and test boundaries.
