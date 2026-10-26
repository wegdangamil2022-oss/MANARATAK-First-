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
      attachAssetToLesson: vi.fn().mockResolvedValue({ id: 'reference' }),
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
  const access = { globalManager: vi.fn().mockResolvedValue(true) },
    assets = {
      findById: vi.fn().mockResolvedValue({ owner: { ownerType: 'COURSE', ownerId: 'c' } }),
    };
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
      courseAccessService: access,
      assetRecordRepository: assets,
      certificateUseCases: certificate,
      authEvaluatorService: evaluator,
      courseAdminCommandUseCases: { execute },
    } as never),
  );
  const put = (path: string, body: object, version = true) => {
    const agent = request(app)
      .put('/courses/c/' + path)
      .set('X-Review-Reason', 'Governed authoring')
      .send(body);
    return version ? agent.set('If-Match', '1') : agent;
  };
  return { app, put, certificate, scope, execute, evaluator, access, assets };
}
describe('course certificate and release governance', () => {
  it('allows a scoped editor to attach only assets owned by the assigned course', async () => {
    const f = setup();
    f.access.globalManager.mockResolvedValue(false);
    const response = await request(f.app)
      .post('/courses/c/lessons/lecture/assets')
      .set('X-Review-Reason', 'Scoped own file')
      .set('If-Match', '1')
      .send({ assetId: binding.templateId, assetType: 'DOCUMENT', position: 1 });
    expect(response.status).toBe(201);
    expect(f.scope.courseCurriculumUseCases.attachAssetToLesson).toHaveBeenCalled();
  });
  it('rejects a foreign course file before attaching it, even with a known EAP identifier', async () => {
    const f = setup();
    f.access.globalManager.mockResolvedValue(false);
    f.assets.findById.mockResolvedValue({ owner: { ownerType: 'COURSE', ownerId: 'foreign' } });
    const response = await request(f.app)
      .post('/courses/c/lessons/lecture/assets')
      .set('X-Review-Reason', 'Scoped foreign file')
      .set('If-Match', '1')
      .send({ assetId: binding.templateId, assetType: 'DOCUMENT', position: 1 });
    expect(response.status).toBe(403);
    expect(f.scope.courseCurriculumUseCases.attachAssetToLesson).not.toHaveBeenCalled();
  });
  it('preserves the global course manager reuse contract', async () => {
    const f = setup();
    const response = await request(f.app)
      .post('/courses/c/lessons/lecture/assets')
      .set('X-Review-Reason', 'Manager file reuse')
      .set('If-Match', '1')
      .send({ assetId: binding.templateId, assetType: 'DOCUMENT', position: 1 });
    expect(response.status).toBe(201);
    expect(f.assets.findById).not.toHaveBeenCalled();
  });
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
