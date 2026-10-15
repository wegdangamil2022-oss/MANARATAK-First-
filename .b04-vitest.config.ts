import { defineConfig } from 'vitest/config';
import base from './.section16-vitest.config';
export default defineConfig({
  ...base,
  test: {
    ...base.test,
    maxWorkers: 1,
    include: [
      'tests/remediation/B04*.spec.ts',
      'packages/infrastructure/tests/asset-platform/AssetUsageSchemaInventory.spec.ts',
      'packages/application/tests/asset-platform/AssetPlatformUseCases.spec.ts',
      'packages/application/tests/asset-platform/AssetGovernance.spec.ts',
      'packages/application/tests/scholarships/ScholarshipCatalogDetailUseCases.spec.ts',
    ],
  },
});
