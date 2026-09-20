import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { ReferenceDataPublicRouter } from '../../../../src/presentation/api/router/ReferenceDataPublicRouter';

describe('ReferenceDataPublicRouter locale contract', () => {
  const createRepository = () => ({
    listCountries: vi.fn(), listCurrencies: vi.fn(), listLanguages: vi.fn(), listCities: vi.fn(), listRegions: vi.fn(), getCountry: vi.fn(),
  });
  const createApp = (repository: ReturnType<typeof createRepository>, universityRepository = { listPublished: vi.fn() }) => {
    const app = express();
    app.use('/reference-data', ReferenceDataPublicRouter.create({ referenceDataRepository: repository as any, universityRepository: universityRepository as any }));
    return app;
  };

  it('projects reference names by locale', async () => {
    const repository = createRepository();
    repository.listCountries.mockResolvedValue([{ id: 'ye', iso2Code: 'YE', iso3Code: 'YEM', name: 'Yemen', nameAr: 'اليمن', isActive: true }]);
    const res = await request(createApp(repository)).get('/reference-data/countries?locale=ar');
    expect(res.status).toBe(200);
    expect(res.body.data[0].name).toBe('اليمن');
    expect(res.body.data[0].nameAr).toBeUndefined();
  });

  it('lists published universities through canonical country identity', async () => {
    const repository = createRepository();
    repository.getCountry.mockResolvedValue({ id: 'country-ye', iso2Code: 'YE' });
    const universityRepository = { listPublished: vi.fn().mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 }) };
    const res = await request(createApp(repository, universityRepository)).get('/reference-data/countries/ye/universities');
    expect(res.status).toBe(200);
    expect(universityRepository.listPublished).toHaveBeenCalledWith({ countryReferenceId: 'country-ye' });
  });

  it('exposes localized administrative regions', async () => {
    const repository = createRepository();
    repository.listRegions.mockResolvedValue([{ id: 'r1', countryIso2Code: 'YE', regionCode: 'SA', name: 'Sanaa', nameAr: 'صنعاء' }]);
    const res = await request(createApp(repository)).get('/reference-data/regions?countryIso2Code=YE&locale=ar');
    expect(res.status).toBe(200);
    expect(res.body.data[0].name).toBe('صنعاء');
  });
});
