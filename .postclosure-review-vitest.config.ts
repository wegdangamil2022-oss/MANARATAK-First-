import {defineConfig} from 'vitest/config';
import base from './.section16-vitest.config';
export default defineConfig({...base, test: {...base.test, maxWorkers: 1, include: [
  'packages/application/tests/finance-platform/PostClosureReview.spec.ts',
  'packages/infrastructure/tests/finance-platform/PostClosureReview.spec.ts',
]}});
