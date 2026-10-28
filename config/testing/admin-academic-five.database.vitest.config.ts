import { defineConfig } from 'vitest/config';
import baseline from '../../.section16-vitest.config';
export default defineConfig({
  ...baseline,
  test: {
    ...baseline.test,
    maxWorkers: 1,
    fileParallelism: false,
    testTimeout: 60000,
    hookTimeout: 120000,
    server: { deps: { external: [/post28-preflight\.mjs$/] } },
    include: [
      'packages/infrastructure/tests/universities/UniversityStageAdmin.database.spec.ts',
      'packages/infrastructure/tests/majors/MajorAdminCompletion.database.spec.ts',
      'packages/infrastructure/tests/international-tests/InternationalTestAdminCompletion.database.spec.ts',
      'packages/infrastructure/tests/courses/CourseNativeClosure.database.spec.ts',
      'packages/infrastructure/tests/courses/CourseContentBlocks.database.spec.ts',
      'packages/infrastructure/tests/courses/NativeCourseLearningReport.database.spec.ts',
      'packages/infrastructure/tests/courses/CourseCatalogCompletion.database.spec.ts',
      'packages/infrastructure/tests/courses/ManualExternalCourse.database.spec.ts',
      'packages/infrastructure/tests/courses/CourseBulkPublication.database.spec.ts',
      'packages/infrastructure/tests/study-destinations/StudyDestinationAdmin.database.spec.ts',
    ],
  },
});
