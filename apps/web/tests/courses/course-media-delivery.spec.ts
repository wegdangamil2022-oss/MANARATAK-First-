import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchCourseMediaBlob } from '../../src/features/learning/course-media-delivery';

const grant = {
  url: 'https://media.example.invalid/capability',
  expiresAt: new Date(Date.now() + 60000).toISOString(),
  headers: { 'X-Media': 'scoped' },
};
afterEach(() => vi.unstubAllGlobals());
describe('bounded enrolled-student media delivery', () => {
  it.each([
    { url: 'http://media.example.invalid/file' },
    { url: 'https://user:password@media.example.invalid/file' },
    { expiresAt: 'invalid' },
    { expiresAt: new Date(0).toISOString() },
  ])('rejects an invalid grant before contacting storage %j', async (override) => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    await expect(fetchCourseMediaBlob({ ...grant, ...override })).rejects.toThrow('GRANT_INVALID');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('omits session credentials and refuses redirects while preserving delivered bytes', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'video/webm' } }),
      );
    vi.stubGlobal('fetch', fetcher);
    const blob = await fetchCourseMediaBlob(grant);
    expect(blob.type).toBe('video/webm');
    expect([...new Uint8Array(await blob.arrayBuffer())]).toEqual([1, 2, 3]);
    expect(fetcher).toHaveBeenCalledWith(new URL(grant.url), {
      headers: grant.headers,
      credentials: 'omit',
      redirect: 'error',
    });
  });
  it('rejects oversized declared content before reading it', async () => {
    const cancelled = vi.fn();
    const stream = new ReadableStream({ cancel: cancelled });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(stream, { headers: { 'Content-Length': '100' } })),
    );
    await expect(fetchCourseMediaBlob(grant, 8)).rejects.toThrow('SIZE_LIMIT');
    expect(cancelled).toHaveBeenCalledOnce();
  });
  it('bounds actual bytes even when the provider omits a content length', async () => {
    const cancelled = vi.fn();
    let count = 0;
    const stream = new ReadableStream({
      pull(controller) {
        controller.enqueue(new Uint8Array(5));
        count++;
      },
      cancel: cancelled,
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(stream)));
    await expect(fetchCourseMediaBlob(grant, 8)).rejects.toThrow('SIZE_LIMIT');
    expect(cancelled).toHaveBeenCalledOnce();
    expect(count).toBeLessThanOrEqual(3);
  });
});
