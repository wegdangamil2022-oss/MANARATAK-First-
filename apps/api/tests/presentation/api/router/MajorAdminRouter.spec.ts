import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { MajorStatus } from '@manaratak/domain';
import { AdminMajorUseCases } from '@manaratak/application';
import { MajorAdminRouter } from '../../../../src/presentation/api/router/MajorAdminRouter';

describe('MajorAdminRouter', () => {
  const createMockUseCases = () => ({
    listMajors: vi.fn(),
    listCollegeFacets: vi.fn().mockReturnValue([]),
    listNewMajorCandidates: vi.fn(),
    approveNewMajorCandidate: vi.fn(),
    linkNewMajorCandidate: vi.fn(),
    getMajor: vi.fn(),
    updateMajor: vi.fn(),
    markReadyToReview: vi.fn(),
    markReadyToPublish: vi.fn(),
    publish: vi.fn(),
    unpublish: vi.fn(),
    reject: vi.fn(),
    archive: vi.fn(),
    listVersions: vi.fn(),
    listLevelProfiles: vi.fn(),
    listContentSections: vi.fn(),
    listAliases: vi.fn(),
    listRelationships: vi.fn(),
    listClassificationMappings: vi.fn(),
    listSources: vi.fn(),
  });

  const createApp = (useCases: ReturnType<typeof createMockUseCases>) => {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.authUserId = 'admin-X';
      next();
    });
    app.use(
      '/admin/majors',
      MajorAdminRouter.create({ adminMajorUseCases: useCases as unknown as AdminMajorUseCases }),
    );
    return app;
  };

  it('GET /admin/majors calls listMajors with parsed filters', async () => {
    const useCases = createMockUseCases();
    useCases.listMajors.mockResolvedValue({
      data: [],
      total: 0,
      page: 2,
      pageSize: 20,
      totalPages: 0,
    });
    const app = createApp(useCases);

    const res = await request(app).get(
      '/admin/majors?status=READY_TO_REVIEW&degreeLevel=Bachelor&page=2',
    );

    expect(res.status).toBe(200);
    expect(useCases.listMajors).toHaveBeenCalledWith({
      status: MajorStatus.READY_TO_REVIEW,
      degreeLevel: 'Bachelor',
      page: 2,
      pageSize: 50,
    });
  });


  it('GET /admin/majors/new-candidates keeps discovery inside the majors API and parses source filters', async () => {
    const useCases = createMockUseCases();
    useCases.listNewMajorCandidates.mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 25, totalPages: 1 });
    const app = createApp(useCases);

    const res = await request(app).get('/admin/majors/new-candidates?sourceType=UNIVERSITY_PROGRAM&pageSize=10');

    expect(res.status).toBe(200);
    expect(useCases.listNewMajorCandidates).toHaveBeenCalledWith({
      sourceType: 'UNIVERSITY_PROGRAM',
      page: 1,
      pageSize: 10,
    });
  });

  it('POST /admin/majors/new-candidates/:key/approve rejects faculty context as canonical major data', async () => {
    const useCases = createMockUseCases();
    const app = createApp(useCases);

    const res = await request(app).post('/admin/majors/new-candidates/NMC-1/approve').send({
      canonicalMajorName: 'Computer Science',
      degreeLevel: 'BACHELOR',
      degreeLevelId: 'degree-bachelor',
      collegeOrFaculty: 'Faculty of Engineering',
    });

    expect(res.status).toBe(400);
    expect(useCases.approveNewMajorCandidate).not.toHaveBeenCalled();
  });

  it('POST /admin/majors/new-candidates/:key/approve sends an explicit admin mutation context', async () => {
    const useCases = createMockUseCases();
    useCases.approveNewMajorCandidate.mockResolvedValue({
      type: 'CREATED', majorId: 'major-1', classificationCode: 'MJR-0844',
      linkedSources: { universityPrograms: 1, scholarshipMajorTargets: 0, scholarshipEligibilityItems: 0 },
    });
    const app = createApp(useCases);

    const res = await request(app).post('/admin/majors/new-candidates/NMC-1/approve').send({
      canonicalMajorName: 'Computer Science',
      degreeLevel: 'BACHELOR',
      degreeLevelId: 'degree-bachelor',
    });

    expect(res.status).toBe(200);
    expect(useCases.approveNewMajorCandidate).toHaveBeenCalledWith(
      expect.objectContaining({ candidateKey: 'NMC-1', canonicalMajorName: 'Computer Science', degreeLevelId: 'degree-bachelor' }),
      expect.objectContaining({ actorId: 'admin-X', source: 'admin-major-api' }),
    );
  });

  it('POST /admin/majors/new-candidates/:key/link links only after an explicit admin choice', async () => {
    const useCases = createMockUseCases();
    useCases.linkNewMajorCandidate.mockResolvedValue({ universityPrograms: 1, scholarshipMajorTargets: 0, scholarshipEligibilityItems: 0 });
    const app = createApp(useCases);

    const res = await request(app).post('/admin/majors/new-candidates/NMC-1/link').send({ majorId: 'major-existing' });

    expect(res.status).toBe(200);
    expect(useCases.linkNewMajorCandidate).toHaveBeenCalledWith(
      'NMC-1',
      'major-existing',
      expect.objectContaining({ actorId: 'admin-X', source: 'admin-major-api' }),
    );
  });

  it('PATCH /admin/majors/:id validates body and strips readonly fields', async () => {
    const useCases = createMockUseCases();
    useCases.updateMajor.mockResolvedValue({ id: 'major-1' });
    const app = createApp(useCases);

    const res = await request(app).patch('/admin/majors/major-1').send({
      id: 'injected',
      publicId: 'injected-public',
      displayName: 'Updated Computer Science',
      degreeLevel: 'Bachelor',
    });

    expect(res.status).toBe(200);
    expect(useCases.updateMajor).toHaveBeenCalledWith(
      'major-1',
      expect.objectContaining({
        displayName: 'Updated Computer Science',
        degreeLevel: 'Bachelor',
      }),
      expect.objectContaining({ actorId: 'admin-X', source: 'admin-major-api' }),
    );
    expect(useCases.updateMajor).toHaveBeenCalledWith(
      'major-1',
      expect.not.objectContaining({
        id: 'injected',
        publicId: 'injected-public',
      }),
      expect.any(Object),
    );
  });

  it('POST /admin/majors/:id/publish calls publish', async () => {
    const useCases = createMockUseCases();
    useCases.publish.mockResolvedValue(undefined);
    const app = createApp(useCases);

    const res = await request(app).post('/admin/majors/major-1/publish');

    expect(res.status).toBe(200);
    expect(useCases.publish).toHaveBeenCalledWith(
      'major-1',
      expect.objectContaining({ actorId: 'admin-X', source: 'admin-major-api' }),
    );
  });

  it('GET /admin/majors/:id/versions returns import versions', async () => {
    const useCases = createMockUseCases();
    useCases.listVersions.mockResolvedValue([{ id: 'version-1', versionNumber: 1 }]);
    const app = createApp(useCases);

    const res = await request(app).get('/admin/majors/major-1/versions');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [{ id: 'version-1', versionNumber: 1 }] });
    expect(useCases.listVersions).toHaveBeenCalledWith('major-1');
  });

  it('GET /admin/majors/:id/profiles returns level profiles', async () => {
    const useCases = createMockUseCases();
    useCases.listLevelProfiles.mockResolvedValue([
      { id: 'profile-1', level: 'BACHELOR', code: 'MJR-0001' },
    ]);
    const app = createApp(useCases);

    const res = await request(app).get('/admin/majors/major-1/profiles');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [{ id: 'profile-1', level: 'BACHELOR', code: 'MJR-0001' }] });
    expect(useCases.listLevelProfiles).toHaveBeenCalledWith('major-1');
  });

  it('GET /admin/majors/:id/content-sections returns detail dossier sections', async () => {
    const useCases = createMockUseCases();
    useCases.listContentSections.mockResolvedValue([
      { id: 'section-1', sectionKey: '01-overview', title: 'النبذة' },
    ]);
    const app = createApp(useCases);

    const res = await request(app).get('/admin/majors/major-1/content-sections');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: [{ id: 'section-1', sectionKey: '01-overview', title: 'النبذة' }],
    });
    expect(useCases.listContentSections).toHaveBeenCalledWith('major-1');
  });

  it('GET /admin/majors/:id/sources returns import sources', async () => {
    const useCases = createMockUseCases();
    useCases.listSources.mockResolvedValue([{ id: 'source-1', sourceType: 'CATALOG_FILE' }]);
    const app = createApp(useCases);

    const res = await request(app).get('/admin/majors/major-1/sources');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [{ id: 'source-1', sourceType: 'CATALOG_FILE' }] });
    expect(useCases.listSources).toHaveBeenCalledWith('major-1');
  });

  it('GET /admin/majors/:id/aliases returns stored aliases', async () => {
    const useCases = createMockUseCases();
    useCases.listAliases.mockResolvedValue([{ id: 'alias-1', alias: 'CS', aliasType: 'ALIAS' }]);
    const app = createApp(useCases);

    const res = await request(app).get('/admin/majors/major-1/aliases');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [{ id: 'alias-1', alias: 'CS', aliasType: 'ALIAS' }] });
    expect(useCases.listAliases).toHaveBeenCalledWith('major-1');
  });

  it('GET /admin/majors/:id/relationships returns stored relationships', async () => {
    const useCases = createMockUseCases();
    useCases.listRelationships.mockResolvedValue([{ id: 'rel-1', relationshipType: 'SIMILAR' }]);
    const app = createApp(useCases);

    const res = await request(app).get('/admin/majors/major-1/relationships');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [{ id: 'rel-1', relationshipType: 'SIMILAR' }] });
    expect(useCases.listRelationships).toHaveBeenCalledWith('major-1');
  });

  it('GET /admin/majors/:id/classification-mappings returns taxonomy mappings', async () => {
    const useCases = createMockUseCases();
    useCases.listClassificationMappings.mockResolvedValue([
      { id: 'map-1', taxonomyNodeId: 'taxonomy-1' },
    ]);
    const app = createApp(useCases);

    const res = await request(app).get('/admin/majors/major-1/classification-mappings');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [{ id: 'map-1', taxonomyNodeId: 'taxonomy-1' }] });
    expect(useCases.listClassificationMappings).toHaveBeenCalledWith('major-1');
  });

  it('returns 400 on use case errors', async () => {
    const useCases = createMockUseCases();
    useCases.publish.mockRejectedValue(new Error('Only READY_TO_PUBLISH majors can be PUBLISHED'));
    const app = createApp(useCases);

    const res = await request(app).post('/admin/majors/major-1/publish');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Only READY_TO_PUBLISH majors can be PUBLISHED' });
  });
});
