import { defineConfig } from 'vitest/config';
import database from './executive-dashboard.database.vitest.config';
// Follow-up on the attested synthetic target; the primary suite requires empty tables.
export default defineConfig({
  ...database,
  test: {
    ...database.test,
    include: [
      'packages/infrastructure/tests/dashboard/ExecutiveDashboardRetention.database.spec.ts',
    ],
  },
});
