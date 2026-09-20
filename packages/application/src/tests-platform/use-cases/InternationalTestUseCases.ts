import { AssetReferencePolicy, assertAssetReferenceUsable } from '../../asset-platform/AssetReferencePolicy';
import {
  IInternationalTestRepository,
  ITransactionalInternationalTestRepository,
  InternationalTestDto,
  InternationalTestFilters,
  InternationalTestStatus,
  PaginatedInternationalTestResult,
  UpsertInternationalTestDto,
  InternationalTestValidationService,
  IInternationalTestValidationService,
  InternationalTestValidationSeverity,
  InternationalTestVariantDto,
  UpsertInternationalTestVariantDto,
  InternationalTestSectionDto,
  UpsertInternationalTestSectionDto,
  InternationalTestScoreScaleDto,
  UpsertInternationalTestScoreScaleDto,
  InternationalTestFeeMetadataDto,
  UpsertInternationalTestFeeMetadataDto,
  InternationalTestOfficialLinkDto,
  UpsertInternationalTestOfficialLinkDto,
  InternationalTestAvailabilityDto,
  UpsertInternationalTestAvailabilityDto,
  InternationalTestPreparationMaterialDto,
  UpsertInternationalTestPreparationMaterialDto,
  InternationalTestEvidenceDto,
  InternationalTestImportDraftRequestDto,
  InternationalTestImportDraftResultDto,
  InternationalTestVersionDto,
  InternationalTestProviderDto,
  InternationalTestSourceTrustLevel,
  InternationalTestPublicationReadinessPolicy,
  PublicationReadinessEngine,
  PublicationReadinessResult,
  IReferenceResolver,
  IDegreeLevelRepository,
  IAcademicTaxonomyRepository
} from '@manaratak/domain';
import { assertNoTranslationPayloadFields } from '@manaratak/shared';
import { AtomicDomainMutationCoordinator, AtomicMutationRequestContext } from '../../event-foundation/use-cases/AtomicDomainMutationCoordinator';
import { InternationalTestCanonicalRelationshipService } from './InternationalTestCanonicalRelationshipService';

export class InternationalTestAdminUseCases {
  private readonly canonicalRelationshipService: InternationalTestCanonicalRelationshipService;

  constructor(
    private readonly repository: IInternationalTestRepository,
    private readonly validationService: IInternationalTestValidationService = new InternationalTestValidationService(),
    private readonly publicationReadiness = new PublicationReadinessEngine(),
    private readonly publicationPolicy = new InternationalTestPublicationReadinessPolicy(validationService),
    private readonly referenceResolver?: IReferenceResolver,
    degreeLevelRepository?: IDegreeLevelRepository,
    private readonly atomicMutations?: AtomicDomainMutationCoordinator,
    academicTaxonomyRepository?: IAcademicTaxonomyRepository,
    private readonly assetReferences?: AssetReferencePolicy,
  ) {
    this.canonicalRelationshipService = new InternationalTestCanonicalRelationshipService(
      referenceResolver,
      degreeLevelRepository,
      academicTaxonomyRepository,
    );
  }

  public async list(filters: InternationalTestFilters): Promise<PaginatedInternationalTestResult<InternationalTestDto>> {
    return this.repository.list(filters);
  }

  public async get(id: string): Promise<InternationalTestDto> {
    const test = await this.repository.findById(id);
    if (!test) throw new Error(`International test with id ${id} not found`);
    return test;
  }

  public async createTest(data: UpsertInternationalTestDto, context?: AtomicMutationRequestContext): Promise<InternationalTestDto> {
    assertNoTranslationPayloadFields('INTERNATIONAL_TEST', data as unknown as Record<string, unknown>, ['localizedNameAr', 'localizedNameEn']);
    const canonicalData = { ...data, ...(await this.canonicalRelationshipService.canonicalize(data)), ...(await this.canonicalizeProvider(data)) };
    const report = this.validationService.validate(canonicalData);
    const hasErrors = report.issues.some(i => i.severity === InternationalTestValidationSeverity.ERROR);
    if (hasErrors) {
      const errorMsg = report.issues.map(i => `${i.field}: ${i.message}`).join('; ');
      throw new Error(`Validation failed for international test creation: ${errorMsg}`);
    }
    const identityData = data as UpsertInternationalTestDto & { id?: string; publicId?: unknown };
    const identity = identityData.id || (typeof identityData.publicId === 'string' ? identityData.publicId : undefined) || (typeof data.slug === 'string' ? data.slug : data.canonicalName);
    return this.mutate('INTERNATIONAL_TEST_CREATED', identity, context, repository => repository.create(canonicalData));
  }

