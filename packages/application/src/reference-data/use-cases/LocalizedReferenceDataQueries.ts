import {
  AdministrativeRegionDto,
  IReferenceDataRepository,
  ReferenceCityDto,
  ReferenceCountryDto,
  ReferenceCurrencyDto,
  ReferenceDataFilters,
  ReferenceLanguageDto,
} from '@manaratak/domain';
import { DEFAULT_LOCALE, type SupportedLocale } from '@manaratak/shared';
import { ApplicationLocaleProjectionService } from '../../localization/ApplicationLocaleProjectionService';
import { ReferenceDataNotFoundError } from '../ReferenceDataErrors';

export class LocalizedReferenceDataQueries {
  constructor(
    private readonly repository: IReferenceDataRepository,
    private readonly projection = new ApplicationLocaleProjectionService(),
  ) {}

  public async listCountries(
    filters: ReferenceDataFilters = {},
    locale: SupportedLocale = DEFAULT_LOCALE,
  ): Promise<ReferenceCountryDto[]> {
    const records = await this.repository.listCountries({ activeOnly: true, ...filters });
    return records.map((record) => this.projection.projectReferenceCountry(record, locale));
  }

  public async listCurrencies(
    filters: ReferenceDataFilters = {},
    locale: SupportedLocale = DEFAULT_LOCALE,
  ): Promise<ReferenceCurrencyDto[]> {
    const records = await this.repository.listCurrencies({ activeOnly: true, ...filters });
    return records.map((record) => this.projection.projectReferenceCurrency(record, locale));
  }

  public async listLanguages(
    filters: ReferenceDataFilters = {},
    locale: SupportedLocale = DEFAULT_LOCALE,
  ): Promise<ReferenceLanguageDto[]> {
    const records = await this.repository.listLanguages({ activeOnly: true, ...filters });
    return records.map((record) => this.projection.projectReferenceLanguage(record, locale));
  }

  public async listCities(
    filters: ReferenceDataFilters = {},
    locale: SupportedLocale = DEFAULT_LOCALE,
  ): Promise<ReferenceCityDto[]> {
    const records = await this.repository.listCities({ activeOnly: true, ...filters });
    return records.map((record) => this.projection.projectReferenceCity(record, locale));
  }

  public async listRegions(
    filters: ReferenceDataFilters = {},
    locale: SupportedLocale = DEFAULT_LOCALE,
  ): Promise<AdministrativeRegionDto[]> {
    const records = await this.repository.listRegions(filters);
    return records.map((record) => this.projection.projectAdministrativeRegion(record, locale));
  }

  public async getCountry(
    iso2Code: string,
    locale: SupportedLocale = DEFAULT_LOCALE,
  ): Promise<ReferenceCountryDto> {
    const record = await this.repository.getCountry(iso2Code);
    if (!record || !record.isActive) throw new ReferenceDataNotFoundError('COUNTRY', iso2Code);
    return this.projection.projectReferenceCountry(record, locale);
  }

  public async getCurrency(
    isoCode: string,
    locale: SupportedLocale = DEFAULT_LOCALE,
  ): Promise<ReferenceCurrencyDto> {
    const record = await this.repository.getCurrency(isoCode);
    if (!record || !record.isActive) throw new ReferenceDataNotFoundError('CURRENCY', isoCode);
    return this.projection.projectReferenceCurrency(record, locale);
  }

  public async getLanguage(
    isoCode: string,
    locale: SupportedLocale = DEFAULT_LOCALE,
  ): Promise<ReferenceLanguageDto> {
    const record = await this.repository.getLanguage(isoCode);
    if (!record || !record.isActive) throw new ReferenceDataNotFoundError('LANGUAGE', isoCode);
    return this.projection.projectReferenceLanguage(record, locale);
  }
}
