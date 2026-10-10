import { randomUUID } from 'crypto';
import {
  IMajorRepository,
  ITransactionalMajorRepository,
  INewMajorCandidateRepository,
  ITransactionalNewMajorCandidateRepository,
  MajorAliasDto,
  MajorClassificationMappingDto,
  ReviewedMajorClassificationInput,
  MajorContentSectionDto,
  MajorDeduplicationService,
  MajorCompletenessClassifier,
  MajorDto,
  MajorFilters,
  MajorImportCompletenessState,
  MajorLevelProfileDto,
  MajorLevel,
  MajorNamingService,
  MajorPublicationReadinessPolicy,
  MajorRelationshipDto,
  MajorSourceDto,
  MajorSourceIdentityPrefix,
  MajorStatus,
  MajorVersionDto,
  PaginatedMajorResult,
  NewMajorCandidateFilters,
  PaginatedNewMajorCandidateResult,
  PublicationReadinessEngine,
  PublicationReadinessResult,
  PublicationReadinessError,
  TaxonomyMappedMajorDto,
  UpdateMajorDto
} from '@manaratak/domain';
import { assertNoTranslationPayloadFields } from '@manaratak/shared';
import { AtomicDomainMutationCoordinator, AtomicMutationRequestContext } from '../../event-foundation/use-cases/AtomicDomainMutationCoordinator';
import { CanonicalMajorReferenceService } from '../services/CanonicalMajorReferenceService';

export interface MajorMutationContext extends AtomicMutationRequestContext {
  expectedRevision?: number; reason?: string; expectedSourceDigest?: string;
}

export interface ApproveNewMajorCandidateInput {
  candidateKey: string;
  canonicalMajorName: string;
  localizedNameAr?: string | null;
  localizedNameEn?: string | null;
  degreeLevel?: string;
  degreeLevelId?: string;
  academicFieldId?: string | null;
  disciplineId?: string | null;
  academicFieldOrDiscipline?: string | null;
  officialSourceUrl?: string | null;
  sourceUrl?: string | null;
}

export type ApproveNewMajorCandidateResult =
  | { type: 'CREATED'; majorId: string; classificationCode: string; linkedSources: { universityPrograms: number; scholarshipMajorTargets: number; scholarshipEligibilityItems: number } }
  | { type: 'PROFILE_ADDED'; majorId: string; classificationCode: string; linkedSources: { universityPrograms: number; scholarshipMajorTargets: number; scholarshipEligibilityItems: number } }
  | { type: 'LINKED_EXISTING'; majorId: string; classificationCode?: string | null; linkedSources: { universityPrograms: number; scholarshipMajorTargets: number; scholarshipEligibilityItems: number } };

export class AdminMajorUseCases {
  constructor(
    private readonly repository: IMajorRepository,
    private readonly catalogRepository?: { listCatalog: (filters: any) => Promise<any>; getCatalogItem?: (id: string) => any; getCatalogContentSections?: (id: string) => any[]; getCatalogSource?: (id: string) => any[]; listCollegeFacets?: (degreeLevel?: string) => any[]; maxCodeNumber?: (prefix: MajorSourceIdentityPrefix) => number },
    private readonly publicationReadiness = new PublicationReadinessEngine(),
    private readonly publicationPolicy = new MajorPublicationReadinessPolicy(),
    private readonly atomicMutations?: AtomicDomainMutationCoordinator,
    private readonly canonicalReferences?: CanonicalMajorReferenceService,
    private readonly newMajorCandidates?: INewMajorCandidateRepository,
  ) {}

  public async listMajors(filters: MajorFilters & { catalog?: string }): Promise<PaginatedMajorResult<any>> {
    if (this.catalogRepository && filters.catalog === 'true' && !filters.taxonomyNodeId) {
      return this.catalogRepository.listCatalog(filters);
    }
    return this.repository.list(filters);
  }

  public async listNewMajorCandidates(filters: NewMajorCandidateFilters): Promise<PaginatedNewMajorCandidateResult> {
    if (!this.newMajorCandidates) throw new Error('NEW_MAJOR_CANDIDATE_QUERY_NOT_AVAILABLE');
    return this.newMajorCandidates.list(filters);
  }

