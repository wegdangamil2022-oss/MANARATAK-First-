import type { IImportScreeningReceiptStore } from '../contracts/IImportGovernanceGateway';
import type { IImportHandoffConsumer, UniversalImportHandoff } from '@manaratak/domain';

/** Generic Phase 6 dispatcher. It routes owner domains and knows no domain semantics. */
export class ImportHandoffDispatcher {
  private readonly consumers: Readonly<Record<string, IImportHandoffConsumer>>;

  constructor(registrations: Readonly<Record<string, IImportHandoffConsumer>> = {}, private readonly receipts?: IImportScreeningReceiptStore) {
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

  async findReceipt(handoff: UniversalImportHandoff) { return this.receipts?.find(handoff) ?? null; }
  hasDurableScreeningReceipts() { return Boolean(this.receipts); }

  async dispatch(handoff: UniversalImportHandoff): Promise<unknown | null> {
    const owner = handoff.ownerDomain.trim().toUpperCase();
    const consumer = this.consumers[owner];
    if (!consumer) return null;
    // P7 is never allowed a volatile review screening decision. A disconnected
    // receipt store must fail closed rather than silently silently bypassing
    // the durable identity/content-hash idempotency guarantee.
    if (owner === 'REFERENCE_DATA' && !this.receipts) {
      throw new Error('P7_DURABLE_SCREENING_RECEIPT_REQUIRED');
    }
    return this.receipts ? this.receipts.accept(handoff, () => consumer.accept(handoff)) : consumer.accept(handoff);
  }
}
