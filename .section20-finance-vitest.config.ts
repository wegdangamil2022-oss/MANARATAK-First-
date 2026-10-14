import { defineConfig } from 'vitest/config';
import baseline from './.section16-vitest.config';
export default defineConfig({
  ...baseline,
  test: {
    ...baseline.test,
    maxWorkers: 1,
    include: [
      'packages/domain/tests/finance-platform/**/*.spec.ts',
      'packages/application/tests/finance-platform/**/*.spec.ts',
      'packages/infrastructure/tests/finance-platform/**/*.spec.ts',
      'apps/api/tests/presentation/api/router/Finance*.spec.ts',
      'apps/admin/tests/finance/**/*.spec.ts*',
    ],
  },
});
