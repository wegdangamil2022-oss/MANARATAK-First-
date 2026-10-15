import {defineConfig} from 'vitest/config';
import base from './.section16-vitest.config';
export default defineConfig({...base,test:{...base.test,maxWorkers:1,include:[
'packages/infrastructure/tests/universities/B10b*.spec.ts',
'packages/infrastructure/tests/universities/UniversityCanonicalRelationshipValidator.spec.ts',
'packages/infrastructure/tests/universities/PrismaUniversityRepository.spec.ts',
'packages/application/tests/universities/UniversityProgramAtomicPilot.spec.ts',
'packages/application/tests/universities/B10b*.spec.ts',
'apps/admin/tests/remediation/B10b*.spec.tsx',
]}});
