import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReferenceDataUseCases } from '../../src/reference-data/use-cases/ReferenceDataUseCases';
import {
  IReferenceDataRepository,
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
  ReferenceLifecycleState,
} from '@manaratak/domain';

class MockReferenceDataRepository implements IReferenceDataRepository {
  public listCountries = vi.fn<[ReferenceDataFilters], Promise<ReferenceCountryDto[]>>();
  public listCurrencies = vi.fn<[ReferenceDataFilters], Promise<ReferenceCurrencyDto[]>>();
  public listLanguages = vi.fn<[ReferenceDataFilters], Promise<ReferenceLanguageDto[]>>();
  public listCities = vi.fn<[ReferenceDataFilters], Promise<ReferenceCityDto[]>>();
  public listRegions = vi.fn<[ReferenceDataFilters], Promise<AdministrativeRegionDto[]>>();

  public getCountry = vi.fn<[string], Promise<ReferenceCountryDto | null>>();
  public getCurrency = vi.fn<[string], Promise<ReferenceCurrencyDto | null>>();
  public getLanguage = vi.fn<[string], Promise<ReferenceLanguageDto | null>>();
  public getRegionById = vi.fn<[string], Promise<AdministrativeRegionDto | null>>();

  public upsertCountry = vi.fn<[UpsertReferenceCountryDto], Promise<ReferenceCountryDto>>();
  public upsertCurrency = vi.fn<[UpsertReferenceCurrencyDto], Promise<ReferenceCurrencyDto>>();
  public upsertLanguage = vi.fn<[UpsertReferenceLanguageDto], Promise<ReferenceLanguageDto>>();
  public upsertCity = vi.fn<[UpsertReferenceCityDto], Promise<ReferenceCityDto>>();
}

