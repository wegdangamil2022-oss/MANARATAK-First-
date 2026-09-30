import { afterEach, describe, expect, it, vi } from 'vitest';
import { CsrfClientManager } from '@manaratak/shared';
import { apiFetch } from './client';

afterEach(() => vi.restoreAllMocks());

describe('public account session refresh', () => {
  it('retries after a transient 500 without changing the remember-me cookie choice', async () => {
    let refreshAttempts = 0;
    let resourceAttempts = 0;
    const fetch = vi.spyOn(CsrfClientManager.prototype, 'fetchWithCsrf').mockImplementation(async (input) => {
      if (String(input).endsWith('/auth/refresh')) {
        refreshAttempts++;
        return refreshAttempts === 1
          ? new Response('{}', { status: 500 })
          : Response.json({ data: { authenticated: true } });
      }
      resourceAttempts++;
      return new Response('{}', { status: resourceAttempts < 3 ? 401 : 200 });
    });

    expect((await apiFetch('/api/v1/student/workspace')).status).toBe(401);
    expect((await apiFetch('/api/v1/student/workspace')).status).toBe(200);
    expect(refreshAttempts).toBe(2);
    const refreshCalls = fetch.mock.calls.filter(([input]) => String(input).endsWith('/auth/refresh'));
    expect(refreshCalls.every(([, options]) => options?.body === undefined)).toBe(true);
  });
});
