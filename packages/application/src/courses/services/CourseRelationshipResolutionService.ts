import { createHash } from 'crypto';
import {
  CourseAcademicTaxonomyLinkDto,
  CourseGeographySemanticsDto,
  CourseLanguageResolutionMethod,
  CourseInternationalTestRelationshipDto,
  CourseInternationalTestRelationshipType,
  CourseLanguageResolutionState,
  CourseMajorProjectionDto,
  CourseRelationshipAnalysisResult,
  CourseRelationshipReviewReadModel,
  ICourseRelationshipRepository,
} from '@manaratak/domain';

const TOPIC_SEPARATOR = /\s*(?:•|\||;|\n)\s*/g;

function normalize(value: string): string {
  return value
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('en-US')
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/\s+/g, ' ');
}

function sourceTerms(raw?: string | null): string[] {
  if (!raw?.trim()) return [];
  return [...new Set(
    raw
      .split(TOPIC_SEPARATOR)
      .map((item) => item.normalize('NFKC').trim().replace(/\s+/g, ' '))
      .filter(Boolean),
  )];
}

export class CourseRelationshipResolutionService {
  public constructor(private readonly repository: ICourseRelationshipRepository) {}

  public async analyzeCourse(courseId: string): Promise<CourseRelationshipAnalysisResult> {
    const source = await this.repository.getRelationshipSource(courseId);
    if (!source) throw new Error(`COURSE_NOT_FOUND:${courseId}`);

    const terms = sourceTerms(source.shortCourseTopicsRaw);
    let proposed = 0;
    let ambiguous = 0;
    let unresolved = 0;

    for (const term of terms) {
      const normalizedTerm = normalize(term);
      const candidates = await this.repository.resolveTaxonomyCandidates(normalizedTerm);

      if (candidates.length === 0) {
        unresolved += 1;
        await this.repository.upsertTaxonomyResolution({
          courseId,
          sourceTerm: term,
          normalizedTerm,
          status: 'UNRESOLVED',
          candidateTaxonomyNodeIds: [],
          sourceImportRecordId: source.sourceImportRecordId,
        });
        continue;
      }

      if (candidates.length > 1) {
        ambiguous += 1;
        await this.repository.upsertTaxonomyResolution({
          courseId,
          sourceTerm: term,
          normalizedTerm,
          status: 'AMBIGUOUS',
          candidateTaxonomyNodeIds: candidates.map((candidate) => candidate.nodeId),
          sourceImportRecordId: source.sourceImportRecordId,
        });
        continue;
      }

      const candidate = candidates[0];
      const resolution = await this.repository.upsertTaxonomyResolution({
        courseId,
        sourceTerm: term,
        normalizedTerm,
        status: 'PROPOSED',
        candidateTaxonomyNodeIds: [candidate.nodeId],
        chosenTaxonomyNodeId: candidate.nodeId,
        matchMethod: candidate.matchMethod,
        confidence: 1,
        sourceImportRecordId: source.sourceImportRecordId,
      });
      await this.repository.upsertTaxonomyLink({
        courseId,
        taxonomyNodeId: candidate.nodeId,
        sourceResolutionId: resolution.id,
        relationshipType: 'RELATED',
        reviewState: 'PROPOSED',
        matchMethod: candidate.matchMethod,
        sourceTerm: term,
        confidence: 1,
        sourceImportRecordId: source.sourceImportRecordId,
      });
      proposed += 1;
    }

    // Source terms are a current snapshot. A term removed by a later import must
    // not leave a previous proposal/approval looking current to public queries.
    await this.repository.reconcileTaxonomyRelationships({
      courseId,
      activeNormalizedTerms: terms.map(normalize),
    });

    const language = await this.resolveLanguage(
      courseId,
      source,
    );
    const geography = await this.repository.getGeographySemantics(courseId)
      ?? {
        courseId,
        providerId: source.provider?.id ?? null,
        providerName: source.provider?.canonicalName ?? null,
        providerHeadquartersCountryReferenceId: source.provider?.headquartersCountryReferenceId ?? null,
        providerHeadquartersCountry: source.provider?.headquartersCountry ?? null,
        studyCountryReferenceIds: [],
        semantics: source.provider?.headquartersCountryReferenceId
          ? 'PROVIDER_HEADQUARTERS_ONLY'
          : 'NO_GEOGRAPHY',
      } satisfies CourseGeographySemanticsDto;

    return {
      courseId,
      taxonomy: {
        sourceTerms: terms,
        proposed,
        ambiguous,
        unresolved,
      },
      language,
      geography,
    };
  }

