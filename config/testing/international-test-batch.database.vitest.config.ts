import {defineConfig} from 'vitest/config';
import baseline from './review/section16-vitest.config';
export default defineConfig({...baseline,test:{environment:'node',fileParallelism:false,testTimeout:60000,include:['packages/infrastructure/tests/international-tests/InternationalTestBatchImport.database.spec.ts']}});
