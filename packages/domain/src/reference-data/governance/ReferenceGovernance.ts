export enum ReferenceLifecycleState {
  ACTIVE = 'ACTIVE',
  DEPRECATED = 'DEPRECATED',
  ARCHIVED = 'ARCHIVED',
  SUPERSEDED = 'SUPERSEDED',
  MERGED = 'MERGED',
}

export type GovernedReferenceEntityType = 'COUNTRY' | 'CURRENCY' | 'LANGUAGE' | 'CITY' | 'REGION';

export class ReferenceRegionCommandError extends Error {
  constructor(public readonly code: 'REGION_NOT_FOUND' | 'REGION_VERSION_CONFLICT' | 'REGION_IDENTITY_IMMUTABLE' | 'REGION_CODE_CONFLICT' | 'REGION_COUNTRY_INACTIVE' | 'REGION_NOT_ACTIVE' | 'REGION_HAS_DEPENDENCIES' | 'REGION_TRANSITION_INVALID' | 'REGION_TARGET_INVALID' | 'REGION_IMPACT_CERTIFICATION_REQUIRED') {
    super(code);
    this.name = 'ReferenceRegionCommandError';
  }
}
export type ReferenceRelationshipType = 'SUPERSEDED_BY' | 'MERGED_INTO';

export interface ReferenceAliasInput {
  alias: string;
  locale?: string | null;
  aliasType?: 'COMMON' | 'HISTORIC' | 'PROVIDER' | 'TRANSLITERATION' | 'OTHER';
}

export interface ReferenceProviderMappingInput {
  providerSystem: string;
  providerId: string;
}

export interface ReferenceVersionDto {
  id: string;
  entityType: GovernedReferenceEntityType;
  referenceId: string;
  versionNumber: number;
  lifecycleState: ReferenceLifecycleState;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  snapshot: Record<string, unknown>;
  changeReason?: string | null;
  actorId?: string | null;
  createdAt: Date;
}

export interface ReferenceHistoryPage {
  data: ReferenceVersionDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ReferenceRelationshipDto {
  id: string;
  sourceEntityType: GovernedReferenceEntityType;
  sourceReferenceId: string;
  relationshipType: ReferenceRelationshipType;
  targetEntityType: GovernedReferenceEntityType;
  targetReferenceId: string;
  reason?: string | null;
  actorId?: string | null;
  createdAt: Date;
}

export interface ReferenceLifecycleTransitionCommand {
  entityType: GovernedReferenceEntityType;
  referenceId: string;
  toState: ReferenceLifecycleState;
  targetReferenceId?: string;
  reason: string;
  actorId: string;
  expectedVersion?: number;
}

export function assertReferenceLifecycleTransition(
  from: ReferenceLifecycleState,
  to: ReferenceLifecycleState,
  targetReferenceId?: string,
): void {
  if (from === to) throw new Error('REFERENCE_LIFECYCLE_NOOP_TRANSITION');
  if ([ReferenceLifecycleState.ARCHIVED, ReferenceLifecycleState.SUPERSEDED, ReferenceLifecycleState.MERGED].includes(from)) {
    throw new Error('REFERENCE_LIFECYCLE_TERMINAL_STATE');
  }
  const allowed = from === ReferenceLifecycleState.ACTIVE
    ? [ReferenceLifecycleState.DEPRECATED]
    : [ReferenceLifecycleState.ARCHIVED, ReferenceLifecycleState.SUPERSEDED, ReferenceLifecycleState.MERGED];
  if (!allowed.includes(to)) throw new Error(`REFERENCE_LIFECYCLE_TRANSITION_NOT_ALLOWED:${from}->${to}`);
  if ([ReferenceLifecycleState.SUPERSEDED, ReferenceLifecycleState.MERGED].includes(to) && !targetReferenceId) {
    throw new Error('REFERENCE_LIFECYCLE_TARGET_REQUIRED');
  }
}

export function lifecycleIsActive(state: ReferenceLifecycleState): boolean {
  return state === ReferenceLifecycleState.ACTIVE;
}

/** Owner-only governance read model: actual active aliases/mappings, never guessed. */
export interface ReferenceGovernanceDetails {
  entityType: GovernedReferenceEntityType;
  referenceId: string;
  aliases: ReferenceAliasInput[];
  providerMappings: ReferenceProviderMappingInput[];
  ambiguousAliases: Array<{ alias: string; conflictingReferenceIds: string[] }>;
}

/** Source-observed city quality counters; no inferred completeness percentage. */
export interface ReferenceCityQualityCounters {
  countryIso2Code: string;
  total: number;
  active: number;
  withoutAdministrativeRegion: number;
  withoutTimezone: number;
  withoutCanonicalIdentity: number;
  withoutCountryReference: number;
  inconsistentCountryReference: number;
  inconsistentAdministrativeRegion: number;
}

/**
 * Generic dependency read model. Known counts are derived from FK-backed owner
 * relations in infrastructure only; this intentionally never imports business
 * services into P7. PARTIAL means terminal lifecycle cannot be auto-approved.
 */
export interface ReferenceDependencyImpact {
  entityType: GovernedReferenceEntityType;
  referenceId: string;
  knownRelationCounts: Record<string, number>;
  knownTotal: number;
  coverage: 'PARTIAL';
  unobservedConsumers: 'unknown';
  terminalSafe: false;
}

/** Deliberate operator action; never an implicit provider-mapping upsert. */
export interface ReferenceProviderMappingReassignmentCommand {
  entityType: Exclude<GovernedReferenceEntityType, 'REGION'>;
  fromReferenceId: string;
  toReferenceId: string;
  providerSystem: string;
  providerId: string;
  fromExpectedVersion: number;
  toExpectedVersion: number;
  reason: string;
  /** Unique operator request ID; replay must not append new audit/outbox events. */
  reconciliationId: string;
  actorId: string;
}

/** Explicit legacy-city link repair; never a bulk backfill or city UUID change. */
export interface ReferenceCityCountryLinkRepairCommand {
  cityId: string;
  expectedVersion: number;
  countryReferenceId: string;
  actorId: string;
  reason: string;
}

/** Review-only view over durable P6 screening receipts. No apply permission. */
export interface ReferenceImportScreeningReview {
  receiptId: string;
  handoffKey: string;
  screenedAt: Date;
  state: 'NEEDS_OWNER_REVIEW' | 'INVALID' | 'UNKNOWN';
  entityType: 'COUNTRY' | 'CURRENCY' | 'LANGUAGE' | 'CITY' | null;
  canonicalKey: string | null;
  normalizedPayloadHash: string | null;
  sourceArtifactId: string | null;
  sourceContentHash: string | null;
  issueCodes: string[];
  triage: 'REVIEWABLE' | 'SOURCE_ISSUES_REQUIRE_REVIEW' | 'LEGACY_RECEIPT_MISSING_EVIDENCE' | 'INVALID_SOURCE';
  reviewed: false;
  approved: false;
  applied: false;
}

export interface ReferenceImportScreeningReviewPage {
  data: ReferenceImportScreeningReview[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  applyAvailable: false;
}
