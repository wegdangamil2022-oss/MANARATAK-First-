import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import {
  InMemoryAuditRecordRepository,
  InMemoryEmergencyAccessRepository,
} from '@manaratak/infrastructure';
import { ManageEmergencyAccessUseCase } from '@manaratak/application';
import { AuditRecord } from '@manaratak/domain';
import { AuthorizationAdminRouter } from '../../../src/presentation/api/router/AuthorizationAdminRouter';
import { SettingsAdminRouter } from '../../../src/presentation/api/router/SettingsAdminRouter';
import { IdentityRouter } from '../../../src/presentation/api/router/IdentityRouter';
import { AssetPlatformRouter } from '../../../src/presentation/api/router/AssetPlatformRouter';

describe('Phase 05 Slice 2: Admin Mutation Audit Hooks', () => {
  let auditRepo: InMemoryAuditRecordRepository;

  beforeEach(() => {
    auditRepo = new InMemoryAuditRecordRepository();
  });

  const getRecords = (): AuditRecord[] => Array.from((auditRepo as any).records.values());

  describe('AuthorizationAdminRouter Audit Hooks', () => {
    let app: Express;
    let mockManageRolesUseCase: any;
    let mockAssignRoleUseCase: any;

    beforeEach(() => {
      mockManageRolesUseCase = {
        createRole: vi.fn().mockResolvedValue({ id: 'role-1' }),
        getRole: vi
          .fn()
          .mockResolvedValue({
            id: 'role-1',
            name: 'Admin',
            description: 'Administrator',
            permissions: [],
            policyIds: [],
          }),
        listRoles: vi.fn().mockResolvedValue([]),
      };
      mockAssignRoleUseCase = {
        execute: vi.fn().mockResolvedValue({ success: true }),
      };

      app = express();
      app.use(express.json());
      app.use((req, _res, next) => {
        req.authUserId = 'admin-user-123';
        next();
      });
      app.use(
        '/api/v1/admin/auth',
        AuthorizationAdminRouter.create({
          manageRolesUseCase: mockManageRolesUseCase,
          assignRoleUseCase: mockAssignRoleUseCase,
          manageEmergencyAccessUseCase: new ManageEmergencyAccessUseCase(
            new InMemoryEmergencyAccessRepository(),
          ),
          auditRecordRepo: auditRepo,
        }),
      );
    });

    it('POST /roles delegates the success audit context to the atomic Application boundary', async () => {
      const res = await request(app)
        .post('/api/v1/admin/auth/roles')
        .set('x-correlation-id', 'corr-roles-1')
        .send({
          id: 'role-super-admin',
          name: 'SUPER_ADMIN',
          description: 'Super administrator',
          permissions: [],
          policyIds: [],
        });

      expect(res.status).toBe(201);
      expect(mockManageRolesUseCase.createRole).toHaveBeenCalledWith(
        {
          id: 'role-super-admin',
          name: 'SUPER_ADMIN',
          description: 'Super administrator',
          permissions: [],
          policyIds: [],
        },
        expect.objectContaining({
          actorId: 'admin-user-123',
          actorType: 'IDENTITY',
          correlationId: 'corr-roles-1',
          source: 'admin-authorization-api',
        }),
      );
      expect(getRecords()).toHaveLength(0);
    });

    it('GET /roles/:id does NOT create audit record', async () => {
      const res = await request(app).get('/api/v1/admin/auth/roles/role-1');

      expect(res.status).toBe(200);
      const records = getRecords();
      expect(records.length).toBe(0);
    });

    it('POST /assignments delegates the success audit context to the atomic Application boundary', async () => {
      const res = await request(app)
        .post('/api/v1/admin/auth/assignments')
        .set('x-actor-id', 'admin-user-123')
        .send({ id: 'assignment-1', roleId: 'role-1', identityId: 'identity-1' });

      expect(res.status).toBe(201);
      expect(mockAssignRoleUseCase.execute).toHaveBeenCalledWith(
        { id: 'assignment-1', roleId: 'role-1', identityId: 'identity-1' },
        expect.objectContaining({
          actorId: 'admin-user-123',
          actorType: 'IDENTITY',
          source: 'admin-authorization-api',
        }),
      );
      expect(getRecords()).toHaveLength(0);
    });
  });

  describe('SettingsAdminRouter Audit Hooks', () => {
    let app: Express;
    let mockManageSettingsUseCase: any;

    beforeEach(() => {
      mockManageSettingsUseCase = {
        createDefinition: vi.fn().mockResolvedValue(undefined),
        assignValue: vi.fn().mockResolvedValue(undefined),
        rollbackValue: vi.fn().mockResolvedValue(undefined),
      };

      app = express();
      app.use(express.json());
      app.use((req, _res, next) => {
        req.authUserId = 'admin-1';
        next();
      });
      app.use(
        '/api/v1/admin/settings',
        SettingsAdminRouter.create({
          manageSettingsUseCase: mockManageSettingsUseCase,
          auditRecordRepo: auditRepo,
        }),
      );
    });

    it('POST /definitions creates audit record', async () => {
      const res = await request(app).post('/api/v1/admin/settings/definitions').send({
        id: 'def-1',
        key: 'system.timeout',
        valueType: 'Number',
        isSecret: false,
      });

      expect(res.status).toBe(201);
      const records = getRecords();
      expect(records.length).toBe(1);
      expect(records[0].getAction().getValue()).toBe('CREATE_SETTING_DEFINITION');
      expect(records[0].getTarget().getTargetType()).toBe('SETTING_DEFINITION');
    });

    it('POST /assignments/rollback creates audit record', async () => {
      const res = await request(app).post('/api/v1/admin/settings/assignments/rollback').send({
        assignmentId: 'assign-100',
        previousVersionId: 'v-1',
        newVersionId: 'v-2',
      });

      expect(res.status).toBe(200);
      const records = getRecords();
      expect(records.length).toBe(1);
      expect(records[0].getAction().getValue()).toBe('ROLLBACK_SETTING_VALUE');
    });
  });

  describe('IdentityRouter Audit Hooks', () => {
    let app: Express;
    let mockIdentityUseCases: any;

    beforeEach(() => {
      mockIdentityUseCases = {
        provisionIdentityUseCase: {
          execute: vi
            .fn()
            .mockResolvedValue({ isSuccess: true, getValue: () => ({ id: 'ident-123' }) }),
        },
        activateIdentityUseCase: {
          execute: vi
            .fn()
            .mockResolvedValue({ isSuccess: true, getValue: () => ({ status: 'ACTIVE' }) }),
        },
        suspendIdentityUseCase: {
          execute: vi
            .fn()
            .mockResolvedValue({ isSuccess: true, getValue: () => ({ status: 'SUSPENDED' }) }),
        },
        archiveIdentityUseCase: {
          execute: vi
            .fn()
            .mockResolvedValue({ isSuccess: true, getValue: () => ({ status: 'ARCHIVED' }) }),
        },
        purgeIdentityUseCase: {
          execute: vi
            .fn()
            .mockResolvedValue({ isSuccess: true, getValue: () => ({ status: 'PURGED' }) }),
        },
        updateProfileUseCase: {
          execute: vi
            .fn()
            .mockResolvedValue({ isSuccess: true, getValue: () => ({ displayName: 'Jane' }) }),
        },
        updateContactUseCase: {
          execute: vi
            .fn()
            .mockResolvedValue({
              isSuccess: true,
              getValue: () => ({ email: 'jane@example.com' }),
            }),
        },
        getIdentityUseCase: {
          execute: vi
            .fn()
            .mockResolvedValue({ isSuccess: true, getValue: () => ({ id: 'ident-123' }) }),
        },
        listIdentitiesUseCase: {
          execute: vi.fn().mockResolvedValue({ isSuccess: true, getValue: () => [] }),
        },
      };

      app = express();
      app.use(express.json());
      app.use((req, _res, next) => {
        req.authUserId = 'admin-identity-1';
        next();
      });
      app.use(
        '/api/v1/identities',
        IdentityRouter.create({
          ...mockIdentityUseCases,
          auditRecordRepo: auditRepo,
        }),
      );
    });

    it('POST / (provision) creates audit record', async () => {
      const res = await request(app)
        .post('/api/v1/identities')
        .send({ type: 'Human', primaryEmail: 'user@example.com' });

      expect(res.status).toBe(201);
      const records = getRecords();
      expect(records.length).toBe(1);
      expect(records[0].getAction().getValue()).toBe('PROVISION_IDENTITY');
    });

    it('GET /:id does NOT create audit record', async () => {
      const res = await request(app).get('/api/v1/identities/ident-123');

      expect(res.status).toBe(200);
      const records = getRecords();
      expect(records.length).toBe(0);
    });

    it('POST /:id/suspend creates audit record', async () => {
      const res = await request(app)
        .post('/api/v1/identities/ident-123/suspend')
        .send({ reason: 'Security violation' });

      expect(res.status).toBe(200);
      const records = getRecords();
      expect(records.length).toBe(1);
      expect(records[0].getAction().getValue()).toBe('SUSPEND_IDENTITY');
      expect(records[0].getTarget().getTargetId()).toBe('ident-123');
    });
  });

  describe('AssetPlatformRouter Audit Hooks', () => {
    let app: Express;
    let mockIngestUseCase: any;
    let mockLifecycleUseCase: any;

    beforeEach(() => {
      mockIngestUseCase = {
        requestUploadLocator: vi.fn().mockResolvedValue({ uploadUrl: 'http://upload' }),
        registerQuarantinedAsset: vi.fn().mockResolvedValue({ status: 'QUARANTINED' }),
      };
      mockLifecycleUseCase = {
        validateAsset: vi.fn().mockResolvedValue({ status: 'VALIDATED' }),
        markMalwareScanFailed: vi.fn().mockResolvedValue({ status: 'FAILED' }),
        sanitizeAsset: vi.fn().mockResolvedValue({ status: 'SANITIZED' }),
        activateAsset: vi.fn().mockResolvedValue({ status: 'ACTIVE' }),
        archiveAsset: vi.fn().mockResolvedValue({ status: 'ARCHIVED' }),
        softDeleteAsset: vi.fn().mockResolvedValue({ status: 'DELETED' }),
        restoreAsset: vi.fn().mockResolvedValue({ status: 'ACTIVE' }),
        purgeAsset: vi.fn().mockResolvedValue(undefined),
      };

      app = express();
      app.use(express.json());
      app.use(
        '/api/v1/assets',
        AssetPlatformRouter.create({
          ingestAssetUseCase: mockIngestUseCase,
          processAssetLifecycleUseCase: mockLifecycleUseCase,
          auditRecordRepo: auditRepo,
        }),
      );
    });

    it('POST /upload-locator creates audit record', async () => {
      const res = await request(app).post('/api/v1/assets/upload-locator').send({
        assetId: 'asset-99',
        assetReference: 'ref-99',
        ownerId: 'owner-1',
        ownerType: 'USER',
        originalFilename: 'doc.pdf',
        mimeType: 'application/pdf',
        fileExtension: 'pdf',
        byteSize: 1024,
        classification: 'INTERNAL',
      });

      expect(res.status).toBe(201);
      const records = getRecords();
      expect(records.length).toBe(1);
      expect(records[0].getAction().getValue()).toBe('REQUEST_ASSET_UPLOAD');
      expect(records[0].getTarget().getTargetId()).toBe('asset-99');
    });

    it('POST /:assetId/validate creates audit record', async () => {
      const res = await request(app).post('/api/v1/assets/asset-99/validate');

      expect(res.status).toBe(200);
      const records = getRecords();
      expect(records.length).toBe(1);
      expect(records[0].getAction().getValue()).toBe('VALIDATE_ASSET');
    });
  });

  describe('Non-blocking Audit Behavior & Secret Redaction', () => {
    it('primary operation succeeds even if auditRepo.save fails', async () => {
      const failingRepo: any = {
        save: vi.fn().mockRejectedValue(new Error('Database Connection Failed')),
      };

      const mockManageSettingsUseCase = {
        createDefinition: vi.fn().mockResolvedValue(undefined),
      };

      const app = express();
      app.use(express.json());
      app.use((req, _res, next) => {
        req.authUserId = 'admin-1';
        next();
      });
      app.use(
        '/api/v1/admin/settings',
        SettingsAdminRouter.create({
          manageSettingsUseCase: mockManageSettingsUseCase as any,
          auditRecordRepo: failingRepo,
        }),
      );

      const res = await request(app).post('/api/v1/admin/settings/definitions').send({
        id: 'def-1',
        key: 'system.timeout',
        valueType: 'Number',
      });

      expect(res.status).toBe(201);
      expect(mockManageSettingsUseCase.createDefinition).toHaveBeenCalled();
      expect(failingRepo.save).toHaveBeenCalled();
    });
  });
});
