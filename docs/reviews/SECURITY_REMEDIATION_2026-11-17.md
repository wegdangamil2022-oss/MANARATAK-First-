# Administrative route authorization remediation — 2026-11-17

Repository: `MANARATAK-First-`. Base: `341aba54559bd1ca85613a6922dcab754ce43a9c`.

## Findings and changes

| Finding | Remediation | Regression evidence |
| --- | --- | --- |
| Student-tool capabilities could be downgraded by changing static URL segment case or appending a slash. | Authorize each matched route using its declaration and decoded, case-sensitive action parameters. Execution details and workspace execution/usage queries require their dedicated permission. Unknown actions fail closed. | Execution details, metadata, release approval/activation and test execution reject weaker roles across URL variants; encoded action parameters remain protected. |
| Public execution output and anonymous session bearers could enter the generic plaintext idempotency store. | Remove generic response caching from the public tools router. Require a bounded command key, retain encrypted requester-bound execution custody, and use private workspace save/claim ownership. Make the administrative test exception case-insensitive. | Four execution spellings produce no calls to generic store begin/complete; synthetic output and bearer are never persisted there. |
| CMS failed schedules and AI reconciliation accepted broad view permission for alternate spellings. | Resolve permission from the matched Express route, treating HEAD as the corresponding GET. Preserve dynamic resource/action case and normal handler validation. | GET/HEAD and case/trailing-slash variants deny the broad viewer; the CMS operations role succeeds. |
| A generic administrative replay could return a prior response after action permission revocation. | Capture successful downstream IAM decisions in request-local async storage and persist an internal authorization envelope. Before replay, re-evaluate all captured actions and resource attributes with current actor, policies, duty restrictions, time and network context. Apply this to canonical and legacy control-plane boundaries. | Revocation and policy expiry return 403 without the private response or a second mutation. Legacy receipts and actor mismatches fail closed. Concurrent actors remain isolated; batch and direct resource checks are captured. |

## Additional findings from continued review

* Course access classification used raw, case-sensitive URL segments. A scoped read role could reach learner/grading routes through alternate spellings. Normalize the classifier and treat HEAD as GET; scoped read access is rejected for learner routes.
* The finance optimistic-version middleware missed alternate spellings and a trailing slash. FX activation could pass without its version precondition. Match every spelling accepted by Express; absence of a version now returns 409 before calling the owner.
* Test discovery link revocation required proposal permission. Bind approve and revoke explicitly to review permission. A proposer is denied and a reviewer succeeds.
* Service request HEAD requests used mutation capability classification and skipped the read PII permission. Apply the same view and PII checks to GET and HEAD before reading the request.

The audit inventory generator now fingerprints invoked route-local authorization helpers and their permission resolvers. The reviewed inventory changed only for the three relocated guards and the service HEAD guard; no existing literal permission evidence was removed. Regression tests detect removal or modification of these guards.

## Compatibility and operational boundaries

* Legacy generic administrative receipts without authorization evidence return `IDEMPOTENCY_REPLAY_PERMISSION_DENIED`. They are not erased or re-executed. Clients must not issue a fresh command merely to bypass this response after an ambiguous mutation result; reconcile with the owner first.
* Unsupported complex policy context makes a receipt non-replayable. Generic replay authorization covers IAM decisions; owner-specific resource assignment/state checks continue to belong to their existing protocols. Owner-managed finance, evidence, staff lifecycle and private tool command boundaries remain separate.
* No migration, seed, database cleanup, production deployment, real account test, or MFA bypass was performed. Existing plaintext receipts, if any, are not retroactively removed by this code change. Assess historical storage and retention separately without returning private bodies or bearer values in audit output.
* This is a targeted route/replay security review, not certification that the repository has no other vulnerabilities. The prior report's authentication, CSRF, traversal, dependency and secret checks were not treated as proof for unrelated surfaces.

## Validation

Synthetic regressions live in `apps/api/tests/security/RouteCapabilitySecurity.spec.ts` and `AuthorizationReplaySecurity.spec.ts`. These exercise actual Express route matching, authorization denial before use-case calls, private-store exclusion, and response replay through the real middleware with an in-memory store. The scanner/idempotency source contracts are covered by `tests/security/admin-audit-coverage.test.mjs` and `tests/remediation/w4-api-idempotency.test.mjs`.

The focused security suite passes 28 tests; the source-contract suites pass 27 tests. Broader repository validation results are recorded with the delivery commit.
