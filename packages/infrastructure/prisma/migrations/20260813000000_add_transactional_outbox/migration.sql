-- Additive migration only. Apply after WP-1 backup and recovery verification.
CREATE TABLE "TransactionalOutboxRecord" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "aggregateType" TEXT,
    "aggregateId" TEXT,
    "payload" JSONB NOT NULL,
    "metadata" JSONB NOT NULL,
    "correlationId" TEXT,
    "causationId" TEXT,
    "state" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedBy" TEXT,
    "claimUntil" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "lastErrorText" TEXT,
    "lastFailedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransactionalOutboxRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TransactionalOutboxRecord_state_availableAt_idx"
ON "TransactionalOutboxRecord"("state", "availableAt");

CREATE INDEX "TransactionalOutboxRecord_claimUntil_idx"
ON "TransactionalOutboxRecord"("claimUntil");

CREATE INDEX "TransactionalOutboxRecord_domain_aggregateType_aggregateId_idx"
ON "TransactionalOutboxRecord"("domain", "aggregateType", "aggregateId");

CREATE INDEX "TransactionalOutboxRecord_correlationId_idx"
ON "TransactionalOutboxRecord"("correlationId");
