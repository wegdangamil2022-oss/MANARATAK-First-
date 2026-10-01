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
  AdministrativeRegionDto,
  GovernedReferenceEntityType,
  ReferenceAliasInput,
  ReferenceLifecycleState,
  ReferenceLifecycleTransitionCommand,
  ReferenceProviderMappingInput,
  ReferenceRelationshipDto,
  ReferenceVersionDto,
  assertReferenceLifecycleTransition,
  lifecycleIsActive
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
  administrativeRegion?: {
    id: string;
    countryIso2Code: string;
    regionCode: string;
    name: string;
    nameAr: string | null;
    localName: string | null;
    regionType: string | null;
  } | null;
}

interface PrismaReferenceDataPersistenceContext extends AtomicPersistenceContext {
  readonly transactionClient: Prisma.TransactionClient;
}

export class PrismaReferenceDataRepository implements ITransactionalReferenceDataRepository, IReferenceResolutionRepository {
  constructor(private readonly prisma: PrismaClient) {}

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
    return null;
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
        SELECT "referenceId"
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
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  public async listCountries(filters?: ReferenceDataFilters): Promise<ReferenceCountryDto[]> {
    const where: {
      isActive?: boolean;
      region?: string;
      OR?: Array<{
        name?: { contains: string; mode: 'insensitive' };
        officialName?: { contains: string; mode: 'insensitive' };
        iso2Code?: { contains: string; mode: 'insensitive' };
        iso3Code?: { contains: string; mode: 'insensitive' };
      }>;
    } = {};

    if (filters?.activeOnly) {
      where.isActive = true;
    }
    if (filters?.region) {
      where.region = filters.region;
    }
    if (filters?.q) {
      where.OR = [
        { name: { contains: filters.q, mode: 'insensitive' } },
        { officialName: { contains: filters.q, mode: 'insensitive' } },
        { iso2Code: { contains: filters.q, mode: 'insensitive' } },
        { iso3Code: { contains: filters.q, mode: 'insensitive' } }
      ];
    }

    const records = await this.prisma.referenceCountry.findMany({
      where,
      orderBy: { name: 'asc' },
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
    }
    if (filters?.q) {
      where.OR = [
        { name: { contains: filters.q, mode: 'insensitive' } },
        { isoCode: { contains: filters.q, mode: 'insensitive' } },
        { symbol: { contains: filters.q, mode: 'insensitive' } },
        { numericCode: { contains: filters.q, mode: 'insensitive' } }
      ];
    }

    const records = await this.prisma.referenceCurrency.findMany({
      where,
      orderBy: { name: 'asc' },
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
    }
    if (filters?.q) {
      where.OR = [
        { name: { contains: filters.q, mode: 'insensitive' } },
        { nativeName: { contains: filters.q, mode: 'insensitive' } },
        { isoCode: { contains: filters.q, mode: 'insensitive' } }
      ];
    }

    const records = await this.prisma.referenceLanguage.findMany({
      where,
      orderBy: { name: 'asc' },
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
    const where: {
      isActive?: boolean;
      countryIso2Code?: string;
      region?: string;
      OR?: Array<{
        name?: { contains: string; mode: 'insensitive' };
        timezone?: { contains: string; mode: 'insensitive' };
      }>;
    } = {};

    if (filters?.activeOnly) {
      where.isActive = true;
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

    const records = await this.prisma.referenceCity.findMany({
      where,
      include: {
        administrativeRegion: true
      },
      orderBy: { name: 'asc' },
      ...this.pagination(filters)
    });

    return (records as unknown as DbCity[]).map(record => this.mapToCityDto(record));
  }

  public async listRegions(filters?: ReferenceDataFilters): Promise<AdministrativeRegionDto[]> {
    const records = await this.prisma.administrativeRegion.findMany({
      where: filters?.countryIso2Code ? { countryIso2Code: filters.countryIso2Code } : undefined,
      orderBy: [{ countryIso2Code: 'asc' }, { name: 'asc' }],
      ...this.pagination(filters)
    });
    return records.map((record) => this.mapToRegionDto(record));
  }

  public async getRegionById(id: string): Promise<AdministrativeRegionDto | null> {
    const record = await this.prisma.administrativeRegion.findUnique({ where: { id } });
    return record ? this.mapToRegionDto(record) : null;
  }

  private pagination(filters?: ReferenceDataFilters): { skip?: number; take?: number } {
    if (!filters?.page && !filters?.pageSize) return {};
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 50));
    return { skip: (page - 1) * pageSize, take: pageSize };
  }

  public async upsertCity(data: UpsertReferenceCityDto): Promise<ReferenceCityDto> {
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
      await this.prisma.$executeRaw(Prisma.sql`
        INSERT INTO "ReferenceProviderMappingRecord"
          ("id", "entityType", "referenceId", "providerSystem", "providerId", "normalizedProviderSystem", "normalizedProviderId", "isActive", "createdAt", "updatedAt")
        VALUES
          (${randomUUID()}, ${entityType}, ${referenceId}, ${system}, ${providerId}, ${system.toLowerCase()}, ${providerId.toLowerCase()}, true, NOW(), NOW())
        ON CONFLICT ("entityType", "normalizedProviderSystem", "normalizedProviderId")
        DO UPDATE SET "referenceId" = EXCLUDED."referenceId", "providerSystem" = EXCLUDED."providerSystem",
                      "providerId" = EXCLUDED."providerId", "isActive" = true, "updatedAt" = NOW()
      `);
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
    const normalize = (value: string | null | undefined) =>
      (value ?? '')
        .normalize('NFKC')
        .trim()
        .toLocaleLowerCase('en-US')
        .replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const regionIdentity = data.administrativeRegionId
      ? `id:${data.administrativeRegionId.trim().toLowerCase()}`
      : normalize(data.region)
        ? `text:${normalize(data.region)}`
        : '~';
    const canonicalIdentity = [
      data.countryIso2Code.trim().toUpperCase(),
      normalize(data.name),
      regionIdentity,
    ].join('|');
    return createHash('sha256').update(canonicalIdentity, 'utf8').digest('hex');
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
    return new PrismaReferenceDataRepository(transactionClient as unknown as PrismaClient);
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
      administrativeRegion: record.administrativeRegion ? {
        id: record.administrativeRegion.id,
        countryIso2Code: record.administrativeRegion.countryIso2Code,
        regionCode: record.administrativeRegion.regionCode,
        name: record.administrativeRegion.name,
        nameAr: record.administrativeRegion.nameAr,
        localName: record.administrativeRegion.localName,
        regionType: record.administrativeRegion.regionType
      } : null
    };
  }
}
