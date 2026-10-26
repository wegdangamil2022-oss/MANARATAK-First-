import { defineConfig } from 'vitest/config';
import baseline from '../../.section16-vitest.config';
import dashboard from './executive-dashboard.vitest.config';
import scholarships from './scholarship-admin.vitest.config';
import universities from './university-admin.vitest.config';
import majors from './major-admin.vitest.config';
import tests from './international-tests-admin.vitest.config';
import courses from './courses-admin.vitest.config';
import destinations from './destinations-reference-admin.vitest.config';

/** Combined owner/permission/UI regression gate for the cumulative admin release.
 * Database scenarios run separately on the attested DB-T environment. */
export default defineConfig({
  ...baseline,
  test: {
    ...baseline.test,
    maxWorkers: 2,
    fileParallelism: true,
    testTimeout: 30000,
    include: [...new Set([
      ...[dashboard, scholarships, universities, majors, tests, courses, destinations]
        .flatMap(config => config.test?.include ?? []),
      'packages/application/tests/review-workspace/**/*.spec.ts',
      'apps/api/tests/presentation/api/router/ReviewWorkspaceRouter.spec.ts',
      'apps/admin/tests/review-queue/**/*.spec.tsx',
    ])],
    exclude: ['**/node_modules/**', '**/*.database.spec.ts', '**/*.integration.spec.ts'],
  },
});
