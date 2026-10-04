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

async function main() {
  let sourceToUuidMap: Record<string, string> = {};
  if (fs.existsSync(MAP_PATH)) {
    sourceToUuidMap = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));
  }

  const cityLines = fs.readFileSync(CITIES_CSV, 'utf8').split('\n');
  const cityHeaders = parseCSVLine(cityLines[0]);

  const dbCities = await prisma.referenceCity.findMany();
  const dbCitiesMap = new Map(dbCities.map(c => [c.canonicalIdentityKey, c]));

  const activeCountries = await prisma.referenceCountry.findMany({ where: { lifecycleState: 'ACTIVE' } });
  const activeIsoCodes = new Set(activeCountries.map(c => c.iso2Code));

  const regionLines = fs.readFileSync(REGIONS_CSV, 'utf8').split('\n');
  const regionHeaders = parseCSVLine(regionLines[0]);

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

  const processedKeys = new Set<string>();

  let reusedFromBeforeBatch = 0;
  let reusedFromBatch1 = 0;

  for (let i = 216; i < cityLines.length; i++) {
    const line = cityLines[i];
    if (!line.trim()) continue;

    const parts = parseCSVLine(line);
    const countryIso2 = parts[cityHeaders.indexOf('countryIso2')];
    const regionCode = parts[cityHeaders.indexOf('regionCode')];
    const cityNameEn = parts[cityHeaders.indexOf('cityNameEn')];
    const regionMatchStatus = parts[cityHeaders.indexOf('regionMatchStatus')];

    if (!activeIsoCodes.has(countryIso2) || regionMatchStatus !== 'MATCHED_BY_NORMALIZED_NAME') {
      continue;
    }

    const regionRow = csvRegionsFind(regionCode, countryIso2);
    if (!regionRow) continue;
    const regionSourceId = regionRow[regionHeaders.indexOf('regionId')];
    const regionUuid = sourceToUuidMap[regionSourceId];
    if (!regionUuid) continue;

    const normalize = (value: string | null | undefined) =>
      (value ?? '')
        .normalize('NFKC')
        .trim()
        .toLocaleLowerCase('en-US')
        .replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const regionIdentity = `id:${regionUuid.trim().toLowerCase()}`;
    const canonicalIdentity = [
      countryIso2.trim().toUpperCase(),
      normalize(cityNameEn),
      regionIdentity,
    ].join('|');
    const key = createHash('sha256').update(canonicalIdentity, 'utf8').digest('hex');

    if (processedKeys.has(key)) continue;
    processedKeys.add(key);

    const existing = dbCitiesMap.get(key);
    if (existing) {
      if (existing.createdAt.getTime() < new Date('2026-10-03T21:50:00Z').getTime()) {
        reusedFromBeforeBatch++;
      } else if (existing.createdAt.getTime() < new Date('2026-10-03T22:05:00Z').getTime()) {
        reusedFromBatch1++;
      }
    }
  }

  console.log('Post-Resume (Line 216 to End) Reused Breakdown:');
  console.log(`  Reused from Before Batch (SA: 7): ${reusedFromBeforeBatch}`);
  console.log(`  Reused from Batch 1 (Pre-resume, 243): ${reusedFromBatch1}`);
  console.log(`  Total Reused: ${reusedFromBeforeBatch + reusedFromBatch1}`);

  await prisma.$disconnect();
}

main().catch(console.error);
