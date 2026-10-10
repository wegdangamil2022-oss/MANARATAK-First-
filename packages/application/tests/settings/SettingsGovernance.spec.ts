import { describe, expect, it } from 'vitest';
import { BooleanValue, ConfigurationResolutionService, ConfigurationValidationService, NamespacedKey, ScopeLevel,
  ScopeIdentifier, SettingAssignment, SettingDefinition, SettingVersion, ValueType, LifeStatus } from '@manaratak/domain';
import { ManageSettingsUseCase } from '../../src/settings/use-cases/ManageSettingsUseCase';

function fixture() {
  const definitions = new Map<string, SettingDefinition>();
  const assignments = new Map<string, SettingAssignment>();
  let revision = Date.parse('2026-10-09T00:00:00Z');
  const clone = (item: SettingAssignment) => new SettingAssignment({ id: item.id, key: item.key, scope: item.scope, versions: [...item.getVersions()] });
  const definitionRepo = { findAll: async () => [...definitions.values()], findByKey: async (key: NamespacedKey) => definitions.get(key.getValue()) ?? null,
    save: async (item: SettingDefinition) => { definitions.set(item.key.getValue(), new SettingDefinition({ ...item, revision: new Date(++revision).toISOString() })); } };
  const assignmentRepo = {
    findByScopeAndKey: async (scope: { equals(other: any): boolean }, key: NamespacedKey) => {
      const item = [...assignments.values()].find(item => item.key.equals(key) && scope.equals(item.scope)); return item ? clone(item) : null;
    },
    findById: async (id: string) => assignments.has(id) ? clone(assignments.get(id)!) : null,
    countByKey: async (key: NamespacedKey) => [...assignments.values()].filter(item => item.key.equals(key)).length,
    findBy: async (spec: { isSatisfiedBy(item: SettingAssignment): boolean }) => [...assignments.values()].filter(spec.isSatisfiedBy).map(clone),
    save: async (item: SettingAssignment) => { assignments.set(item.id, clone(item)); },
  };
  return { definitions, assignments, useCase: new ManageSettingsUseCase(definitionRepo, assignmentRepo, new ConfigurationValidationService(), undefined,
      { findById: async (id: string) => id === 'student' ? ({ status: LifeStatus.ACTIVE } as never) : null }),
    resolver: new ConfigurationResolutionService(definitionRepo, assignmentRepo) };
}

async function createFlag(f: ReturnType<typeof fixture>) {
  await f.useCase.createDefinition({ id: 'flag', key: 'feature.safe', valueType: ValueType.Boolean, isFeatureFlag: true, defaultValue: false });
}
async function assign(f: ReturnType<typeof fixture>, level: string, scopeId?: string) {
  await f.useCase.assignValue({ assignmentId: level, key: 'feature.safe', level, scopeId, versionId: `${level}-v1`,
    type: ValueType.Boolean, value: true, authorId: 'admin', changeReason: 'Reviewed feature change' });
}

