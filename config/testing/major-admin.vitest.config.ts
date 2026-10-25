import { defineConfig } from 'vitest/config';
import baseline from '../../.section16-vitest.config';
export default defineConfig({
  ...baseline,
  test: {
    ...baseline.test,
    maxWorkers: 1,
    fileParallelism: false,
    testTimeout: 30000,
    include: [
      'packages/domain/tests/majors/**/*.spec.ts',
      'packages/application/tests/majors/**/*.spec.ts',
      'packages/infrastructure/tests/majors/**/*.spec.ts',
      'apps/api/tests/presentation/api/router/Major*.spec.ts',
      'apps/admin/tests/majors/**/*.spec.ts*',
    ],
    exclude: ['**/*.database.spec.ts'],
  },
});
