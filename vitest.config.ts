import { defineConfig } from 'vitest/config';
import {nodeTestFiles} from './scripts/testing/node-test-files.mjs';

export default defineConfig({
  esbuild: {jsx: 'automatic'},
  test: {
    globals: true,
    environment: 'node',
    passWithNoTests: false,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      // POST28: real PostgreSQL suites have explicit isolated profiles, not source skips.
      '**/*.database.spec.ts',
      '**/*.database.spec.mjs',
      'packages/infrastructure/tests/database/WholePlatformPersistence.integration.spec.ts',
      // These use node:test and must run under Node so assertion failures fail CI.
      '**/*.test.mjs',
      '**/*.test.cjs',
      ...nodeTestFiles,
      'work/**',
      'wp-ic-10-results/**',
      'wp12-11-evidence/**',
      '**/e2e/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*',
      // P12: database/runtime tests are classified out of the source unit gate.
      'apps/api/tests/presentation/api/router/MajorImportE2E.spec.ts',
      'apps/api/tests/presentation/api/router/CheckDbE2E.spec.ts',
      'apps/api/tests/presentation/api/router/CheckApiCountE2E.spec.ts',
      'apps/api/tests/presentation/api/router/CheckApiE2E.spec.ts',
      'apps/api/tests/presentation/api/router/CheckApiOutput.spec.ts',

      'packages/infrastructure/tests/auth/PrismaCredentialIntegration.spec.ts',
      'packages/infrastructure/tests/auth/RealDatabaseIntegration.spec.ts',
      'packages/infrastructure/tests/courses/PrismaCourseRepository.integration.spec.ts',
      'packages/infrastructure/tests/courses/PrismaExternalCourseProviderRepository.integration.spec.ts',
      'packages/infrastructure/tests/courses/PrismaCourseRelationships.integration.spec.ts',
      'packages/infrastructure/tests/courses/PrismaImportedCourseOperationsRepository.integration.spec.ts',
      'packages/infrastructure/tests/courses/ImportedCourseRuntimeDatabaseIntegration.spec.ts',
      'packages/infrastructure/tests/courses/ImportedCourseRealTransferDatabaseIntegration.spec.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
});
