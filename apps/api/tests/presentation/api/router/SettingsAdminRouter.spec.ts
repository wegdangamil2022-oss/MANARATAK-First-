import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import { SettingsAdminRouter } from '../../../../src/presentation/api/router/SettingsAdminRouter';

describe('SettingsAdminRouter', () => {
  let app: Express;
  let mockManageSettingsUseCase: any;

  beforeEach(() => {
    mockManageSettingsUseCase = {
      createDefinition: vi.fn(),
      assignValue: vi.fn(),
      rollbackValue: vi.fn(),
      definitionPage: vi.fn().mockResolvedValue({ definitions: [] }),
      assignmentPage: vi.fn().mockResolvedValue({ assignments: [] }), assignmentContext: vi.fn(),
      assignmentHistory: vi.fn(), clearOverride: vi.fn(), updateDefinition: vi.fn(), definitionImpact: vi.fn()
    };

    app = express();
    app.use(express.json());
    app.use((req, _res, next) => { (req as any).authUserId = 'admin-settings-1'; next(); });
    app.use('/api/v1/admin/settings', SettingsAdminRouter.create({
      manageSettingsUseCase: mockManageSettingsUseCase
    }));
  });

  it('GET /definitions should return sanitized definitions', async () => {
    mockManageSettingsUseCase.definitionPage.mockResolvedValue({ definitions: [{ id: 'd1', key: 'feature.test', valueType: 'Boolean', isFeatureFlag: true, isDeprecated: false, isSecret: false }] });
    const res = await request(app).get('/api/v1/admin/settings/definitions');
    expect(res.status).toBe(200);
    expect(res.body.data.definitions).toHaveLength(1);
  });

  it('POST /definitions should validate and call use case', async () => {
    const payload = {
      id: 'def-1',
      key: 'test.key',
      valueType: 'String',
      description: 'Test'
    };

    const res = await request(app)
      .post('/api/v1/admin/settings/definitions')
      .send(payload);

    expect(res.status).toBe(201);
    expect(mockManageSettingsUseCase.createDefinition).toHaveBeenCalledWith(
      expect.objectContaining(payload),
      expect.objectContaining({ actorId: 'admin-settings-1', source: 'admin-settings-api' })
    );
  });

  it('rejects missing CAS and invalid rule expressions', async () => {
    expect((await request(app).post('/api/v1/admin/settings/assignments')
      .send({ assignmentId: 'a', key: 'feature.safe', level: 'GLOBAL', versionId: 'v1', value: true, type: 'Boolean' })).status).toBe(400);
    expect((await request(app).post('/api/v1/admin/settings/assignments/rollback')
      .send({ assignmentId: 'a', previousVersionId: 'v1', newVersionId: 'v2', changeReason: 'Review rollback' })).status).toBe(400);
    expect((await request(app).post('/api/v1/admin/settings/definitions')
      .send({ id: 'invalid', key: 'site.name', valueType: 'String', validationRules: { pattern: '(a+)+$' } })).status).toBe(400);
  });

  it('POST /definitions should fail validation if invalid', async () => {
    const payload = {
      id: 'def-1',
      // missing key
      valueType: 'String'
    };

    const res = await request(app)
      .post('/api/v1/admin/settings/definitions')
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockManageSettingsUseCase.createDefinition).not.toHaveBeenCalled();
  });

  it('POST /assignments should validate and call use case', async () => {
    const payload = {
      assignmentId: 'assign-1',
      key: 'test.key',
      level: 'DOMAIN',
      scopeId: 'courses',
      versionId: 'v-1',
      expectedCurrentVersionId: null,
      value: 'new-val',
      type: 'String'
    };

    const res = await request(app)
      .post('/api/v1/admin/settings/assignments')
      .send(payload);

    expect(res.status).toBe(201);
    expect(mockManageSettingsUseCase.assignValue).toHaveBeenCalledWith(
      expect.objectContaining({ ...payload, authorId: 'admin-settings-1' }),
      expect.objectContaining({ actorId: 'admin-settings-1', source: 'admin-settings-api' })
    );
  });

  it('rejects unapproved TENANT writes via the Application boundary without leaking values', async () => {
    mockManageSettingsUseCase.assignValue.mockRejectedValue(new Error('SETTINGS_TENANT_SCOPE_UNAPPROVED'));
    const result = await request(app).post('/api/v1/admin/settings/assignments').send({
      assignmentId: 'legacy', key: 'feature.safe', level: 'TENANT', scopeId: 'legacy',
      versionId: 'attempt', expectedCurrentVersionId: null, value: true, type: 'Boolean',
    });
    expect(result.status).toBe(400);
    expect(result.body.error.code).toBe('SETTINGS_OPERATION_REJECTED');
    expect(JSON.stringify(result.body)).not.toContain('true');
  });

  it('POST /assignments/rollback should validate and call use case', async () => {
    const payload = {
      assignmentId: 'assign-1',
      previousVersionId: 'v-1',
      expectedCurrentVersionId: 'v-1',
      changeReason: 'Restore reviewed previous value',
      newVersionId: 'v-2'
    };

    const res = await request(app)
      .post('/api/v1/admin/settings/assignments/rollback')
      .send(payload);

    expect(res.status).toBe(200);
    expect(mockManageSettingsUseCase.rollbackValue).toHaveBeenCalledWith(
      expect.objectContaining({ ...payload, authorId: 'admin-settings-1' }),
      expect.objectContaining({ actorId: 'admin-settings-1', source: 'admin-settings-api' })
    );
  });
  it.each([undefined, null, 'false', 0])('rejects a flag without a Boolean default %j before the use case', async defaultValue => {
    const res = await request(app).post('/api/v1/admin/settings/definitions').send({ id: 'flag', key: 'feature.safe',
      valueType: 'Boolean', isFeatureFlag: true, defaultValue });
    expect(res.status).toBe(400);
    expect(mockManageSettingsUseCase.createDefinition).not.toHaveBeenCalled();
  });

  it('clear requires a reason/revision and uses the trusted actor, not a submitted identity', async () => {
    const body = { assignmentId: 'assignment', newVersionId: 'clear', expectedCurrentVersionId: 'v1', changeReason: 'Use inherited policy' };
    mockManageSettingsUseCase.clearOverride.mockResolvedValue('assignment');
    expect((await request(app).post('/api/v1/admin/settings/assignments/clear').send(body)).status).toBe(200);
    expect(mockManageSettingsUseCase.clearOverride).toHaveBeenCalledWith({ ...body, authorId: 'admin-settings-1' }, expect.objectContaining({ actorId: 'admin-settings-1' }));
    mockManageSettingsUseCase.clearOverride.mockClear();
    for (const invalid of [{ ...body, changeReason: undefined }, { ...body, expectedCurrentVersionId: undefined }, { ...body, authorId: 'forged' }]) {
      expect((await request(app).post('/api/v1/admin/settings/assignments/clear').send(invalid)).status).toBe(400);
    }
    expect(mockManageSettingsUseCase.clearOverride).not.toHaveBeenCalled();
  });
  it('updates metadata with a revision/reason and refuses type/secret/reactivation changes', async () => {
    const body = { key: 'feature.safe', expectedRevision: '2026-10-09T00:00:00.000Z', isDeprecated: true, changeReason: 'Retire approved feature' };
    expect((await request(app).post('/api/v1/admin/settings/definitions/update').send(body)).status).toBe(200);
    expect(mockManageSettingsUseCase.updateDefinition).toHaveBeenCalledWith(body, expect.objectContaining({ actorId: 'admin-settings-1' }));
    mockManageSettingsUseCase.updateDefinition.mockClear();
    for (const invalid of [{ ...body, valueType: 'String' }, { ...body, isDeprecated: false }, { ...body, changeReason: '' }, { ...body, isSecret: true }]) {
      expect((await request(app).post('/api/v1/admin/settings/definitions/update').send(invalid)).status).toBe(400);
    }
    expect(mockManageSettingsUseCase.updateDefinition).not.toHaveBeenCalled();
  });
  it('maps a stale definition revision to conflict and hides unexpected database errors', async () => {
    const body = { key: 'feature.safe', expectedRevision: '2026-10-09T00:00:00.000Z', description: 'new', changeReason: 'Clarify description' };
    mockManageSettingsUseCase.updateDefinition.mockRejectedValueOnce(new Error('SETTINGS_DEFINITION_CONFLICT'));
    expect((await request(app).post('/api/v1/admin/settings/definitions/update').send(body)).status).toBe(409);
    mockManageSettingsUseCase.updateDefinition.mockRejectedValueOnce(new Error('SELECT password FROM private-db'));
    const failed = await request(app).post('/api/v1/admin/settings/definitions/update').send(body);
    expect(failed.status).toBe(503); expect(failed.body.error.code).toBe('SETTINGS_UNAVAILABLE');
    expect(JSON.stringify(failed.body)).not.toContain('private-db');
  });

  it('reports missing assignments without exposing repository details', async () => {
    mockManageSettingsUseCase.clearOverride.mockRejectedValue(new Error('SETTINGS_ASSIGNMENT_NOT_FOUND'));
    const res = await request(app).post('/api/v1/admin/settings/assignments/clear').send({ assignmentId: 'missing',
      expectedCurrentVersionId: 'v1', newVersionId: 'clear', changeReason: 'Use inherited policy' });
    expect(res.status).toBe(404); expect(res.body.error.code).toBe('SETTINGS_NOT_FOUND');
  });

  it('bounds lazy history and rejects unknown or oversized query fields', async () => {
    mockManageSettingsUseCase.assignmentHistory.mockResolvedValue({ versions: [], nextCursor: 'v2' });
    const url = '/api/v1/admin/settings/assignments/a/history';
    const valid = await request(app).get(url).query({ expectedCurrentVersionId: 'v3', limit: '20', cursor: 'v2' });
    expect(valid.status).toBe(200); expect(valid.headers['cache-control']).toBe('no-store');
    expect(mockManageSettingsUseCase.assignmentHistory).toHaveBeenCalledWith('a', 'v3', 20, 'v2');
    expect((await request(app).get(url).query({ expectedCurrentVersionId: 'v3', limit: '101' })).status).toBe(400);
    expect((await request(app).get(url).query({ expectedCurrentVersionId: 'v3', allowSecrets: 'true' })).status).toBe(400);
    expect((await request(app).get(url)).status).toBe(400);
    expect(mockManageSettingsUseCase.assignmentHistory).toHaveBeenCalledTimes(1);
  });
  it('returns a reload conflict for a history page whose current version changed', async () => {
    mockManageSettingsUseCase.assignmentHistory.mockRejectedValue(new Error('SETTINGS_ASSIGNMENT_CONFLICT'));
    const result = await request(app).get('/api/v1/admin/settings/assignments/a/history').query({ expectedCurrentVersionId: 'v3' });
    expect(result.status).toBe(409); expect(result.body.error.code).toBe('SETTINGS_CONFLICT');
  });

  it('lists summary projections with SQL filters rather than requesting full history', async () => {
    mockManageSettingsUseCase.assignmentPage.mockResolvedValue({ assignments: [{ id: 'a', versions: [], versionCount: 500 }] });
    const result = await request(app).get('/api/v1/admin/settings/assignments').query({ key: 'site.title', level: 'DOMAIN', scopeId: 'courses' });
    expect(result.status).toBe(200); expect(result.headers['cache-control']).toBe('no-store');
    expect(mockManageSettingsUseCase.assignmentPage).toHaveBeenCalledWith({ key: 'site.title', level: 'DOMAIN', scopeId: 'courses', limit: 50 });
    expect(result.body.data.assignments[0]).toMatchObject({ versions: [], versionCount: 500 });
  });

  it('validates page/search/classification bounds and forwards continuations', async () => {
    const response = await request(app).get('/api/v1/admin/settings/definitions').query({ q: ' title ', classification: 'FLAG', limit: '2', cursor: 'feature.previous' });
    expect(response.status).toBe(200);
    expect(mockManageSettingsUseCase.definitionPage).toHaveBeenLastCalledWith({ q: 'title', classification: 'FLAG', limit: 2, cursor: 'feature.previous' });
    for (const query of [{ limit: '101' }, { limit: '-1' }, { classification: 'bogus' }, { q: 'x'.repeat(201) }, { allowSecrets: 'true' }])
      expect((await request(app).get('/api/v1/admin/settings/definitions').query(query)).status).toBe(400);
    expect((await request(app).get('/api/v1/admin/settings/assignments').query({ limit: '1000' })).status).toBe(400);
  });
  it('uses an exact scope context lookup independent of list cursor and rejects extra query fields', async () => {
    mockManageSettingsUseCase.assignmentContext.mockResolvedValue({ definition: { key: 'site.title' }, assignment: { id: 'off-page', currentVersionId: 'v7' } });
    const url = '/api/v1/admin/settings/assignments/context';
    const response = await request(app).get(url).query({ key: 'site.title', level: 'DOMAIN', scopeId: 'courses' });
    expect(response.status).toBe(200); expect(response.body.data.assignment.id).toBe('off-page');
    expect(response.headers['cache-control']).toBe('no-store');
    expect(mockManageSettingsUseCase.assignmentContext).toHaveBeenCalledWith('site.title', 'DOMAIN', 'courses');
    expect((await request(app).get(url).query({ key: 'site.title', level: 'GLOBAL', cursor: 'hidden' })).status).toBe(400);
    expect((await request(app).get(url).query({ key: 'site.title', level: 'GLOBAL', scopeId: 'forbidden' })).status).toBe(400);
    expect((await request(app).get(url).query({ key: 'site.title', level: 'DOMAIN' })).status).toBe(400);
  });

});
