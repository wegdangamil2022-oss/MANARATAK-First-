# P10a — exact source review and canonical draft write

This increment completes the source-bound Stage 1 review path. It creates no new table, migration or approval system. An explicit decision names the exact preview hash, actual reviewer identity, reason and canonical country/region/city IDs. Preparation is offline and grants no permission. The real writer reauthorizes the current verified active actor and requires that actor to match the reviewer.

This source review path is initial-create only. If the permanent university identity already exists, review fails closed and requires the separate update workflow; a fresh import must not overwrite later manual edits through a Stage 1 review. APPLIED receipt replay remains read-only and reauthorized. Stage 2/update concurrency is outside this pilot's acceptance.

The writer locks source receipts and assets, rebuilds the preview from their persisted contents, applies only the reviewed canonical geography additions, and compares the resulting sealed hash with the submitted plan. Removing the owner-review issue and resealing a modified source-bound plan is insufficient. All source fields remain tied to the stored screening result. Active geography and parent relationships are checked under shared row locks, including the source's country ISO3 code. The existing Audit and Outbox records retain the plan hash, bindings and decision atomically with canonical changes; an APPLIED replay reauthorizes but performs no fresh write. Legacy later-stage contracts remain available. Stage 1 CLI commits now require source-bound review.

The minimal institution class `UNIVERSITY` is supported for all four selected institutions by [primary source evidence](evidence/IMPORT_UNIVERSITY_INSTITUTION_REVIEW_2026-10-23.json). This is a common normalized class, not approval of workbook specialist labels or ownership. Preserve the original workbook and row hashes and the previous incomplete receipts. A new reviewed derived artifact goes through the existing asset lifecycle and P6 screening; no receipt is edited to pass.

Workflow:

1. Stage the new reviewed artifact using actual Assets/P6 and retrieve durable receipt bindings.
2. Run `university-screening-preview.ts` with a verified authorized actor; save each sealed preview separately.
3. Review official fields and canonical geography IDs. Prepare the decision JSON with `previewPlanHash`, `reviewedBy`, `reason`, and `geography` (one exact sourceReferenceId plus three canonical IDs per university).
4. Run `university-screening-review.ts <preview.json> <decision.json> <new-plan.json>`. It connects to no database and refuses overwriting output.
5. Commit through the existing mutation/recovery gate, exact plan hash and current identity. Publication remains a separate owner workflow. Rollback retains its existing all-row conflict/dependency checks.

Runtime proof and source SHA are recorded separately after execution. Until that proof exists this document is an implementation contract, not a successful managed import. The real owner account remains deferred; synthetic lab actors do not authorize Neon or production.
