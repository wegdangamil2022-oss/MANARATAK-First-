import { ImportTargetDomain } from '../enums/ImportTargetDomain';
import { ExtractionCandidate } from './ExtractionCandidate';

export interface DomainHandoffRequestProps {
  handoffId: string;
  targetDomain: ImportTargetDomain;
  importRecordId: string;
  normalizedPayload: Record<string, unknown>;
  candidates: ExtractionCandidate[];
  createdAt: Date;
}

export class DomainHandoffRequest {
  public readonly handoffId: string;
  public readonly targetDomain: ImportTargetDomain;
  public readonly importRecordId: string;
  public readonly normalizedPayload: Record<string, unknown>;
  public readonly candidates: ExtractionCandidate[];
  public readonly createdAt: Date;

  constructor(props: DomainHandoffRequestProps) {
    if (!props.handoffId || props.handoffId.trim() === '') {
      throw new Error('handoffId is required');
    }
    if (!props.targetDomain) {
      throw new Error('targetDomain is required');
    }
    if (!props.importRecordId || props.importRecordId.trim() === '') {
      throw new Error('importRecordId is required');
    }
    if (!props.normalizedPayload) {
      throw new Error('normalizedPayload is required');
    }
    if (!props.candidates) {
      throw new Error('candidates array is required');
    }
    if (!props.createdAt) {
      throw new Error('createdAt is required');
    }

    for (const candidate of props.candidates) {
      if (!candidate.evidence) {
        throw new Error('All candidates must have evidence');
      }
    }

    this.handoffId = props.handoffId;
    this.targetDomain = props.targetDomain;
    this.importRecordId = props.importRecordId;
    this.normalizedPayload = props.normalizedPayload;
    this.candidates = props.candidates;
    this.createdAt = props.createdAt;
  }

  public canWriteToDomain(): false {
    return false;
  }
}