  public async updateTest(id: string, data: Partial<UpsertInternationalTestDto>, context?: AtomicMutationRequestContext): Promise<InternationalTestDto> {
    assertNoTranslationPayloadFields('INTERNATIONAL_TEST', data as unknown as Record<string, unknown>, ['localizedNameAr', 'localizedNameEn']);
    const canonicalData = { ...data, ...(await this.canonicalRelationshipService.canonicalize(data)), ...(await this.canonicalizeProvider(data)) };
    const existing = await this.get(id);
    const merged = { ...existing, ...canonicalData };
    const report = this.validationService.validate(merged);
    const hasErrors = report.issues.some(i => i.severity === InternationalTestValidationSeverity.ERROR);
    if (hasErrors) {
      const errorMsg = report.issues.map(i => `${i.field}: ${i.message}`).join('; ');
      throw new Error(`Validation failed for international test update: ${errorMsg}`);
    }
    return this.mutate('INTERNATIONAL_TEST_UPDATED', id, context, repository => repository.update(id, canonicalData));
  }

  public async upsertTest(data: UpsertInternationalTestDto, context?: AtomicMutationRequestContext): Promise<InternationalTestDto> {
    assertNoTranslationPayloadFields('INTERNATIONAL_TEST', data as unknown as Record<string, unknown>, ['localizedNameAr', 'localizedNameEn']);
    const canonicalData = { ...data, ...(await this.canonicalRelationshipService.canonicalize(data)), ...(await this.canonicalizeProvider(data)) };
    const report = this.validationService.validate(canonicalData);
    const hasErrors = report.issues.some(i => i.severity === InternationalTestValidationSeverity.ERROR);
    if (hasErrors) {
      const errorMsg = report.issues.map(i => `${i.field}: ${i.message}`).join('; ');
      throw new Error(`Validation failed for international test upsert: ${errorMsg}`);
    }
    const dataWithId = data as UpsertInternationalTestDto & { id?: string };
    const publicId = typeof data.publicId === 'string' ? data.publicId : undefined;
    const identity = dataWithId.id || publicId || (typeof data.slug === 'string' ? data.slug : data.canonicalName);
    return this.mutate('INTERNATIONAL_TEST_UPSERTED', identity, context, repository => {
      if (repository.upsertTest) return repository.upsertTest(canonicalData);
      if (dataWithId.id) return repository.update(dataWithId.id, canonicalData);
      return repository.create(canonicalData);
    });
  }

  public async markReadyToPublish(id: string, context?: AtomicMutationRequestContext): Promise<void> {
    const test = await this.get(id);
    this.publicationReadiness.assertReady(
      id,
      { ...test, status: InternationalTestStatus.READY_TO_PUBLISH },
      this.publicationPolicy
    );
    await this.mutate('INTERNATIONAL_TEST_MARKED_READY_TO_PUBLISH', id, context, async repository => {
      await repository.update(id, { status: InternationalTestStatus.READY_TO_PUBLISH, isPubliclyVisible: false });
    });
  }

  public async checkPublicationReadiness(id: string): Promise<PublicationReadinessResult> {
    const test = await this.get(id);
    return this.publicationReadiness.evaluate(id, test, this.publicationPolicy);
  }

  public async publish(id: string, context?: AtomicMutationRequestContext): Promise<void> {
    const test = await this.get(id);
    this.publicationReadiness.assertReady(id, test, this.publicationPolicy);
    await this.mutate('INTERNATIONAL_TEST_PUBLISHED', id, context, async repository => {
      await repository.update(id, { status: InternationalTestStatus.PUBLISHED, isPubliclyVisible: true });
    });
  }

  public async archive(id: string, context?: AtomicMutationRequestContext): Promise<void> {
    await this.get(id);
    await this.mutate('INTERNATIONAL_TEST_ARCHIVED', id, context, async repository => {
      await repository.update(id, { status: InternationalTestStatus.ARCHIVED, isPubliclyVisible: false });
    });
  }

