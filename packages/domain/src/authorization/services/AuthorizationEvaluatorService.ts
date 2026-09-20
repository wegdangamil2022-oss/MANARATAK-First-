import { ResourceUrn } from '../value-objects/ResourceUrn';
import { Action } from '../value-objects/Action';
import { AccessDecision, DecisionResult } from '../value-objects/AccessDecision';
import { IRoleRepository } from '../repositories/IRoleRepository';
import { IPolicyRepository } from '../repositories/IPolicyRepository';
import { IRoleAssignmentRepository } from '../repositories/IRoleAssignmentRepository';
import { IEmergencyAccessRepository } from '../repositories/IEmergencyAccessRepository';
import { IPolicyEvaluator, EvaluationContext } from './IPolicyEvaluator';
import { PermissionReference } from '../value-objects/PermissionReference';

export class AuthorizationEvaluatorService {
  constructor(
    private readonly roleRepository: IRoleRepository,
    private readonly policyRepository: IPolicyRepository,
    private readonly roleAssignmentRepository: IRoleAssignmentRepository,
    private readonly policyEvaluator: IPolicyEvaluator,
    private readonly emergencyAccessRepository?: IEmergencyAccessRepository
  ) {}

  public async evaluatePermission(
    identityId: string,
    permissionStr: string,
    contextAttributes: Record<string, unknown> = {}
  ): Promise<AccessDecision> {
    const lastColon = permissionStr.lastIndexOf(':');
    let resourceStr = permissionStr;
    let actionStr = '*';
    if (lastColon > 0) {
      resourceStr = permissionStr.substring(0, lastColon);
      actionStr = permissionStr.substring(lastColon + 1);
    }
    return this.evaluateAccess(
      identityId,
      new ResourceUrn(resourceStr),
      new Action(actionStr),
      contextAttributes
    );
  }

  public async evaluateAccess(
    identityId: string,
    resourceUrn: ResourceUrn,
    action: Action,
    contextAttributes: Record<string, unknown> = {}
  ): Promise<AccessDecision> {
    const requiredPermission = new PermissionReference(`${resourceUrn.value}:${action.value}`);

    // Fetch all role assignments for identity
    const assignments = await this.roleAssignmentRepository.findBy({
      isSatisfiedBy: (assignment) => assignment.identityId === identityId
    });
    const emergencyRoleIds = await this.emergencyAccessRepository?.listActiveRoleIds(identityId) ?? [];
    const roleIds = Array.from(new Set([...assignments.map(assignment => assignment.roleId), ...emergencyRoleIds]));

    if (roleIds.length === 0) {
      return AccessDecision.denied('No roles assigned to identity');
    }

    const context: EvaluationContext = {
      identityId,
      resourceUrn,
      action,
      ...contextAttributes
    };

    let failedPolicyReasons: string[] = [];

    for (const roleId of roleIds) {
      const role = await this.roleRepository.findById(roleId);
      if (!role) continue;

      // Check if role has the requested permission
      const roleHasPermission = role.permissions.some(p => p.matches(requiredPermission));
      if (!roleHasPermission) {
        continue;
      }

      // If role has permission, check policies attached to role
      let allPoliciesPassed = true;
      for (const policyId of role.policyIds) {
        const policy = await this.policyRepository.findById(policyId);
        if (!policy) {
          allPoliciesPassed = false;
          failedPolicyReasons.push(`Referenced policy not found: ${policyId}`);
          break;
        }

        const policyDecision = await this.policyEvaluator.evaluate(policy, context);
        if (!policyDecision.isGranted) {
          allPoliciesPassed = false;
          failedPolicyReasons.push(...policyDecision.reasons);
          break;
        }
      }

      if (allPoliciesPassed) {
        return AccessDecision.granted(`Granted by role: ${role.name}`);
      }
    }

    if (failedPolicyReasons.length > 0) {
      return new AccessDecision(DecisionResult.DENIED, failedPolicyReasons);
    }

    return AccessDecision.denied('Insufficient permissions');
  }
}
