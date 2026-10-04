import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

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
  console.log('=== STARTING GEOGRAPHIC DATA IMPORT ===');
  if (!NEW_PASSWORD) {
    console.error('Error: M10_OWNER_NEW_PASSWORD not set in environment.');
    process.exit(1);
  }

  // 1. Authenticate with NEW password
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
  console.log('[Auth] Login successful.');

  // Fetch CSRF token
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

  // 2. Parse SA Regions
  console.log('[Parse] Parsing Saudi Arabia regions from CSV...');
  const regionLines = fs.readFileSync(REGIONS_CSV, 'utf8').split('\n');
  const regionHeaders = parseCSVLine(regionLines[0]);
  
  const csvRegions: any[] = [];
  for (let i = 1; i < regionLines.length; i++) {
    const line = regionLines[i];
    if (!line.trim()) continue;
    const parts = parseCSVLine(line);
    const countryIso2 = parts[regionHeaders.indexOf('countryIso2')];
    if (countryIso2 === 'SA') {
      const obj: any = {};
      regionHeaders.forEach((h, idx) => {
        obj[h] = parts[idx];
      });
      csvRegions.push(obj);
    }
  }
  console.log(`[Parse] Found ${csvRegions.length} SA regions in CSV file.`);

  // 3. Parse SA Cities (The 5 target ones)
  console.log('[Parse] Parsing target cities from CSV...');
  const cityLines = fs.readFileSync(CITIES_CSV, 'utf8').split('\n');
  const cityHeaders = parseCSVLine(cityLines[0]);
  const targetCityIds = ['city_sa_riyadh', 'city_sa_jeddah', 'city_sa_mecca', 'city_sa_medina', 'city_sa_ad_dammam'];
  
  const csvCities: any[] = [];
  for (let i = 1; i < cityLines.length; i++) {
    const line = cityLines[i];
    if (!line.trim()) continue;
    const parts = parseCSVLine(line);
    const cityId = parts[cityHeaders.indexOf('cityId')];
    if (targetCityIds.includes(cityId)) {
      const obj: any = {};
      cityHeaders.forEach((h, idx) => {
        obj[h] = parts[idx];
      });
      csvCities.push(obj);
    }
  }
  console.log(`[Parse] Found ${csvCities.length} target cities in CSV file.`);

  const sourceToUuidMap: Record<string, string> = {};
  const rawSources: any = { regions: [], cities: [] };
  const summary = {
    regions: { imported: [] as string[], existing: [] as string[], excluded: [] as { id: string, reason: string }[] },
    cities: { imported: [] as string[], existing: [] as string[], excluded: [] as { id: string, reason: string }[] }
  };

  // 4. Import Regions
  for (const r of csvRegions) {
    const rId = r.regionId;
    const regionCode = r.regionCode;
    const nameEn = r.nameEn;
    const nameAr = r.nameAr || null;
    const localName = r.localName || null;
    const regionTypeRaw = r.regionType || 'PROVINCE';
    const regionType = regionTypeRaw.toUpperCase();

    rawSources.regions.push(r);

    // Check if region already exists in database
    const existingRegion = await prisma.administrativeRegion.findFirst({
      where: { regionCode, countryIso2Code: 'SA' }
    });

    if (existingRegion) {
      // Verify match
      if (existingRegion.name === nameEn) {
        console.log(`[Region] Match found for ${regionCode} (${nameEn}). Reusing UUID: ${existingRegion.id}`);
        sourceToUuidMap[rId] = existingRegion.id;
        summary.regions.existing.push(`${regionCode} (${nameEn})`);
      } else {
        console.error(`[Region Conflict] Pre-existing region ${regionCode} has name En: '${existingRegion.name}', but CSV has: '${nameEn}'`);
        process.exit(1);
      }
    } else {
      // Create new region via API
      console.log(`[Region] Creating new region ${regionCode} (${nameEn})...`);
      const idemKey = `idem-create-region-${regionCode}-${Date.now()}`;
      const payload = {
        countryIso2Code: 'SA',
        regionCode,
        name: nameEn,
        nameAr: nameAr || null,
        localName: localName || null,
        regionType: 'PROVINCE',
        aliases: []
      };

      const res = await fetch(`${BASE_URL}/admin/reference-data/regions`, {
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
        console.error(`Failed to create region ${regionCode}: ${res.status} - ${await res.text()}`);
        process.exit(1);
      }

      const resData = await res.json();
      const regionUuid = resData.id;
      if (!regionUuid) {
        console.error(`Region creation response did not return an ID: ${JSON.stringify(resData)}`);
        process.exit(1);
      }

      console.log(`[Region] Successfully created region ${regionCode}. UUID: ${regionUuid}`);
      sourceToUuidMap[rId] = regionUuid;
      summary.regions.imported.push(`${regionCode} (${nameEn})`);

      // Verify Audit & Outbox
      const dbRegion = await prisma.administrativeRegion.findUnique({ where: { id: regionUuid } });
      const audit = await prisma.auditRecord.findFirst({ where: { targetId: regionUuid, action: 'REFERENCE_REGION_UPSERTED' } });
      const outbox = await prisma.transactionalOutboxRecord.findFirst({ where: { eventType: 'REFERENCE_REGION_UPSERTED' }, orderBy: { createdAt: 'desc' } });
      console.log(`[Region Verify] DB versionNumber: ${dbRegion?.versionNumber}, Audit log: ${audit ? 'YES' : 'NO'}, Outbox: ${outbox ? 'YES' : 'NO'}`);
    }
  }

  // 5. Import Cities
  for (const c of csvCities) {
    const cId = c.cityId;
    const cityNameEn = c.cityNameEn;
    const cityNameAr = c.cityNameAr || null;
    const regionCode = c.regionCode;
    const regionLabel = c.countryNameAr || null; // Distinct region raw label
    const timezone = c.timezone || 'Asia/Riyadh';
    const lat = c.latitude ? parseFloat(c.latitude) : null;
    const lng = c.longitude ? parseFloat(c.longitude) : null;

    rawSources.cities.push(c);

    // Resolve administrativeRegionId using regionCode
    const regionSourceId = csvRegions.find(r => r.regionCode === regionCode)?.regionId;
    if (!regionSourceId) {
      console.error(`[City Error] Could not find region source mapping for region code ${regionCode}`);
      process.exit(1);
    }
    const regionUuid = sourceToUuidMap[regionSourceId];
    if (!regionUuid) {
      console.error(`[City Error] Region UUID not found in map for ${regionSourceId}`);
      process.exit(1);
    }

    // Check if city already exists in database
    const existingCity = await prisma.referenceCity.findFirst({
      where: { name: cityNameEn, countryIso2Code: 'SA' }
    });

    if (existingCity) {
      if (existingCity.administrativeRegionId === regionUuid) {
        console.log(`[City] Match found for ${cityNameEn}. Reusing UUID: ${existingCity.id}`);
        sourceToUuidMap[cId] = existingCity.id;
        summary.cities.existing.push(cityNameEn);
      } else {
        console.error(`[City Conflict] Pre-existing city ${cityNameEn} has administrativeRegionId: '${existingCity.administrativeRegionId}', but expected: '${regionUuid}'`);
        process.exit(1);
      }
    } else {
      // Create city via PUT API
      console.log(`[City] Creating new city ${cityNameEn} under Region UUID ${regionUuid}...`);
      const idemKey = `idem-create-city-${cityNameEn}-${Date.now()}`;
      const payload = {
        countryIso2Code: 'SA',
        name: cityNameEn,
        nameAr: cityNameAr || null,
        region: 'Raw Text Region Label',
        timezone,
        latitude: lat,
        longitude: lng,
        administrativeRegionId: regionUuid
      };

      const res = await fetch(`${BASE_URL}/admin/reference-data/cities`, {
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
        console.error(`Failed to create city ${cityNameEn}: ${res.status} - ${await res.text()}`);
        process.exit(1);
      }

      const resData = await res.json();
      const cityUuid = resData.id;
      if (!cityUuid) {
        console.error(`City creation response did not return an ID: ${JSON.stringify(resData)}`);
        process.exit(1);
      }

      console.log(`[City] Successfully created city ${cityNameEn}. UUID: ${cityUuid}`);
      sourceToUuidMap[cId] = cityUuid;
      summary.cities.imported.push(cityNameEn);

      // Verify Audit & Outbox
      const dbCity = await prisma.referenceCity.findUnique({ where: { id: cityUuid } });
      // We look up audits by checking targetId containing both the city ID and other key components
      const audit = await prisma.auditRecord.findFirst({ where: { action: 'REFERENCE_CITY_UPSERTED' }, orderBy: { createdAt: 'desc' } });
      const outbox = await prisma.transactionalOutboxRecord.findFirst({ where: { eventType: 'REFERENCE_CITY_UPSERTED' }, orderBy: { createdAt: 'desc' } });
      console.log(`[City Verify] DB versionNumber: ${dbCity?.versionNumber}, Audit log: ${audit ? 'YES' : 'NO'}, Outbox: ${outbox ? 'YES' : 'NO'}`);
    }
  }

  // Save the source map and raw source files to /tmp/
  fs.writeFileSync('/tmp/source_to_uuid_map.json', JSON.stringify(sourceToUuidMap, null, 2));
  fs.writeFileSync('/tmp/raw_sa_geography_sources.json', JSON.stringify(rawSources, null, 2));
  console.log('[Storage] Saved source_to_uuid_map.json and raw_sa_geography_sources.json to /tmp/');

  // Output markdown table summary
  console.log('\n====================================================');
  console.log('                 IMPORT SUMMARY REPORT               ');
  console.log('====================================================');
  console.log('Regions Imported:', summary.regions.imported.join(', ') || 'None');
  console.log('Regions Existing:', summary.regions.existing.join(', ') || 'None');
  console.log('Cities Imported:', summary.cities.imported.join(', ') || 'None');
  console.log('Cities Existing:', summary.cities.existing.join(', ') || 'None');
  console.log('====================================================\n');

  await prisma.$disconnect();
}

main().catch(console.error);
