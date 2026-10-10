import { createHash, randomUUID } from 'crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  AtomicPersistenceContext,
  ITransactionalReferenceDataRepository,
  IReferenceResolutionRepository,
  ReferenceLookup,
  ReferenceResolutionMatch,
  ReferenceCountryDto,
  ReferenceCurrencyDto,
  ReferenceLanguageDto,
  ReferenceCityDto,
  UpsertReferenceCountryDto,
  UpsertReferenceCurrencyDto,
  UpsertReferenceLanguageDto,
  UpsertReferenceCityDto,
  ReferenceDataFilters,
  ReferenceDataCollection,
  AdministrativeRegionDto,
  UpsertAdministrativeRegionDto,
  ReferenceRegionCommandError,
  GovernedReferenceEntityType,
  ReferenceAliasInput,
  ReferenceLifecycleState,
  ReferenceLifecycleTransitionCommand,
  ReferenceProviderMappingInput,
  ReferenceRelationshipDto,
  ReferenceVersionDto,
  ReferenceGovernanceDetails,
  ReferenceCityQualityCounters,
  ReferenceDependencyImpact,
  ReferenceProviderMappingReassignmentCommand,
  ReferenceCityCountryLinkRepairCommand,
  ReferenceImportScreeningReviewPage,
  ReferenceHistoryPage,
  assertReferenceLifecycleTransition,
  lifecycleIsActive,
  normalizeReferenceIdentityToken,
  referenceCityScopeKey,
  classifyReferenceImportTriage
} from '@manaratak/domain';

interface DbCountry {
  id: string;
  iso2Code: string;
  iso3Code: string;
  name: string;
  nameAr: string | null;
  officialName: string | null;
  region: string | null;
  subregion: string | null;
  defaultCurrencyCode: string | null;
  defaultLanguageCode: string | null;
  callingCode: string | null;
  flagAssetId: string | null;
  isActive: boolean;
  lifecycleState: string;
  versionNumber: number;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  metadata: unknown;
}

interface DbCurrency {
  id: string;
  isoCode: string;
  numericCode: string | null;
  name: string;
  nameAr: string | null;
  symbol: string | null;
  minorUnit: number | null;
  isActive: boolean;
  lifecycleState: string;
  versionNumber: number;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  metadata: unknown;
}

interface DbLanguage {
  id: string;
  isoCode: string;
  name: string;
  nameAr: string | null;
  nativeName: string | null;
  direction: string;
  isActive: boolean;
  lifecycleState: string;
  versionNumber: number;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  metadata: unknown;
}

interface DbCity {
  id: string;
  countryReferenceId?: string | null;
  countryIso2Code: string;
  name: string;
  nameAr: string | null;
  region: string | null;
  timezone: string | null;
  latitude: number | null;
  longitude: number | null;
  isActive: boolean;
  lifecycleState: string;
  versionNumber: number;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  metadata: unknown;
  administrativeRegionId?: string | null;
  administrativeRegion?: Prisma.AdministrativeRegionGetPayload<{}> | null;
}

interface PrismaReferenceDataPersistenceContext extends AtomicPersistenceContext {
  readonly transactionClient: Prisma.TransactionClient;
}

export class PrismaReferenceDataRepository implements ITransactionalReferenceDataRepository, IReferenceResolutionRepository {
  constructor(private readonly prisma: PrismaClient, private readonly inTransaction = false, private readonly mutationActorId?: string, private readonly mutationCorrelationId?: string) {}

  public async resolveCountryCandidate(
    lookup: ReferenceLookup,
  ): Promise<ReferenceResolutionMatch<ReferenceCountryDto> | null> {
    if (lookup.id) {
      const record = await this.prisma.referenceCountry.findUnique({ where: { id: lookup.id } });
      if (record) return { record: this.mapToCountryDto(record as unknown as DbCountry), method: 'EXACT_ID' };
    }

    if (lookup.standardCode) {
      const code = lookup.standardCode.trim().toUpperCase();
      const record = code.length === 2
        ? await this.prisma.referenceCountry.findUnique({ where: { iso2Code: code } })
        : code.length === 3
          ? await this.prisma.referenceCountry.findUnique({ where: { iso3Code: code } })
          : null;
      if (record) return { record: this.mapToCountryDto(record as unknown as DbCountry), method: 'EXACT_STANDARD_CODE' };
    }

    const metadataMatch = await this.resolveGovernedCandidate(
      'COUNTRY',
      lookup,
      async (id) => {
        const record = await this.prisma.referenceCountry.findUnique({ where: { id } });
        return record ? this.mapToCountryDto(record as unknown as DbCountry) : null;
      },
    );
    return metadataMatch;
  }

  public async resolveRegionCandidate(
    lookup: ReferenceLookup,
  ): Promise<ReferenceResolutionMatch<AdministrativeRegionDto> | null> {
    if (lookup.countryIso2Code && !/^[A-Z]{2}$/.test(lookup.countryIso2Code)) return null;
    if (lookup.id) {
      const record = await this.prisma.administrativeRegion.findUnique({ where: { id: lookup.id } });
      if (record && (!lookup.countryIso2Code || record.countryIso2Code === lookup.countryIso2Code))
        return { record: this.mapToRegionDto(record), method: 'EXACT_ID' };
    }
    if (lookup.standardCode) {
      const code = lookup.standardCode.trim();
      const records = await this.prisma.administrativeRegion.findMany({
        where: { regionCode: { equals: code, mode: 'insensitive' },
          ...(lookup.countryIso2Code ? { countryIso2Code: lookup.countryIso2Code } : {}) },
        take: 2,
      });
      if (records.length === 1) return { record: this.mapToRegionDto(records[0]), method: 'EXACT_STANDARD_CODE' };
    }
    // No national scope means common subdivision labels are ambiguous.
    if (!lookup.countryIso2Code) return null;
    return this.resolveGovernedCandidate('REGION', lookup, id => this.getRegionById(id));
  }

  public async resolveCityCandidate(
    lookup: ReferenceLookup,
  ): Promise<ReferenceResolutionMatch<ReferenceCityDto> | null> {
    // UUID may be resolved globally. An alias/provider key is never an
    // authoritative city identity without its country discriminator.
    if (!lookup.id && !/^[A-Z]{2}$/.test(lookup.countryIso2Code ?? '')) return null;
    if (lookup.countryIso2Code && !/^[A-Z]{2}$/.test(lookup.countryIso2Code)) return null;
    if (lookup.id) {
      const record = await this.prisma.referenceCity.findUnique({
        where: { id: lookup.id },
        include: { administrativeRegion: true },
      });
      if (record && (!lookup.countryIso2Code || record.countryIso2Code === lookup.countryIso2Code))
        return { record: this.mapToCityDto(record as unknown as DbCity), method: 'EXACT_ID' };
    }

    return this.resolveGovernedCandidate(
      'CITY',
      lookup,
      async (id) => {
        const record = await this.prisma.referenceCity.findUnique({
          where: { id },
          include: { administrativeRegion: true },
        });
        return record ? this.mapToCityDto(record as unknown as DbCity) : null;
      },
    );
  }

  public async resolveLanguageCandidate(
    lookup: ReferenceLookup,
  ): Promise<ReferenceResolutionMatch<ReferenceLanguageDto> | null> {
    if (lookup.id) {
      const record = await this.prisma.referenceLanguage.findUnique({ where: { id: lookup.id } });
      if (record) return { record: this.mapToLanguageDto(record as unknown as DbLanguage), method: 'EXACT_ID' };
    }
    if (lookup.standardCode) {
      const code = lookup.standardCode.trim().toLowerCase();
      const record = await this.prisma.referenceLanguage.findUnique({ where: { isoCode: code } });
      if (record) return { record: this.mapToLanguageDto(record as unknown as DbLanguage), method: 'EXACT_STANDARD_CODE' };
    }
    return this.resolveGovernedCandidate(
      'LANGUAGE',
      lookup,
      async (id) => {
        const record = await this.prisma.referenceLanguage.findUnique({ where: { id } });
        return record ? this.mapToLanguageDto(record as unknown as DbLanguage) : null;
      },
    );
  }

  public async resolveCurrencyCandidate(
    lookup: ReferenceLookup,
  ): Promise<ReferenceResolutionMatch<ReferenceCurrencyDto> | null> {
    if (lookup.id) {
      const record = await this.prisma.referenceCurrency.findUnique({ where: { id: lookup.id } });
      if (record) return { record: this.mapToCurrencyDto(record as unknown as DbCurrency), method: 'EXACT_ID' };
    }
    if (lookup.standardCode) {
      const code = lookup.standardCode.trim().toUpperCase();
      const record = await this.prisma.referenceCurrency.findUnique({ where: { isoCode: code } });
      if (record) return { record: this.mapToCurrencyDto(record as unknown as DbCurrency), method: 'EXACT_STANDARD_CODE' };
    }
    return this.resolveGovernedCandidate(
      'CURRENCY',
      lookup,
      async (id) => {
        const record = await this.prisma.referenceCurrency.findUnique({ where: { id } });
        return record ? this.mapToCurrencyDto(record as unknown as DbCurrency) : null;
      },
    );
  }

  private async resolveGovernedCandidate<T>(
    entityType: GovernedReferenceEntityType,
    lookup: ReferenceLookup,
    load: (id: string) => Promise<T | null>,
  ): Promise<ReferenceResolutionMatch<T> | null> {
    // Resolve nationality before candidate limiting. Applying a country check
    // only after LIMIT 2 could discard the correct city from a common alias.
    const ownerScope = entityType === 'CITY' ? Prisma.sql`
      AND "referenceId" IN (
        SELECT "id" FROM "ReferenceCity" WHERE "countryIso2Code" = ${lookup.countryIso2Code}
      )` : entityType === 'REGION' ? Prisma.sql`
      AND "referenceId" IN (
        SELECT "id" FROM "AdministrativeRegion" WHERE "countryIso2Code" = ${lookup.countryIso2Code}
      )` : Prisma.empty;
    if (lookup.providerSystem && lookup.providerId) {
      const providerSystem = lookup.providerSystem.trim().toLowerCase();
      const providerId = lookup.providerId.trim().toLowerCase();
      const rows = await this.prisma.$queryRaw<Array<{ referenceId: string }>>(Prisma.sql`
        SELECT "referenceId"
        FROM "ReferenceProviderMappingRecord"
        WHERE "entityType" = ${entityType}
          AND "isActive" = true
          AND "normalizedProviderSystem" = ${providerSystem}
          AND "normalizedProviderId" = ${providerId}
          ${ownerScope}
        LIMIT 2
      `);
      if (rows.length > 1) return null;
      if (rows.length === 1) {
        const record = await load(rows[0].referenceId);
        if (record) return { record, method: 'PROVIDER_MAPPING' };
      }
    }

    const alias = lookup.normalizedAlias || lookup.alias;
    if (alias) {
      const normalizedAlias = this.normalizeResolutionAlias(alias);
      const rows = await this.prisma.$queryRaw<Array<{ referenceId: string }>>(Prisma.sql`
        SELECT DISTINCT "referenceId"
        FROM "ReferenceAliasRecord"
        WHERE "entityType" = ${entityType}
          AND "isActive" = true
          AND "normalizedAlias" = ${normalizedAlias}
          ${ownerScope}
        LIMIT 2
      `);
      if (rows.length > 1) return null;
      if (rows.length === 1) {
        const record = await load(rows[0].referenceId);
        if (record) return { record, method: 'NORMALIZED_ALIAS' };
      }
    }
    return null;
  }

