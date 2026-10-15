import { defineConfig } from 'vitest/config';
import base from './.section16-vitest.config';
export default defineConfig({
  ...base,
  test: {
    ...base.test,
    include: [
      'apps/web/tests/integration/PublicRelationshipPager.spec.tsx',
      'apps/admin/tests/integration/StudentDocumentReview.spec.tsx',
      'apps/admin/tests/integration/AcademicProgramExplorer.spec.tsx',
      'apps/web/tests/integration/PrivateToolResult.spec.tsx',
      'apps/web/tests/integration/TestOwnerDiscovery.spec.tsx',
      'packages/application/tests/certificates/CertificateReadModelService.spec.ts',
    ],
  },
});
