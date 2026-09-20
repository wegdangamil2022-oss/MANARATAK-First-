import { PrismaClient } from '@prisma/client';
import { DegreeLevelRepository } from '../packages/infrastructure/src/degree-level';
import { DegreeLevelSeedService } from '../packages/application/src/degree-level';
import { requireDatabaseMutationGate } from './lib/require-database-mutation-gate';

async function main() {
  requireDatabaseMutationGate('seed-degree-levels', { allowedPurposes: ['seed'] });
  const prisma = new PrismaClient();
  try {
    const repo = new DegreeLevelRepository(prisma);
    const service = new DegreeLevelSeedService(repo);

    console.log('Seeding Canonical Degree Levels...');
    await service.seedDegreeLevels();
    console.log('Successfully seeded Canonical Degree Levels.');

    const levels = await repo.listDegreeLevels();
    console.table(levels.map(l => ({ code: l.canonicalCode, rank: l.displayRank, ar: l.nameAr, en: l.nameEn })));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