  private normalizeResolutionAlias(value: string): string {
    return normalizeReferenceIdentityToken(value);
  }

  public async listCountries(filters?: ReferenceDataFilters): Promise<ReferenceCountryDto[]> {
    const where = this.countryWhere(filters);

    const records = await this.prisma.referenceCountry.findMany({
      where,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      ...this.pagination(filters)
    });

    return (records as unknown as DbCountry[]).map(record => this.mapToCountryDto(record));
  }

  public async getCountry(iso2Code: string): Promise<ReferenceCountryDto | null> {
    const record = await this.prisma.referenceCountry.findUnique({
      where: { iso2Code }
    });
    return record ? this.mapToCountryDto(record as unknown as DbCountry) : null;
  }

  public async upsertCountry(data: UpsertReferenceCountryDto): Promise<ReferenceCountryDto> {
    this.rejectLegacyLifecycleMutation(data.isActive);
    const existing = await this.prisma.referenceCountry.findUnique({ where: { iso2Code: data.iso2Code } });
    if (existing) {
      if (data.id && data.id !== existing.id) throw new Error('REFERENCE_EDIT_IDENTITY_MISMATCH');
      await this.lockAndCheckExpectedVersion('COUNTRY', existing.id, data.expectedVersion);
      await this.assertGovernedRecordEditable('COUNTRY', existing.id);
    } else if (data.id || data.expectedVersion !== undefined) {
      throw new Error('REFERENCE_EDIT_TARGET_NOT_FOUND');
    }
    const record = existing
      ? await this.prisma.referenceCountry.update({
          where: { id: existing.id },
          data: {
        iso3Code: data.iso3Code,
        name: data.name,
        nameAr: data.nameAr,
        officialName: data.officialName,
        region: data.region,
        subregion: data.subregion,
        defaultCurrencyCode: data.defaultCurrencyCode,
        defaultLanguageCode: data.defaultLanguageCode,
        callingCode: data.callingCode,
        flagAssetId: data.flagAssetId,
        metadata: data.metadata as any
          },
        })
      : await this.prisma.referenceCountry.create({
          data: {
        iso2Code: data.iso2Code,
        iso3Code: data.iso3Code,
        name: data.name,
        nameAr: data.nameAr,
        officialName: data.officialName,
        region: data.region,
        subregion: data.subregion,
        defaultCurrencyCode: data.defaultCurrencyCode,
        defaultLanguageCode: data.defaultLanguageCode,
        callingCode: data.callingCode,
        flagAssetId: data.flagAssetId,
        isActive: true,
        metadata: data.metadata as any
          },
        });
    const governance = await this.finalizeGovernedUpsert('COUNTRY', record.id, data, data.aliases, data.providerMappings, Boolean(existing));
    return this.mapToCountryDto({ ...(record as unknown as DbCountry), ...governance });
  }

  public upsertCountryInTransaction(data: UpsertReferenceCountryDto, context: AtomicPersistenceContext, actorId?: string, correlationId?: string): Promise<ReferenceCountryDto> {
    return this.transactionRepository(context, actorId, correlationId).upsertCountry(data);
  }

  public async listCurrencies(filters?: ReferenceDataFilters): Promise<ReferenceCurrencyDto[]> {
    const where = this.currencyWhere(filters);

    const records = await this.prisma.referenceCurrency.findMany({
      where,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      ...this.pagination(filters)
    });

    return (records as unknown as DbCurrency[]).map(record => this.mapToCurrencyDto(record));
  }

  public async getCurrency(isoCode: string): Promise<ReferenceCurrencyDto | null> {
    const record = await this.prisma.referenceCurrency.findUnique({
      where: { isoCode }
    });
    return record ? this.mapToCurrencyDto(record as unknown as DbCurrency) : null;
  }

  public async upsertCurrency(data: UpsertReferenceCurrencyDto): Promise<ReferenceCurrencyDto> {
    this.rejectLegacyLifecycleMutation(data.isActive);
    const existing = await this.prisma.referenceCurrency.findUnique({ where: { isoCode: data.isoCode } });
    if (existing) {
      if (data.id && data.id !== existing.id) throw new Error('REFERENCE_EDIT_IDENTITY_MISMATCH');
      await this.lockAndCheckExpectedVersion('CURRENCY', existing.id, data.expectedVersion);
      await this.assertGovernedRecordEditable('CURRENCY', existing.id);
    } else if (data.id || data.expectedVersion !== undefined) {
      throw new Error('REFERENCE_EDIT_TARGET_NOT_FOUND');
    }
    const record = existing
      ? await this.prisma.referenceCurrency.update({
          where: { id: existing.id },
          data: {
        numericCode: data.numericCode,
        name: data.name,
        nameAr: data.nameAr,
        symbol: data.symbol,
        minorUnit: data.minorUnit,
        metadata: data.metadata as any
          },
        })
      : await this.prisma.referenceCurrency.create({
          data: {
        isoCode: data.isoCode,
        numericCode: data.numericCode,
        name: data.name,
        nameAr: data.nameAr,
        symbol: data.symbol,
        minorUnit: data.minorUnit,
        isActive: true,
        metadata: data.metadata as any
          },
        });
    const governance = await this.finalizeGovernedUpsert('CURRENCY', record.id, data, data.aliases, data.providerMappings, Boolean(existing));
    return this.mapToCurrencyDto({ ...(record as unknown as DbCurrency), ...governance });
  }

  public upsertCurrencyInTransaction(data: UpsertReferenceCurrencyDto, context: AtomicPersistenceContext, actorId?: string, correlationId?: string): Promise<ReferenceCurrencyDto> {
    return this.transactionRepository(context, actorId, correlationId).upsertCurrency(data);
  }

  public async listLanguages(filters?: ReferenceDataFilters): Promise<ReferenceLanguageDto[]> {
    const where = this.languageWhere(filters);

    const records = await this.prisma.referenceLanguage.findMany({
      where,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      ...this.pagination(filters)
    });

    return (records as unknown as DbLanguage[]).map(record => this.mapToLanguageDto(record));
  }

  public async getLanguage(isoCode: string): Promise<ReferenceLanguageDto | null> {
    const record = await this.prisma.referenceLanguage.findUnique({
      where: { isoCode }
    });
    return record ? this.mapToLanguageDto(record as unknown as DbLanguage) : null;
  }

  public async upsertLanguage(data: UpsertReferenceLanguageDto): Promise<ReferenceLanguageDto> {
    this.rejectLegacyLifecycleMutation(data.isActive);
    const existing = await this.prisma.referenceLanguage.findUnique({ where: { isoCode: data.isoCode } });
    if (existing) {
      if (data.id && data.id !== existing.id) throw new Error('REFERENCE_EDIT_IDENTITY_MISMATCH');
      await this.lockAndCheckExpectedVersion('LANGUAGE', existing.id, data.expectedVersion);
      await this.assertGovernedRecordEditable('LANGUAGE', existing.id);
    } else if (data.id || data.expectedVersion !== undefined) {
      throw new Error('REFERENCE_EDIT_TARGET_NOT_FOUND');
    }
    const record = existing
      ? await this.prisma.referenceLanguage.update({
          where: { id: existing.id },
          data: {
        name: data.name,
        nameAr: data.nameAr,
        nativeName: data.nativeName,
        direction: data.direction,
        metadata: data.metadata as any
          },
        })
      : await this.prisma.referenceLanguage.create({
          data: {
        isoCode: data.isoCode,
        name: data.name,
        nameAr: data.nameAr,
        nativeName: data.nativeName,
        direction: data.direction,
        isActive: true,
        metadata: data.metadata as any
          },
        });
    const governance = await this.finalizeGovernedUpsert('LANGUAGE', record.id, data, data.aliases, data.providerMappings, Boolean(existing));
    return this.mapToLanguageDto({ ...(record as unknown as DbLanguage), ...governance });
  }

  public upsertLanguageInTransaction(data: UpsertReferenceLanguageDto, context: AtomicPersistenceContext, actorId?: string, correlationId?: string): Promise<ReferenceLanguageDto> {
    return this.transactionRepository(context, actorId, correlationId).upsertLanguage(data);
  }

