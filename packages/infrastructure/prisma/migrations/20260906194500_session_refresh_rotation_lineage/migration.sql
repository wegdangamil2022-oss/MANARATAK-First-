-- Refresh-token rotation lineage for single-use opaque refresh credentials.
ALTER TABLE "SessionRecord" ADD COLUMN "familyId" TEXT;
ALTER TABLE "SessionRecord" ADD COLUMN "parentSessionId" TEXT;
ALTER TABLE "SessionRecord" ADD COLUMN "rotatedAt" TIMESTAMP(3);

-- Existing sessions form a one-node family. This keeps the migration safe for
-- an already-populated non-production database while greenfield databases get
-- the final non-null contract directly from the migration chain.
UPDATE "SessionRecord" SET "familyId" = "id" WHERE "familyId" IS NULL;
ALTER TABLE "SessionRecord" ALTER COLUMN "familyId" SET NOT NULL;

CREATE INDEX "SessionRecord_familyId_idx" ON "SessionRecord"("familyId");
CREATE INDEX "SessionRecord_parentSessionId_idx" ON "SessionRecord"("parentSessionId");
ALTER TABLE "SessionRecord"
  ADD CONSTRAINT "SessionRecord_parentSessionId_fkey"
  FOREIGN KEY ("parentSessionId") REFERENCES "SessionRecord"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
