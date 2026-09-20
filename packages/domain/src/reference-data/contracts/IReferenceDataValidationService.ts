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
import { ReferenceDataCompletenessReport } from '../validation/ReferenceDataValidationTypes';

export interface IReferenceDataValidationService {
  validateCountry(input: ReferenceCountryDto | UpsertReferenceCountryDto): ReferenceDataCompletenessReport;
  validateCurrency(input: ReferenceCurrencyDto | UpsertReferenceCurrencyDto): ReferenceDataCompletenessReport;
  validateLanguage(input: ReferenceLanguageDto | UpsertReferenceLanguageDto): ReferenceDataCompletenessReport;
  validateCity(input: ReferenceCityDto | UpsertReferenceCityDto): ReferenceDataCompletenessReport;
}
