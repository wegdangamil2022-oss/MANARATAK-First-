import {
  ICourseRelationshipRepository,
  ICmsRepository,
  CmsDomainTargetType,
  PublicCmsContentDto,
  IMajorRepository,
  IReferenceDataRepository,
  IInternationalTestRepository,
  InternationalTestDto,
  IScholarshipRepository,
  IServiceCatalogRepository,
  ICareerRepository,
  IUniversityRepository,
  MajorDto,
  MajorStatus,
  PublicCourseFilters,
  ScholarshipDto,
  UniversityAcademicProgramReadDto,
  UniversityDto,
  UniversityStatus,
} from '@manaratak/domain';

type MajorGraphReadRepository = IMajorRepository & Required<Pick<IMajorRepository, 'findPublishedByIds'>>;
type UniversityGraphReadRepository = IUniversityRepository & Required<
  Pick<IUniversityRepository, 'findPublishedByIds' | 'findPublishedAcademicProgramsByIds'>
>;

export interface StableEntityReadIdentity {
  ownerId: string;
  publicId?: string;
  slug?: string;
  canonicalCode?: string;
  displayName: string;
}

export interface AcademicProgramGraphIdentity {
  ownerId: string;
  universityOwnerId: string;
  universityPublicId: string;
  universitySlug: string;
  universityDisplayName: string;
  sourceProgramName: string;
  degreeLevelId?: string | null;
  majorOwnerId?: string | null;
  majorMappingState: string;
  status: string;
}

export interface PaginatedGraphCollection<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface MajorUniversityGraphItem extends StableEntityReadIdentity {
  matchingPrograms: Array<{
    ownerId: string;
    sourceProgramName: string;
    degreeLevelId?: string | null;
    majorOwnerId: string;
  }>;
}


export interface EditorialGraphIdentity {
  contentId: string;
  publicId: string;
  slug: string;
  contentType: string;
  title: string;
  summary?: string | null;
  locale: string;
  publishedAt: Date;
}

export interface MajorGraphReadModel {
  subject: StableEntityReadIdentity;
  relationships: {
    universities: PaginatedGraphCollection<MajorUniversityGraphItem>;
    scholarships: PaginatedGraphCollection<StableEntityReadIdentity>;
    courses: PaginatedGraphCollection<StableEntityReadIdentity & {
      directCourseUrl: string;
      providerName?: string | null;
      category?: string | null;
    }>;
    editorialContent: EditorialGraphIdentity[];
  };
}

export interface UniversityGraphReadModel {
  subject: StableEntityReadIdentity;
  countryOwnerId?: string | null;
  relationships: {
    majors: StableEntityReadIdentity[];
    academicPrograms: Array<{
      ownerId: string;
      sourceProgramName: string;
      degreeLevelId?: string | null;
      majorOwnerId: string;
    }>;
    scholarships: PaginatedGraphCollection<StableEntityReadIdentity>;
    editorialContent: EditorialGraphIdentity[];
  };
}

export interface ScholarshipGraphReadModel {
  subject: StableEntityReadIdentity;
  countryOwnerId?: string | null;
  relationships: {
    universities: StableEntityReadIdentity[];
    academicPrograms: AcademicProgramGraphIdentity[];
    majors: StableEntityReadIdentity[];
    editorialContent: EditorialGraphIdentity[];
  };
}

export interface InternationalTestGraphReadModel {
  subject: StableEntityReadIdentity & { providerName: string; status: string };
  relationships: {
    universities: PaginatedGraphCollection<StableEntityReadIdentity & {
      matchingPrograms: Array<{
        ownerId: string;
        sourceProgramName: string;
        minimumScore?: number | null;
        status: string;
      }>;
    }>;
    scholarships: PaginatedGraphCollection<StableEntityReadIdentity>;
    editorialContent: EditorialGraphIdentity[];
    preparationCourses: PaginatedGraphCollection<StableEntityReadIdentity & {
      directCourseUrl: string;
      providerName?: string | null;
      category?: string | null;
    }>;
    studentTools: { state: 'OWNER_DOMAIN_NOT_INTEGRATED'; ownerDomain: 'STUDENT_TOOLS' };
    services: { state: 'OWNER_DOMAIN_NOT_INTEGRATED'; ownerDomain: 'SERVICES' };
  };
}

