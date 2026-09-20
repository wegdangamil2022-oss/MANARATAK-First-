import { describe, expect, it, vi } from 'vitest';
import {
  ScholarshipCompletenessState,
  ScholarshipPublicationStatus,
  ScholarshipStatus,
  ScholarshipVerificationStatus,
  type IScholarshipRepository,
  type ScholarshipDto,
} from '@manaratak/domain';
import { AdminScholarshipUseCases } from '../../src/scholarships/use-cases/AdminScholarshipUseCases';
import type {
  IScholarshipCanonicalLookupGateway,
  ScholarshipCanonicalCandidate,
  ScholarshipCanonicalLookupTarget,
} from '../../src/scholarships/resolution';

function scholarship(overrides: Partial<ScholarshipDto> = {}): ScholarshipDto {
  return {
    id: 'sch-1',
    publicId: 'SCH-1',
    slug: 'sample',
    canonicalName: 'Sample Scholarship',
    canonicalDedupKey: 'provider|sample|2027',
    displayName: 'Sample Scholarship',
    providerName: 'Provider',
    status: ScholarshipStatus.READY_TO_REVIEW,
    completenessStatus: ScholarshipCompletenessState.COMPLETE,
    verificationStatus: ScholarshipVerificationStatus.VERIFIED,
    publicationStatus: ScholarshipPublicationStatus.DRAFT,
    fundingTypeCode: 'FULLY_FUNDED',
    isFullyFunded: true,
    countryReferenceId: 'country-1',
    countrySourceLabel: 'Qatar',
    officialSourceUrl: 'https://example.edu/scholarship',
    degreeTargets: [], benefits: [], eligibilityItems: [], requiredDocumentItems: [], majorTargets: [], universityLinks: [],
    sourceEvidence: [{ evidenceKey: 's1', sourceTypeCode: 'OFFICIAL', sourceUrl: 'https://example.edu/scholarship', isOfficial: true }],
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00Z'),
    ...overrides,
  } as ScholarshipDto;
}

function repository(current: ScholarshipDto): IScholarshipRepository {
  return {
    findById: vi.fn(async () => current),
    findByDedupKey: vi.fn(async () => null),
    update: vi.fn(async (_id, updates) => ({ ...current, ...updates, updatedAt: new Date() })),
  } as unknown as IScholarshipRepository;
}

function candidate(target: ScholarshipCanonicalLookupTarget, id: string, extra: Partial<ScholarshipCanonicalCandidate> = {}): ScholarshipCanonicalCandidate {
  return {
    target,
    id,
    publicId: id,
    canonicalName: id,
    lifecycle: 'ACTIVE',
    method: 'EXACT_CANONICAL_ID',
    ...extra,
  } as ScholarshipCanonicalCandidate;
}

function lookup(overrides: Record<string, Partial<ScholarshipCanonicalCandidate>> = {}): IScholarshipCanonicalLookupGateway {
  return {
    findCandidates: vi.fn(async (target, request) => {
      const id = request.canonicalId;
      if (!id) return [];
      return [candidate(target, id, overrides[`${target}:${id}`] ?? {})];
    }),
  };
}

describe('P9 Scholarship canonical relationship authoring', () => {
  it('writes canonical IDs through the scholarship owner use case and derives resolved states', async () => {
    const current = scholarship();
    const repo = repository(current);
    const gateway = lookup({
      'ACADEMIC_PROGRAM:program-1': { ownerId: 'university-1' },
    });
    const service = new AdminScholarshipUseCases(repo, undefined, gateway);

    await service.replaceCanonicalRelationships('sch-1', {
      countryReferenceId: 'country-1',
      studyLanguageReferenceId: 'language-en',
      benefits: [{ benefitKey: 'cash', benefitTypeCode: 'STIPEND', amount: 1000, currencyReferenceId: 'currency-usd' }],
      degreeTargets: [{ targetKey: 'degree', degreeLevelId: 'degree-1', sourceLabel: 'Bachelor' }],
      majorTargets: [{ targetKey: 'major', majorId: 'major-1', sourceLabel: 'Computer Science' }],
      eligibilityItems: [{ itemKey: 'test', itemTypeCode: 'TEST_SCORE', internationalTestId: 'test-ielts', valueText: 'IELTS', isRequired: true }],
      requiredDocumentItems: [{ documentKey: 'test-doc', documentTypeCode: 'TEST_SCORE', displayName: 'IELTS', internationalTestId: 'test-ielts', isRequired: true }],
      universityLinks: [{ linkKey: 'program', relationshipTypeCode: 'TARGET_PROGRAM', universityId: 'university-1', academicProgramId: 'program-1', sourceLabel: 'Program' }],
    });

    expect(repo.update).toHaveBeenCalledWith('sch-1', expect.objectContaining({
      countryReferenceId: 'country-1',
      studyLanguageReferenceId: 'language-en',
      studyLanguageResolutionStatus: 'RESOLVED',
      degreeTargets: [expect.objectContaining({ degreeLevelId: 'degree-1', resolutionStatus: 'RESOLVED' })],
      majorTargets: [expect.objectContaining({ majorId: 'major-1', resolutionStatus: 'RESOLVED' })],
      universityLinks: [expect.objectContaining({ universityId: 'university-1', academicProgramId: 'program-1', resolutionStatus: 'RESOLVED' })],
    }));
  });

  it('fails closed when Admin submits an inactive canonical reference', async () => {
    const repo = repository(scholarship());
    const service = new AdminScholarshipUseCases(repo, undefined, lookup({
      'MAJOR:major-old': { lifecycle: 'ARCHIVED' },
    }));

    await expect(service.replaceCanonicalRelationships('sch-1', {
      majorTargets: [{ targetKey: 'old-major', majorId: 'major-old', sourceLabel: 'Old major' }],
    })).rejects.toThrow('SCHOLARSHIP_CANONICAL_REFERENCE_NOT_ACTIVE:MAJOR:major-old:ARCHIVED');
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('rejects an AcademicProgram that does not belong to the selected University', async () => {
    const repo = repository(scholarship());
    const service = new AdminScholarshipUseCases(repo, undefined, lookup({
      'ACADEMIC_PROGRAM:program-1': { ownerId: 'university-2' },
    }));

    await expect(service.replaceCanonicalRelationships('sch-1', {
      universityLinks: [{ linkKey: 'mismatch', relationshipTypeCode: 'TARGET_PROGRAM', universityId: 'university-1', academicProgramId: 'program-1', sourceLabel: 'Program' }],
    })).rejects.toThrow('SCHOLARSHIP_ACADEMIC_PROGRAM_UNIVERSITY_MISMATCH:mismatch');
    expect(repo.update).not.toHaveBeenCalled();
  });
});
