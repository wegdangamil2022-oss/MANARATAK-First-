import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PrismaSettingAssignmentRepository } from '../../src/settings/PrismaSettingAssignmentRepository';
import { SettingAssignment, NamespacedKey, ScopeIdentifier, SettingVersion, StringValue, ScopeLevel } from '@manaratak/domain';

describe('PrismaSettingAssignmentRepository', () => {
  let mockPrisma: any;
  let repository: PrismaSettingAssignmentRepository;

  beforeEach(() => {
    mockPrisma = {
      $queryRaw: vi.fn(async () => []),
      $transaction: vi.fn(async (callback: (tx: any) => Promise<unknown>) => callback(mockPrisma)),
      settingDefinitionRecord: { findUnique: vi.fn(async ({ where: { key } }: any) => ({ id: 'definition', key, valueType: 'String', defaultValue: null, isFeatureFlag: false, isSecret: false, isDeprecated: false })) },
      settingAssignmentRecord: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        upsert: vi.fn()
      },
      settingVersionRecord: {
        findUnique: vi.fn(),
        create: vi.fn()
      }
    };
    repository = new PrismaSettingAssignmentRepository(mockPrisma as any);
  });

  it('maps setting assignment round trip including versions', async () => {
    const vCreatedAt = new Date();
    
    const record = {
      id: 'assign-1',
      key: 'test.key',
      scopeLevel: 'TENANT',
      scopeId: 'tenant-123',
      currentVersionId: 'v-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      versions: [
        {
          id: 'v-1',
          assignmentId: 'assign-1',
          value: 'test-value',
          valueType: 'String',
          authorId: 'admin-1',
          createdAt: vCreatedAt,
          rollbackOfVersionId: null
        }
      ]
    };

    mockPrisma.settingAssignmentRecord.findUnique.mockResolvedValue(record);

    const assignment = await repository.findByScopeAndKey(
      new ScopeIdentifier('TENANT', 'tenant-123'),
      new NamespacedKey('test.key')
    );

    expect(assignment).not.toBeNull();
    expect(assignment?.id).toBe('assign-1');
    expect(assignment?.key.getValue()).toBe('test.key');
    expect(assignment?.scope.getLevel()).toBe(ScopeLevel.TENANT);
    expect(assignment?.scope.getScopeId()).toBe('tenant-123');
    
    const versions = assignment?.getVersions();
    expect(versions).toHaveLength(1);
    expect(versions?.[0].id).toBe('v-1');
    expect(versions?.[0].value.type).toBe('String');
    expect(versions?.[0].value.getValue()).toBe('test-value');

    mockPrisma.settingAssignmentRecord.upsert.mockResolvedValue(record);
    mockPrisma.settingVersionRecord.findUnique.mockResolvedValue(record.versions[0]);
    mockPrisma.settingVersionRecord.create.mockResolvedValue(record.versions[0]);

    if (assignment) {
      await repository.save(assignment);
      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
      expect(mockPrisma.settingAssignmentRecord.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { key_scopeLevel_scopeId: { key: 'test.key', scopeLevel: 'TENANT', scopeId: 'tenant-123' } },
          create: expect.objectContaining({
            id: 'assign-1',
            key: 'test.key',
            scopeLevel: 'TENANT',
            scopeId: 'tenant-123',
            currentVersionId: 'v-1'
          }),
          update: expect.objectContaining({
            currentVersionId: 'v-1'
          })
        })
      );

      expect(mockPrisma.settingVersionRecord.findUnique).toHaveBeenCalledWith({ where: { id: 'v-1' } });
      expect(mockPrisma.settingVersionRecord.create).not.toHaveBeenCalled();
    }
  });

  it('rejects moving the current pointer directly to an existing historical version', async () => {
    const assignment = new SettingAssignment({
      id: 'assign-1',
      key: new NamespacedKey('test.key'),
      scope: new ScopeIdentifier('TENANT', 'tenant-123'),
      versions: [
        new SettingVersion('v-2', new StringValue('current'), new Date('2026-09-05T00:00:00Z'), 'admin-1'),
        new SettingVersion('v-1', new StringValue('old'), new Date('2026-09-04T00:00:00Z'), 'admin-1'),
      ]
    });

    mockPrisma.settingAssignmentRecord.findUnique.mockImplementation(async (args: any) => {
      if ('id' in args.where || 'key_scopeLevel_scopeId' in args.where) {
        return {
          id: 'assign-1', key: 'test.key', scopeLevel: 'TENANT', scopeId: 'tenant-123',
          currentVersionId: 'v-2', createdAt: new Date(), updatedAt: new Date()
        };
      }
      return null;
    });
    mockPrisma.settingVersionRecord.findUnique.mockImplementation(async ({ where: { id } }: any) => ({
      id,
      assignmentId: 'assign-1',
      value: id === 'v-2' ? 'current' : 'old',
      valueType: 'String',
      authorId: 'admin-1',
      createdAt: new Date(),
      rollbackOfVersionId: null,
    }));

    await expect(repository.save(assignment)).rejects.toThrow(/rollback must create a new immutable version/i);
    expect(mockPrisma.settingAssignmentRecord.upsert).not.toHaveBeenCalled();
  });

  it('rejects assignment identity collisions across key/scope boundaries', async () => {
    const assignment = new SettingAssignment({
      id: 'assign-shared',
      key: new NamespacedKey('feature.new'),
      scope: new ScopeIdentifier('GLOBAL'),
      versions: [new SettingVersion('v-new', new StringValue('enabled'), new Date(), 'admin-2')]
    }, true);

    mockPrisma.settingAssignmentRecord.findUnique.mockImplementation(async (args: any) => {
      if ('id' in args.where) {
        return {
          id: 'assign-shared', key: 'feature.old', scopeLevel: 'GLOBAL', scopeId: 'GLOBAL',
          currentVersionId: 'v-old', createdAt: new Date(), updatedAt: new Date()
        };
      }
      return null;
    });

    await expect(repository.save(assignment)).rejects.toThrow(/already belongs to another key or scope/i);
    expect(mockPrisma.settingVersionRecord.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.settingAssignmentRecord.upsert).not.toHaveBeenCalled();
  });

  it('rejects reusing a persisted version id for another assignment', async () => {
    const assignment = new SettingAssignment({
      id: 'assign-2',
      key: new NamespacedKey('test.other'),
      scope: new ScopeIdentifier('GLOBAL'),
      versions: [new SettingVersion('shared-version', new StringValue('new-value'), new Date(), 'admin-2')]
    }, true);

    mockPrisma.settingAssignmentRecord.findUnique.mockResolvedValue(null);
    mockPrisma.settingAssignmentRecord.upsert.mockResolvedValue({});
    mockPrisma.settingVersionRecord.findUnique.mockResolvedValue({
      id: 'shared-version', assignmentId: 'assign-1', value: 'old-value', valueType: 'String',
      authorId: 'admin-1', createdAt: new Date(), rollbackOfVersionId: null
    });

    await expect(repository.save(assignment)).rejects.toThrow(/cannot be mutated or reassigned/i);
    expect(mockPrisma.settingVersionRecord.create).not.toHaveBeenCalled();
  });

  it('findBy returns all assignments that satisfy the spec', async () => {
    mockPrisma.settingAssignmentRecord.findMany.mockResolvedValue([
      {
        id: 'assign-1',
        key: 'test.key',
        scopeLevel: 'GLOBAL',
        scopeId: 'GLOBAL',
        currentVersionId: 'v-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        versions: [
          {
            id: 'v-1',
            assignmentId: 'assign-1',
            value: 'val1',
            valueType: 'String',
            authorId: null,
            createdAt: new Date(),
            rollbackOfVersionId: null
          }
        ]
      }
    ]);

    const assignments = await repository.findBy({
      isSatisfiedBy: (a) => a.id === 'assign-1'
    });

    expect(assignments).toHaveLength(1);
    expect(assignments[0].id).toBe('assign-1');
  });
  it('normalizes only the actual GLOBAL storage sentinel, rejecting hidden global identifiers', async () => {
    const row = { id: 'global', key: 'test.key', scopeLevel: 'GLOBAL', scopeId: 'GLOBAL', currentVersionId: 'v1',
      versions: [{ id: 'v1', valueType: 'String', value: 'value', createdAt: new Date() }] };
    mockPrisma.settingAssignmentRecord.findUnique.mockResolvedValue(row);
    const value = await repository.findByScopeAndKey(new ScopeIdentifier('GLOBAL'), new NamespacedKey('test.key'));
    expect(value?.scope.getScopeId()).toBeUndefined();
    expect(value?.getCurrentVersion().id).toBe('v1');
    mockPrisma.settingAssignmentRecord.findUnique.mockResolvedValue({ ...row, scopeId: 'hidden-id' });
    await expect(repository.findByScopeAndKey(new ScopeIdentifier('GLOBAL'), new NamespacedKey('test.key')))
      .rejects.toThrow('SETTINGS_GLOBAL_STORAGE_SCOPE_INVALID');
  });

  it('rechecks deprecated definitions inside the shared definition lock before any assignment write', async () => {
    const assignment = new SettingAssignment({ id: 'write', key: new NamespacedKey('test.key'),
      scope: new ScopeIdentifier('GLOBAL'), versions: [new SettingVersion('new', new StringValue('value'))] });
    mockPrisma.settingDefinitionRecord.findUnique.mockResolvedValue({ id: 'definition', key: 'test.key', valueType: 'String', isDeprecated: true });
    await expect(repository.save(assignment)).rejects.toThrow('SETTINGS_DEFINITION_NOT_WRITABLE');
    expect(mockPrisma.$queryRaw.mock.calls[0][1]).toBe('setting-definition:test.key');
    expect(mockPrisma.settingAssignmentRecord.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.settingAssignmentRecord.upsert).not.toHaveBeenCalled();
  });
  it('rejects changing a persisted CLEAR marker into SET under the same immutable version ID', async () => {
    const assignment = new SettingAssignment({ id: 'assignment', key: new NamespacedKey('test.key'),
      scope: new ScopeIdentifier('GLOBAL'), versions: [new SettingVersion('v1', new StringValue('value'))] });
    mockPrisma.settingAssignmentRecord.findUnique.mockResolvedValue({ id: 'assignment', key: 'test.key',
      scopeLevel: 'GLOBAL', scopeId: 'GLOBAL', currentVersionId: 'v1' });
    mockPrisma.settingVersionRecord.findUnique.mockResolvedValue({ id: 'v1', assignmentId: 'assignment',
      valueType: 'String', value: 'value', authorId: null, rollbackOfVersionId: null,
      operation: 'CLEAR_OVERRIDE', changeReason: 'Use inherited policy' });
    await expect(repository.save(assignment)).rejects.toThrow(/cannot be mutated or reassigned/);
    expect(mockPrisma.settingAssignmentRecord.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.settingVersionRecord.create).not.toHaveBeenCalled();
    expect(mockPrisma.$queryRaw.mock.calls.map((call: any[]) => call[1])).toEqual([
      'setting-definition:test.key', 'setting:test.key:GLOBAL:GLOBAL',
    ]);
  });
  it('persists an inheritance version and owner event with the request correlation', async () => {
    const now = new Date();
    const row = { id: 'assignment', key: 'test.key', scopeLevel: 'GLOBAL', scopeId: 'GLOBAL', currentVersionId: 'v1',
      versions: [{ id: 'v1', assignmentId: 'assignment', valueType: 'String', value: 'value', authorId: 'admin',
        rollbackOfVersionId: null, createdAt: now }] };
    mockPrisma.settingAssignmentRecord.findUnique.mockResolvedValue(row);
    const assignment = (await repository.findByScopeAndKey(new ScopeIdentifier('GLOBAL'), new NamespacedKey('test.key')))!;
    assignment.clearOverride('clear', 'admin', 'Return to inherited policy');
    mockPrisma.settingVersionRecord.findUnique.mockImplementation(async ({ where: { id } }: any) => id === 'v1' ? row.versions[0] : null);
    mockPrisma.transactionalOutboxRecord = { create: vi.fn() };
    await repository.save(assignment, { correlationId: 'request-123' });
    expect(mockPrisma.settingVersionRecord.create).toHaveBeenCalledWith({ data: expect.objectContaining({ id: 'clear',
      operation: 'CLEAR_OVERRIDE', changeReason: 'Return to inherited policy', value: 'value' }) });
    expect(mockPrisma.transactionalOutboxRecord.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      eventType: 'SettingOverrideCleared.v1', correlationId: 'request-123', payload: expect.objectContaining({ operation: 'CLEAR_OVERRIDE' }),
    }) });
    expect(assignment.domainEvents).toHaveLength(0);
  });

});
