import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  AssetLifecycleState,
  AssetSecurityClassification,
  AssetRetentionCategory,
  IAuditRecordRepository,
  IAssetUsageRegistryGateway
} from '@manaratak/domain';
import {
  IngestAssetUseCase,
  ProcessAssetLifecycleUseCase,
  RequestAssetUploadLocatorDto,
  RegisterQuarantinedAssetDto,
  AssetRecordDto
} from '@manaratak/application';
import { AuditHelper } from '../../audit/AuditHelper.js';

export interface AssetPlatformRouterCradle {
  ingestAssetUseCase: IngestAssetUseCase;
  processAssetLifecycleUseCase: ProcessAssetLifecycleUseCase;
  auditRecordRepo?: IAuditRecordRepository;
  assetUsageRegistryGateway?: IAssetUsageRegistryGateway;
  assetRecordRepository?: { queryAdmin(input: any): Promise<{ items: any[]; nextCursor: string | null; hasMore: boolean }>; findById(id: any): Promise<any>; findAdminDetails?(id: any): Promise<any> };
}

export class AssetPlatformRouter {
  public static create(cradle: AssetPlatformRouterCradle): Router {
    const router = Router();
    const { ingestAssetUseCase, processAssetLifecycleUseCase, auditRecordRepo, assetRecordRepository, assetUsageRegistryGateway } = cradle;

    const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
      (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
      };

    const publicAssetDto = (record: AssetRecordDto) => {
      const { storageLocator: _locator, storageZone: _zone, bucketName: _bucket, pathKey: _path, ...safe } = record;
      return safe;
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
      lifecycleState: z.nativeEnum(AssetLifecycleState).optional(),
      ownerType: z.string().trim().min(1).max(120).optional(),
      ownerId: z.string().trim().min(1).max(240).optional(),
      securityClassification: z.nativeEnum(AssetSecurityClassification).optional(),
      mimeTypePrefix: z.string().trim().min(1).max(120).optional(),
      retentionCategory: z.nativeEnum(AssetRetentionCategory).optional(),
      checksumPresence: z.enum(['PRESENT', 'MISSING']).optional(),
      malwareStatus: z.enum(['PASSED', 'FAILED']).optional(),
      fileFamily: z.enum(['IMAGE', 'VIDEO', 'AUDIO', 'PDF']).optional(),
      processingQueue: z.enum(['AWAITING_UPLOAD', 'QUARANTINE', 'PROCESSING', 'FAILED', 'ACTIVATION_RECOVERY', 'RESTORE_RECOVERY', 'ARCHIVE_RECOVERY']).optional(),
      createdFrom: z.string().datetime().optional(),
      createdTo: z.string().datetime().optional(),
      q: z.string().trim().min(1).max(240).optional(),
      limit: z.coerce.number().int().min(1).max(100).optional(),
      cursor: z.string().trim().min(1).max(2048).optional(),
    }).strict().superRefine((query, ctx) => {
      if (query.createdFrom && query.createdTo && new Date(query.createdFrom).getTime() > new Date(query.createdTo).getTime()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['createdTo'], message: 'createdTo must not precede createdFrom' });
      }
    });

    router.get('/', asyncHandler(async (req: Request, res: Response) => {
      if (!assetRecordRepository?.queryAdmin) throw new Error('ASSET_ADMIN_READ_MODEL_UNAVAILABLE');
      const query = assetListQuerySchema.parse(req.query);
      const result = await assetRecordRepository.queryAdmin(query);
      res.status(200).json(result);
    }));

    // Lifecycle impact readout for admins before archive/delete/purge.
    // Derived usages are resolved centrally; never treat a missing delegate as zero usages.
    router.get('/:assetId/usages', asyncHandler(async (req: Request, res: Response) => {
      if (!assetRecordRepository || !assetUsageRegistryGateway?.findUsages) {
        res.status(503).json({ error: 'ASSET_USAGE_REGISTRY_UNAVAILABLE' });
        return;
      }
      const { AssetId } = await import('@manaratak/domain');
      const assetId = new AssetId(req.params.assetId);
      const asset = await assetRecordRepository.findById(assetId);
      if (!asset) { res.status(404).json({ error: 'ASSET_NOT_FOUND' }); return; }
      const usages = await assetUsageRegistryGateway.findUsages(assetId);
      res.status(200).json({
        assetId: assetId.value,
        inUse: usages.length > 0,
        usages: usages.map((usage) => ({ consumer: usage.consumer, field: usage.field })),
      });
    }));

    router.get('/:assetId', asyncHandler(async (req: Request, res: Response) => {
      if (!assetRecordRepository?.findAdminDetails) throw new Error('ASSET_ADMIN_READ_MODEL_UNAVAILABLE');
      const { AssetId } = await import('@manaratak/domain');
      const details = await assetRecordRepository.findAdminDetails(new AssetId(req.params.assetId));
      if (!details) return void res.status(404).json({ error: 'ASSET_NOT_FOUND' });
      const { asset, governance } = details;
      res.status(200).json({
        governance,
        versions: asset.versionChain?.allVersions.map((version: any) => ({
          versionNumber: version.versionNumber, createdAt: version.createdAt,
          checksum: version.checksum ? { algorithm: version.checksum.algorithm, hash: version.checksum.hash } : null,
        })) ?? [],
        archiveOperation: asset.archiveOperation ? { operationId: asset.archiveOperation.operationId,
          phase: asset.archiveOperation.phase, preparedAt: asset.archiveOperation.preparedAt, updatedAt: asset.archiveOperation.updatedAt } : null,
        restoreOperation: asset.restoreOperation ? { operationId: asset.restoreOperation.operationId,
          phase: asset.restoreOperation.phase, preparedAt: asset.restoreOperation.preparedAt, updatedAt: asset.restoreOperation.updatedAt } : null,
        activationOperation: asset.activationOperation ? { operationId: asset.activationOperation.operationId,
          phase: asset.activationOperation.phase, preparedAt: asset.activationOperation.preparedAt,
          completedAt: asset.activationOperation.completedAt ?? null } : null,
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
        securityEvidence: {
          uploadConfirmed: asset.uploadVerification?.signatureVerified === true,
          uploadVerifiedAt: asset.uploadVerification?.verifiedAt ?? null,
          malwareStatus: asset.malwareScan?.status ?? null,
          scannedAt: asset.malwareScan?.scannedAt ?? null,
          activationPhase: asset.activationOperation?.phase ?? null,
          restorePhase: asset.restoreOperation?.phase ?? null,
          archivePhase: asset.archiveOperation?.phase ?? null,
          sanitized: Boolean(asset.sanitization?.sanitizedAt),
          sanitizedAt: asset.sanitization?.sanitizedAt ?? null,
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
        // Storage coordinates remain EAP-owned; browsers need only the temporary grant and handle.
        res.status(201).json({
          assetId: result.assetId, assetReference: result.assetReference,
          lifecycleState: result.lifecycleState, uploadGrant: result.uploadGrant,
        });
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
        res.status(201).json(publicAssetDto(result));
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

    // POST /:assetId/finalize-upload — uploaded bytes must be verified and recorded before scanning.
    router.post('/:assetId/finalize-upload', asyncHandler(async (req: Request, res: Response) => {
      emptyMutationBodySchema.parse(req.body ?? {});
      const assetId = req.params.assetId;
      if (/^https?:\/\//i.test(assetId.trim())) {
        res.status(400).json({ error: 'ASSET_HANDLE_REQUIRED' });
        return;
      }
      try {
        const result = await processAssetLifecycleUseCase.finalizeUploadedAsset({ assetId });
        await AuditHelper.recordMutation(auditRecordRepo, req, {
          action: 'FINALIZE_ASSET_UPLOAD',
          category: 'ASSET_PLATFORM',
          targetType: 'ASSET',
          targetId: assetId,
          result: 'SUCCESS',
        });
        res.status(200).json(publicAssetDto(result));
      } catch (error: any) {
        await AuditHelper.recordMutation(auditRecordRepo, req, {
          action: 'FINALIZE_ASSET_UPLOAD',
          category: 'ASSET_PLATFORM',
          targetType: 'ASSET',
          targetId: assetId,
          result: 'FAILURE',
          error,
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
        res.json(publicAssetDto(result));
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
        res.json(publicAssetDto(result));
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
        res.json(publicAssetDto(result));
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
          result: 'SUCCESS',
          metadata: { activationOperationId: result.activationOperation?.operationId, phase: result.activationOperation?.phase }
        });
        res.json(publicAssetDto(result));
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
        res.json(publicAssetDto(result));
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
        res.json(publicAssetDto(result));
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
        res.json(publicAssetDto(result));
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

    // Safe RFC 9457 Problem Details: do not return raw provider/database/SQL error messages.
    router.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
      const respond = (status: number, title: string, code: string, detail?: string) =>
        res.status(status).type('application/problem+json').json({
          type: 'about:blank',
          title,
          status,
          code,
          ...(detail ? { detail } : {}),
          instance: req.path,
        });

      if (err instanceof z.ZodError) {
        const detail = err.issues.map((issue) => `${issue.path.join('.') || 'request'}: ${issue.message}`).join('; ');
        return respond(400, 'Invalid asset request', 'ASSET_REQUEST_INVALID', detail);
      }
      const message = err instanceof Error ? err.message : '';
      if (message === 'ASSET_CURSOR_INVALID') return respond(400, 'Invalid asset cursor', message);
      if (message === 'ASSET_ADMIN_READ_MODEL_UNAVAILABLE' ||
        message === 'ASSET_VERSION_HISTORY_INVALID' ||
        message === 'ASSET_UPLOAD_VERIFICATION_NOT_CONFIGURED' ||
        message === 'ASSET_RESTORE_VERIFICATION_NOT_CONFIGURED' ||
        message === 'ASSET_ARCHIVE_JOURNAL_NOT_CONFIGURED' ||
        message === 'ASSET_ARCHIVE_RECOVERY_REQUIRED' ||
        message === 'ASSET_ARCHIVE_LEGACY_VERIFICATION_REQUIRED' ||
        message === 'ASSET_RESTORE_COMPENSATION_FAILED' ||
        message === 'ASSET_RESTORE_RECOVERY_REQUIRED' ||
        message === 'ASSET_RESTORE_LEASE_NOT_CONFIGURED' ||
        message === 'ASSET_RESTORE_LEASE_RELEASE_FAILED' ||
        message === 'ASSET_MALWARE_SCANNING_NOT_CONFIGURED' ||
        message === 'ASSET_SANITIZATION_NOT_CONFIGURED' ||
        message === 'ASSET_SECURE_DELIVERY_NOT_CONFIGURED') {
        return respond(503, 'Asset service temporarily unavailable', message);
      }
      if (/^ASSET_(UPLOAD_RETENTION_CATEGORY_FORBIDDEN|TEMPORARY_EXPIRY_REQUIRED|RETENTION_EXPIRY_INVALID|RETENTION_EXPIRY_NOT_FUTURE|DECLARED_EXTENSION_MIME_MISMATCH)$/.test(message) ||
        /^(Original filename is required|File is empty or missing|File size exceeds maximum limit:|Unsupported file extension:|Unsupported mime type:|Unsafe absolute path detected in|Path traversal attempt detected in|Null byte detected in)/.test(message)) {
        return respond(422, 'Invalid asset metadata', 'ASSET_METADATA_INVALID');
      }
      if (message.startsWith('Asset with id ') && message.endsWith(' already exists')) return respond(409, 'Asset already exists', 'ASSET_ALREADY_EXISTS');
      if (message.startsWith('Asset not found:')) return respond(404, 'Asset not found', 'ASSET_NOT_FOUND');
      if (message.startsWith('ASSET_PROVIDER_')) return respond(502, 'Asset storage provider rejected the request', 'ASSET_PROVIDER_ERROR');
      if (/^ASSET_(ARCHIVE_RECOVERY_PENDING|ARCHIVE_OPERATION_INVALID|RESTORE_RECOVERY_PENDING|RESTORE_OPERATION_INVALID|REFERENCE_IN_USE|REFERENCE_ISOLATION_UNSUPPORTED|ACTIVATION_RECOVERY_PENDING|ACTIVATION_OPERATION_INVALID|RESTORE_RETENTION_POLICY_UNKNOWN|RESTORE_RETENTION_POLICY_EXPIRED|QUARANTINE_CONTENT_CHANGED_BEFORE_ACTIVATION|SANITIZED_CONTENT_CHANGED_DURING_SCAN|DELIVERY_TRUST_EVIDENCE_REQUIRED|DELIVERY_REQUIRES_ACTIVE_CLEAN_ASSET|UPLOAD_FINALIZATION_REQUIRED|UPLOAD_CHANGED_AFTER_FINALIZATION|RESTORE_CONTENT_VERIFICATION_FAILED|RESTORE_CLEAN_LOCATOR_REQUIRED|RESTORE_EVIDENCE_INVALID|RESTORE_LEASE_CONFLICT|RESTORE_LEASE_LOST|RESTORE_LEASE_REQUIRED|RESTORE_LEASE_INVALID_STATE|UPLOAD_VERIFICATION_FAILED|UPLOAD_VERIFICATION_REQUIRED|UPLOAD_VERIFICATION_INVALID_STATE|RECORD_CONCURRENT_MODIFICATION|PURGE_RETENTION_NOT_EXPIRED|PURGE_LEGAL_HOLD_ACTIVE|PURGE_RETENTION_CLAIM_ACTIVE|PURGE_RETENTION_CLAIM_NOT_OWNED|MALWARE_SCAN_PASSED_EVIDENCE_REQUIRED|MALWARE_SCAN_INVALID_STATE|QUARANTINE_REQUIRED_FOR_ACTIVATION)$/.test(message) ||
        /^Cannot (activate|archive|soft delete|purge|mark)/i.test(message)) {
        return respond(409, 'Asset state or dependency conflict', 'ASSET_STATE_CONFLICT');
      }
      return respond(500, 'Asset operation failed', 'ASSET_INTERNAL_ERROR');
    });

    return router;
  }
}

