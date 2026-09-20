import { FinancePlatformUseCases } from '../../finance-platform/use-cases/FinancePlatformUseCases';
import { BackgroundJobHandlerContext, IBackgroundJobHandler } from '../workers/DurableBackgroundJobContracts';

export const FINANCE_RECONCILIATION_JOB_TYPE = 'finance.reconciliation.sweep';

export class FinanceReconciliationBackgroundJobHandler implements IBackgroundJobHandler {
  public readonly jobType = FINANCE_RECONCILIATION_JOB_TYPE;
  public constructor(private readonly finance: FinancePlatformUseCases) {}

  public async handle(payload: Readonly<Record<string, unknown>>, context: BackgroundJobHandlerContext): Promise<void> {
    if (context.signal.aborted) throw context.signal.reason ?? new Error('BACKGROUND_JOB_ABORTED');
    const limit = typeof payload.limit === 'number' && Number.isInteger(payload.limit) ? Math.min(200, Math.max(1, payload.limit)) : 50;
    await this.finance.reconcileProviderStates({
      limit,
      actorId: 'system:background-worker',
      correlationId: context.jobReference,
      idempotencyKey: context.idempotencyKey,
    });
    await this.finance.reconcile();
  }
}
