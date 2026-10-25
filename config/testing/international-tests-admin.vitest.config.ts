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
      'packages/domain/tests/tests-platform/**/*.spec.ts',
      'packages/application/tests/tests-platform/**/*.spec.ts',
      'packages/infrastructure/tests/international-tests/**/*.spec.ts',
      'apps/api/tests/presentation/api/router/InternationalTest*.spec.ts',
      'apps/admin/tests/international-tests/**/*.spec.ts*',
      'apps/admin/src/components/InternationalTestSourceSectionsViewer.spec.tsx',
    ],
    exclude: ['**/*.database.spec.ts'],
  },
});
