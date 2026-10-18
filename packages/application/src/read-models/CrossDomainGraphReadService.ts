import {finalizeGraph,type GraphEdgeCursors} from './GraphPagination';
import {graphProgramLabel,graphPublishedLabel,graphMajorLabel,graphUniversityLabel,graphScholarshipLabel,graphTestLabel,graphServiceLabel,graphCareerLabel,graphCountryLabel} from './GraphOwnerLabels';
import type {TestDiscoveryPage} from '@manaratak/domain';
import type {TestDiscoveryOwnerUseCases} from '../integration/TestDiscoveryOwnerUseCases';
import {
  createGraphReadScope,
  graphOwnerRead,
  requireGraphFirstPage,
  type GraphReadScope,
} from './GraphReadPolicy';
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
  isPublicUniversityProgram,
  isPublicScholarshipUniversityLink,
  isPublicAdmissionRequirement,
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
  labelLocale?: string;
  localeFallback?: boolean;
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
  nextCursor?: string | null;
  hasMore?: boolean;
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
  readScope?: GraphReadScope;
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
  readScope?: GraphReadScope;
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
  readScope?: GraphReadScope;
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
  readScope?: GraphReadScope;
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
    studentTools: TestDiscoveryPage;
    services: TestDiscoveryPage;
  };
}

export interface CountryGraphReadModel {
  readScope?: GraphReadScope;
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

export interface CrossDomainGraphReadOptions extends GraphEdgeCursors {
  page?: number;
  pageSize?: number;
  courseFilters?: PublicCourseFilters;
  locale?: 'ar' | 'en';
  programCursor?: string;
  toolCursor?:string;
  universityCursor?: string;
  scholarshipCursor?: string;
  serviceCursor?: string;
  courseCursor?: string;
  testCursor?:string;
  careerCursor?:string;
  majorCursor?:string;
  editorialCursor?:string;
  testPage?: number;
  careerPage?: number;
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
    private readonly studentToolTestDiscovery?:Pick<TestDiscoveryOwnerUseCases,'publicPage'>,
    private readonly serviceTestDiscovery?:Pick<TestDiscoveryOwnerUseCases,'publicPage'>,
  ) {}

  public async getMajorGraphBySlug(slug: string, options: CrossDomainGraphReadOptions = {}): Promise<MajorGraphReadModel> {
    const subjectSlug=this.required(slug,'MAJOR_SLUG_REQUIRED');
    const major=this.majorRepository.findPublishedSnapshot?await this.majorRepository.findPublishedSnapshot(subjectSlug):await this.majorRepository.findBySlug(subjectSlug);
    if (!major || major.status !== MajorStatus.PUBLISHED) throw new Error('Major not found');

    const readScope = createGraphReadScope();

    const { pageSize } = this.pagination(options);
    const [universities, scholarships, courses, editorialContent] = await Promise.all([
      graphOwnerRead(readScope,'universities',()=>this.universityRepository.listPublished({ majorId: major.id, cursor: options.universityCursor, limit: pageSize }),this.emptyPage(pageSize)),
      graphOwnerRead(readScope,'scholarships',()=>this.scholarshipRepository.listPublished({ majorId: major.id, cursor:options.scholarshipCursor, limit: pageSize }),this.emptyPage(pageSize)),
      graphOwnerRead(readScope,'courses',()=>this.courseRelationshipRepository.listPublishedCoursesForMajor(major.id, {
        ...options.courseFilters,
        cursor: options.courseCursor,
        limit: pageSize,
      }),this.emptyPage(pageSize)),
      graphOwnerRead(
        readScope,
        'editorialContent',
        this.cmsRepository?.listPublishedByDomainTarget
          ? () => this.relatedEditorial(CmsDomainTargetType.MAJOR, major.id, options.locale ?? 'ar', options, readScope)
          : undefined,
        [],
      ),
    ]);

    return finalizeGraph({
      readScope,
      subject: this.majorIdentity(major, options.locale),
      relationships: {
        universities: {
          ...universities,
          data: universities.data.map((university) => this.majorUniversityIdentity(university, major.id, options.locale)),
        },
        scholarships: {
          ...scholarships,
          data: scholarships.data.map((scholarship) => this.scholarshipIdentity(scholarship, options.locale)),
        },
        courses: {
          ...courses,
          data: courses.data.map((course) => ({
            ownerId: course.ownerId,
            publicId: course.publicId,
            slug: course.slug,
            ...graphPublishedLabel(course.displayName,course.localizedNames,options.locale),
            directCourseUrl: course.directCourseUrl,
            providerName: course.providerName,
            category: course.category,
          })),
        },
        editorialContent,
      },
    }, `getMajorGraphBySlug:${major.id}`, options, pageSize);
  }

