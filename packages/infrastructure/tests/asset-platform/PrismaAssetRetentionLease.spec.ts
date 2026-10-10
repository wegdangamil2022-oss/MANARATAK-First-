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
  it('includes PURGED tombstones when selecting outstanding retention work', async () => {
    const findMany = vi.fn(async () => [{
      id: 'asset-purged', retentionExpiresAt: new Date('2026-10-08T00:00:00Z'),
      legalHoldUntil: null, retentionCategory: 'SOFT_DELETED', lifecycleState: 'PURGED',
    }]);
    const gateway = new PrismaAssetRetentionGateway({
      assetRecord: { findMany },
    } as any, {} as any);
    const candidates = await gateway.listDue(new Date('2026-10-09T00:00:00Z'), 20);
    expect(candidates[0].lifecycleState).toBe('PURGED');
    expect((findMany.mock.calls[0][0] as any).where.lifecycleState).toBeUndefined();
  });

  it('retries PURGED provider cleanup under its lease without calling softDelete again', async () => {
    const updateMany = vi.fn(async () => ({ count: 1 }));
    const purgeAsset = vi.fn(async () => undefined);
    const softDeleteAsset = vi.fn(async () => undefined);
    const gateway = new PrismaAssetRetentionGateway({
      assetRecord: { updateMany },
    } as any, { purgeAsset, softDeleteAsset } as any);
    const outcome = await gateway.applyDecision({
      recordId: 'asset-purged', lifecycleState: 'PURGED',
    } as any, {
      disposition: RetentionDisposition.PURGE,
      decidedAt: new Date('2026-10-09T00:00:00Z'),
    } as any);
    expect(outcome).toBe('APPLIED');
    expect(softDeleteAsset).not.toHaveBeenCalled();
    expect(purgeAsset).toHaveBeenCalledWith({
      assetId: 'asset-purged',
      retentionClaimToken: (updateMany.mock.calls[0][0] as any).data.retentionClaimToken,
    });
  });

});
