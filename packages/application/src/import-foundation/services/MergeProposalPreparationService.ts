import {
  DomainHandoffRequest,
  MatchCandidate,
  MatchStrength,
  FieldDiff,
  FieldDiffType,
  CompletenessReport,
  MergeProposal,
  MergeProposalStatus,
  ExtractionCandidate
} from '@manaratak/domain';
import { generateOpaqueIdentifier } from '@manaratak/core';

export class MergeProposalPreparationService {
  public async prepareProposal(input: {
    handoff: DomainHandoffRequest;
    existingRecordSnapshot?: Record<string, unknown>;
    requiredFields: string[];
    matchCandidate?: MatchCandidate;
    proposalId?: string;
  }): Promise<MergeProposal> {
    const { handoff, existingRecordSnapshot, requiredFields, matchCandidate, proposalId } = input;

    const candidateMap = new Map<string, ExtractionCandidate>();
    if (handoff.candidates && Array.isArray(handoff.candidates)) {
      for (const candidate of handoff.candidates) {
        if (candidate.targetFieldName) {
          candidateMap.set(candidate.targetFieldName, candidate);
        }
      }
    }

    const fieldDiffs: FieldDiff[] = [];
    const processedFields = new Set<string>();

    // 1. Process fields in candidate Map
    for (const [fieldName, candidate] of candidateMap.entries()) {
      processedFields.add(fieldName);

      const hasExistingValue =
        existingRecordSnapshot !== undefined &&
        existingRecordSnapshot !== null &&
        Object.prototype.hasOwnProperty.call(existingRecordSnapshot, fieldName) &&
        existingRecordSnapshot[fieldName] !== undefined;

      if (!hasExistingValue) {
        fieldDiffs.push(
          new FieldDiff({
            fieldName,
            proposedValue: candidate.value,
            diffType: FieldDiffType.ADDITION,
            evidence: candidate.evidence
          })
        );
      } else {
        const currentValue = existingRecordSnapshot![fieldName];
        const proposedValue = candidate.value;

        if (this.areValuesEqual(currentValue, proposedValue)) {
          fieldDiffs.push(
            new FieldDiff({
              fieldName,
              currentValue,
              proposedValue,
              diffType: FieldDiffType.NO_CHANGE,
              evidence: candidate.evidence
            })
          );
        } else {
          fieldDiffs.push(
            new FieldDiff({
              fieldName,
              currentValue,
              proposedValue,
              diffType: FieldDiffType.CONFLICT,
              evidence: candidate.evidence
            })
          );
        }
      }
    }

    // 2. Process missing required or existing fields
    const missingCandidateFields = new Set<string>();

    for (const reqField of requiredFields || []) {
      if (!processedFields.has(reqField)) {
        missingCandidateFields.add(reqField);
      }
    }

    if (existingRecordSnapshot) {
      for (const existingField of Object.keys(existingRecordSnapshot)) {
        if (!processedFields.has(existingField)) {
          missingCandidateFields.add(existingField);
        }
      }
    }

    for (const missingField of missingCandidateFields) {
      const currentValue =
        existingRecordSnapshot && Object.prototype.hasOwnProperty.call(existingRecordSnapshot, missingField)
          ? existingRecordSnapshot[missingField]
          : undefined;

      fieldDiffs.push(
        new FieldDiff({
          fieldName: missingField,
          currentValue,
          diffType: FieldDiffType.MISSING_IN_IMPORT
        })
      );
    }

    // 3. Build CompletenessReport
    const presentFields = Array.from(candidateMap.keys());
    const missingFields = (requiredFields || []).filter(f => !presentFields.includes(f));
    const isComplete = missingFields.length === 0;
    const warnings: string[] = [];
    if (!isComplete) {
      warnings.push(`Missing required fields: ${missingFields.join(', ')}`);
    }

    const completenessReport = new CompletenessReport({
      targetDomain: handoff.targetDomain,
      requiredFields: requiredFields || [],
      presentFields,
      missingFields,
      warnings,
      isComplete
    });

    // 4. Calculate requiresReview
    const hasConflict = fieldDiffs.some(fd => fd.diffType === FieldDiffType.CONFLICT);
    let weakOrPossibleMatch = false;
    if (matchCandidate) {
      if (
        matchCandidate.strength === MatchStrength.POSSIBLE ||
        matchCandidate.strength === MatchStrength.WEAK ||
        matchCandidate.strength === MatchStrength.NONE
      ) {
        weakOrPossibleMatch = true;
      }
    }

    const requiresReview = hasConflict || !isComplete || weakOrPossibleMatch;

    const status = requiresReview
      ? MergeProposalStatus.NEEDS_REVIEW
      : MergeProposalStatus.READY_FOR_DOMAIN_REVIEW;

    const finalProposalId =
      proposalId && proposalId.trim() !== ''
        ? proposalId
        : `prop-${generateOpaqueIdentifier()}`;

    return new MergeProposal({
      proposalId: finalProposalId,
      handoffId: handoff.handoffId,
      targetDomain: handoff.targetDomain,
      matchCandidate,
      fieldDiffs,
      completenessReport,
      status,
      requiresReview,
      createdAt: new Date()
    });
  }

  private areValuesEqual(val1: unknown, val2: unknown): boolean {
    const norm1 = this.normalizeValue(val1);
    const norm2 = this.normalizeValue(val2);
    return norm1 === norm2;
  }

  private normalizeValue(val: unknown): string {
    if (val === null || val === undefined) return '';
    if (typeof val === 'string') return val.trim().toLowerCase();
    if (typeof val === 'number' || typeof val === 'boolean') return String(val);
    if (val instanceof Date) return val.toISOString();
    return JSON.stringify(val);
  }
}
