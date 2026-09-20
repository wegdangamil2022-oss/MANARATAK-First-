import {
  ReferenceCountryDto,
  ReferenceCurrencyDto,
  ReferenceLanguageDto,
  ReferenceCityDto,
  UpsertReferenceCountryDto,
  UpsertReferenceCurrencyDto,
  UpsertReferenceLanguageDto,
  UpsertReferenceCityDto,
  ReferenceDataFilters,
  AdministrativeRegionDto
} from '../dto/ReferenceDataContracts';
import { AtomicPersistenceContext } from '../../event-foundation/outbox/TransactionalOutbox';
import { GovernedReferenceEntityType, ReferenceLifecycleTransitionCommand, ReferenceRelationshipDto, ReferenceVersionDto } from '../governance/ReferenceGovernance';

export interface IReferenceDataRepository {
  listCountries(filters: ReferenceDataFilters): Promise<ReferenceCountryDto[]>;
  listCurrencies(filters: ReferenceDataFilters): Promise<ReferenceCurrencyDto[]>;
  listLanguages(filters: ReferenceDataFilters): Promise<ReferenceLanguageDto[]>;
  listCities(filters: ReferenceDataFilters): Promise<ReferenceCityDto[]>;
  listRegions(filters: ReferenceDataFilters): Promise<AdministrativeRegionDto[]>;

  getCountry(iso2Code: string): Promise<ReferenceCountryDto | null>;
  getCurrency(isoCode: string): Promise<ReferenceCurrencyDto | null>;
  getLanguage(isoCode: string): Promise<ReferenceLanguageDto | null>;
  getRegionById(id: string): Promise<AdministrativeRegionDto | null>;
  
  upsertCountry(data: UpsertReferenceCountryDto): Promise<ReferenceCountryDto>;
  upsertCurrency(data: UpsertReferenceCurrencyDto): Promise<ReferenceCurrencyDto>;
  upsertLanguage(data: UpsertReferenceLanguageDto): Promise<ReferenceLanguageDto>;
  upsertCity(data: UpsertReferenceCityDto): Promise<ReferenceCityDto>;

  getReferenceHistory(entityType: GovernedReferenceEntityType, referenceId: string): Promise<ReferenceVersionDto[]>;
  getReferenceRelationships(entityType: GovernedReferenceEntityType, referenceId: string): Promise<ReferenceRelationshipDto[]>;
  transitionReferenceLifecycle(command: ReferenceLifecycleTransitionCommand): Promise<void>;
}

export interface ITransactionalReferenceDataRepository extends IReferenceDataRepository {
  upsertCountryInTransaction(data: UpsertReferenceCountryDto, context: AtomicPersistenceContext): Promise<ReferenceCountryDto>;
  upsertCurrencyInTransaction(data: UpsertReferenceCurrencyDto, context: AtomicPersistenceContext): Promise<ReferenceCurrencyDto>;
  upsertLanguageInTransaction(data: UpsertReferenceLanguageDto, context: AtomicPersistenceContext): Promise<ReferenceLanguageDto>;
  upsertCityInTransaction(data: UpsertReferenceCityDto, context: AtomicPersistenceContext): Promise<ReferenceCityDto>;
  transitionReferenceLifecycleInTransaction(command: ReferenceLifecycleTransitionCommand, context: AtomicPersistenceContext): Promise<void>;
}
