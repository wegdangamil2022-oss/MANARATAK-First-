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
    const match = await this.referenceRepository.resolveCountryCandidate({ id: resolved.id });
    return { id: resolved.id, label: match?.record.nameAr || match?.record.name || resolved.standardCode };
  }

  async resolveCurrencyReference(input: string) {
    const resolved = await this.resolver.resolveCurrency(lookup(input));
    if (!resolved?.active || !resolved.standardCode) throw new Error('CAREER_CURRENCY_NOT_ACTIVE');
    return { code: resolved.standardCode };
  }
  async displayGeography(countryId: string, cityId?: string | null, locale: 'ar' | 'en' = 'ar') {
    const [country, city] = await Promise.all([
      this.referenceRepository.resolveCountryCandidate({ id: countryId }),
      cityId ? this.referenceRepository.resolveCityCandidate({ id: cityId }) : null,
    ]);
    return { country: locale === 'ar' ? country?.record.nameAr || country?.record.name : country?.record.name,
      city: locale === 'ar' ? city?.record.nameAr || city?.record.name || null : city?.record.name || null };
  }

  async resolveCityReference(input: string, expectedCountryReferenceId?: string) {
    const resolved = await this.resolver.resolveCity(lookup(input));
    if (!resolved?.active) throw new Error(`CAREER_CITY_REFERENCE_NOT_ACTIVE:${input}`);
    if (expectedCountryReferenceId) {
      const match = await this.referenceRepository.resolveCityCandidate({ id: resolved.id });
      if (!match || match.record.countryReferenceId !== expectedCountryReferenceId)
        throw new Error(`CAREER_CITY_COUNTRY_MISMATCH:${resolved.id}`);
    }
    const city = await this.referenceRepository.resolveCityCandidate({ id: resolved.id });
    return { id: resolved.id, label: city?.record.nameAr || city?.record.name || resolved.standardCode };
  }
}
