import { 
  IScholarshipRepository, 
  ITransactionalScholarshipRepository,
  ScholarshipDto, 
  UpdateScholarshipDto,
  ScholarshipStatus,
  ScholarshipPublicationStatus,
  ScholarshipCompletenessState,
  ScholarshipFilters,
  PaginatedResult,
  ScholarshipCompletenessClassifier,
  ScholarshipDeduplicationService,
  ScholarshipNamingService,
  ScholarshipRepositoryUpdateDto,
  ScholarshipBenefitDto,
  ScholarshipDegreeTargetDto,
  ScholarshipMajorTargetDto,
  ScholarshipEligibilityItemDto,
  ScholarshipRequiredDocumentDto,
  ScholarshipUniversityLinkDto,
} from '@manaratak/domain';
import { generateOpaqueIdentifier } from '@manaratak/core';
import type { IScholarshipCanonicalLookupGateway, ScholarshipCanonicalLookupTarget } from '../resolution';
import { assertNoTranslationPayloadFields } from '@manaratak/shared';
import { AtomicDomainMutationCoordinator, AtomicMutationRequestContext } from '../../event-foundation/use-cases/AtomicDomainMutationCoordinator';

type AdminScholarshipRepository = IScholarshipRepository & {
  getAdminSummary?: () => Promise<Record<string, number>>;
};
export interface ScholarshipCanonicalAuthoringInput {
  countryReferenceId?: string | null;
  studyLanguageReferenceId?: string | null;
  benefits?: ScholarshipBenefitDto[];
  degreeTargets?: ScholarshipDegreeTargetDto[];
  majorTargets?: ScholarshipMajorTargetDto[];
  eligibilityItems?: ScholarshipEligibilityItemDto[];
  requiredDocumentItems?: ScholarshipRequiredDocumentDto[];
  universityLinks?: ScholarshipUniversityLinkDto[];
}

type AdminScholarshipFilters = ScholarshipFilters & {
  fundingCoverage?: string; sponsorName?: string; verificationStatus?: string;
  translationState?: 'NEEDS_TRANSLATION' | 'TRANSLATED'; deadlineFrom?: Date; deadlineTo?: Date;
  sourceType?: string; query?: string;
};

export class AdminScholarshipUseCases {
  constructor(
    private readonly repository: AdminScholarshipRepository,
    private readonly atomicMutations?: AtomicDomainMutationCoordinator,
    private readonly canonicalLookup?: IScholarshipCanonicalLookupGateway,
  ) {}

  public async listScholarships(filters: AdminScholarshipFilters): Promise<PaginatedResult<ScholarshipDto>> {
    return this.repository.list(filters);
  }

  public async getScholarshipSummary() {
    if (!this.repository.getAdminSummary) throw new Error('SCHOLARSHIP_ADMIN_SUMMARY_NOT_CONFIGURED');
    return this.repository.getAdminSummary();
  }

  public async getScholarship(id: string): Promise<ScholarshipDto> {
    const scholarship = await this.repository.findById(id);
    if (!scholarship) {
      throw new Error(`Scholarship with id ${id} not found`);
    }
    return scholarship;
  }

  public async getScholarshipCatalogDetail(id: string): Promise<{
    scholarship: ScholarshipDto;
    completeness: ReturnType<typeof ScholarshipCompletenessClassifier.classify>;
    unresolvedLinks: Array<{
      area: 'COUNTRY' | 'STUDY_LANGUAGE' | 'CURRENCY' | 'DEGREE' | 'MAJOR' | 'UNIVERSITY' | 'ACADEMIC_PROGRAM' | 'INTERNATIONAL_TEST';
      key: string;
      rawValue: string | null;
      canonicalId: string | null;
      resolutionStatus: string;
    }>;
  }> {
    const scholarship = await this.getScholarship(id);
    return {
      scholarship,
      completeness: this.catalogCompleteness(scholarship),
      unresolvedLinks: this.unresolvedLinks(scholarship),
    };
  }

