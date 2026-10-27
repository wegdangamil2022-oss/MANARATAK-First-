import { StudentToolDefinition, StudentToolExecutionType } from './types';

/** Stable identities, deliberately independent of editable names and categories. */
export const INTERNAL_STUDENT_TOOL_KEYS: ReadonlySet<string> = new Set([
  'scholarship-name-cleaner', 'scholarship-duplicate-detector',
  'university-duplicate-detector', 'scholarship-import-completeness-checker',
  'university-import-completeness-checker', 'major-import-completeness-checker',
  'course-import-completeness-checker', 'imported-record-deduplication-reviewer',
  'missing-data-fetch-assistant', 'source-trust-score-reviewer',
]);

export function isInternalStudentTool(tool: Pick<StudentToolDefinition, 'toolKey' | 'executionType' | 'availability'>): boolean {
  return INTERNAL_STUDENT_TOOL_KEYS.has(tool.toolKey) ||
    tool.executionType === StudentToolExecutionType.ADMIN_INTERNAL || tool.availability.adminOnly;
}
