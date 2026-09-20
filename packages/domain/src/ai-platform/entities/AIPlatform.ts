import { AIExecutionStatus, AIProviderType, AIRequestPurpose, AISafetyDecision } from '../enums';

export type AIRecordStatus = 'DRAFT' | 'REVIEW' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type AIProviderOperationalStatus = 'NOT_CONFIGURED' | 'RUNTIME_PENDING' | 'READY' | 'DEGRADED' | 'UNAVAILABLE' | 'DISABLED';
export type AIDataClassification = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'STUDENT_PRIVATE' | 'HIGHLY_SENSITIVE';
export type AICapabilityKind = 'TEXT_GENERATION' | 'CHAT' | 'STRUCTURED_OUTPUT' | 'EMBEDDINGS' | 'RERANKING' | 'MODERATION';
export type AIWorkflowRunStatus = 'QUEUED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type AIEvaluationRunStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type AIAsyncJobStatus = 'QUEUED' | 'RUNNING' | 'RETRYING' | 'COMPLETED' | 'FAILED' | 'DEAD_LETTER' | 'CANCELLED';

export interface AIProviderDefinition {
  id: string;
  key: string;
  displayName: string;
  type: AIProviderType;
  status: AIRecordStatus;
  operationalStatus: AIProviderOperationalStatus;
  secretReference?: string | null;
  baseUrl?: string | null;
  timeoutMs: number;
  maxRetries: number;
  productionApproved?: boolean;
  maxDataClassification?: AIDataClassification;
  regions?: string[];
  dataResidency?: string[];
  dataRetentionPolicy?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface AIModelDefinition {
  id: string;
  key: string;
  providerKey: string;
  providerModelId: string;
  displayName: string;
  status: AIRecordStatus;
  capabilities: AICapabilityKind[];
  contextWindow?: number | null;
  maxOutputTokens?: number | null;
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportsStructuredOutput: boolean;
  inputPricePerMillion?: number | null;
  outputPricePerMillion?: number | null;
  currency?: string | null;
  productionApproved?: boolean;
  maxDataClassification?: AIDataClassification;
  regions?: string[];
  metadata?: Record<string, unknown> | null;
}

export interface AIModelPrice {
  id: string;
  key: string;
  modelKey: string;
  currency: string;
  inputPricePerMillion: number;
  outputPricePerMillion: number;
  effectiveFrom: Date | string;
  effectiveTo?: Date | string | null;
  status: AIRecordStatus;
}

export interface AICapabilityDefinition {
  id: string;
  key: string;
  displayNameAr: string;
  displayNameEn: string;
  kind: AICapabilityKind;
  status: AIRecordStatus;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'PROHIBITED';
  requiresHumanReview: boolean;
  allowedPurposes: AIRequestPurpose[];
  allowedDataClassifications?: AIDataClassification[];
}

export interface AIRoutingTarget {
  modelKey: string;
  priority: number;
  weight: number;
  maxLatencyMs?: number | null;
  enabled: boolean;
  canaryPercentage?: number;
  shadow?: boolean;
}

export interface AIRoutingPolicy {
  id: string;
  key: string;
  capabilityKey: string;
  consumerKey?: string | null;
  status: AIRecordStatus;
  fallbackEnabled: boolean;
  maxAttempts: number;
  targets: AIRoutingTarget[];
}

export interface AIPromptDefinition {
  id: string;
  key: string;
  purpose: AIRequestPurpose;
  capabilityKey: string;
  status: AIRecordStatus;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  activeVersion?: number | null;
}

export interface AIPromptVersion {
  id: string;
  promptKey: string;
  version: number;
  template: string;
  inputSchema?: Record<string, unknown> | null;
  outputSchema?: Record<string, unknown> | null;
  checksum: string;
  status: 'DRAFT' | 'REVIEW' | 'APPROVED' | 'RETIRED';
  createdBy: string;
  approvedBy?: string | null;
  createdAt: Date | string;
}

export interface AIGuardrailDefinition {
  id: string;
  key: string;
  status: AIRecordStatus;
  stage: 'INPUT' | 'OUTPUT' | 'BOTH';
  action: 'ALLOW' | 'REDACT' | 'BLOCK' | 'REQUIRE_REVIEW';
  rules: Record<string, unknown>;
  version: number;
}

export interface AIConsumerPolicy {
  id: string;
  consumerKey: string;
  displayName: string;
  status: AIRecordStatus;
  allowedCapabilities: string[];
  allowedModels?: string[] | null;
  requestsPerMinute: number;
  dailyRequestLimit: number;
  monthlyTokenLimit: number;
  monthlyCostLimit?: number | null;
  currency?: string | null;
  requireHumanReview: boolean;
  allowedDataClassifications?: AIDataClassification[];
  allowAsyncJobs?: boolean;
}

export interface AIAsyncJobRecord {
  id: string;
  publicId: string;
  requesterReferenceId: string;
  consumerKey: string;
  capabilityKey: string;
  status: AIAsyncJobStatus;
  payloadCiphertext: string;
  payloadIv: string;
  payloadAuthTag: string;
  payloadKeyVersion: string;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt?: Date | string | null;
  lockedAt?: Date | string | null;
  lockedBy?: string | null;
  leaseExpiresAt?: Date | string | null;
  executionPublicId?: string | null;
  errorCode?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  completedAt?: Date | string | null;
}

export interface AIExecutionRecord {
  id: string;
  publicId: string;
  traceId: string;
  idempotencyKeyHash?: string | null;
  consumerKey: string;
  capabilityKey: string;
  purpose: AIRequestPurpose;
  promptKey: string;
  promptVersion?: number | null;
  providerKey?: string | null;
  modelKey?: string | null;
  status: AIExecutionStatus;
  safetyDecision: AISafetyDecision;
  dataClassification: AIDataClassification;
  inputPreview?: string | null;
  outputPreview?: string | null;
  inputTokens: number;
  outputTokens: number;
  estimatedCost?: number | null;
  actualCost?: number | null;
  currency?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  requesterReferenceId?: string | null;
  sourceDomain?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface AIExecutionSpan {
  id: string;
  executionPublicId: string;
  traceId: string;
  name: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  startedAt: Date | string;
  completedAt?: Date | string | null;
  durationMs?: number | null;
  attributes?: Record<string, unknown> | null;
}

export interface AIWorkflowDefinition {
  id: string;
  key: string;
  displayNameAr: string;
  displayNameEn: string;
  status: AIRecordStatus;
  activeVersion?: number | null;
  definition: { steps: Array<{ key: string; capabilityKey: string; promptKey: string; dependsOn?: string[]; retryLimit?: number }> };
}

export interface AIWorkflowVersion {
  id: string;
  workflowKey: string;
  version: number;
  checksum: string;
  definition: AIWorkflowDefinition['definition'];
  createdBy: string;
  createdAt: Date | string;
}

export interface AIWorkflowStepRun {
  id: string;
  runPublicId: string;
  stepKey: string;
  executionId?: string | null;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  attempt: number;
  inputReferenceHash?: string | null;
  outputReferenceHash?: string | null;
  outputSnapshot?: unknown;
  errorMessage?: string | null;
  startedAt: Date | string;
  completedAt?: Date | string | null;
}

export interface AIWorkflowRun {
  id: string;
  publicId: string;
  workflowKey: string;
  workflowVersion: number;
  status: AIWorkflowRunStatus;
  traceId: string;
  inputReferenceHash: string;
  outputReferenceHash?: string | null;
  currentStep?: string | null;
  errorMessage?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface AIEvaluationDefinition {
  id: string;
  key: string;
  displayName: string;
  status: AIRecordStatus;
  capabilityKey: string;
  target: { type: 'PROMPT' | 'MODEL' | 'ROUTING' | 'WORKFLOW' | 'KNOWLEDGE'; key: string };
  deploymentGate?: { minimumScore: number; maximumSafetyFailures: number; requiresHumanApproval: boolean } | null;
  dataset: Array<{ key: string; input: string; expected?: unknown; metadata?: Record<string, unknown> }>;
  evaluators: Array<{ key: string; type: 'EXACT_MATCH' | 'JSON_SCHEMA' | 'REGEX' | 'LATENCY' | 'COST' | 'HUMAN'; threshold?: number }>;
}

export interface AIEvaluationRun {
  id: string;
  publicId: string;
  evaluationKey: string;
  status: AIEvaluationRunStatus;
  promptVersion?: number | null;
  modelKey?: string | null;
  targetType: 'PROMPT' | 'MODEL' | 'ROUTING' | 'WORKFLOW';
  targetKey: string;
  targetVersion?: number | null;
  targetChecksum?: string | null;
  targetEvidence?: Record<string, unknown> | null;
  passed: number;
  failed: number;
  safetyFailures: number;
  score?: number | null;
  results?: Record<string, unknown>[] | null;
  approvedBy?: string | null;
  approvedAt?: Date | string | null;
  createdAt: Date | string;
  completedAt?: Date | string | null;
}

export interface AIKnowledgeIndex {
  id: string;
  key: string;
  displayName: string;
  status: AIRecordStatus;
  embeddingModelKey: string;
  dimensions: number;
  sourceDomains: string[];
  chunkingStrategy: Record<string, unknown>;
}

export interface AIKnowledgeSource {
  id: string;
  indexKey: string;
  sourceType: string;
  sourceReferenceId: string;
  sourceVersion?: string | null;
  checksum: string;
  locale?: string | null;
  status: 'PENDING' | 'INDEXED' | 'FAILED' | 'REMOVED';
  metadata?: Record<string, unknown> | null;
}

export interface AIIndexingRun {
  id: string;
  publicId: string;
  indexKey: string;
  sourceReferenceId: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  chunks: number;
  embeddedChunks: number;
  errorMessage?: string | null;
  createdAt: Date | string;
  completedAt?: Date | string | null;
}

export interface AIIncident {
  id: string;
  publicId: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'INVESTIGATING' | 'MITIGATED' | 'RESOLVED';
  title: string;
  description: string;
  executionPublicId?: string | null;
  ownerReferenceId?: string | null;
  timeline: Array<{ at: Date | string; action: string; actorReferenceId?: string | null; note?: string | null }>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface AIPlatformOverview {
  overallStatus: 'READY' | 'RUNTIME_PENDING' | 'NOT_CONFIGURED' | 'DEGRADED' | 'DISABLED';
  providers: Record<AIProviderOperationalStatus, number>;
  activeModels: number;
  activePrompts: number;
  executionsToday: number;
  blockedToday: number;
  costMonthToDate: number;
  currency: string;
  costMonthToDateByCurrency: Record<string, number>;
  openIncidents: number;
}
