import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  AssetSecurityClassification,
  AssetRetentionCategory,
  IAuditRecordRepository
} from '@manaratak/domain';
import {
  IngestAssetUseCase,
  ProcessAssetLifecycleUseCase,
  RequestAssetUploadLocatorDto,
  RegisterQuarantinedAssetDto
} from '@manaratak/application';
import { AuditHelper } from '../../audit/AuditHelper.js';

export interface AssetPlatformRouterCradle {
  ingestAssetUseCase: IngestAssetUseCase;
  processAssetLifecycleUseCase: ProcessAssetLifecycleUseCase;
  auditRecordRepo?: IAuditRecordRepository;
  assetRecordRepository?: { queryAdmin(input: any): Promise<{ items: any[]; nextCursor: string | null; hasMore: boolean }>; findById(id: any): Promise<any> };
}

export class AssetPlatformRouter {
  public static create(cradle: AssetPlatformRouterCradle): Router {
    const router = Router();
    const { ingestAssetUseCase, processAssetLifecycleUseCase, auditRecordRepo, assetRecordRepository } = cradle;

    const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
      (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
      };

    const urlCheck = (val: string, ctx: z.RefinementCtx, fieldName: string) => {
      if (/^https?:\/\//i.test(val.trim())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${fieldName} must be a Phase 05 EAP handle, not a raw URL`
        });
      }
    };

    const requestUploadLocatorSchema = z.object({
      assetId: z.string().min(1, 'assetId is required').superRefine((val, ctx) => urlCheck(val, ctx, 'assetId')),
      assetReference: z.string().min(1, 'assetReference is required').superRefine((val, ctx) => urlCheck(val, ctx, 'assetReference')),
      ownerId: z.string().min(1, 'ownerId is required'),
      ownerType: z.string().min(1, 'ownerType is required'),
      originalFilename: z.string().min(1, 'originalFilename is required'),
      mimeType: z.string().min(1, 'mimeType is required'),
      fileExtension: z.string().min(1, 'fileExtension is required'),
      byteSize: z.number().positive('byteSize must be greater than 0'),
      classification: z.nativeEnum(AssetSecurityClassification),
      retentionCategory: z.nativeEnum(AssetRetentionCategory).optional(),
      expiresAt: z.string().optional()
    }).strict();

    const registerQuarantinedSchema = z.object({
      assetId: z.string().min(1, 'assetId is required').superRefine((val, ctx) => urlCheck(val, ctx, 'assetId')),
      assetReference: z.string().min(1, 'assetReference is required').superRefine((val, ctx) => urlCheck(val, ctx, 'assetReference')),
      ownerId: z.string().min(1, 'ownerId is required'),
      ownerType: z.string().min(1, 'ownerType is required'),
      originalFilename: z.string().min(1, 'originalFilename is required'),
      mimeType: z.string().min(1, 'mimeType is required'),
      fileExtension: z.string().min(1, 'fileExtension is required'),
      byteSize: z.number().positive('byteSize must be greater than 0'),
      classification: z.nativeEnum(AssetSecurityClassification),
      retentionCategory: z.nativeEnum(AssetRetentionCategory).optional(),
      expiresAt: z.string().optional()
    }).strict();


    const emptyMutationBodySchema = z.object({}).strict();
    const malwareFailureSchema = z.object({ reason: z.string().trim().min(1).max(5000).default('Malware scan failed') }).strict();
    const sanitizeAssetSchema = z.object({}).strict();
    const activateAssetSchema = z.object({}).strict();
    const deliveryGrantSchema = z.object({
      expiresInSeconds: z.number().int().min(1).max(3600).optional(),
    }).strict();
    const assetSelectionAuditSchema = z.object({
      purpose: z.string().trim().min(2).max(160),
      context: z.string().trim().max(240).optional(),
    }).strict();


    const assetListQuerySchema = z.object({
      lifecycleState: z.string().trim().min(1).max(80).optional(),
      ownerType: z.string().trim().min(1).max(120).optional(),
      ownerId: z.string().trim().min(1).max(240).optional(),
      securityClassification: z.nativeEnum(AssetSecurityClassification).optional(),
      mimeTypePrefix: z.string().trim().min(1).max(120).optional(),
      createdFrom: z.string().datetime().optional(),
      createdTo: z.string().datetime().optional(),
      q: z.string().trim().min(1).max(240).optional(),
      limit: z.coerce.number().int().min(1).max(100).optional(),
      cursor: z.string().trim().min(1).max(2048).optional(),
    }).strict();

    router.get('/', asyncHandler(async (req: Request, res: Response) => {
      if (!assetRecordRepository?.queryAdmin) throw new Error('ASSET_ADMIN_READ_MODEL_UNAVAILABLE');
      const query = assetListQuerySchema.parse(req.query);
      const result = await assetRecordRepository.queryAdmin(query);
      res.status(200).json(result);
    }));

    router.get('/:assetId', asyncHandler(async (req: Request, res: Response) => {
      if (!assetRecordRepository) throw new Error('ASSET_ADMIN_READ_MODEL_UNAVAILABLE');
      const { AssetId } = await import('@manaratak/domain');
      const asset = await assetRecordRepository.findById(new AssetId(req.params.assetId));
      if (!asset) return void res.status(404).json({ error: 'ASSET_NOT_FOUND' });
      res.status(200).json({
        id: asset.id.value,
        reference: asset.reference.value,
        ownerId: asset.owner.ownerId, ownerType: asset.owner.ownerType,
        lifecycleState: asset.state, securityClassification: asset.classification,
        retentionCategory: asset.retention.category, retentionExpiresAt: asset.retention.expiresAt,
        metadata: {
          originalFilename: asset.metadata.originalFilename, mimeType: asset.metadata.mimeType,
          fileExtension: asset.metadata.fileExtension, byteSize: asset.metadata.byteSize,
          width: asset.metadata.width, height: asset.metadata.height, duration: asset.metadata.duration,
        },
        checksum: asset.checksum ? { algorithm: asset.checksum.algorithm, hash: asset.checksum.hash } : null,
      });
    }));

    // POST /upload-locator
    router.post('/upload-locator', asyncHandler(async (req: Request, res: Response) => {
      try {
        const payload = requestUploadLocatorSchema.parse(req.body);
        const result = await ingestAssetUseCase.requestUploadLocator(payload as RequestAssetUploadLocatorDto);
        await AuditHelper.recordMutation(auditRecordRepo, req, {
          action: 'REQUEST_ASSET_UPLOAD',
          category: 'ASSET_PLATFORM',
          targetType: 'ASSET',
          targetId: payload.assetId,
          result: 'SUCCESS',
          metadata: { mimeType: payload.mimeType, classification: payload.classification }
        });
        res.status(201).json(result);
      } catch (error: any) {
        await AuditHelper.recordMutation(auditRecordRepo, req, {
          action: 'REQUEST_ASSET_UPLOAD',
          category: 'ASSET_PLATFORM',
          targetType: 'ASSET',
          targetId: req.body?.assetId,
          result: 'FAILURE',
          error
        });
        throw error;
      }
    }));

    // POST /register-quarantined
    router.post('/register-quarantined', asyncHandler(async (req: Request, res: Response) => {
      try {
        const payload = registerQuarantinedSchema.parse(req.body);
        const result = await ingestAssetUseCase.registerQuarantinedAsset(payload as RegisterQuarantinedAssetDto);
        await AuditHelper.recordMutation(auditRecordRepo, req, {
          action: 'REGISTER_QUARANTINED_ASSET',
          category: 'ASSET_PLATFORM',
          targetType: 'ASSET',
          targetId: payload.assetId,
          result: 'SUCCESS',
          metadata: { mimeType: payload.mimeType }
        });
        res.status(201).json(result);
      } catch (error: any) {
        await AuditHelper.recordMutation(auditRecordRepo, req, {
          action: 'REGISTER_QUARANTINED_ASSET',
          category: 'ASSET_PLATFORM',
          targetType: 'ASSET',
          targetId: req.body?.assetId,
          result: 'FAILURE',
          error
        });
        throw error;
      }
    }));

    // POST /:assetId/validate
    router.post('/:assetId/validate', asyncHandler(async (req: Request, res: Response) => {
      emptyMutationBodySchema.parse(req.body ?? {});
      const assetId = req.params.assetId;
      if (/^https?:\/\//i.test(assetId.trim())) {
        return res.status(400).json({ error: 'AssetId must be a Phase 05 EAP handle, not a raw URL' });
      }
      try {
        const result = await processAssetLifecycleUseCase.validateAsset({ assetId });
        await AuditHelper.recordMutation(auditRecordRepo, req, {
          action: 'VALIDATE_ASSET',
          category: 'ASSET_PLATFORM',
          targetType: 'ASSET',
          targetId: assetId,
          result: 'SUCCESS'
        });
        res.json(result);
      } catch (error: any) {
        await AuditHelper.recordMutation(auditRecordRepo, req, {
          action: 'VALIDATE_ASSET',
          category: 'ASSET_PLATFORM',
          targetType: 'ASSET',
          targetId: assetId,
          result: 'FAILURE',
          error
        });
        throw error;
      }
    }));

    // POST /:assetId/malware-failed
    router.post('/:assetId/malware-failed', asyncHandler(async (req: Request, res: Response) => {
      const assetId = req.params.assetId;
      if (/^https?:\/\//i.test(assetId.trim())) {
        return res.status(400).json({ error: 'AssetId must be a Phase 05 EAP handle, not a raw URL' });
      }
      const { reason } = malwareFailureSchema.parse(req.body ?? {});
      try {
        const result = await processAssetLifecycleUseCase.markMalwareScanFailed({ assetId, reason });
        await AuditHelper.recordMutation(auditRecordRepo, req, {
          action: 'MARK_ASSET_MALWARE_FAILED',
          category: 'ASSET_PLATFORM',
          targetType: 'ASSET',
          targetId: assetId,
          result: 'SUCCESS',
          metadata: { reason }
        });
        res.json(result);
      } catch (error: any) {
        await AuditHelper.recordMutation(auditRecordRepo, req, {
          action: 'MARK_ASSET_MALWARE_FAILED',
          category: 'ASSET_PLATFORM',
          targetType: 'ASSET',
          targetId: assetId,
          result: 'FAILURE',
          error
        });
        throw error;
      }
    }));

    // POST /:assetId/sanitize
    router.post('/:assetId/sanitize', asyncHandler(async (req: Request, res: Response) => {
      const assetId = req.params.assetId;
      if (/^https?:\/\//i.test(assetId.trim())) {
        return res.status(400).json({ error: 'AssetId must be a Phase 05 EAP handle, not a raw URL' });
      }
      sanitizeAssetSchema.parse(req.body ?? {});
      try {
        const result = await processAssetLifecycleUseCase.sanitizeAsset({ assetId });
        await AuditHelper.recordMutation(auditRecordRepo, req, {
          action: 'SANITIZE_ASSET',
          category: 'ASSET_PLATFORM',
          targetType: 'ASSET',
          targetId: assetId,
          result: 'SUCCESS'
        });
        res.json(result);
      } catch (error: any) {
        await AuditHelper.recordMutation(auditRecordRepo, req, {
          action: 'SANITIZE_ASSET',
          category: 'ASSET_PLATFORM',
          targetType: 'ASSET',
          targetId: assetId,
          result: 'FAILURE',
          error
        });
        throw error;
      }
    }));

    // POST /:assetId/activate
    router.post('/:assetId/activate', asyncHandler(async (req: Request, res: Response) => {
      const assetId = req.params.assetId;
      if (/^https?:\/\//i.test(assetId.trim())) {
        return res.status(400).json({ error: 'AssetId must be a Phase 05 EAP handle, not a raw URL' });
      }
      activateAssetSchema.parse(req.body ?? {});
      try {
        const result = await processAssetLifecycleUseCase.activateAsset({ assetId });
        await AuditHelper.recordMutation(auditRecordRepo, req, {
          action: 'ACTIVATE_ASSET',
          category: 'ASSET_PLATFORM',
          targetType: 'ASSET',
          targetId: assetId,
          result: 'SUCCESS'
        });
        res.json(result);
      } catch (error: any) {
        await AuditHelper.recordMutation(auditRecordRepo, req, {
          action: 'ACTIVATE_ASSET',
          category: 'ASSET_PLATFORM',
          targetType: 'ASSET',
          targetId: assetId,
          result: 'FAILURE',
          error
        });
        throw error;
      }
    }));

    // POST /:assetId/delivery-grant — temporary provider-signed delivery only for ACTIVE/CLEAN assets.
    router.post('/:assetId/delivery-grant', asyncHandler(async (req: Request, res: Response) => {
      const assetId = req.params.assetId;
      if (/^https?:\/\//i.test(assetId.trim())) {
        return res.status(400).json({ error: 'AssetId must be a Phase 05 EAP handle, not a raw URL' });
      }
      const { expiresInSeconds } = deliveryGrantSchema.parse(req.body ?? {});
      try {
        const result = await processAssetLifecycleUseCase.requestDeliveryGrant({ assetId, expiresInSeconds });
        await AuditHelper.recordMutation(auditRecordRepo, req, {
          action: 'REQUEST_ASSET_DELIVERY_GRANT',
          category: 'ASSET_PLATFORM',
          targetType: 'ASSET',
          targetId: assetId,
          result: 'SUCCESS',
          metadata: { expiresInSeconds: expiresInSeconds ?? 300 }
        });
        res.json(result);
      } catch (error: any) {
        await AuditHelper.recordMutation(auditRecordRepo, req, {
          action: 'REQUEST_ASSET_DELIVERY_GRANT',
          category: 'ASSET_PLATFORM',
          targetType: 'ASSET',
          targetId: assetId,
          result: 'FAILURE',
          error
        });
        throw error;
      }
    }));


    // POST /:assetId/selection-audit — records governed Admin reuse without exposing storage locators.
    router.post('/:assetId/selection-audit', asyncHandler(async (req: Request, res: Response) => {
      const assetId = req.params.assetId;
      const payload = assetSelectionAuditSchema.parse(req.body ?? {});
      if (!assetRecordRepository) throw new Error('ASSET_ADMIN_READ_MODEL_UNAVAILABLE');
      const { AssetId, AssetLifecycleState } = await import('@manaratak/domain');
      const asset = await assetRecordRepository.findById(new AssetId(assetId));
      if (!asset) return void res.status(404).json({ error: 'ASSET_NOT_FOUND' });
      if (asset.state !== AssetLifecycleState.ACTIVE) return void res.status(409).json({ error: 'ASSET_NOT_ACTIVE' });
      await AuditHelper.recordMutation(auditRecordRepo, req, {
        action: 'SELECT_ASSET_REFERENCE',
        category: 'ASSET_PLATFORM',
        targetType: 'ASSET',
        targetId: assetId,
        result: 'SUCCESS',
        metadata: { purpose: payload.purpose, context: payload.context ?? null }
      });
      res.status(204).send();
    }));

    // POST /:assetId/archive
    router.post('/:assetId/archive', asyncHandler(async (req: Request, res: Response) => {
      emptyMutationBodySchema.parse(req.body ?? {});
      const assetId = req.params.assetId;
      if (/^https?:\/\//i.test(assetId.trim())) {
        return res.status(400).json({ error: 'AssetId must be a Phase 05 EAP handle, not a raw URL' });
      }
      try {
        const result = await processAssetLifecycleUseCase.archiveAsset({ assetId });
        await AuditHelper.recordMutation(auditRecordRepo, req, {
          action: 'ARCHIVE_ASSET',
          category: 'ASSET_PLATFORM',
          targetType: 'ASSET',
          targetId: assetId,
          result: 'SUCCESS'
        });
        res.json(result);
      } catch (error: any) {
        await AuditHelper.recordMutation(auditRecordRepo, req, {
          action: 'ARCHIVE_ASSET',
          category: 'ASSET_PLATFORM',
          targetType: 'ASSET',
          targetId: assetId,
          result: 'FAILURE',
          error
        });
        throw error;
      }
    }));

    // DELETE /:assetId
    router.delete('/:assetId', asyncHandler(async (req: Request, res: Response) => {
      emptyMutationBodySchema.parse(req.body ?? {});
      const assetId = req.params.assetId;
      if (/^https?:\/\//i.test(assetId.trim())) {
        return res.status(400).json({ error: 'AssetId must be a Phase 05 EAP handle, not a raw URL' });
      }
      try {
        const result = await processAssetLifecycleUseCase.softDeleteAsset({ assetId });
        await AuditHelper.recordMutation(auditRecordRepo, req, {
          action: 'SOFT_DELETE_ASSET',
          category: 'ASSET_PLATFORM',
          targetType: 'ASSET',
          targetId: assetId,
          result: 'SUCCESS'
        });
        res.json(result);
      } catch (error: any) {
        await AuditHelper.recordMutation(auditRecordRepo, req, {
          action: 'SOFT_DELETE_ASSET',
          category: 'ASSET_PLATFORM',
          targetType: 'ASSET',
          targetId: assetId,
          result: 'FAILURE',
          error
        });
        throw error;
      }
    }));

    // POST /:assetId/restore
    router.post('/:assetId/restore', asyncHandler(async (req: Request, res: Response) => {
      emptyMutationBodySchema.parse(req.body ?? {});
      const assetId = req.params.assetId;
      if (/^https?:\/\//i.test(assetId.trim())) {
        return res.status(400).json({ error: 'AssetId must be a Phase 05 EAP handle, not a raw URL' });
      }
      try {
        const result = await processAssetLifecycleUseCase.restoreAsset({ assetId });
        await AuditHelper.recordMutation(auditRecordRepo, req, {
          action: 'RESTORE_ASSET',
          category: 'ASSET_PLATFORM',
          targetType: 'ASSET',
          targetId: assetId,
          result: 'SUCCESS'
        });
        res.json(result);
      } catch (error: any) {
        await AuditHelper.recordMutation(auditRecordRepo, req, {
          action: 'RESTORE_ASSET',
          category: 'ASSET_PLATFORM',
          targetType: 'ASSET',
          targetId: assetId,
          result: 'FAILURE',
          error
        });
        throw error;
      }
    }));

    // DELETE /:assetId/purge
    router.delete('/:assetId/purge', asyncHandler(async (req: Request, res: Response) => {
      emptyMutationBodySchema.parse(req.body ?? {});
      const assetId = req.params.assetId;
      if (/^https?:\/\//i.test(assetId.trim())) {
        return res.status(400).json({ error: 'AssetId must be a Phase 05 EAP handle, not a raw URL' });
      }
      try {
        await processAssetLifecycleUseCase.purgeAsset({ assetId });
        await AuditHelper.recordMutation(auditRecordRepo, req, {
          action: 'PURGE_ASSET',
          category: 'ASSET_PLATFORM',
          targetType: 'ASSET',
          targetId: assetId,
          result: 'SUCCESS'
        });
        res.status(200).json({ success: true, message: `Asset ${assetId} purged successfully` });
      } catch (error: any) {
        await AuditHelper.recordMutation(auditRecordRepo, req, {
          action: 'PURGE_ASSET',
          category: 'ASSET_PLATFORM',
          targetType: 'ASSET',
          targetId: assetId,
          result: 'FAILURE',
          error
        });
        throw error;
      }
    }));

    // Router error handler for Zod and Use Case errors
    router.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation Error', details: err.issues });
      }
      return res.status(400).json({ error: err.message || 'An error occurred' });
    });

    return router;
  }
}

