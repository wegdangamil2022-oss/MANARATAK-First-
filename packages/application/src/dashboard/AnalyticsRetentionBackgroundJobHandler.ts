import type {
  IBackgroundJobHandler,
  BackgroundJobHandlerContext,
} from '../background-jobs/workers/DurableBackgroundJobContracts';
import type {
  PublicAnalyticsUseCases,
  ManagedApplicationEvidenceUseCases,
} from './ExecutiveDashboardUseCases';
export class AnalyticsRetentionBackgroundJobHandler implements IBackgroundJobHandler {
  readonly jobType = 'analytics.retention.sweep';
  constructor(
    private readonly analytics: PublicAnalyticsUseCases,
    private readonly applications: ManagedApplicationEvidenceUseCases,
  ) {}
  async handle(payload: Readonly<Record<string, unknown>>, context: BackgroundJobHandlerContext) {
    if (Object.keys(payload).length) throw new Error('ANALYTICS_RETENTION_PAYLOAD_INVALID');
    for (let batch = 0; batch < 10 && !context.signal.aborted; batch++) {
      const removed =
        (await this.analytics.purgeExpired()) + (await this.applications.purgeExpired());
      if (removed < 1000) return;
    }
    if (context.signal.aborted) throw new Error('ANALYTICS_RETENTION_ABORTED');
  }
}
