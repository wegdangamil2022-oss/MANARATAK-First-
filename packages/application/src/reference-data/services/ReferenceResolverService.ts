import {
  CanonicalReference,
  IReferenceResolutionRepository,
  IReferenceResolver,
  ReferenceLookup,
  ReferenceLifecycleState,
} from '@manaratak/domain';

/**
 * Canonical resolver backed by bounded repository-side lookups. The resolver no
 * longer materializes whole reference collections for one ID/code/alias lookup.
 */
export class ReferenceResolverService implements IReferenceResolver {
  constructor(private readonly repository: IReferenceResolutionRepository) {}

  private async withReplacement(ref: CanonicalReference): Promise<CanonicalReference> {
    if (ref.active || !this.repository.getReplacement) return ref;
    const replacement = await this.repository.getReplacement(ref.type, ref.id);
    return replacement ? { ...ref, replacement } : ref;
  }

  public async resolveCountry(lookup: ReferenceLookup): Promise<CanonicalReference | null> {
    const result = await this.repository.resolveCountryCandidate(lookup);
    return result?.record.id ? this.withReplacement({
      id: result.record.id, type: 'COUNTRY', standardCode: result.record.iso2Code,
      active: result.record.isActive, resolutionMethod: result.method,
    }) : null;
  }

  public async resolveRegion(lookup: ReferenceLookup): Promise<CanonicalReference | null> {
    const result = await this.repository.resolveRegionCandidate(lookup);
    return result ? this.withReplacement({
      id: result.record.id, type: 'REGION', standardCode: result.record.regionCode,
      active: result.record.lifecycleState === ReferenceLifecycleState.ACTIVE,
      resolutionMethod: result.method,
    }) : null;
  }

  public async resolveCity(lookup: ReferenceLookup): Promise<CanonicalReference | null> {
    const result = await this.repository.resolveCityCandidate(lookup);
    return result ? this.withReplacement({
      id: result.record.id, type: 'CITY', active: result.record.isActive,
      resolutionMethod: result.method,
    }) : null;
  }

  public async resolveLanguage(lookup: ReferenceLookup): Promise<CanonicalReference | null> {
    const result = await this.repository.resolveLanguageCandidate(lookup);
    return result?.record.id ? this.withReplacement({
      id: result.record.id, type: 'LANGUAGE', standardCode: result.record.isoCode,
      active: result.record.isActive, resolutionMethod: result.method,
    }) : null;
  }

  public async resolveCurrency(lookup: ReferenceLookup): Promise<CanonicalReference | null> {
    const result = await this.repository.resolveCurrencyCandidate(lookup);
    return result?.record.id ? this.withReplacement({
      id: result.record.id, type: 'CURRENCY', standardCode: result.record.isoCode,
      active: result.record.isActive, resolutionMethod: result.method,
    }) : null;
  }
}
