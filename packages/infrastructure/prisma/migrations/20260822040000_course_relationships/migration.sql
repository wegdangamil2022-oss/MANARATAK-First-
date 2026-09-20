-- WP-IC-06: Course taxonomy / major / language relationships.
-- Source migration only. Do not execute against Cloud SQL from the authoring workflow.
-- No seed, no backfill, no Course publication or imported-course data mutation.

ALTER TABLE "Course"
  ADD COLUMN "learningLanguageReferenceId" TEXT,
  ADD COLUMN "learningLanguageResolutionState" TEXT NOT NULL DEFAULT 'UNRESOLVED',
  ADD COLUMN "learningLanguageResolutionMethod" TEXT,
  ADD COLUMN "learningLanguageResolvedAt" TIMESTAMP(3),
  ADD COLUMN "learningLanguageReviewedBy" TEXT;

CREATE INDEX "Course_learningLanguageReferenceId_idx"
  ON "Course"("learningLanguageReferenceId");

CREATE INDEX "Course_learningLanguageResolutionState_idx"
  ON "Course"("learningLanguageResolutionState");

ALTER TABLE "Course"
  ADD CONSTRAINT "Course_learningLanguageReferenceId_fkey"
  FOREIGN KEY ("learningLanguageReferenceId")
  REFERENCES "ReferenceLanguage"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

CREATE TABLE "CourseTaxonomyResolution" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "sourceTerm" TEXT NOT NULL,
  "normalizedTerm" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'UNRESOLVED',
  "candidateTaxonomyNodeIds" JSONB NOT NULL,
  "chosenTaxonomyNodeId" TEXT,
  "matchMethod" TEXT,
  "confidence" DOUBLE PRECISION,
  "sourceImportRecordId" TEXT,
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CourseTaxonomyResolution_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CourseTaxonomyResolution_courseId_normalizedTerm_key"
  ON "CourseTaxonomyResolution"("courseId", "normalizedTerm");

CREATE INDEX "CourseTaxonomyResolution_courseId_idx"
  ON "CourseTaxonomyResolution"("courseId");

CREATE INDEX "CourseTaxonomyResolution_status_idx"
  ON "CourseTaxonomyResolution"("status");

CREATE INDEX "CourseTaxonomyResolution_chosenTaxonomyNodeId_idx"
  ON "CourseTaxonomyResolution"("chosenTaxonomyNodeId");

ALTER TABLE "CourseTaxonomyResolution"
  ADD CONSTRAINT "CourseTaxonomyResolution_courseId_fkey"
  FOREIGN KEY ("courseId")
  REFERENCES "Course"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "CourseTaxonomyResolution"
  ADD CONSTRAINT "CourseTaxonomyResolution_chosenTaxonomyNodeId_fkey"
  FOREIGN KEY ("chosenTaxonomyNodeId")
  REFERENCES "AcademicTaxonomyNode"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

CREATE TABLE "CourseAcademicTaxonomyLink" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "taxonomyNodeId" TEXT NOT NULL,
  "sourceResolutionId" TEXT,
  "relationshipType" TEXT NOT NULL DEFAULT 'RELATED',
  "reviewState" TEXT NOT NULL DEFAULT 'PROPOSED',
  "matchMethod" TEXT NOT NULL,
  "sourceTerm" TEXT NOT NULL,
  "confidence" DOUBLE PRECISION,
  "sourceImportRecordId" TEXT,
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CourseAcademicTaxonomyLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CourseAcademicTaxonomyLink_courseId_taxonomyNodeId_relationshipType_key"
  ON "CourseAcademicTaxonomyLink"("courseId", "taxonomyNodeId", "relationshipType");

CREATE INDEX "CourseAcademicTaxonomyLink_courseId_idx"
  ON "CourseAcademicTaxonomyLink"("courseId");

CREATE INDEX "CourseAcademicTaxonomyLink_taxonomyNodeId_idx"
  ON "CourseAcademicTaxonomyLink"("taxonomyNodeId");

CREATE INDEX "CourseAcademicTaxonomyLink_reviewState_idx"
  ON "CourseAcademicTaxonomyLink"("reviewState");

