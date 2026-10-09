import { describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { AssetPlatformRouter } from '../../../../src/presentation/api/router/AssetPlatformRouter';

function fixture(queryError?: Error) {
  const queryAdmin = vi.fn(async (_query: unknown) => {
    if (queryError) throw queryError;
    return { items: [], nextCursor: null, hasMore: false };
  });
  const app = express();
  app.use(express.json());
  app.use('/admin/assets', AssetPlatformRouter.create({
    ingestAssetUseCase: {} as any,
    processAssetLifecycleUseCase: {} as any,
    assetRecordRepository: { queryAdmin, findById: vi.fn(async () => null) },
  }));
  return { app, queryAdmin };
}

describe('EAP API boundary: query validation and safe Problem Details', () => {
  it('rejects inverted createdFrom/createdTo range before repository work', async () => {
    const f = fixture();
    const response = await request(f.app).get(
      '/admin/assets?createdFrom=2026-10-07T00%3A00%3A00.000Z&createdTo=2026-10-06T00%3A00%3A00.000Z',
    );
    expect(response.status).toBe(400);
    expect(response.headers['content-type']).toContain('application/problem+json');
    expect(response.body.code).toBe('ASSET_REQUEST_INVALID');
    expect(f.queryAdmin).not.toHaveBeenCalled();
  });

  it.each(['ASSET_TEMPORARY_EXPIRY_REQUIRED', 'ASSET_RETENTION_EXPIRY_INVALID',
    'ASSET_RETENTION_EXPIRY_NOT_FUTURE', 'ASSET_DECLARED_EXTENSION_MIME_MISMATCH'])('maps known ingress metadata failure %s to sanitized 422', async code => {
    const f = fixture(new Error(code));
    const response = await request(f.app).get('/admin/assets');
    expect(response.status).toBe(422);
    expect(response.body.code).toBe('ASSET_METADATA_INVALID');
  });

  it.each(['ASSET_QUARANTINE_CONTENT_CHANGED_BEFORE_ACTIVATION', 'ASSET_SANITIZED_CONTENT_CHANGED_DURING_SCAN',
    'ASSET_DELIVERY_TRUST_EVIDENCE_REQUIRED', 'ASSET_REFERENCE_IN_USE', 'ASSET_REFERENCE_ISOLATION_UNSUPPORTED', 'ASSET_RESTORE_RECOVERY_PENDING', 'ASSET_RESTORE_OPERATION_INVALID'])('maps security conflict %s to safe 409', async code => {
    const f = fixture(new Error(code));
    const response = await request(f.app).get('/admin/assets');
    expect(response.status).toBe(409);
    expect(response.body.code).toBe('ASSET_STATE_CONFLICT');
  });

  it('rejects invalid cursor with safe 400 rather than internal error', async () => {
    const f = fixture(new Error('ASSET_CURSOR_INVALID'));
    const response = await request(f.app).get('/admin/assets?cursor=invalid');
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('ASSET_CURSOR_INVALID');
  });

  it('fails as 503 when secure upload verification is not configured', async () => {
    const f = fixture(new Error('ASSET_UPLOAD_VERIFICATION_NOT_CONFIGURED'));
    const response = await request(f.app).get('/admin/assets');
    expect(response.status).toBe(503);
    expect(response.body.code).toBe('ASSET_UPLOAD_VERIFICATION_NOT_CONFIGURED');
  });

  it('does not expose database/provider internal exception strings', async () => {
    const f = fixture(new Error('password=hidden123 SELECT * FROM production users'));
    const response = await request(f.app).get('/admin/assets');
    expect(response.status).toBe(500);
    expect(response.body.code).toBe('ASSET_INTERNAL_ERROR');
    expect(JSON.stringify(response.body)).not.toContain('hidden123');
    expect(JSON.stringify(response.body)).not.toContain('production users');
  });
  it('returns a safe 409 when restored content does not match the trusted checksum', async () => {
    const f = fixture(new Error('ASSET_RESTORE_CONTENT_VERIFICATION_FAILED'));
    const response = await request(f.app).get('/admin/assets');
    expect(response.status).toBe(409);
    expect(response.body.code).toBe('ASSET_STATE_CONFLICT');
  });

  it('returns 503 when restored-byte verification capability is not configured', async () => {
    const f = fixture(new Error('ASSET_RESTORE_VERIFICATION_NOT_CONFIGURED'));
    const response = await request(f.app).get('/admin/assets');
    expect(response.status).toBe(503);
    expect(response.body.code).toBe('ASSET_RESTORE_VERIFICATION_NOT_CONFIGURED');
  });

  it('returns safe 503 requiring repair when post-restore compensation also fails', async () => {
    const f = fixture(new Error('ASSET_RESTORE_COMPENSATION_FAILED'));
    const response = await request(f.app).get('/admin/assets');
    expect(response.status).toBe(503);
    expect(response.body.code).toBe('ASSET_RESTORE_COMPENSATION_FAILED');
    expect(JSON.stringify(response.body)).not.toContain('provider locator');
  });

  it('returns sanitized conflicts for restore lease contention, not a generic 500', async () => {
    for (const errorCode of [
      'ASSET_RESTORE_LEASE_CONFLICT',
      'ASSET_RESTORE_LEASE_REQUIRED',
      'ASSET_RESTORE_LEASE_INVALID_STATE',
    ]) {
      const f = fixture(new Error(errorCode));
      const response = await request(f.app).get('/admin/assets');
      expect(response.status).toBe(409);
      expect(response.body.code).toBe('ASSET_STATE_CONFLICT');
    }
  });

  it('fails closed with sanitized 503 if restore serialization or lease release is unavailable', async () => {
    for (const errorCode of [
      'ASSET_RESTORE_LEASE_NOT_CONFIGURED',
      'ASSET_RESTORE_LEASE_RELEASE_FAILED',
    ]) {
      const f = fixture(new Error(errorCode));
      const response = await request(f.app).get('/admin/assets');
      expect(response.status).toBe(503);
      expect(response.body.code).toBe(errorCode);
    }
  });

  it('reports restore recovery requirement without exposing internal lease/provider failures', async () => {
    const f = fixture(new Error('ASSET_RESTORE_RECOVERY_REQUIRED', { cause: new Error('secret-provider-path') }));
    const response = await request(f.app).get('/admin/assets');
    expect(response.status).toBe(503);
    expect(response.body.code).toBe('ASSET_RESTORE_RECOVERY_REQUIRED');
    expect(JSON.stringify(response.body)).not.toContain('secret-provider-path');
  });

});
