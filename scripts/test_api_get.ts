import { container, registerDependencies } from '../apps/api/src/infrastructure/di/container.js';

async function run() {
  await registerDependencies();
  const useCases = container.resolve<any>('adminMajorUseCases');
  const res = await useCases.listMajors({ page: 1, pageSize: 100 });
  console.log('API returned majors count:', res.data.length);
  console.log('Total:', res.total);
}
run().catch(e => { console.error(e); process.exitCode = 1; });