  public async createScholarship(input: {
    displayName: string;
    fundingCoverage: string;
    coverageDetails?: string;
    eligibleMajorsOrFields?: string | string[];
    degreeLevel: string;
    studyCountry?: string;
    applicationDeadline?: Date | null;
    sponsorName?: string;
    applicationLink?: string;
    officialSourceUrl?: string;
    eligibilityCriteria?: string;
    requiredDocuments?: string[] | string;
    studyLanguage?: string;
    fundingAmount?: string;
    currency?: string;
    duration?: string;
  }, context?: AtomicMutationRequestContext): Promise<ScholarshipDto> {
    const displayName = (input.displayName || '').trim();
    if (!displayName) {
      throw new Error('Scholarship name is required.');
    }
    if (!input.fundingCoverage || !input.fundingCoverage.trim()) {
      throw new Error('Funding coverage is required.');
    }
    if (!input.degreeLevel || !input.degreeLevel.trim()) {
      throw new Error('Degree level is required.');
    }
    if ((!input.applicationLink || !input.applicationLink.trim()) && (!input.officialSourceUrl || !input.officialSourceUrl.trim())) {
      throw new Error('Either application link or official source URL is required.');
    }

    const payloadForClassification = {
      scholarshipName: displayName,
      fundingCoverage: input.fundingCoverage,
      coverageDetails: input.coverageDetails,
      eligibleMajorsOrFields: input.eligibleMajorsOrFields,
      degreeLevel: input.degreeLevel,
      applicationLink: input.applicationLink,
      officialSourceUrl: input.officialSourceUrl,
      studyCountry: input.studyCountry,
      description: input.coverageDetails || input.eligibilityCriteria,
    };

    const classification = ScholarshipCompletenessClassifier.classify(payloadForClassification);

    const publicId = `sch_${generateOpaqueIdentifier()}`;
    const slug = displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') || `scholarship-${Date.now()}`;
    const canonicalName = displayName;
    const canonicalDedupKey = ScholarshipDeduplicationService.buildKey({
      cleanedScholarshipName: ScholarshipNamingService.clean(displayName).cleanedScholarshipName,
      providerName: input.sponsorName || 'Admin Entry',
      countrySourceLabel: input.studyCountry ?? null,
      officialSourceUrl: input.officialSourceUrl ?? input.applicationLink ?? null,
    }).duplicateKey;

    const initialStatus = classification.state === ScholarshipCompletenessState.COMPLETE
      ? ScholarshipStatus.READY_TO_REVIEW
      : ScholarshipStatus.IMPORTED;

    const scholarshipData = {
      publicId,
      slug,
      canonicalName,
      canonicalDedupKey,
      displayName,
      providerName: input.sponsorName || 'Admin Entry',
      sponsorName: input.sponsorName,
      fundingCoverage: input.fundingCoverage,
      coverageDetails: input.coverageDetails || '',
      eligibleMajorsOrFields: input.eligibleMajorsOrFields || [],
      degreeLevel: input.degreeLevel,
      studyCountry: input.studyCountry || '',
      countrySourceLabel: input.studyCountry || null,
      applicationDeadline: input.applicationDeadline || null,
      applicationLink: input.applicationLink || '',
      officialSourceUrl: input.officialSourceUrl || '',
      eligibilityCriteria: input.eligibilityCriteria || '',
      requiredDocuments: Array.isArray(input.requiredDocuments) ? input.requiredDocuments.join(', ') : (input.requiredDocuments || ''),
      studyLanguage: input.studyLanguage || '',
      fundingAmount: input.fundingAmount || '',
      currency: input.currency || '',
      duration: input.duration || '',
      status: initialStatus,
      completenessStatus: classification.state,
      publicationStatus: ScholarshipPublicationStatus.DRAFT,
    };

    return this.mutate('SCHOLARSHIP_CREATED', publicId, context, async repository => {
      const v2 = await repository.findByDedupKey(canonicalDedupKey);
      const legacyKey = ScholarshipDeduplicationService.buildLegacyKey({
        cleanedScholarshipName: ScholarshipNamingService.clean(displayName).cleanedScholarshipName,
        providerName: input.sponsorName || 'Admin Entry',
      });
      const legacy = await repository.findByDedupKey(legacyKey);
      if (v2 || legacy) throw new Error('SCHOLARSHIP_CANONICAL_DEDUPE_COLLISION_OR_RECONCILIATION_REQUIRED');
      return repository.create(scholarshipData);
    });
  }

