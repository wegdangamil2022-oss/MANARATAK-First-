import { describe, expect, it } from 'vitest';
import { classifyReferenceImportTriage } from '../../src';

const good = {
  state: 'NEEDS_OWNER_REVIEW' as const,
  entityType: 'CITY' as const,
  canonicalKey: 'YE|صنعاء|~',
  sourceArtifactId: 'artifact-1',
  sourceContentHash: 'a'.repeat(64),
  normalizedPayloadHash: 'b'.repeat(64),
  issueCodes: [] as string[],
};
describe('P7 screening triage is not approval', () => {
  it('classifies complete evidence as only reviewable, never approved', () => {
    expect(classifyReferenceImportTriage(good)).toBe('REVIEWABLE');
  });
  it('does not mask provider drift or unmet evidence requirements', () => {
    expect(classifyReferenceImportTriage({ ...good, issueCodes: ['P6_PROVIDER_DRIFT'] }))
      .toBe('SOURCE_ISSUES_REQUIRE_REVIEW');
    expect(classifyReferenceImportTriage({ ...good, normalizedPayloadHash: null }))
      .toBe('LEGACY_RECEIPT_MISSING_EVIDENCE');
    expect(classifyReferenceImportTriage({ ...good, sourceContentHash: 'placeholder' }))
      .toBe('LEGACY_RECEIPT_MISSING_EVIDENCE');
  });
  it('keeps invalid P6 source rejected even if a digest is present', () => {
    expect(classifyReferenceImportTriage({ ...good, state: 'INVALID' }))
      .toBe('INVALID_SOURCE');
  });
});
