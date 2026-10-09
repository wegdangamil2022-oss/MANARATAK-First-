import type { IImportHandoffConsumer, UniversalImportHandoff } from '@manaratak/domain';

/** Generic Phase 6 dispatcher. It routes owner domains and knows no domain semantics. */
export class ImportHandoffDispatcher {
  constructor(private readonly consumers: Readonly<Record<string, IImportHandoffConsumer>> = {}) {
    // Never register an opaque or canonical-mutating consumer in the generic
    // Phase 6 pathway. It has no transaction spanning the owning-domain side
    // effect and its inbox receipt, so exactly-once execution is not provable.
    for (const [domain, consumer] of Object.entries(consumers)) {
      if (!consumer || consumer.effectMode !== 'SCREENING_ONLY') {
        throw new Error(`IMPORT_OWNER_TRANSACTIONAL_RECEIPT_REQUIRED:${domain}`);
      }
      if (typeof consumer.accept !== 'function') {
        throw new Error(`IMPORT_HANDOFF_CONSUMER_INVALID:${domain}`);
      }
    }
  }

  hasConsumer(ownerDomain: string): boolean {
    return Boolean(this.consumers[ownerDomain.trim().toUpperCase()]);
  }

  listConsumerDomains(): string[] {
    return Object.keys(this.consumers).sort();
  }

  async dispatch(handoff: UniversalImportHandoff): Promise<unknown | null> {
    const consumer = this.consumers[handoff.ownerDomain.trim().toUpperCase()];
    return consumer ? consumer.accept(handoff) : null;
  }
}
