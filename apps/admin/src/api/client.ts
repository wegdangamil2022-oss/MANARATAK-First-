import { CsrfClientManager } from '@manaratak/shared';
import { assertLocalReadOnlyRequestAllowed } from '../security/LocalAdminReadOnlyPolicy';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const csrfManager = CsrfClientManager.getInstance(API_BASE_URL);

type ApiErrorPayload = {
  error?: string | { message?: string };
  detail?: string;
  title?: string;
  code?: string;
  traceId?: string;
};

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

async function adminRequest<T>(endpoint: string, options: AdminRequestOptions = {}): Promise<T> {
  assertLocalReadOnlyRequestAllowed(options.method, import.meta.env.VITE_LOCAL_ADMIN_READ_ONLY === 'true');
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (isMutation(options.method) && !headers.has('Idempotency-Key')) {
    headers.set('Idempotency-Key', options.idempotencyKey || createAdminIdempotencyKey());
  }
  const { idempotencyKey: _idempotencyKey, ...fetchOptions } = options;

  const response = await csrfManager.fetchWithCsrf(url, {
    ...fetchOptions,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    let errorMessage = `API Error: ${response.statusText}`;
    try {
      const errorData = (await response.json()) as ApiErrorPayload;
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
    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}

export const adminApiClient = {
  clearSecuritySession(): void {
    csrfManager.clearToken();
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
