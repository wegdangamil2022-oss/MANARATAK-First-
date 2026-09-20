import {
  AICapabilityDefinition, AIAsyncJobRecord, AIConsumerPolicy, AIEvaluationDefinition, AIEvaluationRun,
  AIExecutionRecord, AIExecutionSpan, AIGuardrailDefinition, AIIncident, AIKnowledgeIndex,
  AIIndexingRun, AIKnowledgeSource, AIModelDefinition, AIModelPrice, AIPlatformOverview, AIPromptDefinition, AIPromptVersion,
  AIProviderDefinition, AIRoutingPolicy, AIWorkflowDefinition, AIWorkflowRun, AIWorkflowVersion, AIWorkflowStepRun
} from '../entities';

export type AIRegistryResource =
  | 'providers' | 'models' | 'modelPrices' | 'capabilities' | 'routingPolicies' | 'prompts' | 'guardrails'
  | 'consumers' | 'workflows' | 'evaluations' | 'knowledgeIndexes' | 'knowledgeSources' | 'incidents' | 'platformSettings';

export interface IAIPlatformRepository {
  overview(): Promise<AIPlatformOverview>;
  list<T>(resource: AIRegistryResource, filters?: Record<string, unknown>): Promise<T[]>;
  find<T>(resource: AIRegistryResource, key: string): Promise<T | null>;
  upsert<T>(resource: AIRegistryResource, value: T, actorReferenceId: string): Promise<T>;
  createPromptVersion(value: Omit<AIPromptVersion, 'id' | 'createdAt' | 'checksum'>): Promise<AIPromptVersion>;
  findPromptVersion(promptKey: string, version: number): Promise<AIPromptVersion | null>;
  approvePromptVersion(promptKey: string, version: number, actorReferenceId: string): Promise<AIPromptVersion>;
  deployPrompt(promptKey: string, version: number, actorReferenceId: string): Promise<AIPromptDefinition>;
  resolvePromptForCapability(capabilityKey: string): Promise<AIPromptDefinition | null>;
  createExecution(value: Omit<AIExecutionRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<AIExecutionRecord>;
  createExecutionWithQuota(
    value: Omit<AIExecutionRecord, 'id' | 'createdAt' | 'updatedAt'>,
    reservation: {
      reservationKey: string;
      requestsPerMinute: number;
      dailyRequestLimit: number;
      monthlyTokenLimit: number;
      monthlyCostLimit?: number | null;
      currency?: string | null;
      reservedTokens: number;
      reservedCost: number;
    },
  ): Promise<{ execution: AIExecutionRecord; replayed: boolean }>;
  finalizeQuotaReservation(executionPublicId: string, usage: { tokens: number; cost: number; currency?: string | null; release?: boolean }): Promise<void>;
  updateExecution(publicId: string, patch: Partial<AIExecutionRecord>): Promise<AIExecutionRecord>;
  findExecution(publicId: string): Promise<AIExecutionRecord | null>;
  findExecutionByIdempotency(consumerKey: string, idempotencyKeyHash: string): Promise<AIExecutionRecord | null>;
  listExecutions(filters?: Record<string, unknown>): Promise<{ data: AIExecutionRecord[]; total: number; page: number; pageSize: number; totalPages: number }>;
  appendSpan(span: Omit<AIExecutionSpan, 'id'>): Promise<AIExecutionSpan>;
  listExecutionSpans(executionPublicId: string): Promise<AIExecutionSpan[]>;
  createAsyncJob(value: Omit<AIAsyncJobRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<AIAsyncJobRecord>;
  findAsyncJob(publicId: string): Promise<AIAsyncJobRecord | null>;
  listAsyncJobs(filters?: { status?: string; page?: number; pageSize?: number }): Promise<{ data: AIAsyncJobRecord[]; total: number }>;
  claimAsyncJob(publicId: string, workerId: string): Promise<AIAsyncJobRecord | null>;
  updateAsyncJob(publicId: string, patch: Partial<AIAsyncJobRecord>): Promise<AIAsyncJobRecord>;
  operateAsyncJob(publicId: string, action: 'RETRY' | 'CANCEL', actorReferenceId: string): Promise<AIAsyncJobRecord>;
  asyncQueueStatus(): Promise<{ queued: number; running: number; retrying: number; failed: number; deadLetter: number; oldestQueuedAt: Date | string | null }>;
  recordUsage(value: { executionPublicId: string; providerKey: string; modelKey: string; inputTokens: number; outputTokens: number; cost: number; currency: string; priceSnapshotKey?: string | null; pricingEffectiveFrom?: Date | string | null; costKind: 'ACTUAL' | 'ESTIMATED' | 'UNKNOWN'; metadata?: Record<string, unknown> }): Promise<void>;
  quotaUsage(consumerKey: string, period: 'MINUTE' | 'DAY' | 'MONTH'): Promise<{ requests: number; tokens: number; costs: Record<string, number> }>;
  createWorkflowRun(value: Omit<AIWorkflowRun, 'id' | 'createdAt' | 'updatedAt'>): Promise<AIWorkflowRun>;
  findWorkflowVersion(workflowKey: string, version: number): Promise<AIWorkflowVersion | null>;
  createWorkflowStepRun(value: Omit<AIWorkflowStepRun, 'id'>): Promise<AIWorkflowStepRun>;
  updateWorkflowStepRun(runPublicId: string, stepKey: string, attempt: number, patch: Partial<AIWorkflowStepRun>): Promise<AIWorkflowStepRun>;
  listWorkflowStepRuns(runPublicId: string): Promise<AIWorkflowStepRun[]>;
  findWorkflowRun(publicId: string): Promise<AIWorkflowRun | null>;
  updateWorkflowRun(publicId: string, patch: Partial<AIWorkflowRun>): Promise<AIWorkflowRun>;
  createEvaluationRun(value: Omit<AIEvaluationRun, 'id' | 'createdAt'>): Promise<AIEvaluationRun>;
  findEvaluationRun(publicId: string): Promise<AIEvaluationRun | null>;
  findLatestEvaluationRun(evaluationKey: string, target?: { type: AIEvaluationRun['targetType']; key: string; version?: number | null; checksum?: string | null }): Promise<AIEvaluationRun | null>;
  updateEvaluationRun(publicId: string, patch: Partial<AIEvaluationRun>): Promise<AIEvaluationRun>;
  approveEvaluationRun(publicId: string, actorReferenceId: string): Promise<AIEvaluationRun>;
  appendIncidentEvent(publicId: string, event: AIIncident['timeline'][number]): Promise<AIIncident>;
  createIndexingRun(value: Omit<AIIndexingRun, 'id' | 'createdAt'>): Promise<AIIndexingRun>;
  updateIndexingRun(publicId: string, patch: Partial<AIIndexingRun>): Promise<AIIndexingRun>;
  replaceEmbeddings(input: { indexKey: string; sourceReferenceId: string; modelKey: string; dimensions: number; chunks: Array<{ chunkKey: string; chunkText: string; embeddingRef: string; checksum: string; metadata?: Record<string, unknown> }> }): Promise<void>;
  providerCircuitCanAttempt(key: string, threshold?: number, resetAfterMs?: number): Promise<boolean>;
  providerCircuitSuccess(key: string): Promise<void>;
  providerCircuitFailure(key: string, threshold?: number): Promise<void>;
}

export interface IAIAsyncPayloadProtector {
  status(): 'READY' | 'NOT_CONFIGURED';
  protect(value: unknown): { ciphertext: string; iv: string; authTag: string; keyVersion: string };
  unprotect(value: { ciphertext: string; iv: string; authTag: string; keyVersion: string }): unknown;
}

export type AIPlatformResourceValue = AIProviderDefinition | AIModelDefinition | AIModelPrice | AICapabilityDefinition |
  AIRoutingPolicy | AIPromptDefinition | AIGuardrailDefinition | AIConsumerPolicy | AIWorkflowDefinition |
  AIEvaluationDefinition | AIKnowledgeIndex | AIKnowledgeSource | AIIncident;
