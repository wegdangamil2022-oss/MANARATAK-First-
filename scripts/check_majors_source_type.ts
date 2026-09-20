import { container, registerDependencies } from '../apps/api/src/infrastructure/di/container.js';
import { PrismaClient } from '@prisma/client';

async function run() {
  await registerDependencies();
  const prisma = container.resolve<PrismaClient>('prisma');
  
  const sample = await prisma.major.findFirst();
  console.log('Sample optionalFields:', sample?.optionalFields);
}
run().catch(e => { console.error(e); process.exitCode = 1; });
