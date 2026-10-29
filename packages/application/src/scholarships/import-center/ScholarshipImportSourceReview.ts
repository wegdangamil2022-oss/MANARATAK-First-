import { z } from 'zod';
import type { ScholarshipImportPayload } from '@manaratak/domain';
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
): { valid: boolean; present: boolean; payload: ScholarshipImportPayload;
  contextualize(entries: readonly ScholarshipCanonicalScreeningRecord[]): ScholarshipCanonicalScreeningRecord[] } {
  const payload = rawPayload as ScholarshipImportPayload;
  const unchanged = (entries: readonly ScholarshipCanonicalScreeningRecord[]) => entries.map(entry => ({ ...entry }));
  const candidate = verification?.evidence?.sourceReview;
  if (candidate === undefined) return { valid: true, present: false, payload, contextualize: unchanged };
  const invalid = { valid: false, present: true, payload, contextualize: unchanged };
  const parsed = schema.safeParse(candidate);
  if (!parsed.success || verification?.state !== 'VERIFIED') return invalid;
  const review = parsed.data;
  if (review.rawPayloadFingerprint !== scholarshipImportReviewFingerprint(rawPayload)) return invalid;
  try {
    const official = new URL(payload.officialSourceUrl ?? '');
    if (official.protocol !== 'https:' || !review.officialSourceUrls.includes(official.href) ||
        review.officialSourceUrls.some(value => { const url = new URL(value); return url.protocol !== 'https:' || url.origin !== official.origin || Boolean(url.username || url.password); })) return invalid;
  } catch { return invalid; }
  const areas = review.researchAreas?.sourceLabels ?? [];
  if (review.researchAreas) {
    const source = typeof payload.eligibleMajorsOrFields === 'string' ? [payload.eligibleMajorsOrFields] : payload.eligibleMajorsOrFields;
    if (!source?.length || new Set(areas).size !== areas.length || source.length !== areas.length || source.some(label => !areas.includes(label))) return invalid;
  }
  const { conditionalLanguagePolicy, ...textCorrections } = review.corrections ?? {};
  const projected = { ...payload, ...textCorrections, metadata: { ...payload.metadata,
    ...(conditionalLanguagePolicy ? { conditionalLanguageEvidence: conditionalLanguagePolicy } : {}),
  } };
  if ((review.languageEvidence || conditionalLanguagePolicy) && (!scholarshipImportLanguagePolicy(projected).present || !scholarshipImportLanguagePolicy(projected).valid)) return invalid;
  const tests = review.languageEvidence ? payload.metadata?.internationalTests as string[] : [];
  const contextualize = (entries: readonly ScholarshipCanonicalScreeningRecord[]) => entries.map(entry =>
    ((entry.target === 'MAJOR' && areas.includes(entry.rawValue ?? '')) ||
      (entry.target === 'INTERNATIONAL_TEST' && tests.includes(entry.rawValue ?? '')))
      ? { ...entry, state: 'SOURCE_ONLY', canonicalReferenceId: null, canonicalPublicId: null, canonicalStandardCode: null }
      : { ...entry });
  return { valid: true, present: true, contextualize, payload: {
    ...projected,
    ...(review.researchAreas ? { eligibleMajorsOrFields: undefined } : {}),
    metadata: { ...projected.metadata, reviewedSourceInterpretation: review,
      ...(review.researchAreas ? { researchAreas: areas, priorDegreeFieldRestriction: false } : {}),
    },
  } };
}