  public async updateScholarship(id: string, updates: UpdateScholarshipDto, context?: AtomicMutationRequestContext): Promise<ScholarshipDto> {
    assertNoTranslationPayloadFields('SCHOLARSHIP', updates as unknown as Record<string, unknown>, ['localizedNames']);
    assertNoTranslationPayloadFields('SCHOLARSHIP', updates.optionalFields, ['localizedNames']);
    const existing = await this.getScholarship(id);
    if (existing.publicationStatus === ScholarshipPublicationStatus.PUBLISHED && Object.keys(updates).length > 0) {
      throw new Error('SCHOLARSHIP_PUBLISHED_STRUCTURE_IMMUTABLE');
    }
    const canonicalSafeUpdates = this.preserveCanonicalReferences(existing, updates);
    const classification = this.catalogCompleteness(existing, canonicalSafeUpdates);
    const dataToUpdate: ScholarshipRepositoryUpdateDto = {
      ...canonicalSafeUpdates,
      completenessStatus: classification.state,
    };
    const identityChanged =
      (updates.providerName !== undefined && !this.semanticEquivalent(existing.providerName, updates.providerName)) ||
      (updates.academicYear !== undefined && !this.semanticEquivalent(existing.academicYear, updates.academicYear)) ||
      (updates.countryReferenceId !== undefined && !this.semanticEquivalent(existing.countryReferenceId, updates.countryReferenceId)) ||
      (updates.countrySourceLabel !== undefined && !this.semanticEquivalent(existing.countrySourceLabel, updates.countrySourceLabel)) ||
      (updates.officialSourceUrl !== undefined && !this.semanticEquivalent(existing.officialSourceUrl, updates.officialSourceUrl));
    if (identityChanged) {
      const cleanedName = ScholarshipNamingService.clean(existing.canonicalName).cleanedScholarshipName;
      dataToUpdate.canonicalDedupKey = ScholarshipDeduplicationService.buildKey({
        cleanedScholarshipName: cleanedName,
        providerName: canonicalSafeUpdates.providerName !== undefined ? canonicalSafeUpdates.providerName : existing.providerName,
        year: canonicalSafeUpdates.academicYear !== undefined ? canonicalSafeUpdates.academicYear : existing.academicYear,
        countryReferenceId: canonicalSafeUpdates.countryReferenceId !== undefined ? canonicalSafeUpdates.countryReferenceId : existing.countryReferenceId,
        countrySourceLabel: canonicalSafeUpdates.countrySourceLabel !== undefined ? canonicalSafeUpdates.countrySourceLabel : existing.countrySourceLabel,
        officialSourceUrl: canonicalSafeUpdates.officialSourceUrl !== undefined ? canonicalSafeUpdates.officialSourceUrl : existing.officialSourceUrl,
      }).duplicateKey;
    }
    return this.mutate('SCHOLARSHIP_UPDATED', id, context, async repository => {
      if (dataToUpdate.canonicalDedupKey && dataToUpdate.canonicalDedupKey !== existing.canonicalDedupKey) {
        const owner = await repository.findByDedupKey(dataToUpdate.canonicalDedupKey);
        if (owner && owner.id !== existing.id) throw new Error('SCHOLARSHIP_CANONICAL_DEDUPE_COLLISION');
      }
      return repository.update(id, dataToUpdate);
    });
  }


  public async replaceCanonicalRelationships(
    id: string,
    input: ScholarshipCanonicalAuthoringInput,
    context?: AtomicMutationRequestContext,
  ): Promise<ScholarshipDto> {
    const existing = await this.getScholarship(id);
    if (existing.publicationStatus === ScholarshipPublicationStatus.PUBLISHED) {
      throw new Error('SCHOLARSHIP_PUBLISHED_STRUCTURE_IMMUTABLE');
    }
    if (!this.canonicalLookup) throw new Error('SCHOLARSHIP_CANONICAL_LOOKUP_NOT_CONFIGURED');

    await this.assertCanonicalReference('COUNTRY', input.countryReferenceId);
    await this.assertCanonicalReference('LANGUAGE', input.studyLanguageReferenceId);

    const benefits = input.benefits === undefined ? undefined : await Promise.all(input.benefits.map(async item => {
      await this.assertCanonicalReference('CURRENCY', item.currencyReferenceId);
      return { ...item };
    }));
    const degreeTargets = input.degreeTargets === undefined ? undefined : await Promise.all(input.degreeTargets.map(async item => {
      await this.assertCanonicalReference('DEGREE_LEVEL', item.degreeLevelId);
      return { ...item, resolutionStatus: item.degreeLevelId ? 'RESOLVED' : 'UNRESOLVED' };
    }));
    const majorTargets = input.majorTargets === undefined ? undefined : await Promise.all(input.majorTargets.map(async item => {
      await this.assertCanonicalReference('MAJOR', item.majorId);
      return { ...item, resolutionStatus: item.majorId ? 'RESOLVED' : 'UNRESOLVED' };
    }));
    const eligibilityItems = input.eligibilityItems === undefined ? undefined : await Promise.all(input.eligibilityItems.map(async item => {
      await this.assertCanonicalReference('COUNTRY', item.countryReferenceId);
      await this.assertCanonicalReference('DEGREE_LEVEL', item.degreeLevelId);
      await this.assertCanonicalReference('MAJOR', item.majorId);
      await this.assertCanonicalReference('INTERNATIONAL_TEST', item.internationalTestId);
      const hasCanonicalRelationship = Boolean(item.countryReferenceId || item.degreeLevelId || item.majorId || item.internationalTestId);
      return { ...item, resolutionStatus: hasCanonicalRelationship ? 'RESOLVED' : 'UNRESOLVED' };
    }));
    const requiredDocumentItems = input.requiredDocumentItems === undefined ? undefined : await Promise.all(input.requiredDocumentItems.map(async item => {
      await this.assertCanonicalReference('INTERNATIONAL_TEST', item.internationalTestId);
      return { ...item, resolutionStatus: item.internationalTestId ? 'RESOLVED' : (item.sourceLabel ? 'UNRESOLVED' : 'NOT_APPLICABLE') };
    }));
    const universityLinks = input.universityLinks === undefined ? undefined : await Promise.all(input.universityLinks.map(async item => {
      const university = await this.assertCanonicalReference('UNIVERSITY', item.universityId);
      const program = await this.assertCanonicalReference('ACADEMIC_PROGRAM', item.academicProgramId);
      if (program && university && program.ownerId && program.ownerId !== university.id) {
        throw new Error(`SCHOLARSHIP_ACADEMIC_PROGRAM_UNIVERSITY_MISMATCH:${item.linkKey}`);
      }
      return { ...item, resolutionStatus: item.universityId ? 'RESOLVED' : 'UNRESOLVED' };
    }));

    const dataToUpdate: ScholarshipRepositoryUpdateDto = {
      countryReferenceId: input.countryReferenceId,
      studyLanguageReferenceId: input.studyLanguageReferenceId,
      studyLanguageResolutionStatus: input.studyLanguageReferenceId ? 'RESOLVED' : 'UNRESOLVED',
      benefits,
      degreeTargets,
      majorTargets,
      eligibilityItems,
      requiredDocumentItems,
      universityLinks,
    };
    dataToUpdate.completenessStatus = this.catalogCompleteness(existing, dataToUpdate).state;

    if (input.countryReferenceId !== undefined && input.countryReferenceId !== existing.countryReferenceId) {
      const cleanedName = ScholarshipNamingService.clean(existing.canonicalName).cleanedScholarshipName;
      dataToUpdate.canonicalDedupKey = ScholarshipDeduplicationService.buildKey({
        cleanedScholarshipName: cleanedName,
        providerName: existing.providerName,
        year: existing.academicYear,
        countryReferenceId: input.countryReferenceId,
        countrySourceLabel: existing.countrySourceLabel,
        officialSourceUrl: existing.officialSourceUrl,
      }).duplicateKey;
    }

    return this.mutate('SCHOLARSHIP_CANONICAL_RELATIONSHIPS_REPLACED', id, context, async repository => {
      if (dataToUpdate.canonicalDedupKey && dataToUpdate.canonicalDedupKey !== existing.canonicalDedupKey) {
        const owner = await repository.findByDedupKey(dataToUpdate.canonicalDedupKey);
        if (owner && owner.id !== existing.id) throw new Error('SCHOLARSHIP_CANONICAL_DEDUPE_COLLISION');
      }
      return repository.update(id, dataToUpdate);
    });
  }

