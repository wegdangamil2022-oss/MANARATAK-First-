import { defineConfig } from 'vitest/config';
import baseline from './.section16-vitest.config';
export default defineConfig({
  ...baseline,
  test: {
    ...baseline.test,
    include: [
      'packages/application/tests/localization/**/*.spec.ts',
      'packages/application/tests/translation-import/**/*.spec.ts',
      'packages/infrastructure/tests/translation-import/**/*.spec.ts',
      'apps/api/tests/presentation/api/router/TranslationWorkspaceRouter.spec.ts',
      'apps/admin/tests/translations/**/*.spec.tsx',
      'tests/translation/**/*.spec.ts',
      'tests/translation/root-locale-rendering.spec.tsx',
      'apps/web/src/features/public-template/publicComponentCopy.spec.tsx',
      'apps/web/src/features/public-template/publicDesignImport.spec.ts',
      'packages/application/tests/cms/CmsPublishedPage.spec.ts',
      'packages/application/tests/cms/CmsSeoSitemap.spec.ts',
      'apps/api/tests/presentation/api/router/CmsPublicRouter.spec.ts',
      'apps/web/tests/cms/CmsLivePage.spec.ts',
    ],
  },
});
