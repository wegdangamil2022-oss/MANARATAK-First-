import { describe, expect, it, vi } from 'vitest';
import { ManagePoliciesUseCase } from '@manaratak/application';
import { InMemoryPolicyRepository, InMemoryRoleRepository, DefaultPolicyEvaluator } from '@manaratak/infrastructure';
import { Action, ResourceUrn } from '@manaratak/domain';
const definition = {
  id: 'office',
  name: 'Office hours',
  description: 'Verified office hours',
  ruleType: 'TIME' as const,
  configuration: { start: '09:00', end: '17:00', timezone: 'UTC' },
};

describe('policy control plane', () => {
  it.each([
    { ...definition, configuration: { start: '25:00', end: '17:00' } },
    {
      ...definition,
      configuration: { start: '09:00', end: '17:00', timezone: 'Invalid/Timezone' },
    },
    { ...definition, configuration: { start: '09:00', end: '17:00', daysOfWeek: [8] } },
    { ...definition, ruleType: 'IP' as const, configuration: { allowedIps: ['not-an-ip'] } },
    { ...definition, ruleType: 'IP' as const, configuration: { allowedIps: [] } },
    {
      ...definition,
      ruleType: 'IP' as const,
      configuration: { allowedIps: ['127.0.0.1'], start: '09:00' },
    },
  ])('rejects malformed typed configuration without persisting it', async (input) => {
    const repo = new InMemoryPolicyRepository(new InMemoryRoleRepository());
    const useCase = new ManagePoliciesUseCase(repo);
    await expect(useCase.create(input)).rejects.toThrow('POLICY_DEFINITION_INVALID');
    expect(await repo.findById(input.id)).toBeNull();
  });
  it('rejects duplicate IDs and stale revisions, then retires without removing a referenced ID', async () => {
    const repo = new InMemoryPolicyRepository(new InMemoryRoleRepository());
    const useCase = new ManagePoliciesUseCase(repo);
    await useCase.create(definition);
    await expect(useCase.create(definition)).rejects.toThrow('POLICY_ID_ALREADY_EXISTS');
    const revision = (await useCase.get(definition.id))!.revision!;
    await useCase.update({ ...definition, name: 'New name' }, revision);
    await expect(useCase.update(definition, revision)).rejects.toThrow('POLICY_REVISION_CONFLICT');
    const current = (await useCase.get(definition.id))!;
    await useCase.retire(current.id, current.revision!);
    const retired = (await useCase.get(definition.id))!;
    expect(retired.ruleType).toBe('RETIRED');
    const decision = await new DefaultPolicyEvaluator().evaluate(retired, {
      identityId: 'staff',
      resourceUrn: new ResourceUrn('admin:universities'),
      action: new Action('manage'),
      ip: '127.0.0.1',
    });
    expect(decision.isGranted).toBe(false);
  });
  it('persists through the audit transaction, retaining approval evidence', async () => {
    const tx = { boundaryId: 'boundary' };
    const create = vi.fn();
    const withTransaction = vi.fn(() => ({ create,assertRoleUsageAuthority:vi.fn(async()=>{}) }));
    const atomic = { execute: vi.fn(async (_definition, write) => write(tx)) };
    const useCase = new ManagePoliciesUseCase({ withTransaction } as any, atomic as any);
    await useCase.create(definition, {
      actorId: 'actor',
      metadata: { secondApproverId: 'checker', reason: 'approved policy' },
    } as any);
    expect(withTransaction).toHaveBeenCalledWith(tx);
    expect(create).toHaveBeenCalledOnce();
    expect(atomic.execute.mock.calls[0][0]).toMatchObject({
      domain: 'AUTHORIZATION',
      action: 'POLICY_CREATED',
      auditMetadata: { secondApproverId: 'checker' },
    });
  });
  it('uses a bounded stable cursor without losing equal-name policies', async () => {
    const repo = new InMemoryPolicyRepository(new InMemoryRoleRepository());
    const useCase = new ManagePoliciesUseCase(repo);
    for (const id of ['a', 'b', 'c']) await useCase.create({ ...definition, id });
    const first = await useCase.page({ limit: 2 });
    expect(first.items.map((p) => p.id)).toEqual(['a', 'b']);
    expect(first.nextCursor).toBe('b');
    const next = await useCase.page({ limit: 2, cursor: first.nextCursor! });
    expect(next.items.map((p) => p.id)).toEqual(['c']);
    expect(next.nextCursor).toBeNull();
  });
});

