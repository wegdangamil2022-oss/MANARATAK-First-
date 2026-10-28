import { defineConfig } from 'vitest/config';
import baseline from '../../.section16-vitest.config';
export default defineConfig({
  ...baseline,
  test: {
    ...baseline.test,
    // Execute the CLI module natively: Vite's SSR transform can move its hashbang.
    server: { deps: { external: [/post28-preflight\.mjs$/] } },
    maxWorkers: 1,
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 60000,
    include: ['packages/infrastructure/tests/review-workspace/ReviewWorkspace.database.spec.ts'],
  },
});
