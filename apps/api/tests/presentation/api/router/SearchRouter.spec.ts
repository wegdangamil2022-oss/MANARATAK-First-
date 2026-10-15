import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { ManageSearchUseCase, type IPublicSearchGateway } from '@manaratak/application';
import { SearchResult, type ISearchRequestRepository } from '@manaratak/domain';
import { SearchRouter } from '../../../../src/presentation/api/router/SearchRouter';
vi.mock('../../../../src/infrastructure/di/container.js', () => ({ container: { resolve: vi.fn() } }));

type Dependencies = Parameters<typeof SearchRouter.create>[0];
const validBody = { scope: 'PUBLIC_CATALOG', criteria: { query: 'study' }, pagination: { page: 1, limit: 20 } };

describe('SearchRouter public/internal access boundaries', () => {
  function appWith(permissions = ['admin:search:execute', 'admin:search:history:read']) {
    const requestRepository: ISearchRequestRepository = { save: vi.fn(), findBy: vi.fn().mockResolvedValue([]) };
    const searchEngineGateway: IPublicSearchGateway = {
      execute: vi.fn().mockResolvedValue(new SearchResult(0, 0)),
      searchPublic: vi.fn().mockResolvedValue({ items: [], hasMore: false, nextCursor: null }),
    };
    const manageSearchUseCase = new ManageSearchUseCase(requestRepository, searchEngineGateway);
    const executeSearch = vi.spyOn(manageSearchUseCase, 'executeSearch');
    const getSearchRequestHistory = vi.spyOn(manageSearchUseCase, 'getSearchRequestHistory');
    const authEvaluatorService = { evaluatePermission: vi.fn(async (_actor: string, permission: string) => ({ isGranted: permissions.includes(permission) })) };
    const tokenProvider = { verifyAccessToken: vi.fn(async token => {
      if (token !== 'valid-test-token') throw new Error('invalid token');
      return { userId: 'actor-a', sessionId: 'session-a' };
    }) };
    const sessionManager = { isSessionActive: vi.fn().mockResolvedValue(true), revokeAllSessions: vi.fn() };
    const principalAccessValidator = { isAuthenticationAllowed: vi.fn().mockResolvedValue(true) };
    const mfaUseCases = { sessionAuthenticated: vi.fn().mockResolvedValue(true), assertFresh: vi.fn() };
    const app = express(); app.use(express.json());
    // Mount the production router with its real strict auth and permission guards.
    app.use('/api/v1/search', SearchRouter.create({ manageSearchUseCase, searchEngineGateway,
      authEvaluatorService: authEvaluatorService as unknown as Dependencies['authEvaluatorService'], tokenProvider: tokenProvider as unknown as Dependencies['tokenProvider'],
      sessionManager: sessionManager as unknown as Dependencies['sessionManager'], principalAccessValidator: principalAccessValidator as unknown as Dependencies['principalAccessValidator'], mfaUseCases: mfaUseCases as unknown as Dependencies['mfaUseCases'] }));
    return { app, executeSearch, getSearchRequestHistory, requestRepository, searchEngineGateway, authEvaluatorService, sessionManager, principalAccessValidator, mfaUseCases };
  }

  it('keeps published catalog search anonymous and forwards locale/cursor without writing search history', async () => {
    const { app, searchEngineGateway, requestRepository, authEvaluatorService } = appWith([]);
    const response = await request(app).get('/api/v1/search/public?q=study&locale=en&cursor=test-cursor&kinds=majors,courses');
    expect(response.status).toBe(200);
    expect(searchEngineGateway.searchPublic).toHaveBeenCalledWith(expect.objectContaining({ query: 'study', locale: 'en', cursor: 'test-cursor', kinds: ['majors','courses'] }));
    expect(requestRepository.save).not.toHaveBeenCalled(); expect(authEvaluatorService.evaluatePermission).not.toHaveBeenCalled();
  });
  it('validates public requests without requiring authentication', async () => {
    const { app, searchEngineGateway } = appWith();
    expect((await request(app).get('/api/v1/search/public?q=')).status).toBe(400);
    expect(searchEngineGateway.searchPublic).not.toHaveBeenCalled();
  });
  it.each(['POST', 'GET'])('requires authentication for internal %s before execution or history lookup', async method => {
    const { app, executeSearch, getSearchRequestHistory } = appWith();
    const response = method === 'POST'
      ? await request(app).post('/api/v1/search').send(validBody)
      : await request(app).get('/api/v1/search/history/some-reference');
    expect(response.status).toBe(401); expect(response.headers['cache-control']).toBe('no-store');
    expect(executeSearch).not.toHaveBeenCalled(); expect(getSearchRequestHistory).not.toHaveBeenCalled();
  });
  it('rejects invalid credentials', async () => {
    const { app, executeSearch } = appWith();
    expect((await request(app).post('/api/v1/search').set('Authorization','Bearer invalid').send(validBody)).status).toBe(401);
    expect(executeSearch).not.toHaveBeenCalled();
  });
  it.each(['session', 'principal', 'mfa'])('rejects inactive %s before lookup', async dependency => {
    const fixture = appWith();
    if (dependency === 'session') fixture.sessionManager.isSessionActive.mockResolvedValue(false);
    if (dependency === 'principal') fixture.principalAccessValidator.isAuthenticationAllowed.mockResolvedValue(false);
    if (dependency === 'mfa') fixture.mfaUseCases.sessionAuthenticated.mockResolvedValue(false);
    const response = await request(fixture.app).get('/api/v1/search/history/some-reference').set('Authorization','Bearer valid-test-token');
    expect(response.status).toBe(401); expect(fixture.getSearchRequestHistory).not.toHaveBeenCalled();
  });
  it('does not let platform-manage alone grant search execution or history', async () => {
    const { app, executeSearch, getSearchRequestHistory } = appWith(['admin:platform:manage']);
    expect((await request(app).post('/api/v1/search').set('Authorization','Bearer valid-test-token').send(validBody)).status).toBe(403);
    expect((await request(app).get('/api/v1/search/history/some-reference').set('Authorization','Bearer valid-test-token')).status).toBe(403);
    expect(executeSearch).not.toHaveBeenCalled(); expect(getSearchRequestHistory).not.toHaveBeenCalled();
  });
  it('binds execution to the verified principal and persists its ownership', async () => {
    const { app, executeSearch, requestRepository } = appWith(['admin:search:execute']);
    const response = await request(app).post('/api/v1/search').set('Authorization','Bearer valid-test-token').send(validBody);
    expect(response.status).toBe(200); expect(response.headers['cache-control']).toBe('no-store');
    expect(executeSearch).toHaveBeenCalledWith(expect.objectContaining({ scope: 'PUBLIC_CATALOG' }), { actorReferenceId:'actor-a' });
    expect(vi.mocked(requestRepository.save).mock.calls[0][0].getActorReferenceId()).toBe('actor-a');
  });
  it('passes only the authenticated actor to history even when query parameters try to impersonate another', async () => {
    const { app, getSearchRequestHistory } = appWith(['admin:search:history:read']);
    const response = await request(app).get('/api/v1/search/history/some-reference?actorReferenceId=actor-b').set('Authorization','Bearer valid-test-token');
    expect(response.status).toBe(200); expect(response.body).toEqual([]);
    expect(getSearchRequestHistory).toHaveBeenCalledWith('some-reference',{ actorReferenceId:'actor-a' });
  });
  it.each([
    { ...validBody, criteria: { query:'x'.repeat(201) } },
    { ...validBody, pagination: {page:1,limit:101} },
    { ...validBody, criteria: { filters: Array.from({length:21},()=>({field:'country',operator:'EQ',value:'YE'})) } },
    { ...validBody, scope:'identity' },
    { ...validBody, actorReferenceId:'actor-b' },
  ])('rejects invalid or forged internal input before persistence', async body => {
    const { app, executeSearch, requestRepository } = appWith();
    expect((await request(app).post('/api/v1/search').set('Authorization','Bearer valid-test-token').send(body)).status).toBe(400);
    expect(executeSearch).not.toHaveBeenCalled(); expect(requestRepository.save).not.toHaveBeenCalled();
  });
  it('validates history reference before querying persistence', async () => {
    const { app, getSearchRequestHistory } = appWith();
    expect((await request(app).get('/api/v1/search/history/invalid!reference').set('Authorization','Bearer valid-test-token')).status).toBe(400);
    expect(getSearchRequestHistory).not.toHaveBeenCalled();
  });
});
