import { scholarshipImportReviewFingerprint } from '../../src/scholarships/import-center/ScholarshipImportReviewDecisionCodec';

export function academicOfferFixture() {
  const introduction = 'تتحدد البرامج حسب البلد الشريك ودرجة الدراسة.';
  const section = `${introduction}\n**أولًا: البكالوريوس**\n1. علوم الحاسوب.\n2. تخصصات العلوم الإنسانية الأخرى المدرجة في النظام.\n**ثانيًا: الماجستير**\n1. الرياضيات والفيزياء.\n**ثالثًا: الدكتوراه**\n1. الرياضيات والفيزياء.`;
  const raw = {
    scholarshipName: 'منحة الحكومة المجرية',
    officialSourceUrl: 'https://elte.example/scholarships',
    degreeLevel: 'بكالوريوس وماجستير ودكتوراه.',
    studyLanguage: 'الإنجليزية أو المجرية ولغات أخرى وفق التخصص المعروض.',
    eligibleMajorsOrFields: [
      introduction,
      'علوم الحاسوب.',
      'تخصصات العلوم الإنسانية الأخرى المدرجة في النظام.',
      'الرياضيات والفيزياء.',
      'الرياضيات والفيزياء.',
    ],
    metadata: {
      sourceBasicFields: {
        'الدرجة التعليمية': 'بكالوريوس وماجستير ودكتوراه.',
        'لغة الدراسة': 'الإنجليزية أو المجرية ولغات أخرى وفق التخصص المعروض.',
      },
      rawSourceSections: { 'الدرجات التعليمية والتخصصات المتاحة': section },
      sourcePresentation: {
        degreeGroups: [
          { id: 'source-group-1', title: '', items: [introduction] },
          {
            id: 'source-group-2',
            title: 'أولًا: البكالوريوس',
            items: ['علوم الحاسوب.', 'تخصصات العلوم الإنسانية الأخرى المدرجة في النظام.'],
          },
          { id: 'source-group-3', title: 'ثانيًا: الماجستير', items: ['الرياضيات والفيزياء.'] },
          { id: 'source-group-4', title: 'ثالثًا: الدكتوراه', items: ['الرياضيات والفيزياء.'] },
        ],
      },
    },
  };
  const academicOffer = {
    classification: 'SOURCE_PROGRAMME_GROUPS_WITHOUT_CANONICAL_PROGRAMME_IDENTITIES',
    groups: [
      {
        sourceGroupId: 'source-group-2',
        degreeLabel: 'بكالوريوس',
        degreeLevelId: '00000000-0000-4000-8000-000000000001',
      },
      {
        sourceGroupId: 'source-group-3',
        degreeLabel: 'ماجستير',
        degreeLevelId: '00000000-0000-4000-8000-000000000002',
      },
      {
        sourceGroupId: 'source-group-4',
        degreeLabel: 'دكتوراه',
        degreeLevelId: '00000000-0000-4000-8000-000000000003',
      },
    ],
    languagePolicy: 'PROGRAMME_SPECIFIC_NO_SINGLE_LANGUAGE',
  };
  const review = {
    version: 1,
    rawPayloadFingerprint: scholarshipImportReviewFingerprint(raw),
    officialSourceUrls: [raw.officialSourceUrl],
    reason:
      'Reviewed literal programme headings; retain broad and compound source descriptions without inventing programme or major identities.',
    academicListEvidence: 'NUMBERED_SOURCE_ITEMS_ONLY',
    academicOffer,
  };
  return {
    raw,
    review,
    verification: { state: 'VERIFIED' as const, evidence: { sourceReview: review } },
  };
}
