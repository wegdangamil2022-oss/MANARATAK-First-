import { AssetReferencePolicy, assertAssetReferenceUsable } from '../../asset-platform/AssetReferencePolicy';
import {
  IUniversityRepository,
  ITransactionalUniversityRepository,
  PaginatedUniversityResult,
  PaginatedUniversityOrganizationUnitResult,
  UniversityCompletenessClassifier,
  UniversityDto,
  UniversityFilters,
  UniversityOrganizationUnitFilters,
  UniversityImportCompletenessState,
  UniversityStatus,
  UniversityNormalizedDetailsUpdate,
  UniversityAcademicProgramAuthoringInput,
  UniversityTranslationDto,
  UpdateUniversityDto,
  PublicationReadinessEngine,
  PublicationReadinessResult,
  UniversityPublicationReadinessPolicy,
} from '@manaratak/domain';
import { assertNoTranslationPayloadFields, assertTranslationContentAuthoringEnabled } from '@manaratak/shared';
import {
  AtomicDomainMutationCoordinator,
  AtomicMutationRequestContext,
} from '../../event-foundation/use-cases/AtomicDomainMutationCoordinator';

export class AdminUniversityUseCases {
  constructor(
    private readonly repository: IUniversityRepository,
    private readonly atomicMutations?: AtomicDomainMutationCoordinator,
    private readonly publicationReadiness = new PublicationReadinessEngine(),
    private readonly publicationPolicy = new UniversityPublicationReadinessPolicy(),
    private readonly assetReferences?: AssetReferencePolicy,
  ) {}

  public async listUniversities(
    filters: UniversityFilters,
  ): Promise<PaginatedUniversityResult<UniversityDto>> {
    return this.repository.list(filters);
  }

  public async listOrganizationUnits(
    filters: UniversityOrganizationUnitFilters,
  ): Promise<PaginatedUniversityOrganizationUnitResult> {
    if (!this.repository.listOrganizationUnits) {
      throw new Error('UNIVERSITY_ORGANIZATION_UNIT_QUERY_NOT_AVAILABLE');
    }
    return this.repository.listOrganizationUnits(filters);
  }

  public async getUniversity(id: string): Promise<UniversityDto> {
    const university = await this.repository.findById(id);
    if (!university) {
      throw new Error(`University with id ${id} not found`);
    }
    return university;
  }

  public async listTranslations(id: string): Promise<UniversityTranslationDto[]> {
    await this.getUniversity(id);
    if (!this.repository.listTranslations) {
      throw new Error('UNIVERSITY_TRANSLATION_PERSISTENCE_NOT_AVAILABLE');
    }
    return this.repository.listTranslations(id);
  }

  public async upsertTranslation(
    id: string,
    input: Omit<
      UniversityTranslationDto,
      'id' | 'universityId' | 'createdAt' | 'updatedAt'
    >,
    context?: AtomicMutationRequestContext,
  ): Promise<UniversityTranslationDto> {
    assertTranslationContentAuthoringEnabled('UNIVERSITY');
    await this.getUniversity(id);
    if (input.locale !== 'ar' && input.locale !== 'en') {
      throw new Error(`UNSUPPORTED_TRANSLATION_LOCALE:${input.locale}`);
    }

    return this.mutate('UNIVERSITY_TRANSLATION_UPSERTED', id, context, async (repository) => {
      if (!repository.upsertTranslation) {
        throw new Error('UNIVERSITY_TRANSLATION_PERSISTENCE_NOT_AVAILABLE');
      }
      return repository.upsertTranslation(id, input);
    });
  }

