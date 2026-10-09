import { describe, expect, it } from 'vitest';
import { BooleanValue, ConfigurationResolutionService, ConfigurationValidationService, NamespacedKey, ScopeLevel,
  SettingAssignment, SettingDefinition, ValueType } from '@manaratak/domain';
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
  return { definitions, assignments, useCase: new ManageSettingsUseCase(definitionRepo, assignmentRepo, new ConfigurationValidationService()),
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
    if (level === 'IDENTITY') await assign(f, 'DOMAIN', 'courses');
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
});
