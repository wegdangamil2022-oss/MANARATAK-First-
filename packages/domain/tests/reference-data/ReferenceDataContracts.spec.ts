import { describe, it, expect } from 'vitest';
import {
  ReferenceCountryDto,
  ReferenceCurrencyDto,
  ReferenceLanguageDto,
  ReferenceCityDto,
  ReferenceDataFilters
} from '../../src/reference-data/dto/ReferenceDataContracts';

describe('ReferenceDataContracts', () => {
  it('should allow valid ReferenceCountryDto assignment', () => {
    const country: ReferenceCountryDto = {
      id: 'country-eg',
      iso2Code: 'EG',
      iso3Code: 'EGY',
      name: 'Egypt',
      isActive: true,
      callingCode: '+20'
    };
    expect(country.iso2Code).toBe('EG');
    expect(country.isActive).toBe(true);
  });

  it('should allow valid ReferenceCurrencyDto assignment', () => {
    const currency: ReferenceCurrencyDto = {
      id: 'currency-usd',
      isoCode: 'EGP',
      name: 'Egyptian Pound',
      isActive: true,
      symbol: 'E£'
    };
    expect(currency.isoCode).toBe('EGP');
  });

  it('should allow valid ReferenceLanguageDto assignment', () => {
    const lang: ReferenceLanguageDto = {
      id: 'language-ar',
      isoCode: 'ar',
      name: 'Arabic',
      direction: 'RTL',
      isActive: true
    };
    expect(lang.direction).toBe('RTL');
  });

  it('should allow valid ReferenceCityDto assignment', () => {
    const city: ReferenceCityDto = {
      id: 'city-cairo',
      countryIso2Code: 'EG',
      name: 'Cairo',
      isActive: true
    };
    expect(city.countryIso2Code).toBe('EG');
  });
  
  it('should allow valid ReferenceDataFilters assignment', () => {
    const filters: ReferenceDataFilters = {
      activeOnly: true,
      region: 'MENA'
    };
    expect(filters.activeOnly).toBe(true);
  });
});
