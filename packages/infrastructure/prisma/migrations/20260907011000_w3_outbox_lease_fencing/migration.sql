-- ABSHEER_MIGRATION_OWNER: events
-- ABSHEER_MIGRATION_SCOPE: owner_only
-- ABSHEER_ARCH_DECISION: ADR-028
-- ABSH-AUD-0068: fence every outbox lease with a per-claim token.
ALTER TABLE "TransactionalOutboxRecord" ADD COLUMN "claimToken" TEXT;
CREATE INDEX "TransactionalOutboxRecord_claimedBy_claimToken_idx" ON "TransactionalOutboxRecord"("claimedBy", "claimToken");
