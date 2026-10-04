import { PrismaClient } from '@prisma/client';
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
  console.log('=== ANALYZING ASIA REUSE DETAILS ===');

  let sourceToUuidMap: Record<string, string> = {};
  if (fs.existsSync(MAP_PATH)) {
    sourceToUuidMap = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));
  }

  const cityLines = fs.readFileSync(CITIES_CSV, 'utf8').split('\n');
  const cityHeaders = parseCSVLine(cityLines[0]);

  // Let's check which cities were pre-existing.
  // We can query all ReferenceCities created before the Asia batch started.
  // Wait, let's find the minimum createdAt time for newly added Asia cities to see when the batch started.
  // Let's list cities with their ID and country, and check their createdAt time.
  const cities = await prisma.referenceCity.findMany({
    orderBy: { createdAt: 'asc' }
  });

  console.log('Total Reference Cities in DB:', cities.length);

  // Saudi Arabia (SA) had some cities.
  // Let's see the distribution of createdAt times.
  const createdAtGroups: Record<string, number> = {};
  cities.forEach(c => {
    const dateStr = c.createdAt.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
    createdAtGroups[dateStr] = (createdAtGroups[dateStr] || 0) + 1;
  });

  console.log('CreatedAt Timestamp Groups (Minute-level):');
  console.log(createdAtGroups);

  // Let's identify the 250 cities that existed initially.
  // They are the ones created first.
  const first250 = cities.slice(0, 250);
  const first250Keys = new Set(first250.map(c => c.id));
  const first250CountryCounts: Record<string, number> = {};
  first250.forEach(c => {
    first250CountryCounts[c.countryIso2Code] = (first250CountryCounts[c.countryIso2Code] || 0) + 1;
  });
  console.log('First 250 cities country counts:', first250CountryCounts);

  // The remaining cities are newly imported.
  const newlyImported = cities.slice(250);
  console.log('Newly imported cities count:', newlyImported.length);

  // Let's see how many of the first 250 cities are in the Asia CSV and mapped in MAP_PATH.
  let mappedPreExisting = 0;
  const mappedPreExistingDetails: Record<string, number> = {};

  for (const [sourceId, uuid] of Object.entries(sourceToUuidMap)) {
    if (first250Keys.has(uuid)) {
      mappedPreExisting++;
      const dbCity = first250.find(c => c.id === uuid);
      if (dbCity) {
        mappedPreExistingDetails[dbCity.countryIso2Code] = (mappedPreExistingDetails[dbCity.countryIso2Code] || 0) + 1;
      }
    }
  }

  console.log('Mapped pre-existing (from the first 250) in Asia map:', mappedPreExisting);
  console.log('Mapped pre-existing by country:', mappedPreExistingDetails);

  await prisma.$disconnect();
}

main().catch(console.error);
