import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  resolve: {
    alias: Object.fromEntries(
      ['core', 'domain', 'shared', 'application', 'infrastructure'].map((name) => [
        '@manaratak/' + name,
        resolve('packages/' + name + '/src/index.ts'),
      ]),
    ),
  },
  test: {
    environment: 'node',
    globals: true,
    maxWorkers: 2,
    include: [
      'packages/domain/tests/cms/**/*.spec.ts',
      'packages/application/tests/cms/**/*.spec.ts',
      'packages/infrastructure/tests/cms/**/*.spec.ts',
      'apps/api/tests/presentation/api/router/Cms*.spec.ts',
      'apps/admin/tests/cms/**/*.spec.tsx',
      'apps/web/tests/cms/**/*.spec.ts',
      'tests/translation/cms-seo-prerender.spec.ts',
      'packages/shared/tests/authorization/adminAccess.spec.ts',
      'packages/shared/tests/authorization/adminPermissionCatalog.spec.ts',
    ],
  },
});