export interface CountryGraphReadModel {
  subject: StableEntityReadIdentity & { canonicalCode: string };
  relationships: {
    universities: PaginatedGraphCollection<StableEntityReadIdentity>;
    academicPrograms: AcademicProgramGraphIdentity[];
    majors: StableEntityReadIdentity[];
    scholarships: PaginatedGraphCollection<StableEntityReadIdentity>;
    internationalTests: PaginatedGraphCollection<StableEntityReadIdentity & { providerName: string; status: string }>;
    services: PaginatedGraphCollection<StableEntityReadIdentity & { serviceCategory: string; deliveryMode: string }>;
    careerJobs: PaginatedGraphCollection<StableEntityReadIdentity & { opportunityType: string; employmentType: string }>;
    providerHeadquartersCourses: PaginatedGraphCollection<StableEntityReadIdentity & {
      directCourseUrl: string;
      providerName?: string | null;
      category?: string | null;
    }>;
    editorialContent: EditorialGraphIdentity[];
  };
}

export interface CrossDomainGraphReadOptions {
  page?: number;
  pageSize?: number;
  courseFilters?: PublicCourseFilters;
  locale?: 'ar' | 'en';
}

/**
 * P4 composition-only read service.
 *
 * It does not persist cross-domain collections and it never resolves relationships by display name.
 * Every collection is queried from its owning domain repository using canonical owner IDs.
 */
export class CrossDomainGraphReadService {
  public constructor(
    private readonly majorRepository: MajorGraphReadRepository,
    private readonly universityRepository: UniversityGraphReadRepository,
    private readonly scholarshipRepository: IScholarshipRepository,
    private readonly internationalTestRepository: IInternationalTestRepository,
    private readonly courseRelationshipRepository: ICourseRelationshipRepository,
    private readonly referenceDataRepository: IReferenceDataRepository,
    private readonly cmsRepository?: ICmsRepository,
    private readonly serviceCatalogRepository?: IServiceCatalogRepository,
    private readonly careerRepository?: ICareerRepository,
  ) {}

  public async getMajorGraphBySlug(slug: string, options: CrossDomainGraphReadOptions = {}): Promise<MajorGraphReadModel> {
    const major = await this.majorRepository.findBySlug(this.required(slug, 'MAJOR_SLUG_REQUIRED'));
    if (!major || major.status !== MajorStatus.PUBLISHED) throw new Error('Major not found');

    const { pageSize } = this.pagination(options);
    const [universities, scholarships, courses, editorialContent] = await Promise.all([
      this.universityRepository.listPublished({ majorId: major.id, limit: pageSize }),
      this.scholarshipRepository.listPublished({ majorId: major.id, limit: pageSize }),
      this.courseRelationshipRepository.listPublishedCoursesForMajor(major.id, {
        ...options.courseFilters,
        limit: pageSize,
      }),
      this.relatedEditorial(CmsDomainTargetType.MAJOR, major.id, options.locale ?? 'ar'),
    ]);

    return {
      subject: this.majorIdentity(major),
      relationships: {
        universities: {
          ...universities,
          data: universities.data.map((university) => this.majorUniversityIdentity(university, major.id)),
        },
        scholarships: {
          ...scholarships,
          data: scholarships.data.map((scholarship) => this.scholarshipIdentity(scholarship)),
        },
        courses: {
          ...courses,
          data: courses.data.map((course) => ({
            ownerId: course.ownerId,
            publicId: course.publicId,
            slug: course.slug,
            displayName: course.displayName,
            directCourseUrl: course.directCourseUrl,
            providerName: course.providerName,
            category: course.category,
          })),
        },
        editorialContent,
      },
    };
  }

  public async getUniversityGraphBySlug(slug: string, options: CrossDomainGraphReadOptions = {}): Promise<UniversityGraphReadModel> {
    const university = await this.universityRepository.findBySlug(this.required(slug, 'UNIVERSITY_SLUG_REQUIRED'));
    if (!university || university.status !== UniversityStatus.PUBLISHED) throw new Error('University not found');

    const canonicalPrograms = (university.academicPrograms ?? []).filter(
      (program): program is UniversityAcademicProgramReadDto & { majorId: string; degreeLevelId: string } =>
        Boolean(program.majorId) &&
        Boolean(program.degreeLevelId) &&
        program.status === 'ACTIVE' &&
        program.majorMappingState === 'CANONICALLY_MAPPED',
    );
    const majorIds = [...new Set(canonicalPrograms.map((program) => program.majorId))];
    const { pageSize } = this.pagination(options);
    const [majors, scholarships, editorialContent] = await Promise.all([
      this.majorRepository.findPublishedByIds(majorIds),
      this.scholarshipRepository.listPublished({ universityId: university.id, limit: pageSize }),
      this.relatedEditorial(CmsDomainTargetType.UNIVERSITY, university.id, options.locale ?? 'ar'),
    ]);
    const publishedMajorIds = new Set(majors.map((major) => major.id));
    const publishedCanonicalPrograms = canonicalPrograms.filter((program) => publishedMajorIds.has(program.majorId));

    return {
      subject: this.universityIdentity(university),
      countryOwnerId: university.countryReferenceId,
      relationships: {
        majors: majors.map((major) => this.majorIdentity(major)),
        academicPrograms: publishedCanonicalPrograms.map((program) => ({
          ownerId: program.id,
          sourceProgramName: program.sourceProgramName,
          degreeLevelId: program.degreeLevelId,
          majorOwnerId: program.majorId,
        })),
        scholarships: {
          ...scholarships,
          data: scholarships.data.map((scholarship) => this.scholarshipIdentity(scholarship)),
        },
        editorialContent,
      },
    };
  }

