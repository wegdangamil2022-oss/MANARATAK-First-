import { defineConfig } from 'vitest/config';
import baseline from '../../.section16-vitest.config';
export default defineConfig({ ...baseline, test: { ...baseline.test, maxWorkers: 1, fileParallelism: false,
  testTimeout: 60000, hookTimeout: 120000, include: ['packages/infrastructure/tests/courses/CourseCatalogCompletion.database.spec.ts', 'packages/infrastructure/tests/courses/ManualExternalCourse.database.spec.ts', 'packages/infrastructure/tests/courses/CourseBulkPublication.database.spec.ts'],
} });