  public async approveNewMajorCandidate(
    input: ApproveNewMajorCandidateInput,
    context?: MajorMutationContext,
  ): Promise<ApproveNewMajorCandidateResult> {
    assertNoTranslationPayloadFields('MAJOR', input as unknown as Record<string, unknown>, ['localizedNameAr', 'localizedNameEn']);
    if (!this.newMajorCandidates) throw new Error('NEW_MAJOR_CANDIDATE_QUERY_NOT_AVAILABLE');
    if (!input.canonicalMajorName.trim()) throw new Error('NEW_MAJOR_CANONICAL_NAME_REQUIRED');

    return this.mutateCandidate('NEW_MAJOR_CANDIDATE_APPROVED', input.candidateKey, context, async (repository, candidateRepository) => {
      await candidateRepository.acquireReviewLock?.(input.candidateKey);
      const candidate = await candidateRepository.findByKey(input.candidateKey);
      if (!candidate) throw new Error('NEW_MAJOR_CANDIDATE_NOT_FOUND_OR_ALREADY_RESOLVED');
      this.assertCandidateReview(candidate, context);

      const resolvedLevel = this.resolveCandidateLevel(input.degreeLevel, candidate.degreeLevelCodes);
      const degreeLevelId = input.degreeLevelId || (candidate.degreeLevelIds.length === 1 ? candidate.degreeLevelIds[0] : undefined);
      if (!degreeLevelId) throw new Error('NEW_MAJOR_CANONICAL_DEGREE_LEVEL_REQUIRED');
      if (resolvedLevel === 'FELLOWSHIP') throw new Error('NEW_MAJOR_FELLOWSHIP_OWNER_REQUIRED');
      if (!input.academicFieldId && !input.disciplineId) throw new Error('NEW_MAJOR_CANONICAL_TAXONOMY_REQUIRED');
      if (!this.canonicalReferences) throw new Error('MAJOR_CANONICAL_REFERENCE_SERVICE_REQUIRED');
      await this.canonicalReferences.assertDegreeMatches(degreeLevelId,resolvedLevel);
      const otherDegrees=await this.canonicalReferences.discoveryDegrees(candidate.degreeLevelIds.filter(id=>id!==degreeLevelId));

      const sourceUrl = input.officialSourceUrl || input.sourceUrl || candidate.officialSourceUrls[0] || undefined;
      const payload = {
        canonicalMajorName: input.canonicalMajorName.trim(),
        degreeLevel: resolvedLevel,
        degreeLevelId,
        sourceClassificationSystem: 'MANARATAK_DISCOVERY_QUEUE',
        academicFieldOrDiscipline: input.academicFieldOrDiscipline || undefined,
        officialSourceUrl: input.officialSourceUrl || sourceUrl,
        sourceUrl: input.sourceUrl || sourceUrl,
        academicFieldId: input.academicFieldId || undefined,
        disciplineId: input.disciplineId || undefined,
      };
      await this.canonicalReferences?.assertPayloadReferencesActive(payload);
      const dedupKey = MajorDeduplicationService.generateKey(payload);
      const exactExisting = await repository.findByDedupKey(dedupKey);
      if (exactExisting) {
        const profileResult = await this.ensureCandidateProfile(repository, exactExisting, {
          resolvedLevel, degreeLevelId, canonicalName: input.canonicalMajorName.trim(),
          localizedNameAr: input.localizedNameAr, localizedNameEn: input.localizedNameEn,
          academicFieldId: input.academicFieldId, disciplineId: input.disciplineId, candidateKey: candidate.candidateKey,
          sourceCount: candidate.sourceCount, sourceDigest:candidate.sourceDigest,evidence:candidate,
        });
        for(const degree of otherDegrees) await this.ensureCandidateProfile(repository,exactExisting,{resolvedLevel:degree.level,degreeLevelId:degree.id,canonicalName:input.canonicalMajorName.trim(),academicFieldId:input.academicFieldId,disciplineId:input.disciplineId,candidateKey:candidate.candidateKey,sourceCount:candidate.sourceCount,sourceDigest:candidate.sourceDigest,evidence:candidate});
        const linkedSources = await candidateRepository.resolve(candidate.candidateKey, exactExisting.id, candidate.sourceDigest);
        await candidateRepository.recordDecision?.({candidateKey:candidate.candidateKey,sourceDigest:candidate.sourceDigest,decision:'APPROVED',actorId:context!.actorId,reason:context!.reason!,majorId:exactExisting.id,evidence:candidate});
        return {
          type: profileResult.created ? 'PROFILE_ADDED' : 'LINKED_EXISTING',
          majorId: exactExisting.id,
          classificationCode: profileResult.code ?? exactExisting.classificationCode ?? exactExisting.publicId,
          linkedSources,
        };
      }

      if (!repository.allocateNextProfileCode || !repository.createLevelProfile) {
        throw new Error('NEW_MAJOR_CODE_ALLOCATION_NOT_AVAILABLE');
      }
      const prefix = this.levelPrefix(resolvedLevel);
      const catalogFloor = this.catalogRepository?.maxCodeNumber?.(prefix) ?? 0;
      const classificationCode = await repository.allocateNextProfileCode(prefix, catalogFloor);
      const classification = MajorCompletenessClassifier.classify({
        ...payload,
        classificationCode,
      });
      const canonicalName = MajorNamingService.normalize(input.canonicalMajorName);
      const major = await repository.create({
        publicId: classificationCode,
        slug: `${MajorNamingService.normalizeForKey(canonicalName)}-${randomUUID().slice(0, 6)}`,
        canonicalName,
        canonicalDedupKey: dedupKey,
        displayName: canonicalName,
        localizedNameAr: input.localizedNameAr ?? undefined,
        localizedNameEn: input.localizedNameEn ?? undefined,
        status: MajorStatus.READY_TO_REVIEW,
        completenessStatus: classification.state,
        facultyName: null,
        academicFieldId: input.academicFieldId ?? null,
        disciplineId: input.disciplineId ?? null,
        optionalFields: {
          degreeLevel: resolvedLevel,
          sourceClassificationSystem: 'MANARATAK_DISCOVERY_QUEUE',
          academicFieldOrDiscipline: input.academicFieldOrDiscipline ?? undefined,
          classificationCode,
          sourceUrl: input.sourceUrl ?? sourceUrl,
          officialSourceUrl: input.officialSourceUrl ?? sourceUrl,
          discoveryCandidateKey: candidate.candidateKey,
        },
      });

      const profile = await repository.createLevelProfile({
        majorId: major.id,
        level: resolvedLevel,
        degreeLevelId,
        code: classificationCode,
        displayName: canonicalName,
        localizedNameAr: input.localizedNameAr ?? undefined,
        localizedNameEn: input.localizedNameEn ?? undefined,
        collegeContext: undefined,
        academicFieldId: input.academicFieldId ?? undefined,
        disciplineId: input.disciplineId ?? undefined,
        status: MajorStatus.READY_TO_REVIEW,
        completenessStatus: classification.state,
        metadata: {
          sourceImportMode: 'DISCOVERY_QUEUE',
          discoveryCandidateKey: candidate.candidateKey,
          sourceCount: candidate.sourceCount,
        },
      });

      if (repository.createSource) {
        await repository.createSource({
          majorId: major.id,
          profileId: profile.id,
          sourceType: sourceUrl ? 'OFFICIAL_SOURCE' : 'ADMIN_ENTRY',
          sourceName: 'NEW_MAJOR_DISCOVERY_QUEUE',
          sourceUri: sourceUrl,
          sourceHash: candidate.sourceDigest,
          importedAt: new Date(),
          metadata: {
            discoveryCandidateKey: candidate.candidateKey,
            sourceTypes: candidate.sourceTypes,
            sourceCount: candidate.sourceCount,
            sourceFacultyContexts: candidate.facultyOrUnitNames,
          },
        });
      }
      if (repository.createAliases) {
        const aliases = [...new Set(candidate.sources.map(source => source.rawLabel.trim()))]
          .filter(alias => MajorNamingService.normalizeSearchText(alias) !== MajorNamingService.normalizeSearchText(canonicalName))
          .map(alias => ({ majorId: major.id, alias, aliasType: 'ALIAS' as const, sourceId: candidate.candidateKey }));
        if (aliases.length) await repository.createAliases(aliases);
      }
      if (repository.createVersion) {
        await repository.createVersion({
          majorId: major.id,
          profileId: profile.id,
          versionNumber: 1,
          status: 'NEEDS_REVIEW',
          sourceUri: sourceUrl,
          sourceHash: candidate.sourceDigest,
          importedAt: new Date(),
          changeSummary: { source: 'NEW_MAJOR_DISCOVERY_QUEUE', createdFromCandidate: candidate.candidateKey },
          rawContentBlocks: { candidate: JSON.parse(JSON.stringify(candidate)) },
          metadata: { discoveryCandidateKey: candidate.candidateKey, sourceCount: candidate.sourceCount, sourceFacultyContexts: candidate.facultyOrUnitNames },
        });
      }

      for(const degree of otherDegrees) await this.ensureCandidateProfile(repository,major,{resolvedLevel:degree.level,degreeLevelId:degree.id,canonicalName,academicFieldId:input.academicFieldId,disciplineId:input.disciplineId,candidateKey:candidate.candidateKey,sourceCount:candidate.sourceCount,sourceDigest:candidate.sourceDigest,evidence:candidate});
      const linkedSources = await candidateRepository.resolve(candidate.candidateKey, major.id, candidate.sourceDigest);
      await candidateRepository.recordDecision?.({candidateKey:candidate.candidateKey,sourceDigest:candidate.sourceDigest,decision:'APPROVED',actorId:context!.actorId,reason:context!.reason!,majorId:major.id,evidence:candidate});
      return { type: 'CREATED', majorId: major.id, classificationCode, linkedSources };
    });
  }

