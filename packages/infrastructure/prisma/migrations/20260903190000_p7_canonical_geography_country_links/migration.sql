-- P7 canonical geography hardening.
-- Compatibility-safe: ISO2 source columns are preserved; nullable internal IDs are backfilled.
-- Apply only through the normal database remediation/migration gate after backup + dry-run.

ALTER TABLE "AdministrativeRegion" ADD COLUMN IF NOT EXISTS "countryReferenceId" TEXT;
ALTER TABLE "ReferenceCity" ADD COLUMN IF NOT EXISTS "countryReferenceId" TEXT;

UPDATE "AdministrativeRegion" r
SET "countryReferenceId" = c."id"
FROM "ReferenceCountry" c
WHERE r."countryReferenceId" IS NULL
  AND upper(btrim(r."countryIso2Code")) = c."iso2Code";

UPDATE "ReferenceCity" city
SET "countryReferenceId" = c."id"
FROM "ReferenceCountry" c
WHERE city."countryReferenceId" IS NULL
  AND upper(btrim(city."countryIso2Code")) = c."iso2Code";

CREATE INDEX IF NOT EXISTS "AdministrativeRegion_countryReferenceId_idx"
  ON "AdministrativeRegion"("countryReferenceId");
CREATE INDEX IF NOT EXISTS "ReferenceCity_countryReferenceId_idx"
  ON "ReferenceCity"("countryReferenceId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AdministrativeRegion_countryReferenceId_fkey') THEN
    ALTER TABLE "AdministrativeRegion"
      ADD CONSTRAINT "AdministrativeRegion_countryReferenceId_fkey"
      FOREIGN KEY ("countryReferenceId") REFERENCES "ReferenceCountry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ReferenceCity_countryReferenceId_fkey') THEN
    ALTER TABLE "ReferenceCity"
      ADD CONSTRAINT "ReferenceCity_countryReferenceId_fkey"
      FOREIGN KEY ("countryReferenceId") REFERENCES "ReferenceCountry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
