import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminRequestQueue } from '../../src/api/AdminRequestQueue';
const state = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock('@manaratak/shared', async (original) => ({
  ...(await original<typeof import('@manaratak/shared')>()),
  CsrfClientManager: { getInstance: () => ({ fetchWithCsrf: state.fetch, clearToken: vi.fn() }) },
}));
import {
  adminApiClient,
  abortAllPendingAdminRequests,
  setAdminAuthStatus,
} from '../../src/api/client';
const signal = () => new AbortController().signal;
const tick = async () => {
  for (let i = 0; i < 12; i++) await Promise.resolve();
};
beforeEach(() => {
  abortAllPendingAdminRequests();
  setAdminAuthStatus('AUTHORIZED');
  state.fetch.mockReset();
});
afterEach(() => vi.unstubAllGlobals());
describe('admin read scheduling during navigation', () => {
  it('removes an aborted old-page read before the new page acquires the slot', async () => {
    const queue = new AdminRequestQueue(1),
      release = await queue.acquire(signal());
    const oldPage = new AbortController();
    const oldRead = queue.acquire(oldPage.signal);
    const rejected = expect(oldRead).rejects.toThrow('REQUEST_ABORTED');
    const newRead = queue.acquire(signal());
    oldPage.abort();
    await rejected;
    release();
    (await newRead)();
  });
  it('keeps the concurrency ceiling even when an old session finishes after reset', async () => {
    const queue = new AdminRequestQueue(1),
      oldRelease = await queue.acquire(signal());
    queue.reset();
    const currentRelease = await queue.acquire(signal());
    let started = false;
    const next = queue.acquire(signal()).then((release) => {
      started = true;
      return release;
    });
    oldRelease();
    oldRelease();
    await tick();
    expect(started).toBe(false);
    currentRelease();
    (await next)();
  });
  it('rejects an already canceled request and cancels queued reads on session reset', async () => {
    const queue = new AdminRequestQueue(1),
      controller = new AbortController();
    controller.abort();
    await expect(queue.acquire(controller.signal)).rejects.toThrow('REQUEST_ABORTED');
    const release = await queue.acquire(signal()),
      pending = queue.acquire(signal());
    const rejected = expect(pending).rejects.toThrow('REQUEST_ABORTED');
    queue.reset();
    await rejected;
    release();
  });
  it('never starts an obsolete queued transport after navigation', async () => {
    const finishes: Array<() => void> = [];
    state.fetch.mockImplementation(
      () => new Promise((resolve) => finishes.push(() => resolve(new Response('{}')))),
    );
    const busy = Array.from({ length: 3 }, (_, i) =>
      adminApiClient.request(`/admin/queue/busy-${i}`, { cache: 'no-store' }),
    );
    await tick();
    expect(state.fetch).toHaveBeenCalledTimes(3);
    const controller = new AbortController();
    const obsolete = adminApiClient.request('/admin/queue/obsolete', {
      signal: controller.signal,
      cache: 'no-store',
    });
    const rejected = expect(obsolete).rejects.toThrow('REQUEST_ABORTED');
    controller.abort();
    await rejected;
    finishes.splice(0).forEach((finish) => finish());
    await Promise.all(busy);
    expect(state.fetch).toHaveBeenCalledTimes(3);
    state.fetch.mockResolvedValue(new Response('{}'));
    await adminApiClient.request('/admin/queue/new', { cache: 'no-store' });
    expect(state.fetch).toHaveBeenCalledTimes(4);
  });
  it('cancels active caller-scoped reads when the admin session ends', async () => {
    state.fetch.mockImplementation(
      (_url, options: RequestInit) =>
        new Promise((_resolve, reject) => {
          options.signal!.addEventListener('abort', () => reject(new Error('REQUEST_ABORTED')), {
            once: true,
          });
        }),
    );
    const pending = adminApiClient.request('/admin/queue/active', {
      signal: signal(),
      cache: 'no-store',
    });
    const rejected = expect(pending).rejects.toThrow('REQUEST_ABORTED');
    await tick();
    abortAllPendingAdminRequests();
    await rejected;
  });
});
