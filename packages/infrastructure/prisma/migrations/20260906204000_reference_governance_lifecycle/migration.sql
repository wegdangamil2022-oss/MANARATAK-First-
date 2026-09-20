-- MANARATAK_MIGRATION_OWNER: reference
-- MANARATAK_MIGRATION_SCOPE: owner_only
-- MANARATAK_ARCH_DECISION: ADR-028
-- MNT-AUD-0013: explicit P07 lifecycle, immutable versions, aliases, provider mappings and supersession/merge relationships.

ALTER TABLE "ReferenceCountry"
  ADD COLUMN "lifecycleState" TEXT NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "versionNumber" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "effectiveTo" TIMESTAMP(3);
ALTER TABLE "ReferenceCurrency"
  ADD COLUMN "lifecycleState" TEXT NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "versionNumber" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "effectiveTo" TIMESTAMP(3);
ALTER TABLE "ReferenceLanguage"
  ADD COLUMN "lifecycleState" TEXT NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "versionNumber" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "effectiveTo" TIMESTAMP(3);
ALTER TABLE "ReferenceCity"
  ADD COLUMN "lifecycleState" TEXT NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "versionNumber" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "effectiveTo" TIMESTAMP(3);

UPDATE "ReferenceCountry" SET "lifecycleState" = CASE WHEN "isActive" THEN 'ACTIVE' ELSE 'DEPRECATED' END, "effectiveTo" = CASE WHEN "isActive" THEN NULL ELSE CURRENT_TIMESTAMP END;
UPDATE "ReferenceCurrency" SET "lifecycleState" = CASE WHEN "isActive" THEN 'ACTIVE' ELSE 'DEPRECATED' END, "effectiveTo" = CASE WHEN "isActive" THEN NULL ELSE CURRENT_TIMESTAMP END;
UPDATE "ReferenceLanguage" SET "lifecycleState" = CASE WHEN "isActive" THEN 'ACTIVE' ELSE 'DEPRECATED' END, "effectiveTo" = CASE WHEN "isActive" THEN NULL ELSE CURRENT_TIMESTAMP END;
UPDATE "ReferenceCity" SET "lifecycleState" = CASE WHEN "isActive" THEN 'ACTIVE' ELSE 'DEPRECATED' END, "effectiveTo" = CASE WHEN "isActive" THEN NULL ELSE CURRENT_TIMESTAMP END;

ALTER TABLE "ReferenceCountry" ADD CONSTRAINT "ReferenceCountry_lifecycleState_check" CHECK ("lifecycleState" IN ('ACTIVE','DEPRECATED','ARCHIVED','SUPERSEDED','MERGED'));
ALTER TABLE "ReferenceCurrency" ADD CONSTRAINT "ReferenceCurrency_lifecycleState_check" CHECK ("lifecycleState" IN ('ACTIVE','DEPRECATED','ARCHIVED','SUPERSEDED','MERGED'));
ALTER TABLE "ReferenceLanguage" ADD CONSTRAINT "ReferenceLanguage_lifecycleState_check" CHECK ("lifecycleState" IN ('ACTIVE','DEPRECATED','ARCHIVED','SUPERSEDED','MERGED'));
ALTER TABLE "ReferenceCity" ADD CONSTRAINT "ReferenceCity_lifecycleState_check" CHECK ("lifecycleState" IN ('ACTIVE','DEPRECATED','ARCHIVED','SUPERSEDED','MERGED'));

CREATE INDEX "ReferenceCountry_lifecycleState_idx" ON "ReferenceCountry"("lifecycleState");
CREATE INDEX "ReferenceCurrency_lifecycleState_idx" ON "ReferenceCurrency"("lifecycleState");
CREATE INDEX "ReferenceLanguage_lifecycleState_idx" ON "ReferenceLanguage"("lifecycleState");
CREATE INDEX "ReferenceCity_lifecycleState_idx" ON "ReferenceCity"("lifecycleState");

