import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ANALYTICS_POLICY_VERSION } from '@manaratak/shared';
import {
  publicPageKey,
  saveAnalyticsChoice,
  recordPublicEvent,
} from '../../src/features/analytics/publicAnalytics';
const fetchMock = vi.fn();
beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
  vi.stubGlobal('navigator', { doNotTrack: '0', globalPrivacyControl: false });
  vi.stubGlobal('fetch', fetchMock);
  fetchMock
    .mockReset()
    .mockResolvedValue({ ok: true, status: 202, json: async () => ({ result: 'recorded' }) });
});
afterEach(() => vi.unstubAllGlobals());
describe('First-party collection is limited to explicit public navigation', () => {
  it('classifies public routes without sending personal pages, slugs or query values', () => {
    expect(publicPageKey('/ar/scholarships/private-slug?email=secret')).toBe('scholarships');
    expect(publicPageKey('/en/')).toBe('home');
    for (const path of [
      '/ar/student',
      '/admin/dashboard',
      '/en/login',
      '/ar/verify-email?token=secret',
      '/student/files',
    ])
      expect(publicPageKey(path)).toBeNull();
  });
  it('does not collect without consent, after expiry or under GPC, and never transmits full URLs', async () => {
    await recordPublicEvent('page_view', 'home');
    expect(fetchMock).not.toHaveBeenCalled();
    saveAnalyticsChoice({
      decision: 'accepted',
      policyVersion: ANALYTICS_POLICY_VERSION,
      token: 'a'.repeat(64),
      expiresAt: new Date(Date.now() + 10000).toISOString(),
    });
    await recordPublicEvent(
      'page_view',
      'scholarships',
      undefined,
      '/scholarships/secret?token=private',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain('/public/analytics/events');
    expect(options.credentials).toBe('omit');
    expect(options.body).not.toContain('private');
    expect(options.body).not.toContain('secret');
    await recordPublicEvent(
      'page_view',
      'scholarships',
      undefined,
      '/scholarships/secret?token=private',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.stubGlobal('navigator', { globalPrivacyControl: true });
    await recordPublicEvent('page_view', 'courses');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.stubGlobal('navigator', { globalPrivacyControl: false });
    saveAnalyticsChoice({
      decision: 'accepted',
      policyVersion: ANALYTICS_POLICY_VERSION,
      token: 'a'.repeat(64),
      expiresAt: new Date(0).toISOString(),
    });
    await recordPublicEvent('page_view', 'courses');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
