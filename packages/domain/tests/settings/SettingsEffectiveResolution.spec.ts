import { describe, expect, it, vi } from 'vitest';
import { BooleanValue, ConfigurationResolutionService, NamespacedKey, ScopeIdentifier, ScopeLevel,
  SettingAssignment, SettingDefinition, SettingVersion, ValueType } from '../../src/settings';

function setup(options: { absent?: boolean; secret?: boolean; deprecated?: boolean; defaultValue?: boolean } = {},
  overrides: ScopeLevel[] = []) {
  const key = new NamespacedKey('feature.test');
  const definition = options.absent ? null : new SettingDefinition({ id: 'definition', key,
    valueType: ValueType.Boolean, isSecret: options.secret, isDeprecated: options.deprecated,
    defaultValue: options.defaultValue });
  const findByScopeAndKey = vi.fn(async (scope: ScopeIdentifier) => overrides.includes(scope.getLevel())
    ? new SettingAssignment({ id: `assignment-${scope.getLevel()}`, key, scope,
      versions: [new SettingVersion(`version-${scope.getLevel()}`, new BooleanValue(true), new Date())] }) : null);
  const service = new ConfigurationResolutionService({ findByKey: async () => definition,
    findAll: async () => [], save: async () => {} }, { findByScopeAndKey, findBy: async () => [], save: async () => {} });
  return { service, findByScopeAndKey };
}

describe('Settings typed effective resolution', () => {
  it.each([
    [ScopeLevel.IDENTITY, [ScopeLevel.IDENTITY, ScopeLevel.TENANT, ScopeLevel.DOMAIN, ScopeLevel.GLOBAL]],
    [ScopeLevel.TENANT, [ScopeLevel.TENANT, ScopeLevel.DOMAIN, ScopeLevel.GLOBAL]],
    [ScopeLevel.DOMAIN, [ScopeLevel.DOMAIN, ScopeLevel.GLOBAL]],
    [ScopeLevel.GLOBAL, [ScopeLevel.GLOBAL]],
  ] as const)('reports winning %s source/version without changing history', async (winner, scopes) => {
    const { service, findByScopeAndKey } = setup({ defaultValue: false }, [...scopes]);
    const result = await service.readSetting('feature.test', { identityId: 'user', tenantId: 'legacy-tenant', domainId: 'courses' });
    expect(result).toMatchObject({ status: 'RESOLVED', value: true, valueType: ValueType.Boolean,
      sourceScope: winner, versionId: `version-${winner}`, usedDefault: false });
    expect(result.chain.filter(step => step.winner)).toHaveLength(1);
    expect(result.chain.map(step => step.scope)).toEqual(['IDENTITY', 'TENANT', 'DOMAIN', 'GLOBAL', 'DEFAULT']);
    expect(findByScopeAndKey).toHaveBeenCalledTimes(4);
  });
  it('preserves false as an explicit default and reports absent contexts', async () => {
    const { service, findByScopeAndKey } = setup({ defaultValue: false });
    const result = await service.readSetting('feature.test');
    expect(result).toMatchObject({ status: 'RESOLVED', value: false, sourceScope: 'DEFAULT', usedDefault: true });
    expect(result.chain.slice(0, 3).every(step => step.status === 'NOT_APPLICABLE')).toBe(true);
    expect(findByScopeAndKey).toHaveBeenCalledTimes(1);
  });
  it.each([{ absent: true }, {}, { deprecated: true }])('distinguishes missing/no-value/deprecated %j', async options => {
    const { service } = setup(options);
    const result = await service.readSetting('feature.test');
    expect(result.status).toBe(options.absent ? 'NOT_DEFINED' : options.deprecated ? 'DEPRECATED' : 'NO_VALUE');
    expect(result).not.toHaveProperty('value');
  });
  it('secret requirements expose no value, mask, override history or usable fallback', async () => {
    const { service, findByScopeAndKey } = setup({ secret: true }, [ScopeLevel.GLOBAL]);
    expect(await service.readSetting('feature.test')).toMatchObject({ status: 'SECRET_UNAVAILABLE', chain: [] });
    expect(await service.resolve(new NamespacedKey('feature.test'))).toBeNull();
    expect(await service.resolve(new NamespacedKey('feature.test'), {}, { allowSecrets: true })).toBeNull();
    expect(findByScopeAndKey).not.toHaveBeenCalled();
  });
  it('does not turn database failures into a successful default', async () => {
    const { service, findByScopeAndKey } = setup({ defaultValue: false });
    findByScopeAndKey.mockRejectedValueOnce(new Error('DATABASE_DOWN'));
    await expect(service.readSetting('feature.test')).rejects.toThrow('DATABASE_DOWN');
  });
});
