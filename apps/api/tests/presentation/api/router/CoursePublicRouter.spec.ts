import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { CourseAccessType, CourseOriginType } from '@manaratak/domain';
import { CoursePublicRouter } from '../../../../src/presentation/api/router/CoursePublicRouter';

describe('CoursePublicRouter', () => {
  const createMockUseCases = () => ({
    listCourses: vi.fn(),
    getCourse: vi.fn(),
    localizeRelationshipPage: vi.fn((result) => result),
  });

  const createRelationshipQueryService = () => ({ listPublishedRelatedCourses: vi.fn() });

  const createApp = (useCases: ReturnType<typeof createMockUseCases>, relationshipQueryService = createRelationshipQueryService(), imageServices = {}) => {
    const app = express();
    app.use(express.json());
    app.use('/public/courses', CoursePublicRouter.create({ publicCourseUseCases: useCases as any, courseRelationshipQueryService: relationshipQueryService as any, ...imageServices }));
    return app;
  };

  it('GET /public/courses parses filters and cursor limit', async () => {
    const useCases = createMockUseCases();
    useCases.listCourses.mockResolvedValue({ data: [], total: 0, page: 2, pageSize: 50, totalPages: 0 });
    const app = createApp(useCases);

    const res = await request(app).get('/public/courses?accessType=FREE_CERTIFICATE&originType=EXTERNAL_LINKED_COURSE&platformName=Global%20Learning&limit=50');

    expect(res.status).toBe(200);
    expect(useCases.listCourses).toHaveBeenCalledWith({
      accessType: CourseAccessType.FREE_CERTIFICATE,
      originType: CourseOriginType.EXTERNAL_LINKED_COURSE,
      platformName: 'Global Learning',
      limit: 50
    }, 'ar');
  });


  it('routes canonical majorId through the P13 relationship read model instead of text lookup', async () => {
    const useCases = createMockUseCases();
    const relationshipQueryService = createRelationshipQueryService();
    relationshipQueryService.listPublishedRelatedCourses.mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 });
    const res = await request(createApp(useCases, relationshipQueryService)).get('/public/courses?majorId=major-1');
    expect(res.status).toBe(200);
    expect(relationshipQueryService.listPublishedRelatedCourses).toHaveBeenCalledWith(expect.objectContaining({ majorId: 'major-1' }));
    expect(useCases.listCourses).not.toHaveBeenCalled();
  });

  it('rejects invalid relationship pagination before it reaches the repository', async () => {
    const useCases = createMockUseCases();
    const relationshipQueryService = createRelationshipQueryService();
    const res = await request(createApp(useCases, relationshipQueryService)).get('/public/courses?majorId=major-1&limit=0');
    expect(res.status).toBe(400);
    expect(relationshipQueryService.listPublishedRelatedCourses).not.toHaveBeenCalled();
  });

  it('GET /public/courses/:slug returns a public course', async () => {
    const useCases = createMockUseCases();
    useCases.getCourse.mockResolvedValue({ slug: 'intro-data-science', displayName: 'Introduction to Data Science' });
    const app = createApp(useCases);

    const res = await request(app).get('/public/courses/intro-data-science');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ slug: 'intro-data-science', displayName: 'Introduction to Data Science', image: null });
    expect(useCases.getCourse).toHaveBeenCalledWith('intro-data-science', 'ar');
  });

  it('adds a safe published thumbnail and never grants a missing/unpublished course', async () => {
    const useCases = createMockUseCases();
    const grant = { url: 'https://media.example.test/course', expiresAt: new Date(Date.now() + 240000).toISOString(), headers: {} };
    const imageServices = { assetReferencePolicy: { assertUsable: vi.fn().mockResolvedValue({}) }, processAssetLifecycleUseCase: { requestDeliveryGrant: vi.fn().mockResolvedValue(grant) } };
    useCases.getCourse.mockResolvedValue({ slug: 'published', thumbnailAssetId: 'thumb-fixture' });
    const app = createApp(useCases, createRelationshipQueryService(), imageServices);
    const success = await request(app).get('/public/courses/published');
    expect(success.status).toBe(200); expect(success.headers['cache-control']).toBe('no-store'); expect(success.body.image).toEqual({ url: grant.url, expiresAt: grant.expiresAt });
    imageServices.processAssetLifecycleUseCase.requestDeliveryGrant.mockClear();
    useCases.getCourse.mockRejectedValue(new Error('Course not found'));
    expect((await request(app).get('/public/courses/private')).status).toBe(404);
    expect(imageServices.processAssetLifecycleUseCase.requestDeliveryGrant).not.toHaveBeenCalled();
  });

  it('GET /public/courses/:slug returns 404 when hidden or missing', async () => {
    const useCases = createMockUseCases();
    useCases.getCourse.mockRejectedValue(new Error('Course not found'));
    const app = createApp(useCases);

    const res = await request(app).get('/public/courses/intro-data-science');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found' });
  });
  it('forwards locale to normal and relationship course projections', async () => {
    const useCases = createMockUseCases();
    const relationshipQueryService = createRelationshipQueryService();
    relationshipQueryService.listPublishedRelatedCourses.mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 });
    const res = await request(createApp(useCases, relationshipQueryService)).get('/public/courses?majorId=major-1&locale=en');

    expect(res.status).toBe(200);
    expect(useCases.localizeRelationshipPage).toHaveBeenCalledWith(expect.any(Object), 'en');
  });

  it('rejects unsupported locales using the common locale error contract', async () => {
    const useCases = createMockUseCases();
    const res = await request(createApp(useCases)).get('/public/courses?locale=fr');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('UNSUPPORTED_LOCALE');
  });

});
