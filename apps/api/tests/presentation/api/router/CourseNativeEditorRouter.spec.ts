import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { CourseAdminRouter } from '../../../../src/presentation/api/router/CourseAdminRouter';
function setup() {
  const replaceLessonBlocks = vi.fn().mockResolvedValue([]),
    listCourseLearners = vi.fn().mockResolvedValue({ data: [], total: 0 });
  const getCourseLearnerReview = vi.fn().mockResolvedValue(null),
    getNativeLearningReport = vi
      .fn()
      .mockResolvedValue({ scope: 'FILTERED_ENROLLMENT_COHORT', totals: { enrollments: 0 } });
  const scope = {
    courseCurriculumUseCases: { replaceLessonBlocks },
    courseProgressUseCases: { listCourseLearners, getCourseLearnerReview },
    adminCourseUseCases: { getNativeLearningReport },
  };
  const execute = vi.fn(async (_kind, _id, _action, _context, work) => ({
    value: await work(scope),
    version: 2,
  }));
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.authUserId = 'session-actor';
    next();
  });
  app.use(
    '/admin/courses',
    CourseAdminRouter.create({ ...scope, courseAdminCommandUseCases: { execute } } as never),
  );
  return {
    app,
    execute,
    replaceLessonBlocks,
    listCourseLearners,
    getCourseLearnerReview,
    getNativeLearningReport,
  };
}
describe('native editor contracts behind canonical application authorization', () => {
  it('requires a current course version and an authenticated audit reason for block writes', async () => {
    const { app, execute } = setup();
    expect(
      (
        await request(app)
          .put('/admin/courses/c/lessons/l/content-blocks')
          .set('X-Review-Reason', 'Reviewed draft')
          .send({ blocks: [] })
      ).status,
    ).toBe(428);
    expect(execute).not.toHaveBeenCalled();
  });
  it('uses the existing course command transaction and obtains the actor from the session', async () => {
    const { app, execute, replaceLessonBlocks } = setup();
    const response = await request(app)
      .put('/admin/courses/c/lessons/l/content-blocks')
      .set('X-Review-Reason', 'Reviewed draft')
      .set('If-Match', '1')
      .send({ blocks: [] });
    expect(response.status).toBe(200);
    expect(response.headers['x-entity-version']).toBe('2');
    expect(replaceLessonBlocks).toHaveBeenCalledWith('c', 'l', []);
    expect(execute.mock.calls[0][3]).toMatchObject({
      actorId: 'session-actor',
      expectedVersion: 1,
      reason: 'Reviewed draft',
    });
  });
  it('rejects forged actors, raw asset URLs and oversized block collections at the API boundary', async () => {
    const { app, replaceLessonBlocks } = setup();
    for (const body of [
      { blocks: [], actorId: 'other' },
      {
        blocks: [
          {
            id: '5c2893d5-44ec-4694-a4f1-8083e8e4cd32',
            type: 'VIDEO',
            payload: { title: 'Video' },
            assetReferenceId: 'https://example.org/file',
          },
        ],
      },
      {
        blocks: Array.from({ length: 201 }, () => ({
          id: '5c2893d5-44ec-4694-a4f1-8083e8e4cd32',
          type: 'TEXT',
          payload: { text: 'x' },
        })),
      },
    ]) {
      expect(
        (
          await request(app)
            .put('/admin/courses/c/lessons/l/content-blocks')
            .set('X-Review-Reason', 'Review')
            .set('If-Match', '1')
            .send(body)
        ).status,
      ).toBe(400);
    }
    expect(replaceLessonBlocks).not.toHaveBeenCalled();
  });
  it('bounds learner queries and returns no enrollment details for the wrong course', async () => {
    const { app, listCourseLearners, getCourseLearnerReview } = setup();
    expect(
      (await request(app).get('/admin/courses/c/learners?page=2&pageSize=20&status=WAITLISTED'))
        .status,
    ).toBe(200);
    expect(listCourseLearners).toHaveBeenCalledWith('c', {
      page: 2,
      pageSize: 20,
      status: 'WAITLISTED',
    });
    for (const query of [
      'pageSize=101',
      'page=0',
      'studentReferenceId=someone',
      'status=UNTRUSTED',
    ])
      expect((await request(app).get('/admin/courses/c/learners?' + query)).status).toBe(400);
    expect(
      (
        await request(app).get(
          '/admin/courses/c/learners/5c2893d5-44ec-4694-a4f1-8083e8e4cd32?attemptsPage=2',
        )
      ).status,
    ).toBe(404);
    expect(getCourseLearnerReview).toHaveBeenCalledWith(
      'c',
      '5c2893d5-44ec-4694-a4f1-8083e8e4cd32',
      { lessonsPage: 1, attemptsPage: 2 },
    );
  });
  it('validates report cohort dates before invoking the existing native owner query', async () => {
    const { app, getNativeLearningReport } = setup();
    expect(
      (
        await request(app).get(
          '/admin/courses/c/learning-report?cohortFrom=2026-01-01&cohortTo=2026-02-01',
        )
      ).status,
    ).toBe(200);
    expect(getNativeLearningReport).toHaveBeenCalledWith('c', {
      cohortFrom: '2026-01-01',
      cohortTo: '2026-02-01',
    });
    expect(
      (await request(app).get('/admin/courses/c/learning-report?cohortFrom=2026-02-30')).status,
    ).toBe(400);
    expect(
      (
        await request(app).get(
          '/admin/courses/c/learning-report?cohortFrom=2026-02-01&cohortTo=2026-01-01',
        )
      ).status,
    ).toBe(400);
  });
});
