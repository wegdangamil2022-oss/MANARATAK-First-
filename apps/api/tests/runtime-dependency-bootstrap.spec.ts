import { describe, expect, it, vi } from 'vitest';
import { createApiApp } from '../src/app';

describe('API runtime dependency bootstrap', () => {
  it('refuses connected runtime startup when canonical asset reference guards are absent', async () => {
    const query = vi.fn(async () => []);
    await expect(createApiApp({ resetCache: true, connectExternalServices: true,
      databaseClient: { $connect: vi.fn(async () => {}), $disconnect: vi.fn(async () => {}), $queryRaw: query },
      env: { NODE_ENV: 'development' },
    })).rejects.toThrow('ASSET_REFERENCE_INTEGRITY_NOT_INSTALLED');
    expect(query).toHaveBeenCalled();
  });
  it('allows normal source-only development to start without DATABASE_URL', async () => {
    await expect(createApiApp({
      resetCache: true,
      connectExternalServices: false,
      databaseClient: { $queryRaw: vi.fn().mockRejectedValue(new Error('database intentionally unavailable in source-only test')) },
      env: { NODE_ENV: 'development' },
    })).resolves.toBeDefined();
  });

  it('stops development-like runtime closure when DATABASE_URL is absent', async () => {
    await expect(createApiApp({ resetCache: true, env: { NODE_ENV: 'development', RUNTIME_CLOSURE_MODE: 'true' } }))
      .rejects.toThrow('DATABASE_URL is required for this runtime mode');
  });
});
