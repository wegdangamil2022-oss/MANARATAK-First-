import { AdminServiceFulfillmentUseCases } from '../../services-platform/use-cases/ServiceRequestUseCases';
import { ServiceOperationsUseCases } from '../../services-platform/use-cases/ServiceOperationsUseCases';
import {
  BackgroundJobHandlerContext,
  IBackgroundJobHandler,
} from '../workers/DurableBackgroundJobContracts';
export const SERVICE_MAINTENANCE_JOB_TYPE = 'services.maintenance.sweep';
export class ServiceMaintenanceBackgroundJobHandler implements IBackgroundJobHandler {
  readonly jobType = SERVICE_MAINTENANCE_JOB_TYPE;
  constructor(
    private readonly requests: AdminServiceFulfillmentUseCases,
    private readonly operations: ServiceOperationsUseCases,
    private readonly enabled = false,
  ) {}
  async handle(
    payload: Readonly<Record<string, unknown>>,
    context: BackgroundJobHandlerContext,
  ): Promise<void> {
    if (!this.enabled) throw new Error('SERVICE_MAINTENANCE_DISABLED');
    if (context.signal.aborted) throw context.signal.reason ?? new Error('BACKGROUND_JOB_ABORTED');
    const limit =
      typeof payload.limit === 'number' && Number.isSafeInteger(payload.limit)
        ? Math.min(100, Math.max(1, payload.limit))
        : 50;
    const owner = this.operations.forActor({
      actorId: 'system:services-maintenance',
      correlationId: context.jobReference,
      reason: 'Expire service booking holds and release reserved coupons',
    });
    await owner.sweepExpiredHolds(limit);
    if (context.signal.aborted) throw context.signal.reason ?? new Error('BACKGROUND_JOB_ABORTED');
    await this.requests.maintenance(limit);
  }
}