  public async getUniversityGraphBySlug(slug: string, options: CrossDomainGraphReadOptions = {}): Promise<UniversityGraphReadModel> {
    const university = await this.universityRepository.findPublishedBySlug(this.required(slug, 'UNIVERSITY_SLUG_REQUIRED'));
    if (!university || university.status !== UniversityStatus.PUBLISHED) throw new Error('University not found');

    const readScope = createGraphReadScope();
    const canonicalPrograms = (university.academicPrograms ?? []).filter(
      (program): program is UniversityAcademicProgramReadDto & { majorId: string; degreeLevelId: string } =>
        isPublicUniversityProgram(program),
    );
    const majorIds = [...new Set(canonicalPrograms.map((program) => program.majorId))];
    const { pageSize } = this.pagination(options);
    const [majors, scholarships, editorialContent] = await Promise.all([
      graphOwnerRead(readScope,'majors',()=>this.majorRepository.findPublishedByIds(majorIds),[]),
      graphOwnerRead(readScope,'scholarships',()=>this.scholarshipRepository.listPublished({ universityId: university.id, cursor:options.scholarshipCursor, limit: pageSize }),this.emptyPage(pageSize)),
      graphOwnerRead(
        readScope,
        'editorialContent',
        this.cmsRepository?.listPublishedByDomainTarget
          ? () =>
              this.relatedEditorial(CmsDomainTargetType.UNIVERSITY, university.id, options.locale ?? 'ar', options, readScope)
          : undefined,
        [],
      ),
    ]);
    const publishedMajorIds = new Set(majors.map((major) => major.id));
    const publishedCanonicalPrograms = canonicalPrograms.filter((program) => publishedMajorIds.has(program.majorId));

    return finalizeGraph({
      readScope,
      subject: this.universityIdentity(university, options.locale),
      countryOwnerId: university.countryReferenceId,
      relationships: {
        majors: majors.map((major) => this.majorIdentity(major, options.locale)),
        academicPrograms: publishedCanonicalPrograms.map((program) => ({
          ownerId: program.id,
          sourceProgramName: program.sourceProgramName,
          ...graphProgramLabel(university,program,options.locale),
          degreeLevelId: program.degreeLevelId,
          majorOwnerId: program.majorId,
        })),
        scholarships: {
          ...scholarships,
          data: scholarships.data.map((scholarship) => this.scholarshipIdentity(scholarship, options.locale)),
        },
        editorialContent,
      },
    }, `getUniversityGraphBySlug:${university.id}`, options, pageSize);
  }

