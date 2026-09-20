import {
  ReferenceCountryDto,
  UpsertReferenceCountryDto,
  ReferenceCurrencyDto,
  UpsertReferenceCurrencyDto,
  ReferenceLanguageDto,
  UpsertReferenceLanguageDto,
  ReferenceCityDto,
  UpsertReferenceCityDto
} from '../dto/ReferenceDataContracts';
import {
  ReferenceDataCompletenessReport,
  ReferenceDataValidationIssue,
  ReferenceDataValidationSeverity
} from '../validation/ReferenceDataValidationTypes';
import { IReferenceDataValidationService } from '../contracts/IReferenceDataValidationService';

export class ReferenceDataValidationService implements IReferenceDataValidationService {
  public validateCountry(
    input: ReferenceCountryDto | UpsertReferenceCountryDto
  ): ReferenceDataCompletenessReport {
    const requiredFields = ['iso2Code', 'iso3Code', 'name'];
    const presentFields: string[] = [];
    const missingFields: string[] = [];
    const issues: ReferenceDataValidationIssue[] = [];

    const iso2Code = input.iso2Code ? String(input.iso2Code).trim() : '';
    const iso3Code = input.iso3Code ? String(input.iso3Code).trim() : '';
    const name = input.name ? String(input.name).trim() : '';

    if (iso2Code) {
      presentFields.push('iso2Code');
      if (!/^[A-Z]{2}$/.test(iso2Code)) {
        issues.push({
          fieldName: 'iso2Code',
          code: 'INVALID_ISO2_FORMAT',
          message: 'iso2Code must be exactly 2 uppercase letters',
          severity: ReferenceDataValidationSeverity.ERROR
        });
      }
    } else {
      missingFields.push('iso2Code');
      issues.push({
        fieldName: 'iso2Code',
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Field iso2Code is required',
        severity: ReferenceDataValidationSeverity.ERROR
      });
    }

    if (iso3Code) {
      presentFields.push('iso3Code');
      if (!/^[A-Z]{3}$/.test(iso3Code)) {
        issues.push({
          fieldName: 'iso3Code',
          code: 'INVALID_ISO3_FORMAT',
          message: 'iso3Code must be exactly 3 uppercase letters',
          severity: ReferenceDataValidationSeverity.ERROR
        });
      }
    } else {
      missingFields.push('iso3Code');
      issues.push({
        fieldName: 'iso3Code',
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Field iso3Code is required',
        severity: ReferenceDataValidationSeverity.ERROR
      });
    }

    if (name) {
      presentFields.push('name');
    } else {
      missingFields.push('name');
      issues.push({
        fieldName: 'name',
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Field name is required',
        severity: ReferenceDataValidationSeverity.ERROR
      });
    }

    if (!input.region) {
      issues.push({
        fieldName: 'region',
        code: 'MISSING_RECOMMENDED_FIELD',
        message: 'region is recommended',
        severity: ReferenceDataValidationSeverity.WARNING
      });
    }

    if (!input.officialName) {
      issues.push({
        fieldName: 'officialName',
        code: 'MISSING_OPTIONAL_FIELD',
        message: 'officialName is optional',
        severity: ReferenceDataValidationSeverity.INFO
      });
    }

    const isComplete = missingFields.length === 0;
    const canBeImported = isComplete && !issues.some(i => i.severity === ReferenceDataValidationSeverity.ERROR);

    return {
      entityType: 'COUNTRY',
      deterministicKey: iso2Code,
      requiredFields,
      presentFields,
      missingFields,
      issues,
      isComplete,
      canBeImported
    };
  }

