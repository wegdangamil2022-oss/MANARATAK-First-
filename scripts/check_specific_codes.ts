import { container, registerDependencies } from '../apps/api/src/infrastructure/di/container.js';
import { PrismaClient } from '@prisma/client';

async function run() {
  await registerDependencies();
  const prisma = container.resolve<PrismaClient>('prisma');
  
  const m1 = await prisma.major.findFirst({
    where: {
      optionalFields: {
        path: ['classificationCode'],
        equals: 'MAS-0001'
      }
    }
  });
  console.log('MAS-0001 in DB:', m1?.displayName, m1?.id);
  
  const m2 = await prisma.major.findFirst({
    where: {
      optionalFields: {
        path: ['classificationCode'],
        equals: 'MAS-0138'
      }
    }
  });
  console.log('MAS-0138 in DB:', m2?.displayName, m2?.id);
}
run().catch(e => { console.error(e); process.exitCode = 1; });
