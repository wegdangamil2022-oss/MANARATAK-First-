import { AIExecutionStatus, AIProviderType, AIRequestPurpose, AISafetyDecision } from '../enums';
import { AIDataClassification } from './AIPlatform';

export interface AIExecutionRequestDto {
  purpose: AIRequestPurpose;
  promptKey: string;
  input: string;
  locale?: string | null;
  requesterReferenceId?: string | null;
  sourceDomain?: string | null;
  metadata?: Record<string, unknown> | null;
  capabilityKey?: string | null;
  consumerKey?: string | null;
  idempotencyKey?: string | null;
  structuredOutputSchema?: Record<string, unknown> | null;
  maxOutputTokens?: number | null;
  dataClassification?: AIDataClassification | null;
}

export interface AIExecutionResultDto {
  output: string;
  safetyDecision: AISafetyDecision;
  providerType: AIProviderType;
  modelReference: string;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  metadata?: Record<string, unknown> | null;
  finishReason?: string | null;
  providerRequestId?: string | null;
  actualInputTokens?: number | null;
  actualOutputTokens?: number | null;
}

export interface AIExecutionLogDto {
  id: string;
  publicId: string;
  purpose: AIRequestPurpose;
  promptKey: string;
  providerType: AIProviderType;
  modelReference: string;
  status: AIExecutionStatus;
  safetyDecision: AISafetyDecision;
  requesterReferenceId?: string | null;
  sourceDomain?: string | null;
  inputPreview?: string | null;
  outputPreview?: string | null;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  errorMessage?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateAIExecutionLogDto {
  publicId: string;
  purpose: AIRequestPurpose;
  promptKey: string;
  providerType: AIProviderType;
  modelReference: string;
  status: AIExecutionStatus;
  safetyDecision: AISafetyDecision;
  requesterReferenceId?: string | null;
  sourceDomain?: string | null;
  inputPreview?: string | null;
  outputPreview?: string | null;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  errorMessage?: string | null;
  metadata?: Record<string, unknown> | null;
}
