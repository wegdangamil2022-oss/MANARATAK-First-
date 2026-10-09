import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PrismaSettingDefinitionRepository } from '../../src/settings/PrismaSettingDefinitionRepository';
import { SettingDefinition, NamespacedKey, ValueType } from '@manaratak/domain';

describe('PrismaSettingDefinitionRepository', () => {
  let mockPrisma: any;
  let repository: PrismaSettingDefinitionRepository;

  beforeEach(() => {
    mockPrisma = {
      $queryRaw: vi.fn(async () => []),
      $transaction: vi.fn(async (callback: (tx: any) => Promise<unknown>) => callback(mockPrisma)),
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
      validationRules: { minLength: 2, maxLength: 100 },
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
    expect(definition?.validationRules).toEqual({ minLength: 2, maxLength: 100 });

    mockPrisma.settingDefinitionRecord.upsert.mockResolvedValue(record);

    if (definition) {
      await repository.save(definition);
      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
      expect(mockPrisma.settingDefinitionRecord.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { key: 'test.key' },
          create: expect.objectContaining({
            id: 'def-1',
            key: 'test.key',
            valueType: 'String',
            description: 'A test definition',
            defaultValue: 'default',
            validationRules: { minLength: 2, maxLength: 100 },
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
  it('rejects stale metadata changes after obtaining the definition lock', async () => {
    const record = { id: 'definition', key: 'test.key', valueType: 'String', defaultValue: null,
      description: 'old', isFeatureFlag: false, isDeprecated: false, isSecret: false, updatedAt: new Date('2026-10-09T00:00:00Z') };
    mockPrisma.settingDefinitionRecord.findUnique.mockResolvedValue(record);
    const original = (await repository.findByKey(new NamespacedKey('test.key')))!;
    const updated = original.amendMetadata({ isDeprecated: true });
    mockPrisma.settingDefinitionRecord.findUnique.mockResolvedValue({ ...record, updatedAt: new Date('2026-10-09T00:00:01Z') });
    await expect(repository.save(updated)).rejects.toThrow('SETTINGS_DEFINITION_CONFLICT');
    expect(mockPrisma.settingDefinitionRecord.upsert).not.toHaveBeenCalled();
  });
  it('writes a monotonic revision and correlated owner metadata event without changing type/default/identity', async () => {
    const record = { id: 'definition', key: 'test.key', valueType: 'Boolean', defaultValue: false,
      description: 'old', isFeatureFlag: true, isDeprecated: false, isSecret: false, updatedAt: new Date() };
    mockPrisma.settingDefinitionRecord.findUnique.mockResolvedValue(record);
    const original = (await repository.findByKey(new NamespacedKey('test.key')))!;
    mockPrisma.transactionalOutboxRecord = { create: vi.fn() };
    await repository.save(original.amendMetadata({ description: 'new', isDeprecated: true }), { correlationId: 'request-123' });
    const update = mockPrisma.settingDefinitionRecord.upsert.mock.calls[0][0].update;
    expect(update).toMatchObject({ valueType: 'Boolean', defaultValue: false, isFeatureFlag: true, isDeprecated: true, description: 'new' });
    expect(update.updatedAt.getTime()).toBeGreaterThan(record.updatedAt.getTime());
    expect(mockPrisma.transactionalOutboxRecord.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      eventType: 'SettingDefinitionUpdated.v1', correlationId: 'request-123', aggregateId: 'definition',
    }) });
  });

});