  public async linkNewMajorCandidate(
    candidateKey: string,
    existingMajorId: string,
    context?: MajorMutationContext,
  ) {
    if (!this.newMajorCandidates) throw new Error('NEW_MAJOR_CANDIDATE_QUERY_NOT_AVAILABLE');
    return this.mutateCandidate('NEW_MAJOR_CANDIDATE_LINKED', candidateKey, context, async (repository, candidateRepository) => {
      await candidateRepository.acquireReviewLock?.(candidateKey);
      const major = await repository.findById(existingMajorId);
      if (!major) throw new Error('NEW_MAJOR_LINK_TARGET_NOT_FOUND');
      if ([MajorStatus.ARCHIVED,MajorStatus.REJECTED].includes(major.status)) throw new Error('NEW_MAJOR_LINK_TARGET_INACTIVE');
      const candidate = await candidateRepository.findByKey(candidateKey);
      if (!candidate) throw new Error('NEW_MAJOR_CANDIDATE_NOT_FOUND_OR_ALREADY_RESOLVED');
      this.assertCandidateReview(candidate,context);
      await this.assertCandidateDegreeCompatible(repository, major, candidate.degreeLevelIds);
      if (!this.canonicalReferences) throw new Error('MAJOR_CANONICAL_REFERENCE_SERVICE_REQUIRED');
      const issues=await this.canonicalReferences.publicationIssues(major);
      if(issues.length) throw new Error('NEW_MAJOR_LINK_TARGET_REFERENCE_INACTIVE');
      const result=await candidateRepository.resolve(candidateKey, major.id, candidate.sourceDigest);
      await candidateRepository.recordDecision?.({candidateKey,sourceDigest:candidate.sourceDigest,decision:'LINKED',actorId:context!.actorId,reason:context!.reason!,majorId:major.id,evidence:candidate});
      return {majorId:major.id,...result};
    });
  }

  public async rejectNewMajorCandidate(candidateKey:string,context?:MajorMutationContext):Promise<void> {
    await this.mutateCandidate('NEW_MAJOR_CANDIDATE_REJECTED',candidateKey,context,async (_repository,candidates)=>{
      await candidates.acquireReviewLock?.(candidateKey);
      const candidate=await candidates.findByKey(candidateKey);
      if(!candidate) throw new Error('NEW_MAJOR_CANDIDATE_NOT_FOUND_OR_ALREADY_RESOLVED');
      this.assertCandidateReview(candidate,context);
      if(!candidates.recordDecision) throw new Error('NEW_MAJOR_CANDIDATE_DECISION_PERSISTENCE_REQUIRED');
      await candidates.recordDecision({candidateKey,sourceDigest:candidate.sourceDigest,decision:'REJECTED',actorId:context!.actorId,reason:context!.reason!,evidence:candidate});
    });
  }

