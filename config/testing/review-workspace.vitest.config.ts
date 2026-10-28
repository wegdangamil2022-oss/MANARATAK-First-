import { defineConfig } from 'vitest/config';
import baseline from '../../.section16-vitest.config';
export default defineConfig({
  ...baseline,
  test: {
    ...baseline.test,
    exclude: ['**/node_modules/**', '**/*.database.spec.ts'],
    include: [
      'apps/admin/tests/review-queue/**/*.spec.tsx',
      'packages/application/tests/review-workspace/**/*.spec.ts',
      'apps/api/tests/presentation/api/router/ReviewWorkspaceRouter.spec.ts',
    ],
  },
});