  public async getReviewModel(courseId: string): Promise<CourseRelationshipReviewReadModel> {
    if (!courseId.trim()) throw new Error('COURSE_ID_REQUIRED');
    const source = await this.repository.getRelationshipSource(courseId);
    if (!source) throw new Error(`COURSE_NOT_FOUND:${courseId}`);
    const [taxonomyLinks, majorProjections, internationalTestRelationships, geography] = await Promise.all([
      this.repository.listTaxonomyLinks(courseId),
      this.repository.listMajorProjections(courseId),
      this.repository.listInternationalTestRelationships(courseId),
      this.repository.getGeographySemantics(courseId),
    ]);
    const approvedTaxonomyLinks = taxonomyLinks.filter((item) => item.reviewState === 'APPROVED').length;
    const approvedMajorProjections = majorProjections.filter((item) => item.projectionState === 'APPROVED').length;
    const approvedInternationalTestRelationships = internationalTestRelationships.filter((item) => item.reviewState === 'APPROVED').length;
    const languageCanonical = source.learningLanguageRaw?.trim()
      ? source.learningLanguageResolutionState === 'RESOLVED' && Boolean(source.learningLanguageReferenceId)
      : true;
    const reviewRequired = !languageCanonical
      || taxonomyLinks.some((item) => item.reviewState === 'PROPOSED' || item.reviewState === 'REVIEW_REQUIRED')
      || majorProjections.some((item) => item.projectionState === 'PROPOSED' || item.projectionState === 'REVIEW_REQUIRED')
      || internationalTestRelationships.some((item) => item.reviewState === 'PROPOSED');

    return {
      courseId,
      source: {
        status: source.status,
        sourceImportRecordId: source.sourceImportRecordId,
        shortCourseTopicsRaw: source.shortCourseTopicsRaw,
        learningLanguageRaw: source.learningLanguageRaw,
        learningLanguageReferenceId: source.learningLanguageReferenceId,
        learningLanguageResolutionState: source.learningLanguageResolutionState,
        learningLanguageResolutionMethod: source.learningLanguageResolutionMethod,
        learningLanguageReviewedBy: source.learningLanguageReviewedBy,
        externalProviderId: source.externalProviderId,
      },
      taxonomyLinks,
      majorProjections,
      internationalTestRelationships,
      geography: geography ?? {
        courseId,
        providerId: source.provider?.id ?? null,
        providerName: source.provider?.canonicalName ?? null,
        providerHeadquartersCountryReferenceId: source.provider?.headquartersCountryReferenceId ?? null,
        providerHeadquartersCountry: source.provider?.headquartersCountry ?? null,
        studyCountryReferenceIds: [],
        semantics: source.provider?.headquartersCountryReferenceId ? 'PROVIDER_HEADQUARTERS_ONLY' : 'NO_GEOGRAPHY',
      },
      closure: { languageCanonical, approvedTaxonomyLinks, approvedMajorProjections, approvedInternationalTestRelationships, reviewRequired },
    };
  }

  public async proposeManualTaxonomyLink(
    courseId: string,
    taxonomyNodeId: string,
    relationshipType: CourseAcademicTaxonomyLinkDto['relationshipType'],
    actorId: string,
  ): Promise<CourseAcademicTaxonomyLinkDto> {
    if (!courseId.trim()) throw new Error('COURSE_ID_REQUIRED');
    if (!taxonomyNodeId.trim()) throw new Error('ACADEMIC_TAXONOMY_NODE_ID_REQUIRED');
    if (!actorId.trim()) throw new Error('COURSE_RELATIONSHIP_REVIEW_ACTOR_REQUIRED');
    return this.repository.createManualTaxonomyLink({
      courseId, taxonomyNodeId, relationshipType, actorId,
    });
  }

  public async approveTaxonomyLink(
    courseId: string,
    linkId: string,
    actorId: string,
  ): Promise<CourseAcademicTaxonomyLinkDto> {
    if (!courseId.trim()) throw new Error('COURSE_ID_REQUIRED');
    if (!actorId.trim()) throw new Error('COURSE_RELATIONSHIP_REVIEW_ACTOR_REQUIRED');
    return this.repository.reviewTaxonomyLink({
      courseId, linkId,
      decision: 'APPROVED',
      actorId,
    });
  }

