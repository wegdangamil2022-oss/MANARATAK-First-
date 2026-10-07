import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ManageRolesUseCase, AssignRoleUseCase, ManageEmergencyAccessUseCase, GetIdentityUseCase, ListIdentitiesUseCase } from '@manaratak/application';
import { AuthorizationEvaluatorService, IAuditRecordRepository, LifeStatus, Role } from '@manaratak/domain';
import { ResponseFormatter } from '../response/ResponseFormatter.js';
import { AuditHelper } from '../../audit/AuditHelper.js';
import type { AdminBootstrapVerifier } from '@manaratak/infrastructure';
import { requireAuthenticatedPrincipal } from '../../security/AuthenticatedPrincipal.js';
import { authorizationRoleAssignmentSchema, authorizationRoleCreateSchema, parseStrict } from '../../validation/StrictControlPlaneSchemas.js';
import { KNOWN_ADMIN_PERMISSIONS } from '../../security/AdminPermissionCatalog.js';

function roleDto(role: Role) {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    permissions: role.permissions.map(permission => permission.value),
    policyIds: role.policyIds,
  };
}

function isHighRiskRole(role: Role): boolean {
  const permissions = role.permissions.map(permission => permission.value);
  return permissions.includes('*')
    || permissions.includes('admin:*')
    || permissions.includes('admin:authorization:manage')
    || permissions.includes('admin:identities:manage');
}

function isNonDelegablePermission(permission: string): boolean {
  return permission === '*' || permission === 'admin:*' || permission === 'admin:authorization:manage'
    || permission === 'admin:identities:manage' || permission === 'admin:credentials:manage';
}

function assertMakerChecker(req: Request, actorId: string): { secondApproverId: string; changeTicket: string } {
  const secondApproverId = String(req.header('x-second-approver-id') || '').trim();
  const changeTicket = String(req.header('x-change-ticket') || '').trim();
  if (!secondApproverId || secondApproverId === actorId) throw new Error('SECOND_APPROVER_REQUIRED_FOR_HIGH_RISK_AUTHORIZATION_CHANGE');
  if (changeTicket.length < 6) throw new Error('CHANGE_TICKET_REQUIRED_FOR_HIGH_RISK_AUTHORIZATION_CHANGE');
  return { secondApproverId, changeTicket };
}