  public async markReadyToReview(id: string, context?: AtomicMutationRequestContext): Promise<void> {
    const existing = await this.getScholarship(id);
    if (existing.completenessStatus === ScholarshipCompletenessState.INCOMPLETE) {
      throw new Error('Cannot mark INCOMPLETE scholarship as READY_TO_REVIEW');
    }
    if (existing.status !== ScholarshipStatus.READY_TO_REVIEW) {
      await this.lifecycleMutation('SCHOLARSHIP_MARKED_READY_TO_REVIEW', id, { workflowStatus: ScholarshipStatus.READY_TO_REVIEW }, context);
    }
  }

  public async markReadyToPublish(id: string, context?: AtomicMutationRequestContext): Promise<void> {
    const existing = await this.getScholarship(id);
    this.assertPublicationReady(existing);
    await this.lifecycleMutation('SCHOLARSHIP_MARKED_READY_TO_PUBLISH', id, { workflowStatus: ScholarshipStatus.READY_TO_PUBLISH }, context);
  }

  public async publish(id: string, context?: AtomicMutationRequestContext): Promise<void> {
    const existing = await this.getScholarship(id);
    if (existing.status !== ScholarshipStatus.READY_TO_PUBLISH) throw new Error('Only READY_TO_PUBLISH scholarships can be PUBLISHED');
    this.assertPublicationReady(existing);
    await this.lifecycleMutation('SCHOLARSHIP_PUBLISHED', id, {
      workflowStatus: ScholarshipStatus.PUBLISHED,
      publicationStatus: ScholarshipPublicationStatus.PUBLISHED,
    }, context);
  }

  public async unpublish(id: string, context?: AtomicMutationRequestContext): Promise<void> {
    const existing = await this.getScholarship(id);
    if (existing.publicationStatus !== ScholarshipPublicationStatus.PUBLISHED) {
      throw new Error('Cannot unpublish a scholarship that is not PUBLISHED');
    }
    await this.lifecycleMutation('SCHOLARSHIP_UNPUBLISHED', id, {
      workflowStatus: ScholarshipStatus.READY_TO_REVIEW,
      publicationStatus: ScholarshipPublicationStatus.DRAFT,
    }, context);
  }

  public async reject(id: string, context?: AtomicMutationRequestContext): Promise<void> {
    const existing = await this.getScholarship(id);
    if (existing.publicationStatus === ScholarshipPublicationStatus.PUBLISHED) {
      throw new Error('Cannot reject a PUBLISHED scholarship. Unpublish first.');
    }
    await this.lifecycleMutation('SCHOLARSHIP_REJECTED', id, { workflowStatus: ScholarshipStatus.REJECTED }, context);
  }

