import { beforeEach, describe, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => Object.fromEntries(['getScholarships','getUniversities','getMajors','getStudyDestinations','getInternationalTests','getCourses','getCmsContent','getServices','getCareerJobs','getStudentTools'].map(name => [name, vi.fn()])));
vi.mock('../../src/api/client', () => ({ ApiClient: api }));
beforeEach(() => {
  vi.resetModules();
  for (const fn of Object.values(api)) fn.mockReset().mockResolvedValue({ data: [], total: 0, hasMore: true, nextCursor: 'another-page', totalPages: 200 });
  api.getStudentTools.mockResolvedValue([]);
});
describe('B08 bounded locale snapshots', () => {
  it('loads a bounded preview for each owner, including locale, without following any continuation', async () => {
    const { loadPublicLiveSnapshot } = await import('../../src/features/public-template/publicLiveDataSource');
    const result = await loadPublicLiveSnapshot('en');
    for (const name of ['getScholarships','getUniversities','getMajors','getServices','getCareerJobs']) expect(api[name]).toHaveBeenCalledOnce();
    expect(api.getScholarships).toHaveBeenCalledWith({ cursor: undefined, limit: 20 }, 'en');
    expect(api.getCourses).toHaveBeenCalledTimes(3);
    for (const originType of ['EXTERNAL_LINKED_COURSE', 'NATIVE_MANARATAK_COURSE', 'PAID_COURSE']) expect(api.getCourses).toHaveBeenCalledWith({ originType, limit: 3 }, 'en');
    expect(api.getServices).toHaveBeenCalledWith({ limit: 20, locale: 'en' });
    expect(api.getCareerJobs).toHaveBeenCalledWith({ limit: 20, locale: 'en' });
    expect(api.getStudyDestinations).toHaveBeenCalledTimes(2);
    expect(api.getStudyDestinations).toHaveBeenCalledWith({ page: 1, pageSize: 8, isFeatured: true });
    expect(api.getCmsContent).toHaveBeenCalledTimes(4);
    expect(api.getCmsContent.mock.calls.every(([input]) => input.locale === 'en' && input.page === 1)).toBe(true);
    expect(result.statuses.scholarships).toBe('empty');
    expect(JSON.stringify(result.data)).not.toContain('prototype');
  });
  it('forwards the service locale on refresh and keeps locale cache entries independent', async () => {
    const { loadPublicLiveSnapshot, refreshPublishedServices } = await import('../../src/features/public-template/publicLiveDataSource');
    await loadPublicLiveSnapshot('ar'); await loadPublicLiveSnapshot('en');
    await refreshPublishedServices('en');
    expect(api.getServices).toHaveBeenLastCalledWith({ limit: 20, locale: 'en' });
    await loadPublicLiveSnapshot('ar');
    expect(api.getScholarships).toHaveBeenCalledTimes(2);
  });
  it('does not let an old forced request overwrite the newer snapshot cache', async () => {
    let reject!: (error: Error) => void;
    api.getUniversities.mockImplementationOnce(() => new Promise((_resolve, fail) => { reject = fail; })).mockResolvedValue({ data: [], total: 0 });
    const { loadPublicLiveSnapshot } = await import('../../src/features/public-template/publicLiveDataSource');
    const old = loadPublicLiveSnapshot('ar');
    const fresh = await loadPublicLiveSnapshot('ar', true);
    reject(new Error('old failure')); await old;
    expect(fresh.statuses.universities).toBe('empty');
    expect((await loadPublicLiveSnapshot('ar')).statuses.universities).toBe('empty');
  });
});