CREATE TABLE "ReferenceVersionRecord" (
  "id" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "referenceId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "lifecycleState" TEXT NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveTo" TIMESTAMP(3),
  "snapshot" JSONB NOT NULL,
  "changeReason" TEXT,
  "actorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReferenceVersionRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReferenceVersionRecord_lifecycleState_check" CHECK ("lifecycleState" IN ('ACTIVE','DEPRECATED','ARCHIVED','SUPERSEDED','MERGED'))
);
CREATE UNIQUE INDEX "ReferenceVersionRecord_entityType_referenceId_versionNumber_key" ON "ReferenceVersionRecord"("entityType","referenceId","versionNumber");
CREATE INDEX "ReferenceVersionRecord_entityType_referenceId_createdAt_idx" ON "ReferenceVersionRecord"("entityType","referenceId","createdAt");

CREATE TABLE "ReferenceAliasRecord" (
  "id" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "referenceId" TEXT NOT NULL,
  "alias" TEXT NOT NULL,
  "normalizedAlias" TEXT NOT NULL,
  "locale" TEXT,
  "aliasType" TEXT NOT NULL DEFAULT 'COMMON',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReferenceAliasRecord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ReferenceAliasRecord_entityType_normalizedAlias_isActive_idx" ON "ReferenceAliasRecord"("entityType","normalizedAlias","isActive");
CREATE INDEX "ReferenceAliasRecord_entityType_referenceId_isActive_idx" ON "ReferenceAliasRecord"("entityType","referenceId","isActive");

CREATE TABLE "ReferenceProviderMappingRecord" (
  "id" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "referenceId" TEXT NOT NULL,
  "providerSystem" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "normalizedProviderSystem" TEXT NOT NULL,
  "normalizedProviderId" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReferenceProviderMappingRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ReferenceProviderMappingRecord_entityType_normalizedProviderSystem_normalizedProviderId_key" ON "ReferenceProviderMappingRecord"("entityType","normalizedProviderSystem","normalizedProviderId");
CREATE INDEX "ReferenceProviderMappingRecord_entityType_referenceId_isActive_idx" ON "ReferenceProviderMappingRecord"("entityType","referenceId","isActive");

CREATE TABLE "ReferenceRelationshipRecord" (
  "id" TEXT NOT NULL,
  "sourceEntityType" TEXT NOT NULL,
  "sourceReferenceId" TEXT NOT NULL,
  "relationshipType" TEXT NOT NULL,
  "targetEntityType" TEXT NOT NULL,
  "targetReferenceId" TEXT NOT NULL,
  "reason" TEXT,
  "actorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReferenceRelationshipRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReferenceRelationshipRecord_type_check" CHECK ("relationshipType" IN ('SUPERSEDED_BY','MERGED_INTO')),
  CONSTRAINT "ReferenceRelationshipRecord_no_self_check" CHECK ("sourceReferenceId" <> "targetReferenceId")
);
CREATE UNIQUE INDEX "ReferenceRelationshipRecord_sourceEntityType_sourceReferenceId_relationshipType_key" ON "ReferenceRelationshipRecord"("sourceEntityType","sourceReferenceId","relationshipType");
CREATE INDEX "ReferenceRelationshipRecord_targetEntityType_targetReferenceId_idx" ON "ReferenceRelationshipRecord"("targetEntityType","targetReferenceId");

-- Preserve legacy metadata governance before it loses authority. These rows are now explicit and queryable.
INSERT INTO "ReferenceAliasRecord" ("id","entityType","referenceId","alias","normalizedAlias","locale","aliasType","isActive","createdAt","updatedAt")
SELECT md5(random()::text || clock_timestamp()::text || r."id" || a.value), v.entity_type, r."id", a.value,
       btrim(regexp_replace(regexp_replace(lower(a.value), '[^a-z0-9ء-ي]+', ' ', 'g'), '\s+', ' ', 'g')),
       NULL, 'HISTORIC', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES ('COUNTRY','ReferenceCountry'),('CURRENCY','ReferenceCurrency'),('LANGUAGE','ReferenceLanguage'),('CITY','ReferenceCity')) v(entity_type, table_name)
CROSS JOIN LATERAL (
  SELECT "id", "metadata" FROM "ReferenceCountry" WHERE v.table_name='ReferenceCountry'
  UNION ALL SELECT "id", "metadata" FROM "ReferenceCurrency" WHERE v.table_name='ReferenceCurrency'
  UNION ALL SELECT "id", "metadata" FROM "ReferenceLanguage" WHERE v.table_name='ReferenceLanguage'
  UNION ALL SELECT "id", "metadata" FROM "ReferenceCity" WHERE v.table_name='ReferenceCity'
) r
CROSS JOIN LATERAL jsonb_array_elements_text(CASE WHEN jsonb_typeof(r."metadata"->'aliases')='array' THEN r."metadata"->'aliases' ELSE '[]'::jsonb END) a(value)
WHERE btrim(a.value) <> '';

INSERT INTO "ReferenceProviderMappingRecord" ("id","entityType","referenceId","providerSystem","providerId","normalizedProviderSystem","normalizedProviderId","isActive","createdAt","updatedAt")
SELECT md5(random()::text || clock_timestamp()::text || r."id" || m.value::text), v.entity_type, r."id",
       m.value->>'providerSystem', m.value->>'providerId', lower(btrim(m.value->>'providerSystem')), lower(btrim(m.value->>'providerId')),
       true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES ('COUNTRY','ReferenceCountry'),('CURRENCY','ReferenceCurrency'),('LANGUAGE','ReferenceLanguage'),('CITY','ReferenceCity')) v(entity_type, table_name)
