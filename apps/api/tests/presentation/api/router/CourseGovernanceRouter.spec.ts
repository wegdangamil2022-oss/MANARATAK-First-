import express from 'express';
import request from 'supertest';
import { describe, it, expect, vi } from 'vitest';
import { CourseAdminRouter } from '../../../../src/presentation/api/router/CourseAdminRouter';
const binding = {
  templateId: '11111111-1111-4111-8111-111111111111',
  templateVersionId: '22222222-2222-4222-8222-222222222222',
  issuerId: '33333333-3333-4333-8333-333333333333',
};
function setup(allowed = true) {
  const certificate = {
    validateCourseBinding: vi.fn().mockResolvedValue(binding),
    courseBindingChoices: vi.fn().mockResolvedValue([]),
    courseBindingStatus: vi.fn().mockResolvedValue({ status: 'READY', code: null }),
  };
  const scope = {
    adminCourseUseCases: { getCourse: vi.fn().mockResolvedValue({ optionalFields: {} }) },
    courseCurriculumUseCases: {
      setCertificateBinding: vi.fn().mockResolvedValue({ id: 'c' }),
      setDeliveryPolicy: vi.fn().mockResolvedValue({ id: 'c' }),
    },
  };
  const execute = vi.fn(
    async (
      _kind: string,
      _id: string,
      _action: string,
      _context: unknown,
      work: (scope: unknown) => Promise<unknown>,
    ) => ({ value: await work(scope), version: 2 }),
  );
  const evaluator = { evaluatePermission: vi.fn().mockResolvedValue({ isGranted: allowed }) };
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.authUserId = 'actor';
    next();
  });
  app.use(
    '/courses',
    CourseAdminRouter.create({
      ...scope,
      certificateUseCases: certificate,
      authEvaluatorService: evaluator,
      courseAdminCommandUseCases: { execute },
    } as never),
  );
  const put = (path: string, body: unknown, version = true) => {
    const agent = request(app)
      .put('/courses/c/' + path)
      .set('X-Review-Reason', 'Governed authoring')
      .send(body);
    return version ? agent.set('If-Match', '1') : agent;
  };
  return { app, put, certificate, scope, execute, evaluator };
}
describe('course certificate and release governance', () => {
  it('requires certificate-owner approval in addition to the course route capability', async () => {
    const f = setup(false);
    expect((await f.put('certificate-binding', { binding })).status).toBe(403);
    expect(f.execute).not.toHaveBeenCalled();
    expect(f.certificate.validateCourseBinding).not.toHaveBeenCalled();
    expect(f.evaluator.evaluatePermission).toHaveBeenCalledWith(
      'actor',
      'admin:certificates:templates:approve',
      expect.any(Object),
    );
  });
  it('validates the pinned binding with Certificates before an audited/versioned course command', async () => {
    const f = setup();
    expect((await f.put('certificate-binding', { binding })).status).toBe(200);
    expect(f.certificate.validateCourseBinding).toHaveBeenCalledWith(binding);
    expect(f.scope.courseCurriculumUseCases.setCertificateBinding).toHaveBeenCalledWith(
      'c',
      binding,
    );
    expect(f.execute).toHaveBeenCalledWith(
      'COURSE',
      'c',
      expect.any(String),
      expect.objectContaining({ actorId: 'actor', expectedVersion: 1 }),
      expect.any(Function),
    );
  });
  it('rejects missing optimistic locking and extra binding fields', async () => {
    const f = setup();
    expect((await f.put('certificate-binding', { binding }, false)).status).toBe(428);
    expect(
      (await f.put('certificate-binding', { binding: { ...binding, signingSecret: 'forbidden' } }))
        .status,
    ).toBe(400);
    expect(f.scope.courseCurriculumUseCases.setCertificateBinding).not.toHaveBeenCalled();
  });
  it('does not save a binding if its governed template changed', async () => {
    const f = setup();
    f.certificate.validateCourseBinding.mockRejectedValue(
      Error('COURSE_CERTIFICATE_BINDING_STALE'),
    );
    expect((await f.put('certificate-binding', { binding })).status).toBe(409);
    expect(f.scope.courseCurriculumUseCases.setCertificateBinding).not.toHaveBeenCalled();
  });
  it('does not expose certificate choices to a course reader without certificate approval', async () => {
    const f = setup(false),
      res = await request(f.app).get('/courses/c/certificate-binding');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ canBind: false, templates: [] });
    expect(f.certificate.courseBindingChoices).not.toHaveBeenCalled();
  });
  it('validates delivery contract before passing the policy to the owner command', async () => {
    const f = setup(),
      policy = { version: 1, sequence: 'FREE', lessons: {} };
    expect((await f.put('delivery-policy', policy)).status).toBe(200);
    expect(f.scope.courseCurriculumUseCases.setDeliveryPolicy).toHaveBeenCalledWith('c', policy);
    expect((await f.put('delivery-policy', { ...policy, publicUrl: 'forbidden' })).status).toBe(
      400,
    );
  });
});
