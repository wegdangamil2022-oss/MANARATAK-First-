import type { AtomicPersistenceContext } from '@manaratak/domain';
import { AtomicDomainMutationCoordinator, type AtomicMutationRequestContext } from '../../event-foundation/use-cases/AtomicDomainMutationCoordinator';

export interface IMajorPromotionLinkReconciliationGateway {
  reconcile(batchId: string, context: AtomicPersistenceContext): Promise<{ linked: number; replay: boolean }>;
}
/** P6 records a completed owner result. This is not content approval or publication. */
export class ReconcileMajorPromotionLinksUseCase {
  constructor(private readonly gateway: IMajorPromotionLinkReconciliationGateway, private readonly atomic: AtomicDomainMutationCoordinator) {}
  execute(batchId: string, context: AtomicMutationRequestContext) {
    if (!batchId?.trim() || !context.actorId?.trim()) throw Error('IMPORT_LINK_RECONCILIATION_CONTEXT_REQUIRED');
    return this.atomic.execute({ domain: 'IMPORTS', aggregateType: 'IMPORT_BATCH', aggregateId: batchId,
      action: 'MAJOR_OWNER_PROMOTION_LINKS_RECONCILED', context,
      outbox: { payload: { batchId, ownerDomain: 'MAJORS' } },
    }, tx => this.gateway.reconcile(batchId, tx), result => !result.replay);
  }
}
