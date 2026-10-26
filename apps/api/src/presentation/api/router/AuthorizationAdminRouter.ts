import { Router, Request, Response, NextFunction } from 'express';
import { IPrincipalAccessValidator } from '@manaratak/core';
import { sendAuthorizationError } from '../../security/AuthorizationErrorResponse.js';
import { z } from 'zod';
import { ADMIN_PERMISSION_CATALOG } from '@manaratak/shared';
import {
  ManageRolesUseCase,
  AuthorizationGovernanceUseCases,
  GovernanceApprovalUseCases,
  MfaUseCases,
  ManagePoliciesUseCase,
  AssignRoleUseCase,
  ManageEmergencyAccessUseCase,
  GetIdentityUseCase,
  ListIdentitiesUseCase,
} from '@manaratak/application';
import {
  AuthorizationEvaluatorService,
  IAuditRecordRepository,
  IPolicyEvaluator,
  LifeStatus,
  Role,
  ResourceUrn,
  Action,
} from '@manaratak/domain';
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
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
    revision: role.revision,
    status: role.permissions.length ? 'ACTIVE' : 'RETIRED',
  };
}

function highRiskPermission(permission: string): boolean {
  return (
    ['*', 'admin:*'].includes(permission) ||
    ADMIN_PERMISSION_CATALOG.some((entry) => entry.key === permission && entry.risk !== 'STANDARD')
  );
}
function isHighRiskRole(role: Role): boolean {
  return role.permissions.some((permission) => highRiskPermission(permission.value));
}

function isNonDelegablePermission(permission: string): boolean {
  return (
    permission === '*' || permission === 'admin:*' || permission === 'admin:authorization:manage'
    || permission === 'admin:identities:manage' || permission === 'admin:credentials:manage'
  );
}

function assertMakerChecker(req: Request, actorId: string): { secondApproverId: string; changeTicket: string } {
  const secondApproverId = String(req.header('x-second-approver-id') || '').trim();
  const changeTicket = String(req.header('x-change-ticket') || '').trim();
  if (!secondApproverId || secondApproverId === actorId) throw new Error('SECOND_APPROVER_REQUIRED_FOR_HIGH_RISK_AUTHORIZATION_CHANGE');
  if (changeTicket.length < 6) throw new Error('CHANGE_TICKET_REQUIRED_FOR_HIGH_RISK_AUTHORIZATION_CHANGE');
  return { secondApproverId, changeTicket };
}

