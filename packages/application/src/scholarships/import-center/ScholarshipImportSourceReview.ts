import { z } from 'zod';
import { scholarshipAcademicSourceItems, scholarshipSourceCalendarDate, scholarshipSourceSection, type ScholarshipImportPayload } from '@manaratak/domain';
import type { ScholarshipImportVerificationDecision } from './ScholarshipImportCenterContracts';
import type { ScholarshipCanonicalScreeningRecord } from './ScholarshipImportScreeningReader';
import { scholarshipImportLanguagePolicy, scholarshipLanguageEvidenceSchema } from './ScholarshipImportLanguagePolicy';
import { scholarshipImportReviewFingerprint } from './ScholarshipImportReviewDecisionCodec';

const text = z.string().trim().min(1).max(20000);
const schema = z.object({
  version: z.literal(1),
  rawPayloadFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  officialSourceUrls: z.array(z.string().url()).min(1).max(10),
  reason: text,
  deadlineEvidence: z.literal('ABSENT_FROM_SOURCE_BASIC_FIELDS').optional(),
  dateOnlyDeadline: z.object({ sourceText: text }).strict().optional(),
  academicListEvidence: z.literal('NUMBERED_SOURCE_ITEMS_ONLY').optional(),
  researchAreas: z.object({
    classification: z.literal('PROGRAM_RESEARCH_AREAS_NOT_PRIOR_DEGREE_RESTRICTIONS'),
    sourceLabels: z.array(text).min(1).max(100),
  }).strict().optional(),
  languageEvidence: z.literal('CONDITIONAL_SOURCE_EVIDENCE_WITHOUT_CANONICAL_TEST_LINKS').optional(),
  corrections: z.object({
    fundingCoverage: text.optional(), coverageDetails: text.optional(), duration: text.optional(),
    eligibilityCriteria: text.optional(), requiredDocuments: z.array(text).min(1).max(100).optional(),
    conditionalLanguagePolicy: scholarshipLanguageEvidenceSchema.optional(),
  }).strict().optional(),
}).strict();

/** Reviewed semantics are append-only verification evidence, bound to the exact
 * source payload. They cannot change identity, deadlines, owner links or source
 * receipts. Context never pretends to be a resolved canonical foreign key. */
