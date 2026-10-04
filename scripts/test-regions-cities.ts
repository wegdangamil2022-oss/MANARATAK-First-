import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

// Reconstruct DATABASE_URL for Prisma to use PostgreSQL via direct socket or host
const host = encodeURIComponent(process.env.SQL_HOST || '');
const db = encodeURIComponent(process.env.SQL_DB_NAME || '');
const user = process.env.SQL_USER || '';
const pass = encodeURIComponent(process.env.SQL_PASSWORD || process.env.SQL_ADMIN_PASSWORD || process.env.DB_APPLICATION_PASSWORD || '');
process.env.DATABASE_URL = `postgresql://${user}:${pass}@localhost/${db}?host=${host}`;

const prisma = new PrismaClient();

const BASE_URL = 'http://localhost:3000/api/v1';
const TEST_SUFFIX = Math.floor(1000 + Math.random() * 9000).toString();
const REGION_A_CODE = `M10TESTA${TEST_SUFFIX}`;
const REGION_B_CODE = `M10TESTB${TEST_SUFFIX}`;
const CITY_NAME = `M10TESTCITY${TEST_SUFFIX}`;

async function main() {
  console.log('=== STARTING REGIONS & CITIES COMPREHENSIVE ACCEPTANCE TEST SUITE ===');
  console.log(`Region A Code: ${REGION_A_CODE}`);
  console.log(`Region B Code: ${REGION_B_CODE}`);
  console.log(`City Name: ${CITY_NAME}`);
  console.log(`Target Country: SA (Saudi Arabia)`);
  console.log('----------------------------------------------------');

  const results: Record<string, { status: 'PASS' | 'FAIL' | 'BLOCKED'; detail?: string }> = {
    '1. Authentic Login & auth/me Check': { status: 'BLOCKED' },
    '2. Admin Create Region A with Synonyms': { status: 'BLOCKED' },
    '3. Idempotency & Optimistic Locking': { status: 'BLOCKED' },
    '4. Create Region B, City, Separated Labels & Filters': { status: 'BLOCKED' },
    '5. Invalidation & Security (CSRF, Auth, Idempotency)': { status: 'BLOCKED' },
    '6. Deprecation & Decommissioning Limits': { status: 'BLOCKED' },
  };

  let authCookies = '';
  let csrfToken = '';
  let regionAId = '';
  let regionBId = '';
  let cityId = '';
  let regionAVersion = 1;

  try {
    // ==========================================
    // STEP 1: LOGIN & AUTH/ME & CSRF TOKEN
    // ==========================================
    console.log('[Step 1] Attempting authentic login...');
    const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'wegdangamil2022@gmail.com',
        password: 'wegdan1234@1234',
        rememberMe: true,
      }),
    });

    if (loginResponse.status !== 200) {
      const body = await loginResponse.text();
      throw new Error(`Login failed with status ${loginResponse.status}: ${body}`);
    }

    const setCookieHeaders = loginResponse.headers.getSetCookie();
    if (!setCookieHeaders.length) {
      throw new Error('No Set-Cookie headers returned from login endpoint.');
    }

    // Extract access & refresh cookies
    const accessCookie = setCookieHeaders.find(c => c.startsWith('manaratak_access='))?.split(';')[0];
    const refreshCookie = setCookieHeaders.find(c => c.startsWith('manaratak_refresh='))?.split(';')[0];

    if (!accessCookie || !refreshCookie) {
      throw new Error('Required cookies (manaratak_access/manaratak_refresh) not found in response headers.');
    }

    authCookies = `${accessCookie}; ${refreshCookie}`;
    console.log('[Step 1] Login successful, cookies stored.');

    // Fetch CSRF Token using Refresh Cookie
    console.log('[Step 1] Fetching CSRF Token...');
    const csrfResponse = await fetch(`${BASE_URL}/auth/csrf-token`, {
      method: 'GET',
      headers: {
        'Cookie': authCookies,
      },
    });

    if (csrfResponse.status !== 200) {
      const body = await csrfResponse.text();
      throw new Error(`Failed to fetch CSRF token: ${body}`);
    }

    const csrfData = await csrfResponse.json();
    csrfToken = csrfData.data?.csrfToken;
    if (!csrfToken) {
      throw new Error(`CSRF token not found in response: ${JSON.stringify(csrfData)}`);
    }
    console.log('[Step 1] CSRF token successfully retrieved.');

    // Verify GET /auth/me
    console.log('[Step 1] Testing /auth/me to verify session is active...');
    const meResponse = await fetch(`${BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Cookie': authCookies,
      },
    });

    if (meResponse.status !== 200) {
      const body = await meResponse.text();
      throw new Error(`GET /auth/me failed with status ${meResponse.status}: ${body}`);
    }

    const meData = await meResponse.json();
    if (!meData.data || meData.data.primaryEmail !== 'wegdangamil2022@gmail.com') {
      throw new Error(`Unexpected /auth/me payload: ${JSON.stringify(meData)}`);
    }

    console.log(`[Step 1] GET /auth/me returned correct active identity: ${meData.data.displayName}`);
    results['1. Authentic Login & auth/me Check'] = { status: 'PASS', detail: `Identity: ${meData.data.displayName}` };

    // ==========================================
    // STEP 2: CREATE REGION A WITH SYNONYMS
    // ==========================================
    console.log('\n[Step 2] Attempting to create Region A under SA...');
    const idempotencyKeyA = `idem-key-create-region-a-${TEST_SUFFIX}`;
    const createRegionAResponse = await fetch(`${BASE_URL}/admin/reference-data/regions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookies,
        'Idempotency-Key': idempotencyKeyA,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({
        countryIso2Code: 'SA',
        regionCode: REGION_A_CODE,
        name: `Region A ${REGION_A_CODE}`,
        nameAr: `المنطقة أ ${REGION_A_CODE}`,
        localName: `Local A ${REGION_A_CODE}`,
        regionType: 'PROVINCE',
        aliases: [
          { alias: `Alias A1 ${REGION_A_CODE}`, locale: 'en', aliasType: 'COMMON' },
          { alias: `Alias A2 ${REGION_A_CODE}`, locale: 'ar', aliasType: 'TRANSLITERATION' },
        ],
      }),
    });

    if (createRegionAResponse.status !== 201) {
      const body = await createRegionAResponse.text();
      throw new Error(`Failed to create Region A: ${body}`);
    }

    const createRegionAData = await createRegionAResponse.json();
    regionAId = createRegionAData.id;
    if (!regionAId) {
      throw new Error(`Create Region A response did not include id: ${JSON.stringify(createRegionAData)}`);
    }
    console.log(`[Step 2] Region A created successfully. ID: ${regionAId}`);

    // Verify persistence & Audit/Outbox via direct DB check
    console.log('[Step 2] Verifying stability of UUID, versionNumber, tracking fields, Audit, and Outbox in Database...');
    const dbRegionA = await prisma.administrativeRegion.findUnique({
      where: { id: regionAId },
    });

    if (!dbRegionA) {
      throw new Error('Region A not found in Database after creation!');
    }

    if (dbRegionA.regionCode !== REGION_A_CODE || dbRegionA.versionNumber !== 1) {
      throw new Error(`Region A DB verification failed: ${JSON.stringify(dbRegionA)}`);
    }

    console.log(`[Step 2] DB Region A version: ${dbRegionA.versionNumber}, state: ${dbRegionA.lifecycleState}, createdAt: ${dbRegionA.createdAt}`);

    // Check AuditRecord
    const dbAudits = await prisma.auditRecord.findMany({
      where: { targetId: regionAId },
      orderBy: { createdAt: 'desc' },
    });
    console.log(`[Step 2] Found ${dbAudits.length} DB Audit logs for Region A ID.`);
    if (dbAudits.length === 0) {
      throw new Error('No AuditRecord found for Region A creation in Database!');
    }
    console.log(`[Step 2] Audit log action: ${dbAudits[0].action}, category: ${dbAudits[0].category}`);

    // Check TransactionalOutboxRecord
    const dbOutbox = await prisma.transactionalOutboxRecord.findMany({
      where: { eventType: 'REFERENCE_REGION_UPSERTED' },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    console.log(`[Step 2] Found ${dbOutbox.length} REFERENCE_REGION_UPSERTED outbox records.`);

    if (dbOutbox.length === 0) {
      throw new Error('No TransactionalOutboxRecord found for Region A creation!');
    }

    results['2. Admin Create Region A with Synonyms'] = {
      status: 'PASS',
      detail: `ID: ${regionAId}, Audits: ${dbAudits.length}, Outbox: ${dbOutbox.length}`,
    };

    // ==========================================
    // STEP 3: IDEMPOTENCY & LOCKING
    // ==========================================
    console.log('\n[Step 3] Testing Idempotency and Lock mechanisms...');
    
    // 3.1: Re-send exactly same request with same Idempotency-Key
    console.log('[Step 3.1] Re-sending exact creation payload with same Idempotency-Key...');
    const replayRegionAResponse = await fetch(`${BASE_URL}/admin/reference-data/regions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookies,
        'Idempotency-Key': idempotencyKeyA,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({
        countryIso2Code: 'SA',
        regionCode: REGION_A_CODE,
        name: `Region A ${REGION_A_CODE}`,
        nameAr: `المنطقة أ ${REGION_A_CODE}`,
        localName: `Local A ${REGION_A_CODE}`,
        regionType: 'PROVINCE',
        aliases: [
          { alias: `Alias A1 ${REGION_A_CODE}`, locale: 'en', aliasType: 'COMMON' },
          { alias: `Alias A2 ${REGION_A_CODE}`, locale: 'ar', aliasType: 'TRANSLITERATION' },
        ],
      }),
    });

    console.log(`[Step 3.1] Replay response status: ${replayRegionAResponse.status}, Replayed header: ${replayRegionAResponse.headers.get('Idempotency-Replayed')}`);
    if (replayRegionAResponse.status !== 201 && replayRegionAResponse.status !== 200) {
      throw new Error(`Idempotency replay failed with status ${replayRegionAResponse.status}`);
    }

    // 3.2: Send different payload with same Idempotency-Key -> Conflict
    console.log('[Step 3.2] Sending different payload with same Idempotency-Key...');
    const conflictResponse = await fetch(`${BASE_URL}/admin/reference-data/regions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookies,
        'Idempotency-Key': idempotencyKeyA,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({
        countryIso2Code: 'SA',
        regionCode: REGION_A_CODE,
        name: 'Conflict Payload',
      }),
    });

    console.log(`[Step 3.2] Conflict response status: ${conflictResponse.status}`);
    if (conflictResponse.status !== 409) {
      throw new Error(`Expected conflict (409) for key payload conflict, but got status ${conflictResponse.status}`);
    }
    const conflictData = await conflictResponse.json();
    console.log(`[Step 3.2] Conflict response body: ${JSON.stringify(conflictData)}`);

    // 3.3: Edit with current version number -> Success (Optimistic Locking)
    console.log(`[Step 3.3] Editing Region A with current versionNumber = 1...`);
    const updateResponse = await fetch(`${BASE_URL}/admin/reference-data/regions/${regionAId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookies,
        'Idempotency-Key': `idem-key-update-region-a-1-${TEST_SUFFIX}`,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({
        expectedVersion: 1,
        countryIso2Code: 'SA',
        regionCode: REGION_A_CODE,
        name: `Region A ${REGION_A_CODE} Modified`,
        nameAr: `المنطقة أ ${REGION_A_CODE} معدل`,
      }),
    });

    if (updateResponse.status !== 200) {
      const body = await updateResponse.text();
      throw new Error(`Update Region A failed with status ${updateResponse.status}: ${body}`);
    }
    const updateData = await updateResponse.json();
    regionAVersion = updateData.versionNumber;
    console.log(`[Step 3.3] Update successful. New versionNumber is ${regionAVersion}`);
    if (regionAVersion !== 2) {
      throw new Error(`Expected versionNumber to be 2, but got ${regionAVersion}`);
    }

    // 3.4: Try updating again with stale version = 1 -> Rejected
    console.log(`[Step 3.4] Trying to update with stale versionNumber = 1...`);
    const staleUpdateResponse = await fetch(`${BASE_URL}/admin/reference-data/regions/${regionAId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookies,
        'Idempotency-Key': `idem-key-update-region-a-stale-${TEST_SUFFIX}`,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({
        expectedVersion: 1, // Stale! Current is 2
        countryIso2Code: 'SA',
        regionCode: REGION_A_CODE,
        name: 'Stale Attempt',
      }),
    });

    console.log(`[Step 3.4] Stale update response status: ${staleUpdateResponse.status}`);
    if (staleUpdateResponse.status !== 409 && staleUpdateResponse.status !== 422) {
      throw new Error(`Expected optimistic locking rejection (409 or 422) for stale version, but got status ${staleUpdateResponse.status}`);
    }
    console.log(`[Step 3.4] Stale update rejected successfully.`);
    results['3. Idempotency & Optimistic Locking'] = { status: 'PASS', detail: `Version updated from 1 to ${regionAVersion}. Idempotency and locking verified.` };

    // ==========================================
    // STEP 4: RELATIONSHIPS
    // ==========================================
    console.log('\n[Step 4] Creating Region B and City linked to Region A...');
    
    // 4.1: Create Region B
    const createRegionBResponse = await fetch(`${BASE_URL}/admin/reference-data/regions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookies,
        'Idempotency-Key': `idem-key-create-region-b-${TEST_SUFFIX}`,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({
        countryIso2Code: 'SA',
        regionCode: REGION_B_CODE,
        name: `Region B ${REGION_B_CODE}`,
        regionType: 'PROVINCE',
      }),
    });

    if (createRegionBResponse.status !== 201) {
      const body = await createRegionBResponse.text();
      throw new Error(`Failed to create Region B: ${body}`);
    }
    const createRegionBData = await createRegionBResponse.json();
    regionBId = createRegionBData.id;
    console.log(`[Step 4] Region B created successfully. ID: ${regionBId}`);

    // 4.2: Create City linked to Region A
    console.log(`[Step 4.2] Creating city ${CITY_NAME} linked to Region A...`);
    const createCityResponse = await fetch(`${BASE_URL}/admin/reference-data/cities`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookies,
        'Idempotency-Key': `idem-key-create-city-${TEST_SUFFIX}`,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({
        countryIso2Code: 'SA',
        name: CITY_NAME,
        nameAr: `مدينة اختبار ${CITY_NAME}`,
        region: 'Raw Text Region Label', // distinct from the FK
        timezone: 'Asia/Riyadh',
        administrativeRegionId: regionAId, // Region A FK
      }),
    });

    if (createCityResponse.status !== 200) {
      const body = await createCityResponse.text();
      throw new Error(`Failed to create City: ${body}`);
    }
    const createCityData = await createCityResponse.json();
    cityId = createCityData.id;
    console.log(`[Step 4.2] City created successfully. ID: ${cityId}`);

    // Verify separate label in DB
    const dbCity = await prisma.referenceCity.findUnique({
      where: { id: cityId },
    });

    if (!dbCity) {
      throw new Error('City not found in Database after creation!');
    }

    console.log(`[Step 4.2] DB City region label: "${dbCity.region}"`);
    console.log(`[Step 4.2] DB City administrativeRegionId (FK): ${dbCity.administrativeRegionId}`);

    if (dbCity.region !== 'Raw Text Region Label' || dbCity.administrativeRegionId !== regionAId) {
      throw new Error('City region label and administrativeRegionId FK are not correctly separated!');
    }

    // 4.3: Test Filtering by Country and Region
    console.log('[Step 4.3] Verifying filters for country and region...');
    const filterResponse = await fetch(`${BASE_URL}/reference-data/cities?countryIso2Code=SA&administrativeRegionId=${regionAId}`, {
      method: 'GET',
    });

    if (filterResponse.status !== 200) {
      const body = await filterResponse.text();
      throw new Error(`GET /reference-data/cities failed: ${body}`);
    }

    const filterData = await filterResponse.json();
    console.log(`[Step 4.3] Filter returned ${filterData.data?.length || 0} cities.`);
    const foundCity = filterData.data?.find((c: any) => c.id === cityId);
    if (!foundCity) {
      throw new Error('Our test city was not returned by the country and region filter!');
    }
    console.log('[Step 4.3] City filtering verification: SUCCESS');
    results['4. Create Region B, City, Separated Labels & Filters'] = { status: 'PASS', detail: `Region B ID: ${regionBId}, City ID: ${cityId}, Filter check passed.` };

    // ==========================================
    // STEP 5: INVALIDATION & SECURITY CHECKS
    // ==========================================
    console.log('\n[Step 5] Running invalid relationship and security checks...');

    // 5.1: Reject cross-country relationship (Region in country SA linked to city in country YE)
    console.log('[Step 5.1] Testing city in Country YE linked to Region in Country SA...');
    const crossCountryResponse = await fetch(`${BASE_URL}/admin/reference-data/cities`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookies,
        'Idempotency-Key': `idem-key-invalid-city-cross-${TEST_SUFFIX}`,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({
        countryIso2Code: 'YE', // Yemen
        name: 'Invalid Cross City',
        administrativeRegionId: regionAId, // Belongs to SA!
      }),
    });

    console.log(`[Step 5.1] Cross-country response status: ${crossCountryResponse.status}`);
    if (crossCountryResponse.status !== 422 && crossCountryResponse.status !== 400) {
      throw new Error(`Expected validation failure (400 or 422) for cross-country region linkage, but got status ${crossCountryResponse.status}`);
    }
    console.log('[Step 5.1] Cross-country region linkage rejected correctly.');

    // 5.2: Invalid UUID/FK in region FK
    console.log('[Step 5.2] Testing invalid UUID for administrativeRegionId...');
    const invalidUUIDResponse = await fetch(`${BASE_URL}/admin/reference-data/cities`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookies,
        'Idempotency-Key': `idem-key-invalid-city-uuid-${TEST_SUFFIX}`,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({
        countryIso2Code: 'SA',
        name: 'Invalid UUID City',
        administrativeRegionId: 'not-a-valid-uuid', // Invalid!
      }),
    });

    console.log(`[Step 5.2] Invalid UUID response status: ${invalidUUIDResponse.status}`);
    if (invalidUUIDResponse.status !== 400) {
      throw new Error(`Expected Zod validation error (400) for malformed UUID, but got status ${invalidUUIDResponse.status}`);
    }
    console.log('[Step 5.2] Malformed region UUID rejected correctly.');

    // 5.3: Authentication rejection check (Call admin endpoint without cookies)
    console.log('[Step 5.3] Testing endpoint protection without auth cookies...');
    const unauthenticatedResponse = await fetch(`${BASE_URL}/admin/reference-data/regions`, {
      method: 'GET',
    });

    console.log(`[Step 5.3] Unauthenticated response status: ${unauthenticatedResponse.status}`);
    if (unauthenticatedResponse.status !== 401 && unauthenticatedResponse.status !== 403) {
      throw new Error(`Expected unauthorized status (401/403), but got status ${unauthenticatedResponse.status}`);
    }
    console.log('[Step 5.3] Unauthenticated request rejected correctly.');

    // 5.4: CSRF token violation check (POST with cookies but without/invalid X-CSRF-Token)
    console.log('[Step 5.4] Testing CSRF validation with invalid token...');
    const invalidCsrfResponse = await fetch(`${BASE_URL}/admin/reference-data/regions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookies,
        'Idempotency-Key': `idem-key-csrf-viol-${TEST_SUFFIX}`,
        'X-CSRF-Token': 'invalid-token-signature',
      },
      body: JSON.stringify({
        countryIso2Code: 'SA',
        regionCode: `M10CSRF${TEST_SUFFIX}`,
        name: 'CSRF Violation Attempt',
      }),
    });

    console.log(`[Step 5.4] CSRF violation response status: ${invalidCsrfResponse.status}`);
    if (invalidCsrfResponse.status !== 403) {
      throw new Error(`Expected forbidden (403) for CSRF token violation, but got status ${invalidCsrfResponse.status}`);
    }
    console.log('[Step 5.4] CSRF token violation rejected correctly with HTTP 403.');

    // 5.5: Idempotency Key Required violation (POST without Idempotency-Key)
    console.log('[Step 5.5] Testing mutation without Idempotency-Key...');
    const missingIdempotencyResponse = await fetch(`${BASE_URL}/admin/reference-data/regions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookies,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({
        countryIso2Code: 'SA',
        regionCode: `M10IDEM${TEST_SUFFIX}`,
        name: 'Idempotency Violation Attempt',
      }),
    });

    console.log(`[Step 5.5] Missing Idempotency Key response status: ${missingIdempotencyResponse.status}`);
    if (missingIdempotencyResponse.status !== 400) {
      throw new Error(`Expected validation error (400) for missing Idempotency-Key, but got status ${missingIdempotencyResponse.status}`);
    }
    console.log('[Step 5.5] Missing Idempotency-Key rejected correctly.');

    results['5. Invalidation & Security (CSRF, Auth, Idempotency)'] = { status: 'PASS', detail: 'CSRF protection, session requirements, UUID forms, cross-country limits, and Idempotency keys strictly enforced.' };

    // ==========================================
    // STEP 6: LIFECYCLE TRANSITIONS (DEPRECATION)
    // ==========================================
    console.log('\n[Step 6] Testing lifecycle transitions and deprecation boundaries...');

    // 6.1: Transition region A to DEPRECATED
    console.log('[Step 6.1] Transitioning Region A to DEPRECATED...');
    const deprecateResponse = await fetch(`${BASE_URL}/admin/reference-data/governance/REGION/${regionAId}/lifecycle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookies,
        'X-CSRF-Token': csrfToken,
        'Idempotency-Key': `idem-key-deprecate-region-a-${TEST_SUFFIX}`,
      },
      body: JSON.stringify({
        toState: 'DEPRECATED',
        reason: 'Marking Region A as deprecated for acceptance testing.',
        expectedVersion: regionAVersion, // Must match current version (2)
      }),
    });

    if (deprecateResponse.status !== 204) {
      const body = await deprecateResponse.text();
      throw new Error(`Failed to deprecate Region A: ${body}`);
    }
    console.log('[Step 6.1] Region A successfully transitioned to DEPRECATED.');
    
    // Check DB state and city link
    const dbRegionADep = await prisma.administrativeRegion.findUnique({ where: { id: regionAId } });
    regionAVersion = dbRegionADep?.versionNumber ?? 2;
    console.log(`[Step 6.1] Region A version Number is now ${regionAVersion}, State: ${dbRegionADep?.lifecycleState}`);

    const dbCityDep = await prisma.referenceCity.findUnique({ where: { id: cityId } });
    if (!dbCityDep || dbCityDep.administrativeRegionId !== regionAId) {
      throw new Error('City relationship to Region A was broken after deprecation!');
    }
    console.log('[Step 6.1] Existing city relation to Region A remains active and linked.');

    // 6.2: Try to create a NEW city linked to deprecated Region A -> MUST BE REJECTED
    console.log('[Step 6.2] Attempting to create a NEW city linked to deprecated Region A...');
    const newCityDeprecatedLinkResponse = await fetch(`${BASE_URL}/admin/reference-data/cities`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookies,
        'Idempotency-Key': `idem-key-deprecated-city-link-${TEST_SUFFIX}`,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({
        countryIso2Code: 'SA',
        name: 'New City Deprecated Link',
        administrativeRegionId: regionAId, // Deprecated region A
      }),
    });

    console.log(`[Step 6.2] Deprecated region linkage response status: ${newCityDeprecatedLinkResponse.status}`);
    if (newCityDeprecatedLinkResponse.status !== 404 && newCityDeprecatedLinkResponse.status !== 422) {
      throw new Error(`Expected failure (404/422) when linking a new city to a DEPRECATED region, but got status ${newCityDeprecatedLinkResponse.status}`);
    }
    console.log('[Step 6.2] New city linkage to deprecated region successfully rejected.');

    // 6.3: Try to ARCHIVE region A while the city is still linked -> MUST BE REJECTED
    console.log('[Step 6.3] Attempting to archive Region A with linked city...');
    const archiveResponse = await fetch(`${BASE_URL}/admin/reference-data/governance/REGION/${regionAId}/lifecycle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookies,
        'X-CSRF-Token': csrfToken,
        'Idempotency-Key': `idem-key-archive-region-a-${TEST_SUFFIX}`,
      },
      body: JSON.stringify({
        toState: 'ARCHIVED',
        reason: 'Attempting to archive region A with linked city.',
        expectedVersion: regionAVersion,
      }),
    });

    console.log(`[Step 6.3] Archive response status: ${archiveResponse.status}`);
    if (archiveResponse.status !== 422 && archiveResponse.status !== 409) {
      throw new Error(`Expected conflict/invariant failure (422/409) when archiving region with active dependencies, but got status ${archiveResponse.status}`);
    }
    console.log('[Step 6.3] Archiving region with linked cities successfully rejected without deletion or movement.');
    results['6. Deprecation & Decommissioning Limits'] = { status: 'PASS', detail: 'Deprecated region keeps city link, rejects new city link, and rejects archiving.' };

  } catch (error: any) {
    console.error('\n!!! ERROR OCCURRED IN TEST RUN !!!');
    console.error(error);
    process.exitCode = 1;
  } finally {
    // ==========================================
    // STEP 7: CLEANUP & TEARDOWN (OFFICIAL LIFECYCLE)
    // ==========================================
    console.log('\n=== RUNNING DATA CLEANUP (OFFICIAL LIFECYCLE TRANSITIONS) ===');
    try {
      const retire = async (kind: 'CITY' | 'REGION', id: string, target: 'DEPRECATED' | 'ARCHIVED') => {
        const current = kind === 'CITY'
          ? await prisma.referenceCity.findUnique({ where: { id } })
          : await prisma.administrativeRegion.findUnique({ where: { id } });
        if (!current) throw new Error(`Cleanup record missing: ${kind}/${id}`);
        if (current.lifecycleState === target || current.lifecycleState === 'ARCHIVED') return;
        const response = await fetch(`${BASE_URL}/admin/reference-data/governance/${kind}/${id}/lifecycle`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json', Cookie: authCookies,
            'X-CSRF-Token': csrfToken,
            'Idempotency-Key': `idem-key-cleanup-${kind}-${id}-${target}-${TEST_SUFFIX}`,
          },
          body: JSON.stringify({ toState: target, reason: 'Cleanup: Retiring test data.', expectedVersion: current.versionNumber }),
        });
        if (!response.ok) throw new Error(`Cleanup rejected for ${kind}/${id}: HTTP ${response.status}`);
        const saved = kind === 'CITY'
          ? await prisma.referenceCity.findUnique({ where: { id } })
          : await prisma.administrativeRegion.findUnique({ where: { id } });
        if (saved?.lifecycleState !== target) throw new Error(`Cleanup state mismatch for ${kind}/${id}`);
        console.log(`[Cleanup] ${kind}/${id} verified ${target}.`);
      };
      if (cityId) {
        await retire('CITY', cityId, 'DEPRECATED');
        await retire('CITY', cityId, 'ARCHIVED');
      }
      // Archiving a city retains its FK; Region A must remain DEPRECATED.
      if (regionAId) await retire('REGION', regionAId, 'DEPRECATED');
      if (regionBId) {
        await retire('REGION', regionBId, 'DEPRECATED');
        await retire('REGION', regionBId, 'ARCHIVED');
      }
    } catch (cleanError: any) {
      console.warn('[Cleanup Warning] Error during data retirement:', cleanError.message);
      process.exitCode = 1;
    }

    await prisma.$disconnect();
  }

  // ==========================================
  // FINAL REPORT OUTPUT
  // ==========================================
  console.log('\n====================================================');
  console.log('                 ACCEPTANCE REPORT                  ');
  console.log('====================================================');
  console.log('| Requirement | Status | Details |');
  console.log('|---|---|---|');
  for (const [req, data] of Object.entries(results)) {
    console.log(`| ${req} | **${data.status}** | ${data.detail || '-'} |`);
  }
  console.log('====================================================\n');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
