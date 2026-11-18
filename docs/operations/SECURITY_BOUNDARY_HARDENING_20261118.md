# Security boundary hardening

This change hardens existing source contracts. It does not deploy the application, mutate a live database, or remove historical logs.

- Email verification preserves an active identity's lifecycle and cannot reactivate a suspended, archived, or purged identity. Prisma verifies the expected status and email within a serializable transaction before saving verification.
- Password recovery checks the current email and rejects tokens issued before the credential's latest update. Email/password changes invalidate pending recovery tokens; a successful reset invalidates other pending recovery tokens and revokes sessions. Password recovery also has a shared per-email request budget, in addition to the IP budget.
- Learner delivery-grant requests always check current course/lesson access and do not use generic response persistence. Other learner mutation commands retain idempotency. Learner responses prevent HTTP caching. An already issued delivery URL keeps its existing provider-enforced expiry; this change does not revoke issued provider URLs.
- CMS rich-text validation scans once instead of repeatedly scanning malformed tags. Public search reads localized published CMS snapshots and never falls back to draft-bearing root title/summary fields.
- Each source HTTP request has an elapsed-time deadline in addition to its idle timeout. Redirects and robots requests each have their own deadline; DNS validation and limiter waits are outside this per-request deadline. Slow legitimate responses may now fail at the configured request timeout.
- HTTP logs omit query values. Log messages, errors and context redact recognized credentials and URL query data. This protects newly emitted logs; it is not a guarantee of detecting arbitrary unlabelled secrets or sensitive path segments.
- Finance provider metadata uses a closed set of fields and value formats. FX numerator/denominator values must be decimal strings with at most 30 digits before conversion. See [the finance provider contract](FINANCE_PROVIDER_RUNTIME.md) before enabling an existing provider integration.

Regression coverage uses synthetic requests, provider responses and repository fixtures. The CMS search candidate SQL is additionally exercised on an in-memory SQLite database. These checks do not establish PostgreSQL concurrency behavior, production cache/CDN configuration, provider-side URL revocation, or production deployment readiness.
