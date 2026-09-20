import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { AssetPlatformRouter } from '../../../../src/presentation/api/router/AssetPlatformRouter';
import { SecurityMiddlewareFactory } from '../../../../src/presentation/security/SecurityMiddlewareFactory';

describe('AssetPlatformRouter', () => {
  const createMockIngestUseCase = () => ({
    requestUploadLocator: vi.fn(),
    registerQuarantinedAsset: vi.fn()
  });

  const createMockProcessLifecycleUseCase = () => ({
    validateAsset: vi.fn(),
    markMalwareScanFailed: vi.fn(),
    sanitizeAsset: vi.fn(),
    activateAsset: vi.fn(),
    requestDeliveryGrant: vi.fn(),
    archiveAsset: vi.fn(),
    softDeleteAsset: vi.fn(),
    restoreAsset: vi.fn(),
    purgeAsset: vi.fn()
  });

  const createApp = (
    ingestUseCase = createMockIngestUseCase(),
    processLifecycleUseCase = createMockProcessLifecycleUseCase()
  ) => {
    const app = express();
    app.use(express.json());
    app.use('/assets', AssetPlatformRouter.create({
      ingestAssetUseCase: ingestUseCase as any,
      processAssetLifecycleUseCase: processLifecycleUseCase as any
    }));
    return app;
  };

  it('POST /assets/upload-locator requests upload locator', async () => {
    const ingestUseCase = createMockIngestUseCase();
    ingestUseCase.requestUploadLocator.mockResolvedValue({
      assetId: 'ast_01',
      assetReference: 'ref_01',
      storageLocator: 'loc_01',
      storageZone: 'QUARANTINE',
      bucketName: 'quarantine-bucket',
      pathKey: 'quarantine/ast_01.pdf',
      lifecycleState: 'QUARANTINED'
    });
    const app = createApp(ingestUseCase);

    const res = await request(app)
      .post('/assets/upload-locator')
      .send({
        assetId: 'ast_01',
        assetReference: 'ref_01',
        ownerId: 'owner_01',
        ownerType: 'STUDENT',
        originalFilename: 'document.pdf',
        mimeType: 'application/pdf',
        fileExtension: 'pdf',
        byteSize: 1024,
        classification: 'INTERNAL'
      });

    expect(res.status).toBe(201);
    expect(res.body.assetId).toBe('ast_01');
    expect(ingestUseCase.requestUploadLocator).toHaveBeenCalledWith(expect.objectContaining({
      assetId: 'ast_01',
      assetReference: 'ref_01',
      ownerId: 'owner_01',
      classification: 'INTERNAL'
    }));
  });

  it('POST /assets/upload-locator rejects raw URL for assetId or assetReference', async () => {
    const ingestUseCase = createMockIngestUseCase();
    const app = createApp(ingestUseCase);

    const res = await request(app)
      .post('/assets/upload-locator')
      .send({
        assetId: 'https://cdn.example.com/file.pdf',
        assetReference: 'ref_01',
        ownerId: 'owner_01',
        ownerType: 'STUDENT',
        originalFilename: 'document.pdf',
        mimeType: 'application/pdf',
        fileExtension: 'pdf',
        byteSize: 1024,
        classification: 'INTERNAL'
      });

    expect(res.status).toBe(400);
    expect(ingestUseCase.requestUploadLocator).not.toHaveBeenCalled();
  });

  it('POST /assets/register-quarantined registers quarantined asset', async () => {
    const ingestUseCase = createMockIngestUseCase();
    ingestUseCase.registerQuarantinedAsset.mockResolvedValue({
      id: 'ast_02',
      reference: 'ref_02',
      state: 'QUARANTINED'
    });
    const app = createApp(ingestUseCase);

    const res = await request(app)
      .post('/assets/register-quarantined')
      .send({
        assetId: 'ast_02',
        assetReference: 'ref_02',
        ownerId: 'owner_02',
        ownerType: 'STUDENT',
        originalFilename: 'photo.png',
        mimeType: 'image/png',
        fileExtension: 'png',
        byteSize: 2048,
        classification: 'PUBLIC'
      });

    expect(res.status).toBe(201);
    expect(ingestUseCase.registerQuarantinedAsset).toHaveBeenCalledWith(expect.objectContaining({
      assetId: 'ast_02',
      assetReference: 'ref_02'
    }));
  });

  it('POST /assets/register-quarantined rejects raw URL AssetReference', async () => {
    const ingestUseCase = createMockIngestUseCase();
    const app = createApp(ingestUseCase);

    const res = await request(app)
      .post('/assets/register-quarantined')
      .send({
        assetId: 'ast_02',
        assetReference: 'http://example.com/photo.png',
        ownerId: 'owner_02',
        ownerType: 'STUDENT',
        originalFilename: 'photo.png',
        mimeType: 'image/png',
        fileExtension: 'png',
        byteSize: 2048,
        classification: 'PUBLIC'
      });

    expect(res.status).toBe(400);
    expect(ingestUseCase.registerQuarantinedAsset).not.toHaveBeenCalled();
  });

  it('POST /assets/:assetId/validate validates asset', async () => {
    const processUseCase = createMockProcessLifecycleUseCase();
    processUseCase.validateAsset.mockResolvedValue({ id: 'ast_01', state: 'VALIDATED' });
    const app = createApp(undefined, processUseCase);

    const res = await request(app).post('/assets/ast_01/validate');

    expect(res.status).toBe(200);
    expect(processUseCase.validateAsset).toHaveBeenCalledWith({ assetId: 'ast_01' });
  });

  it('POST /assets/:assetId/validate rejects raw URL parameter', async () => {
    const processUseCase = createMockProcessLifecycleUseCase();
    const app = createApp(undefined, processUseCase);

    const res = await request(app).post('/assets/http:%2F%2Fexample.com%2Ffile/validate');

    expect(res.status).toBe(400);
    expect(processUseCase.validateAsset).not.toHaveBeenCalled();
  });

  it('POST /assets/:assetId/malware-failed marks malware scan failed', async () => {
    const processUseCase = createMockProcessLifecycleUseCase();
    processUseCase.markMalwareScanFailed.mockResolvedValue({ id: 'ast_01', state: 'MALWARE_DETECTED' });
    const app = createApp(undefined, processUseCase);

    const res = await request(app)
      .post('/assets/ast_01/malware-failed')
      .send({ reason: 'EICAR test string detected' });

    expect(res.status).toBe(200);
    expect(processUseCase.markMalwareScanFailed).toHaveBeenCalledWith({
      assetId: 'ast_01',
      reason: 'EICAR test string detected'
    });
  });

  it('POST /assets/:assetId/sanitize sanitizes asset', async () => {
    const processUseCase = createMockProcessLifecycleUseCase();
    processUseCase.sanitizeAsset.mockResolvedValue({ id: 'ast_01', state: 'SANITIZED' });
    const app = createApp(undefined, processUseCase);

    const res = await request(app)
      .post('/assets/ast_01/sanitize')
      .send({});

    expect(res.status).toBe(200);
    expect(processUseCase.sanitizeAsset).toHaveBeenCalledWith({ assetId: 'ast_01' });
  });

  it('POST /assets/:assetId/activate activates asset', async () => {
    const processUseCase = createMockProcessLifecycleUseCase();
    processUseCase.activateAsset.mockResolvedValue({ id: 'ast_01', state: 'ACTIVE' });
    const app = createApp(undefined, processUseCase);

    const res = await request(app)
      .post('/assets/ast_01/activate')
      .send({});

    expect(res.status).toBe(200);
    expect(processUseCase.activateAsset).toHaveBeenCalledWith({ assetId: 'ast_01' });
  });

  it('rejects client-controlled sanitizer metadata and clean storage locators', async () => {
    const processUseCase = createMockProcessLifecycleUseCase();
    const app = createApp(undefined, processUseCase);
    const sanitize = await request(app).post('/assets/ast_01/sanitize').send({ exifStripped: true });
    const activate = await request(app).post('/assets/ast_01/activate').send({ cleanBucketName: 'attacker-bucket' });
    expect(sanitize.status).toBe(400);
    expect(activate.status).toBe(400);
    expect(processUseCase.sanitizeAsset).not.toHaveBeenCalled();
    expect(processUseCase.activateAsset).not.toHaveBeenCalled();
  });

  it('POST /assets/:assetId/delivery-grant requests temporary secure delivery', async () => {
    const processUseCase = createMockProcessLifecycleUseCase();
    processUseCase.requestDeliveryGrant.mockResolvedValue({
      assetId: 'ast_01',
      url: 'https://cdn.example.test/object?sig=x',
      headers: {},
      expiresAt: '2099-01-01T00:00:00.000Z',
    });
    const app = createApp(undefined, processUseCase);
    const res = await request(app).post('/assets/ast_01/delivery-grant').send({ expiresInSeconds: 300 });
    expect(res.status).toBe(200);
    expect(processUseCase.requestDeliveryGrant).toHaveBeenCalledWith({ assetId: 'ast_01', expiresInSeconds: 300 });
  });

  it('POST /assets/:assetId/archive archives asset', async () => {
    const processUseCase = createMockProcessLifecycleUseCase();
    processUseCase.archiveAsset.mockResolvedValue({ id: 'ast_01', state: 'ARCHIVED' });
    const app = createApp(undefined, processUseCase);

    const res = await request(app).post('/assets/ast_01/archive');

    expect(res.status).toBe(200);
    expect(processUseCase.archiveAsset).toHaveBeenCalledWith({ assetId: 'ast_01' });
  });

  it('DELETE /assets/:assetId soft deletes asset', async () => {
    const processUseCase = createMockProcessLifecycleUseCase();
    processUseCase.softDeleteAsset.mockResolvedValue({ id: 'ast_01', state: 'SOFT_DELETED' });
    const app = createApp(undefined, processUseCase);

    const res = await request(app).delete('/assets/ast_01');

    expect(res.status).toBe(200);
    expect(processUseCase.softDeleteAsset).toHaveBeenCalledWith({ assetId: 'ast_01' });
  });

  it('POST /assets/:assetId/restore restores asset', async () => {
    const processUseCase = createMockProcessLifecycleUseCase();
    processUseCase.restoreAsset.mockResolvedValue({ id: 'ast_01', state: 'ACTIVE' });
    const app = createApp(undefined, processUseCase);

    const res = await request(app).post('/assets/ast_01/restore');

    expect(res.status).toBe(200);
    expect(processUseCase.restoreAsset).toHaveBeenCalledWith({ assetId: 'ast_01' });
  });

  it('DELETE /assets/:assetId/purge purges asset', async () => {
    const processUseCase = createMockProcessLifecycleUseCase();
    processUseCase.purgeAsset.mockResolvedValue(undefined);
    const app = createApp(undefined, processUseCase);

    const res = await request(app).delete('/assets/ast_01/purge');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(processUseCase.purgeAsset).toHaveBeenCalledWith({ assetId: 'ast_01' });
  });

  it('returns 400 when use case throws an error', async () => {
    const processUseCase = createMockProcessLifecycleUseCase();
    processUseCase.purgeAsset.mockRejectedValue(new Error('Cannot purge asset ast_01 because it is currently in use'));
    const app = createApp(undefined, processUseCase);

    const res = await request(app).delete('/assets/ast_01/purge');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Cannot purge asset ast_01 because it is currently in use' });
  });

  describe('Route Security Guards', () => {
    const activeSessionManager = {
      isSessionActive: vi.fn().mockResolvedValue(true),
      revokeAllSessions: vi.fn().mockResolvedValue(undefined),
    } as any;
    const activePrincipalAccessValidator = {
      isAuthenticationAllowed: vi.fn().mockResolvedValue(true),
    } as any;
    const mutations = [
      ['post', '/admin/assets/upload-locator'],
      ['post', '/admin/assets/register-quarantined'],
      ['post', '/admin/assets/ast_01/validate'],
      ['post', '/admin/assets/ast_01/malware-failed'],
      ['post', '/admin/assets/ast_01/sanitize'],
      ['post', '/admin/assets/ast_01/activate'],
      ['post', '/admin/assets/ast_01/delivery-grant'],
      ['post', '/admin/assets/ast_01/archive'],
      ['delete', '/admin/assets/ast_01'],
      ['post', '/admin/assets/ast_01/restore'],
      ['delete', '/admin/assets/ast_01/purge'],
    ] as const;

    it.each(mutations)('%s %s rejects unauthenticated requests before reaching the router', async (method, path) => {
      const app = express();
      app.use(express.json());
      app.use('/admin/assets', SecurityMiddlewareFactory.createAdminGuard({ mode: 'strict' }));
      app.use('/admin/assets', SecurityMiddlewareFactory.createAdminPermissionGuard('admin:assets:manage'));
      app.use('/admin/assets', AssetPlatformRouter.create({
        ingestAssetUseCase: createMockIngestUseCase() as any,
        processAssetLifecycleUseCase: createMockProcessLifecycleUseCase() as any
      }));

      const res = await (request(app) as any)[method](path).send({});
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('ADMIN_AUTH_REQUIRED');
    });

    it.each(mutations)('%s %s requires admin:assets:manage', async (method, path) => {
      const app = express();
      app.use(express.json());
      app.use('/admin/assets', SecurityMiddlewareFactory.createAdminGuard({
        mode: 'strict',
        tokenProvider: { verifyAccessToken: vi.fn().mockResolvedValue({ userId: 'owner-01', sessionId: 'session-01' }) } as any,
        sessionManager: activeSessionManager,
        principalAccessValidator: activePrincipalAccessValidator,
      }));
      app.use('/admin/assets', SecurityMiddlewareFactory.createAdminPermissionGuard('admin:assets:manage', {
        evaluatePermission: vi.fn().mockResolvedValue({ isGranted: false }),
      } as any));
      app.use('/admin/assets', AssetPlatformRouter.create({
        ingestAssetUseCase: createMockIngestUseCase() as any,
        processAssetLifecycleUseCase: createMockProcessLifecycleUseCase() as any,
      }));

      const res = await (request(app) as any)[method](path).set('Authorization', 'Bearer signed-token').send({});
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ADMIN_PERMISSION_DENIED');
    });

    it('rejects requests when unauthenticated with 401', async () => {
      const app = express();
      app.use(express.json());
      app.use('/admin/assets', SecurityMiddlewareFactory.createAdminPermissionGuard('admin:assets:manage'));
      app.use('/admin/assets', AssetPlatformRouter.create({
        ingestAssetUseCase: createMockIngestUseCase() as any,
        processAssetLifecycleUseCase: createMockProcessLifecycleUseCase() as any
      }));

      const res = await request(app).post('/admin/assets/upload-locator').send({});
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('ADMIN_AUTH_REQUIRED');
    });

    it('allows authenticated requests through admin guard and permission guard', async () => {
      const ingestUseCase = createMockIngestUseCase();
      ingestUseCase.requestUploadLocator.mockResolvedValue({ assetId: 'ast_01' });

      const mockEvaluator = {
        evaluatePermission: vi.fn().mockResolvedValue({ isGranted: true, reason: 'Granted' }),
      } as any;

      const app = express();
      app.use(express.json());
      app.use('/admin/assets', SecurityMiddlewareFactory.createAdminGuard({
        mode: 'strict',
        tokenProvider: {
          verifyAccessToken: vi.fn().mockResolvedValue({ userId: 'owner-01', sessionId: 'session-01' }),
        } as any,
        sessionManager: activeSessionManager,
        principalAccessValidator: activePrincipalAccessValidator,
      }));
      app.use('/admin/assets', SecurityMiddlewareFactory.createAdminPermissionGuard('admin:assets:manage', mockEvaluator));
      app.use('/admin/assets', AssetPlatformRouter.create({
        ingestAssetUseCase: ingestUseCase as any,
        processAssetLifecycleUseCase: createMockProcessLifecycleUseCase() as any
      }));

      const res = await request(app)
        .post('/admin/assets/upload-locator')
        .set('Authorization', 'Bearer signed-access-token')
        .send({
          assetId: 'ast_01',
          assetReference: 'ref_01',
          ownerId: 'owner_01',
          ownerType: 'STUDENT',
          originalFilename: 'doc.pdf',
          mimeType: 'application/pdf',
          fileExtension: 'pdf',
          byteSize: 1024,
          classification: 'INTERNAL'
        });

      expect(res.status).toBe(201);
      expect(res.headers['x-admin-auth-mode']).toBe('strict');
      expect(res.headers['x-admin-required-permission']).toBe('admin:assets:manage');
    });
  });
});
