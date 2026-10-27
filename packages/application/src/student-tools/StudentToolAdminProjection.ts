import { StudentToolExecutionRecord } from '@manaratak/domain';

/** Allowlist: never forward identity hashes, results, prompts or arbitrary metadata. */
export function studentToolAdminExecution(record: StudentToolExecutionRecord) {
  return {
    executionId: record.executionId, toolKey: record.toolKey, toolVersion: record.toolVersion,
    status: record.status, consumerType: record.consumerType, isTest: record.isTest,
    traceId: record.traceId, correlationId: record.correlationId,
    aiExecutionReference: record.aiExecutionReference, durationMs: record.durationMs,
    errorCode: record.errorCode, startedAt: record.startedAt, completedAt: record.completedAt,
  };
}
