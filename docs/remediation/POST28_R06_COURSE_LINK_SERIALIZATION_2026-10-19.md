# R06 Course link verification transaction and freshness

Source 3e2db8a62de7da08c7adba2c618ad428f0cfbc9a; run 844bb548-c945-430b-a715-ca659d92a0d6; PostgreSQL postgres (PostgreSQL) 16.15, system 7698127727641178580.

Implemented a single transaction for imported Course link verification, locking the Course and source identity before reading context. Rejects an older checkedAt result instead of overwriting newer verification. Bound repositories reuse the caller transaction; history and identity writes roll back together.

Six actual PostgreSQL tests cover stale results, concurrent canonical URL edits, competing link results, changed URL rejection, database write failure rollback, and caller rollback. Sixteen publication regression cases also passed. All 297 Course unit tests and 40 runner tests passed; infrastructure type checking and source quality passed. No schema migration or historical Consent/Binding changes.

Preserved unsuccessful runs: gx2eHv had an incomplete synthetic fixture; tJLAyw exposed three implementation failures before the fix; XvbACm had six passing assertions but a nonzero runner exit due to an eagerly executed fault injection. The final run fixes the injection and exits zero. Those unsuccessful runs are not acceptance evidence.

Remaining material scope includes public read eligibility after source withdrawal, full worker recovery, certificate artifact ingestion, and broader R06 acceptance. Equal-timestamp conflicting results are not resolved by the older-than check. R06 is not declared complete; production and Neon were not touched.

Evidence: docs/reviews/evidence/post28/3e2db8a62de7da08c7adba2c618ad428f0cfbc9a/R06-course-link-serialization/evidence-index.json. Actual database cases: 22 passed, zero failed/skipped in final runs. New distinct 6; repeats 16; cumulative 457 across SHAs, not one current-head acceptance run. R06 remains 0/26 accepted.
