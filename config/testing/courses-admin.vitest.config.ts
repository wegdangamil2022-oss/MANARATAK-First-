import { defineConfig } from 'vitest/config';
import baseline from '../../.section16-vitest.config';
export default defineConfig({
  ...baseline,
  test: { ...baseline.test, maxWorkers: 1, fileParallelism: false,
    include: ['packages/domain/tests/courses/**/*.spec.ts', 'packages/application/tests/courses/**/*.spec.ts',
      'packages/infrastructure/tests/courses/**/*.spec.ts', 'apps/api/tests/presentation/api/router/Course*.spec.ts',
      'apps/api/tests/presentation/api/router/ImportedCourse*.spec.ts', 'apps/admin/tests/courses/**/*.spec.ts*', 'apps/web/tests/courses/**/*.spec.ts'],
    exclude: ['**/*.database.spec.ts', '**/*.integration.spec.ts'], testTimeout: 30000,
  },
});
