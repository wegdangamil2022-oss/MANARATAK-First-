import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { ImportedCourseAdminRouter } from '../../../../src/presentation/api/router/ImportedCourseAdminRouter';

function fixture() {
  const useCases = {
    list: vi.fn().mockResolvedValue({
      data: [], total: 0, page: 1, pageSize: 50, totalPages: 0,
      overview: { total: 0, review: 0, incomplete: 0, broken: 0, needsVerification: 0, ready: 0, published: 0, archived: 0 },
    }),
    get: vi.fn().mockResolvedValue({ id: 'course-1' }),
    update: vi.fn().mockResolvedValue({ id: 'course-1' }),
    verifySource: vi.fn().mockResolvedValue({ verified: true }),
    checkLink: vi.fn().mockResolvedValue({ state: 'VERIFIED_DIRECT' }),
    fetchMissing: vi.fn().mockRejectedValue(new Error('COURSE_FETCH_MISSING_PROVIDER_POLICY_FILE_ONLY')),
    markReady: vi.fn().mockResolvedValue({ id: 'course-1', status: 'READY_TO_PUBLISH' }),
    publish: vi.fn().mockResolvedValue({ id: 'course-1', status: 'PUBLISHED' }),
    unpublish: vi.fn().mockResolvedValue({ id: 'course-1', status: 'READY_TO_REVIEW' }),
    reject: vi.fn().mockResolvedValue({ id: 'course-1', status: 'REJECTED' }),
    archive: vi.fn().mockResolvedValue({ id: 'course-1', status: 'ARCHIVED' }),
  };
  const app = express();
  app.use(express.json());
  app.use('/admin/courses/imported', ImportedCourseAdminRouter.create({
    importedCourseAdminUseCases: useCases as any,
  }));
  return { app, useCases };
}

describe('ImportedCourseAdminRouter', () => {
  it('GET /admin/courses/imported parses runtime filters', async () => {
    const f = fixture();
    const res = await request(f.app).get('/admin/courses/imported?providerId=p1&status=IMPORTED&page=2&pageSize=25');
    expect(res.status).toBe(200);
    expect(f.useCases.list).toHaveBeenCalledWith(expect.objectContaining({
      providerId: 'p1',
      status: 'IMPORTED',
      page: 2,
      pageSize: 25,
    }));
  });

  it('uses explicit verify-source and check-link endpoints', async () => {
    const f = fixture();
    expect((await request(f.app).post('/admin/courses/imported/course-1/verify-source')).status).toBe(200);
    expect((await request(f.app).post('/admin/courses/imported/course-1/check-link')).status).toBe(200);
    expect(f.useCases.verifySource).toHaveBeenCalledWith('course-1');
    expect(f.useCases.checkLink).toHaveBeenCalledWith('course-1');
  });

  it('supports PATCH without allowing arbitrary readonly fields', async () => {
    const f = fixture();
    const res = await request(f.app)
      .patch('/admin/courses/imported/course-1')
      .send({ displayName: 'Updated', id: 'injected' });
    expect(res.status).toBe(400);
    expect(f.useCases.update).not.toHaveBeenCalled();
  });

  it('maps fetch-missing provider policy refusal to 409', async () => {
    const f = fixture();
    const res = await request(f.app).post('/admin/courses/imported/course-1/fetch-missing');
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('COURSE_FETCH_MISSING_PROVIDER_POLICY_FILE_ONLY');
  });

  it('does not implement a generic action route', async () => {
    const f = fixture();
    const res = await request(f.app).post('/admin/courses/imported/course-1/ARBITRARY_ACTION');
    expect(res.status).toBe(404);
  });
});