  public async listProviders(search?: string): Promise<InternationalTestProviderDto[]> {
    if (!this.repository.listProviders) return [];
    return this.repository.listProviders(search);
  }

  public async upsertProvider(data: Omit<InternationalTestProviderDto, 'id'> & { id?: string }, context?: AtomicMutationRequestContext): Promise<InternationalTestProviderDto> {
    if (!this.repository.upsertProvider) throw new Error('Repository method upsertProvider not implemented');
    const key = data.key?.trim();
    const displayName = data.displayName?.trim();
    if (!key || !displayName) throw new Error('PROVIDER_KEY_AND_DISPLAY_NAME_REQUIRED');
    const normalized = {
      ...data,
      key: key.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, ''),
      displayName,
      countryIso2Code: data.countryIso2Code?.trim().toUpperCase(),
    };
    return this.mutate('INTERNATIONAL_TEST_PROVIDER_UPSERTED', data.id || normalized.key, context, repository => {
      if (!repository.upsertProvider) throw new Error('Repository method upsertProvider not implemented');
      return repository.upsertProvider(normalized);
    });
  }

  public async verifySource(id: string, context?: AtomicMutationRequestContext): Promise<void> {
    await this.get(id);
    const evidence = await this.listEvidence(id);
    const trusted = evidence.some(item =>
      Boolean(item.sourceUrl?.trim()) &&
      (item.sourceTrustLevel === InternationalTestSourceTrustLevel.AUTHORITATIVE ||
       item.sourceTrustLevel === InternationalTestSourceTrustLevel.HIGH)
    );
    if (!trusted) throw new Error('TRUSTED_SOURCE_EVIDENCE_REQUIRED');
    await this.mutate('INTERNATIONAL_TEST_SOURCE_VERIFIED', id, context, repository =>
      repository.update(id, { isSourceVerified: true }).then(() => undefined));
  }

  // Child profile delegates
  public async listVariants(testId: string): Promise<InternationalTestVariantDto[]> {
    await this.get(testId);
    if (!this.repository.listVariants) return [];
    return this.repository.listVariants(testId);
  }

  public async upsertVariant(testId: string, data: UpsertInternationalTestVariantDto & { id?: string }, context?: AtomicMutationRequestContext): Promise<InternationalTestVariantDto> {
    await this.get(testId);
    if (!this.repository.upsertVariant) throw new Error('Repository method upsertVariant not implemented');
    return this.mutate('INTERNATIONAL_TEST_VARIANT_UPSERTED', testId, context, repository => repository.upsertVariant!(testId, data));
  }

  public async listSections(testId: string): Promise<InternationalTestSectionDto[]> {
    await this.get(testId);
    if (!this.repository.listSections) return [];
    return this.repository.listSections(testId);
  }

  public async upsertSection(testId: string, data: UpsertInternationalTestSectionDto & { id?: string }, context?: AtomicMutationRequestContext): Promise<InternationalTestSectionDto> {
    await this.get(testId);
    if (!this.repository.upsertSection) throw new Error('Repository method upsertSection not implemented');
    return this.mutate('INTERNATIONAL_TEST_SECTION_UPSERTED', testId, context, repository => repository.upsertSection!(testId, data));
  }

  public async upsertScoreScale(testId: string, data: UpsertInternationalTestScoreScaleDto, context?: AtomicMutationRequestContext): Promise<InternationalTestScoreScaleDto> {
    await this.get(testId);
    if (data.overallMinimum > data.overallMaximum) {
      throw new Error('Invalid score scale: overallMinimum cannot be greater than overallMaximum');
    }
    if (!this.repository.upsertScoreScale) throw new Error('Repository method upsertScoreScale not implemented');
    return this.mutate('INTERNATIONAL_TEST_SCORE_SCALE_UPSERTED', testId, context, repository => repository.upsertScoreScale!(testId, data));
  }

  public async upsertFeeMetadata(testId: string, data: Omit<UpsertInternationalTestFeeMetadataDto, 'currencyReferenceId'> & { currencyReferenceId?: string; id?: string }, context?: AtomicMutationRequestContext): Promise<InternationalTestFeeMetadataDto> {
    await this.get(testId);
    if (data.amount < 0) {
      throw new Error('Fee amount cannot be negative');
    }
    if (!data.currencyCode || data.currencyCode.trim() === '') {
      throw new Error('Currency code is required for fee metadata');
    }
    if (!this.referenceResolver) throw new Error('Canonical Reference resolver is not configured');
    const currency = await this.referenceResolver.resolveCurrency({ standardCode: data.currencyCode });
    if (!currency?.active) throw new Error(`Active canonical Currency not found: ${data.currencyCode}`);
    if (data.currencyReferenceId) {
      const requestedCurrency = await this.referenceResolver.resolveCurrency({ id: data.currencyReferenceId });
      if (!requestedCurrency?.active || requestedCurrency.id !== currency.id) {
        throw new Error('CURRENCY_REFERENCE_ID_CODE_MISMATCH');
      }
    }
    const rawData = data as unknown as Record<string, unknown>;
    if (rawData.paymentGatewayId || rawData.chargeToken || rawData.paymentStatus || rawData.executePayment) {
      throw new Error('Payment execution fields are not supported in fee metadata');
    }
    if (!this.repository.upsertFeeMetadata) throw new Error('Repository method upsertFeeMetadata not implemented');
    const canonicalData: UpsertInternationalTestFeeMetadataDto & { id?: string } = {
      ...data,
      currencyCode: currency.standardCode ?? data.currencyCode.trim().toUpperCase(),
      currencyReferenceId: currency.id,
    };
    return this.mutate('INTERNATIONAL_TEST_FEE_UPSERTED', testId, context, repository => repository.upsertFeeMetadata!(testId, canonicalData));
  }

  public async upsertOfficialLink(testId: string, data: UpsertInternationalTestOfficialLinkDto & { id?: string }, context?: AtomicMutationRequestContext): Promise<InternationalTestOfficialLinkDto> {
    await this.get(testId);
    if (!data.url || data.url.trim() === '') {
      throw new Error('URL is required for official link');
    }
    if (!this.repository.upsertOfficialLink) throw new Error('Repository method upsertOfficialLink not implemented');
    return this.mutate('INTERNATIONAL_TEST_OFFICIAL_LINK_UPSERTED', testId, context, repository => repository.upsertOfficialLink!(testId, data));
  }

  public async listAvailability(testId: string): Promise<InternationalTestAvailabilityDto | null> {
    await this.get(testId);
    if (!this.repository.listAvailability) return null;
    return this.repository.listAvailability(testId);
  }

  public async upsertAvailability(testId: string, data: UpsertInternationalTestAvailabilityDto, context?: AtomicMutationRequestContext): Promise<InternationalTestAvailabilityDto> {
    await this.get(testId);
    if (!this.referenceResolver) throw new Error('Canonical Reference resolver is not configured');
    for (const countryId of data.availableCountryIds) {
      const country = await this.referenceResolver.resolveCountry({ id: countryId });
      if (!country?.active) throw new Error(`Active canonical Country not found: ${countryId}`);
    }
    for (const cityId of data.availableCityIds || []) {
      const city = await this.referenceResolver.resolveCity({ id: cityId });
      if (!city?.active) throw new Error(`Active canonical City not found: ${cityId}`);
    }
    if (!this.repository.upsertAvailability) throw new Error('Repository method upsertAvailability not implemented');
    return this.mutate('INTERNATIONAL_TEST_AVAILABILITY_UPSERTED', testId, context, repository => repository.upsertAvailability!(testId, data));
  }

  public async listPreparationMaterials(testId: string): Promise<InternationalTestPreparationMaterialDto[]> {
    await this.get(testId);
    if (!this.repository.listPreparationMaterials) return [];
    return this.repository.listPreparationMaterials(testId);
  }

  public async upsertPreparationMaterial(testId: string, data: UpsertInternationalTestPreparationMaterialDto & { id?: string }, context?: AtomicMutationRequestContext): Promise<InternationalTestPreparationMaterialDto> {
    await this.get(testId);
    if (data.url && (data.url.startsWith('file://') || data.url.startsWith('/local/') || data.url.startsWith('C:\\'))) {
      throw new Error('Raw local file paths are not allowed as persisted material URLs');
    }
    await assertAssetReferenceUsable(this.assetReferences, data.assetId, { purpose: 'INTERNATIONAL_TEST_MATERIAL' });
    if (!this.repository.upsertPreparationMaterial) throw new Error('Repository method upsertPreparationMaterial not implemented');
    return this.mutate('INTERNATIONAL_TEST_PREPARATION_MATERIAL_UPSERTED', testId, context, repository => repository.upsertPreparationMaterial!(testId, data));
  }

  public async listEvidence(testId: string): Promise<InternationalTestEvidenceDto[]> {
    await this.get(testId);
    if (!this.repository.listEvidence) return [];
    return this.repository.listEvidence(testId);
  }

  public async addEvidence(testId: string, data: InternationalTestEvidenceDto, context?: AtomicMutationRequestContext): Promise<InternationalTestEvidenceDto> {
    await this.get(testId);
    if (!this.repository.addEvidence) throw new Error('Repository method addEvidence not implemented');
    return this.mutate('INTERNATIONAL_TEST_EVIDENCE_ADDED', testId, context, repository => repository.addEvidence!(testId, data));
  }

  public async createImportDraftVersion(
    testId: string,
    data: InternationalTestImportDraftRequestDto,
    context?: AtomicMutationRequestContext,
  ): Promise<InternationalTestImportDraftResultDto> {
    await this.get(testId);
    if (!data.sourceFileName || data.sourceFileName.trim() === '') {
      throw new Error('Source file name is required to create an import draft version');
    }
    if (!this.repository.createImportDraftVersion) {
      throw new Error('Repository method createImportDraftVersion not implemented');
    }
    return this.mutate('INTERNATIONAL_TEST_IMPORT_DRAFT_CREATED', testId, context, repository => repository.createImportDraftVersion!(testId, {
      ...data,
      sourceFileName: data.sourceFileName.trim()
    }));
  }

  public async listImportVersions(testId: string): Promise<InternationalTestVersionDto[]> {
    await this.get(testId);
    if (!this.repository.listImportVersions) return [];
    return this.repository.listImportVersions(testId);
  }

  private async canonicalizeProvider(data: Partial<UpsertInternationalTestDto>): Promise<Partial<UpsertInternationalTestDto>> {
    if (!data.providerId) return {};
    if (!this.repository.findProviderById) throw new Error('Canonical International Test provider lookup is not configured');
    const provider = await this.repository.findProviderById(data.providerId);
    if (!provider) throw new Error(`International test provider with id ${data.providerId} not found`);
    return { providerId: provider.id, providerName: provider.displayName };
  }

  private mutate<T>(action: string, id: string, context: AtomicMutationRequestContext | undefined, mutation: (repository: IInternationalTestRepository) => Promise<T>): Promise<T> {
    if (!this.atomicMutations) return mutation(this.repository);
    const repository = this.repository as Partial<ITransactionalInternationalTestRepository>;
    if (!repository.withTransaction) throw new Error('INTERNATIONAL_TEST_TRANSACTIONAL_PERSISTENCE_REQUIRED');
    return this.atomicMutations.execute({ domain: 'INTERNATIONAL_TESTS', aggregateType: 'INTERNATIONAL_TEST', aggregateId: id, action, context },
      transaction => mutation(repository.withTransaction!(transaction)));
  }
}

export class InternationalTestPublicUseCases {
  constructor(private readonly repository: IInternationalTestRepository) {}

  public async listPublished(filters: Omit<InternationalTestFilters, 'status'> = {}): Promise<PaginatedInternationalTestResult<InternationalTestDto>> {
    const safeFilters = filters || {};
    const requestedPage = typeof safeFilters.page === 'number' ? safeFilters.page : 1;
    const requestedPageSize = typeof safeFilters.pageSize === 'number' ? safeFilters.pageSize : 20;
    return this.repository.listPublished({
      ...safeFilters,
      page: Math.max(1, Math.floor(requestedPage)),
      pageSize: Math.min(50, Math.max(1, Math.floor(requestedPageSize)))
    });
  }

  public async getPublishedBySlug(slug: string): Promise<InternationalTestDto> {
    const test = await this.repository.findPublishedBySlug(slug);
    if (!test) {
      throw new Error('International test not found');
    }
    return test;
  }
}
