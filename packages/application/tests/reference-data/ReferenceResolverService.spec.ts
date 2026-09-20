import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  IReferenceResolutionRepository,
  ReferenceResolutionMatch,
  ReferenceCountryDto,
  AdministrativeRegionDto,
  ReferenceCityDto,
  ReferenceLanguageDto,
  ReferenceCurrencyDto,
} from '@manaratak/domain';
import { ReferenceResolverService } from '../../src/reference-data/services/ReferenceResolverService';

describe('ReferenceResolverService canonical contract', () => {
  let repository: IReferenceResolutionRepository;
  let resolver: ReferenceResolverService;

  const country: ReferenceCountryDto = {
    id: 'country-sa',
    iso2Code: 'SA',
    iso3Code: 'SAU',
    name: 'Saudi Arabia',
    isActive: true,
  };
  const region: AdministrativeRegionDto = {
    id: 'region-riyadh',
    countryIso2Code: 'SA',
    regionCode: 'SA-01',
    name: 'Riyadh',
  };
  const city: ReferenceCityDto = {
    id: 'city-riyadh',
    countryIso2Code: 'SA',
    name: 'Riyadh',
    isActive: true,
  };
  const language: ReferenceLanguageDto = {
    id: 'language-ar',
    isoCode: 'ar',
    name: 'Arabic',
    direction: 'RTL',
    isActive: true,
  };
  const currency: ReferenceCurrencyDto = {
    id: 'currency-sar',
    isoCode: 'SAR',
    name: 'Saudi Riyal',
    isActive: true,
  };

  beforeEach(() => {
    repository = {
      resolveCountryCandidate: vi.fn(),
      resolveRegionCandidate: vi.fn(),
      resolveCityCandidate: vi.fn(),
      resolveLanguageCandidate: vi.fn(),
      resolveCurrencyCandidate: vi.fn(),
    };
    resolver = new ReferenceResolverService(repository);
  });

  it('maps a bounded Country candidate into the canonical resolver contract', async () => {
    vi.mocked(repository.resolveCountryCandidate).mockResolvedValue({
      record: country,
      method: 'EXACT_STANDARD_CODE',
    });

    await expect(resolver.resolveCountry({ standardCode: 'sau' })).resolves.toEqual({
      id: 'country-sa',
      type: 'COUNTRY',
      standardCode: 'SA',
      active: true,
      resolutionMethod: 'EXACT_STANDARD_CODE',
    });
    expect(repository.resolveCountryCandidate).toHaveBeenCalledWith({ standardCode: 'sau' });
  });

  it('preserves provider/alias resolution provenance returned by the bounded repository', async () => {
    vi.mocked(repository.resolveCountryCandidate).mockResolvedValue({
      record: country,
      method: 'PROVIDER_MAPPING',
    });
    await expect(
      resolver.resolveCountry({ providerSystem: 'RESTCOUNTRIES', providerId: '682' }),
    ).resolves.toMatchObject({ id: 'country-sa', resolutionMethod: 'PROVIDER_MAPPING' });

    vi.mocked(repository.resolveCountryCandidate).mockResolvedValue({
      record: country,
      method: 'NORMALIZED_ALIAS',
    });
    await expect(resolver.resolveCountry({ alias: 'Kingdom of Saudi Arabia' })).resolves.toMatchObject({
      id: 'country-sa',
      resolutionMethod: 'NORMALIZED_ALIAS',
    });
  });

  it('maps Region and City identities without introducing name-only matching in the service', async () => {
    vi.mocked(repository.resolveRegionCandidate).mockResolvedValue({
      record: region,
      method: 'EXACT_STANDARD_CODE',
    });
    vi.mocked(repository.resolveCityCandidate).mockResolvedValue({
      record: city,
      method: 'EXACT_ID',
    });

    await expect(resolver.resolveRegion({ standardCode: 'sa-01' })).resolves.toMatchObject({
      id: 'region-riyadh',
      type: 'REGION',
      standardCode: 'SA-01',
      resolutionMethod: 'EXACT_STANDARD_CODE',
    });
    await expect(resolver.resolveCity({ id: 'city-riyadh' })).resolves.toMatchObject({
      id: 'city-riyadh',
      type: 'CITY',
      active: true,
      resolutionMethod: 'EXACT_ID',
    });
  });

  it('maps Language and Currency candidates and returns null when no unique candidate exists', async () => {
    vi.mocked(repository.resolveLanguageCandidate).mockResolvedValue({
      record: language,
      method: 'EXACT_STANDARD_CODE',
    });
    vi.mocked(repository.resolveCurrencyCandidate).mockResolvedValue({
      record: currency,
      method: 'EXACT_STANDARD_CODE',
    });

    await expect(resolver.resolveLanguage({ standardCode: 'AR' })).resolves.toMatchObject({
      id: 'language-ar',
      type: 'LANGUAGE',
    });
    await expect(resolver.resolveCurrency({ standardCode: 'sar' })).resolves.toMatchObject({
      id: 'currency-sar',
      type: 'CURRENCY',
    });

    vi.mocked(repository.resolveCurrencyCandidate).mockResolvedValue(null);
    await expect(resolver.resolveCurrency({ alias: 'ambiguous alias' })).resolves.toBeNull();
  });
});
