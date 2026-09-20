import {
  ExtractorType,
  ExtractionCandidateStatus,
  ConfidenceScore,
  FieldEvidence,
  ExtractionCandidate
} from '@manaratak/domain';
import { IFieldExtractionGateway } from '../contracts/IFieldExtractionGateway';
import {
  ExtractFieldsCommand,
  ExtractFieldsResult,
  RejectedFieldDetail
} from '../dtos/ExtractionDtos';

export class RuleBasedFieldExtractionGateway implements IFieldExtractionGateway {
  async extractFields(command: ExtractFieldsCommand): Promise<ExtractFieldsResult> {
    const candidates: ExtractionCandidate[] = [];
    const rejectedFields: RejectedFieldDetail[] = [];
    const warnings: string[] = [];

    const allowedMap = new Map<string, string>();
    for (const field of command.allowedFields) {
      allowedMap.set(field.trim().toLowerCase(), field.trim());
    }

    if (allowedMap.size === 0) {
      return {
        candidates: [],
        rejectedFields: [],
        warnings: ['No allowed fields provided in command']
      };
    }

    const lines = command.sourceText.split(/\r?\n/);
    const sensitiveKeywords = ['password', 'token', 'secret', 'apikey'];

    let candidateCount = 0;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Pattern match key: value | key - value | key = value
      const match = line.match(/^([A-Za-z0-9_ .-]+?)[ \t]*(?::|=|-)[ \t]*(.+)$/);
      if (!match) continue;

      const rawKey = match[1].trim();
      const rawValue = match[2].trim();

      const canonicalFieldName = allowedMap.get(rawKey.toLowerCase());
      if (!canonicalFieldName) {
        continue;
      }

      const snippet = line.length > 1000 ? line.substring(0, 1000) : line;
      const lowerSnippet = snippet.toLowerCase();
      const lowerVal = rawValue.toLowerCase();

      const hasSensitiveWord = sensitiveKeywords.some(
        kw => lowerSnippet.includes(kw) || lowerVal.includes(kw)
      );

      if (hasSensitiveWord) {
        rejectedFields.push({
          fieldName: canonicalFieldName,
          reason: 'Evidence snippet contains sensitive word',
          evidenceSnippet: '[REDACTED]'
        });
        continue;
      }

      const isExactCase = rawKey === canonicalFieldName;
      const confidenceVal = isExactCase ? 0.9 : 0.8;
      const explanation = isExactCase ? 'Exact case rule match' : 'Case-insensitive rule match';

      candidateCount++;
      const candidateId = `cand-${canonicalFieldName}-${candidateCount}`;

      const evidence = new FieldEvidence({
        fieldName: canonicalFieldName,
        extractedValue: rawValue,
        sourceUrl: command.sourceContext.sourceUrl,
        sourceId: command.sourceContext.sourceId,
        retrievedAt: command.sourceContext.retrievedAt,
        contentHash: command.sourceContext.contentHash,
        connectorVersion: command.sourceContext.connectorVersion,
        extractorType: ExtractorType.RULE_BASED,
        schemaVersion: command.sourceContext.schemaVersion,
        evidenceSnippet: snippet,
        confidenceScore: new ConfidenceScore({ value: confidenceVal, explanation }),
        validationResults: []
      });

      const candidate = new ExtractionCandidate({
        candidateId,
        targetFieldName: canonicalFieldName,
        value: rawValue,
        evidence,
        status: ExtractionCandidateStatus.CANDIDATE,
        createdAt: new Date()
      });

      candidates.push(candidate);
    }

    if (candidates.length === 0) {
      warnings.push('No allowed fields found in source text');
    }

    return {
      candidates,
      rejectedFields,
      warnings
    };
  }
}
