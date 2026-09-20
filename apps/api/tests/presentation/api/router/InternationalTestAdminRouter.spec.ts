import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { InternationalTestAdminRouter } from '../../../../src/presentation/api/router/InternationalTestAdminRouter';
import { InternationalTestCategory, InternationalTestStatus } from '@manaratak/domain';

describe('InternationalTestAdminRouter', () => {
  const createMockUseCases = () => ({
    list: vi.fn(),
    get: vi.fn(),
    createTest: vi.fn(),
    updateTest: vi.fn(),
    upsertTest: vi.fn(),
    markReadyToPublish: vi.fn(),
    publish: vi.fn(),
    archive: vi.fn(),
    listVariants: vi.fn(),
    upsertVariant: vi.fn(),
    listSections: vi.fn(),
    upsertSection: vi.fn(),
    upsertScoreScale: vi.fn(),
    upsertFeeMetadata: vi.fn(),
    upsertOfficialLink: vi.fn(),
    listAvailability: vi.fn(),
    upsertAvailability: vi.fn(),
    listPreparationMaterials: vi.fn(),
    upsertPreparationMaterial: vi.fn(),
    listEvidence: vi.fn(),
    addEvidence: vi.fn(),
    listProviders: vi.fn(),
    upsertProvider: vi.fn(),
    checkPublicationReadiness: vi.fn(),
    verifySource: vi.fn()
  });

  const createApp = (useCases: any) => {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => { req.authUserId = 'admin-X'; next(); });
    app.use('/admin/international-tests', InternationalTestAdminRouter.create({
      internationalTestAdminUseCases: useCases as any,
      crossDomainGraphReadService: { getInternationalTestGraphById: vi.fn().mockResolvedValue({ relationships: {} }) } as any,
    }));
    return app;
  };

  it('GET /admin/international-tests calls list with filters', async () => {
    const useCases = createMockUseCases();
    useCases.list.mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 });
    const app = createApp(useCases);

    const res = await request(app).get('/admin/international-tests?status=IMPORTED&countryIso2Code=sa&page=1');

    expect(res.status).toBe(200);
    expect(useCases.list).toHaveBeenCalledWith({
      status: InternationalTestStatus.IMPORTED,
      countryIso2Code: 'SA',
      page: 1,
      pageSize: 20
    });
  });

  it('POST /admin/international-tests calls createTest', async () => {
    const useCases = createMockUseCases();
    const newTest = { id: 'test-1', canonicalName: 'TOEFL iBT' };
    useCases.createTest.mockResolvedValue(newTest);
    const app = createApp(useCases);

    const res = await request(app)
      .post('/admin/international-tests')
      .send({ canonicalName: 'TOEFL iBT', providerName: 'ETS', testCategory: 'LANGUAGE_PROFICIENCY' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(newTest);
    expect(useCases.createTest).toHaveBeenCalledWith({
      canonicalName: 'TOEFL iBT',
      providerName: 'ETS',
      testCategory: 'LANGUAGE_PROFICIENCY'
    }, expect.objectContaining({ actorId: 'admin-X', source: 'admin-international-tests-api' }));
  });

  it('POST /admin/international-tests/upsert calls upsertTest', async () => {
    const useCases = createMockUseCases();
    const test = { id: 'test-1', canonicalName: 'TOEFL iBT' };
    useCases.upsertTest.mockResolvedValue(test);
    const app = createApp(useCases);

    const res = await request(app)
      .post('/admin/international-tests/upsert')
      .send({ canonicalName: 'TOEFL iBT', providerName: 'ETS', testCategory: 'LANGUAGE_PROFICIENCY' });

    expect(res.status).toBe(200);
    expect(useCases.upsertTest).toHaveBeenCalled();
  });

  it('GET /admin/international-tests/:id calls get', async () => {
    const useCases = createMockUseCases();
    const mockTest = { id: 'test-1', canonicalName: 'IELTS Academic' };
    useCases.get.mockResolvedValue(mockTest);
    const app = createApp(useCases);

    const res = await request(app).get('/admin/international-tests/test-1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockTest);
    expect(useCases.get).toHaveBeenCalledWith('test-1');
  });

  it('PATCH /admin/international-tests/:id calls updateTest', async () => {
    const useCases = createMockUseCases();
    useCases.updateTest.mockResolvedValue({ id: 'test-1', abbreviation: 'IELTS' });
    const app = createApp(useCases);

    const res = await request(app)
      .patch('/admin/international-tests/test-1')
      .send({ abbreviation: 'IELTS' });

    expect(res.status).toBe(200);
    expect(useCases.updateTest).toHaveBeenCalledWith('test-1', { abbreviation: 'IELTS' }, expect.any(Object));
  });

  it('POST /admin/international-tests/:id/publish calls publish', async () => {
    const useCases = createMockUseCases();
    useCases.publish.mockResolvedValue(undefined);
    const app = createApp(useCases);

    const res = await request(app).post('/admin/international-tests/test-1/publish');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(useCases.publish).toHaveBeenCalledWith('test-1', expect.any(Object));
  });

  it('GET and POST /admin/international-tests/:id/variants delegate to variant use cases', async () => {
    const useCases = createMockUseCases();
    useCases.listVariants.mockResolvedValue([{ id: 'v1', variantName: 'Academic' }]);
    useCases.upsertVariant.mockResolvedValue({ id: 'v1', variantName: 'Academic' });
    const app = createApp(useCases);

    const getRes = await request(app).get('/admin/international-tests/test-1/variants');
    expect(getRes.status).toBe(200);
    expect(useCases.listVariants).toHaveBeenCalledWith('test-1');

    const postRes = await request(app)
      .post('/admin/international-tests/test-1/variants')
      .send({ variantName: 'Academic', deliveryMode: 'ONLINE', isActive: true });
    expect(postRes.status).toBe(200);
    expect(useCases.upsertVariant).toHaveBeenCalledWith('test-1', { variantName: 'Academic', deliveryMode: 'ONLINE', isActive: true }, expect.any(Object));
  });

  it('GET and POST /admin/international-tests/:id/sections delegate to section use cases', async () => {
    const useCases = createMockUseCases();
    useCases.listSections.mockResolvedValue([{ id: 's1', sectionName: 'Listening' }]);
    useCases.upsertSection.mockResolvedValue({ id: 's1', sectionName: 'Listening' });
    const app = createApp(useCases);

    const getRes = await request(app).get('/admin/international-tests/test-1/sections');
    expect(getRes.status).toBe(200);

    const postRes = await request(app)
      .post('/admin/international-tests/test-1/sections')
      .send({ sectionName: 'Listening', sectionType: 'LISTENING', order: 1 });
    expect(postRes.status).toBe(200);
    expect(useCases.upsertSection).toHaveBeenCalledWith('test-1', { sectionName: 'Listening', sectionType: 'LISTENING', order: 1 }, expect.any(Object));
  });

  it('POST /admin/international-tests/:id/score-scale calls upsertScoreScale', async () => {
    const useCases = createMockUseCases();
    useCases.upsertScoreScale.mockResolvedValue({ overallMinimum: 0, overallMaximum: 9 });
    const app = createApp(useCases);

    const res = await request(app)
      .post('/admin/international-tests/test-1/score-scale')
      .send({ overallMinimum: 0, overallMaximum: 9 });

    expect(res.status).toBe(200);
    expect(useCases.upsertScoreScale).toHaveBeenCalledWith('test-1', { overallMinimum: 0, overallMaximum: 9 }, expect.any(Object));
  });

  it('POST /admin/international-tests/:id/fees calls upsertFeeMetadata', async () => {
    const useCases = createMockUseCases();
    useCases.upsertFeeMetadata.mockResolvedValue({ amount: 200, currencyCode: 'USD' });
    const app = createApp(useCases);

    const res = await request(app)
      .post('/admin/international-tests/test-1/fees')
      .send({ feeType: 'REGISTRATION', amount: 200, currencyCode: 'USD', hasRegionalVariation: false });

    expect(res.status).toBe(200);
    expect(useCases.upsertFeeMetadata).toHaveBeenCalledWith('test-1', { feeType: 'REGISTRATION', amount: 200, currencyCode: 'USD', hasRegionalVariation: false }, expect.any(Object));
  });

  it('POST /admin/international-tests/:id/official-links calls upsertOfficialLink', async () => {
    const useCases = createMockUseCases();
    useCases.upsertOfficialLink.mockResolvedValue({ url: 'https://ielts.org' });
    const app = createApp(useCases);

    const res = await request(app)
      .post('/admin/international-tests/test-1/official-links')
      .send({ linkType: 'REGISTRATION', url: 'https://ielts.org' });

    expect(res.status).toBe(200);
    expect(useCases.upsertOfficialLink).toHaveBeenCalledWith('test-1', { linkType: 'REGISTRATION', url: 'https://ielts.org' }, expect.any(Object));
  });

  it('GET and POST /admin/international-tests/:id/availability delegate to availability use cases', async () => {
    const useCases = createMockUseCases();
    useCases.listAvailability.mockResolvedValue({ availableCountryIds: ['SA'] });
    useCases.upsertAvailability.mockResolvedValue({ availableCountryIds: ['SA'] });
    const app = createApp(useCases);

    const getRes = await request(app).get('/admin/international-tests/test-1/availability');
    expect(getRes.status).toBe(200);

    const postRes = await request(app)
      .post('/admin/international-tests/test-1/availability')
      .send({ availableCountryIds: ['SA'] });
    expect(postRes.status).toBe(200);
    expect(useCases.upsertAvailability).toHaveBeenCalledWith('test-1', { availableCountryIds: ['SA'] }, expect.any(Object));
  });

  it('GET and POST /admin/international-tests/:id/preparation-materials delegate to prep materials use cases', async () => {
    const useCases = createMockUseCases();
    useCases.listPreparationMaterials.mockResolvedValue([]);
    useCases.upsertPreparationMaterial.mockResolvedValue({ title: 'Prep Guide' });
    const app = createApp(useCases);

    const getRes = await request(app).get('/admin/international-tests/test-1/preparation-materials');
    expect(getRes.status).toBe(200);

    const postRes = await request(app)
      .post('/admin/international-tests/test-1/preparation-materials')
      .send({ materialType: 'GUIDE', title: 'Prep Guide' });
    expect(postRes.status).toBe(200);
    expect(useCases.upsertPreparationMaterial).toHaveBeenCalledWith('test-1', { materialType: 'GUIDE', title: 'Prep Guide' }, expect.any(Object));
  });

  it('GET and POST /admin/international-tests/:id/evidence delegate to evidence use cases', async () => {
    const useCases = createMockUseCases();
    useCases.listEvidence.mockResolvedValue([]);
    useCases.addEvidence.mockResolvedValue({ sourceUrl: 'https://example.com' });
    const app = createApp(useCases);

    const getRes = await request(app).get('/admin/international-tests/test-1/evidence');
    expect(getRes.status).toBe(200);

    const postRes = await request(app)
      .post('/admin/international-tests/test-1/evidence')
      .send({ sourceUrl: 'https://example.com' });
    expect(postRes.status).toBe(200);
    expect(useCases.addEvidence).toHaveBeenCalledWith('test-1', { sourceUrl: 'https://example.com' }, expect.any(Object));
  });

  it('returns 404 when test is not found', async () => {
    const useCases = createMockUseCases();
    useCases.get.mockRejectedValue(new Error('International test not found'));
    const app = createApp(useCases);

    const res = await request(app).get('/admin/international-tests/missing-id');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'International test not found' });
  });

  it('returns 400 on validation error', async () => {
    const useCases = createMockUseCases();
    useCases.upsertScoreScale.mockRejectedValue(new Error('Invalid score scale: overallMinimum cannot be greater than overallMaximum'));
    const app = createApp(useCases);

    const res = await request(app)
      .post('/admin/international-tests/test-1/score-scale')
      .send({ overallMinimum: 10, overallMaximum: 2 });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid score scale: overallMinimum cannot be greater than overallMaximum' });
  });
});
