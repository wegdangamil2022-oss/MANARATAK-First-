import { describe, expect, it, vi } from 'vitest';
import { ScholarshipImportDecisionUseCases } from '../../src';

const scholarshipRecord = { id: 'record-1', batchId: 'batch-scholarship', status: 'STAGED', rawPayload: { providerIsUniversity: false, _domainHandoff: { canonicalScreening: [{ requirementKey: 'PROVIDER_UNIVERSITY', target: 'PROVIDER_UNIVERSITY', rawValue: 'Independent Foundation', state: 'REVIEW_REQUIRED' }, { requirementKey: 'COUNTRY', target: 'COUNTRY', rawValue: 'Yemen', state: 'UNRESOLVED' }] } } };
function setup(record: any = scholarshipRecord, dataType = 'SCHOLARSHIPS') {
  const gateway = { listBatches: vi.fn(), listRecords: vi.fn(), getRecordById: vi.fn(async () => record), getBatchById: vi.fn(async () => ({ id: record?.batchId, sourceSystem: 'source', dataType, batchStatus: 'STAGED' })) };
  const verification = { record: vi.fn(async () => ({ decisionId: 'v1', recordedAt: '2026-08-24T00:00:00Z' })), latest: vi.fn(), list: vi.fn() };
  const canonical = { record: vi.fn(async () => ({ decisionId: 'c1', recordedAt: '2026-08-24T00:00:00Z' })), list: vi.fn() };
  const resolver = { resolve: vi.fn(async () => ({ state: 'RESOLVED' })) };
  return { useCases: new ScholarshipImportDecisionUseCases(gateway as any, verification as any, canonical as any, resolver as any), verification, canonical };
}

describe('ScholarshipImportDecisionUseCases', () => {
  it('rejects unknown and non-Scholarship records before verification persistence', async () => { const missing = setup(null); await expect(missing.useCases.recordVerification({ recordId: 'missing', state: 'VERIFIED', actorId: 'a', reason: 'r' })).rejects.toThrow('SCHOLARSHIP_IMPORT_RECORD_NOT_FOUND'); expect(missing.verification.record).not.toHaveBeenCalled(); const wrong = setup(scholarshipRecord, 'COURSES'); await expect(wrong.useCases.recordVerification({ recordId: 'record-1', state: 'VERIFIED', actorId: 'a', reason: 'r' })).rejects.toThrow('SCHOLARSHIP_IMPORT_RECORD_NOT_IN_SCHOLARSHIP_BATCH'); });
  it('writes a verified Scholarship decision', async () => { const env = setup(); await env.useCases.recordVerification({ recordId: 'record-1', state: 'VERIFIED', actorId: 'a', reason: 'official' }); expect(env.verification.record).toHaveBeenCalledOnce(); });
  it('matches the staged canonical requirement and restricts NOT_APPLICABLE', async () => { const env = setup(); await env.useCases.recordCanonical({ recordId: 'record-1', fieldOrRequirementKey: 'PROVIDER_UNIVERSITY', canonicalEntityType: 'PROVIDER_UNIVERSITY', rawValue: 'Independent Foundation', resolutionType: 'NOT_APPLICABLE', actorId: 'a' }); expect(env.canonical.record).toHaveBeenCalledOnce(); await expect(env.useCases.recordCanonical({ recordId: 'record-1', fieldOrRequirementKey: 'COUNTRY', canonicalEntityType: 'COUNTRY', rawValue: 'Yemen', resolutionType: 'NOT_APPLICABLE', actorId: 'a' })).rejects.toThrow('SCHOLARSHIP_CANONICAL_NOT_APPLICABLE_NOT_ALLOWED'); await expect(env.useCases.recordCanonical({ recordId: 'record-1', fieldOrRequirementKey: 'COUNTRY', canonicalEntityType: 'COUNTRY', rawValue: 'Other', resolutionType: 'REJECTED', actorId: 'a' })).rejects.toThrow('SCHOLARSHIP_CANONICAL_REQUIREMENT_MISMATCH'); });
});