  private assertCandidateReview(candidate: import('@manaratak/domain').NewMajorCandidateDto,context?:MajorMutationContext):void {
    if(!context?.expectedSourceDigest || context.expectedSourceDigest!==candidate.sourceDigest) throw new Error('NEW_MAJOR_CANDIDATE_STALE_SOURCE');
    if(candidate.sourcesTruncated) throw new Error('NEW_MAJOR_CANDIDATE_SOURCE_LIMIT_REVIEW_REQUIRED');
  }

  public async getMajor(id: string): Promise<MajorDto> {
    if (id.startsWith('cat-') && this.catalogRepository?.getCatalogItem) {
      const catalog = this.catalogRepository.getCatalogItem(id);
      if (catalog) return { ...catalog, publicId: catalog.code, canonicalName: catalog.nameEn || catalog.displayName, canonicalDedupKey: catalog.code } as MajorDto;
    }
    const major = await this.repository.findById(id);
    if (!major && this.catalogRepository?.getCatalogItem) {
      const catalog = this.catalogRepository.getCatalogItem(id);
      if (catalog) return { ...catalog, publicId: catalog.code, canonicalName: catalog.nameEn || catalog.displayName, canonicalDedupKey: catalog.code } as MajorDto;
    }
    if (!major) {
      throw new Error('MAJOR_NOT_FOUND');
    }
    return major;
  }

  public async listVersions(id: string, options?: { profileId?: string;page?:number }): Promise<MajorVersionDto[]> {
    if (id.startsWith('cat-')) return [];
    await this.getMajor(id);
    return this.repository.listVersions ? this.repository.listVersions(id, options) : [];
  }

  public async listLevelProfiles(id: string): Promise<MajorLevelProfileDto[]> {
    if (id.startsWith('cat-')) {
      const item = this.catalogRepository?.getCatalogItem?.(id);
      return item ? [{ id: item.id, code: item.code, level: item.catalogKind, displayName: item.displayName, localizedNameAr: item.nameAr, localizedNameEn: item.nameEn, collegeContext: item.collegeOrFaculty || item.collegeOrField }] as MajorLevelProfileDto[] : [];
    }
    await this.getMajor(id);
    return this.repository.listLevelProfiles ? this.repository.listLevelProfiles(id) : [];
  }

  public async listContentSections(
    id: string,
    options?: { profileId?: string; versionId?: string },
  ): Promise<MajorContentSectionDto[]> {
    if (id.startsWith('cat-') && this.catalogRepository?.getCatalogContentSections) return this.catalogRepository.getCatalogContentSections(id) as MajorContentSectionDto[];
    const major = await this.repository.findById(id);
    if (!major && this.catalogRepository?.getCatalogContentSections) return this.catalogRepository.getCatalogContentSections(id) as MajorContentSectionDto[];
    await this.getMajor(id);
    return this.repository.listContentSections ? this.repository.listContentSections(id, options) : [];
  }

  public async updateContentSections(
    id: string,
    input: {
      profileId?: string;
      versionId?: string;
      sections: Array<{ id?: string; sectionKey: string; title?: string; content: string; reviewStatus?: string }>;
    },
    context?: MajorMutationContext,
  ): Promise<{ success: boolean; profileId: string; versionId: string; count: number; data: MajorContentSectionDto[] }> {
    this.assertMutableCanonicalMajorId(id);
    if (!context?.actorId || !this.atomicMutations) throw new Error('MAJOR_CONTENT_AUDITED_ACTOR_REQUIRED');
    const major = await this.getMajor(id);
    const profiles = this.repository.listLevelProfiles ? await this.repository.listLevelProfiles(major.id) : [];

    let targetProfile = input.profileId
      ? profiles.find(p => p.id === input.profileId || p.code === input.profileId)
      : undefined;

    if (!targetProfile && !input.profileId && profiles.length === 1) {
      targetProfile = profiles[0];
    }
    if (!targetProfile || !targetProfile.id) {
      throw new Error('TARGET_MAJOR_PROFILE_REQUIRED');
    }

    if (targetProfile.status === MajorStatus.PUBLISHED || targetProfile.status === MajorStatus.ARCHIVED) throw new Error('MAJOR_PUBLISHED_STRUCTURE_IMMUTABLE');
    let targetVersionId = input.versionId;
    if (!targetVersionId) {
      const versions = this.repository.listVersions ? await this.repository.listVersions(major.id, { profileId: targetProfile.id }) : [];
      const profileVersions = versions
        .filter(v => v.profileId === targetProfile.id)
        .sort((a, b) => b.versionNumber - a.versionNumber);
      targetVersionId = profileVersions[0]?.id;
    }
    if (!targetVersionId) {
      throw new Error('NO_WORKING_VERSION_FOUND_FOR_PROFILE');
    }

    const profileId = targetProfile.id;
    const versionId = targetVersionId;
    const result = await this.mutate('MAJOR_CONTENT_SECTIONS_UPDATED', major.id, context, repository => {
      if (!repository.updateContentSections) throw new Error('CONTENT_SECTION_UPDATE_NOT_SUPPORTED');
      return repository.updateContentSections(profileId, versionId, input.sections);
    }, { profileId, versionId, sectionCount: input.sections.length });

    return {
      success: true,
      profileId,
      versionId,
      count: result.count,
      data: result.sections,
    };
  }

  public async listAliases(id: string): Promise<MajorAliasDto[]> {
    await this.getMajor(id);
    return this.repository.listAliases ? this.repository.listAliases(id) : [];
  }

  public async listRelationships(id: string): Promise<MajorRelationshipDto[]> {
    await this.getMajor(id);
    return this.repository.listRelationships ? this.repository.listRelationships(id) : [];
  }

  public async listClassificationMappings(id: string): Promise<MajorClassificationMappingDto[]> {
    await this.getMajor(id);
    return this.repository.listClassificationMappings ? this.repository.listClassificationMappings(id) : [];
  }