export class AuthorizationAdminRouter {
  public static create({
    authorizationGovernanceUseCases,
    governanceApprovalUseCases,
    mfaUseCases,
    principalAccessValidator,
    managePoliciesUseCase,
    policyEvaluator,
    manageRolesUseCase,
    assignRoleUseCase,
    manageEmergencyAccessUseCase,
    getIdentityUseCase,
    listIdentitiesUseCase,
    authEvaluatorService,
    auditRecordRepo,
    adminBootstrapVerifier,
  }: {
    authorizationGovernanceUseCases?: AuthorizationGovernanceUseCases;
    governanceApprovalUseCases?: GovernanceApprovalUseCases;
    mfaUseCases?: MfaUseCases;
    principalAccessValidator?: IPrincipalAccessValidator;
    managePoliciesUseCase?: ManagePoliciesUseCase;
    policyEvaluator?: IPolicyEvaluator;
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
    const assertDelegablePermissions = async (
      req: Request,
      actorId: string,
      permissions: string[],
    ) => {
      if (!authEvaluatorService) throw new Error('AUTHORIZATION_EVALUATOR_UNAVAILABLE');
      for (const permission of permissions) {
        if (
          isNonDelegablePermission(permission) ||
          !KNOWN_ADMIN_PERMISSIONS.includes(permission as (typeof KNOWN_ADMIN_PERMISSIONS)[number])
        ) {
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
    const permittedPolicyPermissions = async (req: Request) => {
      if (!authEvaluatorService) throw new Error('AUTHORIZATION_EVALUATOR_UNAVAILABLE');
      const actor = requireAuthenticatedPrincipal(req).principalId;
      const candidates = KNOWN_ADMIN_PERMISSIONS.filter(permission => !isNonDelegablePermission(permission));
      const context = {ip: req.ip || req.socket?.remoteAddress,requestTime: new Date()};
      const decisions = await Promise.all(candidates.map(permission => authEvaluatorService.evaluatePermission(actor, permission, context)));
      return candidates.filter((_, index) => decisions[index].isGranted);
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


    router.get('/governance/approvals',async(req,res,next)=>{try{
      if(!governanceApprovalUseCases)throw new Error('GOVERNANCE_APPROVAL_UNAVAILABLE');
      const query=z.object({limit:z.coerce.number().int().min(1).max(100).default(25),cursor:z.string().min(1).max(240).optional()}).strict().parse(req.query);
      const actorId=requireAuthenticatedPrincipal(req).principalId;
      res.json(responseFormatter.success({actorId,...await governanceApprovalUseCases.list(actorId,query.limit,query.cursor)}));
    }catch(error){next(error);}});
    router.post('/governance/approvals',async(req,res,next)=>{try{
      if(!governanceApprovalUseCases)throw new Error('GOVERNANCE_APPROVAL_UNAVAILABLE');
      const body=z.object({id:z.string().min(1).max(120),scope:z.enum(['DUTY_POLICY','DUTY_EXCEPTION','MFA_RESET','TRANSLATION_TRANSFER','TRANSLATION_PUBLICATION']),approverId:z.string().min(1).max(240),payload:z.unknown()}).strict().parse(req.body);
      const actor=requireAuthenticatedPrincipal(req).principalId;
      const approval=await verifyMakerChecker(req,actor);if(approval.secondApproverId!==body.approverId)throw new Error('GOVERNANCE_APPROVAL_INVALID');
      const ticket=z.string().trim().min(6).max(240);
      if(body.scope==='DUTY_POLICY')body.payload=z.object({pairs:z.array(z.object({id:z.string().min(1).max(80),first:z.enum(KNOWN_ADMIN_PERMISSIONS),second:z.enum(KNOWN_ADMIN_PERMISSIONS),description:z.string().max(500)}).strict()).max(100),expectedRevision:z.string().datetime().nullable(),reason:z.string().trim().min(6).max(2000),changeTicket:ticket}).strict().parse(body.payload);
      if(body.scope==='DUTY_EXCEPTION')body.payload=z.object({id:z.string().min(1).max(120),principalId:z.string().min(1).max(240),pairIds:z.array(z.string().min(1).max(80)).min(1).max(100),policyRevision:z.string().datetime(),startsAt:z.string().datetime(),expiresAt:z.string().datetime(),reason:z.string().trim().min(12).max(2000),changeTicket:ticket}).strict().parse(body.payload);
      if(body.scope==='TRANSLATION_TRANSFER' || body.scope==='TRANSLATION_PUBLICATION') {
        const parsed=z.object({target:z.object({locator:z.object({entityKind:z.enum(['UNIVERSITY','MAJOR'])}).passthrough()}).passthrough()}).passthrough().parse(body.payload);
        const grant=parsed.target.locator.entityKind==='UNIVERSITY'?'admin:universities:manage':'admin:majors:manage';
        for(const principal of [actor,body.approverId])if(!authEvaluatorService || !(await authEvaluatorService.evaluatePermission(principal,grant,{requestTime:new Date()})).isGranted)throw new Error('GOVERNANCE_APPROVAL_DENIED');
      }
      if(body.scope==='MFA_RESET'){
        body.payload=z.object({identityId:z.string().min(1).max(240),reason:z.string().trim().min(12).max(2000),changeTicket:ticket}).strict().parse(body.payload);
        if(!authEvaluatorService || !(await authEvaluatorService.evaluatePermission(actor,'admin:credentials:manage',{requestTime:new Date()})).isGranted || !(await authEvaluatorService.evaluatePermission(body.approverId,'admin:credentials:manage',{requestTime:new Date()})).isGranted)throw new Error('GOVERNANCE_APPROVAL_DENIED');
      }
      res.status(201).json(responseFormatter.success(await governanceApprovalUseCases.request(body,mutationContext(req))));
    }catch(error){next(error);}});
    router.post('/governance/approvals/:id/approve',async(req,res,next)=>{try{
      if(!governanceApprovalUseCases)throw new Error('GOVERNANCE_APPROVAL_UNAVAILABLE');z.object({}).strict().parse(req.body??{});
      await governanceApprovalUseCases.approve(z.string().min(1).max(120).parse(req.params.id),mutationContext(req));res.json(responseFormatter.success({approved:true}));
    }catch(error){next(error);}});
    router.post('/governance/mfa-reset',async(req,res,next)=>{try{
      if(!mfaUseCases||!authEvaluatorService)throw new Error('MFA_UNAVAILABLE');
      const actor=requireAuthenticatedPrincipal(req).principalId;
      const body=z.object({identityId:z.string().min(1).max(240),reason:z.string().trim().min(12).max(2000)}).strict().parse(req.body);
      const approval=await verifyMakerChecker(req,actor);await assertVerifiedIdentity(body.identityId);
      for(const principal of [actor,approval.secondApproverId])if(!(await authEvaluatorService.evaluatePermission(principal,'admin:credentials:manage',{requestTime:new Date()})).isGranted)throw new Error('GOVERNANCE_APPROVAL_DENIED');
      await mfaUseCases.adminReset(body.identityId,actor,approval.secondApproverId,body.reason,req.header('x-governance-approval-id')??'',approval.changeTicket);
      res.json(responseFormatter.success({reset:true}));
    }catch(error){next(error);}});

    router.get('/governance/duties', async (_req, res, next) => {
      try { if (!authorizationGovernanceUseCases) throw new Error('AUTHORIZATION_GOVERNANCE_UNAVAILABLE');
        res.json(responseFormatter.success(await authorizationGovernanceUseCases.policy()));
      } catch (error) { next(error); }
    });
    router.get('/governance/duties/preview', async (req, res, next) => {
      try { if (!authorizationGovernanceUseCases) throw new Error('AUTHORIZATION_GOVERNANCE_UNAVAILABLE');
        const body = z.object({ principalId: z.string().min(1).max(240), roleId: z.string().min(1).max(240) }).strict().parse(req.query);
        await assertVerifiedIdentity(body.principalId);
        res.json(responseFormatter.success(await authorizationGovernanceUseCases.preview(body.principalId, body.roleId)));
      } catch (error) { next(error); }
    });
    router.put('/governance/duties', async (req, res, next) => {
      try { if (!authorizationGovernanceUseCases) throw new Error('AUTHORIZATION_GOVERNANCE_UNAVAILABLE');
        const body = z.object({ pairs: z.array(z.object({ id: z.string().min(1).max(80), first: z.enum(KNOWN_ADMIN_PERMISSIONS), second: z.enum(KNOWN_ADMIN_PERMISSIONS), description: z.string().max(500) }).strict()).max(100), expectedRevision: z.string().datetime().nullable(), reason: z.string().trim().min(6).max(2000) }).strict().parse(req.body);
        const actor = requireAuthenticatedPrincipal(req).principalId;
        const approval = await verifyMakerChecker(req, actor);
        await authorizationGovernanceUseCases.configure({ ...body, approvedBy: approval.secondApproverId, changeTicket: approval.changeTicket, approvalId: req.header('x-governance-approval-id') ?? '' }, mutationContext(req, approval));
        res.json(responseFormatter.success(await authorizationGovernanceUseCases.policy()));
      } catch (error) { next(error); }
    });
    router.post('/governance/duties/exceptions', async (req, res, next) => {
      try { if (!authorizationGovernanceUseCases) throw new Error('AUTHORIZATION_GOVERNANCE_UNAVAILABLE');
        const body = z.object({ id: z.string().min(1).max(120), principalId: z.string().min(1).max(240), pairIds: z.array(z.string().min(1).max(80)).min(1).max(100), policyRevision: z.string().datetime(), startsAt: z.string().datetime(), expiresAt: z.string().datetime(), reason: z.string().trim().min(12).max(2000) }).strict().parse(req.body);
        const approval = await verifyMakerChecker(req, requireAuthenticatedPrincipal(req).principalId);
        await assertVerifiedIdentity(body.principalId);
        await authorizationGovernanceUseCases.exception({ ...body, approvedBy: approval.secondApproverId, changeTicket: approval.changeTicket, approvalId: req.header('x-governance-approval-id') ?? '' }, mutationContext(req, approval));
        res.status(201).json(responseFormatter.success({ id: body.id }));
      } catch (error) { next(error); }
    });
    router.get('/governance/duties/exceptions',async(req,res,next)=>{try{
      if(!authorizationGovernanceUseCases)throw new Error('AUTHORIZATION_GOVERNANCE_UNAVAILABLE');
      const query=z.object({limit:z.coerce.number().int().min(1).max(100).default(25),cursor:z.string().min(1).max(240).optional()}).strict().parse(req.query);
      res.json(responseFormatter.success(await authorizationGovernanceUseCases.exceptions(query.limit,query.cursor)));
    }catch(error){next(error);}});
    router.post('/governance/duties/exceptions/:id/revoke',async(req,res,next)=>{try{
      if(!authorizationGovernanceUseCases)throw new Error('AUTHORIZATION_GOVERNANCE_UNAVAILABLE');
      const body=z.object({reason:z.string().trim().min(6).max(2000)}).strict().parse(req.body);
      const revoked=await authorizationGovernanceUseCases.revokeException(z.string().min(1).max(120).parse(req.params.id),body.reason,mutationContext(req));res.json(responseFormatter.success({revoked}));
    }catch(error){next(error);}});
    router.get('/governance/access-reviews/subjects/:principalId', async (req, res, next) => {
      try {
        const principalId = z.string().min(1).max(240).parse(req.params.principalId);
        if (!authorizationGovernanceUseCases) throw new Error('AUTHORIZATION_GOVERNANCE_UNAVAILABLE');
        await assertVerifiedIdentity(principalId);
        res.json(responseFormatter.success(await authorizationGovernanceUseCases.reviewSubject(principalId)));
      } catch (error) { next(error); }
    });
    router.get('/governance/access-reviews', async (req, res, next) => {
      try { if (!authorizationGovernanceUseCases) throw new Error('AUTHORIZATION_GOVERNANCE_UNAVAILABLE');
        const query = z.object({ limit: z.coerce.number().int().min(1).max(100).default(25), cursor: z.string().min(1).max(240).optional(), dueOnly: z.enum(['true']).optional() }).strict().parse(req.query);
        res.json(responseFormatter.success(await authorizationGovernanceUseCases.reviews({ ...query, dueOnly: query.dueOnly === 'true' })));
      } catch (error) { next(error); }
    });
    router.post('/governance/access-reviews', async (req, res, next) => {
      try { if (!authorizationGovernanceUseCases) throw new Error('AUTHORIZATION_GOVERNANCE_UNAVAILABLE');
        const body = z.object({ id: z.string().min(1).max(120), principalId: z.string().min(1).max(240), roleIds: z.array(z.string().min(1).max(240)).max(200), nextReviewAt: z.string().datetime(), decision: z.enum(['KEEP', 'REVOKE_REQUIRED']), reason: z.string().trim().min(6).max(2000) }).strict().parse(req.body);
        await authorizationGovernanceUseCases.review(body, mutationContext(req));
        res.status(201).json(responseFormatter.success({ id: body.id }));
      } catch (error) { next(error); }
    });

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
        const permissions = candidates.filter((_, index) => decisions[index].isGranted);
        res.status(200).json(
          responseFormatter.success({
            permissions,
            catalog: ADMIN_PERMISSION_CATALOG.filter((entry) => permissions.includes(entry.key)),
          }),
        );
      } catch (error) { next(error); }
    });

    router.get('/eligible-identities', async (req, res, next) => {
      try {
        if (!listIdentitiesUseCase) throw new Error('IDENTITY_LIST_UNAVAILABLE');
        const query = z.object({
            limit: z.coerce.number().int().min(1).max(100).default(50),
            offset: z.coerce.number().int().min(0).default(0),
            search: z.string().trim().max(240).optional(),
            cursor: z.string().max(240).optional(),
            approver: z.enum(['true']).optional(),
          })
          .strict()
          .parse(req.query);
        const result = await listIdentitiesUseCase.execute({
          status: LifeStatus.ACTIVE,
          verified: true,
          limit: query.limit,
          offset: query.offset,
          cursor: query.cursor,
          search: query.search,
        });
        if (!result.isSuccess) throw new Error('IDENTITY_LIST_UNAVAILABLE');
        const page = result.getValue();
        // Offset refers to scanned active identities, before eligibility filtering.
        const nextOffset = Math.min(page.total, query.offset + page.items.length);
        let eligible = page.items.filter(item => item.user?.contactRegistry.isEmailVerified && item.account.accessState === 'Active');
        if (query.approver) {
          const actor = requireAuthenticatedPrincipal(req).principalId;
          if (!authEvaluatorService) throw new Error('AUTHORIZATION_EVALUATOR_UNAVAILABLE');
          const decisions = await Promise.all(
            eligible.map((item) =>
              authEvaluatorService.evaluatePermission(item.id, 'admin:authorization:manage', {
                ip: req.ip || req.socket?.remoteAddress,
                requestTime: new Date(),
              }),
            ),
          );
          eligible = eligible.filter(
            (item, index) => item.id !== actor && decisions[index].isGranted,
          );
        }
        res.status(200).json(
          responseFormatter.success({
            identities: eligible.map(item => ({ id: item.id, displayName: item.user!.profile.displayName, primaryEmail: item.user!.contactRegistry.primaryEmail,
            isEmailVerified: true })),
            total: page.total,
            nextOffset,
            nextCursor:
              query.cursor !== undefined && page.items.length === query.limit
                ? page.items.at(-1)!.id
                : null,
            scannedCount: page.items.length,
            hasMore: nextOffset < page.total,
          }),
        );
      } catch (error) { next(error); }
    });

    const auditQuery = z.object({
        category: z.enum(['AUTHORIZATION_MUTATION', 'AUTHORIZATION'])
          .default('AUTHORIZATION_MUTATION'),
        limit: z.coerce.number().int().min(1).max(100).default(25),
        actorId: z.string().trim().min(1).max(240).optional(),
        targetId: z.string().trim().min(1).max(240).optional(),
        action: z.string().trim().min(1).max(120).optional(),
        from: z.string().datetime().optional(),
        until: z.string().datetime().optional(),
        cursorTime: z.string().datetime().optional(),
        cursorId: z.string().trim().min(1).max(240).optional(),
      })
      .strict()
      .refine(
        (q) => Boolean(q.cursorTime) === Boolean(q.cursorId),
        'Both cursor fields are required',
      );
    router.get('/assignment-audit', async (req, res, next) => {
      try {
        if (!auditRecordRepo) throw new Error('AUDIT_REPOSITORY_UNAVAILABLE');
        const q = auditQuery.parse(req.query);
        const page = await auditRecordRepo.queryPage({
          category: q.category,
          actorId: q.actorId,
          targetId: q.targetId,
          action: q.action,
          from: q.from ? new Date(q.from) : undefined,
          until: q.until ? new Date(q.until) : undefined,
          limit: q.limit,
          cursor:
            q.cursorTime && q.cursorId
              ? { timestamp: new Date(q.cursorTime), id: q.cursorId }
              : undefined,
        });
        const events = page.items.map((record) => ({
          action: record.getAction().getValue(),
          actorId: record.getActor().getActorId(),
          assignmentId: record.getTarget().getTargetId(),
          targetId: record.getTarget().getTargetId(),
          timestamp: record.getTimestamp().getValue().toISOString(),
          identityId: record.getContextMetadata().getData().identityId,
          roleId: record.getContextMetadata().getData().roleId,
        }));
        res.status(200).json(
          responseFormatter.success({
            events,
            hasMore: page.hasMore,
            nextCursor: page.nextCursor,
          }),
        );
      } catch (error) { next(error); }
    });

    router.get('/effective-access/:identityId', async (req, res, next) => {
      try {
        if (!authEvaluatorService || !getIdentityUseCase)
          throw new Error('AUTHORIZATION_EVALUATOR_UNAVAILABLE');
        const query = z.object({
            permission: z.enum(KNOWN_ADMIN_PERMISSIONS as [string, ...string[]]).optional(),
          })
          .strict()
          .parse(req.query);
        const result = await getIdentityUseCase.execute(req.params.identityId);
        if (!result.isSuccess) throw new Error('IDENTITY_NOT_FOUND');
        const identity = result.getValue();
        if (!principalAccessValidator) throw new Error('IDENTITY_ACCESS_VALIDATOR_UNAVAILABLE');
        const eligible = await principalAccessValidator.isAuthenticationAllowed(identity.id);
        const permissions = query.permission ? [query.permission] : KNOWN_ADMIN_PERMISSIONS;
        const context = { ip: req.ip || req.socket?.remoteAddress, requestTime: new Date() };
        const decisions = await Promise.all(
          permissions.map(async (permission) => {
            if (!eligible)
              return { permission, granted: false, reasons: ['IDENTITY_NOT_ELIGIBLE'] };
            const decision = await authEvaluatorService.evaluatePermission(
              identity.id,
              permission,
              context,
            );
            return { permission, granted: decision.isGranted, reasons: decision.reasons };
          }),
        );
        res.status(200).json(
          responseFormatter.success({
            identityId: identity.id,
            status: identity.status,
            eligible,
            evaluatedAt: context.requestTime.toISOString(),
            roles: await authEvaluatorService.describeIdentityAccess(identity.id, context),
            decisions,
          }),
        );
      } catch (error) { next(error); }
    });

    const policyDefinitionSchema = z.object({
        name: z.string().trim().min(1).max(240),
        description: z.string().trim().max(2000),
        ruleType: z.enum(['TIME', 'IP', 'COURSE_SCOPE']),
        configuration: z.object({
            start: z.string().optional(),
            end: z.string().optional(),
            timezone: z.string().max(120).optional(),
            daysOfWeek: z.array(z.number().int().min(0).max(6)).max(7).optional(),
            allowedIps: z.array(z.string().max(60)).max(100).optional(),
              courseIds: z.array(z.string().uuid()).min(1).max(100).optional(),
          })
          .strict(),
      })
      .strict();
    const policyDto = (policy: import('@manaratak/domain').Policy) => ({
      id: policy.id,
      name: policy.name,
      description: policy.description,
      ruleType: policy.ruleType,
      configuration: policy.ruleConfiguration,
      revision: policy.revision,
    });
    router.get('/policies', async (req, res, next) => {
      try {
        if (!managePoliciesUseCase) throw new Error('POLICY_MANAGEMENT_UNAVAILABLE');
        const q = z.object({
            limit: z.coerce.number().int().min(1).max(100).default(25),
            cursor: z.string().min(1).max(240).optional(),
          })
          .strict()
          .parse(req.query);
        const page = await managePoliciesUseCase.page(q);
        res.json(
          responseFormatter.success({
            policies: page.items.map(policyDto),
            nextCursor: page.nextCursor,
          }),
        );
      } catch (error) { next(error); }
    });
    router.get('/policies/:id/usage', async (req,res,next) => {
      try {
        const q = z.object({limit:z.coerce.number().int().min(1).max(100).default(25),cursor:z.string().min(1).max(240).optional()}).strict().parse(req.query);
        const page = await manageRolesUseCase.page({...q,policyId:req.params.id});
        res.json(responseFormatter.success({roles:page.items.map(role => ({id: role.id,name: role.name})),nextCursor:page.nextCursor}));
      } catch (error) { next(error); }
    });
    router.post('/policies/test', async (req, res, next) => {
      try {
        if (!managePoliciesUseCase || !policyEvaluator)
          throw new Error('POLICY_EVALUATOR_UNAVAILABLE');
        const body = policyDefinitionSchema
          .extend({
            testIp: z.string().max(60).optional(),
            testCourseId:z.string().uuid().optional(),
            testTime: z.string().datetime().optional(),
          })
          .parse(req.body);
        const policy = managePoliciesUseCase.definition({ ...body, id: 'preview' });
        const decision = await policyEvaluator.evaluate(policy, {
          identityId: requireAuthenticatedPrincipal(req).principalId,
          resourceUrn: new ResourceUrn(body.ruleType==='COURSE_SCOPE'?'admin:courses':'admin:authorization'),
          action: new Action(body.ruleType==='COURSE_SCOPE'?'read':'manage'),
          courseId:body.testCourseId,
          ip: body.testIp || req.ip,
          requestTime: body.testTime ? new Date(body.testTime) : new Date(),
        });
        res.json(
          responseFormatter.success({
            simulation: true,
            granted: decision.isGranted,
            reasons: decision.reasons,
          }),
        );
      } catch (error) { next(error); }
    });
    router.post('/policies', async (req, res, next) => {
      try {
        if (!managePoliciesUseCase) throw new Error('POLICY_MANAGEMENT_UNAVAILABLE');
        const body = policyDefinitionSchema
          .extend({
            id: z.string().trim().min(1).max(240),
            reason: z.string().trim().min(6).max(2000),
          })
          .parse(req.body);
        const approval = await verifyMakerChecker(
          req,
          requireAuthenticatedPrincipal(req).principalId,
        );
        await managePoliciesUseCase.create(
          body,
          mutationContext(req, { ...approval, reason: body.reason }),
          await permittedPolicyPermissions(req),
        );
        res.status(201).json(responseFormatter.success({ policyId: body.id }));
      } catch (error) { next(error); }
    });
    router.patch('/policies/:id', async (req, res, next) => {
      try {
        if (!managePoliciesUseCase) throw new Error('POLICY_MANAGEMENT_UNAVAILABLE');
        const body = policyDefinitionSchema
          .extend({
            expectedRevision: z.string().datetime(),
            reason: z.string().trim().min(6).max(2000),
          })
          .parse(req.body);
        const approval = await verifyMakerChecker(
          req,
          requireAuthenticatedPrincipal(req).principalId,
        );
        await managePoliciesUseCase.update(
          { ...body, id: req.params.id },
          body.expectedRevision,
          mutationContext(req, { ...approval, reason: body.reason }),
          await permittedPolicyPermissions(req),
        );
        res.json(responseFormatter.success({ policyId: req.params.id }));
      } catch (error) { next(error); }
    });
    router.post('/policies/:id/retire', async (req, res, next) => {
      try {
        if (!managePoliciesUseCase) throw new Error('POLICY_MANAGEMENT_UNAVAILABLE');
        const body = z.object({
            expectedRevision: z.string().datetime(),
            reason: z.string().trim().min(6).max(2000),
          })
          .strict()
          .parse(req.body);
        const approval = await verifyMakerChecker(
          req,
          requireAuthenticatedPrincipal(req).principalId,
        );
        await managePoliciesUseCase.retire(
          req.params.id,
          body.expectedRevision,
          mutationContext(req, { ...approval, reason: body.reason }),
          await permittedPolicyPermissions(req),
        );
        res.json(responseFormatter.success({ policyId: req.params.id, retired: true }));
      } catch (error) { next(error); }
    });

    const pageQuery = z.object({
        limit: z.coerce.number().int().min(1).max(100).default(25),
        cursor: z.string().min(1).max(240).optional(),
        search: z.string().trim().max(240).optional(),
      })
      .strict();
    router.get('/roles', async (req, res, next) => {
      try {
        const page = await manageRolesUseCase.page(pageQuery.parse(req.query));
        res.status(200).json(
          responseFormatter.success({
            roles: page.items.map(roleDto),
            nextCursor: page.nextCursor,
          }),
        );
      } catch (error) { next(error); }
    });

    router.post('/roles', async (req: Request, res: Response) => {
      try {
        const body = parseStrict(authorizationRoleCreateSchema, req.body);
        if (!body.permissions.length) throw new Error('ROLE_PERMISSIONS_REQUIRED');
        if (new Set(body.permissions).size !== body.permissions.length) throw new Error('ROLE_DUPLICATE_PERMISSION');
        if (body.policyIds.length) {
          if (!managePoliciesUseCase) throw new Error('POLICY_MANAGEMENT_UNAVAILABLE');
          for (const id of body.policyIds) {
            const policy = await managePoliciesUseCase.get(id);
            if (!policy || !['TIME', 'IP', 'COURSE_SCOPE'].includes(policy.ruleType))
              throw new Error('POLICY_REFERENCE_INVALID');
          }
        }
        const actor = requireAuthenticatedPrincipal(req).principalId;
        await assertDelegablePermissions(req, actor, body.permissions);
        const highRisk = body.permissions.some(highRiskPermission) || body.policyIds.length > 0;
        const approval = highRisk ? await verifyMakerChecker(req, actor) : undefined;
        await manageRolesUseCase.createRole(body, mutationContext(req, approval));
        res.status(201).json(responseFormatter.success({ roleId: body.id, message: 'Role created successfully' }));
      } catch (error: unknown) {
        await AuditHelper.recordMutation(auditRecordRepo, req, { action: 'CREATE_ROLE', category: 'AUTHORIZATION', targetType: 'ROLE', targetId: req.body?.id || req.body?.name, result: 'FAILURE', error });
        sendAuthorizationError(req, res, error);
      }
    });

    router.get('/roles/:id', async (req: Request, res: Response, next) => {
      try {
        const role = await manageRolesUseCase.getRole(req.params.id);
        if (!role) return void res.status(404).json(responseFormatter.error({ code: 'NOT_FOUND', message: 'Role not found' }));
        res.status(200).json(
          responseFormatter.success({
            ...roleDto(role),
            memberCount: await manageRolesUseCase.getMemberCount(role.id),
          }),
        );
      } catch (error) { next(error); }
    });

    router.patch('/roles/:id', async (req, res, next) => {
      try {
        const body = authorizationRoleCreateSchema
          .omit({ id: true })
          .extend({
            expectedRevision: z.string().datetime(),
            reason: z.string().trim().min(6).max(2000),
          })
          .parse(req.body);
        if (!body.permissions.length || new Set(body.permissions).size !== body.permissions.length)
          throw new Error('ROLE_PERMISSIONS_INVALID');
        const existing = await manageRolesUseCase.getRole(req.params.id);
        if (!existing) throw new Error('ROLE_NOT_FOUND');
        if (
          JSON.stringify([...body.policyIds].sort()) !==
          JSON.stringify([...existing.policyIds].sort())
        ) {
          if (!managePoliciesUseCase) throw new Error('POLICY_MANAGEMENT_UNAVAILABLE');
          for (const id of body.policyIds) {
            const policy = await managePoliciesUseCase.get(id);
            if (!policy || !['TIME', 'IP', 'COURSE_SCOPE'].includes(policy.ruleType))
              throw new Error('POLICY_REFERENCE_INVALID');
          }
        }
        const actor = requireAuthenticatedPrincipal(req).principalId;
        await assertDelegablePermissions(req, actor, [
          ...existing.permissions.map(permission => permission.value),
          ...body.permissions,
        ]);
        const approval =
          [...existing.permissions.map((p) => p.value), ...body.permissions].some(
            highRiskPermission,
          ) || JSON.stringify(body.policyIds) !== JSON.stringify(existing.policyIds)
            ? await verifyMakerChecker(req, actor)
            : undefined;
        await manageRolesUseCase.updateRole(
          { ...body, id: req.params.id },
          mutationContext(req, { ...approval, reason: body.reason }),
        );
        res.status(200).json(responseFormatter.success({ roleId: req.params.id }));
      } catch (error) {
        await AuditHelper.recordMutation(auditRecordRepo, req, {
          action: 'UPDATE_ROLE',
          category: 'AUTHORIZATION',
          targetType: 'ROLE',
          targetId: req.params.id,
          result: 'FAILURE',
          error,
        });
        next(error);
      }
    });

    router.post('/roles/:id/retire', async (req, res, next) => {
      try {
        const body = z.object({
            expectedRevision: z.string().datetime(),
            reason: z.string().trim().min(6).max(2000),
          })
          .strict()
          .parse(req.body);
        const existing = await manageRolesUseCase.getRole(req.params.id);
        if (!existing) throw new Error('ROLE_NOT_FOUND');
        const actor = requireAuthenticatedPrincipal(req).principalId;
        await assertDelegablePermissions(
          req,
          actor,
          existing.permissions.map(permission => permission.value),
        );
        const approval =
          isHighRiskRole(existing) || existing.policyIds.length
            ? await verifyMakerChecker(req, actor)
            : undefined;
        await manageRolesUseCase.retireRole(
          req.params.id,
          body.expectedRevision,
          mutationContext(req, { ...approval, reason: body.reason }),
        );
        res.status(200).json(responseFormatter.success({ roleId: req.params.id, status: 'RETIRED' }));
      } catch (error) {
        await AuditHelper.recordMutation(auditRecordRepo, req, {
          action: 'RETIRE_ROLE',
          category: 'AUTHORIZATION',
          targetType: 'ROLE',
          targetId: req.params.id,
          result: 'FAILURE',
          error,
        });
        next(error);
      }
    });

    router.get('/assignments', async (req, res, next) => {
      try {
        const page = await assignRoleUseCase.page(
          pageQuery
            .extend({ roleId: z.string().trim().min(1).max(240).optional() })
            .parse(req.query),
        );
        res.status(200).json(
          responseFormatter.success({
            nextCursor: page.nextCursor,
            assignments: page.items.map(item => ({ id: item.id, identityId: item.identityId, roleId: item.roleId, assignedAt: item.assignedAt.toISOString() })),
          }),
        );
      } catch (error) { next(error); }
    });

    router.post('/assignments', async (req: Request, res: Response) => {
      try {
        const body = parseStrict(authorizationRoleAssignmentSchema, req.body);
        const role = await manageRolesUseCase.getRole(body.roleId);
        if (!role) throw new Error('ROLE_NOT_FOUND');
        if (!role.permissions.length) throw new Error('ROLE_RETIRED');
        const actor = requireAuthenticatedPrincipal(req).principalId;
        await assertVerifiedIdentity(body.identityId);
        await assertDelegablePermissions(req, actor, role.permissions.map(permission => permission.value));
        const approval = isHighRiskRole(role) ? await verifyMakerChecker(req, actor) : undefined;
        const result = await assignRoleUseCase.execute(body, mutationContext(req, approval));
        res.status(201).json(responseFormatter.success({ ...result, message: 'Role assigned successfully' }));
      } catch (error: unknown) {
        await AuditHelper.recordMutation(auditRecordRepo, req, { action: 'ASSIGN_ROLE', category: 'AUTHORIZATION', targetType: 'ROLE_ASSIGNMENT', targetId: req.body?.id || req.body?.identityId || req.body?.roleId, result: 'FAILURE', error });
        sendAuthorizationError(req, res, error);
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
      } catch (error: unknown) {
        await AuditHelper.recordMutation(auditRecordRepo, req, { action: 'REVOKE_ROLE_ASSIGNMENT', category: 'AUTHORIZATION', targetType: 'ROLE_ASSIGNMENT', targetId: req.params.id, result: 'FAILURE', error });
        sendAuthorizationError(req, res, error);
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
        const query = z.object({
            principalId: z.string().trim().min(1).max(240).optional(),
            activeOnly: z.enum(['true','false']).optional(),
            state: z.enum(['ACTIVE', 'SCHEDULED', 'EXPIRED', 'REVOKED']).optional(),
            limit: z.coerce.number().int().min(1).max(200).default(25),
            cursor: z.string().min(1).max(240).optional(),
          })
          .strict()
          .parse(req.query);
        const page = await manageEmergencyAccessUseCase.page({
          principalId: query.principalId,
          state: query.state,
          activeOnly: query.activeOnly === 'true',
          limit: query.limit,
          cursor: query.cursor,
        });
        res.status(200).json(responseFormatter.success({ grants: page.items, nextCursor: page.nextCursor }));
      } catch (error) { next(error); }
    });

    router.post('/emergency-access', async (req: Request, res: Response) => {
      try {
        const body = emergencyGrantSchema.parse(req.body);
        const actor = requireAuthenticatedPrincipal(req).principalId;
        const role = await manageRolesUseCase.getRole(body.roleId);
        if (!role) throw new Error('ROLE_NOT_FOUND');
        if (!role.permissions.length) throw new Error('ROLE_RETIRED');
        await assertVerifiedIdentity(body.principalId);
        await assertDelegablePermissions(req, actor, role.permissions.map(permission => permission.value));
        const approval = await verifyMakerChecker(req, actor);
        const grant = await manageEmergencyAccessUseCase.grant({ ...body, requestedBy: actor, approvedBy: approval.secondApproverId, changeTicket: approval.changeTicket }, mutationContext(req));
        res.status(201).json(responseFormatter.success({ grant }));
      } catch (error: unknown) {
        await AuditHelper.recordMutation(auditRecordRepo, req, { action: 'GRANT_BREAK_GLASS_ACCESS', category: 'AUTHORIZATION', targetType: 'EMERGENCY_ACCESS', targetId: req.body?.principalId, result: 'FAILURE', error });
        sendAuthorizationError(req, res, error);
      }
    });

    router.post('/emergency-access/:id/revoke', async (req: Request, res: Response) => {
      try {
        const body = emergencyRevokeSchema.parse(req.body);
        const actor = requireAuthenticatedPrincipal(req).principalId;
        const grant = await manageEmergencyAccessUseCase.revoke(req.params.id, actor, body.reason, mutationContext(req));
        res.status(200).json(responseFormatter.success({ grant }));
      } catch (error: unknown) {
        await AuditHelper.recordMutation(auditRecordRepo, req, { action: 'REVOKE_BREAK_GLASS_ACCESS', category: 'AUTHORIZATION', targetType: 'EMERGENCY_ACCESS', targetId: req.params.id, result: 'FAILURE', error });
        sendAuthorizationError(req, res, error);
      }
    });

    router.use(async (error: unknown, req: Request, res: Response, next: NextFunction) => {
      try {
        if (
          req.path.startsWith('/policies') &&
          req.path !== '/policies/test' &&
          ['POST', 'PATCH', 'DELETE'].includes(req.method)
        ) {
          await AuditHelper.recordMutation(auditRecordRepo, req, {
            action: 'POLICY_MUTATION_REJECTED',
            category: 'AUTHORIZATION',
            targetType: 'POLICY',
            targetId: req.params.id || req.body?.id,
            result: 'FAILURE',
            error,
          });
        }
        sendAuthorizationError(req, res, error);
      } catch (auditFailure) {
        next(auditFailure);
      }
    });

    return router;
  }
}
