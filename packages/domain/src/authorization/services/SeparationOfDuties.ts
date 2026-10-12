import { PermissionReference } from '../value-objects/PermissionReference';

export interface DutyConflictPair {
  id: string;
  first: string;
  second: string;
  description: string;
}
export interface DutyPolicy {
  pairs: DutyConflictPair[];
}
export interface DutyException {
  id: string;
  principalId: string;
  pairIds: string[];
  policyRevision: string;
  startsAt: string;
  expiresAt: string;
  reason: string;
  changeTicket: string;
  requestedBy: string;
  approvedBy: string;
  revokedAt?: string;
  revokedBy?: string;
  revocationReason?: string;
}
export function validateDutyPolicy(value: unknown): DutyPolicy {
  const policy = value as DutyPolicy;
  if (!policy || !Array.isArray(policy.pairs) || policy.pairs.length > 100)
    throw new Error('DUTY_POLICY_INVALID');
  const ids = new Set<string>(),
    pairs = new Set<string>();
  for (const pair of policy.pairs) {
    if (
      !pair ||
      !/^[a-zA-Z0-9_-]{1,80}$/.test(pair.id) ||
      ids.has(pair.id) ||
      typeof pair.first !== 'string' ||
      typeof pair.second !== 'string' ||
      pair.first === pair.second ||
      !/^admin:[a-z0-9:-]+$/.test(pair.first) ||
      !/^admin:[a-z0-9:-]+$/.test(pair.second) ||
      typeof pair.description !== 'string' ||
      pair.description.length > 500
    )
      throw new Error('DUTY_POLICY_INVALID');
    const key = [pair.first, pair.second].sort().join('|');
    if (pairs.has(key)) throw new Error('DUTY_POLICY_INVALID');
    ids.add(pair.id);
    pairs.add(key);
  }
  return { pairs: policy.pairs.map((pair) => ({ ...pair })) };
}
export function dutyConflicts(
  permissions: readonly string[],
  policy: DutyPolicy,
): DutyConflictPair[] {
  const granted = permissions.map((permission) => new PermissionReference(permission));
  return policy.pairs.filter(
    (pair) =>
      granted.some((permission) => permission.matches(new PermissionReference(pair.first))) &&
      granted.some((permission) => permission.matches(new PermissionReference(pair.second))),
  );
}
export function assertDutyUnion(
  permissions: readonly string[],
  policy: DutyPolicy,
  allowedPairs: readonly string[] = [],
): void {
  if (dutyConflicts(permissions, policy).some((pair) => !allowedPairs.includes(pair.id)))
    throw new Error('AUTHORIZATION_DUTY_CONFLICT');
}
export function validateDutyException(exception: DutyException, at: Date): void {
  const start = Date.parse(exception.startsAt),
    end = Date.parse(exception.expiresAt);
  if (
    !exception.principalId ||
    !exception.policyRevision ||
    !Array.isArray(exception.pairIds) ||
    !exception.pairIds.length ||
    exception.pairIds.length > 100 ||
    new Set(exception.pairIds).size !== exception.pairIds.length ||
    !exception.requestedBy ||
    !exception.approvedBy ||
    exception.requestedBy === exception.approvedBy ||
    exception.reason.trim().length < 12 ||
    exception.changeTicket.trim().length < 6 ||
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    end <= start ||
    end <= at.getTime() ||
    end - start > 24 * 60 * 60_000
  )
    throw new Error('DUTY_EXCEPTION_INVALID');
}
