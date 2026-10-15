import {defineConfig} from 'vitest/config';
import base from './.section16-vitest.config';
export default defineConfig({...base,test:{...base.test,maxWorkers:1,include:[
'packages/application/tests/remediation/B10c*.spec.ts',
'apps/api/tests/presentation/api/router/B10c*.spec.ts',
'apps/admin/tests/remediation/B10c*.spec.tsx',
'packages/infrastructure/tests/universities/PrismaUniversityRepository.spec.ts',
'packages/application/tests/scholarships/AdminScholarshipUseCases.spec.ts',
]}});