  public async getScholarshipGraphBySlug(slug: string, options: CrossDomainGraphReadOptions = {}): Promise<ScholarshipGraphReadModel> {
    const scholarship = await this.scholarshipRepository.findPublishedBySlug(this.required(slug, 'SCHOLARSHIP_SLUG_REQUIRED'));
    if (!scholarship) throw new Error('Scholarship not found');

    const readScope = createGraphReadScope();

    const universityIds = [...new Set(
      (scholarship.universityLinks ?? []).filter(link => isPublicScholarshipUniversityLink(link as Parameters<typeof isPublicScholarshipUniversityLink>[0]))
        .map((link) => link.universityId)
        .filter((id): id is string => Boolean(id)),
    )];
    const academicProgramIds = [...new Set(
      (scholarship.universityLinks ?? []).filter(link => isPublicScholarshipUniversityLink(link as Parameters<typeof isPublicScholarshipUniversityLink>[0]))
        .map((link) => link.academicProgramId)
        .filter((id): id is string => Boolean(id)),
    )];
    const directMajorIds = [...new Set([
      ...(scholarship.majorTargets ?? []).map((target) => target.majorId),
      ...(scholarship.eligibilityItems ?? []).map((item) => item.majorId),
    ].filter((id): id is string => Boolean(id)))];

    const [universities, programs] = await Promise.all([
      graphOwnerRead(readScope,'universities',()=>this.universityRepository.findPublishedByIds(universityIds),[]),
      graphOwnerRead(readScope,'academicPrograms',()=>this.universityRepository.findPublishedAcademicProgramsByIds(academicProgramIds),[]),
    ]);
    const programMajorIds = programs.map((program) => program.majorId).filter((id): id is string => Boolean(id));
    const [majors, editorialContent] = await Promise.all([
      graphOwnerRead(readScope,'majors',()=>this.majorRepository.findPublishedByIds([...new Set([...directMajorIds, ...programMajorIds])]),[]),
      graphOwnerRead(
        readScope,
        'editorialContent',
        this.cmsRepository?.listPublishedByDomainTarget
          ? () =>
              this.relatedEditorial(CmsDomainTargetType.SCHOLARSHIP, scholarship.id, options.locale ?? 'ar', options, readScope)
          : undefined,
        [],
      ),
    ]);

    const programUniversityIdentities: StableEntityReadIdentity[] = programs.map((program) => ({
      ownerId: program.universityOwnerId,
      publicId: program.universityPublicId,
      slug: program.universitySlug,
      ...graphPublishedLabel(program.universityDisplayName, program.universityLocalizedNames, options.locale),
    }));

    return finalizeGraph({
      readScope,
      subject: this.scholarshipIdentity(scholarship, options.locale),
      countryOwnerId: scholarship.countryReferenceId,
      relationships: {
        universities: this.uniqueIdentities([
          ...universities.map((university) => this.universityIdentity(university, options.locale)),
          ...programUniversityIdentities,
        ]),
        academicPrograms: programs.map((program) => ({
          ownerId: program.ownerId,
          universityOwnerId: program.universityOwnerId,
          universityPublicId: program.universityPublicId,
          universitySlug: program.universitySlug,
          universityDisplayName: graphPublishedLabel(program.universityDisplayName,program.universityLocalizedNames,options.locale).displayName,
          universityLocaleFallback:graphPublishedLabel(program.universityDisplayName,program.universityLocalizedNames,options.locale).localeFallback,
          ...graphPublishedLabel(program.sourceProgramName,program.localizedNames,options.locale),
          sourceProgramName: program.sourceProgramName,
          degreeLevelId: program.degreeLevelId,
          majorOwnerId: program.majorId,
          majorMappingState: program.majorMappingState,
          status: program.status,
        })),
        majors: majors.map((major) => this.majorIdentity(major, options.locale)),
        editorialContent,
      },
    }, `getScholarshipGraphBySlug:${scholarship.id}`, options, this.pagination(options).pageSize);
  }

