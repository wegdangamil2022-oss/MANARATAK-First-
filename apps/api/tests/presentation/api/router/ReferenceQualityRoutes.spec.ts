import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { ReferenceDataAdminRouter } from '../../../../src/presentation/api/router/ReferenceDataAdminRouter';

function setup() {
  const getQualityReport = vi.fn(async () => ({ data: [], counts: {}, total: 0, page: 1, pageSize: 25, authoritativeCoverage: 'unknown' }));
  const api = express();
  api.use('/p7', ReferenceDataAdminRouter.create({ referenceDataUseCases: { getQualityReport } as any }));
  return { api, getQualityReport };
}
describe('Reference quality query HTTP contract', () => {
  it('uses a strict bounded owner query and returns unknown official coverage', async () => {
    const h = setup(); const response = await request(h.api).get('/p7/quality/issues?countryIso2Code=US&kind=AMBIGUOUS_ALIAS&page=2');
    expect(response.status).toBe(200);
    expect(h.getQualityReport).toHaveBeenCalledWith({ countryIso2Code: 'US', kind: 'AMBIGUOUS_ALIAS', page: 2 });
    expect(response.body.authoritativeCoverage).toBe('unknown');
  });
  it.each(['countryIso2Code=US%27', 'kind=OTHER', 'page=1001', 'page=0', 'reviewer=forged'])('rejects invalid query %s before owner reads', async query => {
    const h = setup(); expect((await request(h.api).get(`/p7/quality/issues?${query}`)).status).toBe(400);
    expect(h.getQualityReport).not.toHaveBeenCalled();
  });
});