  public async archive(id: string, context?: AtomicMutationRequestContext): Promise<void> {
    await this.lifecycleMutation('SCHOLARSHIP_ARCHIVED', id, {
      workflowStatus: ScholarshipStatus.ARCHIVED,
      publicationStatus: ScholarshipPublicationStatus.ARCHIVED,
    }, context);
  }


  private async assertCanonicalReference(target: ScholarshipCanonicalLookupTarget, id: string | null | undefined) {
    if (!id) return null;
    if (!this.canonicalLookup) throw new Error('SCHOLARSHIP_CANONICAL_LOOKUP_NOT_CONFIGURED');
    const candidates = await this.canonicalLookup.findCandidates(target, { target, canonicalId: id });
    const candidate = candidates.find(item => item.id === id || item.publicId === id) ?? candidates[0];
    if (!candidate) throw new Error(`SCHOLARSHIP_CANONICAL_REFERENCE_NOT_FOUND:${target}:${id}`);
    if (candidate.lifecycle && /(?:DEPRECATED|ARCHIVED|SUPERSEDED|MERGED|REJECTED|INACTIVE|SUSPENDED)/u.test(candidate.lifecycle.toUpperCase())) {
      throw new Error(`SCHOLARSHIP_CANONICAL_REFERENCE_NOT_ACTIVE:${target}:${id}:${candidate.lifecycle}`);
    }
    return candidate;
  }

  private assertPublicationReady(existing: ScholarshipDto): void {
    if (existing.completenessStatus !== ScholarshipCompletenessState.COMPLETE) throw new Error('SCHOLARSHIP_NOT_COMPLETE');
    if (existing.verificationStatus !== 'VERIFIED') throw new Error('SCHOLARSHIP_SOURCE_NOT_VERIFIED');
    if (this.unresolvedLinks(existing).length > 0) throw new Error('SCHOLARSHIP_CANONICAL_LINKS_UNRESOLVED');
    if (!existing.versions?.length) throw new Error('SCHOLARSHIP_VERSION_REQUIRED');
    if (!existing.sponsorContext) throw new Error('SCHOLARSHIP_SPONSOR_CONTEXT_REQUIRED');
    if (!existing.applicationCycles?.length) throw new Error('SCHOLARSHIP_APPLICATION_CYCLE_REQUIRED');
  }

