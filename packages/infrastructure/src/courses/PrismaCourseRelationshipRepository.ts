import { Prisma, PrismaClient } from '@prisma/client';
import {
  CourseAcademicTaxonomyLinkDto,
  CourseGeographySemanticsDto,
  CourseLanguageCandidateDto,
  CourseLanguageResolutionMethod,
  CourseInternationalTestRelationshipDto,
  CourseInternationalTestRelationshipState,
  CourseInternationalTestRelationshipType,
  CourseMajorMappingCandidateDto,
  CourseMajorProjectionDto,
  CourseMajorProjectionState,
  CourseRelationshipSourceDto,
  CourseTaxonomyCandidateDto,
  CourseTaxonomyResolutionDto,
  ICourseRelationshipRepository,
  PaginatedCourseResult,
  CourseRelationshipPublicCourseDto,
  CourseRelationshipPublicFilters,
  PublicCourseFilters,
} from '@manaratak/domain';
import { queryStableCursorPage } from '../api-foundation/StableCursor';

function normalize(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase('en-US').replace(/\s+/g, ' ');
}

function jsonArray(value: Prisma.JsonValue | null): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export class PrismaCourseRelationshipRepository implements ICourseRelationshipRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async getRelationshipSource(courseId: string): Promise<CourseRelationshipSourceDto | null> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        status: true,
        sourceImportRecordId: true,
        shortCourseTopicsRaw: true,
        category: true,
        learningLanguageRaw: true,
        learningLanguageReferenceId: true,
        learningLanguageResolutionState: true,
        learningLanguageResolutionMethod: true,
        learningLanguageReviewedBy: true,
        learningLanguageAdminReviewedRaw: true,
        externalProviderId: true,
        externalProvider: {
          select: {
            id: true,
            publicId: true,
            canonicalName: true,
            headquartersCountryReferenceId: true,
            headquartersCountry: {
              select: {
                id: true,
                iso2Code: true,
                iso3Code: true,
                name: true,
              },
            },
          },
        },
      },
    });
    if (!course) return null;
    return {
      courseId: course.id,
      status: course.status,
      sourceImportRecordId: course.sourceImportRecordId,
      shortCourseTopicsRaw: course.shortCourseTopicsRaw ?? course.category,
      learningLanguageRaw: course.learningLanguageRaw,
      learningLanguageReferenceId: course.learningLanguageReferenceId,
      learningLanguageResolutionState: course.learningLanguageResolutionState as CourseRelationshipSourceDto['learningLanguageResolutionState'],
      learningLanguageResolutionMethod: course.learningLanguageResolutionMethod as CourseRelationshipSourceDto['learningLanguageResolutionMethod'],
      learningLanguageReviewedBy: course.learningLanguageReviewedBy,
      learningLanguageAdminReviewedRaw: course.learningLanguageAdminReviewedRaw,
      externalProviderId: course.externalProviderId,
      provider: course.externalProvider
        ? {
            id: course.externalProvider.id,
            publicId: course.externalProvider.publicId,
            canonicalName: course.externalProvider.canonicalName,
            headquartersCountryReferenceId: course.externalProvider.headquartersCountryReferenceId,
            headquartersCountry: course.externalProvider.headquartersCountry,
          }
        : null,
    };
  }

  public async resolveTaxonomyCandidates(normalizedTerm: string): Promise<CourseTaxonomyCandidateDto[]> {
    const term = normalize(normalizedTerm);
    if (!term) return [];

    const records = await this.prisma.academicTaxonomyNode.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { canonicalName: { equals: term, mode: 'insensitive' } },
          { canonicalCode: { equals: term, mode: 'insensitive' } },
          { aliases: { some: { normalizedAlias: term } } },
        ],
      },
      include: { aliases: true },
      orderBy: [{ nodeType: 'asc' }, { canonicalCode: 'asc' }],
      take: 20,
    });

    return records.map((record: any) => {
      const canonicalCodeMatch = normalize(record.canonicalCode) === term;
      const canonicalNameMatch = normalize(record.canonicalName) === term;
      const aliasMatch = record.aliases.some((alias: any) => normalize(alias.normalizedAlias) === term);
      const matchMethod: CourseTaxonomyCandidateDto['matchMethod'] = canonicalCodeMatch
        ? 'EXACT_CANONICAL_CODE'
        : canonicalNameMatch
          ? 'EXACT_CANONICAL_NAME'
          : aliasMatch
            ? 'EXACT_ALIAS'
            : 'EXACT_ALIAS';

      return {
        nodeId: record.id,
        nodeType: record.nodeType,
        canonicalCode: record.canonicalCode,
        canonicalName: record.canonicalName,
        standardType: record.standardType,
        standardCode: record.standardCode,
        matchMethod,
      };
    });
  }

  public async upsertTaxonomyResolution(input: {
    courseId: string;
    sourceTerm: string;
    normalizedTerm: string;
    status: CourseTaxonomyResolutionDto['status'];
    candidateTaxonomyNodeIds: string[];
    chosenTaxonomyNodeId?: string | null;
    matchMethod?: CourseTaxonomyResolutionDto['matchMethod'];
    confidence?: number | null;
    sourceImportRecordId?: string | null;
  }): Promise<CourseTaxonomyResolutionDto> {
    const where = {
      courseId_normalizedTerm: {
        courseId: input.courseId,
        normalizedTerm: input.normalizedTerm,
      },
    };
    const existing = await this.prisma.courseTaxonomyResolution.findUnique({ where });
    const reviewLocked = existing?.reviewedAt != null ||
      existing?.status === 'APPROVED' ||
      existing?.status === 'REJECTED' ||
      existing?.status === 'REVIEW_REQUIRED';

    const record = await this.prisma.courseTaxonomyResolution.upsert({
      where,
      update: {
        sourceTerm: input.sourceTerm,
        status: reviewLocked ? undefined : input.status,
        candidateTaxonomyNodeIds: input.candidateTaxonomyNodeIds as Prisma.InputJsonArray,
        chosenTaxonomyNodeId: reviewLocked ? undefined : input.chosenTaxonomyNodeId ?? null,
        matchMethod: reviewLocked ? undefined : input.matchMethod ?? null,
        confidence: reviewLocked ? undefined : input.confidence ?? null,
        sourceImportRecordId: input.sourceImportRecordId ?? null,
      },
      create: {
        courseId: input.courseId,
        sourceTerm: input.sourceTerm,
        normalizedTerm: input.normalizedTerm,
        status: input.status,
        candidateTaxonomyNodeIds: input.candidateTaxonomyNodeIds as Prisma.InputJsonArray,
        chosenTaxonomyNodeId: input.chosenTaxonomyNodeId ?? null,
        matchMethod: input.matchMethod ?? null,
        confidence: input.confidence ?? null,
        sourceImportRecordId: input.sourceImportRecordId ?? null,
      },
    });
    return this.mapResolution(record);
  }

  public async upsertTaxonomyLink(input: {
    courseId: string;
    taxonomyNodeId: string;
    sourceResolutionId?: string | null;
    relationshipType: CourseAcademicTaxonomyLinkDto['relationshipType'];
    reviewState: CourseAcademicTaxonomyLinkDto['reviewState'];
    matchMethod: CourseAcademicTaxonomyLinkDto['matchMethod'];
    sourceTerm: string;
    confidence?: number | null;
    sourceImportRecordId?: string | null;
  }): Promise<CourseAcademicTaxonomyLinkDto> {
    const record = await this.prisma.courseAcademicTaxonomyLink.upsert({
      where: {
        courseId_taxonomyNodeId_relationshipType: {
          courseId: input.courseId,
          taxonomyNodeId: input.taxonomyNodeId,
          relationshipType: input.relationshipType,
        },
      },
      update: {
        sourceResolutionId: input.sourceResolutionId ?? null,
        matchMethod: input.matchMethod,
        sourceTerm: input.sourceTerm,
        confidence: input.confidence ?? null,
        sourceImportRecordId: input.sourceImportRecordId ?? null,
      },
      create: {
        courseId: input.courseId,
        taxonomyNodeId: input.taxonomyNodeId,
        sourceResolutionId: input.sourceResolutionId ?? null,
        relationshipType: input.relationshipType,
        reviewState: input.reviewState,
        matchMethod: input.matchMethod,
        sourceTerm: input.sourceTerm,
        confidence: input.confidence ?? null,
        sourceImportRecordId: input.sourceImportRecordId ?? null,
      },
    });
    return this.mapTaxonomyLink(record);
  }

  public async reconcileTaxonomyRelationships(input: {
    courseId: string;
    activeNormalizedTerms: string[];
  }): Promise<void> {
    const activeTerms = [...new Set(input.activeNormalizedTerms.map(normalize).filter(Boolean))];
    const staleResolutions = await this.prisma.courseTaxonomyResolution.findMany({
      where: {
        courseId: input.courseId,
        ...(activeTerms.length ? { normalizedTerm: { notIn: activeTerms } } : {}),
      },
      select: { id: true },
    });
    if (!staleResolutions.length) return;

    const resolutionIds = staleResolutions.map((item) => item.id);
    const staleLinks = await this.prisma.courseAcademicTaxonomyLink.findMany({
      where: { courseId: input.courseId, sourceResolutionId: { in: resolutionIds } },
      select: { id: true },
    });
    const staleLinkIds = staleLinks.map((item) => item.id);

    await this.prisma.$transaction([
      this.prisma.courseTaxonomyResolution.updateMany({
        where: { id: { in: resolutionIds } },
        data: { status: 'REVIEW_REQUIRED' },
      }),
      this.prisma.courseAcademicTaxonomyLink.updateMany({
        where: { id: { in: staleLinkIds } },
        data: { reviewState: 'REVIEW_REQUIRED' },
      }),
      this.prisma.courseMajorProjection.updateMany({
        where: { sourceCourseTaxonomyLinkId: { in: staleLinkIds } },
        data: { projectionState: 'REVIEW_REQUIRED' },
      }),
    ]);
  }

  public async listTaxonomyLinks(
    courseId: string,
    reviewState?: CourseAcademicTaxonomyLinkDto['reviewState'],
  ): Promise<CourseAcademicTaxonomyLinkDto[]> {
    const records = await this.prisma.courseAcademicTaxonomyLink.findMany({
      where: {
        courseId,
        ...(reviewState ? { reviewState } : {}),
      },
      include: { taxonomyNode: { select: { id: true, canonicalCode: true, canonicalName: true, nodeType: true } } },
      orderBy: [{ reviewState: 'asc' }, { createdAt: 'asc' }],
    });
    return records.map((record: any) => this.mapTaxonomyLink(record));
  }

  public async reviewTaxonomyLink(input: {
    courseId: string;
    linkId: string;
    decision: 'APPROVED' | 'REJECTED';
    actorId: string;
  }): Promise<CourseAcademicTaxonomyLinkDto> {
    const existing = await this.prisma.courseAcademicTaxonomyLink.findFirst({
      where: { id: input.linkId, courseId: input.courseId },
    });
    if (!existing) throw new Error('COURSE_TAXONOMY_LINK_NOT_FOUND');

    const reviewedAt = new Date();
    const operations: Prisma.PrismaPromise<unknown>[] = [
      this.prisma.courseAcademicTaxonomyLink.update({
        where: { id: input.linkId },
        data: {
          reviewState: input.decision,
          reviewedBy: input.actorId,
          reviewedAt,
        },
      }),
    ];
    if (existing.sourceResolutionId) {
      operations.push(this.prisma.courseTaxonomyResolution.update({
        where: { id: existing.sourceResolutionId },
        data: {
          status: input.decision,
          reviewedBy: input.actorId,
          reviewedAt,
        },
      }));
    }
    await this.prisma.$transaction(operations);
    const record = await this.prisma.courseAcademicTaxonomyLink.findUniqueOrThrow({
      where: { id: input.linkId },
      include: { taxonomyNode: { select: { id: true, canonicalCode: true, canonicalName: true, nodeType: true } } },
    });
    return this.mapTaxonomyLink(record);
  }

  public async createManualTaxonomyLink(input: {
    courseId: string;
    taxonomyNodeId: string;
    relationshipType: CourseAcademicTaxonomyLinkDto['relationshipType'];
    actorId: string;
  }): Promise<CourseAcademicTaxonomyLinkDto> {
    const [course, taxonomyNode] = await Promise.all([
      this.prisma.course.findUnique({ where: { id: input.courseId }, select: { id: true } }),
      this.prisma.academicTaxonomyNode.findFirst({
        where: { id: input.taxonomyNodeId, status: 'ACTIVE' },
        select: { id: true, canonicalCode: true, canonicalName: true, nodeType: true },
      }),
    ]);
    if (!course) throw new Error('COURSE_NOT_FOUND');
    if (!taxonomyNode) throw new Error('ACADEMIC_TAXONOMY_NODE_NOT_FOUND_OR_INACTIVE');

    const record = await this.prisma.courseAcademicTaxonomyLink.upsert({
      where: {
        courseId_taxonomyNodeId_relationshipType: {
          courseId: input.courseId,
          taxonomyNodeId: input.taxonomyNodeId,
          relationshipType: input.relationshipType,
        },
      },
      update: {
        sourceResolutionId: null,
        reviewState: 'PROPOSED',
        matchMethod: 'ADMIN_REVIEW',
        sourceTerm: taxonomyNode.canonicalName,
        confidence: 1,
        reviewedBy: null,
        reviewedAt: null,
      },
      create: {
        courseId: input.courseId,
        taxonomyNodeId: input.taxonomyNodeId,
        sourceResolutionId: null,
        relationshipType: input.relationshipType,
        reviewState: 'PROPOSED',
        matchMethod: 'ADMIN_REVIEW',
        sourceTerm: taxonomyNode.canonicalName,
        confidence: 1,
      },
      include: { taxonomyNode: { select: { id: true, canonicalCode: true, canonicalName: true, nodeType: true } } },
    });
    return this.mapTaxonomyLink(record);
  }

  public async resolveLanguageCandidates(raw: string): Promise<CourseLanguageCandidateDto[]> {
    const term = normalize(raw);
    if (!term) return [];
    const records = await this.prisma.referenceLanguage.findMany({
      where: {
        isActive: true,
        OR: [
          { isoCode: { equals: term, mode: 'insensitive' } },
          { name: { equals: term, mode: 'insensitive' } },
          { nativeName: { equals: term, mode: 'insensitive' } },
          { nameAr: { equals: term, mode: 'insensitive' } },
        ],
      },
      orderBy: { isoCode: 'asc' },
      take: 10,
    });

    return records.map((record: any) => {
      let matchMethod: CourseLanguageCandidateDto['matchMethod'] = 'EXACT_NAME';
      if (normalize(record.isoCode) === term) matchMethod = 'EXACT_ISO_CODE';
      else if (normalize(record.name) === term) matchMethod = 'EXACT_NAME';
      else if (record.nativeName && normalize(record.nativeName) === term) matchMethod = 'EXACT_NATIVE_NAME';
      else if (record.nameAr && normalize(record.nameAr) === term) matchMethod = 'EXACT_ARABIC_NAME';
      return {
        id: record.id,
        isoCode: record.isoCode,
        name: record.name,
        nameAr: record.nameAr,
        nativeName: record.nativeName,
        matchMethod,
      };
    });
  }

  public async setLanguageResolution(input: {
    courseId: string;
    languageReferenceId?: string | null;
    state: CourseRelationshipSourceDto['learningLanguageResolutionState'];
    method?: CourseLanguageResolutionMethod | null;
  }): Promise<void> {
    await this.prisma.course.update({
      where: { id: input.courseId },
      data: {
        learningLanguageReferenceId: input.languageReferenceId ?? null,
        learningLanguageResolutionState: input.state,
        learningLanguageResolutionMethod: input.method ?? null,
        learningLanguageResolvedAt: input.state === 'RESOLVED' ? new Date() : null,
      },
    });
  }

  public async reviewLanguageResolution(input: {
    courseId: string;
    languageReferenceId: string;
    actorId: string;
  }): Promise<void> {
    const language = await this.prisma.referenceLanguage.findFirst({
      where: {
        id: input.languageReferenceId,
        isActive: true,
      },
      select: { id: true },
    });
    if (!language) throw new Error('REFERENCE_LANGUAGE_NOT_FOUND_OR_INACTIVE');

    const course = await this.prisma.course.findUnique({
      where: { id: input.courseId },
      select: { learningLanguageRaw: true },
    });
    if (!course) throw new Error('COURSE_NOT_FOUND');

    await this.prisma.course.update({
      where: { id: input.courseId },
      data: {
        learningLanguageReferenceId: input.languageReferenceId,
        learningLanguageResolutionState: 'RESOLVED',
        learningLanguageResolutionMethod: 'ADMIN_REVIEW',
        learningLanguageResolvedAt: new Date(),
        learningLanguageReviewedBy: input.actorId,
        learningLanguageAdminReviewedRaw: course.learningLanguageRaw,
      },
    });
  }

  public async markLanguageReviewRequired(input: { courseId: string }): Promise<void> {
    await this.prisma.course.update({
      where: { id: input.courseId },
      data: {
        learningLanguageResolutionState: 'REVIEW_REQUIRED',
        learningLanguageResolvedAt: null,
      },
    });
  }

  public async listMajorMappingsForTaxonomyNode(
    taxonomyNodeId: string,
  ): Promise<CourseMajorMappingCandidateDto[]> {
    const records = await this.prisma.majorClassificationMapping.findMany({
      where: {
        taxonomyNodeId,
        relationshipType: { in: ['PRIMARY', 'SECONDARY', 'RELATED'] },
      },
      include: {
        major: { select: { id: true, status: true } },
        profile: {
          select: {
            id: true,
            majorId: true,
            status: true,
            major: { select: { id: true, status: true } },
          },
        },
      },
      orderBy: [{ relationshipType: 'asc' }, { createdAt: 'asc' }],
    });

    return records.flatMap((record: any) => {
      const majorId = record.majorId ?? record.profile?.majorId;
      const majorStatus = record.major?.status ?? record.profile?.major?.status;
      if (!majorId || majorStatus === 'ARCHIVED' || record.profile?.status === 'ARCHIVED') return [];
      return [{
        mappingId: record.id,
        taxonomyNodeId: record.taxonomyNodeId,
        majorId,
        profileId: record.profileId,
        relationshipType: record.relationshipType as CourseMajorMappingCandidateDto['relationshipType'],
        confidence: record.confidence,
      }];
    });
  }

  public async upsertMajorProjection(input: {
    projectionKey: string;
    courseId: string;
    majorId: string;
    profileId?: string | null;
    taxonomyNodeId?: string | null;
    sourceCourseTaxonomyLinkId?: string | null;
    sourceMajorClassificationMappingId?: string | null;
    sourceType: CourseMajorProjectionDto['sourceType'];
    relationshipType: CourseMajorProjectionDto['relationshipType'];
    projectionState: CourseMajorProjectionState;
    confidence?: number | null;
  }): Promise<CourseMajorProjectionDto> {
    const existing = await this.prisma.courseMajorProjection.findUnique({
      where: { projectionKey: input.projectionKey },
    });
    const reviewLocked = existing?.reviewedAt != null ||
      existing?.projectionState === 'APPROVED' ||
      existing?.projectionState === 'REJECTED' ||
      existing?.projectionState === 'REVIEW_REQUIRED';

    const record = await this.prisma.courseMajorProjection.upsert({
      where: { projectionKey: input.projectionKey },
      update: {
        profileId: input.profileId ?? null,
        taxonomyNodeId: input.taxonomyNodeId ?? null,
        sourceCourseTaxonomyLinkId: input.sourceCourseTaxonomyLinkId ?? null,
        sourceMajorClassificationMappingId: input.sourceMajorClassificationMappingId ?? null,
        sourceType: input.sourceType,
        relationshipType: input.relationshipType,
        projectionState: reviewLocked ? undefined : input.projectionState,
        confidence: input.confidence ?? null,
      },
      create: {
        projectionKey: input.projectionKey,
        courseId: input.courseId,
        majorId: input.majorId,
        profileId: input.profileId ?? null,
        taxonomyNodeId: input.taxonomyNodeId ?? null,
        sourceCourseTaxonomyLinkId: input.sourceCourseTaxonomyLinkId ?? null,
        sourceMajorClassificationMappingId: input.sourceMajorClassificationMappingId ?? null,
        sourceType: input.sourceType,
        relationshipType: input.relationshipType,
        projectionState: input.projectionState,
        confidence: input.confidence ?? null,
      },
      include: { major: { select: { id: true, publicId: true, slug: true, displayName: true, status: true } } },
    });
    return this.mapMajorProjection(record);
  }

  public async reconcileMajorProjections(input: {
    courseId: string;
    activeProjectionKeys: string[];
  }): Promise<void> {
    const activeProjectionKeys = [...new Set(input.activeProjectionKeys)];
    await this.prisma.courseMajorProjection.updateMany({
      where: {
        courseId: input.courseId,
        sourceType: 'TAXONOMY_MAPPING',
        ...(activeProjectionKeys.length ? { projectionKey: { notIn: activeProjectionKeys } } : {}),
      },
      data: { projectionState: 'REVIEW_REQUIRED' },
    });
  }

  public async listMajorProjections(
    courseId: string,
    state?: CourseMajorProjectionState,
  ): Promise<CourseMajorProjectionDto[]> {
    const records = await this.prisma.courseMajorProjection.findMany({
      where: { courseId, ...(state ? { projectionState: state } : {}) },
      include: { major: { select: { id: true, publicId: true, slug: true, displayName: true, status: true } } },
      orderBy: [{ projectionState: 'asc' }, { createdAt: 'asc' }],
    });
    return records.map((record: any) => this.mapMajorProjection(record));
  }

  public async reviewMajorProjection(input: {
    courseId: string;
    projectionId: string;
    decision: 'APPROVED' | 'REJECTED';
    actorId: string;
  }): Promise<CourseMajorProjectionDto> {
    const existing = await this.prisma.courseMajorProjection.findFirst({
      where: { id: input.projectionId, courseId: input.courseId },
    });
    if (!existing) throw new Error('COURSE_MAJOR_PROJECTION_NOT_FOUND');
    const record = await this.prisma.courseMajorProjection.update({
      where: { id: input.projectionId },
      data: { projectionState: input.decision, reviewedBy: input.actorId, reviewedAt: new Date() },
      include: { major: { select: { id: true, publicId: true, slug: true, displayName: true, status: true } } },
    });
    return this.mapMajorProjection(record);
  }

  public async createDirectMajorProjection(input: {
    courseId: string;
    majorId: string;
    relationshipType: CourseMajorProjectionDto['relationshipType'];
    actorId: string;
  }): Promise<CourseMajorProjectionDto> {
    const [course, major] = await Promise.all([
      this.prisma.course.findUnique({ where: { id: input.courseId }, select: { id: true } }),
      this.prisma.major.findFirst({
        where: { id: input.majorId, status: { not: 'ARCHIVED' } },
        select: { id: true },
      }),
    ]);
    if (!course) throw new Error('COURSE_NOT_FOUND');
    if (!major) throw new Error('MAJOR_NOT_FOUND_OR_ARCHIVED');

    const projectionKey = `direct:${input.courseId}:${input.majorId}:${input.relationshipType}`;
    const record = await this.prisma.courseMajorProjection.upsert({
      where: { projectionKey },
      update: {
        profileId: null,
        taxonomyNodeId: null,
        sourceCourseTaxonomyLinkId: null,
        sourceMajorClassificationMappingId: null,
        sourceType: 'DIRECT_REVIEWED',
        relationshipType: input.relationshipType,
        projectionState: 'PROPOSED',
        confidence: 1,
        reviewedBy: null,
        reviewedAt: null,
      },
      create: {
        projectionKey,
        courseId: input.courseId,
        majorId: input.majorId,
        sourceType: 'DIRECT_REVIEWED',
        relationshipType: input.relationshipType,
        projectionState: 'PROPOSED',
        confidence: 1,
      },
      include: { major: { select: { id: true, publicId: true, slug: true, displayName: true, status: true } } },
    });
    return this.mapMajorProjection(record);
  }

  public async createInternationalTestRelationship(input: {
    courseId: string;
    internationalTestId: string;
    relationshipType: CourseInternationalTestRelationshipType;
    actorId: string;
  }): Promise<CourseInternationalTestRelationshipDto> {
    const [course, test] = await Promise.all([
      this.prisma.course.findUnique({ where: { id: input.courseId }, select: { id: true } }),
      this.prisma.internationalTest.findUnique({
        where: { id: input.internationalTestId },
        select: { id: true, status: true },
      }),
    ]);
    if (!course) throw new Error('COURSE_NOT_FOUND');
    if (!test || test.status === 'ARCHIVED') throw new Error('INTERNATIONAL_TEST_NOT_FOUND_OR_ARCHIVED');

    const record = await this.prisma.courseInternationalTestRelationship.upsert({
      where: {
        courseId_internationalTestId_relationshipType: {
          courseId: input.courseId,
          internationalTestId: input.internationalTestId,
          relationshipType: input.relationshipType,
        },
      },
      update: {
        reviewState: 'PROPOSED',
        sourceType: 'ADMIN_AUTHORED',
        createdBy: input.actorId,
        reviewedBy: null,
        reviewedAt: null,
      },
      create: {
        courseId: input.courseId,
        internationalTestId: input.internationalTestId,
        relationshipType: input.relationshipType,
        reviewState: 'PROPOSED',
        sourceType: 'ADMIN_AUTHORED',
        createdBy: input.actorId,
      },
      include: {
        internationalTest: {
          select: { id: true, publicId: true, slug: true, displayName: true, abbreviation: true, status: true },
        },
      },
    });
    return this.mapInternationalTestRelationship(record);
  }

  public async listInternationalTestRelationships(
    courseId: string,
    state?: CourseInternationalTestRelationshipState,
  ): Promise<CourseInternationalTestRelationshipDto[]> {
    const records = await this.prisma.courseInternationalTestRelationship.findMany({
      where: { courseId, ...(state ? { reviewState: state } : {}) },
      include: {
        internationalTest: {
          select: { id: true, publicId: true, slug: true, displayName: true, abbreviation: true, status: true },
        },
      },
      orderBy: [{ reviewState: 'asc' }, { createdAt: 'asc' }],
    });
    return records.map((record: any) => this.mapInternationalTestRelationship(record));
  }

  public async reviewInternationalTestRelationship(input: {
    courseId: string;
    relationshipId: string;
    decision: 'APPROVED' | 'REJECTED';
    actorId: string;
  }): Promise<CourseInternationalTestRelationshipDto> {
    const existing = await this.prisma.courseInternationalTestRelationship.findFirst({
      where: { id: input.relationshipId, courseId: input.courseId },
      select: { id: true },
    });
    if (!existing) throw new Error('COURSE_INTERNATIONAL_TEST_RELATIONSHIP_NOT_FOUND');
    const record = await this.prisma.courseInternationalTestRelationship.update({
      where: { id: input.relationshipId },
      data: { reviewState: input.decision, reviewedBy: input.actorId, reviewedAt: new Date() },
      include: {
        internationalTest: {
          select: { id: true, publicId: true, slug: true, displayName: true, abbreviation: true, status: true },
        },
      },
    });
    return this.mapInternationalTestRelationship(record);
  }

  public async listPublishedRelatedCourses(
    filters: CourseRelationshipPublicFilters,
  ): Promise<PaginatedCourseResult<CourseRelationshipPublicCourseDto>> {
    const where: Prisma.CourseWhereInput = {
      status: 'PUBLISHED',
      completenessStatus: 'COMPLETE',
      AND: [{
        OR: [
          { originType: { not: 'EXTERNAL_LINKED_COURSE' } },
          {
            originType: 'EXTERNAL_LINKED_COURSE',
            accessType: 'FREE_STUDY_AND_CERTIFICATE',
            isStudyFree: true,
            isFreeCertificate: true,
          },
        ],
      }],
    };

    if (filters.accessType) where.accessType = filters.accessType;
    if (filters.originType) where.originType = filters.originType;
    if (filters.platformName) where.platformName = filters.platformName;
    if (filters.category) where.category = filters.category;
    if (filters.learningLanguage) where.learningLanguage = filters.learningLanguage;
    if (filters.learningLanguageReferenceId) {
      where.learningLanguageReferenceId = filters.learningLanguageReferenceId;
    }
    if (filters.taxonomyNodeId) {
      where.academicTaxonomyLinks = {
        some: {
          taxonomyNodeId: filters.taxonomyNodeId,
          reviewState: 'APPROVED',
        },
      };
    }
    if (filters.majorId) {
      where.majorProjections = {
        some: {
          majorId: filters.majorId,
          projectionState: 'APPROVED',
        },
      };
    }
    if (filters.providerHeadquartersCountryReferenceId) {
      where.externalProvider = {
        is: {
          headquartersCountryReferenceId: filters.providerHeadquartersCountryReferenceId,
        },
      };
    }
    if (filters.internationalTestId) {
      where.internationalTestRelationships = {
        some: {
          internationalTestId: filters.internationalTestId,
          reviewState: 'APPROVED',
        },
      };
    }

    const select = {
      id: true, publicId: true, slug: true, displayName: true, accessType: true, originType: true,
      directCourseUrl: true, externalProviderId: true, providerName: true, learningLanguageRaw: true,
      learningLanguageReferenceId: true, isStudyFree: true, isFreeCertificate: true, certificateType: true,
      category: true, optionalFields: true,
    };
    return queryStableCursorPage({
      delegate: this.prisma.course as any, where, select, cursor: filters.cursor, limit: filters.limit,
      map: (row: any) => {
        const { id, optionalFields, ...record } = row;
        const optional = optionalFields && typeof optionalFields === 'object' && !Array.isArray(optionalFields)
          ? optionalFields as Record<string, unknown> : {};
        const rawNames = optional.localizedNames;
        const localizedNames = rawNames && typeof rawNames === 'object' && !Array.isArray(rawNames)
          ? Object.fromEntries(Object.entries(rawNames as Record<string, unknown>).filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].trim().length > 0))
          : undefined;
        return { ownerId: id, ...record, ...(localizedNames ? { localizedNames } : {}) };
      },
    });
  }

  public listPublishedCoursesForMajor(
    majorId: string,
    filters: PublicCourseFilters = {},
  ): Promise<PaginatedCourseResult<CourseRelationshipPublicCourseDto>> {
    return this.listPublishedRelatedCourses({
      ...filters,
      majorId,
    });
  }

  public listPublishedCoursesForInternationalTest(
    internationalTestId: string,
    filters: PublicCourseFilters = {},
  ): Promise<PaginatedCourseResult<CourseRelationshipPublicCourseDto>> {
    return this.listPublishedRelatedCourses({
      ...filters,
      internationalTestId,
    });
  }

  public async getGeographySemantics(courseId: string): Promise<CourseGeographySemanticsDto | null> {
    const source = await this.getRelationshipSource(courseId);
    if (!source) return null;
    return {
      courseId,
      providerId: source.provider?.id ?? null,
      providerName: source.provider?.canonicalName ?? null,
      providerHeadquartersCountryReferenceId: source.provider?.headquartersCountryReferenceId ?? null,
      providerHeadquartersCountry: source.provider?.headquartersCountry ?? null,
      studyCountryReferenceIds: [],
      semantics: source.provider?.headquartersCountryReferenceId
        ? 'PROVIDER_HEADQUARTERS_ONLY'
        : 'NO_GEOGRAPHY',
    };
  }

  private mapInternationalTestRelationship(record: any): CourseInternationalTestRelationshipDto {
    return {
      id: record.id,
      courseId: record.courseId,
      internationalTestId: record.internationalTestId,
      relationshipType: record.relationshipType as CourseInternationalTestRelationshipType,
      reviewState: record.reviewState as CourseInternationalTestRelationshipState,
      sourceType: 'ADMIN_AUTHORED',
      createdBy: record.createdBy,
      reviewedBy: record.reviewedBy,
      reviewedAt: record.reviewedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      internationalTest: record.internationalTest
        ? {
            id: record.internationalTest.id,
            publicId: record.internationalTest.publicId,
            slug: record.internationalTest.slug,
            displayName: record.internationalTest.displayName,
            abbreviation: record.internationalTest.abbreviation,
            status: record.internationalTest.status,
          }
        : null,
    };
  }

  private mapResolution(record: any): CourseTaxonomyResolutionDto {
    return {
      id: record.id,
      courseId: record.courseId,
      sourceTerm: record.sourceTerm,
      normalizedTerm: record.normalizedTerm,
      status: record.status,
      candidateTaxonomyNodeIds: jsonArray(record.candidateTaxonomyNodeIds),
      chosenTaxonomyNodeId: record.chosenTaxonomyNodeId,
      matchMethod: record.matchMethod,
      confidence: record.confidence,
      sourceImportRecordId: record.sourceImportRecordId,
      reviewedBy: record.reviewedBy,
      reviewedAt: record.reviewedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  private mapTaxonomyLink(record: any): CourseAcademicTaxonomyLinkDto {
    return {
      id: record.id,
      courseId: record.courseId,
      taxonomyNodeId: record.taxonomyNodeId,
      sourceResolutionId: record.sourceResolutionId,
      relationshipType: record.relationshipType,
      reviewState: record.reviewState,
      matchMethod: record.matchMethod,
      sourceTerm: record.sourceTerm,
      confidence: record.confidence,
      sourceImportRecordId: record.sourceImportRecordId,
      reviewedBy: record.reviewedBy,
      reviewedAt: record.reviewedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      taxonomyNode: record.taxonomyNode ?? null,
    };
  }

  private mapMajorProjection(record: any): CourseMajorProjectionDto {
    return {
      id: record.id,
      projectionKey: record.projectionKey,
      courseId: record.courseId,
      majorId: record.majorId,
      profileId: record.profileId,
      taxonomyNodeId: record.taxonomyNodeId,
      sourceCourseTaxonomyLinkId: record.sourceCourseTaxonomyLinkId,
      sourceMajorClassificationMappingId: record.sourceMajorClassificationMappingId,
      sourceType: record.sourceType,
      relationshipType: record.relationshipType,
      projectionState: record.projectionState,
      confidence: record.confidence,
      reviewedBy: record.reviewedBy,
      reviewedAt: record.reviewedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      major: record.major ?? null,
    };
  }
}