  public validateCurrency(
    input: ReferenceCurrencyDto | UpsertReferenceCurrencyDto
  ): ReferenceDataCompletenessReport {
    const requiredFields = ['isoCode', 'name'];
    const presentFields: string[] = [];
    const missingFields: string[] = [];
    const issues: ReferenceDataValidationIssue[] = [];

    const isoCode = input.isoCode ? String(input.isoCode).trim() : '';
    const name = input.name ? String(input.name).trim() : '';

    if (isoCode) {
      presentFields.push('isoCode');
      if (!/^[A-Z]{3}$/.test(isoCode)) {
        issues.push({
          fieldName: 'isoCode',
          code: 'INVALID_ISO_FORMAT',
          message: 'isoCode must be exactly 3 uppercase letters',
          severity: ReferenceDataValidationSeverity.ERROR
        });
      }
    } else {
      missingFields.push('isoCode');
      issues.push({
        fieldName: 'isoCode',
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Field isoCode is required',
        severity: ReferenceDataValidationSeverity.ERROR
      });
    }

    if (name) {
      presentFields.push('name');
    } else {
      missingFields.push('name');
      issues.push({
        fieldName: 'name',
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Field name is required',
        severity: ReferenceDataValidationSeverity.ERROR
      });
    }

    if (input.numericCode !== undefined && input.numericCode !== null && String(input.numericCode).trim() !== '') {
      const numCodeStr = String(input.numericCode).trim();
      if (!/^\d{3}$/.test(numCodeStr)) {
        issues.push({
          fieldName: 'numericCode',
          code: 'INVALID_NUMERIC_CODE',
          message: 'numericCode must be exactly 3 digits',
          severity: ReferenceDataValidationSeverity.ERROR
        });
      }
    }

    if (input.minorUnit !== undefined && input.minorUnit !== null) {
      const mu = input.minorUnit;
      if (typeof mu !== 'number' || !Number.isInteger(mu) || mu < 0 || mu > 4) {
        issues.push({
          fieldName: 'minorUnit',
          code: 'INVALID_MINOR_UNIT',
          message: 'minorUnit must be an integer between 0 and 4',
          severity: ReferenceDataValidationSeverity.ERROR
        });
      }
    }

    if (!input.symbol) {
      issues.push({
        fieldName: 'symbol',
        code: 'MISSING_OPTIONAL_FIELD',
        message: 'symbol is optional',
        severity: ReferenceDataValidationSeverity.INFO
      });
    }

    const isComplete = missingFields.length === 0;
    const canBeImported = isComplete && !issues.some(i => i.severity === ReferenceDataValidationSeverity.ERROR);

    return {
      entityType: 'CURRENCY',
      deterministicKey: isoCode,
      requiredFields,
      presentFields,
      missingFields,
      issues,
      isComplete,
      canBeImported
    };
  }

  public validateLanguage(
    input: ReferenceLanguageDto | UpsertReferenceLanguageDto
  ): ReferenceDataCompletenessReport {
    const requiredFields = ['isoCode', 'name', 'direction'];
    const presentFields: string[] = [];
    const missingFields: string[] = [];
    const issues: ReferenceDataValidationIssue[] = [];

    const isoCode = input.isoCode ? String(input.isoCode).trim() : '';
    const name = input.name ? String(input.name).trim() : '';

    if (isoCode) {
      presentFields.push('isoCode');
      if (!/^[a-z]{2,8}(-[a-z0-9]+)*$/.test(isoCode)) {
        issues.push({
          fieldName: 'isoCode',
          code: 'INVALID_ISO_FORMAT',
          message: 'isoCode must be 2 to 8 lowercase letters or BCP-47 style with hyphen',
          severity: ReferenceDataValidationSeverity.ERROR
        });
      }
    } else {
      missingFields.push('isoCode');
      issues.push({
        fieldName: 'isoCode',
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Field isoCode is required',
        severity: ReferenceDataValidationSeverity.ERROR
      });
    }

    if (name) {
      presentFields.push('name');
    } else {
      missingFields.push('name');
      issues.push({
        fieldName: 'name',
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Field name is required',
        severity: ReferenceDataValidationSeverity.ERROR
      });
    }

    if (input.direction === 'LTR' || input.direction === 'RTL') {
      presentFields.push('direction');
    } else if (input.direction) {
      issues.push({
        fieldName: 'direction',
        code: 'INVALID_DIRECTION',
        message: 'direction must be LTR or RTL',
        severity: ReferenceDataValidationSeverity.ERROR
      });
    } else {
      missingFields.push('direction');
      issues.push({
        fieldName: 'direction',
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Field direction is required',
        severity: ReferenceDataValidationSeverity.ERROR
      });
    }

    if (!input.nativeName) {
      issues.push({
        fieldName: 'nativeName',
        code: 'MISSING_OPTIONAL_FIELD',
        message: 'nativeName is optional',
        severity: ReferenceDataValidationSeverity.INFO
      });
    }

    const isComplete = missingFields.length === 0;
    const canBeImported = isComplete && !issues.some(i => i.severity === ReferenceDataValidationSeverity.ERROR);

    return {
      entityType: 'LANGUAGE',
      deterministicKey: isoCode,
      requiredFields,
      presentFields,
      missingFields,
      issues,
      isComplete,
      canBeImported
    };
  }

