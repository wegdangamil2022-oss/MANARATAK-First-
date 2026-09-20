import { PrismaClient } from '@prisma/client';
import iso31662 from 'iso-3166-2';

const url = process.env.DATABASE_URL;
if (!url || url.includes('postgres-host') || url.includes('placeholder')) {
  console.error('CRITICAL: DATABASE_URL is not set or contains a placeholder. Please configure a valid DATABASE_URL environment variable.');
  process.exit(1);
}
const prisma = new PrismaClient({ datasources: { db: { url } } });

async function main() {
  console.log('Starting cities import from iso-3166-2...');
  
  // Optional: clear existing cities? I'll just skip to avoid deleting user modifications.
  // We'll check if exists by countryIso2Code and name.
  
  const countries = await prisma.referenceCountry.findMany();
  let totalImported = 0;

  let hasErrors = false;
  for (const country of countries) {
    const data = iso31662.data[country.iso2Code];
    if (!data || !data.sub) continue;

    for (const [code, sub] of Object.entries(data.sub)) {
      const name = sub.name;
      
      const exists = await prisma.referenceCity.findFirst({
        where: {
          countryIso2Code: country.iso2Code,
          name: name
        }
      });
      
      if (!exists) {
        const metadata = {
          regionType: sub.type,
          regionCode: code,
          source: "iso-3166-2 npm package",
          translationStatus: "NEEDS_AR_TRANSLATION"
        };

        try {
          await prisma.referenceCity.create({
            data: {
              countryIso2Code: country.iso2Code,
              name: name,
              metadata: metadata,
              isActive: true
            }
          });
          totalImported++;
        } catch (err) {
          console.error('Error inserting', name, err);
          hasErrors = true;
        }
      }
    }
  }

  if (hasErrors) {
    console.error(`FAILED: Cities import completed with errors.`);
    process.exitCode = 1;
  } else {
    console.log(`SUCCESS: Successfully imported ${totalImported} cities/regions.`);
  }
}

main()
  .catch(e => { console.error(e); process.exitCode = 1; })
  .finally(async () => {
    await prisma.$disconnect();
    
  });
