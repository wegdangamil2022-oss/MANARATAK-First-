import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { UniversityStatus } from '@manaratak/domain';
import { UniversityAdminRouter } from '../../../../src/presentation/api/router/UniversityAdminRouter';

describe('UniversityAdminRouter', () => {
  const createMockUseCases = () => ({
    listUniversities: vi.fn(),
    listOrganizationUnits: vi.fn(),
    getUniversity: vi.fn().mockResolvedValue({id: 'owner-1', revision: 2}),
    updateUniversity: vi.fn(),
    replaceNormalizedDetails: vi.fn(),
    checkPublicationReadiness: vi.fn(),
    markReadyToReview: vi.fn(),
    markReadyToPublish: vi.fn(),
    publish: vi.fn(),
    unpublish: vi.fn(),
    reject: vi.fn(),
    archive: vi.fn(),
    restore: vi.fn(),
    restoreAcademicProgram: vi.fn(),
    getSourceStages: vi.fn(),
    saveStageCard: vi.fn(),
  });

  const createApp = (useCases: ReturnType<typeof createMockUseCases>) => {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.authUserId = 'admin-X';
      next();
    });
    app.use(
      '/admin/universities',
      UniversityAdminRouter.create({ adminUniversityUseCases: useCases as any }),
    );
    return app;
  };

  it('reads stage evidence without accepting a mutation or claiming source approval',async()=>{
    const useCases=createMockUseCases();useCases.getSourceStages.mockResolvedValue({university:{id:'u1'},stages:[{stage:5,sourceState:'NOT_SUPPLIED',importState:'UNKNOWN'}]});
    const result=await request(createApp(useCases)).get('/admin/universities/u1/source-stages');
    expect(result.status).toBe(200);expect(result.headers['cache-control']).toBe('no-store');expect(result.body.stages[0].importState).toBe('UNKNOWN');expect(useCases.updateUniversity).not.toHaveBeenCalled();
  });
  it('requires reason and revision for card writes and forwards only the strict contract',async()=>{
    const useCases=createMockUseCases();useCases.saveStageCard.mockResolvedValue({id:'u1',revision:3});const app=createApp(useCases);
    const body={values:{displayName:'Reviewed'},proof:{sourceUrl:'https://example.org/source',verifiedAt:'2026-10-24T00:00:00.000Z'}};
    expect((await request(app).put('/admin/universities/u1/stage-cards/basic-identity').set('X-Review-Reason','Verified source').send(body)).status).toBe(428);
    expect((await request(app).put('/admin/universities/u1/stage-cards/basic-identity').set('If-Match','2').send(body)).status).toBe(400);
    const result=await request(app).put('/admin/universities/u1/stage-cards/basic-identity').set('If-Match','2').set('X-Review-Reason','Verified source').send(body);
    expect(result.status).toBe(200);expect(useCases.saveStageCard).toHaveBeenCalledWith('u1','basic-identity',body.values,body.proof,expect.objectContaining({actorId:'admin-X',expectedRevision:2,reason:'Verified source'}));
  });
  it('restores through the owner contract with review context rather than accepting a status patch',async()=>{
    const useCases=createMockUseCases();const app=createApp(useCases);
    expect((await request(app).post('/admin/universities/u1/restore').set('If-Match','2').set('X-Review-Reason','Reopen review').send({})).status).toBe(200);
    expect(useCases.restore).toHaveBeenCalledWith('u1',expect.objectContaining({actorId:'admin-X',expectedRevision:2}));
    expect(useCases.updateUniversity).not.toHaveBeenCalled();
  });

  it('parses explicit count-only mode without changing owner filters', async () => {
    const useCases=createMockUseCases();useCases.listUniversities.mockResolvedValue({data:[],total:7,page:1,pageSize:1,totalPages:7});
    const app=createApp(useCases);
    expect((await request(app).get('/admin/universities?countOnly=true&status=READY_TO_REVIEW&countryReferenceId=country-qa&pageSize=1')).status).toBe(200);
    expect(useCases.listUniversities).toHaveBeenCalledWith({countOnly:true,status:UniversityStatus.READY_TO_REVIEW,countryReferenceId:'country-qa',page:1,pageSize:1});
  });
  it('GET /admin/universities calls listUniversities with parsed filters', async () => {
    const useCases = createMockUseCases();
    useCases.listUniversities.mockResolvedValue({
      data: [],
      total: 0,
      page: 2,
      pageSize: 20,
      totalPages: 0,
    });
    const app = createApp(useCases);

    const res = await request(app).get(
      '/admin/universities?status=READY_TO_REVIEW&countryReferenceId=country-qa&page=2',
    );

    expect(res.status).toBe(200);
    expect(useCases.listUniversities).toHaveBeenCalledWith({
      status: UniversityStatus.READY_TO_REVIEW,
      countryReferenceId: 'country-qa',
      page: 2,
      pageSize: 50,
    });
  });


  it('GET /admin/universities/organization-units lists existing faculties/colleges without creating a second admin section', async () => {
    const useCases = createMockUseCases();
    useCases.listOrganizationUnits.mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 50, totalPages: 0 });
    const app = createApp(useCases);

    const res = await request(app).get('/admin/universities/organization-units?unitType=FACULTY&search=Engineering');

    expect(res.status).toBe(200);
    expect(useCases.listOrganizationUnits).toHaveBeenCalledWith({
      unitType: 'FACULTY', search: 'Engineering', page: 1, pageSize: 50,
    });
    expect(useCases.getUniversity).not.toHaveBeenCalledWith('organization-units');
  });

  it('PATCH /admin/universities/:id validates body and strips readonly fields', async () => {
    const useCases = createMockUseCases();
    useCases.updateUniversity.mockResolvedValue({ id: 'uni-1' });
    const app = createApp(useCases);

    const res = await request(app).patch('/admin/universities/uni-1').set('If-Match', '1').set('X-Review-Reason', 'Reviewed official source').send({
      id: 'injected',
      publicId: 'injected-public',
      displayName: 'Updated Qatar University',
      officialWebsite: 'https://www.qu.edu.qa',
    });

    expect(res.status).toBe(200);
    expect(useCases.updateUniversity).toHaveBeenCalledWith(
      'uni-1',
      expect.objectContaining({
        displayName: 'Updated Qatar University',
        officialWebsite: 'https://www.qu.edu.qa',
      }),
      expect.objectContaining({ actorId: 'admin-X', source: 'admin-university-api' }),
    );
    expect(useCases.updateUniversity).toHaveBeenCalledWith(
      'uni-1',
      expect.not.objectContaining({
        id: 'injected',
        publicId: 'injected-public',
      }),
      expect.any(Object),
    );
  });

  it('POST /admin/universities/:id/publish calls publish', async () => {
    const useCases = createMockUseCases();
    useCases.publish.mockResolvedValue(undefined);
    const app = createApp(useCases);

    const res = await request(app).post('/admin/universities/uni-1/publish').set('If-Match', '1').set('X-Review-Reason', 'Reviewed official source');

    expect(res.status).toBe(200);
    expect(useCases.publish).toHaveBeenCalledWith(
      'uni-1',
      expect.objectContaining({ actorId: 'admin-X', source: 'admin-university-api' }),
    );
  });

  it('PUT /admin/universities/:id/normalized-details validates canonical relationships', async () => {
    const useCases = createMockUseCases();
    useCases.replaceNormalizedDetails.mockResolvedValue({ id: 'uni-1', academicPrograms: [] });
    const app = createApp(useCases);

    const details = {
      campuses: [{ sourceReferenceId: 'CAMPUS-1', name: 'Main Campus' }],
      organizationUnits: [
        { sourceReferenceId: 'FAC-1', unitType: 'FACULTY', name: 'Faculty of Engineering' },
      ],
      academicPrograms: [
        {
          sourceReferenceId: 'PROGRAM-1',
          organizationUnitSourceReferenceId: 'FAC-1',
          sourceProgramName: 'Computer Science',
          degreeLevelId: 'degree-bachelor',
          majorId: 'major-cs',
          majorMappingState: 'CANONICALLY_MAPPED',
          campusSourceReferenceIds: ['CAMPUS-1'],
          admissionRequirements: [{ internationalTestId: 'test-ielts', minimumScore: 6.5 }],
        },
      ],
    };
    const res = await request(app)
      .put('/admin/universities/uni-1/normalized-details').set('If-Match', '1').set('X-Review-Reason', 'Reviewed official source')
      .send(details);

    expect(res.status).toBe(200);
    expect(useCases.replaceNormalizedDetails).toHaveBeenCalledWith(
      'uni-1',
      details,
      expect.objectContaining({ actorId: 'admin-X', source: 'admin-university-api' }),
    );
  });

  it('returns 400 on use case errors', async () => {
    const useCases = createMockUseCases();
    useCases.publish.mockRejectedValue(
      new Error('Only READY_TO_PUBLISH universities can be PUBLISHED'),
    );
    const app = createApp(useCases);

    const res = await request(app).post('/admin/universities/uni-1/publish').set('If-Match', '1').set('X-Review-Reason', 'Reviewed official source');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Only READY_TO_PUBLISH universities can be PUBLISHED' });
  });
});
