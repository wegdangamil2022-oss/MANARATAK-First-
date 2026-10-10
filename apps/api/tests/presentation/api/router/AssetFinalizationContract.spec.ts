import { describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { AssetPlatformRouter } from '../../../../src/presentation/api/router/AssetPlatformRouter';

function fixture(failure?: Error) {
  const finalizeUploadedAsset = vi.fn(async (input: { assetId: string }) => {
    if (failure) throw failure;
    return { id: input.assetId, state: 'QUARANTINED', checksum: { algorithm: 'sha256', hash: 'a'.repeat(64) } };
  });
  const validateAsset = vi.fn(async () => {
    throw new Error('ASSET_UPLOAD_FINALIZATION_REQUIRED');
  });
  const app = express();
  app.use(express.json());
  app.use('/admin/assets', AssetPlatformRouter.create({
    ingestAssetUseCase: {} as any,
    processAssetLifecycleUseCase: { finalizeUploadedAsset, validateAsset } as any,
  }));
  return { app, finalizeUploadedAsset, validateAsset };
}

describe('EAP upload finalization contract', () => {
  it('confirms an uploaded object through the dedicated use case using only the asset handle', async () => {
    const f = fixture();
    const response = await request(f.app)
      .post('/admin/assets/asset-uploaded/finalize-upload').send({});
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: 'asset-uploaded', state: 'QUARANTINED' });
    expect(f.finalizeUploadedAsset).toHaveBeenCalledExactlyOnceWith({ assetId: 'asset-uploaded' });
  });

  it('rejects user-supplied verification evidence or unsupported request fields', async () => {
    const f = fixture();
    const response = await request(f.app)
      .post('/admin/assets/asset-1/finalize-upload')
      .send({ checksumSha256: 'f'.repeat(64), signatureVerified: true });
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('ASSET_REQUEST_INVALID');
    expect(f.finalizeUploadedAsset).not.toHaveBeenCalled();
  });

  it('exposes a safe 409 for validation attempted without persisted finalization', async () => {
    const f = fixture();
    const response = await request(f.app).post('/admin/assets/asset-1/validate').send({});
    expect(response.status).toBe(409);
    expect(response.body.code).toBe('ASSET_STATE_CONFLICT');
  });

  it('rejects mutated bytes after finalization with a safe conflict response', async () => {
    const f = fixture(new Error('ASSET_UPLOAD_CHANGED_AFTER_FINALIZATION'));
    const response = await request(f.app)
      .post('/admin/assets/asset-1/finalize-upload').send({});
    expect(response.status).toBe(409);
    expect(response.body.code).toBe('ASSET_STATE_CONFLICT');
  });

  it('returns gateway failure without exposing provider internal details', async () => {
    const f = fixture(new Error('ASSET_PROVIDER_UPLOAD_VERIFICATION_FAILED'));
    const response = await request(f.app)
      .post('/admin/assets/asset-1/finalize-upload').send({});
    expect(response.status).toBe(502);
    expect(response.body.code).toBe('ASSET_PROVIDER_ERROR');
  });
});
