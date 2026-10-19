import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { NamespacedKey, NumberValue, ScopeIdentifier, ScopeLevel, SettingAssignment, SettingVersion,
  StringValue, ValueType, type SettingValidationRules, type SettingValueData } from '@absheer/domain';
import { PrismaSettingAssignmentRepository } from '../../src/settings/PrismaSettingAssignmentRepository';

describe('Settings persisted constraint boundary', () => {
  it.each([
    { type: ValueType.Number, defaultValue: 1, rules: { max: 10 }, value: new NumberValue(11) },
    { type: ValueType.String, defaultValue: 'a', rules: { maxLength: 3 }, value: new StringValue('too long') },
  ] as Array<{ type: ValueType; defaultValue: unknown; rules: SettingValidationRules; value: SettingValueData }>)
  ('rejects direct repository writes that violate persisted $type rules before saving any value', async ({ type, defaultValue, rules, value }) => {
    const db = { settingsGovernanceRecord:{findUnique:vi.fn().mockResolvedValue(null)}, $queryRaw: vi.fn().mockResolvedValue([]),
      settingDefinitionRecord: { findUnique: vi.fn().mockResolvedValue({ id: 'definition', key: 'review.limit', valueType: type,
        defaultValue, validationRules: rules, isFeatureFlag: false, isSecret: false, isDeprecated: false }) },
      settingAssignmentRecord: { findUnique: vi.fn(), upsert: vi.fn() },
      settingVersionRecord: { create: vi.fn() }, transactionalOutboxRecord: { create: vi.fn() } };
    const assignment = new SettingAssignment({ id: 'assignment', key: new NamespacedKey('review.limit'),
      scope: new ScopeIdentifier(ScopeLevel.GLOBAL), versions: [new SettingVersion('version', value)] });
    const repository = new PrismaSettingAssignmentRepository(db as unknown as PrismaClient, true);
    await expect(repository.save(assignment)).rejects.toThrow();
    expect(db.settingAssignmentRecord.findUnique).not.toHaveBeenCalled();
    expect(db.settingVersionRecord.create).not.toHaveBeenCalled();
    expect(db.transactionalOutboxRecord.create).not.toHaveBeenCalled();
  });
});