CROSS JOIN LATERAL (
  SELECT "id", "metadata" FROM "ReferenceCountry" WHERE v.table_name='ReferenceCountry'
  UNION ALL SELECT "id", "metadata" FROM "ReferenceCurrency" WHERE v.table_name='ReferenceCurrency'
  UNION ALL SELECT "id", "metadata" FROM "ReferenceLanguage" WHERE v.table_name='ReferenceLanguage'
  UNION ALL SELECT "id", "metadata" FROM "ReferenceCity" WHERE v.table_name='ReferenceCity'
) r
CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(r."metadata"->'providerMappings')='array' THEN r."metadata"->'providerMappings' ELSE '[]'::jsonb END) m(value)
WHERE btrim(COALESCE(m.value->>'providerSystem','')) <> '' AND btrim(COALESCE(m.value->>'providerId','')) <> ''
ON CONFLICT ("entityType","normalizedProviderSystem","normalizedProviderId") DO NOTHING;

-- Initial immutable version for every existing governed reference.
INSERT INTO "ReferenceVersionRecord" ("id","entityType","referenceId","versionNumber","lifecycleState","effectiveFrom","effectiveTo","snapshot","changeReason","actorId","createdAt")
SELECT md5(random()::text || clock_timestamp()::text || x.id || x.entity_type), x.entity_type, x.id, 1, x.lifecycle_state, x.effective_from,
       CASE WHEN x.lifecycle_state='ACTIVE' THEN NULL ELSE CURRENT_TIMESTAMP END, x.snapshot, 'MNT-AUD-0013_BASELINE', NULL, CURRENT_TIMESTAMP
FROM (
  SELECT 'COUNTRY' entity_type, "id" id, "lifecycleState" lifecycle_state, "effectiveFrom" effective_from, to_jsonb(c) snapshot FROM "ReferenceCountry" c
  UNION ALL SELECT 'CURRENCY', "id", "lifecycleState", "effectiveFrom", to_jsonb(c) FROM "ReferenceCurrency" c
  UNION ALL SELECT 'LANGUAGE', "id", "lifecycleState", "effectiveFrom", to_jsonb(l) FROM "ReferenceLanguage" l
  UNION ALL SELECT 'CITY', "id", "lifecycleState", "effectiveFrom", to_jsonb(c) FROM "ReferenceCity" c
) x;
