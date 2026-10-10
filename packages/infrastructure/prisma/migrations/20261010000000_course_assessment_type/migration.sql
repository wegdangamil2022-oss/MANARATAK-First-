ALTER TABLE "CourseQuiz" ADD COLUMN "assessmentType" TEXT NOT NULL DEFAULT 'QUIZ';
ALTER TABLE "CourseQuiz" ADD CONSTRAINT "CourseQuiz_assessmentType_check" CHECK ("assessmentType" IN ('QUIZ', 'ASSIGNMENT'));
CREATE INDEX "CourseQuizAttempt_courseId_status_submittedAt_idx" ON "CourseQuizAttempt"("courseId", "status", "submittedAt");
