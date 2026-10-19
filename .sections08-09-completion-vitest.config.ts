import {defineConfig} from 'vitest/config';
import {resolve} from 'node:path';
export default defineConfig({
 esbuild:{jsx:'automatic'},
 resolve:{alias:Object.fromEntries(['core','domain','shared','application','infrastructure'].map(name=>['@absheer/'+name,resolve('packages/'+name+'/src/index.ts')]))},
 test:{environment:'node',testTimeout:5000,maxWorkers:2,include:[
  '**/InternationalTestGovernanceCloseout.spec.ts','**/InternationalTestGovernanceCloseout.spec.tsx','**/MajorGovernanceCloseout.spec.ts',
  'packages/application/tests/majors/MajorCandidateComparison.spec.ts','packages/application/tests/majors/MajorOwnerImport.spec.ts',
  'packages/infrastructure/tests/majors/MajorSourceCompletion.spec.ts','packages/infrastructure/tests/majors/Phase10CatalogRepository.spec.ts',
  'packages/infrastructure/tests/majors/MajorLocaleContent.spec.ts','packages/infrastructure/tests/majors/MajorContentSectionGuard.spec.ts',
  'apps/api/tests/presentation/api/router/MajorSourceCompletion.spec.ts','apps/web/src/features/public-template/MajorDiscovery.spec.ts','apps/admin/src/api/MajorPickerPaging.spec.ts'
 ]}
});
