import { container, registerDependencies } from '../apps/api/src/infrastructure/di/container.js';
import { AdminMajorUseCases } from '../packages/application/src/majors/use-cases/AdminMajorUseCases.js';

async function run() {
  await registerDependencies();
  const adminMajorUseCases = container.resolve<AdminMajorUseCases>('adminMajorUseCases');
  
  const result = await adminMajorUseCases.listMajors({ classificationCode: 'DOC-0501' });
  console.log('Result for DOC-0501:', result.data.length > 0 ? 'FOUND' : 'NOT FOUND');
}
run().catch(console.error);
