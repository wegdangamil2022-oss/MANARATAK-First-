import { sourceReviewHash } from '@manaratak/application';
import { readScholarshipMasterGuide } from './ScholarshipMasterGuideReader';

export function reconcileScholarshipGuide(content: string, artifactHash: string, declaredImportedCount: number) {
  if (!/^[a-f0-9]{64}$/.test(artifactHash) || !Number.isSafeInteger(declaredImportedCount) || declaredImportedCount < 0) throw new Error('SCHOLARSHIP_SOURCE_PROVENANCE_INVALID');
  const records = readScholarshipMasterGuide(content);
  const counts: Record<string, number> = {};
  const decisions = records.map(record => {
    const marker = record.importStatus ?? '';
    const disposition = record.explicitlyImported ? 'EXPLICIT_IMPORTED_CANDIDATE' : /^(?:DUPLICATE|MERGED)(?:$|[_\s(—-])/.test(marker) ? 'MERGED_DUPLICATE' : /^REVIEW(?:$|[_\s(—-])/.test(marker) ? 'REVIEW' : /^EXCLUDED(?:$|[_\s(—-])/.test(marker) ? 'EXCLUDED' : /^CONTROL(?:$|[_\s(—-])/.test(marker) ? 'CONTROL_ONLY' : !marker ? 'UNMARKED' : 'UNKNOWN_MARKER';
    counts[disposition] = (counts[disposition] ?? 0) + 1;
    const sections = Object.entries(record.fields);
    const section = (number: number) => sections.filter(([key]) => key.startsWith(`${number}. `)).map(([, value]) => value).join('\n');
    const urls = [...new Set([...section(12).matchAll(/https?:\/\/[^\s<>]+/g)].map(match => match[0]))];
    return { sourceRecordId: record.sourceRecordId, sourceLineNumber: record.sourceLineNumber, sourceHash: record.sourceHash, artifactHash, marker: record.importStatus, disposition, decision: record.explicitlyImported ? 'HOLD_CANONICAL_AND_OFFICIAL_SOURCE_REVIEW' : 'DO_NOT_PROMOTE', title: record.title, applicationUrls: urls,
      canonicalQueue: record.explicitlyImported ? [
        { target: 'PROVIDER_UNIVERSITY', rawValue: section(2), policy: 'UNIVERSITY_REQUIRES_EXPLICIT_EXISTING_INS_ID_OR_REVIEWED_NON_UNIVERSITY' },
        { target: 'UNIVERSITY', rawValue: section(8), policy: 'NO_NAME_ONLY_LINK_OR_CREATION' },
        { target: 'ACADEMIC_PROGRAM', rawValue: section(7), policy: 'EXPLICIT_PROGRAM_ID_AND_UNIVERSITY_OWNER_REQUIRED' },
        { target: 'DEGREE_LEVEL', rawValue: section(3), policy: 'REVIEW_EXPLICIT_DEGREE_TERMS_BEFORE_CANONICAL_RESOLUTION' },
        { target: 'INTERNATIONAL_TEST', rawValue: section(9), policy: 'REVIEW_TEST_REQUIREMENT_OR_EXPLICIT_NOT_APPLICABLE' },
      ].map(request => ({ ...request, state: 'REVIEW_REQUIRED', canonicalId: null })) : [],
      sourceDecisionHash: sourceReviewHash({ artifactHash, sourceHash: record.sourceHash, sourceRecordId: record.sourceRecordId, disposition }), databaseWrites: 0 as const };
  });
  const explicitCandidates = counts.EXPLICIT_IMPORTED_CANDIDATE ?? 0;
  return { artifactHash, totalSections: records.length, uniqueSourceIds: new Set(records.map(record => record.sourceRecordId)).size, counts, declaredImportedCount, explicitImportedCandidates: explicitCandidates, summaryDifference: declaredImportedCount - explicitCandidates, differencePolicy: 'SUMMARY_IS_NOT_RECORD_EVIDENCE; NO_SYNTHETIC_RECORDS; UNMARKED_AND_UNKNOWN_REMAIN_HELD', decisions, databaseWrites: 0 as const, runtime: 'RUNTIME_UNTESTED' as const };
}
