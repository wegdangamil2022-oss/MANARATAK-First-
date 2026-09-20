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
      listAssignments: vi.fn().mockResolvedValue([])
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
      expect.objectContaining(payload)
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
      expect.objectContaining({ ...payload, authorId: 'admin-settings-1' })
    );
  });

  it('POST /assignments/rollback should validate and call use case', async () => {
    const payload = {
      assignmentId: 'assign-1',
      previousVersionId: 'v-1',
      newVersionId: 'v-2'
    };

    const res = await request(app)
      .post('/api/v1/admin/settings/assignments/rollback')
      .send(payload);

    expect(res.status).toBe(200);
    expect(mockManageSettingsUseCase.rollbackValue).toHaveBeenCalledWith(
      expect.objectContaining({ ...payload, authorId: 'admin-settings-1' })
    );
  });
});