export function scholarshipImportSourceReview(
  rawPayload: unknown,
  verification?: Pick<ScholarshipImportVerificationDecision, 'state' | 'evidence'> | null,
): { valid: boolean; present: boolean; reviewedDeadlineAbsence: boolean; reviewedDeadline: boolean; payload: ScholarshipImportPayload;
  contextualize(entries: readonly ScholarshipCanonicalScreeningRecord[]): ScholarshipCanonicalScreeningRecord[] } {
  const payload = rawPayload as ScholarshipImportPayload;
  const unchanged = (entries: readonly ScholarshipCanonicalScreeningRecord[]) => entries.map(entry => ({ ...entry }));
  const candidate = verification?.evidence?.sourceReview;
  if (candidate === undefined) return { valid: true, present: false, reviewedDeadlineAbsence: false, reviewedDeadline: false, payload, contextualize: unchanged };
  const invalid = { valid: false, present: true, reviewedDeadlineAbsence: false, reviewedDeadline: false, payload, contextualize: unchanged };
  const parsed = schema.safeParse(candidate);
  if (!parsed.success || verification?.state !== 'VERIFIED') return invalid;
  const review = parsed.data;
  if (review.rawPayloadFingerprint !== scholarshipImportReviewFingerprint(rawPayload)) return invalid;
  try {
    const official = new URL(payload.officialSourceUrl ?? '');
    if (official.protocol !== 'https:' || !review.officialSourceUrls.includes(official.href) ||
        review.officialSourceUrls.some(value => { const url = new URL(value); return url.protocol !== 'https:' || url.origin !== official.origin || Boolean(url.username || url.password); })) return invalid;
  } catch { return invalid; }
  let sourceDeadlineDate: string | null = null;
  if (review.dateOnlyDeadline) {
    const basics = payload.metadata?.sourceBasicFields as Record<string, unknown> | undefined;
    const presentation = payload.metadata?.sourcePresentation as { deadlineText?: unknown } | undefined;
    sourceDeadlineDate = scholarshipSourceCalendarDate(review.dateOnlyDeadline.sourceText);
    if (review.deadlineEvidence || payload.applicationDeadline || payload.metadata?.deadlineMode || payload.metadata?.deadlineType ||
      !sourceDeadlineDate || basics?.['الموعد النهائي'] !== review.dateOnlyDeadline.sourceText ||
      presentation?.deadlineText !== review.dateOnlyDeadline.sourceText) return invalid;
  }
  if (review.deadlineEvidence) {
    const basics = payload.metadata?.sourceBasicFields;
    const presentation = payload.metadata?.sourcePresentation as { deadlineText?: unknown } | undefined;
    // An approved absence is a source fact, never a date, rolling deadline or
    // opening/closing status. Existing date evidence cannot be overwritten.
    if (payload.applicationDeadline || payload.metadata?.deadlineMode || payload.metadata?.deadlineType ||
        !basics || typeof basics !== 'object' || Array.isArray(basics) ||
        !Object.prototype.hasOwnProperty.call(basics, 'اسم المنحة') ||
        Object.prototype.hasOwnProperty.call(basics, 'الموعد النهائي') ||
        typeof presentation?.deadlineText !== 'string' || presentation.deadlineText.trim()) return invalid;
  }
  const areas = review.researchAreas?.sourceLabels ?? [];
  let academicItems: string[] | undefined;
  let academicContext: string[] = [];
  if (review.academicListEvidence) {
    if (review.researchAreas) return invalid;
    const section = scholarshipSourceSection(payload.metadata?.rawSourceSections, 'التخصصات المتاحة');
    const source = payload.eligibleMajorsOrFields;
    if (!section || !Array.isArray(source) || !source.length) return invalid;
    academicItems = scholarshipAcademicSourceItems(section);
    // Every retained item must already be present verbatim in the source
    // projection, in the same order. This review cannot introduce a new field.
    let offset = 0;
    for (const item of academicItems) {
      const index = source.indexOf(item, offset);
      if (index < 0) return invalid;
      offset = index + 1;
    }
    if (!academicItems.length) return invalid;
    academicContext = source.filter(item => !academicItems!.includes(item));
    // Only a literal unnumbered preamble before the first list may be removed
    // from legacy screening. Unrelated labels or source substitutions fail shut.
    const preamble = section.split(/^\s*\d+[.)]\s+/m)[0].replace(/^\s*\*\*.+?\*\*\s*$/gm, '').trim();
    if (academicContext.some(item => item !== preamble)) return invalid;
  }
  if (review.researchAreas) {
    const source = typeof payload.eligibleMajorsOrFields === 'string' ? [payload.eligibleMajorsOrFields] : payload.eligibleMajorsOrFields;
    if (!source?.length || new Set(areas).size !== areas.length || source.length !== areas.length || source.some(label => !areas.includes(label))) return invalid;
  }
  // Eligibility corrections remain review/enrichment evidence, never source criteria.
  const { conditionalLanguagePolicy, eligibilityCriteria: _eligibilityEnrichment, ...textCorrections } = review.corrections ?? {};
  const projected = { ...payload, ...textCorrections, metadata: { ...payload.metadata,
    ...(review.deadlineEvidence ? { deadlineMode: 'NOT_STATED_IN_SOURCE' } : {}),
    ...(sourceDeadlineDate ? { deadlineMode: 'DATE_ONLY', sourceDeadlineDate } : {}),
    ...(conditionalLanguagePolicy ? { conditionalLanguageEvidence: conditionalLanguagePolicy } : {}),
  } };
  if ((review.languageEvidence || conditionalLanguagePolicy) && (!scholarshipImportLanguagePolicy(projected).present || !scholarshipImportLanguagePolicy(projected).valid)) return invalid;
  const tests = review.languageEvidence ? payload.metadata?.internationalTests as string[] : [];
  const contextualize = (entries: readonly ScholarshipCanonicalScreeningRecord[]) => entries.map(entry =>
    ((entry.target === 'MAJOR' && [...areas, ...academicContext].includes(entry.rawValue ?? '')) ||
      (entry.target === 'INTERNATIONAL_TEST' && tests.includes(entry.rawValue ?? '')))
      ? { ...entry, state: 'SOURCE_ONLY', canonicalReferenceId: null, canonicalPublicId: null, canonicalStandardCode: null }
      : { ...entry });
  return { valid: true, present: true, reviewedDeadlineAbsence: Boolean(review.deadlineEvidence), reviewedDeadline: Boolean(review.deadlineEvidence || sourceDeadlineDate), contextualize, payload: {
    ...projected,
    ...(academicItems ? { eligibleMajorsOrFields: academicItems } : {}),
    ...(review.researchAreas ? { eligibleMajorsOrFields: undefined } : {}),
    metadata: { ...projected.metadata, reviewedSourceInterpretation: review,
      ...(review.researchAreas ? { researchAreas: areas, priorDegreeFieldRestriction: false } : {}),
    },
  } };
}
