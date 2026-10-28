import { defineConfig } from 'vitest/config';
import baseline from '../../.section16-vitest.config';
export default defineConfig({
  ...baseline,
  test: {
    ...baseline.test,
    maxWorkers: 2,
    fileParallelism: true,
    testTimeout: 30000,
    include: [
      'apps/admin/tests/cms/**/*.spec.ts*',
      'apps/web/tests/cms/**/*.spec.ts',
      'apps/api/tests/presentation/api/router/*Cms*.spec.ts',
      'packages/application/tests/cms/**/*.spec.ts',
      'packages/domain/tests/cms/**/*.spec.ts',
      'packages/infrastructure/tests/cms/**/*.spec.ts',
    ],
    exclude: ['**/*.database.spec.ts', '**/*.integration.spec.ts'],
  },
});
