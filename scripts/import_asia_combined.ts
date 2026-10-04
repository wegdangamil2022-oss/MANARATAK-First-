import { PrismaClient } from '@prisma/client';
import { randomUUID, createHash } from 'node:crypto';
import fs from 'node:fs';

// Reconstruct DATABASE_URL for Prisma
const host = encodeURIComponent(process.env.SQL_HOST || '');
const db = encodeURIComponent(process.env.SQL_DB_NAME || '');
const user = process.env.SQL_USER || '';
const pass = encodeURIComponent(process.env.SQL_PASSWORD || process.env.SQL_ADMIN_PASSWORD || process.env.DB_APPLICATION_PASSWORD || '');
process.env.DATABASE_URL = `postgresql://${user}:${pass}@localhost/${db}?host=${host}`;

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000/api/v1';
const OWNER_EMAIL = 'wegdangamil2022@gmail.com';
const NEW_PASSWORD = process.env.M10_OWNER_NEW_PASSWORD || '';

const REGIONS_CSV = './workspace/reference-data/regions/asia/02_admin_regions_asia.csv';
const CITIES_CSV = './workspace/reference-data/cities/asia/MANARATAK_Asia_Cities_All_Combined.csv';

const CHECKPOINT_PATH = '/tmp/import_asia_checkpoint.json';
const MAP_PATH = '/tmp/asia_source_to_uuid_map.json';
const RAW_SOURCES_PATH = '/tmp/raw_asia_geography_sources.json';

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

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url: string, options: any, maxRetries = 10): Promise<Response> {
  let attempt = 0;
  while (attempt < maxRetries) {
    const res = await fetch(url, options);
    if (res.status === 429) {
      attempt++;
      const resetHeader = res.headers.get('X-RateLimit-Reset');
      const waitTime = resetHeader ? Math.max(2000, (parseInt(resetHeader, 10) - Date.now()) + 1000) : 5000;
      console.log(`[Rate Limit 429] Hit rate limit on attempt ${attempt}. Waiting ${waitTime}ms before retry...`);
      await sleep(waitTime);
      continue;
    }
    return res;
  }
  throw new Error(`Failed after ${maxRetries} rate-limited attempts.`);
}