describe('shared policy scope cannot bypass delegation authority',()=>{
  it('rejects loosening a policy on a role outside the actor authority, and permits an authorized update',async()=>{
    const roles=new InMemoryRoleRepository();const policies=new InMemoryPolicyRepository(roles);const useCase=new ManagePoliciesUseCase(policies);
    const {Role,PermissionReference}=await import('@manaratak/domain');
    await roles.save(new Role({id:'finance-role',name:'Finance',description:'Finance',permissions:[new PermissionReference('admin:finance:manage')],policyIds:['office']}));
    await useCase.create(definition,undefined,['admin:finance:manage']);const current=(await useCase.get('office'))!;
    await expect(useCase.update({...definition,configuration:{start:'00:00',end:'23:59',timezone:'UTC'}},current.revision!,undefined,['admin:universities:manage'])).rejects.toThrow('POLICY_PERMISSION_EXCEEDS_ACTOR');
    expect((await useCase.get('office'))!.revision).toBe(current.revision);
    await useCase.update(definition,current.revision!,undefined,['admin:finance:manage']);
    expect((await useCase.get('office'))!.revision).not.toBe(current.revision);
  });
  it('also checks policy retirement and fails closed without the usage capability',async()=>{
    const roles=new InMemoryRoleRepository();const policies=new InMemoryPolicyRepository(roles);const useCase=new ManagePoliciesUseCase(policies);
    const {Role,PermissionReference}=await import('@manaratak/domain');
    await roles.save(new Role({id:'role',name:'Reviewer',description:'Review',permissions:[new PermissionReference('admin:universities:manage')],policyIds:['office']}));
    await useCase.create(definition,undefined,['admin:universities:manage']);const revision=(await useCase.get('office'))!.revision!;
    await expect(useCase.retire('office',revision)).rejects.toThrow('POLICY_PERMISSION_EXCEEDS_ACTOR');
    const isolated=new InMemoryPolicyRepository();const unsafe=new ManagePoliciesUseCase(isolated);await isolated.save(unsafe.definition(definition));
    await expect(unsafe.update(definition,(await unsafe.get('office'))!.revision!)).rejects.toThrow('POLICY_USAGE_CHECK_UNAVAILABLE');
  });
  it('checks every linked role beyond the first page instead of authorizing only a truncated subset',async()=>{
    const roles=new InMemoryRoleRepository();const {Role,PermissionReference}=await import('@manaratak/domain');
    for(let index=0;index<101;index++)await roles.save(new Role({id:String(index).padStart(3,'0'),name:`Role ${index}`,description:'Role',permissions:[new PermissionReference(index===100?'admin:finance:manage':'admin:universities:manage')],policyIds:['office']}));
    const policies=new InMemoryPolicyRepository(roles);const useCase=new ManagePoliciesUseCase(policies);await useCase.create(definition,undefined,['admin:universities:manage','admin:finance:manage']);
    await expect(useCase.update(definition,(await useCase.get('office'))!.revision!,undefined,['admin:universities:manage'])).rejects.toThrow('POLICY_PERMISSION_EXCEEDS_ACTOR');
  });
});

it('cannot restore a dangling policy reference to indirectly grant permissions outside the actor authority',async()=>{
  const roles=new InMemoryRoleRepository();const policies=new InMemoryPolicyRepository(roles);const useCase=new ManagePoliciesUseCase(policies);
  const {Role,PermissionReference}=await import('@manaratak/domain');
  await roles.save(new Role({id:'finance-role',name:'Finance',description:'Finance',permissions:[new PermissionReference('admin:finance:manage')],policyIds:['office']}));
  await expect(useCase.create(definition,undefined,['admin:universities:manage'])).rejects.toThrow('POLICY_PERMISSION_EXCEEDS_ACTOR');
  expect(await useCase.get('office')).toBeNull();
});
