import type { IImportHandoffConsumer, UniversalImportHandoff } from '@manaratak/domain';

/** Generic Phase 6 dispatcher. It routes owner domains and knows no domain semantics. */
export class ImportHandoffDispatcher {
  private readonly consumers: Readonly<Record<string, IImportHandoffConsumer>>;

  constructor(registrations: Readonly<Record<string, IImportHandoffConsumer>> = {}) {
    // Never register an opaque or canonical-mutating consumer in the generic
    // Phase 6 pathway. It has no transaction spanning the owning-domain side
    // effect and its inbox receipt, so exactly-once execution is not provable.
    const guarded: Record<string, IImportHandoffConsumer> = Object.create(null);
    for (const [domain, consumer] of Object.entries(registrations)) {
      if (!consumer || consumer.effectMode !== 'SCREENING_ONLY') {
        throw new Error(`IMPORT_OWNER_TRANSACTIONAL_RECEIPT_REQUIRED:${domain}`);
      }
      if (typeof consumer.accept !== 'function') {
        throw new Error(`IMPORT_HANDOFF_CONSUMER_INVALID:${domain}`);
      }
      // Capture the inspected capability and its exact method now. The source
      // registry may be mutable JavaScript even if typed Readonly in TypeScript;
      // a later replacement cannot silently turn screening into a write.
      guarded[domain.trim().toUpperCase()] = Object.freeze({
        effectMode: 'SCREENING_ONLY',
        accept: consumer.accept.bind(consumer),
      });
    }
    this.consumers = Object.freeze(guarded);
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
