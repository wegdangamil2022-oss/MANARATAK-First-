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
    private readonly emergencyAccessRepository?: IEmergencyAccessRepository,
    private readonly dutyEvaluator?: { isAllowed(identityId: string): Promise<boolean> }
  ) {}

  private readers() {
    return {
      duty: (id: string) => this.dutyEvaluator?.isAllowed(id) ?? Promise.resolve(true),
      assignments: (id: string) => this.roleAssignmentRepository.findByIdentityId(id),
      emergency: (id: string) => this.emergencyAccessRepository?.listActiveRoleIds(id) ?? Promise.resolve([]),
      role: (id: string) => this.roleRepository.findById(id),
      policy: (id: string) => this.policyRepository.findById(id),
    };
  }

  /** Reuse storage reads only inside this batch; every later call rechecks revocation. */
  public async evaluatePermissions(
    identityId: string,
    permissions: readonly string[],
    contextAttributes: Record<string, unknown> = {},
  ): Promise<AccessDecision[]> {
    const once = <T>(read: (id: string) => Promise<T>) => {
      const pending = new Map<string, Promise<T>>();
      return (id: string) => {
        let value = pending.get(id);
        if (!value) { value = read(id); pending.set(id, value); }
        return value;
      };
    };
    const source = this.readers();
    const reads = {
      duty: once(source.duty), assignments: once(source.assignments),
      emergency: once(source.emergency), role: once(source.role), policy: once(source.policy),
    };
    return Promise.all(permissions.map((permission) => {
      const colon = permission.lastIndexOf(':');
      return this.evaluateWithReads(
        identityId,
        new ResourceUrn(colon > 0 ? permission.slice(0, colon) : permission),
        new Action(colon > 0 ? permission.slice(colon + 1) : '*'),
        contextAttributes,
        reads,
      );
    }));
  }

  public async describeIdentityAccess(identityId: string, contextAttributes: Record<string, unknown> = {}) {
    const assignments = await this.roleAssignmentRepository.findByIdentityId(identityId);
    const emergencyRoleIds =
      (await this.emergencyAccessRepository?.listActiveRoleIds(identityId)) ?? [];
    const ids = [...new Set([...assignments.map((item) => item.roleId), ...emergencyRoleIds])];
    if (ids.length > 200) throw new Error('AUTHORIZATION_ACCESS_PROJECTION_LIMIT');
    return Promise.all(
      ids.map(async (id) => {
        const role = await this.roleRepository.findById(id);
        if (!role)
          return {
            id,
            missing: true,
            sources: [] as string[],
            permissions: [] as string[],
            policies: [],
          };
        const policies = await Promise.all(
          role.policyIds.map(async (policyId) => {
            const policy = await this.policyRepository.findById(policyId);
            const decision = policy ? await this.policyEvaluator.evaluate(policy, {
              ...contextAttributes, identityId, resourceUrn: new ResourceUrn('admin:authorization'), action: new Action('manage'),
            }) : null;
            return {
              id: policyId,
              conditionGranted: decision?.isGranted ?? false,
              reasons: decision?.reasons ?? ['REFERENCED_POLICY_NOT_FOUND'],
              name: policy?.name,
              ruleType: policy?.ruleType,
              missing: !policy,
            };
          }),
        );
        return {
          id,
          name: role.name,
          missing: false,
          sources: [
            ...(assignments.some((item) => item.roleId === id) ? ['ASSIGNMENT'] : []),
            ...(emergencyRoleIds.includes(id) ? ['EMERGENCY'] : []),
          ],
          permissions: role.permissions.map((permission) => permission.value),
          policies,
        };
      }),
    );
  }

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
    contextAttributes: Record<string, unknown> = {},
  ): Promise<AccessDecision> {
    return this.evaluateWithReads(identityId, resourceUrn, action, contextAttributes, this.readers());
  }

  private async evaluateWithReads(
    identityId: string,
    resourceUrn: ResourceUrn,
    action: Action,
    contextAttributes: Record<string, unknown>,
    reads: ReturnType<AuthorizationEvaluatorService['readers']>,
  ): Promise<AccessDecision> {
    if (!await reads.duty(identityId))
      return AccessDecision.denied('Separation-of-duties policy denies this access');
    const requiredPermission = new PermissionReference(`${resourceUrn.value}:${action.value}`);

    // Fetch all role assignments for identity
    const [assignments, emergencyRoleIds] = await Promise.all([
      reads.assignments(identityId), reads.emergency(identityId),
    ]);
    const roleIds = Array.from(new Set([...assignments.map(assignment => assignment.roleId), ...emergencyRoleIds]));

    if (roleIds.length === 0) {
      return AccessDecision.denied('No roles assigned to identity');
    }

    const context: EvaluationContext = {
      ...contextAttributes,
      identityId,
      resourceUrn,
      action,
    };

    let failedPolicyReasons: string[] = [];

    for (const roleId of roleIds) {
      const role = await reads.role(roleId);
      if (!role) continue;

      // Check if role has the requested permission
      const roleHasPermission = role.permissions.some(p => p.matches(requiredPermission));
      if (!roleHasPermission) {
        continue;
      }

      // If role has permission, check policies attached to role
      let allPoliciesPassed = true;
      for (const policyId of role.policyIds) {
        const policy = await reads.policy(policyId);
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
