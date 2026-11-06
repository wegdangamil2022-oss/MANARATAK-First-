import type { AtomicPersistenceContext } from '@manaratak/domain';
import { AtomicDomainMutationCoordinator, type AtomicMutationRequestContext } from '../../event-foundation/use-cases/AtomicDomainMutationCoordinator';

export interface IFellowshipPromotionLinkReconciliationGateway {
  reconcile(batchId: string, tx: AtomicPersistenceContext): Promise<{ linked: number; replay: boolean }>;
}
export class ReconcileFellowshipPromotionLinksUseCase {
  constructor(private readonly gateway: IFellowshipPromotionLinkReconciliationGateway, private readonly atomic: AtomicDomainMutationCoordinator) {}
  execute(batchId: string, context: AtomicMutationRequestContext) {
    if (!batchId?.trim() || !context.actorId?.trim()) throw Error('FELLOWSHIP_LINK_CONTEXT_REQUIRED');
    return this.atomic.execute({ domain: 'IMPORTS', aggregateType: 'IMPORT_BATCH', aggregateId: batchId,
      action: 'FELLOWSHIP_OWNER_PROMOTION_LINKS_RECONCILED', context,
      outbox: { payload: { batchId, ownerDomain: 'FELLOWSHIPS' } },
    }, tx => this.gateway.reconcile(batchId, tx), result => !result.replay);
  }
}
