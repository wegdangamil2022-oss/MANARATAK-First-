# R06 University public read snapshots and workspace geography

Source e37cafa7fe4fae8f3a5da08443cdd4658649322e; run bd6c8a88-5ff3-4df8-9712-c74bf72b7640; PostgreSQL postgres (PostgreSQL) 16.15, system 7698085635600097772.

Four new actual two-connection PostgreSQL cases reproduce University public card/count inconsistency after country or Major/current-version withdrawal. The original source passes0/4; selected rows remain while counts change to zero. The same source's HTTP suite passes24/27: public program workspace queries and DEGREE/MAJOR facets still show programs after country/region/city withdrawal. Original discovery, selection and Vitest reports are retained byte-for-byte.

PrismaUniversityRepository now executes public slug detail, basic and filtered lists, Major graphs and program graphs through a transaction-bound repository with RepeatableRead. This includes filtered-list hydration, so all statements in one response see the same committed snapshot. It does not freeze a catalog across multiple requests or claim all other repository methods are snapshot-safe. PrismaUniversityProgramWorkspaceGateway adds the shared canonical geography SQL predicate to its existing public gate; its existing snapshot mechanism is retained. Internal administrative queries remain available and no owner facts are rewritten.

Final isolated source passes53 actual database cases: four new University concurrency identities,27 HTTP,8 program-language,7 scholarship concurrency and7 University relations. Three existing HTTP geography identities gain workspace query/facet and administrative visibility assertions; they are not counted as new cases. Focused University units74, provisioning35, infrastructure TypeScript and source quality pass. Setup verifies110 historical migrations and zero schema diff, without runtime DDL or ledger grants. No migration, consent, binding or historic owner data is changed.

These proofs cover per-request consistency and specific geography withdrawal contracts only. Course snapshot races, other child/reference and owner workflows, external provider and owning-phase browser gates remain. R05/R07 are unchanged and no entire R06 scenario is declared accepted.

Evidence: docs/reviews/evidence/post28/e37cafa7fe4fae8f3a5da08443cdd4658649322e/R06-university-read-snapshot/evidence-index.json. Actual database cases: 53 passed, zero failed/skipped in final runs. New distinct 4; repeats 49; cumulative 412 across SHAs, not one current-head acceptance run. R06 remains 0/26 accepted.
