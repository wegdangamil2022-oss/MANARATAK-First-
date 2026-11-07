import {defineConfig} from 'vitest/config';

// The suite itself requires the explicit operator flag and a local majors_full_
// database. Its synthetic fixture is always rolled back.
export default defineConfig({test:{environment:'node',fileParallelism:false,testTimeout:30000,include:['packages/infrastructure/tests/majors/MajorCollegeFilter.database.spec.ts']}});
