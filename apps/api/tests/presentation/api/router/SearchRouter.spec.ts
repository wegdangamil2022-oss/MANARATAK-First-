import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { ManageSearchUseCase, type IPublicSearchGateway } from '@manaratak/application';
import { SearchResult, type ISearchRequestRepository } from '@manaratak/domain';
import { SearchRouter } from '../../../../src/presentation/api/router/SearchRouter';

describe('SearchRouter abuse boundaries', () => {
  function appWith(executeSearch = vi.fn()) {
    const requestRepository: ISearchRequestRepository = {
      save: vi.fn(),
      findBy: vi.fn().mockResolvedValue([]),
    };
    const searchEngineGateway: IPublicSearchGateway = {
      execute: vi.fn().mockResolvedValue(new SearchResult(0, 0)),
      searchPublic: vi.fn().mockResolvedValue({ items: [], hasMore: false, nextCursor: null }),
    };
    const manageSearchUseCase = new ManageSearchUseCase(requestRepository, searchEngineGateway);
    vi.spyOn(manageSearchUseCase, 'executeSearch').mockImplementation(executeSearch);
    const app = express();
    app.use(express.json());
    app.use(
      '/api/v1/search',
      SearchRouter.create({
        manageSearchUseCase,
        searchEngineGateway,
      }),
    );
    return { app, executeSearch };
  }

  it('rejects oversized search text before invoking the search engine', async () => {
    const { app, executeSearch } = appWith();
    const response = await request(app)
      .post('/api/v1/search')
      .send({
        scope: 'scholarships',
        criteria: { query: 'x'.repeat(201) },
        pagination: { page: 1, limit: 20 },
      });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('SEARCH_REQUEST_INVALID');
    expect(executeSearch).not.toHaveBeenCalled();
  });

  it('caps page size and filter count before persistence or execution', async () => {
    const { app, executeSearch } = appWith();
    const response = await request(app)
      .post('/api/v1/search')
      .send({
        scope: 'scholarships',
        criteria: {
          filters: Array.from({ length: 21 }, () => ({
            field: 'country',
            operator: 'EQUALS',
            value: 'YE',
          })),
        },
        pagination: { page: 1, limit: 101 },
      });

    expect(response.status).toBe(400);
    expect(executeSearch).not.toHaveBeenCalled();
  });
});
