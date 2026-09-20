import { PrismaClient } from '@prisma/client';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const prisma = new PrismaClient({ datasources: { db: { url } } });

async function main() {
  console.log('--- Database Introspection for International Tests ---');
  
  // 1. Get exact counts
  const totalTests = await prisma.internationalTest.count();
  const totalVersions = await prisma.internationalTestVersion.count();
  const totalBlocks = await prisma.internationalTestContentBlock.count();
  
  console.log(`Total tests in DB: ${totalTests}`);
  console.log(`Total test versions in DB: ${totalVersions}`);
  console.log(`Total content blocks in DB: ${totalBlocks}`);

  // 2. Get list of tests
  const tests = await prisma.internationalTest.findMany({
    select: {
      id: true,
      slug: true,
      displayName: true,
      canonicalName: true,
      testCategory: true,
      status: true,
      completenessStatus: true,
      currentPublishedVersionId: true,
    },
    orderBy: { displayName: 'asc' }
  });

  console.log('\n--- Test Catalog Inventory ---');
  for (const t of tests) {
    const blockCount = await prisma.internationalTestContentBlock.count({
      where: { version: { testId: t.id } }
    });
    console.log(`ID: ${t.id} | Slug: ${t.slug} | Name: ${t.displayName} | Category: ${t.testCategory} | Status: ${t.status} | Completeness: ${t.completenessStatus} | Blocks: ${blockCount}`);
  }

  // 3. Category distribution
  const categories = await prisma.internationalTest.groupBy({
    by: ['testCategory'],
    _count: { id: true }
  });
  console.log('\n--- Category Distribution ---');
  categories.forEach(c => {
    console.log(`${c.testCategory || 'NULL'}: ${c._count.id} tests`);
  });

  // 4. Status distribution
  const statuses = await prisma.internationalTest.groupBy({
    by: ['status'],
    _count: { id: true }
  });
  console.log('\n--- Status Distribution ---');
  statuses.forEach(s => {
    console.log(`${s.status || 'NULL'}: ${s._count.id} tests`);
  });
}

main()
  .catch(e => {
    console.error('Error during query:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