  public async getScholarshipGraphBySlug(slug: string, options: CrossDomainGraphReadOptions = {}): Promise<ScholarshipGraphReadModel> {
    const scholarship = await this.scholarshipRepository.findPublishedBySlug(this.required(slug, 'SCHOLARSHIP_SLUG_REQUIRED'));
    if (!scholarship) throw new Error('Scholarship not found');

    const universityIds = [...new Set(
      (scholarship.universityLinks ?? [])
        .map((link) => link.universityId)
        .filter((id): id is string => Boolean(id)),
    )];
    const academicProgramIds = [...new Set(
      (scholarship.universityLinks ?? [])
        .map((link) => link.academicProgramId)
        .filter((id): id is string => Boolean(id)),
    )];
    const directMajorIds = [...new Set([
      ...(scholarship.majorTargets ?? []).map((target) => target.majorId),
      ...(scholarship.eligibilityItems ?? []).map((item) => item.majorId),
    ].filter((id): id is string => Boolean(id)))];

    const [universities, programs] = await Promise.all([
      this.universityRepository.findPublishedByIds(universityIds),
      this.universityRepository.findPublishedAcademicProgramsByIds(academicProgramIds),
    ]);
    const programMajorIds = programs.map((program) => program.majorId).filter((id): id is string => Boolean(id));
    const [majors, editorialContent] = await Promise.all([
      this.majorRepository.findPublishedByIds([...new Set([...directMajorIds, ...programMajorIds])]),
      this.relatedEditorial(CmsDomainTargetType.SCHOLARSHIP, scholarship.id, options.locale ?? 'ar'),
    ]);

    const programUniversityIdentities: StableEntityReadIdentity[] = programs.map((program) => ({
      ownerId: program.universityOwnerId,
      publicId: program.universityPublicId,
      slug: program.universitySlug,
      displayName: program.universityDisplayName,
    }));

    return {
      subject: this.scholarshipIdentity(scholarship),
      countryOwnerId: scholarship.countryReferenceId,
      relationships: {
        universities: this.uniqueIdentities([
          ...universities.map((university) => this.universityIdentity(university)),
          ...programUniversityIdentities,
        ]),
        academicPrograms: programs.map((program) => ({
          ownerId: program.ownerId,
          universityOwnerId: program.universityOwnerId,
          universityPublicId: program.universityPublicId,
          universitySlug: program.universitySlug,
          universityDisplayName: program.universityDisplayName,
          sourceProgramName: program.sourceProgramName,
          degreeLevelId: program.degreeLevelId,
          majorOwnerId: program.majorId,
          majorMappingState: program.majorMappingState,
          status: program.status,
        })),
        majors: majors.map((major) => this.majorIdentity(major)),
        editorialContent,
      },
    };
  }

