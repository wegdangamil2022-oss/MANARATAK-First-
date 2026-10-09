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
  assertReferenceLifecycleTransition,
  lifecycleIsActive,
  normalizeReferenceIdentityToken
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
  constructor(private readonly prisma: PrismaClient, private readonly inTransaction = false) {}

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
    if (lookup.id) {
      const record = await this.prisma.administrativeRegion.findUnique({ where: { id: lookup.id } });
      if (record) return { record: this.mapToRegionDto(record), method: 'EXACT_ID' };
    }
    if (lookup.standardCode) {
      const code = lookup.standardCode.trim();
      const records = await this.prisma.administrativeRegion.findMany({
        where: { regionCode: { equals: code, mode: 'insensitive' } },
        take: 2,
      });
      if (records.length === 1) return { record: this.mapToRegionDto(records[0]), method: 'EXACT_STANDARD_CODE' };
    }
    return this.resolveGovernedCandidate('REGION', lookup, id => this.getRegionById(id));
  }

  public async resolveCityCandidate(
    lookup: ReferenceLookup,
  ): Promise<ReferenceResolutionMatch<ReferenceCityDto> | null> {
    if (lookup.id) {
      const record = await this.prisma.referenceCity.findUnique({
        where: { id: lookup.id },
        include: { administrativeRegion: true },
      });
      if (record) return { record: this.mapToCityDto(record as unknown as DbCity), method: 'EXACT_ID' };
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
    if (existing) await this.assertGovernedRecordEditable('COUNTRY', existing.id);
    const record = await this.prisma.referenceCountry.upsert({
      where: { iso2Code: data.iso2Code },
      update: {
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
      create: {
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
      }
    });
    const governance = await this.finalizeGovernedUpsert('COUNTRY', record.id, data, data.aliases, data.providerMappings, Boolean(existing));
    return this.mapToCountryDto({ ...(record as unknown as DbCountry), ...governance });
  }

  public upsertCountryInTransaction(data: UpsertReferenceCountryDto, context: AtomicPersistenceContext): Promise<ReferenceCountryDto> {
    return this.transactionRepository(context).upsertCountry(data);
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
    if (existing) await this.assertGovernedRecordEditable('CURRENCY', existing.id);
    const record = await this.prisma.referenceCurrency.upsert({
      where: { isoCode: data.isoCode },
      update: {
        numericCode: data.numericCode,
        name: data.name,
        nameAr: data.nameAr,
        symbol: data.symbol,
        minorUnit: data.minorUnit,
        metadata: data.metadata as any
      },
      create: {
        isoCode: data.isoCode,
        numericCode: data.numericCode,
        name: data.name,
        nameAr: data.nameAr,
        symbol: data.symbol,
        minorUnit: data.minorUnit,
        isActive: true,
        metadata: data.metadata as any
      }
    });
    const governance = await this.finalizeGovernedUpsert('CURRENCY', record.id, data, data.aliases, data.providerMappings, Boolean(existing));
    return this.mapToCurrencyDto({ ...(record as unknown as DbCurrency), ...governance });
  }

  public upsertCurrencyInTransaction(data: UpsertReferenceCurrencyDto, context: AtomicPersistenceContext): Promise<ReferenceCurrencyDto> {
    return this.transactionRepository(context).upsertCurrency(data);
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
    if (existing) await this.assertGovernedRecordEditable('LANGUAGE', existing.id);
    const record = await this.prisma.referenceLanguage.upsert({
      where: { isoCode: data.isoCode },
      update: {
        name: data.name,
        nameAr: data.nameAr,
        nativeName: data.nativeName,
        direction: data.direction,
        metadata: data.metadata as any
      },
      create: {
        isoCode: data.isoCode,
        name: data.name,
        nameAr: data.nameAr,
        nativeName: data.nativeName,
        direction: data.direction,
        isActive: true,
        metadata: data.metadata as any
      }
    });
    const governance = await this.finalizeGovernedUpsert('LANGUAGE', record.id, data, data.aliases, data.providerMappings, Boolean(existing));
    return this.mapToLanguageDto({ ...(record as unknown as DbLanguage), ...governance });
  }

  public upsertLanguageInTransaction(data: UpsertReferenceLanguageDto, context: AtomicPersistenceContext): Promise<ReferenceLanguageDto> {
    return this.transactionRepository(context).upsertLanguage(data);
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
      const dependencies = await this.prisma.administrativeRegion.findUnique({
        where: { id: current.id }, select: { _count: { select: { cities: true, universities: true, universityCampuses: true } } },
      });
      if (!dependencies || Object.values(dependencies._count).some(count => count > 0)) throw new ReferenceRegionCommandError('REGION_HAS_DEPENDENCIES');
    }
    if (command.targetReferenceId) {
      if (![ReferenceLifecycleState.MERGED, ReferenceLifecycleState.SUPERSEDED].includes(command.toState) || command.targetReferenceId === current.id) throw new ReferenceRegionCommandError('REGION_TARGET_INVALID');
      await this.prisma.$queryRaw(Prisma.sql`SELECT "id" FROM "AdministrativeRegion" WHERE "id" = ${command.targetReferenceId} FOR SHARE`);
      const target = await this.prisma.administrativeRegion.findUnique({ where: { id: command.targetReferenceId } });
      if (!target || target.countryIso2Code !== current.countryIso2Code || target.lifecycleState !== 'ACTIVE') throw new ReferenceRegionCommandError('REGION_TARGET_INVALID');
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
    await this.appendVersionRecord('REGION', record.id, record.versionNumber, command.toState, now, now, { ...record, aliases: detail?.aliases ?? [] }, command.reason, command.actorId);
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
      ...(filters?.activeOnly ? { lifecycleState: 'ACTIVE', countryReference: { lifecycleState: 'ACTIVE' } } : {}),
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

    // New W3 identities use the database unique key directly. Prisma upsert
    // closes the previous findFirst -> create race for canonical city writes.
    const record = await this.prisma.referenceCity.upsert({
      where: { canonicalIdentityKey },
      update: updateData,
      create: {
        canonicalIdentityKey,
        countryIso2Code: data.countryIso2Code,
        ...updateData,
        isActive: true,
      },
      include: { administrativeRegion: true },
    });
    const governance = await this.finalizeGovernedUpsert('CITY', record.id, data, data.aliases, data.providerMappings, false);
    return this.mapToCityDto({ ...(record as unknown as DbCity), ...governance });
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
    if (command.targetReferenceId && command.targetReferenceId === command.referenceId) {
      throw new Error('REFERENCE_LIFECYCLE_SELF_TARGET_FORBIDDEN');
    }
    const table = this.referenceTable(command.entityType);
    const currentRows = await this.prisma.$queryRaw<Array<{
      id: string; lifecycleState: string; versionNumber: number; effectiveFrom: Date; effectiveTo: Date | null; snapshot: unknown;
    }>>(Prisma.sql`
      SELECT "id", "lifecycleState", "versionNumber", "effectiveFrom", "effectiveTo", to_jsonb(t) AS "snapshot"
      FROM ${table} t WHERE "id" = ${command.referenceId} LIMIT 1
    `);
    if (currentRows.length !== 1) throw new Error('REFERENCE_LIFECYCLE_REFERENCE_NOT_FOUND');
    const from = currentRows[0].lifecycleState as ReferenceLifecycleState;
    assertReferenceLifecycleTransition(from, command.toState, command.targetReferenceId);

    if (command.targetReferenceId) {
      const targetRows = await this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id" FROM ${table} WHERE "id" = ${command.targetReferenceId} LIMIT 1
      `);
      if (targetRows.length !== 1) throw new Error('REFERENCE_LIFECYCLE_TARGET_NOT_FOUND');
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
      WHERE "id" = ${command.referenceId}
      RETURNING to_jsonb(t) AS "snapshot"
    `);

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
      lifecycleIsActive(command.toState) ? null : now,
      (updated[0]?.snapshot ?? {}) as Record<string, unknown>,
      command.reason,
      command.actorId,
    );
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
    snapshotInput: object,
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
    const { aliases: _aliases, providerMappings: _providerMappings, isActive: _legacyIsActive, ...snapshot } = snapshotInput as Record<string, unknown> & {
      aliases?: unknown; providerMappings?: unknown; isActive?: unknown;
    };
    await this.appendVersionRecord(
      entityType, referenceId, rows[0].versionNumber, ReferenceLifecycleState.ACTIVE,
      rows[0].effectiveFrom, rows[0].effectiveTo,
      { ...snapshot, lifecycleState: ReferenceLifecycleState.ACTIVE, versionNumber: rows[0].versionNumber },
      existed ? 'UPSERT_UPDATE' : 'UPSERT_CREATE', null,
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
    const normalizedName = normalizeReferenceIdentityToken(data.name);
    if (!normalizedName) throw new Error('REFERENCE_CITY_NAME_EMPTY_AFTER_NORMALIZATION');
    const regionName = normalizeReferenceIdentityToken(data.region ?? '');
    const regionIdentity = data.administrativeRegionId
      ? `id:${data.administrativeRegionId.trim().toLowerCase()}`
      : regionName ? `text:${regionName}` : '~';
    return createHash('sha256').update([
      data.countryIso2Code.trim().toUpperCase(), normalizedName, regionIdentity,
    ].join('|'), 'utf8').digest('hex');
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

  public upsertCityInTransaction(data: UpsertReferenceCityDto, context: AtomicPersistenceContext): Promise<ReferenceCityDto> {
    return this.transactionRepository(context).upsertCity(data);
  }

  public transitionReferenceLifecycleInTransaction(command: ReferenceLifecycleTransitionCommand, context: AtomicPersistenceContext): Promise<void> {
    return this.transactionRepository(context).transitionReferenceLifecycle(command);
  }

  private transactionRepository(context: AtomicPersistenceContext): PrismaReferenceDataRepository {
    const transactionClient = (context as Partial<PrismaReferenceDataPersistenceContext>).transactionClient;
    if (!context.boundaryId || !transactionClient) {
      throw new Error('REFERENCE_DATA_ATOMIC_TRANSACTION_CONTEXT_REQUIRED');
    }
    return new PrismaReferenceDataRepository(transactionClient as unknown as PrismaClient, true);
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
