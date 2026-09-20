import { container, registerDependencies } from '../apps/api/src/infrastructure/di/container.js';
import { PrismaClient } from '@prisma/client';
import { requireDatabaseMutationGate } from './lib/require-database-mutation-gate';

async function run() {
  requireDatabaseMutationGate('publish-majors', { allowedPurposes: ['maintenance'] });
  await registerDependencies();
  const prisma = container.resolve<PrismaClient>('prisma');
  
  const updated = await prisma.major.updateMany({
    where: {
      status: 'READY_TO_REVIEW'
    },
    data: {
      status: 'PUBLISHED'
    }
  });
  
  console.log(`Published ${updated.count} majors!`);
}
run().catch(e => { console.error(e); process.exitCode = 1; });