  private preserveCanonicalReferences(existing: ScholarshipDto, updates: UpdateScholarshipDto): UpdateScholarshipDto {
    const result: UpdateScholarshipDto = { ...updates };
    const byKey = <T>(items: readonly T[] | undefined, key: (item: T) => string) =>
      new Map((items ?? []).map(item => [key(item), item]));

    if (updates.benefits !== undefined) {
      const current = byKey(existing.benefits, item => item.benefitKey);
      result.benefits = updates.benefits.map(item => {
        const previous = current.get(item.benefitKey);
        return {
          ...item,
          currencyReferenceId: previous?.currencyReferenceId,
          metadata: previous?.metadata,
        };
      });
    }
    if (updates.degreeTargets !== undefined) {
      const current = byKey(existing.degreeTargets, item => item.targetKey);
      result.degreeTargets = updates.degreeTargets.map(item => {
        const previous = current.get(item.targetKey);
        const equivalent = Boolean(previous && this.semanticEquivalent(previous.sourceLabel, item.sourceLabel));
        return {
          ...item,
          degreeLevelId: equivalent ? previous?.degreeLevelId : null,
          resolutionStatus: equivalent ? previous?.resolutionStatus ?? 'UNRESOLVED' : 'UNRESOLVED',
          metadata: equivalent ? previous?.metadata : undefined,
        };
      });
    }
    if (updates.majorTargets !== undefined) {
      const current = byKey(existing.majorTargets, item => item.targetKey);
      result.majorTargets = updates.majorTargets.map(item => {
        const previous = current.get(item.targetKey);
        const equivalent = Boolean(previous && this.semanticEquivalent(previous.sourceLabel, item.sourceLabel));
        return {
          ...item,
          majorId: equivalent ? previous?.majorId : null,
          resolutionStatus: equivalent ? previous?.resolutionStatus ?? 'UNRESOLVED' : 'UNRESOLVED',
          metadata: equivalent ? previous?.metadata : undefined,
        };
      });
    }
    if (updates.eligibilityItems !== undefined) {
      const current = byKey(existing.eligibilityItems, item => item.itemKey);
      result.eligibilityItems = updates.eligibilityItems.map(item => {
        const previous = current.get(item.itemKey);
        const equivalent = Boolean(previous && this.semanticFingerprint([
          previous.itemTypeCode, previous.operatorCode, previous.valueText, previous.minimumValue, previous.maximumValue,
        ]) === this.semanticFingerprint([
          item.itemTypeCode, item.operatorCode, item.valueText, item.minimumValue, item.maximumValue,
        ]));
        return {
          ...item,
          countryReferenceId: equivalent ? previous?.countryReferenceId : null,
          degreeLevelId: equivalent ? previous?.degreeLevelId : null,
          majorId: equivalent ? previous?.majorId : null,
          internationalTestId: equivalent ? previous?.internationalTestId : null,
          resolutionStatus: equivalent ? previous?.resolutionStatus ?? 'UNRESOLVED' : 'UNRESOLVED',
          metadata: equivalent ? previous?.metadata : undefined,
        };
      });
    }
    if (updates.requiredDocumentItems !== undefined) {
      const current = byKey(existing.requiredDocumentItems, item => item.documentKey);
      result.requiredDocumentItems = updates.requiredDocumentItems.map(item => {
        const previous = current.get(item.documentKey);
        const equivalent = Boolean(previous && this.semanticFingerprint([
          previous.documentTypeCode, previous.displayName, previous.sourceLabel,
        ]) === this.semanticFingerprint([
          item.documentTypeCode, item.displayName, item.sourceLabel,
        ]));
        return {
          ...item,
          internationalTestId: equivalent ? previous?.internationalTestId : null,
          resolutionStatus: equivalent ? previous?.resolutionStatus ?? 'UNRESOLVED' : 'UNRESOLVED',
          metadata: equivalent ? previous?.metadata : undefined,
        };
      });
    }

    // Catalog authoring never mutates immutable provenance/canonical collections
    // through the generic PATCH boundary. Dedicated canonical/import flows own them.
    delete result.sourceEvidence;
    delete result.universityLinks;
    const countrySemanticsUpdated = Object.prototype.hasOwnProperty.call(updates, 'countrySourceLabel') ||
      Object.prototype.hasOwnProperty.call(updates, 'countryScope');
    if (countrySemanticsUpdated) {
      const nextLabel = updates.countrySourceLabel !== undefined ? updates.countrySourceLabel : existing.countrySourceLabel;
      const nextScope = updates.countryScope !== undefined ? updates.countryScope : existing.countryScope;
      result.countryReferenceId = this.countrySemanticsCompatible(
        existing.countrySourceLabel, existing.countryScope, nextLabel, nextScope,
      ) ? existing.countryReferenceId ?? null : null;
    } else delete result.countryReferenceId;
    if (Object.prototype.hasOwnProperty.call(updates, 'studyLanguageSourceLabel')) {
      const equivalent = this.semanticEquivalent(existing.studyLanguageSourceLabel, updates.studyLanguageSourceLabel);
      result.studyLanguageReferenceId = equivalent ? existing.studyLanguageReferenceId ?? null : null;
      result.studyLanguageResolutionStatus = equivalent ? existing.studyLanguageResolutionStatus ?? 'UNRESOLVED' : 'UNRESOLVED';
    } else {
      delete result.studyLanguageReferenceId;
      delete result.studyLanguageResolutionStatus;
    }
    return result;
  }

  private semanticNormalize(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value).normalize('NFKC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('und');
  }

  private semanticEquivalent(left: unknown, right: unknown): boolean {
    return this.semanticNormalize(left) === this.semanticNormalize(right);
  }

  private semanticFingerprint(values: readonly unknown[]): string {
    return values.map(value => this.semanticNormalize(value)).join('\u001f');
  }

  private isNonSingleCountryScope(scope: unknown): boolean {
    const normalized = this.semanticNormalize(scope).replace(/[\s-]+/gu, '_');
    return new Set(['global', 'worldwide', 'multi_country', 'multiple_countries', 'international']).has(normalized);
  }

  private isExplicitSingleCountryScope(scope: unknown): boolean {
    const normalized = this.semanticNormalize(scope).replace(/[\s-]+/gu, '_');
    return !normalized || new Set(['single_country', 'country', 'specific_country', 'national', 'domestic']).has(normalized);
  }

  private countrySemanticsCompatible(oldLabel: unknown, oldScope: unknown, nextLabel: unknown, nextScope: unknown): boolean {
    if (this.isNonSingleCountryScope(nextScope) || this.isNonSingleCountryScope(oldScope)) return false;
    if (!this.semanticEquivalent(oldLabel, nextLabel)) return false;
    return this.semanticEquivalent(oldScope, nextScope) ||
      (this.isExplicitSingleCountryScope(oldScope) && this.isExplicitSingleCountryScope(nextScope));
  }

