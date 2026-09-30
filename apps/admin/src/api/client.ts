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
  return ['POST', 'PUT', 'PATCH'].includes((method || 'GET').toUpperCase());
}

let activeRefreshPromise: Promise<boolean> | null = null;
let refreshFailedPermanently = false;

let isRefreshing = false;
let refreshSubscribers: Array<(ok: boolean) => void> = [];

function subscribeTokenRefresh(cb: (ok: boolean) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(ok: boolean) {
  refreshSubscribers.forEach((cb) => cb(ok));
  refreshSubscribers = [];
}

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

export function setAdminAuthStatus(state: AdminAuthState): void {
  currentAdminAuthState = state;
  authStateListeners.forEach((fn) => fn(state));
  authStateListeners = [];
  if (state === 'UNAUTHORIZED') {
    abortAllPendingAdminRequests();
  }
}

export function abortAllPendingAdminRequests(): void {
  sessionGeneration++;
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
  const coalesce = method === 'GET' && (!isPublicAuthRoute || endpoint.includes('/auth/me'));

  if (method === 'GET' && !isPublicAuthRoute) {
    if (rateLimitResetTime > Date.now()) {
      const waitMs = rateLimitResetTime - Date.now();
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    const cached = getCache.get(cacheKey);
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
      if (method === 'GET' && !isPublicAuthRoute) {
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
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  if (isMutation(options.method) && !headers.has('Idempotency-Key')) {
    headers.set('Idempotency-Key', options.idempotencyKey || createAdminIdempotencyKey());
  }
  const { idempotencyKey: _idempotencyKey, ...fetchOptions } = options;

  let response = await csrfManager.fetchWithCsrf(url, {
    ...fetchOptions,
    signal: options.signal || globalAbortController.signal,
    headers,
    credentials: 'include',
  });

  // Handle 401 Unauthorized with silent session refresh
  const isAuthRoute = endpoint.includes('/auth/login') || endpoint.includes('/auth/refresh') || endpoint.includes('/auth/logout');
  if (response.status === 401 && !isAuthRoute) {
    if (isRefreshing) {
      const refreshOk = await new Promise<boolean>((resolve) => subscribeTokenRefresh(resolve));
      if (refreshOk) {
        const nextHeaders = new Headers(options.headers);
        nextHeaders.set('Content-Type', 'application/json');
        response = await csrfManager.fetchWithCsrf(url, {
          ...fetchOptions,
          headers: nextHeaders,
          credentials: 'include',
        });
      } else {
        if (!endpoint.includes('/auth/me')) {
          setAdminAuthStatus('UNAUTHORIZED');
          window.dispatchEvent(new Event('manaratak-admin-session-expired'));
        }
      }
    } else {
      isRefreshing = true;
      const refreshOk = await performAdminRefresh();
      onRefreshed(refreshOk);
      isRefreshing = false;
      if (refreshOk) {
        const nextHeaders = new Headers(options.headers);
        nextHeaders.set('Content-Type', 'application/json');
        response = await csrfManager.fetchWithCsrf(url, {
          ...fetchOptions,
          headers: nextHeaders,
          credentials: 'include',
        });
      } else {
        if (!endpoint.includes('/auth/me')) {
          setAdminAuthStatus('UNAUTHORIZED');
          window.dispatchEvent(new Event('manaratak-admin-session-expired'));
        }
      }
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

  const payload = await response.json() as T;
  if (endpoint.includes('/auth/login')) {
    refreshFailedPermanently = false;
    csrfManager.clearToken();
    abortAllPendingAdminRequests();
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
    const searchParams = new URLSearchParams(params);
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

  verifyInternationalTestSource(testId: string) {
    return adminRequest<unknown>(`/admin/international-tests/${testId}/verify-source`, {
      method: 'POST',
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

  markInternationalTestReadyToPublish(testId: string) {
    return adminRequest<unknown>(`/admin/international-tests/${testId}/mark-publishable`, {
      method: 'POST',
    });
  },

  publishInternationalTest(testId: string) {
    return adminRequest<unknown>(`/admin/international-tests/${testId}/publish`, {
      method: 'POST',
    });
  },

  archiveInternationalTest(testId: string) {
    return adminRequest<unknown>(`/admin/international-tests/${testId}/archive`, {
      method: 'POST',
    });
  },
};
