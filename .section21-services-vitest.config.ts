import { defineConfig } from 'vitest/config';
import baseline from './.section16-vitest.config';
export default defineConfig({
  ...baseline,
  test: {
    ...baseline.test,
    maxWorkers: 1,
    include: [
      'packages/application/tests/services-platform/**/*.spec.ts',
      'packages/infrastructure/tests/services-platform/**/*.spec.ts',
      'apps/api/tests/presentation/api/router/Service*.spec.ts',
      'apps/admin/tests/services/**/*.spec.tsx',
    ],
  },
});
