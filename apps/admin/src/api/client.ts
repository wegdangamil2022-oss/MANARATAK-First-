import { CsrfClientManager } from '@manaratak/shared';
import { assertLocalReadOnlyRequestAllowed } from '../security/LocalAdminReadOnlyPolicy';

const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || '/api/v1';
const csrfManager = CsrfClientManager.getInstance(API_BASE_URL);

export interface AdminRequestOptions extends RequestInit {
  /** Reuse this value when retrying the same semantic command. */
  idempotencyKey?: string;
}

export function createAdminIdempotencyKey(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  if (!globalThis.crypto) throw new Error('Secure browser randomness is unavailable');
  const entropy = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const suffix = Array.from(entropy, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `admin-${Date.now()}-${suffix}`;
}

function isMutation(method?: string): boolean {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes((method || 'GET').toUpperCase());
}

let activeRefreshPromise: Promise<boolean> | null = null;
let refreshFailedPermanently = false;

export async function performAdminRefresh(): Promise<boolean> {
  if (refreshFailedPermanently) return false;
  if (activeRefreshPromise) return activeRefreshPromise;

  activeRefreshPromise = (async () => {
    try {
      const res = await csrfManager.fetchWithCsrf(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (res.ok) {
        const payload = await res.json().catch(() => ({}));
        if (payload?.data?.authenticated) {
          refreshFailedPermanently = false;
          // Refresh rotates the session cookie; the old CSRF token is session-bound.
          csrfManager.clearToken();
          return true;
        }
      } else if (res.status === 401 || res.status === 403) {
        // Only mark permanently failed if the server explicitly rejected the refresh token
        refreshFailedPermanently = true;
      }
    } catch {
      // Network or transient server restart error - do NOT permanently lock out
    }
    return false;
  })();

  try {
    return await activeRefreshPromise;
  } finally {
    activeRefreshPromise = null;
  }
}

export type AdminAuthState = 'LOADING' | 'AUTHORIZED' | 'UNAUTHORIZED';
let currentAdminAuthState: AdminAuthState = 'LOADING';
let authStateListeners: Array<(state: AdminAuthState) => void> = [];
let globalAbortController = new AbortController();
let sessionGeneration = 0;
const testRevisions = new Map<string,number>();
const majorRevisions = new Map<string,number>();
const universityRevisions = new Map<string,number>();
const majorOwnerAliases = new Map<string,string>();

export function setAdminAuthStatus(state: AdminAuthState): void {
  currentAdminAuthState = state;
  if (state === 'AUTHORIZED') refreshFailedPermanently = false;
  authStateListeners.forEach((fn) => fn(state));
  authStateListeners = [];
  if (state === 'UNAUTHORIZED') {
    abortAllPendingAdminRequests();
  }
}

export function abortAllPendingAdminRequests(): void {
  sessionGeneration++;
  testRevisions.clear();
  majorRevisions.clear(); majorOwnerAliases.clear(); universityRevisions.clear();
  globalAbortController.abort();
  globalAbortController = new AbortController();
  inFlightRequests.clear();
  getCache.clear();
  while (requestQueue.length > 0) {
    const cancel = requestQueue.shift();
    if (cancel) cancel(new Error('REQUEST_ABORTED: Admin session invalid or aborted.'));
  }
  activeRequestCount = 0;
}

function waitForAdminAuth(): Promise<boolean> {
  if (currentAdminAuthState === 'AUTHORIZED') return Promise.resolve(true);
  if (currentAdminAuthState === 'UNAUTHORIZED') return Promise.resolve(false);
  return new Promise<boolean>((resolve) => {
    authStateListeners.push((state) => resolve(state === 'AUTHORIZED'));
  });
}

const MAX_CONCURRENT_REQUESTS = 3;
let activeRequestCount = 0;
const requestQueue: Array<(err?: Error) => void> = [];

function acquireRequestSlot(): Promise<void> {
  if (activeRequestCount < MAX_CONCURRENT_REQUESTS) {
    activeRequestCount++;
    return Promise.resolve();
  }
  return new Promise<void>((resolve, reject) => {
    requestQueue.push((err?: Error) => {
      if (err) {
        reject(err);
      } else {
        activeRequestCount++;
        resolve();
      }
    });
  });
}

function releaseRequestSlot(): void {
  activeRequestCount = Math.max(0, activeRequestCount - 1);
  if (requestQueue.length > 0) {
    const next = requestQueue.shift();
    if (next) next();
  }
}

const inFlightRequests = new Map<string, Promise<any>>();
const getCache = new Map<string, { data: any; expiresAt: number }>();
let rateLimitResetTime = 0;
let lastPermissionRecheckAt = 0;

async function adminRequest<T>(endpoint: string, options: AdminRequestOptions = {}): Promise<T> {
  const isPublicAuthRoute =
    endpoint.includes('/auth/login') ||
    endpoint.includes('/auth/refresh') ||
    endpoint.includes('/auth/logout') ||
    endpoint.includes('/auth/me');

  // Gating: Prevent any non-auth calls if unauthenticated or while auth is loading
  if (!isPublicAuthRoute) {
    if (currentAdminAuthState === 'UNAUTHORIZED') {
      throw new Error('ADMIN_AUTH_GUARD: Request blocked because admin is unauthorized.');
    }
    if (currentAdminAuthState === 'LOADING') {
      const authorized = await waitForAdminAuth();
      if (!authorized) {
        throw new Error('ADMIN_AUTH_GUARD: Request blocked because admin session is not authorized.');
      }
    }
  }

  const method = (options.method || 'GET').toUpperCase();
  const cacheKey = `${method}:${endpoint}`;
  const freshRead = options.cache === 'no-store' || options.cache === 'reload' || /^\/admin\/(international-tests|majors|universities)(?:\/|\?|$)/.test(endpoint);
  const coalesce = method === 'GET' && !freshRead && (!isPublicAuthRoute || endpoint.includes('/auth/me'));

  if (method === 'GET' && !isPublicAuthRoute) {
    if (rateLimitResetTime > Date.now()) {
      const waitMs = rateLimitResetTime - Date.now();
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    if (freshRead) getCache.delete(cacheKey);
    const cached = freshRead ? undefined : getCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data as T;
    }

  }
  if (coalesce) {
    const inFlight = inFlightRequests.get(cacheKey);
    if (inFlight) return inFlight as Promise<T>;
  }

  if (method !== 'GET') {
    getCache.clear();
  }

  const promise = (async () => {
    await acquireRequestSlot();
    const requestGeneration = sessionGeneration;
    try {
      const responseData = await executeRequest<T>(endpoint, options);
      if (!isPublicAuthRoute && requestGeneration !== sessionGeneration) throw new Error('REQUEST_ABORTED: Admin session changed.');
      if (method === 'GET' && !isPublicAuthRoute && !freshRead) {
        getCache.set(cacheKey, { data: responseData, expiresAt: Date.now() + 6000 });
      }
      return responseData;
    } catch (error: any) {
      if (error?.message?.includes('[429]')) {
        const parts = error.message.split('|');
        const retryAfterSeconds = parts.length > 1 ? Number(parts[1]) : 2;
        const delaySeconds = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0 ? retryAfterSeconds : 2;
        rateLimitResetTime = Date.now() + (delaySeconds * 1000);
      }
      throw error;
    } finally {
      releaseRequestSlot();
      if (coalesce) {
        inFlightRequests.delete(cacheKey);
      }
    }
  })();

  if (coalesce) {
    inFlightRequests.set(cacheKey, promise);
  }

  return promise;
}

async function executeRequest<T>(endpoint: string, options: AdminRequestOptions = {}): Promise<T> {
  assertLocalReadOnlyRequestAllowed(options.method, (typeof import.meta !== 'undefined' && import.meta.env?.VITE_LOCAL_ADMIN_READ_ONLY) === 'true');
  const url = `${API_BASE_URL}${endpoint}`;
  const requestGeneration = sessionGeneration;
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  const ownerMatch=endpoint.match(/^\/admin\/international-tests\/([^/?]+)(?:\/|\?|$)/);
  const testOwner=ownerMatch && !['providers','upsert'].includes(ownerMatch[1])?ownerMatch[1]:undefined;
  if(testOwner && isMutation(options.method) && !headers.has('If-Match')) {
    const revision=testRevisions.get(testOwner);
    if(revision===undefined) throw new Error('Reload the test before editing (revision required).');
    headers.set('If-Match',`"${revision}"`);
  }

  const majorMatch=endpoint.match(/^\/admin\/majors\/([^/?]+)(?:\/|\?|$)/);
  const majorOwner=majorMatch && !['facets','new-candidates'].includes(majorMatch[1]) ? majorMatch[1] : undefined;
  if(majorOwner && isMutation(options.method) && !headers.has('If-Match')) {
    const revision=majorRevisions.get(majorOwner);
    if(revision===undefined) throw new Error('أعد تحميل التخصص قبل التعديل.');
    headers.set('If-Match',`"${revision}"`);
  }

  const universityMatch = endpoint.match(/^\/admin\/universities\/([^/?]+)(?:\/|\?|$)/);
  const universityOwner = universityMatch && universityMatch[1] !== 'organization-units' ? universityMatch[1] : undefined;
  if (universityOwner && method !== 'GET' && !headers.has('If-Match')) {
    const revision = universityRevisions.get(universityOwner);
    if (revision === undefined) throw new Error('أعد تحميل الجامعة قبل التعديل (إصدار السجل مطلوب).');
    headers.set('If-Match', `"${revision}"`);
  }
  if (/^\/admin\/imports(?:\/|\?|$)/.test(endpoint)) headers.set('X-Import-Envelope-Version', '2');

  if (isMutation(options.method) && !headers.has('Idempotency-Key')) {
    headers.set('Idempotency-Key', options.idempotencyKey || createAdminIdempotencyKey());
  }
  const { idempotencyKey: _idempotencyKey, ...fetchOptions } = options;

  const requestOptions: RequestInit = {
    ...fetchOptions,
    signal: options.signal || globalAbortController.signal,
    headers,
    credentials: 'include',
  };
  let response = await csrfManager.fetchWithCsrf(url, requestOptions);

  // Handle 401 Unauthorized with silent session refresh
  const isAuthRoute = endpoint.includes('/auth/login') || endpoint.includes('/auth/refresh') || endpoint.includes('/auth/logout');
  if (response.status === 401 && !isAuthRoute) {
    // One shared refresh and at most one auth retry per command. Keep the exact
    // body, semantic idempotency key, caller headers and cancellation signal.
    if (await performAdminRefresh()) {
      if (requestOptions.signal?.aborted || requestGeneration !== sessionGeneration) {
        throw new Error('REQUEST_ABORTED: Admin session changed.');
      }
      response = await csrfManager.fetchWithCsrf(url, requestOptions);
    }
    if (response.status === 401 && !endpoint.includes('/auth/me')) {
      setAdminAuthStatus('UNAUTHORIZED');
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('manaratak-admin-session-expired'));
    }
  }

  if (!response.ok) {
    if (response.status === 403 && endpoint.startsWith('/admin/') && Date.now() - lastPermissionRecheckAt > 1000) {
      lastPermissionRecheckAt = Date.now();
      window.dispatchEvent(new Event('manaratak-admin-permission-changed'));
    }
    let errorMessage = `API Error: ${response.statusText}`;
    let retryAfter = response.headers.get('Retry-After');
    try {
      const errorData = (await response.json()) as any;
      if (errorData?.meta?.retryAfter) {
        retryAfter = String(errorData.meta.retryAfter);
      }
      if (errorData.detail) {
        errorMessage = errorData.code
          ? `${errorData.detail} (${errorData.code})`
          : errorData.detail;
      } else if (errorData.error) {
        if (typeof errorData.error === 'string') {
          errorMessage = errorData.error;
        } else if (errorData.error.message) {
          errorMessage = errorData.error.message;
        } else {
          errorMessage = JSON.stringify(errorData.error);
        }
      }
    } catch {
      // ignore JSON parse error
    }
    if (response.status === 429) {
      throw new Error(`[429] ${errorMessage || 'Too many requests'}${retryAfter ? `|${retryAfter}` : ''}`);
    }
    throw new Error(`[${response.status}] ${errorMessage}`);
  }

  if (response.status === 204) return undefined as T;
  const wirePayload: unknown = await response.json();
  const payload = response.headers.get('X-Import-Envelope-Version') === '2' &&
    wirePayload && typeof wirePayload === 'object' && 'data' in wirePayload
    ? (wirePayload as { data: T }).data : wirePayload as T;
  if (endpoint.includes('/auth/login')) {
    refreshFailedPermanently = false;
    csrfManager.clearToken();
    abortAllPendingAdminRequests();
  }
  if(endpoint.startsWith('/admin/international-tests')) {
    const remember=(row:unknown)=>{if(row&&typeof row==='object'&&'id' in row&&'revision' in row) {const value=Number(row.revision);if(Number.isSafeInteger(value)) testRevisions.set(String(row.id),Math.max(testRevisions.get(String(row.id))??0,value));}};
    remember(payload); if(payload&&typeof payload==='object'&&'data' in payload&&Array.isArray(payload.data)) payload.data.forEach(remember);
    const revision=response.headers.get('X-Entity-Revision'); if(testOwner&&revision!==null)testRevisions.set(testOwner,Number(revision));
  }
  if(endpoint.startsWith('/admin/majors')) {
    const remember=(row:unknown)=>{
      if(!row || typeof row!=='object' || !('id' in row) || !('revision' in row)) return;
      const item=row as {id:string;revision:number;publicId?:string;profileId?:string;profiles?:Array<{id?:string;code?:string}>};
      if(!Number.isSafeInteger(item.revision)) return;
      const aliases=[item.id,item.publicId,item.profileId,...(item.profiles ?? []).flatMap(profile=>[profile.id,profile.code])].filter((id):id is string=>Boolean(id));
      if(majorOwner) aliases.push(majorOwner);
      for(const alias of aliases) {majorRevisions.set(alias,item.revision);majorOwnerAliases.set(alias,item.id);}
    };
    remember(payload);if(payload && typeof payload==='object' && 'data' in payload && Array.isArray(payload.data)) payload.data.forEach(remember);
    const value=response.headers.get('X-Entity-Revision');
    if(majorOwner && value!==null && Number.isSafeInteger(Number(value))) {
      const canonical=majorOwnerAliases.get(majorOwner) ?? majorOwner;
      majorRevisions.set(majorOwner,Number(value));
      for(const [alias,owner] of majorOwnerAliases) if(owner===canonical) majorRevisions.set(alias,Number(value));
    }
  }
  if (endpoint.startsWith('/admin/universities')) {
    const remember = (row: unknown) => {
      if (!row || typeof row !== 'object' || !('id' in row) || !('revision' in row)) return;
      const item = row as { id: string; revision: number };
      if (Number.isSafeInteger(item.revision)) universityRevisions.set(item.id, item.revision);
    };
    remember(payload);
    if (payload && typeof payload === 'object' && 'data' in payload && Array.isArray(payload.data))
      payload.data.forEach(remember);
    const value = response.headers.get('X-Entity-Revision');
    if (universityOwner && value !== null && Number.isSafeInteger(Number(value)))
      universityRevisions.set(universityOwner, Number(value));
  }
  return payload;
}

export const adminApiClient = {
  setAdminAuthStatus,
  abortAllPendingAdminRequests,

  clearSecuritySession(): void {
    csrfManager.clearToken();
    abortAllPendingAdminRequests();
    try {
      window.localStorage?.removeItem('manaratak_refresh_token');
      window.sessionStorage?.removeItem('manaratak_refresh_token');
    } catch {}
  },

  request: adminRequest,

  listInternationalTests(params?: Record<string, string>) {
    const searchParams = new URLSearchParams();
    if (params) {
      for (const [key, val] of Object.entries(params)) {
        if (val !== undefined && val !== null) {
          const str = String(val).trim();
          if (!str) continue;
          if ((key === 'status' || key === 'testCategory') && str.toLowerCase() === 'all') continue;
          searchParams.append(key, str);
        }
      }
    }
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return adminRequest<unknown>(`/admin/international-tests${query}`);
  },

  getInternationalTest<T>(id: string) {
    return adminRequest<T>(`/admin/international-tests/${id}`);
  },

  updateInternationalTest<T = unknown>(id: string, payload: unknown) {
    return adminRequest<T>(`/admin/international-tests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  listInternationalTestProviders<T = unknown>(search?: string) {
    const query = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
    return adminRequest<T>(`/admin/international-tests/providers${query}`);
  },

  upsertInternationalTestProvider<T = unknown>(payload: unknown) {
    return adminRequest<T>('/admin/international-tests/providers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getInternationalTestReadiness<T = unknown>(testId: string) {
    return adminRequest<T>(`/admin/international-tests/${testId}/readiness`);
  },

  getInternationalTestRelationships<T = unknown>(testId: string, locale: 'ar' | 'en' = 'ar') {
    return adminRequest<T>(`/admin/international-tests/${testId}/relationships?locale=${locale}`);
  },

  verifyInternationalTestSource(testId: string, reason?: string) {
    return adminRequest<unknown>(`/admin/international-tests/${testId}/verify-source`, {
      method: 'POST',
      body: JSON.stringify({reason}),
    });
  },

  upsertInternationalTestVariant(testId: string, payload: unknown) {
    return adminRequest<unknown>(`/admin/international-tests/${testId}/variants`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  upsertInternationalTestSection(testId: string, payload: unknown) {
    return adminRequest<unknown>(`/admin/international-tests/${testId}/sections`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  upsertInternationalTestScoreScale(testId: string, payload: unknown) {
    return adminRequest<unknown>(`/admin/international-tests/${testId}/score-scale`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  upsertInternationalTestFeeMetadata(testId: string, payload: unknown) {
    return adminRequest<unknown>(`/admin/international-tests/${testId}/fees`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  upsertInternationalTestOfficialLink(testId: string, payload: unknown) {
    return adminRequest<unknown>(`/admin/international-tests/${testId}/official-links`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  upsertInternationalTestAvailability(testId: string, payload: unknown) {
    return adminRequest<unknown>(`/admin/international-tests/${testId}/availability`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  upsertInternationalTestPreparationMaterial(testId: string, payload: unknown) {
    return adminRequest<unknown>(`/admin/international-tests/${testId}/preparation-materials`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  addInternationalTestEvidence(testId: string, payload: unknown) {
    return adminRequest<unknown>(`/admin/international-tests/${testId}/evidence`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  markInternationalTestReadyToPublish(testId: string, reason?: string) {
    return adminRequest<unknown>(`/admin/international-tests/${testId}/mark-publishable`, {
      method: 'POST',
      body: JSON.stringify({reason}),
    });
  },

  publishInternationalTest(testId: string, reason?: string) {
    return adminRequest<unknown>(`/admin/international-tests/${testId}/publish`, {
      method: 'POST',
      body: JSON.stringify({reason}),
    });
  },

  unpublishInternationalTest(testId: string, reason?: string) {
    return adminRequest<unknown>(`/admin/international-tests/${testId}/unpublish`, {
      method: 'POST',
      body: JSON.stringify({reason}),
    });
  },

  getInternationalTestImportVersions<T = unknown>(testId: string) {
    return adminRequest<T>(`/admin/international-tests/${testId}/import-versions`);
  },

  reviewInternationalTestSourceNames<T = unknown>(testId: string, payload: unknown) {
    return adminRequest<T>(`/admin/international-tests/${testId}/review-source-names`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  archiveInternationalTest(testId: string, reason?: string) {
    return adminRequest<unknown>(`/admin/international-tests/${testId}/archive`, {
      method: 'POST',
      body: JSON.stringify({reason}),
    });
  },
};
