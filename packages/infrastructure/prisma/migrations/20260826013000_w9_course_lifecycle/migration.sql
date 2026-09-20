-- W9 — Learning Platform / Course lifecycle integrity
-- Source-only migration. DO NOT APPLY outside the approved Google Studio database gate.
-- Existing production-like rows require RT-P13-VERS-001 reconciliation before deployment.

ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "CourseQuestion" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "ExternalCourseProvider" ADD COLUMN IF NOT EXISTS "directCoursePathPatterns" JSONB;
ALTER TABLE "CourseCompletion" ADD COLUMN IF NOT EXISTS "courseVersion" INTEGER;

-- Completion history cannot be truthfully version-stamped without inspecting the
-- referenced Course history. Fail closed rather than silently writing version 1.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "CourseCompletion" WHERE "courseVersion" IS NULL) THEN
    RAISE EXCEPTION 'W9 requires controlled CourseCompletion.courseVersion reconciliation before NOT NULL promotion';
  END IF;
END $$;
ALTER TABLE "CourseCompletion" ALTER COLUMN "courseVersion" SET NOT NULL;

CREATE TABLE "CourseVersion" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CourseVersion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CourseVersion_courseId_versionNumber_key" ON "CourseVersion"("courseId", "versionNumber");
CREATE INDEX "CourseVersion_courseId_createdAt_idx" ON "CourseVersion"("courseId", "createdAt");
ALTER TABLE "CourseVersion" ADD CONSTRAINT "CourseVersion_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CourseQuestionVersion" (
  "id" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CourseQuestionVersion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CourseQuestionVersion_questionId_versionNumber_key" ON "CourseQuestionVersion"("questionId", "versionNumber");
CREATE INDEX "CourseQuestionVersion_questionId_createdAt_idx" ON "CourseQuestionVersion"("questionId", "createdAt");
ALTER TABLE "CourseQuestionVersion" ADD CONSTRAINT "CourseQuestionVersion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "CourseQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "CourseEnrollmentPolicy" (
  "courseId" TEXT NOT NULL,
  "isCapacityLimited" BOOLEAN NOT NULL DEFAULT false,
  "maximumSeats" INTEGER,
  "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
  "waitlistEnabled" BOOLEAN NOT NULL DEFAULT false,
  "prerequisiteCourseIds" JSONB NOT NULL,
  "eligibilityRules" JSONB,
  "requiresFinancialClearance" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CourseEnrollmentPolicy_pkey" PRIMARY KEY ("courseId")
);
ALTER TABLE "CourseEnrollmentPolicy" ADD CONSTRAINT "CourseEnrollmentPolicy_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "LearningPath" (
  "id" TEXT NOT NULL,
  "publicId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "version" INTEGER NOT NULL DEFAULT 1,
  "isStrictlyOrdered" BOOLEAN NOT NULL DEFAULT false,
  "completionLogic" TEXT NOT NULL DEFAULT 'ALL_REQUIRED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LearningPath_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LearningPath_publicId_key" ON "LearningPath"("publicId");
CREATE UNIQUE INDEX "LearningPath_slug_key" ON "LearningPath"("slug");
CREATE INDEX "LearningPath_status_idx" ON "LearningPath"("status");

CREATE TABLE "LearningPathVersion" (
  "id" TEXT NOT NULL,
  "learningPathId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "status" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LearningPathVersion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LearningPathVersion_learningPathId_versionNumber_key" ON "LearningPathVersion"("learningPathId", "versionNumber");
CREATE INDEX "LearningPathVersion_learningPathId_status_idx" ON "LearningPathVersion"("learningPathId", "status");
ALTER TABLE "LearningPathVersion" ADD CONSTRAINT "LearningPathVersion_learningPathId_fkey" FOREIGN KEY ("learningPathId") REFERENCES "LearningPath"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "LearningPathCourse" (
  "id" TEXT NOT NULL,
  "learningPathVersionId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT true,
  "prerequisiteCourseIds" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LearningPathCourse_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LearningPathCourse_learningPathVersionId_position_key" ON "LearningPathCourse"("learningPathVersionId", "position");
CREATE UNIQUE INDEX "LearningPathCourse_learningPathVersionId_courseId_key" ON "LearningPathCourse"("learningPathVersionId", "courseId");
CREATE INDEX "LearningPathCourse_courseId_idx" ON "LearningPathCourse"("courseId");
ALTER TABLE "LearningPathCourse" ADD CONSTRAINT "LearningPathCourse_learningPathVersionId_fkey" FOREIGN KEY ("learningPathVersionId") REFERENCES "LearningPathVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningPathCourse" ADD CONSTRAINT "LearningPathCourse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "LearningPathEnrollment" (
  "id" TEXT NOT NULL,
  "learningPathId" TEXT NOT NULL,
  "learningPathVersion" INTEGER NOT NULL,
  "studentReferenceId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "progressPercentage" INTEGER NOT NULL DEFAULT 0,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LearningPathEnrollment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LearningPathEnrollment_learningPathId_studentReferenceId_key" ON "LearningPathEnrollment"("learningPathId", "studentReferenceId");
CREATE INDEX "LearningPathEnrollment_studentReferenceId_status_idx" ON "LearningPathEnrollment"("studentReferenceId", "status");
ALTER TABLE "LearningPathEnrollment" ADD CONSTRAINT "LearningPathEnrollment_learningPathId_fkey" FOREIGN KEY ("learningPathId") REFERENCES "LearningPath"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- No historical CourseVersion / CourseQuestionVersion rows are fabricated here.
-- RT-P13-VERS-001 in Google Studio must inspect current rows, reconcile history,
-- and only then approve production migration/backfill.