  private catalogCompleteness(
    existing: ScholarshipDto,
    updates: UpdateScholarshipDto = {},
  ): ReturnType<typeof ScholarshipCompletenessClassifier.classify> {
    const merged = <K extends keyof ScholarshipDto>(key: K): ScholarshipDto[K] => {
      const candidate = (updates as Partial<ScholarshipDto>)[key];
      return (candidate !== undefined ? candidate : existing[key]) as ScholarshipDto[K];
    };

    const benefits = merged('benefits') ?? [];
    const degreeTargets = merged('degreeTargets') ?? [];
    const eligibilityItems = merged('eligibilityItems') ?? [];
    const requiredDocumentItems = merged('requiredDocumentItems') ?? [];
    const sourceEvidence = merged('sourceEvidence') ?? [];
    const internationalTests = [
      ...eligibilityItems.filter(item => Boolean(item.internationalTestId)),
      ...requiredDocumentItems.filter(item => Boolean(item.internationalTestId)),
    ];

    const sourceTraceable = Boolean(
      merged('officialSourceUrl') ||
      merged('sourceUrl') ||
      merged('officialWebsite') ||
      merged('applicationUrl') ||
      merged('applicationLink') ||
      sourceEvidence.some(item => Boolean(item.sourceUrl)),
    );

    const deadline = merged('applicationDeadline');
    return ScholarshipCompletenessClassifier.classify({
      scholarshipName: merged('displayName'),
      displayName: merged('displayName'),
      providerName: merged('providerName') ?? undefined,
      sourceTraceable,
      isFullyFunded: merged('isFullyFunded'),
      extractedFundingTypeCode: merged('fundingTypeCode'),
      studyCountry: merged('countrySourceLabel') ?? undefined,
      extractedDegreeLevels: degreeTargets.map(item => item.sourceLabel ?? item.degreeLevelId ?? '').filter(Boolean),
      applicationDeadline: deadline instanceof Date ? deadline.toISOString() : deadline ? String(deadline) : undefined,
      officialSourceUrl: merged('officialSourceUrl') ?? undefined,
      sourceUrl: merged('sourceUrl') ?? undefined,
      officialWebsite: merged('officialWebsite') ?? undefined,
      applicationLink: merged('applicationUrl') ?? undefined,
      eligibleMajorsOrFields: (merged('majorTargets') ?? []).map(item => item.sourceLabel ?? item.majorId ?? '').filter(Boolean),
      studyLanguage: merged('studyLanguageSourceLabel') ?? undefined,
      amountMinorUnits: merged('amountMinorUnits') ?? undefined,
      amountCurrencyCode: merged('amountCurrencyCode') ?? undefined,
      duration: benefits.map(item => item.durationText ?? '').filter(Boolean).join(' '),
      metadata: {
        fundingTypeCode: merged('fundingTypeCode'),
        benefits,
        countryReferenceId: merged('countryReferenceId'),
        countryScope: merged('countryScope'),
        degreeTargets,
        eligibilityItems,
        requiredDocumentItems,
        internationalTests,
        deadlineType: merged('deadlineType'),
      },
    });
  }