CREATE INDEX "CourseAcademicTaxonomyLink_sourceResolutionId_idx"
  ON "CourseAcademicTaxonomyLink"("sourceResolutionId");

ALTER TABLE "CourseAcademicTaxonomyLink"
  ADD CONSTRAINT "CourseAcademicTaxonomyLink_courseId_fkey"
  FOREIGN KEY ("courseId")
  REFERENCES "Course"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "CourseAcademicTaxonomyLink"
  ADD CONSTRAINT "CourseAcademicTaxonomyLink_taxonomyNodeId_fkey"
  FOREIGN KEY ("taxonomyNodeId")
  REFERENCES "AcademicTaxonomyNode"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

ALTER TABLE "CourseAcademicTaxonomyLink"
  ADD CONSTRAINT "CourseAcademicTaxonomyLink_sourceResolutionId_fkey"
  FOREIGN KEY ("sourceResolutionId")
  REFERENCES "CourseTaxonomyResolution"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

CREATE TABLE "CourseMajorProjection" (
  "id" TEXT NOT NULL,
  "projectionKey" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "majorId" TEXT NOT NULL,
  "profileId" TEXT,
  "taxonomyNodeId" TEXT,
  "sourceCourseTaxonomyLinkId" TEXT,
  "sourceMajorClassificationMappingId" TEXT,
  "sourceType" TEXT NOT NULL,
  "relationshipType" TEXT NOT NULL,
  "projectionState" TEXT NOT NULL DEFAULT 'PROPOSED',
  "confidence" DOUBLE PRECISION,
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CourseMajorProjection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CourseMajorProjection_projectionKey_key"
  ON "CourseMajorProjection"("projectionKey");

CREATE INDEX "CourseMajorProjection_courseId_idx"
  ON "CourseMajorProjection"("courseId");

CREATE INDEX "CourseMajorProjection_majorId_idx"
  ON "CourseMajorProjection"("majorId");

CREATE INDEX "CourseMajorProjection_profileId_idx"
  ON "CourseMajorProjection"("profileId");

CREATE INDEX "CourseMajorProjection_taxonomyNodeId_idx"
  ON "CourseMajorProjection"("taxonomyNodeId");

CREATE INDEX "CourseMajorProjection_projectionState_idx"
  ON "CourseMajorProjection"("projectionState");

CREATE INDEX "CourseMajorProjection_sourceCourseTaxonomyLinkId_idx"
  ON "CourseMajorProjection"("sourceCourseTaxonomyLinkId");

CREATE INDEX "CourseMajorProjection_sourceMajorClassificationMappingId_idx"
  ON "CourseMajorProjection"("sourceMajorClassificationMappingId");

ALTER TABLE "CourseMajorProjection"
  ADD CONSTRAINT "CourseMajorProjection_courseId_fkey"
  FOREIGN KEY ("courseId")
  REFERENCES "Course"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "CourseMajorProjection"
  ADD CONSTRAINT "CourseMajorProjection_majorId_fkey"
  FOREIGN KEY ("majorId")
  REFERENCES "Major"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "CourseMajorProjection"
  ADD CONSTRAINT "CourseMajorProjection_profileId_fkey"
  FOREIGN KEY ("profileId")
  REFERENCES "MajorLevelProfile"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE "CourseMajorProjection"
  ADD CONSTRAINT "CourseMajorProjection_taxonomyNodeId_fkey"
  FOREIGN KEY ("taxonomyNodeId")
  REFERENCES "AcademicTaxonomyNode"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE "CourseMajorProjection"
  ADD CONSTRAINT "CourseMajorProjection_sourceCourseTaxonomyLinkId_fkey"
  FOREIGN KEY ("sourceCourseTaxonomyLinkId")
  REFERENCES "CourseAcademicTaxonomyLink"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE "CourseMajorProjection"
  ADD CONSTRAINT "CourseMajorProjection_sourceMajorClassificationMappingId_fkey"
  FOREIGN KEY ("sourceMajorClassificationMappingId")
  REFERENCES "MajorClassificationMapping"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
