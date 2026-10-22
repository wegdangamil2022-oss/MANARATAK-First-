# MANARATAK: independent development database to a working platform

Updated: 2026-10-22. This continues the completed remediation work; it does not
restart R0–R13. Task status is tracked in [todo.md](todo.md).

## Established starting point

Reference bootstrap is verified complete: 168 currencies, 260 languages and
194 countries. Evidence is in
`docs/reviews/MANAGED_REFERENCE_COMPLETION_2026-10-22.md`, delivered in
`d5bb352961ae14eb42bd9c1ed34644fb9a18fd14`.
The four remaining required baseline seeds are not applied. Geography CSVs
exist for five continents; their presence does not establish import approval.
Large city/region imports are explicitly excluded from the required seed manifest.

## Fixed sequence and deliverables

1. **Geography source review.** Inspect the existing five region CSVs and five
   city CSVs, related reconciliation/quarantine reports, owner contracts and
   country identifiers. Produce source hashes, eligible region/city candidates,
   duplicate/conflict counts and an explicit unresolved list. Prefer the cities
   required by the intended university/scholarship content for the initial run.
   Acceptance: every eligible city resolves to one of the installed countries;
   any region link resolves to the same country; ambiguous entries are held out.
   Verification: source-only checks and the affected existing validators.
   No database mutation or legacy import script execution in this step.

2. **Required operational baseline.** Rebind the prepared private operator to
   the reviewed current code, create/verify a fresh backup, and check target,
   restricted roles, source hashes and protected fingerprints. Apply seven degree
   levels; 163 taxonomy nodes, 152 edges and 39 aliases; 18 course providers;
   83 student-tool definitions and versions with four dependencies.
   Acceptance: manifest reconciliation, exact source relationships and unchanged
   protected rows outside the declared mutation set. No tool/provider execution.
   Dependencies: completed references. This work is independent of unresolved
   geography entries, so a geography data issue does not freeze this step.

3. **Reviewed geography installation.** Use the geography owner's governed
   workflow for eligible regions first and cities second, with a separate
   source-bound import scope and backup. Preserve country discrimination,
   existing decisions, Audit/Outbox and same-run recovery.
   Acceptance: imported rows exactly match the reviewed candidate set; country
   and region links resolve; homonymous cities remain distinct; deferred entries
   are listed. The city/region import is not implicitly added to the core seed.
   If a contract or additive migration is required, meet its gates first and
   continue independent baseline/runtime work meanwhile.

4. **API and administration run.** Resolve the known schema-readiness probe's
   attempt to read the migration ledger with the restricted application role,
   without granting that role ledger access or weakening readiness checks.
   Establish development administrator access through its separate credentialed
   bootstrap gate. Acceptance: API starts against the independent database,
   readiness dependencies are stated truthfully, and an authenticated admin
   can read installed reference/taxonomy/location choices through the API.
   Verification: focused changed-path checks and an actual bounded runtime run.

5. **New scholarship file preview and import.** Use the new scholarship master
   already selected in this chat. Map source fields to degrees, disciplines,
   countries, locations and existing requirement entities. Produce a preview
   with unresolved/duplicate rows before applying eligible records through owner
   workflows. Acceptance: source counts reconcile; no unresolved key is replaced
   by an invented relation; old scholarship sources are not reintroduced.
   Depends on operational baseline and location eligibility for affected rows.

6. **One complete browser content flow.** Run API/Web/Admin from one known
   source against the independent development database. Verify admin login,
   author/review/publish of an eligible scholarship, public visibility and
   filters, then withdrawal hiding it. Verify relevant permission boundaries
   with synthetic fixtures only. Acceptance: observed browser/API/database
   evidence for this specific flow; no assertion of untested flows.

7. **Delivery and hosting preparation.** Save and push each completed increment
   to the existing branch; review directly affected checks and CI. Record any
   material data/privacy/certificate risks separately from deferred coverage.
   Prepare deployment configuration and realistic costs after the local flow
   works. This plan does not authorize production, paid services, DNS changes
   or external deployment. Merge/release gates remain explicit.

## Rules for execution

- Preserve the completed references; do not reimport them or restart old phases.
- Do not run broad successful suites again without an affected dependency.
- Never weaken guards/assertions, invent approval, bypass owner commands or
  replay a failed write without reviewing the actual state.
- Keep city-source review separate from core seeds; advance independent tasks
  if a subset of geographic data cannot yet be accepted.
- No old Neon project, production, schema reset, historical migration edits,
  external payments or provider effects.
- Acceptance is a working development content flow, with the database and
  permissions proved. Hosting readiness is a later, separate conclusion.

## Next action

Start task 1: assess the existing geography sources and reports. Then execute
task 2's already prepared baseline after rebinding its source and safety gates.
Task 3 imports only geography whose review and execution gates are satisfied.
