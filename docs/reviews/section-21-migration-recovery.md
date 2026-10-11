# Section 21 migration and recovery

The migration is source only and has not been applied. Generate Prisma client in the release build; deploy schema and fine-grained IAM capabilities before enabling service operations.

Before applying: inspect existing ACTIVE pricing duplicates, provider accreditation/maker evidence, terminal workflow duplicates and existing booking/request mappings in an isolated fixture. The conservative unique pricing indexes intentionally reject existing duplicates; resolve them through the owner rather than silently choosing a price. Existing service records default to QUOTE_REQUIRED and legacy pending booking holds receive an expiry. No existing record is automatically approved as FREE, reviewed, qualified or financially settled.

Recover a LINK_PENDING invoice by retrying the request invoice command with the original immutable price tuple. Finance uses the original request/public identity and original actor/key; never create a fresh invoice to bypass a failed link. PENDING_FINANCE cancellation requires Finance void/refund/credit review and a subsequent request transition after clearance. Booking holds expire after 15 minutes; coupon reservations release atomically. Terminal bookings cannot be revived by stale status commands.

Roll back feature routing before attempting a schema rollback. Keep invoice intent, outbox, approval evidence and finance origin identities available for investigation. Do not drop these records merely to make legacy tests pass.
