import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  AssetId, AssetRecord, AssetLifecycleState, AssetSecurityClassification,
  IAuditRecordRepository,
} from '@manaratak/domain';
import { ProcessAssetLifecycleUseCase } from '@manaratak/application';
import { AuditHelper } from '../../audit/AuditHelper.js';

type ReuseAsset = Pick<AssetRecord, 'id' | 'state' | 'classification' | 'metadata' | 'reference' | 'assertCanDeliver'>;

export interface AssetReuseRouterCradle {
  assetRecordRepository: {
    queryAdmin(input: {
      reuseOnly: true; q?: string; mimeTypePrefix?: string; limit: number; cursor?: string;
    }): Promise<{ items: any[]; nextCursor: string | null; hasMore: boolean }>;
    findById(id: AssetId): Promise<ReuseAsset | null>;
  };
  processAssetLifecycleUseCase: Pick<ProcessAssetLifecycleUseCase, 'requestDeliveryGrant'>;
  auditRecordRepo?: IAuditRecordRepository;
}

const allowedClassification = new Set<AssetSecurityClassification>([
  AssetSecurityClassification.PUBLIC, AssetSecurityClassification.INTERNAL,
]);

export function isAssetReusable(asset: ReuseAsset): boolean {
  if (asset.state !== AssetLifecycleState.ACTIVE || !allowedClassification.has(asset.classification)) return false;
  try {
    asset.assertCanDeliver();
    return true;
  } catch {
    return false;
  }
}

export class AssetReuseRouter {
  static create(cradle: AssetReuseRouterCradle): Router {
    const router = Router();
    const wrap = (fn: (req: Request, res: Response) => Promise<void>) =>
      (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res)).catch(next);
      };
    const listSchema = z.object({
      q: z.string().trim().max(160).optional(),
      mimeTypePrefix: z.string().trim().min(1).max(120).optional(),
      limit: z.coerce.number().int().min(1).max(50).default(30),
      cursor: z.string().trim().min(1).max(2048).optional(),
    }).strict();
    const auditSchema = z.object({
      purpose: z.string().trim().min(2).max(160),
      context: z.string().trim().max(240).optional(),
    }).strict();

    const requireReusable = async (assetId: string) => {
      const asset = await cradle.assetRecordRepository.findById(new AssetId(assetId));
      if (!asset || !isAssetReusable(asset)) return null;
      return asset;
    };

    // Only public/internal verified assets. Never expose locators, checksums, owners or private metadata.
    router.get('/', wrap(async (req, res) => {
      const query = listSchema.parse(req.query);
      const page = await cradle.assetRecordRepository.queryAdmin({ ...query, reuseOnly: true });
      const items = page.items.map((item) => ({
        id: item.id,
        reference: item.reference,
        lifecycleState: item.lifecycleState,
        metadata: {
          originalFilename: item.metadata?.originalFilename,
          mimeType: item.metadata?.mimeType,
          byteSize: item.metadata?.byteSize,
        },
      }));
      res.status(200).json({ items, nextCursor: page.nextCursor, hasMore: page.hasMore });
    }));

    router.get('/:assetId', wrap(async (req, res) => {
      const asset = await requireReusable(req.params.assetId);
      if (!asset) { res.status(404).json({ error: 'ASSET_REUSE_NOT_FOUND' }); return; }
      res.json({
        id: asset.id.value,
        reference: asset.reference.value,
        lifecycleState: asset.state,
        metadata: {
          originalFilename: asset.metadata.originalFilename,
          mimeType: asset.metadata.mimeType,
          byteSize: asset.metadata.byteSize,
        },
      });
    }));

    router.post('/:assetId/selection-audit', wrap(async (req, res) => {
      const { purpose, context } = auditSchema.parse(req.body ?? {});
      const asset = await requireReusable(req.params.assetId);
      if (!asset) { res.status(404).json({ error: 'ASSET_REUSE_NOT_FOUND' }); return; }
      await AuditHelper.recordMutation(cradle.auditRecordRepo, req, {
        action: 'SELECT_ASSET_REFERENCE', category: 'ASSET_PLATFORM',
        targetType: 'ASSET', targetId: asset.id.value, result: 'SUCCESS',
        metadata: { purpose, context: context ?? null },
      }, { reliability: 'REQUIRED', principal: 'REQUIRED' });
      res.status(204).send();
    }));

    router.post('/:assetId/delivery-grant', wrap(async (req, res) => {
      const { expiresInSeconds = 300 } = z.object({ expiresInSeconds: z.number().int().min(1).max(300).optional() }).strict().parse(req.body ?? {});
      const asset = await requireReusable(req.params.assetId);
      if (!asset) { res.status(404).json({ error: 'ASSET_REUSE_NOT_FOUND' }); return; }

      const result = await cradle.processAssetLifecycleUseCase.requestDeliveryGrant({
        assetId: asset.id.value, expiresInSeconds,
      });
      await AuditHelper.recordMutation(cradle.auditRecordRepo, req, {
        action: 'REQUEST_ASSET_DELIVERY_GRANT', category: 'ASSET_PLATFORM',
        targetType: 'ASSET', targetId: asset.id.value, result: 'SUCCESS',
        metadata: { expiresInSeconds },
      }, { reliability: 'REQUIRED', principal: 'REQUIRED' });
      res.status(200).json(result);
    }));

    router.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
      if (err instanceof z.ZodError || (err instanceof Error && err.message === 'ASSET_CURSOR_INVALID')) {
        res.status(400).json({ error: 'ASSET_REUSE_INVALID_REQUEST' });
        return;
      }
      res.status(503).json({ error: 'ASSET_REUSE_UNAVAILABLE' });
    });
    return router;
  }
}
