import { afterEach, describe, expect, it, vi } from 'vitest';
import { CsrfClientManager } from '@manaratak/shared';
import { performAdminRefresh } from './client';

afterEach(() => vi.restoreAllMocks());

describe('Admin session refresh', () => {
  it('preserves the server-side remember-me cookie choice', async () => {
    const fetch = vi.spyOn(CsrfClientManager.prototype, 'fetchWithCsrf')
      .mockResolvedValue(Response.json({ data: { authenticated: true } }));

    expect(await performAdminRefresh()).toBe(true);
    expect(fetch).toHaveBeenCalledOnce();
    const [url, options] = fetch.mock.calls[0];
    expect(String(url)).toContain('/auth/refresh');
    expect(options?.body).toBeUndefined();
  });
});
