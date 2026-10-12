import { CareerAdminUseCases } from '../../career-alumni/use-cases/CareerAdminUseCases';
import type { BackgroundJobHandlerContext, IBackgroundJobHandler } from '../workers/DurableBackgroundJobContracts';
export const CAREER_MAINTENANCE_JOB_TYPE = 'careers.maintenance.sweep';
export class CareerMaintenanceBackgroundJobHandler implements IBackgroundJobHandler {
  readonly jobType = CAREER_MAINTENANCE_JOB_TYPE;
  constructor(private readonly careers: CareerAdminUseCases, private readonly enabled = false) {}
  async handle(payload: Readonly<Record<string,unknown>>, context: BackgroundJobHandlerContext): Promise<void> {
    if (!this.enabled) throw new Error('CAREER_MAINTENANCE_DISABLED');
    if (context.signal.aborted) throw context.signal.reason ?? new Error('BACKGROUND_JOB_ABORTED');
    const limit = payload.limit ?? 50;
    if (typeof limit !== 'number' || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new Error('CAREER_QUERY_INVALID');
    await this.careers.forActor({ actorId: 'system:careers-maintenance', reason: 'Expire published career opportunities', correlationId: context.jobReference }).expireJobs(limit);
  }
}
