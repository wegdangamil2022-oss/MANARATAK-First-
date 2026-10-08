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
});
