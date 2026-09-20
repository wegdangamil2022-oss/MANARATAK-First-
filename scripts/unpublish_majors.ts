import { container, registerDependencies } from '../apps/api/src/infrastructure/di/container.js';
import { PrismaClient } from '@prisma/client';
import { requireDatabaseMutationGate } from './lib/require-database-mutation-gate';

async function run() {
  requireDatabaseMutationGate('unpublish-majors', { allowedPurposes: ['maintenance'] });
  await registerDependencies();
  const prisma = container.resolve<PrismaClient>('prisma');
  
  const updated = await prisma.major.updateMany({
    where: {
      status: 'PUBLISHED',
    },
    data: {
      status: 'READY_TO_REVIEW'
    }
  });
  
  console.log(`Unpublished ${updated.count} majors!`);
}
run().catch(e => { console.error(e); process.exitCode = 1; });
