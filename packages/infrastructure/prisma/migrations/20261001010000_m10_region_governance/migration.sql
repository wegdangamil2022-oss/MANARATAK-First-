-- MANARATAK_MIGRATION_OWNER: reference
-- MANARATAK_MIGRATION_SCOPE: cross_context_approved
-- MANARATAK_ARCH_DECISION: ADR-028
-- M10-07 source only: UNAPPLIED. Approval/recovery/connected proof are required.
-- Cross-context scope is limited to enforcing existing canonical region FKs.
ALTER TABLE "AdministrativeRegion"
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "lifecycleState" TEXT NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "versionNumber" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "effectiveTo" TIMESTAMP(3);
ALTER TABLE "AdministrativeRegion" ADD CONSTRAINT "AdministrativeRegion_governance_check"
  CHECK ("versionNumber" > 0 AND "lifecycleState" IN ('ACTIVE', 'DEPRECATED', 'ARCHIVED', 'SUPERSEDED', 'MERGED')
    AND "isActive" = ("lifecycleState" = 'ACTIVE'));
CREATE INDEX "AdministrativeRegion_lifecycleState_idx" ON "AdministrativeRegion"("lifecycleState");

-- Preserve existing canonical IDs and establish the initial history snapshot.
UPDATE "AdministrativeRegion" SET "effectiveFrom" = "createdAt";
INSERT INTO "ReferenceVersionRecord"
  ("id", "entityType", "referenceId", "versionNumber", "lifecycleState", "effectiveFrom", "effectiveTo", "snapshot", "changeReason", "actorId", "createdAt")
SELECT 'm10-region-baseline-' || r."id", 'REGION', r."id", 1, 'ACTIVE', r."effectiveFrom", NULL,
  to_jsonb(r), 'M10_REGION_GOVERNANCE_BASELINE', 'MIGRATION:20261001010000_m10_region_governance', CURRENT_TIMESTAMP
FROM "AdministrativeRegion" r;

-- Serialize relation assignment with lifecycle changes, including non-API writes.
-- Existing links may survive deprecation, but new links require an ACTIVE region.
CREATE FUNCTION manaratak_require_active_region_relation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE region_id TEXT; previous_id TEXT; region_country TEXT; region_state TEXT; relation_country TEXT;
BEGIN
  region_id := to_jsonb(NEW) ->> TG_ARGV[0];
  IF TG_OP = 'UPDATE' THEN previous_id := to_jsonb(OLD) ->> TG_ARGV[0]; END IF;
  IF region_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND region_id IS NOT DISTINCT FROM previous_id
    AND (to_jsonb(NEW) ->> TG_ARGV[1]) IS NOT DISTINCT FROM (to_jsonb(OLD) ->> TG_ARGV[1]) THEN RETURN NEW; END IF;
  SELECT "countryIso2Code", "lifecycleState" INTO region_country, region_state
    FROM "AdministrativeRegion" WHERE "id" = region_id FOR UPDATE;
  IF region_state IS DISTINCT FROM 'ACTIVE' THEN
    RAISE EXCEPTION 'REGION_NOT_ACTIVE' USING ERRCODE = '23514';
  END IF;
  IF TG_TABLE_NAME = 'ReferenceCity' THEN
    IF region_country IS DISTINCT FROM NEW."countryIso2Code" THEN
      RAISE EXCEPTION 'REGION_COUNTRY_MISMATCH' USING ERRCODE = '23514';
    END IF;
  ELSE
    SELECT "iso2Code" INTO relation_country FROM "ReferenceCountry" WHERE "id" = NEW."countryReferenceId";
    IF region_country IS DISTINCT FROM relation_country THEN
      RAISE EXCEPTION 'REGION_COUNTRY_MISMATCH' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "ReferenceCity_active_region" BEFORE INSERT OR UPDATE OF "administrativeRegionId", "countryIso2Code"
  ON "ReferenceCity" FOR EACH ROW EXECUTE FUNCTION manaratak_require_active_region_relation('administrativeRegionId', 'countryIso2Code');
CREATE TRIGGER "University_active_region" BEFORE INSERT OR UPDATE OF "regionReferenceId", "countryReferenceId"
  ON "University" FOR EACH ROW EXECUTE FUNCTION manaratak_require_active_region_relation('regionReferenceId', 'countryReferenceId');
CREATE TRIGGER "UniversityCampus_active_region" BEFORE INSERT OR UPDATE OF "regionReferenceId", "countryReferenceId"
  ON "UniversityCampus" FOR EACH ROW EXECUTE FUNCTION manaratak_require_active_region_relation('regionReferenceId', 'countryReferenceId');

CREATE FUNCTION manaratak_protect_region_dependencies() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'REGION_DELETE_FORBIDDEN_USE_LIFECYCLE' USING ERRCODE = '23514'; END IF;
  IF NEW."id" <> OLD."id" OR NEW."countryIso2Code" <> OLD."countryIso2Code" OR NEW."regionCode" <> OLD."regionCode" THEN
    RAISE EXCEPTION 'REGION_IDENTITY_IMMUTABLE' USING ERRCODE = '23514';
  END IF;
  IF NEW."lifecycleState" IN ('ARCHIVED', 'SUPERSEDED', 'MERGED') AND NEW."lifecycleState" <> OLD."lifecycleState" THEN
    IF EXISTS (SELECT 1 FROM "ReferenceCity" WHERE "administrativeRegionId" = OLD."id")
      OR EXISTS (SELECT 1 FROM "University" WHERE "regionReferenceId" = OLD."id")
      OR EXISTS (SELECT 1 FROM "UniversityCampus" WHERE "regionReferenceId" = OLD."id") THEN
      RAISE EXCEPTION 'REGION_HAS_DEPENDENCIES' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "AdministrativeRegion_protect_dependencies" BEFORE UPDATE OR DELETE
  ON "AdministrativeRegion" FOR EACH ROW EXECUTE FUNCTION manaratak_protect_region_dependencies();
