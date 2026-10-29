import { describe, expect, it, vi } from 'vitest';
import { AuthorizationEvaluatorService } from '../../src/authorization/services/AuthorizationEvaluatorService';
import { Role } from '../../src/authorization/aggregates/Role';
import { Policy } from '../../src/authorization/aggregates/Policy';
import { PermissionReference } from '../../src/authorization/value-objects/PermissionReference';
import { AccessDecision } from '../../src/authorization/value-objects/AccessDecision';
function setup() {
  const role = new Role({
    id: 'r',
    name: 'staff',
    description: '',
    permissions: [new PermissionReference('admin:*')],
    policyIds: ['p'],
  });
  const policy = new Policy({
    id: 'p',
    name: 'conditional',
    description: '',
    ruleType: 'test',
    ruleConfiguration: '{}',
  });
  const roles = { findById: vi.fn(async () => role) },
    policies = { findById: vi.fn(async () => policy) };
  const assignments = { findByIdentityId: vi.fn(async () => [{ roleId: 'r' }]) };
  const emergency = { listActiveRoleIds: vi.fn(async () => [] as string[]) };
  const duty = { isAllowed: vi.fn(async () => true) };
  const evaluator = {
    evaluate: vi.fn(async (_policy: Policy, context: { action: { value: string } }) =>
      context.action.value === 'view'
        ? AccessDecision.granted('view')
        : AccessDecision.denied('manage forbidden'),
    ),
  };
  const service = new AuthorizationEvaluatorService(
    roles as never,
    policies as never,
    assignments as never,
    evaluator as never,
    emergency as never,
    duty,
  );
  return { service, roles, policies, assignments, emergency, duty, evaluator };
}
describe('authorization batches reuse reads without retaining access decisions', () => {
  it('reads roles, policies, duties and assignments once while evaluating each permission context', async () => {
    const s = setup();
    const result = await s.service.evaluatePermissions('staff', [
      'admin:cms:view',
      'admin:cms:manage',
      'admin:finance:view',
    ]);
    expect(result.map((row) => row.isGranted)).toEqual([true, false, true]);
    for (const read of [
      s.roles.findById,
      s.policies.findById,
      s.assignments.findByIdentityId,
      s.emergency.listActiveRoleIds,
      s.duty.isAllowed,
    ])
      expect(read).toHaveBeenCalledTimes(1);
    expect(s.evaluator.evaluate).toHaveBeenCalledTimes(3);
  });
  it('observes revoked assignments on the next batch', async () => {
    const s = setup();
    expect((await s.service.evaluatePermissions('staff', ['admin:cms:view']))[0].isGranted).toBe(
      true,
    );
    s.assignments.findByIdentityId.mockResolvedValue([]);
    expect((await s.service.evaluatePermissions('staff', ['admin:cms:view']))[0].isGranted).toBe(
      false,
    );
    expect(s.assignments.findByIdentityId).toHaveBeenCalledTimes(2);
  });
  it('fails closed for duty denial and storage errors', async () => {
    const s = setup();
    s.duty.isAllowed.mockResolvedValue(false);
    expect((await s.service.evaluatePermissions('staff', ['admin:cms:view']))[0].isGranted).toBe(
      false,
    );
    expect(s.assignments.findByIdentityId).not.toHaveBeenCalled();
    s.duty.isAllowed.mockResolvedValue(true);
    s.roles.findById.mockRejectedValue(new Error('DB_UNAVAILABLE'));
    await expect(s.service.evaluatePermissions('staff', ['admin:cms:view'])).rejects.toThrow(
      'DB_UNAVAILABLE',
    );
  });
  it('continues to authorize emergency roles only in the current batch', async () => {
    const s = setup();
    s.assignments.findByIdentityId.mockResolvedValue([]);
    s.emergency.listActiveRoleIds.mockResolvedValue(['r']);
    expect((await s.service.evaluatePermissions('staff', ['admin:cms:view']))[0].isGranted).toBe(
      true,
    );
    s.emergency.listActiveRoleIds.mockResolvedValue([]);
    expect((await s.service.evaluatePermissions('staff', ['admin:cms:view']))[0].isGranted).toBe(
      false,
    );
  });
});
