import { defineConfig } from 'vitest/config';
import baseline from './.section15-vitest.config';
export default defineConfig({
  ...baseline,
  test: {
    ...baseline.test,
    maxWorkers: 2,
    include: [
      'packages/infrastructure/tests/students/StudentSupportSourceGaps.spec.ts',
      'apps/api/tests/infrastructure/workers/PollingWorkerRuntime.spec.ts',
      'apps/api/tests/presentation/api/router/StudentSupportAdminRouter.spec.ts',
      'apps/admin/tests/students/StudentSupportAdminPage.spec.tsx',
      'packages/infrastructure/tests/cms/CmsSection16Gaps.spec.ts',
      'packages/infrastructure/tests/cms/CmsScheduleAtomicPublish.spec.ts',
      'packages/infrastructure/tests/cms/CmsScheduledRepair.spec.ts',
      'packages/infrastructure/tests/cms/CmsBlockArchive.spec.ts',
      'packages/application/tests/cms/CmsUseCases.spec.ts',
      'packages/application/tests/localization/ApplicationLocaleProjectionService.spec.ts',
      'packages/application/tests/translation-import/TranslationImportTransferService.spec.ts',
      'packages/application/tests/translation-import/TranslationImportPreparationService.spec.ts',
      'packages/infrastructure/tests/translation-import/TranslationGovernance.spec.ts',
      'apps/api/tests/presentation/api/router/TranslationWorkspaceRouter.spec.ts',
      'tests/translation/section17-readiness.spec.ts',
      'apps/admin/tests/translations/TranslationWorkspaceInteractions.spec.tsx',
      'tests/translation/multilingual-seo.spec.ts',
      'tests/translation/localized-sitemap.spec.ts',
    ],
  },
});
