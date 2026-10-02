import { z } from 'zod';
import type { UniversalImportHandoff } from '@manaratak/domain';
import { UniversityLaterStagesDryRunUseCase, type UniversityLaterStageResult } from './UniversityLaterStagesDryRunUseCase';

const shape = z.object({
  keyMajors: z.array(z.string()).default([]), requiredLanguages: z.array(z.string()).default([]), acceptedLanguageTests: z.array(z.string()).default([]),
  availableDegrees: z.array(z.string()).optional(), faculties: z.array(z.string()).optional(), languagesOfInstruction: z.array(z.string()).optional(), studyModes: z.array(z.string()).optional(), generalRequiredDocuments: z.array(z.string()).optional(), additionalGraduateRequirements: z.array(z.string()).optional(),
  acceptsInternationalStudents: z.boolean().optional(), hasLanguageRequirements: z.boolean().optional(), hasInternationalScholarships: z.boolean().optional(), accommodationAvailable: z.boolean().optional(), internationalStudentsEligibleForAccommodation: z.boolean().optional(),
  annualTuitionFee: z.number().finite().optional(), undergraduateMedicineFee: z.number().finite().optional(), graduateTuitionFee: z.number().finite().optional(), typicalAccommodationCost: z.number().finite().optional(), averageMonthlyLivingCost: z.number().finite().optional(),
  internationalScholarships: z.array(z.object({ name: z.string(), officialUrl: z.string() })).default([]), engineeringUndergraduateFees: z.array(z.object({ faculty: z.string(), amount: z.number().finite() })).default([]),
}).passthrough();
export async function inspectUniversitySourceStage(stage: 'STAGE_3' | 'STAGE_4', handoffs: readonly UniversalImportHandoff[]): Promise<UniversityLaterStageResult[]> {
  const normalized: UniversalImportHandoff[] = []; const invalid = new Map<string, UniversityLaterStageResult>();
  for (const handoff of handoffs) {
    const input = shape.safeParse(handoff.normalizedPayload);
    if (!input.success) invalid.set(handoff.handoffId, { sourceReferenceId: String(handoff.normalizedPayload.sourceReferenceId ?? ''), readiness: 'SOURCE_INVALID', validationIssues: [{ code: 'SOURCE_PAYLOAD_SHAPE_INVALID', message: 'Stage collections must be typed arrays with finite amounts.' }], databaseWrites: 0 });
    else normalized.push({ ...handoff, normalizedPayload: input.data });
  }
  const valid = (await new UniversityLaterStagesDryRunUseCase().execute(stage, normalized)).results;
  const byId = new Map(valid.map(result => [result.sourceReferenceId, result]));
  return handoffs.map(handoff => invalid.get(handoff.handoffId) ?? byId.get(String(handoff.normalizedPayload.sourceReferenceId))!);
}
export function reconcileUniversityQuarantine(stage3: readonly UniversityLaterStageResult[], stage4: readonly UniversityLaterStageResult[]) {
  const index = (rows: readonly UniversityLaterStageResult[]) => {
    const map = new Map(rows.map(row => [row.sourceReferenceId, row]));
    if (map.size !== rows.length) throw new Error('UNIVERSITY_QC_DUPLICATE_STAGE_ID');
    return map;
  };
  const a = index(stage3); const b = index(stage4); const ids = [...new Set([...a.keys(), ...b.keys()])].sort();
  const quarantine = ids.flatMap(sourceReferenceId => {
    const issues = [a.get(sourceReferenceId), b.get(sourceReferenceId)].flatMap((row, index) => !row ? [{ stage: index === 0 ? 'STAGE_3' : 'STAGE_4', code: 'STAGE_SOURCE_MISSING' }] : row.validationIssues.map(issue => ({ stage: index === 0 ? 'STAGE_3' : 'STAGE_4', code: issue.code, path: issue.path })));
    return issues.length ? [{ sourceReferenceId, action: 'QUARANTINE_STAGE_PAYLOAD', issues, sourceCorrectionRequired: true, databaseWrites: 0 }] : [];
  });
  const invalid3 = stage3.filter(row => row.readiness === 'SOURCE_INVALID').length;
  const invalid4 = stage4.filter(row => row.readiness === 'SOURCE_INVALID').length;
  const overlap = ids.filter(id => a.get(id)?.readiness === 'SOURCE_INVALID' && b.get(id)?.readiness === 'SOURCE_INVALID').length;
  return { uniqueSourceIds: ids.length, stage3Invalid: invalid3, stage4Invalid: invalid4, invalidInBoth: overlap, uniqueInvalidIds: quarantine.length, sourceValidBoth: ids.length - quarantine.length, quarantine, databaseWrites: 0 as const, runtime: 'RUNTIME_UNTESTED' as const };
}
