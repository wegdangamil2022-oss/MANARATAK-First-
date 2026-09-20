import { ExtractorType, ExtractionCandidate } from '@manaratak/domain';

export interface ExtractionSourceContext {
  sourceId: string;
  sourceUrl?: string;
  retrievedAt: Date;
  contentHash: string;
  connectorVersion: string;
  schemaVersion: string;
  languageHint?: string;
  metadata?: Record<string, unknown>;
}

export interface ExtractFieldsCommand {
  targetSchemaName: string;
  sourceText: string;
  sourceContext: ExtractionSourceContext;
  allowedFields: string[];
  extractorTypeHint?: ExtractorType;
}

export interface RejectedFieldDetail {
  fieldName?: string;
  reason: string;
  evidenceSnippet?: string;
}

export interface ExtractFieldsResult {
  candidates: ExtractionCandidate[];
  rejectedFields: RejectedFieldDetail[];
  warnings: string[];
}

export interface GoldenDatasetCase {
  caseId: string;
  targetSchemaName: string;
  sourceText: string;
  expectedFields: Record<string, unknown>;
  expectedMissingFields?: string[];
  expectedRejectedReasons?: string[];
}
