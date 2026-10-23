import type {
  IBackgroundJobHandler,
  BackgroundJobHandlerContext,
} from '../background-jobs/workers/DurableBackgroundJobContracts';
import type { PublicAnalyticsUseCases } from './ExecutiveDashboardUseCases';
export class AnalyticsRetentionBackgroundJobHandler implements IBackgroundJobHandler {
  readonly jobType = 'analytics.retention.sweep';
  constructor(private readonly analytics: PublicAnalyticsUseCases) {}
  async handle(payload: Readonly<Record<string, unknown>>, context: BackgroundJobHandlerContext) {
    if (Object.keys(payload).length) throw new Error('ANALYTICS_RETENTION_PAYLOAD_INVALID');
    for (let batch = 0; batch < 10 && !context.signal.aborted; batch++) {
      if ((await this.analytics.purgeExpired()) < 1000) return;
    }
    if (context.signal.aborted) throw new Error('ANALYTICS_RETENTION_ABORTED');
  }
}
