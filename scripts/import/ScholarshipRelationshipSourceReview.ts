import type { ScholarshipGuideRecord } from './ScholarshipMasterGuideReader';

export function scholarshipGuideSection(record: ScholarshipGuideRecord, label: string): string {
  return Object.entries(record.fields).filter(([key]) => key.replace(/^\d+\.\s*/, '') === label)
    .map(([, value]) => value).join('\n');
}

const testNames = /\b(?:TOEFL(?:\s+(?:iBT|ITP|PBT))?|IELTS|HSK|GRE|GMAT|Duolingo|PTE|SAT|ACT|DELF|DALF)\b/gi;
const requirementSections = new Set(['الشروط ومعايير التقديم', 'المستندات المطلوبة', 'ملاحظات مهمة']);

/** Source review evidence only. Mentions and cues never assign a FK or isRequired. */
export function reviewScholarshipRelationships(record: ScholarshipGuideRecord) {
  const metadata = record.rawContent.split(/^#{2,4} \d+\. /m)[0];
  const academicLevelsRaw = /^\*\*المستويات الأكاديمية ضمن هذا الملف:\*\*\s*(.+?)\s*$/m.exec(metadata)?.[1] ?? null;
  let section = '';
  const testEvidence = record.rawContent.split(/\r?\n/).flatMap((raw, index) => {
    const heading = /^#{2,4} \d+\. (.+)$/.exec(raw);
    if (heading) section = heading[1];
    else if (/^#{1,4} |^---\s*$/.test(raw)) section = '';
    if (!requirementSections.has(section)) return [];
    const mentions = [...raw.matchAll(testNames)].map(match => match[0]);
    if (!mentions.length) return [];
    const reviewTags = [
      ...(/(?:^|\s)أو(?:\s|$)|\bor\b/i.test(raw) ? ['ALTERNATIVES'] : []),
      ...(/إعفاء|الإعفاء|معفى|\bwaiv(?:er|ed)\b|\bexempt/i.test(raw) ? ['EXEMPTION'] : []),
      ...(/اختياري|\boptional\b/i.test(raw) ? ['OPTIONAL'] : []),
      ...(/عند اشتراط|إن طُلب|بحسب|حسب|\bif\b|\bdepending\b/i.test(raw) ? ['CONDITIONAL'] : []),
    ];
    return [{ sourceLineNumber: record.sourceLineNumber + index, section, raw, mentions,
      reviewTags, interpretation: 'REVIEW_REQUIRED', isRequired: null, internationalTestId: null,
      scoreInterpretation: 'NO_AUTOMATIC_SCALE_VARIANT_OR_SCORE_CONVERSION' }];
  });
  return {
    academicLevelsRaw,
    sourceReferences: {
      universityPublicIds: [...new Set(record.rawContent.match(/\bINS-[A-Z0-9]{2,8}-\d+\b/g) ?? [])],
      majorPublicIds: [...new Set(record.rawContent.match(/\b(?:MJR|MAS|DOC|FEL)-\d+\b/g) ?? [])],
      policy: 'SOURCE_REFERENCES_ONLY_REQUIRE_EXISTENCE_SCOPE_AND_OWNER_VALIDATION',
    },
    fieldMapping: Object.keys(record.fields).map(key => {
      const label = key.replace(/^\d+\.\s*/, '');
      const targets: Record<string, string> = {
        'الجهة المانحة': 'Scholarship.providerName / reviewed provider University',
        'المعلومات الأساسية': 'Scholarship country/language/cycle context; DegreeTarget review',
        'المميزات والتمويل': 'ScholarshipBenefit / reviewed ReferenceCurrency',
        'التخصصات المتاحة': 'ScholarshipMajorTarget; explicit program ownership review separately',
        'الجامعات المشاركة': 'ScholarshipUniversityLink; no inferred funded program pairs',
        'الشروط ومعايير التقديم': 'ScholarshipEligibilityItem',
        'المستندات المطلوبة': 'ScholarshipRequiredDocument',
        'رابط التقديم': 'Scholarship.applicationUrl',
        'الروابط الرسمية': 'ScholarshipSourceEvidence; official verification pending',
      };
      return { sourceSection: key, target: targets[label] ?? 'Preserved editorial/source context', state: 'REVIEW_REQUIRED' };
    }),
    testEvidence,
    canonicalAssignments: 0,
    importReady: false,
    policy: 'NO_NAME_BASED_LINKS; NO_REQUIRED_DEFAULT; NO_CARTESIAN_FUNDED_PROGRAMS; PRESERVE_ALTERNATIVES_AND_WAIVERS',
  };
}
