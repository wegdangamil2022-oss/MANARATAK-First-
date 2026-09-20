import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ManageRolesUseCase, AssignRoleUseCase, ManageEmergencyAccessUseCase } from '@manaratak/application';
import { IAuditRecordRepository, Role } from '@manaratak/domain';
import { ResponseFormatter } from '../response/ResponseFormatter.js';
import { AuditHelper } from '../../audit/AuditHelper.js';
import type { AdminBootstrapVerifier } from '@manaratak/infrastructure';
import { requireAuthenticatedPrincipal } from '../../security/AuthenticatedPrincipal.js';
import { authorizationRoleAssignmentSchema, authorizationRoleCreateSchema, parseStrict } from '../../validation/StrictControlPlaneSchemas.js';

const KNOWN_ADMIN_PERMISSIONS = [
  'admin:identities:manage', 'admin:authorization:manage', 'admin:audit:manage', 'admin:assets:manage',
  'admin:imports:manage', 'admin:reference-data:manage', 'admin:academic-taxonomy:manage',
  'admin:international-tests:manage', 'admin:universities:manage', 'admin:majors:manage',
  'admin:scholarships:manage', 'admin:courses:manage', 'admin:certificates:view',
  'admin:certificates:templates:author', 'admin:certificates:templates:approve',
  'admin:certificates:lifecycle:manage', 'admin:certificates:issuers:manage', 'admin:students:support', 'admin:students:support:mutate', 'admin:student-tools:manage',
  'admin:cms:manage', 'admin:services:manage', 'admin:finance:manage', 'admin:careers:manage',
  'admin:ai:manage', 'admin:settings:manage', 'admin:platform:manage',
] as const;

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

function assertMakerChecker(req: Request, actorId: string): { secondApproverId: string; changeTicket: string } {
  const secondApproverId = String(req.header('x-second-approver-id') || '').trim();
  const changeTicket = String(req.header('x-change-ticket') || '').trim();
  if (!secondApproverId || secondApproverId === actorId) throw new Error('SECOND_APPROVER_REQUIRED_FOR_HIGH_RISK_AUTHORIZATION_CHANGE');
  if (changeTicket.length < 6) throw new Error('CHANGE_TICKET_REQUIRED_FOR_HIGH_RISK_AUTHORIZATION_CHANGE');
  return { secondApproverId, changeTicket };
}

export class AuthorizationAdminRouter {
  public static create({ manageRolesUseCase, assignRoleUseCase, manageEmergencyAccessUseCase, auditRecordRepo, adminBootstrapVerifier }: {
    manageRolesUseCase: ManageRolesUseCase;
    assignRoleUseCase: AssignRoleUseCase;
    manageEmergencyAccessUseCase: ManageEmergencyAccessUseCase;
    auditRecordRepo?: IAuditRecordRepository;
    adminBootstrapVerifier?: AdminBootstrapVerifier;
  }): Router {
    const router = Router();
    const responseFormatter = new ResponseFormatter('v1');
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

    router.get('/permissions', (_req, res) => {
      res.status(200).json(responseFormatter.success({ permissions: KNOWN_ADMIN_PERMISSIONS }));
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
        const actor = requireAuthenticatedPrincipal(req).principalId;
        const highRisk = body.permissions.some(permission => permission === '*' || permission === 'admin:*' || permission === 'admin:authorization:manage' || permission === 'admin:identities:manage');
        const approval = highRisk ? assertMakerChecker(req, actor) : undefined;
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
        const approval = isHighRiskRole(role) ? assertMakerChecker(req, actor) : undefined;
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
        const approval = role && isHighRiskRole(role) ? assertMakerChecker(req, actor) : undefined;
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
        const approval = assertMakerChecker(req, actor);
        const grant = await manageEmergencyAccessUseCase.grant({ ...body, requestedBy: actor, approvedBy: approval.secondApproverId, changeTicket: approval.changeTicket });
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
        const grant = await manageEmergencyAccessUseCase.revoke(req.params.id, actor, body.reason);
        res.status(200).json(responseFormatter.success({ grant }));
      } catch (error: any) {
        await AuditHelper.recordMutation(auditRecordRepo, req, { action: 'REVOKE_BREAK_GLASS_ACCESS', category: 'AUTHORIZATION', targetType: 'EMERGENCY_ACCESS', targetId: req.params.id, result: 'FAILURE', error });
        res.status(400).json(responseFormatter.error({ code: error?.message || 'EMERGENCY_ACCESS_REVOKE_INVALID', message: 'Emergency access revocation is invalid' }));
      }
    });

    return router;
  }
}
