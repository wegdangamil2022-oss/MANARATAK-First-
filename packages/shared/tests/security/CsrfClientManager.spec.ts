import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { CsrfClientManager } from '../../src/security/CsrfClientManager';

describe('CsrfClientManager', () => {
  beforeEach(() => {
    CsrfClientManager.getInstance().clearToken();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('retrieves CSRF token from the authenticated session endpoint', async () => {
    const manager = CsrfClientManager.getInstance('/api/v1');
    const mockToken = '1711111111111.abcdef1234567890.signaturehash';

    const globalFetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: { csrfToken: mockToken },
      }),
      headers: new Headers({ 'X-CSRF-Token': mockToken }),
    } as any);

    const token = await manager.getCsrfToken();

    expect(token).toBe(mockToken);
    expect(globalFetchSpy).toHaveBeenCalledWith('/api/v1/auth/csrf-token', expect.objectContaining({
      method: 'GET',
      credentials: 'include',
    }));
  });

  it('caches CSRF token in memory and reuses it for subsequent calls', async () => {
    const manager = CsrfClientManager.getInstance('/api/v1');
    const mockToken = 'cached-csrf-token-val';

    const globalFetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { csrfToken: mockToken } }),
    } as any);

    const token1 = await manager.getCsrfToken();
    const token2 = await manager.getCsrfToken();

    expect(token1).toBe(mockToken);
    expect(token2).toBe(mockToken);
    expect(globalFetchSpy).toHaveBeenCalledTimes(1);
  });

  it('attaches X-CSRF-Token header to state-mutating requests (POST, PUT, PATCH, DELETE)', async () => {
    const manager = CsrfClientManager.getInstance('/api/v1');
    manager.setCachedToken('test-attached-token');

    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      const headers = await manager.attachCsrfHeader(method, { 'Content-Type': 'application/json' });
      expect(headers['X-CSRF-Token']).toBe('test-attached-token');
      expect(headers['Content-Type']).toBe('application/json');
    }
  });

  it('does NOT attach X-CSRF-Token header to safe requests (GET, HEAD, OPTIONS)', async () => {
    const manager = CsrfClientManager.getInstance('/api/v1');
    manager.setCachedToken('test-attached-token');

    for (const method of ['GET', 'HEAD', 'OPTIONS']) {
      const headers = await manager.attachCsrfHeader(method, { 'Accept': 'application/json' });
      expect(headers['X-CSRF-Token']).toBeUndefined();
      expect(headers['Accept']).toBe('application/json');
    }
  });

  it('handles 403 CSRF error by clearing token and attempting 1 retry', async () => {
    const manager = CsrfClientManager.getInstance('/api/v1');
    manager.setCachedToken('stale-token');

    let fetchCount = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: any) => {
      fetchCount++;
      const url = String(input);
      if (url.includes('/csrf-token')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { csrfToken: 'fresh-csrf-token' } }),
        } as any;
      }

      if (fetchCount === 1) {
        return {
          ok: false,
          status: 403,
          clone: () => ({
            json: async () => ({ error: { code: 'CSRF_TOKEN_INVALID', message: 'Invalid or missing CSRF token.' } }),
          }),
          json: async () => ({ error: { code: 'CSRF_TOKEN_INVALID', message: 'Invalid or missing CSRF token.' } }),
        } as any;
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      } as any;
    });

    const res = await manager.fetchWithCsrf('/api/v1/protected-action', {
      method: 'POST',
      body: JSON.stringify({ action: 'test' }),
    });

    expect(res.status).toBe(200);
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/v1/protected-action', expect.objectContaining({
      credentials: 'include',
    }));
    const body = await res.json();
    expect(body).toEqual({ success: true });
  });

  it('clears token on clearToken call', () => {
    const manager = CsrfClientManager.getInstance('/api/v1');
    manager.setCachedToken('token-to-clear');
    manager.clearToken();
    expect((manager as any).cachedToken).toBeNull();
  });
});
