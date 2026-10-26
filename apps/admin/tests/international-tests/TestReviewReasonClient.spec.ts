import { beforeEach, describe, it, expect, vi } from 'vitest';
const { fetcher } = vi.hoisted(() => ({ fetcher: vi.fn() }));
vi.mock('@manaratak/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@manaratak/shared')>();
  return {
    ...actual,
    CsrfClientManager: { getInstance: () => ({ fetchWithCsrf: fetcher, clearToken: vi.fn() }) },
  };
});
import {
  adminApiClient,
  abortAllPendingAdminRequests,
  setInternationalTestReviewReason,
  setAdminAuthStatus,
} from '../../src/api/client';
import { readReviewReasonHeader } from '@manaratak/shared';
const id = '00000000-0000-4000-8000-000000000006';
describe('scoped test editing reason and canonical revision transport', () => {
  beforeEach(() => {
    abortAllPendingAdminRequests();
    setAdminAuthStatus('AUTHORIZED');
    fetcher.mockReset();
    fetcher.mockImplementation(
      async () =>
        new Response(JSON.stringify({ id, revision: 7 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
  });
  it('blocks an operational edit with no reason before sending it', async () => {
    await adminApiClient.getInternationalTest(id);
    await expect(
      adminApiClient.updateInternationalTest(id, { registrationRequirements: 'source text' }),
    ).rejects.toThrow('مبرر');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('preserves Arabic reason text and pins the loaded revision', async () => {
    await adminApiClient.getInternationalTest(id);
    setInternationalTestReviewReason(id, 'تحديث موثق من المصدر');
    await adminApiClient.updateInternationalTest(id, { registrationRequirements: 'نص المصدر' });
    const headers = new Headers(fetcher.mock.calls[1][1].headers);
    expect(headers.get('If-Match')).toBe('"7"');
    expect(
      readReviewReasonHeader(
        headers.get('X-Review-Reason') ?? undefined,
        headers.get('X-Review-Reason-Encoding') ?? undefined,
      ),
    ).toBe('تحديث موثق من المصدر');
  });
  it('uses the source-name review reason rather than an unrelated operational draft', async () => {
    await adminApiClient.getInternationalTest(id);
    setInternationalTestReviewReason(id, 'Unrelated draft');
    await adminApiClient.reviewInternationalTestSourceNames(id, {
      versionId: 'source',
      reviewReason: 'مراجعة أسماء المصدر',
    });
    const headers = new Headers(fetcher.mock.calls[1][1].headers);
    expect(
      readReviewReasonHeader(
        headers.get('X-Review-Reason') ?? undefined,
        headers.get('X-Review-Reason-Encoding') ?? undefined,
      ),
    ).toBe('مراجعة أسماء المصدر');
  });
  it('clears review reason context with the authenticated session', async () => {
    await adminApiClient.getInternationalTest(id);
    setInternationalTestReviewReason(id, 'Scoped reason');
    abortAllPendingAdminRequests();
    await adminApiClient.getInternationalTest(id);
    await expect(
      adminApiClient.updateInternationalTest(id, { abbreviation: 'UI' }),
    ).rejects.toThrow('مبرر');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
