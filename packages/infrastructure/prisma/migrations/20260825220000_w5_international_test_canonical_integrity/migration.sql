-- W5 — International Tests canonical/public integrity
-- Source-only migration. DO NOT APPLY outside the approved Google Studio database gate.

ALTER TABLE "InternationalTestCountryRelationship"
  ADD COLUMN IF NOT EXISTS "canonicalReferenceId" TEXT;

ALTER TABLE "InternationalTestLanguageRelationship"
  ADD COLUMN IF NOT EXISTS "canonicalReferenceId" TEXT;

CREATE INDEX IF NOT EXISTS "InternationalTestCountryRelationship_canonicalReferenceId_idx"
  ON "InternationalTestCountryRelationship"("canonicalReferenceId");
CREATE INDEX IF NOT EXISTS "InternationalTestLanguageRelationship_canonicalReferenceId_idx"
  ON "InternationalTestLanguageRelationship"("canonicalReferenceId");

CREATE UNIQUE INDEX IF NOT EXISTS "InternationalTestCountryRelationship_testId_canonicalReferenceId_relationshipType_key"
  ON "InternationalTestCountryRelationship"("testId", "canonicalReferenceId", "relationshipType");
CREATE UNIQUE INDEX IF NOT EXISTS "InternationalTestLanguageRelationship_testId_canonicalReferenceId_relationshipType_key"
  ON "InternationalTestLanguageRelationship"("testId", "canonicalReferenceId", "relationshipType");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InternationalTestCountryRelationship_canonicalReferenceId_fkey') THEN
    ALTER TABLE "InternationalTestCountryRelationship"
      ADD CONSTRAINT "InternationalTestCountryRelationship_canonicalReferenceId_fkey"
      FOREIGN KEY ("canonicalReferenceId") REFERENCES "ReferenceCountry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InternationalTestLanguageRelationship_canonicalReferenceId_fkey') THEN
    ALTER TABLE "InternationalTestLanguageRelationship"
      ADD CONSTRAINT "InternationalTestLanguageRelationship_canonicalReferenceId_fkey"
      FOREIGN KEY ("canonicalReferenceId") REFERENCES "ReferenceLanguage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- Existing legacy code-only rows intentionally remain nullable here.
-- Canonical ID reconciliation/backfill is PENDING_GOOGLE_STUDIO and must be proven before NOT NULL promotion.
