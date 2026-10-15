import { defineConfig } from 'vitest/config';
import base from './.section16-vitest.config';
export default defineConfig({
  ...base,
  test: {
    ...base.test, maxWorkers: 1,
    include: [
      'apps/admin/tests/remediation/B06*.spec.tsx',
      'packages/application/tests/scholarships/ScholarshipCanonicalAuthoringUseCases.spec.ts',
      'packages/application/tests/scholarships/ScholarshipCatalogDetailUseCases.spec.ts',
      'packages/infrastructure/tests/scholarships/PrismaScholarshipRepository.spec.ts',
    ],
  },
});
