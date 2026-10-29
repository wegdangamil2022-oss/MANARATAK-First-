import { describe, expect, it, vi } from 'vitest';
import { ScholarshipImportDecisionUseCases } from '../../src';

const scholarshipRecord = { id: 'record-1', batchId: 'batch-scholarship', status: 'STAGED', rawPayload: { providerIsUniversity: false, _domainHandoff: { canonicalScreening: [{ requirementKey: 'PROVIDER_UNIVERSITY', target: 'PROVIDER_UNIVERSITY', rawValue: 'Independent Foundation', state: 'REVIEW_REQUIRED' }, { requirementKey: 'COUNTRY', target: 'COUNTRY', rawValue: 'Yemen', state: 'UNRESOLVED' }] } } };
function setup(record: any = scholarshipRecord, dataType = 'SCHOLARSHIPS') {
  const gateway = { listBatches: vi.fn(), listRecords: vi.fn(), getRecordById: vi.fn(async () => record), getBatchById: vi.fn(async () => ({ id: record?.batchId, sourceSystem: 'source', dataType, batchStatus: 'STAGED' })) };
  const verification = { record: vi.fn(async () => ({ decisionId: 'v1', recordedAt: '2026-08-24T00:00:00Z' })), latest: vi.fn(), list: vi.fn() };
  const canonical = { record: vi.fn(async () => ({ decisionId: 'c1', recordedAt: '2026-08-24T00:00:00Z' })), list: vi.fn() };
  const resolver = { resolve: vi.fn(async (): Promise<{ state: string; canonicalReferenceId?: string }> => ({ state: 'RESOLVED' })) };
  return { useCases: new ScholarshipImportDecisionUseCases(gateway as any, verification as any, canonical as any, resolver as any), verification, canonical, resolver };
}

