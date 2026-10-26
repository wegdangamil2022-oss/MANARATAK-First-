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
    createManual: vi.fn().mockResolvedValue({ id: 'manual-1', status: 'DRAFT' }),
  };
  const execute = vi.fn(async (_kind: string, _id: string, _action: string, _context: unknown, work: (scope: {importedCourseAdminUseCases: typeof useCases}) => Promise<unknown>) => ({value: await work({importedCourseAdminUseCases: useCases}), version: 2}));
  const app = express();
  const bulk = { preview: vi.fn().mockResolvedValue({ summary: { id: 'batch' } }), read: vi.fn().mockResolvedValue({ data: [] }),
    confirm: vi.fn().mockResolvedValue({}), step: vi.fn().mockResolvedValue({}), list: vi.fn().mockResolvedValue({ data: [] }), retry: vi.fn().mockResolvedValue({}) };
  app.use(express.json());
  app.use((req,_res,next)=>{req.authUserId='reviewer-1';next();});
  app.use('/admin/courses/imported', ImportedCourseAdminRouter.create({
    courseAdminCommandUseCases: {execute} as any,
    adminCourseUseCases: {getCourse: vi.fn().mockResolvedValue({version:2})} as any,
    importedCourseAdminUseCases: useCases as any,
    courseBulkPublicationUseCases: bulk as never,
  }));
  return { app, useCases, execute, bulk };
}

describe('ImportedCourseAdminRouter', () => {
  it('creates a dedicated manual draft with audited Arabic reason and rejects arbitrary origin/status', async () => {
    const f = fixture(); const input = { originalSourceTitle: 'Manual course', externalProviderId: 'provider', directCourseUrl: 'https://example.org/course/1', evidenceUrl: 'https://example.org/course/1', evidenceObservedAt: '2026-01-01T00:00:00Z' };
    const { reviewReasonHeaders } = await import('@manaratak/shared');
    const res = await request(f.app).post('/admin/courses/imported').set(reviewReasonHeaders('إضافة دورة موثقة')).send(input);
    expect(res.status).toBe(201); expect(f.useCases.createManual).toHaveBeenCalledWith(input, 'reviewer-1');
    expect(f.execute.mock.calls[0][2]).toBe('MANUAL_EXTERNAL_COURSE_CREATED');
    expect(f.execute.mock.calls[0][3]).toMatchObject({ actorId: 'reviewer-1', reason: 'إضافة دورة موثقة' });
    expect((await request(f.app).post('/admin/courses/imported').set('X-Review-Reason', 'Manual reason').send({ ...input, status: 'PUBLISHED' })).status).toBe(400);
    expect((await request(f.app).post('/admin/courses/imported').set('X-Review-Reason', 'Manual reason').send({ ...input, directCourseUrl: 'https://user:pass@example.org/course/1' })).status).toBe(400);
  });
  it('does not disclose infrastructure errors from the manual persistence boundary', async () => {
    const f = fixture(); f.useCases.createManual.mockRejectedValue(new Error('SQL connection private credential sentinel'));
    const response = await request(f.app).post('/admin/courses/imported').set('X-Review-Reason', 'Create manual course').send({ originalSourceTitle: 'Manual course', externalProviderId: 'provider', directCourseUrl: 'https://example.org/course/1', evidenceUrl: 'https://example.org/course/1', evidenceObservedAt: '2026-01-01T00:00:00Z' });
    expect(response.status).toBe(503); expect(response.body).toEqual({ error: 'IMPORTED_COURSE_SERVICE_UNAVAILABLE' });
  });
  it('routes bulk operations separately from course mutations and binds the actor to the authenticated session', async () => {
    const f = fixture(); const id = 'd2b4a077-7072-40f6-a03c-2891f5c5a713';
    const res = await request(f.app).post('/admin/courses/imported/bulk/preview').set('X-Review-Reason', 'Freeze selection').set('Idempotency-Key', 'preview-key-001').send({ mode: 'IDS', ids: [id] });
    expect(res.status).toBe(201); expect(f.bulk.preview).toHaveBeenCalledWith({ ids: [id] }, 'reviewer-1', 'Freeze selection', 'preview-key-001');
    expect(f.execute).not.toHaveBeenCalled();
    expect((await request(f.app).get('/admin/courses/imported/bulk')).status).toBe(200);
    expect((await request(f.app).post(`/admin/courses/imported/bulk/${id}/step`).send({})).status).toBe(200);
    expect(f.bulk.step).toHaveBeenCalledWith(id, 'reviewer-1');
    expect((await request(f.app).post(`/admin/courses/imported/bulk/${id}/confirm`).set('X-Review-Reason', 'Confirm selection').send({ digest: 'a'.repeat(64), eligibleOnly: true, actorId: 'injected' })).status).toBe(400);
    expect(f.bulk.confirm).not.toHaveBeenCalled();
  });
  it('rejects unbounded/mixed-origin selection filters and caps report pages', async () => {
    const f = fixture();
    expect((await request(f.app).post('/admin/courses/imported/bulk/preview').set('X-Review-Reason', 'Freeze selection').set('Idempotency-Key', 'preview-key-001').send({ mode: 'FILTER', filters: { originType: 'NATIVE_MANARATAK_COURSE' } })).status).toBe(400);
    expect((await request(f.app).get('/admin/courses/imported/bulk/d2b4a077-7072-40f6-a03c-2891f5c5a713?page=1001')).status).toBe(400);
    expect(f.bulk.preview).not.toHaveBeenCalled();
  });
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
    expect((await request(f.app).post('/admin/courses/imported/course-1/verify-source').set('If-Match', '1').set('X-Review-Reason', 'Reviewed source')).status).toBe(200);
    expect((await request(f.app).post('/admin/courses/imported/course-1/check-link').set('If-Match', '1').set('X-Review-Reason', 'Reviewed source')).status).toBe(200);
    expect(f.useCases.verifySource).toHaveBeenCalledWith('course-1');
    expect(f.useCases.checkLink).toHaveBeenCalledWith('course-1');
    expect(f.execute).toHaveBeenCalledTimes(2);
    expect(f.execute).toHaveBeenCalledWith('COURSE', 'course-1', 'IMPORTED_COURSE_ADMIN_COMMAND',
      expect.objectContaining({actorId: 'reviewer-1', expectedVersion: 1, reason: 'Reviewed source'}), expect.any(Function));
  });

  it('supports PATCH without allowing arbitrary readonly fields', async () => {
    const f = fixture();
    const res = await request(f.app)
      .patch('/admin/courses/imported/course-1').set('If-Match', '1').set('X-Review-Reason', 'Reviewed source')
      .send({ displayName: 'Updated', id: 'injected' });
    expect(res.status).toBe(400);
    expect(f.useCases.update).not.toHaveBeenCalled();
  });

  it('maps fetch-missing provider policy refusal to 409', async () => {
    const f = fixture();
    const res = await request(f.app).post('/admin/courses/imported/course-1/fetch-missing').set('If-Match', '1').set('X-Review-Reason', 'Reviewed source');
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('COURSE_FETCH_MISSING_PROVIDER_POLICY_FILE_ONLY');
  });

  it('does not implement a generic action route', async () => {
    const f = fixture();
    const res = await request(f.app).post('/admin/courses/imported/course-1/ARBITRARY_ACTION').set('If-Match', '1').set('X-Review-Reason', 'Reviewed source');
    expect(res.status).toBe(404);
  });
});
