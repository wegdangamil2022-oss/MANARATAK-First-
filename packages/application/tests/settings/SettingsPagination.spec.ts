import { describe, expect, it, vi } from 'vitest';
import { ConfigurationValidationService, NamespacedKey, ScopeIdentifier, ScopeLevel, SettingDefinition, SettingVersion, StringValue, ValueType } from '@manaratak/domain';
import { ManageSettingsUseCase } from '../../src/settings/use-cases/ManageSettingsUseCase';
const def = (key: string, isSecret = false, isDeprecated = false) => new SettingDefinition({ id: key, key: new NamespacedKey(key), valueType: ValueType.String, isSecret, isDeprecated, revision: '2026-10-09T00:00:00Z' });
const row = (key: string) => ({ id: key, key, scope: new ScopeIdentifier('GLOBAL'), versionCount: 100,
  currentVersion: new SettingVersion(key + '-v', new StringValue('stored-' + key), new Date()) });
function fixture() {
  const definitions = { findByKey: vi.fn().mockResolvedValue(def('site.title')), findByKeys: vi.fn().mockResolvedValue([def('site.title'), def('site.secret', true), def('site.deprecated', false, true)]),
    findPage: vi.fn().mockResolvedValue({ items: [def('site.title'), def('site.secret', true)], nextCursor: 'site.secret' }), findAll: vi.fn() };
  const assignments = { readSummaryPage: vi.fn().mockResolvedValue({ items: ['site.title', 'site.secret', 'site.deprecated', 'site.missing'].map(row), nextCursor: 'next' }), readSummaries: vi.fn(), findBy: vi.fn() };
  return { definitions, assignments, useCase: new ManageSettingsUseCase(definitions as any, assignments as any, new ConfigurationValidationService()) };
}
describe('Settings paginated admin reads', () => {
  it('bulk-loads owner definitions once, redacts unknown/secrets and provides independent writability', async () => {
    const f = fixture(); const page = await f.useCase.assignmentPage({ limit: 50, q: 'site' });
    expect(f.definitions.findByKeys).toHaveBeenCalledTimes(1); expect(f.definitions.findByKey).not.toHaveBeenCalled();
    expect(page.assignments.map(item => [item.key, item.isWritable, item.currentValue])).toEqual([
      ['site.title', true, 'stored-site.title'], ['site.secret', false, '********'], ['site.deprecated', false, 'stored-site.deprecated'], ['site.missing', false, '********'],
    ]);
    expect(f.assignments.findBy).not.toHaveBeenCalled(); expect(f.assignments.readSummaries).not.toHaveBeenCalled(); expect(page.nextCursor).toBe('next');
  });
  it('keeps definition revision/secret policy and continuation without using full-list reads', async () => {
    const f = fixture(); const page = await f.useCase.definitionPage({ limit: 20 });
    expect(page.definitions[0].revision).toBe('2026-10-09T00:00:00Z'); expect(page.definitions[1].defaultValue).toBeUndefined();
    expect(page.nextCursor).toBe('site.secret'); expect(f.definitions.findAll).not.toHaveBeenCalled();
  });
  it('looks up off-page GLOBAL assignments using the storage sentinel, not the visible list', async () => {
    const f = fixture(); f.assignments.readSummaryPage.mockResolvedValue({ items: [row('site.title')], nextCursor: undefined });
    const context = await f.useCase.assignmentContext('site.title', ScopeLevel.GLOBAL);
    expect(context.assignment?.currentVersionId).toBe('site.title-v');
    expect(f.assignments.readSummaryPage).toHaveBeenCalledWith({ key: 'site.title', level: 'GLOBAL', scopeId: 'GLOBAL', limit: 1 });
  });
  it('returns explicit absence only after an exact owner query', async () => {
    const f = fixture(); f.assignments.readSummaryPage.mockResolvedValue({ items: [] });
    expect((await f.useCase.assignmentContext('site.title', ScopeLevel.DOMAIN, 'courses')).assignment).toBeNull();
    expect(f.assignments.readSummaryPage).toHaveBeenCalledWith({ key: 'site.title', level: 'DOMAIN', scopeId: 'courses', limit: 1 });
  });
  it('rejects invalid GLOBAL scope and a missing definition rather than treating lookup failure as absence', async () => {
    const f = fixture(); await expect(f.useCase.assignmentContext('site.title', ScopeLevel.GLOBAL, 'illegal')).rejects.toThrow();
    expect(f.assignments.readSummaryPage).not.toHaveBeenCalled();
    f.definitions.findByKey.mockResolvedValue(null);
    await expect(f.useCase.assignmentContext('site.missing', ScopeLevel.GLOBAL)).rejects.toThrow('SETTINGS_DEFINITION_NOT_FOUND');
  });
});
