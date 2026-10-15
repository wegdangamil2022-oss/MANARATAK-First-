import {defineConfig} from 'vitest/config';
import base from './.section16-vitest.config';
export default defineConfig({...base,test:{...base.test,maxWorkers:1,include:[
'packages/application/tests/translation-import/TranslationImportPreparationService.spec.ts',
'packages/application/tests/translation-import/TranslationImportTransferService.spec.ts',
'packages/infrastructure/tests/translation-import/TranslationGovernance.spec.ts',
'packages/infrastructure/tests/translation-import/TranslationWorkspaceRead.spec.ts',
'packages/infrastructure/tests/translation-import/B11*.spec.ts',
'packages/infrastructure/tests/majors/B11*.spec.ts',
'packages/infrastructure/tests/scholarships/B11*.spec.ts',
'packages/infrastructure/tests/international-tests/InternationalTestGovernanceCloseout.spec.ts',
'packages/application/tests/study-destinations/StudyDestinationGovernance.spec.ts',
'apps/api/tests/presentation/api/router/B11*.spec.ts',
'apps/api/tests/presentation/api/router/TranslationWorkspaceRouter.spec.ts',
'packages/application/tests/localization/B11*.spec.ts',
'packages/application/tests/localization/ApplicationLocaleProjectionService.spec.ts',
'packages/infrastructure/tests/universities/B11*.spec.ts',
'packages/infrastructure/tests/universities/PrismaUniversityRepository.spec.ts',
 'tests/translation/translation-quality-gates.spec.ts',
'packages/shared/tests/localization/policy.spec.ts',
'apps/admin/tests/remediation/B11*.spec.tsx',
]}});
