import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { UniversityPublicRouter } from '../../../../src/presentation/api/router/UniversityPublicRouter';

const university = {
  id: 'u1', publicId: 'INS-QA-1', slug: 'qatar-university', canonicalName: 'Qatar University', canonicalDedupKey: 'qu',
  displayName: 'Qatar University', status: 'PUBLISHED', completenessStatus: 'COMPLETE',
  translations: [{ locale: 'ar', displayName: 'جامعة قطر', reviewStatus: 'PUBLISHED' }],
};

describe('UniversityPublicRouter locale contract', () => {
  const createRepository = () => ({ listPublished: vi.fn(), findBySlug: vi.fn() });
  const createApp = (repository: ReturnType<typeof createRepository>, referenceDataRepository = {
    getCountry: vi.fn().mockResolvedValue({ id: 'country-qa', iso2Code: 'QA' }),
    listCountries: vi.fn().mockResolvedValue([{ id: 'country-qa', iso2Code: 'QA', name: 'Qatar', isActive: true }, { id: 'country-ye', iso2Code: 'YE', name: 'Yemen', isActive: true }]),
  }) => {
    const app = express();
    app.use('/public/universities', UniversityPublicRouter.create({ universityRepository: repository as any, referenceDataRepository: referenceDataRepository as any }));
    return app;
  };

  it('projects list responses with requested locale and preserves filters', async () => {
    const repository = createRepository();
    repository.listPublished.mockResolvedValue({ data: [university], total: 1, page: 1, pageSize: 20, totalPages: 1 });
    const res = await request(createApp(repository)).get('/public/universities?countryReferenceId=country-qa&locale=ar');
    expect(res.status).toBe(200);
    expect(res.body.data[0].displayName).toBe('جامعة قطر');
    expect(repository.listPublished).toHaveBeenCalledWith(expect.objectContaining({ countryReferenceId: 'country-qa' }));
  });

  it.each([['QA', 'country-qa'], ['YE', 'country-ye']])('resolves countryIso2Code=%s to countryReferenceId', async (code, id) => {
    const repository = createRepository(); repository.listPublished.mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 });
    const refs = { getCountry: vi.fn().mockResolvedValue({ id, iso2Code: code }), listCountries: vi.fn() };
    expect((await request(createApp(repository, refs)).get(`/public/universities?countryIso2Code=${code}`)).status).toBe(200);
    expect(repository.listPublished).toHaveBeenCalledWith(expect.objectContaining({ countryReferenceId: id }));
  });

  it('returns client-safe errors for invalid and unknown country filters', async () => {
    const repository = createRepository();
    expect((await request(createApp(repository)).get('/public/universities?countryIso2Code=QATAR')).status).toBe(400);
    const refs = { getCountry: vi.fn().mockResolvedValue(null), listCountries: vi.fn().mockResolvedValue([]) };
    expect((await request(createApp(repository, refs)).get('/public/universities?countryIso2Code=ZZ')).status).toBe(400);
    const response = await request(createApp(repository, refs)).get('/public/universities?country=Atlantis');
    expect(response.status).toBe(400);
    expect(repository.listPublished).not.toHaveBeenCalled();
  });

  it('rejects legacy country-name relationship filters instead of resolving by display text', async () => {
    const repository = createRepository();
    const response = await request(createApp(repository)).get('/public/universities?country=Qatar');
    expect(response.status).toBe(400);
    expect(repository.listPublished).not.toHaveBeenCalled();
  });


  it('passes canonical majorId to the P11 AcademicProgram reverse read', async () => {
    const repository = createRepository();
    repository.listPublished.mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 });
    const res = await request(createApp(repository)).get('/public/universities?majorId=major-1');
    expect(res.status).toBe(200);
    expect(repository.listPublished).toHaveBeenCalledWith(expect.objectContaining({ majorId: 'major-1' }));
  });

  it('rejects invalid reverse-read pagination before querying P11', async () => {
    const repository = createRepository();
    const res = await request(createApp(repository)).get('/public/universities?majorId=major-1&page=abc');
    expect(res.status).toBe(400);
    expect(repository.listPublished).not.toHaveBeenCalled();
  });

  it('rejects unsupported locale', async () => {
    const repository = createRepository();
    const res = await request(createApp(repository)).get('/public/universities?locale=fr');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('UNSUPPORTED_LOCALE');
  });
});