export class AuthorizationAdminRouter {
  public static create({ manageRolesUseCase, assignRoleUseCase, manageEmergencyAccessUseCase, getIdentityUseCase, listIdentitiesUseCase, authEvaluatorService, auditRecordRepo, adminBootstrapVerifier }: {
    manageRolesUseCase: ManageRolesUseCase;
    assignRoleUseCase: AssignRoleUseCase;
    manageEmergencyAccessUseCase: ManageEmergencyAccessUseCase;
    getIdentityUseCase?: GetIdentityUseCase;
    listIdentitiesUseCase?: ListIdentitiesUseCase;
    authEvaluatorService?: AuthorizationEvaluatorService;
    auditRecordRepo?: IAuditRecordRepository;
    adminBootstrapVerifier?: AdminBootstrapVerifier;
  }): Router {
    const router = Router();
    const responseFormatter = new ResponseFormatter('v1');
    const assertDelegablePermissions = async (req: Request, actorId: string, permissions: string[]) => {
      if (!authEvaluatorService) throw new Error('AUTHORIZATION_EVALUATOR_UNAVAILABLE');
      for (const permission of permissions) {
        if (isNonDelegablePermission(permission) || !KNOWN_ADMIN_PERMISSIONS.includes(permission as typeof KNOWN_ADMIN_PERMISSIONS[number])) {
          throw new Error('NON_DELEGABLE_PERMISSION');
        }
        const decision = await authEvaluatorService.evaluatePermission(actorId, permission, {
          ip: req.ip || req.socket?.remoteAddress, requestTime: new Date(), userAgent: req.headers['user-agent'],
        });
        if (!decision.isGranted) throw new Error('ROLE_PERMISSION_EXCEEDS_ACTOR');
      }
    };
    const assertVerifiedIdentity = async (identityId: string) => {
      if (!getIdentityUseCase) throw new Error('IDENTITY_VERIFICATION_UNAVAILABLE');
      const result = await getIdentityUseCase.execute(identityId);
      const identity = result.isSuccess ? result.getValue() : null;
      if (!identity || identity.status !== LifeStatus.ACTIVE || identity.account.accessState !== 'Active'
        || !identity.user?.contactRegistry.isEmailVerified) throw new Error('VERIFIED_ACTIVE_IDENTITY_REQUIRED');
    };
    const verifyMakerChecker = async (req: Request, actorId: string) => {
      const approval = assertMakerChecker(req, actorId);
      await assertVerifiedIdentity(approval.secondApproverId);
      if (!authEvaluatorService) throw new Error('AUTHORIZATION_EVALUATOR_UNAVAILABLE');
      const decision = await authEvaluatorService.evaluatePermission(approval.secondApproverId, 'admin:authorization:manage', {
        ip: req.ip || req.socket?.remoteAddress, requestTime: new Date(), userAgent: req.headers['user-agent'],
      });
      if (!decision.isGranted) throw new Error('SECOND_APPROVER_AUTHORIZATION_REQUIRED');
      return approval;
    };
    const mutationContext = (req: Request, extra?: Record<string, unknown>) => {
      const principal = requireAuthenticatedPrincipal(req);
      return {
        actorId: principal.principalId,
        actorType: principal.actorType,
        correlationId: (req.headers['x-correlation-id'] as string | undefined) || (req.headers['x-request-id'] as string | undefined),
        source: 'admin-authorization-api',
        metadata: extra,
      };
    };

    router.get('/bootstrap-verification', async (_req: Request, res: Response) => {
      if (!adminBootstrapVerifier) {
        res.status(503).json(responseFormatter.success({ status: 'UNAVAILABLE', capability: 'PERSISTED_RBAC_ADMIN_BOOTSTRAP', databaseWrites: 0 }));
        return;
      }
      const report = await adminBootstrapVerifier.verify();
      res.status(report.status === 'UNAVAILABLE' ? 503 : 200).json(responseFormatter.success(report));
    });

    router.get('/permissions', async (req, res, next) => {
      try {
        if (!authEvaluatorService) throw new Error('AUTHORIZATION_EVALUATOR_UNAVAILABLE');
        const actor = requireAuthenticatedPrincipal(req).principalId;
        const candidates = KNOWN_ADMIN_PERMISSIONS.filter(permission => !isNonDelegablePermission(permission));
        const context = { ip: req.ip || req.socket?.remoteAddress, requestTime: new Date(), userAgent: req.headers['user-agent'] };
        const decisions = await Promise.all(candidates.map(permission => authEvaluatorService.evaluatePermission(actor, permission, context)));
        res.status(200).json(responseFormatter.success({ permissions: candidates.filter((_, index) => decisions[index].isGranted) }));
      } catch (error) { next(error); }
    });

    router.get('/eligible-identities', async (req, res, next) => {
      try {
        if (!listIdentitiesUseCase) throw new Error('IDENTITY_LIST_UNAVAILABLE');
        const query = z.object({ limit: z.coerce.number().int().min(1).max(100).default(50), offset: z.coerce.number().int().min(0).default(0) }).strict().parse(req.query);
        const result = await listIdentitiesUseCase.execute({ status: LifeStatus.ACTIVE, ...query });
        if (!result.isSuccess) throw new Error('IDENTITY_LIST_UNAVAILABLE');
        const page = result.getValue();
        // Offset refers to scanned active identities, before eligibility filtering.
        const nextOffset = Math.min(page.total, query.offset + page.items.length);
        res.status(200).json(responseFormatter.success({ identities: page.items.filter(item => item.user?.contactRegistry.isEmailVerified && item.account.accessState === 'Active')
          .map(item => ({ id: item.id, displayName: item.user!.profile.displayName, primaryEmail: item.user!.contactRegistry.primaryEmail,
            isEmailVerified: true })), total: page.total, nextOffset, scannedCount: page.items.length, hasMore: nextOffset < page.total }));
      } catch (error) { next(error); }
    });

    router.get('/assignment-audit', async (_req, res, next) => {
      try {
        if (!auditRecordRepo) throw new Error('AUDIT_REPOSITORY_UNAVAILABLE');
        const actions = ['ROLE_ASSIGNED', 'ROLE_ASSIGNMENT_REVOKED'];
        const pages = await Promise.all(actions.map(action => auditRecordRepo.queryPage({ action, limit: 100 })));
        const events = pages.flatMap(page => page.items).map(record => ({
          action: record.getAction().getValue(), actorId: record.getActor().getActorId(),
          assignmentId: record.getTarget().getTargetId(), timestamp: record.getTimestamp().getValue().toISOString(),
          identityId: record.getContextMetadata().getData().identityId,
          roleId: record.getContextMetadata().getData().roleId,
        })).sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 100);
        res.status(200).json(responseFormatter.success({ events }));
      } catch (error) { next(error); }
    });

