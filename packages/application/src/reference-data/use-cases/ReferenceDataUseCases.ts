import { AssetReferencePolicy, assertAssetReferenceUsable } from '../../asset-platform/AssetReferencePolicy';
import { createHash, randomUUID } from 'crypto';
import {
  IReferenceDataRepository,
  ITransactionalReferenceDataRepository,
  IReferenceDataValidationService,
  ReferenceDataValidationService,
  ReferenceDataValidationIssue,
  ReferenceDataValidationSeverity,
  OutboxProcessingState,
  ReferenceCityDto,
  ReferenceCountryDto,
  ReferenceCurrencyDto,
  ReferenceDataFilters,
  ReferenceDataCollection,
  ReferenceDataPage,
  ReferenceLanguageDto,
  AdministrativeRegionDto,
  UpsertAdministrativeRegionDto,
  UpsertReferenceCityDto,
  UpsertReferenceCountryDto,
  UpsertReferenceCurrencyDto,
  UpsertReferenceLanguageDto,
  GovernedReferenceEntityType,
  ReferenceLifecycleState,
  ReferenceRelationshipDto,
  ReferenceVersionDto,
  ReferenceGovernanceDetails,
  ReferenceCityQualityCounters,
  ReferenceDependencyImpact,
  ReferenceProviderMappingReassignmentCommand,
  referenceCityScopeKey,
  referenceStandardsReadiness
} from '@manaratak/domain';
import { AtomicAuditedOutboxMutationExecutor } from '../../event-foundation/use-cases/AtomicAuditedOutboxMutationExecutor';
import { CountryImportPreviewService, CountrySourceRecord } from '../services/CountryImportPreviewService';
import { CountryDerivedReferencePreviewService } from '../services/CountryDerivedReferencePreviewService';
import { ReferenceDataInvariantError, ReferenceDataNotFoundError, ReferenceDataValidationError } from '../ReferenceDataErrors';

export interface ReferenceDataMutationContext {
  actorId: string;
  actorType?: string;
  correlationId?: string;
  source?: string;
}

export class ReferenceDataUseCases {
  constructor(
    private readonly repository: IReferenceDataRepository,
    private readonly countryImportPreview = new CountryImportPreviewService(),
    private readonly derivedReferencePreview = new CountryDerivedReferencePreviewService(),
    private readonly atomicMutationExecutor?: AtomicAuditedOutboxMutationExecutor,
    private readonly validationService: IReferenceDataValidationService = new ReferenceDataValidationService(),
    private readonly assetReferences?: AssetReferencePolicy,
  ) {}

  public previewCountryImport(input: {
    sourceName: string;
    sourceVersion: string;
    sha256?: string;
    records: CountrySourceRecord[];
  }) {
    return this.countryImportPreview.preview(input);
  }

  public previewCountryDerivedReferences(records: CountrySourceRecord[]) {
    return this.derivedReferencePreview.preview(records);
  }

  public listCountries(filters: ReferenceDataFilters = {}): Promise<ReferenceCountryDto[]> {
    return this.repository.listCountries({ activeOnly: true, ...filters });
  }

  public listCurrencies(filters: ReferenceDataFilters = {}): Promise<ReferenceCurrencyDto[]> {
    return this.repository.listCurrencies({ activeOnly: true, ...filters });
  }

  public listLanguages(filters: ReferenceDataFilters = {}): Promise<ReferenceLanguageDto[]> {
    return this.repository.listLanguages({ activeOnly: true, ...filters });
  }

  public listCities(filters: ReferenceDataFilters = {}): Promise<ReferenceCityDto[]> {
    return this.repository.listCities({ activeOnly: true, ...filters });
  }

  public listRegions(filters: ReferenceDataFilters = {}): Promise<AdministrativeRegionDto[]> {
    return this.repository.listRegions({ activeOnly: true, ...filters });
  }

  public async getRegion(id: string): Promise<AdministrativeRegionDto> {
    const region = await this.repository.getRegionById(id);
    if (!region) throw new ReferenceDataNotFoundError('REGION', id);
    return region;
  }

