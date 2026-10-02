import { describe, expect, it, vi } from 'vitest';
import { actorId, reviewBody, reviewEntry } from './fixtures/reviewedTestImport';
import { InternationalTestImportChangeExecutor, internationalTestImportHash, internationalTestSourceHash, prepareInternationalTestImport, validateInternationalTestImportPlan, type InternationalTestImportChangeGateway } from '../../src/tests-platform/use-cases/InternationalTestImportChangeSet';

describe('reviewed test import contract', () => {
  it('seals all source/mapping decisions and remains offline', () => {
    const plan = prepareInternationalTestImport(reviewBody());
    expect(validateInternationalTestImportPlan(plan)).toEqual(plan);
    expect(plan.databaseWrites).toBe(0);
    expect(internationalTestImportHash({ b: 2, a: 1 })).toBe(internationalTestImportHash({ a: 1, b: 2 }));
    expect(plan.entries[0].rawContent).toContain('المصدر الأصلي');
  });
  it.each(['targetId', 'reviewReason', 'sourceCycle', 'sourceHash'])('rejects tampering with %s', field => {
    const plan = prepareInternationalTestImport(reviewBody());
    const input = structuredClone(plan);
    Object.assign(input.entries[0], { [field]: field === 'targetId' ? actorId : field === 'sourceHash' ? 'b'.repeat(64) : field === 'sourceCycle' ? '2027' : 'changed' });
    expect(() => validateInternationalTestImportPlan(input)).toThrow();
  });
  it.each([[], Array.from({ length: 6 }, reviewEntry)])('rejects empty or bulk batches', entries => {
    expect(() => prepareInternationalTestImport({ ...reviewBody(), entries })).toThrow();
  });
  it('rejects extra publication/security fields', () => {
    const body = reviewBody();
    Object.assign(body.entries[0].core, { isPubliclyVisible: true });
    expect(() => prepareInternationalTestImport(body)).toThrow();
  });
  it.each(['../outside.md', 'language/../../outside.md', '/absolute.md'])('rejects source path %s', sourceKey => {
    expect(() => prepareInternationalTestImport({ ...reviewBody(), entries: [{ ...reviewEntry(), sourceKey }] })).toThrow();
  });
  it('requires explicit review resolution and evidence, including REVIEW_REQUIRED', () => {
    const body = reviewBody();
    const entry = { ...reviewEntry(), sourceClassification: 'REVIEW_REQUIRED' };
    expect(() => prepareInternationalTestImport({ ...body, entries: [{ ...entry, resolution: undefined }] })).toThrow();
    expect(() => prepareInternationalTestImport({ ...body, entries: [{ ...entry, evidenceReference: '' }] })).toThrow();
    expect(prepareInternationalTestImport({ ...body, entries: [entry] }).entries[0].sourceClassification).toBe('REVIEW_REQUIRED');
  });
  it.each(['REPLACE_EXISTING', 'NEW_TEST'])('denies opposite classification mapping %s', sourceClassification => {
    const resolution = sourceClassification === 'NEW_TEST' ? 'APPROVE_UPDATE' : 'APPROVE_CREATE';
    expect(() => prepareInternationalTestImport({ ...reviewBody(), entries: [{ ...reviewEntry(), sourceClassification, resolution }] })).toThrow('CLASSIFICATION_RESOLUTION');
  });
  it.each(['no sections', '## 2. Missing one\ntext', '## 1. First\ntext\n## 3. Gap\ntext'])('rejects invalid sections', rawContent => {
    expect(() => prepareInternationalTestImport({ ...reviewBody(), entries: [{ ...reviewEntry(), rawContent, sourceHash: internationalTestSourceHash(rawContent) }] })).toThrow('SECTIONS_INVALID');
  });
  it('rejects duplicate source/target identities', () => {
    expect(() => prepareInternationalTestImport({ ...reviewBody(), entries: [reviewEntry(), reviewEntry()] })).toThrow('DUPLICATE_PLAN_IDENTITY');
  });
  it('rejects duplicate canonical name/provider even with different proposed UUIDs', () => {
    const entry = reviewEntry();
    expect(() => prepareInternationalTestImport({ ...reviewBody(), entries: [entry, { ...entry, sourceKey: 'language/Other.md', targetId: actorId, core: { ...entry.core, publicId: 'OTHER', slug: 'other' } }] })).toThrow('DUPLICATE_PLAN_IDENTITY');
  });
  it.each(['actorId', 'approval', 'planHash', 'previewHash', 'recoveryGateToken', 'recoveryEvidenceReference'])('blocks missing %s before gateway invocation', field => {
    const gateway = { commit: vi.fn(), rollback: vi.fn() } as unknown as InternationalTestImportChangeGateway;
    const executor = new InternationalTestImportChangeExecutor(gateway);
    const plan = prepareInternationalTestImport(reviewBody());
    const approval = { actorId, approval: 'APPROVE_WRITE' as const, planHash: plan.planHash, previewHash: 'b'.repeat(64), recoveryGateToken: 'test-only-recovery-proof', recoveryEvidenceReference: 'recovery/pilot-1' };
    Object.assign(approval, { [field]: '' });
    expect(() => executor.commit(plan, approval)).toThrow('EXACT_APPROVAL');
    expect(gateway.commit).not.toHaveBeenCalled();
  });
  it('does not use write approval for rollback', () => {
    const gateway = { rollback: vi.fn() } as unknown as InternationalTestImportChangeGateway;
    const plan = prepareInternationalTestImport(reviewBody());
    expect(() => new InternationalTestImportChangeExecutor(gateway).rollback(plan, { actorId, approval: 'APPROVE_WRITE', planHash: plan.planHash, previewHash: 'b'.repeat(64), recoveryGateToken: 'test-only', recoveryEvidenceReference: 'backup/test' })).toThrow('EXACT_APPROVAL');
    expect(gateway.rollback).not.toHaveBeenCalled();
  });
});
