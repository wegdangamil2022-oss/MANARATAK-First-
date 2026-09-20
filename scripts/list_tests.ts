import { PrismaClient } from '@prisma/client';

const url = process.env.DATABASE_URL;
if (!url || url.includes('postgres-host') || url.includes('placeholder')) {
  console.error('CRITICAL: DATABASE_URL is not set or contains a placeholder. Please configure a valid DATABASE_URL environment variable.');
  process.exit(1);
}
const prisma = new PrismaClient({ datasources: { db: { url } } });

async function main() {
  const tests = await prisma.internationalTest.findMany({
    select: { id: true, slug: true, displayName: true, abbreviation: true }
  });

  console.log('--- All International Tests in DB ---');
  tests.forEach(t => {
    console.log(`ID: ${t.id} | Slug: ${t.slug} | Name: ${t.displayName} | Abbr: ${t.abbreviation}`);
  });
}

main()
  .catch(e => {
    console.error('CRITICAL LIST ERROR:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    
  });
