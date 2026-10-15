import { defineConfig } from 'vitest/config';
import base from './.section16-vitest.config';
export default defineConfig({
  ...base, test: { ...base.test, maxWorkers: 1, include: [
    'apps/admin/tests/remediation/B07*.spec.tsx',
    'apps/admin/tests/remediation/B06CanonicalAuthoring.spec.tsx',
    'apps/api/tests/presentation/api/router/AssetReuseRouter.spec.ts',
    'apps/admin/tests/review-queue/ReviewQueueSession.spec.tsx',
    'apps/admin/tests/careers/CareerInteractions.spec.tsx',
    'packages/shared/tests/authorization/adminAccess.spec.ts',
  ] },
});