  public async getInternationalTestGraphById(id: string, options: CrossDomainGraphReadOptions = {}): Promise<InternationalTestGraphReadModel> {
    const candidate=await this.internationalTestRepository.findById(this.required(id,'INTERNATIONAL_TEST_ID_REQUIRED'));
    const test=candidate&&typeof candidate.slug==='string'&&this.internationalTestRepository.findPublishedBySlug?await this.internationalTestRepository.findPublishedBySlug(candidate.slug):candidate;
    if (!test || test.status !== 'PUBLISHED') throw new Error('International test not found');
    const readScope = createGraphReadScope();
    const { pageSize } = this.pagination(options);
    const [universities, scholarships, preparationCourses, editorialContent, studentTools, services] = await Promise.all([
      graphOwnerRead(readScope,'universities',()=>this.universityRepository.listPublished({ internationalTestId: test.id, cursor:options.universityCursor, limit: pageSize }),this.emptyPage(pageSize)),
      graphOwnerRead(readScope,'scholarships',()=>this.scholarshipRepository.listPublished({ internationalTestId: test.id, cursor:options.scholarshipCursor, limit: pageSize }),this.emptyPage(pageSize)),
      graphOwnerRead(readScope,'preparationCourses',()=>this.courseRelationshipRepository.listPublishedCoursesForInternationalTest(test.id, {
        ...options.courseFilters,
        cursor: options.courseCursor,
        limit: pageSize,
      }),this.emptyPage(pageSize)),
      graphOwnerRead(
        readScope,
        'editorialContent',
        this.cmsRepository?.listPublishedByDomainTarget
          ? () =>
              this.relatedEditorial(CmsDomainTargetType.INTERNATIONAL_TEST, test.id, options.locale ?? 'ar', options, readScope)
          : undefined,
        [],
      ),
      graphOwnerRead(readScope,'studentTools',this.studentToolTestDiscovery?()=>this.studentToolTestDiscovery!.publicPage(test.id,options.locale??'ar',options.toolCursor,pageSize):undefined,{ownerDomain:'STUDENT_TOOLS',state:'UNAVAILABLE',data:[],hasMore:false,nextCursor:null,scanned:0} as TestDiscoveryPage),
      graphOwnerRead(readScope,'services',this.serviceTestDiscovery?()=>this.serviceTestDiscovery!.publicPage(test.id,options.locale??'ar',options.serviceCursor,pageSize):undefined,{ownerDomain:'SERVICES',state:'UNAVAILABLE',data:[],hasMore:false,nextCursor:null,scanned:0} as TestDiscoveryPage),
    ]);

    return finalizeGraph({
      readScope,
      subject: this.internationalTestIdentity(test, options.locale),
      relationships: {
        universities: {
          ...universities,
          data: universities.data.map((university) => ({
            ...this.universityIdentity(university, options.locale),
            matchingPrograms: (university.academicPrograms ?? []).flatMap((program) =>
              isPublicUniversityProgram(program)
                ? (program.admissionRequirements ?? [])
                .filter((requirement) => requirement.internationalTestId === test.id &&
                        isPublicAdmissionRequirement(requirement),
                    )
                .map((requirement) => ({
                  ownerId: program.id,
                  sourceProgramName: program.sourceProgramName,
                  ...graphProgramLabel(university,program,options.locale),
                  minimumScore: requirement.minimumScore,
                  status: requirement.status,
                }))
                : [],
            ),
          })),
        },
        scholarships: {
          ...scholarships,
          data: scholarships.data.map((scholarship) => this.scholarshipIdentity(scholarship, options.locale)),
        },
        editorialContent,
        preparationCourses: {
          ...preparationCourses,
          data: preparationCourses.data.map((course) => ({
            ownerId: course.ownerId,
            publicId: course.publicId,
            slug: course.slug,
            ...graphPublishedLabel(course.displayName,course.localizedNames,options.locale),
            directCourseUrl: course.directCourseUrl,
            providerName: course.providerName,
            category: course.category,
          })),
        },
        studentTools,
        services,
      },
    }, `getInternationalTestGraphById:${test.id}`, options, pageSize);
  }

