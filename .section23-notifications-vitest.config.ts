import { defineConfig } from 'vitest/config';
import baseline from './.section16-vitest.config';
export default defineConfig({
  ...baseline,
  test: {
    ...baseline.test,
    maxWorkers: 1,
    include: ['tests/notifications/**/*.spec.ts', 'apps/admin/tests/notifications/**/*.spec.tsx'],
  },
});
