import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';

// Reconstruct DATABASE_URL for Prisma
const host = encodeURIComponent(process.env.SQL_HOST || '');
const db = encodeURIComponent(process.env.SQL_DB_NAME || '');
const user = process.env.SQL_USER || '';
const pass = encodeURIComponent(process.env.SQL_PASSWORD || process.env.SQL_ADMIN_PASSWORD || process.env.DB_APPLICATION_PASSWORD || '');
process.env.DATABASE_URL = `postgresql://${user}:${pass}@localhost/${db}?host=${host}`;

const prisma = new PrismaClient();

const REGION_FILES = {
  asia: 'workspace/reference-data/regions/asia/02_admin_regions_asia.csv',
  oceania: 'workspace/reference-data/regions/oceania/05_admin_regions_oceania.csv',
  europe: 'workspace/reference-data/regions/europe/MANARATAK_Europe_Admin_Regions.csv',
  africa: 'workspace/reference-data/regions/africa/01_admin_regions_africa.csv',
  americas: 'workspace/reference-data/regions/americas/MANARATAK_Americas_Admin_Regions.csv',
};

const CITY_FILES = {
  asia: 'workspace/reference-data/cities/asia/MANARATAK_Asia_Cities_All_Combined.csv',
  europe: 'workspace/reference-data/cities/europe/MANARATAK_Europe_Cities_All_Combined.csv',
  oceania: 'workspace/reference-data/cities/oceania/22_cities_oceania.csv',
  americas: 'workspace/reference-data/cities/americas/MANARATAK_Americas_Cities_All_Combined.csv',
  africa: 'workspace/reference-data/cities/africa/MANARATAK_Africa_Cities_All_Combined.csv',
};

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
  console.log('=== STARTING DRY-RUN ANALYSIS ===');

  // Load active countries
  const activeCountries = await prisma.referenceCountry.findMany({
    where: { lifecycleState: 'ACTIVE' }
  });
  const activeIsoCodes = new Set(activeCountries.map(c => c.iso2Code));
  console.log(`Loaded ${activeIsoCodes.size} ACTIVE countries from DB.`);

  // Load existing regions
  const existingRegions = await prisma.administrativeRegion.findMany();
  const existingRegionMap = new Map<string, string>(); // key: country_code, value: id
  existingRegions.forEach(r => {
    existingRegionMap.set(`${r.countryIso2Code}:${r.regionCode}`, r.id);
  });
  console.log(`Loaded ${existingRegions.length} existing regions from DB.`);

  // Load existing cities
  const existingCities = await prisma.referenceCity.findMany();
  const existingCitySet = new Set(existingCities.map(c => `${c.countryIso2Code}:${c.name.toLowerCase()}`));
  console.log(`Loaded ${existingCities.length} existing cities from DB.`);

  const report: any = {};

  // Analyze Regions
  for (const [continent, filePath] of Object.entries(REGION_FILES)) {
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`);
      continue;
    }
    const lines = fs.readFileSync(filePath, 'utf8').split('\n');
    const headers = parseCSVLine(lines[0]);
    const countryIdx = headers.indexOf('countryIso2');
    const regionCodeIdx = headers.indexOf('regionCode');
    const nameIdx = headers.indexOf('nameEn');

    let total = 0;
    let eligible = 0;
    let preExisting = 0;
    let excludedNoActiveCountry = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      total++;
      const parts = parseCSVLine(line);
      const countryIso = parts[countryIdx];
      const regionCode = parts[regionCodeIdx];

      if (!activeIsoCodes.has(countryIso)) {
        excludedNoActiveCountry++;
      } else if (existingRegionMap.has(`${countryIso}:${regionCode}`)) {
        preExisting++;
      } else {
        eligible++;
      }
    }

    report[continent] = {
      regions: { total, eligible, preExisting, excludedNoActiveCountry }
    };
  }

  // Analyze Cities
  for (const [continent, filePath] of Object.entries(CITY_FILES)) {
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`);
      continue;
    }
    const lines = fs.readFileSync(filePath, 'utf8').split('\n');
    const headers = parseCSVLine(lines[0]);
    const countryIdx = headers.indexOf('countryIso2');
    const nameIdx = headers.indexOf('cityNameEn');
    const regionCodeIdx = headers.indexOf('regionCode');

    let total = 0;
    let eligible = 0;
    let preExisting = 0;
    let excludedNoActiveCountry = 0;
    let excludedNoRegion = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      total++;
      const parts = parseCSVLine(line);
      const countryIso = parts[countryIdx];
      const cityName = parts[nameIdx];
      const regionCode = parts[regionCodeIdx];

      if (!activeIsoCodes.has(countryIso)) {
        excludedNoActiveCountry++;
      } else if (existingCitySet.has(`${countryIso}:${cityName?.toLowerCase()}`)) {
        preExisting++;
      } else if (!regionCode) {
        excludedNoRegion++;
      } else {
        eligible++;
      }
    }

    if (!report[continent]) report[continent] = {};
    report[continent].cities = { total, eligible, preExisting, excludedNoActiveCountry, excludedNoRegion };
  }

  console.log('\n=== DRY-RUN FINAL REPORT JSON ===');
  console.log(JSON.stringify(report, null, 2));

  await prisma.$disconnect();
}

main().catch(console.error);
