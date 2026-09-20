import {
  CanonicalReference,
  IReferenceResolutionRepository,
  IReferenceResolver,
  ReferenceLookup,
} from '@manaratak/domain';

/**
 * Canonical resolver backed by bounded repository-side lookups. The resolver no
 * longer materializes whole reference collections for one ID/code/alias lookup.
 */
export class ReferenceResolverService implements IReferenceResolver {
  constructor(private readonly repository: IReferenceResolutionRepository) {}

  public async resolveCountry(lookup: ReferenceLookup): Promise<CanonicalReference | null> {
    const result = await this.repository.resolveCountryCandidate(lookup);
    return result?.record.id
      ? {
          id: result.record.id,
          type: 'COUNTRY',
          standardCode: result.record.iso2Code,
          active: result.record.isActive,
          resolutionMethod: result.method,
        }
      : null;
  }

  public async resolveRegion(lookup: ReferenceLookup): Promise<CanonicalReference | null> {
    const result = await this.repository.resolveRegionCandidate(lookup);
    return result
      ? {
          id: result.record.id,
          type: 'REGION',
          standardCode: result.record.regionCode,
          active: null,
          resolutionMethod: result.method,
        }
      : null;
  }

  public async resolveCity(lookup: ReferenceLookup): Promise<CanonicalReference | null> {
    const result = await this.repository.resolveCityCandidate(lookup);
    return result
      ? {
          id: result.record.id,
          type: 'CITY',
          active: result.record.isActive,
          resolutionMethod: result.method,
        }
      : null;
  }

  public async resolveLanguage(lookup: ReferenceLookup): Promise<CanonicalReference | null> {
    const result = await this.repository.resolveLanguageCandidate(lookup);
    return result?.record.id
      ? {
          id: result.record.id,
          type: 'LANGUAGE',
          standardCode: result.record.isoCode,
          active: result.record.isActive,
          resolutionMethod: result.method,
        }
      : null;
  }

  public async resolveCurrency(lookup: ReferenceLookup): Promise<CanonicalReference | null> {
    const result = await this.repository.resolveCurrencyCandidate(lookup);
    return result?.record.id
      ? {
          id: result.record.id,
          type: 'CURRENCY',
          standardCode: result.record.isoCode,
          active: result.record.isActive,
          resolutionMethod: result.method,
        }
      : null;
  }
}
