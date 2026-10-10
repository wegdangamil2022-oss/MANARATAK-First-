import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  IReferenceResolutionRepository,
  ReferenceResolutionMatch,
  ReferenceCountryDto,
  AdministrativeRegionDto,
  ReferenceCityDto,
  ReferenceLanguageDto,
  ReferenceCurrencyDto,
  ReferenceLifecycleState,
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
    lifecycleState: ReferenceLifecycleState.ACTIVE,
    versionNumber: 1,
    effectiveFrom: new Date(),
  };
  const region: AdministrativeRegionDto = {
    id: 'region-riyadh',
    countryIso2Code: 'SA',
    regionCode: 'SA-01',
    name: 'Riyadh',
    lifecycleState: ReferenceLifecycleState.ACTIVE,
    isActive: true,
    versionNumber: 1,
    effectiveFrom: new Date(),
  };
  const city: ReferenceCityDto = {
    id: 'city-riyadh',
    countryIso2Code: 'SA',
    name: 'Riyadh',
    isActive: true,
    lifecycleState: ReferenceLifecycleState.ACTIVE,
    versionNumber: 1,
    effectiveFrom: new Date(),
  };
  const language: ReferenceLanguageDto = {
    id: 'language-ar',
    isoCode: 'ar',
    name: 'Arabic',
    direction: 'RTL',
    isActive: true,
    lifecycleState: ReferenceLifecycleState.ACTIVE,
    versionNumber: 1,
    effectiveFrom: new Date(),
  };
  const currency: ReferenceCurrencyDto = {
    id: 'currency-sar',
    isoCode: 'SAR',
    name: 'Saudi Riyal',
    isActive: true,
    lifecycleState: ReferenceLifecycleState.ACTIVE,
    versionNumber: 1,
    effectiveFrom: new Date(),
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

  it('preserves explicit country scope when forwarding city lookup contracts', async () => {
    vi.mocked(repository.resolveCityCandidate).mockResolvedValue(null);
    await expect(resolver.resolveCity({ alias: 'Springfield', countryIso2Code: 'US' })).resolves.toBeNull();
    expect(repository.resolveCityCandidate).toHaveBeenCalledWith({
      alias: 'Springfield', countryIso2Code: 'US',
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
      active: true,
      resolutionMethod: 'EXACT_STANDARD_CODE',
    });
    await expect(resolver.resolveCity({ id: 'city-riyadh' })).resolves.toMatchObject({
      id: 'city-riyadh',
      type: 'CITY',
      active: true,
      resolutionMethod: 'EXACT_ID',
    });
  });

  it.each(['DEPRECATED', 'ARCHIVED', 'SUPERSEDED', 'MERGED'] as const)('reports %s regions inactive even if the compatibility boolean is stale', async lifecycleState => {
    vi.mocked(repository.resolveRegionCandidate).mockResolvedValue({
      record: { ...region, lifecycleState: lifecycleState as ReferenceLifecycleState, isActive: true },
      method: 'NORMALIZED_ALIAS',
    });
    await expect(resolver.resolveRegion({ alias: 'Riyadh' })).resolves.toMatchObject({ id: region.id, active: false, resolutionMethod: 'NORMALIZED_ALIAS' });
  });

  it('requires both the compatibility active flag and authoritative lifecycle for selectability', async () => {
    vi.mocked(repository.resolveCountryCandidate).mockResolvedValue({
      record: { ...country, lifecycleState: ReferenceLifecycleState.DEPRECATED, isActive: true },
      method: 'EXACT_STANDARD_CODE',
    });
    await expect(resolver.resolveCountry({ standardCode: 'SA' })).resolves.toMatchObject({ active: false });

    vi.mocked(repository.resolveCityCandidate).mockResolvedValue({
      record: { ...city, lifecycleState: ReferenceLifecycleState.ACTIVE, isActive: false },
      method: 'EXACT_ID',
    });
    await expect(resolver.resolveCity({ id: 'city-riyadh' })).resolves.toMatchObject({ active: false });

    vi.mocked(repository.resolveCurrencyCandidate).mockResolvedValue({
      record: { ...currency, lifecycleState: ReferenceLifecycleState.MERGED, isActive: true },
      method: 'EXACT_STANDARD_CODE',
    });
    await expect(resolver.resolveCurrency({ standardCode: 'SAR' })).resolves.toMatchObject({ active: false });
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
