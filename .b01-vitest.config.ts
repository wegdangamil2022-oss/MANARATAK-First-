import { defineConfig } from 'vitest/config';
import base from './.section16-vitest.config';
export default defineConfig({
  ...base,
  test: {
    ...base.test,
    maxWorkers: 1,
    include: [
      'apps/api/tests/presentation/api/router/SearchRouter.spec.ts',
      'apps/api/tests/presentation/security/SearchBoundary.spec.ts',
      'packages/application/tests/search/ManageSearchUseCase.spec.ts',
      'packages/infrastructure/tests/search/PrismaSearchRequestRepository.spec.ts',
      'packages/shared/tests/authorization/adminPermissionCatalog.spec.ts',
    ],
  },
});