  public async updateUniversity(
    id: string,
    updates: UpdateUniversityDto,
    context?: AtomicMutationRequestContext,
  ): Promise<UniversityDto> {
    assertNoTranslationPayloadFields('UNIVERSITY', updates.optionalFields, ['localizedNames']);
    await assertAssetReferenceUsable(this.assetReferences, updates.logoAssetId, { purpose: 'UNIVERSITY_LOGO' });
    const existing = await this.getUniversity(id);
    const canonicalRelationshipMutation =
      updates.countryReferenceId !== undefined ||
      updates.regionReferenceId !== undefined ||
      updates.cityReferenceId !== undefined;
    if (existing.status === UniversityStatus.PUBLISHED && canonicalRelationshipMutation) {
      throw new Error('UNIVERSITY_PUBLISHED_STRUCTURE_IMMUTABLE');
    }

    const payloadForClassification = {
      universityName: updates.displayName ?? existing.displayName,
      officialWebsite: updates.officialWebsite ?? existing.officialWebsite,
      country: updates.country ?? existing.country,
      city: updates.city ?? existing.city,
      institutionType: updates.institutionType ?? existing.institutionType,
      sourceUrl:
        updates.sourceUrl !== undefined ? updates.sourceUrl || undefined : existing.sourceUrl,
      officialSourceUrl:
        updates.officialSourceUrl !== undefined
          ? updates.officialSourceUrl || undefined
          : existing.officialSourceUrl,
    };

    const classification = UniversityCompletenessClassifier.classify(payloadForClassification);

    return this.mutate('UNIVERSITY_UPDATED', id, context, (repository) =>
      repository.update(id, {
        ...updates,
        completenessStatus: classification.state,
      }),
    );
  }

  public async upsertAcademicProgram(
    universityId: string,
    programId: string | null,
    input: UniversityAcademicProgramAuthoringInput,
    context?: AtomicMutationRequestContext,
  ): Promise<UniversityDto> {
    const university = await this.getUniversity(universityId);
    if (university.status === UniversityStatus.PUBLISHED) {
      throw new Error('UNIVERSITY_PUBLISHED_STRUCTURE_IMMUTABLE');
    }
    if (!input.sourceProgramName.trim()) throw new Error('UNIVERSITY_PROGRAM_NAME_REQUIRED');
    if (!input.degreeLevelId) throw new Error('UNIVERSITY_PROGRAM_DEGREE_LEVEL_REQUIRED');
    return this.mutate(
      programId ? 'UNIVERSITY_ACADEMIC_PROGRAM_UPDATED' : 'UNIVERSITY_ACADEMIC_PROGRAM_CREATED',
      universityId,
      context,
      async (repository) => {
        if (!repository.upsertAcademicProgram) throw new Error('UNIVERSITY_PROGRAM_PERSISTENCE_NOT_AVAILABLE');
        return repository.upsertAcademicProgram(universityId, programId, input);
      },
    );
  }

  public async archiveAcademicProgram(
    universityId: string,
    programId: string,
    context?: AtomicMutationRequestContext,
  ): Promise<UniversityDto> {
    const university = await this.getUniversity(universityId);
    if (university.status === UniversityStatus.PUBLISHED) {
      throw new Error('UNIVERSITY_PUBLISHED_STRUCTURE_IMMUTABLE');
    }
    return this.mutate('UNIVERSITY_ACADEMIC_PROGRAM_ARCHIVED', universityId, context, async (repository) => {
      if (!repository.archiveAcademicProgram) throw new Error('UNIVERSITY_PROGRAM_PERSISTENCE_NOT_AVAILABLE');
      return repository.archiveAcademicProgram(universityId, programId);
    });
  }

  public async replaceNormalizedDetails(
    id: string,
    details: UniversityNormalizedDetailsUpdate,
    context?: AtomicMutationRequestContext,
  ): Promise<UniversityDto> {
    assertNoTranslationPayloadFields(
      'UNIVERSITY',
      details as unknown as Record<string, unknown>,
      ['localizedNames'],
    );
    const existing = await this.getUniversity(id);
    if (existing.status === UniversityStatus.PUBLISHED) {
      throw new Error('UNIVERSITY_PUBLISHED_STRUCTURE_IMMUTABLE');
    }
    return this.mutate(
      'UNIVERSITY_NORMALIZED_DETAILS_REPLACED',
      id,
      context,
      async (repository) => {
        if (!repository.replaceNormalizedDetails) {
          throw new Error('UNIVERSITY_NORMALIZED_PERSISTENCE_NOT_AVAILABLE');
        }
        return repository.replaceNormalizedDetails(id, details);
      },
    );
  }

