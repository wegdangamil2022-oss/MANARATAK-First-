import express from 'express';
import request from 'supertest';
import { describe, it, expect, vi } from 'vitest';
import { CourseAdminRouter } from '../../../../src/presentation/api/router/CourseAdminRouter';

function setup() {
  const listCourses = vi.fn().mockResolvedValue({ data: [{ id: 'native-1', displayName: 'Native course', originType: 'NATIVE_MANARATAK_COURSE',
    optionalFields: { instructor: 'Approved instructor', privateMemo: 'never expose this', courseContent: 'large hidden text' }, canonicalDedupKey: 'private-key' }], total: 1, page: 1, pageSize: 20, totalPages: 1 });
  const getCourse = vi.fn();
  const catalogOptions = vi.fn().mockResolvedValue({ data: ['English'], hasMore: false });
  const app = express(); app.use(express.json());
  app.use('/admin/courses', CourseAdminRouter.create({ adminCourseUseCases: { listCourses, getCourse, catalogOptions } } as never));
  return { app, listCourses, getCourse, catalogOptions };
}
describe('course catalog read routes', () => {
  it('enforces native scope on the server and keeps legacy paid origin out of native', async () => {
    const { app, listCourses } = setup();
    const response = await request(app).get('/admin/courses/catalog/native?originType=EXTERNAL_LINKED_COURSE&studyAccess=PAID&sort=NAME_ASC');
    expect(response.status).toBe(200);
    expect(listCourses).toHaveBeenCalledWith(expect.objectContaining({ originType: 'NATIVE_MANARATAK_COURSE', studyAccess: 'PAID', sort: 'NAME_ASC', includeStatistics: true }));
  });
  it('enforces external scope and provider scope on the all view', async () => {
    const { app, listCourses } = setup();
    await request(app).get('/admin/courses/catalog/external?originType=NATIVE_MANARATAK_COURSE');
    expect(listCourses.mock.calls[0][0].originType).toBe('EXTERNAL_LINKED_COURSE');
    await request(app).get('/admin/courses/catalog?externalProviderId=provider-1');
    expect(listCourses.mock.calls[1][0].originType).toBe('EXTERNAL_LINKED_COURSE');
    await request(app).get('/admin/courses/catalog?platformName=source-platform');
    expect(listCourses.mock.calls[2][0].originType).toBe('EXTERNAL_LINKED_COURSE');
    await request(app).get('/admin/courses/catalog?completenessStatus=INCOMPLETE');
    expect(listCourses.mock.calls[3][0].originType).toBe('EXTERNAL_LINKED_COURSE');
  });
  it('rejects hidden external filters on native, invalid sizes and unknown sorts', async () => {
    const { app, listCourses } = setup();
    for (const path of ['catalog/native?externalProviderId=x', 'catalog/native?platformName=x', 'catalog?pageSize=101', 'catalog?sort=sql', 'catalog?certificateState=false', 'catalog?page=100001']) {
      expect((await request(app).get('/admin/courses/' + path)).status).toBe(400);
    }
    expect(listCourses).not.toHaveBeenCalled();
  });
  it('does not expose full source snapshots, arbitrary optional data or dedup keys', async () => {
    const { app } = setup();
    const response = await request(app).get('/admin/courses/catalog');
    expect(response.status).toBe(200);
    expect(response.body.data[0].instructor).toBe('Approved instructor');
    expect(JSON.stringify(response.body)).not.toMatch(/privateMemo|never expose|large hidden|canonicalDedupKey/);
  });
  it('uses static routes before the ID route, and options are bounded/allowlisted', async () => {
    const { app, getCourse, catalogOptions } = setup();
    expect((await request(app).get('/admin/courses/catalog/options?field=learningLanguage&page=2')).status).toBe(200);
    expect(catalogOptions).toHaveBeenCalledWith({ field: 'learningLanguage', page: 2 });
    expect((await request(app).get('/admin/courses/catalog/options?field=optionalFields')).status).toBe(400);
    expect(getCourse).not.toHaveBeenCalled();
  });
});
