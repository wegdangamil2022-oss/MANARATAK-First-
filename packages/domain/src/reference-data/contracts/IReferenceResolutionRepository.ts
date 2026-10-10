import {
  AdministrativeRegionDto,
  ReferenceCityDto,
  ReferenceCountryDto,
  ReferenceCurrencyDto,
  ReferenceLanguageDto,
} from '../dto/ReferenceDataContracts';
import { ReferenceLookup, ReferenceResolutionMethod } from './IReferenceResolver';

export interface ReferenceResolutionMatch<T> {
  readonly record: T;
  readonly method: ReferenceResolutionMethod;
}

/**
 * Read-optimized resolution contract. Implementations must perform bounded,
 * database-side candidate lookup rather than materializing whole reference tables.
 */
export interface IReferenceResolutionRepository {
  resolveCountryCandidate(lookup: ReferenceLookup): Promise<ReferenceResolutionMatch<ReferenceCountryDto> | null>;
  resolveRegionCandidate(lookup: ReferenceLookup): Promise<ReferenceResolutionMatch<AdministrativeRegionDto> | null>;
  resolveCityCandidate(lookup: ReferenceLookup): Promise<ReferenceResolutionMatch<ReferenceCityDto> | null>;
  resolveLanguageCandidate(lookup: ReferenceLookup): Promise<ReferenceResolutionMatch<ReferenceLanguageDto> | null>;
  resolveCurrencyCandidate(lookup: ReferenceLookup): Promise<ReferenceResolutionMatch<ReferenceCurrencyDto> | null>;
  /** Only replacement outgoing from a historical source; reject multiple candidates. */
  getReplacement?(entityType: 'COUNTRY' | 'REGION' | 'CITY' | 'LANGUAGE' | 'CURRENCY', referenceId: string):
    Promise<{ relationshipType: 'SUPERSEDED_BY' | 'MERGED_INTO'; targetReferenceId: string } | null>;
}
