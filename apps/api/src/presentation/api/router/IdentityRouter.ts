import { Router, Request, Response } from 'express';
import { 
  ProvisionIdentityUseCase,
  ActivateIdentityUseCase,
  SuspendIdentityUseCase,
  ArchiveIdentityUseCase,
  PurgeIdentityUseCase,
  UpdateProfileUseCase,
  UpdateContactUseCase,
  GetIdentityUseCase,
  ListIdentitiesUseCase
} from '@manaratak/application';
import { IAuditRecordRepository } from '@manaratak/domain';
import { ResponseFormatter } from '../response/ResponseFormatter.js';
import { AuditHelper } from '../../audit/AuditHelper.js';
import {
  emptyBodySchema,
  identityContactUpdateSchema,
  identityIdParamSchema,
  identityLifecycleReasonSchema,
  identityListQuerySchema,
  identityProfileUpdateSchema,
  identityProvisionSchema,
  parseStrict,
} from '../../validation/StrictControlPlaneSchemas.js';

export class IdentityRouter {
  public static create({ provisionIdentityUseCase, activateIdentityUseCase, suspendIdentityUseCase, archiveIdentityUseCase, purgeIdentityUseCase, updateProfileUseCase, updateContactUseCase, getIdentityUseCase, listIdentitiesUseCase, auditRecordRepo }: { provisionIdentityUseCase: ProvisionIdentityUseCase, activateIdentityUseCase: ActivateIdentityUseCase, suspendIdentityUseCase: SuspendIdentityUseCase, archiveIdentityUseCase: ArchiveIdentityUseCase, purgeIdentityUseCase: PurgeIdentityUseCase, updateProfileUseCase: UpdateProfileUseCase, updateContactUseCase: UpdateContactUseCase, getIdentityUseCase: GetIdentityUseCase, listIdentitiesUseCase: ListIdentitiesUseCase, auditRecordRepo?: IAuditRecordRepository }): Router {
    const router = Router();
    const responseFormatter = new ResponseFormatter('v1');

    const provisionUseCase = provisionIdentityUseCase;
    const activateUseCase = activateIdentityUseCase;
    const suspendUseCase = suspendIdentityUseCase;
    const archiveUseCase = archiveIdentityUseCase;
    const purgeUseCase = purgeIdentityUseCase;

    // 1. Provision Identity
    router.post('/', async (req: Request, res: Response) => {
      const body = parseStrict(identityProvisionSchema, req.body);
      if (!req.authUserId) throw new Error('AUTHENTICATED_ADMIN_ACTOR_REQUIRED');
      const result = await provisionUseCase.execute({ ...body, createdBy: req.authUserId });

      if (result.isSuccess) {
        const val = result.getValue();
        await AuditHelper.recordMutation(auditRecordRepo, req, {
          action: 'PROVISION_IDENTITY',
          category: 'IDENTITY',
          targetType: 'IDENTITY',
          targetId: val.id || body.primaryEmail,
          result: 'SUCCESS',
          metadata: { type: body.type, primaryEmail: body.primaryEmail }
        });
        res.status(201).json(responseFormatter.success(val));
      } else {
        await AuditHelper.recordMutation(auditRecordRepo, req, {
          action: 'PROVISION_IDENTITY',
          category: 'IDENTITY',
          targetType: 'IDENTITY',
          targetId: body.primaryEmail,
          result: 'FAILURE',
          error: result.error
        });
        res.status(400).json(responseFormatter.error({
          code: result.error?.code || 'VALIDATION_ERROR',
          message: result.error?.message || 'Failed to provision identity'
        }));
      }
    });

    // 2. Get Identity Details (Read-only, no audit)
    router.get('/:id', async (req: Request, res: Response) => {
      const { id } = parseStrict(identityIdParamSchema, req.params);
      const result = await getIdentityUseCase.execute(id);
      if (result.isSuccess) {
        res.status(200).json(responseFormatter.success(result.getValue()));
      } else {
        res.status(404).json(responseFormatter.error({
          code: result.error?.code || 'NOT_FOUND',
          message: result.error?.message || 'Identity not found'
        }));
      }
    });

    // 3. List Identities (Paged & Filtered, Read-only, no audit)
    router.get('/', async (req: Request, res: Response) => {
      const query = parseStrict(identityListQuerySchema, req.query);
      const result = await listIdentitiesUseCase.execute(query);

      if (result.isSuccess) {
        res.status(200).json(responseFormatter.success(result.getValue()));
      } else {
        res.status(400).json(responseFormatter.error({
          code: result.error?.code || 'VALIDATION_ERROR',
          message: result.error?.message || 'Failed to query identities'
        }));
      }
    });

    // 4. Activate Identity
    router.post('/:id/activate', async (req: Request, res: Response) => {
      parseStrict(emptyBodySchema, req.body ?? {});
      const { id } = parseStrict(identityIdParamSchema, req.params);
      const result = await activateUseCase.execute(id);
      if (result.isSuccess) {
        await AuditHelper.recordMutation(auditRecordRepo, req, {
          action: 'ACTIVATE_IDENTITY',
          category: 'IDENTITY',
          targetType: 'IDENTITY',
          targetId: id,
          result: 'SUCCESS'
        });
        res.status(200).json(responseFormatter.success(result.getValue()));
      } else {
        await AuditHelper.recordMutation(auditRecordRepo, req, {
          action: 'ACTIVATE_IDENTITY',
          category: 'IDENTITY',
          targetType: 'IDENTITY',
          targetId: id,
          result: 'FAILURE',
          error: result.error
        });
        res.status(400).json(responseFormatter.error({
          code: result.error?.code || 'VALIDATION_ERROR',
          message: result.error?.message || 'Failed to activate identity'
        }));
      }
    });

    // 5. Suspend Identity
    router.post('/:id/suspend', async (req: Request, res: Response) => {
      const { id } = parseStrict(identityIdParamSchema, req.params);
      const body = parseStrict(identityLifecycleReasonSchema, req.body);
      const result = await suspendUseCase.execute({ identityId: id, reason: body.reason });
      if (result.isSuccess) {
        await AuditHelper.recordMutation(auditRecordRepo, req, {
          action: 'SUSPEND_IDENTITY',
          category: 'IDENTITY',
          targetType: 'IDENTITY',
          targetId: id,
          result: 'SUCCESS',
          metadata: { reason: body.reason }
        });
        res.status(200).json(responseFormatter.success(result.getValue()));
      } else {
        await AuditHelper.recordMutation(auditRecordRepo, req, {
          action: 'SUSPEND_IDENTITY',
          category: 'IDENTITY',
          targetType: 'IDENTITY',
          targetId: id,
          result: 'FAILURE',
          error: result.error
        });
        res.status(400).json(responseFormatter.error({
          code: result.error?.code || 'VALIDATION_ERROR',
          message: result.error?.message || 'Failed to suspend identity'
        }));
      }
    });

    // 6. Archive Identity
    router.post('/:id/archive', async (req: Request, res: Response) => {
      const { id } = parseStrict(identityIdParamSchema, req.params);
      const body = parseStrict(identityLifecycleReasonSchema, req.body);
      const result = await archiveUseCase.execute({ identityId: id, reason: body.reason });
      if (result.isSuccess) {
        await AuditHelper.recordMutation(auditRecordRepo, req, {
          action: 'ARCHIVE_IDENTITY',
          category: 'IDENTITY',
          targetType: 'IDENTITY',
          targetId: id,
          result: 'SUCCESS',
          metadata: { reason: body.reason }
        });
        res.status(200).json(responseFormatter.success(result.getValue()));
      } else {
        await AuditHelper.recordMutation(auditRecordRepo, req, {
          action: 'ARCHIVE_IDENTITY',
          category: 'IDENTITY',
          targetType: 'IDENTITY',
          targetId: id,
          result: 'FAILURE',
          error: result.error
        });
        res.status(400).json(responseFormatter.error({
          code: result.error?.code || 'VALIDATION_ERROR',
          message: result.error?.message || 'Failed to archive identity'
        }));
      }
    });

    // 7. Purge/Delete Identity (GDPR compliant)
    router.delete('/:id', async (req: Request, res: Response) => {
      const { id } = parseStrict(identityIdParamSchema, req.params);
      const body = parseStrict(identityLifecycleReasonSchema, req.body);
      const result = await purgeUseCase.execute({ identityId: id, reason: body.reason });
      if (result.isSuccess) {
        await AuditHelper.recordMutation(auditRecordRepo, req, {
          action: 'PURGE_IDENTITY',
          category: 'IDENTITY',
          targetType: 'IDENTITY',
          targetId: id,
          result: 'SUCCESS',
          metadata: { reason: body.reason }
        });
        res.status(200).json(responseFormatter.success(result.getValue()));
      } else {
        await AuditHelper.recordMutation(auditRecordRepo, req, {
          action: 'PURGE_IDENTITY',
          category: 'IDENTITY',
          targetType: 'IDENTITY',
          targetId: id,
          result: 'FAILURE',
          error: result.error
        });
        res.status(400).json(responseFormatter.error({
          code: result.error?.code || 'VALIDATION_ERROR',
          message: result.error?.message || 'Failed to purge identity'
        }));
      }
    });

    // 8. Update Profile Details
    router.put('/:id/profile', async (req: Request, res: Response) => {
      const { id } = parseStrict(identityIdParamSchema, req.params);
      const body = parseStrict(identityProfileUpdateSchema, req.body);
      const result = await updateProfileUseCase.execute({ identityId: id, ...body });
      if (result.isSuccess) {
        await AuditHelper.recordMutation(auditRecordRepo, req, {
          action: 'UPDATE_IDENTITY_PROFILE',
          category: 'IDENTITY',
          targetType: 'IDENTITY',
          targetId: id,
          result: 'SUCCESS'
        });
        res.status(200).json(responseFormatter.success(result.getValue()));
      } else {
        await AuditHelper.recordMutation(auditRecordRepo, req, {
          action: 'UPDATE_IDENTITY_PROFILE',
          category: 'IDENTITY',
          targetType: 'IDENTITY',
          targetId: id,
          result: 'FAILURE',
          error: result.error
        });
        res.status(400).json(responseFormatter.error({
          code: result.error?.code || 'VALIDATION_ERROR',
          message: result.error?.message || 'Failed to update profile'
        }));
      }
    });

    // 9. Update Contact Registry
    router.put('/:id/contact', async (req: Request, res: Response) => {
      const { id } = parseStrict(identityIdParamSchema, req.params);
      const body = parseStrict(identityContactUpdateSchema, req.body);
      const result = await updateContactUseCase.execute({ identityId: id, ...body });
      if (result.isSuccess) {
        await AuditHelper.recordMutation(auditRecordRepo, req, {
          action: 'UPDATE_IDENTITY_CONTACT',
          category: 'IDENTITY',
          targetType: 'IDENTITY',
          targetId: id,
          result: 'SUCCESS'
        });
        res.status(200).json(responseFormatter.success(result.getValue()));
      } else {
        await AuditHelper.recordMutation(auditRecordRepo, req, {
          action: 'UPDATE_IDENTITY_CONTACT',
          category: 'IDENTITY',
          targetType: 'IDENTITY',
          targetId: id,
          result: 'FAILURE',
          error: result.error
        });
        res.status(400).json(responseFormatter.error({
          code: result.error?.code || 'VALIDATION_ERROR',
          message: result.error?.message || 'Failed to update contact registry'
        }));
      }
    });

    return router;
  }
}

