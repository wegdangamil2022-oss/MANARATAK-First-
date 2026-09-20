-- MANARATAK Translation Program — TR-WP06
-- SOURCE-ONLY migration draft.
-- Do not apply to preserved Cloud SQL during source programming.

-- Phase 7: lightweight localized display labels.
ALTER TABLE "ReferenceCountry" ADD COLUMN "nameAr" TEXT;
ALTER TABLE "ReferenceCurrency" ADD COLUMN "nameAr" TEXT;
ALTER TABLE "ReferenceLanguage" ADD COLUMN "nameAr" TEXT;
ALTER TABLE "ReferenceCity" ADD COLUMN "nameAr" TEXT;

-- Phase 9: preserve original source locale for imported/versioned test content.
ALTER TABLE "InternationalTestVersion" ADD COLUMN "sourceLocale" TEXT;

-- Phase 10: additive top-level localized projection and source provenance.
ALTER TABLE "Major"
  ADD COLUMN "localizedNameAr" TEXT,
  ADD COLUMN "localizedNameEn" TEXT;

ALTER TABLE "FellowshipDefinition"
  ADD COLUMN "localizedNameAr" TEXT,
  ADD COLUMN "localizedNameEn" TEXT;

ALTER TABLE "MajorSource" ADD COLUMN "sourceLocale" TEXT;

-- Phase 11: preserve source-locale provenance.
ALTER TABLE "UniversitySourceRecord" ADD COLUMN "sourceLocale" TEXT;

-- Phase 11: normalized top-level University localization.
CREATE TABLE "UniversityTranslation" (
  "id" TEXT NOT NULL,
  "universityId" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "displayName" TEXT,
  "description" TEXT,
  "reviewStatus" TEXT NOT NULL DEFAULT 'NEEDS_REVIEW',
  "sourceRecordId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UniversityTranslation_pkey" PRIMARY KEY ("id")
);

-- Phase 11: bounded localized text for canonical University-owned child records.
CREATE TABLE "UniversityLocalizedText" (
  "id" TEXT NOT NULL,
  "universityId" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "fieldKey" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "reviewStatus" TEXT NOT NULL DEFAULT 'NEEDS_REVIEW',
  "sourceRecordId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UniversityLocalizedText_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UniversityTranslation_universityId_locale_key"
  ON "UniversityTranslation"("universityId", "locale");
CREATE INDEX "UniversityTranslation_locale_idx"
  ON "UniversityTranslation"("locale");
CREATE INDEX "UniversityTranslation_reviewStatus_idx"
  ON "UniversityTranslation"("reviewStatus");
CREATE INDEX "UniversityTranslation_sourceRecordId_idx"
  ON "UniversityTranslation"("sourceRecordId");

CREATE UNIQUE INDEX "UniversityLocalizedText_identity_key"
  ON "UniversityLocalizedText"("universityId", "targetType", "targetId", "fieldKey", "locale");
CREATE INDEX "UniversityLocalizedText_target_idx"
  ON "UniversityLocalizedText"("universityId", "targetType", "targetId");
CREATE INDEX "UniversityLocalizedText_locale_idx"
  ON "UniversityLocalizedText"("locale");
CREATE INDEX "UniversityLocalizedText_reviewStatus_idx"
  ON "UniversityLocalizedText"("reviewStatus");
CREATE INDEX "UniversityLocalizedText_sourceRecordId_idx"
  ON "UniversityLocalizedText"("sourceRecordId");

ALTER TABLE "UniversityTranslation"
  ADD CONSTRAINT "UniversityTranslation_universityId_fkey"
  FOREIGN KEY ("universityId") REFERENCES "University"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UniversityTranslation"
  ADD CONSTRAINT "UniversityTranslation_sourceRecordId_fkey"
  FOREIGN KEY ("sourceRecordId") REFERENCES "UniversitySourceRecord"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "UniversityLocalizedText"
  ADD CONSTRAINT "UniversityLocalizedText_universityId_fkey"
  FOREIGN KEY ("universityId") REFERENCES "University"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UniversityLocalizedText"
  ADD CONSTRAINT "UniversityLocalizedText_sourceRecordId_fkey"
  FOREIGN KEY ("sourceRecordId") REFERENCES "UniversitySourceRecord"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
