import { ExtractionCandidateStatus } from '../enums/ExtractionCandidateStatus';
import { FieldEvidence } from './FieldEvidence';

export interface ExtractionCandidateProps {
  candidateId: string;
  targetFieldName: string;
  value: unknown;
  evidence: FieldEvidence;
  status: ExtractionCandidateStatus;
  createdAt: Date;
}

export class ExtractionCandidate {
  public readonly candidateId: string;
  public readonly targetFieldName: string;
  public readonly value: unknown;
  public readonly evidence: FieldEvidence;
  public readonly status: ExtractionCandidateStatus;
  public readonly createdAt: Date;

  constructor(props: ExtractionCandidateProps) {
    if (!props.candidateId || props.candidateId.trim() === '') {
      throw new Error('candidateId is required');
    }
    if (!props.targetFieldName || props.targetFieldName.trim() === '') {
      throw new Error('targetFieldName is required');
    }
    if (!props.evidence) {
      throw new Error('evidence is required');
    }
    if (!props.status) {
      throw new Error('status is required');
    }
    if (!props.createdAt) {
      throw new Error('createdAt is required');
    }

    this.candidateId = props.candidateId;
    this.targetFieldName = props.targetFieldName;
    this.value = props.value;
    this.evidence = props.evidence;
    this.status = props.status;
    this.createdAt = props.createdAt;
  }

  public canPublish(): false {
    return false;
  }

  public requiresReview(): boolean {
    return (
      this.status === ExtractionCandidateStatus.CANDIDATE ||
      this.status === ExtractionCandidateStatus.NEEDS_REVIEW
    );
  }
}
