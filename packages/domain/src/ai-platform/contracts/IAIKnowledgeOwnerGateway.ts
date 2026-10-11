import { AIDataClassification } from '../entities';

export interface AIKnowledgeOwnerRequest {
  sourceType: string;
  sourceReferenceId: string;
  locale?: string;
  requesterReferenceId: string;
}

/** Owner reads decide publication, reader authorization and transfer consent. */
export interface AIVerifiedKnowledgeSource {
  sourceType: string;
  sourceReferenceId: string;
  sourceVersion: string;
  publishedAt: string;
  locale: string;
  content: string;
  dataClassification: AIDataClassification;
  transferAllowed: boolean;
  readerScope: 'PUBLIC' | string;
}

export interface IAIKnowledgeOwnerGateway {
  resolve(request: AIKnowledgeOwnerRequest): Promise<AIVerifiedKnowledgeSource | null>;
}
