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
      listDefinitions: vi.fn().mockResolvedValue([]),
      listAssignments: vi.fn().mockResolvedValue([]),
      clearOverride: vi.fn(), updateDefinition: vi.fn(), definitionImpact: vi.fn()
    };

    app = express();
    app.use(express.json());
    app.use((req, _res, next) => { (req as any).authUserId = 'admin-settings-1'; next(); });
    app.use('/api/v1/admin/settings', SettingsAdminRouter.create({
      manageSettingsUseCase: mockManageSettingsUseCase
    }));
  });

  it('GET /definitions should return sanitized definitions', async () => {
    mockManageSettingsUseCase.listDefinitions.mockResolvedValue([{ id: 'd1', key: 'feature.test', valueType: 'Boolean', isFeatureFlag: true, isDeprecated: false, isSecret: false }]);
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
      level: 'TENANT',
      scopeId: 'tenant-1',
      versionId: 'v-1',
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

  it('POST /assignments/rollback should validate and call use case', async () => {
    const payload = {
      assignmentId: 'assign-1',
      previousVersionId: 'v-1',
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

});