  public async getCountryGraphByIso2Code(iso2Code: string, options: CrossDomainGraphReadOptions = {}): Promise<CountryGraphReadModel> {
    const normalizedCode = this.required(iso2Code, 'COUNTRY_CODE_REQUIRED').toUpperCase();
    const country = await this.referenceDataRepository.getCountry(normalizedCode);
    if (!country || !country.isActive) throw new Error('Country not found');
    if (!country.id) throw new Error('COUNTRY_CANONICAL_ID_REQUIRED');

    const { page, pageSize } = this.pagination(options);
    const readScope = createGraphReadScope();
    const empty = { data: [], total: 0, page, pageSize, totalPages: 0 };
    const [universities, scholarships, internationalTests, services, careerJobs, courses, editorialContent,
      programPage,
    ] = await Promise.all([
      graphOwnerRead(
        readScope,
        'universities',
        () =>
          this.universityRepository.listPublished({ countryReferenceId: country.id,
            cursor: options.universityCursor,
            limit: pageSize }),
        empty,
      ),
      graphOwnerRead(
        readScope,
        'scholarships',
        () =>
          this.scholarshipRepository.listPublished({ countryReferenceId: country.id,
            cursor: options.scholarshipCursor,
            limit: pageSize }),
        empty,
      ),
      graphOwnerRead(
        readScope,
        'internationalTests',
        () =>
          this.internationalTestRepository.listPublished({ countryIso2Code: normalizedCode, cursorMode:true, cursor:options.testCursor, page: 1, pageSize }),
        { data: [], total: 0, page, limit: pageSize },
      ),
      graphOwnerRead(
        readScope,
        'services',
        this.serviceCatalogRepository
        ? () =>
              this.serviceCatalogRepository!.listPublished({ supportedCountryReferenceId: country.id,
                cursor: options.serviceCursor,
                limit: pageSize })
        : undefined,
        empty,
      ),
      graphOwnerRead(
        readScope,
        'careerJobs',
      this.careerRepository
        ? () =>
              this.careerRepository!.listPublishedJobs({ countryReferenceId: country.id, cursor:options.careerCursor, limit:pageSize, page:1, pageSize })
        : undefined,
        empty,
      ),
      graphOwnerRead(
        readScope,
        'providerHeadquartersCourses',
        () =>
          this.courseRelationshipRepository.listPublishedRelatedCourses({
        ...options.courseFilters,
        providerHeadquartersCountryReferenceId: country.id,
            cursor: options.courseCursor,
        limit: pageSize,
      }),
        empty,
      ),
      graphOwnerRead(
        readScope,
        'editorialContent',
        this.cmsRepository
          ? () =>
              this.relatedEditorial(CmsDomainTargetType.REFERENCE_COUNTRY, country.id, options.locale ?? 'ar', options, readScope)
          : undefined,
        [],
      ),
      graphOwnerRead(
        readScope,
        'academicPrograms',
        this.universityRepository.listPublishedProgramGraph
          ? () =>
              this.universityRepository.listPublishedProgramGraph!({
                countryReferenceId: country.id,
                cursor: options.programCursor,
                limit: pageSize,
              })
          : undefined,
        { data: [], total: 0, majorTotal: 0, hasMore: false, nextCursor: null },
      ),
    ]);

    const academicPrograms = programPage.data.
        map((program) => ({
      ownerId: program.ownerId, universityOwnerId: program.universityOwnerId, universityPublicId:program.universityPublicId,universitySlug:program.universitySlug,
      universityDisplayName:graphPublishedLabel(program.universityDisplayName,program.universityLocalizedNames,options.locale).displayName,
      universityLocaleFallback:graphPublishedLabel(program.universityDisplayName,program.universityLocalizedNames,options.locale).localeFallback,
      sourceProgramName:program.sourceProgramName,degreeLevelId:program.degreeLevelId,majorMappingState:program.majorMappingState,status:program.status,
      ...graphPublishedLabel(program.sourceProgramName,program.localizedNames,options.locale),
          majorOwnerId: program.majorId,
    }),
    );
    const majorPage = await graphOwnerRead(readScope,'majors',this.universityRepository.listPublishedMajorGraph?()=>this.universityRepository.listPublishedMajorGraph!({countryReferenceId:country.id!,cursor:options.majorCursor,limit:pageSize}):undefined,{data:[],total:0,hasMore:false,nextCursor:null});
    const majors = majorPage.data.length?await graphOwnerRead(readScope,'majors',()=>this.majorRepository.findPublishedByIds(majorPage.data.map(row=>row.ownerId)),[]):[];
    if (readScope.collections.academicPrograms.state === 'AVAILABLE') Object.assign(readScope.collections.academicPrograms,{scope:'OWNER_QUERY',total:programPage.total,hasMore:programPage.hasMore,nextCursor:programPage.nextCursor});
    if(readScope.collections.majors.state==='AVAILABLE')Object.assign(readScope.collections.majors,{scope:'OWNER_QUERY',total:majorPage.total,hasMore:majorPage.hasMore,nextCursor:majorPage.nextCursor});

    return finalizeGraph({
      readScope,
      subject: {
        ownerId: country.id,
        canonicalCode: country.iso2Code,
        ...graphCountryLabel(country,options.locale),
      },
      relationships: {
        universities: {
          ...universities,
          data: universities.data.map((university) => this.universityIdentity(university, options.locale)),
        },
        academicPrograms,
        majors: majors.map((major) => this.majorIdentity(major, options.locale)),
        scholarships: {
          ...scholarships,
          data: scholarships.data.map((scholarship) => this.scholarshipIdentity(scholarship, options.locale)),
        },
        internationalTests: {
          ...internationalTests,
          pageSize: internationalTests.limit,
          totalPages: Math.ceil(internationalTests.total / Math.max(1, internationalTests.limit)),
          data: internationalTests.data.map((test) => this.internationalTestIdentity(test, options.locale)),
        },
        services: {
          ...services,
          data: services.data.map((service) => ({
            ownerId: service.id,
            publicId: service.publicId,
            slug: service.slug,
            ...graphServiceLabel(service,options.locale),
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
            ...graphCareerLabel(job,options.locale),
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
            ...graphPublishedLabel(course.displayName,course.localizedNames,options.locale),
            directCourseUrl: course.directCourseUrl,
            providerName: course.providerName,
            category: course.category,
          })),
        },
        editorialContent,
      },
    }, `getCountryGraphByIso2Code:${country.id}`, options, pageSize);
  }


