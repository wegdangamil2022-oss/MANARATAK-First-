/**
 * Review triage only. A REVIEWABLE screening result is NOT an approved seed:
 * it has no durable reviewer decision, source-provider reconciliation or
 * transactional P7 canonical apply receipt.
 */
export type ReferenceImportTriage =
  | 'REVIEWABLE'
  | 'SOURCE_ISSUES_REQUIRE_REVIEW'
  | 'LEGACY_RECEIPT_MISSING_EVIDENCE'
  | 'INVALID_SOURCE';

export interface ReferenceImportTriageInput {
  state: 'NEEDS_OWNER_REVIEW' | 'INVALID' | 'UNKNOWN';
  entityType: 'COUNTRY' | 'CURRENCY' | 'LANGUAGE' | 'CITY' | null;
  canonicalKey: string | null;
  sourceArtifactId: string | null;
  sourceContentHash: string | null;
  normalizedPayloadHash: string | null;
  issueCodes: readonly string[];
}

export function classifyReferenceImportTriage(input: ReferenceImportTriageInput): ReferenceImportTriage {
  if (input.state === 'INVALID') return 'INVALID_SOURCE';
  const sha = /^[a-fA-F0-9]{64}$/;
  if (input.state !== 'NEEDS_OWNER_REVIEW' || !input.entityType ||
      !input.canonicalKey || !input.sourceArtifactId ||
      !input.sourceContentHash || !sha.test(input.sourceContentHash) ||
      !input.normalizedPayloadHash || !sha.test(input.normalizedPayloadHash))
    return 'LEGACY_RECEIPT_MISSING_EVIDENCE';
  if (input.issueCodes.length > 0) return 'SOURCE_ISSUES_REQUIRE_REVIEW';
  return 'REVIEWABLE';
}
