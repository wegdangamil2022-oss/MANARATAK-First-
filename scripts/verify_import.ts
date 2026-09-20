import { PrismaClient } from '@prisma/client';

const url = process.env.DATABASE_URL;
if (!url || url.includes('postgres-host') || url.includes('placeholder')) {
  console.error(
    'CRITICAL: DATABASE_URL is not set or contains a placeholder. Please configure a valid DATABASE_URL environment variable.',
  );
  process.exitCode = 1;
} else {
  const prisma = new PrismaClient({ datasources: { db: { url } } });

  async function main() {
    const tests = await prisma.internationalTest.findMany({
      include: {
        versions: {
          include: {
            contentBlocks: {
              orderBy: { blockKey: 'asc' },
            },
          },
        },
      },
      orderBy: { testCategory: 'asc' },
    });

    console.log('--- Unified Import Verification (16 Categories) ---');
    for (const t of tests) {
      const version = t.versions[0];
      console.log(`[${t.testCategory}] ${t.displayName}`);
      if (version) {
        for (const block of version.contentBlocks) {
          console.log(`  - ${block.title} (Key: ${block.blockKey})`);
        }
      }
      console.log('-----------------------------------');
    }
  }

  main()
    .catch((e) => {
      console.error('VERIFICATION ERROR:', e);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