  public async rejectTaxonomyLink(
    courseId: string,
    linkId: string,
    actorId: string,
  ): Promise<CourseAcademicTaxonomyLinkDto> {
    if (!courseId.trim()) throw new Error('COURSE_ID_REQUIRED');
    if (!actorId.trim()) throw new Error('COURSE_RELATIONSHIP_REVIEW_ACTOR_REQUIRED');
    return this.repository.reviewTaxonomyLink({
      courseId, linkId,
      decision: 'REJECTED',
      actorId,
    });
  }


  public async approveLanguageReference(
    courseId: string,
    languageReferenceId: string,
    actorId: string,
  ): Promise<void> {
    if (!courseId.trim()) throw new Error('COURSE_ID_REQUIRED');
    if (!languageReferenceId.trim()) throw new Error('REFERENCE_LANGUAGE_ID_REQUIRED');
    if (!actorId.trim()) throw new Error('COURSE_RELATIONSHIP_REVIEW_ACTOR_REQUIRED');
    await this.repository.reviewLanguageResolution({
      courseId,
      languageReferenceId,
      actorId,
    });
  }

  public async projectMajors(courseId: string): Promise<CourseMajorProjectionDto[]> {
    const links = await this.repository.listTaxonomyLinks(courseId, 'APPROVED');
    const projections: CourseMajorProjectionDto[] = [];
    const activeProjectionKeys: string[] = [];

    for (const link of links) {
      const mappings = await this.repository.listMajorMappingsForTaxonomyNode(link.taxonomyNodeId);
      for (const mapping of mappings) {
        const projectionKey = this.sha256(
          [courseId, mapping.mappingId, mapping.majorId, mapping.profileId ?? ''].join('|'),
        );
        activeProjectionKeys.push(projectionKey);
        projections.push(await this.repository.upsertMajorProjection({
          projectionKey,
          courseId,
          majorId: mapping.majorId,
          profileId: mapping.profileId,
          taxonomyNodeId: mapping.taxonomyNodeId,
          sourceCourseTaxonomyLinkId: link.id,
          sourceMajorClassificationMappingId: mapping.mappingId,
          sourceType: 'TAXONOMY_MAPPING',
          relationshipType: mapping.relationshipType,
          projectionState: 'PROPOSED',
          confidence: this.combineConfidence(link.confidence, mapping.confidence),
        }));
      }
    }

    await this.repository.reconcileMajorProjections({ courseId, activeProjectionKeys });

    return projections;
  }

  public async proposeDirectMajorProjection(
    courseId: string,
    majorId: string,
    relationshipType: CourseMajorProjectionDto['relationshipType'],
    actorId: string,
  ): Promise<CourseMajorProjectionDto> {
    if (!courseId.trim()) throw new Error('COURSE_ID_REQUIRED');
    if (!majorId.trim()) throw new Error('MAJOR_ID_REQUIRED');
    if (!actorId.trim()) throw new Error('COURSE_RELATIONSHIP_REVIEW_ACTOR_REQUIRED');
    return this.repository.createDirectMajorProjection({
      courseId, majorId, relationshipType, actorId,
    });
  }

  public async approveMajorProjection(
    courseId: string,
    projectionId: string,
    actorId: string,
  ): Promise<CourseMajorProjectionDto> {
    if (!courseId.trim()) throw new Error('COURSE_ID_REQUIRED');
    if (!actorId.trim()) throw new Error('COURSE_RELATIONSHIP_REVIEW_ACTOR_REQUIRED');
    return this.repository.reviewMajorProjection({
      courseId, projectionId,
      decision: 'APPROVED',
      actorId,
    });
  }

  public async rejectMajorProjection(
    courseId: string,
    projectionId: string,
    actorId: string,
  ): Promise<CourseMajorProjectionDto> {
    if (!courseId.trim()) throw new Error('COURSE_ID_REQUIRED');
    if (!actorId.trim()) throw new Error('COURSE_RELATIONSHIP_REVIEW_ACTOR_REQUIRED');
    return this.repository.reviewMajorProjection({
      courseId, projectionId,
      decision: 'REJECTED',
      actorId,
    });
  }