describe('ScholarshipImportDecisionUseCases', () => {
  it('rejects unknown and non-Scholarship records before verification persistence', async () => { const missing = setup(null); await expect(missing.useCases.recordVerification({ recordId: 'missing', state: 'VERIFIED', actorId: 'a', reason: 'r' })).rejects.toThrow('SCHOLARSHIP_IMPORT_RECORD_NOT_FOUND'); expect(missing.verification.record).not.toHaveBeenCalled(); const wrong = setup(scholarshipRecord, 'COURSES'); await expect(wrong.useCases.recordVerification({ recordId: 'record-1', state: 'VERIFIED', actorId: 'a', reason: 'r' })).rejects.toThrow('SCHOLARSHIP_IMPORT_RECORD_NOT_IN_SCHOLARSHIP_BATCH'); });
  it('writes a verified Scholarship decision', async () => { const env = setup(); await env.useCases.recordVerification({ recordId: 'record-1', state: 'VERIFIED', actorId: 'a', reason: 'official' }); expect(env.verification.record).toHaveBeenCalledOnce(); });
  it('rejects malformed source interpretation before durable verification', async () => {
    const env = setup();
    await expect(env.useCases.recordVerification({ recordId: 'record-1', state: 'VERIFIED', actorId: 'a', reason: 'official', evidence: { sourceReview: { version: 1 } } })).rejects.toThrow('SCHOLARSHIP_IMPORT_SOURCE_REVIEW_INVALID');
    expect(env.verification.record).not.toHaveBeenCalled();
  });
  it('binds a program review to the one reviewed university and degree', async () => {
    const record = { ...scholarshipRecord, rawPayload: { _domainHandoff: { canonicalScreening: [
      { target: 'UNIVERSITY', state: 'RESOLVED', rawValue: 'University', canonicalReferenceId: 'u1' },
      { target: 'DEGREE_LEVEL', state: 'RESOLVED', rawValue: 'MASTER', canonicalReferenceId: 'master' },
      { target: 'ACADEMIC_PROGRAM', state: 'UNRESOLVED', rawValue: 'China Studies' },
    ] } } };
    const env = setup(record); env.canonical.list.mockResolvedValue([]);
    env.resolver.resolve.mockResolvedValue({ state: 'RESOLVED', canonicalReferenceId: 'p1' });
    const input = { recordId: record.id, fieldOrRequirementKey: 'ACADEMIC_PROGRAM', canonicalEntityType: 'ACADEMIC_PROGRAM', canonicalId: 'p1', rawValue: 'China Studies', resolutionType: 'RESOLVED' as const, actorId: 'reviewer' };
    await env.useCases.recordCanonical(input);
    expect(env.resolver.resolve).toHaveBeenCalledWith({ target: 'ACADEMIC_PROGRAM', canonicalId: 'p1', rawValue: 'China Studies', universityId: 'u1', degreeLevelId: 'master' });
    record.rawPayload._domainHandoff.canonicalScreening[0].state = 'UNRESOLVED';
    await expect(env.useCases.recordCanonical(input)).rejects.toThrow('SCHOLARSHIP_CANONICAL_PROGRAM_OWNER_SCOPE_REQUIRED');
  });
  it('persists the resolved owning-table id when a public university identity was reviewed', async () => {
    const record = { ...scholarshipRecord, rawPayload: { _domainHandoff: { canonicalScreening: [{ target: 'PROVIDER_UNIVERSITY', rawValue: 'Yenching Academy of Peking University', state: 'REVIEW_REQUIRED' }] } } };
    const env = setup(record);
    const internalId = 'b6749423-cc46-4bbd-94ce-a2f916c56fe1';
    env.resolver.resolve.mockResolvedValue({ state: 'RESOLVED', canonicalReferenceId: internalId });
    const input = { recordId: record.id, fieldOrRequirementKey: 'PROVIDER_UNIVERSITY', canonicalEntityType: 'PROVIDER_UNIVERSITY', canonicalId: 'INS-CHN-0001', rawValue: 'Yenching Academy of Peking University', resolutionType: 'RESOLVED' as const, actorId: 'reviewer', reason: 'Reviewed official identity' };
    await env.useCases.recordCanonical(input);
    expect(env.resolver.resolve).toHaveBeenCalledWith({ target: 'PROVIDER_UNIVERSITY', rawValue: input.rawValue, canonicalId: 'INS-CHN-0001' });
    expect(env.canonical.record).toHaveBeenCalledWith({ ...input, canonicalId: internalId });
    expect(input.canonicalId).toBe('INS-CHN-0001');
  });
  it('rejects a resolved result without a canonical foreign key instead of persisting its lookup token', async () => {
    const env = setup();
    await expect(env.useCases.recordCanonical({ recordId: 'record-1', fieldOrRequirementKey: 'COUNTRY', canonicalEntityType: 'COUNTRY', canonicalId: 'YE', rawValue: 'Yemen', resolutionType: 'RESOLVED', actorId: 'a' })).rejects.toThrow('SCHOLARSHIP_CANONICAL_REFERENCE_REQUIRED');
    expect(env.canonical.record).not.toHaveBeenCalled();
  });
  it('keeps unresolved lookups outside durable resolved decisions', async () => {
    const env = setup();env.resolver.resolve.mockResolvedValue({ state: 'UNRESOLVED' });
    await expect(env.useCases.recordCanonical({ recordId: 'record-1', fieldOrRequirementKey: 'COUNTRY', canonicalEntityType: 'COUNTRY', canonicalId: 'unknown', rawValue: 'Yemen', resolutionType: 'RESOLVED', actorId: 'a' })).rejects.toThrow('SCHOLARSHIP_CANONICAL_RESOLUTION_NOT_EXISTING_OR_AMBIGUOUS');
    expect(env.canonical.record).not.toHaveBeenCalled();
  });
  it('matches the staged canonical requirement and restricts NOT_APPLICABLE', async () => { const env = setup(); await env.useCases.recordCanonical({ recordId: 'record-1', fieldOrRequirementKey: 'PROVIDER_UNIVERSITY', canonicalEntityType: 'PROVIDER_UNIVERSITY', rawValue: 'Independent Foundation', resolutionType: 'NOT_APPLICABLE', actorId: 'a' }); expect(env.canonical.record).toHaveBeenCalledOnce(); await expect(env.useCases.recordCanonical({ recordId: 'record-1', fieldOrRequirementKey: 'COUNTRY', canonicalEntityType: 'COUNTRY', rawValue: 'Yemen', resolutionType: 'NOT_APPLICABLE', actorId: 'a' })).rejects.toThrow('SCHOLARSHIP_CANONICAL_NOT_APPLICABLE_NOT_ALLOWED'); await expect(env.useCases.recordCanonical({ recordId: 'record-1', fieldOrRequirementKey: 'COUNTRY', canonicalEntityType: 'COUNTRY', rawValue: 'Other', resolutionType: 'REJECTED', actorId: 'a' })).rejects.toThrow('SCHOLARSHIP_CANONICAL_REQUIREMENT_MISMATCH'); });
});
