import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { Role } from '@manaratak/domain';

function canonicalChangePath(value: string): string | null {
  const match = /^\/(roles|assignments|policies|emergency-access)(?:\/([^/]+))?(\/retire)?$/.exec(
    value,
  );
  if (!match) return null;
  if (!match[2]) return '/' + match[1];
  try {
    const id = decodeURIComponent(match[2]);
    if (
      !id ||
      id.length > 240 ||
      id !== id.trim() ||
      id.includes('..') ||
      /[\u0000-\u001f/\\?#%]/.test(id)
    )
      return null;
    return '/' + match[1] + '/' + encodeURIComponent(id) + (match[3] || '');
  } catch {
    return null;
  }
}
export const authorizationChangeTargetSchema = z
  .object({
    method: z.enum(['POST', 'PATCH', 'DELETE']),
    path: z
      .string()
      .max(500)
      .refine((value) => canonicalChangePath(value) !== null)
      .transform((value) => canonicalChangePath(value)!),
    body: z.record(z.string(), z.unknown()),
    changeTicket: z.string().trim().max(240),
  })
  .strict()
  .refine((value) => JSON.stringify(value.body).length <= 50000, {
    message: 'Change request is too large',
  })
  .refine(
    (value) => {
      const key = value.method + ' ' + value.path;
      return (
        /^POST \/(?:roles|assignments|policies|emergency-access)$/.test(key) ||
        /^POST \/(?:roles|policies)\/[^/]+\/retire$/.test(key) ||
        /^PATCH \/(?:roles|policies)\/[^/]+$/.test(key) ||
        /^DELETE \/assignments\/[^/]+$/.test(key)
      );
    },
    { message: 'Unsupported authorization operation' },
  );
export type AuthorizationChangeTarget = z.infer<typeof authorizationChangeTargetSchema>;
type Owners = {
  role: (id: string) => Promise<Role | null>;
  assignment: (
    id: string,
  ) => Promise<{ identityId: string; roleId: string; assignedAt: Date } | null>;
  policy: (id: string) => Promise<{
    id: string;
    revision?: string;
    ruleType: string;
    ruleConfiguration: string;
  } | null>;
  identity: (id: string) => Promise<{
    status: string;
    version: number;
    verified: boolean;
    accountState: string;
    displayName: string;
  }>;
};
export async function authorizationChangePayload(
  target: AuthorizationChangeTarget,
  owners: Owners,
) {
  const parts = target.path.split('/'),
    kind = parts[1],
    id = parts[2] ? decodeURIComponent(parts[2]) : undefined;
  const binding: Record<string, unknown> = {};
  let roleId = typeof target.body.roleId === 'string' ? target.body.roleId : undefined;
  let identityId =
    typeof target.body.identityId === 'string'
      ? target.body.identityId
      : typeof target.body.principalId === 'string'
        ? target.body.principalId
        : undefined;
  if (kind === 'roles' && id) roleId = id;
  if (kind === 'assignments' && id) {
    const assignment = await owners.assignment(id);
    if (!assignment) throw Error('ROLE_ASSIGNMENT_NOT_FOUND');
    roleId = assignment.roleId;
    identityId = assignment.identityId;
    binding.assignment = {
      id,
      identityId: assignment.identityId,
      roleId: assignment.roleId,
      assignedAt: assignment.assignedAt.toISOString(),
    };
  }
  let policyIds: string[] = [];
  if (roleId) {
    const role = await owners.role(roleId);
    if (!role) throw Error('ROLE_NOT_FOUND');
    binding.role = {
      id: role.id,
      name: role.name,
      revision: role.revision,
      permissions: role.permissions.map((p) => p.value).sort(),
      policyIds: [...role.policyIds].sort(),
    };
    policyIds = [...role.policyIds];
  }
  if (Array.isArray(target.body.policyIds))
    policyIds.push(...z.array(z.string().min(1).max(240)).max(100).parse(target.body.policyIds));
  if (kind === 'policies' && id) policyIds.push(id);
  binding.policies = await Promise.all(
    [...new Set(policyIds)].sort().map(async (policyId) => {
      const policy = await owners.policy(policyId);
      if (!policy) throw Error('POLICY_NOT_FOUND');
      return {
        id: policyId,
        revision: policy.revision ?? null,
        digest: createHash('sha256')
          .update(JSON.stringify([policy.ruleType, policy.ruleConfiguration]))
          .digest('hex'),
      };
    }),
  );
  if (identityId) binding.identity = { id: identityId, ...(await owners.identity(identityId)) };
  binding.requiresActiveIdentity =
    target.method === 'POST' && (kind === 'assignments' || kind === 'emergency-access');
  return { ...target, binding };
}
