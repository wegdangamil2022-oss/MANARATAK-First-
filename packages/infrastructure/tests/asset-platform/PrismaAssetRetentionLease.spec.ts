import { describe, expect, it, vi } from 'vitest';
import { RetentionDisposition } from '@manaratak/domain';
import { PrismaAssetRetentionGateway } from '../../src/retention/PrismaAssetRetentionGateway';

describe('EAP retention worker lease ownership', () => {
  it('passes its DB-acquired token to irreversible purge and guards against new legal holds', async () => {
    const updateMany = vi.fn(async (_args: unknown) => ({ count: 1 }));
    const purgeAsset = vi.fn(async (_dto: unknown) => undefined);
    const softDeleteAsset = vi.fn(async () => undefined);
    const gateway = new PrismaAssetRetentionGateway(
      { assetRecord: { updateMany } } as any,
      { purgeAsset, softDeleteAsset } as any,
    );
    const at = new Date('2026-10-09T00:00:00.000Z');
    const outcome = await gateway.applyDecision({
      recordId: 'asset-1', lifecycleState: 'DELETED',
    } as any, {
      disposition: RetentionDisposition.PURGE, decidedAt: at,
    } as any);
    expect(outcome).toBe('APPLIED');
    expect(softDeleteAsset).not.toHaveBeenCalled();
    const claim = (updateMany.mock.calls[0][0] as any);
    expect(claim.where.retentionExpiresAt).toEqual({ lte: at });
    expect(claim.where.AND).toEqual(expect.arrayContaining([
      { OR: [{ legalHoldUntil: null }, { legalHoldUntil: { lte: at } }] },
    ]));
    expect(purgeAsset).toHaveBeenCalledWith({
      assetId: 'asset-1',
      retentionClaimToken: claim.data.retentionClaimToken,
    });
    expect(claim.data.retentionClaimToken).toMatch(/^[a-f0-9-]{36}$/);
  });

  it('does not purge when a concurrent worker already owns the lease', async () => {
    const updateMany = vi.fn(async (_args: unknown) => ({ count: 0 }));
    const purgeAsset = vi.fn();
    const gateway = new PrismaAssetRetentionGateway(
      { assetRecord: { updateMany } } as any,
      { purgeAsset } as any,
    );
    await expect(gateway.applyDecision({ recordId: 'asset-2', lifecycleState: 'DELETED' } as any,
      { disposition: RetentionDisposition.PURGE, decidedAt: new Date() } as any))
      .resolves.toBe('SKIPPED');
    expect(purgeAsset).not.toHaveBeenCalled();
  });
});
