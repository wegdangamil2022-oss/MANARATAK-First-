import { defineConfig } from 'vitest/config';
import baseline from './.section16-vitest.config';
export default defineConfig({
  ...baseline,
  test: {
    ...baseline.test,
    maxWorkers: 1,
    include: [
      'packages/application/tests/career-alumni/**/*.spec.ts',
      'packages/infrastructure/tests/career-alumni/**/*.spec.ts',
      'apps/api/tests/presentation/api/router/Career*.spec.ts',
      'apps/admin/tests/careers/**/*.spec.tsx',
    ],
  },
});
