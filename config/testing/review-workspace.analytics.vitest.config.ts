import { defineConfig } from 'vitest/config';
import baseline from './review-workspace.database.vitest.config';
export default defineConfig({
  ...baseline,
  test: {
    ...baseline.test,
    include: [
      'packages/infrastructure/tests/review-workspace/ReviewWorkspaceAnalytics.database.spec.ts',
    ],
  },
});