  public async upsertRegion(data: UpsertAdministrativeRegionDto, context: ReferenceDataMutationContext): Promise<AdministrativeRegionDto> {
    if (!context.actorId) throw new ReferenceDataInvariantError('Authenticated actor is required for region authoring.');
    if (!/^[A-Z]{2}$/.test(data.countryIso2Code) || !/^[A-Z0-9][A-Z0-9-]{0,31}$/.test(data.regionCode) || !data.name.trim() || data.name.length > 300) {
      throw new ReferenceDataInvariantError('Canonical country, region code and name are required.');
    }
    if (Boolean(data.id) !== (data.expectedVersion !== undefined) || (data.expectedVersion !== undefined && (!Number.isSafeInteger(data.expectedVersion) || data.expectedVersion < 1))) {
      throw new ReferenceDataInvariantError('Region updates require an ID and expected version.');
    }
    if ((data.aliases?.length ?? 0) > 100 || data.aliases?.some(alias => !/[\p{L}\p{N}]/u.test(alias.alias) || alias.alias.length > 300 || (alias.locale != null && (alias.locale.length < 2 || alias.locale.length > 35)))) {
      throw new ReferenceDataInvariantError('Region aliases must contain a valid name and bounded locale.');
    }
    // New authoring commands must never fall back to writes without Audit/Outbox.
    const repository = this.repository as Partial<ITransactionalReferenceDataRepository>;
    if (!this.atomicMutationExecutor || !repository.upsertRegionInTransaction) throw new Error('REFERENCE_DATA_TRANSACTIONAL_PERSISTENCE_REQUIRED');
    const id = data.id ?? randomUUID();
    const canonicalData = { ...data, id, name: data.name.trim() };
    return this.atomicUpsert('REGION', id, context,
      transaction => transaction.repository.upsertRegionInTransaction(canonicalData, context.actorId, transaction.context),
      () => { throw new Error('REFERENCE_DATA_TRANSACTIONAL_PERSISTENCE_REQUIRED'); });
  }

  /** Read-only manifest; no reviewed authority snapshot ships in this revision.
   * Do not confuse ICU code-format checks with an approved standards baseline.
   */
  public getStandardsReadiness() {
    return referenceStandardsReadiness([]);
  }

  /** Only source-backed counts are numeric. No inferred quality or coverage claims. */
  public async getQualitySnapshot(): Promise<Array<{
    collection: ReferenceDataCollection; total: number; active: number; nonActive: number;
    aliasCoverage: 'unknown'; authoritativeCoverage: 'unknown'; brokenRelationships: 'unknown';
  }>> {
    const collections: ReferenceDataCollection[] = ['countries', 'currencies', 'languages', 'regions', 'cities'];
    return Promise.all(collections.map(async collection => {
      const [total, active] = await Promise.all([
        this.repository.countRecords(collection, { activeOnly: false }),
        this.repository.countRecords(collection, { activeOnly: true }),
      ]);
      return { collection, total, active, nonActive: total - active,
        aliasCoverage: 'unknown' as const, authoritativeCoverage: 'unknown' as const,
        brokenRelationships: 'unknown' as const };
    }));
  }

