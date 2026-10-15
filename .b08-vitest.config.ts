import { defineConfig } from 'vitest/config';
import base from './.section16-vitest.config';
export default defineConfig({ ...base, test: { ...base.test, maxWorkers: 1, include: [
  'apps/web/tests/remediation/B08*.spec.tsx',
  'apps/web/tests/remediation/B03PublicContainment.spec.tsx',
  'apps/web/src/features/public-template/usePublicLiveData.spec.ts',
] } });
