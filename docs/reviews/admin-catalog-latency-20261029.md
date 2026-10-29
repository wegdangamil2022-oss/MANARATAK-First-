# Dashboard and major-list latency follow-up

Scope: reduce read latency in the existing administrative workspace. No migrations, seeds, original-database acceptance mutations, account or MFA changes, workers, provider activation, or external delivery.

## Measured cause

The prior authorization/queue fix did not eliminate the catalog-list network waterfall. A major list with three rows still caused thirteen database statements: two filtered paging/count reads, ten sequential owner-graph relation reads, and a content-review aggregate. The major page also admitted taxonomy pickers ahead of its delayed main list and started a secondary candidate counter immediately. The dashboard made seven separate catalog-counter requests, each repeating its authenticated access boundary.

## Changes

- Hydrate the same bounded major owner graph in one parameterized statement. Fetch it and content-review metadata concurrently. Retain profile/root count semantics, taxonomy/degree mappings, sources, ordering, filters, owner IDs, and publication guards. Restore PostgreSQL JSON timestamp columns to UTC Date values, matching Prisma's existing timestamp behavior.
- Start the major list immediately when there is no search debounce. Defer its candidate badge until the list is available. Abort taxonomy picker transports on navigation and obsolete searches.
- Group the dashboard's seven primary catalog counters into one read-only transport. Evaluate all requested domain permissions freshly in one authorization batch, using the same request IP, time, user agent, and correlation context as the domain guards. Return only aggregate totals, with independent forbidden/unavailable states. An owner failure does not suppress other owners; denied owners are never read. Preserve no-store, cancellation, deadlines, and stale-data handling.
- The dashboard counters reuse owner use cases and predicates. Internal count-only paths avoid hydrating scholarship, CMS, test and career records. Existing public/administrative input schemas do not expose those internal switches.
- Recheck staff access flags, active membership and membership time bounds in one fresh statement. Preserve the prior missing-table compatibility path, fail-closed storage behavior, and per-request revocation checks.

## Evidence

Read-only A/B against the configured original Neon database, using the application role and strict TLS:

| Component | Before | After |
| --- | --- | --- |
| Major-list owner read | 13 statements / 4479 ms | 4 statements / 847 ms |
| Staff access read | 3 statements / 1023 ms | 1 statement / 327 ms |

The major response was compared in full after normalizing timestamps and unordered relation arrays; all values and relationships matched. These are component measurements, not authenticated end-to-end page timings, and network latency varies.

362 tests passed across 48 files, including aggregate filter parity, current permission revocation, denial isolation, cancellation, deadlines, authorization, review workspace, security/MFA boundaries, and major publication checks. Admin/API TypeScript checks and domain/shared declaration builds passed. Changed-source lint has zero errors; source quality, architecture and secret checks passed.

An isolated headless browser, with synthetic API fixtures and all external traffic blocked, verified grouped dashboard counts, major-list priority, and cancellation of all three taxonomy requests when navigating away. No screenshots, existing browser profile, original-account login, or original-database mutations were used for this browser test. Synthetic navigation timings are not original-database performance claims.

The existing large admin bundle warning remains. Authenticated original-user page timing must be measured through the user's normal session; no credentials or MFA proof were forged for acceptance.