    router.get('/roles', async (_req, res, next) => {
      try {
        const roles = await manageRolesUseCase.listRoles();
        res.status(200).json(responseFormatter.success({ roles: roles.map(roleDto) }));
      } catch (error) { next(error); }
    });

    router.post('/roles', async (req: Request, res: Response) => {
      try {
        const body = parseStrict(authorizationRoleCreateSchema, req.body);
        if (!body.permissions.length) throw new Error('ROLE_PERMISSIONS_REQUIRED');
        if (new Set(body.permissions).size !== body.permissions.length) throw new Error('ROLE_DUPLICATE_PERMISSION');
        if (body.policyIds.length) throw new Error('ROLE_POLICY_ASSIGNMENT_NOT_SUPPORTED');
        const actor = requireAuthenticatedPrincipal(req).principalId;
        await assertDelegablePermissions(req, actor, body.permissions);
        const highRisk = body.permissions.some(permission => permission === '*' || permission === 'admin:*' || permission === 'admin:authorization:manage' || permission === 'admin:identities:manage');
        const approval = highRisk ? await verifyMakerChecker(req, actor) : undefined;
        await manageRolesUseCase.createRole(body, mutationContext(req, approval));
        res.status(201).json(responseFormatter.success({ roleId: body.id, message: 'Role created successfully' }));
      } catch (error: any) {
        await AuditHelper.recordMutation(auditRecordRepo, req, { action: 'CREATE_ROLE', category: 'AUTHORIZATION', targetType: 'ROLE', targetId: req.body?.id || req.body?.name, result: 'FAILURE', error });
        res.status(400).json(responseFormatter.error({ code: error?.message || 'VALIDATION_ERROR', message: 'Role request is invalid' }));
      }
    });

    router.get('/roles/:id', async (req: Request, res: Response, next) => {
      try {
        const role = await manageRolesUseCase.getRole(req.params.id);
        if (!role) return void res.status(404).json(responseFormatter.error({ code: 'NOT_FOUND', message: 'Role not found' }));
        res.status(200).json(responseFormatter.success(roleDto(role)));
      } catch (error) { next(error); }
    });

    router.get('/assignments', async (_req, res, next) => {
      try {
        const assignments = await assignRoleUseCase.listAssignments();
        res.status(200).json(responseFormatter.success({ assignments: assignments.map(item => ({ id: item.id, identityId: item.identityId, roleId: item.roleId, assignedAt: item.assignedAt.toISOString() })) }));
      } catch (error) { next(error); }
    });

    router.post('/assignments', async (req: Request, res: Response) => {
      try {
        const body = parseStrict(authorizationRoleAssignmentSchema, req.body);
        const role = await manageRolesUseCase.getRole(body.roleId);
        if (!role) throw new Error('ROLE_NOT_FOUND');
        const actor = requireAuthenticatedPrincipal(req).principalId;
        await assertVerifiedIdentity(body.identityId);
        await assertDelegablePermissions(req, actor, role.permissions.map(permission => permission.value));
        const approval = isHighRiskRole(role) ? await verifyMakerChecker(req, actor) : undefined;
        await assignRoleUseCase.execute(body, mutationContext(req, approval));
        res.status(201).json(responseFormatter.success({ assignmentId: body.id, message: 'Role assigned successfully' }));
      } catch (error: any) {
        await AuditHelper.recordMutation(auditRecordRepo, req, { action: 'ASSIGN_ROLE', category: 'AUTHORIZATION', targetType: 'ROLE_ASSIGNMENT', targetId: req.body?.id || req.body?.identityId || req.body?.roleId, result: 'FAILURE', error });
        res.status(400).json(responseFormatter.error({ code: error?.message || 'VALIDATION_ERROR', message: 'Role assignment request is invalid' }));
      }
    });

