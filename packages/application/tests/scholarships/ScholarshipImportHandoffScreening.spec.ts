import { describe, expect, it, vi } from 'vitest';
import type { UniversalImportHandoff } from '@manaratak/domain';
import {
  ScholarshipImportHandoffService,
  type IScholarshipHandoffCanonicalScreening,
  type IScholarshipHandoffDuplicateLookup,
} from '../../src/scholarships/handoff';

const handoff: UniversalImportHandoff = {
  handoffId: 'handoff-qatar-1',
  ownerDomain: 'SCHOLARSHIP',
  artifact: {
    sourceId: 'source-qatar',
    artifactId: 'record-qatar-1',
    rawArtifactReference: 'archive://source-qatar/record-qatar-1',
  },
  normalizedPayload: {
    scholarshipName: 'منحة جامعة قطر لدراسة الدكتوراه ممولة بالكامل 2027',
    providerName: 'Qatar University',
    studyCountry: 'Qatar',
    fundingCoverage: 'Tuition and stipend',
    eligibilityCriteria: 'Published eligibility criteria',
    requiredDocuments: ['Passport'],
    applicationDeadline: '2027-03-01',
    metadata: {
      sourceAliases: ['منحة جامعة قطر للدكتوراه 2027'],
    },
  },
  provenance: {
    sourceSystem: 'scholarship-portal',
    acquiredAt: new Date('2026-08-21T00:00:00.000Z'),
  },
  validation: { state: 'VALID', issues: [] },
  execution: {
    executionId: 'execution-qatar-1',
    dryRun: true,
    attempt: 1,
    idempotencyKey: 'source-qatar:record-qatar-1',
  },
};

function providerScreening(): IScholarshipHandoffCanonicalScreening {
  return {
    screen: vi.fn().mockResolvedValue([{
      target: 'PROVIDER_UNIVERSITY',
      state: 'RESOLVED',
      rawValue: 'Qatar University',
      requestedCanonicalId: 'INS-QA-001',
      requestedStandardCode: null,
      canonicalReferenceId: 'university-internal-1',
      canonicalPublicId: 'INS-QA-001',
      canonicalStandardCode: null,
      canonicalName: 'Qatar University',
      method: 'EXACT_PUBLIC_ID',
      candidates: [],
      reason: 'Resolved to existing University canonical entity.',
    }]),
  };
}

describe('WP12-5 screening integration', () => {
  it('preserves raw title, emits cleaned title, and keeps an unknown lineage reviewable', async () => {
    const duplicateLookup: IScholarshipHandoffDuplicateLookup = {
      findMatchesByDedupKey: vi.fn().mockResolvedValue([{
        id: 'scholarship-internal-1',
        publicId: 'SCH-0001',
        displayName: 'منحة جامعة قطر 2027',
        canonicalDedupKey: 'INS-QA-001|منحة جامعة قطر 2027|2027',
        sourceImportRecordId: 'record-qatar-1',
      }]),
    };
    const service = new ScholarshipImportHandoffService(providerScreening(), duplicateLookup);
    const result = await service.accept(handoff);

    expect(result.nameScreening.rawSourceTitle).toBe(
      'منحة جامعة قطر لدراسة الدكتوراه ممولة بالكامل 2027',
    );
    expect(result.nameScreening.cleanedScholarshipName).toBe('منحة جامعة قطر 2027');
    expect(result.dedupe.duplicateKey).toBe('V2|INS-QA-001|منحة جامعة قطر 2027|2027|qatar|NO_OFFICIAL_URL');
    expect(result.dedupe.state).toBe('UPDATE');
    expect(result.normalizedPayload.scholarshipName).toBe(
      'منحة جامعة قطر لدراسة الدكتوراه ممولة بالكامل 2027',
    );
  });

  it('does not claim NEW when the read-only duplicate lookup is absent', async () => {
    const service = new ScholarshipImportHandoffService(providerScreening());
    const result = await service.accept(handoff);

    expect(result.dedupe.state).toBe('NOT_CHECKED');
  });
});
