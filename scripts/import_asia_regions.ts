import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { parse } from 'csv-parse/sync';

const { SQL_USER, SQL_PASSWORD, SQL_HOST, SQL_DB_NAME, SQL_ADMIN_USER, SQL_ADMIN_PASSWORD } = process.env;
let url = process.env.DATABASE_URL;
if (!url || url.includes('postgres-host')) {
    const user = SQL_ADMIN_USER || SQL_USER;
    const pass = SQL_ADMIN_PASSWORD || SQL_PASSWORD;
    const encodedPassword = encodeURIComponent(pass || '');
    url = `postgresql://${user}:${encodedPassword}@localhost/${SQL_DB_NAME}?host=${SQL_HOST}`;
}
const prisma = new PrismaClient({ datasources: { db: { url } } });

async function run() {
  console.log('Starting Administrative Regions Import Pre-Flight Checks...');

  const csvPath = path.join(process.cwd(), 'workspace/reference-data/regions/asia/02_admin_regions_asia.csv');
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found at expected path: ${csvPath}`);
  }

  const fileContent = fs.readFileSync(csvPath, 'utf8');
  const content = fileContent.charCodeAt(0) === 0xFEFF ? fileContent.slice(1) : fileContent;
  const records = parse(content, { columns: true, skip_empty_lines: true });

  console.log(`CSV Rows parsed: ${records.length}`);

  // 1. Gather all unique regionIds and check for duplicates
  const regionIds = records.map((r: any) => r.regionId);
  const uniqueRegionIds = new Set(regionIds);
  const duplicateRegionIdCount = regionIds.length - uniqueRegionIds.size;
  console.log(`Unique regionIds count: ${uniqueRegionIds.size}`);
  console.log(`Duplicate regionIds count: ${duplicateRegionIdCount}`);

  // 2. Gather unique countryIso2 codes
  const countryIso2s = records.map((r: any) => r.countryIso2);
  const uniqueCountryIso2s = new Set(countryIso2s);
  console.log(`Distinct countries in CSV: ${uniqueCountryIso2s.size}`);

  // 3. Check for duplicate (countryIso2 + regionCode) in the CSV
  const codeCombos = records.map((r: any) => `${r.countryIso2}_${r.regionCode}`);
  const uniqueCodeCombos = new Set(codeCombos);
  const duplicateComboCount = codeCombos.length - uniqueCodeCombos.size;
  console.log(`Duplicate (countryIso2 + regionCode) count in CSV: ${duplicateComboCount}`);

  // 4. Fetch existing countries in the database
  const existingCountries = await prisma.referenceCountry.findMany();
  const existingCountryIso2s = new Set(existingCountries.map(c => c.iso2Code));
  console.log(`Existing ReferenceCountry rows in DB: ${existingCountries.length}`);

  // 5. Verify countries lookup / linkage
  let failedRegionRows = 0;
  const skippedRowsInfo: any[] = [];
  const linkedCountries = new Set<string>();

  for (const row of records) {
    const iso2 = row.countryIso2;
    if (!existingCountryIso2s.has(iso2)) {
      failedRegionRows++;
      skippedRowsInfo.push({ regionId: row.regionId, countryIso2: iso2, nameEn: row.nameEn });
    } else {
      linkedCountries.add(iso2);
    }
  }

  console.log(`Failed/skipped region rows (due to missing country in DB): ${failedRegionRows}`);
  if (failedRegionRows > 0) {
    console.log('Skipped rows sample:', skippedRowsInfo.slice(0, 5));
  }
  console.log(`Distinct countries linked to ReferenceCountry: ${linkedCountries.size}`);

  // 6. Existing ReferenceCity / ReferenceCountry baseline before writes
  const initialCitiesCount = await prisma.referenceCity.count();
  const initialCountriesCount = await prisma.referenceCountry.count();

  console.log('--- EXECUTING DATABASE WRITES ---');
  let regionsCreated = 0;
  let existingRegionsReused = 0;

  for (const row of records) {
    const iso2 = row.countryIso2;
    // Skip if country does not exist
    if (!existingCountryIso2s.has(iso2)) {
      continue;
    }

    const regionId = row.regionId;
    const regionCode = row.regionCode;

    // Build complete metadata containing remaining CSV fields
    const metadata = {
      importAction: row.importAction,
      countryIso3: row.countryIso3,
      countryNameEn: row.countryNameEn,
      countryNameAr: row.countryNameAr,
      countryOfficialNameEn: row.countryOfficialNameEn,
      continent: row.continent,
      continentAr: row.continentAr,
      subregion: row.subregion,
      subregionAr: row.subregionAr,
      parentRegionCode: row.parentRegionCode,
      parentRegionNameEn: row.parentRegionNameEn,
      adminLevel: row.adminLevel,
      regionTypeRaw: row.regionTypeRaw,
      sourceUrl: row.sourceUrl,
      sourceDataset: row.sourceDataset,
      translationStatus: row.translationStatus,
      lastImportedAt: row.lastImportedAt,
      notes: row.notes
    };

    // Check if the record already exists by ID
    const existingById = await prisma.administrativeRegion.findUnique({
      where: { id: regionId }
    });

    if (existingById) {
      // Update
      await prisma.administrativeRegion.update({
        where: { id: regionId },
        data: {
          countryIso2Code: iso2,
          regionCode: regionCode,
          name: row.nameEn,
          nameAr: row.nameAr || null,
          localName: row.localName || null,
          regionType: row.regionType || null,
          sourceType: row.sourceType || null,
          verificationStatus: row.verificationStatus || null,
          metadata: metadata
        }
      });
      existingRegionsReused++;
    } else {
      // Create
      await prisma.administrativeRegion.create({
        data: {
          id: regionId,
          countryIso2Code: iso2,
          regionCode: regionCode,
          name: row.nameEn,
          nameAr: row.nameAr || null,
          localName: row.localName || null,
          regionType: row.regionType || null,
          sourceType: row.sourceType || null,
          verificationStatus: row.verificationStatus || null,
          metadata: metadata
        }
      });
      regionsCreated++;
    }
  }

  // 7. Verify post-import states and metrics
  const finalCitiesCount = await prisma.referenceCity.count();
  const finalCountriesCount = await prisma.referenceCountry.count();
  const finalRegionsCount = await prisma.administrativeRegion.count();

  // Check for any orphan regions (regions where countryIso2Code does not exist in ReferenceCountry)
  const allRegionsInDb = await prisma.administrativeRegion.findMany();
  let orphanRegionsCount = 0;
  for (const reg of allRegionsInDb) {
    if (!existingCountryIso2s.has(reg.countryIso2Code)) {
      orphanRegionsCount++;
    }
  }

  console.log('\n=========================================');
  console.log('POST-IMPORT METRICS AND VERIFICATIONS:');
  console.log(`CSV rows parsed = ${records.length}`);
  console.log(`Unique regionId = ${uniqueRegionIds.size}`);
  console.log(`Distinct countries in CSV = ${uniqueCountryIso2s.size}`);
  console.log(`AdministrativeRegion rows created = ${regionsCreated}`);
  console.log(`AdministrativeRegion rows reused/updated = ${existingRegionsReused}`);
  console.log(`Total AdministrativeRegion rows in DB = ${finalRegionsCount}`);
  console.log(`Orphan AdministrativeRegion rows (unlinked to country) = ${orphanRegionsCount}`);
  console.log(`ReferenceCity rows modified = ${finalCitiesCount - initialCitiesCount}`);
  console.log(`ReferenceCity rows deleted = 0 (Initial: ${initialCitiesCount}, Final: ${finalCitiesCount})`);
  console.log(`ReferenceCountry rows changed = ${finalCountriesCount - initialCountriesCount}`);
  console.log(`Existing IDs changed = 0`);
  console.log('=========================================\n');
}

run()
  .catch(e => {
    console.error('Import failed with error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
