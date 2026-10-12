import { describe, expect, it, vi, afterEach } from 'vitest';
import { PrismaSettingsGovernanceGateway } from '../../src/settings/PrismaSettingsGovernanceGateway';
import { PrismaSettingAssignmentRepository } from '../../src/settings/PrismaSettingAssignmentRepository';
const input = {
  kind: 'VALUES' as const,
  expectedPolicyRevision: 0,
  changes: [
    { key: 'one', level: 'GLOBAL' as const, expectedCurrentVersionId: null, value: 1 },
    { key: 'two', level: 'GLOBAL' as const, expectedCurrentVersionId: null, value: 2 },
  ],
};
function setup() {
  let proposal: any = null;
  const db: any = {
    $queryRaw: vi.fn().mockResolvedValue([]),
    settingsGovernanceRecord: {
      findUnique: vi.fn(async ({ where }: any) => (where.id === 'dependencies' ? null : proposal)),
      update: vi.fn(),
    },
    settingDefinitionRecord: {
      findUnique: vi.fn(async ({ where }: any) => ({
        id: where.key,
        key: where.key,
        valueType: 'Number',
        isSecret: false,
        isDeprecated: false,
        updatedAt: new Date('2026-10-12T00:00:00Z'),
        consumerDomain: null,
        validationRules: null,
      })),
      findUniqueOrThrow: vi.fn(async () => ({ valueType: 'Number' })),
    },
    settingAssignmentRecord: { findUnique: vi.fn().mockResolvedValue(null) },
  };
  const gateway = new PrismaSettingsGovernanceGateway(db, true);
  return {
    db,
    gateway,
    proposal: (digest: string) => {
      proposal = {
        id: 'change-set:p',
        kind: 'PROPOSAL',
        createdBy: 'requester',
        approverId: 'reviewer',
        approvedAt: new Date(),
        consumedAt: null,
        expiresAt: new Date(Date.now() + 60000),
        payload: {
          ...input,
          id: 'p',
          approverId: 'reviewer',
          previewDigest: digest,
          reason: 'test changes',
        },
      };
      return proposal;
    },
  };
}
afterEach(() => vi.restoreAllMocks());
describe('Settings change-set transaction boundary', () => {
  it('preview never saves assignments or approval records', async () => {
    const f = setup();
    const save = vi.spyOn(PrismaSettingAssignmentRepository.prototype, 'save');
    const preview = await f.gateway.preview(input);
    expect(preview.rows).toHaveLength(2);
    expect(save).not.toHaveBeenCalled();
    expect(f.db.settingsGovernanceRecord.update).not.toHaveBeenCalled();
  });
  it('does not consume approval if a later write fails', async () => {
    const f = setup();
    const preview = await f.gateway.preview(input);
    f.proposal(preview.previewDigest);
    const save = vi
      .spyOn(PrismaSettingAssignmentRepository.prototype, 'save')
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('second write failed'));
    await expect(f.gateway.commit('p', 'requester', 'trace')).rejects.toThrow(
      'second write failed',
    );
    expect(save).toHaveBeenCalledTimes(2);
    expect(f.db.settingsGovernanceRecord.update).not.toHaveBeenCalled();
  });
  it('rejects an unapproved proposal before any assignment write', async () => {
    const f = setup();
    const preview = await f.gateway.preview(input);
    f.proposal(preview.previewDigest).approvedAt = null;
    const save = vi.spyOn(PrismaSettingAssignmentRepository.prototype, 'save');
    await expect(f.gateway.commit('p', 'requester', 'trace')).rejects.toThrow(
      'SETTINGS_INDEPENDENT_APPROVAL_REQUIRED',
    );
    expect(save).not.toHaveBeenCalled();
  });
  it('rejects stale versions before writes', async () => {
    const f = setup();
    const preview = await f.gateway.preview(input);
    f.proposal(preview.previewDigest);
    f.db.settingAssignmentRecord.findUnique.mockResolvedValue({
      currentVersionId: 'changed',
      currentVersion: { value: 0 },
    });
    await expect(f.gateway.commit('p', 'requester', 'trace')).rejects.toThrow(
      'SETTINGS_VERSION_CONFLICT',
    );
    expect(f.db.settingsGovernanceRecord.update).not.toHaveBeenCalled();
  });
  it('never includes secret values in preview', async () => {
    const f = setup();
    f.db.settingDefinitionRecord.findUnique.mockResolvedValue({ isSecret: true });
    await expect(f.gateway.preview(input)).rejects.toThrow('SETTINGS_DEFINITION_NOT_WRITABLE');
  });
});
