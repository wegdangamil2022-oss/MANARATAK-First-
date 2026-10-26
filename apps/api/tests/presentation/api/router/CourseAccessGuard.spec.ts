import express from 'express';
import request from 'supertest';
import { describe, it, expect, vi } from 'vitest';
import {
  createCourseAccessGuard,
  courseRequestAction,
} from '../../../../src/presentation/security/CourseAccessGuard';
import type { CourseAccessService } from '@manaratak/application';
const id = '10000000-0000-4000-8000-000000000001';
describe('course capability routing', () => {
  it.each([
    ['GET', '/learners', 'learners'],
    ['GET', '/learning-report', 'learners'],
    ['GET', '/curriculum', 'read'],
    ['GET', '/assessment-reviews', 'grade'],
    ['POST', '/assessment-reviews/a/grade', 'grade'],
    ['POST', '/mark-publishable', 'review'],
    ['POST', '/publish', 'publish'],
    ['POST', '/unpublish', 'publish'],
    ['POST', '/mark-ready', 'edit'],
    ['PUT', '/lessons/a/content-blocks', 'edit'],
    ['POST', '/media/a/process', 'edit'],
    ['PATCH', '/enrollment-policy', 'manage'],
    ['POST', '/duplicate', 'manage'],
    ['PATCH', '', 'manage'],
    ['POST', '/archive', 'manage'],
  ])('%s %s requires %s', (method, suffix, permission) =>
    expect(courseRequestAction(method, '/' + id + suffix)).toBe(permission),
  );
  it('rejects unknown/global paths and sends the actual owner ID to canonical scope evaluation', async () => {
    const check = vi.fn().mockRejectedValueOnce(Error('DENIED')).mockResolvedValue({});
    const app = express();
    app.use((req, _res, next) => {
      req.authUserId = 'teacher';
      next();
    });
    app.use(
      createCourseAccessGuard({
        globalManager: async () => false,
        assert: check,
      } as unknown as CourseAccessService),
    );
    app.use((_req, res) => res.json({ success: true }));
    await request(app).post('/learning-paths/create').expect(403);
    expect(check).not.toHaveBeenCalled();
    await request(app)
      .post('/' + id + '/publish')
      .expect(403);
    await request(app)
      .put('/' + id + '/lessons/a/content-blocks')
      .expect(200);
    expect(check.mock.calls.map((args) => args.slice(0, 3))).toEqual([
      ['teacher', id, 'publish'],
      ['teacher', id, 'edit'],
    ]);
  });
});
