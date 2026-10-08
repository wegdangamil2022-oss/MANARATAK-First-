import { describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import {
  AssetId, AssetLifecycleState, AssetSecurityClassification, AssetStorageZone,
} from '@manaratak/domain';
import { AssetReuseRouter } from '../../../../src/presentation/api/router/AssetReuseRouter';
import { SecurityMiddlewareFactory } from '../../../../src/presentation/security/SecurityMiddlewareFactory';

function asset(overrides: Record<string, unknown> = {}) {
  return {
    id: new AssetId('asset-1'),
    state: AssetLifecycleState.ACTIVE,
    classification: AssetSecurityClassification.PUBLIC,
    locator: { storageZone: AssetStorageZone.CLEAN },
    reference: { value: 'ref-1' },
    checksum: { hash: 'b'.repeat(64) },
    malwareScan: { status: 'PASSED', locator: 'quarantine://bucket/upload-1' },
    uploadVerification: {
      signatureVerified: true,
      locator: 'quarantine://bucket/upload-1',
      checksumSha256: 'b'.repeat(64),
    },
    metadata: { originalFilename: 'public.pdf', mimeType: 'application/pdf', byteSize: 100 },
    ...overrides,
  };
}

function fixture({
  granted = true,
  record = asset(),
  auditFailure = false,
}: { granted?: boolean; record?: ReturnType<typeof asset> | null; auditFailure?: boolean } = {}) {
  const queryAdmin = vi.fn(async (_query: unknown) => ({
    items: [{
      id: 'asset-1', reference: 'ref-1', lifecycleState: 'ACTIVE',
      ownerId: 'private-actor', cleanStorageLocator: 'secret://location',
      metadata: {
        originalFilename: 'public.pdf', mimeType: 'application/pdf', byteSize: 100,
        extraMetadata: { providerToken: 'secret-token' },
      },
    }],
    nextCursor: null, hasMore: false,
  }));
  const findById = vi.fn(async (_id: AssetId) => record);
  const delivery = vi.fn(async () => ({
    assetId: 'asset-1', url: 'https://cdn.example.test/protected',
    headers: {}, expiresAt: new Date(Date.now() + 300_000).toISOString(),
  }));
  const audit = { save: vi.fn(async (_entry: unknown) => {
    if (auditFailure) throw new Error('TEST_AUDIT_STORAGE_UNAVAILABLE');
  }) };
  const evaluator = { evaluatePermission: vi.fn(async () => ({ isGranted: granted })) };
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.authUserId = 'domain-editor-1'; next(); });
  app.use('/admin/asset-reuse',
    SecurityMiddlewareFactory.createAdminPermissionGuard('admin:assets:reuse', evaluator as any),
    AssetReuseRouter.create({
      assetRecordRepository: { queryAdmin, findById } as any,
      processAssetLifecycleUseCase: { requestDeliveryGrant: delivery } as any,
      auditRecordRepo: audit as any,
    }),
  );
  return { app, queryAdmin, findById, delivery, audit, evaluator };
}

describe('Section 03 EAP least-privilege reuse boundary', () => {
  it('denies users without reuse permission even for read-only list', async () => {
    const f = fixture({ granted: false });
    const response = await request(f.app).get('/admin/asset-reuse');
    expect(response.status).toBe(403);
    expect(f.queryAdmin).not.toHaveBeenCalled();
    expect(f.evaluator.evaluatePermission).toHaveBeenCalledWith(
      'domain-editor-1', 'admin:assets:reuse', expect.any(Object),
    );
  });

  it('queries only server-owned safe cohort and removes locators/owner/secrets', async () => {
    const f = fixture();
    const response = await request(f.app).get('/admin/asset-reuse?q=public&limit=15');
    expect(response.status).toBe(200);
    expect(f.queryAdmin).toHaveBeenCalledWith({
      q: 'public', limit: 15, reuseOnly: true,
    });
    expect(response.body.items[0]).toEqual({
      id: 'asset-1', reference: 'ref-1', lifecycleState: 'ACTIVE',
      metadata: { originalFilename: 'public.pdf', mimeType: 'application/pdf', byteSize: 100 },
    });
    expect(JSON.stringify(response.body)).not.toContain('private-actor');
    expect(JSON.stringify(response.body)).not.toContain('secret-token');
    expect(JSON.stringify(response.body)).not.toContain('secret://');
  });

  it('rejects client attempts to override the server-side security scope', async () => {
    const f = fixture();
    expect((await request(f.app).get('/admin/asset-reuse?reuseOnly=false')).status).toBe(400);
    expect((await request(f.app).get('/admin/asset-reuse?lifecycleState=DELETED')).status).toBe(400);
    expect(f.queryAdmin).not.toHaveBeenCalled();
  });

  it('does not expose destructive lifecycle endpoints under reuse permission', async () => {
    const f = fixture();
    expect((await request(f.app).delete('/admin/asset-reuse/asset-1/purge')).status).toBe(404);
    expect((await request(f.app).post('/admin/asset-reuse/asset-1/archive')).status).toBe(404);
  });

  it('rejects CONFIDENTIAL asset selection without auditing a successful selection', async () => {
    const f = fixture({ record: asset({ classification: AssetSecurityClassification.CONFIDENTIAL }) });
    const response = await request(f.app).post('/admin/asset-reuse/asset-1/selection-audit').send({
      purpose: 'COURSE_THUMBNAIL',
    });
    expect(response.status).toBe(404);
    expect(f.audit.save).not.toHaveBeenCalled();
  });

  it('fails closed if the required selection audit cannot be persisted', async () => {
    const f = fixture({ auditFailure: true });
    const response = await request(f.app).post('/admin/asset-reuse/asset-1/selection-audit').send({
      purpose: 'COURSE_THUMBNAIL',
    });
    expect(response.status).toBe(503);
    expect(f.audit.save).toHaveBeenCalledTimes(1);
  });

  it('allows audited selection and a short-lived preview for approved reusable assets', async () => {
    const f = fixture();
    const selected = await request(f.app).post('/admin/asset-reuse/asset-1/selection-audit').send({
      purpose: 'COURSE_THUMBNAIL',
    });
    expect(selected.status).toBe(204);
    expect(f.audit.save).toHaveBeenCalled();
    const preview = await request(f.app).post('/admin/asset-reuse/asset-1/delivery-grant').send({
      expiresInSeconds: 120,
    });
    expect(preview.status).toBe(200);
    expect(f.delivery).toHaveBeenCalledWith({ assetId: 'asset-1', expiresInSeconds: 120 });
    expect((await request(f.app).post('/admin/asset-reuse/asset-1/delivery-grant').send({
      expiresInSeconds: 3600,
    })).status).toBe(400);
  });
});
