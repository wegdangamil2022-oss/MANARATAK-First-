// Setup browser globals for Node.js
const storage = new Map();
globalThis.window = globalThis;
globalThis.localStorage = {
  getItem: (k) => storage.get(k) || null,
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear(),
};
globalThis.sessionStorage = {
  getItem: (k) => storage.get('s_' + k) || null,
  setItem: (k, v) => storage.set('s_' + k, String(v)),
  removeItem: (k) => storage.delete('s_' + k),
  clear: () => {},
};

// Intercept network requests to record exact traffic
const networkLog = [];
const originalFetch = globalThis.fetch;

globalThis.fetch = async (url, options = {}) => {
  const start = Date.now();
  let fullUrl = String(url);
  if (fullUrl.startsWith('/')) {
    fullUrl = `http://127.0.0.1:3000${fullUrl}`;
  }
  const urlStr = fullUrl;
  try {
    const res = await originalFetch(fullUrl, options);
    const durationMs = Date.now() - start;
    networkLog.push({
      url: urlStr,
      method: options.method || 'GET',
      status: res.status,
      durationMs,
      timestamp: new Date().toISOString(),
    });
    return res;
  } catch (err) {
    const durationMs = Date.now() - start;
    networkLog.push({
      url: urlStr,
      method: options.method || 'GET',
      status: 0,
      error: err.message,
      durationMs,
      timestamp: new Date().toISOString(),
    });
    throw err;
  }
};

// Set environment for client
process.env.VITE_API_BASE_URL = 'http://127.0.0.1:3000/api/v1';

async function runScenarioColdLoadWithoutLogin() {
  console.log('\n============================================================');
  console.log('SCENARIO 1: Cold load without login (تحميل بارد بلا دخول)');
  console.log('============================================================');
  
  localStorage.clear();
  sessionStorage.clear();
  networkLog.length = 0;

  const { adminApiClient, setAdminAuthStatus } = await import('../apps/admin/src/api/client.ts');
  
  setAdminAuthStatus('LOADING');
  
  // 1. Initial verification call
  let authFailed = false;
  try {
    await adminApiClient.request('/auth/me');
  } catch (err) {
    authFailed = true;
    setAdminAuthStatus('UNAUTHORIZED');
  }

  // 2. Simulate if any page component attempts to call /admin/* while unauthorized
  let adminRequestsBlocked = 0;
  const attemptedAdminEndpoints = [
    '/admin/dashboard',
    '/admin/scholarships/summary',
    '/admin/imports/records?page=1&pageSize=1&status=FAILED',
    '/admin/scholarships?verificationStatus=FAILED&page=1&pageSize=100',
    '/admin/universities?page=1&pageSize=1',
  ];

  for (const endpoint of attemptedAdminEndpoints) {
    try {
      await adminApiClient.request(endpoint);
    } catch (err) {
      if (err.message.includes('ADMIN_AUTH_GUARD')) {
        adminRequestsBlocked++;
      }
    }
  }

  const adminCalls = networkLog.filter(r => r.url.includes('/api/v1/admin/'));
  const fourOhOnes = networkLog.filter(r => r.status === 401);
  const fourTwentyNines = networkLog.filter(r => r.status === 429);

  console.log(`- Auth status checked: ${authFailed ? 'Rejected (401 on /auth/me as expected)' : 'Passed'}`);
  console.log(`- Admin requests sent over wire: ${adminCalls.length}`);
  console.log(`- Admin requests blocked by Auth Guard: ${adminRequestsBlocked}/${attemptedAdminEndpoints.length}`);
  console.log(`- 401 count on /admin/*: ${adminCalls.filter(r => r.status === 401).length}`);
  console.log(`- 429 count on /admin/*: ${fourTwentyNines.length}`);
  
  return {
    scenario: '1. Cold Load Without Login (تحميل بارد)',
    attemptedAdminRequests: attemptedAdminEndpoints.length,
    sentAdminRequests: adminCalls.length,
    blockedAdminRequests: adminRequestsBlocked,
    fourOhOnesOnAdmin: adminCalls.filter(r => r.status === 401).length,
    fourTwentyNines: fourTwentyNines.length,
  };
}

