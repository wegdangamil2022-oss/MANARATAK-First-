import { defineConfig } from 'vitest/config';
import baseline from '../../.section16-vitest.config';

const owners = [
  'services-platform',
  'finance-platform',
  'career-alumni',
  'ai-platform',
  'student-tools',
  'academic-taxonomy',
  'identity',
  'authorization',
  'audit',
  'asset-platform',
  'student-support',
  'reference-data',
  'settings',
  'auth',
];
const routers = [
  'Service',
  'Finance',
  'Career',
  'AI',
  'StudentTools',
  'Health',
  'Monitoring',
  'AcademicTaxonomy',
  'Identity',
  'Authorization',
  'Audit',
  'Asset',
  'StudentSupport',
  'ReferenceData',
  'Settings',
  'Mfa',
  'Auth',
];
export default defineConfig({
  ...baseline,
  test: {
    ...baseline.test,
    maxWorkers: 2,
    fileParallelism: true,
    testTimeout: 30000,
    include: [
      ...owners.flatMap((owner) =>
        ['domain', 'application', 'infrastructure'].map(
          (layer) => `packages/${layer}/tests/${owner}/**/*.spec.ts`,
        ),
      ),
      ...routers.map((owner) => `apps/api/tests/presentation/api/router/${owner}*.spec.ts`),
      'apps/admin/tests/{health,services,finance,careers,ai,academic-taxonomy,students,settings}/**/*.spec.ts*',
      'apps/admin/tests/pages/StudentTools*.spec.tsx',
      'apps/admin/tests/security/**/*.spec.ts*',
      'apps/admin/src/pages/*.spec.tsx',
      'apps/admin/src/pages/audit/*.spec.ts',
      'apps/admin/src/features/identity-authorization/**/*.spec.tsx',
      'apps/admin/src/features/reference-data/**/*.spec.ts*',
      'apps/admin/tests/destinations-reference/referenceWorkspace.spec.ts',
      'packages/shared/tests/authorization/**/*.spec.ts',
      'apps/admin/tests/remaining/**/*.spec.tsx',
    ],
    exclude: [
      '**/node_modules/**',
      '**/*.database.spec.ts',
      '**/*.integration.spec.ts',
      '**/*Isolated*.spec.ts',
    ],
  },
});