  public async proposeInternationalTestRelationship(
    courseId: string,
    internationalTestId: string,
    relationshipType: CourseInternationalTestRelationshipType,
    actorId: string,
  ): Promise<CourseInternationalTestRelationshipDto> {
    if (!courseId.trim()) throw new Error('COURSE_ID_REQUIRED');
    if (!internationalTestId.trim()) throw new Error('INTERNATIONAL_TEST_ID_REQUIRED');
    if (!actorId.trim()) throw new Error('COURSE_RELATIONSHIP_REVIEW_ACTOR_REQUIRED');
    return this.repository.createInternationalTestRelationship({
      courseId,
      internationalTestId,
      relationshipType,
      actorId,
    });
  }

  public async approveInternationalTestRelationship(
    courseId: string,
    relationshipId: string,
    actorId: string,
  ): Promise<CourseInternationalTestRelationshipDto> {
    if (!actorId.trim()) throw new Error('COURSE_RELATIONSHIP_REVIEW_ACTOR_REQUIRED');
    return this.repository.reviewInternationalTestRelationship({
      courseId, relationshipId, decision: 'APPROVED', actorId,
    });
  }

  public async rejectInternationalTestRelationship(
    courseId: string,
    relationshipId: string,
    actorId: string,
  ): Promise<CourseInternationalTestRelationshipDto> {
    if (!actorId.trim()) throw new Error('COURSE_RELATIONSHIP_REVIEW_ACTOR_REQUIRED');
    return this.repository.reviewInternationalTestRelationship({
      courseId, relationshipId, decision: 'REJECTED', actorId,
    });
  }

  private async resolveLanguage(
    courseId: string,
    source: {
      learningLanguageRaw?: string | null;
      learningLanguageReferenceId?: string | null;
      learningLanguageResolutionState: CourseLanguageResolutionState;
      learningLanguageResolutionMethod?: CourseLanguageResolutionMethod | null;
      learningLanguageAdminReviewedRaw?: string | null;
    },
  ): Promise<{
    raw?: string | null;
    state: CourseLanguageResolutionState;
    referenceId?: string | null;
    method?: CourseLanguageResolutionMethod | null;
  }> {
    const raw = source.learningLanguageRaw;
    if (source.learningLanguageResolutionMethod === 'ADMIN_REVIEW' && source.learningLanguageReferenceId) {
      const candidates = raw?.trim() ? await this.repository.resolveLanguageCandidates(raw) : [];
      if (
        (raw && source.learningLanguageAdminReviewedRaw && normalize(raw) === normalize(source.learningLanguageAdminReviewedRaw))
        || (candidates.length === 1 && candidates[0].id === source.learningLanguageReferenceId)
      ) {
        return {
          raw: raw ?? null,
          state: 'RESOLVED',
          referenceId: source.learningLanguageReferenceId,
          method: 'ADMIN_REVIEW',
        };
      }

      // Keep the human decision intact, but surface a genuinely changed or no
      // longer resolvable source language for a fresh review.
      await this.repository.markLanguageReviewRequired({ courseId });
      return {
        raw: raw ?? null,
        state: 'REVIEW_REQUIRED',
        referenceId: source.learningLanguageReferenceId,
        method: 'ADMIN_REVIEW',
      };
    }

    if (!raw?.trim()) {
      await this.repository.setLanguageResolution({
        courseId,
        languageReferenceId: null,
        state: 'UNRESOLVED',
        method: null,
      });
      return { raw: raw ?? null, state: 'UNRESOLVED', referenceId: null, method: null };
    }

    const candidates = await this.repository.resolveLanguageCandidates(raw);
    if (candidates.length === 0) {
      await this.repository.setLanguageResolution({
        courseId,
        languageReferenceId: null,
        state: 'UNRESOLVED',
        method: null,
      });
      return { raw, state: 'UNRESOLVED', referenceId: null, method: null };
    }

    if (candidates.length > 1) {
      await this.repository.setLanguageResolution({
        courseId,
        languageReferenceId: null,
        state: 'AMBIGUOUS',
        method: null,
      });
      return { raw, state: 'AMBIGUOUS', referenceId: null, method: null };
    }

    const candidate = candidates[0];
    await this.repository.setLanguageResolution({
      courseId,
      languageReferenceId: candidate.id,
      state: 'RESOLVED',
      method: candidate.matchMethod,
    });
    return {
      raw,
      state: 'RESOLVED',
      referenceId: candidate.id,
      method: candidate.matchMethod,
    };
  }

  private combineConfidence(a?: number | null, b?: number | null): number | undefined {
    if (a === undefined || a === null) return b ?? undefined;
    if (b === undefined || b === null) return a;
    return Number(Math.min(a, b).toFixed(4));
  }

  private sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}
