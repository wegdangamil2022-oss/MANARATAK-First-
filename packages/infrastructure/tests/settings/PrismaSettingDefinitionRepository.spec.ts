import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PrismaSettingDefinitionRepository } from '../../src/settings/PrismaSettingDefinitionRepository';
import { SettingDefinition, NamespacedKey, ValueType } from '@manaratak/domain';

describe('PrismaSettingDefinitionRepository', () => {
  let mockPrisma: any;
  let repository: PrismaSettingDefinitionRepository;

  beforeEach(() => {
    mockPrisma = {
      settingDefinitionRecord: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        upsert: vi.fn()
      }
    };
    repository = new PrismaSettingDefinitionRepository(mockPrisma as any);
  });

  it('maps setting definition round trip', async () => {
    const record = {
      id: 'def-1',
      key: 'test.key',
      valueType: 'String',
      description: 'A test definition',
      defaultValue: 'default',
      isFeatureFlag: false,
      isDeprecated: false,
      isSecret: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockPrisma.settingDefinitionRecord.findUnique.mockResolvedValue(record);

    const definition = await repository.findByKey(new NamespacedKey('test.key'));

    expect(definition).not.toBeNull();
    expect(definition?.id).toBe('def-1');
    expect(definition?.key.getValue()).toBe('test.key');
    expect(definition?.valueType).toBe(ValueType.String);
    expect(definition?.description).toBe('A test definition');
    expect(definition?.defaultValue).toBe('default');

    mockPrisma.settingDefinitionRecord.upsert.mockResolvedValue(record);

    if (definition) {
      await repository.save(definition);
      expect(mockPrisma.settingDefinitionRecord.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { key: 'test.key' },
          create: expect.objectContaining({
            id: 'def-1',
            key: 'test.key',
            valueType: 'String',
            description: 'A test definition',
            defaultValue: 'default',
            isFeatureFlag: false,
            isDeprecated: false
          }),
          update: expect.objectContaining({
            valueType: 'String'
          })
        })
      );
    }
  });

  it('returns null when record not found', async () => {
    mockPrisma.settingDefinitionRecord.findUnique.mockResolvedValue(null);
    const definition = await repository.findByKey(new NamespacedKey('not.found'));
    expect(definition).toBeNull();
  });
});
