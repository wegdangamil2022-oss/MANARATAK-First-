export interface CsrfFetchOptions {
  apiBaseUrl?: string;
  fetchFn?: typeof fetch;
}

/**
 * Central CSRF Client Manager for Manaratak Browser Applications.
 * Handles fetching, in-memory caching, auto-attaching headers to state-mutating requests,
 * and safe single-attempt retry on CSRF authorization failures.
 */
export class CsrfClientManager {
  private static instance: CsrfClientManager | null = null;
  private cachedToken: string | null = null;
  private tokenFetchPromise: Promise<string | null> | null = null;
  private apiBaseUrl: string = '/api/v1';

  private constructor(apiBaseUrl?: string) {
    if (apiBaseUrl) {
      this.apiBaseUrl = apiBaseUrl;
    }
  }

  public static getInstance(apiBaseUrl?: string): CsrfClientManager {
    if (!CsrfClientManager.instance) {
      CsrfClientManager.instance = new CsrfClientManager(apiBaseUrl);
    } else if (apiBaseUrl) {
      CsrfClientManager.instance.apiBaseUrl = apiBaseUrl;
    }
    return CsrfClientManager.instance;
  }

  public setApiBaseUrl(baseUrl: string): void {
    this.apiBaseUrl = baseUrl;
  }

  public getApiBaseUrl(): string {
    return this.apiBaseUrl;
  }

  /**
   * Retrieves the current CSRF token from memory or fetches a fresh one from backend.
   */
  public async getCsrfToken(forceRefresh = false): Promise<string | null> {
    if (!forceRefresh && this.cachedToken) {
      return this.cachedToken;
    }

    if (this.tokenFetchPromise) {
      return this.tokenFetchPromise;
    }

    this.tokenFetchPromise = (async () => {
      try {
        const fetchFn = typeof window !== 'undefined' && window.fetch ? window.fetch.bind(window) : fetch;
        const endpoint = `${this.apiBaseUrl.replace(/\/+$/, '')}/auth/csrf-token`;
        const res = await fetchFn(endpoint, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          credentials: 'include',
        });

        if (!res.ok) {
          console.warn('[CsrfClientManager] Failed to fetch CSRF token:', res.status, res.statusText);
          return null;
        }

        const data = await res.json().catch(() => ({}));
        const token = data?.data?.csrfToken || data?.csrfToken || res.headers?.get('X-CSRF-Token');
        if (token && typeof token === 'string') {
          this.cachedToken = token;
          return token;
        }
        return null;
      } catch (err) {
        console.warn('[CsrfClientManager] Error fetching CSRF token:', err);
        return null;
      } finally {
        this.tokenFetchPromise = null;
      }
    })();

    return this.tokenFetchPromise;
  }

  /**
   * Explicitly sets or updates the in-memory cached CSRF token.
   */
  public setCachedToken(token: string | null): void {
    this.cachedToken = token;
  }

  /**
   * Clears the cached CSRF token in memory (e.g. on 403 CSRF error or logout).
   */
  public clearToken(): void {
    this.cachedToken = null;
    this.tokenFetchPromise = null;
  }

  /**
   * Automatically attaches X-CSRF-Token header to headers object for state-mutating requests.
   */
  public async attachCsrfHeader(
    method: string = 'GET',
    headers: Record<string, string> | Headers = {}
  ): Promise<Record<string, string>> {
    const uppercaseMethod = method.toUpperCase();
    const resultHeaders: Record<string, string> = {};

    if (headers instanceof Headers) {
      headers.forEach((val, key) => {
        resultHeaders[key] = val;
      });
    } else {
      Object.assign(resultHeaders, headers);
    }

    // Safe HTTP methods (GET, HEAD, OPTIONS) do not require CSRF token
    if (['GET', 'HEAD', 'OPTIONS'].includes(uppercaseMethod)) {
      return resultHeaders;
    }

    // For state-mutating requests (POST, PUT, PATCH, DELETE), attach X-CSRF-Token if not set
    const existingHeaderKey = Object.keys(resultHeaders).find(
      (k) => k.toLowerCase() === 'x-csrf-token' || k.toLowerCase() === 'csrf-token'
    );

    if (!existingHeaderKey) {
      const token = await this.getCsrfToken();
      if (token) {
        resultHeaders['X-CSRF-Token'] = token;
      }
    }

    return resultHeaders;
  }

  /**
   * Central fetch wrapper with automatic CSRF header injection and safe single-attempt retry on 403 CSRF rejection.
   */
  public async fetchWithCsrf(
    input: string | URL | Request,
    init?: RequestInit
  ): Promise<Response> {
    const fetchFn = typeof window !== 'undefined' && window.fetch ? window.fetch.bind(window) : fetch;
    const method = init?.method || 'GET';
    const initialHeaders = await this.attachCsrfHeader(method, (init?.headers as Record<string, string>) || {});

    const response = await fetchFn(input, {
      ...init,
      headers: initialHeaders,
      credentials: init?.credentials ?? 'include',
    });

    // If a state-mutating request failed with 403 CSRF error, attempt 1 refresh & retry
    if (response.status === 403 && !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) {
      let isCsrfError = false;
      try {
        const cloned = response.clone();
        const body = await cloned.json();
        if (body?.error?.code === 'CSRF_TOKEN_INVALID' || body?.error?.message?.toLowerCase().includes('csrf')) {
          isCsrfError = true;
        }
      } catch {
        // Ignore JSON parse errors
      }

      if (isCsrfError) {
        this.clearToken();
        const freshToken = await this.getCsrfToken(true);
        if (freshToken) {
          const retryHeaders = { ...initialHeaders, 'X-CSRF-Token': freshToken };
          return fetchFn(input, {
            ...init,
            headers: retryHeaders,
            credentials: init?.credentials ?? 'include',
          });
        }
      }
    }

    return response;
  }
}
