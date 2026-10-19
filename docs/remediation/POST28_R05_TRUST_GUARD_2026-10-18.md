# R05 trust guard prepared — 2026-10-18

The pure requireKnownSourceTrust check and 17/17 Node 22 tests are prepared. They reject FK-only INITIATED shortcuts, owner mismatch, fabricated original-file recovery, permanent retention/default shortcuts, extension/expiry, fabricated hold, mismatched raw/sanitized digests or locator evidence, missing sanitization, incomplete activation, unclean rescans and changed Consent/financial history. It accepts separate raw and sanitized digests and explicitly returns ownerAuthorizationVerified:false and upgradeAuthorized:false. It is not integrated into a historical remediation executor; F02 remains open.

The new actual DB-T PDF suite on R06 source 6e5e969 passed 6/6 on a fresh isolated PostgreSQL 16.15 server; see the R06 branch POST28_R06_REAL_PDF_2026-10-18.md and its indexed evidence. This does not rebind earlier R05 runtime evidence to this new source or repair the old missing asset. Existing R05 backup/restore and negative orphan audit remain preserved; historical upgrade 110 remains unexecuted.

The project owner has now explicitly documented holding technical authority for Assets, Student and Audit and will review the unified proposal. No approval of that proposal is inferred. Preparation of atomic Audit integration, manifest-scoped executor/delta comparison, independent review and gated upgrade verification remains required.
