import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import { SettingsRuntimeRouter } from '../../../../src/presentation/api/router/SettingsRuntimeRouter';

describe('SettingsRuntimeRouter', () => {
  let app: Express;
  let mockResolveConfigurationUseCase: any;

  beforeEach(() => {
    mockResolveConfigurationUseCase = {
      resolveSetting: vi.fn(), inspectSetting: vi.fn()
    };

    app = express();
    app.use(express.json());
    app.use('/api/v1/runtime/settings', SettingsRuntimeRouter.create({
      resolveConfigurationUseCase: mockResolveConfigurationUseCase
    }));
  });

  it('GET /resolve/:key should call use case with correct params', async () => {
    mockResolveConfigurationUseCase.resolveSetting.mockResolvedValue('test-val');

    const res = await request(app)
      .get('/api/v1/runtime/settings/resolve/test.key?identityId=id-1&tenantId=tenant-1');

    expect(res.status).toBe(200);
    expect(res.body.data.value).toBe('test-val');
    expect(mockResolveConfigurationUseCase.resolveSetting).toHaveBeenCalledWith(
      'test.key',
      { identityId: 'id-1', tenantId: 'tenant-1' }
    );
  });

  it('GET /resolve/:key distinguishes domain scope explicitly', async () => {
    mockResolveConfigurationUseCase.resolveSetting.mockResolvedValue('domain-val');
    const res = await request(app).get('/api/v1/runtime/settings/resolve/test.key?domainId=courses');
    expect(res.status).toBe(200);
    expect(mockResolveConfigurationUseCase.resolveSetting).toHaveBeenCalledWith('test.key', { domainId: 'courses' });
  });

  it('GET /resolve/:key handles resolution error', async () => {
    mockResolveConfigurationUseCase.resolveSetting.mockRejectedValue(new Error('Resolution failed'));

    const res = await request(app)
      .get('/api/v1/runtime/settings/resolve/test.key');

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('RESOLUTION_ERROR');
    expect(res.body.error.message).toBe('Settings resolution is unavailable.');
  });
  it('returns typed winning source metadata with private no-store caching', async () => {
    const data = { status: 'RESOLVED', key: 'feature.test', value: false, valueType: 'Boolean',
      sourceScope: 'GLOBAL', versionId: 'v1', usedDefault: false, chain: [] };
    mockResolveConfigurationUseCase.inspectSetting.mockResolvedValue(data);
    const res = await request(app).get('/api/v1/runtime/settings/inspect/feature.test?domainId=courses');
    expect(res.status).toBe(200); expect(res.body.data).toEqual(data);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(mockResolveConfigurationUseCase.inspectSetting).toHaveBeenCalledWith('feature.test', { domainId: 'courses' });
  });
  it('rejects unknown/unbounded diagnostic contexts before reading repositories', async () => {
    for (const query of [{ allowSecrets: 'true' }, { domainId: 'a'.repeat(121) }, { identityId: ' ' }]) {
      const res = await request(app).get('/api/v1/runtime/settings/inspect/feature.test').query(query);
      expect(res.status).toBe(400);
    }
    expect(mockResolveConfigurationUseCase.inspectSetting).not.toHaveBeenCalled();
  });
  it('does not leak raw repository errors from the inspector', async () => {
    mockResolveConfigurationUseCase.inspectSetting.mockRejectedValue(new Error('SELECT secret FROM host=private-db'));
    const res = await request(app).get('/api/v1/runtime/settings/inspect/feature.test');
    expect(res.status).toBe(503); expect(JSON.stringify(res.body)).not.toContain('private-db');
  });

});