  public async listCities(filters?: ReferenceDataFilters): Promise<ReferenceCityDto[]> {
    const where = this.cityWhere(filters);

    const records = await this.prisma.referenceCity.findMany({
      where,
      include: {
        administrativeRegion: true
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      ...this.pagination(filters)
    });

    return (records as unknown as DbCity[]).map(record => this.mapToCityDto(record));
  }

  public async listRegions(filters?: ReferenceDataFilters): Promise<AdministrativeRegionDto[]> {
    const records = await this.prisma.administrativeRegion.findMany({
      where: this.regionWhere(filters),
      orderBy: [{ countryIso2Code: 'asc' }, { name: 'asc' }, { id: 'asc' }],
      ...this.pagination(filters)
    });
    return records.map((record) => this.mapToRegionDto(record));
  }

  public async getRegionById(id: string): Promise<AdministrativeRegionDto | null> {
    const record = await this.prisma.administrativeRegion.findUnique({ where: { id } });
    if (!record) return null;
    const aliases = await this.prisma.referenceAliasRecord.findMany({
      where: { entityType: 'REGION', referenceId: id, isActive: true },
      orderBy: [{ normalizedAlias: 'asc' }, { id: 'asc' }],
      select: { alias: true, locale: true, aliasType: true },
    });
    return { ...this.mapToRegionDto(record), aliases: aliases.map(alias => ({ ...alias, aliasType: alias.aliasType as ReferenceAliasInput['aliasType'] })) };
  }

  public async upsertRegion(data: UpsertAdministrativeRegionDto, actorId: string): Promise<AdministrativeRegionDto> {
    if (!actorId) throw new Error('AUTHENTICATED_ADMIN_ACTOR_REQUIRED');
    if (!this.inTransaction) return this.prisma.$transaction(tx => new PrismaReferenceDataRepository(tx as unknown as PrismaClient, true).upsertRegion(data, actorId));
    const id = data.id ?? randomUUID();
    await this.prisma.$queryRaw(Prisma.sql`SELECT "id" FROM "ReferenceCountry" WHERE "iso2Code" = ${data.countryIso2Code} FOR SHARE`);
    const country = await this.prisma.referenceCountry.findUnique({ where: { iso2Code: data.countryIso2Code } });
    if (!country || country.lifecycleState !== 'ACTIVE') throw new ReferenceRegionCommandError('REGION_COUNTRY_INACTIVE');
    const now = new Date();
    const fields = { name: data.name.trim(), nameAr: data.nameAr, localName: data.localName, regionType: data.regionType, countryReferenceId: country.id };
    if (data.expectedVersion !== undefined) {
      await this.lockRegion(id);
      const current = await this.prisma.administrativeRegion.findUnique({ where: { id } });
      if (!current) throw new ReferenceRegionCommandError('REGION_NOT_FOUND');
      if (current.countryIso2Code !== data.countryIso2Code || current.regionCode !== data.regionCode) throw new ReferenceRegionCommandError('REGION_IDENTITY_IMMUTABLE');
      if (current.versionNumber !== data.expectedVersion) throw new ReferenceRegionCommandError('REGION_VERSION_CONFLICT');
      if (current.lifecycleState !== 'ACTIVE') throw new ReferenceRegionCommandError('REGION_NOT_ACTIVE');
      await this.prisma.administrativeRegion.update({
        where: { id }, data: { ...fields, versionNumber: { increment: 1 }, effectiveFrom: now },
      });
    } else {
      try {
        await this.prisma.administrativeRegion.create({ data: { id, ...fields, countryIso2Code: data.countryIso2Code, regionCode: data.regionCode } });
      } catch (error) {
        if (this.isUniqueConstraintViolation(error)) throw new ReferenceRegionCommandError('REGION_CODE_CONFLICT');
        throw error;
      }
    }
    await this.replaceAliases('REGION', id, data.aliases);
    const result = await this.getRegionById(id);
    if (!result) throw new ReferenceRegionCommandError('REGION_NOT_FOUND');
    const persisted = await this.prisma.administrativeRegion.findUnique({ where: { id } });
    await this.appendVersionRecord('REGION', id, result.versionNumber, result.lifecycleState, result.effectiveFrom, result.effectiveTo ?? null,
      { ...persisted, aliases: result.aliases }, data.expectedVersion === undefined ? 'CREATE' : 'UPDATE', actorId);
    return result;
  }

  public upsertRegionInTransaction(data: UpsertAdministrativeRegionDto, actorId: string, context: AtomicPersistenceContext): Promise<AdministrativeRegionDto> {
    return this.transactionRepository(context).upsertRegion(data, actorId);
  }

  private async lockRegion(id: string): Promise<void> {
    await this.prisma.$queryRaw(Prisma.sql`SELECT "id" FROM "AdministrativeRegion" WHERE "id" = ${id} FOR UPDATE`);
  }

  private async assertNoReplacementCycle(entityType: GovernedReferenceEntityType, sourceId: string, targetId: string): Promise<void> {
    // Owner-scoped graph traversal: never follow links across entity types.
    const result = await this.prisma.$queryRaw<Array<{ referenceId: string }>>(Prisma.sql`
      WITH RECURSIVE walk("referenceId") AS (
        SELECT "targetReferenceId" FROM "ReferenceRelationshipRecord"
        WHERE "sourceEntityType" = ${entityType} AND "targetEntityType" = ${entityType}
          AND "sourceReferenceId" = ${targetId}
        UNION
        SELECT link."targetReferenceId" FROM "ReferenceRelationshipRecord" link
        JOIN walk ON walk."referenceId" = link."sourceReferenceId"
        WHERE link."sourceEntityType" = ${entityType} AND link."targetEntityType" = ${entityType}
      )
      SELECT "referenceId" FROM walk WHERE "referenceId" = ${sourceId} LIMIT 1
    `);
    if (result.length) throw new Error('REFERENCE_REPLACEMENT_RELATIONSHIP_CYCLE');
  }

  private async transitionRegion(command: ReferenceLifecycleTransitionCommand): Promise<void> {
    if (!command.actorId) throw new Error('AUTHENTICATED_ADMIN_ACTOR_REQUIRED');
    if (!this.inTransaction) return this.prisma.$transaction(tx => new PrismaReferenceDataRepository(tx as unknown as PrismaClient, true).transitionRegion(command));
    await this.lockRegion(command.referenceId);
    const current = await this.prisma.administrativeRegion.findUnique({ where: { id: command.referenceId } });
    if (!current) throw new ReferenceRegionCommandError('REGION_NOT_FOUND');
    if (current.versionNumber !== command.expectedVersion) throw new ReferenceRegionCommandError('REGION_VERSION_CONFLICT');
    try { assertReferenceLifecycleTransition(current.lifecycleState as ReferenceLifecycleState, command.toState, command.targetReferenceId); }
    catch { throw new ReferenceRegionCommandError('REGION_TRANSITION_INVALID'); }
    if ([ReferenceLifecycleState.ARCHIVED, ReferenceLifecycleState.MERGED, ReferenceLifecycleState.SUPERSEDED].includes(command.toState)) {
      // The FK inventory does not include all university/source/public consumers.
      // Even a zero FK count cannot authorize destructive terminal transitions.
      // Use the same owner boundary as the generic reference types.
      throw new ReferenceRegionCommandError('REGION_IMPACT_CERTIFICATION_REQUIRED');
    }
    if (command.targetReferenceId) {
      if (![ReferenceLifecycleState.MERGED, ReferenceLifecycleState.SUPERSEDED].includes(command.toState) || command.targetReferenceId === current.id) throw new ReferenceRegionCommandError('REGION_TARGET_INVALID');
      await this.prisma.$queryRaw(Prisma.sql`SELECT "id" FROM "AdministrativeRegion" WHERE "id" = ${command.targetReferenceId} FOR SHARE`);
      const target = await this.prisma.administrativeRegion.findUnique({ where: { id: command.targetReferenceId } });
      if (!target || target.countryIso2Code !== current.countryIso2Code || target.lifecycleState !== 'ACTIVE') throw new ReferenceRegionCommandError('REGION_TARGET_INVALID');
      await this.assertNoReplacementCycle('REGION', current.id, target.id);
      await this.prisma.referenceRelationshipRecord.create({ data: {
        sourceEntityType: 'REGION', sourceReferenceId: current.id,
        targetEntityType: 'REGION', targetReferenceId: target.id,
        relationshipType: command.toState === ReferenceLifecycleState.MERGED ? 'MERGED_INTO' : 'SUPERSEDED_BY',
        reason: command.reason, actorId: command.actorId,
      } });
    }
    const now = new Date();
    const record = await this.prisma.administrativeRegion.update({ where: { id: current.id }, data: {
      lifecycleState: command.toState, isActive: false, versionNumber: { increment: 1 }, effectiveFrom: now, effectiveTo: now,
    } });
    const detail = await this.getRegionById(record.id);
    await this.appendVersionRecord('REGION', record.id, record.versionNumber, command.toState, now, null, { ...record, aliases: detail?.aliases ?? [] }, command.reason, command.actorId);
  }

  private countryWhere(filters?: ReferenceDataFilters): Prisma.ReferenceCountryWhereInput {
    const where: {
      isActive?: boolean;
      region?: string;
      OR?: Array<{
        nameAr?: { contains: string; mode: 'insensitive' };
        name?: { contains: string; mode: 'insensitive' };
        officialName?: { contains: string; mode: 'insensitive' };
        iso2Code?: { contains: string; mode: 'insensitive' };
        iso3Code?: { contains: string; mode: 'insensitive' };
      }>;
    } = {};

    if (filters?.activeOnly) {
      where.isActive = true;
      Object.assign(where, { lifecycleState: 'ACTIVE' });
    }
    if (filters?.nonActiveOnly) {
      // Non-active is exactly the complement of canonical public selectability:
      // older rows may have isActive=false while lifecycleState remains ACTIVE.
      Object.assign(where, { NOT: { AND: [{ lifecycleState: 'ACTIVE' }, { isActive: true }] } });
    }
    if (filters?.region) {
      where.region = filters.region;
    }
    if (filters?.q) {
      where.OR = [
        { name: { contains: filters.q, mode: 'insensitive' } },
        { nameAr: { contains: filters.q, mode: 'insensitive' } },
        { officialName: { contains: filters.q, mode: 'insensitive' } },
        { iso2Code: { contains: filters.q, mode: 'insensitive' } },
        { iso3Code: { contains: filters.q, mode: 'insensitive' } }
      ];
    }

    return where;
  }

  private currencyWhere(filters?: ReferenceDataFilters): Prisma.ReferenceCurrencyWhereInput {
    const where: {
      isActive?: boolean;
      OR?: Array<{
        name?: { contains: string; mode: 'insensitive' };
        isoCode?: { contains: string; mode: 'insensitive' };
        symbol?: { contains: string; mode: 'insensitive' };
        numericCode?: { contains: string; mode: 'insensitive' };
      }>;
    } = {};

    if (filters?.activeOnly) {
      where.isActive = true;
      Object.assign(where, { lifecycleState: 'ACTIVE' });
    }
    if (filters?.nonActiveOnly) {
      // Non-active is exactly the complement of canonical public selectability:
      // older rows may have isActive=false while lifecycleState remains ACTIVE.
      Object.assign(where, { NOT: { AND: [{ lifecycleState: 'ACTIVE' }, { isActive: true }] } });
    }
    if (filters?.q) {
      where.OR = [
        { name: { contains: filters.q, mode: 'insensitive' } },
        { isoCode: { contains: filters.q, mode: 'insensitive' } },
        { symbol: { contains: filters.q, mode: 'insensitive' } },
        { numericCode: { contains: filters.q, mode: 'insensitive' } }
      ];
    }

    return where;
  }

  private languageWhere(filters?: ReferenceDataFilters): Prisma.ReferenceLanguageWhereInput {
    const where: {
      isActive?: boolean;
      OR?: Array<{
        name?: { contains: string; mode: 'insensitive' };
        nativeName?: { contains: string; mode: 'insensitive' };
        isoCode?: { contains: string; mode: 'insensitive' };
      }>;
    } = {};

    if (filters?.activeOnly) {
      where.isActive = true;
      Object.assign(where, { lifecycleState: 'ACTIVE' });
    }
    if (filters?.nonActiveOnly) {
      // Non-active is exactly the complement of canonical public selectability:
      // older rows may have isActive=false while lifecycleState remains ACTIVE.
      Object.assign(where, { NOT: { AND: [{ lifecycleState: 'ACTIVE' }, { isActive: true }] } });
    }
    if (filters?.q) {
      where.OR = [
        { name: { contains: filters.q, mode: 'insensitive' } },
        { nativeName: { contains: filters.q, mode: 'insensitive' } },
        { isoCode: { contains: filters.q, mode: 'insensitive' } }
      ];
    }

    return where;
  }

  private cityWhere(filters?: ReferenceDataFilters): Prisma.ReferenceCityWhereInput {
    const where: Prisma.ReferenceCityWhereInput = {};

    if (filters?.administrativeRegionId) {
      where.administrativeRegionId = filters.administrativeRegionId;
    }

    if (filters?.activeOnly) {
      where.isActive = true;
      Object.assign(where, { lifecycleState: 'ACTIVE' });
    }
    if (filters?.nonActiveOnly) {
      // Non-active is exactly the complement of canonical public selectability:
      // older rows may have isActive=false while lifecycleState remains ACTIVE.
      Object.assign(where, { NOT: { AND: [{ lifecycleState: 'ACTIVE' }, { isActive: true }] } });
    }
    if (filters?.countryIso2Code) {
      where.countryIso2Code = filters.countryIso2Code;
    }
    if (filters?.region) {
      where.region = filters.region;
    }
    if (filters?.q) {
      where.OR = [
        { name: { contains: filters.q, mode: 'insensitive' } },
        { timezone: { contains: filters.q, mode: 'insensitive' } }
      ];
    }

    return where;
  }

  private regionWhere(filters?: ReferenceDataFilters): Prisma.AdministrativeRegionWhereInput {
    return {
      ...(filters?.activeOnly ? { lifecycleState: 'ACTIVE', isActive: true,
        countryReference: { lifecycleState: 'ACTIVE', isActive: true } } : {}),
      ...(filters?.nonActiveOnly ? { NOT: { AND: [
        { lifecycleState: 'ACTIVE' }, { isActive: true },
        { countryReference: { lifecycleState: 'ACTIVE', isActive: true } },
      ] } } : {}),
      ...(filters?.countryIso2Code ? { countryIso2Code: filters.countryIso2Code } : {}),
      ...(filters?.q ? { OR: [{ name: { contains: filters.q, mode: 'insensitive' as const } }, { regionCode: { contains: filters.q, mode: 'insensitive' as const } }] } : {}),
    };
  }

  public countRecords(collection: ReferenceDataCollection, filters: ReferenceDataFilters): Promise<number> {
    switch (collection) {
      case 'countries': return this.prisma.referenceCountry.count({ where: this.countryWhere(filters) });
      case 'currencies': return this.prisma.referenceCurrency.count({ where: this.currencyWhere(filters) });
      case 'languages': return this.prisma.referenceLanguage.count({ where: this.languageWhere(filters) });
      case 'cities': return this.prisma.referenceCity.count({ where: this.cityWhere(filters) });
      case 'regions': return this.prisma.administrativeRegion.count({ where: this.regionWhere(filters) });
    }
  }

  private pagination(filters?: ReferenceDataFilters): { skip?: number; take?: number } {
    if (!filters?.page && !filters?.pageSize) return {};
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 50));
    return { skip: (page - 1) * pageSize, take: pageSize };
  }

  public async upsertCity(data: UpsertReferenceCityDto): Promise<ReferenceCityDto> {
    if (data.administrativeRegionId && !this.inTransaction) {
      return this.prisma.$transaction(tx => new PrismaReferenceDataRepository(tx as unknown as PrismaClient, true).upsertCity(data));
    }
    if (data.administrativeRegionId) {
      await this.lockRegion(data.administrativeRegionId);
      const region = await this.prisma.administrativeRegion.findUnique({ where: { id: data.administrativeRegionId } });
      if (!region || region.lifecycleState !== 'ACTIVE' || region.countryIso2Code !== data.countryIso2Code) throw new ReferenceRegionCommandError('REGION_NOT_ACTIVE');
    }
    this.rejectLegacyLifecycleMutation(data.isActive);
    const canonicalCountry = data.countryReferenceId
      ? await this.prisma.referenceCountry.findUnique({ where: { id: data.countryReferenceId } })
      : await this.prisma.referenceCountry.findUnique({ where: { iso2Code: data.countryIso2Code } });
    if (!canonicalCountry || canonicalCountry.iso2Code !== data.countryIso2Code) {
      throw new Error('REFERENCE_CITY_CANONICAL_COUNTRY_MISMATCH');
    }
    const canonicalIdentityKey = this.cityCanonicalIdentityKey(data);
    if (data.id || data.expectedVersion !== undefined) {
      if (!data.id) throw new Error('REFERENCE_CITY_EDIT_ID_REQUIRED');
      await this.lockAndCheckExpectedVersion('CITY', data.id, data.expectedVersion);
      const current = await this.prisma.referenceCity.findUnique({
        where: { id: data.id }, include: { administrativeRegion: true },
      });
      if (!current || current.countryIso2Code !== data.countryIso2Code ||
          current.countryReferenceId !== canonicalCountry.id)
        throw new Error('REFERENCE_CITY_EDIT_COUNTRY_IMMUTABLE');
      if ((current.administrativeRegionId ?? null) !== (data.administrativeRegionId ?? null) ||
          normalizeReferenceIdentityToken(current.region ?? '') !== normalizeReferenceIdentityToken(data.region ?? ''))
        throw new Error('REFERENCE_CITY_EDIT_REGION_IMMUTABLE');
      const occupant = await this.prisma.referenceCity.findUnique({ where: { canonicalIdentityKey }, select: { id: true } });
      if (occupant && occupant.id !== data.id) throw new Error('REFERENCE_CITY_IDENTITY_COLLISION_REVIEW_REQUIRED');
      await this.assertGovernedRecordEditable('CITY', data.id);
      const record = await this.prisma.referenceCity.update({
        where: { id: data.id },
        data: { canonicalIdentityKey, name: data.name, nameAr: data.nameAr, timezone: data.timezone,
          latitude: data.latitude, longitude: data.longitude, metadata: data.metadata as any },
        include: { administrativeRegion: true },
      });
      const governance = await this.finalizeGovernedUpsert('CITY', record.id, data, data.aliases, data.providerMappings, true);
      return this.mapToCityDto({ ...(record as unknown as DbCity), ...governance });
    }
    const updateData = {
      countryReferenceId: canonicalCountry.id,
      name: data.name,
      nameAr: data.nameAr,
      region: data.region,
      timezone: data.timezone,
      latitude: data.latitude,
      longitude: data.longitude,
      administrativeRegionId: data.administrativeRegionId,
      metadata: data.metadata as any,
    };

    const keyed = await this.prisma.referenceCity.findUnique({
      where: { canonicalIdentityKey },
      include: { administrativeRegion: true },
    });
    // Old W3 keys were ASCII/Arabic only. Never silently create another UUID
    // when a previously keyed record may represent this same scoped city.
    if (!keyed) {
      const legacyKey = this.legacyCityCanonicalIdentityKey(data);
      if (legacyKey !== canonicalIdentityKey) {
        const legacy = await this.prisma.referenceCity.findUnique({ where: { canonicalIdentityKey: legacyKey }, select: { id: true } });
        if (legacy) throw new Error('REFERENCE_CITY_IDENTITY_RECONCILIATION_REQUIRED');
      }
    }
    if (keyed) {
      if (this.mutationActorId) throw new Error('REFERENCE_CITY_EXISTING_EDIT_ID_AND_VERSION_REQUIRED');
      await this.assertGovernedRecordEditable('CITY', keyed.id);
      const record = await this.prisma.referenceCity.update({
        where: { id: keyed.id },
        data: updateData,
        include: { administrativeRegion: true },
      });
      const governance = await this.finalizeGovernedUpsert('CITY', record.id, data, data.aliases, data.providerMappings, true);
      return this.mapToCityDto({ ...(record as unknown as DbCity), ...governance });
    }

    // Compatibility bridge for pre-W3 rows. Existing rows intentionally remain
    // NULL until Google Studio duplicate inspection/backfill is approved. A
    // legacy row is claimed only when its canonical identity is unambiguous.
    const legacyRegionScope = data.administrativeRegionId
      ? { administrativeRegionId: data.administrativeRegionId }
      : {
          administrativeRegionId: null,
          region: data.region == null
            ? null
            : { equals: data.region, mode: 'insensitive' as const },
        };
    const legacyMatches = await this.prisma.referenceCity.findMany({
      where: {
        canonicalIdentityKey: null,
        countryIso2Code: data.countryIso2Code,
        name: { equals: data.name, mode: 'insensitive' },
        ...legacyRegionScope,
      },
      include: { administrativeRegion: true },
      take: 2,
    });
    if (legacyMatches.length > 1) {
      throw new Error('REFERENCE_CITY_LEGACY_IDENTITY_AMBIGUOUS');
    }

    if (legacyMatches.length === 1) {
      if (this.mutationActorId) throw new Error('REFERENCE_CITY_LEGACY_IDENTITY_REVIEW_REQUIRED');
      await this.assertGovernedRecordEditable('CITY', legacyMatches[0].id);
      try {
        const record = await this.prisma.referenceCity.update({
          where: { id: legacyMatches[0].id },
          data: { canonicalIdentityKey, ...updateData },
          include: { administrativeRegion: true },
        });
        const governance = await this.finalizeGovernedUpsert('CITY', record.id, data, data.aliases, data.providerMappings, true);
      return this.mapToCityDto({ ...(record as unknown as DbCity), ...governance });
      } catch (error) {
        // Another writer may have claimed the same canonical identity between
        // lookup and update. Resolve to the unique keyed row rather than
        // creating a duplicate or updating an arbitrary legacy row.
        if (!this.isUniqueConstraintViolation(error)) throw error;
        const winner = await this.prisma.referenceCity.findUnique({
          where: { canonicalIdentityKey },
          include: { administrativeRegion: true },
        });
        if (!winner) throw error;
        if (this.mutationActorId) throw new Error('REFERENCE_CITY_EXISTING_EDIT_ID_AND_VERSION_REQUIRED');
        await this.assertGovernedRecordEditable('CITY', winner.id);
        const record = await this.prisma.referenceCity.update({
          where: { id: winner.id },
          data: updateData,
          include: { administrativeRegion: true },
        });
        const governance = await this.finalizeGovernedUpsert('CITY', record.id, data, data.aliases, data.providerMappings, true);
      return this.mapToCityDto({ ...(record as unknown as DbCity), ...governance });
      }
    }

    // Create only: concurrent creation of an existing canonical identity
    // must raise a reviewable collision, never silently update a different UUID.
    const record = await this.prisma.referenceCity.create({
      data: {
        canonicalIdentityKey,
        countryIso2Code: data.countryIso2Code,
        ...updateData,
        isActive: true,
      },
      include: { administrativeRegion: true },
    }).catch((error: unknown) => {
      if (this.isUniqueConstraintViolation(error)) throw new Error('REFERENCE_CITY_IDENTITY_COLLISION_REVIEW_REQUIRED');
      throw error;
    });
    const governance = await this.finalizeGovernedUpsert('CITY', record.id, data, data.aliases, data.providerMappings, false);
    return this.mapToCityDto({ ...(record as unknown as DbCity), ...governance });
  }


  /** Read existing P6 SCREENING_ONLY receipts for P7 review triage.
   * This intentionally does not read or infer any operator approval state
   * from a P6 validation result and never modifies canonical records.
   */
  public async listImportScreeningReviews(
    page: number, pageSize: number,
  ): Promise<ReferenceImportScreeningReviewPage> {
    if (!Number.isSafeInteger(page) || page < 1 || page > 100000 ||
        !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 50)
      throw new Error('REFERENCE_IMPORT_REVIEW_PAGINATION_INVALID');
    const where = { ownerDomain: 'REFERENCE_DATA' };
    const [total, receipts] = await Promise.all([
      this.prisma.importScreeningReceipt.count({ where }),
      this.prisma.importScreeningReceipt.findMany({
        where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize, take: pageSize,
        select: { id: true, handoffKey: true, createdAt: true, result: true },
      }),
    ]);
    const safeText = (v: unknown): string | null =>
      typeof v === 'string' && v.length > 0 && v.length <= 300 ? v : null;
    const choices = new Set(['COUNTRY', 'CURRENCY', 'LANGUAGE', 'CITY']);
    const data = receipts.map(receipt => {
      const raw: Record<string, unknown> =
        receipt.result && typeof receipt.result === 'object' && !Array.isArray(receipt.result)
          ? receipt.result as Record<string, unknown> : {};
      const state = raw.state === 'NEEDS_OWNER_REVIEW' || raw.state === 'INVALID'
        ? raw.state : 'UNKNOWN';
      const entityType = typeof raw.entityType === 'string' && choices.has(raw.entityType)
        ? raw.entityType as 'COUNTRY' | 'CURRENCY' | 'LANGUAGE' | 'CITY' : null;
      const issues = Array.isArray(raw.issues) ? raw.issues : [];
      const evidence = {
        state, entityType, canonicalKey: safeText(raw.deterministicKey),
        normalizedPayloadHash: safeText(raw.normalizedPayloadHash),
        sourceArtifactId: safeText(raw.sourceArtifactId),
        sourceContentHash: safeText(raw.sourceContentHash),
        issueCodes: issues.slice(0, 30).map(issue =>
          issue && typeof issue === 'object' && 'code' in issue ? safeText(issue.code) : null)
          .filter((code): code is string => Boolean(code)),
      };
      return {
        receiptId: receipt.id, handoffKey: receipt.handoffKey, screenedAt: receipt.createdAt,
        ...evidence, triage: classifyReferenceImportTriage(evidence),
        reviewed: false as const, approved: false as const, applied: false as const,
      };
    });
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize),
      applyAvailable: false };
  }

  /** Owner-backed, active-only alias and provider mapping inspection. */
  public async getReferenceGovernanceDetails(
    entityType: GovernedReferenceEntityType, referenceId: string,
  ): Promise<ReferenceGovernanceDetails> {
    const [aliases, mappings] = await Promise.all([
      this.prisma.referenceAliasRecord.findMany({
        where: { entityType, referenceId, isActive: true },
        orderBy: [{ normalizedAlias: 'asc' }, { id: 'asc' }],
        select: { alias: true, normalizedAlias: true, locale: true, aliasType: true },
        take: 101,
      }),
      this.prisma.referenceProviderMappingRecord.findMany({
        where: { entityType, referenceId, isActive: true },
        orderBy: [{ normalizedProviderSystem: 'asc' }, { normalizedProviderId: 'asc' }],
        select: { providerSystem: true, providerId: true },
        take: 101,
      }),
    ]);
    if (aliases.length > 100 || mappings.length > 100) {
      throw new Error('REFERENCE_GOVERNANCE_DETAILS_LIMIT_EXCEEDED');
    }
    // One bounded owner lookup, not one round-trip per alias (N+1).
    // The cap is fail-closed: partial ambiguity evidence must not appear final.
    const uniqueNormalized = Array.from(new Set(aliases.map(a => a.normalizedAlias)));
    let competitors: Array<{ normalizedAlias: string; referenceId: string }> = [];
    if (uniqueNormalized.length && (entityType === 'CITY' || entityType === 'REGION')) {
      // Cities and subdivisions are *country scoped*. Do not warn that an
      // alias used in a different sovereign country is a collision.
      const row = entityType === 'CITY'
        ? await this.prisma.referenceCity.findUnique({
            where: { id: referenceId }, select: { countryIso2Code: true },
          })
        : await this.prisma.administrativeRegion.findUnique({
            where: { id: referenceId }, select: { countryIso2Code: true },
          });
      if (!row) throw new Error('REFERENCE_GOVERNANCE_STATE_UNAVAILABLE');
      const ownerTable = this.referenceTable(entityType);
      competitors = await this.prisma.$queryRaw<Array<{ normalizedAlias: string; referenceId: string }>>(Prisma.sql`
        SELECT alias."normalizedAlias", alias."referenceId"
        FROM "ReferenceAliasRecord" alias
        JOIN ${ownerTable} owner ON owner."id" = alias."referenceId"
        WHERE alias."entityType" = ${entityType} AND alias."isActive" = true
          AND alias."referenceId" <> ${referenceId}
          AND alias."normalizedAlias" IN (${Prisma.join(uniqueNormalized)})
          AND owner."countryIso2Code" = ${row.countryIso2Code}
        LIMIT 2101
      `);
    } else if (uniqueNormalized.length) {
      competitors = await this.prisma.referenceAliasRecord.findMany({
        where: { entityType, normalizedAlias: { in: uniqueNormalized },
          isActive: true, NOT: { referenceId } },
        select: { normalizedAlias: true, referenceId: true }, take: 2101,
      });
    }
    if (competitors.length > 2100) throw new Error('REFERENCE_ALIAS_AMBIGUITY_SCAN_LIMIT');
    const byAlias = new Map<string, Set<string>>();
    for (const row of competitors) {
      const owners = byAlias.get(row.normalizedAlias) ?? new Set<string>();
      owners.add(row.referenceId);
      byAlias.set(row.normalizedAlias, owners);
    }
    const ambiguousAliases: ReferenceGovernanceDetails['ambiguousAliases'] = aliases
      .filter((alias, index, all) =>
        all.findIndex(row => row.normalizedAlias === alias.normalizedAlias) === index &&
        (byAlias.get(alias.normalizedAlias)?.size ?? 0) > 0)
      .map(alias => ({
        alias: alias.alias,
        conflictingReferenceIds: Array.from(byAlias.get(alias.normalizedAlias) ?? []),
      }));
    return {
      entityType,
      referenceId,
      aliases: aliases.map(a => ({ alias: a.alias, locale: a.locale, aliasType: a.aliasType as ReferenceAliasInput['aliasType'] })),
      providerMappings: mappings,
      ambiguousAliases,
    };
  }

  /** Numeric counters from the P7 owner schema, scoped to exactly one country. */

  /** No upward application dependencies: only this Prisma owner projection knows
   * about direct FK-backed relation counts. Non-FK consumers stay UNKNOWN. */
  public async getReferenceDependencyImpact(
    entityType: GovernedReferenceEntityType, referenceId: string,
  ): Promise<ReferenceDependencyImpact> {
    let knownRelationCounts: Record<string, number> | undefined;
    switch (entityType) {
      case 'COUNTRY': {
        const row = await this.prisma.referenceCountry.findUnique({ where: { id: referenceId }, select: {
          _count: { select: {
            universities: true, universityCampuses: true, administrativeRegions: true,
            cities: true, scholarships: true, scholarshipEligibility: true,
            externalCourseProviders: true, internationalTestCountryRelationships: true,
            serviceCatalogCountries: true, careerEmployers: true, careerJobs: true,
          } },
        } });
        knownRelationCounts = row?._count; break;
      }
      case 'CURRENCY': {
        const row = await this.prisma.referenceCurrency.findUnique({ where: { id: referenceId }, select: {
          _count: { select: {
            universityTuitionProfiles: true, universityAccommodationProfiles: true,
            universityLivingCostProfiles: true, scholarshipBenefits: true,
            internationalTestFees: true, studyDestinationLivingCostProfiles: true,
          } },
        } });
        knownRelationCounts = row?._count; break;
      }
      case 'LANGUAGE': {
        const row = await this.prisma.referenceLanguage.findUnique({ where: { id: referenceId }, select: {
          _count: { select: {
            courses: true, scholarships: true, internationalTestLanguageRelationships: true,
            serviceCatalogLanguages: true, studyDestinationProfiles: true,
          } },
        } });
        knownRelationCounts = row?._count; break;
      }
      case 'CITY': {
        const row = await this.prisma.referenceCity.findUnique({ where: { id: referenceId }, select: {
          _count: { select: {
            universities: true, universityCampuses: true, careerEmployers: true, careerJobs: true,
          } },
        } });
        knownRelationCounts = row?._count; break;
      }
      case 'REGION': {
        const row = await this.prisma.administrativeRegion.findUnique({ where: { id: referenceId }, select: {
          _count: { select: { cities: true, universities: true, universityCampuses: true } },
        } });
        knownRelationCounts = row?._count; break;
      }
    }
    if (!knownRelationCounts) throw new Error('REFERENCE_USAGE_TARGET_NOT_FOUND');
    return {
      entityType, referenceId, knownRelationCounts,
      knownTotal: Object.values(knownRelationCounts).reduce((sum, n) => sum + n, 0),
      coverage: 'PARTIAL', unobservedConsumers: 'unknown', terminalSafe: false,
    };
  }

  public async getCityQualityCounters(countryIso2Code: string): Promise<ReferenceCityQualityCounters> {
    const where = { countryIso2Code };
    const [total, active, withoutAdministrativeRegion, withoutTimezone, withoutCanonicalIdentity,
      withoutCountryReference, inconsistentCountryReferenceRows, inconsistentRegionRows] = await Promise.all([
      this.prisma.referenceCity.count({ where }),
      this.prisma.referenceCity.count({ where: { ...where, lifecycleState: 'ACTIVE' } }),
      this.prisma.referenceCity.count({ where: { ...where, administrativeRegionId: null } }),
      this.prisma.referenceCity.count({ where: { ...where, timezone: null } }),
      this.prisma.referenceCity.count({ where: { ...where, canonicalIdentityKey: null } }),
      this.prisma.referenceCity.count({ where: { ...where, countryReferenceId: null } }),
      this.prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS "count" FROM "ReferenceCity" c
        LEFT JOIN "ReferenceCountry" country ON country."id" = c."countryReferenceId"
        WHERE c."countryIso2Code" = ${countryIso2Code}
          AND c."countryReferenceId" IS NOT NULL
          AND (country."id" IS NULL OR country."iso2Code" <> c."countryIso2Code")
      `),
      this.prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS "count" FROM "ReferenceCity" c
        LEFT JOIN "AdministrativeRegion" region ON region."id" = c."administrativeRegionId"
        WHERE c."countryIso2Code" = ${countryIso2Code}
          AND c."administrativeRegionId" IS NOT NULL
          AND (region."id" IS NULL OR region."countryIso2Code" <> c."countryIso2Code")
      `),
    ]);
    return { countryIso2Code, total, active,
      withoutAdministrativeRegion, withoutTimezone, withoutCanonicalIdentity,
      withoutCountryReference,
      inconsistentCountryReference: Number(inconsistentCountryReferenceRows[0]?.count ?? 0n),
      inconsistentAdministrativeRegion: Number(inconsistentRegionRows[0]?.count ?? 0n) };
  }

  /** Bounded historical read, newest first, with accurate owner total. */
  public async getReferenceHistoryPage(
    entityType: GovernedReferenceEntityType, referenceId: string, page: number, pageSize: number,
  ): Promise<ReferenceHistoryPage> {
    if (!Number.isSafeInteger(page) || page < 1 || page > 100000 ||
        !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100)
      throw new Error('REFERENCE_HISTORY_PAGINATION_INVALID');
    const where = { entityType, referenceId };
    const [total, rows] = await Promise.all([
      this.prisma.referenceVersionRecord.count({ where }),
      this.prisma.referenceVersionRecord.findMany({
        where, orderBy: [{ versionNumber: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize, take: pageSize,
        select: {
          id: true, entityType: true, referenceId: true, versionNumber: true,
          lifecycleState: true, effectiveFrom: true, effectiveTo: true,
          snapshot: true, changeReason: true, actorId: true, createdAt: true,
        },
      }),
    ]);
    return { page, pageSize, total, totalPages: Math.ceil(total / pageSize),
      data: rows.map(row => ({
        ...row, entityType: row.entityType as GovernedReferenceEntityType,
        lifecycleState: row.lifecycleState as ReferenceLifecycleState,
        snapshot: row.snapshot as Record<string, unknown>,
      })) };
  }

  public async getReferenceHistory(entityType: GovernedReferenceEntityType, referenceId: string): Promise<ReferenceVersionDto[]> {
    const rows = await this.prisma.$queryRaw<Array<{
      id: string; entityType: GovernedReferenceEntityType; referenceId: string; versionNumber: number;
      lifecycleState: string; effectiveFrom: Date; effectiveTo: Date | null; snapshot: unknown;
      changeReason: string | null; actorId: string | null; createdAt: Date;
    }>>(Prisma.sql`
      SELECT "id", "entityType", "referenceId", "versionNumber", "lifecycleState",
             "effectiveFrom", "effectiveTo", "snapshot", "changeReason", "actorId", "createdAt"
      FROM "ReferenceVersionRecord"
      WHERE "entityType" = ${entityType} AND "referenceId" = ${referenceId}
      ORDER BY "versionNumber" ASC
    `);
    return rows.map((row) => ({
      ...row,
      lifecycleState: row.lifecycleState as ReferenceLifecycleState,
      snapshot: row.snapshot as Record<string, unknown>,
    }));
  }

  public async getReplacement(entityType: GovernedReferenceEntityType, referenceId: string): Promise<{
    relationshipType: 'SUPERSEDED_BY' | 'MERGED_INTO'; targetReferenceId: string;
  } | null> {
    const found = await this.prisma.referenceRelationshipRecord.findMany({
      where: {
        sourceEntityType: entityType, targetEntityType: entityType, sourceReferenceId: referenceId,
        relationshipType: { in: ['SUPERSEDED_BY', 'MERGED_INTO'] },
      },
      select: { relationshipType: true, targetReferenceId: true }, take: 2,
    });
    if (found.length > 1) throw new Error('REFERENCE_REPLACEMENT_AMBIGUOUS');
    return found.length === 1
      ? { relationshipType: found[0].relationshipType as 'SUPERSEDED_BY' | 'MERGED_INTO', targetReferenceId: found[0].targetReferenceId }
      : null;
  }

  public async getReferenceRelationships(entityType: GovernedReferenceEntityType, referenceId: string): Promise<ReferenceRelationshipDto[]> {
    const rows = await this.prisma.$queryRaw<Array<ReferenceRelationshipDto & { relationshipType: string }>>(Prisma.sql`
      SELECT "id", "sourceEntityType", "sourceReferenceId", "relationshipType", "targetEntityType",
             "targetReferenceId", "reason", "actorId", "createdAt"
      FROM "ReferenceRelationshipRecord"
      WHERE ("sourceEntityType" = ${entityType} AND "sourceReferenceId" = ${referenceId})
         OR ("targetEntityType" = ${entityType} AND "targetReferenceId" = ${referenceId})
      ORDER BY "createdAt" ASC
    `);
    return rows as ReferenceRelationshipDto[];
  }

  public async transitionReferenceLifecycle(command: ReferenceLifecycleTransitionCommand): Promise<void> {
    if (command.entityType === 'REGION') return this.transitionRegion(command);
    if (!this.inTransaction || !command.actorId || !Number.isSafeInteger(command.expectedVersion) || (command.expectedVersion ?? 0) < 1) throw new Error('REFERENCE_LIFECYCLE_TRANSACTION_AND_EXPECTED_VERSION_REQUIRED');
    if (command.targetReferenceId && !['MERGED', 'SUPERSEDED'].includes(command.toState)) throw new Error('REFERENCE_LIFECYCLE_TARGET_NOT_ALLOWED');
    if (command.targetReferenceId && command.targetReferenceId === command.referenceId) {
      throw new Error('REFERENCE_LIFECYCLE_SELF_TARGET_FORBIDDEN');
    }
    const table = this.referenceTable(command.entityType);
    const currentRows = await this.prisma.$queryRaw<Array<{
      id: string; lifecycleState: string; versionNumber: number; effectiveFrom: Date; effectiveTo: Date | null; snapshot: unknown;
    }>>(Prisma.sql`
      SELECT "id", "lifecycleState", "versionNumber", "effectiveFrom", "effectiveTo", to_jsonb(t) AS "snapshot"
      FROM ${table} t WHERE "id" = ${command.referenceId} LIMIT 1 FOR UPDATE
    `);
    if (currentRows.length !== 1) throw new Error('REFERENCE_LIFECYCLE_REFERENCE_NOT_FOUND');
    if (currentRows[0].versionNumber !== command.expectedVersion) throw new Error('REFERENCE_VERSION_CONFLICT');
    const from = currentRows[0].lifecycleState as ReferenceLifecycleState;
    assertReferenceLifecycleTransition(from, command.toState, command.targetReferenceId);
    // FK impact alone is PARTIAL: non-FK consumers are not inventoried.
    // Keep all terminal states closed until an explicit certified-impact
    // protocol exists. Admin hiding the action is NOT an authorization guard.
    if ([ReferenceLifecycleState.ARCHIVED, ReferenceLifecycleState.MERGED,
      ReferenceLifecycleState.SUPERSEDED].includes(command.toState)) {
      throw new Error('REFERENCE_TERMINAL_IMPACT_CERTIFICATION_REQUIRED');
    }


    if (command.targetReferenceId) {
      const targetRows = await this.prisma.$queryRaw<Array<{ id: string; lifecycleState: string; countryIso2Code?: string }>>(Prisma.sql`
        SELECT "id", "lifecycleState", ${command.entityType === 'CITY' ? Prisma.raw('"countryIso2Code"') : Prisma.raw('NULL::text AS "countryIso2Code"')} FROM ${table} WHERE "id" = ${command.targetReferenceId} LIMIT 1 FOR SHARE
      `);
      if (targetRows.length !== 1 || targetRows[0].lifecycleState !== 'ACTIVE') throw new Error('REFERENCE_LIFECYCLE_TARGET_NOT_ACTIVE');
      if (command.entityType === 'CITY' && targetRows[0].countryIso2Code !== (currentRows[0].snapshot as Record<string, unknown>).countryIso2Code) throw new Error('REFERENCE_LIFECYCLE_TARGET_COUNTRY_MISMATCH');
      await this.assertNoReplacementCycle(command.entityType, command.referenceId, command.targetReferenceId);
    }

    const now = new Date();
    const nextVersion = currentRows[0].versionNumber + 1;
    const updated = await this.prisma.$queryRaw<Array<{ snapshot: unknown }>>(Prisma.sql`
      UPDATE ${table} t
      SET "lifecycleState" = ${command.toState},
          "isActive" = ${lifecycleIsActive(command.toState)},
          "versionNumber" = ${nextVersion},
          "effectiveFrom" = ${now},
          "effectiveTo" = ${lifecycleIsActive(command.toState) ? null : now},
          "updatedAt" = ${now}
      WHERE "id" = ${command.referenceId} AND "versionNumber" = ${command.expectedVersion}
       RETURNING to_jsonb(t) AS "snapshot"
    `);

    if (updated.length !== 1) throw new Error('REFERENCE_VERSION_CONFLICT');
    if (command.targetReferenceId) {
      const relationshipType = command.toState === ReferenceLifecycleState.MERGED ? 'MERGED_INTO' : 'SUPERSEDED_BY';
      await this.prisma.$executeRaw(Prisma.sql`
        INSERT INTO "ReferenceRelationshipRecord"
          ("id", "sourceEntityType", "sourceReferenceId", "relationshipType", "targetEntityType", "targetReferenceId", "reason", "actorId", "createdAt")
        VALUES
          (${randomUUID()}, ${command.entityType}, ${command.referenceId}, ${relationshipType}, ${command.entityType}, ${command.targetReferenceId}, ${command.reason}, ${command.actorId}, ${now})
      `);
    }

    await this.appendVersionRecord(
      command.entityType,
      command.referenceId,
      nextVersion,
      command.toState,
      now,
      null,
      (updated[0]?.snapshot ?? {}) as Record<string, unknown>,
      command.reason,
      command.actorId,
    );
  }


  /** One reviewed reconciliation fixes a NULL canonical-country link while
   * preserving historical city UUID, name and geographic identity. No batch
   * repair/backfill is performed from an admin request.
   */
  public async repairCityCountryLink(command: ReferenceCityCountryLinkRepairCommand): Promise<void> {
    if (!this.inTransaction || !command.actorId || command.reason.trim().length < 3)
      throw new Error('REFERENCE_CITY_REPAIR_REVIEW_REQUIRED');
    const rows = await this.prisma.$queryRaw<Array<{
      id: string; countryIso2Code: string; countryReferenceId: string | null;
      lifecycleState: string; versionNumber: number; administrativeRegionId: string | null;
    }>>(Prisma.sql`
      SELECT "id", "countryIso2Code", "countryReferenceId", "lifecycleState",
        "versionNumber", "administrativeRegionId"
      FROM "ReferenceCity" WHERE "id" = ${command.cityId} LIMIT 1 FOR UPDATE
    `);
    if (rows.length !== 1) throw new Error('REFERENCE_CITY_REPAIR_TARGET_NOT_FOUND');
    const city = rows[0];
    if (city.versionNumber !== command.expectedVersion) throw new Error('REFERENCE_VERSION_CONFLICT');
    if (city.lifecycleState !== 'ACTIVE') throw new Error('REFERENCE_CITY_REPAIR_ACTIVE_ONLY');
    if (city.countryReferenceId !== null) throw new Error('REFERENCE_CITY_REPAIR_NOT_LEGACY_UNLINKED');
    const countries = await this.prisma.$queryRaw<Array<{ id: string; iso2Code: string; lifecycleState: string; isActive: boolean }>>(Prisma.sql`
      SELECT "id", "iso2Code", "lifecycleState", "isActive" FROM "ReferenceCountry"
      WHERE "id" = ${command.countryReferenceId} LIMIT 1 FOR SHARE
    `);
    if (countries.length !== 1 || countries[0].lifecycleState !== 'ACTIVE' || !countries[0].isActive ||
        countries[0].iso2Code !== city.countryIso2Code)
      throw new Error('REFERENCE_CITY_REPAIR_COUNTRY_MISMATCH');
    if (city.administrativeRegionId) {
      const region = await this.prisma.administrativeRegion.findUnique({
        where: { id: city.administrativeRegionId }, select: { countryIso2Code: true },
      });
      if (!region || region.countryIso2Code !== city.countryIso2Code)
        throw new Error('REFERENCE_CITY_REPAIR_REGION_MISMATCH');
    }
    const now = new Date();
    const updated = await this.prisma.$queryRaw<Array<{ snapshot: Record<string, unknown> }>>(Prisma.sql`
      UPDATE "ReferenceCity" c SET "countryReferenceId" = ${command.countryReferenceId},
        "versionNumber" = "versionNumber" + 1, "effectiveFrom" = ${now},
        "effectiveTo" = NULL, "updatedAt" = ${now}
      WHERE "id" = ${command.cityId} AND "versionNumber" = ${command.expectedVersion}
        AND "countryReferenceId" IS NULL
      RETURNING to_jsonb(c) AS "snapshot"
    `);
    if (updated.length !== 1) throw new Error('REFERENCE_VERSION_CONFLICT');
    await this.appendVersionRecord(
      'CITY', city.id, city.versionNumber + 1, ReferenceLifecycleState.ACTIVE,
      now, null,
      { ...updated[0].snapshot, linkedCountryId: command.countryReferenceId,
        reason: command.reason.trim(), mutationCorrelationId: this.mutationCorrelationId ?? null },
      'CITY_COUNTRY_LINK_RECONCILED', command.actorId,
    );
  }

  public repairCityCountryLinkInTransaction(
    command: ReferenceCityCountryLinkRepairCommand, context: AtomicPersistenceContext,
    correlationId?: string,
  ): Promise<void> {
    return this.transactionRepository(context, command.actorId, correlationId).repairCityCountryLink(command);
  }

  /** Atomic mapping owner transfer. The existing version records double as an
   * append-only, per-source durable replay receipt; there is no owner change
   * through replaceProviderMappings/ON CONFLICT.
   */
  public async reassignProviderMapping(command: ReferenceProviderMappingReassignmentCommand): Promise<void> {
    if (!this.inTransaction) throw new Error('REFERENCE_MAPPING_ATOMIC_TRANSACTION_REQUIRED');
    if (command.fromReferenceId === command.toReferenceId) throw new Error('REFERENCE_MAPPING_SELF_TRANSFER');
    if (!command.actorId || !command.reason.trim() || !command.reconciliationId) throw new Error('REFERENCE_MAPPING_REVIEW_CONTEXT_REQUIRED');
    const table = this.referenceTable(command.entityType);
    const sourceId = command.fromReferenceId;
    const targetId = command.toReferenceId;
    const providerSystem = command.providerSystem.trim().toLowerCase();
    const providerId = command.providerId.trim().toLowerCase();

    // Consistent row-lock ordering avoids deadlocks in crossing ownership moves.
    const owners = await this.prisma.$queryRaw<Array<{ id: string; lifecycleState: string; versionNumber: number }>>(Prisma.sql`
      SELECT "id", "lifecycleState", "versionNumber" FROM ${table}
      WHERE "id" IN (${sourceId}, ${targetId}) ORDER BY "id" FOR UPDATE
    `);
    if (owners.length !== 2 || owners.some(row => row.lifecycleState !== 'ACTIVE'))
      throw new Error('REFERENCE_MAPPING_ACTIVE_OWNERS_REQUIRED');
    const source = owners.find(row => row.id === sourceId)!;
    const target = owners.find(row => row.id === targetId)!;
    // CITY provider identity is country-scoped. Never reassign an external
    // city key across national boundaries by an ordinary reconciliation.
    if (command.entityType === 'CITY') {
      const locationRows = await this.prisma.$queryRaw<Array<{ id: string; countryIso2Code: string }>>(Prisma.sql`
        SELECT "id", "countryIso2Code" FROM "ReferenceCity"
        WHERE "id" IN (${sourceId}, ${targetId}) ORDER BY "id"
      `);
      if (locationRows.length !== 2 || locationRows[0].countryIso2Code !== locationRows[1].countryIso2Code)
        throw new Error('REFERENCE_MAPPING_CITY_COUNTRY_SCOPE_MISMATCH');
    }
    const mappings = await this.prisma.$queryRaw<Array<{ id: string; referenceId: string; isActive: boolean }>>(Prisma.sql`
      SELECT "id", "referenceId", "isActive" FROM "ReferenceProviderMappingRecord"
      WHERE "entityType" = ${command.entityType}
        AND "normalizedProviderSystem" = ${providerSystem}
        AND "normalizedProviderId" = ${providerId}
      LIMIT 1 FOR UPDATE
    `);
    if (mappings.length !== 1) throw new Error('REFERENCE_MAPPING_SOURCE_NOT_FOUND');
    const mapping = mappings[0];

    // Replay detection is inside the same owner row lock and is checked BEFORE
    // expectedVersion, as a successful transfer increments both versions.
    const prior = await this.prisma.$queryRaw<Array<{ snapshot: unknown }>>(Prisma.sql`
      SELECT "snapshot" FROM "ReferenceVersionRecord"
      WHERE "entityType" = ${command.entityType} AND "referenceId" = ${sourceId}
        AND "snapshot" ->> 'providerMappingReconciliationId' = ${command.reconciliationId}
      LIMIT 1
    `);
    if (prior.length) {
      const receipt = prior[0].snapshot as Record<string, unknown>;
      if (receipt.fromReferenceId !== sourceId || receipt.toReferenceId !== targetId ||
          receipt.providerSystem !== providerSystem || receipt.providerId !== providerId ||
          receipt.reason !== command.reason.trim() || receipt.requestActorId !== command.actorId) {
        throw new Error('REFERENCE_MAPPING_RECONCILIATION_ID_CONFLICT');
      }
      if (mapping.referenceId !== targetId || !mapping.isActive)
        throw new Error('REFERENCE_MAPPING_REPLAY_TARGET_CHANGED');
      // Sentinel rolls back the retry before the audit/outbox executor appends.
      throw new Error('REFERENCE_MAPPING_RECONCILIATION_ALREADY_APPLIED');
    }
    if (!mapping.isActive || mapping.referenceId !== sourceId)
      throw new Error('REFERENCE_MAPPING_SOURCE_OWNERSHIP_CHANGED');
    if (source.versionNumber !== command.fromExpectedVersion ||
        target.versionNumber !== command.toExpectedVersion)
      throw new Error('REFERENCE_VERSION_CONFLICT');

    const now = new Date();
    const changed = await this.prisma.$executeRaw(Prisma.sql`
      UPDATE "ReferenceProviderMappingRecord"
      SET "referenceId" = ${targetId}, "updatedAt" = ${now}
      WHERE "id" = ${mapping.id} AND "referenceId" = ${sourceId} AND "isActive" = true
    `);
    if (changed !== 1) throw new Error('REFERENCE_MAPPING_SOURCE_OWNERSHIP_CHANGED');

    for (const row of [source, target]) {
      const updated = await this.prisma.$queryRaw<Array<{ snapshot: unknown }>>(Prisma.sql`
        UPDATE ${table} t
        SET "versionNumber" = "versionNumber" + 1,
            "effectiveFrom" = ${now}, "effectiveTo" = NULL, "updatedAt" = ${now}
        WHERE "id" = ${row.id} AND "versionNumber" = ${row.versionNumber}
        RETURNING to_jsonb(t) AS "snapshot"
      `);
      if (updated.length !== 1) throw new Error('REFERENCE_VERSION_CONFLICT');
      await this.appendVersionRecord(
        command.entityType, row.id, row.versionNumber + 1,
        ReferenceLifecycleState.ACTIVE, now, null,
        {
          ...(updated[0].snapshot as Record<string, unknown>),
          providerMappingReconciliationId: command.reconciliationId,
          fromReferenceId: sourceId, toReferenceId: targetId,
          providerSystem, providerId, reason: command.reason.trim(), requestActorId: command.actorId,
        },
        row.id === sourceId ? 'PROVIDER_MAPPING_REASSIGNED_FROM' : 'PROVIDER_MAPPING_REASSIGNED_TO',
        command.actorId,
      );
    }
  }

  public reassignProviderMappingInTransaction(command: ReferenceProviderMappingReassignmentCommand, context: AtomicPersistenceContext): Promise<void> {
    return this.transactionRepository(context).reassignProviderMapping(command);
  }

  private async lockAndCheckExpectedVersion(entityType: GovernedReferenceEntityType, referenceId: string, expectedVersion?: number): Promise<void> {
    if (!this.inTransaction || !Number.isSafeInteger(expectedVersion) || (expectedVersion ?? 0) < 1)
      throw new Error('REFERENCE_EDIT_TRANSACTION_AND_EXPECTED_VERSION_REQUIRED');
    const table = this.referenceTable(entityType);
    const records = await this.prisma.$queryRaw<Array<{ versionNumber: number }>>(Prisma.sql`
      SELECT "versionNumber" FROM ${table} WHERE "id" = ${referenceId} FOR UPDATE
    `);
    if (records.length !== 1) throw new Error('REFERENCE_EDIT_TARGET_NOT_FOUND');
    if (records[0].versionNumber !== expectedVersion) throw new Error('REFERENCE_VERSION_CONFLICT');
  }

  private async assertGovernedRecordEditable(entityType: GovernedReferenceEntityType, referenceId: string): Promise<void> {
    const table = this.referenceTable(entityType);
    const rows = await this.prisma.$queryRaw<Array<{ lifecycleState: string }>>(Prisma.sql`
      SELECT "lifecycleState" FROM ${table} WHERE "id" = ${referenceId} LIMIT 1
    `);
    if (rows.length !== 1) throw new Error('REFERENCE_GOVERNANCE_STATE_UNAVAILABLE');
    if (rows[0].lifecycleState !== ReferenceLifecycleState.ACTIVE) {
      throw new Error('REFERENCE_TERMINAL_OR_DEPRECATED_RECORD_REQUIRES_GOVERNED_COMMAND');
    }
  }

  private rejectLegacyLifecycleMutation(isActive: boolean | undefined): void {
    if (isActive === false) throw new Error('REFERENCE_LIFECYCLE_COMMAND_REQUIRED');
  }

  private referenceTable(entityType: GovernedReferenceEntityType): Prisma.Sql {
    const tables: Record<GovernedReferenceEntityType, string> = {
      COUNTRY: 'ReferenceCountry',
      CURRENCY: 'ReferenceCurrency',
      LANGUAGE: 'ReferenceLanguage',
      CITY: 'ReferenceCity',
      REGION: 'AdministrativeRegion',
    };
    return Prisma.raw(`"${tables[entityType]}"`);
  }

  private async finalizeGovernedUpsert(
    entityType: GovernedReferenceEntityType,
    referenceId: string,
    _snapshotInput: object,
    aliases: ReferenceAliasInput[] | undefined,
    providerMappings: ReferenceProviderMappingInput[] | undefined,
    existed: boolean,
  ): Promise<{ lifecycleState: string; versionNumber: number; effectiveFrom: Date; effectiveTo: Date | null; isActive: boolean }> {
    const table = this.referenceTable(entityType);
    const now = new Date();
    const rows = existed
      ? await this.prisma.$queryRaw<Array<{ lifecycleState: string; versionNumber: number; effectiveFrom: Date; effectiveTo: Date | null; isActive: boolean }>>(Prisma.sql`
          UPDATE ${table}
          SET "versionNumber" = "versionNumber" + 1, "effectiveFrom" = ${now}, "effectiveTo" = NULL, "updatedAt" = ${now}
          WHERE "id" = ${referenceId}
          RETURNING "lifecycleState", "versionNumber", "effectiveFrom", "effectiveTo", "isActive"
        `)
      : await this.prisma.$queryRaw<Array<{ lifecycleState: string; versionNumber: number; effectiveFrom: Date; effectiveTo: Date | null; isActive: boolean }>>(Prisma.sql`
          SELECT "lifecycleState", "versionNumber", "effectiveFrom", "effectiveTo", "isActive"
          FROM ${table} WHERE "id" = ${referenceId}
        `);
    if (rows.length !== 1) throw new Error('REFERENCE_GOVERNANCE_STATE_UNAVAILABLE');
    if (rows[0].lifecycleState !== ReferenceLifecycleState.ACTIVE) {
      throw new Error('REFERENCE_TERMINAL_OR_DEPRECATED_RECORD_REQUIRES_GOVERNED_COMMAND');
    }
    await this.replaceAliases(entityType, referenceId, aliases);
    await this.replaceProviderMappings(entityType, referenceId, providerMappings);
    // The historical snapshot must contain the *effective persisted* aliases and
    // mappings, even if this patch omitted the optional arrays (preserve old).
    // Never mistake omitted arrays for "clear everything" in an audit record.
    const [effectiveAliases, effectiveMappings] = await Promise.all([
      this.prisma.referenceAliasRecord.findMany({
        where: { entityType, referenceId, isActive: true },
        select: { alias: true, normalizedAlias: true, aliasType: true, locale: true },
        orderBy: [{ normalizedAlias: 'asc' }, { id: 'asc' }], take: 101,
      }),
      this.prisma.referenceProviderMappingRecord.findMany({
        where: { entityType, referenceId, isActive: true },
        select: { providerSystem: true, providerId: true },
        orderBy: [{ normalizedProviderSystem: 'asc' }, { normalizedProviderId: 'asc' }], take: 101,
      }),
    ]);
    if (effectiveAliases.length > 100 || effectiveMappings.length > 100)
      throw new Error('REFERENCE_GOVERNANCE_DETAILS_LIMIT_EXCEEDED');
    // Snapshot *persisted state*, not just the patch payload, or omitted
    // metadata/default links would vanish from historical versions.
    const persisted = await this.prisma.$queryRaw<Array<{ snapshot: Record<string, unknown> }>>(Prisma.sql`
      SELECT to_jsonb(t) AS "snapshot" FROM ${table} t WHERE "id" = ${referenceId} LIMIT 1
    `);
    if (persisted.length !== 1) throw new Error('REFERENCE_GOVERNANCE_STATE_UNAVAILABLE');
    await this.appendVersionRecord(
      entityType, referenceId, rows[0].versionNumber, ReferenceLifecycleState.ACTIVE,
      rows[0].effectiveFrom, rows[0].effectiveTo,
      { ...persisted[0].snapshot, lifecycleState: ReferenceLifecycleState.ACTIVE, versionNumber: rows[0].versionNumber,
        aliases: effectiveAliases, providerMappings: effectiveMappings,
        mutationCorrelationId: this.mutationCorrelationId ?? null },
      existed ? 'UPSERT_UPDATE' : 'UPSERT_CREATE', this.mutationActorId ?? null,
    );
    return rows[0];
  }

  private async replaceAliases(entityType: GovernedReferenceEntityType, referenceId: string, aliases?: ReferenceAliasInput[]): Promise<void> {
    if (aliases === undefined) return;
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE "ReferenceAliasRecord" SET "isActive" = false, "updatedAt" = NOW()
      WHERE "entityType" = ${entityType} AND "referenceId" = ${referenceId} AND "isActive" = true
    `);
    for (const alias of aliases) {
      const normalized = this.normalizeResolutionAlias(alias.alias);
      if (!normalized) throw new Error('REFERENCE_ALIAS_EMPTY_AFTER_NORMALIZATION');
      await this.prisma.$executeRaw(Prisma.sql`
        INSERT INTO "ReferenceAliasRecord"
          ("id", "entityType", "referenceId", "alias", "normalizedAlias", "locale", "aliasType", "isActive", "createdAt", "updatedAt")
        VALUES
          (${randomUUID()}, ${entityType}, ${referenceId}, ${alias.alias.trim()}, ${normalized}, ${alias.locale ?? null}, ${alias.aliasType ?? 'COMMON'}, true, NOW(), NOW())
      `);
    }
  }

  private async replaceProviderMappings(entityType: GovernedReferenceEntityType, referenceId: string, mappings?: ReferenceProviderMappingInput[]): Promise<void> {
    if (mappings === undefined) return;
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE "ReferenceProviderMappingRecord" SET "isActive" = false, "updatedAt" = NOW()
      WHERE "entityType" = ${entityType} AND "referenceId" = ${referenceId} AND "isActive" = true
    `);
    for (const mapping of mappings) {
      const system = mapping.providerSystem.trim();
      const providerId = mapping.providerId.trim();
      if (!system || !providerId) throw new Error('REFERENCE_PROVIDER_MAPPING_INVALID');
      const affected = await this.prisma.$executeRaw(Prisma.sql`
        INSERT INTO "ReferenceProviderMappingRecord"
          ("id", "entityType", "referenceId", "providerSystem", "providerId", "normalizedProviderSystem", "normalizedProviderId", "isActive", "createdAt", "updatedAt")
        VALUES
          (${randomUUID()}, ${entityType}, ${referenceId}, ${system}, ${providerId}, ${system.toLowerCase()}, ${providerId.toLowerCase()}, true, NOW(), NOW())
        ON CONFLICT ("entityType", "normalizedProviderSystem", "normalizedProviderId")
        DO UPDATE SET "providerSystem" = EXCLUDED."providerSystem", "providerId" = EXCLUDED."providerId",
                      "isActive" = true, "updatedAt" = NOW()
        WHERE "ReferenceProviderMappingRecord"."referenceId" = EXCLUDED."referenceId"
      `);
      if (affected !== 1) throw new Error('REFERENCE_PROVIDER_MAPPING_REASSIGNMENT_REQUIRES_RECONCILIATION');
    }
  }

  private async appendVersionRecord(
    entityType: GovernedReferenceEntityType,
    referenceId: string,
    versionNumber: number,
    lifecycleState: ReferenceLifecycleState,
    effectiveFrom: Date,
    effectiveTo: Date | null,
    snapshot: Record<string, unknown>,
    changeReason: string | null,
    actorId: string | null,
  ): Promise<void> {
    // Version periods are [effectiveFrom, effectiveTo). Close the predecessor
    // in this same transaction before inserting the successor.
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE "ReferenceVersionRecord" SET "effectiveTo" = ${effectiveFrom}
      WHERE "entityType" = ${entityType} AND "referenceId" = ${referenceId}
        AND "effectiveTo" IS NULL AND "versionNumber" < ${versionNumber}
    `);
    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO "ReferenceVersionRecord"
        ("id", "entityType", "referenceId", "versionNumber", "lifecycleState", "effectiveFrom", "effectiveTo", "snapshot", "changeReason", "actorId", "createdAt")
      VALUES
        (${randomUUID()}, ${entityType}, ${referenceId}, ${versionNumber}, ${lifecycleState}, ${effectiveFrom}, ${effectiveTo}, CAST(${JSON.stringify(snapshot)} AS jsonb), ${changeReason}, ${actorId}, NOW())
    `);
  }

  private isUniqueConstraintViolation(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }


  private cityCanonicalIdentityKey(data: UpsertReferenceCityDto): string {
    return createHash('sha256').update(referenceCityScopeKey(data), 'utf8').digest('hex');
  }

  /** Compatibility probe only; never write the legacy identity for new rows. */
  private legacyCityCanonicalIdentityKey(data: UpsertReferenceCityDto): string {
    const legacy = (value: string | null | undefined) =>
      (value ?? '').normalize('NFKC').trim().toLocaleLowerCase('en-US')
        .replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ').replace(/\s+/g, ' ').trim();
    const regionIdentity = data.administrativeRegionId
      ? `id:${data.administrativeRegionId.trim().toLowerCase()}`
      : legacy(data.region) ? `text:${legacy(data.region)}` : '~';
    return createHash('sha256').update([
      data.countryIso2Code.trim().toUpperCase(), legacy(data.name), regionIdentity,
    ].join('|'), 'utf8').digest('hex');
  }

  public upsertCityInTransaction(data: UpsertReferenceCityDto, context: AtomicPersistenceContext, actorId?: string, correlationId?: string): Promise<ReferenceCityDto> {
    return this.transactionRepository(context, actorId, correlationId).upsertCity(data);
  }

  public transitionReferenceLifecycleInTransaction(command: ReferenceLifecycleTransitionCommand, context: AtomicPersistenceContext): Promise<void> {
    return this.transactionRepository(context).transitionReferenceLifecycle(command);
  }

  private transactionRepository(context: AtomicPersistenceContext, actorId?: string, correlationId?: string): PrismaReferenceDataRepository {
    const transactionClient = (context as Partial<PrismaReferenceDataPersistenceContext>).transactionClient;
    if (!context.boundaryId || !transactionClient) {
      throw new Error('REFERENCE_DATA_ATOMIC_TRANSACTION_CONTEXT_REQUIRED');
    }
    return new PrismaReferenceDataRepository(transactionClient as unknown as PrismaClient, true, actorId, correlationId);
  }

  private mapToRegionDto(record: {
    id: string;
    countryReferenceId?: string | null;
    countryIso2Code: string;
    regionCode: string;
    name: string;
    nameAr: string | null;
    localName: string | null;
    regionType: string | null;
    lifecycleState: string;
    isActive: boolean;
    versionNumber: number;
    effectiveFrom: Date;
    effectiveTo: Date | null;
  }): AdministrativeRegionDto {
    return {
      id: record.id,
      countryReferenceId: record.countryReferenceId,
      countryIso2Code: record.countryIso2Code,
      regionCode: record.regionCode,
      name: record.name,
      nameAr: record.nameAr,
      localName: record.localName,
      regionType: record.regionType,
      lifecycleState: record.lifecycleState as ReferenceLifecycleState,
      isActive: record.isActive,
      versionNumber: record.versionNumber,
      effectiveFrom: record.effectiveFrom,
      effectiveTo: record.effectiveTo,
    };
  }

  private mapToCountryDto(record: DbCountry): ReferenceCountryDto {
    return {
      id: record.id,
      iso2Code: record.iso2Code,
      iso3Code: record.iso3Code,
      name: record.name,
      nameAr: record.nameAr,
      officialName: record.officialName,
      region: record.region,
      subregion: record.subregion,
      defaultCurrencyCode: record.defaultCurrencyCode,
      defaultLanguageCode: record.defaultLanguageCode,
      callingCode: record.callingCode,
      flagAssetId: record.flagAssetId,
      isActive: record.isActive,
      lifecycleState: record.lifecycleState as ReferenceLifecycleState,
      versionNumber: record.versionNumber,
      effectiveFrom: record.effectiveFrom,
      effectiveTo: record.effectiveTo,
      metadata: record.metadata ? (record.metadata as Record<string, unknown>) : undefined
    };
  }

  private mapToCurrencyDto(record: DbCurrency): ReferenceCurrencyDto {
    return {
      id: record.id,
      isoCode: record.isoCode,
      numericCode: record.numericCode,
      name: record.name,
      nameAr: record.nameAr,
      symbol: record.symbol,
      minorUnit: record.minorUnit,
      isActive: record.isActive,
      lifecycleState: record.lifecycleState as ReferenceLifecycleState,
      versionNumber: record.versionNumber,
      effectiveFrom: record.effectiveFrom,
      effectiveTo: record.effectiveTo,
      metadata: record.metadata ? (record.metadata as Record<string, unknown>) : undefined
    };
  }

  private mapToLanguageDto(record: DbLanguage): ReferenceLanguageDto {
    return {
      id: record.id,
      isoCode: record.isoCode,
      name: record.name,
      nameAr: record.nameAr,
      nativeName: record.nativeName,
      direction: record.direction as 'LTR' | 'RTL',
      isActive: record.isActive,
      lifecycleState: record.lifecycleState as ReferenceLifecycleState,
      versionNumber: record.versionNumber,
      effectiveFrom: record.effectiveFrom,
      effectiveTo: record.effectiveTo,
      metadata: record.metadata ? (record.metadata as Record<string, unknown>) : undefined
    };
  }

  private mapToCityDto(record: DbCity): ReferenceCityDto {
    return {
      id: record.id,
      countryReferenceId: record.countryReferenceId,
      countryIso2Code: record.countryIso2Code,
      name: record.name,
      nameAr: record.nameAr,
      region: record.region,
      timezone: record.timezone,
      latitude: record.latitude,
      longitude: record.longitude,
      isActive: record.isActive,
      lifecycleState: record.lifecycleState as ReferenceLifecycleState,
      versionNumber: record.versionNumber,
      effectiveFrom: record.effectiveFrom,
      effectiveTo: record.effectiveTo,
      metadata: record.metadata ? (record.metadata as Record<string, unknown>) : undefined,
      administrativeRegionId: record.administrativeRegionId,
      administrativeRegion: record.administrativeRegion ? this.mapToRegionDto(record.administrativeRegion) : null
    };
  }
}