async function runScenarioSuccessfulLoginAndDashboard() {
  console.log('\n============================================================');
  console.log('SCENARIO 2: Successful login & Admin loading (دخول ناجح)');
  console.log('============================================================');

  networkLog.length = 0;
  const { adminApiClient, setAdminAuthStatus, setStoredAdminTokens } = await import('../apps/admin/src/api/client.ts');

  // Verify server is ready by making a health check
  await fetch('http://127.0.0.1:3000/api/v1/monitoring/health');

  // Login as admin
  const loginRes = await fetch('http://127.0.0.1:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@manaratak.local',
      password: 'AdminPassword123!',
    }),
  });

  const loginData = await loginRes.json();
  const token = loginData.data?.accessToken;
  if (token) {
    setStoredAdminTokens(loginData.data);
  }

  // Set loading state
  setAdminAuthStatus('LOADING');

  // Verify /auth/me
  const meRes = await adminApiClient.request('/auth/me');
  const permissions = meRes.data?.effectivePermissions || [];
  const isAuthorized = permissions.some(p => p === '*' || p.startsWith('admin:'));

  if (isAuthorized) {
    setAdminAuthStatus('AUTHORIZED');
  }

  // Child dashboard mounts and loads key metrics in parallel through the concurrency limiter
  const dashboardQueries = [
    '/admin/scholarships/summary',
    '/admin/universities?page=1&pageSize=1',
    '/admin/universities?page=1&pageSize=1&status=PUBLISHED',
    '/admin/majors?page=1&pageSize=1',
    '/admin/courses?page=1&pageSize=1',
    '/admin/international-tests?page=1&pageSize=1',
    '/admin/careers/jobs?page=1&pageSize=1',
    '/admin/cms/content?page=1&pageSize=1',
    '/admin/imports/records?page=1&pageSize=1&status=FAILED',
    '/admin/finance/overview',
  ];

  await Promise.allSettled(dashboardQueries.map(url => adminApiClient.request(url)));

  const adminCalls = networkLog.filter(r => r.url.includes('/api/v1/admin/'));
  const fourOhOnes = adminCalls.filter(r => r.status === 401);
  const fourTwentyNines = adminCalls.filter(r => r.status === 429);

  console.log(`- Admin authenticated: ${isAuthorized}`);
  console.log(`- Total /admin/* requests completed: ${adminCalls.length}`);
  console.log(`- 401 count on /admin/*: ${fourOhOnes.length}`);
  console.log(`- 429 count on /admin/*: ${fourTwentyNines.length}`);

  return {
    scenario: '2. Successful Login & Dashboard (دخول ناجح)',
    attemptedAdminRequests: dashboardQueries.length,
    sentAdminRequests: adminCalls.length,
    blockedAdminRequests: 0,
    fourOhOnesOnAdmin: fourOhOnes.length,
    fourTwentyNines: fourTwentyNines.length,
  };
}

