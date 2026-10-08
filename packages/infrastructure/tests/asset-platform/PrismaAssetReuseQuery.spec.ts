import { describe, expect, it, vi } from 'vitest';
import { PrismaAssetRecordRepository } from '../../src/asset-platform/PrismaAssetRecordRepository';

describe('EAP safe reuse query', () => {
  it('enforces state, classification, CLEAN and evidence at database level', async () => {
    const findMany = vi.fn(async (_query: unknown) => []);
    const repo = new PrismaAssetRecordRepository({ assetRecord: { findMany } } as any);
    await repo.queryAdmin({ reuseOnly: true, q: 'poster', limit: 10, securityClassification: 'CONFIDENTIAL' });
    const where = (findMany.mock.calls[0][0] as any).where;
    expect(where.lifecycleState).toBe('ACTIVE');
    expect(where.securityClassification.in).toEqual(['PUBLIC', 'INTERNAL']);
    expect(where.cleanStorageLocator).toEqual({ not: null });
    expect(where.AND).toEqual(expect.arrayContaining([
      { malwareScanStatus: { path: ['status'], equals: 'PASSED' } },
      { malwareScanStatus: { path: ['uploadVerification', 'signatureVerified'], equals: true } },
    ]));
    expect(where.AND.some((part: any) => part.OR?.some((entry: any) => entry.reference?.contains === 'poster')))
      .toBe(true);
  });
});
