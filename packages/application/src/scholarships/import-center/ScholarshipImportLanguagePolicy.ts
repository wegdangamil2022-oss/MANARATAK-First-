import { z } from 'zod';
import type { ScholarshipImportPayload, ScholarshipEligibilityItemDto } from '@manaratak/domain';

const evidenceSchema = z.object({
  policy: z.literal('ALTERNATIVE_EVIDENCE_WITH_EXEMPTIONS_NOT_ALL_REQUIRED'),
  officialSourceUrl: z.string().url(),
  summary: z.string().trim().min(1),
  alternatives: z.array(z.object({
    sourceLabel: z.string().trim().min(1),
    minimumOverall: z.number().finite().nonnegative().optional(),
    minimumResult: z.string().trim().min(1).optional(),
    scale: z.string().trim().min(1).optional(),
  }).strict().refine(value => (value.minimumOverall !== undefined) !== (value.minimumResult !== undefined))).min(1),
  exemptions: z.string().trim().min(1),
  testDateMustBeAfter: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
    const date = new Date(value);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }),
  excludedModes: z.array(z.string().trim().min(1)),
  delivery: z.string().trim().min(1),
  scoreConversion: z.literal(false),
});

/** One complete language condition, not a list of independently required tests.
 * Narrative delivery/exemption rules remain visible; this is not an automated
 * applicant eligibility decision or an implicit score-scale conversion.
 */
export function scholarshipImportLanguagePolicy(payload: ScholarshipImportPayload): {
  present: boolean;
  valid: boolean;
  item?: ScholarshipEligibilityItemDto;
} {
  const evidence = payload.metadata?.conditionalLanguageEvidence;
  if (evidence === undefined) return { present: false, valid: true };
  const parsed = evidenceSchema.safeParse(evidence);
  if (!parsed.success) return { present: true, valid: false };
  const policy = parsed.data;
  const labels = policy.alternatives.map(item => item.sourceLabel);
  const tests = payload.metadata?.internationalTests;
  if (!Array.isArray(tests) || tests.some(value => typeof value !== 'string') ||
      new Set(labels).size !== labels.length || new Set(tests).size !== tests.length || tests.length !== labels.length ||
      tests.some(value => !labels.includes(value as string)) ||
      policy.officialSourceUrl !== payload.officialSourceUrl ||
      new URL(policy.officialSourceUrl).protocol !== 'https:') return { present: true, valid: false };
  const alternatives = policy.alternatives.map(item =>
    `${item.sourceLabel}: ${item.minimumOverall ?? item.minimumResult}${item.scale ? ` (${item.scale})` : ''}`,
  ).join(' / ');
  return { present: true, valid: true, item: {
    itemKey: 'language-proficiency-policy',
    itemTypeCode: 'LANGUAGE_PROFICIENCY',
    operatorCode: 'ANY_OF_WITH_EXEMPTIONS',
    valueText: [policy.summary, `Accepted alternatives: ${alternatives}.`,
      `Exemptions and applicant-specific rules: ${policy.exemptions}`,
      `Test date strictly after ${policy.testDateMustBeAfter}.`,
      `Excluded: ${policy.excludedModes.join(', ') || 'None specified'}.`,
      `Score delivery: ${policy.delivery}`].join('\n'),
    isRequired: true,
    priorityOrder: 1,
    resolutionStatus: 'SOURCE_ONLY',
    metadata: { languagePolicyVersion: 1, ...policy, automatedEligibility: false },
  } };
}