  public async listPage(collection: ReferenceDataCollection, filters: ReferenceDataFilters = {}): Promise<ReferenceDataPage<ReferenceCountryDto | ReferenceCurrencyDto | ReferenceLanguageDto | ReferenceCityDto | AdministrativeRegionDto>> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 50;
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) {
      throw new Error('REFERENCE_DATA_PAGINATION_INVALID');
    }
    if (filters.activeOnly && filters.nonActiveOnly) throw new Error('REFERENCE_DATA_FILTER_CONFLICT');
    // Explicit non-active-only must not be accidentally intersected with the
    // default public ACTIVE filter when activeOnly was omitted.
    const normalized = { ...filters, activeOnly: filters.nonActiveOnly ? false :
      filters.activeOnly ?? true, page, pageSize };
    const [data, total] = await Promise.all([
      this.repository[({ countries: 'listCountries', currencies: 'listCurrencies', languages: 'listLanguages', regions: 'listRegions', cities: 'listCities' } as const)[collection]](normalized),
      this.repository.countRecords(collection, normalized),
    ]);
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  public async getCountry(iso2Code: string): Promise<ReferenceCountryDto> {
    const country = await this.repository.getCountry(iso2Code);
    if (!country || country.lifecycleState !== ReferenceLifecycleState.ACTIVE) {
      throw new ReferenceDataNotFoundError('COUNTRY', iso2Code);
    }
    return country;
  }

  public async getCurrency(isoCode: string): Promise<ReferenceCurrencyDto> {
    const currency = await this.repository.getCurrency(isoCode);
    if (!currency || currency.lifecycleState !== ReferenceLifecycleState.ACTIVE) {
      throw new ReferenceDataNotFoundError('CURRENCY', isoCode);
    }
    return currency;
  }

  public async getLanguage(isoCode: string): Promise<ReferenceLanguageDto> {
    const language = await this.repository.getLanguage(isoCode);
    if (!language || language.lifecycleState !== ReferenceLifecycleState.ACTIVE) {
      throw new ReferenceDataNotFoundError('LANGUAGE', isoCode);
    }
    return language;
  }

  public async upsertCountry(data: UpsertReferenceCountryDto, context?: ReferenceDataMutationContext): Promise<ReferenceCountryDto> {
    await assertAssetReferenceUsable(this.assetReferences, data.flagAssetId, { purpose: 'REFERENCE_COUNTRY_FLAG' });
    this.assertCanonicalValidation('COUNTRY', this.validationService.validateCountry(data).issues);
    // Code fields are authoritative links, never free-form labels.
    if (data.defaultCurrencyCode) {
      const currency = await this.repository.getCurrency(data.defaultCurrencyCode);
      if (!currency || currency.lifecycleState !== ReferenceLifecycleState.ACTIVE)
        throw new ReferenceDataNotFoundError('ACTIVE_CURRENCY', data.defaultCurrencyCode);
    }
    if (data.defaultLanguageCode) {
      const language = await this.repository.getLanguage(data.defaultLanguageCode);
      if (!language || language.lifecycleState !== ReferenceLifecycleState.ACTIVE)
        throw new ReferenceDataNotFoundError('ACTIVE_LANGUAGE', data.defaultLanguageCode);
    }
    return this.atomicUpsert('COUNTRY', data.iso2Code, context, transaction => transaction.repository.upsertCountryInTransaction(data, transaction.context, context?.actorId, context?.correlationId), () => this.repository.upsertCountry(data));
  }

  public async upsertCurrency(data: UpsertReferenceCurrencyDto, context?: ReferenceDataMutationContext): Promise<ReferenceCurrencyDto> {
    this.assertCanonicalValidation('CURRENCY', this.validationService.validateCurrency(data).issues);
    return this.atomicUpsert('CURRENCY', data.isoCode, context, transaction => transaction.repository.upsertCurrencyInTransaction(data, transaction.context, context?.actorId, context?.correlationId), () => this.repository.upsertCurrency(data));
  }

  public async upsertLanguage(data: UpsertReferenceLanguageDto, context?: ReferenceDataMutationContext): Promise<ReferenceLanguageDto> {
    this.assertCanonicalValidation('LANGUAGE', this.validationService.validateLanguage(data).issues);
    return this.atomicUpsert('LANGUAGE', data.isoCode, context, transaction => transaction.repository.upsertLanguageInTransaction(data, transaction.context, context?.actorId, context?.correlationId), () => this.repository.upsertLanguage(data));
  }

  public async upsertCity(data: UpsertReferenceCityDto, context?: ReferenceDataMutationContext): Promise<ReferenceCityDto> {
    this.assertCanonicalValidation('CITY', this.validationService.validateCity(data).issues);
    const country = await this.repository.getCountry(data.countryIso2Code);
    if (!country || country.lifecycleState !== ReferenceLifecycleState.ACTIVE) {
      throw new ReferenceDataNotFoundError('ACTIVE_COUNTRY', data.countryIso2Code);
    }
    if (data.administrativeRegionId) {
      const region = await this.repository.getRegionById(data.administrativeRegionId);
      if (!region || region.lifecycleState !== ReferenceLifecycleState.ACTIVE) {
        throw new ReferenceDataNotFoundError('REGION', data.administrativeRegionId);
      }
      if (region.countryIso2Code !== country.iso2Code) {
        throw new ReferenceDataInvariantError('City administrative region must belong to the selected country.');
      }
    }
    if (!country.id) throw new ReferenceDataInvariantError('Canonical country ID is required for city persistence.');
    const canonicalData: UpsertReferenceCityDto = { ...data, countryReferenceId: country.id };
    const identity = referenceCityScopeKey(canonicalData);
    return this.atomicUpsert('CITY', identity, context, transaction => transaction.repository.upsertCityInTransaction(canonicalData, transaction.context, context?.actorId, context?.correlationId), () => this.repository.upsertCity(canonicalData));
  }


  public getReferenceGovernanceDetails(entityType: GovernedReferenceEntityType, referenceId: string): Promise<ReferenceGovernanceDetails> {
    const owner = this.repository as IReferenceDataRepository & {
      getReferenceGovernanceDetails?: (type: GovernedReferenceEntityType, id: string) => Promise<ReferenceGovernanceDetails>
    };
    if (!owner.getReferenceGovernanceDetails) throw new Error('REFERENCE_GOVERNANCE_OWNER_READ_UNAVAILABLE');
    return owner.getReferenceGovernanceDetails(entityType, referenceId);
  }

  public getReferenceDependencyImpact(entityType: GovernedReferenceEntityType, referenceId: string): Promise<ReferenceDependencyImpact> {
    const owner = this.repository as IReferenceDataRepository & {
      getReferenceDependencyImpact?: (type: GovernedReferenceEntityType, id: string) => Promise<ReferenceDependencyImpact>
    };
    if (!owner.getReferenceDependencyImpact) throw new Error('REFERENCE_USAGE_OWNER_READ_UNAVAILABLE');
    return owner.getReferenceDependencyImpact(entityType, referenceId);
  }

  public getCityQualityCounters(countryIso2Code: string): Promise<ReferenceCityQualityCounters> {
    if (!/^[A-Z]{2}$/.test(countryIso2Code)) throw new ReferenceDataInvariantError('Invalid ISO-3166 country code');
    const owner = this.repository as IReferenceDataRepository & {
      getCityQualityCounters?: (country: string) => Promise<ReferenceCityQualityCounters>
    };
    if (!owner.getCityQualityCounters) throw new Error('REFERENCE_GOVERNANCE_OWNER_READ_UNAVAILABLE');
    return owner.getCityQualityCounters(countryIso2Code);
  }

  public getReferenceHistory(entityType: GovernedReferenceEntityType, referenceId: string): Promise<ReferenceVersionDto[]> {
    return this.repository.getReferenceHistory(entityType, referenceId);
  }

  public getReferenceRelationships(entityType: GovernedReferenceEntityType, referenceId: string): Promise<ReferenceRelationshipDto[]> {
    return this.repository.getReferenceRelationships(entityType, referenceId);
  }


  /** Explicit audited ownership change; other mapping updates cannot reassign. */
  public async reassignProviderMapping(
    input: Omit<ReferenceProviderMappingReassignmentCommand, 'actorId'>,
    context: ReferenceDataMutationContext,
  ): Promise<'APPLIED' | 'ALREADY_APPLIED'> {
    if (!context.actorId || !this.atomicMutationExecutor) throw new Error('REFERENCE_MAPPING_AUDIT_REQUIRED');
    if (!['COUNTRY', 'CURRENCY', 'LANGUAGE', 'CITY'].includes(input.entityType) ||
        !input.fromReferenceId || !input.toReferenceId || input.fromReferenceId === input.toReferenceId ||
        !input.providerSystem.trim() || !input.providerId.trim() || input.reason.trim().length < 3 ||
        !Number.isSafeInteger(input.fromExpectedVersion) || input.fromExpectedVersion < 1 ||
        !Number.isSafeInteger(input.toExpectedVersion) || input.toExpectedVersion < 1 ||
        !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(input.reconciliationId)) {
      throw new ReferenceDataInvariantError('Invalid explicit provider mapping transfer request.');
    }
    const repository = this.repository as IReferenceDataRepository & {
      reassignProviderMappingInTransaction?: (
        command: ReferenceProviderMappingReassignmentCommand,
        context: import('@manaratak/domain').AtomicPersistenceContext,
      ) => Promise<void>;
    };
    if (!repository.reassignProviderMappingInTransaction) throw new Error('REFERENCE_DATA_TRANSACTIONAL_PERSISTENCE_REQUIRED');
    const command: ReferenceProviderMappingReassignmentCommand = {
      ...input, actorId: context.actorId, reason: input.reason.trim(),
    };
    // Stable IDs make simultaneous replay of a request fail in the same atomic
    // boundary rather than emitting multiple governance events.
    const stableId = (prefix: string) => {
      const hash = createHash('sha256').update(prefix + ':' + input.reconciliationId).digest('hex').slice(0, 32);
      return [hash.slice(0, 8), hash.slice(8, 12), hash.slice(12, 16), hash.slice(16, 20), hash.slice(20)].join('-');
    };
    const auditId = stableId('P7_MAPPING_AUDIT');
    const outboxId = stableId('P7_MAPPING_OUTBOX');
    const now = new Date();
    try {
      await this.atomicMutationExecutor.execute(
        {
          id: auditId, reference: 'AUD-' + auditId, action: 'REFERENCE_PROVIDER_MAPPING_REASSIGNED',
          category: 'REFERENCE_DATA_GOVERNANCE', severity: 'INFO',
          actorId: context.actorId, actorType: context.actorType || 'IDENTITY',
          targetId: input.fromReferenceId, targetType: 'REFERENCE_' + input.entityType,
          source: context.source || 'admin-reference-data-api', timestamp: now,
          contextMetadata: { ...input, reason: command.reason },
          correlationReference: context.correlationId,
        },
        {
          id: outboxId, eventType: 'REFERENCE_PROVIDER_MAPPING_REASSIGNED', domain: 'REFERENCE_DATA',
          aggregate: { domain: 'REFERENCE_DATA', aggregateType: input.entityType, aggregateId: input.fromReferenceId },
          payload: { ...input, reason: command.reason },
          metadata: { actorId: context.actorId, reconciliationId: input.reconciliationId, atomicity: 'BUSINESS_AUDIT_OUTBOX' },
          correlationId: context.correlationId, createdAt: now, availableAt: now,
          state: OutboxProcessingState.PENDING, attempts: 0,
        },
        atomicContext => repository.reassignProviderMappingInTransaction!(command, atomicContext),
      );
      return 'APPLIED';
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'REFERENCE_MAPPING_RECONCILIATION_ALREADY_APPLIED')
        return 'ALREADY_APPLIED';
      throw err;
    }
  }

  public async transitionReferenceLifecycle(
    input: { entityType: GovernedReferenceEntityType; referenceId: string; toState: ReferenceLifecycleState; targetReferenceId?: string; reason: string; expectedVersion?: number },
    context: ReferenceDataMutationContext,
  ): Promise<void> {
    if (!context.actorId) throw new ReferenceDataInvariantError('Authenticated actor is required for lifecycle transitions.');
    if (!input.reason.trim()) throw new ReferenceDataInvariantError('Lifecycle transition reason is required.');
    const command = { ...input, reason: input.reason.trim(), actorId: context.actorId };
    if (!Number.isSafeInteger(input.expectedVersion) || (input.expectedVersion ?? 0) < 1 || !this.atomicMutationExecutor) {
      throw new ReferenceDataInvariantError('Lifecycle requires an expected version and audited transaction.');
    }
    const repository = this.repository as Partial<ITransactionalReferenceDataRepository>;
    if (!repository.transitionReferenceLifecycleInTransaction) {
      throw new Error('REFERENCE_DATA_TRANSACTIONAL_PERSISTENCE_REQUIRED');
    }
    const now = new Date();
    const auditId = randomUUID();
    const outboxId = randomUUID();
    const action = `REFERENCE_${input.entityType}_${input.toState}`;
    await this.atomicMutationExecutor.execute(
      {
        id: auditId,
        reference: `AUD-${auditId}`,
        action,
        category: 'REFERENCE_DATA_LIFECYCLE',
        severity: 'INFO',
        actorId: context.actorId,
        actorType: context.actorType || 'IDENTITY',
        targetId: input.referenceId,
        targetType: `REFERENCE_${input.entityType}`,
        source: context.source || 'admin-reference-data-api',
        timestamp: now,
        contextMetadata: { toState: input.toState, reason: input.reason.trim(), targetReferenceId: input.targetReferenceId ?? null },
        correlationReference: context.correlationId,
      },
      {
        id: outboxId,
        eventType: action,
        domain: 'REFERENCE_DATA',
        aggregate: { domain: 'REFERENCE_DATA', aggregateType: input.entityType, aggregateId: input.referenceId },
        payload: { ...input, reason: input.reason.trim() },
        metadata: { actorId: context.actorId, atomicity: 'BUSINESS_AUDIT_OUTBOX' },
        correlationId: context.correlationId,
        createdAt: now,
        availableAt: now,
        state: OutboxProcessingState.PENDING,
        attempts: 0,
      },
      atomicContext => (repository as ITransactionalReferenceDataRepository).transitionReferenceLifecycleInTransaction!(command, atomicContext),
    );
  }

  private assertCanonicalValidation(entityType: string, issues: readonly ReferenceDataValidationIssue[]): void {
    const errors = issues.filter((issue) => issue.severity === ReferenceDataValidationSeverity.ERROR);
    if (errors.length > 0) throw new ReferenceDataValidationError(entityType, errors);
  }

  private atomicUpsert<T>(
    entityType: string,
    entityId: string,
    requestContext: ReferenceDataMutationContext | undefined,
    mutation: (transaction: { repository: ITransactionalReferenceDataRepository; context: import('@manaratak/domain').AtomicPersistenceContext }) => Promise<T>,
    legacyMutation: () => Promise<T>,
  ): Promise<T> {
    if (!this.atomicMutationExecutor) {
      if (requestContext) throw new Error('REFERENCE_DATA_TRANSACTIONAL_PERSISTENCE_REQUIRED');
      return legacyMutation();
    }

    const repository = this.repository as Partial<ITransactionalReferenceDataRepository>;
    if (entityType === 'REGION' ? !repository.upsertRegionInTransaction : (!repository.upsertCountryInTransaction || !repository.upsertCurrencyInTransaction || !repository.upsertLanguageInTransaction || !repository.upsertCityInTransaction)) {
      throw new Error('REFERENCE_DATA_TRANSACTIONAL_PERSISTENCE_REQUIRED');
    }

    const now = new Date();
    const auditId = randomUUID();
    const outboxId = randomUUID();
    const actorId = requestContext?.actorId || 'SYSTEM';
    const correlationId = requestContext?.correlationId;
    const action = `REFERENCE_${entityType}_UPSERTED`;

    return this.atomicMutationExecutor.execute(
      {
        id: auditId,
        reference: `AUD-${auditId}`,
        action,
        category: 'REFERENCE_DATA_MUTATION',
        severity: 'INFO',
        actorId,
        actorType: requestContext?.actorType || 'IDENTITY',
        targetId: entityId,
        targetType: `REFERENCE_${entityType}`,
        source: requestContext?.source || 'admin-reference-data-api',
        timestamp: now,
        contextMetadata: { result: 'SUCCESS', atomicity: 'BUSINESS_AUDIT_OUTBOX' },
        correlationReference: correlationId,
      },
      {
        id: outboxId,
        eventType: action,
        domain: 'REFERENCE_DATA',
        aggregate: { domain: 'REFERENCE_DATA', aggregateType: entityType, aggregateId: entityId },
        payload: { entityType, entityId, operation: 'UPSERT' },
        metadata: { actorId, atomicity: 'BUSINESS_AUDIT_OUTBOX' },
        correlationId,
        createdAt: now,
        availableAt: now,
        state: OutboxProcessingState.PENDING,
        attempts: 0,
      },
      atomicContext => mutation({ repository: repository as ITransactionalReferenceDataRepository, context: atomicContext }),
    );
  }
}
