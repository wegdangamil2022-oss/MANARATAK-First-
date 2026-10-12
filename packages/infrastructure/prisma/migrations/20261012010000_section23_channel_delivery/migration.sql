-- MANARATAK_MIGRATION_OWNER: notifications
-- MANARATAK_MIGRATION_SCOPE: owner_only
-- MANARATAK_ARCH_DECISION: ADR-028
-- Source preparation only. Review/apply after section 28 with a backup and separate DB approval.
ALTER TABLE "NotificationTemplateRecord" ADD COLUMN "contents" JSONB, ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE "NotificationIntentRecord" ADD COLUMN "variablesEncrypted" JSONB, ADD COLUMN "variablesFingerprint" TEXT, ADD COLUMN "payloadErasedAt" TIMESTAMP(3), ADD COLUMN "contentsSnapshot" JSONB, ADD COLUMN "channelsSnapshot" JSONB,
  ADD COLUMN "retryEpochStart" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "manualRetryCount" INTEGER NOT NULL DEFAULT 0;
UPDATE "NotificationIntentRecord" i SET "channelsSnapshot" = t."channels"
FROM "NotificationTemplateRecord" t WHERE t."id" = i."templateId";
CREATE TABLE "NotificationChannelDelivery" (
  "intentId" TEXT NOT NULL REFERENCES "NotificationIntentRecord"("id") ON DELETE CASCADE,
  "channel" TEXT NOT NULL CHECK ("channel" IN ('IN_APP','EMAIL','PUSH')),
  "status" TEXT NOT NULL CHECK ("status" IN ('DELIVERED','ACCEPTED','SUPPRESSED')),
  "attempts" INTEGER NOT NULL,
  "providerMessageId" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  PRIMARY KEY ("intentId", "channel")
);
-- Historical mixed delivered rows cannot safely be redelivered; checkpoint all their channels.
INSERT INTO "NotificationChannelDelivery" ("intentId", "channel", "status", "attempts", "updatedAt")
SELECT i."id", c.value, 'DELIVERED', i."attempts", COALESCE(i."deliveredAt", i."updatedAt")
FROM "NotificationIntentRecord" i CROSS JOIN LATERAL jsonb_array_elements_text(i."channelsSnapshot") c
WHERE i."deliveryState" = 'DELIVERED';
CREATE TABLE "NotificationRateReservation" (
  "intentId" TEXT NOT NULL REFERENCES "NotificationIntentRecord"("id") ON DELETE CASCADE,
  "attempt" INTEGER NOT NULL,
  "recipientReference" TEXT NOT NULL,
  "reservedAt" TIMESTAMP(3) NOT NULL,
  PRIMARY KEY ("intentId", "attempt")
);
INSERT INTO "NotificationRateReservation" ("intentId", "attempt", "recipientReference", "reservedAt")
SELECT r."intentId", r."attempt", i."recipientReference", r."createdAt"
FROM "NotificationDeliveryReceipt" r JOIN "NotificationIntentRecord" i ON i."id" = r."intentId"
WHERE r."status" = 'DELIVERED' AND r."createdAt" > CURRENT_TIMESTAMP - INTERVAL '1 hour';
CREATE INDEX "NotificationRateReservation_recipientReference_reservedAt_idx"
  ON "NotificationRateReservation" ("recipientReference", "reservedAt");

CREATE INDEX "NotificationIntentRecord_createdAt_id_idx" ON "NotificationIntentRecord" ("createdAt", "id");
CREATE INDEX "NotificationIntentRecord_payloadErasedAt_createdAt_idx" ON "NotificationIntentRecord" ("payloadErasedAt", "createdAt");
