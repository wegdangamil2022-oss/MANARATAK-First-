import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    passWithNoTests: true,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'work/**',
      'wp-ic-10-results/**',
      'wp12-11-evidence/**',
      '**/e2e/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*',
      // P12: database/runtime tests are classified out of the source unit gate.
      'apps/api/tests/presentation/api/router/MajorImportE2E.spec.ts',
      'apps/api/tests/presentation/api/router/CheckDbE2E.spec.ts',
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
