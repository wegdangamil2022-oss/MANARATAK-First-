# R07 CodeQL result review

Source reviewed: `6f9cae73dfad7a2886bb0f4225ca49cb256e6d05`, PR #34. CodeQL analysis ran successfully, but its separate result check `118269541680` failed with eight new high-severity annotations. A successful workflow job was therefore not sufficient to claim all checks green.

## Three actual defects repaired

- Alert 135: generated SVG validation combined overlapping tag/whitespace matching. A hostile tag containing many tabs could trigger quadratic backtracking. The replacement consumes each tag once, respects quoted `>` characters, rejects incomplete/nested markup, and retains declaration, active-element and event-attribute denial.
- Alert 136: CSS `url(...)` matching could repeatedly scan the remaining input at every nested `url(` prefix. The replacement consumes each URL span once, rejects incomplete or nested targets and preserves the existing fragment/embedded-font/image allowlist. External references remain rejected.
- Alert 80: topic splitting repeated optional whitespace around delimiters. Splitting only on the literal delimiters is equivalent after the existing trim/NFKC normalization and eliminates the ambiguous scan. Unresolved relationships still block publication.

Targeted verification: the two affected Vitest files passed 17 tests. Five new tests cover safe generated references, active/external content including quoted tag delimiters, killable-child hostile SVG payloads, source-term normalization/denials, and killable-child whitespace attacks. Child timeouts make a synchronous regression fail without hanging the test runner. No database test or full application build was repeated locally.

## Three hash alerts: reviewed false positives

Alerts 157/158 point at session lookup digests in `InMemorySessionManager` and `PrismaSessionManager`. `JwtTokenProvider.generateRefreshToken()` generates `mrt_` plus 32 cryptographically random bytes; `AuthService.login()` passes that fresh token to session storage. The supplied password is checked separately by `PrismaCredentialVerifier` and `PasswordHasher` using scrypt. No human password reaches these token-index digests. A slow password KDF would not improve a 256-bit random token lookup and would break the existing persisted digest contract. The implementation and stored digest format are retained.

Alert 159 points at the disposable Redis ACL's `#<hash>` field. Redis requires SHA-256 in this field. Its secret is freshly generated with `randomBytes(32)` for a new isolated container, never a user-selected password. The private configuration is outside the checkout and deleted with the owned lab. Replacing the digest with scrypt would break authentication rather than repair password storage. See [Redis ACL password rules](https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/).

These three exact alerts are eligible for individual `false positive` dismissal with the above evidence. No query exclusion or broad scanner suppression is justified.

## Two fixture-only rate-limit annotations

Alert 155 is in `tests/database/fixtures/post28-r08-session-server.mjs`: it requires IPC, the exact authorized DB-T suite and no setup credential, then binds only `127.0.0.1` on an ephemeral port. The synthetic AuthRouter uses the existing real local fixed-window limiter; the private diagnostic endpoint is not a production route. Alert 156 is in `tests/database/post28-learning-path-http.database.spec.mjs`: the Express app is passed to Supertest, has no external listener, uses synthetic DB-T principals, and cannot run without the explicit isolated-runner guards. It exercises the production permission/idempotency middleware. These are specific `used in tests` findings; they are not a reason to disable rate-limit analysis on production routes. The original unfinished R08 edits remain excluded from this repair.

## Limits and next observation

Only the five identified non-production/password-misclassification alerts are candidates for individual disposition. The three genuine ReDoS alerts must be cleared by code analysis of the actual patch, not dismissed. The existing CodeQL query set and failure severity remain enabled. The repository also contains older alerts outside these eight annotations; they have not been collectively reviewed or dismissed, and this report makes no claim of a vulnerability-free repository. The queried PR-ref inventory contained 113 alert records, including earlier findings, at this observation.

Individual dispositions and the next SHA's actual CodeQL result must be retained before claiming the failing check resolved. This review is not independent R05 acceptance or production authorization.
