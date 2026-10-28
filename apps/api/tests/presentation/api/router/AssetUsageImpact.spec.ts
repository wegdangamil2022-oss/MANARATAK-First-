import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { AssetPlatformRouter } from '../../../../src/presentation/api/router/AssetPlatformRouter';

function fixture({ registry = true, found = true, ownerType = 'COURSE' } = {}) {
  const findUsages = vi.fn(async () => [{ consumer: 'COURSE', field: 'thumbnailAssetId' }]);
  const findById = vi.fn(async () => found ? { id: { value: 'asset-1' }, owner: { ownerType }, classification: 'INTERNAL' } : null);
  const app = express();
  app.use(express.json());
  app.use('/assets', AssetPlatformRouter.create({
    ingestAssetUseCase: {} as any,
    processAssetLifecycleUseCase: {} as any,
    assetRecordRepository: { findById, queryAdmin: vi.fn() } as any,
    ...(registry ? { assetUsageRegistryGateway: { findUsages } as any } : {}),
  }));
  return { app, findUsages, findById };
}

describe('EAP lifecycle impact readout', () => {
  it('does not disclose private owner usage even when the usage registry is unavailable', async () => {
    for (const registry of [true, false]) {
      const f = fixture({ registry, ownerType: 'STUDENT_SUPPORT' });
      expect((await request(f.app).get('/assets/asset-1/usages')).status).toBe(404);
      expect(f.findUsages).not.toHaveBeenCalled();
    }
  });
  it('shows canonical reference usage and prevents fictional in-use=false', async () => {
    const f = fixture();
    const response = await request(f.app).get('/assets/asset-1/usages');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      assetId: 'asset-1', inUse: true,
      usages: [{ consumer: 'COURSE', field: 'thumbnailAssetId' }],
    });
    expect(f.findUsages).toHaveBeenCalled();
  });

  it('fails closed when the usage registry is not configured', async () => {
    const f = fixture({ registry: false });
    const response = await request(f.app).get('/assets/asset-1/usages');
    expect(response.status).toBe(503);
    expect(response.body.error).toBe('ASSET_USAGE_REGISTRY_UNAVAILABLE');
  });

  it('does not leak usage metadata for unknown assets', async () => {
    const f = fixture({ found: false });
    const response = await request(f.app).get('/assets/unknown/usages');
    expect(response.status).toBe(404);
    expect(f.findUsages).not.toHaveBeenCalled();
  });
});
