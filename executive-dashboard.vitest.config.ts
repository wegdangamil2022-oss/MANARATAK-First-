import { defineConfig } from 'vitest/config';
import baseline from './.section16-vitest.config';
export default defineConfig({
  ...baseline,
  test: {
    ...baseline.test,
    maxWorkers: 2,
    exclude: ['**/node_modules/**', '**/*.database.spec.ts'],
    include: [
      'packages/application/tests/dashboard/**/*.spec.ts',
      'packages/infrastructure/tests/dashboard/**/*.spec.ts',
      'apps/api/tests/presentation/api/router/ExecutiveDashboardRouter.spec.ts',
      'apps/admin/tests/dashboard/**/*.spec.tsx',
      'apps/web/tests/analytics/**/*.spec.ts',
      'apps/web/tests/analytics/**/*.spec.tsx',
      'packages/application/tests/services-platform/ServiceRequestUseCases.spec.ts',
      'packages/application/tests/services-platform/ServiceCatalogUseCases.spec.ts',
      'apps/api/tests/presentation/api/router/StudentWorkspaceRouter.spec.ts',
    ],
  },
});
