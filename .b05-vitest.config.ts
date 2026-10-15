import { defineConfig } from 'vitest/config';
import base from './.section16-vitest.config';
export default defineConfig({
  ...base,
  test: {
    ...base.test,
    maxWorkers: 1,
    include: [
      'tests/remediation/B05*.spec.ts',
      'packages/infrastructure/tests/asset-platform/AssetReferenceIntegrityReadiness.spec.ts',
      'packages/infrastructure/tests/scholarships/PrismaScholarshipCanonicalLookupGateway.spec.ts',
      'packages/infrastructure/tests/scholarships/PrismaScholarshipRepository.spec.ts',
      'packages/application/tests/scholarships/ScholarshipCanonicalResolutionService.spec.ts',
      'packages/application/tests/scholarships/PublicScholarshipUseCases.spec.ts',
    ],
  },
});
