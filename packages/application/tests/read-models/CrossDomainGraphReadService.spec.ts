import { describe, expect, it, vi } from 'vitest';
import { CrossDomainGraphReadService } from '../../src/read-models/CrossDomainGraphReadService';

const major = {
  id: 'major-1', publicId: 'MJR-0001', slug: 'computer-science', displayName: 'Computer Science',
  canonicalName: 'Computer Science', canonicalDedupKey: 'computer-science', status: 'PUBLISHED', completenessStatus: 'COMPLETE',
};
const university = {
  id: 'university-1', publicId: 'INS-0001', slug: 'example-university', displayName: 'Example University',
  canonicalName: 'Example University', canonicalDedupKey: 'example-university', status: 'PUBLISHED', completenessStatus: 'COMPLETE', countryReferenceId: 'country-ye',
  academicPrograms: [{ id: 'program-1', universityId: 'university-1', sourceProgramName: 'BSc Computer Science', normalizedName: 'bsc computer science', degreeLevelId: 'degree-bachelor', majorId: 'major-1', majorMappingState: 'CANONICALLY_MAPPED', status: 'ACTIVE', campusIds: [], admissionRequirements: [] }],
};
const scholarship = {
  id: 'scholarship-1', publicId: 'SCH-0001', slug: 'example-scholarship', displayName: 'Example Scholarship',
  canonicalName: 'Example Scholarship', canonicalDedupKey: 'example-scholarship', status: 'PUBLISHED', completenessStatus: 'COMPLETE',
  publicationStatus: 'PUBLISHED', verificationStatus: 'VERIFIED', countryReferenceId: 'country-ye',
  majorTargets: [{ targetKey: 'major-1', majorId: 'major-1' }],
  eligibilityItems: [], universityLinks: [{ linkKey: 'program', academicProgramId: 'program-1' }],
};

const page = <T>(data: T[]) => ({ data, total: data.length, page: 1, pageSize: 12, totalPages: data.length ? 1 : 0 });

function build() {
  const majorRepository = {
    findBySlug: vi.fn().mockResolvedValue(major),
    findPublishedByIds: vi.fn().mockResolvedValue([major]),
  };
  const universityRepository = {
    findBySlug: vi.fn().mockResolvedValue(university),
    listPublished: vi.fn().mockResolvedValue(page([university])),
    findPublishedByIds: vi.fn().mockResolvedValue([university]),
    findPublishedAcademicProgramsByIds: vi.fn().mockResolvedValue([{
      ownerId: 'program-1', universityOwnerId: 'university-1', universityPublicId: 'INS-0001', universitySlug: 'example-university', universityDisplayName: 'Example University',
      sourceProgramName: 'BSc Computer Science', degreeLevelId: 'degree-bachelor', majorId: 'major-1', majorMappingState: 'CANONICALLY_MAPPED', status: 'MATCHED',
    }]),
  };
  const scholarshipRepository = {
    findPublishedBySlug: vi.fn().mockResolvedValue(scholarship),
    listPublished: vi.fn().mockResolvedValue(page([scholarship])),
  };
  const internationalTestRepository = {
    findById: vi.fn().mockResolvedValue({
      id: 'test-1', publicId: 'TST-0001', slug: 'ielts-academic', displayName: 'IELTS Academic',
      canonicalName: 'IELTS Academic', localizedNameEn: 'IELTS Academic', providerName: 'IELTS', status: 'PUBLISHED',
    }),
    listPublished: vi.fn().mockResolvedValue(page([{
      id: 'test-1', publicId: 'TST-0001', slug: 'ielts-academic', displayName: 'IELTS Academic',
      canonicalName: 'IELTS Academic', localizedNameEn: 'IELTS Academic', providerName: 'IELTS', status: 'PUBLISHED',
    }])),
  };
  const courseRelationshipRepository = {
    listPublishedCoursesForMajor: vi.fn().mockResolvedValue(page([{
      ownerId: 'course-1', publicId: 'CRS-0001', slug: 'intro-cs', displayName: 'Intro CS', accessType: 'FREE_CERTIFICATE', originType: 'EXTERNAL_LINKED_COURSE', directCourseUrl: 'https://example.test/course', providerName: 'Provider', category: 'Computing',
    }])),
    listPublishedCoursesForInternationalTest: vi.fn().mockResolvedValue(page([{
      ownerId: 'course-test-1', publicId: 'CRS-0100', slug: 'ielts-preparation', displayName: 'IELTS Preparation', accessType: 'FREE_STUDY_AND_CERTIFICATE', originType: 'NATIVE_MANARATAK_COURSE', directCourseUrl: '/courses/ielts-preparation', providerName: 'MANARATAK', category: 'Languages',
    }])),
    listPublishedRelatedCourses: vi.fn().mockResolvedValue(page([{
      ownerId: 'course-1', publicId: 'CRS-0001', slug: 'intro-cs', displayName: 'Intro CS', accessType: 'FREE_CERTIFICATE', originType: 'EXTERNAL_LINKED_COURSE', directCourseUrl: 'https://example.test/course', providerName: 'Provider', category: 'Computing',
    }])),
  };
  const referenceDataRepository = {
    getCountry: vi.fn().mockResolvedValue({ id: 'country-ye', iso2Code: 'YE', iso3Code: 'YEM', name: 'Yemen', isActive: true }),
  };
  return {
    service: new CrossDomainGraphReadService(majorRepository as any, universityRepository as any, scholarshipRepository as any, internationalTestRepository as any, courseRelationshipRepository as any, referenceDataRepository as any),
    majorRepository, universityRepository, scholarshipRepository, internationalTestRepository, courseRelationshipRepository, referenceDataRepository,
  };
}

