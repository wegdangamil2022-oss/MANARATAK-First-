import { PrismaClient } from '@prisma/client';

const url = process.env.DATABASE_URL;
if (!url || url.includes('postgres-host') || url.includes('placeholder')) {
  console.error('CRITICAL: DATABASE_URL is not set or contains a placeholder. Please configure a valid DATABASE_URL environment variable.');
  process.exit(1);
}

const prisma = new PrismaClient({ datasources: { db: { url } } });

async function main() {
  const country = await prisma.referenceCountry.findUnique({
    where: { iso2Code: 'AM' }
  });
  console.log(JSON.stringify(country, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
