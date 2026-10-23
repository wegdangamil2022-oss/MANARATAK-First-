import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
import baseline from './.section16-vitest.config';
export default defineConfig({
  ...baseline,
  resolve: {
    ...baseline.resolve,
    alias: {
      ...baseline.resolve?.alias,
      ...(process.env.EXECUTIVE_PRISMA_CLIENT_MODULE
        ? { '@prisma/client': resolve(process.env.EXECUTIVE_PRISMA_CLIENT_MODULE, 'index.js') }
        : {}),
    },
  },
  test: {
    ...baseline.test,
    maxWorkers: 1,
    testTimeout: 30000,
    hookTimeout: 60000,
    include: ['packages/infrastructure/tests/dashboard/ExecutiveDashboard.database.spec.ts'],
  },
});