describe('ReferenceDataUseCases', () => {
  let repository: MockReferenceDataRepository;
  let useCases: ReferenceDataUseCases;

  beforeEach(() => {
    repository = new MockReferenceDataRepository();
    useCases = new ReferenceDataUseCases(repository);
  });

  describe('Countries', () => {
    it('listCountries delegates filters to repository and enforces activeOnly', async () => {
      const mockResult: ReferenceCountryDto[] = [
        { id: 'country-eg', iso2Code: 'EG', iso3Code: 'EGY', name: 'Egypt', isActive: true }
      ];
      repository.listCountries.mockResolvedValue(mockResult);

      const filters: ReferenceDataFilters = { q: 'Egy' };
      const result = await useCases.listCountries(filters);

      expect(repository.listCountries).toHaveBeenCalledWith({ activeOnly: true, ...filters });
      expect(result).toEqual(mockResult);
    });

    it('getCountry returns country if found and active', async () => {
      const mockResult: ReferenceCountryDto = { id: 'country-eg', iso2Code: 'EG', iso3Code: 'EGY', name: 'Egypt', isActive: true, lifecycleState: ReferenceLifecycleState.ACTIVE };
      repository.getCountry.mockResolvedValue(mockResult);

      const result = await useCases.getCountry('EG');
      expect(repository.getCountry).toHaveBeenCalledWith('EG');
      expect(result).toEqual(mockResult);
    });

    it('getCountry throws error if country is not found', async () => {
      repository.getCountry.mockResolvedValue(null);
      await expect(useCases.getCountry('XX')).rejects.toThrow('Country not found: XX');
    });

    it('getCountry throws error if country is inactive', async () => {
      const mockResult: ReferenceCountryDto = { id: 'country-xx', iso2Code: 'XX', iso3Code: 'XXX', name: 'Inactive', isActive: false, lifecycleState: ReferenceLifecycleState.ARCHIVED };
      repository.getCountry.mockResolvedValue(mockResult);
      await expect(useCases.getCountry('XX')).rejects.toThrow('Country not found: XX');
    });

    it('rejects non-canonical country codes before repository mutation', async () => {
      const invalid = { iso2Code: 'eg', iso3Code: 'EGY', name: 'Egypt' } as UpsertReferenceCountryDto;

      await expect(useCases.upsertCountry(invalid)).rejects.toThrow('canonical validation failed');
      expect(repository.upsertCountry).not.toHaveBeenCalled();
    });

    it('upsertCountry delegates strict input and returns result', async () => {
      const mockInput: UpsertReferenceCountryDto = { iso2Code: 'EG', iso3Code: 'EGY', name: 'Egypt', isActive: true };
      const mockResult: ReferenceCountryDto = { id: 'country-eg', ...mockInput, isActive: true };
      repository.upsertCountry.mockResolvedValue(mockResult);

      const result = await useCases.upsertCountry(mockInput);
      expect(repository.upsertCountry).toHaveBeenCalledWith(mockInput);
      expect(result).toEqual(mockResult);
    });
  });

  describe('Currencies', () => {
    it('listCurrencies delegates filters to repository and enforces activeOnly', async () => {
      const mockResult: ReferenceCurrencyDto[] = [
        { id: 'currency-usd', isoCode: 'USD', name: 'US Dollar', isActive: true }
      ];
      repository.listCurrencies.mockResolvedValue(mockResult);

      const filters: ReferenceDataFilters = { q: 'USD' };
      const result = await useCases.listCurrencies(filters);

      expect(repository.listCurrencies).toHaveBeenCalledWith({ activeOnly: true, ...filters });
      expect(result).toEqual(mockResult);
    });

    it('getCurrency returns currency if found and active', async () => {
      const mockResult: ReferenceCurrencyDto = { id: 'currency-usd', isoCode: 'USD', name: 'US Dollar', isActive: true, lifecycleState: ReferenceLifecycleState.ACTIVE };
      repository.getCurrency.mockResolvedValue(mockResult);

      const result = await useCases.getCurrency('USD');
      expect(repository.getCurrency).toHaveBeenCalledWith('USD');
      expect(result).toEqual(mockResult);
    });

    it('getCurrency throws error if not found', async () => {
      repository.getCurrency.mockResolvedValue(null);
      await expect(useCases.getCurrency('XXX')).rejects.toThrow('Currency not found: XXX');
    });

    it('upsertCurrency delegates strict input', async () => {
      const mockInput: UpsertReferenceCurrencyDto = { isoCode: 'USD', name: 'US Dollar', isActive: true };
      const mockResult: ReferenceCurrencyDto = { id: 'currency-usd', ...mockInput, isActive: true };
      repository.upsertCurrency.mockResolvedValue(mockResult);

      const result = await useCases.upsertCurrency(mockInput);
      expect(repository.upsertCurrency).toHaveBeenCalledWith(mockInput);
      expect(result).toEqual(mockResult);
    });
  });

  describe('Languages', () => {
    it('listLanguages delegates filters to repository and enforces activeOnly', async () => {
      const mockResult: ReferenceLanguageDto[] = [
        { id: 'language-en', isoCode: 'en', name: 'English', direction: 'LTR', isActive: true }
      ];
      repository.listLanguages.mockResolvedValue(mockResult);

      const filters: ReferenceDataFilters = { q: 'en' };
      const result = await useCases.listLanguages(filters);

      expect(repository.listLanguages).toHaveBeenCalledWith({ activeOnly: true, ...filters });
      expect(result).toEqual(mockResult);
    });

    it('getLanguage returns language if found and active', async () => {
      const mockResult: ReferenceLanguageDto = { id: 'language-en', isoCode: 'en', name: 'English', direction: 'LTR', isActive: true, lifecycleState: ReferenceLifecycleState.ACTIVE };
      repository.getLanguage.mockResolvedValue(mockResult);

      const result = await useCases.getLanguage('en');
      expect(repository.getLanguage).toHaveBeenCalledWith('en');
      expect(result).toEqual(mockResult);
    });

    it('getLanguage throws error if not found', async () => {
      repository.getLanguage.mockResolvedValue(null);
      await expect(useCases.getLanguage('xx')).rejects.toThrow('Language not found: xx');
    });

    it('upsertLanguage delegates strict input', async () => {
      const mockInput: UpsertReferenceLanguageDto = { isoCode: 'en', name: 'English', direction: 'LTR', isActive: true };
      const mockResult: ReferenceLanguageDto = { id: 'language-en', ...mockInput, isActive: true };
      repository.upsertLanguage.mockResolvedValue(mockResult);

      const result = await useCases.upsertLanguage(mockInput);
      expect(repository.upsertLanguage).toHaveBeenCalledWith(mockInput);
      expect(result).toEqual(mockResult);
    });
  });

  describe('Cities', () => {
    it('listCities delegates filters to repository and enforces activeOnly', async () => {
      const mockResult: ReferenceCityDto[] = [
        { id: 'city-cairo', countryIso2Code: 'EG', name: 'Cairo', isActive: true }
      ];
      repository.listCities.mockResolvedValue(mockResult);

      const filters: ReferenceDataFilters = { q: 'Cai' };
      const result = await useCases.listCities(filters);

      expect(repository.listCities).toHaveBeenCalledWith({ activeOnly: true, ...filters });
      expect(result).toEqual(mockResult);
    });

    it('rejects impossible city coordinates before relation lookup or mutation', async () => {
      const invalid = {
        countryIso2Code: 'EG',
        name: 'Cairo',
        latitude: 100,
        longitude: 31.2,
      } as UpsertReferenceCityDto;

      await expect(useCases.upsertCity(invalid)).rejects.toThrow('canonical validation failed');
      expect(repository.getCountry).not.toHaveBeenCalled();
      expect(repository.upsertCity).not.toHaveBeenCalled();
    });

    it('upsertCity delegates strict input', async () => {
      const mockInput: UpsertReferenceCityDto = { countryIso2Code: 'EG', name: 'Cairo', isActive: true };
      const mockResult: ReferenceCityDto = { id: 'city-cairo', ...mockInput, isActive: true };
      repository.getCountry.mockResolvedValue({ id: 'country-eg', iso2Code: 'EG', iso3Code: 'EGY', name: 'Egypt', isActive: true, lifecycleState: ReferenceLifecycleState.ACTIVE });
      repository.upsertCity.mockResolvedValue(mockResult);

      const result = await useCases.upsertCity(mockInput);
      expect(repository.upsertCity).toHaveBeenCalledWith({ ...mockInput, countryReferenceId: 'country-eg' });
      expect(result).toEqual(mockResult);
    });

    it('rejects a city region owned by another country', async () => {
      repository.getCountry.mockResolvedValue({ id: 'country-eg', iso2Code: 'EG', iso3Code: 'EGY', name: 'Egypt', isActive: true, lifecycleState: ReferenceLifecycleState.ACTIVE });
      repository.getRegionById.mockResolvedValue({
        id: 'region-us-ca', countryIso2Code: 'US', regionCode: 'US-CA', name: 'California'
      });

      await expect(useCases.upsertCity({
        countryIso2Code: 'EG',
        name: 'Cairo',
        administrativeRegionId: 'region-us-ca'
      })).rejects.toThrow('must belong to the selected country');
      expect(repository.upsertCity).not.toHaveBeenCalled();
    });
  });
});
