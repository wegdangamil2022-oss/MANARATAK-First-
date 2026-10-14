import {defineConfig} from 'vitest/config';
import baseline from './.section16-vitest.config';
export default defineConfig({...baseline,test:{...baseline.test,maxWorkers:1,include:['apps/admin/tests/dashboard/**/*.spec.tsx']}});
