import { defineConfig } from 'vitest/config';
import base from './.section16-vitest.config';
export default defineConfig({ ...base, test: { ...base.test, maxWorkers: 1, include: [
  'apps/api/tests/infrastructure/workers/*.spec.ts',
  'packages/application/tests/background-jobs/B09*.spec.ts',
  'packages/application/tests/event-foundation/TransactionalOutboxDispatcher.spec.ts',
] } });
