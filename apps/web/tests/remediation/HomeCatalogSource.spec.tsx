import { beforeEach, describe, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => Object.fromEntries(['getScholarships', 'getUniversities', 'getMajors', 'getStudyDestinations', 'getInternationalTests', 'getCourses', 'getCmsContent', 'getServices', 'getCareerJobs', 'getStudentTools'].map(name => [name, vi.fn()])));
vi.mock('../../src/api/client', () => ({ ApiClient: api }));
const dto = (originType: string, accessType = 'FREE_STUDY') => ({ ownerId: `owner-${originType}`, publicId: `public-${originType}`, slug: originType.toLowerCase(), displayName: `Owner ${originType}`, canonicalName: 'Published owner fixture', originType, accessType, providerName: 'Actual owner provider' });
beforeEach(() => {
  vi.resetModules(); for (const fn of Object.values(api)) fn.mockReset().mockResolvedValue({ data: [], total: 0 });
  api.getStudentTools.mockResolvedValue([]);
});
describe('published home previews, bounded per origin', () => {
  it('loads external, native and paid records using existing owner filters and keeps real identities', async () => {
    api.getCourses.mockImplementation(async ({ originType }) => ({ data: [dto(originType, originType === 'PAID_COURSE' ? 'PAID' : 'FREE_STUDY')] }));
    const { loadPublishedCourses } = await import('../../src/features/public-template/publicLiveDataSource');
    const result = await loadPublishedCourses('en');
    expect(api.getCourses).toHaveBeenCalledTimes(3);
    for (const originType of ['EXTERNAL_LINKED_COURSE', 'NATIVE_ABSHEER_COURSE', 'PAID_COURSE']) expect(api.getCourses).toHaveBeenCalledWith({ originType, limit: 3 }, 'en');
    expect(result.homeCoursePreviews.global.status).toBe('ready'); expect(result.homeCoursePreviews.native.status).toBe('ready');
    expect(result.homeCoursePreviews.global.courses[0].ownerId).toBe('owner-EXTERNAL_LINKED_COURSE');
    expect(result.homeCoursePreviews.native.courses).toHaveLength(2);
    expect(result.paidCourses).toHaveLength(1); expect(result.importedCourses[0].slug).toBe('external_linked_course');
  });
  it.each(['empty', 'unavailable'] as const)('keeps a native %s independent of a ready global tab', async nativeStatus => {
    api.getCourses.mockImplementation(async ({ originType }) => {
      if (originType === 'EXTERNAL_LINKED_COURSE') return { data: [dto(originType)] };
      if (nativeStatus === 'unavailable') throw new Error('native offline');
      return { data: [] };
    });
    const { loadPublicLiveSnapshot } = await import('../../src/features/public-template/publicLiveDataSource');
    const result = await loadPublicLiveSnapshot('ar');
    expect(result.data.homeCoursePreviews?.global.status).toBe('ready');
    expect(result.data.homeCoursePreviews?.native.status).toBe(nativeStatus);
    expect(result.data.homeCoursePreviews?.native.courses).toEqual([]);
  });
  it('distinguishes successful zero records from a failed owner and reloads newly published content', async () => {
    const { loadPublicLiveSnapshot } = await import('../../src/features/public-template/publicLiveDataSource');
    const empty = await loadPublicLiveSnapshot('ar');
    expect(empty.statuses.universities).toBe('empty'); expect(empty.data.homeCoursePreviews?.global.status).toBe('empty');
    api.getUniversities.mockRejectedValue(new Error('offline')); api.getCourses.mockRejectedValue(new Error('offline'));
    const failed = await loadPublicLiveSnapshot('ar', true);
    expect(failed.statuses.universities).toBe('unavailable'); expect(failed.data.homeCoursePreviews?.global.status).toBe('unavailable');
    api.getUniversities.mockResolvedValue({ data: [{ publicId: 'new-university', slug: 'new-university', displayName: 'New published university', canonicalName: 'New published university', programProfiles: [] }] });
    api.getCourses.mockImplementation(async ({ originType }) => ({ data: originType === 'EXTERNAL_LINKED_COURSE' ? [dto(originType)] : [] }));
    const ready = await loadPublicLiveSnapshot('ar', true);
    expect(ready.statuses.universities).toBe('ready'); expect(ready.data.universities[0].name).toBe('New published university');
    expect(ready.data.homeCoursePreviews?.global.status).toBe('ready'); expect(ready.data.homeCoursePreviews?.native.status).toBe('empty');
  });
  it('uses the requested display name and the owner-projected signed images, never raw asset IDs', async () => {
    const { mapPublicUniversityDto, mapCourse } = await import('../../src/features/public-template/publicLiveDataSource');
    const image = { url: 'https://media.example.test/public-grant', expiresAt: new Date(Date.now() + 240000).toISOString() };
    const university = mapPublicUniversityDto({ publicId: 'uni-fixture', slug: 'uni-fixture', displayName: 'Requested English name', canonicalName: 'English name', localizedNames: { ar: 'اسم المصدر العربي' }, image } as never);
    expect(university.name).toBe('Requested English name'); expect(university.imageUrl).toBe(image.url);
    const mapped = mapCourse({ ...dto('NATIVE_ABSHEER_COURSE'), image, thumbnailAssetId: 'not-a-public-url' } as never);
    expect(mapped.course.imageUrl).toBe(image.url);
  });
  it('does not hide native success or relabel it as paid when only the paid query is unavailable', async () => {
    api.getCourses.mockImplementation(async ({ originType }) => {
      if (originType === 'PAID_COURSE') throw new Error('paid offline');
      return { data: originType === 'NATIVE_ABSHEER_COURSE' ? [dto(originType)] : [] };
    });
    const { loadPublishedCourses } = await import('../../src/features/public-template/publicLiveDataSource');
    const result = await loadPublishedCourses('en');
    expect(result.homeCoursePreviews.native.status).toBe('unavailable'); expect(result.homeCoursePreviews.native.courses).toHaveLength(1);
    expect(result.courses).toHaveLength(1); expect(result.paidCourses).toHaveLength(0);
  });
});
