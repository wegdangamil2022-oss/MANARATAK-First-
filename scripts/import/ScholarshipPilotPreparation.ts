import { createHash } from 'node:crypto';
import { literalScholarshipCriteria } from '@manaratak/domain';
import { readScholarshipMasterGuide } from './ScholarshipMasterGuideReader';
import { projectUnifiedScholarship } from './ScholarshipUnifiedSourceProjection';

/** A bounded, reproducible preview. It never resolves references or authorizes promotion. */
export function prepareScholarshipPilot(input: {
  bytes: Uint8Array;
  sourcePath: string;
  expectedArtifactHash: string;
  sourceRecordIds: readonly string[];
  existingSourceRecordIds: readonly string[];
}) {
  const artifactHash = createHash('sha256').update(input.bytes).digest('hex');
  if (artifactHash !== input.expectedArtifactHash)
    throw new Error('SCHOLARSHIP_PILOT_SOURCE_CHANGED');
  if (
    input.sourceRecordIds.length < 1 ||
    input.sourceRecordIds.length > 5 ||
    new Set(input.sourceRecordIds).size !== input.sourceRecordIds.length
  )
    throw new Error('SCHOLARSHIP_PILOT_REQUIRES_ONE_TO_FIVE_UNIQUE_RECORDS');
  const records = readScholarshipMasterGuide(
    new TextDecoder('utf-8', { fatal: true }).decode(input.bytes),
  );
  const rows = input.sourceRecordIds.map((sourceRecordId) => {
    if (input.existingSourceRecordIds.includes(sourceRecordId))
      throw new Error(`SCHOLARSHIP_PILOT_ALREADY_IMPORTED:${sourceRecordId}`);
    const record = records.find((candidate) => candidate.sourceRecordId === sourceRecordId);
    if (!record) throw new Error(`SCHOLARSHIP_PILOT_RECORD_NOT_FOUND:${sourceRecordId}`);
    const payload = projectUnifiedScholarship(record, input.sourcePath, artifactHash);
    return {
      sourceRecordId,
      displayNumber: record.displayNumber,
      sourceHash: record.sourceHash,
      sourceLineNumber: record.sourceLineNumber,
      title: record.title,
      payload,
      counts: {
        benefits: Array.isArray(payload.metadata?.benefits) ? payload.metadata.benefits.length : 0,
        criteria: literalScholarshipCriteria(record.sourceEligibility?.text ?? '').length,
        documents: Array.isArray(payload.requiredDocuments) ? payload.requiredDocuments.length : 0,
        universities: Array.isArray(payload.targetUniversities)
          ? payload.targetUniversities.length
          : 0,
      },
      disposition: 'HOLD_OFFICIAL_SOURCE_AND_CANONICAL_REVIEW' as const,
    };
  });
  return {
    sourcePath: input.sourcePath,
    artifactHash,
    totalSourceRecords: records.length,
    rows,
    databaseWrites: 0 as const,
    canonicalAssignments: 0 as const,
    publication: false as const,
  };
}
