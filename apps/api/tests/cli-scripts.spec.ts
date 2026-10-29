import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { container } from '../src/infrastructure/di/container';

describe('CLI Scripts', () => {
  beforeEach(() => {
    vi.stubEnv('DATABASE_URL', '');
    vi.stubEnv('DIRECT_URL', '');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    process.exitCode = undefined;
  });
  it('runs final-validation-all successfully', async () => {
    const mockPrisma = {
      majorLevelProfile: { findMany: vi.fn().mockResolvedValue([]) },
      majorCatalogSection: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
      $disconnect: vi.fn().mockResolvedValue(undefined)
    };

    const origResolve = container.resolve.bind(container);
    vi.spyOn(container, 'resolve').mockImplementation((name, resolveOptions) => {
      if (name === 'prisma') return mockPrisma;
      return origResolve(name, resolveOptions);
    });

    process.exitCode = undefined;
    await import('../../../scripts/verify/final-validation-all');
    await new Promise(r => setTimeout(r, 1000));
    expect(process.exitCode).toBe(1);
  });
  
  it('blocks import-masters-range when no development database is configured', async () => {
    process.exitCode = undefined;
    await import('../../../scripts/import/import-masters-range');
    await new Promise(r => setTimeout(r, 1000));
    expect(process.exitCode).toBe(1);
  });
  
  it('blocks verify_import when no development database is configured', async () => {
    process.exitCode = undefined;
    await import('../../../scripts/verify_import');
    await new Promise(r => setTimeout(r, 1000));
    expect(process.exitCode).toBe(1);
  });
});
