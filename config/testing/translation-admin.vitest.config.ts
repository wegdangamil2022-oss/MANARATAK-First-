import { defineConfig } from 'vitest/config';
import baseline from '../../.section16-vitest.config';
export default defineConfig({
  ...baseline,
  test: {
    ...baseline.test,
    maxWorkers: 2,
    fileParallelism: true,
    testTimeout: 30000,
    include: [
      'apps/admin/tests/translations/**/*.spec.ts*',
      'apps/admin/tests/remediation/B11TranslationCapabilities.spec.tsx',
      'apps/api/tests/presentation/api/router/*Translation*.spec.ts',
      'apps/api/tests/presentation/api/router/B11TranslationCapabilities.spec.ts',
      'packages/infrastructure/tests/translation-import/**/*.spec.ts',
      'packages/application/tests/translation-import/**/*.spec.ts',
      'packages/shared/tests/localization/**/*.spec.ts',
      'tests/translation/**/*.spec.ts',
    ],
    exclude: ['**/*.database.spec.ts', '**/*.integration.spec.ts'],
  },
});
