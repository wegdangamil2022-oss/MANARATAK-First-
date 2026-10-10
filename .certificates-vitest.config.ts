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
    include: [
      'packages/application/tests/certificates/**/*.spec.ts',
      'packages/infrastructure/tests/certificates/**/*.spec.ts',
      'apps/api/tests/presentation/api/router/*Certificate*.spec.ts',
      'apps/api/tests/presentation/api/router/Section13Governance.spec.ts',
      'apps/api/tests/presentation/api/router/CertificatePlanApi.spec.ts',
      'packages/application/tests/courses/Section12LearningVersions.spec.ts',
      'packages/application/tests/majors/AdminMajorUseCases.spec.ts',
      'packages/application/tests/majors/MajorGovernanceCloseout.spec.ts',
      'packages/shared/tests/authorization/adminPermissionCatalog.spec.ts',
    ],
    testTimeout: 5000,
    maxWorkers: 2,
  },
});
