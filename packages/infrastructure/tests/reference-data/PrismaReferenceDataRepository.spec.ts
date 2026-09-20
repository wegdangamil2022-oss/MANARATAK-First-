import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrismaReferenceDataRepository } from '../../src/reference-data/PrismaReferenceDataRepository';
import { PrismaClient } from '@prisma/client';
import {
  UpsertReferenceCountryDto,
  UpsertReferenceCurrencyDto,
  UpsertReferenceLanguageDto,
  UpsertReferenceCityDto,
  ReferenceDataFilters
} from '@manaratak/domain';

function createMockPrismaClient() {
  return {
    $queryRaw: vi.fn().mockResolvedValue([{
      lifecycleState: 'ACTIVE', versionNumber: 1, effectiveFrom: new Date(), effectiveTo: null, isActive: true,
    }]),
    $executeRaw: vi.fn().mockResolvedValue(1),
    referenceCountry: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn()
    },
    referenceCurrency: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn()
    },
    referenceLanguage: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn()
    },
    referenceCity: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn()
    }
  } as unknown as PrismaClient;
}

describe('PrismaReferenceDataRepository', () => {
  let mockPrisma: any;
  let repository: PrismaReferenceDataRepository;

  beforeEach(() => {
    mockPrisma = createMockPrismaClient();
    repository = new PrismaReferenceDataRepository(mockPrisma);
  });

  describe('Countries', () => {
    it('listCountries builds filters for activeOnly, region, and q', async () => {
      const dbRecords = [
        {
          id: 'country-1',
          iso2Code: 'EG',
          iso3Code: 'EGY',
          name: 'Egypt',
          officialName: 'Arab Republic of Egypt',
          region: 'Africa',
          subregion: 'Northern Africa',
          defaultCurrencyCode: 'EGP',
          defaultLanguageCode: 'ar',
          callingCode: '+20',
          flagAssetId: 'flag-eg',
          isActive: true,
          metadata: { population: 100000000 },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockPrisma.referenceCountry.findMany.mockResolvedValue(dbRecords);

      const filters: ReferenceDataFilters = {
        activeOnly: true,
        region: 'Africa',
        q: 'Egy'
      };

      const result = await repository.listCountries(filters);

      expect(mockPrisma.referenceCountry.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          region: 'Africa',
          OR: [
            { name: { contains: 'Egy', mode: 'insensitive' } },
            { officialName: { contains: 'Egy', mode: 'insensitive' } },
            { iso2Code: { contains: 'Egy', mode: 'insensitive' } },
            { iso3Code: { contains: 'Egy', mode: 'insensitive' } }
          ]
        },
        orderBy: { name: 'asc' }
      });

      expect(result).toEqual([
        {
          id: 'country-1',
          iso2Code: 'EG',
          iso3Code: 'EGY',
          name: 'Egypt',
          officialName: 'Arab Republic of Egypt',
          region: 'Africa',
          subregion: 'Northern Africa',
          defaultCurrencyCode: 'EGP',
          defaultLanguageCode: 'ar',
          callingCode: '+20',
          flagAssetId: 'flag-eg',
          isActive: true,
          metadata: { population: 100000000 }
        }
      ]);
      expect((result[0] as any).id).toBe('country-1');
      expect((result[0] as any).createdAt).toBeUndefined();
    });

    it('getCountry calls referenceCountry.findUnique with iso2Code', async () => {
      const dbRecord = {
        id: 'country-1',
        iso2Code: 'EG',
        iso3Code: 'EGY',
        name: 'Egypt',
        officialName: null,
        region: 'Africa',
        subregion: null,
        defaultCurrencyCode: 'EGP',
        defaultLanguageCode: 'ar',
        callingCode: '+20',
        flagAssetId: null,
        isActive: true,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.referenceCountry.findUnique.mockResolvedValue(dbRecord);

      const result = await repository.getCountry('EG');

      expect(mockPrisma.referenceCountry.findUnique).toHaveBeenCalledWith({
        where: { iso2Code: 'EG' }
      });
      expect(result).toEqual({
        id: 'country-1',
        iso2Code: 'EG',
        iso3Code: 'EGY',
        name: 'Egypt',
        officialName: null,
        region: 'Africa',
        subregion: null,
        defaultCurrencyCode: 'EGP',
        defaultLanguageCode: 'ar',
        callingCode: '+20',
        flagAssetId: null,
        isActive: true,
        metadata: undefined
      });
    });

    it('upsertCountry calls referenceCountry.upsert using iso2Code as unique key', async () => {
      const input: UpsertReferenceCountryDto = {
        iso2Code: 'EG',
        iso3Code: 'EGY',
        name: 'Egypt',
        isActive: true,
        metadata: { key: 'value' }
      };

      const dbRecord = {
        id: 'country-1',
        iso2Code: 'EG',
        iso3Code: 'EGY',
        name: 'Egypt',
        officialName: null,
        region: null,
        subregion: null,
        defaultCurrencyCode: null,
        defaultLanguageCode: null,
        callingCode: null,
        flagAssetId: null,
        isActive: true,
        metadata: { key: 'value' },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.referenceCountry.upsert.mockResolvedValue(dbRecord);

      const result = await repository.upsertCountry(input);

      expect(mockPrisma.referenceCountry.upsert).toHaveBeenCalledWith({
        where: { iso2Code: 'EG' },
        update: {
          iso3Code: 'EGY',
          name: 'Egypt',
          nameAr: undefined,
          officialName: undefined,
          region: undefined,
          subregion: undefined,
          defaultCurrencyCode: undefined,
          defaultLanguageCode: undefined,
          callingCode: undefined,
          flagAssetId: undefined,
          metadata: { key: 'value' }
        },
        create: {
          iso2Code: 'EG',
          iso3Code: 'EGY',
          name: 'Egypt',
          nameAr: undefined,
          officialName: undefined,
          region: undefined,
          subregion: undefined,
          defaultCurrencyCode: undefined,
          defaultLanguageCode: undefined,
          callingCode: undefined,
          flagAssetId: undefined,
          isActive: true,
          metadata: { key: 'value' }
        }
      });

      expect(result.iso2Code).toBe('EG');
      expect(result.metadata).toEqual({ key: 'value' });
    });
  });

  describe('Currencies', () => {
    it('listCurrencies builds filters for activeOnly and q', async () => {
      const dbRecords = [
        {
          id: 'curr-1',
          isoCode: 'USD',
          numericCode: '840',
          name: 'US Dollar',
          symbol: '$',
          minorUnit: 2,
          isActive: true,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockPrisma.referenceCurrency.findMany.mockResolvedValue(dbRecords);

      const filters: ReferenceDataFilters = { activeOnly: true, q: 'USD' };
      const result = await repository.listCurrencies(filters);

      expect(mockPrisma.referenceCurrency.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          OR: [
            { name: { contains: 'USD', mode: 'insensitive' } },
            { isoCode: { contains: 'USD', mode: 'insensitive' } },
            { symbol: { contains: 'USD', mode: 'insensitive' } },
            { numericCode: { contains: 'USD', mode: 'insensitive' } }
          ]
        },
        orderBy: { name: 'asc' }
      });

      expect(result).toEqual([
        {
          id: 'curr-1',
          isoCode: 'USD',
          numericCode: '840',
          name: 'US Dollar',
          nameAr: undefined,
          symbol: '$',
          minorUnit: 2,
          isActive: true,
          lifecycleState: undefined,
          versionNumber: undefined,
          effectiveFrom: undefined,
          effectiveTo: undefined,
          metadata: undefined
        }
      ]);
    });

    it('getCurrency calls referenceCurrency.findUnique with isoCode', async () => {
      const dbRecord = {
        id: 'curr-1',
        isoCode: 'USD',
        numericCode: '840',
        name: 'US Dollar',
        symbol: '$',
        minorUnit: 2,
        isActive: true,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.referenceCurrency.findUnique.mockResolvedValue(dbRecord);

      const result = await repository.getCurrency('USD');
      expect(mockPrisma.referenceCurrency.findUnique).toHaveBeenCalledWith({
        where: { isoCode: 'USD' }
      });
      expect(result?.isoCode).toBe('USD');
    });

    it('upsertCurrency calls referenceCurrency.upsert using isoCode', async () => {
      const input: UpsertReferenceCurrencyDto = {
        isoCode: 'USD',
        name: 'US Dollar',
        symbol: '$',
        isActive: true
      };

      const dbRecord = {
        id: 'curr-1',
        isoCode: 'USD',
        numericCode: null,
        name: 'US Dollar',
        symbol: '$',
        minorUnit: null,
        isActive: true,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.referenceCurrency.upsert.mockResolvedValue(dbRecord);

      const result = await repository.upsertCurrency(input);
      expect(mockPrisma.referenceCurrency.upsert).toHaveBeenCalledWith({
        where: { isoCode: 'USD' },
        update: {
          numericCode: undefined,
          name: 'US Dollar',
          nameAr: undefined,
          symbol: '$',
          minorUnit: undefined,
          metadata: undefined
        },
        create: {
          isoCode: 'USD',
          numericCode: undefined,
          name: 'US Dollar',
          nameAr: undefined,
          symbol: '$',
          minorUnit: undefined,
          isActive: true,
          metadata: undefined
        }
      });
      expect(result.isoCode).toBe('USD');
    });
  });

  describe('Languages', () => {
    it('listLanguages builds filters for activeOnly and q', async () => {
      const dbRecords = [
        {
          id: 'lang-1',
          isoCode: 'ar',
          name: 'Arabic',
          nativeName: 'العربية',
          direction: 'RTL',
          isActive: true,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockPrisma.referenceLanguage.findMany.mockResolvedValue(dbRecords);

      const filters: ReferenceDataFilters = { activeOnly: true, q: 'ar' };
      const result = await repository.listLanguages(filters);

      expect(mockPrisma.referenceLanguage.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          OR: [
            { name: { contains: 'ar', mode: 'insensitive' } },
            { nativeName: { contains: 'ar', mode: 'insensitive' } },
            { isoCode: { contains: 'ar', mode: 'insensitive' } }
          ]
        },
        orderBy: { name: 'asc' }
      });

      expect(result).toEqual([
        {
          id: 'lang-1',
          isoCode: 'ar',
          name: 'Arabic',
          nativeName: 'العربية',
          direction: 'RTL',
          isActive: true,
          metadata: undefined
        }
      ]);
    });

    it('getLanguage calls referenceLanguage.findUnique with isoCode', async () => {
      const dbRecord = {
        id: 'lang-1',
        isoCode: 'en',
        name: 'English',
        nativeName: 'English',
        direction: 'LTR',
        isActive: true,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.referenceLanguage.findUnique.mockResolvedValue(dbRecord);

      const result = await repository.getLanguage('en');
      expect(mockPrisma.referenceLanguage.findUnique).toHaveBeenCalledWith({
        where: { isoCode: 'en' }
      });
      expect(result?.direction).toBe('LTR');
    });

    it('upsertLanguage calls referenceLanguage.upsert using isoCode', async () => {
      const input: UpsertReferenceLanguageDto = {
        isoCode: 'en',
        name: 'English',
        direction: 'LTR',
        isActive: true
      };

      const dbRecord = {
        id: 'lang-1',
        isoCode: 'en',
        name: 'English',
        nativeName: null,
        direction: 'LTR',
        isActive: true,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.referenceLanguage.upsert.mockResolvedValue(dbRecord);

      const result = await repository.upsertLanguage(input);
      expect(mockPrisma.referenceLanguage.upsert).toHaveBeenCalledWith({
        where: { isoCode: 'en' },
        update: {
          name: 'English',
          nameAr: undefined,
          nativeName: undefined,
          direction: 'LTR',
          metadata: undefined
        },
        create: {
          isoCode: 'en',
          name: 'English',
          nameAr: undefined,
          nativeName: undefined,
          direction: 'LTR',
          isActive: true,
          metadata: undefined
        }
      });
      expect(result.direction).toBe('LTR');
    });
  });

  describe('Cities', () => {
    beforeEach(() => {
      mockPrisma.referenceCountry.findUnique.mockImplementation(async ({ where }: any) => {
        const iso2Code = where?.iso2Code ?? (where?.id === 'country-eg' ? 'EG' : undefined);
        return iso2Code ? { id: `country-${String(iso2Code).toLowerCase()}`, iso2Code } : null;
      });
    });
    it('listCities builds bounded filters and maps the administrative region relation', async () => {
      mockPrisma.referenceCity.findMany.mockResolvedValue([
        {
          id: 'city-1',
          countryIso2Code: 'EG',
          name: 'Cairo',
          nameAr: 'القاهرة',
          region: 'Cairo Governorate',
          timezone: 'Africa/Cairo',
          latitude: 30.0444,
          longitude: 31.2357,
          isActive: true,
          metadata: null,
          administrativeRegionId: 'region-eg-c',
          administrativeRegion: {
            id: 'region-eg-c',
            countryIso2Code: 'EG',
            regionCode: 'EG-C',
            name: 'Cairo Governorate',
            nameAr: 'محافظة القاهرة',
            localName: null,
            regionType: 'GOVERNORATE',
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const filters: ReferenceDataFilters = {
        activeOnly: true,
        countryIso2Code: 'EG',
        region: 'Cairo Governorate',
        q: 'Cai',
      };

      const result = await repository.listCities(filters);

      expect(mockPrisma.referenceCity.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          countryIso2Code: 'EG',
          region: 'Cairo Governorate',
          OR: [
            { name: { contains: 'Cai', mode: 'insensitive' } },
            { timezone: { contains: 'Cai', mode: 'insensitive' } },
          ],
        },
        include: { administrativeRegion: true },
        orderBy: { name: 'asc' },
      });
      expect(result[0]).toMatchObject({
        id: 'city-1',
        name: 'Cairo',
        nameAr: 'القاهرة',
        administrativeRegionId: 'region-eg-c',
      });
    });

    it('updates the exact canonical-key row when it already exists', async () => {
      const input: UpsertReferenceCityDto = {
        countryIso2Code: 'EG',
        name: 'Cairo',
        region: 'Cairo Governorate',
        timezone: 'Africa/Cairo',
        isActive: true,
      };
      mockPrisma.referenceCity.findUnique.mockResolvedValue({
        id: 'city-existing',
        canonicalIdentityKey: 'existing-key',
        countryIso2Code: 'EG',
        name: 'Cairo',
        nameAr: null,
        region: 'Cairo Governorate',
        timezone: null,
        latitude: null,
        longitude: null,
        administrativeRegionId: null,
        administrativeRegion: null,
        isActive: true,
        metadata: null,
      });
      mockPrisma.referenceCity.update.mockResolvedValue({
        id: 'city-existing',
        countryIso2Code: 'EG',
        name: 'Cairo',
        nameAr: null,
        region: 'Cairo Governorate',
        timezone: 'Africa/Cairo',
        latitude: null,
        longitude: null,
        administrativeRegionId: null,
        administrativeRegion: null,
        isActive: true,
        metadata: null,
      });

      const result = await repository.upsertCity(input);

      const canonicalWhere = mockPrisma.referenceCity.findUnique.mock.calls[0][0].where;
      expect(canonicalWhere.canonicalIdentityKey).toMatch(/^[a-f0-9]{64}$/);
      expect(mockPrisma.referenceCity.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'city-existing' },
        include: { administrativeRegion: true },
      }));
      expect(mockPrisma.referenceCity.findMany).not.toHaveBeenCalled();
      expect(mockPrisma.referenceCity.upsert).not.toHaveBeenCalled();
      expect(result.timezone).toBe('Africa/Cairo');
    });

    it('claims one unambiguous pre-W3 legacy row and assigns its canonical key', async () => {
      const input: UpsertReferenceCityDto = {
        countryIso2Code: 'EG',
        name: 'Alexandria',
        region: 'Alexandria Governorate',
        isActive: true,
      };
      mockPrisma.referenceCity.findUnique.mockResolvedValue(null);
      mockPrisma.referenceCity.findMany.mockResolvedValue([
        {
          id: 'legacy-city',
          canonicalIdentityKey: null,
          countryIso2Code: 'EG',
          name: 'Alexandria',
          region: 'Alexandria Governorate',
        },
      ]);
      mockPrisma.referenceCity.update.mockResolvedValue({
        id: 'legacy-city',
        countryIso2Code: 'EG',
        name: 'Alexandria',
        nameAr: null,
        region: 'Alexandria Governorate',
        timezone: null,
        latitude: null,
        longitude: null,
        administrativeRegionId: null,
        administrativeRegion: null,
        isActive: true,
        metadata: null,
      });

      await repository.upsertCity(input);

      expect(mockPrisma.referenceCity.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          canonicalIdentityKey: null,
          countryIso2Code: 'EG',
          name: { equals: 'Alexandria', mode: 'insensitive' },
          region: { equals: 'Alexandria Governorate', mode: 'insensitive' },
        }),
        take: 2,
      }));
      expect(mockPrisma.referenceCity.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'legacy-city' },
        data: expect.objectContaining({ canonicalIdentityKey: expect.stringMatching(/^[a-f0-9]{64}$/) }),
      }));
      expect(mockPrisma.referenceCity.upsert).not.toHaveBeenCalled();
    });

    it('fails closed when multiple legacy rows match one canonical city identity', async () => {
      mockPrisma.referenceCity.findUnique.mockResolvedValue(null);
      mockPrisma.referenceCity.findMany.mockResolvedValue([
        { id: 'legacy-1' },
        { id: 'legacy-2' },
      ]);

      await expect(repository.upsertCity({
        countryIso2Code: 'US',
        name: 'Springfield',
        region: 'Illinois',
      })).rejects.toThrow('REFERENCE_CITY_LEGACY_IDENTITY_AMBIGUOUS');

      expect(mockPrisma.referenceCity.update).not.toHaveBeenCalled();
      expect(mockPrisma.referenceCity.upsert).not.toHaveBeenCalled();
    });

    it('uses database upsert on the unique canonical key for a new W3 city identity', async () => {
      const input: UpsertReferenceCityDto = {
        countryReferenceId: 'country-eg',
        countryIso2Code: 'EG',
        name: 'Aswan',
        region: 'Aswan Governorate',
        timezone: 'Africa/Cairo',
        isActive: true,
      };
      mockPrisma.referenceCity.findUnique.mockResolvedValue(null);
      mockPrisma.referenceCity.findMany.mockResolvedValue([]);
      mockPrisma.referenceCity.upsert.mockResolvedValue({
        id: 'city-aswan',
        countryIso2Code: 'EG',
        name: 'Aswan',
        nameAr: null,
        region: 'Aswan Governorate',
        timezone: 'Africa/Cairo',
        latitude: null,
        longitude: null,
        administrativeRegionId: null,
        administrativeRegion: null,
        isActive: true,
        metadata: null,
      });

      const result = await repository.upsertCity(input);

      const call = mockPrisma.referenceCity.upsert.mock.calls[0][0];
      expect(call.where.canonicalIdentityKey).toMatch(/^[a-f0-9]{64}$/);
      expect(call.create).toMatchObject({
        canonicalIdentityKey: call.where.canonicalIdentityKey,
        countryReferenceId: 'country-eg',
        countryIso2Code: 'EG',
        name: 'Aswan',
        region: 'Aswan Governorate',
      });
      expect(result.name).toBe('Aswan');
    });
  });

});
