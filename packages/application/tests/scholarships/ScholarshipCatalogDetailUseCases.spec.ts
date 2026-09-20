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
    applicationDeadline: new Date('2027-01-01T00:00:00Z'),
    officialSourceUrl: 'https://example.edu/scholarship',
    degreeTargets: [{ targetKey: 'd1', degreeLevelId: 'degree-1', sourceLabel: 'Bachelor', resolutionStatus: 'RESOLVED' }],
    benefits: [{ benefitKey: 'b1', benefitTypeCode: 'TUITION', valueText: 'Full tuition' }],
    eligibilityItems: [{ itemKey: 'e1', itemTypeCode: 'GENERAL', valueText: 'Merit', isRequired: true }],
    requiredDocumentItems: [{ documentKey: 'doc1', displayName: 'Transcript', isRequired: true }],
    majorTargets: [],
    sourceEvidence: [{ evidenceKey: 's1', sourceTypeCode: 'OFFICIAL', sourceUrl: 'https://example.edu/scholarship', isOfficial: true }],
    universityLinks: [],
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

describe('WP12-9 AdminScholarshipUseCases catalog detail', () => {
  it('classifies COMPLETE from normalized collections without legacy optionalFields', async () => {
    const repo = repository(scholarship({ optionalFields: {} }));
    const service = new AdminScholarshipUseCases(repo);
    const detail = await service.getScholarshipCatalogDetail('sch-1');
    expect(detail.completeness.state).toBe(ScholarshipCompletenessState.COMPLETE);
    expect(detail.completeness.missingFields).toEqual([]);
  });

  it('uses normalized [] replacement semantics when recalculating completeness', async () => {
    const current = scholarship();
    const repo = repository(current);
    const service = new AdminScholarshipUseCases(repo);
    await service.updateScholarship('sch-1', { requiredDocumentItems: [] });
    expect(repo.update).toHaveBeenCalledWith('sch-1', expect.objectContaining({
      requiredDocumentItems: [],
      completenessStatus: ScholarshipCompletenessState.NEEDS_REVIEW,
    }));
  });

  it('reports unresolved normalized canonical links without inventing ids', async () => {
    const repo = repository(scholarship({
      majorTargets: [{ targetKey: 'm1', sourceLabel: 'Computer Science', majorId: null, resolutionStatus: 'UNRESOLVED' }],
      studyLanguageSourceLabel: 'English',
      studyLanguageReferenceId: null,
      studyLanguageResolutionStatus: 'UNRESOLVED',
    }));
    const service = new AdminScholarshipUseCases(repo);
    const detail = await service.getScholarshipCatalogDetail('sch-1');
    expect(detail.unresolvedLinks).toEqual(expect.arrayContaining([
      expect.objectContaining({ area: 'MAJOR', key: 'm1', canonicalId: null }),
      expect.objectContaining({ area: 'STUDY_LANGUAGE', rawValue: 'English', canonicalId: null }),
    ]));
  });

  it('treats TARGET_PROGRAM links by academicProgramId rather than requiring universityId', async () => {
    const resolved = await new AdminScholarshipUseCases(repository(scholarship({
      universityLinks: [{ linkKey: 'p1', relationshipTypeCode: 'TARGET_PROGRAM', sourceLabel: 'Computer Science PhD', universityId: null, academicProgramId: 'program-1', resolutionStatus: 'RESOLVED' }],
    }))).getScholarshipCatalogDetail('sch-1');
    expect(resolved.unresolvedLinks).not.toEqual(expect.arrayContaining([expect.objectContaining({ key: 'p1' })]));

    const unresolved = await new AdminScholarshipUseCases(repository(scholarship({
      universityLinks: [{ linkKey: 'p2', relationshipTypeCode: 'TARGET_PROGRAM', sourceLabel: 'Computer Science PhD', universityId: null, academicProgramId: null, resolutionStatus: 'UNRESOLVED' }],
    }))).getScholarshipCatalogDetail('sch-1');
    expect(unresolved.unresolvedLinks).toEqual(expect.arrayContaining([
      expect.objectContaining({ area: 'ACADEMIC_PROGRAM', key: 'p2', canonicalId: null }),
    ]));
  });


  it('reports unresolved Currency and canonical eligibility references before publication', async () => {
    const detail = await new AdminScholarshipUseCases(repository(scholarship({
      benefits: [{ benefitKey: 'cash', benefitTypeCode: 'STIPEND', amount: 1000, currencyReferenceId: null }],
      currency: 'USD',
      eligibilityItems: [
        { itemKey: 'country-elig', itemTypeCode: 'COUNTRY', valueText: 'Qatar', countryReferenceId: null, resolutionStatus: 'UNRESOLVED' },
        { itemKey: 'degree-elig', itemTypeCode: 'DEGREE_LEVEL', valueText: 'Bachelor', degreeLevelId: null, resolutionStatus: 'UNRESOLVED' },
        { itemKey: 'major-elig', itemTypeCode: 'MAJOR', valueText: 'Computer Science', majorId: null, resolutionStatus: 'UNRESOLVED' },
      ],
    }))).getScholarshipCatalogDetail('sch-1');
    expect(detail.unresolvedLinks).toEqual(expect.arrayContaining([
      expect.objectContaining({ area: 'CURRENCY', key: 'cash' }),
      expect.objectContaining({ area: 'COUNTRY', key: 'country-elig' }),
      expect.objectContaining({ area: 'DEGREE', key: 'degree-elig' }),
      expect.objectContaining({ area: 'MAJOR', key: 'major-elig' }),
    ]));
  });

  it('preserves canonical references only for semantically equivalent source values', async () => {
    const current = scholarship({
      degreeTargets: [{ targetKey: 'd1', degreeLevelId: 'degree-existing', sourceLabel: 'Bachelor', resolutionStatus: 'RESOLVED' }],
      requiredDocumentItems: [{ documentKey: 'doc1', displayName: 'IELTS', internationalTestId: 'test-existing', resolutionStatus: 'RESOLVED', isRequired: true }],
    });
    const repo = repository(current);
    const service = new AdminScholarshipUseCases(repo);
    await service.updateScholarship('sch-1', {
      degreeTargets: [{ targetKey: 'd1', degreeLevelId: 'degree-fake', sourceLabel: '  BACHELOR  ', resolutionStatus: 'RESOLVED' }],
      requiredDocumentItems: [{ documentKey: 'doc1', displayName: '  ielts ', internationalTestId: 'test-fake', resolutionStatus: 'RESOLVED', isRequired: false, displayOrder: 9 }],
      countryReferenceId: 'country-fake',
    });
    expect(repo.update).toHaveBeenCalledWith('sch-1', expect.objectContaining({
      degreeTargets: [expect.objectContaining({ degreeLevelId: 'degree-existing' })],
      requiredDocumentItems: [expect.objectContaining({ internationalTestId: 'test-existing' })],
    }));
    const saved = (repo.update as any).mock.calls[0][1];
    expect(saved.countryReferenceId).toBeUndefined();
  });

  it('invalidates stale Degree/Major references and strips ids from new rows', async () => {
    const current = scholarship({ majorTargets: [{ targetKey: 'm1', sourceLabel: 'Computer Science', majorId: 'major-old', resolutionStatus: 'RESOLVED' }] });
    const repo = repository(current); const service = new AdminScholarshipUseCases(repo);
    await service.updateScholarship('sch-1', { degreeTargets: [{ targetKey: 'd1', sourceLabel: 'Master', degreeLevelId: 'degree-fake', resolutionStatus: 'RESOLVED' }], majorTargets: [{ targetKey: 'm1', sourceLabel: 'Mechanical Engineering', majorId: 'major-fake', resolutionStatus: 'RESOLVED' }, { targetKey: 'm2', sourceLabel: 'Physics', majorId: 'injected', resolutionStatus: 'RESOLVED' }] });
    const saved = (repo.update as any).mock.calls[0][1];
    expect(saved.degreeTargets[0]).toMatchObject({ sourceLabel: 'Master', degreeLevelId: null, resolutionStatus: 'UNRESOLVED' });
    expect(saved.majorTargets[0]).toMatchObject({ sourceLabel: 'Mechanical Engineering', majorId: null, resolutionStatus: 'UNRESOLVED' });
    expect(saved.majorTargets[1]).toMatchObject({ majorId: null, resolutionStatus: 'UNRESOLVED' });
  });

  it('invalidates Country and Study Language only when their source semantics change', async () => {
    const current = scholarship({ studyLanguageSourceLabel: 'English', studyLanguageReferenceId: 'lang-en', studyLanguageResolutionStatus: 'RESOLVED' });
    const changedRepo = repository(current); await new AdminScholarshipUseCases(changedRepo).updateScholarship('sch-1', { countrySourceLabel: 'Germany', countryReferenceId: 'injected', studyLanguageSourceLabel: 'French', studyLanguageReferenceId: 'injected', studyLanguageResolutionStatus: 'RESOLVED' });
    expect((changedRepo.update as any).mock.calls[0][1]).toMatchObject({ countryReferenceId: null, studyLanguageReferenceId: null, studyLanguageResolutionStatus: 'UNRESOLVED' });
    const sameRepo = repository(current); await new AdminScholarshipUseCases(sameRepo).updateScholarship('sch-1', { countrySourceLabel: ' qATAR ', studyLanguageSourceLabel: ' ENGLISH ' });
    expect((sameRepo.update as any).mock.calls[0][1]).toMatchObject({ countryReferenceId: 'country-1', studyLanguageReferenceId: 'lang-en', studyLanguageResolutionStatus: 'RESOLVED' });
  });

  it('uses Country label and scope together and never retains a specific id for global scope', async () => {
    const current = scholarship({ countrySourceLabel: 'Qatar', countryScope: 'SINGLE_COUNTRY', countryReferenceId: 'country-qa' });
    const changedLabel = repository(current);
    await new AdminScholarshipUseCases(changedLabel).updateScholarship('sch-1', { countrySourceLabel: 'Germany' });
    expect((changedLabel.update as any).mock.calls[0][1].countryReferenceId).toBeNull();

    const global = repository(current);
    await new AdminScholarshipUseCases(global).updateScholarship('sch-1', { countryScope: 'GLOBAL', countryReferenceId: 'injected' });
    expect((global.update as any).mock.calls[0][1].countryReferenceId).toBeNull();

    const equivalent = repository(current);
    await new AdminScholarshipUseCases(equivalent).updateScholarship('sch-1', { countrySourceLabel: '  qATAR ', countryScope: ' single-country ' });
    expect((equivalent.update as any).mock.calls[0][1].countryReferenceId).toBe('country-qa');
  });

  it('reports Country health correctly for global, specific unresolved, and inconsistent records', async () => {
    const global = await new AdminScholarshipUseCases(repository(scholarship({ countryScope: 'GLOBAL', countrySourceLabel: null, countryReferenceId: null }))).getScholarshipCatalogDetail('sch-1');
    expect(global.unresolvedLinks).not.toEqual(expect.arrayContaining([expect.objectContaining({ area: 'COUNTRY' })]));

    const specific = await new AdminScholarshipUseCases(repository(scholarship({ countryScope: 'SINGLE_COUNTRY', countrySourceLabel: 'Germany', countryReferenceId: null }))).getScholarshipCatalogDetail('sch-1');
    expect(specific.unresolvedLinks).toEqual(expect.arrayContaining([expect.objectContaining({ area: 'COUNTRY', resolutionStatus: 'UNRESOLVED' })]));

    const inconsistent = await new AdminScholarshipUseCases(repository(scholarship({ countryScope: 'INTERNATIONAL', countrySourceLabel: 'Qatar', countryReferenceId: 'country-qa' }))).getScholarshipCatalogDetail('sch-1');
    expect(inconsistent.unresolvedLinks).toEqual(expect.arrayContaining([expect.objectContaining({ area: 'COUNTRY', canonicalId: 'country-qa', resolutionStatus: 'INCONSISTENT_SCOPE' })]));
  });

  it('rekeys provider/year identity with the authoritative algorithm while preserving aggregate ids', async () => {
    const current = scholarship({ providerName: 'Provider A', academicYear: '2027', canonicalDedupKey: 'provider a|sample scholarship|2027' });
    const repo = repository(current);
    const updated = await new AdminScholarshipUseCases(repo).updateScholarship('sch-1', { providerName: 'Provider B', academicYear: '2028' });
    expect(repo.findByDedupKey).toHaveBeenCalledWith('V2|provider b|sample scholarship|2028|country-1|example.edu/scholarship');
    expect(repo.update).toHaveBeenCalledWith('sch-1', expect.objectContaining({ canonicalDedupKey: 'V2|provider b|sample scholarship|2028|country-1|example.edu/scholarship' }));
    expect(updated.id).toBe(current.id);
    expect(updated.publicId).toBe(current.publicId);
  });

  it('does not rekey equivalent or unchanged identity edits', async () => {
    const current = scholarship({ providerName: 'Provider A', academicYear: '2027' });
    const equivalent = repository(current);
    await new AdminScholarshipUseCases(equivalent).updateScholarship('sch-1', { providerName: '  provider A  ', academicYear: ' 2027 ' });
    expect(equivalent.findByDedupKey).not.toHaveBeenCalled();
    expect((equivalent.update as any).mock.calls[0][1].canonicalDedupKey).toBeUndefined();

    const unchanged = repository(current);
    await new AdminScholarshipUseCases(unchanged).updateScholarship('sch-1', { displayName: 'Editorial title' });
    expect(unchanged.findByDedupKey).not.toHaveBeenCalled();
  });

  it('rejects a dedupe collision but allows lookup of the same Scholarship id', async () => {
    const current = scholarship({ providerName: 'Provider A', academicYear: '2027' });
    const collision = repository(current);
    (collision.findByDedupKey as any).mockResolvedValue(scholarship({ id: 'sch-other' }));
    await expect(new AdminScholarshipUseCases(collision).updateScholarship('sch-1', { academicYear: '2028' }))
      .rejects.toThrow('SCHOLARSHIP_CANONICAL_DEDUPE_COLLISION');
    expect(collision.update).not.toHaveBeenCalled();

    const same = repository(current);
    (same.findByDedupKey as any).mockResolvedValue(current);
    await expect(new AdminScholarshipUseCases(same).updateScholarship('sch-1', { academicYear: '2028' })).resolves.toMatchObject({ id: 'sch-1', publicId: 'SCH-1' });
    expect(same.update).toHaveBeenCalledTimes(1);
  });

  it('uses semantic fingerprints for eligibility and embedded test documents', async () => {
    const current = scholarship({ eligibilityItems: [{ itemKey: 'e1', itemTypeCode: 'TEST_SCORE', operatorCode: 'GTE', valueText: 'IELTS', minimumValue: 6.5, internationalTestId: 'test-old', countryReferenceId: 'country-old', resolutionStatus: 'RESOLVED', isRequired: true, priorityOrder: 1 }], requiredDocumentItems: [{ documentKey: 'doc1', documentTypeCode: 'TEST_SCORE', displayName: 'IELTS', sourceLabel: 'IELTS Academic', internationalTestId: 'test-old', resolutionStatus: 'RESOLVED', isRequired: true, displayOrder: 1 }] });
    const adminRepo = repository(current); await new AdminScholarshipUseCases(adminRepo).updateScholarship('sch-1', { eligibilityItems: [{ ...current.eligibilityItems![0], isRequired: false, priorityOrder: 8 }], requiredDocumentItems: [{ ...current.requiredDocumentItems![0], isRequired: false, displayOrder: 8 }] });
    const adminSaved = (adminRepo.update as any).mock.calls[0][1]; expect(adminSaved.eligibilityItems[0]).toMatchObject({ internationalTestId: 'test-old', countryReferenceId: 'country-old', resolutionStatus: 'RESOLVED' }); expect(adminSaved.requiredDocumentItems[0]).toMatchObject({ internationalTestId: 'test-old', resolutionStatus: 'RESOLVED' });
    const changedRepo = repository(current); await new AdminScholarshipUseCases(changedRepo).updateScholarship('sch-1', { eligibilityItems: [{ ...current.eligibilityItems![0], valueText: 'TOEFL', internationalTestId: 'injected' }], requiredDocumentItems: [{ ...current.requiredDocumentItems![0], displayName: 'TOEFL', sourceLabel: 'TOEFL iBT', internationalTestId: 'injected' }, { documentKey: 'doc2', displayName: 'PTE', internationalTestId: 'injected', resolutionStatus: 'RESOLVED' }] });
    const changed = (changedRepo.update as any).mock.calls[0][1]; expect(changed.eligibilityItems[0]).toMatchObject({ internationalTestId: null, countryReferenceId: null, resolutionStatus: 'UNRESOLVED' }); expect(changed.requiredDocumentItems[0]).toMatchObject({ internationalTestId: null, resolutionStatus: 'UNRESOLVED' }); expect(changed.requiredDocumentItems[1]).toMatchObject({ internationalTestId: null, resolutionStatus: 'UNRESOLVED' });
  });

  it('legacy compatibility fields cannot make normalized catalog completeness COMPLETE', async () => {
    const legacy = scholarship({ benefits: [], degreeTargets: [], eligibilityItems: [], requiredDocumentItems: [], fundingTypeCode: null, isFullyFunded: undefined, countryReferenceId: null, countrySourceLabel: null, countryScope: null, fundingCoverage: 'Full', coverageDetails: 'Everything', studyCountry: 'Qatar', degreeLevel: 'Bachelor', eligibilityCriteria: 'Merit', requiredDocuments: ['Transcript'], studyLanguage: 'English', fundingAmount: '1000', currency: 'USD', duration: '4 years', optionalFields: { fundingCoverage: 'Full' } });
    const detail = await new AdminScholarshipUseCases(repository(legacy)).getScholarshipCatalogDetail('sch-1'); expect(detail.completeness.state).not.toBe(ScholarshipCompletenessState.COMPLETE);
  });

  it.each([
    ['requiredDocumentItems', { requiredDocumentItems: [], requiredDocuments: ['Legacy transcript'] }],
    ['degreeTargets', { degreeTargets: [], degreeLevel: 'Legacy degree' }],
    ['eligibilityItems', { eligibilityItems: [], eligibilityCriteria: 'Legacy eligibility' }],
  ])('clearing normalized %s downgrades completeness despite legacy data', async (_name, updates) => {
    const repo = repository(scholarship()); await new AdminScholarshipUseCases(repo).updateScholarship('sch-1', updates as any); expect((repo.update as any).mock.calls[0][1].completenessStatus).not.toBe(ScholarshipCompletenessState.COMPLETE);
  });

});