  private emptyPage(pageSize:number){return {data:[],total:0,page:1,pageSize,totalPages:0,hasMore:false,nextCursor:null};}

  private async relatedEditorial(targetType: CmsDomainTargetType, targetId: string, locale: string,options:CrossDomainGraphReadOptions={},scope?:GraphReadScope): Promise<EditorialGraphIdentity[]> {
    if (!this.cmsRepository?.listPublishedByDomainTarget) return [];
    const ownerPage=this.cmsRepository.listPublishedDomainTargetPage?await this.cmsRepository.listPublishedDomainTargetPage(targetType,targetId,locale,options.editorialCursor,options.pageSize??12):null;
    const rows=ownerPage?.data??await this.cmsRepository.listPublishedByDomainTarget(targetType,targetId,locale,'manaratak',6);
    if(ownerPage&&scope)scope.collections.editorialContent={state:'AVAILABLE',scope:'OWNER_QUERY',total:ownerPage.total,hasMore:ownerPage.hasMore,nextCursor:ownerPage.nextCursor};
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

  private majorUniversityIdentity(university: UniversityDto, majorId: string,
    locale = 'ar',
  ): MajorUniversityGraphItem {
    const programs = (university.academicPrograms ?? []).filter(
      (program): program is UniversityAcademicProgramReadDto & { majorId: string } =>
        program.majorId === majorId && isPublicUniversityProgram(program),
    );
    return {
      ...this.universityIdentity(university, locale),
      matchingPrograms: programs.map((program) => ({
        ownerId: program.id,
        sourceProgramName: program.sourceProgramName,
        ...graphProgramLabel(university,program,locale),
        degreeLevelId: program.degreeLevelId,
        majorOwnerId: program.majorId,
      })),
    };
  }

  private internationalTestIdentity(test: InternationalTestDto,
    locale = 'ar',
  ): StableEntityReadIdentity & { providerName: string; status: string } {
    const extended = test as InternationalTestDto & { publicId?: string; slug?: string; displayName?: string };
    return {
      ownerId: test.id,
      publicId: extended.publicId,
      slug: extended.slug,
      ...graphTestLabel(test,locale),
      providerName: test.providerName,
      status: test.status,
    };
  }

  private majorIdentity(major: MajorDto, locale = 'ar'): StableEntityReadIdentity {
    return { ownerId: major.id, publicId: major.publicId, slug: major.slug,
      ...graphMajorLabel(major,locale),
    };
  }

  private universityIdentity(university: UniversityDto, locale = 'ar'): StableEntityReadIdentity {
    return { ownerId: university.id, publicId: university.publicId, slug: university.slug,
      ...graphUniversityLabel(university,locale),
    };
  }

  private scholarshipIdentity(scholarship: ScholarshipDto,
    locale = 'ar',
  ): StableEntityReadIdentity {
    return { ownerId: scholarship.id, publicId: scholarship.publicId, slug: scholarship.slug,
      ...graphScholarshipLabel(scholarship,locale),
    };
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
    requireGraphFirstPage(options.page);
    return {
      page: 1,
      pageSize: Math.min(50, Math.max(1, options.pageSize ?? 12)),
    };
  }

  private required(value: string, code: string): string {
    const normalized = value.trim();
    if (!normalized) throw new Error(code);
    return normalized;
  }

}
