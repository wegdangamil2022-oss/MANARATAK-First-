-- Course-owned canonical relationship between learning courses and international tests.
-- This migration is source-only in this closure package and was NOT applied.
CREATE TABLE "CourseInternationalTestRelationship" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "internationalTestId" TEXT NOT NULL,
  "relationshipType" TEXT NOT NULL,
  "reviewState" TEXT NOT NULL DEFAULT 'PROPOSED',
  "sourceType" TEXT NOT NULL DEFAULT 'ADMIN_AUTHORED',
  "createdBy" TEXT,
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CourseInternationalTestRelationship_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CourseInternationalTestRelationship_courseId_internationalTestId_relationshipType_key"
  ON "CourseInternationalTestRelationship"("courseId", "internationalTestId", "relationshipType");
CREATE INDEX "CourseInternationalTestRelationship_courseId_reviewState_idx"
  ON "CourseInternationalTestRelationship"("courseId", "reviewState");
CREATE INDEX "CourseInternationalTestRelationship_internationalTestId_reviewState_idx"
  ON "CourseInternationalTestRelationship"("internationalTestId", "reviewState");

ALTER TABLE "CourseInternationalTestRelationship"
  ADD CONSTRAINT "CourseInternationalTestRelationship_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseInternationalTestRelationship"
  ADD CONSTRAINT "CourseInternationalTestRelationship_internationalTestId_fkey"
  FOREIGN KEY ("internationalTestId") REFERENCES "InternationalTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
