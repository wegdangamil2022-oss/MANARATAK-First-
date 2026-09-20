import { PrismaClient } from '@prisma/client';

const SQL_USER = process.env.SQL_USER;
const SQL_PASSWORD = process.env.SQL_PASSWORD;
const SQL_HOST = process.env.SQL_HOST;
const SQL_DB_NAME = process.env.SQL_DB_NAME;

if (!SQL_USER || !SQL_PASSWORD || !SQL_HOST || !SQL_DB_NAME) {
  console.error('CRITICAL: SQL credentials are not set in environment.');
  process.exit(1);
}

const encodedPassword = encodeURIComponent(SQL_PASSWORD);
const url = `postgresql://${SQL_USER}:${encodedPassword}@localhost/${SQL_DB_NAME}?host=${SQL_HOST}`;
const prisma = new PrismaClient({ datasources: { db: { url } } });

async function checkTest(id: string) {
  console.log(`\n=================== AUDIT FOR: ${id} ===================`);
  const test = await prisma.internationalTest.findUnique({
    where: { id },
    include: {
      versions: {
        include: {
          contentBlocks: {
            orderBy: {
              createdAt: 'asc'
            }
          }
        }
      }
    }
  });

  if (!test) {
    console.log(`Exists: NO`);
    return;
  }

  console.log(`Exists: YES`);
  console.log(`Slug: ${test.slug}`);
  console.log(`Canonical Name: ${test.canonicalName}`);
  console.log(`DisplayName: ${test.displayName}`);
  console.log(`Localized Name (Ar): ${test.localizedNameAr}`);
  console.log(`Abbreviation: ${test.abbreviation}`);
  console.log(`Status: ${test.status}`);
  console.log(`Completeness Status: ${test.completenessStatus}`);
  console.log(`Current Published Version ID: ${test.currentPublishedVersionId}`);
  
  console.log(`\n--- Versions ---`);
  console.log(`Total Versions: ${test.versions.length}`);
  for (const v of test.versions) {
    console.log(`  - Version ID: ${v.id} | Number: ${v.versionNumber} | Status: ${v.status} | Source File: ${v.sourceFileName} | Blocks count: ${v.contentBlocks.length}`);
    if (v.contentBlocks.length > 0) {
      console.log(`    Content Blocks sample (first 3):`);
      v.contentBlocks.slice(0, 3).forEach((b, idx) => {
        console.log(`      Block [${idx + 1}] Key: ${b.blockKey} | Title: ${b.title} | Content length: ${b.content.length}`);
        console.log(`      Snippet: ${b.content.slice(0, 200).replace(/\r?\n/g, ' ')}...`);
      });
      
      // Check for specific content markers
      const overviewBlock = v.contentBlocks.find(b => b.blockKey === 'overview' || b.title?.includes('نظرة عامة'));
      if (overviewBlock) {
        console.log(`    Overview Block Content Matches Expected: ${overviewBlock.content.includes('نظرة عامة على الاختبار') ? 'YES' : 'NO'}`);
      }
    }
  }
}

async function main() {
  const ids = ['ielts-academic', 'oet-english', 'cambridge-english-qualifications'];
  for (const id of ids) {
    await checkTest(id);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
