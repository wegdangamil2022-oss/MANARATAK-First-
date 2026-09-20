import { ICareerReferenceGateway, IReferenceResolutionRepository, IReferenceResolver } from '@manaratak/domain';

const lookup = (value: string) => {
  const v = value.trim();
  if (!v) throw new Error('CAREER_GEOGRAPHY_REFERENCE_REQUIRED');
  if (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(v) || v.startsWith('mem-')) return { id: v };
  if (/^[A-Za-z]{2,3}$/.test(v)) return { standardCode: v.toUpperCase() };
  return { alias: v };
};

export class CanonicalCareerReferenceGateway implements ICareerReferenceGateway {
  constructor(
    private readonly resolver: IReferenceResolver,
    private readonly referenceRepository: IReferenceResolutionRepository,
  ) {}

  async resolveCountryReference(input: string) {
    const resolved = await this.resolver.resolveCountry(lookup(input));
    if (!resolved?.active) throw new Error(`CAREER_COUNTRY_REFERENCE_NOT_ACTIVE:${input}`);
    return { id: resolved.id, label: resolved.standardCode };
  }

  async resolveCityReference(input: string, expectedCountryReferenceId?: string) {
    const resolved = await this.resolver.resolveCity(lookup(input));
    if (!resolved?.active) throw new Error(`CAREER_CITY_REFERENCE_NOT_ACTIVE:${input}`);
    if (expectedCountryReferenceId) {
      const match = await this.referenceRepository.resolveCityCandidate({ id: resolved.id });
      if (!match || match.record.countryReferenceId !== expectedCountryReferenceId)
        throw new Error(`CAREER_CITY_COUNTRY_MISMATCH:${resolved.id}`);
    }
    return { id: resolved.id, label: resolved.standardCode };
  }
}