  public validateCity(
    input: ReferenceCityDto | UpsertReferenceCityDto
  ): ReferenceDataCompletenessReport {
    const requiredFields = ['countryIso2Code', 'name'];
    const presentFields: string[] = [];
    const missingFields: string[] = [];
    const issues: ReferenceDataValidationIssue[] = [];

    const countryIso2Code = input.countryIso2Code ? String(input.countryIso2Code).trim() : '';
    const name = input.name ? String(input.name).trim() : '';

    if (countryIso2Code) {
      presentFields.push('countryIso2Code');
      if (!/^[A-Z]{2}$/.test(countryIso2Code)) {
        issues.push({
          fieldName: 'countryIso2Code',
          code: 'INVALID_COUNTRY_ISO2',
          message: 'countryIso2Code must be exactly 2 uppercase letters',
          severity: ReferenceDataValidationSeverity.ERROR
        });
      }
    } else {
      missingFields.push('countryIso2Code');
      issues.push({
        fieldName: 'countryIso2Code',
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Field countryIso2Code is required',
        severity: ReferenceDataValidationSeverity.ERROR
      });
    }

    if (name) {
      presentFields.push('name');
    } else {
      missingFields.push('name');
      issues.push({
        fieldName: 'name',
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Field name is required',
        severity: ReferenceDataValidationSeverity.ERROR
      });
    }

    if (input.latitude !== undefined && input.latitude !== null) {
      const lat = input.latitude;
      if (typeof lat !== 'number' || isNaN(lat) || lat < -90 || lat > 90) {
        issues.push({
          fieldName: 'latitude',
          code: 'INVALID_LATITUDE',
          message: 'latitude must be between -90 and 90',
          severity: ReferenceDataValidationSeverity.ERROR
        });
      }
    }

    if (input.longitude !== undefined && input.longitude !== null) {
      const lng = input.longitude;
      if (typeof lng !== 'number' || isNaN(lng) || lng < -180 || lng > 180) {
        issues.push({
          fieldName: 'longitude',
          code: 'INVALID_LONGITUDE',
          message: 'longitude must be between -180 and 180',
          severity: ReferenceDataValidationSeverity.ERROR
        });
      }
    }

    if (!input.timezone) {
      issues.push({
        fieldName: 'timezone',
        code: 'MISSING_OPTIONAL_FIELD',
        message: 'timezone is optional',
        severity: ReferenceDataValidationSeverity.INFO
      });
    }

    const isComplete = missingFields.length === 0;
    const canBeImported = isComplete && !issues.some(i => i.severity === ReferenceDataValidationSeverity.ERROR);

    return {
      entityType: 'CITY',
      deterministicKey: `${countryIso2Code}:${name}`,
      requiredFields,
      presentFields,
      missingFields,
      issues,
      isComplete,
      canBeImported
    };
  }
}
