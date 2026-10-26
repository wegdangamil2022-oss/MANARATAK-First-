import { beforeEach, describe, it, expect, vi } from 'vitest';
vi.mock('../../src/api/client', () => ({ adminApiClient: { request: vi.fn() } }));
import { adminApiClient } from '../../src/api/client';
import { saveMajorContent } from '../../src/features/majors/MajorContentCommands';

const input = {
  majorId: 'root',
  profileId: 'profile',
  versionId: 'working',
  revision: 8,
  reason: 'Reviewed source mapping',
  sections: [
    {
      id: 'section',
      sectionKey: '02-manual',
      locale: 'ar',
      title: 'نبذة',
      content: 'نص المصدر',
      reviewStatus: 'NEEDS_REVIEW',
      groupNumber: 2,
      sourceUri: 'https://example.org/evidence',
    },
  ],
};
const persisted = {
  ...input.sections[0],
  profileId: 'profile',
  versionId: 'working',
  metadata: {
    manualGroupNumber: 2,
    groupAssignmentHistory: [{ sourceUri: input.sections[0].sourceUri }],
  },
};
describe('canonical major save and independent readback', () => {
  const request = vi.mocked(adminApiClient.request);
  beforeEach(() => request.mockReset());
  it('pins the owner revision, exact degree profile and working version then independently verifies content', async () => {
    request
      .mockResolvedValueOnce({ success: true, profileId: 'profile', versionId: 'working' })
      .mockResolvedValueOnce({ data: [persisted] });
    await expect(saveMajorContent(input)).resolves.toEqual([persisted]);
    expect(request.mock.calls[0][1]?.headers).toEqual({ 'If-Match': '"8"' });
    expect(JSON.parse(String(request.mock.calls[0][1]?.body))).toMatchObject({
      profileId: 'profile',
      versionId: 'working',
      reason: input.reason,
    });
    expect(request.mock.calls[1][0]).toContain('profileId=profile&versionId=working');
    expect(request.mock.calls[1][1]).toEqual({ cache: 'no-store' });
  });
  it.each([
    { content: 'changed' },
    { profileId: 'another' },
    { versionId: 'published' },
    { locale: 'en' },
    { metadata: { manualGroupNumber: 3 } },
  ])('refuses a mismatched readback and keeps the caller draft', async (change) => {
    request
      .mockResolvedValueOnce({ success: true, profileId: 'profile', versionId: 'working' })
      .mockResolvedValueOnce({ data: [{ ...persisted, ...change }] });
    const draft = structuredClone(input);
    await expect(saveMajorContent(draft)).rejects.toThrow('بقيت مسودتك');
    expect(draft).toEqual(input);
  });
  it('does not trust a successful response for another scope', async () => {
    request.mockResolvedValueOnce({ success: true, profileId: 'other', versionId: 'working' });
    await expect(saveMajorContent(input)).rejects.toThrow('بقيت مسودتك');
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('requires a visible reason and trusted revision before sending', async () => {
    await expect(saveMajorContent({ ...input, reason: ' ' })).rejects.toThrow('سبب');
    await expect(saveMajorContent({ ...input, revision: NaN })).rejects.toThrow('رقم مراجعة');
    expect(request).not.toHaveBeenCalled();
  });
});