    router.delete('/assignments/:id', async (req: Request, res: Response) => {
      try {
        const body = z.object({ reason: z.string().trim().min(6).max(1000) }).strict().parse(req.body ?? {});
        const assignment = await assignRoleUseCase.getAssignment(req.params.id);
        if (!assignment) return void res.status(404).json(responseFormatter.error({ code: 'ROLE_ASSIGNMENT_NOT_FOUND', message: 'Role assignment not found' }));
        const role = await manageRolesUseCase.getRole(assignment.roleId);
        const actor = requireAuthenticatedPrincipal(req).principalId;
        if (!role) throw new Error('ROLE_NOT_FOUND');
        await assertDelegablePermissions(req, actor, role.permissions.map(permission => permission.value));
        const approval = isHighRiskRole(role) ? await verifyMakerChecker(req, actor) : undefined;
        await assignRoleUseCase.revokeAssignment(req.params.id, mutationContext(req, { reason: body.reason, ...approval }));
        res.status(200).json(responseFormatter.success({ assignmentId: req.params.id, revoked: true }));
      } catch (error: any) {
        await AuditHelper.recordMutation(auditRecordRepo, req, { action: 'REVOKE_ROLE_ASSIGNMENT', category: 'AUTHORIZATION', targetType: 'ROLE_ASSIGNMENT', targetId: req.params.id, result: 'FAILURE', error });
        res.status(400).json(responseFormatter.error({ code: error?.message || 'VALIDATION_ERROR', message: 'Role assignment revocation is invalid' }));
      }
    });

    const emergencyGrantSchema = z.object({
      principalId: z.string().trim().min(1).max(240),
      roleId: z.string().trim().min(1).max(240),
      reason: z.string().trim().min(12).max(2000),
      durationMinutes: z.number().int().min(5).max(240),
    }).strict();
    const emergencyRevokeSchema = z.object({ reason: z.string().trim().min(6).max(1000) }).strict();

    router.get('/emergency-access', async (req: Request, res: Response, next) => {
      try {
        const query = z.object({ principalId: z.string().trim().min(1).max(240).optional(), activeOnly: z.enum(['true','false']).optional(), limit: z.coerce.number().int().min(1).max(200).optional() }).strict().parse(req.query);
        const grants = await manageEmergencyAccessUseCase.list({ principalId: query.principalId, activeOnly: query.activeOnly === 'true', limit: query.limit });
        res.status(200).json(responseFormatter.success({ grants }));
      } catch (error) { next(error); }
    });

    router.post('/emergency-access', async (req: Request, res: Response) => {
      try {
        const body = emergencyGrantSchema.parse(req.body);
        const actor = requireAuthenticatedPrincipal(req).principalId;
        const role = await manageRolesUseCase.getRole(body.roleId);
        if (!role) throw new Error('ROLE_NOT_FOUND');
        await assertVerifiedIdentity(body.principalId);
        await assertDelegablePermissions(req, actor, role.permissions.map(permission => permission.value));
        const approval = await verifyMakerChecker(req, actor);
        const grant = await manageEmergencyAccessUseCase.grant({ ...body, requestedBy: actor, approvedBy: approval.secondApproverId, changeTicket: approval.changeTicket }, mutationContext(req));
        res.status(201).json(responseFormatter.success({ grant }));
      } catch (error: any) {
        await AuditHelper.recordMutation(auditRecordRepo, req, { action: 'GRANT_BREAK_GLASS_ACCESS', category: 'AUTHORIZATION', targetType: 'EMERGENCY_ACCESS', targetId: req.body?.principalId, result: 'FAILURE', error });
        res.status(400).json(responseFormatter.error({ code: error?.message || 'EMERGENCY_ACCESS_INVALID', message: 'Emergency access grant is invalid' }));
      }
    });

    router.post('/emergency-access/:id/revoke', async (req: Request, res: Response) => {
      try {
        const body = emergencyRevokeSchema.parse(req.body);
        const actor = requireAuthenticatedPrincipal(req).principalId;
        const grant = await manageEmergencyAccessUseCase.revoke(req.params.id, actor, body.reason, mutationContext(req));
        res.status(200).json(responseFormatter.success({ grant }));
      } catch (error: any) {
        await AuditHelper.recordMutation(auditRecordRepo, req, { action: 'REVOKE_BREAK_GLASS_ACCESS', category: 'AUTHORIZATION', targetType: 'EMERGENCY_ACCESS', targetId: req.params.id, result: 'FAILURE', error });
        res.status(400).json(responseFormatter.error({ code: error?.message || 'EMERGENCY_ACCESS_REVOKE_INVALID', message: 'Emergency access revocation is invalid' }));
      }
    });

    return router;
  }
}