  public async listSources(id: string): Promise<MajorSourceDto[]> {
    if (id.startsWith('cat-') && this.catalogRepository?.getCatalogSource) return this.catalogRepository.getCatalogSource(id) as MajorSourceDto[];
    const major = await this.repository.findById(id);
    if (!major && this.catalogRepository?.getCatalogSource) return this.catalogRepository.getCatalogSource(id) as MajorSourceDto[];
    await this.getMajor(id);
    return this.repository.listSources ? this.repository.listSources(id) : [];
  }

  public listCollegeFacets(degreeLevel?: string) { return this.catalogRepository?.listCollegeFacets?.(degreeLevel) ?? []; }

  public async listByTaxonomyNode(taxonomyNodeId: string): Promise<TaxonomyMappedMajorDto[]> {
    if (!this.repository.listByTaxonomyNode) {
      throw new Error('MAJOR_TAXONOMY_REVERSE_LOOKUP_UNAVAILABLE');
    }
    return this.repository.listByTaxonomyNode(taxonomyNodeId);
  }

  public async updateMajor(id: string, updates: UpdateMajorDto, context?: MajorMutationContext): Promise<MajorDto> {
    assertNoTranslationPayloadFields('MAJOR', updates as unknown as Record<string, unknown>, ['localizedNameAr', 'localizedNameEn']);
    assertNoTranslationPayloadFields('MAJOR', updates.optionalFields, ['localizedNames']);
    if(updates.status!==undefined || updates.completenessStatus!==undefined || updates.currentPublishedVersionId!==undefined || updates.classificationCode!==undefined || updates.degreeLevel!==undefined) throw new Error('MAJOR_EXPLICIT_LIFECYCLE_OR_PROFILE_COMMAND_REQUIRED');
    const publicFields=new Set(['description','studentFriendlySummary','acquiredSkills','careerOutcomes','typicalCourses']);
    if(Object.keys(updates.optionalFields ?? {}).some(key=>!publicFields.has(key))) throw new Error('MAJOR_STRUCTURED_GRAPH_COMMAND_REQUIRED');
    this.assertMutableCanonicalMajorId(id);
    const existing = await this.getMajor(id);
    if ([MajorStatus.PUBLISHED,MajorStatus.ARCHIVED,MajorStatus.REJECTED].includes(existing.status)) {
      throw new Error('MAJOR_PUBLISHED_STRUCTURE_IMMUTABLE');
    }

    const payloadForClassification = {
      canonicalMajorName: updates.displayName ?? existing.displayName,
      degreeLevel: updates.degreeLevel ?? existing.degreeLevel,
      degreeLevelId: existing.profiles?.find((profile) => profile.degreeLevelId)?.degreeLevelId ?? undefined,
      sourceClassificationSystem: updates.sourceClassificationSystem ?? existing.sourceClassificationSystem,
      academicFieldOrDiscipline: updates.academicFieldOrDiscipline !== undefined ? updates.academicFieldOrDiscipline || undefined : existing.academicFieldOrDiscipline,
      collegeOrFaculty: updates.collegeOrFaculty !== undefined ? updates.collegeOrFaculty || undefined : existing.collegeOrFaculty,
      sourceUrl: updates.sourceUrl !== undefined ? updates.sourceUrl || undefined : existing.sourceUrl || undefined,
      officialSourceUrl: updates.officialSourceUrl !== undefined ? updates.officialSourceUrl || undefined : existing.officialSourceUrl || undefined,
      sourceImportRecordId: existing.sourceImportRecordId,
      sources: existing.sources,
      academicFieldId: updates.academicFieldId !== undefined ? updates.academicFieldId || undefined : existing.academicFieldId || undefined,
      disciplineId: updates.disciplineId !== undefined ? updates.disciplineId || undefined : existing.disciplineId || undefined,
    };

    if(!this.canonicalReferences) throw new Error('MAJOR_CANONICAL_REFERENCE_SERVICE_REQUIRED');
    await this.canonicalReferences.assertPayloadReferencesActive(payloadForClassification);
    const classification = MajorCompletenessClassifier.classify(payloadForClassification);

    return this.mutate('MAJOR_UPDATED',id,context,async repository=>{
      const current=await repository.findById(id);
      if(!current || [MajorStatus.PUBLISHED,MajorStatus.ARCHIVED,MajorStatus.REJECTED].includes(current.status)) throw new Error('MAJOR_PUBLISHED_STRUCTURE_IMMUTABLE');
      return repository.update(id,{...updates,status:MajorStatus.READY_TO_REVIEW,completenessStatus:classification.state});
    });
  }

  public async addClassificationMapping(id: string, input: ReviewedMajorClassificationInput, context?: MajorMutationContext): Promise<MajorClassificationMappingDto> {
    this.assertMutableCanonicalMajorId(id);
    if (!context?.actorId || !this.atomicMutations) throw new Error('MAJOR_GRAPH_AUDITED_ACTOR_REQUIRED');
    if (!input.reason.trim() || !input.evidenceReference.trim()) throw new Error('MAJOR_GRAPH_REVIEW_EVIDENCE_REQUIRED');
    return this.mutate('MAJOR_CLASSIFICATION_MAPPING_ADDED', id, context, repository => {
      if (!repository.addReviewedClassificationMapping) throw new Error('MAJOR_GRAPH_TRANSACTIONAL_PERSISTENCE_REQUIRED');
      return repository.addReviewedClassificationMapping(id, {
        ...input, reason: input.reason.trim(), evidenceReference: input.evidenceReference.trim(),
      });
    }, { taxonomyNodeId: input.taxonomyNodeId, profileId: input.profileId, relationshipType: input.relationshipType, reason: input.reason, evidenceReference: input.evidenceReference });
  }

