import { describe, expect, it, vi } from 'vitest';
import { PrismaSettingDefinitionRepository } from '../../src/settings/PrismaSettingDefinitionRepository';
import { PrismaSettingAssignmentRepository } from '../../src/settings/PrismaSettingAssignmentRepository';
const now = new Date('2026-10-09T00:00:00Z');
const definition = (key: string) => ({ id: key, key, valueType: 'String', defaultValue: null, description: 'Description', isFeatureFlag: false, isDeprecated: false, isSecret: false, createdAt: now, updatedAt: now });
const assignment = (id: string) => ({ id, key: 'site.title', scopeLevel: 'GLOBAL', scopeId: 'GLOBAL', currentVersionId: id + '-v', createdAt: now, updatedAt: now, _count: { versions: 200 } });
const version = (id: string) => ({ id: id + '-v', assignmentId: id, valueType: 'String', value: 'Title', authorId: null, createdAt: now, rollbackOfVersionId: null, operation: 'SET', changeReason: null });

describe('Bounded Settings pages', () => {
  it('pages definitions in immutable unique-key order and pushes class/search filters to SQL', async () => {
    const findMany = vi.fn().mockResolvedValue([definition('a.key'), definition('b.key'), definition('c.key')]);
    const repo = new PrismaSettingDefinitionRepository({ settingDefinitionRecord: { findMany } } as any);
    const page = await repo.findPage({ limit: 2, q: 'desc', classification: 'SETTING', cursor: 'previous.key' });
    expect(page.items.map(item => item.key.getValue())).toEqual(['a.key', 'b.key']); expect(page.nextCursor).toBe('b.key');
    expect(findMany).toHaveBeenCalledWith({ take: 3, orderBy: { key: 'asc' }, where: {
      isSecret: false, isFeatureFlag: false, isDeprecated: false, key: { gt: 'previous.key' },
      OR: [{ key: { contains: 'desc', mode: 'insensitive' } }, { description: { contains: 'desc', mode: 'insensitive' } }],
    } });
    findMany.mockResolvedValue([definition('c.key')]);
    expect((await repo.findPage({ limit: 2, cursor: page.nextCursor })).nextCursor).toBeUndefined();
  });
  it('pages assignment summaries and fetches current versions only for the returned page', async () => {
    const findMany = vi.fn().mockResolvedValue([assignment('a'), assignment('b'), assignment('c')]);
    const versions = vi.fn().mockResolvedValue([version('a'), version('b')]);
    const repo = new PrismaSettingAssignmentRepository({ settingAssignmentRecord: { findMany }, settingVersionRecord: { findMany: versions } } as any);
    const page = await repo.readSummaryPage({ limit: 2, q: 'course', level: 'DOMAIN', cursor: 'previous' });
    expect(page.items.map(item => item.id)).toEqual(['a', 'b']); expect(page.nextCursor).toBe('b');
    expect(findMany).toHaveBeenCalledWith({ take: 3, orderBy: { id: 'asc' }, include: { _count: { select: { versions: true } } }, where: {
      key: undefined, scopeLevel: 'DOMAIN', scopeId: undefined, id: { gt: 'previous' },
      OR: [{ key: { contains: 'course', mode: 'insensitive' } }, { scopeId: { contains: 'course', mode: 'insensitive' } }],
    } });
    expect(versions).toHaveBeenCalledWith({ where: { id: { in: ['a-v', 'b-v'] } } });
    expect(page.items[0].versionCount).toBe(200);
  });
  it.each([0, 101, 1.1])('rejects invalid size %s before querying either list', async limit => {
    const findMany = vi.fn();
    const definitionRepo = new PrismaSettingDefinitionRepository({ settingDefinitionRecord: { findMany } } as any);
    const assignmentRepo = new PrismaSettingAssignmentRepository({ settingAssignmentRecord: { findMany } } as any);
    await expect(definitionRepo.findPage({ limit })).rejects.toThrow('SETTINGS_PAGE_LIMIT_INVALID');
    await expect(assignmentRepo.readSummaryPage({ limit })).rejects.toThrow('SETTINGS_PAGE_LIMIT_INVALID');
    expect(findMany).not.toHaveBeenCalled();
  });
  it('rejects foreign current pointers instead of returning another assignment value', async () => {
    const repo = new PrismaSettingAssignmentRepository({ settingAssignmentRecord: { findMany: vi.fn().mockResolvedValue([assignment('a')]) },
      settingVersionRecord: { findMany: vi.fn().mockResolvedValue([{ ...version('a'), assignmentId: 'foreign' }]) } } as any);
    await expect(repo.readSummaryPage({ limit: 2 })).rejects.toThrow('SETTINGS_DURABLE_CURRENT_VERSION_INVALID');
  });
});
