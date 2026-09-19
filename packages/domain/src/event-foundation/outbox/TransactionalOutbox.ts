export enum OutboxProcessingState {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED'
}

export interface OutboxAggregateIdentity { domain: string; aggregateType: string; aggregateId: string; }
export interface SanitizedOutboxFailure { code: string; message: string; failedAt: Date; }

export interface OutboxLeaseOwnership {
  workerId: string;
  leaseToken: string;
  claimUntil: Date;
}

export interface TransactionalOutboxEntry {
  id: string;
  eventType: string;
  domain: string;
  aggregate?: OutboxAggregateIdentity;
  payload: Readonly<Record<string, unknown>>;
  metadata: Readonly<Record<string, unknown>>;
  correlationId?: string;
  causationId?: string;
  createdAt: Date;
  availableAt: Date;
  state: OutboxProcessingState;
  attempts: number;
  processedAt?: Date;
  lastError?: SanitizedOutboxFailure;
  lease?: OutboxLeaseOwnership;
}

export interface AtomicPersistenceContext { readonly boundaryId: string; }

export interface OutboxClaimRequest {
  workerId: string;
  batchSize: number;
  claimUntil: Date;
  now: Date;
  domain?: string;
  eventTypes?: readonly string[];
}

export interface ITransactionalOutboxStore {
  appendInTransaction(entry: TransactionalOutboxEntry, transaction: AtomicPersistenceContext): Promise<void>;
  claimPendingBatch(request: OutboxClaimRequest): Promise<TransactionalOutboxEntry[]>;
  renewLease(id: string, ownership: OutboxLeaseOwnership, now: Date, newClaimUntil: Date): Promise<boolean>;
  markProcessed(id: string, ownership: OutboxLeaseOwnership, processedAt: Date): Promise<boolean>;
  markFailed(id: string, ownership: OutboxLeaseOwnership, failure: SanitizedOutboxFailure, nextAvailableAt: Date): Promise<boolean>;
}

export interface OutboxDeliveryContext { idempotencyKey: string; }
export interface IOutboxDeliveryGateway {
  deliver(entry: TransactionalOutboxEntry, context: OutboxDeliveryContext): Promise<void>;
}

export interface OutboxDispatchRequest {
  workerId: string;
  batchSize: number;
  claimDurationMs: number;
  maxAttempts: number;
  baseBackoffMs: number;
  maxBackoffMs: number;
  domain?: string;
  eventTypes?: readonly string[];
}

export interface OutboxDispatchResult {
  claimed: number;
  processed: number;
  failed: number;
  exhausted: number;
  leaseLost: number;
}

export interface ITransactionalOutboxDispatcher {
  dispatchBatch(request: OutboxDispatchRequest): Promise<OutboxDispatchResult>;
}
