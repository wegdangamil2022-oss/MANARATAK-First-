import { defineConfig } from 'vitest/config';
import baseline from '../../.section16-vitest.config';
export default defineConfig({
  ...baseline,
  test: {
    ...baseline.test,
    maxWorkers: 1,
    include: [
      'apps/admin/tests/scholarships/**/*.spec.ts',
      'apps/admin/tests/scholarships/**/*.spec.tsx',
      'packages/infrastructure/tests/scholarships/PrismaScholarshipRepository.spec.ts',
      'packages/application/tests/scholarships/ScholarshipCatalogDetailUseCases.spec.ts',
    ],
  },
});
