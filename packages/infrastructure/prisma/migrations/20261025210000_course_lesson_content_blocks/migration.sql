CREATE UNIQUE INDEX "CourseLesson_courseId_id_key" ON "CourseLesson"("courseId", "id");
CREATE TABLE "CourseLessonContentBlock" (
  "id" TEXT NOT NULL, "courseId" TEXT NOT NULL, "lessonId" TEXT NOT NULL,
  "type" TEXT NOT NULL, "payload" JSONB NOT NULL, "assetReferenceId" TEXT, "quizId" TEXT,
  "position" INTEGER NOT NULL, "version" INTEGER NOT NULL DEFAULT 1,
  "status" TEXT NOT NULL DEFAULT 'READY_TO_REVIEW',
  CONSTRAINT "CourseLessonContentBlock_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CourseLessonContentBlock_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CourseLessonContentBlock_courseId_lessonId_fkey" FOREIGN KEY ("courseId", "lessonId") REFERENCES "CourseLesson"("courseId", "id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CourseLessonContentBlock_assetReferenceId_fkey" FOREIGN KEY ("assetReferenceId") REFERENCES "CourseLessonAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "CourseLessonContentBlock_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "CourseQuiz"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "CourseLessonContentBlock_type_check" CHECK ("type" IN ('TEXT','HEADING','CODE','TABLE','LINK','VIDEO','AUDIO','IMAGE','FILE','QUIZ')),
  CONSTRAINT "CourseLessonContentBlock_version_check" CHECK ("version" > 0)
);
CREATE UNIQUE INDEX "CourseLessonContentBlock_lessonId_position_key" ON "CourseLessonContentBlock"("lessonId", "position");
CREATE INDEX "CourseLessonContentBlock_courseId_status_idx" ON "CourseLessonContentBlock"("courseId", "status");
