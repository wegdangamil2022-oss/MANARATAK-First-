import { createHash } from 'node:crypto';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { governanceApprovalDigest } from '../../../application/src/authorization/use-cases/GovernanceApprovalUseCases';
const policy = vi.hoisted(() => ({ enable: false }));
vi.mock('@manaratak/shared', async (importOriginal) => {
  const original = await importOriginal<any>();
  return {
    ...original,
    assertTranslationContentAuthoringEnabled: (...args: any[]) => {
      if (!policy.enable) return original.assertTranslationContentAuthoringEnabled(...args);
    },
  };
});
import { PrismaTranslationImportGateway } from '../../src/translation-import/PrismaTranslationImportGateway';
const digest = (value: unknown) =>
  createHash('sha256')
    .update(JSON.stringify(value ?? null))
    .digest('hex');
function fixture() {
  const candidate: any = {
    stagingKey: 'university:en:name',
    target: {
      locator: {
        entityKind: 'UNIVERSITY',
        entityPublicId: 'INS-TEST-001',
        locale: 'en',
        fieldKind: 'DISPLAY_NAME',
        fieldKey: 'displayName',
      },
      internalEntityId: 'owner',
      publicId: 'INS-TEST-001',
      entityStatus: 'PUBLISHED',
      currentValue: 'Name',
      currentReviewStatus: 'PUBLISHED',
      ownerRevision: '2026-10-14T00:00:00.000Z',
      sourceDigest: digest(null),
    },
    translatedValue: 'Name',
    expectedCurrentValue: 'Name',
    reviewStatus: 'APPROVED',
    evidence: {
      handoffId: 'handoff',
      execution: { dryRun: false },
      artifact: { artifactId: 'artifact' },
      provenance: {},
      correlationId: 'correlation',
    },
  };
  const approval = {
    decision: 'APPLY' as const,
    actorId: 'maker',
    reviewedBy: 'checker',
    approvalId: 'approval',
  };
  const decision = {
    id: 'approval',
    scope: 'TRANSLATION_TRANSFER',
    requestedBy: 'maker',
    approverId: 'checker',
    digest: governanceApprovalDigest('TRANSLATION_TRANSFER', {
      target: candidate.target,
      translatedValue: 'Name',
      handoffId: 'handoff',
    }),
    expiresAt: new Date(Date.now() + 60000).toISOString(),
    approvedAt: new Date().toISOString(),
    usedAt: null,
  };
  const tx: any = {
    $queryRaw: vi.fn().mockResolvedValue([]),
    policyRecord: {
      findUnique: vi
        .fn()
        .mockResolvedValue({
          id: 'approval',
          ruleType: 'GOVERNANCE_APPROVAL',
          ruleConfiguration: JSON.stringify(decision),
        }),
      update: vi.fn(),
    },
    ownerTranslationTransferReceipt: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
    },
    university: {
      findUnique: vi
        .fn()
        .mockResolvedValue({ id: 'owner', publicId: 'INS-TEST-001', status: 'PUBLISHED' }),
    },
    universityTranslation: {
      findUnique: vi
        .fn()
        .mockResolvedValue({
          id: 'translation',
          displayName: 'Name',
          description: 'Description',
          reviewStatus: 'PUBLISHED',
          updatedAt: new Date('2026-10-14T00:00:00.000Z'),
          metadata: null,
        }),
      upsert: vi.fn(),
    },
    auditRecord: { create: vi.fn() },
    transactionalOutboxRecord: { create: vi.fn() },
  };
  const db = { $transaction: vi.fn((task: any) => task(tx)) };
  const auth = { evaluatePermission: vi.fn().mockResolvedValue({ isGranted: true }) };
  return {
    candidate,
    approval,
    tx,
    db,
    gateway: new PrismaTranslationImportGateway(db as any, auth as any),
  };
}
beforeEach(() => {
  policy.enable = false;
});
describe('Translation transfer frozen mode and atomic ownership', () => {
  it('blocks the direct persistence boundary before touching a transaction', async () => {
    const f = fixture();
    await expect(f.gateway.applyApproved(f.candidate, f.approval)).rejects.toThrow();
    expect(f.db.$transaction).not.toHaveBeenCalled();
  });
  it('records an authorized no-op with owner audit/outbox and durable receipt in the same transaction', async () => {
    policy.enable = true;
    const f = fixture();
    const result = await f.gateway.applyApproved(f.candidate, f.approval);
    expect(result.state).toBe('NO_CHANGE');
    expect(f.tx.universityTranslation.upsert).not.toHaveBeenCalled();
    expect(f.tx.auditRecord.create).toHaveBeenCalledOnce();
    expect(f.tx.transactionalOutboxRecord.create).toHaveBeenCalledOnce();
    expect(f.tx.ownerTranslationTransferReceipt.create).toHaveBeenCalledOnce();
  });
  it('rejects forged checker identity against the persisted approval', async () => {
    policy.enable = true;
    const f = fixture();
    await expect(
      f.gateway.applyApproved(f.candidate, { ...f.approval, reviewedBy: 'forged' }),
    ).rejects.toThrow('GOVERNANCE_APPROVAL_REQUIRED');
    expect(f.tx.universityTranslation.upsert).not.toHaveBeenCalled();
    expect(f.tx.ownerTranslationTransferReceipt.create).not.toHaveBeenCalled();
  });
  it('detects stale review revisions even when text is unchanged', async () => {
    policy.enable = true;
    const f = fixture();
    f.candidate.target.ownerRevision = '2026-10-13T00:00:00.000Z';
    f.tx.policyRecord.findUnique.mockResolvedValue({
      id: 'approval',
      ruleType: 'GOVERNANCE_APPROVAL',
      ruleConfiguration: JSON.stringify({
        scope: 'TRANSLATION_TRANSFER',
        requestedBy: 'maker',
        approverId: 'checker',
        digest: governanceApprovalDigest('TRANSLATION_TRANSFER', {
          target: f.candidate.target,
          translatedValue: 'Name',
          handoffId: 'handoff',
        }),
        expiresAt: new Date(Date.now() + 60000).toISOString(),
        approvedAt: new Date().toISOString(),
        usedAt: null,
      }),
    });
    await expect(f.gateway.applyApproved(f.candidate, f.approval)).rejects.toThrow(
      'TRANSLATION_STALE_DIFF_REVIEW_REQUIRED',
    );
    expect(f.tx.auditRecord.create).not.toHaveBeenCalled();
  });
  it('stages an approved import without replacing the current published owner text',async()=>{
    policy.enable=true;const f=fixture();f.candidate.translatedValue='New reviewed name';
    f.tx.policyRecord.findUnique.mockResolvedValue({id:'approval',ruleType:'GOVERNANCE_APPROVAL',ruleConfiguration:JSON.stringify({scope:'TRANSLATION_TRANSFER',requestedBy:'maker',approverId:'checker',digest:governanceApprovalDigest('TRANSLATION_TRANSFER',{target:f.candidate.target,translatedValue:f.candidate.translatedValue,handoffId:'handoff'}),expiresAt:new Date(Date.now()+60000).toISOString(),approvedAt:new Date().toISOString(),usedAt:null})});
    const result=await f.gateway.applyApproved(f.candidate,f.approval);
    expect(result.published).toBe(false);
    const write=f.tx.universityTranslation.upsert.mock.calls[0][0];
    expect(write.update.displayName).toBeUndefined();expect(write.update.reviewStatus).toBeUndefined();
    expect(write.update.metadata.pendingTranslationFields.displayName.value).toBe('New reviewed name');
  });

  it('does not commit a receipt when its required owner audit fails', async () => {
    policy.enable = true;
    const f = fixture();
    f.tx.auditRecord.create.mockRejectedValue(new Error('audit unavailable'));
    await expect(f.gateway.applyApproved(f.candidate, f.approval)).rejects.toThrow(
      'audit unavailable',
    );
    expect(f.tx.ownerTranslationTransferReceipt.create).not.toHaveBeenCalled();
  });
});
