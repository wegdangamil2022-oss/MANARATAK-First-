import {defineConfig} from 'vitest/config';
import base from './.section16-vitest.config';
export default defineConfig({...base,test:{...base.test,maxWorkers:1,include:[
'packages/application/tests/majors/B10a*.spec.ts',
'packages/infrastructure/tests/majors/B10a*.spec.ts',
'packages/domain/tests/majors/MajorGovernanceCloseout.spec.ts',
'packages/infrastructure/tests/majors/MajorGovernanceCloseout.spec.ts',
'apps/api/tests/presentation/api/router/MajorGovernanceCloseout.spec.ts',
]}});
