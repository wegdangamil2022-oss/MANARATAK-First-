import {defineConfig} from 'vitest/config';
import base from './.section16-vitest.config';
export default defineConfig({...base, test: {...base.test, maxWorkers: 1, include: [
  'packages/infrastructure/tests/finance-platform/B13*.spec.ts',
  'apps/api/tests/presentation/api/router/B13*.spec.ts',
  'apps/admin/tests/finance/B13*.spec.tsx',
]}});
