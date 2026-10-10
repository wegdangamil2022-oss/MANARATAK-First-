import { ReferenceDependencyImpact, ReferenceLifecycleState } from './ReferenceGovernance';
/** Retirement is never deletion or reassignment. Unknown text/external uses survive.
 * Archive is stricter than deprecation/replacement: block any observed relationship.
 */
export function assertReferenceRetirementPolicy(state: ReferenceLifecycleState, impact: ReferenceDependencyImpact, acknowledgement?: boolean): void {
  if (!Number.isSafeInteger(impact.knownTotal) || impact.knownTotal < 0) throw new Error('REFERENCE_IMPACT_UNAVAILABLE');
  if (state === ReferenceLifecycleState.DEPRECATED) return;
  if (acknowledgement !== true) throw new Error('REFERENCE_HISTORICAL_ACKNOWLEDGEMENT_REQUIRED');
  if (state === ReferenceLifecycleState.ARCHIVED && impact.knownTotal > 0) throw new Error('REFERENCE_ARCHIVE_HAS_DEPENDENCIES');
}