describe('Settings override and definition governance', () => {
  it.each([['GLOBAL', undefined, 'DEFAULT'], ['DOMAIN', 'courses', 'GLOBAL'], ['IDENTITY', 'student', 'DOMAIN']] as const)
  ('clearing %s exposes %s inheritance and preserves immutable history', async (level, scopeId, winner) => {
    const f = fixture(); await createFlag(f);
    if (level !== 'GLOBAL') await assign(f, 'GLOBAL');
    if (level === 'IDENTITY') f.assignments.set('DOMAIN', new SettingAssignment({
      id: 'DOMAIN', key: new NamespacedKey('feature.safe'), scope: new ScopeIdentifier('DOMAIN', 'courses'),
      versions: [new SettingVersion('DOMAIN-v1', new BooleanValue(true), new Date('2026-10-09T00:00:00Z'), 'admin')],
    }));
    await assign(f, level, scopeId);
    await f.useCase.clearOverride({ assignmentId: level, expectedCurrentVersionId: `${level}-v1`, newVersionId: `${level}-v2`,
      authorId: 'admin', changeReason: 'Return to approved inherited policy' });
    const result = await f.resolver.readSetting('feature.safe', { domainId: 'courses', identityId: 'student' });
    expect(result.sourceScope).toBe(winner); expect(result.value).toBe(winner === 'DEFAULT' ? false : true);
    expect(result.chain.find(step => step.scope === level)).toMatchObject({ status: 'INHERITED', versionId: `${level}-v2` });
    expect(result.chain.find(step => step.scope === level)).not.toHaveProperty('value');
    expect(f.assignments.get(level)?.getVersions().map(version => [version.id, version.operation])).toEqual([
      [`${level}-v1`, 'SET'], [`${level}-v2`, 'CLEAR_OVERRIDE'],
    ]);
    expect((await f.useCase.listAssignments({ level: level as ScopeLevel })).find(item => item.id === level))
      .toMatchObject({ isOverrideCleared: true, currentValue: null, currentVersionId: `${level}-v2` });
  });
  it('can assign again and roll back to the inheritance marker without deleting versions', async () => {
    const f = fixture(); await createFlag(f); await assign(f, 'GLOBAL');
    await f.useCase.clearOverride({ assignmentId: 'GLOBAL', expectedCurrentVersionId: 'GLOBAL-v1', newVersionId: 'clear', changeReason: 'Use approved default' });
    await f.useCase.assignValue({ assignmentId: 'GLOBAL', key: 'feature.safe', level: 'GLOBAL', versionId: 'set-again',
      type: ValueType.Boolean, value: true, expectedCurrentVersionId: 'clear', changeReason: 'Restore reviewed override' });
    await f.useCase.rollbackValue({ assignmentId: 'GLOBAL', previousVersionId: 'clear', newVersionId: 'rollback-clear',
      expectedCurrentVersionId: 'set-again', changeReason: 'Restore inherited policy' });
    expect((await f.resolver.readSetting('feature.safe')).value).toBe(false);
    expect(f.assignments.get('GLOBAL')?.getVersions()).toHaveLength(4);
    expect(f.assignments.get('GLOBAL')?.getCurrentVersion().rollbackOfVersionId).toBe('clear');
  });
  it('rejects stale clear, missing reasons and a second clear without extending history', async () => {
    const f = fixture(); await createFlag(f); await assign(f, 'GLOBAL');
    await expect(f.useCase.clearOverride({ assignmentId: 'GLOBAL', expectedCurrentVersionId: 'stale', newVersionId: 'clear', changeReason: 'Use default' })).rejects.toThrow('SETTINGS_VERSION_CONFLICT');
    await expect(f.useCase.clearOverride({ assignmentId: 'GLOBAL', expectedCurrentVersionId: 'GLOBAL-v1', newVersionId: 'clear', changeReason: '' })).rejects.toThrow('SETTINGS_CHANGE_REASON_REQUIRED');
    expect(f.assignments.get('GLOBAL')?.getVersions()).toHaveLength(1);
    await f.useCase.clearOverride({ assignmentId: 'GLOBAL', expectedCurrentVersionId: 'GLOBAL-v1', newVersionId: 'clear', changeReason: 'Use default' });
    await expect(f.useCase.clearOverride({ assignmentId: 'GLOBAL', expectedCurrentVersionId: 'clear', newVersionId: 'second', changeReason: 'Use default' })).rejects.toThrow('SETTINGS_OVERRIDE_ALREADY_CLEARED');
    expect(f.assignments.get('GLOBAL')?.getVersions()).toHaveLength(2);
  });
  it('requires reasons for feature writes and all rollbacks before persisting', async () => {
    const f = fixture(); await createFlag(f);
    await expect(f.useCase.assignValue({ assignmentId: 'GLOBAL', key: 'feature.safe', level: 'GLOBAL', versionId: 'v1', type: ValueType.Boolean, value: true })).rejects.toThrow('SETTINGS_CHANGE_REASON_REQUIRED');
    expect(f.assignments.size).toBe(0);
    await assign(f, 'GLOBAL');
    await expect(f.useCase.rollbackValue({ assignmentId: 'GLOBAL', previousVersionId: 'GLOBAL-v1', newVersionId: 'rollback' })).rejects.toThrow('SETTINGS_CHANGE_REASON_REQUIRED');
    expect(f.assignments.get('GLOBAL')?.getVersions()).toHaveLength(1);
  });
  it('governs metadata with revisions and deprecates without deleting assignments/history', async () => {
    const f = fixture(); await createFlag(f); await assign(f, 'GLOBAL');
    const old = f.definitions.get('feature.safe')!;
    expect(await f.useCase.definitionImpact('feature.safe')).toEqual({ assignmentCount: 1 });
    await f.useCase.updateDefinition({ key: 'feature.safe', expectedRevision: old.revision!, description: 'Reviewed description', changeReason: 'Clarify owner policy' });
    await expect(f.useCase.updateDefinition({ key: 'feature.safe', expectedRevision: old.revision!, isDeprecated: true, changeReason: 'Retire feature' })).rejects.toThrow('SETTINGS_DEFINITION_CONFLICT');
    const current = f.definitions.get('feature.safe')!;
    await f.useCase.updateDefinition({ key: 'feature.safe', expectedRevision: current.revision!, isDeprecated: true, changeReason: 'Retire reviewed feature' });
    expect((await f.resolver.readSetting('feature.safe')).status).toBe('DEPRECATED');
    expect(f.assignments.get('GLOBAL')?.getVersions()).toHaveLength(1);
    await expect(assign(f, 'DOMAIN', 'courses')).rejects.toThrow(/deprecated/);
    await expect(f.useCase.clearOverride({ assignmentId: 'GLOBAL', expectedCurrentVersionId: 'GLOBAL-v1', newVersionId: 'clear', changeReason: 'Use default' })).rejects.toThrow('SETTINGS_DEFINITION_NOT_WRITABLE');
    expect(f.definitions.get('feature.safe')?.defaultValue).toBe(false);
  });
  it('blocks all Admin mutation paths for unowned TENANT while preserving historical resolution', async () => {
    const f = fixture(); await createFlag(f);
    const legacy = new SettingAssignment({
      id: 'legacy-tenant',
      key: new NamespacedKey('feature.safe'),
      scope: new ScopeIdentifier(ScopeLevel.TENANT, 'legacy-tenant'),
      versions: [new SettingVersion('legacy-v1', new BooleanValue(true), new Date('2026-10-09T00:00:00Z'), 'admin')],
    });
    f.assignments.set('legacy-tenant', legacy);

    await expect(f.useCase.assignValue({
      assignmentId: 'legacy-tenant', key: 'feature.safe', level: 'TENANT',
      scopeId: 'legacy-tenant', versionId: 'new-v2', type: ValueType.Boolean,
      value: false, changeReason: 'Reviewed policy change',
    })).rejects.toThrow('SETTINGS_TENANT_SCOPE_UNAPPROVED');
    await expect(f.useCase.clearOverride({
      assignmentId: 'legacy-tenant', expectedCurrentVersionId: 'legacy-v1',
      newVersionId: 'clear-v2', changeReason: 'Reviewed inheritance policy',
    })).rejects.toThrow('SETTINGS_TENANT_SCOPE_UNAPPROVED');
    await expect(f.useCase.rollbackValue({
      assignmentId: 'legacy-tenant', previousVersionId: 'legacy-v1',
      newVersionId: 'rollback-v2', changeReason: 'Reviewed rollback policy',
    })).rejects.toThrow('SETTINGS_TENANT_SCOPE_UNAPPROVED');

    expect(f.assignments.get('legacy-tenant')?.getVersions()).toHaveLength(1);
    await expect(f.resolver.readSetting('feature.safe', { tenantId: 'legacy-tenant' }))
      .resolves.toMatchObject({ status: 'RESOLVED', value: true, sourceScope: 'TENANT' });
  });


  it('keeps unknown legacy DOMAIN overrides readable but rejects unrecognized scope mutations', async () => {
    const f = fixture(); await createFlag(f);
    const legacy = new SettingAssignment({ id: 'legacy-domain', key: new NamespacedKey('feature.safe'),
      scope: new ScopeIdentifier(ScopeLevel.DOMAIN, 'unknown-domain'),
      versions: [new SettingVersion('old', new BooleanValue(true), new Date(), 'admin')] });
    f.assignments.set(legacy.id, legacy);
    await expect(assign(f, 'DOMAIN', 'unknown-domain')).rejects.toThrow('SETTINGS_DOMAIN_SCOPE_UNAPPROVED');
    await expect(f.useCase.clearOverride({ assignmentId: legacy.id, expectedCurrentVersionId: 'old',
      newVersionId: 'clear', changeReason: 'Return to inheritance' })).rejects.toThrow('SETTINGS_DOMAIN_SCOPE_UNAPPROVED');
    await expect(f.useCase.rollbackValue({ assignmentId: legacy.id, previousVersionId: 'old', newVersionId: 'rollback',
      changeReason: 'Restore reviewed setting' })).rejects.toThrow('SETTINGS_DOMAIN_SCOPE_UNAPPROVED');
    expect(f.assignments.get(legacy.id)?.getVersions()).toHaveLength(1);
    await expect(f.resolver.readSetting('feature.safe', { domainId: 'unknown-domain' }))
      .resolves.toMatchObject({ value: true, sourceScope: 'DOMAIN' });
  });

  it('validates identity IDs with the canonical IAM owner before writing', async () => {
    const f = fixture(); await createFlag(f);
    await expect(assign(f, 'IDENTITY', 'missing')).rejects.toThrow('SETTINGS_IDENTITY_SCOPE_NOT_FOUND');
    expect(f.assignments.size).toBe(0);
    await assign(f, 'IDENTITY', 'student');
    expect(f.assignments.get('IDENTITY')?.getCurrentVersion().id).toBe('IDENTITY-v1');
    await f.useCase.clearOverride({ assignmentId: 'IDENTITY', expectedCurrentVersionId: 'IDENTITY-v1',
      newVersionId: 'clear', changeReason: 'Restore inherited setting' });
    expect(f.assignments.get('IDENTITY')?.isOverrideCleared).toBe(true);
  });

  it('fails closed when the IAM owner lookup is unavailable or returns a purged identity', async () => {
    const f = fixture(); await createFlag(f);
    const idRepo = { findById: async () => ({ status: LifeStatus.PURGED } as never) };
    const purged = new ManageSettingsUseCase({ findByKey: async () => f.definitions.get('feature.safe') ?? null } as never,
      { findByScopeAndKey: async () => null } as never, new ConfigurationValidationService(), undefined, idRepo);
    await expect(purged.assignValue({ assignmentId: 'a', key: 'feature.safe', level: 'IDENTITY',
      scopeId: 'student', versionId: 'v1', type: ValueType.Boolean, value: true,
      changeReason: 'Reviewed policy change' })).rejects.toThrow('SETTINGS_IDENTITY_SCOPE_NOT_FOUND');
    const unavailable = new ManageSettingsUseCase({ findByKey: async () => f.definitions.get('feature.safe') ?? null } as never,
      {} as never, new ConfigurationValidationService());
    await expect(unavailable.assignValue({ assignmentId: 'a', key: 'feature.safe', level: 'IDENTITY',
      scopeId: 'student', versionId: 'v1', type: ValueType.Boolean, value: true,
      changeReason: 'Reviewed policy change' })).rejects.toThrow('SETTINGS_IDENTITY_SCOPE_VALIDATOR_UNAVAILABLE');
  });

});