async function main() {
  console.log('=== STARTING ASIA FULL GEOGRAPHIC IMPORT WITH RETRIES ===');
  if (!NEW_PASSWORD) {
    console.error('Error: M10_OWNER_NEW_PASSWORD is not set.');
    process.exit(1);
  }

  // 1. Login & CSRF
  console.log('[Auth] Logging in via official API...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: OWNER_EMAIL, password: NEW_PASSWORD, rememberMe: true })
  });

  if (loginRes.status !== 200) {
    console.error(`Login failed with status: ${loginRes.status}`);
    process.exit(1);
  }

  const setCookies = loginRes.headers.getSetCookie();
  const accessCookie = setCookies.find(c => c.startsWith('manaratak_access='))?.split(';')[0];
  const refreshCookie = setCookies.find(c => c.startsWith('manaratak_refresh='))?.split(';')[0];
  if (!accessCookie || !refreshCookie) {
    console.error('Auth cookies missing in login response.');
    process.exit(1);
  }
  const authCookies = `${accessCookie}; ${refreshCookie}`;

  const csrfRes = await fetch(`${BASE_URL}/auth/csrf-token`, {
    method: 'GET',
    headers: { 'Cookie': authCookies }
  });
  if (csrfRes.status !== 200) {
    console.error(`Failed to fetch CSRF token: ${csrfRes.status}`);
    process.exit(1);
  }
  const csrfData = await csrfRes.json();
  const csrfToken = csrfData.data?.csrfToken;
  if (!csrfToken) {
    console.error('CSRF token not found.');
    process.exit(1);
  }
  console.log('[Auth] Logged in and CSRF token retrieved.');

  // Load Active Countries
  const activeCountries = await prisma.referenceCountry.findMany({ where: { lifecycleState: 'ACTIVE' } });
  const activeIsoCodes = new Set(activeCountries.map(c => c.iso2Code));
  console.log(`[Database] Loaded ${activeIsoCodes.size} active countries.`);

  // Load state or checkpoint
  let checkpoint: {
    lastProcessedRegionLine: number;
    lastProcessedCityLine: number;
    regionsSummary: { imported: number; existing: number; excluded: number };
    citiesSummary: { imported: number; existing: number; excluded: number; conflicts: number };
  } = {
    lastProcessedRegionLine: 0,
    lastProcessedCityLine: 0,
    regionsSummary: { imported: 0, existing: 0, excluded: 0 },
    citiesSummary: { imported: 0, existing: 0, excluded: 0, conflicts: 0 }
  };

  if (fs.existsSync(CHECKPOINT_PATH)) {
    checkpoint = JSON.parse(fs.readFileSync(CHECKPOINT_PATH, 'utf8'));
    console.log(`[Checkpoint] Resuming from checkpoint: Region line ${checkpoint.lastProcessedRegionLine}, City line ${checkpoint.lastProcessedCityLine}`);
  }

  let sourceToUuidMap: Record<string, string> = {};
  if (fs.existsSync(MAP_PATH)) {
    sourceToUuidMap = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));
  }

  // Load source files
  const regionLines = fs.readFileSync(REGIONS_CSV, 'utf8').split('\n');
  const regionHeaders = parseCSVLine(regionLines[0]);

  const cityLines = fs.readFileSync(CITIES_CSV, 'utf8').split('\n');
  const cityHeaders = parseCSVLine(cityLines[0]);

  // Pre-load SA regions and cities to reuse
  const saRegionCodes = ['SA-01', 'SA-02', 'SA-03', 'SA-04', 'SA-05', 'SA-06', 'SA-07', 'SA-08', 'SA-09', 'SA-10', 'SA-11', 'SA-12', 'SA-14'];

  // ===================================================
  // PHASE 1: REGIONS IMPORT
  // ===================================================
  console.log('\n--- PHASE 1: IMPORTING REGIONS ---');
  let regionChunkCount = 0;
  for (let i = Math.max(1, checkpoint.lastProcessedRegionLine + 1); i < regionLines.length; i++) {
    const line = regionLines[i];
    if (!line.trim()) continue;

    const parts = parseCSVLine(line);
    const rId = parts[regionHeaders.indexOf('regionId')];
    const countryIso2 = parts[regionHeaders.indexOf('countryIso2')];
    const regionCode = parts[regionHeaders.indexOf('regionCode')];
    const nameEn = parts[regionHeaders.indexOf('nameEn')];
    const nameAr = parts[regionHeaders.indexOf('nameAr')] || null;
    const localName = parts[regionHeaders.indexOf('localName')] || null;
    const regionTypeRaw = parts[regionHeaders.indexOf('regionType')] || 'PROVINCE';

    // 1. Exclude if country is not active
    if (!activeIsoCodes.has(countryIso2)) {
      checkpoint.regionsSummary.excluded++;
      checkpoint.lastProcessedRegionLine = i;
      continue;
    }

    // 2. Check if already exists in DB
    const existingRegion = await prisma.administrativeRegion.findFirst({
      where: { regionCode, countryIso2Code: countryIso2 }
    });

    if (existingRegion) {
      if (existingRegion.name === nameEn || saRegionCodes.includes(regionCode)) {
        sourceToUuidMap[rId] = existingRegion.id;
        checkpoint.regionsSummary.existing++;
      } else {
        console.warn(`[Region Conflict] Region ${regionCode} already exists with different name: DB=${existingRegion.name}, CSV=${nameEn}. Skipping.`);
        checkpoint.regionsSummary.excluded++;
      }
    } else {
      // 3. Create Region via POST API
      const idemKey = `idem-create-region-${countryIso2}-${regionCode}-${Date.now()}`;
      const payload = {
        countryIso2Code: countryIso2,
        regionCode,
        name: nameEn,
        nameAr: nameAr || null,
        localName: localName || null,
        regionType: 'PROVINCE',
        aliases: []
      };

      const res = await fetchWithRetry(`${BASE_URL}/admin/reference-data/regions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': authCookies,
          'X-CSRF-Token': csrfToken,
          'Idempotency-Key': idemKey
        },
        body: JSON.stringify(payload)
      });

      if (res.status !== 201) {
        console.error(`Failed to create region ${regionCode} in country ${countryIso2}: HTTP ${res.status}`);
        process.exit(1);
      }

      const resData = await res.json();
      const regionUuid = resData.id;
      if (!regionUuid) {
        console.error(`No ID returned for region ${regionCode}`);
        process.exit(1);
      }

      sourceToUuidMap[rId] = regionUuid;
      checkpoint.regionsSummary.imported++;
    }

    checkpoint.lastProcessedRegionLine = i;
    regionChunkCount++;

    // Small delay to prevent aggressive rate-limiting
    await sleep(80);

    // Process in chunks of 100
    if (regionChunkCount % 100 === 0 || i === regionLines.length - 1) {
      console.log(`[Regions Progress] Chunk of 100 regions processed. Total Imported: ${checkpoint.regionsSummary.imported}, Existing: ${checkpoint.regionsSummary.existing}, Excluded: ${checkpoint.regionsSummary.excluded}`);
      // Save progress to checkpoint
      fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify(checkpoint, null, 2));
      fs.writeFileSync(MAP_PATH, JSON.stringify(sourceToUuidMap, null, 2));
    }
  }

  // ===================================================
  // PHASE 2: CITIES IMPORT
  // ===================================================
  console.log('\n--- PHASE 2: IMPORTING CITIES ---');
  let cityChunkCount = 0;
  const processedKeysInThisRun = new Set<string>();

  for (let i = Math.max(1, checkpoint.lastProcessedCityLine + 1); i < cityLines.length; i++) {
    const line = cityLines[i];
    if (!line.trim()) continue;

    const parts = parseCSVLine(line);
    const cId = parts[cityHeaders.indexOf('cityId')];
    const countryIso2 = parts[cityHeaders.indexOf('countryIso2')];
    const regionCode = parts[cityHeaders.indexOf('regionCode')];
    const cityNameEn = parts[cityHeaders.indexOf('cityNameEn')];
    const cityNameAr = parts[cityHeaders.indexOf('cityNameAr')] || null;
    const regionMatchStatus = parts[cityHeaders.indexOf('regionMatchStatus')];
    const timezone = parts[cityHeaders.indexOf('timezone')] || 'Asia/Riyadh';
    const lat = parts[cityHeaders.indexOf('latitude')] ? parseFloat(parts[cityHeaders.indexOf('latitude')]) : null;
    const lng = parts[cityHeaders.indexOf('longitude')] ? parseFloat(parts[cityHeaders.indexOf('longitude')]) : null;

    // 1. Exclude non-active countries
    if (!activeIsoCodes.has(countryIso2)) {
      checkpoint.citiesSummary.excluded++;
      checkpoint.lastProcessedCityLine = i;
      continue;
    }

    // 2. Exclude if not MATCHED_BY_NORMALIZED_NAME
    if (regionMatchStatus !== 'MATCHED_BY_NORMALIZED_NAME') {
      checkpoint.citiesSummary.excluded++;
      checkpoint.lastProcessedCityLine = i;
      continue;
    }

    // 3. Resolve parent region UUID
    const regionRow = csvRegionsFind(regionLines, regionHeaders, regionCode, countryIso2);
    if (!regionRow) {
      checkpoint.citiesSummary.excluded++;
      checkpoint.lastProcessedCityLine = i;
      continue;
    }
    const regionSourceId = regionRow[regionHeaders.indexOf('regionId')];
    const regionUuid = sourceToUuidMap[regionSourceId];
    if (!regionUuid) {
      checkpoint.citiesSummary.excluded++;
      checkpoint.lastProcessedCityLine = i;
      continue;
    }

    // 4. Calculate canonicalIdentityKey and check for local/DB duplicate
    const key = cityCanonicalIdentityKey({
      countryIso2Code: countryIso2,
      name: cityNameEn,
      administrativeRegionId: regionUuid
    });

    if (processedKeysInThisRun.has(key)) {
      checkpoint.citiesSummary.excluded++;
      checkpoint.lastProcessedCityLine = i;
      continue;
    }
    processedKeysInThisRun.add(key);

    const existingCity = await prisma.referenceCity.findUnique({
      where: { canonicalIdentityKey: key }
    });

    if (existingCity) {
      if (existingCity.name === cityNameEn && existingCity.countryIso2Code === countryIso2) {
        sourceToUuidMap[cId] = existingCity.id;
        checkpoint.citiesSummary.existing++;
      } else {
        console.warn(`[City Conflict] City key collision for ${cityNameEn}: DB name='${existingCity.name}', CSV name='${cityNameEn}'. Skipping.`);
        checkpoint.citiesSummary.conflicts++;
      }
    } else {
      // 5. Create City via PUT API
      const idemKey = `idem-create-city-${countryIso2}-${cityNameEn}-${Date.now()}`;
      const payload = {
        countryIso2Code: countryIso2,
        name: cityNameEn,
        nameAr: cityNameAr || null,
        region: 'Raw Text Region Label',
        timezone,
        latitude: lat,
        longitude: lng,
        administrativeRegionId: regionUuid
      };

      const res = await fetchWithRetry(`${BASE_URL}/admin/reference-data/cities`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': authCookies,
          'X-CSRF-Token': csrfToken,
          'Idempotency-Key': idemKey
        },
        body: JSON.stringify(payload)
      });

      if (res.status !== 200) {
        console.error(`Failed to create city ${cityNameEn}: HTTP ${res.status}`);
        process.exit(1);
      }

      const resData = await res.json();
      const cityUuid = resData.id;
      if (!cityUuid) {
        console.error(`No ID returned for city ${cityNameEn}`);
        process.exit(1);
      }

      sourceToUuidMap[cId] = cityUuid;
      checkpoint.citiesSummary.imported++;
    }

    checkpoint.lastProcessedCityLine = i;
    cityChunkCount++;

    // Small delay to prevent aggressive rate-limiting
    await sleep(80);

    // Process in chunks of 100
    if (cityChunkCount % 100 === 0 || i === cityLines.length - 1) {
      console.log(`[Cities Progress] Chunk of 100 cities processed. Total Imported: ${checkpoint.citiesSummary.imported}, Existing: ${checkpoint.citiesSummary.existing}, Excluded: ${checkpoint.citiesSummary.excluded}, Conflicts: ${checkpoint.citiesSummary.conflicts}`);
      // Save progress to checkpoint
      fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify(checkpoint, null, 2));
      fs.writeFileSync(MAP_PATH, JSON.stringify(sourceToUuidMap, null, 2));
    }
  }

  // Cleanup checkpoint files on success
  if (fs.existsSync(CHECKPOINT_PATH)) fs.unlinkSync(CHECKPOINT_PATH);
  console.log('\n=== ASIA GEOGRAPHIC DATA IMPORT COMPLETED SUCCESSFULLY ===');
  console.log('Summary:');
  console.log(`- Regions Imported: ${checkpoint.regionsSummary.imported}`);
  console.log(`- Regions Reused: ${checkpoint.regionsSummary.existing}`);
  console.log(`- Regions Excluded: ${checkpoint.regionsSummary.excluded}`);
  console.log(`- Cities Imported: ${checkpoint.citiesSummary.imported}`);
  console.log(`- Cities Reused: ${checkpoint.citiesSummary.existing}`);
  console.log(`- Cities Excluded: ${checkpoint.citiesSummary.excluded}`);
  console.log(`- Cities Conflicts: ${checkpoint.citiesSummary.conflicts}`);

  await prisma.$disconnect();
}

function csvRegionsFind(regionLines: string[], regionHeaders: string[], regionCode: string, countryIso2: string): string[] | null {
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

main().catch(console.error);