  public async startWorkingCopy(id:string,context?:MajorMutationContext):Promise<void> {
    this.assertMutableCanonicalMajorId(id);
    await this.mutate('MAJOR_WORKING_COPY_CREATED',id,context,async repository=>{
      if(!repository.startWorkingCopy) throw new Error('MAJOR_WORKING_COPY_PERSISTENCE_REQUIRED');
      await repository.startWorkingCopy(id,context!.actorId,context!.reason!);
    });
  }

  public async reviewGraph(id:string,kind:'ALIAS'|'RELATIONSHIP',input:Record<string,string>,context?:MajorMutationContext):Promise<void> {
    this.assertMutableCanonicalMajorId(id);
    await this.mutate('MAJOR_'+kind+'_REVIEWED',id,context,async repository=>{
      if(!repository.reviewGraph) throw new Error('MAJOR_GRAPH_TRANSACTIONAL_PERSISTENCE_REQUIRED');
      await repository.reviewGraph(id,kind,input,context!.actorId);
    },{kind,...input});
  }

  public async reviewWorkingVersion(id:string,versionId:string,coverage:Record<string,string>,context?:MajorMutationContext):Promise<void> {
    this.assertMutableCanonicalMajorId(id);
    await this.mutate('MAJOR_WORKING_VERSION_REVIEWED',id,context,async repository=>{
      if(!repository.reviewWorkingVersion) throw new Error('MAJOR_REVIEW_PERSISTENCE_REQUIRED');
      await repository.reviewWorkingVersion(id,versionId,context!.actorId,context!.reason!,coverage);
    },{versionId});
  }

  public async markReadyToReview(id: string, context?: MajorMutationContext): Promise<void> {
    this.assertMutableCanonicalMajorId(id);
    const existing = await this.getPublicationTarget(id);
    if (existing.completenessStatus === MajorImportCompletenessState.INCOMPLETE) {
      throw new Error('MAJOR_INCOMPLETE_REVIEW_REQUIRED');
    }
    if (existing.status !== MajorStatus.READY_TO_REVIEW) {
      await this.mutate('MAJOR_MARKED_READY_TO_REVIEW', id, context, repository => repository.updateStatus(id, MajorStatus.READY_TO_REVIEW));
    }
  }

  public async markReadyToPublish(id: string, context?: MajorMutationContext): Promise<void> {
    this.assertMutableCanonicalMajorId(id);
    const existing = await this.getPublicationTarget(id);
    await this.assertPublicationReady(id, { ...existing, status: MajorStatus.READY_TO_PUBLISH });
    await this.mutate('MAJOR_MARKED_READY_TO_PUBLISH', id, context, async repository => {
      const current=await this.getPublicationTarget(id,repository);
      await this.assertPublicationReady(id,{...current,status:MajorStatus.READY_TO_PUBLISH});
      await repository.updateStatus(id,MajorStatus.READY_TO_PUBLISH);
    });
  }

  public async checkPublicationReadiness(id: string): Promise<PublicationReadinessResult> {
    const existing = await this.getPublicationTarget(id);
    return this.evaluatePublicationReadiness(id, { ...existing, status: MajorStatus.READY_TO_PUBLISH });
  }

  public async publish(id: string, context?: MajorMutationContext): Promise<void> {
    this.assertMutableCanonicalMajorId(id);
    const existing = await this.getPublicationTarget(id);
    if (existing.status !== MajorStatus.READY_TO_PUBLISH) {
      throw new Error('MAJOR_INVALID_PUBLICATION_STATUS');
    }
    await this.assertPublicationReady(id, existing);
    await this.mutate('MAJOR_PUBLISHED', id, context, async repository => {
      await repository.acquireVersionAllocationLock?.(existing.id);
      const current = await this.getPublicationTarget(id, repository);
      if(current.status!==MajorStatus.READY_TO_PUBLISH) throw new Error('MAJOR_INVALID_PUBLICATION_STATUS');
      await this.assertPublicationReady(id, current);
      await repository.updateStatus(id, MajorStatus.PUBLISHED);
    });
  }

  public async unpublish(id: string, context?: MajorMutationContext): Promise<void> {
    this.assertMutableCanonicalMajorId(id);
    const existing = await this.getPublicationTarget(id);
    if (!existing.currentPublishedVersionId && !existing.profiles?.some(profile=>profile.currentPublishedVersionId)) throw new Error('MAJOR_PROFILE_NOT_PUBLISHED');
    await this.mutate('MAJOR_UNPUBLISHED', id, context, repository => {
      if(!repository.unpublishProfile) throw new Error('MAJOR_PUBLICATION_PERSISTENCE_REQUIRED');
      return repository.unpublishProfile(id);
    });
  }

  public async reject(id: string, context?: MajorMutationContext): Promise<void> {
    this.assertMutableCanonicalMajorId(id);
    const existing = await this.getPublicationTarget(id);
    if (existing.status === MajorStatus.PUBLISHED) {
      throw new Error('MAJOR_EXPLICIT_UNPUBLISH_REQUIRED');
    }
    await this.mutate('MAJOR_REJECTED', id, context, repository => repository.updateStatus(id, MajorStatus.REJECTED));
  }

  public async archive(id: string, context?: MajorMutationContext): Promise<void> {
    this.assertMutableCanonicalMajorId(id);
    const existing = await this.getPublicationTarget(id);
    if (existing.status === MajorStatus.PUBLISHED) {
      throw new Error('MAJOR_EXPLICIT_UNPUBLISH_REQUIRED');
    }
    await this.mutate('MAJOR_ARCHIVED', id, context, repository => repository.updateStatus(id, MajorStatus.ARCHIVED));
  }

