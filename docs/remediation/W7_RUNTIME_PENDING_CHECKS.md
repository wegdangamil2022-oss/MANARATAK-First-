# MANARATAK — W7 Runtime / External Evidence Pending

**Status:** ACTIVE HANDOFF REGISTER  
**Wave:** W7 final documentation/evidence closure  
**Source decision:** `SOURCE_COMPLETE`  
**Production decision:** `NOT_CERTIFIED`

W7 closes the ordered remediation source/documentation scope. The items below require environments or account-level controls that are not truthfully provable from a source ZIP and therefore remain external evidence.

## `PENDING_NON_BLOCKING` — runtime/provider/database/deployment

- disposable PostgreSQL migration replay, full P07–P21 integration execution and constraint/concurrency evidence;
- durable outbox/background-worker crash, lease/fencing and multi-instance runtime evidence;
- asset storage/malware/sanitization provider sandbox proof;
- notification, finance, AI and other configured external provider execution evidence;
- real OTLP collector export, metrics/traces ingestion, alert delivery and operational dashboards;
- backup-readiness verification, point-in-time recovery and whole-platform PostgreSQL + asset restore drill;
- measured RPO/RTO against an authorized target environment;
- validation → staging → production deployment-control-plane promotion using the exact immutable artifact;
- post-deploy smoke, rollback rehearsal and environment approval evidence;
- deployed browser E2E for Admin, Public, Student, learner, service and certificate journeys;
- live SEO/prerender crawl validation and deployed locale/accessibility behavior.

## `PENDING_EXTERNAL_GOVERNANCE`

- GitHub `main` branch protection / ruleset evidence for `MNT-AUD-0005`. Source policy exists at `.github/BRANCH_PROTECTION_POLICY.md`, but the ZIP cannot prove repository-side protection, required checks, force-push/delete controls or review enforcement.
- merged commit / PR attestation. The distributed source ZIP contains no trustworthy upstream `.git` metadata; W7 does not fabricate a commit identifier or independent review.

## `PENDING_ENVIRONMENT_DEPENDENCIES`

W7 source verification uses Node-only source guards and does not claim a fresh full dependency installation. Full typecheck/build/unit/browser suites that require the complete npm/browser environment remain governed by CI/runtime evidence. This does not replace or invalidate the source-only PASS results recorded by W4–W7.

## Rule

None of the pending items above may be converted to `PASS`, `RUNTIME_VERIFIED`, or `PRODUCTION_READY` without evidence bound to the exact source/release artifact.
