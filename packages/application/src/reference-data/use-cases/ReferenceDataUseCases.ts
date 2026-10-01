import { AssetReferencePolicy, assertAssetReferenceUsable } from '../../asset-platform/AssetReferencePolicy';
import { randomUUID } from 'crypto';
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
  ReferenceLanguageDto,
  AdministrativeRegionDto,
  UpsertReferenceCityDto,
  UpsertReferenceCountryDto,
  UpsertReferenceCurrencyDto,
  UpsertReferenceLanguageDto,
  GovernedReferenceEntityType,
  ReferenceLifecycleState,
  ReferenceRelationshipDto,
  ReferenceVersionDto
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
    return this.repository.listRegions(filters);
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
    return this.atomicUpsert('COUNTRY', data.iso2Code, context, transaction => transaction.repository.upsertCountryInTransaction(data, transaction.context), () => this.repository.upsertCountry(data));
  }

  public async upsertCurrency(data: UpsertReferenceCurrencyDto, context?: ReferenceDataMutationContext): Promise<ReferenceCurrencyDto> {
    this.assertCanonicalValidation('CURRENCY', this.validationService.validateCurrency(data).issues);
    return this.atomicUpsert('CURRENCY', data.isoCode, context, transaction => transaction.repository.upsertCurrencyInTransaction(data, transaction.context), () => this.repository.upsertCurrency(data));
  }

  public async upsertLanguage(data: UpsertReferenceLanguageDto, context?: ReferenceDataMutationContext): Promise<ReferenceLanguageDto> {
    this.assertCanonicalValidation('LANGUAGE', this.validationService.validateLanguage(data).issues);
    return this.atomicUpsert('LANGUAGE', data.isoCode, context, transaction => transaction.repository.upsertLanguageInTransaction(data, transaction.context), () => this.repository.upsertLanguage(data));
  }

  public async upsertCity(data: UpsertReferenceCityDto, context?: ReferenceDataMutationContext): Promise<ReferenceCityDto> {
    this.assertCanonicalValidation('CITY', this.validationService.validateCity(data).issues);
    const country = await this.repository.getCountry(data.countryIso2Code);
    if (!country || country.lifecycleState !== ReferenceLifecycleState.ACTIVE) {
      throw new ReferenceDataNotFoundError('ACTIVE_COUNTRY', data.countryIso2Code);
    }
    if (data.administrativeRegionId) {
      const region = await this.repository.getRegionById(data.administrativeRegionId);
      if (!region) {
        throw new ReferenceDataNotFoundError('REGION', data.administrativeRegionId);
      }
      if (region.countryIso2Code !== country.iso2Code) {
        throw new ReferenceDataInvariantError('City administrative region must belong to the selected country.');
      }
    }
    if (!country.id) throw new ReferenceDataInvariantError('Canonical country ID is required for city persistence.');
    const canonicalData: UpsertReferenceCityDto = { ...data, countryReferenceId: country.id };
    const identity = `${data.countryIso2Code}:${data.name}:${data.region ?? ''}`;
    return this.atomicUpsert('CITY', identity, context, transaction => transaction.repository.upsertCityInTransaction(canonicalData, transaction.context), () => this.repository.upsertCity(canonicalData));
  }

  public getReferenceHistory(entityType: GovernedReferenceEntityType, referenceId: string): Promise<ReferenceVersionDto[]> {
    return this.repository.getReferenceHistory(entityType, referenceId);
  }

  public getReferenceRelationships(entityType: GovernedReferenceEntityType, referenceId: string): Promise<ReferenceRelationshipDto[]> {
    return this.repository.getReferenceRelationships(entityType, referenceId);
  }

  public async transitionReferenceLifecycle(
    input: { entityType: GovernedReferenceEntityType; referenceId: string; toState: ReferenceLifecycleState; targetReferenceId?: string; reason: string },
    context: ReferenceDataMutationContext,
  ): Promise<void> {
    if (!context.actorId) throw new ReferenceDataInvariantError('Authenticated actor is required for lifecycle transitions.');
    if (!input.reason.trim()) throw new ReferenceDataInvariantError('Lifecycle transition reason is required.');
    const command = { ...input, reason: input.reason.trim(), actorId: context.actorId };
    if (!this.atomicMutationExecutor) {
      await this.repository.transitionReferenceLifecycle(command);
      return;
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
    if (!this.atomicMutationExecutor) return legacyMutation();

    const repository = this.repository as Partial<ITransactionalReferenceDataRepository>;
    if (!repository.upsertCountryInTransaction || !repository.upsertCurrencyInTransaction || !repository.upsertLanguageInTransaction || !repository.upsertCityInTransaction) {
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
