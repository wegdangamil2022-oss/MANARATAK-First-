import { describe, expect, it, vi } from 'vitest';
import { PrismaSettingAssignmentRepository } from '../../src/settings/PrismaSettingAssignmentRepository';

const now = new Date('2026-10-09T00:00:00Z');
const assignment = { id: 'a', key: 'site.title', scopeLevel: 'GLOBAL', scopeId: 'GLOBAL', currentVersionId: 'v3', createdAt: now, updatedAt: now, _count: { versions: 3 } };
const version = (id: string, owner = 'a') => ({ id, assignmentId: owner, value: 'title', valueType: 'String', authorId: null, createdAt: now, rollbackOfVersionId: null, operation: 'SET', changeReason: null });
function fixture() {
  const db = { settingAssignmentRecord: { findUnique: vi.fn().mockResolvedValue(assignment), findMany: vi.fn().mockResolvedValue([assignment]) },
    settingVersionRecord: { findMany: vi.fn().mockResolvedValue([version('v3'), version('v2'), version('v1')]), findUnique: vi.fn().mockImplementation(async ({ where }: { where: { id: string } }) => version(where.id)) } };
  return { db, repo: new PrismaSettingAssignmentRepository(db as any) };
}

describe('Settings read projections', () => {
  it('pushes filters into SQL and reads current values/counts without loading version history', async () => {
    const { db, repo } = fixture(); db.settingVersionRecord.findMany.mockResolvedValue([version('v3')]);
    const rows = await repo.readSummaries({ key: 'site.title', level: 'GLOBAL' });
    expect(db.settingAssignmentRecord.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { key: 'site.title', scopeLevel: 'GLOBAL', scopeId: undefined }, include: { _count: { select: { versions: true } } },
    }));
    expect(db.settingVersionRecord.findMany).toHaveBeenCalledWith({ where: { id: { in: ['v3'] } } });
    expect(rows[0].scope.getScopeId()).toBeUndefined();
    expect(rows[0].versionCount).toBe(3); expect(rows[0].currentVersion.id).toBe('v3');
  });
  it('rejects a current pointer belonging to another assignment', async () => {
    const { db, repo } = fixture(); db.settingVersionRecord.findMany.mockResolvedValue([version('v3', 'other')]);
    await expect(repo.readSummaries({})).rejects.toThrow('SETTINGS_CURRENT_VERSION_INVALID');
  });
  it('bounds history and uses timestamp/id ordering for tied timestamps', async () => {
    const { db, repo } = fixture(); const page = await repo.readHistory('a', 'v3', 2);
    expect(page.versions.map(row => row.id)).toEqual(['v3', 'v2']); expect(page.nextCursor).toBe('v2');
    expect(db.settingVersionRecord.findMany).toHaveBeenCalledWith({ where: { assignmentId: 'a' }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 3 });
    db.settingVersionRecord.findMany.mockResolvedValue([version('v1')]);
    const tail = await repo.readHistory('a', 'v3', 2, page.nextCursor);
    expect(tail.nextCursor).toBeUndefined();
    expect(db.settingVersionRecord.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: {
      assignmentId: 'a', OR: [{ createdAt: { lt: now } }, { createdAt: now, id: { lt: 'v2' } }],
    } }));
  });
  it('rejects foreign cursors without returning a page', async () => {
    const { db, repo } = fixture(); db.settingVersionRecord.findUnique.mockResolvedValueOnce(version('v3')).mockResolvedValueOnce(version('v2', 'other'));
    await expect(repo.readHistory('a', 'v3', 2, 'v2')).rejects.toThrow('SETTINGS_HISTORY_CURSOR_INVALID');
    expect(db.settingVersionRecord.findMany).not.toHaveBeenCalled();
  });
  it.each([0, 101, 1.5])('rejects unbounded page size %s', async limit => {
    const { db, repo } = fixture(); await expect(repo.readHistory('a', 'v3', limit)).rejects.toThrow('Invalid history page size');
    expect(db.settingAssignmentRecord.findUnique).not.toHaveBeenCalled();
  });
  it('rejects a stale expected current version before reading history', async () => {
    const { db, repo } = fixture(); await expect(repo.readHistory('a', 'old', 2)).rejects.toThrow('SETTINGS_ASSIGNMENT_CONFLICT');
    expect(db.settingVersionRecord.findMany).not.toHaveBeenCalled();
  });
  it('fails closed when the history current pointer belongs to another assignment', async () => {
    const { db, repo } = fixture(); db.settingVersionRecord.findUnique.mockResolvedValue(version('v3', 'other'));
    await expect(repo.readHistory('a', 'v3', 2)).rejects.toThrow('SETTINGS_DURABLE_CURRENT_VERSION_INVALID');
    expect(db.settingVersionRecord.findMany).not.toHaveBeenCalled();
  });
  it('detects writes racing the page read', async () => {
    const { db, repo } = fixture(); db.settingAssignmentRecord.findUnique.mockResolvedValueOnce(assignment).mockResolvedValueOnce({ ...assignment, currentVersionId: 'v4' });
    await expect(repo.readHistory('a', 'v3', 2)).rejects.toThrow('SETTINGS_ASSIGNMENT_CONFLICT');
  });
});