describe('CrossDomainGraphReadService P4 canonical projections', () => {
  it('builds Major reverse collections from owner queries keyed only by canonical major owner ID', async () => {
    const ctx = build();
    const graph = await ctx.service.getMajorGraphBySlug('computer-science');
    expect(ctx.universityRepository.listPublished).toHaveBeenCalledWith(expect.objectContaining({ majorId: 'major-1' }));
    expect(ctx.scholarshipRepository.listPublished).toHaveBeenCalledWith(expect.objectContaining({ majorId: 'major-1' }));
    expect(ctx.courseRelationshipRepository.listPublishedCoursesForMajor).toHaveBeenCalledWith('major-1', expect.any(Object));
    expect(graph.subject).toMatchObject({ ownerId: 'major-1', publicId: 'MJR-0001', slug: 'computer-science' });
    expect(graph.relationships.universities.data[0]).toMatchObject({ ownerId: 'university-1', publicId: 'INS-0001', slug: 'example-university' });
    expect(graph.relationships.universities.data[0].matchingPrograms[0].ownerId).toBe('program-1');
    expect(graph.relationships.courses.data[0].ownerId).toBe('course-1');
  });

  it('aggregates Country detail from owning domains using the canonical P7 country ID', async () => {
    const ctx = build();
    const graph = await ctx.service.getCountryGraphByIso2Code('ye');
    expect(ctx.universityRepository.listPublished).toHaveBeenCalledWith(expect.objectContaining({ countryReferenceId: 'country-ye' }));
    expect(ctx.scholarshipRepository.listPublished).toHaveBeenCalledWith(expect.objectContaining({ countryReferenceId: 'country-ye' }));
    expect(ctx.internationalTestRepository.listPublished).toHaveBeenCalledWith(expect.objectContaining({ countryIso2Code: 'YE' }));
    expect(ctx.majorRepository.findPublishedByIds).toHaveBeenCalledWith(['major-1']);
    expect(ctx.courseRelationshipRepository.listPublishedRelatedCourses).toHaveBeenCalledWith(expect.objectContaining({ providerHeadquartersCountryReferenceId: 'country-ye' }));
    expect(graph.relationships.majors[0]).toMatchObject({ ownerId: 'major-1' });
    expect(graph.relationships.internationalTests.data[0]).toMatchObject({ ownerId: 'test-1' });
    expect(graph.subject).toMatchObject({ ownerId: 'country-ye', canonicalCode: 'YE' });
  });

  it('rejects inactive Country graph subjects before cross-domain owner queries run', async () => {
    const ctx = build();
    ctx.referenceDataRepository.getCountry.mockResolvedValue({ id: 'country-ye', iso2Code: 'YE', iso3Code: 'YEM', name: 'Yemen', isActive: false });
    await expect(ctx.service.getCountryGraphByIso2Code('YE')).rejects.toThrow('Country not found');
    expect(ctx.universityRepository.listPublished).not.toHaveBeenCalled();
    expect(ctx.scholarshipRepository.listPublished).not.toHaveBeenCalled();
  });

  it('hydrates Scholarship linked identities through owner batch reads without source-label matching', async () => {
    const ctx = build();
    const graph = await ctx.service.getScholarshipGraphBySlug('example-scholarship');
    expect(ctx.universityRepository.findPublishedAcademicProgramsByIds).toHaveBeenCalledWith(['program-1']);
    expect(ctx.majorRepository.findPublishedByIds).toHaveBeenCalledWith(['major-1']);
    expect(graph.relationships.academicPrograms[0]).toMatchObject({ ownerId: 'program-1', universityOwnerId: 'university-1', majorOwnerId: 'major-1' });
    expect(graph.relationships.majors[0]).toMatchObject({ ownerId: 'major-1', publicId: 'MJR-0001' });
    expect(graph.relationships.universities[0]).toMatchObject({ ownerId: 'university-1', publicId: 'INS-0001' });
  });

  it('projects University majors from canonical AcademicProgram majorId and scholarships from P12 owner query', async () => {
    const ctx = build();
    const graph = await ctx.service.getUniversityGraphBySlug('example-university');
    expect(ctx.majorRepository.findPublishedByIds).toHaveBeenCalledWith(['major-1']);
    expect(ctx.scholarshipRepository.listPublished).toHaveBeenCalledWith(expect.objectContaining({ universityId: 'university-1' }));
    expect(graph.countryOwnerId).toBe('country-ye');
    expect(graph.relationships.academicPrograms[0]).toMatchObject({ ownerId: 'program-1', majorOwnerId: 'major-1' });
  });

  it('filters University AcademicPrograms to published linked Majors and canonical DegreeLevel references', async () => {
    const ctx = build();
    ctx.majorRepository.findPublishedByIds.mockResolvedValue([]);
    const graph = await ctx.service.getUniversityGraphBySlug('example-university');
    expect(graph.relationships.majors).toEqual([]);
    expect(graph.relationships.academicPrograms).toEqual([]);
  });

  it('builds International Test reverse relationships from owning University and Scholarship domains', async () => {
    const ctx = build();
    ctx.universityRepository.list = vi.fn().mockResolvedValue(page([{
      ...university,
      academicPrograms: [{
        ...university.academicPrograms[0],
        admissionRequirements: [{ internationalTestId: 'test-1', minimumScore: 6.5, status: 'ACTIVE' }],
      }],
    }]));
    ctx.scholarshipRepository.list = vi.fn().mockResolvedValue(page([scholarship]));
    const graph = await ctx.service.getInternationalTestGraphById('test-1');
    expect(ctx.universityRepository.list).toHaveBeenCalledWith(expect.objectContaining({ internationalTestId: 'test-1' }));
    expect(ctx.scholarshipRepository.list).toHaveBeenCalledWith(expect.objectContaining({ internationalTestId: 'test-1' }));
    expect(graph.relationships.universities.data[0].matchingPrograms[0]).toMatchObject({ ownerId: 'program-1', minimumScore: 6.5 });
    expect(ctx.courseRelationshipRepository.listPublishedCoursesForInternationalTest).toHaveBeenCalledWith('test-1', expect.any(Object));
    expect(graph.relationships.preparationCourses.data[0]).toMatchObject({ ownerId: 'course-test-1', slug: 'ielts-preparation' });
  });
});