  private unresolvedLinks(scholarship: ScholarshipDto): Array<{
    area: 'COUNTRY' | 'STUDY_LANGUAGE' | 'CURRENCY' | 'DEGREE' | 'MAJOR' | 'UNIVERSITY' | 'ACADEMIC_PROGRAM' | 'INTERNATIONAL_TEST';
    key: string;
    rawValue: string | null;
    canonicalId: string | null;
    resolutionStatus: string;
  }> {
    const result: Array<{
      area: 'COUNTRY' | 'STUDY_LANGUAGE' | 'CURRENCY' | 'DEGREE' | 'MAJOR' | 'UNIVERSITY' | 'ACADEMIC_PROGRAM' | 'INTERNATIONAL_TEST';
      key: string;
      rawValue: string | null;
      canonicalId: string | null;
      resolutionStatus: string;
    }> = [];
    const unresolved = (status: string | null | undefined, canonicalId: string | null | undefined) =>
      !canonicalId || !['RESOLVED', 'NOT_APPLICABLE'].includes(String(status ?? 'UNRESOLVED').toUpperCase());

    const nonSingleCountry = this.isNonSingleCountryScope(scholarship.countryScope);
    if (nonSingleCountry && scholarship.countryReferenceId) {
      result.push({ area: 'COUNTRY', key: 'country', rawValue: scholarship.countrySourceLabel ?? scholarship.countryScope ?? null, canonicalId: scholarship.countryReferenceId, resolutionStatus: 'INCONSISTENT_SCOPE' });
    } else if (!nonSingleCountry && scholarship.countrySourceLabel && !scholarship.countryReferenceId) {
      result.push({ area: 'COUNTRY', key: 'country', rawValue: scholarship.countrySourceLabel, canonicalId: null, resolutionStatus: 'UNRESOLVED' });
    }
    if (scholarship.studyLanguageSourceLabel && unresolved(scholarship.studyLanguageResolutionStatus, scholarship.studyLanguageReferenceId)) {
      result.push({
        area: 'STUDY_LANGUAGE',
        key: 'studyLanguage',
        rawValue: scholarship.studyLanguageSourceLabel,
        canonicalId: scholarship.studyLanguageReferenceId ?? null,
        resolutionStatus: scholarship.studyLanguageResolutionStatus ?? 'UNRESOLVED',
      });
    }
    for (const item of scholarship.benefits ?? []) {
      const hasMonetaryAmount = item.amount !== null && item.amount !== undefined && String(item.amount).trim() !== '';
      if (hasMonetaryAmount && !item.currencyReferenceId) result.push({
        area: 'CURRENCY', key: item.benefitKey, rawValue: scholarship.currency ?? scholarship.amountCurrencyCode ?? null,
        canonicalId: null, resolutionStatus: 'UNRESOLVED',
      });
    }
    for (const item of scholarship.degreeTargets ?? []) {
      if (unresolved(item.resolutionStatus, item.degreeLevelId)) result.push({ area: 'DEGREE', key: item.targetKey, rawValue: item.sourceLabel ?? null, canonicalId: item.degreeLevelId ?? null, resolutionStatus: item.resolutionStatus ?? 'UNRESOLVED' });
    }
    for (const item of scholarship.majorTargets ?? []) {
      if (unresolved(item.resolutionStatus, item.majorId)) result.push({ area: 'MAJOR', key: item.targetKey, rawValue: item.sourceLabel ?? null, canonicalId: item.majorId ?? null, resolutionStatus: item.resolutionStatus ?? 'UNRESOLVED' });
    }
    for (const item of scholarship.universityLinks ?? []) {
      const isAcademicProgramTarget = String(item.relationshipTypeCode ?? '').toUpperCase() === 'TARGET_PROGRAM' || Boolean(item.academicProgramId);
      const canonicalId = isAcademicProgramTarget ? item.academicProgramId : item.universityId;
      if (unresolved(item.resolutionStatus, canonicalId)) result.push({
        area: isAcademicProgramTarget ? 'ACADEMIC_PROGRAM' : 'UNIVERSITY',
        key: item.linkKey,
        rawValue: item.sourceLabel ?? null,
        canonicalId: canonicalId ?? null,
        resolutionStatus: item.resolutionStatus ?? 'UNRESOLVED',
      });
    }
    for (const item of scholarship.eligibilityItems ?? []) {
      const type = String(item.itemTypeCode).toUpperCase();
      const checks = [
        { matches: type.includes('COUNTRY'), area: 'COUNTRY' as const, id: item.countryReferenceId },
        { matches: type.includes('DEGREE'), area: 'DEGREE' as const, id: item.degreeLevelId },
        { matches: type.includes('MAJOR'), area: 'MAJOR' as const, id: item.majorId },
        { matches: type.includes('TEST'), area: 'INTERNATIONAL_TEST' as const, id: item.internationalTestId },
      ];
      for (const check of checks) if (check.matches && unresolved(item.resolutionStatus, check.id)) {
        result.push({ area: check.area, key: item.itemKey, rawValue: item.valueText ?? null, canonicalId: check.id ?? null, resolutionStatus: item.resolutionStatus ?? 'UNRESOLVED' });
      }
    }
    for (const item of scholarship.requiredDocumentItems ?? []) {
      if (String(item.documentTypeCode ?? '').toUpperCase().includes('TEST') && unresolved(item.resolutionStatus, item.internationalTestId)) {
        result.push({ area: 'INTERNATIONAL_TEST', key: item.documentKey, rawValue: item.sourceLabel ?? item.displayName, canonicalId: item.internationalTestId ?? null, resolutionStatus: item.resolutionStatus ?? 'UNRESOLVED' });
      }
    }
    return result;
  }

  private mutate<T>(action: string, id: string, context: AtomicMutationRequestContext | undefined, mutation: (repository: IScholarshipRepository) => Promise<T>): Promise<T> {
    if (!this.atomicMutations) return mutation(this.repository);
    const repository = this.repository as Partial<ITransactionalScholarshipRepository>;
    if (!repository.withTransaction) throw new Error('SCHOLARSHIP_TRANSACTIONAL_PERSISTENCE_REQUIRED');
    return this.atomicMutations.execute({ domain: 'SCHOLARSHIPS', aggregateType: 'SCHOLARSHIP', aggregateId: id, action, context },
      transaction => mutation(repository.withTransaction!(transaction)));
  }

  private lifecycleMutation(
    action: string,
    id: string,
    lifecycle: { workflowStatus?: ScholarshipStatus; publicationStatus?: ScholarshipPublicationStatus },
    context?: AtomicMutationRequestContext,
  ): Promise<void> {
    return this.mutate(action, id, context, repository => {
      if (repository.updateLifecycle) return repository.updateLifecycle(id, lifecycle);
      // Temporary source-only compatibility for old adapters; real Prisma persistence always uses canonical fields.
      if (lifecycle.workflowStatus) return repository.updateStatus(id, lifecycle.workflowStatus);
      throw new Error('SCHOLARSHIP_LIFECYCLE_PERSISTENCE_REQUIRED');
    });
  }
}
