import {defineConfig} from 'vitest/config';
import base from './.section16-vitest.config';
export default defineConfig({...base,test:{...base.test,maxWorkers:1,include:[
'packages/application/tests/career-alumni/B12*.spec.ts',
'packages/infrastructure/tests/career-alumni/B12*.spec.ts',
'apps/api/tests/presentation/api/router/B12*.spec.ts',
]}});