  private assertMutableCanonicalMajorId(id: string): void {
    if (id.startsWith('cat-')) {
      throw new Error('MAJOR_SOURCE_CATALOG_ITEM_REQUIRES_CANONICAL_PROMOTION');
    }
  }

  private async ensureCandidateProfile(
    repository: IMajorRepository,
    major: MajorDto,
    input: {
      resolvedLevel: MajorLevel; degreeLevelId: string; canonicalName: string;
      localizedNameAr?: string | null; localizedNameEn?: string | null;
      academicFieldId?: string | null; disciplineId?: string | null;
      candidateKey: string; sourceCount: number; sourceDigest:string; evidence:import('@manaratak/domain').NewMajorCandidateDto;
    },
  ): Promise<{ created: boolean; code?: string | null }> {
    const profiles = repository.listLevelProfiles ? await repository.listLevelProfiles(major.id) : (major.profiles ?? []);
    const compatible = profiles.find(profile =>
      (profile.degreeLevelId === input.degreeLevelId && profile.level === input.resolvedLevel) ||
      (!profile.degreeLevelId && profile.level === input.resolvedLevel),
    );
    if (compatible) return { created: false, code: compatible.code };
    if (major.status === MajorStatus.PUBLISHED) throw new Error('NEW_MAJOR_EXISTING_TARGET_REQUIRES_UNPUBLISH_FOR_NEW_LEVEL');
    if (!repository.allocateNextProfileCode || !repository.createLevelProfile) throw new Error('NEW_MAJOR_CODE_ALLOCATION_NOT_AVAILABLE');
    const prefix = this.levelPrefix(input.resolvedLevel);
    const catalogFloor = this.catalogRepository?.maxCodeNumber?.(prefix) ?? 0;
    const code = await repository.allocateNextProfileCode(prefix, catalogFloor);
    const profile=await repository.createLevelProfile({
      majorId: major.id,
      level: input.resolvedLevel,
      degreeLevelId: input.degreeLevelId,
      code,
      displayName: input.canonicalName,
      localizedNameAr: input.localizedNameAr ?? undefined,
      localizedNameEn: input.localizedNameEn ?? undefined,
      collegeContext: undefined,
      academicFieldId: input.academicFieldId ?? major.academicFieldId ?? undefined,
      disciplineId: input.disciplineId ?? major.disciplineId ?? undefined,
      status: MajorStatus.READY_TO_REVIEW,
      completenessStatus: MajorImportCompletenessState.NEEDS_REVIEW,
      metadata: { sourceImportMode: 'DISCOVERY_QUEUE', discoveryCandidateKey: input.candidateKey, sourceCount: input.sourceCount },
    });
    if(!repository.createVersion || !repository.createSource) throw new Error('NEW_MAJOR_SOURCE_VERSION_PERSISTENCE_REQUIRED');
    const sourceUri=input.evidence.officialSourceUrls[0];
    await repository.createSource({majorId:major.id,profileId:profile.id,sourceType:'ADMIN_ENTRY',sourceName:'NEW_MAJOR_DISCOVERY_QUEUE',sourceUri,sourceHash:input.sourceDigest,importedAt:new Date(),metadata:{candidateKey:input.candidateKey}});
    await repository.createVersion({majorId:major.id,profileId:profile.id,versionNumber:1,status:'NEEDS_REVIEW',sourceUri,sourceHash:input.sourceDigest,importedAt:new Date(),rawContentBlocks:{candidate:JSON.parse(JSON.stringify(input.evidence))},metadata:{candidateKey:input.candidateKey}});
    return { created: true, code };
  }

  private async assertCandidateDegreeCompatible(repository: IMajorRepository, major: MajorDto, candidateDegreeLevelIds: string[]): Promise<void> {
    if (candidateDegreeLevelIds.length === 0) return;
    const profiles = repository.listLevelProfiles ? await repository.listLevelProfiles(major.id) : (major.profiles ?? []);
    const profileDegreeIds = new Set(profiles.map(profile => profile.degreeLevelId).filter((value): value is string => Boolean(value)));
    if (profileDegreeIds.size === 0) throw new Error('NEW_MAJOR_EXISTING_TARGET_DEGREE_NOT_ESTABLISHED');
    if (!candidateDegreeLevelIds.every(id => profileDegreeIds.has(id))) throw new Error('NEW_MAJOR_EXISTING_TARGET_DEGREE_MISMATCH');
  }

  private resolveCandidateLevel(requested: string | undefined, discovered: string[]): MajorLevel {
    const raw = (requested || (discovered.length === 1 ? discovered[0] : '')).trim().toUpperCase();
    const normalized = raw === 'BACHELOR' || raw === 'BACHELORS' ? 'BACHELOR'
      : raw === 'MASTER' || raw === 'MASTERS' ? 'MASTER'
      : raw === 'DOCTORATE' || raw === 'PHD' ? 'DOCTORATE'
      : raw === 'FELLOWSHIP' ? 'FELLOWSHIP'
      : '';
    if (!normalized) throw new Error('NEW_MAJOR_DEGREE_LEVEL_REVIEW_REQUIRED');
    return normalized as MajorLevel;
  }

  private levelPrefix(level: MajorLevel): MajorSourceIdentityPrefix {
    if (level === 'BACHELOR') return 'MJR';
    if (level === 'MASTER') return 'MAS';
    if (level === 'DOCTORATE') return 'DOC';
    return 'FEL';
  }

