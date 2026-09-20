import { container, registerDependencies } from '../apps/api/src/infrastructure/di/container.js';
import { PrismaClient } from '@prisma/client';

async function run() {
  await registerDependencies();
  const prisma = container.resolve<PrismaClient>('prisma');
  const count = await prisma.major.count();
  console.log('total DB count:', count);
}
run().catch(e => { console.error(e); process.exitCode = 1; });
