import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

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

const CITY_ID = '4bc16adf-9a23-4287-9ba5-c217d96061d9';
const REGION_A_ID = 'e292ccbb-7fa5-4009-b492-aab77226c875';
const REGION_B_ID = 'd5afceb8-a817-4ebc-9f91-6402e28f3344';

async function main() {
  console.log('=== STARTING OFFICIAL LIFECYCLE TRANSITIONS ===');
  if (!NEW_PASSWORD) {
    console.error('Error: M10_OWNER_NEW_PASSWORD is not set in environment!');
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

  // 2. Fetch CSRF token
  console.log('[Auth] Fetching CSRF token...');
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
    console.error('CSRF token not found in response payload.');
    process.exit(1);
  }
  console.log('[Auth] CSRF token retrieved successfully.');

  // Verify auth/me
  console.log('[Auth] Verifying /auth/me...');
  const meRes = await fetch(`${BASE_URL}/auth/me`, {
    method: 'GET',
    headers: { 'Cookie': authCookies }
  });
  if (meRes.status !== 200) {
    console.error(`/auth/me failed with status: ${meRes.status}`);
    process.exit(1);
  }
  const meData = await meRes.json();
  console.log(`[Auth] Logged in as: ${meData.data?.displayName} (${meData.data?.primaryEmail})`);

  // Define transition helper
  const transition = async (entityType: string, id: string, toState: string, reason: string, expectedVersion?: number) => {
    const ts = Date.now();
    const idemKey = `idem-transition-${entityType}-${id}-${toState}-${ts}`;
    console.log(`\n[Transition] ${entityType} ${id} -> ${toState}...`);
    
    const body: any = { toState, reason };
    if (expectedVersion !== undefined) {
      body.expectedVersion = expectedVersion;
    }

    const res = await fetch(`${BASE_URL}/admin/reference-data/governance/${entityType}/${id}/lifecycle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookies,
        'X-CSRF-Token': csrfToken,
        'Idempotency-Key': idemKey
      },
      body: JSON.stringify(body)
    });

    console.log(`[Transition] Status Code: ${res.status}`);
    if (res.status !== 204) {
      const errText = await res.text();
      console.error(`[Transition Failed] HTTP ${res.status}: ${errText}`);
      throw new Error(`Transition of ${entityType} to ${toState} failed!`);
    }

    // Verify DB state immediately after
    console.log(`[Verify] Querying Database for ${entityType} ID: ${id}`);
    let dbRecord: any = null;
    if (entityType === 'CITY') {
      dbRecord = await prisma.referenceCity.findUnique({ where: { id } });
    } else if (entityType === 'REGION') {
      dbRecord = await prisma.administrativeRegion.findUnique({ where: { id } });
    }

    console.log(`[Verify] DB State: ${dbRecord?.lifecycleState}, versionNumber: ${dbRecord?.versionNumber}, updatedAt: ${dbRecord?.updatedAt}`);

    // Verify AuditRecord
    const audit = await prisma.auditRecord.findFirst({
      where: { targetId: id, action: { contains: toState } },
      orderBy: { createdAt: 'desc' }
    });
    console.log(`[Verify] Audit log found: ${audit ? 'YES' : 'NO'} (${audit?.action})`);

    // Verify Outbox
    const outbox = await prisma.transactionalOutboxRecord.findFirst({
      where: { eventType: { contains: entityType } },
      orderBy: { createdAt: 'desc' }
    });
    console.log(`[Verify] Outbox event found: ${outbox ? 'YES' : 'NO'} (${outbox?.eventType})`);

    return dbRecord;
  };

  // Execute sequence
  try {
    // 1. City: ACTIVE -> DEPRECATED
    await transition('CITY', CITY_ID, 'DEPRECATED', 'Transition City 5987 to Deprecated', 1);

    // 2. City: DEPRECATED -> ARCHIVED
    await transition('CITY', CITY_ID, 'ARCHIVED', 'Transition City 5987 to Archived', 2);

    // 3. Region A: ACTIVE -> DEPRECATED
    await transition('REGION', REGION_A_ID, 'DEPRECATED', 'Transition Region A 5987 to Deprecated', 2);

    // 4. Region B: ACTIVE -> DEPRECATED
    await transition('REGION', REGION_B_ID, 'DEPRECATED', 'Transition Region B 5987 to Deprecated', 1);

    // 5. Region B: DEPRECATED -> ARCHIVED
    await transition('REGION', REGION_B_ID, 'ARCHIVED', 'Transition Region B 5987 to Archived', 2);

    console.log('\n=== ALL LIFECYCLE TRANSITIONS COMPLETED SUCCESSFULLY ===');
  } catch (error: any) {
    console.error('\n!!! CRITICAL TRANSITION ERROR !!!');
    console.error(error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