  public async markReadyToReview(
    id: string,
    context?: AtomicMutationRequestContext,
  ): Promise<void> {
    const existing = await this.getUniversity(id);
    if (existing.completenessStatus === UniversityImportCompletenessState.INCOMPLETE) {
      throw new Error('Cannot mark INCOMPLETE university as READY_TO_REVIEW');
    }
    if (existing.status !== UniversityStatus.READY_TO_REVIEW) {
      await this.mutate('UNIVERSITY_MARKED_READY_TO_REVIEW', id, context, (repository) =>
        repository.updateStatus(id, UniversityStatus.READY_TO_REVIEW),
      );
    }
  }

  public async markReadyToPublish(
    id: string,
    context?: AtomicMutationRequestContext,
  ): Promise<void> {
    const existing = await this.getUniversity(id);
    if (existing.completenessStatus !== UniversityImportCompletenessState.COMPLETE) {
      throw new Error('Only COMPLETE universities can be marked as READY_TO_PUBLISH');
    }
    this.publicationReadiness.assertReady(
      id,
      { ...existing, status: UniversityStatus.READY_TO_PUBLISH },
      this.publicationPolicy,
    );
    await this.mutate('UNIVERSITY_MARKED_READY_TO_PUBLISH', id, context, (repository) =>
      repository.updateStatus(id, UniversityStatus.READY_TO_PUBLISH),
    );
  }

  public async checkPublicationReadiness(id: string): Promise<PublicationReadinessResult> {
    const existing = await this.getUniversity(id);
    return this.publicationReadiness.evaluate(
      id,
      { ...existing, status: UniversityStatus.READY_TO_PUBLISH },
      this.publicationPolicy,
    );
  }

  public async publish(id: string, context?: AtomicMutationRequestContext): Promise<void> {
    const existing = await this.getUniversity(id);
    if (existing.status !== UniversityStatus.READY_TO_PUBLISH) {
      throw new Error('Only READY_TO_PUBLISH universities can be PUBLISHED');
    }
    this.publicationReadiness.assertReady(id, existing, this.publicationPolicy);
    await this.mutate('UNIVERSITY_PUBLISHED', id, context, (repository) =>
      repository.updateStatus(id, UniversityStatus.PUBLISHED),
    );
  }

  public async unpublish(id: string, context?: AtomicMutationRequestContext): Promise<void> {
    const existing = await this.getUniversity(id);
    if (existing.status !== UniversityStatus.PUBLISHED) {
      throw new Error('Cannot unpublish a university that is not PUBLISHED');
    }
    await this.mutate('UNIVERSITY_UNPUBLISHED', id, context, (repository) =>
      repository.updateStatus(id, UniversityStatus.READY_TO_REVIEW),
    );
  }

  public async reject(id: string, context?: AtomicMutationRequestContext): Promise<void> {
    const existing = await this.getUniversity(id);
    if (existing.status === UniversityStatus.PUBLISHED) {
      throw new Error('Cannot reject a PUBLISHED university. Unpublish first.');
    }
    await this.mutate('UNIVERSITY_REJECTED', id, context, (repository) =>
      repository.updateStatus(id, UniversityStatus.REJECTED),
    );
  }

  public async archive(id: string, context?: AtomicMutationRequestContext): Promise<void> {
    const existing = await this.getUniversity(id);
    if (existing.status === UniversityStatus.PUBLISHED) {
      throw new Error('Cannot archive a PUBLISHED university. Unpublish first.');
    }
    await this.mutate('UNIVERSITY_ARCHIVED', id, context, (repository) =>
      repository.updateStatus(id, UniversityStatus.ARCHIVED),
    );
  }

  private mutate<T>(
    action: string,
    id: string,
    context: AtomicMutationRequestContext | undefined,
    mutation: (repository: IUniversityRepository) => Promise<T>,
  ): Promise<T> {
    if (!this.atomicMutations) return mutation(this.repository);
    const repository = this.repository as Partial<ITransactionalUniversityRepository>;
    if (!repository.withTransaction)
      throw new Error('UNIVERSITY_TRANSACTIONAL_PERSISTENCE_REQUIRED');
    return this.atomicMutations.execute(
      { domain: 'UNIVERSITIES', aggregateType: 'UNIVERSITY', aggregateId: id, action, context },
      (transaction) => mutation(repository.withTransaction!(transaction)),
    );
  }
}
