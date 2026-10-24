import { defineConfig } from 'vitest/config';
import baseline from '../../.section16-vitest.config';
export default defineConfig({
  ...baseline,
  test: {
    ...baseline.test,
    maxWorkers: 1,
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 60000,
    include: ['packages/infrastructure/tests/scholarships/ScholarshipAdmin.database.spec.ts'],
  },
});
