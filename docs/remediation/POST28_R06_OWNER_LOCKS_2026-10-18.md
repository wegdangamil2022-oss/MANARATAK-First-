# R06 actual owner import and source PostgreSQL locks

Source 6a97b4baf6e90b6c3c2dcbed86b263b7a6e6cadf; run bfa5b45f-eebe-499d-bd5c-018e892c8035; PostgreSQL postgres (PostgreSQL) 16.15, system 7698059553268370824.

Ten actual PostgreSQL regressions first failed on void advisory-lock results. The ten reproduced query sites in eight owner/source adapters now return SELECT 1 AS locked FROM the same transaction advisory-lock function. Keys, canonical checks, transaction boundaries, serializable retry policy and distributed budget semantics remain in place. No migration or business eligibility rule changed. The original 0/10 failing execution is retained.

The final ten prove: Major owner lock remains held until commit and unbound calls fail; Major identity inspection uses the real canonical reference service and dedup lookup; taxonomy import lock and serializable taxonomy graph boundary hold the expected lock against an independent connection; historical unassigned review lease reads succeed; missing mapping source, observation baseline and destination country reach their actual domain gates; two independent acquisition limiters reserve exactly fleet/origin/source budget rows with two full source intervals. No network provider or canonical import promotion is inferred from budget reservations. One ImportRateBudget fixture DML grant is added only to disposable DB-T initialization (91 default DML tables); no production permissions changed.

Affected regressions: reference/import closure 18 and DEC05 taxonomy invalidation six, giving 34 passed DB cases on one frozen source. Related import, taxonomy, Major and study destination units 402/402, provisioning 34/34, infrastructure TypeScript and source quality pass. Full source acquisition/canonical promotion/HTTP publication workflows are still separate acceptance work.

The owner has resolved the student ownership scope. Matrix CD-036/CD-040 no longer describe institutional tenancy as a pending question. This is a scope clarification, not automatic acceptance or production provider licensing approval.

Evidence: docs/reviews/evidence/post28/6a97b4baf6e90b6c3c2dcbed86b263b7a6e6cadf/R06-owner-locks/evidence-index.json. Actual database cases: 34 passed, zero failed/skipped in final runs. New distinct 10; repeats 24; cumulative 373 across SHAs, not one current-head acceptance run. R06 remains 0/26 accepted.
