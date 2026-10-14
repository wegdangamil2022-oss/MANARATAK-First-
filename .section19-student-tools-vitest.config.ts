import { defineConfig } from 'vitest/config';
import baseline from './.section16-vitest.config';
export default defineConfig({
  ...baseline,
  test: {
    ...baseline.test,
    include: [
      'packages/domain/tests/student-tools/**/*.spec.ts',
      'packages/application/tests/student-tools/**/*.spec.ts',
      'packages/infrastructure/tests/student-tools/**/*.spec.ts',
      'apps/api/tests/presentation/api/router/StudentTools*.spec.ts',
      'apps/admin/tests/pages/StudentTools*.spec.tsx',
    ],
  },
});
