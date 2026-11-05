import type { ScholarshipImportPayload } from '@manaratak/domain';
import type { ScholarshipGuideRecord } from './ScholarshipMasterGuideReader';
import { scholarshipGuideSection } from './ScholarshipRelationshipSourceReview';

export function scholarshipSourceList(text: string): string[] {
  if (!text.trim()) return [];
  return text
    .split(/^\s*\d+[.)]\s+/m)
    .map((value) => value.trim())
    .filter(Boolean);
}

export function scholarshipBasicFields(record: ScholarshipGuideRecord): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const match of scholarshipGuideSection(record, 'المعلومات الأساسية').matchAll(
    /^\s*-\s+\*\*(.+?):\*\*\s*(.*?)\s*$/gm,
  )) {
    if (match[1] in fields)
      throw new Error(`SCHOLARSHIP_DUPLICATE_BASIC_FIELD:${record.sourceRecordId}:${match[1]}`);
    fields[match[1]] = match[2];
  }
  return fields;
}

/** Keep explicit source grouping; headings are editorial labels, never canonical IDs. */
export function scholarshipSourceGroups(text: string) {
  const groups: Array<{ id: string; title: string; items: string[] }> = [];
  let title = '',
    body: string[] = [];
  const finish = () => {
    const items = scholarshipSourceList(body.join('\n'));
    if (items.length) groups.push({ id: `source-group-${groups.length + 1}`, title, items });
    body = [];
  };
  for (const line of text.split(/\r?\n/)) {
    const heading = /^\s*\*\*(.+?)\*\*\s*$/.exec(line);
    if (heading) {
      finish();
      title = heading[1];
    } else body.push(line);
  }
  finish();
  return groups;
}

/** Pure projection. No enrichment, fuzzy matching, date/timezone guessing or canonical writes. */
export function projectUnifiedScholarship(
  record: ScholarshipGuideRecord,
  sourcePath: string,
  artifactHash: string,
): ScholarshipImportPayload {
  if (record.sourceFormat !== 'UNIFIED_2027')
    throw new Error('SCHOLARSHIP_UNIFIED_SOURCE_REQUIRED');
  if (!/^[a-f0-9]{64}$/.test(artifactHash)) throw new Error('SCHOLARSHIP_ARTIFACT_HASH_REQUIRED');
  const section = (label: string) => scholarshipGuideSection(record, label);
  const basics = scholarshipBasicFields(record);
  const fundingGroups = scholarshipSourceGroups(section('التمويل والمزايا'));
  const degreeGroups = scholarshipSourceGroups(section('التخصصات المتاحة'));
  const benefits = fundingGroups.flatMap((group, groupIndex) =>
    group.items.map((valueText, index) => ({
      benefitKey: `source-benefit-${groupIndex + 1}-${index + 1}`,
      benefitTypeCode: 'GENERAL',
      valueText,
      displayOrder: groupIndex * 1000 + index,
    })),
  );
  const links = [
    ...section('رابط التقديم').matchAll(
      /^\*\*(رابط التقديم|دليل التقديم الرسمي):\*\*\s*(\S+)\s*$/gm,
    ),
  ].map((match) => ({
    title: match[1],
    url: match[2],
    field: match[1] === 'رابط التقديم' ? 'applicationUrl' : 'officialSourceUrl',
  }));
  const funding = basics['نوع التمويل'];
  return {
    sourceReferenceId: record.sourceRecordId,
    scholarshipName: basics['اسم المنحة'] || record.title,
    providerName: basics['الجهة المانحة'],
    studyCountry: basics['بلد الدراسة'],
    studyLanguage: basics['لغة الدراسة'],
    degreeLevel: basics['الدرجة التعليمية'],
    isFullyFunded: funding === 'كامل',
    fundingCoverage: funding,
    coverageDetails: section('التمويل والمزايا'),
    description: section('نبذة عن المنحة'),
    eligibilityCriteria: record.sourceEligibility?.text ?? '',
    requiredDocuments: scholarshipSourceList(section('المستندات المطلوبة')),
    targetUniversities: scholarshipSourceList(section('الجامعات المشاركة')),
    eligibleMajorsOrFields: degreeGroups.flatMap((group) => group.items),
    applicationLink: links.find((link) => link.field === 'applicationUrl')?.url,
    officialSourceUrl: links.find((link) => link.field === 'officialSourceUrl')?.url,
    metadata: {
      sourceReferenceId: record.sourceRecordId,
      sourceFile: sourcePath,
      sourceLocale: 'ar',
      relatedSourceRecordIds: record.relatedSourceRecordIds ?? [],
      sourceArtifactSha256: artifactHash,
      sourceRecordSha256: record.sourceHash,
      sourceLineNumber: record.sourceLineNumber,
      sourceEligibility: record.sourceEligibility,
      rawSourceSections: Object.fromEntries(
        Object.entries(record.fields).map(([key, value]) => [key.replace(/^\d+\.\s*/, ''), value]),
      ),
      rawSourceBlock: record.rawContent,
      rawSourceBlockSha256: record.sourceHash,
      sourceBasicFields: basics,
      academicYear: basics['العام الأكاديمي'],
      fundingTypeCode:
        funding === 'كامل'
          ? 'FULLY_FUNDED'
          : funding === 'جزئي'
            ? 'PARTIALLY_FUNDED'
            : funding === 'كامل وجزئي'
              ? 'MIXED'
              : undefined,
      notes: section('ملاحظات مهمة'),
      benefits,
      sourcePresentation: {
        officialEnglishName: record.officialEnglishName ?? '',
        applicationStatus: basics['حالة المنحة'] ?? '',
        deadlineText: basics['الموعد النهائي'] ?? '',
        degreeGroups,
      },
      adminPresentation: {
        fundingGroups: fundingGroups.map((group, groupIndex) => ({
          id: group.id,
          title: group.title || 'مزايا المنحة',
          benefitKeys: group.items.map(
            (_, index) => `source-benefit-${groupIndex + 1}-${index + 1}`,
          ),
        })),
        sourceGroups: [
          {
            id: 'application-links',
            title: 'روابط التقديم',
            links: links.map((link, index) => ({ id: `source-link-${index + 1}`, ...link })),
          },
        ],
      },
      sourceSectionCoverage: Object.keys(record.fields),
      reviewPolicy: 'SOURCE_ONLY_CANONICAL_AND_DATE_REVIEW_REQUIRED_NO_AUTOMATIC_PUBLICATION',
    },
  };
}
