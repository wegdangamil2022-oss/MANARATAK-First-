# R06 University publication reference concurrency ? 2026-10-18

Source fa6accd597e0928450ec723a0f320368da010488; run dfb5146a-e69b-4857-926a-4c6ec938527e; PostgreSQL postgres (PostgreSQL) 16.15, system 7698044153000794168.

Two new real PostgreSQL regressions first reproduced publication succeeding after the canonical country or major was withdrawn between precheck and the owner transaction (19 passed, two failed at source 98e8f94). Their original failing reports remain indexed. The repository now requires its existing transaction boundary for READY_TO_PUBLISH/PUBLISHED, holds shared row locks on program degree/major/profile/version, admission test/version/variant/scale and canonical geography references, then rereads and validates readiness inside that transaction. The reference table list is fixed; IDs remain SQL parameters. No schema or historical migration changed.

The final geography/publication suite passes 22/22: complete synthetic INS-source review/publish with atomic audit/outbox, both formerly failing withdrawal races rejected with unchanged owner/audit/outbox, and a second connection receiving an actual PostgreSQL lock timeout when trying to withdraw the country while the publication transaction holds its row lock. Withdrawal succeeds after commit. This proves ordering at publication time; it does not claim permanent reference validity after later withdrawal or a full owner HTTP/UI lifecycle.

Affected regressions: University relations 7, owner workflows 19, relation commands 8, owner HTTP 12: total 68 database cases on one frozen source. Broad University/scholarship units 309/309, provisioning 31/31, infrastructure TypeScript and source-quality checks pass. Two earlier stale unit fixtures were corrected to include an actual current published MajorVersion matching major/profile ownership; a foreign-major version negative was added. The prior 306/2 report in country-contract proof remains unchanged.

Still required: complete author/source/review/publish HTTP chains and program/test lifecycle coverage; publication logo asset concurrency and remaining graph/cache withdrawal cases are not closed by this batch. R05 is unchanged and is still an official acceptance gate; R07/R08/R09 work was not executed.

Evidence: docs/reviews/evidence/post28/fa6accd597e0928450ec723a0f320368da010488/R06-publication/evidence-index.json. Actual database cases: 68 passed, zero failed/skipped in final runs. New distinct 4; repeats 64; cumulative 333 across SHAs, not one current-head acceptance run. R06 remains 0/26 accepted.
