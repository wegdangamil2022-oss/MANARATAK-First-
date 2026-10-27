import { defineConfig } from 'vitest/config';
import baseline from '../../.section16-vitest.config';
export default defineConfig({
  ...baseline,
  test: {
    ...baseline.test,
    include: [
      'tests/notifications/**/*.spec.ts',
      'apps/admin/tests/notifications/**/*.spec.tsx',
      'packages/application/tests/notification/**/*.spec.ts',
    ],
  },
});
