-- Phase 13 native course curriculum and learning progress persistence.
-- Source-only migration: apply during the controlled runtime database rollout.

CREATE TABLE "CourseModule" (
  "id" TEXT NOT NULL, "courseId" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT,
  "position" INTEGER NOT NULL, "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CourseModule_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CourseModule_courseId_position_key" ON "CourseModule"("courseId", "position");
CREATE INDEX "CourseModule_courseId_status_idx" ON "CourseModule"("courseId", "status");

CREATE TABLE "CourseLesson" (
  "id" TEXT NOT NULL, "courseId" TEXT NOT NULL, "moduleId" TEXT NOT NULL, "title" TEXT NOT NULL,
  "summary" TEXT, "lessonType" TEXT NOT NULL, "position" INTEGER NOT NULL,
  "estimatedDurationMinutes" INTEGER, "contentText" TEXT, "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CourseLesson_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CourseLesson_moduleId_position_key" ON "CourseLesson"("moduleId", "position");
CREATE INDEX "CourseLesson_courseId_status_idx" ON "CourseLesson"("courseId", "status");
CREATE INDEX "CourseLesson_moduleId_idx" ON "CourseLesson"("moduleId");

CREATE TABLE "CourseLessonAsset" (
  "id" TEXT NOT NULL, "courseId" TEXT NOT NULL, "lessonId" TEXT NOT NULL, "assetId" TEXT NOT NULL,
  "assetReference" TEXT, "title" TEXT, "assetType" TEXT NOT NULL, "position" INTEGER NOT NULL,
  "isRequired" BOOLEAN NOT NULL DEFAULT false, "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CourseLessonAsset_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CourseLessonAsset_lessonId_position_key" ON "CourseLessonAsset"("lessonId", "position");
CREATE UNIQUE INDEX "CourseLessonAsset_lessonId_assetId_key" ON "CourseLessonAsset"("lessonId", "assetId");
CREATE INDEX "CourseLessonAsset_courseId_idx" ON "CourseLessonAsset"("courseId");
CREATE INDEX "CourseLessonAsset_assetId_idx" ON "CourseLessonAsset"("assetId");

CREATE TABLE "CourseQuiz" (
  "id" TEXT NOT NULL, "courseId" TEXT NOT NULL, "moduleId" TEXT, "lessonId" TEXT,
  "title" TEXT NOT NULL, "instructions" TEXT, "position" INTEGER NOT NULL, "passingScore" INTEGER,
  "maxAttempts" INTEGER, "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CourseQuiz_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CourseQuiz_courseId_position_key" ON "CourseQuiz"("courseId", "position");
CREATE INDEX "CourseQuiz_moduleId_idx" ON "CourseQuiz"("moduleId");
CREATE INDEX "CourseQuiz_lessonId_idx" ON "CourseQuiz"("lessonId");
CREATE INDEX "CourseQuiz_courseId_status_idx" ON "CourseQuiz"("courseId", "status");

CREATE TABLE "CourseQuestionBank" (
  "id" TEXT NOT NULL, "courseId" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "CourseQuestionBank_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CourseQuestionBank_courseId_status_idx" ON "CourseQuestionBank"("courseId", "status");

CREATE TABLE "CourseQuestion" (
  "id" TEXT NOT NULL, "courseId" TEXT NOT NULL, "quizId" TEXT, "questionBankId" TEXT,
  "questionType" TEXT NOT NULL, "prompt" TEXT NOT NULL, "choices" JSONB, "correctAnswer" JSONB,
  "explanation" TEXT, "points" INTEGER NOT NULL DEFAULT 1, "position" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "CourseQuestion_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CourseQuestion_courseId_status_idx" ON "CourseQuestion"("courseId", "status");
CREATE INDEX "CourseQuestion_quizId_position_idx" ON "CourseQuestion"("quizId", "position");
CREATE INDEX "CourseQuestion_questionBankId_idx" ON "CourseQuestion"("questionBankId");

CREATE TABLE "CourseEnrollment" (
  "id" TEXT NOT NULL, "courseId" TEXT NOT NULL, "studentReferenceId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE', "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3), "progressPercentage" INTEGER NOT NULL DEFAULT 0,
  "lastAccessedAt" TIMESTAMP(3), "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CourseEnrollment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CourseEnrollment_courseId_studentReferenceId_key" ON "CourseEnrollment"("courseId", "studentReferenceId");
CREATE INDEX "CourseEnrollment_studentReferenceId_status_idx" ON "CourseEnrollment"("studentReferenceId", "status");

CREATE TABLE "CourseLessonProgress" (
  "id" TEXT NOT NULL, "courseId" TEXT NOT NULL, "lessonId" TEXT NOT NULL, "studentReferenceId" TEXT NOT NULL,
  "status" TEXT NOT NULL, "progressPercentage" INTEGER NOT NULL DEFAULT 0, "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3), "timeSpentSeconds" INTEGER, "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CourseLessonProgress_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CourseLessonProgress_courseId_lessonId_studentReferenceId_key" ON "CourseLessonProgress"("courseId", "lessonId", "studentReferenceId");
CREATE INDEX "CourseLessonProgress_studentReferenceId_status_idx" ON "CourseLessonProgress"("studentReferenceId", "status");

CREATE TABLE "CourseQuizAttempt" (
  "id" TEXT NOT NULL, "courseId" TEXT NOT NULL, "quizId" TEXT NOT NULL, "studentReferenceId" TEXT NOT NULL,
  "attemptNumber" INTEGER NOT NULL, "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS', "score" DOUBLE PRECISION,
  "passed" BOOLEAN, "answers" JSONB, "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "submittedAt" TIMESTAMP(3), "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CourseQuizAttempt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CourseQuizAttempt_quizId_studentReferenceId_attemptNumber_key" ON "CourseQuizAttempt"("quizId", "studentReferenceId", "attemptNumber");
CREATE INDEX "CourseQuizAttempt_courseId_studentReferenceId_idx" ON "CourseQuizAttempt"("courseId", "studentReferenceId");

CREATE TABLE "CourseCompletion" (
  "id" TEXT NOT NULL, "courseId" TEXT NOT NULL, "studentReferenceId" TEXT NOT NULL,
  "status" TEXT NOT NULL, "completionSource" TEXT NOT NULL, "eligibleForCertificate" BOOLEAN NOT NULL DEFAULT false,
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CourseCompletion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CourseCompletion_courseId_studentReferenceId_key" ON "CourseCompletion"("courseId", "studentReferenceId");
CREATE INDEX "CourseCompletion_studentReferenceId_status_idx" ON "CourseCompletion"("studentReferenceId", "status");

ALTER TABLE "CourseModule" ADD CONSTRAINT "CourseModule_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseLesson" ADD CONSTRAINT "CourseLesson_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseLesson" ADD CONSTRAINT "CourseLesson_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "CourseModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseLessonAsset" ADD CONSTRAINT "CourseLessonAsset_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseLessonAsset" ADD CONSTRAINT "CourseLessonAsset_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "CourseLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseQuiz" ADD CONSTRAINT "CourseQuiz_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseQuiz" ADD CONSTRAINT "CourseQuiz_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "CourseModule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CourseQuiz" ADD CONSTRAINT "CourseQuiz_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "CourseLesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CourseQuestionBank" ADD CONSTRAINT "CourseQuestionBank_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseQuestion" ADD CONSTRAINT "CourseQuestion_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseQuestion" ADD CONSTRAINT "CourseQuestion_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "CourseQuiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseQuestion" ADD CONSTRAINT "CourseQuestion_questionBankId_fkey" FOREIGN KEY ("questionBankId") REFERENCES "CourseQuestionBank"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CourseEnrollment" ADD CONSTRAINT "CourseEnrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CourseLessonProgress" ADD CONSTRAINT "CourseLessonProgress_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CourseLessonProgress" ADD CONSTRAINT "CourseLessonProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "CourseLesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CourseQuizAttempt" ADD CONSTRAINT "CourseQuizAttempt_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CourseQuizAttempt" ADD CONSTRAINT "CourseQuizAttempt_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "CourseQuiz"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CourseCompletion" ADD CONSTRAINT "CourseCompletion_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