  public async getInternationalTestGraphById(id: string, options: CrossDomainGraphReadOptions = {}): Promise<InternationalTestGraphReadModel> {
    const test = await this.internationalTestRepository.findById(this.required(id, 'INTERNATIONAL_TEST_ID_REQUIRED'));
    if (!test) throw new Error('International test not found');
    const { page, pageSize } = this.pagination(options);
    const [universities, scholarships, preparationCourses, editorialContent] = await Promise.all([
      this.universityRepository.list({ internationalTestId: test.id, page, pageSize }),
      this.scholarshipRepository.list({ internationalTestId: test.id, page, pageSize }),
      this.courseRelationshipRepository.listPublishedCoursesForInternationalTest(test.id, {
        ...options.courseFilters,
        limit: pageSize,
      }),
      this.relatedEditorial(CmsDomainTargetType.INTERNATIONAL_TEST, test.id, options.locale ?? 'ar'),
    ]);

    return {
      subject: this.internationalTestIdentity(test),
      relationships: {
        universities: {
          ...universities,
          data: universities.data.map((university) => ({
            ...this.universityIdentity(university),
            matchingPrograms: (university.academicPrograms ?? []).flatMap((program) =>
              (program.admissionRequirements ?? [])
                .filter((requirement) => requirement.internationalTestId === test.id)
                .map((requirement) => ({
                  ownerId: program.id,
                  sourceProgramName: program.sourceProgramName,
                  minimumScore: requirement.minimumScore,
                  status: requirement.status,
                })),
            ),
          })),
        },
        scholarships: {
          ...scholarships,
          data: scholarships.data.map((scholarship) => this.scholarshipIdentity(scholarship)),
        },
        editorialContent,
        preparationCourses: {
          ...preparationCourses,
          data: preparationCourses.data.map((course) => ({
            ownerId: course.ownerId,
            publicId: course.publicId,
            slug: course.slug,
            displayName: course.displayName,
            directCourseUrl: course.directCourseUrl,
            providerName: course.providerName,
            category: course.category,
          })),
        },
        studentTools: { state: 'OWNER_DOMAIN_NOT_INTEGRATED', ownerDomain: 'STUDENT_TOOLS' },
        services: { state: 'OWNER_DOMAIN_NOT_INTEGRATED', ownerDomain: 'SERVICES' },
      },
    };
  }

  public async getCountryGraphByIso2Code(iso2Code: string, options: CrossDomainGraphReadOptions = {}): Promise<CountryGraphReadModel> {
    const normalizedCode = this.required(iso2Code, 'COUNTRY_CODE_REQUIRED').toUpperCase();
    const country = await this.referenceDataRepository.getCountry(normalizedCode);
    if (!country || !country.isActive) throw new Error('Country not found');
    if (!country.id) throw new Error('COUNTRY_CANONICAL_ID_REQUIRED');

    const { page, pageSize } = this.pagination(options);
    const [universities, scholarships, internationalTests, services, careerJobs, courses, editorialContent] = await Promise.all([
      this.universityRepository.listPublished({ countryReferenceId: country.id, limit: pageSize }),
      this.scholarshipRepository.listPublished({ countryReferenceId: country.id, limit: pageSize }),
      this.internationalTestRepository.listPublished({ countryIso2Code: normalizedCode, page, pageSize }),
      this.serviceCatalogRepository
        ? this.serviceCatalogRepository.listPublished({ supportedCountryReferenceId: country.id, limit: pageSize })
        : Promise.resolve({ data: [], total: 0, page, pageSize, totalPages: 0 }),
      this.careerRepository
        ? this.careerRepository.listPublishedJobs({ countryReferenceId: country.id, page, pageSize })
        : Promise.resolve({ data: [], total: 0, page, pageSize, totalPages: 0 }),
      this.courseRelationshipRepository.listPublishedRelatedCourses({
        ...options.courseFilters,
        providerHeadquartersCountryReferenceId: country.id,
        limit: pageSize,
      }),
      this.relatedEditorial(CmsDomainTargetType.REFERENCE_COUNTRY, country.id, options.locale ?? 'ar'),
    ]);

    const academicPrograms: AcademicProgramGraphIdentity[] = universities.data.flatMap((university) =>
      (university.academicPrograms ?? []).
        filter((program) => program.status === 'PUBLISHED' || program.status === 'ACTIVE' || program.majorMappingState === 'CANONICALLY_MAPPED').
        map((program) => ({
          ownerId: program.id,
          universityOwnerId: university.id,
          universityPublicId: university.publicId,
          universitySlug: university.slug,
          universityDisplayName: university.displayName,
          sourceProgramName: program.sourceProgramName,
          degreeLevelId: program.degreeLevelId,
          majorOwnerId: program.majorId,
          majorMappingState: program.majorMappingState,
          status: program.status,
        })),
    );
    const canonicalMajorIds = [...new Set(academicPrograms
      .filter((program) => program.majorMappingState === 'CANONICALLY_MAPPED' && Boolean(program.majorOwnerId))
      .map((program) => program.majorOwnerId as string))];
    const majors = canonicalMajorIds.length ? await this.majorRepository.findPublishedByIds(canonicalMajorIds) : [];

    return {
      subject: {
        ownerId: country.id,
        canonicalCode: country.iso2Code,
        displayName: country.name,
      },
      relationships: {
        universities: {
          ...universities,
          data: universities.data.map((university) => this.universityIdentity(university)),
        },
        academicPrograms,
        majors: majors.map((major) => this.majorIdentity(major)),
        scholarships: {
          ...scholarships,
          data: scholarships.data.map((scholarship) => this.scholarshipIdentity(scholarship)),
        },
        internationalTests: {
          ...internationalTests,
          pageSize: internationalTests.limit,
          totalPages: Math.ceil(internationalTests.total / Math.max(1, internationalTests.limit)),
          data: internationalTests.data.map((test) => this.internationalTestIdentity(test)),
        },
        services: {
          ...services,
          data: services.data.map((service) => ({
            ownerId: service.id,
            publicId: service.publicId,
            slug: service.slug,
            displayName: service.displayName,
            serviceCategory: service.serviceCategory,
            deliveryMode: service.deliveryMode,
          })),
        },
        careerJobs: {
          ...careerJobs,
          data: careerJobs.data.map((job) => ({
            ownerId: job.id,
            publicId: job.publicId,
            slug: job.slug,
            displayName: job.title,
            opportunityType: job.opportunityType,
            employmentType: job.employmentType,
          })),
        },
        providerHeadquartersCourses: {
          ...courses,
          data: courses.data.map((course) => ({
            ownerId: course.ownerId,
            publicId: course.publicId,
            slug: course.slug,
            displayName: course.displayName,
            directCourseUrl: course.directCourseUrl,
            providerName: course.providerName,
            category: course.category,
          })),
        },
        editorialContent,
      },
    };
  }


