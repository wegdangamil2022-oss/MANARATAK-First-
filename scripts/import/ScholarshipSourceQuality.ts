import { sourceReviewHash } from '@manaratak/application';
import { readScholarshipMasterGuide } from './ScholarshipMasterGuideReader';
import { reviewScholarshipRelationships, scholarshipGuideSection } from './ScholarshipRelationshipSourceReview';

export function reconcileScholarshipGuide(content: string, artifactHash: string, declaredImportedCount: number | null) {
  if (!/^[a-f0-9]{64}$/.test(artifactHash) || (declaredImportedCount !== null && (!Number.isSafeInteger(declaredImportedCount) || declaredImportedCount < 0))) throw new Error('SCHOLARSHIP_SOURCE_PROVENANCE_INVALID');
  const records = readScholarshipMasterGuide(content);
  const counts: Record<string, number> = {};
  const decisions = records.map(record => {
    const marker = record.importStatus ?? '';
    const disposition = record.explicitlyImported ? 'EXPLICIT_IMPORTED_CANDIDATE' : /^(?:DUPLICATE|MERGED)(?:$|[_\s(—-])/.test(marker) ? 'MERGED_DUPLICATE' : /^REVIEW(?:$|[_\s(—-])/.test(marker) ? 'REVIEW' : /^EXCLUDED(?:$|[_\s(—-])/.test(marker) ? 'EXCLUDED' : /^CONTROL(?:$|[_\s(—-])/.test(marker) ? 'CONTROL_ONLY' : !marker ? 'UNMARKED' : 'UNKNOWN_MARKER';
    counts[disposition] = (counts[disposition] ?? 0) + 1;
    // The degree-only guide omits participating universities for single-institution
    // awards, shifting sections 8–13. Resolve labels rather than ordinal positions.
    const section = (label: string) => scholarshipGuideSection(record, label);
    const relationshipReview = reviewScholarshipRelationships(record);
    const testSource = [section('الشروط ومعايير التقديم'), section('المستندات المطلوبة'), section('ملاحظات مهمة')].filter(Boolean).join('\n');
    const urls = [...new Set([...section('رابط التقديم').matchAll(/https?:\/\/[^\s<>]+/g)].map(match => match[0]))];
    return { sourceRecordId: record.sourceRecordId, sourceLineNumber: record.sourceLineNumber, sourceHash: record.sourceHash, artifactHash, marker: record.importStatus, disposition, decision: record.explicitlyImported ? 'HOLD_CANONICAL_AND_OFFICIAL_SOURCE_REVIEW' : 'DO_NOT_PROMOTE', title: record.title, applicationUrls: urls, relationshipReview,
      canonicalQueue: record.explicitlyImported ? [
        { target: 'PROVIDER_UNIVERSITY', rawValue: section('الجهة المانحة'), policy: 'UNIVERSITY_REQUIRES_EXPLICIT_EXISTING_INS_ID_OR_REVIEWED_NON_UNIVERSITY' },
        { target: 'UNIVERSITY', rawValue: section('الجامعات المشاركة'), policy: 'NO_NAME_ONLY_LINK_OR_CREATION' },
        { target: 'MAJOR', rawValue: section('التخصصات المتاحة'), policy: 'EXISTING_MAJOR_ID_REQUIRED_NO_NAME_ONLY_CREATION' },
        { target: 'ACADEMIC_PROGRAM', rawValue: section('التخصصات المتاحة'), policy: 'EXPLICIT_PROGRAM_ID_AND_UNIVERSITY_OWNER_REQUIRED; NO_GENERAL_MAJOR_TO_PROGRAM_INFERENCE' },
        { target: 'COUNTRY', rawValue: section('المعلومات الأساسية'), policy: 'REVIEW_STUDY_COUNTRY_NOT_PROVIDER_HEADQUARTERS_OR_APPLICANT_NATIONALITY' },
        { target: 'LANGUAGE', rawValue: section('المعلومات الأساسية'), policy: 'REVIEW_STUDY_LANGUAGE_SEPARATELY_FROM_EVIDENCE_TEST' },
        { target: 'CURRENCY', rawValue: section('المميزات والتمويل'), policy: 'REVIEW_CURRENCY_AND_AMOUNT_WITHOUT_FABRICATED_FINANCIAL_VALUES' },
        { target: 'DEGREE_LEVEL', rawValue: [relationshipReview.academicLevelsRaw, section('المعلومات الأساسية')].filter(Boolean).join('\n'), policy: 'REVIEW_EXPLICIT_DEGREE_TERMS_BEFORE_CANONICAL_RESOLUTION' },
        { target: 'INTERNATIONAL_TEST', rawValue: testSource, policy: 'REVIEW_TEST_REQUIREMENT_OR_EXPLICIT_NOT_APPLICABLE; PRESERVE_ALTERNATIVES_DOCUMENTS_AND_WAIVERS' },
      ].map(request => ({ ...request, state: 'REVIEW_REQUIRED', canonicalId: null })) : [],
      sourceDecisionHash: sourceReviewHash({ artifactHash, sourceHash: record.sourceHash, sourceRecordId: record.sourceRecordId, disposition }), databaseWrites: 0 as const };
  });
  const explicitCandidates = counts.EXPLICIT_IMPORTED_CANDIDATE ?? 0;
  return { artifactHash, totalSections: records.length, uniqueSourceIds: new Set(records.map(record => record.sourceRecordId)).size, counts, declaredImportedCount, explicitImportedCandidates: explicitCandidates, summaryDifference: declaredImportedCount === null ? null : declaredImportedCount - explicitCandidates, differencePolicy: 'SUMMARY_IS_NOT_RECORD_EVIDENCE; NO_SYNTHETIC_RECORDS; UNMARKED_AND_UNKNOWN_REMAIN_HELD', decisions, databaseWrites: 0 as const, runtime: 'RUNTIME_UNTESTED' as const };
}
