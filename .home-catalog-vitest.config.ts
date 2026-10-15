import { defineConfig } from 'vitest/config';
import base from './.section16-vitest.config';
export default defineConfig({ ...base, test: { ...base.test, maxWorkers: 1, include: [
  'apps/web/tests/remediation/HomeCatalog*.spec.tsx',
  'apps/api/tests/presentation/media/PublishedCatalogImage.spec.ts',
  'apps/api/tests/presentation/api/router/CoursePublicRouter.spec.ts',
  'apps/api/tests/presentation/api/router/UniversityPublicRouter.spec.ts',
  'apps/web/tests/remediation/B08Snapshot.spec.tsx',
  'apps/web/tests/remediation/B08LiveEvents.spec.tsx',
  'apps/web/tests/remediation/B03PublicContainment.spec.tsx',
  'apps/web/src/features/public-template/usePublicLiveData.spec.ts',
] } });
