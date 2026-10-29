# Admin data latency investigation — 2026-10-29

The review workspace repeated the same authorization storage reads for each owner permission. Its initial reviewers, saved views and query requests each built their own access projection. The shared browser request queue also retained canceled navigation requests until a slot became available, and a late completion from a previous session could release a slot belonging to a new session.

The fix introduces permission batches whose pending storage reads exist only inside one invocation. Role assignments, emergency access, duty policy, roles and referenced policies are read once per batch. Every permission still runs its own policy evaluation with its own resource and action; subsequent requests and command checks load current access again. The workbench access projection, reviewer eligibility and conditional `/auth/me` projection use this path. No cross-request authorization cache is introduced. Single permission checks also read assignments and emergency grants concurrently.

The browser queue removes aborted waiters immediately, combines caller cancellation with session cancellation, and gives each acquired slot an idempotent release bound to its session epoch. Caller-scoped requests do not share a transport whose cancellation belongs to another component. The existing three-request limit remains in place.

## Measurements

Read-only component benchmark against the original database using the existing non-owner application role and strict TLS:

| Review access projection | Database reads | Sample 1 | Sample 2 |
| --- | ---: | ---: | ---: |
| Previous implementation | 55 | 9,000 ms | 9,767 ms |
| Batched implementation | 5 | 1,795 ms | 2,352 ms |

The effective owner domains and import permission were identical in both implementations. These figures measure the authorization component, not authenticated HTTP or total page loading time. Evidence is in the private `three-sections-20261028/data-latency-components.json` receipt.

The independent connection probe measured warm trivial query round trips of 142–267 ms for direct connections and 155–174 ms for pooled connections, with first-use connection setup of 2,331 and 3,229 ms. The inspected account aggregate executed inside PostgreSQL in 0.087–0.103 ms. This sample supports reducing network round trips rather than applying unproven schema changes. Pool exhaustion can follow excessive concurrent reads; see [Prisma connection guidance](https://www.prisma.io/docs/orm/v6/prisma-client/setup-and-configuration/databases-connections).

The Windows time service reports no successful synchronization and uses the local CMOS clock. Six samples per connection path place the computer clock about 33.5 seconds ahead of the database clock. The phone clock was not accessible. This is a separate time synchronization issue that can affect TOTP codes and age displays; no operating system clock or MFA tolerance was changed.

## Validation and limits

- 326 tests passed, zero failures, covering request cancellation, old-session lease completion, immediate revocation on subsequent batches, duty denial, emergency expiry, per-permission policy decisions, conditional session projections and reviewer eligibility.
- Admin production build, domain/shared build, admin/API TypeScript checks, source quality, architecture and secret checks passed. ESLint reports zero errors; existing warnings in the shared API client and auth router remain. The existing large admin bundle warning remains.
- Headless ephemeral browser verification confirms dashboard values and navigation to the review query while a dashboard read is delayed. API responses in this browser check are synthetic, external network is blocked and no screenshots are taken. This does not constitute authenticated acceptance against the original database.
- No migrations, seeding, acceptance data writes, account/role changes, MFA bypass, external delivery or background workers. No repeated database engine restart.
- Local runtime promotion must verify the new sealed API and admin assets on port 3002 before replacing the process on port 3000. The original public web artifact remains in the seal.