  private async relatedEditorial(targetType: CmsDomainTargetType, targetId: string, locale: string): Promise<EditorialGraphIdentity[]> {
    if (!this.cmsRepository?.listPublishedByDomainTarget) return [];
    const rows = await this.cmsRepository.listPublishedByDomainTarget(targetType, targetId, locale, 'manaratak', 6);
    return rows.map((item: PublicCmsContentDto) => ({
      contentId: item.contentId,
      publicId: item.publicId,
      slug: item.slug,
      contentType: item.contentType,
      title: item.title,
      summary: item.summary,
      locale: item.locale,
      publishedAt: item.publishedAt,
    }));
  }

  private majorUniversityIdentity(university: UniversityDto, majorId: string): MajorUniversityGraphItem {
    const programs = (university.academicPrograms ?? []).filter(
      (program): program is UniversityAcademicProgramReadDto & { majorId: string } =>
        program.majorId === majorId && program.majorMappingState === 'CANONICALLY_MAPPED',
    );
    return {
      ...this.universityIdentity(university),
      matchingPrograms: programs.map((program) => ({
        ownerId: program.id,
        sourceProgramName: program.sourceProgramName,
        degreeLevelId: program.degreeLevelId,
        majorOwnerId: program.majorId,
      })),
    };
  }

  private internationalTestIdentity(test: InternationalTestDto): StableEntityReadIdentity & { providerName: string; status: string } {
    const extended = test as InternationalTestDto & { publicId?: string; slug?: string; displayName?: string };
    return {
      ownerId: test.id,
      publicId: extended.publicId,
      slug: extended.slug,
      displayName: extended.displayName || test.localizedNameAr || test.localizedNameEn || test.canonicalName,
      providerName: test.providerName,
      status: test.status,
    };
  }

  private majorIdentity(major: MajorDto): StableEntityReadIdentity {
    return { ownerId: major.id, publicId: major.publicId, slug: major.slug, displayName: major.displayName };
  }

  private universityIdentity(university: UniversityDto): StableEntityReadIdentity {
    return { ownerId: university.id, publicId: university.publicId, slug: university.slug, displayName: university.displayName };
  }

  private scholarshipIdentity(scholarship: ScholarshipDto): StableEntityReadIdentity {
    return { ownerId: scholarship.id, publicId: scholarship.publicId, slug: scholarship.slug, displayName: scholarship.displayName };
  }

  private uniqueIdentities(items: StableEntityReadIdentity[]): StableEntityReadIdentity[] {
    const seen = new Set<string>();
    return items.filter((item) => {
      if (seen.has(item.ownerId)) return false;
      seen.add(item.ownerId);
      return true;
    });
  }

  private pagination(options: CrossDomainGraphReadOptions): { page: number; pageSize: number } {
    return {
      page: Math.max(1, options.page ?? 1),
      pageSize: Math.min(50, Math.max(1, options.pageSize ?? 12)),
    };
  }

  private required(value: string, code: string): string {
    const normalized = value.trim();
    if (!normalized) throw new Error(code);
    return normalized;
  }

}
