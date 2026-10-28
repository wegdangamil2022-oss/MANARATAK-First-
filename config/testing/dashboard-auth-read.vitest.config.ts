import { defineConfig } from 'vitest/config';
import baseline from '../../.section16-vitest.config';
export default defineConfig({
  ...baseline,
  test: {
    ...baseline.test,
    exclude: ['**/node_modules/**', '**/*.database.spec.ts'],
    include: [
      'packages/application/tests/auth/MfaUseCases.spec.ts',
      'packages/infrastructure/tests/auth/PrismaMfaGateway.spec.ts',
      'apps/api/tests/presentation/security/AdminMfaBoundary.spec.ts',
      'apps/api/tests/presentation/security/SecurityMiddlewareFactory.spec.ts',
    ],
  },
});
