import { PrismaClient } from '@prisma/client';

// Reconstruct DATABASE_URL for Prisma to use PostgreSQL via direct socket or host
const host = encodeURIComponent(process.env.SQL_HOST || '');
const db = encodeURIComponent(process.env.SQL_DB_NAME || '');
const user = process.env.SQL_USER || '';
const pass = encodeURIComponent(process.env.SQL_PASSWORD || process.env.SQL_ADMIN_PASSWORD || process.env.DB_APPLICATION_PASSWORD || '');
process.env.DATABASE_URL = `postgresql://${user}:${pass}@localhost/${db}?host=${host}`;

const prisma = new PrismaClient();

const BASE_URL = 'http://localhost:3000/api/v1';
const OWNER_EMAIL = 'wegdangamil2022@gmail.com';
const CURRENT_PASSWORD = process.env.M10_OWNER_CURRENT_PASSWORD || '';
const NEW_PASSWORD = process.env.M10_OWNER_NEW_PASSWORD || '';

async function main() {
  console.log('=== STARTING OFFICIAL OWNER PASSWORD CHANGE FLOW ===');
  if (!CURRENT_PASSWORD || !NEW_PASSWORD) {
    console.error('[Error] M10_OWNER_CURRENT_PASSWORD or M10_OWNER_NEW_PASSWORD is not set in process.env!');
    process.exit(1);
  }

  try {
    // 1. Log in with CURRENT password
    console.log('[Step 1] Logging in with current password...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: OWNER_EMAIL,
        password: CURRENT_PASSWORD,
        rememberMe: true,
      }),
    });

    if (loginRes.status !== 200) {
      const body = await loginRes.text();
      console.error(`\n[REJECTION REPORT] Current password was rejected! Status: ${loginRes.status}, Body: ${body}`);
      console.log('Stopping execution and reporting to the user immediately without alternative resets.');
      process.exit(0);
    }

    const setCookies = loginRes.headers.getSetCookie();
    const accessCookie = setCookies.find(c => c.startsWith('manaratak_access='))?.split(';')[0];
    const refreshCookie = setCookies.find(c => c.startsWith('manaratak_refresh='))?.split(';')[0];

    if (!accessCookie || !refreshCookie) {
      throw new Error('Required cookies not found in login response.');
    }

    const currentAuthCookies = `${accessCookie}; ${refreshCookie}`;
    console.log('[Step 1] Login successful with current password.');

    // 2. Verify identity via auth/me
    console.log('[Step 2] Verifying identity via /auth/me...');
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      method: 'GET',
      headers: { 'Cookie': currentAuthCookies },
    });

    if (meRes.status !== 200) {
      throw new Error(`GET /auth/me failed with status ${meRes.status}`);
    }

    const meData = await meRes.json();
    const identityId = meData.data?.principalId;
    if (meData.data?.primaryEmail !== OWNER_EMAIL || !identityId) {
      throw new Error(`Identity mismatch in auth/me: ${JSON.stringify(meData)}`);
    }
    console.log(`[Step 2] Identity verified successfully. ID: ${identityId}, Email: ${meData.data.primaryEmail}`);

    // Fetch CSRF Token
    console.log('[Step 2] Fetching CSRF token...');
    const csrfRes = await fetch(`${BASE_URL}/auth/csrf-token`, {
      method: 'GET',
      headers: { 'Cookie': currentAuthCookies },
    });

    if (csrfRes.status !== 200) {
      throw new Error(`Failed to fetch CSRF token: ${await csrfRes.text()}`);
    }
    const csrfData = await csrfRes.json();
    const csrfToken = csrfData.data?.csrfToken;
    if (!csrfToken) {
      throw new Error('CSRF token not found in response payload.');
    }
    console.log('[Step 2] CSRF token successfully retrieved.');

    // 3. Change password via POST /auth/change-password
    console.log('[Step 3] Executing password change via POST /auth/change-password...');
    const changePasswordRes = await fetch(`${BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': currentAuthCookies,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({
        currentPassword: CURRENT_PASSWORD,
        newPassword: NEW_PASSWORD,
      }),
    });

    if (changePasswordRes.status !== 200) {
      const body = await changePasswordRes.text();
      throw new Error(`POST /auth/change-password failed with status ${changePasswordRes.status}: ${body}`);
    }

    const changeData = await changePasswordRes.json();
    console.log(`[Step 3] Password change response: ${JSON.stringify(changeData)}`);
    if (!changeData.data?.loginRequired) {
      throw new Error(`Unexpected change password response shape: ${JSON.stringify(changeData)}`);
    }
    console.log('[Step 3] Password changed successfully via official route.');

    // 4. Verify session invalidation in DB
    console.log('[Step 4] Checking that previous sessions have been revoked in DB...');
    const revokedSessionsCount = await prisma.sessionRecord.count({
      where: { identityId, revokedAt: null },
    });
    console.log(`[Step 4] Active session count for this user in DB: ${revokedSessionsCount}`);
    if (revokedSessionsCount !== 0) {
      throw new Error(`Expected 0 active sessions after password change, but found ${revokedSessionsCount}!`);
    }
    console.log('[Step 4] All previous sessions revoked successfully.');

    // 5. Verify PASSWORD_CHANGED audit record
    console.log('[Step 5] Checking for PASSWORD_CHANGED audit log in DB...');
    const auditRecord = await prisma.auditRecord.findFirst({
      where: {
        targetId: identityId,
        action: 'PASSWORD_CHANGED',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!auditRecord) {
      throw new Error('PASSWORD_CHANGED audit record not found in Database!');
    }
    console.log(`[Step 5] Found matching Audit log. Reference: ${auditRecord.reference}, Action: ${auditRecord.action}, Timestamp: ${auditRecord.timestamp}`);

    // 6. Login with the NEW password
    console.log('[Step 6] Verifying login with the NEW password...');
    const newLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: OWNER_EMAIL,
        password: NEW_PASSWORD,
        rememberMe: true,
      }),
    });

    if (newLoginRes.status !== 200) {
      throw new Error(`Login with new password failed with status ${newLoginRes.status}`);
    }

    const newCookies = newLoginRes.headers.getSetCookie();
    const newAccessCookie = newCookies.find(c => c.startsWith('manaratak_access='))?.split(';')[0];
    const newRefreshCookie = newCookies.find(c => c.startsWith('manaratak_refresh='))?.split(';')[0];
    const newAuthCookies = `${newAccessCookie}; ${newRefreshCookie}`;
    console.log('[Step 6] Login with new password successful.');

    // Verify /auth/me with new cookies
    console.log('[Step 6] Testing /auth/me with new cookies...');
    const newMeRes = await fetch(`${BASE_URL}/auth/me`, {
      method: 'GET',
      headers: { 'Cookie': newAuthCookies },
    });

    if (newMeRes.status !== 200) {
      throw new Error(`auth/me with new cookies failed with status ${newMeRes.status}`);
    }

    const newMeData = await newMeRes.json();
    if (newMeData.data?.primaryEmail !== OWNER_EMAIL) {
      throw new Error(`Identity mismatch on new me check: ${JSON.stringify(newMeData)}`);
    }
    console.log(`[Step 6] Identity verified with new credentials: ${newMeData.data.displayName}`);
    console.log('\n=== PASSWORD CHANGE FLOW COMPLETED SUCCESSFULLY WITH 100% SUCCESS ===');

  } catch (err) {
    console.error('\n!!! EXCEPTION ENCOUNTERED !!!');
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
