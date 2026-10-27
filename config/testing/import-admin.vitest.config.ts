import { defineConfig } from 'vitest/config';
import baseline from '../../.section16-vitest.config';
export default defineConfig({
  ...baseline,
  test: {
    ...baseline.test,
    include: [
      'apps/admin/tests/imports/**/*.spec.tsx',
      'apps/api/tests/presentation/api/router/ImportAdminRouter.spec.ts',
      'packages/application/tests/import-foundation/**/*.spec.ts',
      'packages/domain/tests/import-foundation/**/*.spec.ts',
      'packages/infrastructure/tests/import-foundation/**/*.spec.ts',
    ],
    exclude: ['**/*.database.spec.ts', '**/*.integration.spec.ts'],
  },
});
