import { defineConfig } from 'vitest/config';
import baseline from './.section16-vitest.config';
export default defineConfig({
  ...baseline,
  test: {
    ...baseline.test,
    maxWorkers: 1,
    testTimeout: 30000,
    hookTimeout: 60000,
    include: ['packages/infrastructure/tests/dashboard/ExecutiveDashboard.database.spec.ts'],
  },
});
