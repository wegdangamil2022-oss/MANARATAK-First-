export interface InternationalTestScorePolicyIssue { field: string; message: string }
export function validateInternationalTestScorePolicy(input: { overallMinimum: number; overallMaximum: number; scoreIncrement?: number; resultValidityDurationMonths?: number }): InternationalTestScorePolicyIssue[] {
  const issues: InternationalTestScorePolicyIssue[] = [];
  if (!Number.isFinite(input.overallMinimum) || !Number.isFinite(input.overallMaximum)) issues.push({ field: 'scoreScale', message: 'Score bounds must be finite numbers' });
  else if (input.overallMinimum > input.overallMaximum) issues.push({ field: 'scoreScale.overallMinimum', message: 'overallMinimum cannot be greater than overallMaximum' });
  if (input.scoreIncrement !== undefined && (!Number.isFinite(input.scoreIncrement) || input.scoreIncrement <= 0)) issues.push({ field: 'scoreScale.scoreIncrement', message: 'Score increment must be finite and greater than zero' });
  if (input.resultValidityDurationMonths !== undefined && (!Number.isSafeInteger(input.resultValidityDurationMonths) || input.resultValidityDurationMonths < 0)) issues.push({ field: 'scoreScale.resultValidityDurationMonths', message: 'Result validity must be a non-negative integer number of months' });
  return issues;
}
export function validateInternationalTestSectionScore(input: { scoreMinimum?: number; scoreMaximum?: number }): InternationalTestScorePolicyIssue[] {
  const issues: InternationalTestScorePolicyIssue[] = [];
  for (const field of ['scoreMinimum', 'scoreMaximum'] as const) if (input[field] !== undefined && !Number.isFinite(input[field])) issues.push({ field, message: 'Section score bounds must be finite numbers' });
  if (Number.isFinite(input.scoreMinimum) && Number.isFinite(input.scoreMaximum) && input.scoreMinimum! > input.scoreMaximum!) issues.push({ field: 'scoreMinimum', message: 'Section score minimum cannot exceed maximum' });
  return issues;
}
