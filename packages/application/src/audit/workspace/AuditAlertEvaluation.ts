import type { AuditAlertRule, WorkspaceRow } from './AuditWorkspaceUseCases';
import { validateAlertRule } from './AuditWorkspaceUseCases';
import type {
  IBackgroundJobHandler,
  BackgroundJobHandlerContext,
} from '../../background-jobs/workers/DurableBackgroundJobContracts';
export interface IAuditAlertEvaluationGateway {
  rules(
    limit: number,
    cursor?: string,
  ): Promise<{ items: WorkspaceRow[]; nextCursor: string | null }>;
  count(rule: AuditAlertRule, from: Date, until: Date): Promise<number>;
  deliver(row: WorkspaceRow, bucket: Date, matchedCount: number): Promise<boolean>;
  retryPending?(
    limit: number,
    signal?: AbortSignal,
  ): Promise<{ recovered: number; failed: number }>;
}
export class AuditAlertEvaluation {
  constructor(private readonly gateway: IAuditAlertEvaluationGateway) {}
  async execute(input: { limit: number; cursor?: string; now?: Date; signal?: AbortSignal }) {
    if (input.signal?.aborted) throw new Error('AUDIT_ALERT_EVALUATION_ABORTED');
    const page = await this.gateway.rules(Math.min(100, Math.max(1, input.limit)), input.cursor);
    const retried = await this.gateway.retryPending?.(
      Math.min(100, Math.max(1, input.limit)),
      input.signal,
    );
    let triggered = retried?.recovered ?? 0,
      failed = retried?.failed ?? 0;
    for (const row of page.items) {
      if (input.signal?.aborted) throw new Error('AUDIT_ALERT_EVALUATION_ABORTED');
      try {
        const rule = row.data as AuditAlertRule;
        validateAlertRule(rule);
        if (!rule.enabled) continue;
        const now = input.now ?? new Date();
        // Fixed completed windows avoid a partial-window receipt hiding later threshold crossings.
        const until = new Date(
          Math.floor(now.getTime() / (rule.windowMinutes * 60000)) * rule.windowMinutes * 60000,
        );
        const from = new Date(until.getTime() - rule.windowMinutes * 60000);
        const count = await this.gateway.count(rule, from, until);
        if (count >= rule.threshold) {
          const bucket = new Date(
            Math.floor(from.getTime() / (rule.cooldownMinutes * 60000)) *
              rule.cooldownMinutes *
              60000,
          );
          if (await this.gateway.deliver(row, bucket, count)) triggered++;
        }
      } catch {
        failed++;
      }
    }
    return { triggered, failed, nextCursor: page.nextCursor };
  }
}
export const AUDIT_ALERT_EVALUATION_JOB_TYPE = 'audit.alerts.evaluate';
export class AuditAlertEvaluationBackgroundJobHandler implements IBackgroundJobHandler {
  readonly jobType = AUDIT_ALERT_EVALUATION_JOB_TYPE;
  constructor(
    private readonly evaluator: AuditAlertEvaluation,
    private readonly enabled = false,
  ) {}
  async handle(payload: Readonly<Record<string, unknown>>, context: BackgroundJobHandlerContext) {
    if (!this.enabled) throw new Error('AUDIT_ALERTS_DISABLED');
    if (
      Object.keys(payload).some((key) => key !== 'limit') ||
      (payload.limit !== undefined &&
        (typeof payload.limit !== 'number' ||
          !Number.isInteger(payload.limit) ||
          payload.limit < 1 ||
          payload.limit > 100))
    )
      throw new Error('AUDIT_ALERT_PAYLOAD_INVALID');
    let cursor: string | undefined,
      failed = 0;
    const now = new Date();
    do {
      const result = await this.evaluator.execute({
        limit: Number(payload.limit ?? 25),
        cursor,
        signal: context.signal,
        now,
      });
      failed += result.failed;
      cursor = result.nextCursor ?? undefined;
    } while (cursor);
    if (failed) throw new Error('AUDIT_ALERT_EVALUATION_PARTIAL_FAILURE');
  }
}
