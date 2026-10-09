import { expect, it, vi } from 'vitest';
import { RetentionDisposition } from '@manaratak/domain';
import { PrismaAssetRetentionGateway } from '../../src/retention/PrismaAssetRetentionGateway';
it('retries an ARCHIVED asset after provider failure', async () => {
  const updateMany = vi.fn(async () => ({ count: 1 }));
  const archiveAsset = vi.fn().mockRejectedValueOnce(new Error('PROVIDER_FAILURE')).mockResolvedValue(undefined);
  const handler = new PrismaAssetRetentionGateway({ assetRecord: { updateMany } } as any, { archiveAsset } as any);
  const row = { recordId: 'asset-retry', lifecycleState: 'ARCHIVED' } as any;
  const decision = { disposition: RetentionDisposition.ARCHIVE, decidedAt: new Date() } as any;
  await expect(handler.applyDecision(row, decision)).rejects.toThrow('PROVIDER_FAILURE');
  await expect(handler.applyDecision(row, decision)).resolves.toBe('APPLIED');
  expect(archiveAsset).toHaveBeenCalledTimes(2);
});