async function runScenarioPageRefresh() {
  console.log('\n============================================================');
  console.log('SCENARIO 3: Admin page refresh (تحديث صفحة الإدارة)');
  console.log('============================================================');

  networkLog.length = 0;
  const { adminApiClient, setAdminAuthStatus } = await import('../apps/admin/src/api/client.ts');

  // Simulated refresh: auth status starts as LOADING
  setAdminAuthStatus('LOADING');

  // 1. Session verification completes FIRST
  const meRes = await adminApiClient.request('/auth/me');
  const permissions = meRes.data?.effectivePermissions || [];
  setAdminAuthStatus(permissions.length > 0 ? 'AUTHORIZED' : 'UNAUTHORIZED');

  // 2. Only then active page metrics execute
  const refreshCalls = [
    '/admin/scholarships/summary',
    '/admin/scholarships?page=1&pageSize=20',
    '/admin/universities?page=1&pageSize=1',
  ];

  await Promise.allSettled(refreshCalls.map(url => adminApiClient.request(url)));

  const adminCalls = networkLog.filter(r => r.url.includes('/api/v1/admin/'));
  const fourOhOnes = adminCalls.filter(r => r.status === 401);
  const fourTwentyNines = adminCalls.filter(r => r.status === 429);

  console.log(`- Refresh session verification: Completed first`);
  console.log(`- Total /admin/* requests dispatched: ${adminCalls.length}`);
  console.log(`- 401 count: ${fourOhOnes.length}`);
  console.log(`- 429 count: ${fourTwentyNines.length}`);

  return {
    scenario: '3. Admin Page Refresh (تحديث الصفحة)',
    attemptedAdminRequests: refreshCalls.length,
    sentAdminRequests: adminCalls.length,
    blockedAdminRequests: 0,
    fourOhOnesOnAdmin: fourOhOnes.length,
    fourTwentyNines: fourTwentyNines.length,
  };
}

async function runScenarioFastNavigation() {
  console.log('\n============================================================');
  console.log('SCENARIO 4: Fast navigation between sections (التنقل السريع)');
  console.log('============================================================');

  networkLog.length = 0;
  const { adminApiClient, abortAllPendingAdminRequests } = await import('../apps/admin/src/api/client.ts');

  // Step A: User opens Review Queue
  const queueCalls = [
    '/admin/scholarships/summary',
    '/admin/scholarships?page=1&pageSize=20&status=READY_TO_REVIEW',
    '/admin/universities?page=1&pageSize=20&status=READY_TO_REVIEW',
  ];
  const p1 = Promise.allSettled(queueCalls.map(url => adminApiClient.request(url)));

  // Fast navigation happens after 5ms - user clicks to Scholarships List
  await new Promise(r => setTimeout(r, 5));
  abortAllPendingAdminRequests();

  // Step B: User opens Scholarships List
  const scholarshipCalls = [
    '/admin/scholarships/summary',
    '/admin/scholarships?page=1&pageSize=20',
  ];
  const p2 = Promise.allSettled(scholarshipCalls.map(url => adminApiClient.request(url)));

  await Promise.all([p1, p2]);

  const adminCalls = networkLog.filter(r => r.url.includes('/api/v1/admin/'));
  const fourOhOnes = adminCalls.filter(r => r.status === 401);
  const fourTwentyNines = adminCalls.filter(r => r.status === 429);

  console.log(`- In-flight requests safely cancelled and throttled through concurrency queue`);
  console.log(`- Total /admin/* requests dispatched: ${adminCalls.length}`);
  console.log(`- 401 count: ${fourOhOnes.length}`);
  console.log(`- 429 count: ${fourTwentyNines.length}`);

  return {
    scenario: '4. Fast Navigation (التنقل السريع)',
    attemptedAdminRequests: queueCalls.length + scholarshipCalls.length,
    sentAdminRequests: adminCalls.length,
    blockedAdminRequests: 0,
    fourOhOnesOnAdmin: fourOhOnes.length,
    fourTwentyNines: fourTwentyNines.length,
  };
}

async function main() {
  const s1 = await runScenarioColdLoadWithoutLogin();
  const s2 = await runScenarioSuccessfulLoginAndDashboard();
  const s3 = await runScenarioPageRefresh();
  const s4 = await runScenarioFastNavigation();

  console.log('\n============================================================');
  console.log('SUMMARY TABLE: Network Measurement Results (قياسات الشبكة)');
  console.log('============================================================');
  console.table([s1, s2, s3, s4]);
}

main().catch(err => {
  console.error('Measurement error:', err);
  process.exit(1);
});
