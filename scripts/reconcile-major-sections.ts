import { PrismaClient } from '@prisma/client';
import { requireDatabaseMutationGate } from './lib/require-database-mutation-gate';

const prisma = new PrismaClient();

async function run() {
  requireDatabaseMutationGate('reconcile-major-sections', { allowedPurposes: ['backfill'] });
  console.log('Starting data reconciliation...');
  
  // Clean up any sections that lack both profileId and versionId
  const deletedOrphans = await prisma.majorContentSection.deleteMany({
    where: {
      profileId: null,
      versionId: null,
    },
  });
  console.log(`Deleted ${deletedOrphans.count} orphan sections.`);

  // Find duplicates within the same profile and section key
  const sections = await prisma.majorContentSection.findMany({
    orderBy: { createdAt: 'desc' }
  });

  const seen = new Set<string>();
  let deletedDups = 0;

  for (const section of sections) {
    if (!section.profileId) continue;
    const key = `${section.profileId}-${section.sectionKey}`;
    if (seen.has(key)) {
      await prisma.majorContentSection.delete({ where: { id: section.id } });
      deletedDups++;
    } else {
      seen.add(key);
    }
  }

  console.log(`Deleted ${deletedDups} duplicated sections.`);
  console.log('Reconciliation complete.');
}

run().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
