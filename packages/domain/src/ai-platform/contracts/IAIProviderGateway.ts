import { AICapabilityKind, AIExecutionRequestDto, AIExecutionResultDto, AIProviderOperationalStatus } from '../entities';

export interface AIProviderInvocation {
  model: string;
  systemPrompt?: string | null;
  input: string;
  maxOutputTokens?: number | null;
  temperature?: number | null;
  structuredOutputSchema?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  timeoutMs?: number | null;
}

export interface AIProviderInvocationResult {
  output: string;
  providerRequestId?: string | null;
  inputTokens: number;
  outputTokens: number;
  finishReason?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface AIEmbeddingInvocation {
  model: string;
  inputs: string[];
  dimensions?: number | null;
  metadata?: Record<string, unknown> | null;
}

export interface AIEmbeddingInvocationResult {
  embeddings: number[][];
  inputTokens: number;
  providerRequestId?: string | null;
}

export interface AIProviderAdapter {
  readonly key: string;
  readonly capabilities: AICapabilityKind[];
  status(): AIProviderOperationalStatus;
  invoke(request: AIProviderInvocation): Promise<AIProviderInvocationResult>;
  embed?(request: AIEmbeddingInvocation): Promise<AIEmbeddingInvocationResult>;
}

export interface IAIProviderGateway {
  execute(request: AIExecutionRequestDto): Promise<AIExecutionResultDto>;
}

export interface IAIProviderRegistry {
  get(providerKey: string): AIProviderAdapter | null;
  list(): AIProviderAdapter[];
}
