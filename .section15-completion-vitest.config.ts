import { defineConfig } from 'vitest/config';
import baseline from './.section15-vitest.config';
export default defineConfig({
  ...baseline,
  test: {
    ...baseline.test,
    include: [
      ...baseline.test!.include!,
      'apps/api/tests/infrastructure/workers/PollingWorkerRuntime.spec.ts',
      'apps/api/tests/presentation/api/router/StudentWorkspaceRouter.spec.ts',
    ],
  },
});
