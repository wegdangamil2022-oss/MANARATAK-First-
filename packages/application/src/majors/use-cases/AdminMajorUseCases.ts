import { randomUUID } from 'crypto';
import {
  IMajorRepository,
  ITransactionalMajorRepository,
  INewMajorCandidateRepository,
  ITransactionalNewMajorCandidateRepository,
  MajorAliasDto,
  MajorClassificationMappingDto,
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
    if (this.catalogRepository && filters.catalog !== 'false') {
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
    context?: AtomicMutationRequestContext,
  ): Promise<ApproveNewMajorCandidateResult> {
    assertNoTranslationPayloadFields('MAJOR', input as unknown as Record<string, unknown>, ['localizedNameAr', 'localizedNameEn']);
    if (!this.newMajorCandidates) throw new Error('NEW_MAJOR_CANDIDATE_QUERY_NOT_AVAILABLE');
    if (!input.canonicalMajorName.trim()) throw new Error('NEW_MAJOR_CANONICAL_NAME_REQUIRED');

    return this.mutateCandidate('NEW_MAJOR_CANDIDATE_APPROVED', input.candidateKey, context, async (repository, candidateRepository) => {
      const candidate = await candidateRepository.findByKey(input.candidateKey);
      if (!candidate) throw new Error('NEW_MAJOR_CANDIDATE_NOT_FOUND_OR_ALREADY_RESOLVED');

      const resolvedLevel = this.resolveCandidateLevel(input.degreeLevel, candidate.degreeLevelCodes);
      const degreeLevelId = input.degreeLevelId || (candidate.degreeLevelIds.length === 1 ? candidate.degreeLevelIds[0] : undefined);
      if (!degreeLevelId) throw new Error('NEW_MAJOR_CANONICAL_DEGREE_LEVEL_REQUIRED');

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
          sourceCount: candidate.sourceCount,
        });
        const linkedSources = await candidateRepository.resolve(candidate.candidateKey, exactExisting.id);
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
          importedAt: new Date(),
          changeSummary: { source: 'NEW_MAJOR_DISCOVERY_QUEUE', createdFromCandidate: candidate.candidateKey },
          rawContentBlocks: { candidate: JSON.parse(JSON.stringify(candidate)) },
          metadata: { discoveryCandidateKey: candidate.candidateKey, sourceCount: candidate.sourceCount, sourceFacultyContexts: candidate.facultyOrUnitNames },
        });
      }

      const linkedSources = await candidateRepository.resolve(candidate.candidateKey, major.id);
      return { type: 'CREATED', majorId: major.id, classificationCode, linkedSources };
    });
  }

  public async linkNewMajorCandidate(
    candidateKey: string,
    existingMajorId: string,
    context?: AtomicMutationRequestContext,
  ) {
    if (!this.newMajorCandidates) throw new Error('NEW_MAJOR_CANDIDATE_QUERY_NOT_AVAILABLE');
    return this.mutateCandidate('NEW_MAJOR_CANDIDATE_LINKED', candidateKey, context, async (repository, candidateRepository) => {
      const major = await repository.findById(existingMajorId);
      if (!major) throw new Error('NEW_MAJOR_LINK_TARGET_NOT_FOUND');
      const candidate = await candidateRepository.findByKey(candidateKey);
      if (!candidate) throw new Error('NEW_MAJOR_CANDIDATE_NOT_FOUND_OR_ALREADY_RESOLVED');
      await this.assertCandidateDegreeCompatible(repository, major, candidate.degreeLevelIds);
      return candidateRepository.resolve(candidateKey, major.id);
    });
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
      throw new Error(`Major with id ${id} not found`);
    }
    return major;
  }

  public async listVersions(id: string): Promise<MajorVersionDto[]> {
    if (id.startsWith('cat-')) return [];
    await this.getMajor(id);
    return this.repository.listVersions ? this.repository.listVersions(id) : [];
  }

  public async listLevelProfiles(id: string): Promise<MajorLevelProfileDto[]> {
    if (id.startsWith('cat-')) {
      const item = this.catalogRepository?.getCatalogItem?.(id);
      return item ? [{ id: item.id, code: item.code, level: item.catalogKind, displayName: item.displayName, localizedNameAr: item.nameAr, localizedNameEn: item.nameEn, collegeContext: item.collegeOrFaculty || item.collegeOrField }] as MajorLevelProfileDto[] : [];
    }
    await this.getMajor(id);
    return this.repository.listLevelProfiles ? this.repository.listLevelProfiles(id) : [];
  }

  public async listContentSections(id: string): Promise<MajorContentSectionDto[]> {
    if (id.startsWith('cat-') && this.catalogRepository?.getCatalogContentSections) return this.catalogRepository.getCatalogContentSections(id) as MajorContentSectionDto[];
    const major = await this.repository.findById(id);
    if (!major && this.catalogRepository?.getCatalogContentSections) return this.catalogRepository.getCatalogContentSections(id) as MajorContentSectionDto[];
    await this.getMajor(id);
    return this.repository.listContentSections ? this.repository.listContentSections(id) : [];
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

  public async updateMajor(id: string, updates: UpdateMajorDto, context?: AtomicMutationRequestContext): Promise<MajorDto> {
    assertNoTranslationPayloadFields('MAJOR', updates as unknown as Record<string, unknown>, ['localizedNameAr', 'localizedNameEn']);
    assertNoTranslationPayloadFields('MAJOR', updates.optionalFields, ['localizedNames']);
    this.assertMutableCanonicalMajorId(id);
    const existing = await this.getMajor(id);
    if (existing.status === MajorStatus.PUBLISHED) {
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

    const classification = MajorCompletenessClassifier.classify(payloadForClassification);

    return this.mutate('MAJOR_UPDATED', id, context, repository => repository.update(id, {
      ...updates,
      completenessStatus: classification.state
    }));
  }

  public async markReadyToReview(id: string, context?: AtomicMutationRequestContext): Promise<void> {
    this.assertMutableCanonicalMajorId(id);
    const existing = await this.getMajor(id);
    if (existing.completenessStatus === MajorImportCompletenessState.INCOMPLETE) {
      throw new Error('Cannot mark INCOMPLETE major as READY_TO_REVIEW');
    }
    if (existing.status !== MajorStatus.READY_TO_REVIEW) {
      await this.mutate('MAJOR_MARKED_READY_TO_REVIEW', id, context, repository => repository.updateStatus(id, MajorStatus.READY_TO_REVIEW));
    }
  }

  public async markReadyToPublish(id: string, context?: AtomicMutationRequestContext): Promise<void> {
    this.assertMutableCanonicalMajorId(id);
    const existing = await this.getMajor(id);
    await this.assertPublicationReady(id, { ...existing, status: MajorStatus.READY_TO_PUBLISH });
    await this.mutate('MAJOR_MARKED_READY_TO_PUBLISH', id, context, repository => repository.updateStatus(id, MajorStatus.READY_TO_PUBLISH));
  }

  public async checkPublicationReadiness(id: string): Promise<PublicationReadinessResult> {
    const existing = await this.getMajor(id);
    return this.evaluatePublicationReadiness(id, { ...existing, status: MajorStatus.READY_TO_PUBLISH });
  }

  public async publish(id: string, context?: AtomicMutationRequestContext): Promise<void> {
    this.assertMutableCanonicalMajorId(id);
    const existing = await this.getMajor(id);
    if (existing.status !== MajorStatus.READY_TO_PUBLISH) {
      throw new Error('MAJOR_INVALID_PUBLICATION_STATUS');
    }
    await this.assertPublicationReady(id, existing);
    await this.mutate('MAJOR_PUBLISHED', id, context, repository => repository.updateStatus(id, MajorStatus.PUBLISHED));
  }

  public async unpublish(id: string, context?: AtomicMutationRequestContext): Promise<void> {
    this.assertMutableCanonicalMajorId(id);
    const existing = await this.getMajor(id);
    if (existing.status !== MajorStatus.PUBLISHED) {
      throw new Error('Cannot unpublish a major that is not PUBLISHED');
    }
    await this.mutate('MAJOR_UNPUBLISHED', id, context, repository => repository.updateStatus(id, MajorStatus.READY_TO_REVIEW));
  }

  public async reject(id: string, context?: AtomicMutationRequestContext): Promise<void> {
    this.assertMutableCanonicalMajorId(id);
    const existing = await this.getMajor(id);
    if (existing.status === MajorStatus.PUBLISHED) {
      throw new Error('Cannot reject a PUBLISHED major. Unpublish first.');
    }
    await this.mutate('MAJOR_REJECTED', id, context, repository => repository.updateStatus(id, MajorStatus.REJECTED));
  }

  public async archive(id: string, context?: AtomicMutationRequestContext): Promise<void> {
    this.assertMutableCanonicalMajorId(id);
    const existing = await this.getMajor(id);
    if (existing.status === MajorStatus.PUBLISHED) {
      throw new Error('Cannot archive a PUBLISHED major. Unpublish first.');
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
      candidateKey: string; sourceCount: number;
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
    await repository.createLevelProfile({
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
    return { created: true, code };
  }

  private async assertCandidateDegreeCompatible(repository: IMajorRepository, major: MajorDto, candidateDegreeLevelIds: string[]): Promise<void> {
    if (candidateDegreeLevelIds.length === 0) return;
    const profiles = repository.listLevelProfiles ? await repository.listLevelProfiles(major.id) : (major.profiles ?? []);
    const profileDegreeIds = new Set(profiles.map(profile => profile.degreeLevelId).filter((value): value is string => Boolean(value)));
    if (profileDegreeIds.size === 0) throw new Error('NEW_MAJOR_EXISTING_TARGET_DEGREE_NOT_ESTABLISHED');
    if (!candidateDegreeLevelIds.some(id => profileDegreeIds.has(id))) throw new Error('NEW_MAJOR_EXISTING_TARGET_DEGREE_MISMATCH');
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
    context: AtomicMutationRequestContext | undefined,
    mutation: (repository: IMajorRepository, candidateRepository: INewMajorCandidateRepository) => Promise<T>,
  ): Promise<T> {
    if (!this.newMajorCandidates) throw new Error('NEW_MAJOR_CANDIDATE_QUERY_NOT_AVAILABLE');
    if (!this.atomicMutations) return mutation(this.repository, this.newMajorCandidates);
    const repository = this.repository as Partial<ITransactionalMajorRepository>;
    const candidates = this.newMajorCandidates as Partial<ITransactionalNewMajorCandidateRepository>;
    if (!repository.withTransaction || !candidates.withTransaction) {
      throw new Error('NEW_MAJOR_CANDIDATE_TRANSACTIONAL_PERSISTENCE_REQUIRED');
    }
    return this.atomicMutations.execute(
      { domain: 'MAJORS', aggregateType: 'NEW_MAJOR_CANDIDATE', aggregateId: candidateKey, action, context },
      transaction => mutation(repository.withTransaction!(transaction), candidates.withTransaction!(transaction)),
    );
  }

  private mutate<T>(action: string, id: string, context: AtomicMutationRequestContext | undefined, mutation: (repository: IMajorRepository) => Promise<T>): Promise<T> {
    if (!this.atomicMutations) return mutation(this.repository);
    const repository = this.repository as Partial<ITransactionalMajorRepository>;
    if (!repository.withTransaction) throw new Error('MAJOR_TRANSACTIONAL_PERSISTENCE_REQUIRED');
    return this.atomicMutations.execute({ domain: 'MAJORS', aggregateType: 'MAJOR', aggregateId: id, action, context },
      transaction => mutation(repository.withTransaction!(transaction)));
  }

  private async evaluatePublicationReadiness(id: string, major: MajorDto): Promise<PublicationReadinessResult> {
    const result = this.publicationReadiness.evaluate(id, major, this.publicationPolicy);
    if (!this.canonicalReferences) return result;
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
