import { describe, expect, it, vi } from 'vitest';
import { ConfigurationValidationService, NamespacedKey, ScopeIdentifier, SettingDefinition, SettingVersion, StringValue, ValueType } from '@manaratak/domain';
import { ManageSettingsUseCase } from '../../src/settings/use-cases/ManageSettingsUseCase';

function fixture(secret: boolean, missing = false) {
  const version = new SettingVersion('v', new StringValue('private material'), new Date(), 'admin', undefined, 'SET', 'private reason');
  const definitions = { findByKey: vi.fn().mockResolvedValue(missing ? null : new SettingDefinition({ id: 'd', key: new NamespacedKey('site.title'), valueType: ValueType.String, isSecret: secret })) };
  const assignments = { readSummaries: vi.fn().mockResolvedValue([{ id: 'a', key: 'site.title', scope: new ScopeIdentifier('GLOBAL'), currentVersion: version, versionCount: 500 }]),
    readHistory: vi.fn().mockResolvedValue({ key: 'site.title', versions: [version], nextCursor: 'v' }), findBy: vi.fn() };
  return { assignments, useCase: new ManageSettingsUseCase(definitions as any, assignments as any, new ConfigurationValidationService()) };
}
describe('Settings read redaction', () => {
  it.each([[true, false], [false, true]])('redacts secrets or missing definitions before API serialization', async (secret, missing) => {
    const { useCase, assignments } = fixture(secret, missing);
    const summaries = await useCase.listAssignmentSummaries({ level: 'GLOBAL' as any });
    expect(summaries[0]).toMatchObject({ currentValue: '********', versions: [], versionCount: 500 });
    const history = await useCase.assignmentHistory('a', 'v', 20, 'older');
    expect(history.versions[0].value).toBe('********'); expect(history.versions[0].changeReason).toBeUndefined();
    expect(JSON.stringify({ summaries, history })).not.toContain('private');
    expect(assignments.findBy).not.toHaveBeenCalled();
    expect(assignments.readHistory).toHaveBeenCalledWith('a', 'v', 20, 'older');
  });
  it('retains safe values and reasons for nonsecret settings', async () => {
    const { useCase } = fixture(false);
    expect((await useCase.assignmentHistory('a', 'v')).versions[0]).toMatchObject({ value: 'private material', changeReason: 'private reason' });
  });
});
