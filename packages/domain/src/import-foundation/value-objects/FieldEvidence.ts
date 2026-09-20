import { ExtractorType } from '../enums/ExtractorType';
import { ConfidenceScore } from './ConfidenceScore';
import { FieldValidationResult } from './FieldValidationResult';

export interface FieldEvidenceProps {
  fieldName: string;
  extractedValue: unknown;
  sourceUrl?: string;
  sourceId: string;
  retrievedAt: Date;
  contentHash: string;
  connectorVersion: string;
  extractorType: ExtractorType;
  modelName?: string;
  promptVersion?: string;
  schemaVersion: string;
  selectorOrJsonPath?: string;
  evidenceSnippet: string;
  confidenceScore: ConfidenceScore;
  validationResults?: FieldValidationResult[];
}

export class FieldEvidence {
  public readonly fieldName: string;
  public readonly extractedValue: unknown;
  public readonly sourceUrl?: string;
  public readonly sourceId: string;
  public readonly retrievedAt: Date;
  public readonly contentHash: string;
  public readonly connectorVersion: string;
  public readonly extractorType: ExtractorType;
  public readonly modelName?: string;
  public readonly promptVersion?: string;
  public readonly schemaVersion: string;
  public readonly selectorOrJsonPath?: string;
  public readonly evidenceSnippet: string;
  public readonly confidenceScore: ConfidenceScore;
  public readonly validationResults: FieldValidationResult[];

  constructor(props: FieldEvidenceProps) {
    if (!props.fieldName || props.fieldName.trim() === '') {
      throw new Error('fieldName is required');
    }
    if (!props.sourceId || props.sourceId.trim() === '') {
      throw new Error('sourceId is required');
    }
    if (!props.retrievedAt) {
      throw new Error('retrievedAt is required');
    }
    if (!props.contentHash || props.contentHash.trim() === '') {
      throw new Error('contentHash is required');
    }
    if (!props.connectorVersion || props.connectorVersion.trim() === '') {
      throw new Error('connectorVersion is required');
    }
    if (!props.extractorType) {
      throw new Error('extractorType is required');
    }
    if (!props.schemaVersion || props.schemaVersion.trim() === '') {
      throw new Error('schemaVersion is required');
    }
    if (!props.evidenceSnippet || props.evidenceSnippet.trim() === '') {
      throw new Error('evidenceSnippet is required');
    }
    if (props.evidenceSnippet.length > 1000) {
      throw new Error('evidenceSnippet exceeds maximum length of 1000 characters');
    }
    if (!props.confidenceScore) {
      throw new Error('confidenceScore is required');
    }

    if (props.extractorType === ExtractorType.AI_ASSISTED) {
      if (!props.modelName || props.modelName.trim() === '') {
        throw new Error('modelName is required for AI_ASSISTED extractorType');
      }
      if (!props.promptVersion || props.promptVersion.trim() === '') {
        throw new Error('promptVersion is required for AI_ASSISTED extractorType');
      }
    }

    const lowerSnippet = props.evidenceSnippet.toLowerCase();
    const sensitiveKeywords = ['password', 'token', 'secret', 'apikey'];
    for (const keyword of sensitiveKeywords) {
      if (lowerSnippet.includes(keyword)) {
        throw new Error(`evidenceSnippet contains sensitive information or forbidden word: ${keyword}`);
      }
    }

    if (props.validationResults) {
      for (const vr of props.validationResults) {
        if (vr.metadata) {
          const metadataStr = JSON.stringify(vr.metadata).toLowerCase();
          for (const keyword of sensitiveKeywords) {
            if (metadataStr.includes(keyword)) {
              throw new Error(`validationResults metadata contains sensitive key or value: ${keyword}`);
            }
          }
        }
      }
    }

    this.fieldName = props.fieldName;
    this.extractedValue = props.extractedValue;
    this.sourceUrl = props.sourceUrl;
    this.sourceId = props.sourceId;
    this.retrievedAt = props.retrievedAt;
    this.contentHash = props.contentHash;
    this.connectorVersion = props.connectorVersion;
    this.extractorType = props.extractorType;
    this.modelName = props.modelName;
    this.promptVersion = props.promptVersion;
    this.schemaVersion = props.schemaVersion;
    this.selectorOrJsonPath = props.selectorOrJsonPath;
    this.evidenceSnippet = props.evidenceSnippet;
    this.confidenceScore = props.confidenceScore;
    this.validationResults = props.validationResults || [];
  }
}
