import { describe, it, expect, beforeEach } from 'vitest';
import {
  ReferenceDataValidationService,
  ReferenceDataValidationSeverity,
  ReferenceCountryDto,
  ReferenceCurrencyDto,
  ReferenceLanguageDto,
  ReferenceCityDto,
  UpsertReferenceCountryDto,
  UpsertReferenceCurrencyDto,
  UpsertReferenceLanguageDto,
  UpsertReferenceCityDto
} from '../../src';

describe('ReferenceDataValidationService', () => {
  let service: ReferenceDataValidationService;

  beforeEach(() => {
    service = new ReferenceDataValidationService();
  });

  describe('validateCountry', () => {
    it('returns isComplete true and canBeImported true for a valid country', () => {
      const input: ReferenceCountryDto = {
        id: 'country-test',
        iso2Code: 'EG',
        iso3Code: 'EGY',
        name: 'Egypt',
        officialName: 'Arab Republic of Egypt',
        region: 'Africa',
        isActive: true
      };

      const report = service.validateCountry(input);

      expect(report.entityType).toBe('COUNTRY');
      expect(report.deterministicKey).toBe('EG');
      expect(report.isComplete).toBe(true);
      expect(report.canBeImported).toBe(true);
      expect(report.missingFields).toHaveLength(0);
      expect(report.requiredFields).toEqual(['iso2Code', 'iso3Code', 'name']);
      expect(report.presentFields).toContain('iso2Code');
      expect(report.presentFields).toContain('iso3Code');
      expect(report.presentFields).toContain('name');
    });

    it('lists missing required fields and sets canBeImported false when required fields are missing', () => {
      const input = {
        iso2Code: '',
        iso3Code: 'EGY',
        name: ''
      } as UpsertReferenceCountryDto;

      const report = service.validateCountry(input);

      expect(report.isComplete).toBe(false);
      expect(report.canBeImported).toBe(false);
      expect(report.missingFields).toEqual(['iso2Code', 'name']);
      expect(report.issues.some(i => i.code === 'MISSING_REQUIRED_FIELD')).toBe(true);
    });

    it('produces ERROR issues for invalid iso2Code or iso3Code formats', () => {
      const input: UpsertReferenceCountryDto = {
        iso2Code: 'egy', // Should be 2 uppercase
        iso3Code: 'EGYPT', // Should be 3 uppercase
        name: 'Egypt'
      };

      const report = service.validateCountry(input);

      expect(report.canBeImported).toBe(false);
      const iso2Issue = report.issues.find(i => i.fieldName === 'iso2Code');
      const iso3Issue = report.issues.find(i => i.fieldName === 'iso3Code');

      expect(iso2Issue?.code).toBe('INVALID_ISO2_FORMAT');
      expect(iso2Issue?.severity).toBe(ReferenceDataValidationSeverity.ERROR);

      expect(iso3Issue?.code).toBe('INVALID_ISO3_FORMAT');
      expect(iso3Issue?.severity).toBe(ReferenceDataValidationSeverity.ERROR);
    });

    it('allows import when only WARNING or INFO issues exist', () => {
      const input: UpsertReferenceCountryDto = {
        iso2Code: 'FR',
        iso3Code: 'FRA',
        name: 'France'
        // region & officialName omitted -> produces WARNING and INFO
      };

      const report = service.validateCountry(input);

      expect(report.isComplete).toBe(true);
      expect(report.issues.some(i => i.severity === ReferenceDataValidationSeverity.WARNING)).toBe(true);
      expect(report.issues.some(i => i.severity === ReferenceDataValidationSeverity.INFO)).toBe(true);
      expect(report.issues.some(i => i.severity === ReferenceDataValidationSeverity.ERROR)).toBe(false);
      expect(report.canBeImported).toBe(true);
    });
  });

  describe('validateCurrency', () => {
    it('returns isComplete true and canBeImported true for a valid currency', () => {
      const input: ReferenceCurrencyDto = {
        id: 'currency-test',
        isoCode: 'USD',
        numericCode: '840',
        name: 'US Dollar',
        symbol: '$',
        minorUnit: 2,
        isActive: true
      };

      const report = service.validateCurrency(input);

      expect(report.entityType).toBe('CURRENCY');
      expect(report.deterministicKey).toBe('USD');
      expect(report.isComplete).toBe(true);
      expect(report.canBeImported).toBe(true);
      expect(report.missingFields).toHaveLength(0);
    });

    it('lists missing required fields and sets canBeImported false when missing', () => {
      const input = {
        isoCode: 'USD',
        name: ''
      } as UpsertReferenceCurrencyDto;

      const report = service.validateCurrency(input);

      expect(report.isComplete).toBe(false);
      expect(report.canBeImported).toBe(false);
      expect(report.missingFields).toContain('name');
    });

    it('produces ERROR issues for invalid numericCode or minorUnit', () => {
      const input: UpsertReferenceCurrencyDto = {
        isoCode: 'USD',
        name: 'US Dollar',
        numericCode: '84', // Invalid numericCode, should be 3 digits
        minorUnit: 5 // Invalid minorUnit, should be 0..4
      };

      const report = service.validateCurrency(input);

      expect(report.canBeImported).toBe(false);
      expect(report.issues.some(i => i.fieldName === 'numericCode' && i.severity === ReferenceDataValidationSeverity.ERROR)).toBe(true);
      expect(report.issues.some(i => i.fieldName === 'minorUnit' && i.severity === ReferenceDataValidationSeverity.ERROR)).toBe(true);
    });
  });

  describe('validateLanguage', () => {
    it('returns isComplete true and canBeImported true for a valid language', () => {
      const input: ReferenceLanguageDto = {
        id: 'language-test',
        isoCode: 'ar',
        name: 'Arabic',
        direction: 'RTL',
        isActive: true
      };

      const report = service.validateLanguage(input);

      expect(report.entityType).toBe('LANGUAGE');
      expect(report.deterministicKey).toBe('ar');
      expect(report.isComplete).toBe(true);
      expect(report.canBeImported).toBe(true);
    });

    it('accepts valid BCP-47 language tag like pt-br', () => {
      const input: ReferenceLanguageDto = {
        id: 'language-test',
        isoCode: 'pt-br',
        name: 'Portuguese (Brazil)',
        direction: 'LTR',
        isActive: true
      };

      const report = service.validateLanguage(input);

      expect(report.deterministicKey).toBe('pt-br');
      expect(report.isComplete).toBe(true);
      expect(report.canBeImported).toBe(true);
    });

    it('produces ERROR issue for invalid direction', () => {
      const input = {
        isoCode: 'en',
        name: 'English',
        direction: 'INVALID' as any
      } as UpsertReferenceLanguageDto;

      const report = service.validateLanguage(input);

      expect(report.canBeImported).toBe(false);
      expect(report.issues.some(i => i.fieldName === 'direction' && i.severity === ReferenceDataValidationSeverity.ERROR)).toBe(true);
    });
  });

  describe('validateCity', () => {
    it('returns isComplete true and computes deterministicKey as countryIso2Code:name', () => {
      const input: ReferenceCityDto = {
        id: 'city-test',
        countryIso2Code: 'EG',
        name: 'Cairo',
        latitude: 30.0444,
        longitude: 31.2357,
        isActive: true
      };

      const report = service.validateCity(input);

      expect(report.entityType).toBe('CITY');
      expect(report.deterministicKey).toBe('EG:Cairo');
      expect(report.isComplete).toBe(true);
      expect(report.canBeImported).toBe(true);
    });

    it('produces ERROR issues for invalid coordinates', () => {
      const input: UpsertReferenceCityDto = {
        countryIso2Code: 'EG',
        name: 'Alexandria',
        latitude: 100, // Invalid latitude (> 90)
        longitude: -200 // Invalid longitude (< -180)
      };

      const report = service.validateCity(input);

      expect(report.canBeImported).toBe(false);
      expect(report.issues.some(i => i.fieldName === 'latitude' && i.severity === ReferenceDataValidationSeverity.ERROR)).toBe(true);
      expect(report.issues.some(i => i.fieldName === 'longitude' && i.severity === ReferenceDataValidationSeverity.ERROR)).toBe(true);
    });
  });
});
