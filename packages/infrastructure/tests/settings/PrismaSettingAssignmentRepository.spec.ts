import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PrismaSettingAssignmentRepository } from '../../src/settings/PrismaSettingAssignmentRepository';
import { SettingAssignment, NamespacedKey, ScopeIdentifier, SettingVersion, StringValue, ScopeLevel } from '@manaratak/domain';

describe('PrismaSettingAssignmentRepository', () => {
  let mockPrisma: any;
  let repository: PrismaSettingAssignmentRepository;

  beforeEach(() => {
    mockPrisma = {
      $transaction: vi.fn(async (callback: (tx: any) => Promise<unknown>) => callback(mockPrisma)),
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
});
