import { PrismaClient } from '@prisma/client';

const url = process.env.DATABASE_URL;
if (!url || url.includes('postgres-host') || url.includes('placeholder')) {
  console.error('CRITICAL: DATABASE_URL is not set or contains a placeholder. Please configure a valid DATABASE_URL environment variable.');
  process.exit(1);
}
const prisma = new PrismaClient({ datasources: { db: { url } } });

async function main() {
  const toefl = await prisma.internationalTest.findFirst({
    where: { 
      OR: [
        { slug: 'toefl-ibt' },
        { slug: 'toefl' },
        { abbreviation: 'TOEFL' }
      ]
    },
    include: {
      versions: {
        include: {
          contentBlocks: true
        }
      }
    }
  });

  if (!toefl) {
    console.log('TOEFL test not found in database.');
    return;
  }

  console.log('--- TOEFL Test Basic Info ---');
  console.log(`ID: ${toefl.id}`);
  console.log(`Display Name: ${toefl.displayName}`);
  console.log(`Status: ${toefl.status}`);
  console.log(`Current Version ID: ${toefl.currentPublishedVersionId}`);

  toefl.versions.forEach(v => {
    console.log(`\n--- Version ${v.versionNumber} (Status: ${v.status}) ---`);
    console.log(`Content Blocks Count: ${v.contentBlocks.length}`);
    v.contentBlocks.forEach(b => {
      console.log(`- Block: ${b.blockKey} (${b.blockType}) | Title: ${b.title}`);
      if (b.blockKey === 'full_markdown' || b.blockKey === 'main_content') {
         console.log(`  Content Length: ${b.content.length}`);
      }
    });
  });
}

main()
  .catch(e => {
    console.error('CRITICAL INSPECTION ERROR:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    
  });
