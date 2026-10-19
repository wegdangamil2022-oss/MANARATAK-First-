import { universityTranslationSourceDigest } from '../../src/universities/UniversityTranslationSourceEvidence';
import { createHash } from 'node:crypto';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { governanceApprovalDigest } from '../../../application/src/authorization/use-cases/GovernanceApprovalUseCases';
const policy = vi.hoisted(() => ({ enable: false }));
vi.mock('@absheer/shared', async (importOriginal) => {
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
      sourceDigest: digest({source:{id:'owner',publicId:'INS-TEST-001',status:'PUBLISHED'},translation:null}),
      ownerSourceDigest:universityTranslationSourceDigest({id:'owner',publicId:'INS-TEST-001',status:'PUBLISHED'}),
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
  const db = { $transaction: vi.fn((task: any) => task(tx)),university:tx.university,universityTranslation:tx.universityTranslation };
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

describe('B11 canonical source freshness and durable replay',()=>{
 it('rejects a source change even when the translated text and target timestamp are unchanged',async()=>{policy.enable=true;const f=fixture();f.tx.university.findUnique.mockResolvedValue({id:'owner',publicId:'INS-TEST-001',status:'PUBLISHED',displayName:'Changed canonical name'});await expect(f.gateway.applyApproved(f.candidate,f.approval)).rejects.toThrow('STALE_DIFF_REVIEW_REQUIRED');expect(f.tx.universityTranslation.upsert).not.toHaveBeenCalled();expect(f.tx.ownerTranslationTransferReceipt.create).not.toHaveBeenCalled();});
 it('requires fresh canonical source evidence for a new transfer',async()=>{policy.enable=true;const f=fixture();delete f.candidate.target.ownerSourceDigest;await expect(f.gateway.applyApproved(f.candidate,f.approval)).rejects.toThrow('SOURCE_EVIDENCE_REQUIRED');expect(f.tx.policyRecord.update).not.toHaveBeenCalled();});
 it('replays the durable receipt without applying or consuming approval twice',async()=>{policy.enable=true;const f=fixture();let receipt:any=null;f.tx.ownerTranslationTransferReceipt.findUnique.mockImplementation(async()=>receipt);f.tx.ownerTranslationTransferReceipt.create.mockImplementation(async({data}:any)=>{receipt=data;});await f.gateway.applyApproved(f.candidate,f.approval);await f.gateway.applyApproved(f.candidate,f.approval);expect(f.tx.ownerTranslationTransferReceipt.create).toHaveBeenCalledOnce();expect(f.tx.auditRecord.create).toHaveBeenCalledOnce();expect(f.tx.policyRecord.update).toHaveBeenCalledOnce();});
 it('stores source proof on pending text and refuses publication after the source changes despite a fresh publication approval',async()=>{
  policy.enable=true;const f=fixture();f.candidate.translatedValue='New translated name';
  f.tx.policyRecord.findUnique.mockResolvedValue({id:'approval',ruleType:'GOVERNANCE_APPROVAL',ruleConfiguration:JSON.stringify({scope:'TRANSLATION_TRANSFER',requestedBy:'maker',approverId:'checker',digest:governanceApprovalDigest('TRANSLATION_TRANSFER',{target:f.candidate.target,translatedValue:f.candidate.translatedValue,handoffId:'handoff'}),expiresAt:new Date(Date.now()+60000).toISOString(),approvedAt:new Date().toISOString(),usedAt:null})});
  await f.gateway.applyApproved(f.candidate,f.approval);
  const metadata=f.tx.universityTranslation.upsert.mock.calls[0][0].update.metadata;
  expect(metadata.translationFieldEvidence.displayName.ownerSourceDigest).toBe(f.candidate.target.ownerSourceDigest);
  f.tx.universityTranslation.findUnique.mockResolvedValue({id:'translation',displayName:'Name',description:'Description',reviewStatus:'PUBLISHED',updatedAt:new Date('2026-10-14'),metadata});
  f.tx.university.findUnique.mockResolvedValue({id:'owner',publicId:'INS-TEST-001',status:'PUBLISHED',displayName:'Changed source'});
  f.tx.universityTranslation.findUniqueOrThrow=vi.fn(async()=>f.tx.universityTranslation.findUnique());
  const target=await f.gateway.resolveExact(f.candidate.target.locator);
  f.tx.policyRecord.findUnique.mockResolvedValue({id:'publish',ruleType:'GOVERNANCE_APPROVAL',ruleConfiguration:JSON.stringify({scope:'TRANSLATION_PUBLICATION',requestedBy:'publisher',approverId:'checker',digest:governanceApprovalDigest('TRANSLATION_PUBLICATION',{target}),expiresAt:new Date(Date.now()+60000).toISOString(),approvedAt:new Date().toISOString(),usedAt:null})});
  await expect(f.gateway.publishApproved(target!,{decision:'APPLY',actorId:'publisher',reviewedBy:'checker',approvalId:'publish'})).rejects.toThrow('SOURCE_CHANGED_REVIEW_REQUIRED');
 });
});

async function publicationFixture(pendingDescription = true) {
  policy.enable = true;
  const f = fixture();
  const metadata: any = {
    pendingTranslationFields: {
      displayName: {value:'Reviewed name',reviewStatus:'APPROVED',actorId:'maker'},
      ...(pendingDescription ? {description:{value:'Reviewed description',reviewStatus:'APPROVED',actorId:'maker'}} : {}),
    },
    translationFieldEvidence: {
      displayName:{ownerSourceDigest:f.candidate.target.ownerSourceDigest},
      description:{ownerSourceDigest:f.candidate.target.ownerSourceDigest},
    },
  };
  const row: any = {id:'translation',locale:'en',displayName:'Old name',description:'Old description',reviewStatus:'PUBLISHED',updatedAt:new Date('2026-10-14'),metadata};
  f.tx.universityTranslation.findUnique.mockResolvedValue(row);
  f.tx.universityTranslation.findUniqueOrThrow=vi.fn(async()=>row);
  f.tx.universityTranslation.updateMany=vi.fn(async()=>({count:1}));
  const target=await f.gateway.resolveExact(f.candidate.target.locator);
  const approval={decision:'APPLY' as const,actorId:'publisher',reviewedBy:'checker',approvalId:'publication'};
  f.tx.policyRecord.findUnique.mockResolvedValue({id:'publication',ruleType:'GOVERNANCE_APPROVAL',ruleConfiguration:JSON.stringify({scope:'TRANSLATION_PUBLICATION',requestedBy:'publisher',approverId:'checker',digest:governanceApprovalDigest('TRANSLATION_PUBLICATION',{target}),expiresAt:new Date(Date.now()+60000).toISOString(),approvedAt:new Date().toISOString(),usedAt:null})});
  return {...f,row,target:target!,publicationApproval:approval};
}
describe('B11 grouped university publication evidence',()=>{
  it('records proof for the exact locale and both reviewed fields in one CAS write',async()=>{
    const f=await publicationFixture();
    await f.gateway.publishApproved(f.target,f.publicationApproval);
    const data=f.tx.universityTranslation.updateMany.mock.calls[0][0].data;
    const {universityTranslationValueDigest}=await import('../../src/universities/UniversityTranslationSourceEvidence');
    expect(data).toMatchObject({displayName:'Reviewed name',description:'Reviewed description',reviewStatus:'PUBLISHED',metadata:{publishedTranslationApprovalId:'publication',publishedTranslationEvidence:{ownerSourceDigest:f.target.ownerSourceDigest,valueDigest:universityTranslationValueDigest({locale:'en',displayName:'Reviewed name',description:'Reviewed description'})}}});
    expect(data.metadata.pendingTranslationFields).toEqual({});
  });
  it('requires review of a legacy counterpart instead of silently legitimizing it',async()=>{
    const f=await publicationFixture(false);
    await expect(f.gateway.publishApproved(f.target,f.publicationApproval)).rejects.toThrow('SOURCE_CHANGED_REVIEW_REQUIRED');
    expect(f.tx.universityTranslation.updateMany).not.toHaveBeenCalled();
  });
});
