import { defineConfig } from 'vitest/config';
import baseline from './.section16-vitest.config';
export default defineConfig({
  ...baseline,
  test: {
    ...baseline.test,
    include: [
      'packages/application/tests/ai-platform/**/*.spec.ts',
      'packages/infrastructure/tests/ai-platform/**/*.spec.ts',
      'apps/api/tests/presentation/api/router/AIAdminRouter.spec.ts',
      'apps/api/tests/presentation/api/router/AIGatewayRouter.spec.ts',
      'apps/admin/src/pages/AIGovernancePage.spec.tsx',
      'apps/admin/tests/ai/**/*.spec.tsx',
    ],
  },
});
