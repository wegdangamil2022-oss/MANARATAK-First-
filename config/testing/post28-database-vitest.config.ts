import {defineConfig} from 'vitest/config';
import base from '../../.section16-vitest.config';
import {databaseSuite} from './post28-database-suites.mjs';
export default defineConfig({...base,test:{...base.test,
  globalSetup:['tests/database/post28-database-safety.setup.mjs'],
  include:databaseSuite(process.env.POST28_DATABASE_SUITE).files,
  passWithNoTests:false,fileParallelism:false,maxWorkers:1,testTimeout:120000,hookTimeout:120000,
}});
