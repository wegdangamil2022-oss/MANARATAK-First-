import { PrismaClient } from '@prisma/client';
import {
  PrismaExternalCourseProviderRepository,
  seedExternalCourseProviders,
} from '../packages/infrastructure/src/index';
import { requireDatabaseMutationGate } from './lib/require-database-mutation-gate';

async function main() {
  requireDatabaseMutationGate('seed-external-course-providers', { allowedPurposes: ['seed'] });
  const prisma = new PrismaClient();
  try {
    const repository = new PrismaExternalCourseProviderRepository(prisma);
    const providers = await seedExternalCourseProviders(repository);
    console.log(`Seeded ${providers.length} external course providers.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
