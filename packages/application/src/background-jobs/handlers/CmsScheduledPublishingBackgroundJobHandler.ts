import { AdminCmsUseCases } from '../../cms/use-cases/CmsUseCases';
import { BackgroundJobHandlerContext, IBackgroundJobHandler } from '../workers/DurableBackgroundJobContracts';

export const CMS_SCHEDULED_PUBLISH_JOB_TYPE = 'cms.scheduled-publishing.sweep';

export class CmsScheduledPublishingBackgroundJobHandler implements IBackgroundJobHandler {
  public readonly jobType = CMS_SCHEDULED_PUBLISH_JOB_TYPE;
  public constructor(private readonly cms: AdminCmsUseCases) {}

  public async handle(payload: Readonly<Record<string, unknown>>, context: BackgroundJobHandlerContext): Promise<void> {
    if (context.signal.aborted) throw context.signal.reason ?? new Error('BACKGROUND_JOB_ABORTED');
    const limit = typeof payload.limit === 'number' && Number.isInteger(payload.limit) ? Math.min(200, Math.max(1, payload.limit)) : 50;
    await this.cms.processDueSchedules('system:background-worker', new Date(), limit);
  }
}
