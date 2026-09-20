import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const files = {
  schema: read('packages/infrastructure/prisma/schema.prisma'),
  courseRepo: read('packages/infrastructure/src/courses/PrismaCourseRepository.ts'),
  curriculum: read('packages/application/src/courses/use-cases/CourseCurriculumUseCases.ts'),
  curriculumRepo: read('packages/infrastructure/src/courses/PrismaCourseCurriculumRepository.ts'),
  progress: read('packages/application/src/courses/use-cases/CourseProgressUseCases.ts'),
  progressRepo: read('packages/infrastructure/src/courses/PrismaCourseProgressRepository.ts'),
  admin: read('packages/application/src/courses/use-cases/AdminCourseUseCases.ts'),
  native: read('packages/application/src/courses/use-cases/NativeCourseUseCases.ts'),
  publication: read('packages/application/src/courses/services/CoursePublicationService.ts'),
  publicUseCases: read('packages/application/src/courses/use-cases/PublicCourseUseCases.ts'),
  checker: read('packages/infrastructure/src/courses/SafeImportedCourseLinkChecker.ts'),
  provider: read('packages/domain/src/courses/provider-registry.ts'),
  progressContracts: read('packages/domain/src/courses/entities/CourseProgress.ts'),
  learningPath: read('packages/application/src/courses/use-cases/LearningPathUseCases.ts'),
  learningRepo: read('packages/infrastructure/src/courses/PrismaLearningPathRepository.ts'),
  learnerRouter: read('apps/api/src/presentation/api/router/CourseLearnerRouter.ts'),
  app: read('apps/api/src/app.ts'),
  di: read('apps/api/src/infrastructure/di/container.ts'),
  migration: read('packages/infrastructure/prisma/migrations/20260826013000_w9_course_lifecycle/migration.sql'),
};

const checks = [
  ['P13-VERS-010', files.schema.includes('model CourseVersion') && files.schema.includes('model CourseQuestionVersion') && files.courseRepo.includes('captureVersion') && files.curriculum.includes('PUBLISHED_OR_ARCHIVED_COURSE_CONTENT_MUTATION_FORBIDDEN') && files.curriculumRepo.includes('courseQuestionVersion.create')],
  ['P13-SCOPE-013', files.schema.includes('model LearningPath') && files.schema.includes('model LearningPathVersion') && files.learningPath.includes('LEARNING_PATH_COMPLETED_EVENT_TYPE') && files.learningRepo.includes('updateEnrollmentProgress')],
  ['P13-LINK-003', files.checker.includes('isDirectCoursePage') && files.checker.includes('NOT_DIRECT_COURSE_PAGE') && files.provider.includes('directCoursePathPatterns')],
  ['P13-URL-004', files.admin.includes('IMPORT_LINEAGE_FIELDS') && files.admin.includes('CHANGE_REQUIRES_CONTROLLED_IMPORT') && files.admin.includes("'directCourseUrl'")],
  ['P13-ELIG-005', (
    files.publication.includes('IMPORTED_COURSE_FREE_STUDY_AND_CERTIFICATE_REQUIRED')
    && files.publication.includes('CourseAccessType.FREE_STUDY_AND_CERTIFICATE')
    && files.publication.includes('course.isStudyFree !== true')
    && files.publication.includes('course.isFreeCertificate !== true')
  ) && files.courseRepo.includes('CourseAccessType.PAID') && files.courseRepo.includes('isStudyFree: true') && files.publicUseCases.includes('publicEligible')],
  ['P13-PUB-002', files.admin.includes('publicationService.assertPublicationReady') && files.admin.includes('publicationService.publish') && files.native.includes('publicationService.publish')],
  ['P13-CURR-006', files.curriculum.includes('ensureCurriculumMember') && files.curriculum.includes('assertQuizReferences') && files.curriculum.includes('assertQuestionReferences') && files.curriculum.includes('COURSE_CURRICULUM_SCOPE_MISMATCH')],
  ['P13-PROG-007', files.progress.includes('COURSE_LESSON_SCOPE_MISMATCH') && files.progress.includes('COURSE_QUIZ_ATTEMPT_SCOPE_MISMATCH') && files.progress.includes('attempt.courseId !== data.courseId')],
  ['P13-ASMT-008', !/interface SubmitQuizAttemptDto[\s\S]{0,250}\bscore\s*:/.test(files.progressContracts) && files.progressContracts.includes('GradeQuizAttemptDto') && files.progress.includes('COURSE_ASSESSMENT_MANUAL_GRADING_REQUIRED') && files.progress.includes('score >= quiz.passingScore') && files.progress.includes('COURSE_ASSESSMENT_NOT_PASSED')],
  ['P13-ENR-012', files.schema.includes('model CourseEnrollmentPolicy') && files.progress.includes('COURSE_ENROLLMENT_REQUIRES_PUBLISHED_COURSE') && files.progress.includes('COURSE_PREREQUISITE_NOT_COMPLETED') && files.progress.includes('COURSE_FINANCIAL_CLEARANCE_REQUIRED') && files.progressRepo.includes('FOR UPDATE') && files.progressRepo.includes('COURSE_ENROLLMENT_CAPACITY_FULL')],
  ['P13-EVT-009', files.progress.includes('COURSE_COMPLETED_EVENT_TYPE') && files.progress.includes('ITransactionalCourseProgressRepository') && files.progress.includes('atomicMutations.execute') && files.progress.includes('course-completed:') && files.progressRepo.includes('withTransaction(context')],
  ['P13-PUBEVT-011', files.publication.includes('COURSE_PUBLISHED_EVENT_TYPE') && files.publication.includes('course-published:') && files.publication.includes('atomicMutations.execute') && files.publication.includes('tx.updateStatus(course.id, CourseStatus.PUBLISHED)')],
  ['P13-API-001', files.learnerRouter.includes("router.post('/:courseId/enroll'") && files.learnerRouter.includes("router.put('/:courseId/lessons/:lessonId/progress'") && files.learnerRouter.includes("router.post('/:courseId/quizzes/:quizId/attempts'") && files.learnerRouter.includes("router.post('/:courseId/complete'") && files.app.includes("v1Router.use('/student/courses', lazyRouter('courseLearnerRouter'))") && files.di.includes('courseLearnerRouter:')],
];

let passed = 0;
for (const [id, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id}`);
  if (ok) passed += 1;
}
const migrationGated = files.migration.includes('Source-only migration') && files.migration.includes('controlled CourseCompletion.courseVersion reconciliation') && files.migration.includes('No historical CourseVersion');
console.log(`${migrationGated ? 'PASS' : 'FAIL'} W9-MIGRATION-SOURCE-ONLY`);
console.log(`W9_SOURCE_VERIFIER=${passed === checks.length && migrationGated ? 'PASS' : 'FAIL'} ${passed}/${checks.length}`);
console.log('W9_RUNTIME_DB_PROOF=PENDING_GOOGLE_STUDIO');
if (passed !== checks.length || !migrationGated) process.exit(1);