  private mutateCandidate<T>(
    action: string,
    candidateKey: string,
    context: MajorMutationContext | undefined,
    mutation: (repository: IMajorRepository, candidateRepository: INewMajorCandidateRepository) => Promise<T>,
  ): Promise<T> {
    if (!this.newMajorCandidates) throw new Error('NEW_MAJOR_CANDIDATE_QUERY_NOT_AVAILABLE');
    if (!this.atomicMutations || !context?.actorId || !context.reason?.trim()) throw new Error('MAJOR_AUDITED_REVIEW_CONTEXT_REQUIRED');
    const repository = this.repository as Partial<ITransactionalMajorRepository>;
    const candidates = this.newMajorCandidates as Partial<ITransactionalNewMajorCandidateRepository>;
    if (!repository.withTransaction || !candidates.withTransaction) {
      throw new Error('NEW_MAJOR_CANDIDATE_TRANSACTIONAL_PERSISTENCE_REQUIRED');
    }
    const payload:Record<string,unknown>={candidateKey,operation:action,sourceDigest:context.expectedSourceDigest};
    return this.atomicMutations.execute(
      { domain:'MAJORS',aggregateType:'NEW_MAJOR_CANDIDATE',aggregateId:candidateKey,action,context,auditMetadata:{reason:context.reason,sourceDigest:context.expectedSourceDigest},outbox:{payload} },
      async transaction=>{
        const result=await mutation(repository.withTransaction!(transaction),candidates.withTransaction!(transaction));
        if(result && typeof result==='object' && 'majorId' in result) payload.majorId=result.majorId;
        return result;
      },
    );
  }

  private async mutate<T>(action: string, id: string, context: MajorMutationContext | undefined, mutation: (repository: IMajorRepository) => Promise<T>, auditMetadata?: Record<string, unknown>): Promise<T> {
    if (!this.atomicMutations || !context?.actorId || !context.reason?.trim()) throw new Error('MAJOR_AUDITED_REVIEW_CONTEXT_REQUIRED');
    if(!Number.isSafeInteger(context.expectedRevision)) throw new Error('MAJOR_EXPECTED_REVISION_REQUIRED');
    const repository = this.repository as Partial<ITransactionalMajorRepository>;
    if (!repository.withTransaction) throw new Error('MAJOR_TRANSACTIONAL_PERSISTENCE_REQUIRED');
    const owner=await this.repository.findById(id);if(!owner) throw new Error('MAJOR_NOT_FOUND');
    return this.atomicMutations.execute({ domain:'MAJORS', aggregateType:'MAJOR',aggregateId:owner.id,action,context,
      auditMetadata:{...auditMetadata,profileReference:id!==owner.id?id:undefined,reason:context.reason,expectedRevision:context.expectedRevision} },async transaction=>{
        const tx=repository.withTransaction!(transaction);
        if(!tx.lockForRevision || !tx.advanceRevision) throw new Error('MAJOR_REVISION_PERSISTENCE_REQUIRED');
        await tx.lockForRevision(id,context.expectedRevision!);
        const result=await mutation(tx);
        const revision=await tx.advanceRevision(id,context.expectedRevision!);
        if(result && typeof result==='object' && 'id' in result) Object.assign(result,{revision});
        return result;
      });
  }

  private async getPublicationTarget(id: string, repository: IMajorRepository = this.repository): Promise<MajorDto> {
    const major = await repository.findById(id);
    if (!major) throw new Error('MAJOR_NOT_FOUND');
    const profiles = major.profiles ?? [];
    const profile = profiles.find(item => item.id === id || item.code === id)
      ?? (profiles.length === 1 ? profiles[0] : undefined);
    if (profiles.length && !profile) throw new Error('TARGET_MAJOR_PROFILE_REQUIRED');
    if (!profile) return major;
    return { ...major, currentPublishedVersionId:profile.currentPublishedVersionId ?? null,status: profile.status ?? major.status,
      completenessStatus: profile.completenessStatus ?? major.completenessStatus,
      academicFieldId: profile.academicFieldId ?? null,
      disciplineId: profile.disciplineId ?? null,
      profiles: [profile],
      classificationMappings: major.classificationMappings?.filter(mapping => mapping.profileId === profile.id),
    };
  }

  private async evaluatePublicationReadiness(id: string, major: MajorDto): Promise<PublicationReadinessResult> {
    const result = this.publicationReadiness.evaluate(id, major, this.publicationPolicy);
    const profile=major.profiles?.[0];
    if(profile?.id && this.repository.listVersions && this.repository.listContentSections) {
      const versions=await this.repository.listVersions(major.id,{profileId:profile.id});
      const version=versions[0];
      const sections=version?.id?await this.repository.listContentSections(major.id,{profileId:profile.id,versionId:version.id}):[];
      if(!version?.approvedBy || version.status!=='APPROVED' || !sections.length || sections.some(section=>section.reviewStatus!=='APPROVED')) {
        result.blockingIssues.push({code:'MAJOR_REVIEWED_WORKING_VERSION_REQUIRED',message:'The latest working version requires a recorded review of all sections'});result.ready=false;
      }
    }
    if (!this.canonicalReferences) {
      result.blockingIssues.push({code:'MAJOR_CANONICAL_REFERENCE_SERVICE_REQUIRED',message:'Canonical references must be validated'});result.ready=false;return result;
    }
    const canonicalIssues = await this.canonicalReferences.publicationIssues(major);
    return {
      ...result,
      ready: result.ready && canonicalIssues.length === 0,
      blockingIssues: [...result.blockingIssues, ...canonicalIssues],
    };
  }

  private async assertPublicationReady(id: string, major: MajorDto): Promise<void> {
    const result = await this.evaluatePublicationReadiness(id, major);
    if (!result.ready) throw new PublicationReadinessError(result);
  }
}
