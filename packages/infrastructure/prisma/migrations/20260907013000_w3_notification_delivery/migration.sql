-- MANARATAK_MIGRATION_OWNER: notifications
-- MANARATAK_MIGRATION_SCOPE: owner_only
-- MANARATAK_ARCH_DECISION: ADR-028
-- MNT-AUD-0034: durable notification templates, intents, leases and delivery receipts.
-- Source migration only. Apply only through approved database remediation/provisioning gates.
CREATE TABLE "NotificationTemplateRecord" (
  "id" TEXT NOT NULL,
  "channels" JSONB NOT NULL,
  "requiredVariables" JSONB NOT NULL,
  "localizations" JSONB NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationTemplateRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationIntentRecord" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "recipientReference" TEXT NOT NULL,
  "variables" JSONB NOT NULL,
  "scheduledAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "retryMaxRetries" INTEGER NOT NULL DEFAULT 5,
  "retryBackoffMs" INTEGER NOT NULL DEFAULT 1000,
  "state" TEXT NOT NULL DEFAULT 'CREATED',
  "deliveryState" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leaseWorkerId" TEXT,
  "leaseToken" TEXT,
  "leaseUntil" TIMESTAMP(3),
  "lastErrorCode" TEXT,
  "lastErrorMessage" TEXT,
  "deliveredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationIntentRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationDeliveryReceipt" (
  "id" TEXT NOT NULL,
  "intentId" TEXT NOT NULL,
  "attempt" INTEGER NOT NULL,
  "status" TEXT NOT NULL,
  "providerMessageId" TEXT,
  "metadata" JSONB,
  "errorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NotificationDeliveryReceipt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationIntentRecord_reference_key" ON "NotificationIntentRecord"("reference");
CREATE INDEX "NotificationIntentRecord_deliveryState_nextAttemptAt_idx" ON "NotificationIntentRecord"("deliveryState", "nextAttemptAt");
CREATE INDEX "NotificationIntentRecord_recipientReference_createdAt_idx" ON "NotificationIntentRecord"("recipientReference", "createdAt");
CREATE UNIQUE INDEX "NotificationDeliveryReceipt_intentId_attempt_key" ON "NotificationDeliveryReceipt"("intentId", "attempt");
CREATE INDEX "NotificationDeliveryReceipt_status_createdAt_idx" ON "NotificationDeliveryReceipt"("status", "createdAt");
ALTER TABLE "NotificationIntentRecord" ADD CONSTRAINT "NotificationIntentRecord_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "NotificationTemplateRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NotificationDeliveryReceipt" ADD CONSTRAINT "NotificationDeliveryReceipt_intentId_fkey" FOREIGN KEY ("intentId") REFERENCES "NotificationIntentRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
