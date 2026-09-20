DROP INDEX IF EXISTS "TransactionalOutboxRecord_claimedBy_claimToken_idx";
ALTER TABLE "TransactionalOutboxRecord" DROP COLUMN IF EXISTS "claimToken";
