import { PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';
import fs from 'node:fs';

const host = encodeURIComponent(process.env.SQL_HOST || '');
const db = encodeURIComponent(process.env.SQL_DB_NAME || '');
const user = process.env.SQL_USER || '';
const pass = encodeURIComponent(process.env.SQL_PASSWORD || process.env.SQL_ADMIN_PASSWORD || process.env.DB_APPLICATION_PASSWORD || '');
process.env.DATABASE_URL = `postgresql://${user}:${pass}@localhost/${db}?host=${host}`;

const prisma = new PrismaClient();

const REGIONS_CSV = './workspace/reference-data/regions/asia/02_admin_regions_asia.csv';
const CITIES_CSV = './workspace/reference-data/cities/asia/MANARATAK_Asia_Cities_All_Combined.csv';
const MAP_PATH = '/tmp/asia_source_to_uuid_map.json';

function parseCSVLine(line: string): string[] {
  const parts: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts;
}

function cityCanonicalIdentityKey(data: { countryIso2Code: string; name: string; administrativeRegionId?: string | null; region?: string | null }): string {
  const normalize = (value: string | null | undefined) =>
    (value ?? '')
      .normalize('NFKC')
      .trim()
      .toLocaleLowerCase('en-US')
      .replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const regionIdentity = data.administrativeRegionId
    ? `id:${data.administrativeRegionId.trim().toLowerCase()}`
    : normalize(data.region)
      ? `text:${normalize(data.region)}`
      : '~';
  const canonicalIdentity = [
    data.countryIso2Code.trim().toUpperCase(),
    normalize(data.name),
    regionIdentity,
  ].join('|');
  return createHash('sha256').update(canonicalIdentity, 'utf8').digest('hex');
}

async function main() {
  console.log('=== ANALYZING ASIA RECONCILIATION ===');

  const activeCountries = await prisma.referenceCountry.findMany({ where: { lifecycleState: 'ACTIVE' } });
  const activeIsoCodes = new Set(activeCountries.map(c => c.iso2Code));

  let sourceToUuidMap: Record<string, string> = {};
  if (fs.existsSync(MAP_PATH)) {
    sourceToUuidMap = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));
  }

  const regionLines = fs.readFileSync(REGIONS_CSV, 'utf8').split('\n');
  const regionHeaders = parseCSVLine(regionLines[0]);

  const cityLines = fs.readFileSync(CITIES_CSV, 'utf8').split('\n');
  const cityHeaders = parseCSVLine(cityLines[0]);

  // Exclusions count by reason
  const exclusions = {
    inactiveCountry: 0,
    missingRegion: 0,
    regionMatchStatusNotMatched: 0,
    duplicateInFile: 0,
  };

  const processedKeys = new Set<string>();

  // Helper to find region in CSV
  function csvRegionsFind(regionCode: string, countryIso2: string): string[] | null {
    for (let i = 1; i < regionLines.length; i++) {
      const line = regionLines[i];
      if (!line.trim()) continue;
      const parts = parseCSVLine(line);
      if (parts[regionHeaders.indexOf('regionCode')] === regionCode && parts[regionHeaders.indexOf('countryIso2')] === countryIso2) {
        return parts;
      }
    }
    return null;
  }

  let totalLinesProcessed = 0;
  let reUsedCities = 0;
  let newlyImportedCities = 0;

  for (let i = 1; i < cityLines.length; i++) {
    const line = cityLines[i];
    if (!line.trim()) continue;
    totalLinesProcessed++;

    const parts = parseCSVLine(line);
    const cId = parts[cityHeaders.indexOf('cityId')];
    const countryIso2 = parts[cityHeaders.indexOf('countryIso2')];
    const regionCode = parts[cityHeaders.indexOf('regionCode')];
    const cityNameEn = parts[cityHeaders.indexOf('cityNameEn')];
    const regionMatchStatus = parts[cityHeaders.indexOf('regionMatchStatus')];

    if (!activeIsoCodes.has(countryIso2)) {
      exclusions.inactiveCountry++;
      continue;
    }

    if (regionMatchStatus !== 'MATCHED_BY_NORMALIZED_NAME') {
      exclusions.regionMatchStatusNotMatched++;
      continue;
    }

    const regionRow = csvRegionsFind(regionCode, countryIso2);
    if (!regionRow) {
      exclusions.missingRegion++;
      continue;
    }
    const regionSourceId = regionRow[regionHeaders.indexOf('regionId')];
    const regionUuid = sourceToUuidMap[regionSourceId];
    if (!regionUuid) {
      exclusions.missingRegion++;
      continue;
    }

    const key = cityCanonicalIdentityKey({
      countryIso2Code: countryIso2,
      name: cityNameEn,
      administrativeRegionId: regionUuid
    });

    if (processedKeys.has(key)) {
      exclusions.duplicateInFile++;
      continue;
    }
    processedKeys.add(key);

    // Let's check DB for existence
    const existing = await prisma.referenceCity.findUnique({
      where: { canonicalIdentityKey: key }
    });

    if (existing) {
      reUsedCities++;
    } else {
      newlyImportedCities++;
    }
  }

  console.log('--- CSV Analysis ---');
  console.log('Total city rows processed:', totalLinesProcessed);
  console.log('Exclusions breakdown:', exclusions);
  console.log('Reused (existing) in CSV processing:', reUsedCities);
  console.log('Newly imported cities:', newlyImportedCities);

  // Analyze specific colliding pairs
  const specificKeys = [
    'city_bd_saidpur', 'city_bd_saidpur_464696',
    'city_ye_ibb', 'city_ye_ibb_2'
  ];

  console.log('\n--- Specific Colliding Pairs Analysis ---');
  for (const sId of specificKeys) {
    const row = cityLines.find(line => {
      const parts = parseCSVLine(line);
      return parts[cityHeaders.indexOf('cityId')] === sId;
    });

    if (row) {
      const parts = parseCSVLine(row);
      const cId = parts[cityHeaders.indexOf('cityId')];
      const countryIso2 = parts[cityHeaders.indexOf('countryIso2')];
      const regionCode = parts[cityHeaders.indexOf('regionCode')];
      const cityNameEn = parts[cityHeaders.indexOf('cityNameEn')];
      const lat = parts[cityHeaders.indexOf('latitude')];
      const lng = parts[cityHeaders.indexOf('longitude')];
      const regionMatchStatus = parts[cityHeaders.indexOf('regionMatchStatus')];

      console.log(`Source City: ${sId}`);
      console.log(`  Name: ${cityNameEn}, Country: ${countryIso2}, RegionCode: ${regionCode}`);
      console.log(`  Latitude: ${lat}, Longitude: ${lng}`);
      console.log(`  Match Status: ${regionMatchStatus}`);

      // Find resolved region UUID
      const regionRow = csvRegionsFind(regionCode, countryIso2);
      if (regionRow) {
        const regionSourceId = regionRow[regionHeaders.indexOf('regionId')];
        const regionUuid = sourceToUuidMap[regionSourceId];
        console.log(`  Resolved Region SourceId: ${regionSourceId}, Region UUID: ${regionUuid}`);
        if (regionUuid) {
          const key = cityCanonicalIdentityKey({
            countryIso2Code: countryIso2,
            name: cityNameEn,
            administrativeRegionId: regionUuid
          });
          console.log(`  CanonicalIdentityKey: ${key}`);
          const dbCity = await prisma.referenceCity.findUnique({ where: { canonicalIdentityKey: key } });
          console.log(`  Exists in DB? ${dbCity ? 'YES (ID: ' + dbCity.id + ', Name: ' + dbCity.name + ')' : 'NO'}`);
        }
      } else {
        console.log(`  No Region found in CSV!`);
      }
    } else {
      console.log(`Source City ${sId} not found in CSV!`);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
