import {defineConfig} from 'vitest/config';
import base from './.section16-vitest.config';
export default defineConfig({...base,test:{...base.test,maxWorkers:1,include:[
'packages/application/tests/courses/B10d*.spec.ts',
'packages/infrastructure/tests/courses/B10d*.spec.ts',
'apps/admin/tests/remediation/B10d*.spec.tsx',
'apps/api/tests/presentation/api/router/B10d*.spec.ts',
'packages/application/tests/courses/Section12LearningVersions.spec.ts',
'packages/application/tests/courses/CourseCurriculumUseCases.spec.ts',
'packages/infrastructure/tests/courses/PrismaCourseCurriculumRepository.spec.ts',
]}});
