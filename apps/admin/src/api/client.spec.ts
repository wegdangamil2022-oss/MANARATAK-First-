import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const security = vi.hoisted(() => ({ fetchWithCsrf: vi.fn(), clearToken: vi.fn() }));
vi.mock('@manaratak/shared', () => ({ CsrfClientManager: { getInstance: () => security } }));

beforeEach(() => {
  vi.resetModules(); security.fetchWithCsrf.mockReset(); security.clearToken.mockReset();
  vi.stubGlobal('window', { dispatchEvent: vi.fn() });
});
afterEach(() => vi.unstubAllGlobals());
const unauthorized = () => Response.json({ error: { message: 'Session expired' } }, { status: 401 });
const refreshed = () => Response.json({ data: { authenticated: true } });

describe('Admin session refresh and command retry', () => {
  it('preserves the server-side remember-me cookie choice', async () => {
    const { performAdminRefresh } = await import('./client');
    security.fetchWithCsrf.mockResolvedValue(refreshed());
    expect(await performAdminRefresh()).toBe(true);
    expect(security.fetchWithCsrf).toHaveBeenCalledOnce();
    expect(security.fetchWithCsrf.mock.calls[0][1].body).toBeUndefined();
    expect(security.clearToken).toHaveBeenCalledOnce();
  });

  it.each([undefined, 'caller-command-key'])('keeps headers, key, body and signal across one retry (%s)', async (explicitKey) => {
    const { adminApiClient } = await import('./client'); adminApiClient.setAdminAuthStatus('AUTHORIZED');
    security.fetchWithCsrf.mockResolvedValueOnce(unauthorized()).mockResolvedValueOnce(refreshed()).mockResolvedValueOnce(Response.json({ saved: true }));
    const controller = new AbortController();
    const payload = JSON.stringify({ name: 'Yemen' });
    const result = await adminApiClient.request('/admin/reference-data/countries/YE', {
      method: 'PUT', body: payload, signal: controller.signal,
      headers: { 'X-Correlation-ID': 'trace-1', 'If-Match': 'v3' }, idempotencyKey: explicitKey,
    });
    expect(result).toEqual({ saved: true });
    const first = security.fetchWithCsrf.mock.calls[0][1] as RequestInit;
    const retry = security.fetchWithCsrf.mock.calls[2][1] as RequestInit;
    const firstHeaders = new Headers(first.headers); const retryHeaders = new Headers(retry.headers);
    expect(firstHeaders.get('Idempotency-Key')).toBeTruthy();
    if (explicitKey) expect(firstHeaders.get('Idempotency-Key')).toBe(explicitKey);
    expect([...retryHeaders]).toEqual([...firstHeaders]);
    expect(retryHeaders.get('X-Correlation-ID')).toBe('trace-1');
    expect(retry.body).toBe(payload); expect(retry.signal).toBe(controller.signal); expect(retry.credentials).toBe('include');
    expect(security.fetchWithCsrf).toHaveBeenCalledTimes(3);
  });

  it('preserves a header-supplied key instead of overriding it with the option', async () => {
    const { adminApiClient } = await import('./client'); adminApiClient.setAdminAuthStatus('AUTHORIZED');
    security.fetchWithCsrf.mockResolvedValueOnce(unauthorized()).mockResolvedValueOnce(refreshed()).mockResolvedValueOnce(Response.json({}));
    await adminApiClient.request('/admin/item', { method: 'POST', headers: { 'Idempotency-Key': 'header-command-key' }, idempotencyKey: 'option-key' });
    for (const index of [0, 2]) expect(new Headers(security.fetchWithCsrf.mock.calls[index][1].headers).get('Idempotency-Key')).toBe('header-command-key');
  });

  it('shares one refresh between concurrent unauthorized commands', async () => {
    const { adminApiClient } = await import('./client'); adminApiClient.setAdminAuthStatus('AUTHORIZED');
    let finish!: (value: Response) => void; const refresh = new Promise<Response>((resolve) => { finish = resolve; });
    const attempts = new Map<string, number>();
    security.fetchWithCsrf.mockImplementation((url: string) => {
      if (url.endsWith('/auth/refresh')) return refresh;
      const count = (attempts.get(url) ?? 0) + 1; attempts.set(url, count);
      return Promise.resolve(count === 1 ? unauthorized() : Response.json({ saved: true }));
    });
    const commands = [adminApiClient.request('/admin/a', { method: 'PUT' }), adminApiClient.request('/admin/b', { method: 'PUT' })];
    await vi.waitFor(() => expect(security.fetchWithCsrf.mock.calls.filter(([url]) => url.endsWith('/auth/refresh'))).toHaveLength(1));
    finish(refreshed()); await expect(Promise.all(commands)).resolves.toHaveLength(2);
    expect(security.fetchWithCsrf).toHaveBeenCalledTimes(5);
  });

  it.each(['denied', 'network'])('does not replay a write when refresh fails (%s), and asks for login', async (failure) => {
    const { adminApiClient } = await import('./client'); adminApiClient.setAdminAuthStatus('AUTHORIZED');
    security.fetchWithCsrf.mockResolvedValueOnce(unauthorized());
    if (failure === 'denied') security.fetchWithCsrf.mockResolvedValueOnce(unauthorized());
    else security.fetchWithCsrf.mockRejectedValueOnce(new Error('Network offline'));
    await expect(adminApiClient.request('/admin/a', { method: 'PUT' })).rejects.toThrow('[401]');
    expect(security.fetchWithCsrf).toHaveBeenCalledTimes(2);
    expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'manaratak-admin-session-expired' }));
    await expect(adminApiClient.request('/admin/b')).rejects.toThrow('ADMIN_AUTH_GUARD');
    expect(security.fetchWithCsrf).toHaveBeenCalledTimes(2);
  });

  it('does not loop on a second 401 after a successful refresh', async () => {
    const { adminApiClient } = await import('./client'); adminApiClient.setAdminAuthStatus('AUTHORIZED');
    security.fetchWithCsrf.mockResolvedValueOnce(unauthorized()).mockResolvedValueOnce(refreshed()).mockResolvedValueOnce(unauthorized());
    await expect(adminApiClient.request('/admin/a', { method: 'PUT' })).rejects.toThrow('[401]');
    expect(security.fetchWithCsrf).toHaveBeenCalledTimes(3);
    expect(window.dispatchEvent).toHaveBeenCalledOnce();
  });

  it('does not retry a command cancelled while refresh was pending', async () => {
    const { adminApiClient } = await import('./client'); adminApiClient.setAdminAuthStatus('AUTHORIZED');
    const controller = new AbortController();
    security.fetchWithCsrf.mockResolvedValueOnce(unauthorized()).mockImplementationOnce(async () => { controller.abort(); return refreshed(); });
    await expect(adminApiClient.request('/admin/a', { method: 'PUT', signal: controller.signal })).rejects.toThrow('REQUEST_ABORTED');
    expect(security.fetchWithCsrf).toHaveBeenCalledTimes(2);
  });

  it.each([403, 409])('does not refresh or retry a permission/idempotency rejection (%s)', async (status) => {
    const { adminApiClient } = await import('./client'); adminApiClient.setAdminAuthStatus('AUTHORIZED');
    security.fetchWithCsrf.mockResolvedValue(Response.json({ detail: 'Rejected' }, { status }));
    await expect(adminApiClient.request('/admin/a', { method: 'PUT' })).rejects.toThrow(`[${status}]`);
    expect(security.fetchWithCsrf).toHaveBeenCalledOnce();
  });

  it('does not replay into a changed session even with a caller-owned signal', async () => {
    const { adminApiClient } = await import('./client'); adminApiClient.setAdminAuthStatus('AUTHORIZED');
    const controller = new AbortController();
    security.fetchWithCsrf.mockResolvedValueOnce(unauthorized()).mockImplementationOnce(async () => {
      adminApiClient.clearSecuritySession(); return refreshed();
    });
    await expect(adminApiClient.request('/admin/a', { method: 'PUT', signal: controller.signal })).rejects.toThrow('REQUEST_ABORTED');
    expect(controller.signal.aborted).toBe(false);
    expect(security.fetchWithCsrf).toHaveBeenCalledTimes(2);
  });
});
