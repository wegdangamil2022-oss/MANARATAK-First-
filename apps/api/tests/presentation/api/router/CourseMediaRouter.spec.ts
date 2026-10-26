import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CourseMediaRouter,
  type CourseMediaCradle,
} from '../../../../src/presentation/api/router/CourseMediaRouter';
const assetId = '10000000-0000-4000-8000-000000000001';
describe('course media owner and provider boundary', () => {
  let app: ReturnType<typeof express>, state: string, owner: string, scan: string | null;
  const ingest = vi.fn(),
    finalize = vi.fn(),
    validate = vi.fn(),
    sanitize = vi.fn(),
    activate = vi.fn(),
    caps = vi.fn(),
    refresh = vi.fn();
  beforeEach(() => {
    state = 'INITIATED';
    owner = 'course';
    scan = null;
    for (const mock of [ingest, finalize, validate, sanitize, activate, caps, refresh])
      mock.mockReset();
    caps.mockReturnValue({ upload: true, delivery: true, scanning: true, sanitization: true });
    ingest.mockResolvedValue({
      assetId,
      lifecycleState: 'INITIATED',
      storageLocator: 'NEVER_RETURN',
      uploadGrant: {
        uploadUrl: 'https://media.example.invalid/upload',
        method: 'PUT',
        headers: {},
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      },
    });
    finalize.mockImplementation(async () => {
      state = 'QUARANTINED';
    });
    validate.mockImplementation(async () => {
      state = 'VALIDATING';
      scan = 'PASSED';
    });
    sanitize.mockImplementation(async () => {
      state = 'SANITIZING';
    });
    activate.mockImplementation(async () => {
      state = 'ACTIVE';
    });
    const cradle = {
      adminCourseUseCases: {
        getCourse: async () => ({
          id: 'course',
          originType: 'NATIVE_MANARATAK_COURSE',
          status: 'DRAFT',
          version: 3,
        }),
      },
      courseCurriculumUseCases: {
        getCurriculumSnapshot: async () => ({
          modules: [{ id: 'module' }],
          lessons: [{ id: 'lesson', moduleId: 'module', status: 'DRAFT' }],
        }),
      },
      ingestAssetUseCase: { requestCourseMediaUpload: ingest, refreshCourseMediaUpload: refresh },
      processAssetLifecycleUseCase: {
        mediaCapabilities: caps,
        finalizeUploadedAsset: finalize,
        validateAsset: validate,
        sanitizeAsset: sanitize,
        activateAsset: activate,
      },
      assetRecordRepository: {
        findById: async () => ({
          id: { value: assetId },
          state,
          owner: { ownerId: owner, ownerType: 'COURSE' },
          metadata: {
            originalFilename: 'lecture.webm',
            mimeType: 'video/webm',
            byteSize: 128,
            extraMetadata: { purpose: 'COURSE_LESSON_MEDIA', lessonId: 'lesson' },
          },
          uploadVerification: state !== 'INITIATED' ? { signatureVerified: true } : undefined,
          malwareScan: scan ? { status: scan } : undefined,
          sanitization: state === 'ACTIVE' || state === 'SANITIZING' ? {} : undefined,
        }),
      },
    } as unknown as CourseMediaCradle;
    app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.authUserId = 'owner';
      next();
    });
    app.use('/courses/:id/media', CourseMediaRouter.create(cradle));
    app.use(
      (error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        res.status(error.name === 'ZodError' ? 400 : 500).json({ error: error.message });
      },
    );
  });
  const body = {
    originalFilename: 'lecture.webm',
    mimeType: 'video/webm',
    fileExtension: 'webm',
    byteSize: 128,
    rightsSource: 'Own isolated test media',
  };
  const post = (path: string) =>
    request(app)
      .post('/courses/course/media' + path)
      .set('If-Match', '3')
      .set('X-Review-Reason', 'Isolated course media test');
  it('allocates only for a valid course/lesson and never returns storage coordinates', async () => {
    const response = await post('/lessons/lesson/uploads').send(body).expect(201);
    expect(response.body.storageLocator).toBeUndefined();
    expect(ingest.mock.calls[0][0]).toMatchObject({
      ownerId: 'course',
      ownerType: 'COURSE',
      classification: 'INTERNAL',
    });
    await post('/lessons/other/uploads').send(body).expect(400);
    await post('/lessons/lesson/uploads')
      .send({ ...body, ownerId: 'other' })
      .expect(400);
    expect(ingest).toHaveBeenCalledTimes(1);
  });
  it('fails closed with missing security providers or stale/missing course preconditions', async () => {
    caps.mockReturnValue({ upload: true, delivery: true, scanning: false, sanitization: false });
    await post('/lessons/lesson/uploads').send(body).expect(503);
    await request(app)
      .post('/courses/course/media/lessons/lesson/uploads')
      .set('If-Match', '2')
      .set('X-Review-Reason', 'Invalid stale test')
      .send(body)
      .expect(409);
    await request(app)
      .post('/courses/course/media/lessons/lesson/uploads')
      .set('X-Review-Reason', 'Missing version')
      .send(body)
      .expect(428);
    expect(ingest).not.toHaveBeenCalled();
  });
  it('renews only a course-owned upload without leaking storage coordinates', async () => {
    refresh.mockResolvedValue({
      assetId,
      lifecycleState: 'INITIATED',
      storageLocator: 'PRIVATE',
      bucketName: 'PRIVATE',
      uploadGrant: {
        uploadUrl: 'https://media.example.invalid/resume',
        method: 'PUT',
        headers: {},
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      },
    });
    owner = 'other';
    await post('/' + assetId + '/refresh-upload')
      .send({})
      .expect(404);
    expect(refresh).not.toHaveBeenCalled();
    owner = 'course';
    const response = await post('/' + assetId + '/refresh-upload')
      .send({})
      .expect(200);
    expect(response.body.assetId).toBe(assetId);
    expect(response.body.uploadGrant.method).toBe('PUT');
    expect(JSON.stringify(response.body)).not.toMatch(/PRIVATE|storageLocator|bucketName|pathKey/);
    expect(refresh).toHaveBeenCalledWith(assetId, 'course');
  });
  it('does not activate a rejected scan', async () => {
    state = 'QUARANTINED';
    validate.mockImplementation(async () => {
      state = 'REJECTED';
      scan = 'FAILED';
    });
    await post('/' + assetId + '/process')
      .send({})
      .expect(409);
    expect(sanitize).not.toHaveBeenCalled();
    expect(activate).not.toHaveBeenCalled();
  });
  it('does not reveal another course asset and requires the server pipeline before ACTIVE', async () => {
    owner = 'other';
    await request(app)
      .get('/courses/course/media/' + assetId)
      .expect(404);
    owner = 'course';
    await post('/' + assetId + '/process')
      .send({})
      .expect(409);
    expect(activate).not.toHaveBeenCalled();
    await post('/' + assetId + '/finalize')
      .send({})
      .expect(200);
    const response = await post('/' + assetId + '/process')
      .send({})
      .expect(200);
    expect(response.body.state).toBe('ACTIVE');
    expect(validate).toHaveBeenCalledOnce();
    expect(sanitize).toHaveBeenCalledOnce();
    expect(activate).toHaveBeenCalledOnce();
    await post('/' + assetId + '/process')
      .send({})
      .expect(200);
    expect(activate).toHaveBeenCalledOnce();
    expect(JSON.stringify(response.body)).not.toMatch(/locator|storageZone|pathKey|uploadedBy/);
  });
});
